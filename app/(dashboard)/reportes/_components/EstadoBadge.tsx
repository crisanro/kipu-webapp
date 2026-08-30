// app/(dashboard)/reportes/_components/EstadoBadge.tsx
"use client";
import { clsx } from "clsx";
import { CheckCircle2, Clock, AlertTriangle, XCircle, Zap } from "lucide-react";

export type EstadoReporte = "DECLARADO" | "PENDIENTE" | "PROXIMO" | "URGENTE" | "VENCIDO" | "EN_CURSO";

interface Props {
  estado:         EstadoReporte;
  diasRestantes?: number | null;
  size?:          "sm" | "md";
}

const CONFIG: Record<EstadoReporte, {
  label:  string;
  color:  string;
  icon:   any;
}> = {
  DECLARADO: { label: "Declarado",   color: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30", icon: CheckCircle2  },
  PENDIENTE: { label: "Pendiente",   color: "bg-gray-500/20   text-gray-400   border-gray-500/30",     icon: Clock         },
  PROXIMO:   { label: "Próximo",     color: "bg-amber-500/20  text-amber-400  border-amber-500/30",    icon: AlertTriangle },
  URGENTE:   { label: "Urgente",     color: "bg-red-500/20    text-red-400    border-red-500/30",      icon: AlertTriangle },
  VENCIDO:   { label: "Vencido",     color: "bg-red-600/20    text-red-500    border-red-600/30",      icon: XCircle       },
  EN_CURSO:  { label: "En curso",    color: "bg-blue-500/20   text-blue-400   border-blue-500/30",     icon: Zap           },
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
    <span className={clsx(
      "inline-flex items-center gap-1.5 rounded-full border font-semibold",
      cfg.color,
      size === "sm" ? "px-2 py-0.5 text-[10px]" : "px-3 py-1 text-xs"
    )}>
      <Icon size={size === "sm" ? 10 : 12} />
      {label}
    </span>
  );
}