"use client";
// Nota de débito: la factura a la que se le cobra algo más (interés por mora,
// gastos de cobranza…), los cargos con su IVA y si ya se cobró.
// Con ?doc_id=… llega con la factura elegida.

import { useState, useEffect, useMemo } from "react";
import { r2, dosDecimales } from "@/lib/dinero";
import { useSearchParams } from "next/navigation";
import api from "@/lib/api";
import { useAuthStore } from "@/store/auth.store";
import { useBorrador } from "@/lib/borradores";
import { Plus, Trash2, ReceiptText } from "lucide-react";
import Boton from "@/components/ui/Boton";
import BotonIcono from "@/components/ui/BotonIcono";
import { Campo, Entrada, Selector } from "@/components/ui/Campo";
import PuntoEmision from "../components/PuntoEmision";
import PantallaResultado from "../components/PantallaResultado";
import { usePuntoEmision } from "../components/usePuntoEmision";
import CamposAdicionales, { CampoAdicional } from "../components/CamposAdicionales";
import EstadoCobro, { DatosCobro, cobroInicial } from "../components/EstadoCobro";
import ResumenTotales from "../components/ResumenTotales";
import DocOrigenSelector, {
  DocOrigen, AvisoOrigenConsumidorFinal, docOrigenDeDocumento, esConsumidorFinal, numeroDocOrigen, payloadDocOrigen,
} from "../components/DocOrigenSelector";
import EmisionLayout from "../components/EmisionLayout";
import { InputDecimal } from "../components/HojaItem";
import { genId } from "../components/ItemsEditor";
import { useEmision } from "../components/useEmision";
import { tieneAccesoAEmitir } from "@/lib/emision";

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

  // El SRI no deja modificar comprobantes a Consumidor Final
  const aConsumidorFinal = esConsumidorFinal(docOrigen);

  // Motivos (cargos) con su tarifa de IVA
  const [motivos, setMotivos] = useState<Motivo[]>(() => [motivoVacio()]);

  // Campos adicionales
  const [camposAdicionales, setCamposAdicionales] = useState<CampoAdicional[]>([]);

  // Estado cobro
  const [cobro, setCobro] = useState<DatosCobro>(cobroInicial);

  // Establecimiento y punto de emisión
  const pe = usePuntoEmision(numeroDocOrigen(docOrigen));
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
        const res = await api.get(`/api/v1/app/documentos/${docId}`);
        setDocOrigen(docOrigenDeDocumento(res.data.data));
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

  const puedeEmitir = tieneAccesoAEmitir(empresa);

  const emitir = async () => {
    setError("");

    if (aConsumidorFinal) {
      setError("Por normativa del SRI, no se pueden emitir notas de débito para comprobantes a Consumidor Final.");
      return;
    }
    if (!docOrigen)                     { setError("Selecciona el documento a modificar."); return; }
    if (!estabSelected || !ptoSelected) { setError("Elige el establecimiento y el punto de emisión."); return; }
    if (motivos.some(m => !m.razon.trim())) { setError("Todos los motivos deben tener descripción."); return; }
    if (totales.total <= 0)             { setError("El valor total debe ser mayor a $0."); return; }
    if (!puedeEmitir) { setError("Se requiere suscripción activa o créditos API."); return; }

    // Un impuesto por cada tarifa usada, con la base y el IVA ya agrupados en totales
    const porTarifa: Record<string, { base: number; valor: number }> = {
      "15": { base: totales.subtotal_15, valor: totales.iva_15 },
      "5":  { base: totales.subtotal_5,  valor: totales.iva_5  },
      "0":  { base: totales.subtotal_0,  valor: 0 },
    };
    const tarifasUsadas = [...new Set(motivos.map(m => m.tipo_iva === "15" || m.tipo_iva === "5" ? m.tipo_iva : "0"))]
      .sort((a, b) => Number(a) - Number(b));
    const impuestos = tarifasUsadas.map(tarifa => ({
      codigo:           "2",
      codigoPorcentaje: TARIFAS_IVA.find(t => t.value === tarifa)!.codPorcentaje,
      tarifa,
      baseImponible:    porTarifa[tarifa].base,
      valor:            porTarifa[tarifa].valor,
    }));

    const payload: Record<string, unknown> = {
      establecimiento:    estabSelected,
      punto_emision:      ptoSelected,
      motivos:            motivos.map(m => ({ razon: m.razon.toUpperCase(), valor: m.valor })),
      impuestos,
      campos_adicionales: camposAdicionales.filter(c => c.nombre && c.valor),

      // Datos de cobro
      estado_cobro:            cobro.estado,
      forma_pago_cobro:        cobro.estado === "PAGADO" ? (cobro.forma ?? "EFECTIVO") : null,
      fecha_pago:              cobro.estado === "PAGADO" ? cobro.fecha_pago : null,
      numero_comprobante_pago: cobro.estado === "PAGADO" && cobro.referencia.trim()
                                 ? cobro.referencia.trim()
                                 : null,
      ...payloadDocOrigen(docOrigen),
    };

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
      puntoEmision={<PuntoEmision {...pe} />}
      tiposEmision={["NDB"]}
      borrador={borrador.pendiente && {
        hace: borrador.pendiente.hace, que: "una nota de débito",
        onSeguir: seguirBorrador, onDescartar: borrador.descartar,
      }}
      lateral={
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
      }
      barra={{
        total:         totales.total,
        texto:         `Emitir${pe.serie ? ` desde ${pe.serie}` : ""}`,
        onEmitir:      emitir,
        enviando:      submitting,
        deshabilitado: !puedeEmitir || aConsumidorFinal,
        error,
      }}
    >
      <DocOrigenSelector
        tiposDoc="FAC"
        tabla="emitidos"
        value={docOrigen}
        onChange={setDocOrigen}
        label="Factura a modificar"
      />

      {aConsumidorFinal && <AvisoOrigenConsumidorFinal />}

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
                ? `+$${dosDecimales(r2(m.valor * parseFloat(m.tipo_iva) / 100))} de IVA` : undefined}>
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
              Total <span className="font-bold tabular-nums text-texto">${dosDecimales(totales.total)}</span>
            </p>
          )}
        </div>
      </section>

      <CamposAdicionales campos={camposAdicionales} onChange={setCamposAdicionales} />

      <EstadoCobro cobro={cobro} onChange={setCobro} conForma />
    </EmisionLayout>
  );
}
