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
  plugins: {
    // iOS: con la app abierta, mostrar el aviso (banner, sonido y número en el ícono)
    FirebaseMessaging: {
      presentationOptions: ["alert", "badge", "sound"],
    },
    // Android: con la app abierta el sistema no muestra el push; lib/notifications.ts
    // lo muestra como notificación local, con el mismo ícono y color que el push
    LocalNotifications: {
      smallIcon: "ic_stat_kipu",
      iconColor: "#059669",   // = @color/ic_launcher_background
    },
    // El splash se queda hasta que la app está lista (components/shell/PuenteNativo.tsx
    // lo quita; a los 8 s sale igual): sin pantalla en blanco ni doble spinner al abrir
    SplashScreen: {
      launchAutoHide: false,
      showSpinner:    false,
    },
    // Android a pantalla completa (edge-to-edge): que el WebView se achique con el
    // teclado, para que no tape los campos ni los botones fijos de abajo
    Keyboard: {
      resizeOnFullScreen: true,
    },
  },
  experimental: {
    ios: {
      spm: {
        // Lo pide @capacitor-firebase/messaging en iOS (choque de nombres en Swift Package Manager)
        packageOptions: {
          "@capacitor-firebase/messaging": { symlink: true },
        },
      },
    },
  },
};

export default config;
