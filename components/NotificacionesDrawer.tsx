"use client";
import { useCallback } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import useSWR from "swr";
import { useAuthStore } from "@/store/auth.store";
import {
  Bell, X, CheckCheck,
  FileText, CreditCard, AlertTriangle, Info, ClipboardList
} from "lucide-react";

interface Notificacion {
  id:          number;
  type:        string;
  title:       string;
  description: string;
  redirection: string | null;
  is_read:     boolean;
  created_at:  string;
}

// ── Ícono por tipo ─────────────────────────────────────────────────────────────
function IconoTipo({ tipo }: { tipo: string }) {
  const config: Record<string, { icon: any; color: string; bg: string }> = {
    DECLARACION: { icon: ClipboardList, color: "var(--kipu-accent)",  bg: "color-mix(in srgb, var(--kipu-accent) 20%, transparent)" },
    FACTURA:     { icon: FileText,      color: "var(--kipu-success)", bg: "color-mix(in srgb, var(--kipu-success) 20%, transparent)" },
    CREDITOS:    { icon: CreditCard,    color: "var(--kipu-warning)", bg: "color-mix(in srgb, var(--kipu-warning) 20%, transparent)" },
    SISTEMA:     { icon: Info,          color: "#60a5fa",            bg: "color-mix(in srgb, #60a5fa 20%, transparent)" },
    DEFAULT:     { icon: AlertTriangle, color: "var(--kipu-subtle)",  bg: "color-mix(in srgb, var(--kipu-text) 10%, transparent)" },
  };
  const c    = config[tipo] ?? config.DEFAULT;
  const Icon = c.icon;
  return (
    <div
      className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
      style={{ background: c.bg }}
    >
      <Icon size={15} style={{ color: c.color }} />
    </div>
  );
}

// ── Tiempo relativo ────────────────────────────────────────────────────────────
function tiempoRelativo(fecha: string): string {
  const diff  = Date.now() - new Date(fecha).getTime();
  const mins  = Math.floor(diff / 60000);
  const horas = Math.floor(diff / 3600000);
  const dias  = Math.floor(diff / 86400000);
  if (mins < 1)   return "ahora";
  if (mins < 60)  return `hace ${mins}m`;
  if (horas < 24) return `hace ${horas}h`;
  if (dias < 7)   return `hace ${dias}d`;
  return new Date(fecha).toLocaleDateString("es-EC");
}

// ── Hook para notificaciones con SWR ──────────────────────────────────────────
const fetcher = (url: string) => api.get(url).then(r => r.data);

export function useNotificaciones(authLoading: boolean = false) {
  const listo   = useAuthStore((s) => s.listo);
  const empresa = useAuthStore((s) => s.empresa);

  // Incluir emisor_id en la key para que SWR recargue al cambiar empresa
  const swrKey = !authLoading && listo && empresa?.id
    ? `/api/v1/app/notificaciones?e=${empresa.id}`
    : null;

  const { data, mutate } = useSWR(
    swrKey,
    fetcher,
    {
      revalidateOnFocus:     false,
      revalidateOnReconnect: false,
      revalidateIfStale:     false,
      dedupingInterval:      60000, // 1 min
    }
  );

  const notificaciones: Notificacion[] = data?.notificaciones ?? [];
  const noLeidas:        number         = data?.no_leidas        ?? 0;
  const loading                         = !data;

  const marcarLeida = useCallback(async (id: number) => {
    try {
      await api.patch(`/api/v1/app/notificaciones/${id}/leer`);
      mutate(
        (prev: any) => prev ? {
          ...prev,
          notificaciones: prev.notificaciones.map((n: Notificacion) =>
            n.id === id ? { ...n, is_read: true } : n
          ),
          no_leidas: Math.max(0, (prev.no_leidas ?? 1) - 1),
        } : prev,
        false
      );
    } catch (e) { console.error(e); }
  }, [mutate]);

  const marcarTodasLeidas = useCallback(async () => {
    try {
      await api.patch("/api/v1/app/notificaciones/leer-todas");
      mutate(
        (prev: any) => prev ? {
          ...prev,
          notificaciones: prev.notificaciones.map((n: Notificacion) => ({ ...n, is_read: true })),
          no_leidas: 0,
        } : prev,
        false
      );
    } catch (e) { console.error(e); }
  }, [mutate]);

  return {
    notificaciones,
    noLeidas,
    loading,
    cargar: () => mutate(),
    marcarLeida,
    marcarTodasLeidas,
  };
}

// ── Badge ──────────────────────────────────────────────────────────────────────
export function NotificacionesBadge({
  noLeidas,
  onClick,
}: {
  noLeidas: number;
  onClick:  () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="relative flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm transition-colors"
      style={{ color: "var(--kipu-subtle)" }}
      onMouseEnter={e => {
        e.currentTarget.style.color = "var(--kipu-text)";
        e.currentTarget.style.background = "color-mix(in srgb, var(--kipu-text) 5%, transparent)";
      }}
      onMouseLeave={e => {
        e.currentTarget.style.color = "var(--kipu-subtle)";
        e.currentTarget.style.background = "transparent";
      }}
    >
      <Bell size={16} />
      <span>Notificaciones</span>
      {noLeidas > 0 && (
        <span
          className="ml-auto flex items-center justify-center w-5 h-5 rounded-full text-white text-[10px] font-bold"
          style={{ background: "var(--kipu-accent)" }}
        >
          {noLeidas > 9 ? "9+" : noLeidas}
        </span>
      )}
    </button>
  );
}

// ── Drawer ─────────────────────────────────────────────────────────────────────
interface DrawerProps {
  open:           boolean;
  onClose:        () => void;
  notificaciones: Notificacion[];
  noLeidas:       number;
  loading:        boolean;
  onMarcarLeida:  (id: number) => void;
  onMarcarTodas:  () => void;
}

