"use client";

// Portada del Centro de Ayuda: buscador y artículos por categoría. Busca en el
// navegador sobre el índice (content/ayuda/articulos.ts): título, resumen,
// palabras clave y categoría, sin tildes ni mayúsculas. Cada palabra que se
// escribe tiene que aparecer en alguno de esos campos.

import { useMemo, useState } from "react";
import { Search, X } from "lucide-react";
import type { ArticuloAyuda, Categoria } from "@/content/ayuda/articulos";
import TarjetaArticulo from "./TarjetaArticulo";

const normalizar = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

export default function Buscador({ articulos, categorias }: { articulos: ArticuloAyuda[]; categorias: Categoria[] }) {
  const [q, setQ] = useState("");

  // Texto donde se busca cada artículo (se arma una vez)
  const indice = useMemo(() => {
    const nombreCat = Object.fromEntries(categorias.map((c) => [c.id, c.nombre]));
    return articulos.map((a) => ({
      articulo: a,
      texto: normalizar([a.titulo, a.resumen, nombreCat[a.categoria], ...a.palabras].join(" ")),
    }));
  }, [articulos, categorias]);

  const palabras   = normalizar(q).split(/\s+/).filter(Boolean);
  const resultados = palabras.length
    ? indice.filter((i) => palabras.every((p) => i.texto.includes(p))).map((i) => i.articulo)
    : null;

  return (
    <div className="space-y-8">
      <div className="relative">
        <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none"
                style={{ color: "var(--kipu-subtle)" }} />
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Busca tu duda: firma, nota de crédito, IVA…"
          aria-label="Buscar en el Centro de Ayuda"
          className="w-full rounded-xl pl-11 pr-10 py-3 text-sm outline-none focus:ring-2"
          style={{ background: "var(--kipu-surface)", border: "1px solid var(--kipu-border)", color: "var(--kipu-text)" }}
        />
        {q && (
          <button type="button" onClick={() => setQ("")} aria-label="Borrar búsqueda"
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1" style={{ color: "var(--kipu-subtle)" }}>
            <X size={16} />
          </button>
        )}
      </div>

      {resultados ? (
        <section className="space-y-2" aria-live="polite">
          <p className="text-xs" style={{ color: "var(--kipu-subtle)" }}>
            {resultados.length === 0
              ? "No encontramos artículos con esas palabras. Prueba con otras o revisa las categorías."
              : `${resultados.length} artículo${resultados.length === 1 ? "" : "s"}`}
          </p>
          {resultados.map((a) => <TarjetaArticulo key={a.slug} articulo={a} />)}
          {resultados.length === 0 && (
            <button type="button" onClick={() => setQ("")} className="text-sm underline underline-offset-2"
                    style={{ color: "var(--kipu-accent)" }}>
              Ver todas las categorías
            </button>
          )}
        </section>
      ) : (
        // Solo las categorías que ya tienen artículos
        categorias.map((c) => {
          const lista = articulos.filter((a) => a.categoria === c.id);
          if (lista.length === 0) return null;
          return (
            <section key={c.id} id={c.id} className="space-y-2 scroll-mt-20">
              <div>
                <h2 className="text-base font-bold" style={{ color: "var(--kipu-text)" }}>{c.nombre}</h2>
                <p className="text-xs" style={{ color: "var(--kipu-subtle)" }}>{c.descripcion}</p>
              </div>
              {lista.map((a) => <TarjetaArticulo key={a.slug} articulo={a} />)}
            </section>
          );
        })
      )}
    </div>
  );
}
