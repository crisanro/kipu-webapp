"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import { useAuthStore } from "@/store/auth.store";
import { ClipboardList, AlertTriangle } from "lucide-react";
import { hoyEC } from "@/lib/fecha";

// ── Componentes reutilizados de factura ────────────────────────────────────────
import ClienteSelector from "../../documentos/emitir/components/ClienteSelector";
import ItemsEditor, { Item, calcItem, genId, EMPTY_ITEM } from "../../documentos/emitir/components/ItemsEditor";
import CamposAdicionales, { CampoAdicional } from "../../documentos/emitir/components/CamposAdicionales";

// ── Tipos ──────────────────────────────────────────────────────────────────────
interface Cliente {
  id:                      string;
  razon_social:            string;
  identificacion:          string;
  tipo_identificacion_sri: string;
  email:                   string;
  direccion:               string;
}

interface ClienteNuevo {
  tipo_identificacion_sri: string;
  identificacion:          string;
  razon_social:            string;
  email:                   string;
}

// ── Helpers ────────────────────────────────────────────────────────────────────
const r2  = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;
const fmt = (n: number) => r2(n).toFixed(2);

function calcTotales(items: Item[]) {
  return items.reduce(
    (acc, item) => {
      const c = calcItem(item);
      return {
        subtotal:  r2(acc.subtotal  + c.base),
        descuento: r2(acc.descuento + c.descuento),
        iva:       r2(acc.iva       + c.iva),
        total:     r2(acc.total     + c.total),
      };
    },
    { subtotal: 0, descuento: 0, iva: 0, total: 0 }
  );
}

