// lib/api.ts
import axios from "axios";
import { auth } from "./firebase";
import { useSandboxStore } from "@/store/sandbox.store";

const api = axios.create({
  baseURL:         process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000",
  timeout:         30000,
  maxRedirects:    5,
  withCredentials: false,
});

// Interceptor — agrega token Firebase + header sandbox
api.interceptors.request.use(async (config) => {
  const user = auth.currentUser;
  if (user) {
    const token = await user.getIdToken();
    config.headers.Authorization = `Bearer ${token}`;
  }

  // Agregar header sandbox si está activo
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
    return Promise.reject(error);
  }
);

export default api;