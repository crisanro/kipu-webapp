// components/ui/Paginacion.tsx — barra de páginas de una lista que pagina el servidor
//
//   <Paginacion info={respuesta.pagination} enPantalla={docs.length} cargando={cargando} onCambio={irAPagina} />
//
// Con una sola página no se muestra.
import { ChevronLeft, ChevronRight } from "lucide-react";

/** Lo que el backend devuelve en `pagination`. */
export interface InfoPaginacion {
  page:        number;
  limit:       number;
  total_items: number;
  total_pages: number;
  has_next:    boolean;
  has_prev:    boolean;
}

const BOTON = "flex items-center gap-1 rounded-lg border border-borde bg-superficie px-3 py-1.5 text-xs font-semibold text-texto transition-colors disabled:opacity-40";

export default function Paginacion({ info, enPantalla, cargando, onCambio, que = "comprobantes" }: {
  info:       InfoPaginacion | null | undefined;
  /** Cuántos se ven en esta página. */
  enPantalla: number;
  cargando?:  boolean;
  onCambio:   (pagina: number) => void;
  /** Qué se cuenta: "Mostrando 25 de 80 comprobantes". */
  que?:       string;
}) {
  if (!info || info.total_pages <= 1) return null;
  return (
    <div className="flex flex-col items-center justify-between gap-3 rounded-xl border border-borde bg-superficie px-4 py-3 sm:flex-row">
      <p className="text-xs text-sutil">
        Mostrando <span className="font-semibold text-texto">{enPantalla}</span> de{" "}
        <span className="font-semibold text-texto">{info.total_items}</span> {que}
      </p>
      <div className="flex items-center gap-2">
        <button type="button" className={BOTON} disabled={!info.has_prev || cargando}
                onClick={() => onCambio(Math.max(info.page - 1, 1))}>
          <ChevronLeft size={14} /> Anterior
        </button>
        <span className="px-2 text-xs font-medium text-sutil">
          Página {info.page} de {info.total_pages}
        </span>
        <button type="button" className={BOTON} disabled={!info.has_next || cargando}
                onClick={() => onCambio(Math.min(info.page + 1, info.total_pages))}>
          Siguiente <ChevronRight size={14} />
        </button>
      </div>
    </div>
  );
}
