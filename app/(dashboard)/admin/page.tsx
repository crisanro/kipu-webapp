// app/(dashboard)/admin/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import api from "@/lib/api";
import { useAuthStore } from "@/store/auth.store";
import {
  Users, FileText, CreditCard, TrendingUp,
  Search, Loader2, Bell, ChevronRight,
  Building2, CheckCircle2, Clock
} from "lucide-react";
import { clsx } from "clsx";

const fmt  = (n: any) => parseFloat(n ?? 0).toFixed(2);
const fmtK = (n: any) => {
  const v = parseFloat(n ?? 0);
  return v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v.toFixed(0);
};

export default function AdminPage() {
  const router  = useRouter();
  const empresa = useAuthStore((s) => s.empresa);

  const [stats,    setStats]    = useState<any>(null);
  const [emisores, setEmisores] = useState<any[]>([]);
  const [query,    setQuery]    = useState("");
  const [loading,  setLoading]  = useState(true);
  const [tab,      setTab]      = useState<"todos" | "produccion" | "pruebas">("todos");

  // ── Guard superadmin ─────────────────────────────────────────────────────────
  useEffect(() => {
    const perfil = useAuthStore.getState();
    // Lo verificamos via API — si da 403 redirigimos
  }, []);

  const cargar = async () => {
    setLoading(true);
    try {
      const [resStats, resEmisores] = await Promise.all([
        api.get("/api/v1/admin/panel/stats"),
        api.get("/api/v1/admin/panel/emisores"),
      ]);
      setStats(resStats.data.data);
      setEmisores(resEmisores.data.data ?? []);
    } catch (e: any) {
      if (e?.response?.status === 403) {
        router.replace("/dashboard");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { cargar(); }, []);

  // ── Filtros ──────────────────────────────────────────────────────────────────
  const filtrados = emisores.filter(e => {
    const matchTab =
      tab === "todos"      ? true :
      tab === "produccion" ? e.ambiente === 2 :
      e.ambiente === 1;

    const matchQuery = !query ||
      e.razon_social?.toLowerCase().includes(query.toLowerCase()) ||
      e.ruc?.includes(query) ||
      e.nombre_comercial?.toLowerCase().includes(query.toLowerCase());

    return matchTab && matchQuery;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 size={24} className="animate-spin text-indigo-400" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-6xl mx-auto">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Panel Admin</h1>
          <p className="text-sm text-gray-500">Gestión interna de Kipu</p>
        </div>
        <Link
          href="/admin/notificaciones"
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium transition-colors"
        >
          <Bell size={15} />
          Notificaciones
        </Link>
      </div>

      {/* Stats globales */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            {
              label: "Total emisores",
              value: fmtK(stats.total_emisores),
              sub:   `${stats.en_produccion} en prod · ${stats.en_pruebas} en pruebas`,
              icon:  Building2,
              color: "text-indigo-400",
              bg:    "bg-indigo-400/10",
            },
            {
              label: "Facturas emitidas",
              value: fmtK(stats.total_facturas),
              sub:   `${fmtK(stats.autorizadas)} autorizadas`,
              icon:  FileText,
              color: "text-emerald-400",
              bg:    "bg-emerald-400/10",
            },
            {
              label: "Monto total",
              value: `$${fmtK(stats.monto_total)}`,
              sub:   "en facturas autorizadas",
              icon:  TrendingUp,
              color: "text-blue-400",
              bg:    "bg-blue-400/10",
            },
            {
              label: "Créditos activos",
              value: fmtK(stats.creditos_totales),
              sub:   "en todos los emisores",
              icon:  CreditCard,
              color: "text-amber-400",
              bg:    "bg-amber-400/10",
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
      )}

      {/* Emisores */}
      <div className="space-y-3">

        {/* Búsqueda + tabs */}
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar por RUC, nombre..."
              className="w-full pl-9 pr-4 py-2.5 rounded-lg bg-gray-900 border border-gray-800 text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500 text-sm"
            />
          </div>
          <div className="flex gap-2">
            {(["todos", "produccion", "pruebas"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={clsx(
                  "px-3 py-2 rounded-lg text-xs font-medium transition-colors capitalize",
                  tab === t
                    ? "bg-indigo-600 text-white"
                    : "bg-gray-900 border border-gray-800 text-gray-400 hover:text-white"
                )}
              >
                {t === "todos" ? "Todos" : t === "produccion" ? "Producción" : "Pruebas"}
                <span className="ml-1.5 text-[10px] opacity-60">
                  {t === "todos"      ? emisores.length :
                   t === "produccion" ? emisores.filter(e => e.ambiente === 2).length :
                   emisores.filter(e => e.ambiente === 1).length}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Tabla emisores */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800 text-xs text-gray-500">
                  <th className="text-left px-4 py-3 font-medium">Emisor</th>
                  <th className="text-left px-4 py-3 font-medium">Ambiente</th>
                  <th className="text-right px-4 py-3 font-medium">Créditos</th>
                  <th className="text-right px-4 py-3 font-medium">Facturas</th>
                  <th className="text-right px-4 py-3 font-medium">Usuarios</th>
                  <th className="text-right px-4 py-3 font-medium"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {filtrados.map((e) => (
                  <tr key={e.id} className="hover:bg-gray-800/50 transition-colors">
                    <td className="px-4 py-3">
                      <p className="text-white font-medium truncate max-w-[200px]">
                        {e.nombre_comercial || e.razon_social}
                      </p>
                      <p className="text-xs text-gray-500 font-mono">{e.ruc}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className={clsx(
                        "inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full",
                        e.ambiente === 2
                          ? "bg-emerald-500/20 text-emerald-400"
                          : "bg-amber-500/20 text-amber-400"
                      )}>
                        {e.ambiente === 2
                          ? <><CheckCircle2 size={10} /> Producción</>
                          : <><Clock size={10} /> Pruebas</>
                        }
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className={clsx(
                        "text-sm font-semibold",
                        e.balance_emision <= 5 ? "text-red-400" : "text-white"
                      )}>
                        {e.balance_emision}
                      </span>
                      <span className="text-xs text-gray-600 ml-1">em</span>
                    </td>
                    <td className="px-4 py-3 text-right text-gray-400 text-sm">
                      {e.total_facturas}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-400 text-sm">
                      {e.total_usuarios}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/admin/emisores/${e.id}`}
                        className="inline-flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
                      >
                        Ver <ChevronRight size={12} />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile */}
          <div className="md:hidden divide-y divide-gray-800">
            {filtrados.map((e) => (
              <Link
                key={e.id}
                href={`/admin/emisores/${e.id}`}
                className="flex items-center gap-3 px-4 py-3 hover:bg-gray-800/50 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">
                    {e.nombre_comercial || e.razon_social}
                  </p>
                  <p className="text-xs text-gray-500 font-mono">{e.ruc}</p>
                </div>
                <div className="text-right shrink-0">
                  <span className={clsx(
                    "text-xs px-1.5 py-0.5 rounded-full",
                    e.ambiente === 2
                      ? "bg-emerald-500/20 text-emerald-400"
                      : "bg-amber-500/20 text-amber-400"
                  )}>
                    {e.ambiente === 2 ? "Prod" : "Pruebas"}
                  </span>
                  <p className="text-xs text-gray-500 mt-1">{e.balance_emision} créditos</p>
                </div>
                <ChevronRight size={14} className="text-gray-600 shrink-0" />
              </Link>
            ))}
          </div>

          {filtrados.length === 0 && (
            <div className="text-center py-12">
              <Users size={32} className="text-gray-700 mx-auto mb-2" />
              <p className="text-gray-500 text-sm">No hay emisores que coincidan</p>
            </div>
          )}
        </div>
      </div>

    </div>
  );
}