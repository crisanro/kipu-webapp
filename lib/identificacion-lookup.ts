// lib/identificacion-lookup.ts
//
// Lookup de identificación ecuatoriana con rate limit (20 req/min).
// Flujo: cache backend (sujetos_global) → API externo → guarda en cache.

import api from "@/lib/api";

// ── Rate limiter en memoria ────────────────────────────────────────────────
const LIMIT = 20;
const WINDOW_MS = 60_000; // 1 minuto
let timestamps: number[] = [];

function checkRateLimit(): boolean {
  const now = Date.now();
  timestamps = timestamps.filter((t) => now - t < WINDOW_MS);
  if (timestamps.length >= LIMIT) return false;
  timestamps.push(now);
  return true;
}

export function getRateLimitRemaining(): number {
  const now = Date.now();
  timestamps = timestamps.filter((t) => now - t < WINDOW_MS);
  return Math.max(0, LIMIT - timestamps.length);
}

// ── Lookup externo (browser → API tercero) ─────────────────────────────────
async function buscarExterno(cedula: string): Promise<string | null> {
  try {
    const validateRes = await fetch(
      `https://app3902.privynote.net/api/v1/validate/client?identification=${cedula}&type=30`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Origin: "https://consultasecuador.com",
          Referer: "https://consultasecuador.com/",
        },
        body: "{}",
      }
    );
    const validateData = await validateRes.json();
    if (!validateData?.data?.exists) return null;

    const findRes = await fetch(
      "https://app3902.privynote.net/api/v2/clients/find-by-id",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Origin: "https://consultasecuador.com",
          Referer: "https://consultasecuador.com/",
        },
        body: JSON.stringify({ identification: cedula, type: "nm3435" }),
      }
    );
    const findData = await findRes.json();
    if (findData?.success && findData?.data?.name) {
      return findData.data.name;
    }
    return null;
  } catch (err) {
    console.warn("[Lookup externo] Error:", err);
    return null;
  }
}

// ── Función principal ──────────────────────────────────────────────────────
export interface LookupResult {
  found: boolean;
  nombre: string | null;
  error: string | null;
}

export async function lookupIdentificacion(
  identificacion: string
): Promise<LookupResult> {
  const cedula = identificacion.replace(/\D/g, "").substring(0, 10);

  if (cedula.length < 10) {
    return { found: false, nombre: null, error: "Identificación incompleta." };
  }

  if (!checkRateLimit()) {
    return {
      found: false,
      nombre: null,
      error: "Demasiadas consultas. Espera un momento.",
    };
  }

  try {
    // 1. Cache backend
    const cacheRes = await api.get(
      `/api/v1/app/clientes/identificaciones/lookup?id=${cedula}`
    );
    if (cacheRes.data?.found) {
      return {
        found: true,
        nombre: cacheRes.data.data.razon_social,
        error: null,
      };
    }

    // 2. API externo
    const nombre = await buscarExterno(cedula);

    if (nombre) {
      // 3. Guardar en cache
      try {
        await api.post("/api/v1/app/clientes/identificaciones", {
          identificacion,
          razon_social: nombre,
        });
      } catch {
        // No crítico
      }
      return { found: true, nombre, error: null };
    }

    return {
      found: false,
      nombre: null,
      error: null,
    };
  } catch {
    return {
      found: false,
      nombre: null,
      error: "Error al consultar.",
    };
  }
}