// app/(dashboard)/dashboard/page.tsx
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import api from "@/lib/api";
import { useAuthStore } from "@/store/auth.store";
import {
  Zap, FileText, TrendingUp, Users,
  Plus, ArrowRight, CheckCircle2, Clock,
  AlertTriangle, XCircle, Loader2, Package
} from "lucide-react";
import { clsx } from "clsx";
import Checklist, { HealthData } from "@/components/Checklist";

interface Resumen {
  total_facturas: number;
  importe_total:  number;
  subtotal_iva:   number;
  subtotal_0:     number;
  valor_iva:      number;
}

interface DashboardData {
  health?:   HealthData;
  resumen?:  Resumen;
  facturas?: any[];
  periodo?:  { desde: string; hasta: string };
}

const fmt = (n: number) => (n ?? 0).toFixed(2);

const ESTADO_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  AUTORIZADO: { label: "Autorizada", color: "text-emerald-400 bg-emerald-400/10", icon: CheckCircle2 },
  RECIBIDA:   { label: "En proceso", color: "text-indigo-400 bg-indigo-400/10",   icon: Clock },
  FIRMADO:    { label: "En cola",    color: "text-blue-400 bg-blue-400/10",        icon: Clock },
  DEVUELTA:   { label: "Devuelta",   color: "text-amber-400 bg-amber-400/10",      icon: AlertTriangle },
  RECHAZADO:  { label: "Rechazada",  color: "text-red-400 bg-red-400/10",          icon: XCircle },
};

