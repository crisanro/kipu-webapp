// app/providers.tsx
"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { useAuthStore } from "@/store/auth.store";
import { SWRProvider } from "@/lib/swrConfig";
import api from "@/lib/api";

async function cargarEmpresas(token: string) {
  const res  = await api.get("/api/v1/app/usuarios/empresas", {
    headers: { Authorization: `Bearer ${token}` },
  });
  return {
    empresas: res.data.data ?? [],
    role:     res.data.role ?? null,
  };
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

        // Siempre llamar al backend — Redis cachea por 5 min, no el frontend
        const data = await cargarEmpresas(token);

        if (data.empresas.length === 0) {
          const params       = new URLSearchParams(window.location.search);
          const empresaParam = params.get("empresa");
          router.replace(empresaParam ? `/bienvenida?empresa=${empresaParam}` : "/bienvenida");
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
            permisos:           e.permisos ?? {},
            firma_ok:           e.firma_ok,
            suscripcion_activa: e.suscripcion_activa,
            suscripcion:        e.suscripcion,
            balance_api:        e.balance_api,
          });
        }
      } catch (error) {
        console.error("[Auth] Error:", error);
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