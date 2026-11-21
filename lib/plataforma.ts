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
// las compila en la web (admin, equipo, planes, renta, api-keys).

export const ES_APP_NATIVA = process.env.NEXT_PUBLIC_PLATAFORMA === "native";

/** Pantallas que la app no tiene (sus páginas son `page.web.tsx`). */
export const RUTAS_SOLO_WEB = ["/planes", "/renta", "/admin", "/equipo", "/api-keys"];

export const esRutaSoloWeb = (ruta: string) =>
  RUTAS_SOLO_WEB.some((r) => ruta === r || ruta.startsWith(r + "/") || ruta.startsWith(r + "?") || ruta.startsWith(r + "#"));
