// Términos de los servicios (Kipu Al Día, Kipu Renta): markdown sencillo
// (títulos, listas, tablas, negritas), sin HTML.

import type { ReactNode } from "react";

function enLinea(texto: string): ReactNode[] {
  return texto.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g).filter(Boolean).map((parte, i) => {
    if (parte.startsWith("**")) return <strong key={i} style={{ color: "var(--kipu-text)" }}>{parte.slice(2, -2)}</strong>;
    if (parte.startsWith("*")) return <em key={i}>{parte.slice(1, -1)}</em>;
    return parte;
  });
}

export default function TextoTerminos({ texto }: { texto: string }) {
  const bloques = texto.trim().split(/\n\s*\n/);
  return (
    <div className="space-y-3 text-sm leading-relaxed" style={{ color: "var(--kipu-muted)" }}>
      {bloques.map((bloque, i) => {
        const lineas = bloque.split("\n");
        if (bloque.startsWith("# "))
          return <h2 key={i} className="text-base font-bold" style={{ color: "var(--kipu-text)" }}>{bloque.slice(2)}</h2>;
        if (bloque.startsWith("## "))
          return <h3 key={i} className="text-sm font-bold pt-2" style={{ color: "var(--kipu-text)" }}>{bloque.slice(3)}</h3>;
        if (lineas.every(l => l.startsWith("|"))) {
          const filas = lineas.filter(l => !/^\|\s*-/.test(l)).map(l => l.split("|").slice(1, -1).map(c => c.trim()));
          return (
            <table key={i} className="w-full text-xs">
              <tbody>
                {filas.map((celdas, f) => (
                  <tr key={f} style={{ borderBottom: "1px solid var(--kipu-border)" }}>
                    {celdas.map((c, k) => (
                      <td key={k} className="py-1.5 pr-2" style={{ fontWeight: f === 0 ? 600 : 400, color: f === 0 ? "var(--kipu-text)" : undefined }}>
                        {c}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          );
        }
        if (lineas.every(l => l.startsWith("- ")))
          return <ul key={i} className="list-disc pl-5 space-y-1">{lineas.map((l, k) => <li key={k}>{enLinea(l.slice(2))}</li>)}</ul>;
        if (lineas.every(l => /^\d+\. /.test(l)))
          return <ol key={i} className="list-decimal pl-5 space-y-1">{lineas.map((l, k) => <li key={k}>{enLinea(l.replace(/^\d+\. /, ""))}</li>)}</ol>;
        return <p key={i}>{enLinea(bloque)}</p>;
      })}
    </div>
  );
}
