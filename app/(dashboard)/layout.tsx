"use client";
import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/firebase";
import { signOut } from "firebase/auth";
import { useAuthStore } from "@/store/auth.store";
import { useSandboxStore } from "@/store/sandbox.store";
import api from "@/lib/api";
import PWAInstallBanner from "@/components/PWAInstallBanner";
import { registrarNotificaciones } from "@/lib/notifications";
import {
  LayoutDashboard, FileText, Users, Package, Settings, Key,
  LogOut, Zap, ChevronRight, ChevronDown, Menu, X, BarChart3,
  AlertTriangle, FileInput, Building2, CreditCard, UserCog,
  CheckCircle2, Plus, ChevronUp, Shield, RefreshCw, FlaskConical,
  MessageCircle, Mail, QrCode,
} from "lucide-react";
import { clsx } from "clsx";
import {
  useNotificaciones,
  NotificacionesBadge,
  NotificacionesDrawer,
} from "@/components/NotificacionesDrawer";

// =============================================================================
// SOPORTE WHATSAPP
// =============================================================================
const WHATSAPP_NUMBER = "593960585581";

function SoporteWhatsApp({ empresa }: { empresa: any }) {
  const [showQR, setShowQR] = useState(false);

  const mensaje = encodeURIComponent(
    `Hola, necesito soporte con Kipu.\nMi correo es: ${empresa?.email ?? ""}\nMi RUC es: ${empresa?.ruc ?? ""}`
  );
  const waUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${mensaje}`;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(waUrl)}`;

  return (
    <div className="relative">
      {/* Desktop — botón que muestra QR */}
      <button
        onClick={() => setShowQR(!showQR)}
        className="hidden lg:flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm text-gray-400 hover:text-green-400 hover:bg-green-500/10 transition-colors"
      >
        <MessageCircle size={16} />
        Soporte
      </button>

      {/* Mobile — link directo */}
      <a
        href={waUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="flex lg:hidden items-center gap-2 w-full px-3 py-2 rounded-lg text-sm text-gray-400 hover:text-green-400 hover:bg-green-500/10 transition-colors"
      >
        <MessageCircle size={16} />
        Soporte WhatsApp
      </a>

      {/* QR Popup — solo desktop */}
      {showQR && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setShowQR(false)} />
          <div className="absolute bottom-10 left-0 z-50 bg-gray-900 border border-gray-700 rounded-xl p-4 shadow-xl w-56">
            <button
              onClick={() => setShowQR(false)}
              className="absolute top-2 right-2 text-gray-500 hover:text-white"
            >
              <X size={14} />
            </button>
            <p className="text-xs text-gray-400 mb-3 text-center">
              Escanea para chatear por WhatsApp
            </p>
            <img
              src={qrUrl}
              alt="QR Soporte WhatsApp"
              className="w-full rounded-lg"
            />
            <a
              href={waUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 flex items-center justify-center gap-2 w-full py-2 rounded-lg bg-green-600 hover:bg-green-500 text-white text-xs font-medium transition-colors"
            >
              <MessageCircle size={13} />
              Abrir WhatsApp
            </a>
          </div>
        </>
      )}
    </div>
  );
}

// =============================================================================
// NAV — con permisos
// =============================================================================
const NAV_GROUPS = [
  {
    items: [
      { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, permiso: null },
    ]
  },
  {
    label:    "Emitir",
    icon:     Zap,
    base:     "/documentos/emitir",
    permiso:  "emitir",
    children: [
      { href: "/documentos/emitir/fac", label: "Factura",           icon: FileText },
      { href: "/documentos/emitir/liq", label: "Liquidación",       icon: FileText },
      { href: "/documentos/emitir/ncr", label: "Nota de crédito",   icon: FileText },
      { href: "/documentos/emitir/ndb", label: "Nota de débito",    icon: FileText },
      { href: "/documentos/emitir/ret", label: "Retención",         icon: FileText },
    ],
  },
  {
    label:    "Documentos",
    icon:     FileText,
    base:     "/documentos",
    permiso:  "descargar",
    children: [
      { href: "/documentos",           label: "Emitidos",  icon: FileText,  permiso: "descargar"            },
      { href: "/documentos/recibidos", label: "Recibidos", icon: FileInput, permiso: "documentos_recibidos" },
    ],
  },
  {
    items: [
      { href: "/clientes",  label: "Clientes",  icon: Users,   permiso: "clientes"  },
      { href: "/productos", label: "Productos", icon: Package, permiso: "productos" },
    ]
  },
  {
    separator: true,
    items: [
      { href: "/estructura",    label: "Estructura",    icon: Building2, permiso: "configuracion" },
      { href: "/planes",        label: "Planes",        icon: CreditCard, permiso: null           },
      { href: "/reportes",      label: "Reportes",      icon: BarChart3,  permiso: "reportes"     },
      { href: "/usuarios",      label: "Usuarios",      icon: UserCog,    permiso: "usuarios"     },
      { href: "/api-keys",      label: "API Keys",      icon: Key,        permiso: "api_keys"     },
      { href: "/configuracion", label: "Configuración", icon: Settings,   permiso: "configuracion"},
    ]
  },
];

