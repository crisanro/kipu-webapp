"use client";
import { useState } from "react";
import {
  CheckCircle2, Eye, Copy,
} from "lucide-react";
import { type FacturaBase } from "./utils";

// Clave de acceso con botón de copiar y enlace de verificación en el SRI.
export default function ClaveAcceso({ factura }: { factura: FacturaBase }) {
  const [copiado, setCopiado] = useState(false);

  const copiarClave = async () => {
    if (!factura.clave_acceso) return;
    await navigator.clipboard.writeText(factura.clave_acceso);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  };

  return (
    <>
      {/* Clave de acceso */}
      <div
        className="rounded-xl p-4"
        style={{
          background: "var(--kipu-surface)",
          border: "1px solid var(--kipu-border)",
        }}
      >
        <h2 className="text-xs font-semibold mb-2 uppercase tracking-wide" style={{ color: "var(--kipu-subtle)" }}>
          Clave de acceso
        </h2>
        <div
          className="flex items-center gap-2 rounded-lg px-3 py-2"
          style={{ background: "color-mix(in srgb, var(--kipu-text) 5%, transparent)" }}
        >
          <code className="text-xs flex-1 break-all font-mono" style={{ color: "var(--kipu-text)" }}>{factura.clave_acceso}</code>
          <button
            onClick={copiarClave}
            className="shrink-0 transition-colors"
            style={{ color: "var(--kipu-subtle)" }}
            onMouseEnter={e => e.currentTarget.style.color = "var(--kipu-text)"}
            onMouseLeave={e => e.currentTarget.style.color = "var(--kipu-subtle)"}
          >
            {copiado ? <CheckCircle2 size={14} style={{ color: "var(--kipu-success)" }} /> : <Copy size={14} />}
          </button>
        </div>
        {["AUTORIZADO", "ANULADO"].includes(factura.estado_sri) && (
          <a
            href="https://srienlinea.sri.gob.ec/comprobantes-electronicos-internet/publico/validezComprobantes.jsf"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 inline-flex items-center gap-1.5 text-xs transition-colors"
            style={{ color: "var(--kipu-accent)" }}
            onMouseEnter={e => e.currentTarget.style.color = "var(--kipu-accent-h)"}
            onMouseLeave={e => e.currentTarget.style.color = "var(--kipu-accent)"}
          >
            <Eye size={12} /> Verificar en portal SRI
          </a>
        )}
      </div>
    </>
  );
}