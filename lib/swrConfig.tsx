// lib/swrConfig.tsx
"use client";
import { useEffect } from "react";
import { SWRConfig } from "swr";
import { useAuthStore } from "@/store/auth.store";

// Versiones anteriores guardaban aquí las respuestas de la API (dashboard,
// notificaciones) y no se borraban al cerrar sesión.
const CACHE_LEGADO = "kipu-swr-cache";

export function SWRProvider({ children }: { children: React.ReactNode }) {
  const uid = useAuthStore((s) => s.uid);

  useEffect(() => {
    try { localStorage.removeItem(CACHE_LEGADO); } catch {}
  }, []);

  // Caché solo en memoria y uno por usuario: al cambiar de sesión se descarta
  return (
    <SWRConfig
      key={uid ?? "anonimo"}
      value={{
        provider:              () => new Map(),
        revalidateOnFocus:     false,
        revalidateOnReconnect: false,
        revalidateIfStale:     false,
        dedupingInterval:      300000,
      }}
    >
      {children}
    </SWRConfig>
  );
}
