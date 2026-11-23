// lib/api.ts
import axios from "axios";
import { auth, tokenAppCheck } from "./firebase";
import { useSandboxStore } from "@/store/sandbox.store";
import { useAuthStore } from "@/store/auth.store";
import { API_BASE_URL } from "./config";

const api = axios.create({
  baseURL:         API_BASE_URL,
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

  // App Check: prueba que la petición sale de esta página (ver lib/firebase.ts)
  const appCheck = await tokenAppCheck();
  if (appCheck) {
    config.headers["X-Firebase-AppCheck"] = appCheck;
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

// Mismo texto que SIN_ACCESO_EMPRESA en el backend (app/core/security.py)
const SIN_ACCESO_EMPRESA = "Ya no tienes acceso a esta empresa.";
let redirigiendo = false;   // varias peticiones pueden fallar a la vez: un solo aviso

// Interceptor — manejo global de errores
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Import dinámico: notifications.ts importa este mismo módulo
      import("./notifications")
        .then(m => m.olvidarDispositivoLocal())
        .catch(() => {})
        .finally(() => {
          auth.signOut();
          window.location.href = "/login";
        });
    }
    // Lo removieron de la empresa activa (el backend envía este texto exacto):
    // olvidar esa empresa y recargar para que entre a otra de las suyas
    if (error.response?.status === 403 &&
        error.response.data?.detail === SIN_ACCESO_EMPRESA &&
        typeof window !== "undefined" && !redirigiendo) {
      redirigiendo = true;
      try { sessionStorage.removeItem("kipu-empresa-sesion"); } catch {}  // = SESSION_EMPRESA_KEY
      alert("Ya no tienes acceso a esta empresa. Te llevamos a otra de tus empresas.");
      window.location.href = "/dashboard";
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