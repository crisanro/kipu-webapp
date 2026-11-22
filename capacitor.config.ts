// capacitor.config.ts — app de las tiendas (Capacitor)
//
// La app carga el export estático de Next (`npm run build:native` → out/).
// Flujo: npm run build:native && npx cap sync android
//
// Ojo con las rutas: el servidor local de Capacitor responde con out/index.html
// a cualquier dirección sin extensión (/dashboard/, /ayuda/…). Por eso, al cargar
// una página entera, la portada (app/page.tsx) navega con Next a la que se pidió.

import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId:   "com.androga.kipu",     // identificador en las tiendas: no se puede cambiar después
  appName: "Kipu",
  webDir:  "out",
  android: {
    // La app solo llama a la API por HTTPS
    allowMixedContent: false,
  },
};

export default config;
