// components/ui/Seccion.tsx
// Sección que se pliega en los detalles (Cobro, Relacionados, Clave de acceso,
// Errores del SRI). Cerrada muestra un resumen a la derecha, así se sabe qué
// hay sin abrirla. Usa <details>: accesible y sin JavaScript.
//
//   <Seccion titulo="Cobro" icono={Wallet} resumen="Cobrado">…</Seccion>

import type { ReactNode } from "react";
import { ChevronDown, type LucideIcon } from "lucide-react";
import { cn } from "./cn";

export default function Seccion({ titulo, icono: Icono, resumen, abierta = false, children, className }: {
  titulo:     ReactNode;
  icono?:     LucideIcon;
  /** Se ve a la derecha con la sección cerrada (p. ej. "Cobrado", "2 documentos"). */
  resumen?:   ReactNode;
  abierta?:   boolean;
  children:   ReactNode;
  className?: string;
}) {
  return (
    <details open={abierta} className={cn("group overflow-hidden rounded-xl border border-borde bg-superficie", className)}>
      <summary className={cn(
        "flex min-h-12 cursor-pointer list-none items-center gap-3 px-4 py-3 select-none",
        "transition-colors hover:bg-presionado active:bg-presionado [&::-webkit-details-marker]:hidden",
      )}>
        {Icono && <Icono size={17} aria-hidden className="shrink-0 text-sutil" />}
        <span className="flex-1 text-sm font-semibold text-texto">{titulo}</span>
        {resumen && <span className="truncate text-xs text-sutil group-open:hidden">{resumen}</span>}
        <ChevronDown size={18} aria-hidden className="shrink-0 text-sutil transition-transform duration-(--duracion-base) group-open:rotate-180" />
      </summary>
      <div className="border-t border-borde px-4 py-3">{children}</div>
    </details>
  );
}
