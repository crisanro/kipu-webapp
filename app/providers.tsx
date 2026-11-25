// app/providers.tsx
"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { ThemeProvider } from "next-themes";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged, signOut, type User } from "firebase/auth";
import { useAuthStore } from "@/store/auth.store";
import { SWRProvider } from "@/lib/swrConfig";
import api from "@/lib/api";
import { aEmpresa } from "@/lib/empresa";
import { olvidarDispositivoLocal } from "@/lib/notifications";
import { guardarVolver } from "@/lib/volver";
import { ProveedorAvisos } from "@/components/ui/Avisos";
import { ProveedorConfirmar } from "@/components/ui/Confirmar";
import PuenteNativo from "@/components/shell/PuenteNativo";
import { ES_APP_NATIVA } from "@/lib/plataforma";

// Todo lo demás requiere sesión. Lista de públicas (y no de protegidas) para
// que una pantalla nueva quede protegida por defecto.
// /volver-a-la-app: donde vuelve Stripe cuando el pago se abrió desde la app
// (el navegador interno no tiene la sesión).
const RUTAS_PUBLICAS = ["/", "/login", "/register", "/reset", "/ayuda", "/blog", "/volver-a-la-app"];

const esRutaPublica = (path: string) =>
  RUTAS_PUBLICAS.some((r) => path === r || (r !== "/" && path.startsWith(r + "/")));

// Contenido (Centro de Ayuda y /blog): se muestra al instante, sin esperar a Firebase,
// para que se vea sin sesión y lo lean los buscadores. La sesión carga detrás
// (el bloque de soporte de cada artículo depende del plan).
const RUTAS_CONTENIDO = ["/ayuda", "/blog", "/volver-a-la-app"];
const esRutaContenido = (path: string | null) =>
  !!path && RUTAS_CONTENIDO.some((r) => path === r || path.startsWith(r + "/"));

// Pantallas donde es normal todavía no tener empresa
const RUTAS_SIN_EMPRESA = ["/bienvenida", "/onboarding"];
const esRutaSinEmpresa = (path: string) =>
  RUTAS_SIN_EMPRESA.some((r) => path === r || path.startsWith(r + "/"));

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
    equipoAlDia: !!res.data.equipo_al_dia,
  };
}

