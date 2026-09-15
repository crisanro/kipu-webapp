"use client";
import { useState, useEffect, useCallback } from "react";
import api from "@/lib/api";
import { useAuthStore } from "@/store/auth.store";
import {
  Shield, RefreshCw, ChevronDown, ChevronRight,
  Search, X, Filter,
} from "lucide-react";

// =============================================================================
// TIPOS
// =============================================================================
interface AuditEntry {
  id:              string;
  accion:          string;
  entidad:         string;
  entidad_id:      string | null;
  detalle:         Record<string, any> | null;
  ip:              string | null;
  user_agent:      string | null;
  created_at:      string;
  usuario_email:   string | null;
  usuario_nombre:  string;
}

// =============================================================================
// CONSTANTES
// =============================================================================
const ACCIONES  = ["CREATE", "UPDATE", "DELETE", "ANULAR", "REVOKE", "INVITE", "ACTIVATE"] as const;
const ENTIDADES = [
  "documento", "doc_recibido", "cliente", "producto", "cuenta",
  "establecimiento", "punto_emision", "firma", "config",
  "api_key", "proforma", "usuario", "suscripcion", "declaracion",
] as const;

const ACCION_STYLE: Record<string, { color: string; bg: string }> = {
  CREATE:   { color: "var(--kipu-success)", bg: "color-mix(in srgb, var(--kipu-success) 12%, transparent)" },
  UPDATE:   { color: "var(--kipu-accent)",  bg: "color-mix(in srgb, var(--kipu-accent) 12%, transparent)" },
  DELETE:   { color: "var(--kipu-danger)",  bg: "color-mix(in srgb, var(--kipu-danger) 12%, transparent)" },
  ANULAR:   { color: "var(--kipu-warning)", bg: "color-mix(in srgb, var(--kipu-warning) 12%, transparent)" },
  REVOKE:   { color: "var(--kipu-danger)",  bg: "color-mix(in srgb, var(--kipu-danger) 12%, transparent)" },
  INVITE:   { color: "#a78bfa",             bg: "color-mix(in srgb, #a78bfa 12%, transparent)" },
  ACTIVATE: { color: "var(--kipu-success)", bg: "color-mix(in srgb, var(--kipu-success) 12%, transparent)" },
};

const PAGE_SIZE = 30;