// Helper para verificar permisos
function tienePermiso(empresa: any, permiso: string | null): boolean {
  if (!permiso) return true;                          // sin restricción
  if (empresa?.rol === "admin") return true;          // admin ve todo
  return empresa?.permisos?.[permiso] === true;
}

// =============================================================================
// MODALES — sin cambios
// =============================================================================
function ModalLogout({ onConfirm, onCancel }: { onConfirm: () => void; onCancel: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 max-w-sm w-full space-y-4">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-full bg-red-500/20 flex items-center justify-center shrink-0">
            <LogOut size={16} className="text-red-400" />
          </div>
          <div>
            <p className="text-white font-semibold text-sm">¿Cerrar sesión?</p>
            <p className="text-gray-400 text-xs mt-1">Se cerrará tu sesión en este dispositivo.</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={onCancel}
            className="flex-1 py-2 rounded-lg border border-gray-700 text-gray-400 hover:text-white text-sm transition-colors">
            Cancelar
          </button>
          <button onClick={onConfirm}
            className="flex-1 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white text-sm font-medium transition-colors">
            Cerrar sesión
          </button>
        </div>
      </div>
    </div>
  );
}

function SelectorEmpresa({ onClose }: { onClose: () => void }) {
  const router  = useRouter();
  const { empresas, empresa, setEmpresa } = useAuthStore();
  const [cambiando, setCambiando] = useState<number | null>(null);

  const cambiar = async (e: any) => {
    if (e.id === empresa?.id) { onClose(); return; }
    setCambiando(e.id);
    try {
      const res  = await api.post("/api/v1/app/usuarios/empresas/cambiar", { emisor_id: e.id });
      const data = res.data.data;
      setEmpresa({
        id:                 e.id,
        ruc:                data.ruc,
        razon_social:       data.razon_social,
        nombre_comercial:   e.nombre_comercial,
        ambiente:           data.ambiente,
        tipo_emisor:        data.tipo_emisor,
        rol:                data.rol,
        permisos:           data.permisos,
        firma_ok:           e.firma_ok,
        suscripcion_activa: data.suscripcion_activa,
        suscripcion:        data.suscripcion,
        balance_api:        data.balance_api,
      });
      onClose();
      router.push("/dashboard");
    } catch (err) {
      console.error(err);
    } finally {
      setCambiando(null);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-end sm:items-center justify-center p-4">
      <div className="bg-gray-900 border border-gray-800 rounded-xl w-full max-w-sm">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800">
          <h2 className="text-sm font-semibold text-white">Cambiar empresa</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-white"><X size={16} /></button>
        </div>
        <div className="divide-y divide-gray-800 max-h-64 overflow-y-auto">
          {empresas.map((e) => {
            const activa = e.id === empresa?.id;
            return (
              <button key={e.id} onClick={() => cambiar(e)} disabled={!!cambiando}
                className={clsx(
                  "w-full flex items-center gap-3 px-4 py-3 text-left transition-colors",
                  activa ? "bg-indigo-600/10" : "hover:bg-gray-800"
                )}>
                <div className={clsx(
                  "w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-xs font-bold",
                  activa ? "bg-indigo-600 text-white" : "bg-gray-800 text-gray-400"
                )}>
                  {(e.nombre_comercial || e.razon_social)[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">
                    {e.nombre_comercial || e.razon_social}
                  </p>
                  <p className="text-xs text-gray-500">{e.ruc}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className={clsx(
                    "text-[10px] px-1.5 py-0.5 rounded-full",
                    e.ambiente === 2 ? "bg-emerald-500/20 text-emerald-400" : "bg-amber-500/20 text-amber-400"
                  )}>
                    {e.ambiente === 2 ? "Prod" : "Pruebas"}
                  </span>
                  {activa && <CheckCircle2 size={14} className="text-indigo-400" />}
                  {cambiando === e.id && (
                    <div className="w-4 h-4 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
                  )}
                </div>
              </button>
            );
          })}
        </div>
        <div className="p-3 border-t border-gray-800">
          <button
            onClick={() => { onClose(); router.push("/nueva-empresa"); }}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg border border-dashed border-gray-700 text-gray-400 hover:text-white hover:border-gray-600 text-sm transition-colors"
          >
            <Plus size={14} /> Agregar empresa
          </button>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// LAYOUT PRINCIPAL
// =============================================================================
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router   = useRouter();
  const pathname = usePathname();
  const { empresa, empresas, role, logout } = useAuthStore();
  const { activo: sandbox, setSandbox } = useSandboxStore();

  const [sidebarOpen,     setSidebarOpen]     = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [showSelectorEmp, setShowSelectorEmp] = useState(false);
  const [drawerOpen,      setDrawerOpen]      = useState(false);
  const [emailVerificado, setEmailVerificado] = useState(true);

  const firmaOk         = empresa?.firma_ok ?? false;
  const puedeProduccion = firmaOk && empresa?.ambiente === 2;

  // Verificar email al montar
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

  const [gruposAbiertos, setGruposAbiertos] = useState<Record<string, boolean>>({
    "/documentos/emitir": pathname.startsWith("/documentos/emitir"),
    "/documentos":        pathname.startsWith("/documentos") && !pathname.startsWith("/documentos/emitir"),
  });

  const toggleGrupo = (base: string) => {
    setGruposAbiertos(prev => ({ ...prev, [base]: !prev[base] }));
  };

  const { notificaciones, noLeidas, loading: loadingNotifs, marcarLeida, marcarTodasLeidas } =
    useNotificaciones(false);

  useEffect(() => {
    registrarNotificaciones().catch(() => {});
  }, []);

  useEffect(() => {
    if (pathname.startsWith("/documentos/emitir")) {
      setGruposAbiertos(prev => ({ ...prev, "/documentos/emitir": true, "/documentos": false }));
    } else if (pathname.startsWith("/documentos")) {
      setGruposAbiertos(prev => ({ ...prev, "/documentos": true, "/documentos/emitir": false }));
    }
  }, [pathname]);

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

  const isActive = (href: string) => {
    if (href === "/documentos") {
      return pathname === "/documentos" ||
        (pathname.startsWith("/documentos/") &&
         !pathname.startsWith("/documentos/emitir") &&
         !pathname.startsWith("/documentos/recibidos") &&
         !pathname.startsWith("/documentos/nueva"));
    }
    return pathname === href || pathname.startsWith(href + "/");
  };

  if (!empresa) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-950">
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const ambienteColor = empresa.ambiente === 2 ? "text-emerald-400" : "text-amber-400";
  const ambienteLabel = empresa.ambiente === 2 ? "Producción" : "Pruebas";

  return (
    <div className="flex h-screen overflow-hidden">
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
        <div className="fixed inset-0 bg-black/60 z-20 lg:hidden"
          onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={clsx(
        "fixed lg:static inset-y-0 left-0 z-30 w-64 flex flex-col",
        "bg-gray-900 border-r border-gray-800 transition-transform duration-200",
        sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
      )}>
        {/* Logo */}
        <div className="flex items-center gap-2 px-5 py-5 border-b border-gray-800">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center">
            <Zap size={16} className="text-white" />
          </div>
          <span className="font-bold text-white text-lg tracking-tight">Kipu</span>
          <button className="ml-auto lg:hidden text-gray-400" onClick={() => setSidebarOpen(false)}>
            <X size={18} />
          </button>
        </div>

        {/* Selector empresa */}
        <button
          onClick={() => setShowSelectorEmp(true)}
          className="px-4 py-3 border-b border-gray-800 text-left hover:bg-gray-800/50 transition-colors group w-full"
        >
          <p className="text-xs text-gray-500 mb-0.5">Empresa activa</p>
          <div className="flex items-center justify-between">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-white truncate">
                {empresa.nombre_comercial || empresa.razon_social}
              </p>
              <p className="text-xs text-gray-500">{empresa.ruc}</p>
            </div>
            {empresas.length > 1 && (
              <ChevronUp size={12} className="text-gray-500 group-hover:text-white transition-colors rotate-180 ml-2 shrink-0" />
            )}
          </div>
          <div className="flex items-center justify-between mt-1">
            <span className={clsx("text-xs font-medium", ambienteColor)}>● {ambienteLabel}</span>
            {empresas.length > 1 && (
              <span className="text-[10px] text-gray-600">{empresas.length} empresas</span>
            )}
          </div>
        </button>

        {/* Nav con permisos */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {NAV_GROUPS.map((group, gi) => (
            <div key={gi}>
              {group.separator && <div className="border-t border-gray-800 my-2" />}
              {"children" in group && group.children ? (
                // Grupos colapsables — mostrar solo si tiene permiso del grupo
                tienePermiso(empresa, group.permiso ?? null) && (
                  <div>
                    <button
                      onClick={() => toggleGrupo(group.base ?? "")}
                      className={clsx(
                        "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                        pathname.startsWith(group.base ?? "")
                          ? "bg-indigo-600/20 text-indigo-400"
                          : "text-gray-400 hover:text-white hover:bg-gray-800"
                      )}>
                      <group.icon size={17} />
                      {group.label}
                      <span className="ml-auto">
                        {(gruposAbiertos[group.base ?? ""] ?? false)
                          ? <ChevronDown size={14} />
                          : <ChevronRight size={14} />}
                      </span>
                    </button>
                    {(gruposAbiertos[group.base ?? ""] ?? false) && (
                      <div className="mt-0.5 ml-4 pl-3 border-l border-gray-800 space-y-0.5">
                        {group.children
                          .filter(child => tienePermiso(empresa, (child as any).permiso ?? null))
                          .map((child) => {
                            const active = isActive(child.href);
                            const Icon   = child.icon;
                            return (
                              <Link key={child.href} href={child.href}
                                onClick={() => setSidebarOpen(false)}
                                className={clsx(
                                  "flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors",
                                  active
                                    ? "text-indigo-400 bg-indigo-600/10 font-medium"
                                    : "text-gray-500 hover:text-white hover:bg-gray-800"
                                )}>
                                <Icon size={14} />
                                {child.label}
                              </Link>
                            );
                          })}
                      </div>
                    )}
                  </div>
                )
              ) : (
                group.items
                  ?.filter(item => tienePermiso(empresa, (item as any).permiso ?? null))
                  .map((item) => {
                    const active = isActive(item.href);
                    const Icon   = item.icon;
                    return (
                      <Link key={item.href} href={item.href}
                        onClick={() => setSidebarOpen(false)}
                        className={clsx(
                          "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                          active
                            ? "bg-indigo-600/20 text-indigo-400"
                            : "text-gray-400 hover:text-white hover:bg-gray-800"
                        )}>
                        <Icon size={17} />
                        {item.label}
                        {active && item.href !== "/dashboard" && <ChevronRight size={14} className="ml-auto" />}
                      </Link>
                    );
                  })
              )}
            </div>
          ))}

          {role === "superadmin" && (
            <>
              <div className="border-t border-gray-800 my-2" />
              <Link href="/admin" onClick={() => setSidebarOpen(false)}
                className={clsx(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                  pathname.startsWith("/admin")
                    ? "bg-indigo-600/20 text-indigo-400"
                    : "text-gray-400 hover:text-white hover:bg-gray-800"
                )}>
                <Shield size={17} />
                Panel Admin
                {pathname.startsWith("/admin") && <ChevronRight size={14} className="ml-auto" />}
              </Link>
            </>
          )}
        </nav>

        {/* Footer */}
        <div className="px-4 py-4 border-t border-gray-800 space-y-3">
          <Link href="/planes"
            className="block bg-gray-800 hover:bg-gray-700 rounded-lg px-3 py-2.5 transition-colors">
            <p className="text-xs text-gray-500 mb-1">Plan activo</p>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-white">{empresa.suscripcion?.plan ?? "—"}</p>
                <p className="text-xs text-gray-500">
                  {empresa.suscripcion?.estado === "TRIAL"
                    ? "⏳ En prueba"
                    : empresa.suscripcion_activa ? "✅ Activo" : "❌ Inactivo"}
                </p>
              </div>
              {empresa.balance_api > 0 && (
                <div className="text-right">
                  <p className="text-xs text-gray-500">Créditos emisión</p>
                  <p className="text-sm font-bold text-amber-400">{empresa.balance_api}</p>
                </div>
              )}
            </div>
            {!empresa.suscripcion_activa && (
              <div className="flex items-center gap-1 mt-1.5">
                <AlertTriangle size={11} className="text-red-400" />
                <span className="text-xs text-red-400">Sin suscripción activa</span>
              </div>
            )}
          </Link>

          <NotificacionesBadge noLeidas={noLeidas} onClick={() => setDrawerOpen(true)} />

          {/* Toggle Sandbox */}
          {firmaOk ? (
            <button
              onClick={() => { if (!puedeProduccion && sandbox) return; setSandbox(!sandbox); }}
              disabled={!puedeProduccion}
              className={clsx(
                "flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm transition-colors border",
                sandbox
                  ? "bg-blue-500/20 text-blue-400 border-blue-500/30"
                  : "bg-gray-800/50 text-gray-400 border-gray-700 hover:text-gray-300",
                !puedeProduccion && "opacity-60 cursor-not-allowed"
              )}
            >
              <FlaskConical size={15} />
              <span className="flex-1 text-left text-xs font-medium">
                {sandbox ? "Modo Sandbox" : "Producción"}
              </span>
              {!puedeProduccion && <span className="text-[10px] text-amber-400">Solo sandbox</span>}
              {puedeProduccion && (
                <div className={clsx(
                  "w-8 h-4 rounded-full transition-colors relative shrink-0",
                  sandbox ? "bg-blue-600" : "bg-emerald-600"
                )}>
                  <span className={clsx(
                    "absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all",
                    sandbox ? "left-0.5" : "left-4"
                  )} />
                </div>
              )}
            </button>
          ) : (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-xs text-red-400">
              <AlertTriangle size={13} className="shrink-0" />
              <span>Sin firma — no puedes emitir</span>
            </div>
          )}

          {/* Soporte WhatsApp */}
          <SoporteWhatsApp empresa={empresa} />

          <button onClick={() => setShowLogoutModal(true)}
            className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm text-gray-400 hover:text-red-400 hover:bg-red-500/10 transition-colors">
            <LogOut size={16} />
            Cerrar sesión
          </button>

          <button
            onClick={() => { localStorage.removeItem("kipu:empresas"); localStorage.removeItem("kipu-swr-cache"); window.location.reload(); }}
            className="flex items-center justify-center gap-1.5 text-xs text-gray-500 hover:text-gray-300 transition-colors w-full py-1"
          >
            <RefreshCw size={12} />
            Actualizar datos
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="lg:hidden flex items-center gap-3 px-4 py-3 border-b border-gray-800 bg-gray-900">
          <button onClick={() => setSidebarOpen(true)} className="text-gray-400">
            <Menu size={20} />
          </button>
          <span className="font-semibold text-white">Kipu</span>
        </header>

        <main className="flex-1 overflow-y-auto">
          {/* Banner email no verificado */}
          {!emailVerificado && (
            <div className="w-full bg-amber-500/10 border-b border-amber-500/20 px-4 py-2.5 flex items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-2 text-amber-400 text-xs">
                <AlertTriangle size={14} className="shrink-0" />
                <span>
                  Tu correo <strong>{auth.currentUser?.email}</strong> no está verificado.
                  Verifica tu email para poder emitir comprobantes.
                </span>
              </div>
              <button
                onClick={reenviarVerificacion}
                className="text-xs text-amber-400 hover:text-amber-300 underline underline-offset-2 whitespace-nowrap shrink-0"
              >
                Reenviar
              </button>
            </div>
          )}

          {/* Banner Sandbox */}
          {sandbox && (
            <div className="w-full bg-blue-600 px-4 py-2 flex items-center justify-center gap-2 text-xs font-medium text-white shadow-md shrink-0">
              <FlaskConical size={14} />
              <span>MODO SANDBOX — Las facturas no van al SRI real ni poseen validez tributaria.</span>
              {puedeProduccion && (
                <button onClick={() => setSandbox(false)}
                  className="ml-3 underline underline-offset-2 hover:no-underline font-semibold">
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