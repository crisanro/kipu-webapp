// app/(dashboard)/dashboard/components/AccesosRapidos.tsx
"use client";
import Link from "next/link";
import { clsx } from "clsx";
import {
  Zap, Users, Package, FileInput,
  Settings, BarChart2
} from "lucide-react";

const accesos = [
  {
    href:   "/documentos/nueva",
    icon:   Zap,
    label:  "Nueva Factura",
    color:  "bg-indigo-500/20 text-indigo-400 border-indigo-500/20",
    hover:  "hover:bg-indigo-500/30",
  },
  {
    href:   "/documentos/recibidas/nueva",
    icon:   FileInput,
    label:  "Registrar XML",
    color:  "bg-blue-500/20 text-blue-400 border-blue-500/20",
    hover:  "hover:bg-blue-500/30",
  },
  {
    href:   "/clientes",
    icon:   Users,
    label:  "Clientes",
    color:  "bg-emerald-500/20 text-emerald-400 border-emerald-500/20",
    hover:  "hover:bg-emerald-500/30",
  },
  {
    href:   "/productos",
    icon:   Package,
    label:  "Productos",
    color:  "bg-amber-500/20 text-amber-400 border-amber-500/20",
    hover:  "hover:bg-amber-500/30",
  },
  {
    href:   "/estructura",
    icon:   BarChart2,
    label:  "Estructura",
    color:  "bg-purple-500/20 text-purple-400 border-purple-500/20",
    hover:  "hover:bg-purple-500/30",
  },
  {
    href:   "/configuracion",
    icon:   Settings,
    label:  "Configuración",
    color:  "bg-gray-700/50 text-gray-400 border-gray-700",
    hover:  "hover:bg-gray-700",
  },
];

export default function AccesosRapidos() {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 h-full">
      <h2 className="text-sm font-semibold text-white mb-4">Accesos rápidos</h2>
      <div className="grid grid-cols-2 gap-2">
        {accesos.map(({ href, icon: Icon, label, color, hover }) => (
          <Link
            key={href}
            href={href}
            className={clsx(
              "flex flex-col items-center gap-2 p-3 rounded-xl border transition-all text-center",
              color, hover
            )}
          >
            <Icon size={18} />
            <span className="text-xs font-medium leading-tight">{label}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}