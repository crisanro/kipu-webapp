// components/ui/PanelDetalle.tsx
// Columna derecha de "lista y detalle lado a lado" en pantallas de 1280 px o
// más (Documentos, Recibidos): el detalle se abre aquí sin perder la lista.
// Pegada arriba, con su propio desplazamiento; abajo de 1280 px no se ve
// (ahí tocar una fila abre la pantalla del detalle, como siempre).
//
//   <PanelDetalle titulo="Comprobante" hrefCompleto={rutas.documento(id)} onCerrar={cerrar}>
//     <DetalleDocumento id={id} enPanel />
//   </PanelDetalle>

"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { Maximize2, X } from "lucide-react";
import BotonIcono from "./BotonIcono";
import { cn } from "./cn";

export default function PanelDetalle({ titulo, hrefCompleto, onCerrar, children, className }: {
  titulo:        ReactNode;
  /** La pantalla completa del detalle (para verlo solo o compartir el enlace). */
  hrefCompleto?: string;
  onCerrar:      () => void;
  children:      ReactNode;
  className?:    string;
}) {
  return (
    <aside
      aria-label={typeof titulo === "string" ? titulo : "Detalle"}
      className={cn(
        "sticky top-0 hidden h-dvh w-[40%] max-w-[46rem] shrink-0 flex-col border-l border-borde bg-fondo xl:flex",
        className,
      )}
    >
      <header className="flex h-14 shrink-0 items-center gap-1 border-b border-borde bg-superficie px-3">
        <h2 className="min-w-0 flex-1 truncate px-1 text-sm font-semibold text-texto">{titulo}</h2>
        {hrefCompleto && (
          <Link
            href={hrefCompleto}
            aria-label="Abrir en pantalla completa"
            title="Abrir en pantalla completa"
            className="inline-flex size-9 items-center justify-center rounded-lg text-tenue transition-colors hover:bg-presionado hover:text-texto"
          >
            <Maximize2 size={16} aria-hidden />
          </Link>
        )}
        <BotonIcono etiqueta="Cerrar (Esc)" icono={<X size={18} />} onClick={onCerrar} />
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
    </aside>
  );
}
