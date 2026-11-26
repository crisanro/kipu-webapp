// components/ui/ChipsFiltro.tsx
// Una fila de filtros que se desliza de lado (Todos · Autorizados · Devueltos…),
// en vez de dos o tres filas de botones apiladas que en el celular ocupaban
// media pantalla. Uno elegido a la vez.
//
//   <ChipsFiltro valor={estado} onCambio={setEstado} etiqueta="Estado"
//                opciones={[{ valor: "TODOS", etiqueta: "Todos" }, …]} />

"use client";

import { cn } from "./cn";

export interface OpcionChip { valor: string; etiqueta: string; cantidad?: number }

export default function ChipsFiltro({ opciones, valor, onCambio, etiqueta, className }: {
  opciones:   OpcionChip[];
  valor:      string;
  onCambio:   (valor: string) => void;
  /** Qué se filtra, para lectores de pantalla ("Estado", "Tipo"). */
  etiqueta:   string;
  className?: string;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={etiqueta}
      className={cn("sin-barra -mx-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:px-0", className)}
    >
      {opciones.map(o => {
        const activo = o.valor === valor;
        return (
          <button
            key={o.valor}
            type="button"
            role="radio"
            aria-checked={activo}
            onClick={() => onCambio(o.valor)}
            className={cn(
              "inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full border px-3 text-xs font-medium tactil:h-9",
              "transition-colors duration-(--duracion-rapida) ease-estandar active:scale-[0.97]",
              activo
                ? "border-texto bg-texto text-superficie"
                : "border-borde bg-superficie text-tenue hover:text-texto",
            )}
          >
            {o.etiqueta}
            {o.cantidad !== undefined && (
              <span className={cn("tabular-nums", activo ? "opacity-70" : "text-sutil")}>{o.cantidad}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
