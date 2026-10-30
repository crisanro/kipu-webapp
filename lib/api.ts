// lib/api.ts
import axios from "axios";
import { auth } from "./firebase";
import { useSandboxStore } from "@/store/sandbox.store";
import { useAuthStore } from "@/store/auth.store";

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL
    ?? (typeof window !== "undefined"
        ? `${window.location.protocol}//${window.location.hostname}:8000`
        : "http://localhost:8000"),
  timeout:         30000,
  maxRedirects:    5,
  withCredentials: false,
});

// Interceptor — agrega token Firebase + header sandbox + emisor activo
api.interceptors.request.use(async (config) => {
  const user = auth.currentUser;
  if (user) {
    const token = await user.getIdToken();
    config.headers.Authorization = `Bearer ${token}`;
  }

  // Emisor activo — para que el backend sepa qué empresa usar
  const empresa = useAuthStore.getState().empresa;
  if (empresa?.id) {
    config.headers["X-Emisor-ID"] = String(empresa.id);
  }

  // Sandbox
  const sandbox = useSandboxStore.getState().activo;
  if (sandbox) {
    config.headers["X-Sandbox"] = "true";
  }

  return config;
});

// Interceptor — manejo global de errores
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      auth.signOut();
      window.location.href = "/login";
    }
    // Rate limit: las pantallas muestran response.data.detail; si el 429 no lo
    // trae (p. ej. lo respondió Cloudflare), se completa con un mensaje claro
    if (error.response?.status === 429) {
      const data = error.response.data;
      if (!data || typeof data !== "object" || !data.detail) {
        const espera = Number(error.response.headers?.["retry-after"]) || 60;
        error.response.data = {
          ...(data && typeof data === "object" ? data : {}),
          detail: `Demasiadas solicitudes. Intenta de nuevo en ${espera} segundos.`,
        };
      }
    }
    return Promise.reject(error);
  }
);

export default api;