// lib/useAtajos.ts
// Atajos de teclado para la compu (en el celular no hacen nada):
//
//   useAtajos({
//     "/":      () => buscador.current?.focus(),
//     "n":      () => router.push("/documentos/emitir/fac"),
//     "j":      bajar,  "ArrowDown": bajar,
//     "k":      subir,  "ArrowUp":   subir,
//     "Enter":  abrir,
//     "Escape": cerrarPanel,
//   });
//
// Reglas:
//   - Mientras se escribe en un campo no se dispara nada, salvo Escape, que
//     saca el foco del campo (así "Esc" sale del buscador y el siguiente cierra).
//   - Con una hoja o diálogo abierto (role="dialog") no se dispara nada: la
//     hoja maneja sus teclas.
//   - Con Ctrl, Cmd o Alt no se dispara nada (no pisa los atajos del navegador).
//   - Solo con mouse o trackpad (pointer: fine): en el celular no hay teclado físico.

"use client";

import { useEffect, useRef } from "react";

export type Atajos = Partial<Record<string, (e: KeyboardEvent) => void>>;

function escribiendo(el: EventTarget | null): el is HTMLElement {
  if (!(el instanceof HTMLElement)) return false;
  const tag = el.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || el.isContentEditable;
}

export function useAtajos(atajos: Atajos, activo = true) {
  // Lo último de los atajos, sin volver a registrar el listener en cada render
  const ref = useRef(atajos);
  useEffect(() => { ref.current = atajos; });

  useEffect(() => {
    if (!activo) return;
    if (typeof window === "undefined" || !window.matchMedia("(pointer: fine)").matches) return;

    const alPresionar = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.ctrlKey || e.metaKey || e.altKey || e.isComposing) return;
      if (document.querySelector('[role="dialog"][aria-modal="true"]')) return;

      if (escribiendo(e.target)) {
        if (e.key === "Escape") { e.target.blur(); e.preventDefault(); }
        return;
      }

      // Con el foco en un botón o enlace (navegando con Tab), Enter es de ese botón
      if (e.key === "Enter" && e.target instanceof HTMLElement &&
          e.target.closest("a, button, summary, [role='button']")) return;

      const accion = ref.current[e.key];
      if (!accion) return;
      e.preventDefault();
      accion(e);
    };

    window.addEventListener("keydown", alPresionar);
    return () => window.removeEventListener("keydown", alPresionar);
  }, [activo]);
}
