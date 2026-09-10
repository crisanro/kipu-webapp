"use client";
import { CheckCircle2, Clock, AlertTriangle, XCircle, Zap } from "lucide-react";

export type EstadoReporte = "DECLARADO" | "PENDIENTE" | "PROXIMO" | "URGENTE" | "VENCIDO" | "EN_CURSO";

interface Props {
  estado:         EstadoReporte;
  diasRestantes?: number | null;
  size?:          "sm" | "md";
}

const CONFIG: Record<EstadoReporte, {
  label: string;
  color: string;
  bg:    string;
  border: string;
  icon:  any;
}> = {
  DECLARADO: {
    label:  "Declarado",
    color:  "var(--kipu-success)",
    bg:     "color-mix(in srgb, var(--kipu-success) 20%, transparent)",
    border: "color-mix(in srgb, var(--kipu-success) 30%, transparent)",
    icon:   CheckCircle2,
  },
  PENDIENTE: {
    label:  "Pendiente",
    color:  "var(--kipu-subtle)",
    bg:     "color-mix(in srgb, var(--kipu-text) 10%, transparent)",
    border: "color-mix(in srgb, var(--kipu-text) 20%, transparent)",
    icon:   Clock,
  },
  PROXIMO: {
    label:  "Próximo",
    color:  "var(--kipu-warning)",
    bg:     "color-mix(in srgb, var(--kipu-warning) 20%, transparent)",
    border: "color-mix(in srgb, var(--kipu-warning) 30%, transparent)",
    icon:   AlertTriangle,
  },
  URGENTE: {
    label:  "Urgente",
    color:  "var(--kipu-danger)",
    bg:     "color-mix(in srgb, var(--kipu-danger) 20%, transparent)",
    border: "color-mix(in srgb, var(--kipu-danger) 30%, transparent)",
    icon:   AlertTriangle,
  },
  VENCIDO: {
    label:  "Vencido",
    color:  "var(--kipu-danger)",
    bg:     "color-mix(in srgb, var(--kipu-danger) 25%, transparent)",
    border: "color-mix(in srgb, var(--kipu-danger) 40%, transparent)",
    icon:   XCircle,
  },
  EN_CURSO: {
    label:  "En curso",
    color:  "#60a5fa",
    bg:     "color-mix(in srgb, #60a5fa 20%, transparent)",
    border: "color-mix(in srgb, #60a5fa 30%, transparent)",
    icon:   Zap,
  },
};

export default function EstadoBadge({ estado, diasRestantes, size = "md" }: Props) {
  const cfg  = CONFIG[estado] ?? CONFIG.PENDIENTE;
  const Icon = cfg.icon;

  const label = diasRestantes != null && estado !== "DECLARADO" && estado !== "EN_CURSO"
    ? diasRestantes < 0
      ? `Venció hace ${Math.abs(diasRestantes)}d`
      : diasRestantes === 0
        ? "Vence hoy"
        : `${diasRestantes}d restantes`
    : cfg.label;

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border font-semibold ${
        size === "sm" ? "px-2 py-0.5 text-[10px]" : "px-3 py-1 text-xs"
      }`}
      style={{
        color: cfg.color,
        background: cfg.bg,
        borderColor: cfg.border,
      }}
    >
      <Icon size={size === "sm" ? 10 : 12} />
      {label}
    </span>
  );
}