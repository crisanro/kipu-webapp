// components/ui/Vacio.tsx
// Pantalla de "no hay nada": qué pasa y qué hacer. Distinto texto si no hay
// datos todavía o si la búsqueda no encontró nada.
//
//   <Vacio icono={FileText} titulo="Sin comprobantes este mes"
//          descripcion="Emite tu primera factura." accion={<Boton …>Emitir</Boton>} />

import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "./cn";

export default function Vacio({ icono: Icono, titulo, descripcion, accion, className }: {
  icono:        LucideIcon;
  titulo:       ReactNode;
  descripcion?: ReactNode;
  accion?:      ReactNode;
  className?:   string;
}) {
  return (
    <div className={cn("flex flex-col items-center justify-center px-6 py-14 text-center", className)}>
      <span className="mb-4 inline-flex size-14 items-center justify-center rounded-2xl bg-presionado text-sutil">
        <Icono size={26} aria-hidden />
      </span>
      <p className="text-sm font-semibold text-texto">{titulo}</p>
      {descripcion && <p className="mt-1 max-w-xs text-sm text-tenue">{descripcion}</p>}
      {accion && <div className="mt-5">{accion}</div>}
    </div>
  );
}
