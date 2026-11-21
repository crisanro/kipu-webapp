// mdx-components.tsx — estilos de los artículos en MDX (content/ayuda y content/aprende).
// Lo exige @next/mdx con App Router. Usa los colores del tema (--kipu-*), así
// funciona en claro y oscuro sin plugins de tipografía.
//
// Además de Markdown, los artículos pueden usar:
//   <Nota>…</Nota>               recuadro informativo
//   <Nota tipo="aviso">…</Nota>  recuadro de advertencia
//   <Tabla columnas={[…]} filas={[[…]]} />  tabla (Markdown no las trae sin remark-gfm)
// Ojo: las etiquetas HTML escritas a mano en el .mdx (<ul>, <table>) no toman
// estos estilos; solo lo escrito en Markdown y los componentes de aquí.
import type { MDXComponents } from "mdx/types";
import type { ReactNode } from "react";
import Link from "next/link";
import { AlertTriangle, Info } from "lucide-react";

function Nota({ tipo = "info", children }: { tipo?: "info" | "aviso"; children: ReactNode }) {
  const color = tipo === "aviso" ? "var(--kipu-warning)" : "var(--kipu-accent)";
  const Icono = tipo === "aviso" ? AlertTriangle : Info;
  return (
    <div
      className="my-5 flex items-start gap-3 rounded-xl px-4 py-3 text-sm [&>div>p]:my-0"
      style={{
        background: `color-mix(in srgb, ${color} 8%, transparent)`,
        border:     `1px solid color-mix(in srgb, ${color} 25%, transparent)`,
        color:      "var(--kipu-text)",
      }}
    >
      <Icono size={16} className="shrink-0 mt-0.5" style={{ color }} />
      <div className="min-w-0">{children}</div>
    </div>
  );
}

/** Tabla simple (sin remark-gfm): <Tabla columnas={["A", "B"]} filas={[["1", "2"]]} /> */
function Tabla({ columnas, filas }: { columnas: string[]; filas: (string | number)[][] }) {
  const celda = "py-2 px-3 text-left";
  const borde = { borderBottom: "1px solid var(--kipu-border)" };
  return (
    <div className="my-5 overflow-x-auto rounded-xl" style={{ border: "1px solid var(--kipu-border)" }}>
      <table className="w-full text-sm border-collapse">
        <thead style={{ background: "var(--kipu-surface)" }}>
          <tr>
            {columnas.map((c) => (
              <th key={c} className={`${celda} font-semibold`} style={{ ...borde, color: "var(--kipu-text)" }}>{c}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {filas.map((fila, i) => (
            <tr key={i}>
              {fila.map((v, j) => (
                <td key={j} className={celda}
                    style={{ ...(i < filas.length - 1 ? borde : {}), color: "var(--kipu-muted)" }}>{v}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const components: MDXComponents = {
  h2: (props) => (
    <h2 className="mt-8 mb-3 text-lg font-bold scroll-mt-20" style={{ color: "var(--kipu-text)" }} {...props} />
  ),
  h3: (props) => (
    <h3 className="mt-6 mb-2 text-base font-semibold scroll-mt-20" style={{ color: "var(--kipu-text)" }} {...props} />
  ),
  p: (props) => (
    <p className="my-3 text-[15px] leading-relaxed" style={{ color: "var(--kipu-muted)" }} {...props} />
  ),
  ul: (props) => <ul className="my-3 pl-5 list-disc space-y-1.5 text-[15px]" style={{ color: "var(--kipu-muted)" }} {...props} />,
  ol: (props) => <ol className="my-3 pl-5 list-decimal space-y-1.5 text-[15px]" style={{ color: "var(--kipu-muted)" }} {...props} />,
  li: (props) => <li className="leading-relaxed pl-1" {...props} />,
  strong: (props) => <strong className="font-semibold" style={{ color: "var(--kipu-text)" }} {...props} />,
  hr: () => <hr className="my-8" style={{ borderColor: "var(--kipu-border)" }} />,
  code: (props) => (
    <code className="px-1.5 py-0.5 rounded text-[13px]"
          style={{ background: "color-mix(in srgb, var(--kipu-text) 7%, transparent)", color: "var(--kipu-text)" }}
          {...props} />
  ),
  blockquote: (props) => (
    <blockquote className="my-4 pl-4 italic" style={{ borderLeft: "3px solid var(--kipu-border)", color: "var(--kipu-muted)" }} {...props} />
  ),
  // Enlaces del panel (/configuracion): navegación interna. Los de afuera, en otra pestaña.
  a: ({ href = "", ...props }) => {
    const estilo = { color: "var(--kipu-accent)" };
    const clase  = "font-medium underline underline-offset-2";
    return href.startsWith("/")
      ? <Link href={href} className={clase} style={estilo} {...props} />
      : <a href={href} target="_blank" rel="noopener noreferrer" className={clase} style={estilo} {...props} />;
  },
  Nota,
  Tabla,
};

export function useMDXComponents(): MDXComponents {
  return components;
}
