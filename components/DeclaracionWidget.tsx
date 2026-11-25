"use client";

import { rutas } from "@/lib/rutas";
import { ES_APP_NATIVA } from "@/lib/plataforma";
import { useState } from "react";
import Link from "next/link";
import api from "@/lib/api";
import { CheckCircle2, AlertTriangle, Clock, XCircle, ExternalLink } from "lucide-react";
import Hoja from "@/components/ui/Hoja";
import Boton from "@/components/ui/Boton";

export interface DeclaracionData {
  periodo:         string;
  periodo_iso:     string;
  declarado:       boolean;
  fecha_declarado: string | null;
  vencimiento:     string;
  vencimiento_fmt: string;
  dias_restantes:  number;
  estado:          "DECLARADO" | "VENCIDO" | "URGENTE" | "PROXIMO" | "PENDIENTE";
  // Total del periodo: con Pro, o para todos con el plan gratis encendido
  iva_a_pagar?:         number;
  saldo_a_favor?:       number;
  formulario_completo?: boolean;   // false: el 104 casillero por casillero es de pago
  periodo_key?:         string;    // "2026-10": la página del 104 de ese periodo
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
  // Se monta solo al confirmar (por eso abierta fija)
  return (
    <Hoja
      abierta
      onCerrar={onCancel}
      titulo="¿Ya realizaste tu declaración?"
      descripcion="Al confirmar no recibirás más recordatorios sobre esta declaración hasta el próximo mes."
      tamano="sm"
      cerrable={!loading}
      pie={<>
        <Boton variante="secundario" onClick={onCancel} disabled={loading}>Cancelar</Boton>
        <Boton onClick={onConfirm} cargando={loading} icono={<CheckCircle2 size={16} />}>Sí, ya declaré</Boton>
      </>}
    >
      <p className="flex items-start gap-2 rounded-lg px-3 py-2.5 text-xs text-texto bg-alerta-suave border border-alerta/30">
        <AlertTriangle size={14} className="mt-0.5 shrink-0 text-alerta" aria-hidden />
        Asegúrate de haber declarado en el portal del SRI antes de confirmar.
        Esta acción solo registra que ya lo hiciste en Kipu.
      </p>
    </Hoja>
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

            {/* Total de IVA del periodo */}
            {typeof data.iva_a_pagar === "number" && (
              <div className="mt-2 flex items-baseline gap-x-3 gap-y-1 flex-wrap">
                <p className="text-sm" style={{ color: "var(--kipu-text)" }}>
                  {data.iva_a_pagar === 0 && (data.saldo_a_favor ?? 0) > 0
                    ? <>Saldo a favor: <strong>${(data.saldo_a_favor ?? 0).toFixed(2)}</strong></>
                    : <>IVA a pagar: <strong>${data.iva_a_pagar.toFixed(2)}</strong></>}
                </p>
                {/* En la app no se ofrece lo que el plan no incluye (lib/plataforma.ts) */}
                {data.formulario_completo === false && !ES_APP_NATIVA && (
                  <Link
                    href={data.periodo_key ? rutas.reporteIva(data.periodo_key) : ES_APP_NATIVA ? "/reportes" : "/planes"}
                    className="text-[11px] underline underline-offset-2 hover:no-underline"
                    style={{ color: "var(--kipu-accent)" }}
                  >
                    Ver el formulario 104 casillero por casillero
                  </Link>
                )}
              </div>
            )}

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