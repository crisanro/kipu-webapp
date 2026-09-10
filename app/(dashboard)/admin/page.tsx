"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import api from "@/lib/api";
import { useAuthStore } from "@/store/auth.store";
import {
  Users, FileText, CreditCard, TrendingUp,
  Search, Bell, ChevronRight,
  Building2, CheckCircle2, Clock
} from "lucide-react";

const fmtK = (n: any) => {
  const v = parseFloat(n ?? 0);
  return v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v.toFixed(0);
};

export default function AdminPage() {
  const router  = useRouter();

  const [stats,    setStats]    = useState<any>(null);
  const [emisores, setEmisores] = useState<any[]>([]);
  const [query,    setQuery]    = useState("");
  const [loading,  setLoading]  = useState(true);
  const [tab,      setTab]      = useState<"todos" | "produccion" | "pruebas">("todos");

  // ── Guard superadmin ─────────────────────────────────────────────────────────
  useEffect(() => {
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
        <div
          className="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin"
          style={{ borderColor: "var(--kipu-accent)", borderTopColor: "transparent" }}
        />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-6xl mx-auto">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold" style={{ color: "var(--kipu-text)" }}>Panel Admin</h1>
          <p className="text-sm" style={{ color: "var(--kipu-subtle)" }}>Gestión interna de Kipu</p>
        </div>
        <Link
          href="/admin/notificaciones"
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-medium transition-colors"
          style={{ background: "var(--kipu-accent)" }}
          onMouseEnter={e => e.currentTarget.style.background = "var(--kipu-accent-h)"}
          onMouseLeave={e => e.currentTarget.style.background = "var(--kipu-accent)"}
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
              color: "var(--kipu-accent)",
              bg:    "color-mix(in srgb, var(--kipu-accent) 10%, transparent)",
            },
            {
              label: "Facturas emitidas",
              value: fmtK(stats.total_facturas),
              sub:   `${fmtK(stats.autorizadas)} autorizadas`,
              icon:  FileText,
              color: "var(--kipu-success)",
              bg:    "color-mix(in srgb, var(--kipu-success) 10%, transparent)",
            },
            {
              label: "Monto total",
              value: `$${fmtK(stats.monto_total)}`,
              sub:   "en facturas autorizadas",
              icon:  TrendingUp,
              color: "#60a5fa",
              bg:    "color-mix(in srgb, #60a5fa 10%, transparent)",
            },
            {
              label: "Créditos activos",
              value: fmtK(stats.creditos_totales),
              sub:   "en todos los emisores",
              icon:  CreditCard,
              color: "var(--kipu-warning)",
              bg:    "color-mix(in srgb, var(--kipu-warning) 10%, transparent)",
            },
          ].map(({ label, value, sub, icon: Icon, color, bg }) => (
            <div
              key={label}
              className="rounded-xl p-4"
              style={{
                background: "var(--kipu-surface)",
                border: "1px solid var(--kipu-border)",
              }}
            >
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center mb-3"
                style={{ background: bg }}
              >
                <Icon size={16} style={{ color }} />
              </div>
              <p className="text-2xl font-bold" style={{ color: "var(--kipu-text)" }}>{value}</p>
              <p className="text-xs mt-0.5" style={{ color: "var(--kipu-subtle)" }}>{label}</p>
              <p className="text-xs mt-0.5" style={{ color: "var(--kipu-subtle)" }}>{sub}</p>
            </div>
          ))}
        </div>
      )}

      {/* Emisores */}
      <div className="space-y-3">

        {/* Búsqueda + tabs */}
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--kipu-subtle)" }} />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar por RUC, nombre..."
              className="w-full pl-9 pr-4 py-2.5 rounded-lg text-sm focus:outline-none transition-colors"
              style={{
                background: "var(--kipu-surface)",
                border: "1px solid var(--kipu-border)",
                color: "var(--kipu-text)",
              }}
              onFocus={e => e.currentTarget.style.borderColor = "var(--kipu-accent)"}
              onBlur={e => e.currentTarget.style.borderColor = "var(--kipu-border)"}
            />
          </div>
          <div className="flex gap-2">
            {(["todos", "produccion", "pruebas"] as const).map((t) => {
              const active = tab === t;
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTab(t)}
                  className="px-3 py-2 rounded-lg text-xs font-medium transition-colors capitalize"
                  style={{
                    background: active
                      ? "var(--kipu-accent)"
                      : "var(--kipu-surface)",
                    color: active
                      ? "#FFFFFF"
                      : "var(--kipu-subtle)",
                    border: active
                      ? "none"
                      : "1px solid var(--kipu-border)",
                  }}
                  onMouseEnter={e => {
                    if (!active) {
                      e.currentTarget.style.color = "var(--kipu-text)";
                      e.currentTarget.style.borderColor = "color-mix(in srgb, var(--kipu-text) 30%, transparent)";
                    }
                  }}
                  onMouseLeave={e => {
                    if (!active) {
                      e.currentTarget.style.color = "var(--kipu-subtle)";
                      e.currentTarget.style.borderColor = "var(--kipu-border)";
                    }
                  }}
                >
                  {t === "todos" ? "Todos" : t === "produccion" ? "Producción" : "Pruebas"}
                  <span className="ml-1.5 text-[10px] opacity-60">
                    {t === "todos"      ? emisores.length :
                     t === "produccion" ? emisores.filter(e => e.ambiente === 2).length :
                     emisores.filter(e => e.ambiente === 1).length}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Tabla emisores */}
        <div
          className="rounded-xl overflow-hidden"
          style={{
            background: "var(--kipu-surface)",
            border: "1px solid var(--kipu-border)",
          }}
        >
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr
                  className="text-xs"
                  style={{
                    borderBottom: "1px solid var(--kipu-border)",
                    color: "var(--kipu-subtle)",
                  }}
                >
                  <th className="text-left px-4 py-3 font-medium">Emisor</th>
                  <th className="text-left px-4 py-3 font-medium">Ambiente</th>
                  <th className="text-right px-4 py-3 font-medium">Créditos</th>
                  <th className="text-right px-4 py-3 font-medium">Facturas</th>
                  <th className="text-right px-4 py-3 font-medium">Usuarios</th>
                  <th className="text-right px-4 py-3 font-medium"></th>
                </tr>
              </thead>
              <tbody style={{ borderTop: "1px solid var(--kipu-border)" }}>
                {filtrados.map((e, idx) => (
                  <tr
                    key={e.id}
                    className="transition-colors"
                    style={{ borderBottom: idx < filtrados.length - 1 ? "1px solid var(--kipu-border)" : "none" }}
                    onMouseEnter={ev => ev.currentTarget.style.background = "color-mix(in srgb, var(--kipu-text) 4%, transparent)"}
                    onMouseLeave={ev => ev.currentTarget.style.background = "transparent"}
                  >
                    <td className="px-4 py-3">
                      <p className="font-medium truncate max-w-[200px]" style={{ color: "var(--kipu-text)" }}>
                        {e.nombre_comercial || e.razon_social}
                      </p>
                      <p className="text-xs font-mono" style={{ color: "var(--kipu-subtle)" }}>{e.ruc}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium"
                        style={{
                          background: e.ambiente === 2
                            ? "color-mix(in srgb, var(--kipu-success) 20%, transparent)"
                            : "color-mix(in srgb, var(--kipu-warning) 20%, transparent)",
                          color: e.ambiente === 2
                            ? "var(--kipu-success)"
                            : "var(--kipu-warning)",
                        }}
                      >
                        {e.ambiente === 2
                          ? <><CheckCircle2 size={10} /> Producción</>
                          : <><Clock size={10} /> Pruebas</>
                        }
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span
                        className="text-sm font-semibold"
                        style={{
                          color: e.balance_emision <= 5 ? "var(--kipu-danger)" : "var(--kipu-text)",
                        }}
                      >
                        {e.balance_emision}
                      </span>
                      <span className="text-xs ml-1" style={{ color: "var(--kipu-subtle)" }}>em</span>
                    </td>
                    <td className="px-4 py-3 text-right text-sm" style={{ color: "var(--kipu-subtle)" }}>
                      {e.total_facturas}
                    </td>
                    <td className="px-4 py-3 text-right text-sm" style={{ color: "var(--kipu-subtle)" }}>
                      {e.total_usuarios}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/admin/emisores/${e.id}`}
                        className="inline-flex items-center gap-1 text-xs transition-colors font-medium"
                        style={{ color: "var(--kipu-accent)" }}
                        onMouseEnter={ev => ev.currentTarget.style.color = "var(--kipu-accent-h)"}
                        onMouseLeave={ev => ev.currentTarget.style.color = "var(--kipu-accent)"}
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
          <div className="md:hidden">
            {filtrados.map((e, idx) => (
              <Link
                key={e.id}
                href={`/admin/emisores/${e.id}`}
                className="flex items-center gap-3 px-4 py-3 transition-colors"
                style={{
                  borderTop: idx > 0 ? "1px solid var(--kipu-border)" : "none",
                }}
                onMouseEnter={ev => ev.currentTarget.style.background = "color-mix(in srgb, var(--kipu-text) 4%, transparent)"}
                onMouseLeave={ev => ev.currentTarget.style.background = "transparent"}
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate" style={{ color: "var(--kipu-text)" }}>
                    {e.nombre_comercial || e.razon_social}
                  </p>
                  <p className="text-xs font-mono" style={{ color: "var(--kipu-subtle)" }}>{e.ruc}</p>
                </div>
                <div className="text-right shrink-0">
                  <span
                    className="text-xs px-1.5 py-0.5 rounded-full font-medium"
                    style={{
                      background: e.ambiente === 2
                        ? "color-mix(in srgb, var(--kipu-success) 20%, transparent)"
                        : "color-mix(in srgb, var(--kipu-warning) 20%, transparent)",
                      color: e.ambiente === 2
                        ? "var(--kipu-success)"
                        : "var(--kipu-warning)",
                    }}
                  >
                    {e.ambiente === 2 ? "Prod" : "Pruebas"}
                  </span>
                  <p className="text-xs mt-1" style={{ color: "var(--kipu-subtle)" }}>{e.balance_emision} créditos</p>
                </div>
                <ChevronRight size={14} className="shrink-0" style={{ color: "var(--kipu-subtle)" }} />
              </Link>
            ))}
          </div>

          {filtrados.length === 0 && (
            <div className="text-center py-12">
              <Users size={32} className="mx-auto mb-2" style={{ color: "var(--kipu-subtle)" }} />
              <p className="text-sm" style={{ color: "var(--kipu-subtle)" }}>No hay emisores que coincidan</p>
            </div>
          )}
        </div>
      </div>

    </div>
  );
}