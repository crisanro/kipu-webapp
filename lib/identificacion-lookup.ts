// lib/identificacion-lookup.ts
//
// Busca el nombre de un cliente por cédula (10) o RUC (13).
// Todo ocurre en el backend: cache compartida (sujetos_global) → proveedor
// externo de pago, con límite por cuenta. El navegador ya no llama a ningún
// servicio de terceros ni escribe nombres en la cache.

import api from "@/lib/api";

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
    // El backend puede devolver un aviso (p. ej. límite por minuto alcanzado)
    return { found: false, nombre: null, error: res.data?.error ?? null };
  } catch {
    return { found: false, nombre: null, error: "Error al consultar." };
  }
}
