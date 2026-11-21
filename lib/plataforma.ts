// lib/plataforma.ts
//
// Dónde corre este build: la web (app.kipu.ec) o la app de las tiendas
// (Capacitor, Android/iOS). Se decide AL COMPILAR con NEXT_PUBLIC_PLATAFORMA
// (`npm run build:native`), así lo que es solo de la web ni siquiera entra al
// paquete de la app y no hay parpadeos al cargar.
//
// Los módulos que no van en la app (admin, equipo, planes, renta, api-keys)
// tienen sus páginas como `page.web.tsx`: next.config.ts solo las compila en la web.

export const ES_APP_NATIVA = process.env.NEXT_PUBLIC_PLATAFORMA === "native";
