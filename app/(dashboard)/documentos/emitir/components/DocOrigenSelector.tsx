"use client";
// Documento que se modifica o se retiene (notas de crédito y débito, retención).
//   - Sin elegir: buscador dentro de la tarjeta; si no se ha escrito nada, los
//     últimos documentos (casi siempre es uno reciente). En la compu, Enter elige
//     el primero.
//   - Documento que no está en Kipu ("externo"): en una hoja con campos grandes y
//     el teclado correcto.
//   - Elegido: una tarjeta con número, nombre, fecha y total; la X lo cambia.
import { useEffect, useState } from "react";
import api from "@/lib/api";
import { Search, FileText, X, Loader2, Clock, FilePlus2, AlertTriangle } from "lucide-react";
import { formatoNumeroDoc } from "@/lib/teclado";
import Hoja from "@/components/ui/Hoja";
import Boton from "@/components/ui/Boton";
import BotonIcono from "@/components/ui/BotonIcono";
import ChipsFiltro from "@/components/ui/ChipsFiltro";
import { Campo, Entrada, type Teclado } from "@/components/ui/Campo";
import { cn } from "@/components/ui/cn";
import { dosDecimales } from "@/lib/dinero";

export interface DocOrigenKipu {
  id:             string;
  numero_doc:     string;
  tipo_doc:       string;
  cod_doc:        string;
  fecha_emision:  string;
  importe_total:  number;
  subtotal_base?:   number;   // solo recibidos: base sin IVA (para retenciones)
  valor_iva_total?: number;
  razon_social:   string;
  identificacion: string;
  estado_sri:     string;
}

export interface DocOrigenManual {
  numero:  string;
  fecha:   string;
  cod_doc: string;
  cliente: {
    tipo_id:        string;
    identificacion: string;
    razon_social:   string;
    email:          string;
  };
}

export type DocOrigen =
  | { tipo: "kipu";   data: DocOrigenKipu   }
  | { tipo: "manual"; data: DocOrigenManual }
  | null;

interface Props {
  tiposDoc:     string;           // "FAC" | "FAC,LIQ" | "LIQ" | "FAC,NDB"
  tabla:        "emitidos" | "recibidos";
  value:        DocOrigen;
  onChange:     (doc: DocOrigen) => void;
  label?:       string;
  nota?:        string;           // mensaje informativo opcional
  /** Si viene, no se ofrece "Externo" (documento que no está en Kipu): en su lugar, este texto. */
  externoNoDisponible?: string;
}

// dd/mm/aaaa mientras se escribe
const formatFechaDoc = (val: string): string => {
  const solo = val.replace(/[^0-9]/g, "");
  if (solo.length <= 2) return solo;
  if (solo.length <= 4) return `${solo.slice(0, 2)}/${solo.slice(2)}`;
  return `${solo.slice(0, 2)}/${solo.slice(2, 4)}/${solo.slice(4, 8)}`;
};

const TODOS_TIPOS_COD = [
  { valor: "01", etiqueta: "Factura",               tipos: ["FAC"], corto: "FAC" },
  { valor: "03", etiqueta: "Liquidación de compra", tipos: ["LIQ"], corto: "LIQ" },
  { valor: "05", etiqueta: "Nota de débito",        tipos: ["NDB"], corto: "NDB" },
];

const TIPOS_ID = [
  { valor: "04", etiqueta: "RUC"       },
  { valor: "05", etiqueta: "Cédula"    },
  { valor: "06", etiqueta: "Pasaporte" },
  { valor: "08", etiqueta: "Exterior"  },
];

const TECLADO_ID: Record<string, Teclado> = { "04": "ruc", "05": "cedula", "06": "pasaporte", "08": "pasaporte" };

const TIPO_DOC_LABEL: Record<string, string> = {
  FAC: "factura",
  LIQ: "liquidación",
  NCR: "nota de crédito",
  NDB: "nota de débito",
  RET: "retención",
};

const FECHA_OK = /^\d{2}\/\d{2}\/\d{4}$/;
const NUMERO_OK = /^\d{3}-\d{3}-\d{9}$/;

