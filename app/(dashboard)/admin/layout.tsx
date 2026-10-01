"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Users, LifeBuoy, Activity, Bell } from "lucide-react";

const NAV = [
  { href: "/admin",                label: "Resumen",        icon: LayoutDashboard, exact: true },
  { href: "/admin/usuarios",       label: "Usuarios",       icon: Users },
  { href: "/admin/soporte",        label: "Soporte",        icon: LifeBuoy },
  { href: "/admin/diagnostico",    label: "Diagnóstico",    icon: Activity },
  { href: "/admin/notificaciones", label: "Notificaciones", icon: Bell },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const isActive = (href: string, exact?: boolean) =>
    exact
      // "Resumen" también queda activo dentro del detalle de emisores
      ? pathname === href || pathname.startsWith("/admin/emisores")
      : pathname.startsWith(href);

  return (
    <div>
      <div className="max-w-6xl mx-auto px-4 md:px-6 pt-4 md:pt-6">
        <div className="mb-4">
          <h1 className="text-xl font-bold" style={{ color: "var(--kipu-text)" }}>Panel Admin</h1>
          <p className="text-sm" style={{ color: "var(--kipu-subtle)" }}>Gestión interna de Kipu</p>
        </div>

        <nav
          className="flex gap-1 overflow-x-auto"
          style={{ borderBottom: "1px solid var(--kipu-border)" }}
        >
          {NAV.map(({ href, label, icon: Icon, exact }) => {
            const active = isActive(href, exact);
            return (
              <Link
                key={href}
                href={href}
                className="flex items-center gap-2 px-3 py-2.5 text-sm font-medium whitespace-nowrap transition-colors -mb-px"
                style={{
                  color:        active ? "var(--kipu-accent)" : "var(--kipu-subtle)",
                  borderBottom: active ? "2px solid var(--kipu-accent)" : "2px solid transparent",
                }}
                onMouseEnter={e => { if (!active) e.currentTarget.style.color = "var(--kipu-text)"; }}
                onMouseLeave={e => { if (!active) e.currentTarget.style.color = "var(--kipu-subtle)"; }}
              >
                <Icon size={15} />
                {label}
              </Link>
            );
          })}
        </nav>
      </div>

      {children}
    </div>
  );
}