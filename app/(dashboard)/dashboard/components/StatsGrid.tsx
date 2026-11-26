"use client";
import {
  TrendingUp, FileText, Receipt,
  CreditCard, Zap, Users
} from "lucide-react";
import { ES_APP_NATIVA } from "@/lib/plataforma";
import { compactoK } from "@/lib/dinero";

interface Props {
  resumen: any;
  empresa: any;
}

export default function StatsGrid({ resumen, empresa }: Props) {
  const suscripcion = empresa?.suscripcion;
  // Plan gratis: no es una suscripción "inactiva", es el plan con el que factura
  const gratis = !suscripcion?.activa && !!empresa?.emision_gratis;
  const tono   = suscripcion?.activa ? "var(--kipu-success)" : gratis ? "var(--kipu-accent)" : "var(--kipu-danger)";

  const stats = [
    {
      label: "Total facturado",
      cifra: true,
      value: `$${compactoK(resumen?.importe_total ?? 0)}`,
      sub: "este mes · autorizados",
      icon: TrendingUp,
      color: "var(--kipu-accent)",
      bg: "color-mix(in srgb, var(--kipu-accent) 12%, transparent)",
      border: "color-mix(in srgb, var(--kipu-accent) 30%, transparent)",
    },
    {
      label: "Comprobantes",
      cifra: true,
      value: resumen?.total_documentos ?? 0,
      sub: "emitidos este mes",
      icon: FileText,
      color: "var(--kipu-info)",
      bg: "color-mix(in srgb, var(--kipu-info) 12%, transparent)",
      border: "color-mix(in srgb, var(--kipu-info) 30%, transparent)",
    },
    {
      label: "IVA generado",
      cifra: true,
      value: `$${compactoK(resumen?.valor_iva ?? 0)}`,
      sub: "para declaración",
      icon: Receipt,
      color: "var(--kipu-info)",
      bg: "color-mix(in srgb, var(--kipu-info) 12%, transparent)",
      border: "color-mix(in srgb, var(--kipu-info) 30%, transparent)",
    },
    {
      label: gratis ? "Tu plan" : "Suscripción",
      value: gratis ? "Gratis"
        : suscripcion?.plan === "AL_DIA" ? "Kipu Al Día"   // el backend manda el código del plan
        : suscripcion?.plan === "PRO" ? (ES_APP_NATIVA ? "Plan activo" : "Kipu Pro")   // en la app no se nombra el Pro
        : suscripcion?.plan ?? "—",
      sub: suscripcion?.estado === "TRIAL"
        ? "⏳ En período de prueba"
        : suscripcion?.activa
        ? "✅ Activa"
        : gratis
        ? (ES_APP_NATIVA ? "🆓 Facturas gratis" : "🆓 Facturas gratis · Pro suma más")
        : "❌ Inactiva",
      icon: CreditCard,
      color: tono,
      bg: `color-mix(in srgb, ${tono} 12%, transparent)`,
      border: `color-mix(in srgb, ${tono} 30%, transparent)`,
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
      cifra: true,
      value: `$${compactoK(resumen?.subtotal_iva ?? 0)}`,
      sub: "base gravada 15%",
      icon: Users,
      color: "var(--kipu-muted)",
      bg: "color-mix(in srgb, var(--kipu-muted) 12%, transparent)",
      border: "color-mix(in srgb, var(--kipu-muted) 30%, transparent)",
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
      {/* Sin el permiso "reportes" la API no manda el resumen: solo plan y créditos */}
      {stats.filter((s) => resumen || !s.cifra).map(({ label, value, sub, icon: Icon, color, bg, border }) => (
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