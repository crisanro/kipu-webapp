"use client";
import {
  TrendingUp, FileText, Receipt,
  CreditCard, Zap, Users
} from "lucide-react";

interface Props {
  resumen: any;
  empresa: any;
}

const fmtK = (n: any) => {
  const v = parseFloat(n ?? 0);
  return v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v.toFixed(2);
};

export default function StatsGrid({ resumen, empresa }: Props) {
  const suscripcion = empresa?.suscripcion;

  const stats = [
    {
      label: "Total facturado",
      value: `$${fmtK(resumen?.importe_total ?? 0)}`,
      sub: "este mes · autorizados",
      icon: TrendingUp,
      color: "var(--kipu-accent)",
      bg: "color-mix(in srgb, var(--kipu-accent) 12%, transparent)",
      border: "color-mix(in srgb, var(--kipu-accent) 30%, transparent)",
    },
    {
      label: "Comprobantes",
      value: resumen?.total_documentos ?? 0,
      sub: "emitidos este mes",
      icon: FileText,
      color: "#818cf8",
      bg: "color-mix(in srgb, #818cf8 12%, transparent)",
      border: "color-mix(in srgb, #818cf8 30%, transparent)",
    },
    {
      label: "IVA generado",
      value: `$${fmtK(resumen?.valor_iva ?? 0)}`,
      sub: "para declaración",
      icon: Receipt,
      color: "#60a5fa",
      bg: "color-mix(in srgb, #60a5fa 12%, transparent)",
      border: "color-mix(in srgb, #60a5fa 30%, transparent)",
    },
    {
      label: "Suscripción",
      value: suscripcion?.plan ?? "—",
      sub: suscripcion?.estado === "TRIAL"
        ? "⏳ En período de prueba"
        : suscripcion?.activa
        ? "✅ Activa"
        : "❌ Inactiva",
      icon: CreditCard,
      color: suscripcion?.activa ? "var(--kipu-success)" : "var(--kipu-danger)",
      bg: suscripcion?.activa
        ? "color-mix(in srgb, var(--kipu-success) 12%, transparent)"
        : "color-mix(in srgb, var(--kipu-danger) 12%, transparent)",
      border: suscripcion?.activa
        ? "color-mix(in srgb, var(--kipu-success) 30%, transparent)"
        : "color-mix(in srgb, var(--kipu-danger) 30%, transparent)",
    },
    {
      label: "Créditos API",
      value: empresa?.balance_api ?? 0,
      sub: "para integraciones REST",
      icon: Zap,
      color: "var(--kipu-warning)",
      bg: "color-mix(in srgb, var(--kipu-warning) 12%, transparent)",
      border: "color-mix(in srgb, var(--kipu-warning) 30%, transparent)",
    },
    {
      label: "Subtotal base",
      value: `$${fmtK(resumen?.subtotal_iva ?? 0)}`,
      sub: "base gravada 15%",
      icon: Users,
      color: "#c084fc",
      bg: "color-mix(in srgb, #c084fc 12%, transparent)",
      border: "color-mix(in srgb, #c084fc 30%, transparent)",
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
      {stats.map(({ label, value, sub, icon: Icon, color, bg, border }) => (
        <div
          key={label}
          className="relative overflow-hidden rounded-xl p-4"
          style={{
            background: "var(--kipu-surface)",
            border: `1px solid ${border}`,
          }}
        >
          <div className="relative">
            <div
              className="w-9 h-9 rounded-lg flex items-center justify-center mb-3"
              style={{ background: bg }}
            >
              <Icon size={17} style={{ color }} />
            </div>
            <p
              className="text-2xl font-bold tracking-tight"
              style={{ color: "var(--kipu-text)" }}
            >
              {value}
            </p>
            <p
              className="text-xs mt-0.5 font-medium"
              style={{ color: "var(--kipu-muted)" }}
            >
              {label}
            </p>
            <p
              className="text-xs mt-0.5"
              style={{ color: "var(--kipu-subtle)" }}
            >
              {sub}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}