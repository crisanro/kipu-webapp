// lib/rutas.ts
//
// Direcciones de las pantallas de detalle. El id va como parámetro (?id=…), no
// en la ruta (/documentos/123): la app nativa es un export estático y no puede
// tener rutas dinámicas. Todo enlace a un detalle debe salir de aquí.
//
// Las direcciones viejas (/documentos/123) siguen funcionando en la web: las
// páginas `[id]/page.web.tsx` redirigen. Para lo que llega del backend
// (notificaciones, push) está `rutaInterna`, que también sirve en la app.

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

/**
 * Traduce una dirección del panel con el formato viejo (/documentos/123?x=1)
 * al nuevo (/documentos/ver?id=123&x=1). Si no es de las viejas, la devuelve igual.
 */
export function rutaInterna(ruta: string): string {
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
