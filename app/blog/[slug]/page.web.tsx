// app/blog/[slug]/page.web.tsx — un artículo del blog.
// Se genera al compilar; un slug que no está en el índice da 404. Lleva los
// datos para Google (canónica, Open Graph y JSON-LD de tipo Article) y termina
// con la invitación a Kipu Al Día.
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import LlamadoAlDia from "@/components/blog/LlamadoAlDia";
import { ARTICULOS_BLOG, articuloBlog } from "@/content/blog/articulos";
import { REVISADO } from "@/content/datos-tributarios";
import { URL_SITIO } from "@/lib/config";

type Props = { params: Promise<{ slug: string }> };

export const dynamicParams = false;

export function generateStaticParams() {
  return ARTICULOS_BLOG.map((a) => ({ slug: a.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const a = articuloBlog((await params).slug);
  if (!a) return {};
  return {
    title:       a.titulo,
    description: a.resumen,
    alternates:  { canonical: `/blog/${a.slug}` },
    openGraph:   {
      type:         "article",
      title:        a.titulo,
      description:  a.resumen,
      url:          `/blog/${a.slug}`,
      modifiedTime: a.actualizado,
    },
  };
}

export default async function ArticuloBlogPage({ params }: Props) {
  const { slug } = await params;
  const articulo = articuloBlog(slug);
  if (!articulo) notFound();

  const { default: Contenido } = await import(`@/content/blog/${slug}.mdx`);

  // Datos estructurados para Google. "<" escapado: el texto no puede cerrar el <script>
  const jsonLd = JSON.stringify({
    "@context":       "https://schema.org",
    "@type":          "Article",
    headline:         articulo.titulo,
    description:      articulo.resumen,
    dateModified:     articulo.actualizado,
    inLanguage:       "es-EC",
    mainEntityOfPage: `${URL_SITIO}/blog/${slug}`,
    author:           { "@type": "Organization", name: "Kipu", url: URL_SITIO },
    publisher:        { "@type": "Organization", name: "Kipu", url: URL_SITIO },
  }).replace(/</g, "\\u003c");

  return (
    <article>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd }} />

      <nav className="text-xs mb-4" aria-label="Ruta" style={{ color: "var(--kipu-subtle)" }}>
        <Link href="/blog" className="inline-flex items-center gap-1 hover:underline">
          <ChevronLeft size={14} /> Blog
        </Link>
      </nav>

      <h1 className="text-2xl md:text-3xl font-bold leading-tight" style={{ color: "var(--kipu-text)" }}>{articulo.titulo}</h1>
      <p className="text-sm mt-2" style={{ color: "var(--kipu-subtle)" }}>{articulo.resumen}</p>

      <div className="mt-6 pt-2" style={{ borderTop: "1px solid var(--kipu-border)" }}>
        <Contenido />
      </div>

      <p className="mt-8 text-xs" style={{ color: "var(--kipu-subtle)" }}>
        Información general, revisada en {REVISADO}. Las normas del SRI cambian: para tu caso concreto,
        revisa tus obligaciones en el SRI o consulta a un contador.
      </p>

      <LlamadoAlDia />
    </article>
  );
}
