"use client";

import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { auth } from "@/lib/firebase";
import { signOut } from "firebase/auth";
import { useAuthStore } from "@/store/auth.store";
import { useSandboxStore } from "@/store/sandbox.store";
import api from "@/lib/api";
import PWAInstallBanner from "@/components/PWAInstallBanner";
import { registrarNotificaciones } from "@/lib/notifications";
import { AlertTriangle, FlaskConical } from "lucide-react";
import { useTheme } from "next-themes";
import {
  useNotificaciones,
  NotificacionesDrawer,
} from "@/components/NotificacionesDrawer";

import { Sidebar } from "@/components/dashboard/Sidebar";
import { MobileHeader } from "@/components/dashboard/MobileHeader";
import { ModalLogout, SelectorEmpresa } from "@/components/dashboard/DashboardModals";

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

  useEffect(() => {
    registrarNotificaciones().catch(() => {});
  }, []);

  const handleLogout = async () => {
    await signOut(auth);
    logout();
    router.replace("/login");
  };

  const reenviarVerificacion = async () => {
    try {
      await api.post("/api/v1/app/auth/send-verification");
      alert("Correo de verificación enviado. Revisa tu bandeja.");
    } catch {
      alert("Error al enviar el correo. Intenta de nuevo.");
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
                className="text-xs underline underline-offset-2 whitespace-nowrap shrink-0"
                style={{ color: "var(--kipu-warning)" }}
              >
                Reenviar
              </button>
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