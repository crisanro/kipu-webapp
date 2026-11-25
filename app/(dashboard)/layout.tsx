"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import { auth } from "@/lib/firebase";
import { signOut } from "firebase/auth";
import { useAuthStore } from "@/store/auth.store";
import { useSandboxStore } from "@/store/sandbox.store";
import PWAInstallBanner from "@/components/PWAInstallBanner";
import AvisoShell from "@/components/shell/AvisoShell";
import {
  registrarNotificaciones,
  desregistrarNotificaciones,
  escucharPrimerPlano,
  permisoNotificaciones,
} from "@/lib/notifications";
import { ES_APP_NATIVA, rutaFueraDelPlan } from "@/lib/plataforma";
import api from "@/lib/api";
import { detalleError } from "@/lib/errores";
import {
  useNotificaciones,
  NotificacionesDrawer,
} from "@/components/NotificacionesDrawer";

import { Sidebar } from "@/components/dashboard/Sidebar";
import BarraSuperior, { EVENTO_CERRAR_SESION, EVENTO_SELECTOR_EMPRESA } from "@/components/shell/BarraSuperior";
import BarraPestanas from "@/components/shell/BarraPestanas";
import PaletaComandos from "@/components/shell/PaletaComandos";
import { ModalLogout, SelectorEmpresa } from "@/components/dashboard/DashboardModals";
import { useVerificacionCorreo } from "@/hooks/useVerificacionCorreo";
import { useCapaAtras } from "@/lib/botonAtras";
import { abrirExterno } from "@/lib/nativo";
import { enlaceWhatsAppAlDia } from "@/lib/soporte";
import { useRestaurarScroll } from "@/lib/useRestaurarScroll";
import { useAvisos } from "@/components/ui/Avisos";

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
  const { activo: sandbox, setSandbox, porPruebas, forzarPorPruebas } = useSandboxStore();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [cerrandoSesion,  setCerrandoSesion]  = useState(false);
  const [showSelectorEmp, setShowSelectorEmp] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  // Botón atrás de Android: cierra el menú o las notificaciones antes de navegar
  useCapaAtras(sidebarOpen, () => setSidebarOpen(false));
  useCapaAtras(drawerOpen,  () => setDrawerOpen(false));
  // Cuentas antiguas que ya tienen empresa pero nunca verificaron el correo
  const correo = useVerificacionCorreo();
  const avisos = useAvisos();
  // Al volver con "atrás", la pantalla queda donde estaba (el desplazamiento vive en <main>)
  const [mainEl, setMainEl] = useState<HTMLElement | null>(null);
  useRestaurarScroll(mainEl);


  // "Cambiar empresa" y "Cerrar sesión" desde la barra superior y la pantalla Más
  useEffect(() => {
    const abrirSelector = () => setShowSelectorEmp(true);
    const abrirLogout   = () => setShowLogoutModal(true);
    window.addEventListener(EVENTO_SELECTOR_EMPRESA, abrirSelector);
    window.addEventListener(EVENTO_CERRAR_SESION, abrirLogout);
    return () => {
      window.removeEventListener(EVENTO_SELECTOR_EMPRESA, abrirSelector);
      window.removeEventListener(EVENTO_CERRAR_SESION, abrirLogout);
    };
  }, []);

  // App de las tiendas: lo que el plan no incluye no se abre ni desde un enlace
  // o una notificación (ver rutaFueraDelPlan en lib/plataforma.ts)
  const fueraDelPlan = rutaFueraDelPlan(pathname, empresa);
  useEffect(() => {
    if (fueraDelPlan) router.replace("/dashboard");
  }, [fueraDelPlan, router]);

  const firmaOk = empresa?.firma_ok ?? false;
  const puedeProduccion = firmaOk && empresa?.ambiente === 2;

  useEffect(() => {
    if (!firmaOk) setSandbox(false);
  }, [firmaOk, setSandbox]);

  useEffect(() => {
    if (firmaOk && empresa?.ambiente === 1) forzarPorPruebas();
  }, [firmaOk, empresa?.ambiente, forzarPorPruebas]);

  // Ya en producción: el sandbox que puso la etapa de pruebas se apaga solo
  // (en cualquier navegador o dispositivo, no solo donde se pulsó el botón)
  useEffect(() => {
    if (empresa?.ambiente === 2 && porPruebas) setSandbox(false);
  }, [empresa?.ambiente, porPruebas, setSandbox]);

  const { notificaciones, noLeidas, loading: loadingNotifs, marcarLeida, marcarTodasLeidas } =
    useNotificaciones(false);

  // ── Push: registrar dispositivo + escuchar mensajes con la app abierta ──────
  const [botonNotif, setBotonNotif] = useState(false);
  const desuscribirPush = useRef<(() => void) | undefined>(undefined);
  const montado = useRef(true);

  const activarPush = useCallback(async (): Promise<boolean> => {
    const ok = await registrarNotificaciones();
    if (ok && montado.current && !desuscribirPush.current) {
      // App nativa: al tocar una notificación se abre su pantalla sin recargar
      desuscribirPush.current = await escucharPrimerPlano(undefined, (url) => router.push(url));
    }
    return ok;
  }, [router]);

  const hayEmpresa = !!empresa?.id;

  useEffect(() => {
    // Sin empresa todavía no existe el perfil: registrar el dispositivo daba 400
    if (!hayEmpresa) return;
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
  }, [activarPush, hayEmpresa]);

  const activarNotificaciones = () => {
    setBotonNotif(false);
    activarPush().catch(() => {});   // dentro del clic: el navegador permite preguntar
  };

  const posponerNotificaciones = () => {
    setBotonNotif(false);
    try { localStorage.setItem(NOTIF_POSPUESTAS, String(Date.now())); } catch {}
  };

  const handleLogout = async () => {
    if (cerrandoSesion) return;
    setCerrandoSesion(true);
    try {
      // Dar de baja el dispositivo ANTES de cerrar sesión (necesita el token
      // válido), pero sin dejar esperando: como mucho 3 s y se cierra igual.
      await Promise.race([
        desregistrarNotificaciones(),
        new Promise((resolve) => setTimeout(resolve, 3000)),
      ]);
    } finally {
      try { await signOut(auth); } catch {}
      logout();
      router.replace("/login");
    }
  };

  // Pago fallido: Stripe reintenta y el plan sigue activo. En la web, enlace al
  // Customer Portal para los dos planes. En la app no hay enlaces de pago (reglas
  // de las tiendas): Al Día, que es un servicio, se resuelve por WhatsApp con el
  // equipo; el Pro, solo el aviso.
  const pagoFallido   = !!empresa?.suscripcion?.pago_fallido;
  const subEsAlDia    = empresa?.suscripcion?.plan === "AL_DIA";
  const avisoConPago  = !ES_APP_NATIVA;
  const pagoPorWhatsApp = ES_APP_NATIVA && subEsAlDia;
  const adminDelPlan  = empresa?.rol === "admin";      // solo el administrador gestiona el pago
  const actualizarTarjeta = async () => {
    try {
      // Desde la app, al salir del portal Stripe vuelve a /volver-a-la-app (neutra)
      const r = await api.post(`/api/v1/app/suscripcion/portal?volver=${subEsAlDia ? "al-dia" : "planes"}${ES_APP_NATIVA ? "&desde_app=true" : ""}`);
      // Web: el portal en esta pestaña; app: navegador dentro de la app (lib/nativo.ts)
      await abrirExterno(r.data.portal_url, { mismaPestana: true });
    } catch (err) {
      avisos.error(detalleError(err, "No pudimos abrir la gestión del pago. Intenta de nuevo."));
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
      {/* Ctrl+K / ⌘K: crear, ir a una pantalla o hacer una acción */}
      <PaletaComandos />
      {showLogoutModal && (
        <ModalLogout
          onConfirm={handleLogout}
          onCancel={() => setShowLogoutModal(false)}
          cerrando={cerrandoSesion}
        />
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
        {/* Celular: título, atrás y campana (en la compu, el menú lateral) */}
        <BarraSuperior
          noLeidas={noLeidas}
          sandbox={sandbox}
          onAbrirNotificaciones={() => setDrawerOpen(true)}
        />

        {/* Abajo deja el alto de la barra de pestañas (--alto-barra-inferior, globals.css) */}
        <main ref={setMainEl} className="flex-1 overflow-y-auto pb-[var(--alto-barra-inferior,0px)]">
          {/* Un solo lugar para los avisos: sin conexión, SRI, correo, notificaciones,
              sandbox y Kipu Pro (el más importante en una línea; "+N" despliega el resto) */}
          <AvisoShell
            sandbox={sandbox}
            puedeProduccion={puedeProduccion}
            onSalirSandbox={() => setSandbox(false)}
            correo={correo}
            email={auth.currentUser?.email}
            pedirNotificaciones={botonNotif}
            onActivarNotificaciones={activarNotificaciones}
            onPosponerNotificaciones={posponerNotificaciones}
            pagoFallido={pagoFallido ? (pagoPorWhatsApp ? {
              texto: adminDelPlan
                ? "El pago de tu servicio falló. Escríbenos por WhatsApp y lo resolvemos."
                : "El pago del servicio falló. Avísale al administrador de la empresa.",
              onActualizar: adminDelPlan
                ? () => void abrirExterno(enlaceWhatsAppAlDia(empresa.razon_social, "pago"))
                : undefined,
              etiqueta: "Escribir por WhatsApp",
            } : {
              texto: !avisoConPago
                ? "Hubo un problema con tu pago. Revisa tu correo."
                : adminDelPlan
                  ? "Tu pago falló, actualiza tu tarjeta."
                  : "El pago del plan falló. Avísale al administrador de la empresa para que actualice la tarjeta.",
              onActualizar: avisoConPago && adminDelPlan ? actualizarTarjeta : undefined,
            }) : null}
          />

          {fueraDelPlan ? null : children}
        </main>
      </div>

      {/* Celular: Inicio · Documentos · Emitir · Personas · Más */}
      <BarraPestanas />

      <PWAInstallBanner />
    </div>
  );
}