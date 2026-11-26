// lib/nativo.ts
// Funciones del teléfono con su equivalente en la web. Los plugins de Capacitor
// se cargan solo dentro de la app (import dinámico): la web no los descarga.
//
//   vibrar("exito");                                         // en la web no hace nada
//   await guardarYCompartir({ url: urlPdf(clave, "a4") }, "001-001-000000123.pdf");
//   await guardarYCompartir(blob, "ATS-2026-10.zip");
//   await compartir({ texto: "Tu comprobante", url });
//   await abrirExterno(checkoutUrl);

import { Capacitor, CapacitorHttp } from "@capacitor/core";

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

// ── Archivos: guardar y compartir ────────────────────────────────────────────
// En el WebView de la app no hay descargas: <a download> y window.open no hacen
// nada (Android) o abren el archivo como texto (iOS). En la app el archivo se
// guarda en la caché y se abre la hoja de compartir del sistema (abrir, imprimir,
// guardar en Archivos, WhatsApp, correo…). En la web, la descarga de siempre.

/** Un archivo ya en memoria (p. ej. bajado con api, que lleva la sesión) o una URL pública. */
export type FuenteArchivo = Blob | { url: string };

/** Quien cierra la hoja de compartir sin elegir nada no es un error. */
const esCancelacion = (e: unknown) => /cancel/i.test(String((e as { message?: string })?.message ?? e));

/** El nombre con que se guarda: sin barras ni caracteres raros. */
const nombreSeguro = (n: string) => n.replace(/[^\w.\-() ]+/g, "_").slice(0, 120) || "archivo";

function blobABase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const lector = new FileReader();
    lector.onload  = () => resolve(String(lector.result).split(",", 2)[1] ?? "");
    lector.onerror = () => reject(lector.error);
    lector.readAsDataURL(blob);
  });
}

function descargarEnNavegador(blob: Blob, nombre: string) {
  const url = URL.createObjectURL(blob);
  const a   = document.createElement("a");
  a.href = url;
  a.download = nombre;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * App: guarda el archivo y abre la hoja de compartir. Web: lo descarga, o con
 * `{ url }` y `abrirEnWeb` lo abre en otra pestaña (p. ej. el PDF para verlo).
 * Lanza error si no se pudo bajar o guardar (la pantalla muestra el aviso).
 */
export async function guardarYCompartir(
  fuente: FuenteArchivo,
  nombre: string,
  opciones: { titulo?: string; texto?: string; abrirEnWeb?: boolean } = {},
): Promise<void> {
  const archivo = nombreSeguro(nombre);

  if (!esNativo()) {
    if (fuente instanceof Blob) { descargarEnNavegador(fuente, archivo); return; }
    if (opciones.abrirEnWeb) { window.open(fuente.url, "_blank", "noopener"); return; }
    try {
      const res = await fetch(fuente.url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      descargarEnNavegador(await res.blob(), archivo);
    } catch {
      // Si el navegador no deja bajarlo (CORS, red), al menos se abre como antes
      window.open(fuente.url, "_blank", "noopener");
    }
    return;
  }

  // App: la URL se baja con HTTP nativo (sin CORS); el blob ya está en memoria
  let base64: string;
  if (fuente instanceof Blob) {
    base64 = await blobABase64(fuente);
  } else {
    const res = await CapacitorHttp.get({ url: fuente.url, responseType: "blob" });
    if (res.status < 200 || res.status >= 300) throw new Error(`HTTP ${res.status}`);
    base64 = typeof res.data === "string" ? res.data : await blobABase64(res.data as Blob);
  }

  const { Filesystem, Directory } = await import("@capacitor/filesystem");
  const { uri } = await Filesystem.writeFile({
    path: `compartidos/${archivo}`, data: base64, directory: Directory.Cache, recursive: true,
  });

  const { Share } = await import("@capacitor/share");
  try {
    await Share.share({ title: opciones.titulo ?? archivo, text: opciones.texto, files: [uri], dialogTitle: opciones.titulo ?? "Compartir" });
  } catch (e) {
    if (!esCancelacion(e)) throw e;
  }
}

/**
 * Comparte texto o un enlace con la hoja del sistema (app) o la del navegador si
 * la tiene. Devuelve false si no hay cómo (la pantalla ofrece copiar o WhatsApp).
 */
export async function compartir(datos: { titulo?: string; texto?: string; url?: string }): Promise<boolean> {
  try {
    if (esNativo()) {
      const { Share } = await import("@capacitor/share");
      await Share.share({ title: datos.titulo, text: datos.texto, url: datos.url, dialogTitle: datos.titulo ?? "Compartir" });
      return true;
    }
    if (typeof navigator !== "undefined" && navigator.share) {
      await navigator.share({ title: datos.titulo, text: datos.texto, url: datos.url });
      return true;
    }
  } catch (e) {
    if (esCancelacion(e) || (e as Error)?.name === "AbortError") return true;
  }
  return false;
}

// ── Enlaces externos ─────────────────────────────────────────────────────────

/**
 * Abre una página de fuera de Kipu (pagos, portal de facturación, un informe).
 * App: navegador dentro de la app (Safari View / Chrome Custom Tabs), así al
 * cerrarlo se vuelve a Kipu. Web: otra pestaña, o la misma con `mismaPestana`
 * (p. ej. el pago, que vuelve a Kipu al terminar).
 * `alCerrar` (solo app): cuando el usuario cierra ese navegador, p. ej. para
 * volver a consultar si el pago entró.
 */
export async function abrirExterno(
  url: string,
  { mismaPestana = false, alCerrar }: { mismaPestana?: boolean; alCerrar?: () => void } = {},
): Promise<void> {
  if (esNativo()) {
    const { Browser } = await import("@capacitor/browser");
    if (alCerrar) {
      const escucha = await Browser.addListener("browserFinished", () => {
        void escucha.remove();
        alCerrar();
      });
    }
    await Browser.open({ url });
    return;
  }
  if (mismaPestana) window.location.href = url;
  else window.open(url, "_blank", "noopener,noreferrer");
}
