// lib/identificacion-lookup.ts
//
// Busca el nombre de un cliente por cédula (10) o RUC (13).
// Todo ocurre en el backend: cache compartida (sujetos_global) → proveedor
// externo de pago, con límite por cuenta. El navegador ya no llama a ningún
// servicio de terceros ni escribe nombres en la cache.

// Solo las cuentas que pagan (suscripción o créditos) buscan nombres de terceros:
// las demás escriben el nombre a mano y no ven el buscador (useBuscaNombres).

import api from "@/lib/api";
import { useAuthStore } from "@/store/auth.store";
import { ES_APP_NATIVA } from "@/lib/plataforma";

/** ¿Esta empresa puede buscar nombres por cédula/RUC? Misma regla que el backend. */
export function useBuscaNombres(): boolean {
  return useAuthStore((s) => !!s.empresa && (s.empresa.suscripcion_activa || (s.empresa.balance_api ?? 0) > 0));
}

/** Lo que se le dice a quien no busca nombres. En la app no se nombra el plan
 *  (las tiendas no permiten invitar a comprar fuera de ellas). */
export function textoNombreAMano(): string {
  return ES_APP_NATIVA
    ? "Escribe el nombre como aparece en su cédula o RUC."
    : "Escribe el nombre como aparece en su cédula o RUC. Con Kipu Pro lo completamos solo.";
}

export interface LookupResult {
  found:  boolean;
  nombre: string | null;
  error:  string | null;
}

export async function lookupIdentificacion(
  identificacion: string
): Promise<LookupResult> {
  const id = (identificacion || "").replace(/\D/g, "");

  if (id.length !== 10 && id.length !== 13) {
    return { found: false, nombre: null, error: "Identificación incompleta." };
  }

  try {
    const res = await api.get(
      `/api/v1/app/clientes/identificaciones/lookup?id=${id}`
    );
    if (res.data?.found) {
      return { found: true, nombre: res.data.data.razon_social, error: null };
    }
    // El backend puede devolver un error (límite alcanzado) o un aviso
    // (cuenta gratuita: el nombre no está en la base y no se consulta al proveedor)
    return { found: false, nombre: null, error: res.data?.error ?? res.data?.aviso ?? null };
  } catch {
    return { found: false, nombre: null, error: "Error al consultar." };
  }
}
