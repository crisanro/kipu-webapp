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
  const cached = localStorage.getItem(CACHE_KEY);
  if (cached) {
    try {
      const { data, timestamp } = JSON.parse(cached);
      // Invalidar cache viejo sin permisos
      if (data.empresas?.[0] && !("permisos" in data.empresas[0])) {
        localStorage.removeItem(CACHE_KEY);
      } else if (Date.now() - timestamp < CACHE_TTL) {
        return data;
      }
    } catch {
      localStorage.removeItem(CACHE_KEY);
    }
  }

  // Cache expirado — llamar al backend
  const res  = await api.get("/api/v1/app/usuarios/empresas", {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = {
    empresas: res.data.data ?? [],
    role:     res.data.role ?? null,
  };

  // Invalidar cache viejo que no tiene permisos
  const cachedOld = localStorage.getItem(CACHE_KEY);
  if (cachedOld) {
    try {
      const { data: oldData } = JSON.parse(cachedOld);
      if (oldData.empresas?.[0] && !("permisos" in oldData.empresas[0])) {
        localStorage.removeItem(CACHE_KEY); // ← forzar recarga
      }
    } catch {}
  }

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
    let refreshInterval: NodeJS.Timeout | null = null;

    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setListoLocal(true);
        setListo(true);
        localStorage.removeItem("kipu-ext-token");
        if (refreshInterval) clearInterval(refreshInterval);

        const rutasProtegidas = ["/dashboard", "/documentos", "/clientes",
                                 "/productos", "/configuracion", "/estructura",
                                 "/planes", "/usuarios", "/admin"];
        if (rutasProtegidas.some(r => pathname.startsWith(r))) {
          router.replace("/login");
        }
        return;
      }

      try {
        const token = await user.getIdToken();
        localStorage.setItem("kipu-ext-token", token);

        // Refrescar token cada 50 minutos para la extensión
        if (!refreshInterval) {
          refreshInterval = setInterval(async () => {
            try {
              const t = await user.getIdToken(true);
              localStorage.setItem("kipu-ext-token", t);
            } catch {}
          }, 50 * 60 * 1000);
        }

        if (inicializado.current) {
          setListoLocal(true);
          setListo(true);
          return;
        }
        inicializado.current = true;

        const data = await cargarEmpresas(token); // ← usa cache si existe

        if (data.empresas.length === 0) {
          const params   = new URLSearchParams(window.location.search);
          const empresaParam = params.get("empresa");
          router.replace(empresaParam ? `/bienvenida?empresa=${empresaParam}` : "/bienvenida");
          return;
        }

        setUser(user.uid, user.email ?? "", "", data.role);
        setEmpresas(data.empresas);

        // Limpiar store viejo sin permisos
        if (empresa && !("permisos" in empresa)) {
          localStorage.removeItem("kipu-auth");
        }

        if (!empresa) {
          const e = data.empresas[0];
          setEmpresa({
            id:                  e.id,
            ruc:                 e.ruc,
            razon_social:        e.razon_social,
            nombre_comercial:    e.nombre_comercial,
            ambiente:            e.ambiente,
            tipo_emisor:         e.tipo_emisor,
            rol:                 e.rol,
            permisos:            e.permisos ?? {},
            firma_ok:            e.firma_ok,
            suscripcion_activa:  e.suscripcion_activa,
            suscripcion:         e.suscripcion,
            balance_api:         e.balance_api,
          });
        }
      } catch (error) {
        console.error("[Auth] Error:", error);
        // Limpiar cache corrupto
        localStorage.removeItem(CACHE_KEY);
        localStorage.removeItem("kipu-ext-token");
        router.replace("/login");
      } finally {
        setListoLocal(true);
        setListo(true);
      }
    });

    return () => {
      unsub();
      if (refreshInterval) clearInterval(refreshInterval);
    };
  }, [pathname, router, empresa, setUser, setEmpresa, setEmpresas, setListo]);

  if (!listo) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-950">
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return <SWRProvider>{children}</SWRProvider>;
}