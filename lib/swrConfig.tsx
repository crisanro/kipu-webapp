// lib/swrConfig.tsx
"use client";
import { SWRConfig } from "swr";

function localStorageProvider() {
  if (typeof window === "undefined") return new Map();

  const stored = localStorage.getItem("kipu-swr-cache");
  const map    = new Map<string, any>(stored ? JSON.parse(stored) : []);

  // Interceptar set para guardar inmediatamente
  const originalSet = map.set.bind(map);
  map.set = (key: string, value: any) => {
    originalSet(key, value);
    try {
      localStorage.setItem("kipu-swr-cache", JSON.stringify(Array.from(map.entries())));
    } catch {}
    return map;
  };

  return map;
}

export function SWRProvider({ children }: { children: React.ReactNode }) {
  return (
    <SWRConfig value={{
      provider:              localStorageProvider,
      revalidateOnFocus:     false,
      revalidateOnReconnect: false,
      revalidateIfStale:     false,
      dedupingInterval:      300000,
    }}>
      {children}
    </SWRConfig>
  );
}