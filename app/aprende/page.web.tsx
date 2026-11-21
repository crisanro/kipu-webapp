// app/aprende/page.web.tsx — portada de Aprende: todos los artículos.
import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { ARTICULOS_APRENDE } from "@/content/aprende/articulos";

export const metadata: Metadata = {
  alternates: { canonical: "/aprende" },
};

export default function AprendePage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: "var(--kipu-text)" }}>Impuestos en Ecuador, explicados fácil</h1>
        <p className="text-sm mt-1" style={{ color: "var(--kipu-subtle)" }}>
          Lo que necesitas saber del IVA, el RUC y tus declaraciones al SRI, sin palabras raras.
        </p>
      </div>

      <section className="space-y-2">
        {ARTICULOS_APRENDE.map((a) => (
          <Link
            key={a.slug}
            href={`/aprende/${a.slug}`}
            className="group flex items-center gap-3 rounded-xl px-4 py-3 transition-colors hover:bg-[color-mix(in_srgb,var(--kipu-text)_4%,transparent)]"
            style={{ background: "var(--kipu-surface)", border: "1px solid var(--kipu-border)" }}
          >
            <div className="flex-1 min-w-0">
              <h2 className="text-sm font-semibold" style={{ color: "var(--kipu-text)" }}>{a.titulo}</h2>
              <p className="text-xs mt-0.5" style={{ color: "var(--kipu-subtle)" }}>{a.resumen}</p>
            </div>
            <ChevronRight size={16} className="shrink-0 transition-transform group-hover:translate-x-0.5"
                          style={{ color: "var(--kipu-subtle)" }} />
          </Link>
        ))}
      </section>
    </div>
  );
}
