// components/DeclaracionWidget.tsx
"use client";

import { useState, useEffect } from "react";
import api from "@/lib/api";
import { CheckCircle2, AlertTriangle, Clock, XCircle, Loader2, ExternalLink } from "lucide-react";
import { clsx } from "clsx";

interface DeclaracionData {
  periodo:         string;
  periodo_iso:     string;
  declarado:       boolean;
  fecha_declarado: string | null;
  vencimiento:     string;
  vencimiento_fmt: string;
  dias_restantes:  number;
  estado:          "DECLARADO" | "VENCIDO" | "URGENTE" | "PROXIMO" | "PENDIENTE";
}

// ── Modal de confirmación ──────────────────────────────────────────────────────
function ModalConfirmar({ onConfirm, onCancel, loading }: {
  onConfirm: () => void;
  onCancel:  () => void;
  loading:   boolean;
}) {
  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 max-w-sm w-full space-y-4">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0">
            <CheckCircle2 size={16} className="text-emerald-400" />
          </div>
          <div>
            <p className="text-white font-semibold text-sm">¿Ya realizaste tu declaración?</p>
            <p className="text-gray-400 text-xs mt-1">
              Al confirmar no recibirás más recordatorios sobre esta declaración
              hasta el próximo mes.
            </p>
          </div>
        </div>
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2.5">
          <p className="text-xs text-amber-300">
            ⚠️ Asegúrate de haber declarado en el portal del SRI antes de confirmar.
            Esta acción solo registra que ya lo hiciste en Kipu.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={onCancel}
            disabled={loading}
            className="flex-1 py-2 rounded-lg border border-gray-700 text-gray-400 hover:text-white text-sm transition-colors disabled:opacity-40"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-sm font-medium transition-colors flex items-center justify-center gap-2"
          >
            {loading
              ? <Loader2 size={14} className="animate-spin" />
              : <CheckCircle2 size={14} />
            }
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
    bg:      "bg-emerald-500/10",
    border:  "border-emerald-500/20",
    icon:    CheckCircle2,
    color:   "text-emerald-400",
    label:   "Declarado",
  },
  VENCIDO: {
    bg:      "bg-red-500/10",
    border:  "border-red-500/20",
    icon:    XCircle,
    color:   "text-red-400",
    label:   "Vencida",
  },
  URGENTE: {
    bg:      "bg-red-500/10",
    border:  "border-red-500/20",
    icon:    AlertTriangle,
    color:   "text-red-400",
    label:   "Urgente",
  },
  PROXIMO: {
    bg:      "bg-amber-500/10",
    border:  "border-amber-500/20",
    icon:    AlertTriangle,
    color:   "text-amber-400",
    label:   "Próximo",
  },
  PENDIENTE: {
    bg:      "bg-gray-800/50",
    border:  "border-gray-700",
    icon:    Clock,
    color:   "text-gray-400",
    label:   "Pendiente",
  },
};

// ── Componente principal ───────────────────────────────────────────────────────
export default function DeclaracionWidget() {
  const [data,           setData]           = useState<DeclaracionData | null>(null);
  const [loading,        setLoading]        = useState(true);
  const [confirmando,    setConfirmando]    = useState(false);
  const [guardando,      setGuardando]      = useState(false);
  const [error,          setError]          = useState("");

  const cargar = async () => {
    try {
      const res = await api.get("/api/v1/app/declaraciones/actual");
      if (res.data.aplica) {
        setData(res.data.data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { cargar(); }, []);

  const confirmarDeclaracion = async () => {
    setGuardando(true);
    setError("");
    try {
      await api.post("/api/v1/app/declaraciones/declarar");
      setConfirmando(false);
      await cargar();
    } catch (e: any) {
      setError(e?.response?.data?.detail ?? "Error al registrar la declaración.");
    } finally {
      setGuardando(false);
    }
  };

  // No mostrar si está cargando, no aplica, o no hay datos
  if (loading || !data) return null;

  const ui   = ESTADO_UI[data.estado];
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

      <div className={clsx("rounded-xl border p-4", ui.bg, ui.border)}>
        <div className="flex items-start gap-3">

          {/* Ícono */}
          <div className={clsx(
            "w-9 h-9 rounded-lg flex items-center justify-center shrink-0",
            ui.bg
          )}>
            <Icon size={17} className={ui.color} />
          </div>

          {/* Contenido */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-sm font-semibold text-white">
                Declaración IVA — {data.periodo}
              </p>
              <span className={clsx(
                "text-[10px] px-2 py-0.5 rounded-full font-medium",
                ui.bg, ui.color
              )}>
                {ui.label}
              </span>
            </div>

            {/* Mensaje según estado */}
            <p className="text-xs text-gray-400 mt-0.5">
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
              <p className="text-xs text-red-400 mt-1">{error}</p>
            )}

            {/* Acciones */}
            <div className="flex items-center gap-2 mt-2 flex-wrap">

              {/* Ir al SRI */}
              <a
                href="https://srienlinea.sri.gob.ec"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs transition-colors"
              >
                <ExternalLink size={11} />
                Ir al SRI en Línea
              </a>

              {/* Marcar como declarado — solo si no está declarado */}
              {data.estado !== "DECLARADO" && (
                <button
                  onClick={() => setConfirmando(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 text-xs transition-colors border border-emerald-500/20"
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