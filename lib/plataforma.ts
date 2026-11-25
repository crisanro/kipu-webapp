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

// ── Mensajes del backend, en la app ───────────────────────────────────────────
// El backend no sabe si le habla la web o la app, y muchos de sus textos nombran
// planes ("…disponibles en Kipu Pro", "Con un plan pagado no aplica"). En la app
// eso es invitar a comprar fuera de la tienda (Apple 3.1.1 / Google Play), así
// que lib/api.ts pasa cada respuesta por neutralizarRespuesta: se quitan las
// FRASES que nombran un plan que la app no vende; si no queda nada, un texto
// neutro. Kipu Al Día no se filtra: es el servicio de un contador y se contrata
// en la app. En la web no se toca nada.
const NOMBRA_PLAN =
  /kipu\s*pro\b|plan\s+pro\b|plan(?:es)?\s+pagad|plan(?:es)?\s+de\s+pago|kipu\s*renta|ver\s+(?:los\s+|todos\s+los\s+)?planes|mejora(?:r)?\s+(?:tu\s+)?plan|p[aá]sate\s+a|suscr[ií]bete|activa(?:r)?\s+(?:tu\s+)?suscripci|compra(?:r)?\s+(?:m[aá]s\s+)?cr[eé]ditos/i;

export const TEXTO_SIN_PLAN = "No incluido en tu plan actual.";

/** Quita de un texto las frases que nombran un plan que la app no vende. */
export function quitarMencionesDePlan(texto: string, siNoQueda = TEXTO_SIN_PLAN): string {
  if (!NOMBRA_PLAN.test(texto)) return texto;
  // Frases: hasta un punto (o ! ?) seguido de espacio. "$40.00" no se corta.
  // Sin lookbehind en la expresión: los WebView de iOS viejos no lo entienden.
  const partes = texto.split(/([.!?]+\s+)/);
  const frases: string[] = [];
  for (let i = 0; i < partes.length; i += 2) frases.push(partes[i] + (partes[i + 1] ?? ""));
  const quedan = frases.filter((f) => !NOMBRA_PLAN.test(f)).join("").trim();
  return quedan || siNoQueda;
}

// Campos de texto que las pantallas muestran tal cual (errores, avisos,
// notificaciones: title/description). Los datos del usuario (nombres, notas…)
// no se tocan. Un título vacío se reemplaza por uno genérico, no por el aviso.
const CAMPOS_MENSAJE = new Set(["detail", "mensaje", "message", "aviso", "error", "cuerpo", "description", "motivo_no_elegible"]);
const CAMPOS_TITULO  = new Set(["titulo", "title"]);

/** Solo en la app: neutraliza los mensajes de una respuesta del backend (en el lugar). */
export function neutralizarRespuesta<T>(dato: T, profundidad = 0): T {
  if (!ES_APP_NATIVA || dato == null || typeof dato !== "object" || profundidad > 4) return dato;
  if (Array.isArray(dato)) {
    dato.forEach((x) => neutralizarRespuesta(x, profundidad + 1));
    return dato;
  }
  const obj = dato as Record<string, unknown>;
  for (const [clave, valor] of Object.entries(obj)) {
    if (typeof valor === "string") {
      if (CAMPOS_MENSAJE.has(clave)) obj[clave] = quitarMencionesDePlan(valor);
      else if (CAMPOS_TITULO.has(clave)) obj[clave] = quitarMencionesDePlan(valor, "Aviso de tu cuenta");
    } else if (valor && typeof valor === "object") {
      neutralizarRespuesta(valor, profundidad + 1);
    }
  }
  return dato;
}
