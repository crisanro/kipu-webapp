"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { v4 as uuidv4 } from "uuid";
import api from "@/lib/api";
import { useAuthStore } from "@/store/auth.store";
import { CheckCircle2, AlertTriangle } from "lucide-react";
import PuntoEmision from "../components/PuntoEmision";
import CamposAdicionales, { CampoAdicional } from "../components/CamposAdicionales";
import ItemsEditor, { Item, calcItem, genId, EMPTY_ITEM } from "../components/ItemsEditor";
import ResumenTotales from "../components/ResumenTotales";
import DocOrigenSelector, { DocOrigen } from "../components/DocOrigenSelector";

// ── Helpers ──────────────────────────────────────────────────────────────────
const r2  = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;
const fmt = (n: number) => r2(n).toFixed(2);

function calcTotales(items: Item[]) {
  const base = items.reduce(
    (acc, item) => {
      const c = calcItem(item);
      acc.subtotal    = r2(acc.subtotal + c.base);
      acc.descuento   = r2(acc.descuento + c.descuento);
      acc.iva         = r2(acc.iva + c.iva);
      acc.subtotal_0  = r2(acc.subtotal_0  + (item.tipo_iva === "0"  ? c.base : 0));
      acc.subtotal_5  = r2(acc.subtotal_5  + (item.tipo_iva === "5"  ? c.base : 0));
      acc.subtotal_15 = r2(acc.subtotal_15 + (item.tipo_iva === "15" ? c.base : 0));
      acc.iva_5       = r2(acc.iva_5  + (item.tipo_iva === "5"  ? c.iva : 0));
      acc.iva_15      = r2(acc.iva_15 + (item.tipo_iva === "15" ? c.iva : 0));
      return acc;
    },
    { subtotal: 0, descuento: 0, iva: 0, subtotal_0: 0, subtotal_5: 0, subtotal_15: 0, iva_5: 0, iva_15: 0 }
  );
  return { ...base, propina: 0, total: r2(base.subtotal + base.iva) };
}

const MOTIVOS = [
  "DEVOLUCION DE BIEN",
  "ANULACION DE COMPROBANTE",
  "REBAJA DE PRECIO",
  "DESCUENTO COMERCIAL",
  "OTROS",
];

interface Establecimiento {
  codigo:            string;
  nombre_comercial?: string;
  direccion:         string;
  puntos_emision:    { codigo: string; nombre?: string }[];
}

