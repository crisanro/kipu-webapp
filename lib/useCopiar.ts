// lib/useCopiar.ts — copiar al portapapeles, igual en toda la app
//
//   const { copiar, copiado } = useCopiar();
//   copiar(clave, "Clave de acceso copiada");     // con aviso
//   copiar(url, null, "nueva");                   // sin aviso; el botón mira copiado === "nueva"
//
// Si el teléfono o el navegador no dejan copiar, el texto sale en un aviso para
// copiarlo a mano (antes, en varios botones, no pasaba nada).
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useAvisos } from "@/components/ui/Avisos";

/** Cuánto se ve "Copiado" en el botón. */
const MARCA_MS = 2000;

export function useCopiar() {
  const avisos = useAvisos();
  const [copiado, setCopiado] = useState<string | null>(null);
  const reloj = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(reloj.current), []);

  /** `id`: qué botón marca "Copiado" (por defecto, el mismo texto). */
  const copiar = useCallback(async (texto: string, aviso?: string | null, id: string = texto) => {
    try {
      await navigator.clipboard.writeText(texto);
    } catch {
      avisos.info(texto);
      return false;
    }
    if (aviso) avisos.exito(aviso);
    setCopiado(id);
    clearTimeout(reloj.current);
    reloj.current = setTimeout(() => setCopiado(null), MARCA_MS);
    return true;
  }, [avisos]);

  return { copiar, copiado };
}
