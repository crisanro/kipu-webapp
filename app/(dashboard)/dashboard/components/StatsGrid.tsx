// app/(dashboard)/dashboard/components/StatsGrid.tsx
"use client";
import { clsx } from "clsx";
import {
  TrendingUp, FileText, Receipt,
  CreditCard, Zap, Users
} from "lucide-react";

interface Props {
  resumen: any;
  empresa: any;
}

const fmt  = (n: any) => parseFloat(n ?? 0).toFixed(2);
const fmtK = (n: any) => {
  const v = parseFloat(n ?? 0);
  return v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v.toFixed(2);
};

export default function StatsGrid({ resumen, empresa }: Props) {
  const suscripcion = empresa?.suscripcion;

  const stats = [
    {
      label:   "Total facturado",
      value:   `$${fmtK(resumen?.importe_total ?? 0)}`,
      sub:     "este mes · autorizados",
      icon:    TrendingUp,
      color:   "text-emerald-400",
      bg:      "bg-emerald-500/10",
      border:  "border-emerald-500/20",
      accent:  "from-emerald-500/10",
    },
    {
      label:   "Comprobantes",
      value:   resumen?.total_documentos ?? 0,
      sub:     "emitidos este mes",
      icon:    FileText,
      color:   "text-indigo-400",
      bg:      "bg-indigo-500/10",
      border:  "border-indigo-500/20",
      accent:  "from-indigo-500/10",
    },
    {
      label:   "IVA generado",
      value:   `$${fmtK(resumen?.valor_iva ?? 0)}`,
      sub:     "para declaración",
      icon:    Receipt,
      color:   "text-blue-400",
      bg:      "bg-blue-500/10",
      border:  "border-blue-500/20",
      accent:  "from-blue-500/10",
    },
    {
      label:   "Suscripción",
      value:   suscripcion?.plan ?? "—",
      sub:     suscripcion?.estado === "TRIAL"
               ? "⏳ En período de prueba"
               : suscripcion?.activa
               ? "✅ Activa"
               : "❌ Inactiva",
      icon:    CreditCard,
      color:   suscripcion?.activa ? "text-emerald-400" : "text-red-400",
      bg:      suscripcion?.activa ? "bg-emerald-500/10" : "bg-red-500/10",
      border:  suscripcion?.activa ? "border-emerald-500/20" : "border-red-500/20",
      accent:  suscripcion?.activa ? "from-emerald-500/10" : "from-red-500/10",
    },
    {
      label:   "Créditos API",
      value:   empresa?.balance_api ?? 0,
      sub:     "para integraciones REST",
      icon:    Zap,
      color:   "text-amber-400",
      bg:      "bg-amber-500/10",
      border:  "border-amber-500/20",
      accent:  "from-amber-500/10",
    },
    {
      label:   "Subtotal base",
      value:   `$${fmtK(resumen?.subtotal_iva ?? 0)}`,
      sub:     "base gravada 15%",
      icon:    Users,
      color:   "text-purple-400",
      bg:      "bg-purple-500/10",
      border:  "border-purple-500/20",
      accent:  "from-purple-500/10",
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
      {stats.map(({ label, value, sub, icon: Icon, color, bg, border, accent }) => (
        <div
          key={label}
          className={clsx(
            "relative overflow-hidden rounded-xl border p-4 bg-gray-900",
            border
          )}
        >
          {/* Gradiente sutil de fondo */}
          <div className={clsx(
            "absolute inset-0 bg-gradient-to-br to-transparent opacity-40",
            accent
          )} />
          <div className="relative">
            <div className={clsx(
              "w-9 h-9 rounded-lg flex items-center justify-center mb-3",
              bg
            )}>
              <Icon size={17} className={color} />
            </div>
            <p className="text-2xl font-bold text-white tracking-tight">{value}</p>
            <p className="text-xs text-gray-400 mt-0.5 font-medium">{label}</p>
            <p className="text-xs text-gray-600 mt-0.5">{sub}</p>
          </div>
        </div>
      ))}
    </div>
  );
}