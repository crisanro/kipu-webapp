// components/ui/Interruptor.tsx
// Interruptor on/off (como los de Ajustes del teléfono): toda la fila se toca.
// Por dentro es un checkbox con role="switch" (lectores de pantalla y teclado).
//
//   <Interruptor etiqueta="Emito retenciones" descripcion="Muestra «Retención» en Emitir"
//                activo={valor} onCambio={setValor} />
//   <Interruptor inicio={<Icono />} tono="sandbox" className="min-h-13 px-4" … />

"use client";

import type { ReactNode } from "react";
import { cn } from "./cn";

const TONOS = { acento: "bg-acento", exito: "bg-exito", sandbox: "bg-sandbox" } as const;

export default function Interruptor({
  etiqueta, descripcion, activo, onCambio, deshabilitado, tono = "acento", inicio, className,
}: {
  etiqueta:       ReactNode;
  descripcion?:   ReactNode;
  activo:         boolean;
  onCambio:       (activo: boolean) => void;
  deshabilitado?: boolean;
  /** Color encendido. */
  tono?:          keyof typeof TONOS;
  /** Ícono o adorno a la izquierda. */
  inicio?:        ReactNode;
  className?:     string;
}) {
  return (
    <label className={cn(
      "flex min-h-11 cursor-pointer items-center gap-3",
      deshabilitado && "cursor-not-allowed opacity-60",
      className,
    )}>
      {inicio}
      <span className="min-w-0 flex-1 py-2">
        <span className="block text-sm text-texto">{etiqueta}</span>
        {descripcion && <span className="mt-0.5 block text-xs text-sutil">{descripcion}</span>}
      </span>
      <input
        type="checkbox"
        role="switch"
        checked={activo}
        disabled={deshabilitado}
        onChange={(e) => onCambio(e.target.checked)}
        className="peer sr-only"
      />
      <span aria-hidden className={cn(
        "relative h-7 w-12 shrink-0 rounded-full transition-colors duration-(--duracion-base)",
        "peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-acento",
        activo ? TONOS[tono] : "bg-borde",
      )}>
        <span className={cn(
          "absolute top-0.5 size-6 rounded-full bg-white shadow transition-[left] duration-(--duracion-base) ease-estandar",
          activo ? "left-[22px]" : "left-0.5",
        )} />
      </span>
    </label>
  );
}
