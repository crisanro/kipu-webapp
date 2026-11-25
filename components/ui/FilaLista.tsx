// components/ui/FilaLista.tsx
// Fila de un listado en el celular: se toca entera (antes solo el número, en
// letra de 12 px). Título y subtítulo a la izquierda; monto y estado a la
// derecha. Mínimo 64 px de alto, con respuesta al toque.
//
//   <FilaLista href={rutas.documento(d.id)} titulo={d.razon_social}
//              subtitulo={`${tipo} ${d.numero_doc} · ${fecha}`}
//              fin={`$${fmt(d.importe_total)}`} finAbajo={<InsigniaSri estado={d.estado_sri} />} />

import type { ReactNode } from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { cn } from "./cn";

export interface FilaListaProps {
  titulo:     ReactNode;
  subtitulo?: ReactNode;
  /** Tercera línea opcional (p. ej. una nota o el vencimiento). */
  detalle?:   ReactNode;
  /** Ícono o avatar a la izquierda. */
  inicio?:    ReactNode;
  /** Arriba a la derecha: normalmente el monto. */
  fin?:       ReactNode;
  /** Abajo a la derecha: normalmente la insignia de estado. */
  finAbajo?:  ReactNode;
  href?:      string;
  onClick?:   () => void;
  /** Flecha a la derecha (por defecto, si la fila lleva a otra pantalla y no hay `fin`). */
  chevron?:   boolean;
  /** Atenuada (p. ej. anulada o inactiva). */
  apagada?:   boolean;
  className?: string;
}

export default function FilaLista({
  titulo, subtitulo, detalle, inicio, fin, finAbajo, href, onClick, chevron, apagada, className,
}: FilaListaProps) {
  const conFlecha = chevron ?? (!!href && !fin && !finAbajo);
  const clases = cn(
    "flex min-h-16 w-full items-center gap-3 px-4 py-3 text-left",
    (href || onClick) && "transition-colors duration-(--duracion-rapida) hover:bg-presionado active:bg-presionado",
    apagada && "opacity-60",
    className,
  );
  const contenido = (
    <>
      {inicio && <span className="shrink-0">{inicio}</span>}
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium text-texto">{titulo}</span>
        {subtitulo && <span className="mt-0.5 block truncate text-xs text-sutil">{subtitulo}</span>}
        {detalle && <span className="mt-0.5 block truncate text-xs text-tenue">{detalle}</span>}
      </span>
      {(fin || finAbajo) && (
        <span className="flex shrink-0 flex-col items-end gap-1">
          {fin && <span className="text-sm font-semibold tabular-nums text-texto">{fin}</span>}
          {finAbajo}
        </span>
      )}
      {conFlecha && <ChevronRight size={18} className="shrink-0 text-sutil" aria-hidden />}
    </>
  );

  if (href) return <Link href={href} className={clases}>{contenido}</Link>;
  if (onClick) return <button type="button" onClick={onClick} className={clases}>{contenido}</button>;
  return <div className={clases}>{contenido}</div>;
}

/** Contenedor de filas: tarjeta con separadores (en el celular, de borde a borde). */
export function GrupoFilas({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn(
      "divide-y divide-borde overflow-hidden border-y border-borde bg-superficie",
      "-mx-4 sm:mx-0 sm:rounded-xl sm:border-x",
      className,
    )}>
      {children}
    </div>
  );
}
