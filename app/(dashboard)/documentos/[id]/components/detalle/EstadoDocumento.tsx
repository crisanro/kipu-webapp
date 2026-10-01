"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, RefreshCw, RotateCcw, ShieldCheck, ChevronDown, ChevronUp,
} from "lucide-react";
import api from "@/lib/api";
import { type FacturaBase, ESTADO_CONFIG, TIPO_LABEL, MOTIVO_LABEL, formatearFechaHora } from "./utils";
import AccionesArchivo from "./AccionesArchivo";

// Estados en los que tiene sentido preguntarle al SRI cómo está el comprobante
const CONSULTABLES = ["FIRMADO", "RECIBIDA", "EN_REVISION", "DEVUELTA", "RECHAZADO"];
// Estados en los que se puede pedir un reenvío (el backend consulta antes de reenviar)
const REINTENTABLES = ["FIRMADO", "EN_REVISION", "DEVUELTA", "RECHAZADO"];

const DESCRIPCION: Record<string, string> = {
  DEVUELTA:    "El SRI devolvió el comprobante — revisa los errores abajo",
  RECHAZADO:   "El SRI rechazó el comprobante — revisa los errores abajo",
  FIRMADO:     "En cola de envío al SRI",
  RECIBIDA:    "Recibido por el SRI, pendiente de autorización",
  EN_REVISION: "No pudimos confirmar el estado con el SRI. Lo seguimos verificando automáticamente: no es un rechazo.",
};

type Aviso = { tipo: "ok" | "error"; texto: string } | null;

