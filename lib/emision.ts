// lib/emision.ts
// Manejo de errores al emitir comprobantes (FAC, NCR, NDB, LIQ, RET).
//
// La X-Idempotency-Key evita facturas duplicadas: el backend guarda la respuesta
// solo cuando la emisión sale bien, así que reintentar con la MISMA clave es seguro:
//   - si la emisión anterior falló, se procesa de nuevo;
//   - si sí se emitió pero la respuesta se perdió (timeout, red), devuelve esa factura.
// Por eso la clave solo se renueva ante errores donde seguro no se emitió nada.
//
// La clave vive en un useRef de la pantalla: si la app se recarga (o Android cierra
// el WebView) tras un timeout, se perdería y el reintento podría duplicar el
// comprobante. Por eso, cuando no hubo respuesta segura, se guarda en localStorage
// junto con una huella del contenido: si se vuelve a enviar el MISMO comprobante,
// se reutiliza esa clave. Uno distinto usa la clave nueva de la pantalla.

import type { MutableRefObject } from "react";
import { v4 as uuidv4 } from "uuid";
import { useAuthStore } from "@/store/auth.store";

// Rechazos del backend antes de emitir: el usuario corrige y vuelve a enviar
const ERRORES_DEFINITIVOS = new Set([400, 401, 402, 403, 404, 422]);

/** true si se puede generar una clave nueva sin riesgo de duplicar el comprobante. */
export function debeRenovarClave(err: any): boolean {
  const status = err?.response?.status;
  return typeof status === "number" && ERRORES_DEFINITIVOS.has(status);
}

// ── Emisión sin confirmar (sobrevive a recargas) ──────────────────────────────

const PREFIJO_PENDIENTE = "kipu:emision-pendiente:";
const VIGENCIA_PENDIENTE_MS = 24 * 60 * 60 * 1000;

interface EmisionPendiente { clave: string; huella: string; hasta: number }

/** Hash corto del contenido (cyrb53): compara comprobantes sin guardar sus datos. */
function huella(payload: unknown): string {
  const texto = JSON.stringify(payload) ?? "";
  let h1 = 0xdeadbeef, h2 = 0x41c6ce57;
  for (let i = 0; i < texto.length; i++) {
    const c = texto.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 2654435761);
    h2 = Math.imul(h2 ^ c, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36);
}

/** Por empresa y tipo: otra empresa u otro comprobante no reutilizan la clave. */
function llavePendiente(tipo: string): string {
  const empresaId = useAuthStore.getState().empresa?.id ?? "sin-empresa";
  return `${PREFIJO_PENDIENTE}${empresaId}:${tipo}`;
}

function leerPendiente(tipo: string): EmisionPendiente | null {
  try {
    const crudo = localStorage.getItem(llavePendiente(tipo));
    if (!crudo) return null;
    const p = JSON.parse(crudo) as EmisionPendiente;
    if (!p?.clave || !p?.huella || !(p.hasta > Date.now())) {
      localStorage.removeItem(llavePendiente(tipo));
      return null;
    }
    return p;
  } catch {
    return null;
  }
}

function borrarPendiente(tipo: string) {
  try { localStorage.removeItem(llavePendiente(tipo)); } catch {}
}

/**
 * true si de alguno de estos tipos quedó un envío sin respuesta segura (timeout,
 * red, app cerrada): la pantalla avisa que revise Documentos antes de enviar otro.
 * Reenviar el MISMO comprobante es seguro (misma clave); uno distinto, no se sabe.
 */
export function hayEmisionSinConfirmar(tipos: string[]): boolean {
  return tipos.some((t) => leerPendiente(t) !== null);
}

/**
 * Clave a enviar en X-Idempotency-Key. Si quedó sin confirmar un envío con el mismo
 * contenido (aunque la app se haya recargado), devuelve esa clave para no duplicarlo.
 * `tipo` distingue endpoints: "FAC", "FAC-COBRO", "NCR", "NDB", "LIQ", "RET".
 */
export function claveParaEnviar(ref: MutableRefObject<string>, tipo: string, payload: unknown): string {
  const h = huella(payload);
  ultimaHuella.set(tipo, h);
  const pendiente = leerPendiente(tipo);
  if (pendiente && pendiente.huella === h) ref.current = pendiente.clave;
  return ref.current;
}

// Huella del último envío por tipo, para anotarEnvio (se llama desde el catch)
const ultimaHuella = new Map<string, string>();

/**
 * Anotar cómo terminó el envío hecho con claveParaEnviar (sin `err` = salió bien):
 *   - éxito o rechazo definitivo: se olvida la pendiente (y el rechazo renueva la clave);
 *   - timeout, red, 5xx o 409: queda guardada para reintentar con la misma clave.
 */
export function anotarEnvio(ref: MutableRefObject<string>, tipo: string, err?: unknown) {
  if (err === undefined) { borrarPendiente(tipo); return; }
  if (debeRenovarClave(err)) {
    borrarPendiente(tipo);
    ref.current = uuidv4();
    return;
  }
  const h = ultimaHuella.get(tipo);
  if (!h) return;
  try {
    const p: EmisionPendiente = { clave: ref.current, huella: h, hasta: Date.now() + VIGENCIA_PENDIENTE_MS };
    localStorage.setItem(llavePendiente(tipo), JSON.stringify(p));
  } catch {}
}

/** El `codigo` de un detail {codigo, mensaje} del backend, o "". */
function codigoError(err: unknown): string {
  const detail = (err as { response?: { data?: { detail?: unknown } } })?.response?.data?.detail as
    { codigo?: unknown } | undefined;
  return !!detail && typeof detail === "object" && !Array.isArray(detail) ? String(detail.codigo ?? "") : "";
}

/** true si se pasó el uso justo del plan gratis: la pantalla ofrece Pro o créditos. */
export function esUsoJusto(err: unknown): boolean {
  return codigoError(err).startsWith("USO_JUSTO");
}

/** true si el comprobante requiere Kipu Pro / Al Día (402 PLAN_REQUERIDO: liquidación y retención). */
export function esPlanRequerido(err: unknown): boolean {
  return codigoError(err) === "PLAN_REQUERIDO";
}

/** Mensaje para el usuario según el tipo de error. */
export function mensajeErrorEmision(err: any, porDefecto: string): string {
  const status = err?.response?.status;

  if (!err?.response) {
    // Timeout o sin conexión: el comprobante pudo haberse emitido
    return "No recibimos respuesta del servidor. Vuelve a intentar: si el comprobante ya se emitió, " +
           "verás el mismo y no se duplicará.";
  }
  if (status === 409) {
    return "Este comprobante todavía se está procesando. Espera unos segundos y vuelve a intentar.";
  }
  if (status === 429) {
    const espera = Number(err.response.headers?.["retry-after"]) || 60;
    return `Demasiadas solicitudes. Intenta de nuevo en ${espera} segundos.`;
  }

  const detail = err.response.data?.detail;
  if (detail && typeof detail === "object" && typeof detail.mensaje === "string") {
    return detail.mensaje;   // p. ej. el uso justo del plan gratis ({codigo, mensaje})
  }
  if (Array.isArray(detail)) {
    return detail.map((e: any) => (e.campo ? `${e.campo}: ${e.mensaje}` : e.msg ?? e.mensaje)).join(" | ");
  }
  if (typeof detail === "string") return detail;
  if (status >= 500) {
    return "Error del servidor. Vuelve a intentar: si el comprobante ya se emitió, no se duplicará.";
  }
  return porDefecto;
}
