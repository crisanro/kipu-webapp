// components/NotificacionesDrawer.tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import {
  Bell, X, CheckCheck, Loader2,
  FileText, CreditCard, AlertTriangle, Info, ClipboardList
} from "lucide-react";
import { clsx } from "clsx";

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
    DECLARACION: { icon: ClipboardList, color: "text-indigo-400",  bg: "bg-indigo-500/20" },
    FACTURA:     { icon: FileText,      color: "text-emerald-400", bg: "bg-emerald-500/20" },
    CREDITOS:    { icon: CreditCard,    color: "text-amber-400",   bg: "bg-amber-500/20" },
    SISTEMA:     { icon: Info,          color: "text-blue-400",    bg: "bg-blue-500/20" },
    DEFAULT:     { icon: AlertTriangle, color: "text-gray-400",    bg: "bg-gray-500/20" },
  };
  const c    = config[tipo] ?? config.DEFAULT;
  const Icon = c.icon;
  return (
    <div className={clsx("w-8 h-8 rounded-lg flex items-center justify-center shrink-0", c.bg)}>
      <Icon size={15} className={c.color} />
    </div>
  );
}

// ── Tiempo relativo ────────────────────────────────────────────────────────────
function tiempoRelativo(fecha: string): string {
  const diff = Date.now() - new Date(fecha).getTime();
  const mins  = Math.floor(diff / 60000);
  const horas = Math.floor(diff / 3600000);
  const dias  = Math.floor(diff / 86400000);
  if (mins < 1)   return "ahora";
  if (mins < 60)  return `hace ${mins}m`;
  if (horas < 24) return `hace ${horas}h`;
  if (dias < 7)   return `hace ${dias}d`;
  return new Date(fecha).toLocaleDateString("es-EC");
}

// ── Hook para notificaciones ───────────────────────────────────────────────────
export function useNotificaciones(authLoading: boolean = false) {
  const [noLeidas,       setNoLeidas]       = useState(0);
  const [notificaciones, setNotificaciones] = useState<Notificacion[]>([]);
  const [loading,        setLoading]        = useState(false);

  const cargar = useCallback(async () => {
    if (authLoading) return; // ← no cargar hasta que termine el auth
    setLoading(true);
    try {
      const res = await api.get("/api/v1/app/notificaciones");
      setNotificaciones(res.data.notificaciones ?? []);
      setNoLeidas(res.data.no_leidas ?? 0);
    } catch (e: any) {
      if (e?.response?.status === 401) return;
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [authLoading]);

  useEffect(() => {
    if (authLoading) return;
    cargar();
  }, [authLoading, cargar]);

  const marcarLeida = useCallback(async (id: number) => {
    try {
      await api.patch(`/api/v1/app/notificaciones/${id}/leer`);
      setNotificaciones(prev =>
        prev.map(n => n.id === id ? { ...n, is_read: true } : n)
      );
      setNoLeidas(prev => Math.max(0, prev - 1));
    } catch (e) { console.error(e); }
  }, []);

  const marcarTodasLeidas = useCallback(async () => {
    setLoading(true);
    try {
      await api.patch("/api/v1/app/notificaciones/leer-todas");
      setNotificaciones(prev => prev.map(n => ({ ...n, is_read: true })));
      setNoLeidas(0);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  return { notificaciones, noLeidas, loading, cargar, marcarLeida, marcarTodasLeidas };
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
      onClick={onClick}
      className="relative flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
    >
      <Bell size={16} />
      <span>Notificaciones</span>
      {noLeidas > 0 && (
        <span className="ml-auto flex items-center justify-center w-5 h-5 rounded-full bg-indigo-600 text-white text-[10px] font-bold">
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
      {/* Overlay */}
      {open && (
        <div
          className="fixed inset-0 bg-black/50 z-40"
          onClick={onClose}
        />
      )}

      {/* Drawer */}
      <div className={clsx(
        "fixed top-0 right-0 h-full w-full sm:w-96 bg-gray-900 border-l border-gray-800",
        "z-50 flex flex-col transition-transform duration-300 ease-in-out",
        open ? "translate-x-0" : "translate-x-full"
      )}>

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-gray-800">
          <div className="flex items-center gap-2">
            <Bell size={17} className="text-white" />
            <h2 className="text-sm font-semibold text-white">Notificaciones</h2>
            {noLeidas > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-indigo-600 text-white text-xs font-bold">
                {noLeidas}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {noLeidas > 0 && (
              <button
                onClick={onMarcarTodas}
                disabled={loading}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs text-gray-400 hover:text-white hover:bg-gray-800 transition-colors disabled:opacity-40"
                title="Marcar todas como leídas"
              >
                {loading
                  ? <Loader2 size={13} className="animate-spin" />
                  : <CheckCheck size={13} />
                }
                <span className="hidden sm:inline">Marcar todas</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Lista */}
        <div className="flex-1 overflow-y-auto">
          {notificaciones.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center px-6">
              <Bell size={36} className="text-gray-700 mb-3" />
              <p className="text-gray-500 text-sm">Sin notificaciones</p>
              <p className="text-gray-600 text-xs mt-1">
                Te avisaremos cuando haya algo importante
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-800">
              {notificaciones.map((notif) => (
                <button
                  key={notif.id}
                  onClick={() => handleClick(notif)}
                  className={clsx(
                    "w-full flex items-start gap-3 px-4 py-3 text-left transition-colors",
                    notif.is_read
                      ? "hover:bg-gray-800/50"
                      : "bg-indigo-600/5 hover:bg-indigo-600/10"
                  )}
                >
                  <IconoTipo tipo={notif.type} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className={clsx(
                        "text-sm leading-snug",
                        notif.is_read ? "text-gray-300" : "text-white font-medium"
                      )}>
                        {notif.title}
                      </p>
                      <span className="text-[10px] text-gray-600 shrink-0 mt-0.5">
                        {tiempoRelativo(notif.created_at)}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">
                      {notif.description}
                    </p>
                  </div>
                  {/* Punto azul si no leída */}
                  {!notif.is_read && (
                    <div className="w-2 h-2 rounded-full bg-indigo-400 shrink-0 mt-1.5" />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-gray-800">
          <p className="text-xs text-gray-600 text-center">
            {notificaciones.length} notificación{notificaciones.length !== 1 ? "es" : ""}
          </p>
        </div>
      </div>
    </>
  );
}