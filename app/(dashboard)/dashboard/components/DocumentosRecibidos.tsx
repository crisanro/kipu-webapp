// app/(dashboard)/dashboard/components/DocumentosRecibidos.tsx
"use client";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

const fmt = (n: any) => parseFloat(n ?? 0).toFixed(2);

interface Props {
  docs: any[];
}

export default function DocumentosRecibidos({ docs = [] }: Props) {
  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{
        background: "var(--kipu-surface)",
        border:     "1px solid var(--kipu-border)",
      }}
    >
      <div
        className="flex items-center justify-between px-5 py-4"
        style={{ borderBottom: "1px solid var(--kipu-border)" }}
      >
        <div>
          <h2 className="text-sm font-semibold" style={{ color: "var(--kipu-text)" }}>
            Documentos recibidos
          </h2>
          <p className="text-xs mt-0.5" style={{ color: "var(--kipu-muted)" }}>
            Últimos 30 días
          </p>
        </div>
        <Link
          href="/documentos/recibidas"
          className="flex items-center gap-1 text-xs transition-colors"
          style={{ color: "var(--kipu-accent)" }}
          onMouseEnter={e => e.currentTarget.style.color = "var(--kipu-accent-h)"}
          onMouseLeave={e => e.currentTarget.style.color = "var(--kipu-accent)"}
        >
          Ver todos <ArrowRight size={12} />
        </Link>
      </div>

      {docs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <span className="text-3xl mb-2">📥</span>
          <p className="text-sm" style={{ color: "var(--kipu-muted)" }}>
            Sin documentos recibidos
          </p>
          <Link
            href="/documentos/recibidas/nueva"
            className="mt-3 text-xs transition-colors"
            style={{ color: "var(--kipu-accent)" }}
            onMouseEnter={e => e.currentTarget.style.color = "var(--kipu-accent-h)"}
            onMouseLeave={e => e.currentTarget.style.color = "var(--kipu-accent)"}
          >
            Registrar factura →
          </Link>
        </div>
      ) : (
        <div>
          {docs.map((d: any) => (
            <div
              key={d.id}
              className="flex items-center gap-3 px-5 py-3.5"
              style={{ borderBottom: "1px solid var(--kipu-border)" }}
            >
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                style={{ background: "var(--kipu-bg)" }}
              >
                <span className="text-xs font-bold" style={{ color: "var(--kipu-muted)" }}>
                  {(d.razon_social_proveedor ?? "?")[0].toUpperCase()}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate" style={{ color: "var(--kipu-text)" }}>
                  {d.razon_social_proveedor}
                </p>
                <p className="text-xs mt-0.5" style={{ color: "var(--kipu-muted)" }}>
                  {d.numero_doc} · {d.fecha_emision}
                </p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-sm font-bold" style={{ color: "var(--kipu-text)" }}>
                  ${fmt(d.importe_total)}
                </p>
                {d.credito_tributario_iva && (
                  <p className="text-xs" style={{ color: "var(--kipu-accent)" }}>
                    CT IVA
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}