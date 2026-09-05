import { useAuthStore } from "@/store/auth.store";

export function usePermiso(permiso: string | null): boolean {
  const empresa = useAuthStore((s) => s.empresa);
  if (!permiso) return true;
  if (empresa?.rol === "admin") return true;
  return empresa?.permisos?.[permiso] === true;
}