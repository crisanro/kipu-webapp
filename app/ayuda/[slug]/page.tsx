// app/ayuda/[slug]/page.tsx — un artículo del Centro de Ayuda.
// Las páginas se generan al compilar (generateStaticParams), también en el
// export de la app nativa; un slug que no está en el índice da 404.
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import BloqueSoporte from "@/components/ayuda/BloqueSoporte";
import TarjetaArticulo from "@/components/ayuda/TarjetaArticulo";
import { ARTICULOS, articuloPorSlug, categoria } from "@/content/ayuda/articulos";

type Props = { params: Promise<{ slug: string }> };

export const dynamicParams = false;

export function generateStaticParams() {
  return ARTICULOS.map((a) => ({ slug: a.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const articulo = articuloPorSlug((await params).slug);
  return articulo ? { title: articulo.titulo, description: articulo.resumen } : {};
}

export default async function ArticuloAyudaPage({ params }: Props) {
  const { slug } = await params;
  const articulo = articuloPorSlug(slug);
  if (!articulo) notFound();

  const { default: Contenido } = await import(`@/content/ayuda/${slug}.mdx`);
  const cat          = categoria(articulo.categoria);
  const relacionados = ARTICULOS.filter((a) => a.categoria === articulo.categoria && a.slug !== slug);

  return (
    <article>
      <nav className="flex items-center gap-1 text-xs mb-4" aria-label="Ruta" style={{ color: "var(--kipu-subtle)" }}>
        <Link href="/ayuda" className="flex items-center gap-1 hover:underline">
          <ChevronLeft size={14} /> Centro de Ayuda
        </Link>
        <span>/</span>
        <Link href={`/ayuda#${cat.id}`} className="hover:underline">{cat.nombre}</Link>
      </nav>

      <h1 className="text-2xl font-bold" style={{ color: "var(--kipu-text)" }}>{articulo.titulo}</h1>
      <p className="text-sm mt-2" style={{ color: "var(--kipu-subtle)" }}>{articulo.resumen}</p>

      <div className="mt-6 pt-2" style={{ borderTop: "1px solid var(--kipu-border)" }}>
        <Contenido />
      </div>

      {relacionados.length > 0 && (
        <section className="mt-10 space-y-2">
          <h2 className="text-sm font-semibold" style={{ color: "var(--kipu-text)" }}>Más sobre {cat.nombre.toLowerCase()}</h2>
          {relacionados.map((a) => <TarjetaArticulo key={a.slug} articulo={a} />)}
        </section>
      )}

      <BloqueSoporte />
    </article>
  );
}
