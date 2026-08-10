// app/(dashboard)/dashboard/page.tsx
"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import api from "@/lib/api";
import { useAuthStore } from "@/store/auth.store";
import {
  Zap, FileText, TrendingUp, Users, Plus, ArrowRight,
  CheckCircle2, Clock, AlertTriangle, XCircle, Loader2, Package
} from "lucide-react";
import { clsx } from "clsx";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import Checklist, { HealthData } from "@/components/Checklist";
import DeclaracionWidget from "@/components/DeclaracionWidget";

interface DashboardData {
  health?:   HealthData;
  resumen?:  any;
  facturas?: any[];
  periodo?:  { desde: string; hasta: string };
}

const fmt  = (n: any) => parseFloat(n ?? 0).toFixed(2);
const fmtK = (n: any) => {
  const v = parseFloat(n ?? 0);
  return v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v.toFixed(2);
};

const ESTADO_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  AUTORIZADO: { label: "Autorizada", color: "text-emerald-400 bg-emerald-400/10", icon: CheckCircle2 },
  RECIBIDA:   { label: "En proceso", color: "text-indigo-400 bg-indigo-400/10",   icon: Clock },
  FIRMADO:    { label: "En cola",    color: "text-blue-400 bg-blue-400/10",        icon: Clock },
  DEVUELTA:   { label: "Devuelta",   color: "text-amber-400 bg-amber-400/10",      icon: AlertTriangle },
  RECHAZADO:  { label: "Rechazada",  color: "text-red-400 bg-red-400/10",          icon: XCircle },
};

// Tooltip personalizado para el gráfico
const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-xs">
      <p className="text-gray-400 mb-1">{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} className="text-white font-medium">${fmt(p.value)}</p>
      ))}
    </div>
  );
};

export default function DashboardPage() {
  const empresa = useAuthStore((s) => s.empresa);
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

  // ── Calcular subtotales dinámicos desde impuestos_totales ──────────────────
  const subtotales: Record<string, { base: number; iva: number }> = {};
  (data?.facturas ?? [])
    .filter((f: any) => f.estado === "AUTORIZADO")
    .forEach((f: any) => {
      const imp = f.impuestos_totales ?? {};
      for (const [tarifa, vals] of Object.entries(imp) as any) {
        if (!subtotales[tarifa]) subtotales[tarifa] = { base: 0, iva: 0 };
        subtotales[tarifa].base += parseFloat(String(vals.base ?? 0));
        subtotales[tarifa].iva  += parseFloat(String(vals.iva  ?? 0));
      }
    });

  // ── Datos para gráfico por día ─────────────────────────────────────────────
  const datosPorDia = Object.entries(
    (data?.facturas ?? [])
      .filter((f: any) => f.estado === "AUTORIZADO")
      .reduce((acc: any, f: any) => {
        const dia = String(f.fecha ?? "").slice(8, 10); // día del mes
        if (!acc[dia]) acc[dia] = 0;
        acc[dia] += parseFloat(String(f.total ?? 0));
        return acc;
      }, {})
  )
    .map(([dia, total]) => ({ dia, total }))
    .sort((a, b) => a.dia.localeCompare(b.dia));

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

      {/* Widget de Declaraciones Fiscales */}
      <DeclaracionWidget />

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
          {/* Stats principales */}
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
                label: "Facturas este mes",
                value: data?.resumen?.total_facturas ?? 0,
                sub:   "autorizadas",
                icon:  TrendingUp,
                color: "text-emerald-400",
                bg:    "bg-emerald-400/10",
              },
              {
                label: "Total facturado",
                value: `$${fmtK(data?.resumen?.importe_total ?? 0)}`,
                sub:   "este mes",
                icon:  FileText,
                color: "text-blue-400",
                bg:    "bg-blue-400/10",
              },
              {
                label: "IVA generado",
                value: `$${fmtK(data?.resumen?.valor_iva ?? 0)}`,
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

          {/* Subtotales por tarifa + Gráfico por día */}
          {(data?.facturas ?? []).filter((f: any) => f.estado === "AUTORIZADO").length > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

              {/* Desglose por tarifa */}
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                <h2 className="text-sm font-semibold text-white mb-4">Desglose este mes</h2>
                <div className="space-y-3">
                  {Object.entries(subtotales)
                    .sort(([a], [b]) => parseInt(b) - parseInt(a))
                    .map(([tarifa, vals]) => (
                      <div key={tarifa} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-indigo-400 shrink-0" />
                          <span className="text-xs text-gray-400">Subtotal {tarifa}%</span>
                        </div>
                        <div className="text-right">
                          <span className="text-sm font-semibold text-white">${fmt(vals.base)}</span>
                          {vals.iva > 0 && (
                            <span className="text-xs text-gray-600 ml-2">IVA ${fmt(vals.iva)}</span>
                          )}
                        </div>
                      </div>
                    ))
                  }
                  <div className="border-t border-gray-800 pt-3 flex justify-between">
                    <span className="text-xs text-gray-500">Total autorizado</span>
                    <span className="text-sm font-bold text-white">
                      ${fmt(data?.resumen?.importe_total ?? 0)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Gráfico por día */}
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                <h2 className="text-sm font-semibold text-white mb-4">Facturación por día</h2>
                {datosPorDia.length > 0 ? (
                  <ResponsiveContainer width="100%" height={160}>
                    <BarChart data={datosPorDia} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                      <XAxis
                        dataKey="dia"
                        tick={{ fill: "#6b7280", fontSize: 10 }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis
                        tick={{ fill: "#6b7280", fontSize: 10 }}
                        axisLine={false}
                        tickLine={false}
                        tickFormatter={(v: number) => `$${fmtK(v)}`}
                      />
                      <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(99,102,241,0.1)" }} />
                      <Bar dataKey="total" radius={[4, 4, 0, 0]}>
                        {datosPorDia.map((_, i) => (
                          <Cell key={i} fill="#6366f1" />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-40 text-gray-600 text-xs">
                    Sin datos para graficar
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Accesos rápidos */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              { href: "/facturas/nueva", icon: Zap,     label: "Nueva Factura", desc: "Emitir comprobante",    color: "bg-indigo-600/20 text-indigo-400" },
              { href: "/clientes",       icon: Users,   label: "Clientes",      desc: "Gestionar compradores", color: "bg-blue-600/20 text-blue-400" },
              { href: "/productos",      icon: Package, label: "Productos",     desc: "Catálogo de servicios", color: "bg-emerald-600/20 text-emerald-400" },
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
                {data.facturas.slice(0, 8).map((f: any) => {
                  const estado = ESTADO_CONFIG[f.estado] ?? ESTADO_CONFIG.FIRMADO;
                  const Icon   = estado.icon;
                  return (
                    <Link
                      key={f.id}
                      href={`/facturas/${f.id}`}
                      className="flex items-center gap-3 px-4 py-3 hover:bg-gray-800/50 transition-colors"
                    >
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
                          {f.numero_factura ?? f.numero} · {String(f.fecha ?? "").slice(0, 10)}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-semibold text-white">${fmt(f.total)}</p>
                        <p className={clsx("text-xs", estado.color.split(" ")[0])}>
                          {estado.label}
                        </p>
                      </div>
                    </Link>
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