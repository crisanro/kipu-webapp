// components/ui/Hoja.tsx
// La ventana de la app. En el celular sube desde abajo (bottom sheet) con un asa
// para arrastrarla y cerrarla; en la compu es un diálogo centrado. En ambos:
// Escape cierra (solo la de arriba si hay varias), el foco queda adentro y vuelve
// a donde estaba al cerrar, el fondo no se desplaza y respeta el área segura.
//
//   <Hoja abierta={abierta} onCerrar={() => setAbierta(false)} titulo="Nuevo producto"
//         pie={<><Boton variante="secundario" onClick={cerrar}>Cancelar</Boton>
//                <Boton onClick={guardar}>Guardar</Boton></>}>
//     …formulario…
//   </Hoja>
//
// En el pie, el primero es el secundario: en la compu queda a la izquierda y en el
// celular abajo (el principal, arriba y al alcance del pulgar).
// El botón atrás de Android cierra la hoja de arriba (lib/botonAtras.ts).

"use client";

import {
  useEffect, useId, useRef, useState, useSyncExternalStore,
  type PointerEvent as EventoPuntero, type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { useCapaAtras } from "@/lib/botonAtras";
import BotonIcono from "./BotonIcono";
import { cn } from "./cn";

const DURACION_SALIDA_MS = 300;          // = --duracion-lenta
const CIERRE_POR_ARRASTRE_PX = 120;

/** true solo en el navegador (sin desajustes al hidratar el export estático). */
const suscribirNada = () => () => {};
export function useEsCliente(): boolean {
  return useSyncExternalStore(suscribirNada, () => true, () => false);
}

// Hojas abiertas, la última arriba: Escape y Tab solo los atiende esa
const pila: string[] = [];
// Varias hojas abiertas bloquean el desplazamiento del fondo una sola vez
let bloqueos = 0;
let overflowPrevio = "";

const ANCHOS = {
  sm: "sm:max-w-sm",
  md: "sm:max-w-lg",
  lg: "sm:max-w-2xl",
  xl: "sm:max-w-4xl",
} as const;

const ENFOCABLES = 'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

export interface HojaProps {
  abierta:      boolean;
  onCerrar:     () => void;
  titulo:       ReactNode;
  descripcion?: ReactNode;
  children?:    ReactNode;
  /** Botones de acción, fijos abajo (no se desplazan con el contenido). */
  pie?:         ReactNode;
  /** Ancho en la compu (en el celular siempre ocupa todo el ancho). */
  tamano?:      keyof typeof ANCHOS;
  /** false: no se cierra con el fondo, Escape, la X ni arrastrando (p. ej. mientras guarda). */
  cerrable?:    boolean;
  className?:   string;
}

export default function Hoja({
  abierta, onCerrar, titulo, descripcion, children, pie, tamano = "md", cerrable = true, className,
}: HojaProps) {
  const esCliente = useEsCliente();
  const id        = useId();
  const tituloId  = `${id}-titulo`;
  const descId    = descripcion ? `${id}-desc` : undefined;
  const panelRef  = useRef<HTMLDivElement>(null);

  // Lo último de las props, para los listeners sin volver a registrarlos
  const onCerrarRef = useRef(onCerrar);
  const cerrableRef = useRef(cerrable);
  useEffect(() => { onCerrarRef.current = onCerrar; cerrableRef.current = cerrable; });

  // Botón atrás de Android: cierra esta hoja antes de navegar (si no es cerrable, no hace nada)
  useCapaAtras(abierta, () => { if (cerrableRef.current) onCerrarRef.current(); });

  // Sigue montada mientras dura la animación de salida
  const [abiertaAntes, setAbiertaAntes] = useState(abierta);
  const [saliendo, setSaliendo]         = useState(false);
  if (abierta !== abiertaAntes) {
    setAbiertaAntes(abierta);
    setSaliendo(!abierta);
  }
  useEffect(() => {
    if (!saliendo) return;
    const t = setTimeout(() => setSaliendo(false), DURACION_SALIDA_MS);
    return () => clearTimeout(t);
  }, [saliendo]);

  // Teclado (Escape, Tab atrapado), foco y bloqueo del fondo mientras está abierta
  useEffect(() => {
    if (!abierta) return;
    pila.push(id);
    const previo = document.activeElement as HTMLElement | null;

    if (bloqueos++ === 0) {
      overflowPrevio = document.body.style.overflow;
      document.body.style.overflow = "hidden";
    }

    // Foco: lo marcado con data-autofocus o el panel (no un input: abriría el teclado del celular)
    const t = setTimeout(() => {
      const panel = panelRef.current;
      const inicial = panel?.querySelector<HTMLElement>("[data-autofocus]") ?? panel;
      inicial?.focus({ preventScroll: true });
    }, 0);

    const alTeclear = (e: KeyboardEvent) => {
      if (pila[pila.length - 1] !== id) return;
      if (e.key === "Escape") {
        if (cerrableRef.current) { e.preventDefault(); onCerrarRef.current(); }
        return;
      }
      if (e.key !== "Tab" || !panelRef.current) return;
      const enfocables = Array.from(panelRef.current.querySelectorAll<HTMLElement>(ENFOCABLES))
        .filter(el => el.offsetParent !== null);
      if (enfocables.length === 0) { e.preventDefault(); return; }
      const primero = enfocables[0], ultimo = enfocables[enfocables.length - 1];
      const actual  = document.activeElement;
      if (e.shiftKey && (actual === primero || actual === panelRef.current)) { e.preventDefault(); ultimo.focus(); }
      else if (!e.shiftKey && actual === ultimo) { e.preventDefault(); primero.focus(); }
    };
    document.addEventListener("keydown", alTeclear);

    return () => {
      clearTimeout(t);
      document.removeEventListener("keydown", alTeclear);
      const i = pila.lastIndexOf(id);
      if (i >= 0) pila.splice(i, 1);
      if (--bloqueos === 0) document.body.style.overflow = overflowPrevio;
      if (previo && document.contains(previo)) previo.focus({ preventScroll: true });
    };
  }, [abierta, id]);

  // Arrastrar hacia abajo para cerrar (solo celular, desde el asa o el título)
  const inicio = useRef<{ y: number; t: number } | null>(null);
  const [arrastre, setArrastre] = useState(0);

  const alPresionar = (e: EventoPuntero<HTMLDivElement>) => {
    if (!cerrable || !window.matchMedia("(max-width: 639.98px)").matches) return;
    if ((e.target as HTMLElement).closest("button,a,input,select,textarea")) return;
    inicio.current = { y: e.clientY, t: performance.now() };
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const alMover = (e: EventoPuntero<HTMLDivElement>) => {
    if (inicio.current) setArrastre(Math.max(0, e.clientY - inicio.current.y));
  };
  const alSoltar = (e: EventoPuntero<HTMLDivElement>) => {
    if (!inicio.current) return;
    const dy = Math.max(0, e.clientY - inicio.current.y);
    const velocidad = dy / Math.max(1, performance.now() - inicio.current.t);   // px/ms
    inicio.current = null;
    setArrastre(0);
    if (dy > CIERRE_POR_ARRASTRE_PX || (dy > 30 && velocidad > 0.6)) onCerrar();
  };

  if (!esCliente || (!abierta && !saliendo)) return null;

  return createPortal(
    <div className="fixed inset-0 z-(--capa-hoja) flex items-end justify-center sm:items-center sm:p-4">
      {/* Fondo */}
      <div
        aria-hidden
        onClick={() => cerrable && onCerrar()}
        className={cn(
          "absolute inset-0 bg-black/50 transition-opacity duration-(--duracion-base) ease-estandar",
          abierta ? "opacity-100 starting:opacity-0" : "opacity-0",
        )}
      />

      {/* Panel */}
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={tituloId}
        aria-describedby={descId}
        tabIndex={-1}
        style={arrastre ? { transform: `translateY(${arrastre}px)`, transition: "none" } : undefined}
        className={cn(
          "relative flex w-full flex-col bg-superficie text-texto outline-none shadow-(--sombra-hoja)",
          "max-h-[92dvh] rounded-t-2xl sm:max-h-[85dvh] sm:rounded-2xl sm:shadow-(--sombra-flotante)",
          ANCHOS[tamano],
          "transition-[transform,opacity] duration-(--duracion-lenta) ease-enfasis sm:duration-(--duracion-base)",
          abierta
            ? "translate-y-0 starting:translate-y-full sm:scale-100 sm:opacity-100 sm:starting:translate-y-0 sm:starting:scale-95 sm:starting:opacity-0"
            : "translate-y-full sm:translate-y-0 sm:scale-95 sm:opacity-0",
          className,
        )}
      >
        {/* Asa + título: zona de arrastre en el celular */}
        <div
          onPointerDown={alPresionar}
          onPointerMove={alMover}
          onPointerUp={alSoltar}
          onPointerCancel={alSoltar}
          className="shrink-0 touch-none sm:touch-auto"
        >
          <div className="flex justify-center pt-2.5 pb-1 sm:hidden" aria-hidden>
            <span className="h-1.5 w-10 rounded-full bg-borde" />
          </div>
          <div className="flex items-start gap-3 px-5 pt-2 pb-3 sm:pt-5">
            <div className="min-w-0 flex-1">
              <h2 id={tituloId} className="text-base font-semibold leading-snug">{titulo}</h2>
              {descripcion && <p id={descId} className="mt-1 text-sm text-tenue">{descripcion}</p>}
            </div>
            {cerrable && (
              <BotonIcono etiqueta="Cerrar" icono={<X size={18} />} onClick={onCerrar} className="-mr-2 -mt-1.5" />
            )}
          </div>
        </div>

        {/* Contenido: lo único que se desplaza */}
        <div className={cn(
          "min-h-0 flex-1 overflow-y-auto overscroll-contain px-5",
          pie ? "pb-4" : "pb-[calc(1.25rem+var(--sa-bottom))] sm:pb-5",
        )}>
          {children}
        </div>

        {pie && (
          <div className={cn(
            "shrink-0 border-t border-borde px-5 pt-3 pb-[calc(0.75rem+var(--sa-bottom))] sm:pb-4",
            "flex flex-col-reverse gap-2 sm:flex-row sm:justify-end",
            "[&>*]:w-full sm:[&>*]:w-auto",
          )}>
            {pie}
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
