// components/Checklist.tsx
"use client";

import Link from "next/link";
import {
  CheckCircle2, Circle, Mail, Building2,
  Shield, Store, ChevronRight
} from "lucide-react";
import { clsx } from "clsx";

export interface HealthData {
  email_verificado:              boolean;
  ruc:                           boolean;
  firma_configurada:             boolean;
  firma_vigente:                 boolean;
  establecimientos_configurados: boolean;
  puntos_emision_configurados:   boolean;
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
      <div className="bg-indigo-600/10 border border-indigo-500/20 rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-sm font-semibold text-white">
              Configura tu cuenta ({completados}/{total})
            </p>
            <p className="text-xs text-gray-400 mt-0.5">
              Completa estos pasos para activar producción
            </p>
          </div>
          <span className="text-sm font-bold text-indigo-400">{porcentaje}%</span>
        </div>

        <div className="h-1.5 bg-gray-800 rounded-full mb-3 overflow-hidden">
          <div
            className="h-full bg-indigo-500 rounded-full transition-all duration-500"
            style={{ width: `${porcentaje}%` }}
          />
        </div>

        {pendiente && (
          <Link
            href={pendiente.href}
            className="flex items-center justify-between bg-gray-800 hover:bg-gray-700 rounded-lg px-3 py-2.5 transition-colors group"
          >
            <div className="flex items-center gap-2.5">
              <Circle size={14} className="text-gray-500 shrink-0" />
              <div>
                <p className="text-xs font-medium text-white">
                  Siguiente: {pendiente.label}
                </p>
                <p className="text-xs text-gray-500">{pendiente.desc}</p>
              </div>
            </div>
            <ChevronRight size={14} className="text-gray-500 group-hover:text-white transition-colors" />
          </Link>
        )}
      </div>
    );
  }

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-800">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-semibold text-white">
            Pasos para activar producción
          </h2>
          <span className="text-xs font-bold text-indigo-400">
            {completados}/{total} completados
          </span>
        </div>
        <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-indigo-500 rounded-full transition-all duration-500"
            style={{ width: `${porcentaje}%` }}
          />
        </div>
      </div>

      <div className="divide-y divide-gray-800">
        {items.map(({ key, label, desc, done, href, icon: Icon }) => (
          <Link
            key={key}
            href={done ? "#" : href}
            className={clsx(
              "flex items-center gap-4 px-5 py-4 transition-colors",
              done
                ? "opacity-60 cursor-default pointer-events-none"
                : "hover:bg-gray-800/50"
            )}
          >
            <div className={clsx(
              "w-8 h-8 rounded-full flex items-center justify-center shrink-0",
              done ? "bg-emerald-500/20" : "bg-gray-800"
            )}>
              {done
                ? <CheckCircle2 size={16} className="text-emerald-400" />
                : <Icon size={15} className="text-gray-500" />
              }
            </div>
            <div className="flex-1 min-w-0">
              <p className={clsx(
                "text-sm font-medium",
                done ? "text-gray-400 line-through" : "text-white"
              )}>
                {label}
              </p>
              <p className="text-xs text-gray-500 mt-0.5">{desc}</p>
            </div>
            {!done && (
              <ChevronRight size={14} className="text-gray-600 shrink-0" />
            )}
          </Link>
        ))}
      </div>
    </div>
  );
}