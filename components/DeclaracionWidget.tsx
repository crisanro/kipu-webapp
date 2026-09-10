"use client";

import { useState } from "react";
import api from "@/lib/api";
import { CheckCircle2, AlertTriangle, Clock, XCircle, ExternalLink } from "lucide-react";

export interface DeclaracionData {
  periodo:         string;
  periodo_iso:     string;
  declarado:       boolean;
  fecha_declarado: string | null;
  vencimiento:     string;
  vencimiento_fmt: string;
  dias_restantes:  number;
  estado:          "DECLARADO" | "VENCIDO" | "URGENTE" | "PROXIMO" | "PENDIENTE";
}

interface Props {
  data: DeclaracionData;
  onDeclarado: () => void; 
}

// ── Modal de confirmación ──────────────────────────────────────────────────────
function ModalConfirmar({ onConfirm, onCancel, loading }: {
  onConfirm: () => void;
  onCancel:  () => void;
  loading:   boolean;
}) {
  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
      <div
        className="rounded-xl p-5 max-w-sm w-full space-y-4"
        style={{
          background: "var(--kipu-surface)",
          border: "1px solid var(--kipu-border)",
        }}
      >
        <div className="flex items-start gap-3">
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
            style={{
              background: "color-mix(in srgb, var(--kipu-success) 20%, transparent)",
            }}
          >
            <CheckCircle2 size={16} style={{ color: "var(--kipu-success)" }} />
          </div>
          <div>
            <p className="font-semibold text-sm" style={{ color: "var(--kipu-text)" }}>
              ¿Ya realizaste tu declaración?
            </p>
            <p className="text-xs mt-1" style={{ color: "var(--kipu-subtle)" }}>
              Al confirmar no recibirás más recordatorios sobre esta declaración
              hasta el próximo mes.
            </p>
          </div>
        </div>
        <div
          className="rounded-lg px-3 py-2.5 text-xs"
          style={{
            background: "color-mix(in srgb, var(--kipu-warning) 10%, transparent)",
            border: "1px solid color-mix(in srgb, var(--kipu-warning) 20%, transparent)",
            color: "var(--kipu-warning)",
          }}
        >
          ⚠️ Asegúrate de haber declarado en el portal del SRI antes de confirmar.
          Esta acción solo registra que ya lo hiciste en Kipu.
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="flex-1 py-2 rounded-lg text-sm transition-colors disabled:opacity-40"
            style={{
              border: "1px solid var(--kipu-border)",
              color: "var(--kipu-muted)",
            }}
            onMouseEnter={e => {
              if (!loading) e.currentTarget.style.color = "var(--kipu-text)";
            }}
            onMouseLeave={e => {
              if (!loading) e.currentTarget.style.color = "var(--kipu-muted)";
            }}
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 py-2 rounded-lg text-white text-sm font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
            style={{ background: "var(--kipu-success)" }}
          >
            {loading ? (
              <div
                className="w-3.5 h-3.5 border-2 border-t-transparent rounded-full animate-spin"
                style={{ borderColor: "#FFFFFF", borderTopColor: "transparent" }}
              />
            ) : (
              <CheckCircle2 size={14} />
            )}
            Sí, ya declaré
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Config visual por estado ───────────────────────────────────────────────────
const ESTADO_UI = {
  DECLARADO: {
    bg:     "color-mix(in srgb, var(--kipu-success) 10%, transparent)",
    border: "color-mix(in srgb, var(--kipu-success) 20%, transparent)",
    icon:   CheckCircle2,
    color:  "var(--kipu-success)",
    label:  "Declarado",
  },
  VENCIDO: {
    bg:     "color-mix(in srgb, var(--kipu-danger) 10%, transparent)",
    border: "color-mix(in srgb, var(--kipu-danger) 20%, transparent)",
    icon:   XCircle,
    color:  "var(--kipu-danger)",
    label:  "Vencida",
  },
  URGENTE: {
    bg:     "color-mix(in srgb, var(--kipu-danger) 10%, transparent)",
    border: "color-mix(in srgb, var(--kipu-danger) 20%, transparent)",
    icon:   AlertTriangle,
    color:  "var(--kipu-danger)",
    label:  "Urgente",
  },
  PROXIMO: {
    bg:     "color-mix(in srgb, var(--kipu-warning) 10%, transparent)",
    border: "color-mix(in srgb, var(--kipu-warning) 20%, transparent)",
    icon:   AlertTriangle,
    color:  "var(--kipu-warning)",
    label:  "Próximo",
  },
  PENDIENTE: {
    bg:     "color-mix(in srgb, var(--kipu-text) 5%, transparent)",
    border: "var(--kipu-border)",
    icon:   Clock,
    color:  "var(--kipu-subtle)",
    label:  "Pendiente",
  },
};

// ── Componente principal ───────────────────────────────────────────────────────
export default function DeclaracionWidget({ data, onDeclarado }: Props) {
  const [confirmando, setConfirmando] = useState(false);
  const [guardando,   setGuardando]   = useState(false);
  const [error,       setError]       = useState("");

  const confirmarDeclaracion = async () => {
    setGuardando(true);
    setError("");
    try {
      await api.post("/api/v1/app/declaraciones/declarar");
      setConfirmando(false);
      onDeclarado(); 
    } catch (e: any) {
      setError(e?.response?.data?.detail ?? "Error al registrar la declaración.");
    } finally {
      setGuardando(false);
    }
  };

  if (!data) return null;

  const ui   = ESTADO_UI[data.estado] || ESTADO_UI.PENDIENTE;
  const Icon = ui.icon;

  return (
    <>
      {confirmando && (
        <ModalConfirmar
          onConfirm={confirmarDeclaracion}
          onCancel={() => { setConfirmando(false); setError(""); }}
          loading={guardando}
        />
      )}

      <div
        className="rounded-xl p-4"
        style={{
          background: ui.bg,
          border: `1px solid ${ui.border}`,
        }}
      >
        <div className="flex items-start gap-3">

          {/* Ícono */}
          <div
            className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
            style={{ background: ui.bg }}
          >
            <Icon size={17} style={{ color: ui.color }} />
          </div>

          {/* Contenido */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-sm font-semibold" style={{ color: "var(--kipu-text)" }}>
                Declaración IVA — {data.periodo}
              </p>
              <span
                className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                style={{
                  background: ui.bg,
                  color: ui.color,
                }}
              >
                {ui.label}
              </span>
            </div>

            {/* Mensaje según estado */}
            <p className="text-xs mt-0.5" style={{ color: "var(--kipu-subtle)" }}>
              {data.estado === "DECLARADO" && data.fecha_declarado && (
                `Registrada el ${new Date(data.fecha_declarado).toLocaleDateString("es-EC")}`
              )}
              {data.estado === "VENCIDO" && (
                `Venció el ${data.vencimiento_fmt} — declara cuanto antes para evitar multas`
              )}
              {data.estado === "URGENTE" && (
                `Vence en ${data.dias_restantes} día${data.dias_restantes !== 1 ? "s" : ""} — ${data.vencimiento_fmt}`
              )}
              {data.estado === "PROXIMO" && (
                `Vence el ${data.vencimiento_fmt} — en ${data.dias_restantes} días`
              )}
              {data.estado === "PENDIENTE" && (
                `Fecha límite: ${data.vencimiento_fmt} — ${data.dias_restantes} días restantes`
              )}
            </p>

            {error && (
              <p className="text-xs mt-1" style={{ color: "var(--kipu-danger)" }}>{error}</p>
            )}

            {/* Acciones */}
            <div className="flex items-center gap-2 mt-2 flex-wrap">

              {/* Ir al SRI */}
              <a
                href="https://srienlinea.sri.gob.ec"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-colors"
                style={{
                  background: "color-mix(in srgb, var(--kipu-text) 5%, transparent)",
                  border: "1px solid var(--kipu-border)",
                  color: "var(--kipu-muted)",
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = "color-mix(in srgb, var(--kipu-text) 10%, transparent)";
                  e.currentTarget.style.color = "var(--kipu-text)";
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = "color-mix(in srgb, var(--kipu-text) 5%, transparent)";
                  e.currentTarget.style.color = "var(--kipu-muted)";
                }}
              >
                <ExternalLink size={11} />
                Ir al SRI en Línea
              </a>

              {/* Marcar como declarado — solo si no está declarado */}
              {data.estado !== "DECLARADO" && (
                <button
                  type="button"
                  onClick={() => setConfirmando(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-colors font-medium"
                  style={{
                    background: "color-mix(in srgb, var(--kipu-success) 20%, transparent)",
                    border: "1px solid color-mix(in srgb, var(--kipu-success) 20%, transparent)",
                    color: "var(--kipu-success)",
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.background = "color-mix(in srgb, var(--kipu-success) 30%, transparent)";
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.background = "color-mix(in srgb, var(--kipu-success) 20%, transparent)";
                  }}
                >
                  <CheckCircle2 size={11} />
                  Ya declaré
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}