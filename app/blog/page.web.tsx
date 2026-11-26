// app/blog/page.web.tsx — portada del blog: todos los artículos.
import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { ARTICULOS_BLOG } from "@/content/blog/articulos";

export const metadata: Metadata = {
  alternates: { canonical: "/blog" },
};

export default function BlogPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-texto">Tus dudas con el SRI, resueltas fácil</h1>
        <p className="text-sm mt-1 text-sutil">
          Respuestas cortas y claras a lo que todos nos preguntamos sobre el RUC, las declaraciones y los impuestos.
        </p>
      </div>

      <section className="space-y-2">
        {ARTICULOS_BLOG.map((a) => (
          <Link
            key={a.slug}
            href={`/blog/${a.slug}`}
            className="group flex items-center gap-3 rounded-xl px-4 py-3 transition-colors hover:bg-[color-mix(in_srgb,var(--kipu-text)_4%,transparent)]"
            style={{ background: "var(--kipu-surface)", border: "1px solid var(--kipu-border)" }}
          >
            <div className="flex-1 min-w-0">
              <h2 className="text-sm font-semibold text-texto">{a.titulo}</h2>
              <p className="text-xs mt-0.5 text-sutil">{a.resumen}</p>
            </div>
            <ChevronRight size={16} className="shrink-0 transition-transform group-hover:translate-x-0.5 text-sutil" />
          </Link>
        ))}
      </section>
    </div>
  );
}
