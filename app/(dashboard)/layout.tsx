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
  Menu,
  X,
  AlertTriangle,
} from "lucide-react";
import { clsx } from "clsx";

const NAV_ITEMS = [
  { href: "/dashboard",     label: "Dashboard",  icon: LayoutDashboard },
  { href: "/facturas/nueva",label: "Nueva Factura", icon: Zap },
  { href: "/facturas",      label: "Historial",  icon: FileText },
  { href: "/clientes",      label: "Clientes",   icon: Users },
  { href: "/productos",     label: "Productos",  icon: Package },
  { href: "/configuracion", label: "Configuración", icon: Settings },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router   = useRouter();
  const pathname = usePathname();
  const { empresa, setUser, setEmpresa, setEmpresas, logout } = useAuthStore();
  const [loading,     setLoading]     = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.replace("/login");
        return;
      }

      try {
        // Cargar empresas del usuario
        const res = await api.get("/api/v1/app/usuarios/empresas");
        const empresas = res.data.data ?? [];

        if (empresas.length === 0) {
          // Sin empresa — ir a onboarding
          router.replace("/onboarding");
          return;
        }

        setUser(user.uid, user.email ?? "", "");
        setEmpresas(empresas);

        // Si no hay empresa activa, usar la primera
        if (!empresa) {
          setEmpresa(empresas[0]);
        }
      } catch (err) {
        console.error(err);
        router.replace("/login");
      } finally {
        setLoading(false);
      }
    });

    return () => unsub();
  }, []);

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
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || (href !== "/dashboard" && pathname.startsWith(href));
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
                <span className="text-sm font-bold text-white">
                  {empresa.balance_emision}
                </span>
                <span className="text-xs text-gray-500">facturas</span>
              </div>
              {empresa.balance_emision <= 10 && (
                <div className="flex items-center gap-1 mt-1">
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

        {/* Topbar móvil */}
        <header className="lg:hidden flex items-center gap-3 px-4 py-3 border-b border-gray-800 bg-gray-900">
          <button onClick={() => setSidebarOpen(true)} className="text-gray-400">
            <Menu size={20} />
          </button>
          <span className="font-semibold text-white">Kipu</span>
        </header>

        {/* Contenido */}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}