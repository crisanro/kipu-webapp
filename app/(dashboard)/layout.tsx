// app/(dashboard)/layout.tsx
"use client";
import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/firebase";
import { signOut } from "firebase/auth";
import { useAuthStore } from "@/store/auth.store";
import api from "@/lib/api";
import PWAInstallBanner from "@/components/PWAInstallBanner";
import { registrarNotificaciones } from "@/lib/notifications";
import {
  LayoutDashboard, FileText, Users, Package, Settings,
  LogOut, Zap, ChevronRight, ChevronDown, Menu, X,
  AlertTriangle, FileInput, Building2, CreditCard, UserCog,
  CheckCircle2, Plus, ChevronUp, Shield, RefreshCw,
} from "lucide-react";
import { clsx } from "clsx";
import {
  useNotificaciones,
  NotificacionesBadge,
  NotificacionesDrawer,
} from "@/components/NotificacionesDrawer";

const NAV_GROUPS = [
  {
    items: [
      { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    ]
  },
  {
    label:    "Emitir",
    icon:     Zap,
    base:     "/documentos/emitir",
    children: [
      { href: "/documentos/emitir/fac",     label: "Factura", icon: FileText },
      { href: "/documentos/emitir/liq",     label: "Liquidación de compra", icon: FileText },
      { href: "/documentos/emitir/ncr",     label: "Nota de crédito", icon: FileText },
      { href: "/documentos/emitir/ndb",     label: "Nota de débito", icon: FileText },
      { href: "/documentos/emitir/ret",     label: "Retención", icon: FileText },
    ],
  },
  {
    label:    "Documentos",
    icon:     FileText,
    base:     "/documentos",
    children: [
      { href: "/documentos",           label: "Emitidos",  icon: FileText  },
      { href: "/documentos/recibidos", label: "Recibidos", icon: FileInput },
    ],
  },
  {
    items: [
      { href: "/clientes",  label: "Clientes",  icon: Users },
      { href: "/productos", label: "Productos", icon: Package },
    ]
  },
  {
    separator: true,
    items: [
      { href: "/estructura",    label: "Estructura",    icon: Building2 },
      { href: "/planes",      label: "Planes",   icon: CreditCard },
      { href: "/usuarios",      label: "Usuarios",      icon: UserCog },
      { href: "/configuracion", label: "Configuración", icon: Settings },
    ]
  },
];

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

  const [sidebarOpen,     setSidebarOpen]     = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [showSelectorEmp, setShowSelectorEmp] = useState(false);
  const [drawerOpen,      setDrawerOpen]      = useState(false);

  // Manejo de estado para carpetas colapsables
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
      setGruposAbiertos(prev => ({ ...prev, "/documentos/emitir": true }));
    }
    if (pathname.startsWith("/documentos") && !pathname.startsWith("/documentos/emitir")) {
      setGruposAbiertos(prev => ({ ...prev, "/documentos": true }));
    }
  }, [pathname]);

  const handleLogout = async () => {
    await signOut(auth);
    logout();
    router.replace("/login");
  };

  const isActive = (href: string) => {
    if (href === "/documentos") {
      return pathname === "/documentos" ||
        (pathname.startsWith("/documentos/") &&
         !pathname.startsWith("/documentos/emitir") &&
         !pathname.startsWith("/documentos/recibidos"));
    }
    return pathname.startsWith(href);
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
            <span className={clsx("text-xs font-medium", ambienteColor)}>
              ● {ambienteLabel}
            </span>
            {empresas.length > 1 && (
              <span className="text-[10px] text-gray-600">{empresas.length} empresas</span>
            )}
          </div>
        </button>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {NAV_GROUPS.map((group, gi) => (
            <div key={gi}>
              {group.separator && <div className="border-t border-gray-800 my-2" />}
              {"children" in group && group.children ? (
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
                      {(gruposAbiertos[group.base ?? ""] ?? false) ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    </span>
                  </button>
                  {(gruposAbiertos[group.base ?? ""] ?? false) && (
                    <div className="mt-0.5 ml-4 pl-3 border-l border-gray-800 space-y-0.5">
                      {group.children.map((child) => {
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
              ) : (
                group.items?.map((item) => {
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
                      {active && <ChevronRight size={14} className="ml-auto" />}
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
                <p className="text-sm font-bold text-white">
                  {empresa.suscripcion?.plan ?? "—"}
                </p>
                <p className="text-xs text-gray-500">
                  {empresa.suscripcion?.estado === "TRIAL"
                    ? "⏳ En prueba"
                    : empresa.suscripcion_activa
                    ? "✅ Activo"
                    : "❌ Inactivo"}
                </p>
              </div>
              {empresa.balance_api > 0 && (
                <div className="text-right">
                  <p className="text-xs text-gray-500">Créditos API</p>
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

          <button onClick={() => setShowLogoutModal(true)}
            className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm text-gray-400 hover:text-red-400 hover:bg-red-500/10 transition-colors">
            <LogOut size={16} />
            Cerrar sesión
          </button>

          <button
            onClick={() => {
              localStorage.removeItem("kipu:empresas");
              localStorage.removeItem("kipu-swr-cache");
              window.location.reload();
            }}
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
          {children}
        </main>
      </div>

      <PWAInstallBanner />
    </div>
  );
}