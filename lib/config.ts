// lib/config.ts
import { ES_APP_NATIVA } from "./plataforma";

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
