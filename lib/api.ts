// lib/api.ts
import axios from "axios";
import { auth } from "./firebase";

const api = axios.create({
  baseURL:          process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000",
  timeout:          30000,
  maxRedirects:     5,    // AGREGAR — seguir redirects 307
  withCredentials:  false,
});

// Interceptor — agrega el token Firebase en cada request automáticamente
api.interceptors.request.use(async (config) => {
  const user = auth.currentUser;
  if (user) {
    const token = await user.getIdToken();
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Interceptor — manejo global de errores
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expirado — redirigir al login
      auth.signOut();
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

export default api;