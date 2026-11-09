// lib/consultar-ruc.ts
//
// Pre-llenado del registro con los datos del RUC (catastro SRI, vía backend).
// Límite estricto en el backend (1/hora por usuario): es para el propio RUC del
// cliente, no una búsqueda masiva. Todos los campos quedan editables.

import api from "@/lib/api";

export interface DatosRuc {
  razon_social:           string;
  nombre_comercial:       string;
  direccion_matriz:       string;
  obligado_contabilidad:  "SI" | "NO";
  contribuyente_especial: string;
  estado:                 string;   // ACTIVO, SUSPENDIDO, …
}

export interface ConsultaRucResult {
  found: boolean;
  datos: DatosRuc | null;
  error: string | null;
}

export async function consultarRuc(ruc: string): Promise<ConsultaRucResult> {
  const id = (ruc || "").replace(/\D/g, "");
  if (id.length !== 13) {
    return { found: false, datos: null, error: "RUC incompleto." };
  }
  try {
    const res = await api.get(`/api/v1/app/emisor/consultar-ruc?ruc=${id}`);
    if (res.data?.found) {
      return { found: true, datos: res.data.data, error: null };
    }
    return { found: false, datos: null, error: res.data?.error ?? null };
  } catch {
    return { found: false, datos: null, error: "Error al consultar." };
  }
}