// Encabezado (número y fecha) y bloque de estado SRI con sus acciones.
export default function EstadoDocumento({ factura, onRecargar }: { factura: FacturaBase; onRecargar: () => void }) {
  const router = useRouter();
  const [accion,      setAccion]      = useState<"consultar" | "reintentar" | null>(null);
  const [aviso,       setAviso]       = useState<Aviso>(null);
  const [verDetalle,  setVerDetalle]  = useState(false);

  const estado = ESTADO_CONFIG[factura.estado_sri] ?? ESTADO_CONFIG.FIRMADO;
  const Icon   = estado.icon;

  const ejecutar = async (tipo: "consultar" | "reintentar") => {
    setAccion(tipo);
    setAviso(null);
    try {
      const ruta = tipo === "consultar" ? "sincronizar" : "reintentar";
      const res  = await api.post(`/api/v1/app/documentos/${factura.id}/${ruta}`);
      setAviso({ tipo: "ok", texto: res.data?.mensaje || "Listo." });
      onRecargar();
    } catch (e: any) {
      setAviso({ tipo: "error", texto: e?.response?.data?.detail ?? "No pudimos completar la acción. Intenta de nuevo." });
    } finally {
      setAccion(null);
    }
  };

  const descripcion =
    factura.estado_sri === "AUTORIZADO"
      ? [
          factura.fecha_autorizacion ? `Autorizado el ${formatearFechaHora(factura.fecha_autorizacion)}` : "Autorizado por el SRI",
          factura.anulacion?.estado === "PENDIENTE" ? "Anulación en espera del receptor" : null,
        ].filter(Boolean).join(" · ")
      : factura.estado_sri === "ANULADO"
      ? [
          factura.fecha_anulacion ? `Anulado el ${formatearFechaHora(factura.fecha_anulacion)}` : "Anulado",
          factura.motivo_anulacion ? (MOTIVO_LABEL[factura.motivo_anulacion] ?? factura.motivo_anulacion) : null,
        ].filter(Boolean).join(" · ")
      : DESCRIPCION[factura.estado_sri] ?? DESCRIPCION.RECIBIDA;

  const Spinner = ({ claro = false }: { claro?: boolean }) => (
    <div
      className="w-3.5 h-3.5 border-2 border-t-transparent rounded-full animate-spin"
      style={{ borderColor: claro ? "#FFFFFF" : "currentColor", borderTopColor: "transparent" }}
    />
  );

  return (
    <>
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.back()}
          aria-label="Volver"
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
        className="rounded-xl p-4 space-y-3"
        style={{
          background: estado.bg,
          border: `1px solid ${estado.border}`,
        }}
      >
        <div className="flex items-center gap-3 flex-wrap sm:flex-nowrap">
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
            style={{ background: estado.bg }}
          >
            <Icon size={20} style={{ color: estado.color }} />
          </div>
          <div className="flex-1 min-w-[200px]">
            <p className="font-semibold" style={{ color: estado.color }}>{estado.label}</p>
            <p className="text-xs" style={{ color: "var(--kipu-muted)" }}>{descripcion}</p>
            {factura.sri_verificado_at && CONSULTABLES.includes(factura.estado_sri) && (
              <p className="text-[11px] mt-0.5" style={{ color: "var(--kipu-subtle)" }}>
                Última consulta al SRI: {formatearFechaHora(factura.sri_verificado_at)}
              </p>
            )}
          </div>

          <div className="flex gap-2 ml-auto w-full sm:w-auto justify-end flex-wrap">
            <AccionesArchivo factura={factura} />

            {CONSULTABLES.includes(factura.estado_sri) && (
              <button
                onClick={() => ejecutar("consultar")}
                disabled={accion !== null}
                title="Preguntarle al SRI el estado real de este comprobante"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors disabled:opacity-50"
                style={{
                  border: "1px solid var(--kipu-border)",
                  color: "var(--kipu-text)",
                  background: "var(--kipu-surface)",
                }}
              >
                {accion === "consultar" ? <Spinner /> : <ShieldCheck size={13} />}
                Consultar en el SRI
              </button>
            )}

            {REINTENTABLES.includes(factura.estado_sri) && (
              <button
                onClick={() => ejecutar("reintentar")}
                disabled={accion !== null}
                title="Primero se consulta al SRI; solo se reenvía si el SRI no lo tiene"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-white text-xs transition-colors disabled:opacity-50"
                style={{ background: "var(--kipu-accent)" }}
                onMouseEnter={e => {
                  if (!accion) e.currentTarget.style.background = "var(--kipu-accent-h)";
                }}
                onMouseLeave={e => {
                  if (!accion) e.currentTarget.style.background = "var(--kipu-accent)";
                }}
              >
                {accion === "reintentar" ? <Spinner claro /> : <RotateCcw size={13} />}
                Reintentar
              </button>
            )}

            {["RECIBIDA", "FIRMADO"].includes(factura.estado_sri) && (
              <button
                onClick={onRecargar}
                aria-label="Actualizar"
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

        {/* Resultado de la acción */}
        {aviso && (
          <p
            className="text-xs rounded-lg px-3 py-2"
            style={{
              background: aviso.tipo === "ok"
                ? "color-mix(in srgb, var(--kipu-success) 10%, transparent)"
                : "color-mix(in srgb, var(--kipu-danger) 10%, transparent)",
              color: aviso.tipo === "ok" ? "var(--kipu-success)" : "var(--kipu-danger)",
            }}
          >
            {aviso.texto}
          </p>
        )}

        {/* Detalle técnico (para soporte) */}
        {factura.ultimo_error_tecnico && CONSULTABLES.includes(factura.estado_sri) && (
          <div>
            <button
              type="button"
              onClick={() => setVerDetalle(v => !v)}
              className="flex items-center gap-1 text-[11px]"
              style={{ color: "var(--kipu-subtle)" }}
            >
              {verDetalle ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
              Detalle técnico
            </button>
            {verDetalle && (
              <pre
                className="mt-1 text-[11px] whitespace-pre-wrap break-words rounded-lg px-3 py-2"
                style={{
                  background: "color-mix(in srgb, var(--kipu-text) 5%, transparent)",
                  color: "var(--kipu-muted)",
                }}
              >
                {factura.ultimo_error_tecnico}
              </pre>
            )}
          </div>
        )}
      </div>
    </>
  );
}