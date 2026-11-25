// components/ui/Boton.tsx
// Botón de la app. Al dedo es más alto (44 px o más) que con el mouse; al
// presionarlo se hunde un poco, como en una app nativa; el hover solo existe
// donde hay mouse (Tailwind 4 lo limita a @media (hover: hover)).
//
//   <Boton onClick={guardar}>Guardar</Boton>
//   <Boton variante="secundario" icono={<Plus size={16} />}>Nuevo</Boton>
//   <Boton variante="peligro" cargando={borrando}>Eliminar</Boton>

import type { ComponentProps, ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "./cn";

export type VarianteBoton = "principal" | "secundario" | "fantasma" | "peligro";
export type TamanoBoton   = "sm" | "md" | "lg";

const VARIANTES: Record<VarianteBoton, string> = {
  principal:  "bg-boton text-sobre-acento hover:bg-boton-hover",
  secundario: "bg-superficie text-texto border border-borde hover:bg-presionado",
  fantasma:   "bg-transparent text-tenue hover:bg-presionado hover:text-texto",
  peligro:    "bg-peligro text-sobre-acento hover:opacity-90",
};

const TAMANOS: Record<TamanoBoton, string> = {
  sm: "h-8  px-3 text-xs   gap-1.5 rounded-lg tactil:h-10",
  md: "h-9  px-4 text-sm   gap-2   rounded-lg tactil:h-11",
  lg: "h-11 px-5 text-base gap-2   rounded-xl tactil:h-12",
};

export const clasesBoton = (variante: VarianteBoton = "principal", tamano: TamanoBoton = "md") => cn(
  "inline-flex items-center justify-center font-medium whitespace-nowrap select-none",
  "transition-[background-color,color,opacity,transform] duration-(--duracion-rapida) ease-estandar",
  "active:scale-[0.97] disabled:opacity-50 disabled:active:scale-100",
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-acento",
  VARIANTES[variante],
  TAMANOS[tamano],
);

export interface BotonProps extends ComponentProps<"button"> {
  variante?:      VarianteBoton;
  tamano?:        TamanoBoton;
  /** Muestra un spinner, deshabilita y avisa a lectores de pantalla (aria-busy). */
  cargando?:      boolean;
  icono?:         ReactNode;
  iconoDerecha?:  ReactNode;
  anchoCompleto?: boolean;
}

export default function Boton({
  variante = "principal", tamano = "md", cargando = false, icono, iconoDerecha,
  anchoCompleto = false, disabled, className, children, type = "button", ...resto
}: BotonProps) {
  return (
    <button
      type={type}
      disabled={disabled || cargando}
      aria-busy={cargando || undefined}
      className={cn(clasesBoton(variante, tamano), anchoCompleto && "w-full", className)}
      {...resto}
    >
      {cargando
        ? <Loader2 size={tamano === "lg" ? 18 : 16} className="animate-spin shrink-0" aria-hidden />
        : icono && <span className="shrink-0 inline-flex" aria-hidden>{icono}</span>}
      {children}
      {iconoDerecha && !cargando && <span className="shrink-0 inline-flex" aria-hidden>{iconoDerecha}</span>}
    </button>
  );
}