// ── Página ─────────────────────────────────────────────────────────────────────
export default function NuevaProformaPage() {
  const router  = useRouter();
  const empresa = useAuthStore((s) => s.empresa);
  const tieneSub = empresa?.suscripcion_activa ?? false;

  // ── Estado cliente ───────────────────────────────────────────────────────────
  const [clienteSelected,   setClienteSelected]   = useState<Cliente | null>(null);
  const [esConsumidorFinal, setEsConsumidorFinal] = useState(false);
  const [clienteNuevo,      setClienteNuevo]      = useState<ClienteNuevo | null>(null);

  // ── Estado items ─────────────────────────────────────────────────────────────
  const [items, setItems] = useState<Item[]>([{ _id: genId(), ...EMPTY_ITEM }]);

  // ── Estado campos adicionales ────────────────────────────────────────────────
  const [camposAdicionales, setCamposAdicionales] = useState<CampoAdicional[]>([]);

  // ── Estado fechas ────────────────────────────────────────────────────────────
  const [fechaEmision, setFechaEmision] = useState(hoyEC());
  const [fechaValidez, setFechaValidez] = useState("");

  // ── Estado UI ────────────────────────────────────────────────────────────────
  const [submitting, setSubmitting] = useState(false);
  const [error,      setError]      = useState("");

  // ── Totales ──────────────────────────────────────────────────────────────────
  const totales = calcTotales(items);

  // ── Prefill desde proforma existente (si viene de "clonar") ──────────────────
  useEffect(() => {
    const prefill = sessionStorage.getItem("kipu:prefill");
    if (!prefill) return;
    try {
      const data = JSON.parse(prefill);
      if (data.items && Array.isArray(data.items)) {
        setItems(data.items.map((i: any) => ({
          _id:            genId(),
          codigo:         String(i.codigo           ?? ""),
          descripcion:    String(i.descripcion     ?? ""),
          cantidad:       parseFloat(i.cantidad)  || 1,
          precio:         parseFloat(i.precio     ) || parseFloat(i.precio_unitario) || 0,
          descuento:      parseFloat(i.descuento) || 0,
          tipo_descuento: (i.tipo_descuento === "%" ? "%" : "$") as "$" | "%",
          tipo_iva:       ["0","5","15"].includes(String(i.tipo_iva)) ? String(i.tipo_iva) : "15",
          unidad:         String(i.unidad ?? "UNIDAD"),
        })));
      }
      if (data.camposAdicionales) setCamposAdicionales(data.camposAdicionales);
      if (data.cliente) {
        setClienteSelected({
          id:                      data.cliente.id || "",
          razon_social:            data.cliente.razon_social || "",
          identificacion:          data.cliente.identificacion || "",
          tipo_identificacion_sri: data.cliente.tipo_id || "05",
          email:                   "",
          direccion:               "",
        });
      }
    } catch (e) {
      console.error("Error al procesar prefill", e);
    } finally {
      sessionStorage.removeItem("kipu:prefill");
    }
  }, []);

  // ── Guardar ──────────────────────────────────────────────────────────────────
  const guardar = async () => {
    setError("");

    if (!esConsumidorFinal && !clienteSelected && !clienteNuevo) {
      setError("Selecciona un cliente o elige Consumidor Final.");
      return;
    }
    if (clienteNuevo && !clienteNuevo.razon_social.trim()) {
      setError("El nombre del cliente es obligatorio.");
      return;
    }
    if (items.some((i) => !i.descripcion?.trim())) {
      setError("Todos los ítems deben tener descripción.");
      return;
    }
    if (items.some((i) => i.precio <= 0)) {
      setError("Todos los ítems deben tener precio mayor a cero.");
      return;
    }

    setSubmitting(true);
    try {
      // Si hay cliente nuevo, crearlo primero
      let clienteId: string | null = null;
      if (clienteNuevo) {
        const res = await api.post("/api/v1/app/clientes", {
          tipo_identificacion_sri: clienteNuevo.tipo_identificacion_sri,
          identificacion:          clienteNuevo.identificacion,
          razon_social:            clienteNuevo.razon_social,
          email:                   clienteNuevo.email,
        });
        clienteId = res.data.uid ?? null;
      } else if (clienteSelected && !esConsumidorFinal) {
        clienteId = clienteSelected.id;
      }

      const res = await api.post("/api/v1/app/proformas", {
        cliente_id:    clienteId,
        fecha_emision: fechaEmision || null,
        fecha_validez: fechaValidez || null,
        notas:         camposAdicionales
          .filter((c) => c.nombre && c.valor)
          .map((c) => `${c.nombre}: ${c.valor}`)
          .join(" | ") || null,
        items: items.map((i) => {
          return {
            descripcion:     i.descripcion,
            cantidad:        i.cantidad,
            precio_unitario: i.precio,
            tipo_iva:        parseInt(i.tipo_iva) || 0,
          };
        }),
      });

      router.push(`/proformas/${res.data.id}`);
    } catch (err: any) {
      const detail = err?.response?.data?.detail;
      setError(
        Array.isArray(detail)
          ? detail.map((e: any) => e.mensaje ?? e.msg ?? JSON.stringify(e)).join(", ")
          : detail ?? "Error al guardar la proforma."
      );
    } finally {
      setSubmitting(false);
    }
  };

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-6">

      {/* Header */}
      <div>
        <h1 className="text-xl font-bold" style={{ color: "var(--kipu-text)" }}>Nueva Proforma</h1>
        <p className="text-sm" style={{ color: "var(--kipu-subtle)" }}>
          {empresa?.razon_social} · Documento no tributario
        </p>
      </div>

      {/* Bloqueo sin suscripción */}
      {!tieneSub && (
        <div
          className="flex flex-col items-center justify-center py-16 text-center rounded-xl"
          style={{
            background: "var(--kipu-surface)",
            border: "1px solid var(--kipu-border)",
          }}
        >
          <AlertTriangle size={36} className="mb-3" style={{ color: "var(--kipu-warning)" }} />
          <h2 className="font-semibold mb-1" style={{ color: "var(--kipu-text)" }}>Suscripción requerida</h2>
          <p className="text-sm mb-4 max-w-xs" style={{ color: "var(--kipu-subtle)" }}>
            Las proformas están disponibles con un plan activo. Activa tu suscripción para continuar.
          </p>
          <div className="flex gap-3">
            <button
              onClick={() => router.back()}
              className="px-4 py-2 rounded-lg text-sm transition-colors"
              style={{
                border: "1px solid var(--kipu-border)",
                color: "var(--kipu-muted)",
              }}
              onMouseEnter={e => e.currentTarget.style.color = "var(--kipu-text)"}
              onMouseLeave={e => e.currentTarget.style.color = "var(--kipu-muted)"}
            >
              Volver
            </button>
            <button
              onClick={() => router.push("/planes")}
              className="px-4 py-2 rounded-lg text-white text-sm font-medium transition-colors"
              style={{ background: "var(--kipu-warning)" }}
            >
              Ver planes
            </button>
          </div>
        </div>
      )}

      {/* Formulario — solo si tiene suscripción */}
      {tieneSub && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* ── Columna principal ── */}
          <div className="lg:col-span-2 space-y-6">

            {/* Cliente */}
            <ClienteSelector
              clienteSelected={clienteSelected}
              esConsumidorFinal={esConsumidorFinal}
              clienteNuevo={clienteNuevo}
              onSelectCliente={(c) => {
                setClienteSelected(c);
                setEsConsumidorFinal(false);
                setClienteNuevo(null);
              }}
              onSelectConsumidorFinal={() => {
                setClienteSelected(null);
                setEsConsumidorFinal(true);
                setClienteNuevo(null);
              }}
              onClienteNuevo={(c) => {
                setClienteNuevo(c);
                if (c) {
                  setClienteSelected(null);
                  setEsConsumidorFinal(false);
                }
              }}
              onClear={() => {
                setClienteSelected(null);
                setEsConsumidorFinal(false);
              }}
            />

            {/* Items */}
            <ItemsEditor items={items} onChange={setItems} />

            {/* Campos adicionales — usados como observaciones en el PDF */}
            <CamposAdicionales
              campos={camposAdicionales}
              onChange={setCamposAdicionales}
            />
          </div>

          {/* ── Panel lateral ── */}
          <div className="space-y-4">

            {/* Fechas */}
            <div
              className="rounded-xl p-4 space-y-3"
              style={{
                background: "var(--kipu-surface)",
                border: "1px solid var(--kipu-border)",
              }}
            >
              <h2 className="text-sm font-semibold" style={{ color: "var(--kipu-text)" }}>Fechas</h2>
              <div>
                <label className="block text-xs mb-1.5" style={{ color: "var(--kipu-subtle)" }}>Fecha emisión</label>
                <input
                  type="date"
                  value={fechaEmision}
                  onChange={(e) => setFechaEmision(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg text-sm transition-colors focus:outline-none"
                  style={{
                    background: "var(--kipu-surface)",
                    border: "1px solid var(--kipu-border)",
                    color: "var(--kipu-text)",
                  }}
                  onFocus={e => e.currentTarget.style.borderColor = "var(--kipu-accent)"}
                  onBlur={e => e.currentTarget.style.borderColor = "var(--kipu-border)"}
                />
              </div>
              <div>
                <label className="block text-xs mb-1.5" style={{ color: "var(--kipu-subtle)" }}>Válida hasta</label>
                <input
                  type="date"
                  value={fechaValidez}
                  onChange={(e) => setFechaValidez(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg text-sm transition-colors focus:outline-none"
                  style={{
                    background: "var(--kipu-surface)",
                    border: "1px solid var(--kipu-border)",
                    color: "var(--kipu-text)",
                  }}
                  onFocus={e => e.currentTarget.style.borderColor = "var(--kipu-accent)"}
                  onBlur={e => e.currentTarget.style.borderColor = "var(--kipu-border)"}
                />
                <p className="text-xs mt-1" style={{ color: "var(--kipu-subtle)" }}>Opcional — si no, no vence</p>
              </div>
            </div>

            {/* Resumen */}
            <div
              className="rounded-xl p-4 sticky top-4"
              style={{
                background: "var(--kipu-surface)",
                border: "1px solid var(--kipu-border)",
              }}
            >
              <h2 className="text-sm font-semibold mb-4" style={{ color: "var(--kipu-text)" }}>Resumen</h2>
              <div className="space-y-2 text-sm">
                {totales.subtotal > 0 && (
                  <div className="flex justify-between" style={{ color: "var(--kipu-muted)" }}>
                    <span>Subtotal</span>
                    <span>${fmt(totales.subtotal)}</span>
                  </div>
                )}
                {totales.descuento > 0 && (
                  <div className="flex justify-between" style={{ color: "var(--kipu-warning)" }}>
                    <span>Descuento</span>
                    <span>-${fmt(totales.descuento)}</span>
                  </div>
                )}
                {totales.iva > 0 && (
                  <div className="flex justify-between" style={{ color: "var(--kipu-muted)" }}>
                    <span>IVA</span>
                    <span>${fmt(totales.iva)}</span>
                  </div>
                )}
                <div
                  className="pt-2 flex justify-between font-bold text-base"
                  style={{
                    borderTop: "1px solid var(--kipu-border)",
                    color: "var(--kipu-text)",
                  }}
                >
                  <span>Total</span>
                  <span>${fmt(totales.total)}</span>
                </div>
              </div>

              <div
                className="mt-3 px-3 py-2 rounded-lg text-xs flex items-center gap-2"
                style={{
                  background: "color-mix(in srgb, var(--kipu-text) 5%, transparent)",
                  color: "var(--kipu-subtle)",
                }}
              >
                <ClipboardList size={12} />
                Documento referencial — no tiene validez tributaria
              </div>

              {error && (
                <p
                  className="mt-3 text-xs px-3 py-2 rounded-lg"
                  style={{
                    color: "var(--kipu-danger)",
                    background: "color-mix(in srgb, var(--kipu-danger) 10%, transparent)",
                  }}
                >
                  {error}
                </p>
              )}

              <button
                onClick={guardar}
                disabled={submitting}
                className="mt-4 w-full py-3 rounded-lg text-white font-semibold text-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ background: "var(--kipu-accent)" }}
                onMouseEnter={e => {
                  if (!submitting) e.currentTarget.style.background = "var(--kipu-accent-h)";
                }}
                onMouseLeave={e => {
                  if (!submitting) e.currentTarget.style.background = "var(--kipu-accent)";
                }}
              >
                {submitting ? (
                  <>
                    <div
                      className="w-4 h-4 border-2 border-t-transparent rounded-full animate-spin"
                      style={{ borderColor: "#FFFFFF", borderTopColor: "transparent" }}
                    />
                    Guardando...
                  </>
                ) : (
                  `Guardar proforma · $${fmt(totales.total)}`
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}