export default function DashboardPage() {
  const empresa       = useAuthStore((s) => s.empresa);
  const [data,    setData]    = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const cargar = async () => {
      try {
        const hoy       = new Date();
        const primerDia = new Date(hoy.getFullYear(), hoy.getMonth(), 1)
          .toISOString().split("T")[0];
        const hoyStr    = hoy.toISOString().split("T")[0];

        const res = await api.get(
          `/api/v1/app/dashboard?fecha_inicio=${primerDia}&fecha_fin=${hoyStr}`
        );
        setData(res.data.data ?? res.data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    cargar();
  }, []);

  const nombre       = empresa?.nombre_comercial || empresa?.razon_social || "tu empresa";
  const esProduccion = empresa?.ambiente === 2;

  return (
    <div className="p-4 md:p-6 space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Hola 👋</h1>
          <p className="text-sm text-gray-500 mt-0.5 truncate max-w-xs">
            {nombre} ·{" "}
            <span className={esProduccion ? "text-emerald-400" : "text-amber-400"}>
              {esProduccion ? "Producción" : "Pruebas"}
            </span>
          </p>
        </div>
        <Link
          href="/facturas/nueva"
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium transition-colors"
        >
          <Plus size={15} />
          <span className="hidden sm:inline">Nueva Factura</span>
        </Link>
      </div>

      {/* Checklist */}
      {data?.health && !data.health.listo_produccion && (
        <Checklist health={data.health} compact />
      )}

      {/* Alerta ambiente pruebas */}
      {!esProduccion && (
        <div className="flex items-start gap-3 bg-amber-500/10 border border-amber-500/20 rounded-lg px-4 py-3">
          <AlertTriangle size={16} className="text-amber-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm text-amber-300 font-medium">Estás en ambiente de pruebas</p>
            <p className="text-xs text-amber-400/70 mt-0.5">
              Las facturas no son válidas ante el SRI.{" "}
              <Link href="/configuracion" className="underline">Activar producción</Link>
            </p>
          </div>
        </div>
      )}

      {/* Créditos bajos */}
      {empresa && empresa.balance_emision <= 10 && (
        <div className="flex items-start gap-3 bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3">
          <AlertTriangle size={16} className="text-red-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm text-red-300 font-medium">
              Te quedan {empresa.balance_emision} créditos
            </p>
            <p className="text-xs text-red-400/70 mt-0.5">
              <Link href="/configuracion" className="underline">Recargar ahora</Link> para seguir facturando.
            </p>
          </div>
        </div>
      )}

      {/* Contenido */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 size={24} className="animate-spin text-indigo-400" />
        </div>
      ) : (
        <>
          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              {
                label: "Créditos",
                value: empresa?.balance_emision ?? 0,
                sub:   "disponibles",
                icon:  Zap,
                color: "text-indigo-400",
                bg:    "bg-indigo-400/10",
              },
              {
                label: "Este mes",
                value: data?.resumen?.total_facturas ?? 0,
                sub:   `$${fmt(data?.resumen?.importe_total ?? 0)}`,
                icon:  TrendingUp,
                color: "text-emerald-400",
                bg:    "bg-emerald-400/10",
              },
              {
                label: "IVA generado",
                value: `$${fmt(data?.resumen?.valor_iva ?? 0)}`,
                sub:   "este mes",
                icon:  FileText,
                color: "text-blue-400",
                bg:    "bg-blue-400/10",
              },
              {
                label: "Facturado",
                value: `$${fmt(data?.resumen?.importe_total ?? 0)}`,
                sub:   "este mes",
                icon:  CheckCircle2,
                color: "text-emerald-400",
                bg:    "bg-emerald-400/10",
              },
            ].map(({ label, value, sub, icon: Icon, color, bg }) => (
              <div key={label} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                <div className={clsx("w-8 h-8 rounded-lg flex items-center justify-center mb-3", bg)}>
                  <Icon size={16} className={color} />
                </div>
                <p className="text-2xl font-bold text-white">{value}</p>
                <p className="text-xs text-gray-500 mt-0.5">{label}</p>
                <p className="text-xs text-gray-600 mt-0.5">{sub}</p>
              </div>
            ))}
          </div>

          {/* Accesos rápidos */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              { href: "/facturas/nueva", icon: Zap,     label: "Nueva Factura", desc: "Emitir comprobante",    color: "bg-indigo-600/20 text-indigo-400" },
              { href: "/clientes",       icon: Users,    label: "Clientes",      desc: "Gestionar compradores", color: "bg-blue-600/20 text-blue-400" },
              { href: "/productos",      icon: Package,  label: "Productos",     desc: "Catálogo de servicios", color: "bg-emerald-600/20 text-emerald-400" },
            ].map(({ href, icon: Icon, label, desc, color }) => (
              <Link
                key={href}
                href={href}
                className="flex items-center gap-3 bg-gray-900 border border-gray-800 rounded-xl p-4 hover:border-gray-700 transition-colors group"
              >
                <div className={clsx("w-9 h-9 rounded-lg flex items-center justify-center shrink-0", color)}>
                  <Icon size={17} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white">{label}</p>
                  <p className="text-xs text-gray-500">{desc}</p>
                </div>
                <ArrowRight size={14} className="text-gray-600 group-hover:text-gray-400 transition-colors" />
              </Link>
            ))}
          </div>

          {/* Últimas facturas */}
          {data?.facturas && data.facturas.length > 0 && (
            <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800">
                <h2 className="text-sm font-semibold text-white">Últimas facturas</h2>
                <Link
                  href="/facturas"
                  className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 transition-colors"
                >
                  Ver todas <ArrowRight size={12} />
                </Link>
              </div>
              <div className="divide-y divide-gray-800">
                {data.facturas.slice(0, 5).map((f: any) => {
                  const estado = ESTADO_CONFIG[f.estado] ?? ESTADO_CONFIG.FIRMADO;
                  const Icon   = estado.icon;
                  return (
                    <div key={f.id} className="flex items-center gap-3 px-4 py-3 hover:bg-gray-800/50 transition-colors">
                      <div className={clsx(
                        "w-7 h-7 rounded-full flex items-center justify-center shrink-0",
                        estado.color.split(" ")[1]
                      )}>
                        <Icon size={13} className={estado.color.split(" ")[0]} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-white font-medium truncate">
                          {f.cliente_nombre}
                        </p>
                        <p className="text-xs text-gray-500">
                          {f.numero} · {f.fecha}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-semibold text-white">${fmt(f.total)}</p>
                        <p className={clsx("text-xs", estado.color.split(" ")[0])}>
                          {estado.label}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}