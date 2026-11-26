// Un artículo en una lista del Centro de Ayuda: título y resumen.
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import type { ArticuloAyuda } from "@/content/ayuda/articulos";

export default function TarjetaArticulo({ articulo }: { articulo: ArticuloAyuda }) {
  return (
    <Link
      href={`/ayuda/${articulo.slug}`}
      className="group flex items-center gap-3 rounded-xl px-4 py-3 transition-colors hover:bg-[color-mix(in_srgb,var(--kipu-text)_4%,transparent)]"
      style={{ background: "var(--kipu-surface)", border: "1px solid var(--kipu-border)" }}
    >
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-texto">{articulo.titulo}</p>
        <p className="text-xs mt-0.5 text-sutil">{articulo.resumen}</p>
      </div>
      <ChevronRight size={16} className="shrink-0 transition-transform group-hover:translate-x-0.5 text-sutil" />
    </Link>
  );
}
