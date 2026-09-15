"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  X,
  ChevronUp,
  ChevronDown,
  ChevronRight,
  Shield,
  AlertTriangle,
  FlaskConical,
  Bell,
  LogOut,
} from "lucide-react";
import { clsx } from "clsx";
import { NAV_GROUPS, tienePermiso } from "./DashboardNav";
import { SoporteWhatsApp } from "./SoporteWhatsApp";
import { ThemeToggle } from "./ThemeToggle";

interface SidebarProps {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  mounted: boolean;
  resolvedTheme?: string;
  empresa: any;
  empresas: any[];
  role: string | null;
  sandbox: boolean;
  setSandbox: (value: boolean) => void;
  firmaOk: boolean;
  puedeProduccion: boolean;
  pathname: string;
  noLeidas: number;
  onOpenSelectorEmp: () => void;
  onOpenLogoutModal: () => void;
  onOpenDrawer: () => void;
}

export function Sidebar({
  sidebarOpen,
  setSidebarOpen,
  mounted,
  resolvedTheme,
  empresa,
  empresas,
  role,
  sandbox,
  setSandbox,
  firmaOk,
  puedeProduccion,
  pathname,
  noLeidas,
  onOpenSelectorEmp,
  onOpenLogoutModal,
  onOpenDrawer,
}: SidebarProps) {
  const [gruposAbiertos, setGruposAbiertos] = useState<Record<string, boolean>>({
    "/documentos/emitir": pathname.startsWith("/documentos/emitir"),
    "/documentos": pathname.startsWith("/documentos") && !pathname.startsWith("/documentos/emitir"),
  });

  const toggleGrupo = (base: string) => {
    setGruposAbiertos((prev) => ({ ...prev, [base]: !prev[base] }));
  };

  const isActive = (href: string) => {
    if (href === "/documentos") {
      return (
        pathname === "/documentos" ||
        (pathname.startsWith("/documentos/") &&
          !pathname.startsWith("/documentos/emitir") &&
          !pathname.startsWith("/documentos/recibidos") &&
          !pathname.startsWith("/documentos/nueva"))
      );
    }
    return pathname === href || pathname.startsWith(href + "/");
  };

  const planLabel = empresa.suscripcion_activa ? (empresa.suscripcion?.plan ?? "Pro") : "Free";
  const sinCreditos = !empresa.suscripcion_activa && (empresa.balance_api ?? 0) === 0;

  const navActivo = {
    color: "var(--kipu-accent)",
    background: "color-mix(in srgb, var(--kipu-accent) 12%, transparent)",
  };
  const navInactivo = { color: "var(--kipu-muted)" };

  return (
    <aside
      className={clsx(
        "fixed lg:static inset-y-0 left-0 z-30 w-64 flex flex-col transition-transform duration-200",
        sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
      )}
      style={{
        background: "var(--kipu-surface)",
        borderRight: "2px solid var(--kipu-border)",
      }}
    >
      {/* Logo */}
      <div
        className="flex items-center gap-2 px-5 py-5"
        style={{ borderBottom: "2px solid var(--kipu-border)" }}
      >
        {mounted ? (
          <Image
            src={resolvedTheme === "dark" ? "/images/logo-dark.svg" : "/images/logo.svg"}
            alt="Kipu"
            width={100}
            height={32}
            priority
          />
        ) : (
          <div className="w-[100px] h-[32px]" />
        )}
        <button
          className="ml-auto lg:hidden"
          style={{ color: "var(--kipu-muted)" }}
          onClick={() => setSidebarOpen(false)}
        >
          <X size={18} />
        </button>
      </div>

      {/* Selector empresa */}
      <button
        onClick={onOpenSelectorEmp}
        className="px-4 py-3 text-left transition-colors w-full group"
        style={{ borderBottom: "2px solid var(--kipu-border)" }}
        onMouseEnter={(e) => (e.currentTarget.style.background = "var(--kipu-bg)")}
        onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
      >
        <p className="text-xs mb-0.5" style={{ color: "var(--kipu-subtle)" }}>
          Empresa activa
        </p>
        <div className="flex items-center justify-between">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium truncate" style={{ color: "var(--kipu-text)" }}>
              {empresa.nombre_comercial || empresa.razon_social}
            </p>
            <p className="text-xs" style={{ color: "var(--kipu-muted)" }}>
              {empresa.ruc}
            </p>
          </div>
          {empresas.length > 1 && (
            <ChevronUp
              size={12}
              className="rotate-180 ml-2 shrink-0"
              style={{ color: "var(--kipu-subtle)" }}
            />
          )}
        </div>
        <div className="flex items-center justify-between mt-1">
          <span
            className="text-xs font-medium"
            style={{ color: empresa.ambiente === 2 ? "var(--kipu-success)" : "var(--kipu-warning)" }}
          >
            ● {empresa.ambiente === 2 ? "Producción" : "Pruebas"}
          </span>
          {empresas.length > 1 && (
            <span className="text-[10px]" style={{ color: "var(--kipu-subtle)" }}>
              {empresas.length} empresas
            </span>
          )}
        </div>
      </button>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {NAV_GROUPS.map((group, gi) => (
          <div key={gi}>
            {group.separator && (
              <div className="my-2" style={{ borderTop: "2px solid var(--kipu-border)" }} />
            )}
            {"children" in group && group.children ? (
              tienePermiso(empresa, group.permiso ?? null) && (
                <div>
                  <button
                    onClick={() => toggleGrupo(group.base ?? "")}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors"
                    style={pathname.startsWith(group.base ?? "") ? navActivo : navInactivo}
                    onMouseEnter={(e) => {
                      if (!pathname.startsWith(group.base ?? "")) {
                        e.currentTarget.style.color = "var(--kipu-text)";
                        e.currentTarget.style.background = "var(--kipu-bg)";
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!pathname.startsWith(group.base ?? "")) {
                        e.currentTarget.style.color = "var(--kipu-muted)";
                        e.currentTarget.style.background = "transparent";
                      }
                    }}
                  >
                    <group.icon size={17} />
                    {group.label}
                    <span className="ml-auto">
                      {(gruposAbiertos[group.base ?? ""] ?? false) ? (
                        <ChevronDown size={14} />
                      ) : (
                        <ChevronRight size={14} />
                      )}
                    </span>
                  </button>
                  {(gruposAbiertos[group.base ?? ""] ?? false) && (
                    <div
                      className="mt-0.5 ml-4 pl-3 space-y-0.5"
                      style={{ borderLeft: "2px solid var(--kipu-border)" }}
                    >
                      {group.children
                        .filter((child) => tienePermiso(empresa, (child as any).permiso ?? null))
                        .map((child) => {
                          const active = isActive(child.href);
                          const Icon = child.icon;
                          return (
                            <Link
                              key={child.href}
                              href={child.href}
                              onClick={() => setSidebarOpen(false)}
                              className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors"
                              style={active ? navActivo : navInactivo}
                              onMouseEnter={(e) => {
                                if (!active) {
                                  e.currentTarget.style.color = "var(--kipu-text)";
                                  e.currentTarget.style.background = "var(--kipu-bg)";
                                }
                              }}
                              onMouseLeave={(e) => {
                                if (!active) {
                                  e.currentTarget.style.color = "var(--kipu-muted)";
                                  e.currentTarget.style.background = "transparent";
                                }
                              }}
                            >
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
                ?.filter((item) => tienePermiso(empresa, (item as any).permiso ?? null))
                .map((item) => {
                  const active = isActive(item.href);
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setSidebarOpen(false)}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors"
                      style={active ? navActivo : navInactivo}
                      onMouseEnter={(e) => {
                        if (!active) {
                          e.currentTarget.style.color = "var(--kipu-text)";
                          e.currentTarget.style.background = "var(--kipu-bg)";
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!active) {
                          e.currentTarget.style.color = "var(--kipu-muted)";
                          e.currentTarget.style.background = "transparent";
                        }
                      }}
                    >
                      <Icon size={17} />
                      {item.label}
                      {active && item.href !== "/dashboard" && (
                        <ChevronRight size={14} className="ml-auto" />
                      )}
                    </Link>
                  );
                })
            )}
          </div>
        ))}

        {role === "superadmin" && (
          <>
            <div className="my-2" style={{ borderTop: "2px solid var(--kipu-border)" }} />
            <Link
              href="/admin"
              onClick={() => setSidebarOpen(false)}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors"
              style={pathname.startsWith("/admin") ? navActivo : navInactivo}
            >
              <Shield size={17} />
              Panel Admin
              {pathname.startsWith("/admin") && <ChevronRight size={14} className="ml-auto" />}
            </Link>
          </>
        )}
      </nav>

      {/* Footer sidebar */}
      <div className="px-4 py-4 space-y-3" style={{ borderTop: "2px solid var(--kipu-border)" }}>
        {/* Plan activo */}
        <Link
          href="/planes"
          className="block rounded-lg px-3 py-2.5 transition-colors"
          style={{ background: "var(--kipu-bg)" }}
          onMouseEnter={(e) =>
            (e.currentTarget.style.background =
              "color-mix(in srgb, var(--kipu-border) 60%, transparent)")
          }
          onMouseLeave={(e) => (e.currentTarget.style.background = "var(--kipu-bg)")}
        >
          <p className="text-xs mb-1" style={{ color: "var(--kipu-subtle)" }}>
            Plan activo
          </p>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-bold" style={{ color: "var(--kipu-text)" }}>
                {planLabel}
              </p>
              <p className="text-xs" style={{ color: "var(--kipu-muted)" }}>
                {empresa.suscripcion?.estado === "TRIAL"
                  ? "⏳ En prueba"
                  : empresa.suscripcion_activa
                  ? "✅ Activo"
                  : "🆓 Emitiendo con créditos"}
              </p>
            </div>
            {empresa.suscripcion_activa && empresa.balance_api > 0 && (
              <div className="text-right">
                <p className="text-xs" style={{ color: "var(--kipu-subtle)" }}>
                  Créditos
                </p>
                <p className="text-sm font-bold" style={{ color: "var(--kipu-warning)" }}>
                  {empresa.balance_api}
                </p>
              </div>
            )}
          </div>
          {sinCreditos && (
            <div className="flex items-center gap-1 mt-1.5">
              <AlertTriangle size={11} style={{ color: "var(--kipu-danger)" }} />
              <span className="text-xs" style={{ color: "var(--kipu-danger)" }}>
                Sin créditos — activa tu plan
              </span>
            </div>
          )}
          {!empresa.suscripcion_activa && !sinCreditos && (
            <div className="flex items-center gap-1 mt-1.5">
              <span className="text-xs" style={{ color: "var(--kipu-warning)" }}>
                ⚡ {empresa.balance_api} crédito{empresa.balance_api !== 1 ? "s" : ""} disponible
                {empresa.balance_api !== 1 ? "s" : ""}
              </span>
            </div>
          )}
        </Link>

        {/* Toggle Sandbox */}
        {firmaOk ? (
          <button
            onClick={() => {
              if (!puedeProduccion && sandbox) return;
              setSandbox(!sandbox);
            }}
            disabled={!puedeProduccion}
            className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm transition-colors"
            style={{
              background: sandbox
                ? "color-mix(in srgb, #3b82f6 15%, transparent)"
                : "var(--kipu-bg)",
              border: sandbox
                ? "1px solid color-mix(in srgb, #3b82f6 30%, transparent)"
                : "1px solid var(--kipu-border)",
              color: sandbox ? "#60a5fa" : "var(--kipu-muted)",
              opacity: !puedeProduccion ? 0.6 : 1,
              cursor: !puedeProduccion ? "not-allowed" : "pointer",
            }}
          >
            <FlaskConical size={15} />
            <span className="flex-1 text-left text-xs font-medium">
              {sandbox ? "Modo Sandbox" : "Producción"}
            </span>
            {!puedeProduccion && (
              <span className="text-[10px]" style={{ color: "var(--kipu-warning)" }}>
                Solo sandbox
              </span>
            )}
            {puedeProduccion && (
              <div
                className="w-8 h-4 rounded-full transition-colors relative shrink-0"
                style={{ background: sandbox ? "#2563eb" : "var(--kipu-success)" }}
              >
                <span
                  className="absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all"
                  style={{ left: sandbox ? "2px" : "16px" }}
                />
              </div>
            )}
          </button>
        ) : (
          <div
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs"
            style={{
              background: "color-mix(in srgb, var(--kipu-danger) 10%, transparent)",
              border: "1px solid color-mix(in srgb, var(--kipu-danger) 20%, transparent)",
              color: "var(--kipu-danger)",
            }}
          >
            <AlertTriangle size={13} className="shrink-0" />
            <span>Sin firma — no puedes emitir</span>
          </div>
        )}

        {/* Barra de iconos: Notificaciones · Soporte · Tema · Cerrar sesión */}
        <div
          className="flex items-center justify-between pt-2"
          style={{ borderTop: "1px solid var(--kipu-border)" }}
        >
          {/* Notificaciones */}
          <button
            onClick={onOpenDrawer}
            className="relative p-2 rounded-lg transition-colors"
            style={{ color: "var(--kipu-muted)" }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = "var(--kipu-text)";
              e.currentTarget.style.background = "var(--kipu-border)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = "var(--kipu-muted)";
              e.currentTarget.style.background = "transparent";
            }}
            title="Notificaciones"
          >
            <Bell size={18} />
            {noLeidas > 0 && (
              <span
                className="absolute -top-0.5 -right-0.5 flex items-center justify-center w-4 h-4 rounded-full text-white text-[9px] font-bold"
                style={{ background: "var(--kipu-accent)" }}
              >
                {noLeidas > 9 ? "9+" : noLeidas}
              </span>
            )}
          </button>

          {/* Soporte WhatsApp */}
          <SoporteWhatsApp empresa={empresa} />

          {/* Modo oscuro/claro */}
          <ThemeToggle compact />

          {/* Cerrar sesión */}
          <button
            onClick={onOpenLogoutModal}
            className="p-2 rounded-lg transition-colors"
            style={{ color: "var(--kipu-muted)" }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = "var(--kipu-danger)";
              e.currentTarget.style.background =
                "color-mix(in srgb, var(--kipu-danger) 10%, transparent)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = "var(--kipu-muted)";
              e.currentTarget.style.background = "transparent";
            }}
            title="Cerrar sesión"
          >
            <LogOut size={18} />
          </button>
        </div>
      </div>
    </aside>
  );
}