// app/(dashboard)/layout.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { useAuthStore } from "@/store/auth.store";
import api from "@/lib/api";
import {
  LayoutDashboard,
  FileText,
  Users,
  Package,
  Settings,
  LogOut,
  Zap,
  ChevronRight,
  ChevronDown,
  Menu,
  X,
  AlertTriangle,
  FileInput,
} from "lucide-react";
import { clsx } from "clsx";

const NAV_ITEMS = [
  { href: "/dashboard",      label: "Dashboard",    icon: LayoutDashboard },
  { href: "/facturas/nueva", label: "Nueva Factura", icon: Zap },
  {
    label: "Facturas",
    icon: FileText,
    children: [
      { href: "/facturas",             label: "Emitidas" },
      { href: "/facturas/recibidas",   label: "Recibidas" },
    ],
  },
  { href: "/clientes",       label: "Clientes",     icon: Users },
  { href: "/productos",      label: "Productos",    icon: Package },
  { href: "/configuracion",  label: "Configuración", icon: Settings },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router   = useRouter();
  const pathname = usePathname();
  const { empresa, setUser, setEmpresa, setEmpresas, logout } = useAuthStore();
  const [loading,      setLoading]      = useState(true);
  const [sidebarOpen,  setSidebarOpen]  = useState(false);
  const [facturasOpen, setFacturasOpen] = useState(
    pathname.startsWith("/facturas")
  );

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.replace("/login");
        return;
      }
      try {
        const res     = await api.get("/api/v1/app/usuarios/empresas");
        const empresas = res.data.data ?? [];
        if (empresas.length === 0) {
          router.replace("/onboarding");
          return;
        }
        setUser(user.uid, user.email ?? "", "");
        setEmpresas(empresas);
        if (!empresa) setEmpresa(empresas[0]);
      } catch (err) {
        console.error(err);
        router.replace("/login");
      } finally {
        setLoading(false);
      }
    });
    return () => unsub();
  }, []);

  // Abrir submenu facturas automáticamente si la ruta lo requiere
  useEffect(() => {
    if (pathname.startsWith("/facturas")) setFacturasOpen(true);
  }, [pathname]);

  const handleLogout = async () => {
    await signOut(auth);
    logout();
    router.replace("/login");
  };

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-950">
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const ambienteLabel = empresa?.ambiente === 2 ? "Producción" : "Pruebas";
  const ambienteColor = empresa?.ambiente === 2 ? "text-emerald-400" : "text-amber-400";

  return (
    <div className="flex h-screen overflow-hidden">

      {/* Overlay móvil */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-20 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ── Sidebar ─────────────────────────────────────────────────────── */}
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
          <button
            className="ml-auto lg:hidden text-gray-400"
            onClick={() => setSidebarOpen(false)}
          >
            <X size={18} />
          </button>
        </div>

        {/* Empresa activa */}
        {empresa && (
          <div className="px-4 py-3 border-b border-gray-800">
            <p className="text-xs text-gray-500 mb-0.5">Empresa activa</p>
            <p className="text-sm font-medium text-white truncate">
              {empresa.nombre_comercial || empresa.razon_social}
            </p>
            <p className="text-xs text-gray-500">{empresa.ruc}</p>
            <span className={clsx("text-xs font-medium", ambienteColor)}>
              ● {ambienteLabel}
            </span>
          </div>
        )}

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {NAV_ITEMS.map((item) => {

            // ── Item con submenú ──────────────────────────────────────────
            if ("children" in item && item.children) {
              const Icon        = item.icon;
              const anyActive   = item.children.some(c => pathname.startsWith(c.href));

              return (
                <div key={item.label}>
                  {/* Toggle del grupo */}
                  <button
                    onClick={() => setFacturasOpen(!facturasOpen)}
                    className={clsx(
                      "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                      anyActive
                        ? "bg-indigo-600/20 text-indigo-400"
                        : "text-gray-400 hover:text-white hover:bg-gray-800"
                    )}
                  >
                    <Icon size={17} />
                    {item.label}
                    <span className="ml-auto">
                      {facturasOpen
                        ? <ChevronDown size={14} />
                        : <ChevronRight size={14} />
                      }
                    </span>
                  </button>

                  {/* Subitems */}
                  {facturasOpen && (
                    <div className="mt-0.5 ml-4 pl-3 border-l border-gray-800 space-y-0.5">
                      {item.children.map((child) => {
                        // Emitidas: activo solo en /facturas exacto o /facturas/[id] pero NO en /recibidas
                        const active = child.href === "/facturas"
                          ? (pathname === "/facturas" || (pathname.startsWith("/facturas/") && !pathname.startsWith("/facturas/recibidas")))
                          : pathname.startsWith(child.href);

                        return (
                          <Link
                            key={child.href}
                            href={child.href}
                            onClick={() => setSidebarOpen(false)}
                            className={clsx(
                              "flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors",
                              active
                                ? "text-indigo-400 bg-indigo-600/10 font-medium"
                                : "text-gray-500 hover:text-white hover:bg-gray-800"
                            )}
                          >
                            {child.href === "/facturas/recibidas"
                              ? <FileInput size={14} />
                              : <FileText size={14} />
                            }
                            {child.label}
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            }

            // ── Item simple ───────────────────────────────────────────────
            const { href, label, icon: Icon } = item as { href: string; label: string; icon: any };
            const active = pathname === href ||
              (href !== "/dashboard" && !href.startsWith("/facturas") && pathname.startsWith(href));

            return (
              <Link
                key={href}
                href={href}
                onClick={() => setSidebarOpen(false)}
                className={clsx(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                  active
                    ? "bg-indigo-600/20 text-indigo-400"
                    : "text-gray-400 hover:text-white hover:bg-gray-800"
                )}
              >
                <Icon size={17} />
                {label}
                {active && <ChevronRight size={14} className="ml-auto" />}
              </Link>
            );
          })}
        </nav>

        {/* Créditos + logout */}
        <div className="px-4 py-4 border-t border-gray-800 space-y-3">
          {empresa && (
            <div className="bg-gray-800 rounded-lg px-3 py-2.5">
              <p className="text-xs text-gray-500 mb-1">Créditos disponibles</p>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div>
                    <p className="text-xs text-gray-600">Emisión</p>
                    <p className="text-sm font-bold text-white">{empresa.balance_emision}</p>
                  </div>
                  <div className="w-px h-6 bg-gray-700" />
                  <div>
                    <p className="text-xs text-gray-600">Recepción</p>
                    <p className="text-sm font-bold text-white">{empresa.balance_recepcion ?? 0}</p>
                  </div>
                </div>
              </div>
              {empresa.balance_emision <= 10 && (
                <div className="flex items-center gap-1 mt-1.5">
                  <AlertTriangle size={11} className="text-amber-400" />
                  <span className="text-xs text-amber-400">Créditos bajos</span>
                </div>
              )}
            </div>
          )}
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
          >
            <LogOut size={16} />
            Cerrar sesión
          </button>
        </div>
      </aside>

      {/* ── Main ────────────────────────────────────────────────────────── */}
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
    </div>
  );
}