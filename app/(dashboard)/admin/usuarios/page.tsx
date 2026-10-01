"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import api from "@/lib/api";
import {
  Search, ChevronRight, ChevronLeft,
  Users, Building2, Crown, UserX, AlertTriangle, RotateCw
} from "lucide-react";

type Segmento = "todos" | "duenos" | "colaboradores" | "sin_empresa";

const SEGMENTOS: { key: Segmento; label: string }[] = [
  { key: "todos",         label: "Todos" },
  { key: "duenos",        label: "Dueños" },
  { key: "colaboradores", label: "Colaboradores" },
  { key: "sin_empresa",   label: "Sin empresa" },
];

const PAGE_SIZE = 25;

const fmtFecha = (iso?: string) =>
  iso
    ? new Date(iso).toLocaleDateString("es-EC", { day: "2-digit", month: "short", year: "numeric" })
    : "—";

// ── Badge de tipo ──────────────────────────────────────────────────────────────
function TipoBadge({ u }: { u: any }) {
  const cfg = u.es_dueno
    ? { label: "Dueño",       icon: Crown,     color: "var(--kipu-success)" }
    : u.tiene_empresa
    ? { label: "Colaborador", icon: Building2, color: "#60a5fa" }
    : { label: "Sin empresa", icon: UserX,     color: "var(--kipu-warning)" };
  const Icon = cfg.icon;
  return (
    <span
      className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium whitespace-nowrap"
      style={{
        background: `color-mix(in srgb, ${cfg.color} 20%, transparent)`,
        color: cfg.color,
      }}
    >
      <Icon size={10} />
      {cfg.label}
    </span>
  );
}

// ── Chips de empresas ──────────────────────────────────────────────────────────
function EmpresasChips({ emisores, linkable = true }: { emisores: any[]; linkable?: boolean }) {
  if (!emisores?.length) {
    return <span className="text-xs" style={{ color: "var(--kipu-subtle)" }}>—</span>;
  }
  const visibles = emisores.slice(0, 2);
  const resto    = emisores.length - visibles.length;
  const chipStyle = {
    background: "color-mix(in srgb, var(--kipu-text) 6%, transparent)",
    color:      "var(--kipu-text)",
  };

  return (
    <div className="flex flex-wrap gap-1">
      {visibles.map((e) =>
        linkable ? (
          <Link
            key={e.emisor_id}
            href={`/admin/emisores/${e.emisor_id}`}
            className="text-xs px-2 py-0.5 rounded-md truncate max-w-[160px] transition-colors"
            style={chipStyle}
            title={`${e.nombre} · ${e.ruc} · ${e.rol}`}
            onMouseEnter={ev => ev.currentTarget.style.color = "var(--kipu-accent)"}
            onMouseLeave={ev => ev.currentTarget.style.color = "var(--kipu-text)"}
          >
            {e.nombre}
          </Link>
        ) : (
          <span
            key={e.emisor_id}
            className="text-xs px-2 py-0.5 rounded-md truncate max-w-[140px]"
            style={chipStyle}
          >
            {e.nombre}
          </span>
        )
      )}
      {resto > 0 && (
        <span className="text-xs px-1.5 py-0.5" style={{ color: "var(--kipu-subtle)" }}>
          +{resto}
        </span>
      )}
    </div>
  );
}