/** Fila del API (emitidos o recibidos: traen nombres distintos). */
type FilaApi = Partial<DocOrigenKipu> & { id: string; numero_doc: string; fecha_emision: string; importe_total: number;
  razon_social_proveedor?: string; ruc_proveedor?: string };

function aDocKipu(d: FilaApi): DocOrigenKipu {
  return {
    id:              d.id,
    numero_doc:      d.numero_doc,
    tipo_doc:        d.tipo_doc || "FAC",
    cod_doc:         d.cod_doc  || "01",
    fecha_emision:   d.fecha_emision,
    importe_total:   d.importe_total,
    subtotal_base:   d.subtotal_base,
    valor_iva_total: d.valor_iva_total,
    razon_social:    d.razon_social || d.razon_social_proveedor || "",
    identificacion:  d.identificacion || d.ruc_proveedor || "",
    estado_sri:      d.estado_sri || "",
  };
}

const manualVacio = (cod_doc: string): DocOrigenManual => ({
  numero: "", fecha: "", cod_doc,
  cliente: { tipo_id: "05", identificacion: "", razon_social: "", email: "" },
});

// ── Lo que las pantallas de emitir hacen con el documento elegido ─────────────

const CONSUMIDOR_FINAL = "9999999999999";

/** El documento es a Consumidor Final: el SRI no deja modificarlo con notas de crédito ni de débito. */
export function esConsumidorFinal(doc: DocOrigen): boolean {
  if (doc?.tipo === "kipu")   return doc.data.identificacion === CONSUMIDOR_FINAL;
  if (doc?.tipo === "manual") return doc.data.cliente?.identificacion === CONSUMIDOR_FINAL;
  return false;
}

/** "001-002-000000123": usePuntoEmision propone esa misma serie. */
export function numeroDocOrigen(doc: DocOrigen): string | null {
  if (doc?.tipo === "kipu")   return doc.data.numero_doc;
  if (doc?.tipo === "manual") return doc.data.numero;
  return null;
}

/** Campos del payload que dicen qué documento se modifica (el de Kipu por su id; el externo, completo). */
export function payloadDocOrigen(doc: NonNullable<DocOrigen>, campoId = "doc_origen_id"): Record<string, unknown> {
  if (doc.tipo === "kipu") return { [campoId]: doc.data.id };
  return {
    doc_origen_numero:  doc.data.numero,
    doc_origen_fecha:   doc.data.fecha,
    doc_origen_cod_doc: doc.data.cod_doc,
    cliente_origen:     doc.data.cliente,
  };
}

interface InfoXml {
  razonSocialComprador?: string; razonSocialProveedor?: string;
  identificacionComprador?: string; identificacionProveedor?: string;
}
/** Lo que se usa de GET /documentos/{id}. */
interface DocumentoApi {
  id: string; numero_doc: string; tipo_doc?: string; cod_doc?: string;
  fecha_emision: string; importe_total: number; estado_sri: string;
  datos?: { infoFactura?: InfoXml; infoLiquidacionCompra?: InfoXml };
}

/** Documento emitido tal como lo devuelve GET /documentos/{id} (con ?doc_id= la pantalla llega con él). */
export function docOrigenDeDocumento(d: DocumentoApi): DocOrigen {
  const info: InfoXml = d.datos?.infoFactura || d.datos?.infoLiquidacionCompra || {};
  return {
    tipo: "kipu",
    data: {
      id:             d.id,
      numero_doc:     d.numero_doc,
      tipo_doc:       d.tipo_doc || "FAC",
      cod_doc:        d.cod_doc || "01",
      fecha_emision:  d.fecha_emision,
      importe_total:  d.importe_total,
      razon_social:   info.razonSocialComprador || info.razonSocialProveedor || "",
      identificacion: info.identificacionComprador || info.identificacionProveedor || "",
      estado_sri:     d.estado_sri,
    },
  };
}

