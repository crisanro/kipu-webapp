// components/ui/Esqueleto.tsx
// Mientras carga: bloques grises que laten con la forma de lo que va a llegar,
// en vez de un spinner a pantalla completa. Se siente más rápido y no salta.
//
//   <EsqueletoFilas filas={6} />          // un listado
//   <Esqueleto className="h-6 w-32" />    // cualquier bloque

import { cn } from "./cn";

export function Esqueleto({ className }: { className?: string }) {
  return <span aria-hidden className={cn("block animate-pulse rounded-md bg-presionado", className)} />;
}

/**
 * Pantalla de detalle cargando: la tarjeta de arriba y unas filas. En el panel
 * lateral (enPanel) sin el ancho máximo de página.
 *   if (res.cargando) return <EsqueletoDetalle enPanel={enPanel} />;
 */
export function EsqueletoDetalle({ enPanel = false, alto = "h-48", filas = 4, ancho = "max-w-3xl" }: {
  enPanel?: boolean;
  /** Alto de la tarjeta de arriba (clase de Tailwind), según lo que llega. */
  alto?:    string;
  filas?:   number;
  ancho?:   string;
}) {
  return (
    <div className={enPanel ? "space-y-4 p-4" : cn("mx-auto space-y-4 p-4 md:p-6", ancho)} aria-busy="true">
      <Esqueleto className={cn(alto, "rounded-2xl")} />
      <EsqueletoFilas filas={filas} />
    </div>
  );
}

/** Filas con la forma de FilaLista (título, subtítulo, monto y estado). */
export function EsqueletoFilas({ filas = 6, className }: { filas?: number; className?: string }) {
  return (
    <div
      role="status"
      aria-label="Cargando"
      className={cn(
        "divide-y divide-borde overflow-hidden border-y border-borde bg-superficie -mx-4 sm:mx-0 sm:rounded-xl sm:border-x",
        className,
      )}
    >
      {Array.from({ length: filas }, (_, i) => (
        <div key={i} className="flex min-h-16 items-center gap-3 px-4 py-3">
          <div className="min-w-0 flex-1 space-y-2">
            <Esqueleto className={cn("h-3.5", i % 3 === 0 ? "w-3/5" : i % 3 === 1 ? "w-2/3" : "w-1/2")} />
            <Esqueleto className="h-3 w-2/5" />
          </div>
          <div className="flex flex-col items-end gap-2">
            <Esqueleto className="h-3.5 w-16" />
            <Esqueleto className="h-4 w-20 rounded-full" />
          </div>
        </div>
      ))}
    </div>
  );
}
