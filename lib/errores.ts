// lib/errores.ts
/** Mensaje de error de una respuesta del backend (detail), o el texto por defecto. */
export function detalleError(err: unknown, porDefecto: string): string {
  const detail = (err as { response?: { data?: { detail?: unknown } } })?.response?.data?.detail;
  return typeof detail === "string" && detail ? detail : porDefecto;
}