/** Aviso cuando el documento elegido es a Consumidor Final (notas de crédito y débito). */
export function AvisoOrigenConsumidorFinal() {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-peligro/20 bg-peligro-suave px-4 py-3" role="alert">
      <AlertTriangle size={16} className="mt-0.5 shrink-0 text-peligro" aria-hidden />
      <div>
        <p className="text-sm font-medium text-peligro-texto">No disponible para Consumidor Final</p>
        <p className="mt-1 text-xs text-tenue">
          Por normativa del SRI, los comprobantes emitidos a Consumidor Final no se modifican con notas de crédito ni de débito.
        </p>
      </div>
    </div>
  );
}

export default function DocOrigenSelector({
  tiposDoc,
  tabla,
  value,
  onChange,
  label = "Documento origen",
  nota,
  externoNoDisponible,
}: Props) {
  const [query,    setQuery]    = useState("");
  const [results,  setResults]  = useState<DocOrigenKipu[]>([]);
  const [loading,  setLoading]  = useState(false);
  const [ultimos,  setUltimos]  = useState<DocOrigenKipu[]>([]);

  const tiposPermitidos = tiposDoc.split(",").map(t => t.trim().toUpperCase());
  const tiposCod = TODOS_TIPOS_COD.filter(t => t.tipos.some(tipo => tiposPermitidos.includes(tipo)));
  const codDocInicial = tiposCod[0]?.valor ?? "01";

  // Hoja "documento externo": se edita un borrador y se entrega al confirmar
  const [manual, setManual] = useState<DocOrigenManual | null>(null);

  const url = (q: string, limit: number) => {
    const tipoParam = tiposPermitidos.length > 0 ? `&tipo_doc=${tiposPermitidos.join(",")}` : "";
    const qParam = q ? `&q=${encodeURIComponent(q)}` : "";
    return tabla === "emitidos"
      ? `/api/v1/app/documentos?estado_sri=AUTORIZADO${tipoParam}${qParam}&limit=${limit}`
      : `/api/v1/app/recibidos?limit=${limit}${qParam}`;
  };
  const filtrar = (rows: FilaApi[]) => rows.filter((d) =>
    tabla === "recibidos" || tiposPermitidos.includes((d.tipo_doc ?? "").toUpperCase()));

  // Los últimos documentos, para elegir sin escribir
  useEffect(() => {
    if (value) return;
    let vivo = true;
    api.get(url("", 5))
      .then(res => { if (vivo) setUltimos(filtrar(res.data.data ?? []).map(aDocKipu)); })
      .catch(() => {});
    return () => { vivo = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tabla, tiposDoc, !!value]);

  // Buscar mientras se escribe
  const buscando = query.trim().length >= 3;
  useEffect(() => {
    if (!buscando) return;
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await api.get(url(query.trim(), 8));
        setResults(filtrar(res.data.data ?? []).map(aDocKipu));
      } catch { setResults([]); }
      finally { setLoading(false); }
    }, 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, tabla, tiposDoc]);

  const seleccionar = (doc: DocOrigenKipu) => {
    onChange({ tipo: "kipu", data: doc });
    setQuery("");
    setResults([]);
  };

  const limpiar = () => {
    onChange(null);
    setQuery("");
    setResults([]);
  };

  const abrirManual = () => {
    const m = manualVacio(codDocInicial);
    // Si en el buscador se escribió un número de comprobante, la hoja ya lo trae
    if (/^[\d-]+$/.test(query.trim())) m.numero = formatoNumeroDoc(query.trim());
    setManual(m);
  };

  const errNumero = manual && manual.numero && !NUMERO_OK.test(manual.numero) ? "Formato 001-001-000000001." : null;
  const errFecha  = manual && manual.fecha  && !FECHA_OK.test(manual.fecha)   ? "Formato dd/mm/aaaa." : null;
  const puedeConfirmar = !!manual && NUMERO_OK.test(manual.numero) && FECHA_OK.test(manual.fecha)
    && !!manual.cliente.identificacion.trim() && !!manual.cliente.razon_social.trim();

  const confirmarManual = () => {
    if (!manual || !puedeConfirmar) return;
    onChange({
      tipo: "manual",
      data: { ...manual, cliente: { ...manual.cliente, email: manual.cliente.email.trim().toLowerCase() } },
    });
    setManual(null);
    setQuery("");
  };

  const quien = tabla === "recibidos" ? "proveedor" : "cliente";
  const queBusca = tiposPermitidos.map(t => TIPO_DOC_LABEL[t] ?? t).join(" o ");
  const lista = buscando ? results : ultimos;

  return (
    <section className="rounded-xl border border-borde bg-superficie p-4">
      <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-texto">
        <FileText size={16} className="text-acento" aria-hidden /> {label}
      </h2>

      {nota && !value && (
        <p className="mb-3 flex items-start gap-2 rounded-lg bg-alerta-suave px-3 py-2 text-xs text-alerta-texto">
          <AlertTriangle size={13} className="mt-0.5 shrink-0" aria-hidden /> {nota}
        </p>
      )}

      {value ? (
        /* ── Documento elegido ── */
        <div className="flex items-center gap-3 rounded-lg bg-presionado px-3 py-2.5">
          <span className="inline-flex h-9 min-w-9 shrink-0 items-center justify-center rounded-lg bg-acento-suave px-1.5 text-[11px] font-bold text-acento">
            {value.tipo === "kipu" ? value.data.tipo_doc
              : TODOS_TIPOS_COD.find(t => t.valor === value.data.cod_doc)?.corto ?? value.data.cod_doc}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate font-mono text-sm font-medium text-texto">
              {value.tipo === "kipu" ? value.data.numero_doc : value.data.numero}
            </p>
            <p className="truncate text-xs text-tenue">
              {value.tipo === "kipu" ? value.data.razon_social
                : `${value.data.cliente.razon_social} · ${value.data.cliente.identificacion}`}
            </p>
            <p className="text-xs text-sutil">
              {value.tipo === "kipu"
                ? <>{value.data.fecha_emision} · <span className="tabular-nums">${dosDecimales(value.data.importe_total)}</span></>
                : <>{value.data.fecha} · No está en Kipu</>}
            </p>
          </div>
          <BotonIcono etiqueta="Cambiar el documento" icono={<X size={18} />} onClick={limpiar} />
        </div>
      ) : (
        /* ── Buscador ── */
        <div className="space-y-3">
          <Entrada
            teclado="buscar"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              // Compu: Enter elige el primero de la lista
              if (e.key === "Enter" && !e.ctrlKey && !e.metaKey && lista[0]) { e.preventDefault(); seleccionar(lista[0]); }
            }}
            placeholder={`Buscar ${queBusca} por número o ${quien}…`}
            aria-label={`Buscar ${queBusca}`}
            prefijo={<Search size={16} />}
            sufijo={loading ? <Loader2 size={16} className="animate-spin" aria-hidden /> : undefined}
          />

          {buscando ? (
            results.length > 0 ? (
              <ListaDocs docs={results} onElegir={seleccionar} />
            ) : !loading && (
              <p className="px-1 text-xs text-sutil">
                No está en Kipu (solo aparecen los autorizados).
                {!externoNoDisponible && " Puedes ingresarlo a mano."}
              </p>
            )
          ) : ultimos.length > 0 && (
            <div>
              <p className="mb-1 flex items-center gap-1.5 px-1 text-xs text-sutil">
                <Clock size={12} aria-hidden /> Últimos
              </p>
              <ListaDocs docs={ultimos} onElegir={seleccionar} />
            </div>
          )}

          {externoNoDisponible ? (
            <p className="px-1 text-xs text-sutil">{externoNoDisponible}</p>
          ) : (
            <Boton variante="secundario" tamano="sm" onClick={abrirManual} icono={<FilePlus2 size={14} />}>
              No está en Kipu
            </Boton>
          )}
        </div>
      )}

      {/* ── Hoja: documento que no está en Kipu ── */}
      <Hoja
        abierta={!!manual}
        onCerrar={() => setManual(null)}
        titulo="Documento que no está en Kipu"
        descripcion={`Los datos tal como salen en el comprobante del ${quien}.`}
        pie={<>
          <Boton variante="secundario" onClick={() => setManual(null)}>Cancelar</Boton>
          <Boton onClick={confirmarManual} disabled={!puedeConfirmar}>Usar este documento</Boton>
        </>}
      >
        {manual && (
          <div className="space-y-3">
            {tiposCod.length > 1 && (
              <ChipsFiltro
                etiqueta="Tipo de documento"
                opciones={tiposCod}
                valor={manual.cod_doc}
                onCambio={(cod_doc) => setManual({ ...manual, cod_doc })}
              />
            )}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Campo etiqueta={`Número de ${tiposCod.length === 1 ? tiposCod[0].etiqueta.toLowerCase() : "documento"}`}
                     error={errNumero}>
                <Entrada
                  inputMode="numeric"
                  autoComplete="off"
                  value={manual.numero}
                  onChange={(e) => setManual({ ...manual, numero: formatoNumeroDoc(e.target.value) })}
                  placeholder="001-001-000000001"
                  maxLength={17}
                  className="font-mono"
                />
              </Campo>
              <Campo etiqueta="Fecha de emisión" error={errFecha}>
                <Entrada
                  inputMode="numeric"
                  autoComplete="off"
                  value={manual.fecha}
                  onChange={(e) => setManual({ ...manual, fecha: formatFechaDoc(e.target.value) })}
                  placeholder="dd/mm/aaaa"
                  maxLength={10}
                  className="font-mono"
                />
              </Campo>
            </div>

            <p className="pt-1 text-xs font-medium text-sutil">Datos del {quien}</p>
            <ChipsFiltro
              etiqueta="Tipo de identificación"
              opciones={TIPOS_ID}
              valor={manual.cliente.tipo_id}
              onCambio={(tipo_id) => setManual({ ...manual, cliente: { ...manual.cliente, tipo_id, identificacion: "" } })}
            />
            <Campo etiqueta={TIPOS_ID.find(t => t.valor === manual.cliente.tipo_id)?.etiqueta ?? "Identificación"}>
              <Entrada
                teclado={TECLADO_ID[manual.cliente.tipo_id] ?? "texto"}
                value={manual.cliente.identificacion}
                maxLength={manual.cliente.tipo_id === "04" ? 13 : manual.cliente.tipo_id === "05" ? 10 : 20}
                onChange={(e) => {
                  const v = ["04", "05"].includes(manual.cliente.tipo_id)
                    ? e.target.value.replace(/\D/g, "") : e.target.value.toUpperCase();
                  setManual({ ...manual, cliente: { ...manual.cliente, identificacion: v } });
                }}
              />
            </Campo>
            <Campo etiqueta="Nombre o razón social">
              <Entrada
                teclado="nombre"
                value={manual.cliente.razon_social}
                onChange={(e) => setManual({ ...manual, cliente: { ...manual.cliente, razon_social: e.target.value.toUpperCase() } })}
              />
            </Campo>
            <Campo etiqueta="Correo" opcional>
              <Entrada
                teclado="email"
                value={manual.cliente.email}
                onChange={(e) => setManual({ ...manual, cliente: { ...manual.cliente, email: e.target.value.toLowerCase() } })}
              />
            </Campo>
          </div>
        )}
      </Hoja>
    </section>
  );
}

function ListaDocs({ docs, onElegir }: { docs: DocOrigenKipu[]; onElegir: (d: DocOrigenKipu) => void }) {
  return (
    <ul className="-mx-1 divide-y divide-borde">
      {docs.map((d) => (
        <li key={d.id}>
          <button
            type="button"
            onClick={() => onElegir(d)}
            className={cn("flex min-h-12 w-full items-center gap-3 rounded-lg px-1 py-2 text-left",
              "transition-colors hover:bg-presionado active:bg-presionado")}
          >
            <span className="inline-flex h-8 min-w-8 shrink-0 items-center justify-center rounded-lg bg-presionado px-1 text-[10px] font-bold text-tenue">
              {d.tipo_doc}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate font-mono text-sm text-texto">{d.numero_doc}</span>
              <span className="block truncate text-xs text-sutil">{d.razon_social}</span>
            </span>
            <span className="shrink-0 text-right">
              <span className="block text-sm font-semibold tabular-nums text-texto">${dosDecimales(d.importe_total)}</span>
              <span className="block text-xs text-sutil">{d.fecha_emision}</span>
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}
