"use client";
import { useRouter } from "next/navigation";
import { type FacturaBase, ESTADO_CONFIG, TIPO_LABEL, fmt } from "./utils";

// Documento que originó este comprobante y los que se emitieron a partir de él.
export default function DocumentosVinculados({ factura }: { factura: FacturaBase }) {
  const router = useRouter();

  return (
    <>
      {/* Documento origen */}
      {factura.doc_origen_emitido && (
        <div
          className="rounded-xl p-4"
          style={{
            background: "color-mix(in srgb, var(--kipu-accent) 5%, transparent)",
            border: "1px solid color-mix(in srgb, var(--kipu-accent) 20%, transparent)",
          }}
        >
          <h2 className="text-xs font-semibold mb-3 uppercase tracking-wide" style={{ color: "var(--kipu-accent)" }}>
            Documento Origen
          </h2>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium font-mono" style={{ color: "var(--kipu-text)" }}>{factura.doc_origen_emitido.numero_doc}</p>
              <p className="text-xs" style={{ color: "var(--kipu-subtle)" }}>
                {TIPO_LABEL[factura.doc_origen_emitido.tipo_doc] ?? factura.doc_origen_emitido.tipo_doc}
                {" · "}${fmt(factura.doc_origen_emitido.importe_total)}
              </p>
            </div>
            <button
              onClick={() => router.push(`/documentos/${factura.doc_origen_emitido.id}`)}
              className="text-xs transition-colors"
              style={{ color: "var(--kipu-accent)" }}
              onMouseEnter={e => e.currentTarget.style.color = "var(--kipu-accent-h)"}
              onMouseLeave={e => e.currentTarget.style.color = "var(--kipu-accent)"}
            >
              Ver →
            </button>
          </div>
        </div>
      )}

      {/* Documentos derivados */}
      {factura.documentos_derivados && factura.documentos_derivados.length > 0 && (
        <div
          className="rounded-xl p-4"
          style={{
            background: "var(--kipu-surface)",
            border: "1px solid var(--kipu-border)",
          }}
        >
          <h2 className="text-xs font-semibold mb-3 uppercase tracking-wide" style={{ color: "var(--kipu-subtle)" }}>
            Documentos Relacionados
          </h2>
          <div className="space-y-2">
            {factura.documentos_derivados.map((d: any) => {
              const cfg = ESTADO_CONFIG[d.estado_sri] ?? ESTADO_CONFIG.FIRMADO;
              return (
                <div
                  key={d.id}
                  className="flex items-center justify-between p-2.5 rounded-lg"
                  style={{
                    background: "color-mix(in srgb, var(--kipu-text) 4%, transparent)",
                    border: "1px solid var(--kipu-border)",
                  }}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="text-[10px] px-1.5 py-0.5 rounded font-bold"
                      style={{
                        background: d.tipo_doc === "NCR"
                          ? "color-mix(in srgb, #c084fc 20%, transparent)"
                          : d.tipo_doc === "NDB"
                          ? "color-mix(in srgb, var(--kipu-warning) 20%, transparent)"
                          : d.tipo_doc === "RET"
                          ? "color-mix(in srgb, #60a5fa 20%, transparent)"
                          : "color-mix(in srgb, var(--kipu-text) 10%, transparent)",
                        color: d.tipo_doc === "NCR"
                          ? "#c084fc"
                          : d.tipo_doc === "NDB"
                          ? "var(--kipu-warning)"
                          : d.tipo_doc === "RET"
                          ? "#60a5fa"
                          : "var(--kipu-muted)",
                      }}
                    >
                      {d.tipo_doc}
                    </span>
                    <span className="text-sm font-mono" style={{ color: "var(--kipu-text)" }}>{d.numero_doc}</span>
                    <span className="text-xs" style={{ color: cfg.color }}>{cfg.label}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs" style={{ color: "var(--kipu-subtle)" }}>${fmt(d.importe_total)}</span>
                    <button
                      onClick={() => router.push(`/documentos/${d.id}`)}
                      className="text-xs transition-colors"
                      style={{ color: "var(--kipu-accent)" }}
                      onMouseEnter={e => e.currentTarget.style.color = "var(--kipu-accent-h)"}
                      onMouseLeave={e => e.currentTarget.style.color = "var(--kipu-accent)"}
                    >
                      Ver →
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </>
  );
}