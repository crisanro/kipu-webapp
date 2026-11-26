"use client";
import { useState } from "react";
import {
  CheckCircle2, Clock, DollarSign, Pencil,
} from "lucide-react";
import api from "@/lib/api";
import { hoyEC } from "@/lib/fecha";
import { type FacturaBase } from "./utils";
import { CLASES_TONO } from "@/components/ui/InsigniaEstado";
import { cn } from "@/components/ui/cn";
import LinkPago from "@/components/cobros/LinkPago";
import Seccion from "@/components/ui/Seccion";
import Boton from "@/components/ui/Boton";
import { detalleError } from "@/lib/errores";
import { ESTADOS_COBRO, FORMAS_COBRO } from "@/lib/estados";

// Estado de cobro (FAC, LIQ, NDB autorizadas) con edición inline.
export default function SeccionCobro({ factura, onRecargar }: { factura: FacturaBase; onRecargar: () => void }) {
  const [editandoCobro,   setEditandoCobro]   = useState(false);
  const [cobroEstado,     setCobroEstado]     = useState(factura.estado_cobro ?? "PENDIENTE");
  const [cobroFormaPago,  setCobroFormaPago]  = useState(factura.forma_pago_cobro ?? "EFECTIVO");
  const [cobroFecha,      setCobroFecha]      = useState(factura.fecha_pago ?? hoyEC());
  const [cobroReferencia, setCobroReferencia] = useState(factura.numero_comprobante_pago ?? "");
  const [guardandoCobro,  setGuardandoCobro]  = useState(false);
  const [errorCobro,      setErrorCobro]      = useState("");

  const cobro = factura.estado_cobro ? ESTADOS_COBRO[factura.estado_cobro] : null;

  const abrirEdicionCobro = () => {
    setCobroEstado(factura.estado_cobro ?? "PENDIENTE");
    setCobroFormaPago(factura.forma_pago_cobro ?? "EFECTIVO");
    setCobroFecha(factura.fecha_pago ?? hoyEC());
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
      setErrorCobro(detalleError(err, "Error al actualizar el cobro."));
    } finally {
      setGuardandoCobro(false);
    }
  };

  return (
    <>
      {/* Estado de cobro */}
      {["FAC", "LIQ", "NDB"].includes(factura.tipo_doc) && factura.estado_sri === "AUTORIZADO" && (
        // Abierta mientras falta cobrar (es lo próximo que se hace); cobrada, plegada
        <Seccion
          titulo="Cobro"
          icono={DollarSign}
          resumen={cobro?.etiqueta}
          abierta={factura.estado_cobro !== "PAGADO"}
        >
          {!editandoCobro && (
            <div className="mb-3 flex justify-end">
              <Boton
                variante={factura.estado_cobro === "PAGADO" ? "fantasma" : "principal"}
                tamano="sm"
                onClick={abrirEdicionCobro}
                icono={<Pencil size={14} />}
              >
                {factura.estado_cobro === "PAGADO" ? "Editar" : "Registrar cobro"}
              </Boton>
            </div>
          )}

          {editandoCobro ? (
            /* ── Modo edición ── */
            <div className="space-y-3">
              {/* Toggle estado */}
              <div
                className="flex rounded-lg overflow-hidden border border-borde"
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
                      <label className="block text-xs mb-1 text-sutil">Forma de pago</label>
                      <select
                        value={cobroFormaPago}
                        onChange={e => setCobroFormaPago(e.target.value)}
                        className="w-full px-2.5 py-2 rounded-lg text-sm transition-colors focus:outline-none bg-superficie border border-borde text-texto"
                        onFocus={e => e.currentTarget.style.borderColor = "var(--kipu-accent)"}
                        onBlur={e => e.currentTarget.style.borderColor = "var(--kipu-border)"}
                      >
                        {FORMAS_COBRO.map(f => (
                          <option key={f.valor} value={f.valor}>{f.etiqueta}</option>
                        ))}
                      </select>
                    </div>
                    <div className="flex-1">
                      <label className="block text-xs mb-1 text-sutil">Fecha de pago</label>
                      <input
                        type="date"
                        value={cobroFecha}
                        onChange={e => setCobroFecha(e.target.value)}
                        className="w-full px-2.5 py-2 rounded-lg text-sm transition-colors focus:outline-none bg-superficie border border-borde text-texto"
                        onFocus={e => e.currentTarget.style.borderColor = "var(--kipu-accent)"}
                        onBlur={e => e.currentTarget.style.borderColor = "var(--kipu-border)"}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs mb-1 text-sutil">
                      Referencia <span className="text-sutil">(opcional)</span>
                    </label>
                    <input
                      type="text"
                      value={cobroReferencia}
                      inputMode="numeric"
                      onChange={e => setCobroReferencia(e.target.value)}
                      placeholder="N° transferencia, recibo..."
                      maxLength={100}
                      className="w-full px-2.5 py-2 rounded-lg text-sm transition-colors focus:outline-none bg-superficie border border-borde text-texto"
                      onFocus={e => e.currentTarget.style.borderColor = "var(--kipu-accent)"}
                      onBlur={e => e.currentTarget.style.borderColor = "var(--kipu-border)"}
                    />
                  </div>
                </div>
              )}

              {/* Error */}
              {errorCobro && (
                <p
                  className="text-xs px-3 py-2 rounded-lg text-peligro bg-peligro-suave"
                >
                  {errorCobro}
                </p>
              )}

              {/* Acciones */}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setEditandoCobro(false)}
                  className="flex-1 py-2 rounded-lg text-xs transition-colors border border-borde text-tenue"
                  onMouseEnter={e => e.currentTarget.style.color = "var(--kipu-text)"}
                  onMouseLeave={e => e.currentTarget.style.color = "var(--kipu-muted)"}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={guardarCobro}
                  disabled={guardandoCobro}
                  className="flex-1 py-2 rounded-lg text-white text-xs font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-50 bg-acento"
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
                <div className={cn("flex items-center gap-2 px-3 py-2 rounded-lg mb-2", CLASES_TONO[cobro.tono])}>
                  {factura.estado_cobro === "PAGADO"
                    ? <CheckCircle2 size={14} aria-hidden />
                    : <Clock size={14} aria-hidden />}
                  <span className="text-sm font-medium">{cobro.etiqueta}</span>
                </div>
              )}
              {factura.estado_cobro === "PAGADO" && (
                <div className="space-y-1 text-sm">
                  {factura.forma_pago_cobro && (
                    <div className="flex justify-between">
                      <span className="text-sutil">Forma de pago</span>
                      <span className="text-texto">
                        {FORMAS_COBRO.find(f => f.valor === factura.forma_pago_cobro)?.etiqueta ?? factura.forma_pago_cobro}
                      </span>
                    </div>
                  )}
                  {factura.fecha_pago && (
                    <div className="flex justify-between">
                      <span className="text-sutil">Fecha de pago</span>
                      <span className="text-texto">{factura.fecha_pago}</span>
                    </div>
                  )}
                  {factura.numero_comprobante_pago && (
                    <div className="flex justify-between">
                      <span className="text-sutil">Referencia</span>
                      <span className="font-mono text-xs text-texto">{factura.numero_comprobante_pago}</span>
                    </div>
                  )}
                </div>
              )}
              {factura.estado_cobro === "PENDIENTE" && (
                <p className="text-xs text-sutil">
                  Registra el cobro cuando recibas el pago.
                </p>
              )}
              {["FAC", "NDB"].includes(factura.tipo_doc) && (
                <LinkPago
                  documentoId={factura.id}
                  numero={factura.numero_doc}
                  pendiente={["PENDIENTE", "PARCIAL"].includes(factura.estado_cobro ?? "")}
                  onPagado={onRecargar}
                />
              )}
            </>
          )}
        </Seccion>
      )}
    </>
  );
}