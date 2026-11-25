// components/shell/PuenteNativo.tsx
// Conecta la app de las tiendas con el teléfono. Se monta una vez (app/providers.tsx)
// y no dibuja nada. En el navegador no hace nada.
//   - Botón atrás de Android: cierra la capa abierta (lib/botonAtras.ts); si no
//     hay, vuelve a la pantalla anterior; en Inicio minimiza la app.
//   - Al volver a la app (resume): refresca los datos de SWR.
//   - Splash: se quita cuando la app está lista (o a los 8 s, por las dudas).
//   - Barras del sistema: íconos claros u oscuros según el tema.
//   - Teclado: el campo enfocado queda a la vista.

"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { useSWRConfig } from "swr";
import { Capacitor, SystemBars, SystemBarsStyle, type PluginListenerHandle } from "@capacitor/core";
import { cerrarCapaSuperior } from "@/lib/botonAtras";
import { ocultarSplash } from "@/lib/nativo";

const INICIO = "/dashboard";
// Desde aquí, atrás sale de la app (la minimiza, como cualquier app de Android)
const RAICES = ["/dashboard", "/login", "/", "/bienvenida", "/onboarding"];
// Pestañas de abajo: atrás vuelve a Inicio
const PESTANAS = ["/documentos", "/personas", "/mas"];

const SPLASH_MAXIMO_MS = 8000;

/** /documentos/ (export estático con trailingSlash) → /documentos */
const rutaActual = () => window.location.pathname.replace(/\/+$/, "") || "/";

export default function PuenteNativo({ listo }: { listo: boolean }) {
  const router = useRouter();
  const { resolvedTheme } = useTheme();
  const { mutate } = useSWRConfig();

  // Botón atrás, volver a la app y teclado
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    let cancelado = false;
    const escuchas: PluginListenerHandle[] = [];

    (async () => {
      const { App } = await import("@capacitor/app");
      if (cancelado) return;

      escuchas.push(await App.addListener("backButton", ({ canGoBack }) => {
        if (cerrarCapaSuperior()) return;
        const ruta = rutaActual();
        if (RAICES.includes(ruta)) { void App.minimizeApp(); return; }
        if (PESTANAS.includes(ruta)) { router.replace(INICIO); return; }
        if (canGoBack) window.history.back();
        else router.replace(INICIO);     // llegó desde una notificación: no hay historial
      }));

      // De vuelta a la app: lo que esté en caché se vuelve a pedir
      escuchas.push(await App.addListener("resume", () => { void mutate(() => true); }));

      const { Keyboard } = await import("@capacitor/keyboard");
      if (cancelado) return;
      escuchas.push(await Keyboard.addListener("keyboardDidShow", () => {
        const activo = document.activeElement as HTMLElement | null;
        if (activo && /^(INPUT|TEXTAREA|SELECT)$/.test(activo.tagName)) {
          activo.scrollIntoView({ block: "center", behavior: "smooth" });
        }
      }));
    })();

    return () => {
      cancelado = true;
      escuchas.forEach(e => void e.remove());
    };
  }, [router, mutate]);

  // Splash: fuera cuando la primera pantalla está lista; si algo se cuelga, igual sale
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    if (listo) {
      // un cuadro después, para que ya esté pintada
      const r = requestAnimationFrame(() => void ocultarSplash());
      return () => cancelAnimationFrame(r);
    }
    const t = setTimeout(() => void ocultarSplash(), SPLASH_MAXIMO_MS);
    return () => clearTimeout(t);
  }, [listo]);

  // Barras del sistema: contenido claro sobre el tema oscuro y al revés
  useEffect(() => {
    if (!Capacitor.isNativePlatform() || !resolvedTheme) return;
    void SystemBars.setStyle({
      style: resolvedTheme === "dark" ? SystemBarsStyle.Dark : SystemBarsStyle.Light,
    }).catch(() => {});
  }, [resolvedTheme]);

  return null;
}
