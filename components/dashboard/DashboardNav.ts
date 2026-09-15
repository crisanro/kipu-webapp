import {
  LayoutDashboard,
  ClipboardList,
  FileText,
  FileInput,
  Users,
  Wallet,
  Package,
  Building2,
  CreditCard,
  BarChart3,
  UserCog,
  Key,
  Shield,
  Settings,
} from "lucide-react";

export const NAV_GROUPS = [
  {
    items: [
      { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, permiso: null },
    ],
  },
  {
    items: [
      { href: "/proformas", label: "Proformas", icon: ClipboardList, permiso: "emitir" },
    ],
  },
  {
    label: "Emitir",
    icon: FileText,
    base: "/documentos/emitir",
    permiso: "emitir",
    children: [
      { href: "/documentos/emitir/fac", label: "Factura", icon: FileText },
      { href: "/documentos/emitir/liq", label: "Liquidación", icon: FileText },
      { href: "/documentos/emitir/ncr", label: "Nota de crédito", icon: FileText },
      { href: "/documentos/emitir/ndb", label: "Nota de débito", icon: FileText },
      { href: "/documentos/emitir/ret", label: "Retención", icon: FileText },
    ],
  },
  {
    label: "Documentos",
    icon: FileText,
    base: "/documentos",
    permiso: "descargar",
    children: [
      { href: "/documentos", label: "Emitidos", icon: FileText, permiso: "descargar" },
      { href: "/documentos/recibidos", label: "Recibidos", icon: FileInput, permiso: "documentos_recibidos" },
    ],
  },
  {
    items: [
      { href: "/personas", label: "Personas", icon: Users, permiso: "clientes" },
      { href: "/cuentas", label: "Cuentas", icon: Wallet, permiso: "clientes" },
      { href: "/productos", label: "Productos", icon: Package, permiso: "productos" },
    ],
  },
  {
    separator: true,
    items: [
      { href: "/estructura", label: "Estructura", icon: Building2, permiso: "configuracion" },
      { href: "/planes", label: "Planes", icon: CreditCard, permiso: null },
      { href: "/reportes", label: "Reportes", icon: BarChart3, permiso: "reportes" },
      { href: "/usuarios", label: "Usuarios", icon: UserCog, permiso: "usuarios" },
      { href: "/api-keys", label: "API Keys", icon: Key, permiso: "api_keys" },
      { href: "/auditoria", label: "Auditoría", icon: Shield, permiso: "auditoria" },
      { href: "/configuracion", label: "Configuración", icon: Settings, permiso: "configuracion" },
    ],
  },
];

export function tienePermiso(empresa: any, permiso: string | null): boolean {
  if (!permiso) return true;
  if (empresa?.rol === "admin") return true;
  return empresa?.permisos?.[permiso] === true;
}