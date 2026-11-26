"use client";
// app/(dashboard)/documentos/_comun.tsx — lo que comparten las listas de
// comprobantes emitidos (documentos/page.tsx) y recibidos (recibidos/page.tsx):
// el período con su límite de un año, los atajos de teclado con el panel de la
// derecha, el botón Actualizar y la ayuda de atajos.

import { useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { RefreshCw } from "lucide-react";
import { hoyEC, inicioMesEC } from "@/lib/fecha";
import { useAtajos } from "@/lib/useAtajos";

// Lista y detalle lado a lado desde este ancho (components/ui/PanelDetalle.tsx)
const ANCHO_PANEL = "(min-width: 1280px)";
export const enPanel = () => window.matchMedia(ANCHO_PANEL).matches;

const MAXIMO_DIAS = 365;

function leerSesion(clave: string, porDefecto: string): string {
  try { return sessionStorage.getItem(clave) || porDefecto; }
  catch { return porDefecto; }
}
function guardarSesion(clave: string, valor: string) {
  try { sessionStorage.setItem(clave, valor); } catch {}
}

/**
 * Período de la lista: el de la URL (?fecha_inicio=), el último elegido en la
 * sesión o el mes en curso (solo hoy casi siempre salía vacío).
 * `alCambiar`: lo que pasa además al elegir otro (volver a la página 1).
 */
export function usePeriodo(lista: "emitidos" | "recibidos", alCambiar: () => void) {
  const params     = useSearchParams();
  const claveDesde = `kipu_${lista}_fecha_inicio`;
  const claveHasta = `kipu_${lista}_fecha_fin`;
  const [inicio, setInicio] = useState(() => params.get("fecha_inicio") || leerSesion(claveDesde, inicioMesEC()));
  const [fin,    setFin]    = useState(() => params.get("fecha_fin")    || leerSesion(claveHasta, hoyEC()));

  const dias = inicio && fin
    ? Math.ceil((new Date(fin).getTime() - new Date(inicio).getTime()) / (1000 * 60 * 60 * 24))
    : 0;

  const cambiar = (desde: string, hasta: string) => {
    guardarSesion(claveDesde, desde);
    guardarSesion(claveHasta, hasta);
    setInicio(desde);
    setFin(hasta);
    alCambiar();
  };

  /** false si pasa de un año: no se consulta y se avisa (AvisoRango). */
  const valido = dias <= MAXIMO_DIAS;
  return { inicio, fin, valido, cambiar };
}

export function AvisoRango({ valido }: { valido: boolean }) {
  if (valido) return null;
  return (
    <p className="text-xs font-medium text-alerta-texto">
      El rango máximo de consulta es de {MAXIMO_DIAS} días (1 año).
    </p>
  );
}

/**
 * Atajos de la lista: / buscar, n nuevo, j/k moverse, Enter abrir y Esc cerrar.
 * Abrir, en la compu ancha, muestra el comprobante en el panel de la derecha (`sel`);
 * más angosto, su pantalla. `alEscapar`: algo propio que cierra Esc antes de
 * desmarcar la fila (devuelve true si cerró algo).
 */
export function useNavegacionLista({ ids, sel, cambiarSel, rutaDe, nuevo, textoNuevo, alEscapar }: {
  ids:        string[];
  sel:        string;
  cambiarSel: (id: string) => void;
  rutaDe:     (id: string) => string;
  nuevo:      () => void;
  textoNuevo: string;
  alEscapar?: () => boolean;
}) {
  const router      = useRouter();
  const buscadorRef = useRef<HTMLInputElement>(null);
  const filas       = useRef<Map<string, HTMLElement>>(new Map());
  const [marcada, setMarcada] = useState(-1);   // fila marcada con j/k (-1: ninguna)

  const abrir = (id: string) => {
    if (enPanel()) cambiarSel(id);
    else router.push(rutaDe(id));
  };
  const mover = (paso: number) => {
    if (ids.length === 0) return;
    const actual = marcada >= 0 ? marcada : ids.indexOf(sel);
    const nueva  = Math.min(ids.length - 1, Math.max(0, actual + paso));
    setMarcada(nueva);
    filas.current.get(ids[nueva])?.scrollIntoView({ block: "nearest" });
    // Con el panel abierto, el detalle sigue a la fila marcada
    if (sel && enPanel()) cambiarSel(ids[nueva]);
  };
  useAtajos({
    "/":      () => buscadorRef.current?.focus(),
    "n":      nuevo,
    "j":      () => mover(1),  "ArrowDown": () => mover(1),
    "k":      () => mover(-1), "ArrowUp":   () => mover(-1),
    "Enter":  () => { const id = ids[marcada]; if (id) abrir(id); },
    "Escape": () => {
      if (sel) cambiarSel("");
      else if (!alEscapar?.()) setMarcada(-1);
    },
  }, true, { n: textoNuevo });

  /** ref de cada fila: así j/k la traen a la vista. */
  const refFila = (id: string) => (el: HTMLElement | null) => {
    if (el) filas.current.set(id, el); else filas.current.delete(id);
  };

  return { buscadorRef, marcada, setMarcada, abrir, refFila };
}

export function BotonActualizar({ onClick, girando, deshabilitado }: {
  onClick: () => void; girando: boolean; deshabilitado?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={deshabilitado}
      aria-label="Actualizar"
      title="Actualizar"
      className="inline-flex size-9 items-center justify-center rounded-full border border-borde bg-superficie text-tenue transition-colors hover:text-texto disabled:opacity-40 tactil:size-10"
    >
      {/* Gira mientras se actualiza por detrás (la lista guardada sigue a la vista) */}
      <RefreshCw size={16} className={girando ? "animate-spin" : undefined} />
    </button>
  );
}

/** Compu con mouse: los atajos, a la vista. `nuevo`: qué hace la n. */
export function AyudaAtajos({ nuevo }: { nuevo: string }) {
  return (
    <p className="hidden text-center text-[11px] text-sutil raton:lg:block">
      Atajos: <kbd className="font-mono">/</kbd> buscar · <kbd className="font-mono">n</kbd> {nuevo} ·{" "}
      <kbd className="font-mono">j</kbd> <kbd className="font-mono">k</kbd> moverse · <kbd className="font-mono">Enter</kbd> abrir ·{" "}
      <kbd className="font-mono">Esc</kbd> cerrar
    </p>
  );
}
