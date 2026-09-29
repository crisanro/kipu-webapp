"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, RefreshCw, RotateCcw,
} from "lucide-react";
import api from "@/lib/api";
import { type FacturaBase, ESTADO_CONFIG, TIPO_LABEL, MOTIVO_LABEL, formatearFechaHora } from "./utils";
import AccionesArchivo from "./AccionesArchivo";

// Encabezado (número y fecha) y bloque de estado SRI con sus acciones.
export default function EstadoDocumento({ factura, onRecargar }: { factura: FacturaBase; onRecargar: () => void }) {
  const router = useRouter();
  const [reintento, setReintento] = useState(false);

  const estado = ESTADO_CONFIG[factura.estado_sri] ?? ESTADO_CONFIG.FIRMADO;
  const Icon   = estado.icon;

  const forzarReintento = async () => {
    setReintento(true);
    try {
      await api.post(`/api/v1/app/documentos/${factura.id}/reintentar`);
      onRecargar();
    } catch (e) {
      console.error(e);
    } finally {
      setReintento(false);
    }
  };

  return (
    <>
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.back()}
          className="p-2 rounded-lg transition-colors"
          style={{ color: "var(--kipu-muted)" }}
          onMouseEnter={e => {
            e.currentTarget.style.color = "var(--kipu-text)";
            e.currentTarget.style.background = "color-mix(in srgb, var(--kipu-text) 5%, transparent)";
          }}
          onMouseLeave={e => {
            e.currentTarget.style.color = "var(--kipu-muted)";
            e.currentTarget.style.background = "transparent";
          }}
        >
          <ArrowLeft size={18} />
        </button>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold" style={{ color: "var(--kipu-text)" }}>{factura.numero_doc}</h1>
            {factura.tipo_doc !== "FAC" && (
              <span
                className="text-xs px-2 py-0.5 rounded-full font-medium"
                style={{
                  background: "color-mix(in srgb, #c084fc 20%, transparent)",
                  color: "#c084fc",
                }}
              >
                {TIPO_LABEL[factura.tipo_doc] ?? factura.tipo_doc}
              </span>
            )}
          </div>
          <p className="text-sm" style={{ color: "var(--kipu-subtle)" }}>
            {factura.datos?.infoFactura?.fechaEmision ||
             factura.datos?.infoLiquidacionCompra?.fechaEmision ||
             factura.datos?.infoNotaCredito?.fechaEmision ||
             factura.datos?.infoNotaDebito?.fechaEmision ||
             factura.datos?.infoCompRetencion?.fechaEmision ||
             factura.fecha_emision}
          </p>
        </div>
      </div>

      {/* Estado SRI */}
      <div
        className="flex items-center gap-3 rounded-xl p-4 flex-wrap sm:flex-nowrap"
        style={{
          background: estado.bg,
          border: `1px solid ${estado.border}`,
        }}
      >
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
          style={{ background: estado.bg }}
        >
          <Icon size={20} style={{ color: estado.color }} />
        </div>
        <div className="flex-1 min-w-[200px]">
          <p className="font-semibold" style={{ color: estado.color }}>{estado.label}</p>
          <p className="text-xs" style={{ color: "var(--kipu-muted)" }}>
            {factura.estado_sri === "AUTORIZADO"
              ? [
                  factura.fecha_autorizacion ? `Autorizado el ${formatearFechaHora(factura.fecha_autorizacion)}` : "Autorizado por el SRI",
                  factura.anulacion?.estado === "PENDIENTE" ? "Anulación en espera del receptor" : null,
                ].filter(Boolean).join(" · ")
              : factura.estado_sri === "ANULADO"
              ? [
                  factura.fecha_anulacion ? `Anulado el ${formatearFechaHora(factura.fecha_anulacion)}` : "Anulado",
                  factura.motivo_anulacion ? (MOTIVO_LABEL[factura.motivo_anulacion] ?? factura.motivo_anulacion) : null,
                ].filter(Boolean).join(" · ")
              : factura.estado_sri === "DEVUELTA"
              ? "El SRI devolvió el comprobante — revisa los errores abajo"
              : factura.estado_sri === "RECHAZADO"
              ? "El SRI rechazó el comprobante — revisa los errores abajo"
              : factura.estado_sri === "FIRMADO"
              ? "En cola de envío al SRI"
              : "Recibido por el SRI, pendiente de autorización"}
          </p>
        </div>

        <div className="flex gap-2 ml-auto w-full sm:w-auto justify-end flex-wrap">
          <AccionesArchivo factura={factura} />
          {["DEVUELTA", "RECHAZADO", "FIRMADO"].includes(factura.estado_sri) && (
            <button
              onClick={forzarReintento}
              disabled={reintento}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-white text-xs transition-colors disabled:opacity-50"
              style={{ background: "var(--kipu-accent)" }}
              onMouseEnter={e => {
                if (!reintento) e.currentTarget.style.background = "var(--kipu-accent-h)";
              }}
              onMouseLeave={e => {
                if (!reintento) e.currentTarget.style.background = "var(--kipu-accent)";
              }}
            >
              {reintento ? (
                <div
                  className="w-3.5 h-3.5 border-2 border-t-transparent rounded-full animate-spin"
                  style={{ borderColor: "#FFFFFF", borderTopColor: "transparent" }}
                />
              ) : (
                <RotateCcw size={13} />
              )}
              Reintentar
            </button>
          )}
          {["RECIBIDA", "FIRMADO"].includes(factura.estado_sri) && (
            <button
              onClick={onRecargar}
              className="p-2 rounded-lg transition-colors"
              style={{ color: "var(--kipu-subtle)" }}
              onMouseEnter={e => {
                e.currentTarget.style.color = "var(--kipu-text)";
                e.currentTarget.style.background = "color-mix(in srgb, var(--kipu-text) 5%, transparent)";
              }}
              onMouseLeave={e => {
                e.currentTarget.style.color = "var(--kipu-subtle)";
                e.currentTarget.style.background = "transparent";
              }}
            >
              <RefreshCw size={15} />
            </button>
          )}
        </div>
      </div>
    </>
  );
}