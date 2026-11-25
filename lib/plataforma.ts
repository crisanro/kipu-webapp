// lib/plataforma.ts
//
// Dónde corre este build: la web (app.kipu.ec) o la app de las tiendas
// (Capacitor, Android/iOS). Se decide AL COMPILAR con NEXT_PUBLIC_PLATAFORMA
// (`npm run build:native`): es una constante, así que no hay parpadeos al cargar.
//
// Ojo: lo que se oculta con ES_APP_NATIVA o <SoloWeb> no se muestra ni se puede
// alcanzar en la app, pero su código sigue en el paquete (Turbopack no descarta
// ramas por una constante importada). Lo que NO debe ir en la app, ni como
// código, va en páginas `page.web.tsx` / `route.web.ts`: next.config.ts solo
// las compila en la web (admin, equipo, planes, renta, api-keys, blog).

export const ES_APP_NATIVA = process.env.NEXT_PUBLIC_PLATAFORMA === "native";

/** Pantallas que la app no tiene (sus páginas son `page.web.tsx`). */
export const RUTAS_SOLO_WEB = ["/planes", "/renta", "/admin", "/equipo", "/api-keys", "/blog"];

export const esRutaSoloWeb = (ruta: string) =>
  RUTAS_SOLO_WEB.some((r) => ruta === r || ruta.startsWith(r + "/") || ruta.startsWith(r + "?") || ruta.startsWith(r + "#"));

// ── Lo que incluye el plan, en la app ─────────────────────────────────────────
// En la web, lo que el plan no incluye se muestra con datos de ejemplo para
// venderlo. En la app no: no se puede comprar ahí (Apple 3.1.1 / Google Play),
// así que una función bloqueada sin salida invita a pagar fuera o parece rota.
// La app muestra solo lo que el plan incluye; lo demás no está ni en el menú.
// Mismas reglas que las pantallas usan para decidir los ejemplos.
type EmpresaPlan = { suscripcion_activa?: boolean | null; emision_gratis?: boolean | null } | null | undefined;

/** Solo con Pro o Al Día (suscripcion_activa). La liquidación de compra y la
 *  retención también: el backend las rechaza sin plan (402 PLAN_REQUERIDO). */
const RUTAS_CON_SUSCRIPCION = [
  "/cuentas", "/proformas", "/reportes/ats", "/reportes/renta",
  "/documentos/emitir/liq", "/documentos/emitir/ret",
];
/** Con suscripción o con el plan gratis (emision_gratis): en Reportes, solo el IVA. */
const RUTAS_CON_PLAN = ["/documentos/recibidos", "/reportes"];

const empiezaCon = (ruta: string, r: string) =>
  ruta === r || ruta.startsWith(r + "/") || ruta.startsWith(r + "?") || ruta.startsWith(r + "#");

/** true: en la app esta ruta no se muestra ni se puede abrir con este plan. */
export function rutaFueraDelPlan(ruta: string, empresa: EmpresaPlan): boolean {
  if (!ES_APP_NATIVA || !empresa) return false;
  if (empresa.suscripcion_activa) return false;
  if (RUTAS_CON_SUSCRIPCION.some((r) => empiezaCon(ruta, r))) return true;
  if (RUTAS_CON_PLAN.some((r) => empiezaCon(ruta, r))) return !empresa.emision_gratis;
  return false;
}
