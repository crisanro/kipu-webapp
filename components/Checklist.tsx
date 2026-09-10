"use client";

import Link from "next/link";
import {
  CheckCircle2, Circle, Mail, Building2,
  Shield, Store, ChevronRight
} from "lucide-react";

export interface HealthData {
  email_verificado:              boolean;
  ruc:                            boolean;
  firma_configurada:              boolean;
  firma_vigente:                  boolean;
  establecimientos_configurados: boolean;
  puntos_emision_configurados:    boolean;
  listo_produccion:              boolean;
  [key: string]: any;
}

interface Props {
  health:   HealthData;
  compact?: boolean;
}

interface ChecklistItem {
  key:   string;
  label: string;
  desc:  string;
  done:  boolean;
  href:  string;
  icon:  React.ElementType;
}

export default function Checklist({ health, compact = false }: Props) {
  const items: ChecklistItem[] = [
    {
      key:   "email_verificado",
      label: "Verificar email",
      desc:  "Necesario para acciones de seguridad",
      done:  health.email_verificado ?? false,
      href:  "/configuracion",
      icon:  Mail,
    },
    {
      key:   "datos_empresa",
      label: "Datos de empresa",
      desc:  "RUC, razón social y dirección",
      done:  health.ruc ?? false,
      href:  "/configuracion",
      icon:  Building2,
    },
    {
      key:   "firma",
      label: "Firma electrónica",
      desc:  "Certificado P12 vigente",
      done:  (health.firma_configurada && health.firma_vigente) ?? false,
      href:  "/configuracion?tab=firma",
      icon:  Shield,
    },
    {
      key:   "establecimiento",
      label: "Establecimiento",
      desc:  "Al menos un establecimiento activo",
      done:  health.establecimientos_configurados ?? false,
      href:  "/configuracion?tab=estructura",
      icon:  Store,
    },
    {
      key:   "punto_emision",
      label: "Punto de emisión",
      desc:  "Al menos un punto de emisión activo",
      done:  health.puntos_emision_configurados ?? false,
      href:  "/configuracion?tab=estructura",
      icon:  Store,
    },
  ];

  const completados = items.filter((i) => i.done).length;
  const total       = items.length;
  const porcentaje  = Math.round((completados / total) * 100);

  if (health.listo_produccion) return null;

  if (compact) {
    const pendiente = items.find((i) => !i.done);
    return (
      <div
        className="rounded-xl p-4"
        style={{
          background: "color-mix(in srgb, var(--kipu-accent) 10%, transparent)",
          border: "1px solid color-mix(in srgb, var(--kipu-accent) 20%, transparent)",
        }}
      >
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-sm font-semibold" style={{ color: "var(--kipu-text)" }}>
              Configura tu cuenta ({completados}/{total})
            </p>
            <p className="text-xs mt-0.5" style={{ color: "var(--kipu-subtle)" }}>
              Completa estos pasos para activar producción
            </p>
          </div>
          <span className="text-sm font-bold" style={{ color: "var(--kipu-accent)" }}>{porcentaje}%</span>
        </div>

        <div
          className="h-1.5 rounded-full mb-3 overflow-hidden"
          style={{ background: "color-mix(in srgb, var(--kipu-text) 8%, transparent)" }}
        >
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${porcentaje}%`,
              background: "var(--kipu-accent)",
            }}
          />
        </div>

        {pendiente && (
          <Link
            href={pendiente.href}
            className="flex items-center justify-between rounded-lg px-3 py-2.5 transition-colors group"
            style={{
              background: "color-mix(in srgb, var(--kipu-text) 5%, transparent)",
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = "color-mix(in srgb, var(--kipu-text) 10%, transparent)";
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = "color-mix(in srgb, var(--kipu-text) 5%, transparent)";
            }}
          >
            <div className="flex items-center gap-2.5">
              <Circle size={14} className="shrink-0" style={{ color: "var(--kipu-subtle)" }} />
              <div>
                <p className="text-xs font-medium" style={{ color: "var(--kipu-text)" }}>
                  Siguiente: {pendiente.label}
                </p>
                <p className="text-xs" style={{ color: "var(--kipu-subtle)" }}>{pendiente.desc}</p>
              </div>
            </div>
            <ChevronRight size={14} className="transition-colors" style={{ color: "var(--kipu-subtle)" }} />
          </Link>
        )}
      </div>
    );
  }

  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{
        background: "var(--kipu-surface)",
        border: "1px solid var(--kipu-border)",
      }}
    >
      <div
        className="px-5 py-4"
        style={{ borderBottom: "1px solid var(--kipu-border)" }}
      >
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-semibold" style={{ color: "var(--kipu-text)" }}>
            Pasos para activar producción
          </h2>
          <span className="text-xs font-bold" style={{ color: "var(--kipu-accent)" }}>
            {completados}/{total} completados
          </span>
        </div>
        <div
          className="h-1.5 rounded-full overflow-hidden"
          style={{ background: "color-mix(in srgb, var(--kipu-text) 8%, transparent)" }}
        >
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${porcentaje}%`,
              background: "var(--kipu-accent)",
            }}
          />
        </div>
      </div>

      <div>
        {items.map(({ key, label, desc, done, href, icon: Icon }, idx) => (
          <Link
            key={key}
            href={done ? "#" : href}
            className="flex items-center gap-4 px-5 py-4 transition-colors"
            style={{
              borderTop: idx > 0 ? "1px solid var(--kipu-border)" : "none",
              opacity: done ? 0.6 : 1,
              cursor: done ? "default" : "pointer",
              pointerEvents: done ? "none" : "auto",
            }}
            onMouseEnter={e => {
              if (!done) e.currentTarget.style.background = "color-mix(in srgb, var(--kipu-text) 4%, transparent)";
            }}
            onMouseLeave={e => {
              if (!done) e.currentTarget.style.background = "transparent";
            }}
          >
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
              style={{
                background: done
                  ? "color-mix(in srgb, var(--kipu-success) 20%, transparent)"
                  : "color-mix(in srgb, var(--kipu-text) 8%, transparent)",
              }}
            >
              {done ? (
                <CheckCircle2 size={16} style={{ color: "var(--kipu-success)" }} />
              ) : (
                <Icon size={15} style={{ color: "var(--kipu-subtle)" }} />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p
                className="text-sm font-medium"
                style={{
                  color: done ? "var(--kipu-subtle)" : "var(--kipu-text)",
                  textDecoration: done ? "line-through" : "none",
                }}
              >
                {label}
              </p>
              <p className="text-xs mt-0.5" style={{ color: "var(--kipu-subtle)" }}>{desc}</p>
            </div>
            {!done && (
              <ChevronRight size={14} className="shrink-0" style={{ color: "var(--kipu-subtle)" }} />
            )}
          </Link>
        ))}
      </div>
    </div>
  );
}