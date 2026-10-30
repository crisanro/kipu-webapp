"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import { auth } from "@/lib/firebase";
import { signOut } from "firebase/auth";
import { useAuthStore } from "@/store/auth.store";
import { useSandboxStore } from "@/store/sandbox.store";
import api from "@/lib/api";
import PWAInstallBanner from "@/components/PWAInstallBanner";
import {
  registrarNotificaciones,
  desregistrarNotificaciones,
  escucharPrimerPlano,
  permisoNotificaciones,
} from "@/lib/notifications";
import { AlertTriangle, Bell, FlaskConical } from "lucide-react";
import { useTheme } from "next-themes";
import {
  useNotificaciones,
  NotificacionesDrawer,
} from "@/components/NotificacionesDrawer";

import { Sidebar } from "@/components/dashboard/Sidebar";
import { MobileHeader } from "@/components/dashboard/MobileHeader";
import { ModalLogout, SelectorEmpresa } from "@/components/dashboard/DashboardModals";

// "Ahora no" en el aviso de notificaciones: no volver a mostrarlo por 7 días
const NOTIF_POSPUESTAS = "kipu-notif-pospuestas";
const DIAS_POSPUESTAS  = 7;

function notifPospuestas(): boolean {
  try {
    const t = Number(localStorage.getItem(NOTIF_POSPUESTAS));
    return !!t && Date.now() - t < DIAS_POSPUESTAS * 864e5;
  } catch {
    return false;
  }
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { empresa, empresas, role, logout } = useAuthStore();
  const { activo: sandbox, setSandbox } = useSandboxStore();
  const { resolvedTheme } = useTheme();

  const [mounted, setMounted] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [showSelectorEmp, setShowSelectorEmp] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [emailVerificado, setEmailVerificado] = useState(true);
  const [reenviando, setReenviando] = useState(false);

  useEffect(() => setMounted(true), []);

  const firmaOk = empresa?.firma_ok ?? false;
  const puedeProduccion = firmaOk && empresa?.ambiente === 2;

  useEffect(() => {
    const user = auth.currentUser;
    if (user) setEmailVerificado(user.emailVerified);
  }, []);

  useEffect(() => {
    if (!firmaOk) setSandbox(false);
  }, [firmaOk, setSandbox]);

  useEffect(() => {
    if (firmaOk && empresa?.ambiente === 1) setSandbox(true);
  }, [firmaOk, empresa?.ambiente, setSandbox]);

  const { notificaciones, noLeidas, loading: loadingNotifs, marcarLeida, marcarTodasLeidas } =
    useNotificaciones(false);

  // ── Push: registrar dispositivo + escuchar mensajes con la app abierta ──────
  const [botonNotif, setBotonNotif] = useState(false);
  const desuscribirPush = useRef<(() => void) | undefined>(undefined);
  const montado = useRef(true);

  const activarPush = useCallback(async (): Promise<boolean> => {
    const ok = await registrarNotificaciones();
    if (ok && montado.current && !desuscribirPush.current) {
      desuscribirPush.current = await escucharPrimerPlano();
    }
    return ok;
  }, []);

  useEffect(() => {
    montado.current = true;
    // Intento automático (Chrome muestra la pregunta). Si el permiso sigue sin
    // decidirse (Firefox/Safari lo exigen desde un clic), se ofrece el botón.
    activarPush()
      .then((ok) => {
        if (!ok && montado.current && permisoNotificaciones() === "default" && !notifPospuestas()) {
          setBotonNotif(true);
        }
      })
      .catch(() => {});

    return () => {
      montado.current = false;
      desuscribirPush.current?.();
      desuscribirPush.current = undefined;
    };
  }, [activarPush]);

  const activarNotificaciones = () => {
    setBotonNotif(false);
    activarPush().catch(() => {});   // dentro del clic: el navegador permite preguntar
  };

  const posponerNotificaciones = () => {
    setBotonNotif(false);
    try { localStorage.setItem(NOTIF_POSPUESTAS, String(Date.now())); } catch {}
  };

  const handleLogout = async () => {
    // Dar de baja el dispositivo ANTES de cerrar sesión (necesita el token válido)
    await desregistrarNotificaciones();
    await signOut(auth);
    logout();
    router.replace("/login");
  };

  const reenviarVerificacion = async () => {
    if (reenviando) return;
    setReenviando(true);
    try {
      await api.post("/api/v1/app/auth/send-verification");
      alert("Correo de verificación enviado. Revisa tu bandeja y la carpeta de spam.");
    } catch (e: any) {
      const detail = e?.response?.data?.detail;
      alert(typeof detail === "string" ? detail : "Error al enviar el correo. Intenta de nuevo.");
    } finally {
      setReenviando(false);
    }
  };

  if (!empresa) {
    return (
      <div className="h-screen flex items-center justify-center" style={{ background: "var(--kipu-bg)" }}>
        <div
          className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin"
          style={{ borderColor: "var(--kipu-accent)", borderTopColor: "transparent" }}
        />
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: "var(--kipu-bg)" }}>
      {showLogoutModal && (
        <ModalLogout onConfirm={handleLogout} onCancel={() => setShowLogoutModal(false)} />
      )}
      {showSelectorEmp && (
        <SelectorEmpresa onClose={() => setShowSelectorEmp(false)} />
      )}
      <NotificacionesDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        notificaciones={notificaciones}
        noLeidas={noLeidas}
        loading={loadingNotifs}
        onMarcarLeida={marcarLeida}
        onMarcarTodas={marcarTodasLeidas}
      />

      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-20 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar Extraído */}
      <Sidebar
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        mounted={mounted}
        resolvedTheme={resolvedTheme}
        empresa={empresa}
        empresas={empresas}
        role={role}
        sandbox={sandbox}
        setSandbox={setSandbox}
        firmaOk={firmaOk}
        puedeProduccion={puedeProduccion}
        pathname={pathname}
        noLeidas={noLeidas}
        onOpenSelectorEmp={() => setShowSelectorEmp(true)}
        onOpenLogoutModal={() => setShowLogoutModal(true)}
        onOpenDrawer={() => setDrawerOpen(true)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header móvil Extraído */}
        <MobileHeader
          mounted={mounted}
          resolvedTheme={resolvedTheme}
          noLeidas={noLeidas}
          onOpenSidebar={() => setSidebarOpen(true)}
          onOpenDrawer={() => setDrawerOpen(true)}
        />

        <main className="flex-1 overflow-y-auto">
          {/* Banner email no verificado */}
          {!emailVerificado && (
            <div
              className="w-full px-4 py-2.5 flex items-center justify-between gap-3 shrink-0"
              style={{
                background: "color-mix(in srgb, var(--kipu-warning) 10%, transparent)",
                borderBottom: "1px solid color-mix(in srgb, var(--kipu-warning) 20%, transparent)",
              }}
            >
              <div className="flex items-center gap-2 text-xs" style={{ color: "var(--kipu-warning)" }}>
                <AlertTriangle size={14} className="shrink-0" />
                <span>
                  Tu correo <strong>{auth.currentUser?.email}</strong> no está verificado.
                  Verifica tu email para poder emitir comprobantes.
                </span>
              </div>
              <button
                onClick={reenviarVerificacion}
                disabled={reenviando}
                className="text-xs underline underline-offset-2 whitespace-nowrap shrink-0 disabled:opacity-50"
                style={{ color: "var(--kipu-warning)" }}
              >
                {reenviando ? "Enviando..." : "Reenviar"}
              </button>
            </div>
          )}

          {/* Activar notificaciones (Firefox/Safari solo preguntan tras un clic) */}
          {botonNotif && (
            <div
              className="w-full px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 shrink-0"
              style={{
                background: "color-mix(in srgb, var(--kipu-accent) 10%, transparent)",
                borderBottom: "1px solid color-mix(in srgb, var(--kipu-accent) 20%, transparent)",
              }}
            >
              <div className="flex items-center gap-2 text-xs" style={{ color: "var(--kipu-text)" }}>
                <Bell size={14} className="shrink-0" style={{ color: "var(--kipu-accent)" }} />
                <span>Activa las notificaciones para saber cuándo el SRI autoriza tus comprobantes.</span>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <button
                  onClick={posponerNotificaciones}
                  className="text-xs underline underline-offset-2"
                  style={{ color: "var(--kipu-muted)" }}
                >
                  Ahora no
                </button>
                <button
                  onClick={activarNotificaciones}
                  className="text-xs font-semibold text-white px-3 py-1.5 rounded-lg"
                  style={{ background: "var(--kipu-accent)" }}
                >
                  Activar notificaciones
                </button>
              </div>
            </div>
          )}

          {/* Banner Sandbox */}
          {sandbox && (
            <div
              className="w-full px-4 py-2 flex items-center justify-center gap-2 text-xs font-medium text-white shrink-0"
              style={{ background: "#2563eb" }}
            >
              <FlaskConical size={14} />
              <span>MODO SANDBOX — Las facturas no van al SRI real ni poseen validez tributaria.</span>
              {puedeProduccion && (
                <button
                  onClick={() => setSandbox(false)}
                  className="ml-3 underline underline-offset-2 hover:no-underline font-semibold"
                >
                  Salir
                </button>
              )}
            </div>
          )}

          {children}
        </main>
      </div>

      <PWAInstallBanner />
    </div>
  );
}