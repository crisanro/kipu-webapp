// lib/useRestaurarScroll.ts
// El panel se desplaza dentro de <main> (app/(dashboard)/layout.tsx), no en la
// ventana: Next no restaura esa posición. Con esto:
//   - al volver con "atrás" (flecha, botón de Android, navegador) la pantalla
//     queda donde estaba, p. ej. la lista en la fila que se tocó;
//   - al ir a una pantalla nueva empieza arriba (antes heredaba el desplazamiento
//     de la anterior, porque <main> es el mismo).
// Las posiciones se guardan por dirección (ruta + filtros) en sessionStorage.

"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

const CLAVE = "kipu:scroll";
const MAXIMO_GUARDADAS = 50;
const INTENTOS_RESTAURAR = 60;   // ~1 s de cuadros: la lista puede estar terminando de pintar

const direccion = () => window.location.pathname + window.location.search;

function leer(): Record<string, number> {
  try { return JSON.parse(sessionStorage.getItem(CLAVE) ?? "{}"); } catch { return {}; }
}

function guardar(clave: string, y: number) {
  try {
    const mapa = leer();
    delete mapa[clave];
    mapa[clave] = Math.round(y);
    const claves = Object.keys(mapa);
    for (const vieja of claves.slice(0, Math.max(0, claves.length - MAXIMO_GUARDADAS))) delete mapa[vieja];
    sessionStorage.setItem(CLAVE, JSON.stringify(mapa));
  } catch {}
}

// Lo marca el historial del navegador: la próxima pantalla llega por "atrás/adelante"
let porHistorial = false;

/** `el`: el <main> que se desplaza (se pasa el elemento, no un ref: aparece después del spinner). */
export function useRestaurarScroll(el: HTMLElement | null): void {
  const pathname = usePathname();

  useEffect(() => {
    const marcar = () => { porHistorial = true; };
    window.addEventListener("popstate", marcar);
    return () => window.removeEventListener("popstate", marcar);
  }, []);

  // Guardar mientras se desplaza (cada 100 ms como mucho)
  useEffect(() => {
    if (!el) return;
    let espera: ReturnType<typeof setTimeout> | undefined;
    let ultimo = { clave: "", y: 0 };
    const alDesplazar = () => {
      // Dirección y posición de este momento: si se toca una fila enseguida,
      // lo que se guarda es la lista, no la pantalla nueva
      ultimo = { clave: direccion(), y: el.scrollTop };
      if (espera) return;
      espera = setTimeout(() => { espera = undefined; guardar(ultimo.clave, ultimo.y); }, 100);
    };
    el.addEventListener("scroll", alDesplazar, { passive: true });
    return () => {
      el.removeEventListener("scroll", alDesplazar);
      if (espera) clearTimeout(espera);
    };
  }, [el]);

  // Cambió la pantalla: arriba, o donde estaba si se volvió por el historial
  useEffect(() => {
    if (!el) return;
    if (!porHistorial) { el.scrollTo({ top: 0 }); return; }
    porHistorial = false;

    const objetivo = leer()[direccion()] ?? 0;
    let intentos = 0;
    let cuadro = 0;
    const intentar = () => {
      el.scrollTo({ top: objetivo });
      if (Math.abs(el.scrollTop - objetivo) > 2 && intentos++ < INTENTOS_RESTAURAR) {
        cuadro = requestAnimationFrame(intentar);
      }
    };
    cuadro = requestAnimationFrame(intentar);
    return () => cancelAnimationFrame(cuadro);
  }, [pathname, el]);
}
