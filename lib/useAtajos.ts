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
//
// Los atajos de la pantalla activa se listan en la hoja de atajos ("?",
// components/shell/PaletaComandos.tsx). `textos` cambia el texto de alguno:
//   useAtajos({ "n": nueva }, true, { "n": "Nueva factura" });

"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";

export type Atajos = Partial<Record<string, (e: KeyboardEvent) => void>>;

// ── Lo que se ve en la hoja de atajos ────────────────────────────────────────

export interface AtajoVisible { teclas: string[]; texto: string }

// Texto por tecla si la página no da uno; las que van juntas, en una fila
const FILAS: { teclas: string[]; texto: string }[] = [
  { teclas: ["/"],                    texto: "Buscar en la lista" },
  { teclas: ["n"],                    texto: "Nuevo" },
  { teclas: ["j", "ArrowDown"],       texto: "Bajar en la lista" },
  { teclas: ["k", "ArrowUp"],         texto: "Subir en la lista" },
  { teclas: ["Enter"],                texto: "Abrir el marcado" },
  { teclas: ["Escape"],               texto: "Cerrar el panel o desmarcar" },
];

const SIN_ATAJOS: AtajoVisible[] = [];
let visibles: AtajoVisible[] = SIN_ATAJOS;
let dueno: object | null = null;
const oyentes = new Set<() => void>();
const avisar = () => oyentes.forEach(f => f());

function describir(atajos: Atajos, textos?: Partial<Record<string, string>>): AtajoVisible[] {
  const lista: AtajoVisible[] = [];
  for (const fila of FILAS) {
    const teclas = fila.teclas.filter(t => atajos[t]);
    if (teclas.length) lista.push({ teclas, texto: textos?.[teclas[0]] ?? fila.texto });
  }
  return lista;
}

/** Los atajos de la pantalla activa (para la hoja de atajos). */
export function useAtajosVisibles(): AtajoVisible[] {
  return useSyncExternalStore(
    (f) => { oyentes.add(f); return () => { oyentes.delete(f); }; },
    () => visibles,
    () => SIN_ATAJOS,
  );
}

function escribiendo(el: EventTarget | null): el is HTMLElement {
  if (!(el instanceof HTMLElement)) return false;
  const tag = el.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || el.isContentEditable;
}

export function useAtajos(atajos: Atajos, activo = true, textos?: Partial<Record<string, string>>) {
  // Lo último de los atajos, sin volver a registrar el listener en cada render
  const ref = useRef(atajos);
  useEffect(() => { ref.current = atajos; });

  // Para la hoja de atajos: qué teclas tiene esta pantalla (cambian poco: por clave)
  const firma = Object.keys(atajos).sort().join(" ") + "|" + JSON.stringify(textos ?? {});
  useEffect(() => {
    if (!activo) return;
    const yo = {};
    dueno = yo;
    visibles = describir(ref.current, textos);
    avisar();
    return () => {
      if (dueno !== yo) return;
      dueno = null;
      visibles = SIN_ATAJOS;
      avisar();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- firma resume atajos y textos
  }, [activo, firma]);

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