// ── Página ─────────────────────────────────────────────────────────────────────
export default function AdminUsuariosPage() {
  const router = useRouter();

  const [usuarios, setUsuarios] = useState<any[]>([]);
  const [conteos,  setConteos]  = useState<Record<Segmento, number>>({
    todos: 0, duenos: 0, colaboradores: 0, sin_empresa: 0,
  });
  const [total,    setTotal]    = useState(0);
  const [segmento, setSegmento] = useState<Segmento>("todos");
  const [query,    setQuery]    = useState("");   // lo que escribe
  const [q,        setQ]        = useState("");   // debounced → API
  const [page,     setPage]     = useState(1);
  const [loading,  setLoading]  = useState(true); // primera carga
  const [fetching, setFetching] = useState(false);
  const [error,    setError]    = useState<string | null>(null);
  const [reload,   setReload]   = useState(0);
  const reqId = useRef(0);

  // Debounce de búsqueda
  useEffect(() => {
    const t = setTimeout(() => {
      setQ(query.trim());
      setPage(1);
    }, 350);
    return () => clearTimeout(t);
  }, [query]);

  // Fetch — descarta respuestas viejas si el usuario cambia rápido de filtro
  useEffect(() => {
    const id = ++reqId.current;
    setFetching(true);
    setError(null);
    api.get("/api/v1/admin/panel/usuarios", {
      params: { q, segmento, page, page_size: PAGE_SIZE },
    })
      .then((res) => {
        if (id !== reqId.current) return;
        setUsuarios(res.data.data ?? []);
        setConteos(res.data.conteos ?? { todos: 0, duenos: 0, colaboradores: 0, sin_empresa: 0 });
        setTotal(res.data.total ?? 0);
      })
      .catch((e: any) => {
        if (id !== reqId.current) return;
        const status = e?.response?.status;
        if (status === 403) {
          router.replace("/dashboard");
          return;
        }
        const detail = e?.response?.data?.detail;
        const msg =
          typeof detail === "string" ? detail :
          detail ? JSON.stringify(detail) :
          e?.message ?? "Error desconocido";
        setError(status ? `Error ${status}: ${msg}` : msg);
        setUsuarios([]);
      })
      .finally(() => {
        if (id !== reqId.current) return;
        setLoading(false);
        setFetching(false);
      });
  }, [q, segmento, page, reload]);

  const cambiarSegmento = (s: Segmento) => {
    setSegmento(s);
    setPage(1);
  };

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const desde      = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const hasta      = Math.min(page * PAGE_SIZE, total);

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

  const btnPaginaStyle = (disabled: boolean) => ({
    background: "var(--kipu-surface)",
    border:     "1px solid var(--kipu-border)",
    color:      "var(--kipu-text)",
    opacity:    disabled ? 0.4 : 1,
    cursor:     disabled ? "not-allowed" : "pointer",
  });

  return (
    <div className="p-4 md:p-6 space-y-3 max-w-6xl mx-auto">

      {/* Búsqueda + segmentos */}
      <div className="flex flex-col lg:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--kipu-subtle)" }} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por email o nombre..."
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
        <div className="flex gap-2 overflow-x-auto">
          {SEGMENTOS.map(({ key, label }) => {
            const active = segmento === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => cambiarSegmento(key)}
                className="px-3 py-2 rounded-lg text-xs font-medium transition-colors whitespace-nowrap"
                style={{
                  background: active ? "var(--kipu-accent)" : "var(--kipu-surface)",
                  color:      active ? "#FFFFFF" : "var(--kipu-subtle)",
                  border:     active ? "none" : "1px solid var(--kipu-border)",
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
                {label}
                <span className="ml-1.5 text-[10px] opacity-60">{conteos[key] ?? 0}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div
          className="flex items-start gap-3 rounded-xl p-4"
          style={{
            background: "color-mix(in srgb, var(--kipu-danger) 10%, transparent)",
            border:     "1px solid color-mix(in srgb, var(--kipu-danger) 40%, transparent)",
          }}
        >
          <AlertTriangle size={16} className="shrink-0 mt-0.5" style={{ color: "var(--kipu-danger)" }} />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium" style={{ color: "var(--kipu-danger)" }}>
              No se pudieron cargar los usuarios
            </p>
            <p className="text-xs mt-1 font-mono break-all" style={{ color: "var(--kipu-text)" }}>
              {error}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setReload(r => r + 1)}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium shrink-0"
            style={{
              background: "var(--kipu-surface)",
              border:     "1px solid var(--kipu-border)",
              color:      "var(--kipu-text)",
            }}
          >
            <RotateCw size={12} /> Reintentar
          </button>
        </div>
      )}

      {/* Tabla */}
      {!error && (
        <div
          className="rounded-xl overflow-hidden transition-opacity"
          style={{
            background: "var(--kipu-surface)",
            border: "1px solid var(--kipu-border)",
            opacity: fetching ? 0.6 : 1,
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
                  <th className="text-left px-4 py-3 font-medium">Usuario</th>
                  <th className="text-left px-4 py-3 font-medium">Empresas</th>
                  <th className="text-left px-4 py-3 font-medium">Tipo</th>
                  <th className="text-left px-4 py-3 font-medium">Registro</th>
                  <th className="text-right px-4 py-3 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {usuarios.map((u, idx) => (
                  <tr
                    key={u.id}
                    className="transition-colors"
                    style={{ borderBottom: idx < usuarios.length - 1 ? "1px solid var(--kipu-border)" : "none" }}
                    onMouseEnter={ev => ev.currentTarget.style.background = "color-mix(in srgb, var(--kipu-text) 4%, transparent)"}
                    onMouseLeave={ev => ev.currentTarget.style.background = "transparent"}
                  >
                    <td className="px-4 py-3">
                      <p className="font-medium truncate max-w-[240px]" style={{ color: "var(--kipu-text)" }}>
                        {u.nombre || u.email}
                      </p>
                      {u.nombre && (
                        <p className="text-xs truncate max-w-[240px]" style={{ color: "var(--kipu-subtle)" }}>
                          {u.email}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <EmpresasChips emisores={u.emisores} />
                    </td>
                    <td className="px-4 py-3">
                      <TipoBadge u={u} />
                    </td>
                    <td className="px-4 py-3 text-xs whitespace-nowrap" style={{ color: "var(--kipu-subtle)" }}>
                      {fmtFecha(u.created_at)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/admin/usuarios/${u.id}`}
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
            {usuarios.map((u, idx) => (
              <Link
                key={u.id}
                href={`/admin/usuarios/${u.id}`}
                className="flex items-center gap-3 px-4 py-3 transition-colors"
                style={{ borderTop: idx > 0 ? "1px solid var(--kipu-border)" : "none" }}
                onMouseEnter={ev => ev.currentTarget.style.background = "color-mix(in srgb, var(--kipu-text) 4%, transparent)"}
                onMouseLeave={ev => ev.currentTarget.style.background = "transparent"}
              >
                <div className="flex-1 min-w-0 space-y-1">
                  <p className="text-sm font-medium truncate" style={{ color: "var(--kipu-text)" }}>
                    {u.nombre || u.email}
                  </p>
                  {u.nombre && (
                    <p className="text-xs truncate" style={{ color: "var(--kipu-subtle)" }}>{u.email}</p>
                  )}
                  <EmpresasChips emisores={u.emisores} linkable={false} />
                </div>
                <div className="text-right shrink-0 space-y-1">
                  <TipoBadge u={u} />
                  <p className="text-[11px]" style={{ color: "var(--kipu-subtle)" }}>{fmtFecha(u.created_at)}</p>
                </div>
                <ChevronRight size={14} className="shrink-0" style={{ color: "var(--kipu-subtle)" }} />
              </Link>
            ))}
          </div>

          {usuarios.length === 0 && (
            <div className="text-center py-12">
              <Users size={32} className="mx-auto mb-2" style={{ color: "var(--kipu-subtle)" }} />
              <p className="text-sm" style={{ color: "var(--kipu-subtle)" }}>No hay usuarios que coincidan</p>
            </div>
          )}
        </div>
      )}

      {/* Paginación */}
      {!error && total > 0 && (
        <div className="flex items-center justify-between">
          <p className="text-xs" style={{ color: "var(--kipu-subtle)" }}>
            {desde}–{hasta} de {total}
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={page <= 1 || fetching}
              onClick={() => setPage(p => p - 1)}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium"
              style={btnPaginaStyle(page <= 1)}
            >
              <ChevronLeft size={13} /> Anterior
            </button>
            <span className="text-xs" style={{ color: "var(--kipu-subtle)" }}>
              {page} / {totalPages}
            </span>
            <button
              type="button"
              disabled={page >= totalPages || fetching}
              onClick={() => setPage(p => p + 1)}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium"
              style={btnPaginaStyle(page >= totalPages)}
            >
              Siguiente <ChevronRight size={13} />
            </button>
          </div>
        </div>
      )}

    </div>
  );
}