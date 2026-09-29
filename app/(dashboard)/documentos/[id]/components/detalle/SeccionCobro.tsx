"use client";
import { useState } from "react";
import {
  CheckCircle2, Clock, DollarSign, Pencil,
} from "lucide-react";
import api from "@/lib/api";
import { type FacturaBase, COBRO_CONFIG } from "./utils";

const FORMAS_PAGO_COBRO = [
  { value: "EFECTIVO",      label: "Efectivo" },
  { value: "TRANSFERENCIA", label: "Transferencia bancaria" },
  { value: "TARJETA",       label: "Tarjeta" },
  { value: "CHEQUE",        label: "Cheque" },
  { value: "OTRO",          label: "Otro" },
];

// Estado de cobro (FAC, LIQ, NDB autorizadas) con edición inline.
export default function SeccionCobro({ factura, onRecargar }: { factura: FacturaBase; onRecargar: () => void }) {
  const [editandoCobro,   setEditandoCobro]   = useState(false);
  const [cobroEstado,     setCobroEstado]     = useState(factura.estado_cobro ?? "PENDIENTE");
  const [cobroFormaPago,  setCobroFormaPago]  = useState(factura.forma_pago_cobro ?? "EFECTIVO");
  const [cobroFecha,      setCobroFecha]      = useState(factura.fecha_pago ?? new Date().toISOString().split("T")[0]);
  const [cobroReferencia, setCobroReferencia] = useState(factura.numero_comprobante_pago ?? "");
  const [guardandoCobro,  setGuardandoCobro]  = useState(false);
  const [errorCobro,      setErrorCobro]      = useState("");

  const cobro = factura.estado_cobro ? COBRO_CONFIG[factura.estado_cobro] : null;

  const abrirEdicionCobro = () => {
    setCobroEstado(factura.estado_cobro ?? "PENDIENTE");
    setCobroFormaPago(factura.forma_pago_cobro ?? "EFECTIVO");
    setCobroFecha(factura.fecha_pago ?? new Date().toISOString().split("T")[0]);
    setCobroReferencia(factura.numero_comprobante_pago ?? "");
    setErrorCobro("");
    setEditandoCobro(true);
  };
  const guardarCobro = async () => {
    setErrorCobro("");
    setGuardandoCobro(true);
    try {
      await api.patch(`/api/v1/app/documentos/${factura.id}/cobro`, {
        estado_cobro:            cobroEstado,
        forma_pago_cobro:        cobroEstado === "PAGADO" ? cobroFormaPago : null,
        fecha_pago:              cobroEstado === "PAGADO" ? cobroFecha : null,
        numero_comprobante_pago: cobroEstado === "PAGADO" && cobroReferencia.trim()
                                   ? cobroReferencia.trim()
                                   : null,
      });
      setEditandoCobro(false);
      onRecargar();
    } catch (err: any) {
      setErrorCobro(err?.response?.data?.detail ?? "Error al actualizar el cobro.");
    } finally {
      setGuardandoCobro(false);
    }
  };

  return (
    <>
      {/* Estado de cobro */}
      {["FAC", "LIQ", "NDB"].includes(factura.tipo_doc) && factura.estado_sri === "AUTORIZADO" && (
        <div
          className="rounded-xl p-4"
          style={{
            background: "var(--kipu-surface)",
            border: "1px solid var(--kipu-border)",
          }}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <DollarSign size={15} style={{ color: "var(--kipu-subtle)" }} />
              <h2 className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--kipu-subtle)" }}>
                Estado de Cobro
              </h2>
            </div>
            {!editandoCobro && (
              <button
                onClick={abrirEdicionCobro}
                className="flex items-center gap-1 text-xs transition-colors"
                style={{ color: "var(--kipu-subtle)" }}
                onMouseEnter={e => e.currentTarget.style.color = "var(--kipu-accent)"}
                onMouseLeave={e => e.currentTarget.style.color = "var(--kipu-subtle)"}
              >
                <Pencil size={11} />
                {factura.estado_cobro === "PAGADO" ? "Editar" : "Registrar cobro"}
              </button>
            )}
          </div>

          {editandoCobro ? (
            /* ── Modo edición ── */
            <div className="space-y-3">
              {/* Toggle estado */}
              <div
                className="flex rounded-lg overflow-hidden"
                style={{ border: "1px solid var(--kipu-border)" }}
              >
                <button
                  type="button"
                  onClick={() => setCobroEstado("PAGADO")}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 text-xs font-medium transition-colors"
                  style={{
                    background: cobroEstado === "PAGADO"
                      ? "color-mix(in srgb, var(--kipu-success) 15%, transparent)"
                      : "transparent",
                    color: cobroEstado === "PAGADO" ? "var(--kipu-success)" : "var(--kipu-subtle)",
                    borderRight: "1px solid var(--kipu-border)",
                  }}
                >
                  <CheckCircle2 size={13} />
                  Cobrada
                </button>
                <button
                  type="button"
                  onClick={() => setCobroEstado("PENDIENTE")}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 text-xs font-medium transition-colors"
                  style={{
                    background: cobroEstado === "PENDIENTE"
                      ? "color-mix(in srgb, var(--kipu-warning) 15%, transparent)"
                      : "transparent",
                    color: cobroEstado === "PENDIENTE" ? "var(--kipu-warning)" : "var(--kipu-subtle)",
                  }}
                >
                  <Clock size={13} />
                  Pendiente
                </button>
              </div>

              {/* Campos de pago — solo cuando está cobrada */}
              {cobroEstado === "PAGADO" && (
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <label className="block text-xs mb-1" style={{ color: "var(--kipu-subtle)" }}>Forma de pago</label>
                      <select
                        value={cobroFormaPago}
                        onChange={e => setCobroFormaPago(e.target.value)}
                        className="w-full px-2.5 py-2 rounded-lg text-sm transition-colors focus:outline-none"
                        style={{
                          background: "var(--kipu-surface)",
                          border: "1px solid var(--kipu-border)",
                          color: "var(--kipu-text)",
                        }}
                        onFocus={e => e.currentTarget.style.borderColor = "var(--kipu-accent)"}
                        onBlur={e => e.currentTarget.style.borderColor = "var(--kipu-border)"}
                      >
                        {FORMAS_PAGO_COBRO.map(f => (
                          <option key={f.value} value={f.value}>{f.label}</option>
                        ))}
                      </select>
                    </div>
                    <div className="flex-1">
                      <label className="block text-xs mb-1" style={{ color: "var(--kipu-subtle)" }}>Fecha de pago</label>
                      <input
                        type="date"
                        value={cobroFecha}
                        onChange={e => setCobroFecha(e.target.value)}
                        className="w-full px-2.5 py-2 rounded-lg text-sm transition-colors focus:outline-none"
                        style={{
                          background: "var(--kipu-surface)",
                          border: "1px solid var(--kipu-border)",
                          color: "var(--kipu-text)",
                        }}
                        onFocus={e => e.currentTarget.style.borderColor = "var(--kipu-accent)"}
                        onBlur={e => e.currentTarget.style.borderColor = "var(--kipu-border)"}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs mb-1" style={{ color: "var(--kipu-subtle)" }}>
                      Referencia <span style={{ color: "var(--kipu-subtle)" }}>(opcional)</span>
                    </label>
                    <input
                      type="text"
                      value={cobroReferencia}
                      onChange={e => setCobroReferencia(e.target.value)}
                      placeholder="N° transferencia, recibo..."
                      maxLength={100}
                      className="w-full px-2.5 py-2 rounded-lg text-sm transition-colors focus:outline-none"
                      style={{
                        background: "var(--kipu-surface)",
                        border: "1px solid var(--kipu-border)",
                        color: "var(--kipu-text)",
                      }}
                      onFocus={e => e.currentTarget.style.borderColor = "var(--kipu-accent)"}
                      onBlur={e => e.currentTarget.style.borderColor = "var(--kipu-border)"}
                    />
                  </div>
                </div>
              )}

              {/* Error */}
              {errorCobro && (
                <p
                  className="text-xs px-3 py-2 rounded-lg"
                  style={{
                    color: "var(--kipu-danger)",
                    background: "color-mix(in srgb, var(--kipu-danger) 10%, transparent)",
                  }}
                >
                  {errorCobro}
                </p>
              )}

              {/* Acciones */}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setEditandoCobro(false)}
                  className="flex-1 py-2 rounded-lg text-xs transition-colors"
                  style={{
                    border: "1px solid var(--kipu-border)",
                    color: "var(--kipu-muted)",
                  }}
                  onMouseEnter={e => e.currentTarget.style.color = "var(--kipu-text)"}
                  onMouseLeave={e => e.currentTarget.style.color = "var(--kipu-muted)"}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={guardarCobro}
                  disabled={guardandoCobro}
                  className="flex-1 py-2 rounded-lg text-white text-xs font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                  style={{ background: "var(--kipu-accent)" }}
                  onMouseEnter={e => { if (!guardandoCobro) e.currentTarget.style.background = "var(--kipu-accent-h)"; }}
                  onMouseLeave={e => { if (!guardandoCobro) e.currentTarget.style.background = "var(--kipu-accent)"; }}
                >
                  {guardandoCobro ? (
                    <div
                      className="w-3 h-3 border-2 border-t-transparent rounded-full animate-spin"
                      style={{ borderColor: "#FFFFFF", borderTopColor: "transparent" }}
                    />
                  ) : (
                    "Guardar"
                  )}
                </button>
              </div>
            </div>
          ) : (
            /* ── Modo lectura ── */
            <>
              {cobro && (
                <div
                  className="flex items-center gap-2 px-3 py-2 rounded-lg mb-2"
                  style={{
                    background: cobro.color === "var(--kipu-success)"
                      ? "color-mix(in srgb, var(--kipu-success) 10%, transparent)"
                      : "color-mix(in srgb, var(--kipu-warning) 10%, transparent)",
                  }}
                >
                  {factura.estado_cobro === "PAGADO" ? (
                    <CheckCircle2 size={14} style={{ color: cobro.color }} />
                  ) : (
                    <Clock size={14} style={{ color: cobro.color }} />
                  )}
                  <span className="text-sm font-medium" style={{ color: cobro.color }}>{cobro.label}</span>
                </div>
              )}
              {factura.estado_cobro === "PAGADO" && (
                <div className="space-y-1 text-sm">
                  {factura.forma_pago_cobro && (
                    <div className="flex justify-between">
                      <span style={{ color: "var(--kipu-subtle)" }}>Forma de pago</span>
                      <span style={{ color: "var(--kipu-text)" }}>{factura.forma_pago_cobro}</span>
                    </div>
                  )}
                  {factura.fecha_pago && (
                    <div className="flex justify-between">
                      <span style={{ color: "var(--kipu-subtle)" }}>Fecha de pago</span>
                      <span style={{ color: "var(--kipu-text)" }}>{factura.fecha_pago}</span>
                    </div>
                  )}
                  {factura.numero_comprobante_pago && (
                    <div className="flex justify-between">
                      <span style={{ color: "var(--kipu-subtle)" }}>Referencia</span>
                      <span className="font-mono text-xs" style={{ color: "var(--kipu-text)" }}>{factura.numero_comprobante_pago}</span>
                    </div>
                  )}
                </div>
              )}
              {factura.estado_cobro === "PENDIENTE" && (
                <p className="text-xs" style={{ color: "var(--kipu-subtle)" }}>
                  Registra el cobro cuando recibas el pago.
                </p>
              )}
            </>
          )}
        </div>
      )}
    </>
  );
}