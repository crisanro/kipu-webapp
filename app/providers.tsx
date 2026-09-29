// app/providers.tsx
"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { ThemeProvider } from "next-themes";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { useAuthStore } from "@/store/auth.store";
import { SWRProvider } from "@/lib/swrConfig";
import api from "@/lib/api";

const RUTAS_PROTEGIDAS = [
  "/dashboard", "/documentos", "/personas", "/productos", "/configuracion",
  "/estructura", "/planes", "/usuarios", "/admin",
];

const LS_KEYS = ["kipu-ext-token", "kipu-ext-emisor", "kipu-ext-ruc", "kipu-ext-razon"];

// Empresa elegida en esta pestaña (sobrevive recargas, no nuevos logins)
export const SESSION_EMPRESA_KEY = "kipu-empresa-sesion";

function limpiarStorage() {
  LS_KEYS.forEach((k) => localStorage.removeItem(k));
  sessionStorage.removeItem(SESSION_EMPRESA_KEY);
}

async function cargarEmpresas(token: string) {
  const res = await api.get("/api/v1/app/usuarios/empresas", {
    headers: { Authorization: `Bearer ${token}` },
    timeout: 15000, // nunca quedarse colgado
  });
  return {
    empresas:  res.data.data ?? [],
    role:      res.data.role ?? null,
    defaultId: res.data.default_id ?? null,
  };
}

export function AppProviders({ children }: { children: React.ReactNode }) {
  const router   = useRouter();
  const pathname = usePathname();
  const { setUser, setEmpresa, setEmpresas, setListo } = useAuthStore();

  // uid para el que ya se cargaron empresas con éxito (null = nada cargado)
  const cargadoPara = useRef<string | null>(null);
  const pathnameRef = useRef(pathname);
  const [listo, setListoLocal] = useState(false);

  // pathname actualizado sin re-suscribir Firebase en cada navegación
  useEffect(() => {
    pathnameRef.current = pathname;
  }, [pathname]);

  useEffect(() => {
    let refreshInterval: NodeJS.Timeout | null = null;

    const marcarListo = () => {
      setListoLocal(true);
      setListo(true);
    };

    const unsub = onAuthStateChanged(auth, async (user) => {
      // ── Sin sesión ─────────────────────────────────────────────
      if (!user) {
        cargadoPara.current = null;
        limpiarStorage();
        if (refreshInterval) {
          clearInterval(refreshInterval);
          refreshInterval = null;
        }
        marcarListo();
        if (RUTAS_PROTEGIDAS.some((r) => pathnameRef.current.startsWith(r))) {
          router.replace("/login");
        }
        return;
      }

      // ── Con sesión ─────────────────────────────────────────────
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

        // Ya cargado para este usuario → no repetir
        if (cargadoPara.current === user.uid) {
          return;
        }

        const data = await cargarEmpresas(token);

        if (data.empresas.length === 0) {
          cargadoPara.current = user.uid;
          const params       = new URLSearchParams(window.location.search);
          const empresaParam = params.get("empresa");
          router.replace(empresaParam ? `/bienvenida?empresa=${empresaParam}` : "/bienvenida");
          return;
        }

        setUser(user.uid, user.email ?? "", "", data.role);
        setEmpresas(data.empresas);

        // Prioridad: elegida en esta sesión → predeterminada → primera
        const empresaSesion = sessionStorage.getItem(SESSION_EMPRESA_KEY);
        const empresaActual =
          (empresaSesion && data.empresas.find((e: any) => String(e.id) === empresaSesion)) ||
          data.empresas.find((e: any) => e.id === data.defaultId) ||
          data.empresas[0];

        setEmpresa({
          id:                    empresaActual.id,
          ruc:                   empresaActual.ruc,
          razon_social:          empresaActual.razon_social,
          nombre_comercial:      empresaActual.nombre_comercial,
          ambiente:              empresaActual.ambiente,
          tipo_emisor:           empresaActual.tipo_emisor,
          rol:                   empresaActual.rol,
          permisos:              empresaActual.permisos ?? {},
          firma_ok:              empresaActual.firma_ok,
          suscripcion_activa:    empresaActual.suscripcion_activa,
          suscripcion:           empresaActual.suscripcion,
          balance_api:           empresaActual.balance_api,
          obligado_contabilidad: empresaActual.obligado_contabilidad ?? null,
          periodo_iva:           empresaActual.periodo_iva ?? null,
        });

        localStorage.setItem("kipu-ext-emisor", String(empresaActual.id));
        localStorage.setItem("kipu-ext-ruc",    empresaActual.ruc);
        localStorage.setItem("kipu-ext-razon",  empresaActual.razon_social);

        // Solo se marca como cargado cuando TODO salió bien
        cargadoPara.current = user.uid;

      } catch (error) {
        console.error("[Auth] Error:", error);
        cargadoPara.current = null;
        limpiarStorage();
        // Cerrar sesión para no quedar con Firebase logueado y el store vacío
        try { await signOut(auth); } catch {}
        router.replace("/login");
      } finally {
        marcarListo();
      }
    });

    return () => {
      unsub();
      if (refreshInterval) clearInterval(refreshInterval);
    };
  }, [router, setUser, setEmpresa, setEmpresas, setListo]);

  if (!listo) {
    return (
      <div className="h-screen flex items-center justify-center" style={{ background: "var(--kipu-bg)" }}>
        <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin"
             style={{ borderColor: "var(--kipu-accent)", borderTopColor: "transparent" }} />
      </div>
    );
  }

  return (
    <ThemeProvider attribute="data-theme" defaultTheme="light" enableSystem={false}>
      <SWRProvider>{children}</SWRProvider>
    </ThemeProvider>
  );
}