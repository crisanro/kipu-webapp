// lib/volver.ts
// Volver a la página que se pidió después de iniciar sesión.
//
// Quien abre un enlace del panel sin sesión (p. ej. desde Wappti:
// /uso-justo?ruc=...) pasa por el login y luego vuelve a esa página, no al inicio.
//   - Solo direcciones DEL PANEL: empiezan con una sola "/", sin dominio ni
//     esquema; así nadie puede usar el regreso para mandar a otro sitio.
//   - Se guarda en sessionStorage (esta pestaña) y vence a los 30 minutos.
//   - Se usa una sola vez.

const CLAVE   = "kipu-volver";
const VENCE_MS = 30 * 60 * 1000;
const MAX_LARGO = 500;
// Pantallas de entrada: volver ahí no tiene sentido
const NO_VOLVER = ["/login", "/register", "/reset", "/bienvenida", "/onboarding"];

/** La ruta si es una dirección segura del panel; si no, null. */
export function rutaDelPanel(ruta: string | null | undefined): string | null {
  if (!ruta || ruta.length > MAX_LARGO) return null;
  if (!ruta.startsWith("/") || ruta.startsWith("//") || ruta.includes("\\")) return null;
  try {
    const base = "https://panel.invalid";
    const url  = new URL(ruta, base);
    if (url.origin !== base) return null;
    const limpia = url.pathname + url.search;
    if (limpia === "/" || NO_VOLVER.some((r) => url.pathname === r || url.pathname.startsWith(r + "/"))) return null;
    return limpia;
  } catch {
    return null;
  }
}

/** Antes de mandar al login: recordar a dónde quería ir. */
export function guardarVolver(ruta: string): void {
  const segura = rutaDelPanel(ruta);
  if (!segura) return;
  try {
    sessionStorage.setItem(CLAVE, JSON.stringify({ ruta: segura, t: Date.now() }));
  } catch {}
}

/** Después del login: la página guardada (y se olvida), o null. */
export function tomarVolver(): string | null {
  try {
    const crudo = sessionStorage.getItem(CLAVE);
    sessionStorage.removeItem(CLAVE);
    if (!crudo) return null;
    const { ruta, t } = JSON.parse(crudo) as { ruta?: string; t?: number };
    if (!t || Date.now() - t > VENCE_MS) return null;
    return rutaDelPanel(ruta);
  } catch {
    return null;
  }
}
