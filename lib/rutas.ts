// lib/rutas.ts
//
// Direcciones de las pantallas de detalle. El id va como parámetro (?id=…), no
// en la ruta (/documentos/123): la app nativa es un export estático y no puede
// tener rutas dinámicas. Todo enlace a un detalle debe salir de aquí.
//
// Las direcciones viejas (/documentos/123) siguen funcionando en la web: los
// `[id]/route.web.ts` redirigen (redirigirVieja). Para lo que llega del backend
// (notificaciones, push) está `rutaInterna`, que también sirve en la app.

import { ES_APP_NATIVA, esRutaSoloWeb } from "./plataforma";

const q = (v: string | number) => encodeURIComponent(String(v));

export const rutas = {
  documento:    (id: string | number) => `/documentos/ver?id=${q(id)}`,
  recibido:     (id: string | number) => `/documentos/recibidos/ver?id=${q(id)}`,
  cuenta:       (id: string | number) => `/cuentas/ver?id=${q(id)}`,
  persona:      (id: string | number) => `/personas/ver?id=${q(id)}`,
  proforma:     (id: string | number) => `/proformas/ver?id=${q(id)}`,
  reporteIva:   (periodo: string)     => `/reportes/iva?periodo=${q(periodo)}`,
  reporteAts:   (periodo: string)     => `/reportes/ats?periodo=${q(periodo)}`,
  reporteRenta: (anio: string | number) => `/reportes/renta?anio=${q(anio)}`,
};

/** Agrega a `destino` (que ya trae "?") los parámetros que traía la dirección vieja. */
export function conQuery(
  destino: string,
  extra: Record<string, string | string[] | undefined>,
): string {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(extra)) {
    for (const x of [v].flat()) if (x !== undefined) p.append(k, x);
  }
  const s = p.toString();
  return s ? `${destino}&${s}` : destino;
}

/**
 * GET de una dirección vieja (app/…/[id]/route.web.ts, solo en la web): redirige
 * con 307 a la nueva conservando el resto de la query, para que los enlaces
 * guardados, los correos y lo que manda el backend sigan funcionando.
 *   export const GET = redirigirVieja(rutas.cuenta);
 */
export function redirigirVieja(destino: (valor: string) => string) {
  return async (request: Request, { params }: { params: Promise<Record<string, string>> }) => {
    const [valor] = Object.values(await params);   // el único segmento: id, periodo o anio
    const query   = Object.fromEntries(new URL(request.url).searchParams);
    // Location relativa: detrás de Traefik request.url no trae el dominio público
    return new Response(null, { status: 307, headers: { Location: conQuery(destino(valor), query) } });
  };
}

// Ruta vieja → nueva. El orden importa: /documentos/recibidos/… antes que
// /documentos/…; y no se tocan las pantallas fijas (emitir, nueva, ver).
const VIEJAS: [RegExp, (v: string) => string][] = [
  [/^\/documentos\/recibidos\/(?!ver$|nueva$)([^/]+)$/, rutas.recibido],
  [/^\/documentos\/(?!ver$|recibidos$|emitir$)([^/]+)$/, rutas.documento],
  [/^\/cuentas\/(?!ver$)([^/]+)$/,                      rutas.cuenta],
  [/^\/personas\/(?!ver$)([^/]+)$/,                     rutas.persona],
  [/^\/proformas\/(?!ver$|nueva$)([^/]+)$/,             rutas.proforma],
  [/^\/reportes\/iva\/([^/]+)$/,                         rutas.reporteIva],
  [/^\/reportes\/ats\/([^/]+)$/,                         rutas.reporteAts],
  [/^\/reportes\/renta\/([^/]+)$/,                       rutas.reporteRenta],
];

// Pantallas que se mudaron: las notificaciones ya guardadas traen la dirección vieja
const ENLACES_MOVIDOS: Record<string, string> = {
  "/configuracion?tab=suscripcion": "/planes",
  "/configuracion?tab=creditos":    "/planes?tab=creditos",
};

/**
 * Traduce una dirección del panel con el formato viejo (/documentos/123?x=1)
 * al nuevo (/documentos/ver?id=123&x=1). Si no es de las viejas, la devuelve igual.
 * En la app nativa, lo que solo existe en la web (/planes, /renta…) va al inicio.
 */
export function rutaInterna(ruta: string): string {
  ruta = ENLACES_MOVIDOS[ruta] ?? ruta;
  if (ES_APP_NATIVA && esRutaSoloWeb(ruta)) return "/dashboard";
  const [camino, query] = ruta.split("?", 2);
  const limpio = camino.length > 1 ? camino.replace(/\/+$/, "") : camino;
  for (const [patron, nueva] of VIEJAS) {
    const m = limpio.match(patron);
    if (m) {
      const destino = nueva(decodeURIComponent(m[1]));
      return query ? `${destino}&${query}` : destino;
    }
  }
  return ruta;
}