function fmtFecha(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("es-EC", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function resumirDetalle(detalle: Record<string, any> | null): string {
  if (!detalle) return "—";
  const keys = Object.keys(detalle).slice(0, 3);
  return keys.map(k => `${k}: ${String(detalle[k]).slice(0, 35)}`).join(" · ");
}

// =============================================================================
// PÁGINA
// =============================================================================
export default function AuditoriaPage() {
  const empresa = useAuthStore((s) => s.empresa);

  // Data
  const [items,   setItems]   = useState<AuditEntry[]>([]);
  const [total,   setTotal]   = useState(0);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);
  const [page,    setPage]    = useState(0);

  // Filtros
  const [accion,      setAccion]      = useState("");
  const [entidad,     setEntidad]     = useState("");
  const [fechaInicio, setFechaInicio] = useState("");
  const [fechaFin,    setFechaFin]    = useState("");
  const [busqueda,    setBusqueda]    = useState("");
  const [showFiltros, setShowFiltros] = useState(false);

  // Expandido
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // ── Fetch ─────────────────────────────────────────────────────────────
  const cargar = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (accion)      params.set("accion", accion);
      if (entidad)     params.set("entidad", entidad);
      if (fechaInicio) params.set("fecha_inicio", fechaInicio);
      if (fechaFin)    params.set("fecha_fin", fechaFin);
      if (busqueda)    params.set("q", busqueda);
      params.set("limit",  String(PAGE_SIZE));
      params.set("offset", String(page * PAGE_SIZE));

      const res = await api.get(`/api/v1/app/audit?${params.toString()}`);
      setItems(res.data.data ?? []);
      setTotal(res.data.total ?? 0);
    } catch (err: any) {
      if (err?.response?.status === 403) {
        setError("No tienes permisos para ver el log de auditoría.");
      } else {
        setError(err?.response?.data?.detail ?? "Error al cargar el historial.");
      }
    } finally {
      setLoading(false);
    }
  }, [accion, entidad, fechaInicio, fechaFin, busqueda, page]);

  useEffect(() => { cargar(); }, [cargar]);
  useEffect(() => { setPage(0); }, [accion, entidad, fechaInicio, fechaFin, busqueda]);

  const totalPages    = Math.ceil(total / PAGE_SIZE);
  const hayFiltros    = !!(accion || entidad || fechaInicio || fechaFin || busqueda);
  const limpiarFiltros = () => {
    setAccion(""); setEntidad(""); setFechaInicio(""); setFechaFin(""); setBusqueda("");
  };

  // ── Render ────────────────────────────────────────────────────────────
  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
            style={{ background: "color-mix(in srgb, var(--kipu-accent) 20%, transparent)" }}
          >
            <Shield size={18} style={{ color: "var(--kipu-accent)" }} />
          </div>
          <div>
            <h1 className="text-xl font-bold" style={{ color: "var(--kipu-text)" }}>Auditoría</h1>
            <p className="text-sm" style={{ color: "var(--kipu-subtle)" }}>Historial de acciones en tu empresa</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowFiltros(!showFiltros)}
            className="p-2 rounded-lg transition-colors relative"
            style={{
              border: "1px solid var(--kipu-border)",
              color: hayFiltros ? "var(--kipu-accent)" : "var(--kipu-subtle)",
              background: hayFiltros ? "color-mix(in srgb, var(--kipu-accent) 8%, transparent)" : "transparent",
            }}
            onMouseEnter={e => { e.currentTarget.style.color = "var(--kipu-text)"; e.currentTarget.style.background = "color-mix(in srgb, var(--kipu-text) 5%, transparent)"; }}
            onMouseLeave={e => { e.currentTarget.style.color = hayFiltros ? "var(--kipu-accent)" : "var(--kipu-subtle)"; e.currentTarget.style.background = hayFiltros ? "color-mix(in srgb, var(--kipu-accent) 8%, transparent)" : "transparent"; }}
          >
            <Filter size={16} />
            {hayFiltros && (
              <span
                className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full"
                style={{ background: "var(--kipu-accent)" }}
              />
            )}
          </button>
          <button
            type="button"
            onClick={cargar}
            disabled={loading}
            className="p-2 rounded-lg transition-colors disabled:opacity-40"
            style={{ border: "1px solid var(--kipu-border)", color: "var(--kipu-subtle)" }}
            onMouseEnter={e => { if (!loading) { e.currentTarget.style.color = "var(--kipu-text)"; e.currentTarget.style.background = "color-mix(in srgb, var(--kipu-text) 5%, transparent)"; } }}
            onMouseLeave={e => { if (!loading) { e.currentTarget.style.color = "var(--kipu-subtle)"; e.currentTarget.style.background = "transparent"; } }}
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: "currentColor", borderTopColor: "transparent" }} />
            ) : (
              <RefreshCw size={16} />
            )}
          </button>
        </div>
      </div>

      {/* Filtros */}
      {showFiltros && (
        <div
          className="rounded-xl p-4 space-y-3"
          style={{ background: "var(--kipu-surface)", border: "1px solid var(--kipu-border)" }}
        >
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--kipu-subtle)" }}>Filtros</p>
            {hayFiltros && (
              <button
                onClick={limpiarFiltros}
                className="text-xs flex items-center gap-1 transition-colors"
                style={{ color: "var(--kipu-danger)" }}
              >
                <X size={12} /> Limpiar
              </button>
            )}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {/* Acción */}
            <div>
              <label className="block text-xs mb-1" style={{ color: "var(--kipu-subtle)" }}>Acción</label>
              <select
                value={accion}
                onChange={e => setAccion(e.target.value)}
                className="w-full rounded-lg px-3 py-2 text-sm outline-none"
                style={{ background: "var(--kipu-bg)", border: "1px solid var(--kipu-border)", color: "var(--kipu-text)" }}
              >
                <option value="">Todas</option>
                {ACCIONES.map(a => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>
            {/* Entidad */}
            <div>
              <label className="block text-xs mb-1" style={{ color: "var(--kipu-subtle)" }}>Entidad</label>
              <select
                value={entidad}
                onChange={e => setEntidad(e.target.value)}
                className="w-full rounded-lg px-3 py-2 text-sm outline-none"
                style={{ background: "var(--kipu-bg)", border: "1px solid var(--kipu-border)", color: "var(--kipu-text)" }}
              >
                <option value="">Todas</option>
                {ENTIDADES.map(e => <option key={e} value={e}>{e}</option>)}
              </select>
            </div>
            {/* Búsqueda */}
            <div>
              <label className="block text-xs mb-1" style={{ color: "var(--kipu-subtle)" }}>Buscar en detalle</label>
              <div className="relative">
                <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2" style={{ color: "var(--kipu-subtle)" }} />
                <input
                  type="text"
                  placeholder="ej: factura, RUC..."
                  value={busqueda}
                  onChange={e => setBusqueda(e.target.value)}
                  className="w-full rounded-lg pl-8 pr-3 py-2 text-sm outline-none"
                  style={{ background: "var(--kipu-bg)", border: "1px solid var(--kipu-border)", color: "var(--kipu-text)" }}
                />
              </div>
            </div>
            {/* Fecha inicio */}
            <div>
              <label className="block text-xs mb-1" style={{ color: "var(--kipu-subtle)" }}>Desde</label>
              <input
                type="date"
                value={fechaInicio}
                onChange={e => setFechaInicio(e.target.value)}
                className="w-full rounded-lg px-3 py-2 text-sm outline-none"
                style={{ background: "var(--kipu-bg)", border: "1px solid var(--kipu-border)", color: "var(--kipu-text)" }}
              />
            </div>
            {/* Fecha fin */}
            <div>
              <label className="block text-xs mb-1" style={{ color: "var(--kipu-subtle)" }}>Hasta</label>
              <input
                type="date"
                value={fechaFin}
                onChange={e => setFechaFin(e.target.value)}
                className="w-full rounded-lg px-3 py-2 text-sm outline-none"
                style={{ background: "var(--kipu-bg)", border: "1px solid var(--kipu-border)", color: "var(--kipu-text)" }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div
          className="flex items-center gap-2 rounded-xl px-4 py-3"
          style={{
            background: "color-mix(in srgb, var(--kipu-danger) 10%, transparent)",
            border: "1px solid color-mix(in srgb, var(--kipu-danger) 20%, transparent)",
            color: "var(--kipu-danger)",
          }}
        >
          <Shield size={14} className="shrink-0" />
          <p className="text-sm">{error}</p>
        </div>
      )}

      {/* Loading */}
      {loading && items.length === 0 ? (
        <div className="flex items-center justify-center py-20">
          <div
            className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin"
            style={{ borderColor: "var(--kipu-accent)", borderTopColor: "transparent" }}
          />
        </div>
      ) : !error && (
        <>
          {/* Tabla */}
          <div
            className="rounded-xl overflow-hidden"
            style={{ background: "var(--kipu-surface)", border: "1px solid var(--kipu-border)" }}
          >
            {/* Header tabla */}
            <div
              className="hidden sm:grid px-4 py-2.5 text-xs font-semibold uppercase tracking-wider"
              style={{
                color: "var(--kipu-subtle)",
                borderBottom: "1px solid var(--kipu-border)",
                gridTemplateColumns: "140px 1fr 90px 110px 1fr 90px",
                gap: "0.5rem",
              }}
            >
              <span>Fecha</span>
              <span>Usuario</span>
              <span>Acción</span>
              <span>Entidad</span>
              <span>Detalle</span>
              <span>IP</span>
            </div>

            {items.length === 0 ? (
              <div className="text-center py-12">
                <Shield size={32} className="mx-auto mb-3" style={{ color: "var(--kipu-border)" }} />
                <p className="text-sm" style={{ color: "var(--kipu-subtle)" }}>
                  {hayFiltros ? "Sin resultados para estos filtros" : "No hay registros de auditoría aún"}
                </p>
              </div>
            ) : (
              items.map((entry) => {
                const expanded = expandedId === entry.id;
                const style    = ACCION_STYLE[entry.accion] ?? { color: "var(--kipu-subtle)", bg: "var(--kipu-bg)" };
                return (
                  <div key={entry.id}>
                    {/* Fila */}
                    <button
                      type="button"
                      onClick={() => setExpandedId(expanded ? null : entry.id)}
                      className="w-full text-left px-4 py-3 transition-colors"
                      style={{ borderBottom: "1px solid var(--kipu-border)" }}
                      onMouseEnter={e => e.currentTarget.style.background = "var(--kipu-bg)"}
                      onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                    >
                      {/* Desktop */}
                      <div
                        className="hidden sm:grid items-center text-sm"
                        style={{ gridTemplateColumns: "140px 1fr 90px 110px 1fr 90px", gap: "0.5rem" }}
                      >
                        <span className="text-xs" style={{ color: "var(--kipu-subtle)" }}>
                          {fmtFecha(entry.created_at)}
                        </span>
                        <div className="min-w-0">
                          <p className="text-sm truncate" style={{ color: "var(--kipu-text)" }}>
                            {entry.usuario_nombre || "—"}
                          </p>
                          {entry.usuario_email && (
                            <p className="text-xs truncate" style={{ color: "var(--kipu-subtle)" }}>
                              {entry.usuario_email}
                            </p>
                          )}
                        </div>
                        <span
                          className="text-[10px] font-bold px-2 py-0.5 rounded-full text-center w-fit"
                          style={{ color: style.color, background: style.bg }}
                        >
                          {entry.accion}
                        </span>
                        <span className="text-xs" style={{ color: "var(--kipu-muted)" }}>
                          {entry.entidad}
                        </span>
                        <span className="text-xs truncate" style={{ color: "var(--kipu-subtle)" }}>
                          {resumirDetalle(entry.detalle)}
                        </span>
                        <span className="text-xs font-mono" style={{ color: "var(--kipu-subtle)" }}>
                          {entry.ip || "—"}
                        </span>
                      </div>

                      {/* Mobile */}
                      <div className="sm:hidden space-y-1">
                        <div className="flex items-center justify-between">
                          <span
                            className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                            style={{ color: style.color, background: style.bg }}
                          >
                            {entry.accion}
                          </span>
                          <span className="text-xs" style={{ color: "var(--kipu-subtle)" }}>
                            {fmtFecha(entry.created_at)}
                          </span>
                        </div>
                        <p className="text-sm" style={{ color: "var(--kipu-text)" }}>
                          <span style={{ color: "var(--kipu-muted)" }}>{entry.entidad}</span>
                          {" · "}
                          {entry.usuario_nombre || entry.usuario_email || "—"}
                        </p>
                        <p className="text-xs truncate" style={{ color: "var(--kipu-subtle)" }}>
                          {resumirDetalle(entry.detalle)}
                        </p>
                      </div>

                      {/* Expand indicator */}
                      <div className="flex justify-end mt-1">
                        {expanded
                          ? <ChevronDown size={12} style={{ color: "var(--kipu-subtle)" }} />
                          : <ChevronRight size={12} style={{ color: "var(--kipu-subtle)" }} />
                        }
                      </div>
                    </button>

                    {/* Detalle expandido */}
                    {expanded && (
                      <div
                        className="px-4 py-4 space-y-3"
                        style={{
                          background: "var(--kipu-bg)",
                          borderBottom: "1px solid var(--kipu-border)",
                        }}
                      >
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                          <div>
                            <span style={{ color: "var(--kipu-subtle)" }}>ID Entidad: </span>
                            <span style={{ color: "var(--kipu-text)" }}>{entry.entidad_id || "—"}</span>
                          </div>
                          <div>
                            <span style={{ color: "var(--kipu-subtle)" }}>IP: </span>
                            <span className="font-mono" style={{ color: "var(--kipu-text)" }}>{entry.ip || "—"}</span>
                          </div>
                          {entry.user_agent && (
                            <div className="sm:col-span-2">
                              <span style={{ color: "var(--kipu-subtle)" }}>User Agent: </span>
                              <span className="break-all" style={{ color: "var(--kipu-text)" }}>{entry.user_agent}</span>
                            </div>
                          )}
                        </div>
                        <div>
                          <p className="text-xs font-semibold mb-1.5" style={{ color: "var(--kipu-subtle)" }}>
                            Detalle completo
                          </p>
                          <pre
                            className="rounded-lg p-3 text-xs overflow-auto max-h-64"
                            style={{
                              background: "var(--kipu-surface)",
                              border: "1px solid var(--kipu-border)",
                              color: "var(--kipu-text)",
                              whiteSpace: "pre-wrap",
                              wordBreak: "break-word",
                            }}
                          >
                            {entry.detalle ? JSON.stringify(entry.detalle, null, 2) : "Sin detalle"}
                          </pre>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Paginación */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between text-sm" style={{ color: "var(--kipu-subtle)" }}>
              <span className="text-xs">
                {total} registro{total !== 1 ? "s" : ""} · Página {page + 1} de {totalPages}
              </span>
              <div className="flex gap-2">
                <button
                  disabled={page === 0}
                  onClick={() => setPage(p => p - 1)}
                  className="px-3 py-1.5 rounded-lg text-xs transition-colors disabled:opacity-30"
                  style={{ border: "1px solid var(--kipu-border)", color: "var(--kipu-text)" }}
                  onMouseEnter={e => { if (page > 0) e.currentTarget.style.background = "var(--kipu-bg)"; }}
                  onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                >
                  ← Anterior
                </button>
                <button
                  disabled={page >= totalPages - 1}
                  onClick={() => setPage(p => p + 1)}
                  className="px-3 py-1.5 rounded-lg text-xs transition-colors disabled:opacity-30"
                  style={{ border: "1px solid var(--kipu-border)", color: "var(--kipu-text)" }}
                  onMouseEnter={e => { if (page < totalPages - 1) e.currentTarget.style.background = "var(--kipu-bg)"; }}
                  onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                >
                  Siguiente →
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}