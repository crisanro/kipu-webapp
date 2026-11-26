// lib/config.ts
import { ES_APP_NATIVA } from "./plataforma";

/** Dirección pública del panel: enlaces canónicos, sitemap y robots (SEO de /blog y /ayuda). */
export const URL_SITIO = "https://app.kipu.ec";

/**
 * Documentos legales publicados en kipu.ec. Se aceptan al crear la cuenta; el
 * backend guarda qué versión se aceptó (DOCUMENTOS_REGISTRO en registro.py).
 */
export const URL_TERMINOS          = "https://kipu.ec/terminos";
export const URL_PRIVACIDAD        = "https://kipu.ec/politica-de-privacidad";
export const URL_TRATAMIENTO_DATOS = "https://kipu.ec/tratamiento-de-datos";

/**
 * Dirección del backend. Una sola para todo el panel (axios, enlaces de PDF/XML).
 * Sin NEXT_PUBLIC_API_URL: en producción y en la app nativa, el backend oficial;
 * en desarrollo web, el puerto 8000 del mismo host.
 */
export const API_BASE_URL: string =
  process.env.NEXT_PUBLIC_API_URL
  ?? (process.env.NODE_ENV === "production" || ES_APP_NATIVA
      ? "https://core.kipu.ec"
      : typeof window !== "undefined"
        ? `${window.location.protocol}//${window.location.hostname}:8000`
        : "http://localhost:8000");