export function NotificacionesDrawer({
  open,
  onClose,
  notificaciones,
  noLeidas,
  loading,
  onMarcarLeida,
  onMarcarTodas,
}: DrawerProps) {
  const router = useRouter();

  const handleClick = (notif: Notificacion) => {
    if (!notif.is_read) onMarcarLeida(notif.id);
    if (notif.redirection) {
      router.push(notif.redirection);
      onClose();
    }
  };

  return (
    <>
      {open && (
        <div className="fixed inset-0 bg-black/50 z-40" onClick={onClose} />
      )}
      <div
        className="fixed top-0 right-0 h-full w-full sm:w-96 z-50 flex flex-col transition-transform duration-300 ease-in-out"
        style={{
          background: "var(--kipu-surface)",
          borderLeft: "1px solid var(--kipu-border)",
          transform: open ? "translateX(0)" : "translateX(100%)",
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-4 py-4"
          style={{ borderBottom: "1px solid var(--kipu-border)" }}
        >
          <div className="flex items-center gap-2">
            <Bell size={17} style={{ color: "var(--kipu-text)" }} />
            <h2 className="text-sm font-semibold" style={{ color: "var(--kipu-text)" }}>Notificaciones</h2>
            {noLeidas > 0 && (
              <span
                className="px-2 py-0.5 rounded-full text-white text-xs font-bold"
                style={{ background: "var(--kipu-accent)" }}
              >
                {noLeidas}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {noLeidas > 0 && (
              <button
                type="button"
                onClick={onMarcarTodas}
                disabled={loading}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs transition-colors disabled:opacity-40"
                style={{ color: "var(--kipu-subtle)" }}
                onMouseEnter={e => {
                  if (!loading) {
                    e.currentTarget.style.color = "var(--kipu-text)";
                    e.currentTarget.style.background = "color-mix(in srgb, var(--kipu-text) 5%, transparent)";
                  }
                }}
                onMouseLeave={e => {
                  if (!loading) {
                    e.currentTarget.style.color = "var(--kipu-subtle)";
                    e.currentTarget.style.background = "transparent";
                  }
                }}
                title="Marcar todas como leídas"
              >
                {loading ? (
                  <div
                    className="w-3 h-3 border-2 border-t-transparent rounded-full animate-spin"
                    style={{ borderColor: "currentColor", borderTopColor: "transparent" }}
                  />
                ) : (
                  <CheckCheck size={13} />
                )}
                <span className="hidden sm:inline">Marcar todas</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg transition-colors"
              style={{ color: "var(--kipu-subtle)" }}
              onMouseEnter={e => {
                e.currentTarget.style.color = "var(--kipu-text)";
                e.currentTarget.style.background = "color-mix(in srgb, var(--kipu-text) 5%, transparent)";
              }}
              onMouseLeave={e => {
                e.currentTarget.style.color = "var(--kipu-subtle)";
                e.currentTarget.style.background = "transparent";
              }}
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Lista */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div
                className="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin"
                style={{ borderColor: "var(--kipu-accent)", borderTopColor: "transparent" }}
              />
            </div>
          ) : notificaciones.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center px-6">
              <Bell size={36} className="mb-3" style={{ color: "var(--kipu-subtle)" }} />
              <p className="text-sm font-medium" style={{ color: "var(--kipu-muted)" }}>Sin notificaciones</p>
              <p className="text-xs mt-1" style={{ color: "var(--kipu-subtle)" }}>
                Te avisaremos cuando haya algo importante
              </p>
            </div>
          ) : (
            <div>
              {notificaciones.map((notif, idx) => (
                <button
                  key={notif.id}
                  type="button"
                  onClick={() => handleClick(notif)}
                  className="w-full flex items-start gap-3 px-4 py-3 text-left transition-colors"
                  style={{
                    borderTop: idx > 0 ? "1px solid var(--kipu-border)" : "none",
                    background: notif.is_read
                      ? "transparent"
                      : "color-mix(in srgb, var(--kipu-accent) 5%, transparent)",
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.background = notif.is_read
                      ? "color-mix(in srgb, var(--kipu-text) 4%, transparent)"
                      : "color-mix(in srgb, var(--kipu-accent) 10%, transparent)";
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.background = notif.is_read
                      ? "transparent"
                      : "color-mix(in srgb, var(--kipu-accent) 5%, transparent)";
                  }}
                >
                  <IconoTipo tipo={notif.type} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p
                        className="text-sm leading-snug"
                        style={{
                          color: notif.is_read ? "var(--kipu-muted)" : "var(--kipu-text)",
                          fontWeight: notif.is_read ? "normal" : 500,
                        }}
                      >
                        {notif.title}
                      </p>
                      <span className="text-[10px] shrink-0 mt-0.5" style={{ color: "var(--kipu-subtle)" }}>
                        {tiempoRelativo(notif.created_at)}
                      </span>
                    </div>
                    <p className="text-xs mt-0.5 line-clamp-2" style={{ color: "var(--kipu-subtle)" }}>
                      {notif.description}
                    </p>
                  </div>
                  {!notif.is_read && (
                    <div
                      className="w-2 h-2 rounded-full shrink-0 mt-1.5"
                      style={{ background: "var(--kipu-accent)" }}
                    />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          className="px-4 py-3 text-center"
          style={{ borderTop: "1px solid var(--kipu-border)" }}
        >
          <p className="text-xs" style={{ color: "var(--kipu-subtle)" }}>
            {notificaciones.length} notificación{notificaciones.length !== 1 ? "es" : ""}
          </p>
        </div>
      </div>
    </>
  );
}