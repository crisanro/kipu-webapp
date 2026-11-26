// components/ui/TirarParaRefrescar.tsx
// Deslizar hacia abajo desde el tope de la lista para actualizarla (solo al
// dedo: con el mouse no hay gesto). La pantalla se desplaza dentro de <main>
// (app/(dashboard)/layout.tsx): el gesto empieza solo si <main> está arriba del todo.
//
//   <TirarParaRefrescar alRefrescar={lista.recargar}>…filas…</TirarParaRefrescar>

"use client";

import { useRef, useState, type ReactNode, type TouchEvent } from "react";
import { Loader2, RefreshCw } from "lucide-react";
import { vibrar } from "@/lib/nativo";
import { cn } from "./cn";

const UMBRAL_PX = 70;     // hay que tirar al menos esto para refrescar
const MAXIMO_PX = 110;
const RESISTENCIA = 0.5;  // el contenido baja la mitad de lo que baja el dedo

export default function TirarParaRefrescar({ alRefrescar, children, className }: {
  alRefrescar: () => Promise<unknown> | unknown;
  children:    ReactNode;
  className?:  string;
}) {
  const [tirado, setTirado]         = useState(0);
  const [refrescando, setRefrescando] = useState(false);
  const [arrastrando, setArrastrando] = useState(false);   // sin transición mientras sigue al dedo
  const inicioY  = useRef<number | null>(null);
  const avisado  = useRef(false);

  const desplazador = (el: HTMLElement | null) => el?.closest("main") ?? document.scrollingElement;

  const alTocar = (e: TouchEvent<HTMLDivElement>) => {
    if (refrescando) return;
    const cont = desplazador(e.currentTarget);
    inicioY.current = cont && cont.scrollTop <= 0 ? e.touches[0].clientY : null;
    avisado.current = false;
    setArrastrando(inicioY.current !== null);
  };

  const alMover = (e: TouchEvent<HTMLDivElement>) => {
    if (inicioY.current === null) return;
    const dy = e.touches[0].clientY - inicioY.current;
    if (dy <= 0) { setTirado(0); return; }
    const distancia = Math.min(dy * RESISTENCIA, MAXIMO_PX);
    setTirado(distancia);
    if (distancia >= UMBRAL_PX && !avisado.current) { avisado.current = true; void vibrar("ligera"); }
  };

  const alSoltar = async () => {
    if (inicioY.current === null) return;
    inicioY.current = null;
    setArrastrando(false);
    if (tirado < UMBRAL_PX) { setTirado(0); return; }
    setRefrescando(true);
    setTirado(UMBRAL_PX * 0.7);
    try { await alRefrescar(); } finally {
      setRefrescando(false);
      setTirado(0);
    }
  };

  const listo = tirado >= UMBRAL_PX;

  return (
    <div
      onTouchStart={alTocar}
      onTouchMove={alMover}
      onTouchEnd={alSoltar}
      onTouchCancel={alSoltar}
      className={cn("relative", className)}
    >
      {/* Indicador */}
      <div
        aria-hidden={!refrescando}
        role={refrescando ? "status" : undefined}
        aria-label={refrescando ? "Actualizando" : undefined}
        className="pointer-events-none absolute inset-x-0 top-0 flex justify-center"
        style={{ height: tirado, opacity: Math.min(1, tirado / UMBRAL_PX) }}
      >
        <span className="mt-2 inline-flex size-9 items-center justify-center rounded-full border border-borde bg-superficie text-acento shadow-(--sombra-flotante)">
          {refrescando
            ? <Loader2 size={18} className="animate-spin" />
            : <RefreshCw size={18} style={{ transform: `rotate(${tirado * 3}deg)` }} className={cn(listo && "text-acento")} />}
        </span>
      </div>
      <div
        style={{ transform: tirado ? `translateY(${tirado}px)` : undefined }}
        className={cn(!arrastrando && "transition-transform duration-(--duracion-base) ease-estandar")}
      >
        {children}
      </div>
    </div>
  );
}
