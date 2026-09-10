// app/(dashboard)/layout.tsx
"use client";
import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { auth } from "@/lib/firebase";
import { signOut } from "firebase/auth";
import { useAuthStore } from "@/store/auth.store";
import { useSandboxStore } from "@/store/sandbox.store";
import api from "@/lib/api";
import PWAInstallBanner from "@/components/PWAInstallBanner";
import { registrarNotificaciones } from "@/lib/notifications";
import {
  LayoutDashboard, FileText, Users, Package, Settings, Key,
  LogOut, ChevronRight, ChevronDown, Menu, X, BarChart3,
  AlertTriangle, FileInput, Building2, CreditCard, UserCog,
  CheckCircle2, Plus, ChevronUp, Shield, FlaskConical,
  MessageCircle, Wallet, ClipboardList, Sun, Moon,
} from "lucide-react";
import { clsx } from "clsx";
import { useTheme } from "next-themes";
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
      <button
        onClick={() => setShowQR(!showQR)}
        className="hidden lg:flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm transition-colors"
        style={{ color: "var(--kipu-muted)" }}
        onMouseEnter={e => {
          e.currentTarget.style.color = "var(--kipu-success)";
          e.currentTarget.style.background = "color-mix(in srgb, var(--kipu-success) 10%, transparent)";
        }}
        onMouseLeave={e => {
          e.currentTarget.style.color = "var(--kipu-muted)";
          e.currentTarget.style.background = "transparent";
        }}
      >
        <MessageCircle size={16} />
        Soporte
      </button>
      <a
        href={waUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="flex lg:hidden items-center gap-2 w-full px-3 py-2 rounded-lg text-sm transition-colors"
        style={{ color: "var(--kipu-muted)" }}
      >
        <MessageCircle size={16} />
        Soporte WhatsApp
      </a>
      {showQR && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setShowQR(false)} />
          <div
            className="absolute bottom-10 left-0 z-50 rounded-xl p-4 shadow-xl w-56"
            style={{
              background: "var(--kipu-surface)",
              border:     "1px solid var(--kipu-border)",
            }}
          >
            <button
              onClick={() => setShowQR(false)}
              className="absolute top-2 right-2 transition-colors"
              style={{ color: "var(--kipu-muted)" }}
            >
              <X size={14} />
            </button>
            <p className="text-xs mb-3 text-center" style={{ color: "var(--kipu-muted)" }}>
              Escanea para chatear por WhatsApp
            </p>
            <img src={qrUrl} alt="QR Soporte WhatsApp" className="w-full rounded-lg" />
            <a
              href={waUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 flex items-center justify-center gap-2 w-full py-2 rounded-lg text-xs font-medium transition-colors"
              style={{ background: "var(--kipu-success)", color: "#ffffff" }}
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
// NAV
// =============================================================================
const NAV_GROUPS = [
  {
    items: [
      { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, permiso: null },
    ]
  },
  {
    items: [
      { href: "/proformas", label: "Proformas", icon: ClipboardList, permiso: "emitir" },
    ]
  },
  {
    label:    "Emitir",
    icon:     FileText,
    base:     "/documentos/emitir",
    permiso:  "emitir",
    children: [
      { href: "/documentos/emitir/fac", label: "Factura",         icon: FileText },
      { href: "/documentos/emitir/liq", label: "Liquidación",     icon: FileText },
      { href: "/documentos/emitir/ncr", label: "Nota de crédito", icon: FileText },
      { href: "/documentos/emitir/ndb", label: "Nota de débito",  icon: FileText },
      { href: "/documentos/emitir/ret", label: "Retención",       icon: FileText },
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
      { href: "/personas",  label: "Personas",  icon: Users,   permiso: "clientes"  },
      { href: "/cuentas",   label: "Cuentas",   icon: Wallet,  permiso: "clientes"  },
      { href: "/productos", label: "Productos", icon: Package, permiso: "productos" },
    ]
  },
  {
    separator: true,
    items: [
      { href: "/estructura",    label: "Estructura",    icon: Building2,  permiso: "configuracion" },
      { href: "/planes",        label: "Planes",        icon: CreditCard, permiso: null            },
      { href: "/reportes",      label: "Reportes",      icon: BarChart3,  permiso: "reportes"      },
      { href: "/usuarios",      label: "Usuarios",      icon: UserCog,    permiso: "usuarios"      },
      { href: "/api-keys",      label: "API Keys",      icon: Key,        permiso: "api_keys"      },
      { href: "/configuracion", label: "Configuración", icon: Settings,   permiso: "configuracion" },
    ]
  },
];

function tienePermiso(empresa: any, permiso: string | null): boolean {
  if (!permiso) return true;
  if (empresa?.rol === "admin") return true;
  return empresa?.permisos?.[permiso] === true;
}

// =============================================================================
// MODALES
// =============================================================================
function ModalLogout({ onConfirm, onCancel }: { onConfirm: () => void; onCancel: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
      <div
        className="rounded-xl p-5 max-w-sm w-full space-y-4"
        style={{
          background: "var(--kipu-surface)",
          border:     "1px solid var(--kipu-border)",
        }}
      >
        <div className="flex items-start gap-3">
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
            style={{ background: "color-mix(in srgb, var(--kipu-danger) 15%, transparent)" }}
          >
            <LogOut size={16} style={{ color: "var(--kipu-danger)" }} />
          </div>
          <div>
            <p className="font-semibold text-sm" style={{ color: "var(--kipu-text)" }}>
              ¿Cerrar sesión?
            </p>
            <p className="text-xs mt-1" style={{ color: "var(--kipu-muted)" }}>
              Se cerrará tu sesión en este dispositivo.
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={onCancel}
            className="flex-1 py-2 rounded-lg text-sm transition-colors"
            style={{
              border: "1px solid var(--kipu-border)",
              color:  "var(--kipu-muted)",
            }}
            onMouseEnter={e => e.currentTarget.style.color = "var(--kipu-text)"}
            onMouseLeave={e => e.currentTarget.style.color = "var(--kipu-muted)"}
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-2 rounded-lg text-sm font-medium text-white transition-colors"
            style={{ background: "var(--kipu-danger)" }}
          >
            Cerrar sesión
          </button>
        </div>
      </div>
    </div>
  );
}

function SelectorEmpresa({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const { empresas, empresa, setEmpresa } = useAuthStore();
  const [cambiando, setCambiando] = useState<number | null>(null);

  const cambiar = async (e: any) => {
    if (e.id === empresa?.id) { onClose(); return; }
    setCambiando(e.id);
    try {
      const res  = await api.post("/api/v1/app/usuarios/empresas/cambiar", { emisor_id: e.id });
      const data = res.data.data;
      setEmpresa({
        id:                    e.id,
        ruc:                   data.ruc,
        razon_social:          data.razon_social,
        nombre_comercial:      e.nombre_comercial,
        ambiente:              data.ambiente,
        tipo_emisor:           data.tipo_emisor,
        rol:                   data.rol,
        permisos:              data.permisos,
        firma_ok:              e.firma_ok,
        suscripcion_activa:    data.suscripcion_activa,
        suscripcion:           data.suscripcion,
        balance_api:           data.balance_api,
        obligado_contabilidad: data.obligado_contabilidad ?? null,
        periodo_iva:           data.periodo_iva ?? null,
      });
      localStorage.setItem("kipu-ext-emisor", String(e.id));
      localStorage.setItem("kipu-ext-ruc",    data.ruc);
      localStorage.setItem("kipu-ext-razon",  data.razon_social);
      sessionStorage.clear();
      onClose();
      window.location.href = "/dashboard";
    } catch (err) {
      console.error(err);
    } finally {
      setCambiando(null);
    }
  };

  const empresasOrdenadas = [...empresas].sort((a, b) => {
    if (a.rol === "admin" && b.rol !== "admin") return -1;
    if (b.rol === "admin" && a.rol !== "admin") return 1;
    return (a.nombre_comercial || a.razon_social).localeCompare(b.nombre_comercial || b.razon_social);
  });

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-end sm:items-center justify-center p-4">
      <div
        className="rounded-xl w-full max-w-sm"
        style={{
          background: "var(--kipu-surface)",
          border:     "1px solid var(--kipu-border)",
        }}
      >
        <div
          className="flex items-center justify-between px-4 py-3"
          style={{ borderBottom: "1px solid var(--kipu-border)" }}
        >
          <h2 className="text-sm font-semibold" style={{ color: "var(--kipu-text)" }}>
            Cambiar empresa
          </h2>
          <button onClick={onClose} style={{ color: "var(--kipu-muted)" }}>
            <X size={16} />
          </button>
        </div>
        <div className="max-h-64 overflow-y-auto">
          {empresasOrdenadas.map((e) => {
            const activa = e.id === empresa?.id;
            return (
              <button
                key={e.id}
                onClick={() => cambiar(e)}
                disabled={!!cambiando}
                className="w-full flex items-center gap-3 px-4 py-3 text-left transition-colors"
                style={{
                  background:  activa ? "color-mix(in srgb, var(--kipu-accent) 10%, transparent)" : "transparent",
                  borderBottom: "1px solid var(--kipu-border)",
                }}
                onMouseEnter={e => !activa && (e.currentTarget.style.background = "var(--kipu-bg)")}
                onMouseLeave={e => !activa && (e.currentTarget.style.background = "transparent")}
              >
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-xs font-bold"
                  style={{
                    background: activa ? "var(--kipu-accent)" : "var(--kipu-border)",
                    color:      activa ? "#ffffff" : "var(--kipu-muted)",
                  }}
                >
                  {(e.nombre_comercial || e.razon_social)[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate" style={{ color: "var(--kipu-text)" }}>
                    {e.nombre_comercial || e.razon_social}
                  </p>
                  <p className="text-xs" style={{ color: "var(--kipu-muted)" }}>{e.ruc}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span
                    className="text-[10px] px-1.5 py-0.5 rounded-full"
                    style={{
                      background: e.rol === "admin"
                        ? "color-mix(in srgb, var(--kipu-accent) 15%, transparent)"
                        : "var(--kipu-border)",
                      color: e.rol === "admin" ? "var(--kipu-accent)" : "var(--kipu-muted)",
                    }}
                  >
                    {e.rol === "admin" ? "Admin" : "Invitado"}
                  </span>
                  <span
                    className="text-[10px] px-1.5 py-0.5 rounded-full"
                    style={{
                      background: e.ambiente === 2
                        ? "color-mix(in srgb, var(--kipu-success) 15%, transparent)"
                        : "color-mix(in srgb, var(--kipu-warning) 15%, transparent)",
                      color: e.ambiente === 2 ? "var(--kipu-success)" : "var(--kipu-warning)",
                    }}
                  >
                    {e.ambiente === 2 ? "Prod" : "Pruebas"}
                  </span>
                  {activa && <CheckCircle2 size={14} style={{ color: "var(--kipu-accent)" }} />}
                  {cambiando === e.id && (
                    <div
                      className="w-4 h-4 border-2 border-t-transparent rounded-full animate-spin"
                      style={{ borderColor: "var(--kipu-accent)", borderTopColor: "transparent" }}
                    />
                  )}
                </div>
              </button>
            );
          })}
        </div>
        <div className="p-3">
          <button
            onClick={() => { onClose(); router.push("/nueva-empresa"); }}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg border border-dashed text-sm transition-colors"
            style={{
              borderColor: "var(--kipu-border)",
              color:       "var(--kipu-muted)",
            }}
            onMouseEnter={e => {
              e.currentTarget.style.borderColor = "var(--kipu-muted)";
              e.currentTarget.style.color = "var(--kipu-text)";
            }}
            onMouseLeave={e => {
              e.currentTarget.style.borderColor = "var(--kipu-border)";
              e.currentTarget.style.color = "var(--kipu-muted)";
            }}
          >
            <Plus size={14} /> Agregar empresa
          </button>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// TOGGLE TEMA
// =============================================================================
function ThemeToggle({ compact = false }: { compact?: boolean }) {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  const isDark = resolvedTheme === "dark";

  if (compact) {
    return (
      <button
        onClick={() => setTheme(isDark ? "light" : "dark")}
        className="p-2 rounded-lg transition-colors"
        style={{
          color:      "var(--kipu-muted)",
          background: "transparent",
        }}
        onMouseEnter={e => e.currentTarget.style.background = "var(--kipu-border)"}
        onMouseLeave={e => e.currentTarget.style.background = "transparent"}
        title={isDark ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
      >
        {isDark ? <Sun size={18} /> : <Moon size={18} />}
      </button>
    );
  }

  return (
    <button
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm transition-colors"
      style={{ color: "var(--kipu-muted)" }}
      onMouseEnter={e => {
        e.currentTarget.style.color = "var(--kipu-text)";
        e.currentTarget.style.background = "var(--kipu-border)";
      }}
      onMouseLeave={e => {
        e.currentTarget.style.color = "var(--kipu-muted)";
        e.currentTarget.style.background = "transparent";
      }}
    >
      {isDark ? <Sun size={16} /> : <Moon size={16} />}
      {isDark ? "Modo claro" : "Modo oscuro"}
    </button>
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
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  const [sidebarOpen,     setSidebarOpen]     = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [showSelectorEmp, setShowSelectorEmp] = useState(false);
  const [drawerOpen,      setDrawerOpen]      = useState(false);
  const [emailVerificado, setEmailVerificado] = useState(true);

  useEffect(() => setMounted(true), []);

  const firmaOk         = empresa?.firma_ok ?? false;
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
      <div className="h-screen flex items-center justify-center" style={{ background: "var(--kipu-bg)" }}>
        <div
          className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin"
          style={{ borderColor: "var(--kipu-accent)", borderTopColor: "transparent" }}
        />
      </div>
    );
  }

  const planLabel  = empresa.suscripcion_activa ? (empresa.suscripcion?.plan ?? "Pro") : "Free";
  const sinCreditos = !empresa.suscripcion_activa && (empresa.balance_api ?? 0) === 0;

  // ── Estilos nav activo/inactivo ──────────────────────────────────────────
  const navActivo   = { color: "var(--kipu-accent)",  background: "color-mix(in srgb, var(--kipu-accent) 12%, transparent)" };
  const navInactivo = { color: "var(--kipu-muted)" };

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

      {/* ── Sidebar ─────────────────────────────────────────────────────── */}
      <aside
        className={clsx(
          "fixed lg:static inset-y-0 left-0 z-30 w-64 flex flex-col transition-transform duration-200",
          sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
        style={{
          background:  "var(--kipu-surface)",
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
          onClick={() => setShowSelectorEmp(true)}
          className="px-4 py-3 text-left transition-colors w-full group"
          style={{ borderBottom: "2px solid var(--kipu-border)" }}
          onMouseEnter={e => e.currentTarget.style.background = "var(--kipu-bg)"}
          onMouseLeave={e => e.currentTarget.style.background = "transparent"}
        >
          <p className="text-xs mb-0.5" style={{ color: "var(--kipu-subtle)" }}>Empresa activa</p>
          <div className="flex items-center justify-between">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium truncate" style={{ color: "var(--kipu-text)" }}>
                {empresa.nombre_comercial || empresa.razon_social}
              </p>
              <p className="text-xs" style={{ color: "var(--kipu-muted)" }}>{empresa.ruc}</p>
            </div>
            {empresas.length > 1 && (
              <ChevronUp size={12} className="rotate-180 ml-2 shrink-0" style={{ color: "var(--kipu-subtle)" }} />
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
                      onMouseEnter={e => {
                        if (!pathname.startsWith(group.base ?? "")) {
                          e.currentTarget.style.color = "var(--kipu-text)";
                          e.currentTarget.style.background = "var(--kipu-bg)";
                        }
                      }}
                      onMouseLeave={e => {
                        if (!pathname.startsWith(group.base ?? "")) {
                          e.currentTarget.style.color = "var(--kipu-muted)";
                          e.currentTarget.style.background = "transparent";
                        }
                      }}
                    >
                      <group.icon size={17} />
                      {group.label}
                      <span className="ml-auto">
                        {(gruposAbiertos[group.base ?? ""] ?? false)
                          ? <ChevronDown size={14} />
                          : <ChevronRight size={14} />}
                      </span>
                    </button>
                    {(gruposAbiertos[group.base ?? ""] ?? false) && (
                      <div
                        className="mt-0.5 ml-4 pl-3 space-y-0.5"
                        style={{ borderLeft: "2px solid var(--kipu-border)" }}
                      >
                        {group.children
                          .filter(child => tienePermiso(empresa, (child as any).permiso ?? null))
                          .map((child) => {
                            const active = isActive(child.href);
                            const Icon   = child.icon;
                            return (
                              <Link
                                key={child.href}
                                href={child.href}
                                onClick={() => setSidebarOpen(false)}
                                className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors"
                                style={active ? navActivo : navInactivo}
                                onMouseEnter={e => {
                                  if (!active) {
                                    e.currentTarget.style.color = "var(--kipu-text)";
                                    e.currentTarget.style.background = "var(--kipu-bg)";
                                  }
                                }}
                                onMouseLeave={e => {
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
                  ?.filter(item => tienePermiso(empresa, (item as any).permiso ?? null))
                  .map((item) => {
                    const active = isActive(item.href);
                    const Icon   = item.icon;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setSidebarOpen(false)}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors"
                        style={active ? navActivo : navInactivo}
                        onMouseEnter={e => {
                          if (!active) {
                            e.currentTarget.style.color = "var(--kipu-text)";
                            e.currentTarget.style.background = "var(--kipu-bg)";
                          }
                        }}
                        onMouseLeave={e => {
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
        <div
          className="px-4 py-4 space-y-3"
          style={{ borderTop: "2px solid var(--kipu-border)" }}
        >
          {/* Plan activo */}
          <Link
            href="/planes"
            className="block rounded-lg px-3 py-2.5 transition-colors"
            style={{ background: "var(--kipu-bg)" }}
            onMouseEnter={e => e.currentTarget.style.background = "color-mix(in srgb, var(--kipu-border) 60%, transparent)"}
            onMouseLeave={e => e.currentTarget.style.background = "var(--kipu-bg)"}
          >
            <p className="text-xs mb-1" style={{ color: "var(--kipu-subtle)" }}>Plan activo</p>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-bold" style={{ color: "var(--kipu-text)" }}>{planLabel}</p>
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
                  <p className="text-xs" style={{ color: "var(--kipu-subtle)" }}>Créditos</p>
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
                  ⚡ {empresa.balance_api} crédito{empresa.balance_api !== 1 ? "s" : ""} disponible{empresa.balance_api !== 1 ? "s" : ""}
                </span>
              </div>
            )}
          </Link>

          <NotificacionesBadge noLeidas={noLeidas} onClick={() => setDrawerOpen(true)} />

          {/* Toggle Sandbox */}
          {firmaOk ? (
            <button
              onClick={() => { if (!puedeProduccion && sandbox) return; setSandbox(!sandbox); }}
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
                cursor:  !puedeProduccion ? "not-allowed" : "pointer",
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
                border:     "1px solid color-mix(in srgb, var(--kipu-danger) 20%, transparent)",
                color:      "var(--kipu-danger)",
              }}
            >
              <AlertTriangle size={13} className="shrink-0" />
              <span>Sin firma — no puedes emitir</span>
            </div>
          )}

          <SoporteWhatsApp empresa={empresa} />

          <div className="pt-1" style={{ borderTop: "1px solid var(--kipu-border)" }}>
            <div className="flex items-center gap-1 pt-2">
              <ThemeToggle />
              <button
                onClick={() => setShowLogoutModal(true)}
                className="flex items-center gap-2 flex-1 px-3 py-2 rounded-lg text-sm transition-colors"
                style={{ color: "var(--kipu-muted)" }}
                onMouseEnter={e => {
                  e.currentTarget.style.color = "var(--kipu-danger)";
                  e.currentTarget.style.background = "color-mix(in srgb, var(--kipu-danger) 10%, transparent)";
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.color = "var(--kipu-muted)";
                  e.currentTarget.style.background = "transparent";
                }}
              >
                <LogOut size={16} />
                Cerrar sesión
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* ── Main ────────────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* Header móvil */}
        <header
          className="lg:hidden flex items-center gap-3 px-4 py-3"
          style={{
            background:   "var(--kipu-surface)",
            borderBottom: "2px solid var(--kipu-border)",
          }}
        >
          <button onClick={() => setSidebarOpen(true)} style={{ color: "var(--kipu-muted)" }}>
            <Menu size={20} />
          </button>
          {mounted ? (
            <Image
              src={resolvedTheme === "dark" ? "/images/logo-dark.svg" : "/images/logo.svg"}
              alt="Kipu"
              width={80}
              height={26}
              priority
            />
          ) : (
            <div className="w-[80px] h-[26px]" />
          )}
          <div className="ml-auto flex items-center gap-1">
            <ThemeToggle compact />
            <button
              className="relative p-2 rounded-lg transition-colors"
              style={{ color: "var(--kipu-muted)" }}
              onClick={() => setDrawerOpen(true)}
              onMouseEnter={e => e.currentTarget.style.background = "var(--kipu-border)"}
              onMouseLeave={e => e.currentTarget.style.background = "transparent"}
            >
              <NotificacionesBadge noLeidas={noLeidas} onClick={() => setDrawerOpen(true)} />
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto">
          {/* Banner email no verificado */}
          {!emailVerificado && (
            <div
              className="w-full px-4 py-2.5 flex items-center justify-between gap-3 shrink-0"
              style={{
                background:   "color-mix(in srgb, var(--kipu-warning) 10%, transparent)",
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
            <div className="w-full px-4 py-2 flex items-center justify-center gap-2 text-xs font-medium text-white shrink-0"
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