// ── Página ────────────────────────────────────────────────────────────────────
export default function NuevaNcrPage() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const empresa      = useAuthStore((s) => s.empresa);

  // ── Idempotencia ────────────────────────────────────────────────────────────
  const idempotencyKey = useRef(uuidv4());

  // Doc origen
  const [docOrigen, setDocOrigen] = useState<DocOrigen>(null);

  // Formulario
  const [motivo,              setMotivo]              = useState(MOTIVOS[0]);
  const [motivoPersonalizado, setMotivoPersonalizado] = useState("");
  const [items,               setItems]               = useState<Item[]>([{ _id: genId(), ...EMPTY_ITEM }]);
  const [camposAdicionales,   setCamposAdicionales]   = useState<CampoAdicional[]>([]);

  // Establecimiento
  const [establecimientos, setEstablecimientos] = useState<Establecimiento[]>([]);
  const [estabSelected,    setEstabSelected]    = useState("");
  const [ptoSelected,      setPtoSelected]      = useState("");
  const [puntos,           setPuntos]           = useState<{ codigo: string; nombre?: string }[]>([]);

  // UI
  const [submitting, setSubmitting] = useState(false);
  const [resultado,  setResultado]  = useState<any>(null);
  const [error,      setError]      = useState("");

  const totales = calcTotales(items);

  const motivoFinal = motivo === "OTROS" && motivoPersonalizado.trim()
    ? motivoPersonalizado.trim().toUpperCase()
    : motivo;

  // Cargar estructura
  useEffect(() => {
    const cargar = async () => {
      try {
        const cached = sessionStorage.getItem("kipu:estructura");
        const estabs = cached
          ? JSON.parse(cached)
          : (await api.get("/api/v1/app/estructura")).data.data ?? [];
        if (!cached) sessionStorage.setItem("kipu:estructura", JSON.stringify(estabs));
        setEstablecimientos(estabs);
        if (estabs.length > 0) {
          setEstabSelected(estabs[0].codigo);
          const ptos = estabs[0].puntos_emision ?? [];
          setPuntos(ptos);
          if (ptos.length > 0) setPtoSelected(ptos[0].codigo);
        }
      } catch (e) { console.error(e); }
    };
    cargar();
  }, []);

  // Pre-cargar doc desde query param ?doc_id=xxx
  useEffect(() => {
    const docId = searchParams.get("doc_id");
    if (!docId) return;
    const cargar = async () => {
      try {
        const res = await api.get(`/api/v1/app/documentos/${docId}`);
        const d   = res.data.data;
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

        // Pre-llenar ítems desde la factura origen
        const detalles = d.datos?.detalles?.detalle ?? [];
        const arr = Array.isArray(detalles) ? detalles : [detalles];
        if (arr.length > 0) {
          setItems(arr.map((det: any) => ({
            _id:            genId(),
            codigo:         det.codigoPrincipal || det.codigoInterno || "",
            descripcion:    det.descripcion || "",
            cantidad:       parseFloat(det.cantidad) || 1,
            precio:         parseFloat(det.precioUnitario) || 0,
            descuento:      parseFloat(det.descuento) || 0,
            tipo_descuento: "$" as "$",
            tipo_iva:       _detectarTipoIva(det),
            unidad:         det.unidadMedida || "UNIDAD",
          })));
        }
      } catch (e) { console.error(e); }
    };
    cargar();
  }, [searchParams]);

  const handleEstabChange = (codigo: string, ptos: { codigo: string; nombre?: string }[]) => {
    setEstabSelected(codigo);
    setPuntos(ptos);
    setPtoSelected(ptos[0]?.codigo ?? "");
  };

  const reset = () => {
    idempotencyKey.current = uuidv4(); // Regenerar key al resetear
    setResultado(null);
    setDocOrigen(null);
    setMotivo(MOTIVOS[0]);
    setMotivoPersonalizado("");
    setItems([{ _id: genId(), ...EMPTY_ITEM }]);
    setCamposAdicionales([]);
    setError("");
  };

  const emitir = async () => {
    setError("");
    if (!docOrigen) { setError("Selecciona el documento a modificar."); return; }
    if (!motivoFinal.trim()) { setError("Ingresa el motivo."); return; }
    if (!estabSelected || !ptoSelected) { setError("Configura el punto de emisión."); return; }
    if (items.some(i => !i.descripcion?.trim())) { setError("Todos los ítems deben tener descripción."); return; }
    if (totales.total <= 0) { setError("El valor de modificación debe ser mayor a $0."); return; }

    const puedeEmitir = empresa?.suscripcion_activa || (empresa?.balance_api ?? 0) > 0;
    if (!puedeEmitir) { setError("Se requiere suscripción activa o créditos API."); return; }

    setSubmitting(true);
    try {
      const payload: any = {
        establecimiento: estabSelected,
        punto_emision:   ptoSelected,
        motivo:          motivoFinal,
        items: items.map(i => {
          const c = calcItem(i);
          return {
            codigo:          i.codigo || undefined,
            descripcion:     i.descripcion,
            cantidad:        i.cantidad,
            precio_unitario: i.precio,
            descuento:       c.descuento,
            tipo_iva:        i.tipo_iva,
            unidad_medida:   i.unidad,
          };
        }),
        campos_adicionales: camposAdicionales.filter(c => c.nombre && c.valor),
      };

      if (docOrigen?.tipo === "kipu") {
        payload.doc_origen_id = docOrigen.data.id;
      } else if (docOrigen?.tipo === "manual") {
        payload.doc_origen_numero  = docOrigen.data.numero;
        payload.doc_origen_fecha   = docOrigen.data.fecha;
        payload.doc_origen_cod_doc = docOrigen.data.cod_doc;
        payload.cliente_origen     = docOrigen.data.cliente;
      }

      const res = await api.post(
        "/api/v1/app/documentos/emit/NCR",
        payload,
        {
          headers: {
            "X-Idempotency-Key": idempotencyKey.current,
          },
        }
      );
      setResultado(res.data);
    } catch (err: any) {
      // Regenerar key si ocurre un error durante el envío
      idempotencyKey.current = uuidv4();

      const detail = err?.response?.data?.detail;
      setError(Array.isArray(detail)
        ? detail.map((e: any) => `${e.campo}: ${e.mensaje}`).join(" | ")
        : detail ?? "Error al emitir la nota de crédito."
      );
    } finally {
      setSubmitting(false);
    }
  };

  // Pantalla resultado
  if (resultado) {
    return (
      <div
        className="min-h-screen flex items-center justify-center p-6"
        style={{ background: "var(--kipu-bg)" }}
      >
        <div className="w-full max-w-sm text-center">
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
            style={{
              background: "color-mix(in srgb, var(--kipu-success) 20%, transparent)",
            }}
          >
            <CheckCircle2 size={32} style={{ color: "var(--kipu-success)" }} />
          </div>
          <h2 className="text-xl font-bold mb-1" style={{ color: "var(--kipu-text)" }}>
            Nota de crédito emitida
          </h2>
          <p className="text-sm mb-2" style={{ color: "var(--kipu-subtle)" }}>{resultado.claveAcceso}</p>
          <span
            className="inline-block px-3 py-1 rounded-full text-xs font-medium mb-6"
            style={{
              background: "color-mix(in srgb, var(--kipu-success) 20%, transparent)",
              color: "var(--kipu-success)",
            }}
          >
            {resultado.estado}
          </span>
          <div className="flex gap-3">
            <button
              onClick={reset}
              className="flex-1 py-2.5 rounded-lg text-sm transition-colors"
              style={{
                border: "1px solid var(--kipu-border)",
                color: "var(--kipu-muted)",
              }}
              onMouseEnter={e => e.currentTarget.style.color = "var(--kipu-text)"}
              onMouseLeave={e => e.currentTarget.style.color = "var(--kipu-muted)"}
            >
              Nueva NCR
            </button>
            <button
              onClick={() => router.push("/documentos")}
              className="flex-1 py-2.5 rounded-lg text-white text-sm font-medium transition-colors"
              style={{ background: "var(--kipu-accent)" }}
              onMouseEnter={e => e.currentTarget.style.background = "var(--kipu-accent-h)"}
              onMouseLeave={e => e.currentTarget.style.background = "var(--kipu-accent)"}
            >
              Ver documentos
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold" style={{ color: "var(--kipu-text)" }}>
          Nueva Nota de Crédito{" "}
          <span className="text-base font-normal" style={{ color: "var(--kipu-subtle)" }}>
            NCR
          </span>
        </h1>
        <p className="text-sm" style={{ color: "var(--kipu-subtle)" }}>
          {empresa?.razon_social} · {empresa?.ambiente === 2 ? "Producción" : "Pruebas"}
        </p>
      </div>

      {empresa && !empresa.suscripcion_activa && empresa.balance_api === 0 && (
        <div
          className="flex items-center gap-2 rounded-lg px-4 py-3"
          style={{
            background: "color-mix(in srgb, var(--kipu-danger) 10%, transparent)",
            border: "1px solid color-mix(in srgb, var(--kipu-danger) 20%, transparent)",
          }}
        >
          <AlertTriangle size={16} className="shrink-0" style={{ color: "var(--kipu-danger)" }} />
          <p className="text-sm" style={{ color: "var(--kipu-danger)" }}>
            Sin acceso para emitir.{" "}
            <a href="/planes" className="underline">Ver opciones</a>
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">

          {/* Punto emisión móvil */}
          <div className="lg:hidden">
            <PuntoEmision
              establecimientos={establecimientos}
              estabSelected={estabSelected}
              ptoSelected={ptoSelected}
              puntos={puntos}
              onEstabChange={handleEstabChange}
              onPtoChange={setPtoSelected}
            />
          </div>

          {/* Selector Documento Origen */}
          <DocOrigenSelector
            tiposDoc="FAC"
            tabla="emitidos"
            value={docOrigen}
            onChange={setDocOrigen}
            label="Factura a modificar"
          />

          {/* Motivo */}
          <div
            className="rounded-xl p-4"
            style={{
              background: "var(--kipu-surface)",
              border: "1px solid var(--kipu-border)",
            }}
          >
            <h2 className="text-sm font-semibold mb-3" style={{ color: "var(--kipu-text)" }}>
              Motivo
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {MOTIVOS.map(m => {
                const isSelected = motivo === m;
                return (
                  <button
                    key={m}
                    type="button"
                    onClick={() => { setMotivo(m); setMotivoPersonalizado(""); }}
                    className="px-3 py-2.5 rounded-lg text-xs font-medium text-left transition-colors"
                    style={{
                      background: isSelected
                        ? "color-mix(in srgb, var(--kipu-accent) 10%, transparent)"
                        : "var(--kipu-surface)",
                      border: isSelected
                        ? "1px solid var(--kipu-accent)"
                        : "1px solid var(--kipu-border)",
                      color: isSelected ? "var(--kipu-accent)" : "var(--kipu-muted)",
                    }}
                    onMouseEnter={e => {
                      if (!isSelected) {
                        e.currentTarget.style.color = "var(--kipu-text)";
                        e.currentTarget.style.borderColor = "color-mix(in srgb, var(--kipu-text) 20%, transparent)";
                      }
                    }}
                    onMouseLeave={e => {
                      if (!isSelected) {
                        e.currentTarget.style.color = "var(--kipu-muted)";
                        e.currentTarget.style.borderColor = "var(--kipu-border)";
                      }
                    }}
                  >
                    {m}
                  </button>
                );
              })}
            </div>

            {/* Input para OTROS */}
            {motivo === "OTROS" && (
              <div className="mt-3">
                <input
                  value={motivoPersonalizado}
                  onChange={e => setMotivoPersonalizado(e.target.value.toUpperCase())}
                  placeholder="Describe el motivo..."
                  maxLength={300}
                  className="w-full px-3 py-2.5 rounded-lg text-sm transition-colors focus:outline-none"
                  style={{
                    background: "var(--kipu-surface)",
                    border: "1px solid color-mix(in srgb, var(--kipu-accent) 50%, transparent)",
                    color: "var(--kipu-text)",
                  }}
                  onFocus={e => e.currentTarget.style.borderColor = "var(--kipu-accent)"}
                  onBlur={e => e.currentTarget.style.borderColor = "color-mix(in srgb, var(--kipu-accent) 50%, transparent)"}
                  autoFocus
                />
                <p className="text-[10px] mt-1 text-right" style={{ color: "var(--kipu-subtle)" }}>
                  {motivoPersonalizado.length}/300
                </p>
              </div>
            )}
          </div>

          {/* Ítems a devolver/rebajar */}
          <ItemsEditor items={items} onChange={setItems} />

          {/* Campos adicionales */}
          <CamposAdicionales campos={camposAdicionales} onChange={setCamposAdicionales} />
        </div>

        {/* Panel lateral */}
        <div className="space-y-4">
          <div className="hidden lg:block">
            <PuntoEmision
              establecimientos={establecimientos}
              estabSelected={estabSelected}
              ptoSelected={ptoSelected}
              puntos={puntos}
              onEstabChange={handleEstabChange}
              onPtoChange={setPtoSelected}
            />
          </div>
          <ResumenTotales
            totales={totales}
            submitting={submitting}
            error={error}
            suscripcionActiva={empresa?.suscripcion_activa ?? false}
            balanceApi={empresa?.balance_api ?? 0}
            onEmitir={emitir}
          />
        </div>
      </div>
    </div>
  );
}

// Helper para detectar tipo IVA desde el XML del detalle
function _detectarTipoIva(det: any): string {
  const impuestos = det.impuestos?.impuesto;
  if (!impuestos) return "15";
  const arr = Array.isArray(impuestos) ? impuestos : [impuestos];
  const iva  = arr.find((i: any) => String(i.codigo) === "2");
  if (!iva) return "0";
  const tarifa = String(iva.tarifa || "15");
  if (tarifa === "0") return "0";
  if (tarifa === "5") return "5";
  return "15";
}