// app/providers.tsx
"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { useAuthStore } from "@/store/auth.store";
import { SWRProvider } from "@/lib/swrConfig";
import api from "@/lib/api";

const CACHE_KEY = "kipu:empresas";
const CACHE_TTL = 5 * 60 * 1000; // 5 minutos

async function cargarEmpresas(token: string) {
  // Intentar desde cache primero
  const cached = localStorage.getItem(CACHE_KEY);
  if (cached) {
    try {
      const { data, timestamp } = JSON.parse(cached);
      if (Date.now() - timestamp < CACHE_TTL) {
        return data; // ← sin llamar al backend
      }
    } catch {}
  }

  // Cache expirado — llamar al backend
  const res  = await api.get("/api/v1/app/usuarios/empresas", {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = {
    empresas: res.data.data ?? [],
    role:     res.data.role ?? null,
  };

  localStorage.setItem(CACHE_KEY, JSON.stringify({
    data,
    timestamp: Date.now(),
  }));

  return data;
}

export function AppProviders({ children }: { children: React.ReactNode }) {
  const router   = useRouter();
  const pathname = usePathname();
  const { empresa, setUser, setEmpresa, setEmpresas, setListo } = useAuthStore();
  const inicializado = useRef(false);
  const [listo, setListoLocal] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setListoLocal(true);
        setListo(true);
        const rutasProtegidas = ["/dashboard", "/documentos", "/clientes",
                                  "/productos", "/configuracion", "/estructura",
                                  "/planes", "/usuarios", "/admin"];
        if (rutasProtegidas.some(r => pathname.startsWith(r))) {
          router.replace("/login");
        }
        return;
      }

      if (inicializado.current) {
        setListoLocal(true);
        setListo(true);
        return;
      }
      inicializado.current = true;

      try {
        const token = await user.getIdToken();
        const data  = await cargarEmpresas(token); // ← usa cache si existe

        if (data.empresas.length === 0) {
          router.replace("/onboarding");
          return;
        }

        setUser(user.uid, user.email ?? "", "", data.role);
        setEmpresas(data.empresas);

        if (!empresa) {
          const e = data.empresas[0];
          setEmpresa({
            id:                 e.id,
            ruc:                e.ruc,
            razon_social:       e.razon_social,
            nombre_comercial:   e.nombre_comercial,
            ambiente:           e.ambiente,
            tipo_emisor:        e.tipo_emisor,
            rol:                e.rol,
            firma_ok:           e.firma_ok,
            suscripcion_activa: e.suscripcion_activa,
            suscripcion:        e.suscripcion,
            balance_api:        e.balance_api,
          });
        }
      } catch (error) {
        console.error("[Auth] Error:", error);
        // Limpiar cache corrupto
        localStorage.removeItem(CACHE_KEY);
        router.replace("/login");
      } finally {
        setListoLocal(true);
        setListo(true);
      }
    });
    return () => unsub();
  }, []);

  if (!listo) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-950">
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return <SWRProvider>{children}</SWRProvider>;
}