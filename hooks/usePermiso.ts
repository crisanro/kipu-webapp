import { useAuthStore } from "@/store/auth.store";

/**
 * Chequea si el usuario tiene un permiso (string) o al menos uno de varios (string[]).
 * usePermiso("emitir")                  → true si tiene emitir
 * usePermiso(["emitir", "clientes"])    → true si tiene emitir O clientes
 * usePermiso(null)                      → true siempre
 */
export function usePermiso(permiso: string | string[] | null): boolean {
  const empresa = useAuthStore((s) => s.empresa);
  if (!permiso) return true;
  if (empresa?.rol === "admin") return true;
  if (Array.isArray(permiso)) {
    return permiso.some(p => empresa?.permisos?.[p] === true);
  }
  return empresa?.permisos?.[permiso] === true;
}