export function AppProviders({ children }: { children: React.ReactNode }) {
  const router   = useRouter();
  const pathname = usePathname();
  const { setUser, setEmpresa, setEmpresas, setListo } = useAuthStore();

  // uid para el que ya se cargaron empresas con éxito (null = nada cargado)
  const cargadoPara = useRef<string | null>(null);
  // Carga de empresas del usuario (definida dentro del efecto de sesión)
  const cargarRef = useRef<((user: User) => Promise<void>) | null>(null);
  const pathnameRef = useRef(pathname);
  const [listo, setListoLocal] = useState(false);
  const [errorCarga, setErrorCarga] = useState<string | null>(null);

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

    const sinSesion = () => {
      cargadoPara.current = null;
      limpiarStorage();
      // El store persistido (empresa, empresas, permisos) no debe sobrevivir
      // a la sesión: si expiró sin pasar por "Cerrar sesión", seguía visible
      useAuthStore.getState().logout();
      if (refreshInterval) {
        clearInterval(refreshInterval);
        refreshInterval = null;
      }
      marcarListo();
      if (!esRutaPublica(pathnameRef.current)) {
        // Después del login vuelve aquí (p. ej. /uso-justo?ruc=… desde Wappti)
        guardarVolver(pathnameRef.current + window.location.search);
        router.replace("/login");
      }
    };

    // ── Con sesión: token y empresas ─────────────────────────────
    const cargar = async (user: User) => {
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
          // Leyendo la ayuda: que la lea; la bienvenida espera a que vuelva al panel
          if (esRutaContenido(pathnameRef.current)) return;
          const params       = new URLSearchParams(window.location.search);
          const empresaParam = params.get("empresa");
          router.replace(empresaParam ? `/bienvenida?empresa=${encodeURIComponent(empresaParam)}` : "/bienvenida");
          return;
        }

        setUser(user.uid, user.email ?? "", "", data.role);
        // Superadmin o contador de Kipu Al Día: ve el panel del equipo
        useAuthStore.setState({ equipoAlDia: data.equipoAlDia });
        setEmpresas(data.empresas);

        // Prioridad: elegida en esta sesión → predeterminada → primera
        const empresaSesion = sessionStorage.getItem(SESSION_EMPRESA_KEY);
        const empresaActual =
          (empresaSesion && data.empresas.find((e: any) => String(e.id) === empresaSesion)) ||
          data.empresas.find((e: any) => e.id === data.defaultId) ||
          data.empresas[0];

        setEmpresa(aEmpresa(empresaActual));

        localStorage.setItem("kipu-ext-emisor", String(empresaActual.id));
        localStorage.setItem("kipu-ext-ruc",    empresaActual.ruc);
        localStorage.setItem("kipu-ext-razon",  empresaActual.razon_social);

        // Solo se marca como cargado cuando TODO salió bien
        cargadoPara.current = user.uid;

      } catch (error: any) {
        console.error("[Auth] Error:", error);
        cargadoPara.current = null;
        const status = error?.response?.status;
        if (status === 401 || status === 403) {
          // Sesión inválida: cerrar para no quedar con Firebase logueado y el store vacío
          limpiarStorage();
          await olvidarDispositivoLocal();   // que el navegador deje de recibir avisos
          try { await signOut(auth); } catch {}
          router.replace("/login");
        } else {
          // Timeout, red, 5xx o 429: problema temporal, la sesión sigue siendo válida
          setErrorCarga(
            status === 429
              ? "Demasiadas solicitudes. Espera un momento y vuelve a intentar."
              : "No pudimos conectar con Kipu. Revisa tu conexión y vuelve a intentar."
          );
        }
      } finally {
        marcarListo();
      }
    };
    cargarRef.current = cargar;

    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        sinSesion();
        return;
      }
      await cargar(user);
    });

    return () => {
      unsub();
      if (refreshInterval) clearInterval(refreshInterval);
    };
  }, [router, setUser, setEmpresa, setEmpresas, setListo]);

  // Quien acaba de crear o unirse a una empresa llega al panel sin recargar la
  // página: sus empresas se cargaron cuando no tenía ninguna y el panel se quedaba
  // esperando para siempre. Se vuelven a pedir.
  useEffect(() => {
    const user = auth.currentUser;
    if (!user || cargadoPara.current !== user.uid) return;
    if (esRutaPublica(pathname) || esRutaSinEmpresa(pathname)) return;
    if (useAuthStore.getState().empresa) return;
    cargadoPara.current = null;
    void cargarRef.current?.(user);
  }, [pathname]);

  const contenido = esRutaContenido(pathname);

  let pantalla: React.ReactNode;
  if (errorCarga && !contenido) {
    pantalla = (
      <div className="h-screen flex flex-col items-center justify-center gap-4 p-6 text-center"
           style={{ background: "var(--kipu-bg)", color: "var(--kipu-text)" }}>
        <p className="text-sm max-w-xs" style={{ color: "var(--kipu-muted)" }}>{errorCarga}</p>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 rounded-lg text-sm font-semibold text-white"
          style={{ background: "var(--kipu-boton)" }}
        >
          Reintentar
        </button>
      </div>
    );
  } else if (!listo && !contenido) {
    pantalla = (
      <div className="h-screen flex items-center justify-center" style={{ background: "var(--kipu-bg)" }}>
        <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin"
             style={{ borderColor: "var(--kipu-accent)", borderTopColor: "transparent" }} />
      </div>
    );
  } else {
    pantalla = children;
  }

  // El tema envuelve también la carga y el error: quien usa modo oscuro no ve
  // un destello claro al abrir. En la app de las tiendas sigue al tema del sistema.
  return (
    <ThemeProvider
      attribute="data-theme"
      defaultTheme={ES_APP_NATIVA ? "system" : "light"}
      enableSystem={ES_APP_NATIVA}
    >
      <SWRProvider>
        {/* useAvisos() y useConfirmar() en cualquier pantalla (components/ui) */}
        <ProveedorAvisos>
          <ProveedorConfirmar>
            <PuenteNativo listo={listo || !!errorCarga || contenido} />
            {pantalla}
          </ProveedorConfirmar>
        </ProveedorAvisos>
      </SWRProvider>
    </ThemeProvider>
  );
}