// components/ui/BotonIcono.tsx
// Botón de solo ícono (cerrar, editar, copiar…). La etiqueta es obligatoria:
// es lo que lee el lector de pantalla y el tooltip con el mouse. Al dedo el área
// táctil es de 44 px aunque el ícono se vea chico.
//
//   <BotonIcono etiqueta="Cerrar" icono={<X size={18} />} onClick={cerrar} />

import type { ComponentProps, ReactNode } from "react";
import { cn } from "./cn";

type Variante = "fantasma" | "secundario" | "peligro";

const VARIANTES: Record<Variante, string> = {
  fantasma:   "text-tenue hover:bg-presionado hover:text-texto",
  secundario: "text-texto bg-superficie border border-borde hover:bg-presionado",
  peligro:    "text-peligro hover:bg-peligro-suave",
};

export interface BotonIconoProps extends Omit<ComponentProps<"button">, "children"> {
  etiqueta: string;
  icono:    ReactNode;
  variante?: Variante;
  tamano?:  "sm" | "md";
}

export default function BotonIcono({
  etiqueta, icono, variante = "fantasma", tamano = "md", className, type = "button", title, ...resto
}: BotonIconoProps) {
  return (
    <button
      type={type}
      aria-label={etiqueta}
      title={title ?? etiqueta}
      className={cn(
        "inline-flex items-center justify-center rounded-lg shrink-0 select-none",
        "transition-[background-color,color,transform] duration-(--duracion-rapida) ease-estandar",
        "active:scale-[0.94] disabled:opacity-40 disabled:active:scale-100",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-acento",
        tamano === "sm" ? "size-8 tactil:size-10" : "size-9 tactil:size-11",
        VARIANTES[variante],
        className,
      )}
      {...resto}
    >
      <span aria-hidden className="inline-flex">{icono}</span>
    </button>
  );
}
