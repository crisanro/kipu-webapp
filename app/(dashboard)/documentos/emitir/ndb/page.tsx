"use client";
// Nota de débito: la factura a la que se le cobra algo más (interés por mora,
// gastos de cobranza…), los cargos con su IVA y si ya se cobró.
// Con ?doc_id=… llega con la factura elegida.

import { useState, useEffect, useMemo } from "react";
import { r2 } from "@/lib/dinero";
import { useSearchParams } from "next/navigation";
import api from "@/lib/api";
import { useAuthStore } from "@/store/auth.store";
import { useBorrador } from "@/lib/borradores";
import { AlertTriangle, Plus, Trash2, ReceiptText } from "lucide-react";
import Boton from "@/components/ui/Boton";
import BotonIcono from "@/components/ui/BotonIcono";
import { Campo, Entrada, Selector } from "@/components/ui/Campo";
import PuntoEmision from "../components/PuntoEmision";
import PantallaResultado from "../components/PantallaResultado";
import { usePuntoEmision } from "../components/usePuntoEmision";
import CamposAdicionales, { CampoAdicional } from "../components/CamposAdicionales";
import EstadoCobro, { DatosCobro, cobroInicial } from "../components/EstadoCobro";
import ResumenTotales from "../components/ResumenTotales";
import DocOrigenSelector, { DocOrigen } from "../components/DocOrigenSelector";
import EmisionLayout from "../components/EmisionLayout";
import { InputDecimal } from "../components/HojaItem";
import { useEmision } from "../components/useEmision";

const fmt = (n: number) => r2(n).toFixed(2);
const genId = () => Math.random().toString(36).slice(2);

const TARIFAS_IVA = [
  { value: "15", label: "15%", codPorcentaje: "4" },
  { value: "5",  label: "5%",  codPorcentaje: "5" },
  { value: "0",  label: "0%",  codPorcentaje: "0" },
];

interface Motivo {
  _id:      string;
  razon:    string;
  valor:    number;
  tipo_iva: string;  // "0" | "5" | "15"
}

const RAZONES_SUGERIDAS = [
  "Interés por mora",
  "Gastos de cobranza",
  "Diferencia de precio",
  "Gastos administrativos",
  "Otros cargos",
];

const motivoVacio = (): Motivo => ({ _id: genId(), razon: "", valor: 0, tipo_iva: "15" });

const CLASE_VALOR =
  "h-9 w-full rounded-lg border border-borde bg-superficie px-3 text-sm tabular-nums text-texto tactil:h-11 tactil:text-base " +
  "placeholder:text-sutil focus:border-acento focus:outline-none";

function calcTotalesNdb(motivos: Motivo[]) {
  let subtotal_0 = 0, subtotal_5 = 0, subtotal_15 = 0;

  motivos.forEach(m => {
    const val = m.valor || 0;
    if (m.tipo_iva === "5") {
      subtotal_5 = r2(subtotal_5 + val);
    } else if (m.tipo_iva === "15") {
      subtotal_15 = r2(subtotal_15 + val);
    } else {
      subtotal_0 = r2(subtotal_0 + val);
    }
  });

  // IVA sobre la base agrupada por tarifa, igual que el backend (no motivo por motivo)
  const iva_5  = r2(subtotal_5  * 0.05);
  const iva_15 = r2(subtotal_15 * 0.15);

  const subtotal  = r2(subtotal_0 + subtotal_5 + subtotal_15);
  const iva       = r2(iva_5 + iva_15);
  const total     = r2(subtotal + iva);

  return {
    subtotal,
    descuento:   0,
    iva,
    subtotal_0,
    subtotal_5,
    subtotal_15,
    iva_5,
    iva_15,
    propina:     0,
    total,
  };
}

