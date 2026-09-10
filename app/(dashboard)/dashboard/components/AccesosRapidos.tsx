// app/(dashboard)/dashboard/components/AccesosRapidos.tsx
"use client";
import Link from "next/link";
import {
  FileText, Users, Package, FileInput,
  Settings, BarChart2
} from "lucide-react";

const accesos = [
  {
    href:  "/documentos/emitir/fac",
    icon:  FileText,
    label: "Nueva Factura",
    color: "var(--kipu-accent)",
  },
  {
    href:  "/documentos/recibidos/nueva",
    icon:  FileInput,
    label: "Registrar XML",
    color: "#3b82f6",
  },
  {
    href:  "/personas",
    icon:  Users,
    label: "Clientes",
    color: "var(--kipu-success)",
  },
  {
    href:  "/productos",
    icon:  Package,
    label: "Productos",
    color: "var(--kipu-warning)",
  },
  {
    href:  "/estructura",
    icon:  BarChart2,
    label: "Estructura",
    color: "#a855f7",
  },
  {
    href:  "/configuracion",
    icon:  Settings,
    label: "Configuración",
    color: "var(--kipu-muted)",
  },
];

export default function AccesosRapidos() {
  return (
    <div
      className="rounded-xl p-5 h-full"
      style={{
        background: "var(--kipu-surface)",
        border:     "1px solid var(--kipu-border)",
      }}
    >
      <h2 className="text-sm font-semibold mb-4" style={{ color: "var(--kipu-text)" }}>
        Accesos rápidos
      </h2>
      <div className="grid grid-cols-2 gap-2">
        {accesos.map(({ href, icon: Icon, label, color }) => (
          <Link
            key={href}
            href={href}
            className="flex flex-col items-center gap-2 p-3 rounded-xl text-center transition-all"
            style={{
              background: `color-mix(in srgb, ${color} 12%, transparent)`,
              border:     `1px solid color-mix(in srgb, ${color} 20%, transparent)`,
              color,
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = `color-mix(in srgb, ${color} 22%, transparent)`;
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = `color-mix(in srgb, ${color} 12%, transparent)`;
            }}
          >
            <Icon size={18} />
            <span className="text-xs font-medium leading-tight">{label}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}