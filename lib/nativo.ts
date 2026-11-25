// lib/nativo.ts
// Funciones del teléfono con su equivalente en la web. Los plugins de Capacitor
// se cargan solo dentro de la app (import dinámico): la web no los descarga.
//
//   vibrar("exito");      // en la web no hace nada

import { Capacitor } from "@capacitor/core";

/** true dentro de la app de las tiendas (Android/iOS), false en el navegador. */
export const esNativo = (): boolean => Capacitor.isNativePlatform();

// ── Vibración ────────────────────────────────────────────────────────────────

export type TipoVibracion = "ligera" | "media" | "exito" | "alerta" | "error";

/** Vibración corta del sistema (Taptic Engine en iPhone). Nunca falla. */
export async function vibrar(tipo: TipoVibracion = "ligera"): Promise<void> {
  if (!esNativo()) return;
  try {
    const { Haptics, ImpactStyle, NotificationType } = await import("@capacitor/haptics");
    if (tipo === "ligera" || tipo === "media") {
      await Haptics.impact({ style: tipo === "ligera" ? ImpactStyle.Light : ImpactStyle.Medium });
    } else {
      const mapa = { exito: NotificationType.Success, alerta: NotificationType.Warning, error: NotificationType.Error };
      await Haptics.notification({ type: mapa[tipo] });
    }
  } catch {}
}

// ── Pantalla de inicio (splash) ──────────────────────────────────────────────

let splashOculto = false;

/** Quita el splash nativo (capacitor.config: launchAutoHide false). Solo la primera vez. */
export async function ocultarSplash(): Promise<void> {
  if (splashOculto || !esNativo()) return;
  splashOculto = true;
  try {
    const { SplashScreen } = await import("@capacitor/splash-screen");
    await SplashScreen.hide({ fadeOutDuration: 200 });
  } catch {}
}
