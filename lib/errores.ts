// lib/errores.ts
/**
 * Mensaje de error de una respuesta del backend, o el texto por defecto. El
 * `detail` llega de tres formas: texto, {codigo, mensaje} (uso justo, RUC en
 * pruebas…) o la lista de los 422 de validación ([{msg|mensaje, …}]). Pintar el
 * objeto o la lista tal cual hacía caer la pantalla.
 */
export function detalleError(err: unknown, porDefecto: string): string {
  const detail = (err as { response?: { data?: { detail?: unknown } } })?.response?.data?.detail;
  if (typeof detail === "string" && detail) return detail;
  if (Array.isArray(detail)) {
    const mensajes = detail
      .map((d: { mensaje?: unknown; msg?: unknown }) => d?.mensaje ?? d?.msg)
      .filter((m): m is string => typeof m === "string" && !!m);
    if (mensajes.length) return mensajes.join(". ");
  }
  if (detail && typeof detail === "object") {
    const mensaje = (detail as { mensaje?: unknown }).mensaje;
    if (typeof mensaje === "string" && mensaje) return mensaje;
  }
  return porDefecto;
}
