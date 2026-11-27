// lib/useLista.ts
// Listados que no se pierden al ir y volver de un detalle.
//
//   const { datos, cargando, actualizando, recargar } = useLista<Respuesta>(url);
//   const [filtros, cambiarFiltros] = useFiltrosUrl({ estado: "TODOS", page: "1" });
//
// - useLista: con SWR. Al volver, lo que ya se vio aparece al instante y se
//   actualiza por detrás (antes: spinner a pantalla completa y página 1). Al
//   cambiar de página o filtro, la lista anterior se queda hasta que llega la
//   nueva (sin parpadeo). Se vuelve a pedir al regresar a la pestaña o a la app.
//   La caché es por empresa y por sandbox: nunca se ve la lista de otra empresa.
// - useFiltrosUrl: los filtros viven en la URL (?estado=…&page=2), así "atrás"
//   vuelve a la lista tal como estaba. Se cambian con replace (no llenan el historial).

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import useSWR from "swr";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import api from "@/lib/api";
import { useAuthStore } from "@/store/auth.store";
import { useSandboxStore } from "@/store/sandbox.store";

type Clave = readonly [url: string, empresaId: number | null, sandbox: boolean];

const pedir = ([url]: Clave) => api.get(url).then((r) => r.data);

/** Cada cuánto se vuelve a pedir mientras `refrescarMientras` diga que sí. */
const REFRESCO_MS = 3000;

export function useLista<T>(url: string | null, opciones?: {
  /** Mientras devuelva true (p. ej. "la IA está analizando"), se vuelve a pedir cada 3 s. */
  refrescarMientras?: (datos: T | undefined) => boolean;
}) {
  const empresaId = useAuthStore((s) => s.empresa?.id ?? null);
  const sandbox   = useSandboxStore((s) => s.activo);
  const clave: Clave | null = url ? [url, empresaId, sandbox] : null;
  const refrescar = opciones?.refrescarMientras;

  const { data, error, isLoading, isValidating, mutate } = useSWR<T>(clave, pedir, {
    keepPreviousData:  true,   // cambia el filtro: se ve lo anterior hasta que llega lo nuevo
    revalidateIfStale: true,   // vuelve a la pantalla: lo guardado al instante y se actualiza detrás
    revalidateOnFocus: true,   // vuelve a la pestaña o a la app
    dedupingInterval:  refrescar ? 2000 : 5000,   // con refresco: menos que REFRESCO_MS, o lo junta con el anterior
    refreshInterval:   refrescar ? (d) => (refrescar(d) ? REFRESCO_MS : 0) : 0,
  });

  return {
    datos:        data,
    error,
    /** Primera carga, sin nada que mostrar todavía. */
    cargando:     isLoading && data === undefined,
    /** Hay datos a la vista y se están actualizando (o llegando los de otro filtro). */
    actualizando: isValidating && data !== undefined,
    /** Falló y no hay nada que mostrar (sin conexión, error del servidor): no es "lista vacía". */
    fallo:        !!error && data === undefined,
    recargar:     () => mutate(),
  };
}

/**
 * Filtros en la URL. `porDefecto` define qué filtros hay y su valor sin elegir
 * (ese valor no se escribe en la URL, para que quede limpia).
 */
export function useFiltrosUrl<F extends Record<string, string>>(porDefecto: F) {
  const router   = useRouter();
  const pathname = usePathname();
  const params   = useSearchParams();

  // Lo último de porDefecto (suele ser un literal nuevo en cada render)
  const defecto = useRef(porDefecto);
  useEffect(() => { defecto.current = porDefecto; });

  const filtros = Object.fromEntries(
    Object.entries(porDefecto).map(([k, v]) => [k, params.get(k) ?? v]),
  ) as F;

  const cambiar = useCallback((cambios: Partial<F>) => {
    const nuevos = new URLSearchParams(window.location.search);
    for (const [k, v] of Object.entries(cambios)) {
      if (v === undefined || v === "" || v === defecto.current[k]) nuevos.delete(k);
      else nuevos.set(k, String(v));
    }
    const qs = nuevos.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }, [router, pathname]);

  return [filtros, cambiar] as const;
}

/**
 * Búsqueda que filtra al instante mientras se escribe y queda en la URL (?q=)
 * al dejar de escribir: al volver del detalle sigue ahí (antes se perdía).
 *   const [query, setQuery] = useBusquedaUrl();
 *   useBusquedaUrl("q", { page: "" })   // al buscar, además vuelve a la página 1
 * Como useFiltrosUrl, necesita un <Suspense> encima (useSearchParams).
 */
export function useBusquedaUrl(clave = "q", ademas?: Record<string, string>, esperaMs = 400) {
  const [filtros, cambiar] = useFiltrosUrl({ [clave]: "" } as Record<string, string>);
  const [texto, setTexto]  = useState(filtros[clave]);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);
  const extra = useRef(ademas);

  const escribir = useCallback((valor: string) => {
    setTexto(valor);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => cambiar({ [clave]: valor.trim(), ...extra.current }), esperaMs);
  }, [cambiar, clave, esperaMs]);

  return [texto, escribir] as const;
}
