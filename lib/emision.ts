// lib/emision.ts
// Manejo de errores al emitir comprobantes (FAC, NCR, NDB, LIQ, RET).
//
// La X-Idempotency-Key evita facturas duplicadas: el backend guarda la respuesta
// solo cuando la emisión sale bien, así que reintentar con la MISMA clave es seguro:
//   - si la emisión anterior falló, se procesa de nuevo;
//   - si sí se emitió pero la respuesta se perdió (timeout, red), devuelve esa factura.
// Por eso la clave solo se renueva ante errores donde seguro no se emitió nada.

// Rechazos del backend antes de emitir: el usuario corrige y vuelve a enviar
const ERRORES_DEFINITIVOS = new Set([400, 401, 402, 403, 404, 422]);

/** true si se puede generar una clave nueva sin riesgo de duplicar el comprobante. */
export function debeRenovarClave(err: any): boolean {
  const status = err?.response?.status;
  return typeof status === "number" && ERRORES_DEFINITIVOS.has(status);
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
  if (Array.isArray(detail)) {
    return detail.map((e: any) => (e.campo ? `${e.campo}: ${e.mensaje}` : e.msg ?? e.mensaje)).join(" | ");
  }
  if (typeof detail === "string") return detail;
  if (status >= 500) {
    return "Error del servidor. Vuelve a intentar: si el comprobante ya se emitió, no se duplicará.";
  }
  return porDefecto;
}