export default function NuevaNdbPage() {
  const searchParams = useSearchParams();
  const empresa      = useAuthStore((s) => s.empresa);

  // Envío: clave anti-duplicados, error, uso justo y resultado
  const em = useEmision();
  const { enviando: submitting, error, setError, resultado } = em;

  // Doc origen
  const [docOrigen, setDocOrigen] = useState<DocOrigen>(null);

  const esConsumidorFinal = docOrigen?.tipo === "kipu"
    ? docOrigen.data.identificacion === "9999999999999"
    : docOrigen?.tipo === "manual"
    ? docOrigen.data.cliente?.identificacion === "9999999999999"
    : false;

  // Motivos (cargos) con su tarifa de IVA
  const [motivos, setMotivos] = useState<Motivo[]>(() => [motivoVacio()]);

  // Campos adicionales
  const [camposAdicionales, setCamposAdicionales] = useState<CampoAdicional[]>([]);

  // Estado cobro
  const [cobro, setCobro] = useState<DatosCobro>(cobroInicial);

  // Establecimiento y punto de emisión
  const pe = usePuntoEmision(docOrigen?.tipo === "kipu" ? docOrigen.data.numero_doc : docOrigen?.tipo === "manual" ? docOrigen.data.numero : null);
  const { estabSelected, ptoSelected } = pe;

  const totales = calcTotalesNdb(motivos);

  // ── Borrador (con ?doc_id la pantalla llega cargada: no se ofrece el viejo) ──
  const desdeFactura = !!searchParams.get("doc_id");
  const datosBorrador = useMemo(() => ({ docOrigen, motivos, camposAdicionales, cobro }),
    [docOrigen, motivos, camposAdicionales, cobro]);
  const borrador = useBorrador("NDB", datosBorrador, {
    vacio: !docOrigen && camposAdicionales.length === 0 && motivos.every(m => !m.razon.trim() && !m.valor),
    desactivado: desdeFactura,
  });
  const seguirBorrador = () => {
    const d = borrador.recuperar();
    if (!d) return;
    setDocOrigen(d.docOrigen ?? null);
    if (Array.isArray(d.motivos) && d.motivos.length) setMotivos(d.motivos);
    setCamposAdicionales(Array.isArray(d.camposAdicionales) ? d.camposAdicionales : []);
    if (d.cobro) setCobro(d.cobro);
  };

  // Pre-cargar desde ?doc_id=
  useEffect(() => {
    const docId = searchParams.get("doc_id");
    if (!docId) return;
    const cargar = async () => {
      try {
        const res  = await api.get(`/api/v1/app/documentos/${docId}`);
        const d    = res.data.data;
        const info = d.datos?.infoFactura || d.datos?.infoLiquidacionCompra || {};

        setDocOrigen({
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
          }
        });

      } catch (e) { console.error(e); }
    };
    cargar();
  }, [searchParams]);

  // Motivos handlers
  const addMotivo = () => setMotivos([...motivos, motivoVacio()]);
  const removeMotivo = (id: string) => {
    if (motivos.length === 1) return;
    setMotivos(motivos.filter(m => m._id !== id));
  };
  const editMotivo = <K extends keyof Motivo>(id: string, field: K, value: Motivo[K]) => {
    setMotivos(motivos.map(m => m._id === id ? { ...m, [field]: value } : m));
  };

  const reset = () => {
    pe.reiniciar();
    em.reiniciar();
    setDocOrigen(null);
    setMotivos([motivoVacio()]);
    setCamposAdicionales([]);
    setCobro(cobroInicial());
  };

  const puedeEmitir = !!empresa && (empresa.suscripcion_activa || empresa.balance_api > 0 || !!empresa.emision_gratis);

  const emitir = async () => {
    setError("");

    if (esConsumidorFinal) {
      setError("Por normativa del SRI, no se pueden emitir notas de débito para comprobantes a Consumidor Final.");
      return;
    }
    if (!docOrigen)                     { setError("Selecciona el documento a modificar."); return; }
    if (!estabSelected || !ptoSelected) { setError("Elige el establecimiento y el punto de emisión."); return; }
    if (motivos.some(m => !m.razon.trim())) { setError("Todos los motivos deben tener descripción."); return; }
    if (totales.total <= 0)             { setError("El valor total debe ser mayor a $0."); return; }
    if (!puedeEmitir) { setError("Se requiere suscripción activa o créditos API."); return; }

    // Agrupar impuestos por tarifa para el payload
    const impuestosPorTarifa: Record<string, { base: number; valor: number }> = {};
    motivos.forEach(m => {
      const tarifa = m.tipo_iva || "0";
      if (!impuestosPorTarifa[tarifa]) impuestosPorTarifa[tarifa] = { base: 0, valor: 0 };
      impuestosPorTarifa[tarifa].base  = r2(impuestosPorTarifa[tarifa].base + (m.valor || 0));
    });
    // El backend recalcula el IVA sobre la base de cada tarifa; aquí igual
    Object.entries(impuestosPorTarifa).forEach(([tarifa, d]) => { d.valor = r2(d.base * parseFloat(tarifa) / 100); });

    const impuestos = Object.entries(impuestosPorTarifa).map(([tarifa, datos]) => {
      const tarifaInfo = TARIFAS_IVA.find(t => t.value === tarifa) || TARIFAS_IVA[2];
      return {
        codigo:           "2",
        codigoPorcentaje: tarifaInfo.codPorcentaje,
        tarifa:           tarifa,
        baseImponible:    datos.base,
        valor:            datos.valor,
      };
    });

    const payload: Record<string, unknown> = {
      establecimiento:    estabSelected,
      punto_emision:      ptoSelected,
      motivos:            motivos.map(m => ({ razon: m.razon.toUpperCase(), valor: m.valor })),
      impuestos,
      campos_adicionales: camposAdicionales.filter(c => c.nombre && c.valor),

      // Datos de cobro
      estado_cobro:            cobro.estado,
      forma_pago_cobro:        cobro.estado === "PAGADO" ? "EFECTIVO" : null,
      fecha_pago:              cobro.estado === "PAGADO" ? cobro.fecha_pago : null,
      numero_comprobante_pago: cobro.estado === "PAGADO" && cobro.referencia.trim()
                                 ? cobro.referencia.trim()
                                 : null,
    };

    if (docOrigen.tipo === "kipu") {
      payload.doc_origen_id = docOrigen.data.id;
    } else {
      payload.doc_origen_numero  = docOrigen.data.numero;
      payload.doc_origen_fecha   = docOrigen.data.fecha;
      payload.doc_origen_cod_doc = docOrigen.data.cod_doc;
      payload.cliente_origen     = docOrigen.data.cliente;
    }

    const r = await em.enviar("/api/v1/app/documentos/emit/NDB", payload,
                              { tipo: "NDB", porDefecto: "Error al emitir la nota de débito." });
    if (r) { borrador.borrar(); em.setResultado(r); }
  };

  if (resultado) {
    return <PantallaResultado tipo="NDB" resultado={resultado} onNueva={reset} />;
  }

  return (
    <EmisionLayout
      titulo="Nueva nota de débito"
      subtitulo={<>{empresa?.razon_social} · {empresa?.ambiente === 2 ? "Producción" : "Pruebas"}</>}
      tiposEmision={["NDB"]}
      borrador={borrador.pendiente && {
        hace: borrador.pendiente.hace, que: "una nota de débito",
        onSeguir: seguirBorrador, onDescartar: borrador.descartar,
      }}
      lateral={<>
        <div className="hidden lg:block">
          <PuntoEmision {...pe} />
        </div>
        <ResumenTotales
          serie={pe.serie}
          totales={totales}
          submitting={submitting}
          error={error}
          suscripcionActiva={empresa?.suscripcion_activa ?? false}
          balanceApi={empresa?.balance_api ?? 0}
          emisionGratis={!!empresa?.emision_gratis}
          usoJusto={em.esUsoJusto}
          onEmitir={emitir}
          conBarraFija
        />
      </>}
      barra={{
        total:         totales.total,
        texto:         `Emitir${pe.serie ? ` desde ${pe.serie}` : ""}`,
        onEmitir:      emitir,
        enviando:      submitting,
        deshabilitado: !puedeEmitir || esConsumidorFinal,
        error,
      }}
    >
      <div className="lg:hidden">
        <PuntoEmision {...pe} />
      </div>

      <DocOrigenSelector
        tiposDoc="FAC"
        tabla="emitidos"
        value={docOrigen}
        onChange={setDocOrigen}
        label="Factura a modificar"
      />

      {esConsumidorFinal && (
        <div className="flex items-start gap-3 rounded-xl border border-peligro/20 bg-peligro-suave px-4 py-3" role="alert">
          <AlertTriangle size={16} className="mt-0.5 shrink-0 text-peligro" aria-hidden />
          <div>
            <p className="text-sm font-medium text-peligro-texto">No disponible para Consumidor Final</p>
            <p className="mt-1 text-xs text-tenue">
              Por normativa del SRI, los comprobantes emitidos a Consumidor Final no se modifican con notas de crédito ni de débito.
            </p>
          </div>
        </div>
      )}

      {/* Motivos (cargos) */}
      <section className="space-y-3 rounded-xl border border-borde bg-superficie p-4">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-texto">
          <ReceiptText size={16} className="text-acento" aria-hidden /> Qué se cobra
        </h2>

        {motivos.map((m, idx) => (
          <div key={m._id} className="space-y-3 rounded-lg border border-borde p-3">
            <div className="flex items-center gap-2">
              <Entrada
                value={m.razon}
                onChange={e => editMotivo(m._id, "razon", e.target.value)}
                placeholder="Ej.: Interés por mora"
                aria-label={`Motivo ${idx + 1}`}
                className="min-w-0 flex-1"
              />
              {motivos.length > 1 && (
                <BotonIcono etiqueta={`Quitar el motivo ${idx + 1}`} icono={<Trash2 size={16} />}
                            variante="peligro" onClick={() => removeMotivo(m._id)} />
              )}
            </div>

            {/* Sugerencias rápidas */}
            {!m.razon && (
              <div className="flex flex-wrap gap-1.5">
                {RAZONES_SUGERIDAS.map(r => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => editMotivo(m._id, "razon", r)}
                    className="h-7 rounded-full border border-borde px-2.5 text-xs text-tenue transition-colors hover:text-texto active:bg-presionado tactil:h-8"
                  >
                    {r}
                  </button>
                ))}
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <Campo etiqueta="Valor (sin IVA)" id={`ndb-valor-${m._id}`}>
                <InputDecimal
                  id={`ndb-valor-${m._id}`}
                  value={m.valor}
                  placeholder="0.00"
                  onChange={(v) => editMotivo(m._id, "valor", v)}
                  className={CLASE_VALOR}
                />
              </Campo>
              <Campo etiqueta="IVA" ayuda={parseFloat(m.tipo_iva) > 0 && m.valor > 0
                ? `+$${fmt(r2(m.valor * parseFloat(m.tipo_iva) / 100))} de IVA` : undefined}>
                <Selector value={m.tipo_iva} onChange={e => editMotivo(m._id, "tipo_iva", e.target.value)}>
                  {TARIFAS_IVA.map(t => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </Selector>
              </Campo>
            </div>
          </div>
        ))}

        <div className="flex items-center justify-between gap-3">
          <Boton variante="secundario" tamano="sm" onClick={addMotivo} icono={<Plus size={14} />}>
            Agregar motivo
          </Boton>
          {motivos.length > 1 && (
            <p className="text-sm text-tenue">
              Total <span className="font-bold tabular-nums text-texto">${fmt(totales.total)}</span>
            </p>
          )}
        </div>
      </section>

      <CamposAdicionales campos={camposAdicionales} onChange={setCamposAdicionales} />

      <EstadoCobro cobro={cobro} onChange={setCobro} />
    </EmisionLayout>
  );
}
