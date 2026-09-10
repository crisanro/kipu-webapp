"use client";
import Link from "next/link";
import { ArrowRight, CheckCircle2, Clock, AlertTriangle, XCircle } from "lucide-react";

interface Props {
  documentos: any[];
}

const ESTADO_CONFIG: Record<string, { label: string; color: string; bg: string; icon: any }> = {
  AUTORIZADO: {
    label: "Autorizado",
    color: "var(--kipu-success)",
    bg: "color-mix(in srgb, var(--kipu-success) 10%, transparent)",
    icon: CheckCircle2,
  },
  RECIBIDA: {
    label: "En proceso",
    color: "#818cf8",
    bg: "color-mix(in srgb, #818cf8 10%, transparent)",
    icon: Clock,
  },
  FIRMADO: {
    label: "En cola",
    color: "#60a5fa",
    bg: "color-mix(in srgb, #60a5fa 10%, transparent)",
    icon: Clock,
  },
  DEVUELTA: {
    label: "Devuelto",
    color: "var(--kipu-warning)",
    bg: "color-mix(in srgb, var(--kipu-warning) 10%, transparent)",
    icon: AlertTriangle,
  },
  RECHAZADO: {
    label: "Rechazado",
    color: "var(--kipu-danger)",
    bg: "color-mix(in srgb, var(--kipu-danger) 10%, transparent)",
    icon: XCircle,
  },
};

const TIPO_LABEL: Record<string, string> = {
  FAC: "FAC", LIQ: "LIQ", NCR: "NC", NDB: "ND", RET: "RET",
};

const fmt = (n: any) => parseFloat(n ?? 0).toFixed(2);

export default function UltimosDocumentos({ documentos }: Props) {
  const recientes = documentos.slice(0, 6);

  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{
        background: "var(--kipu-surface)",
        border: "1px solid var(--kipu-border)",
      }}
    >
      <div
        className="flex items-center justify-between px-5 py-4"
        style={{ borderBottom: "2px solid var(--kipu-border)" }}
      >
        <div>
          <h2 className="text-sm font-semibold" style={{ color: "var(--kipu-text)" }}>
            Últimos emitidos
          </h2>
          <p className="text-xs mt-0.5" style={{ color: "var(--kipu-subtle)" }}>
            Comprobantes recientes
          </p>
        </div>
        <Link
          href="/documentos"
          className="flex items-center gap-1 text-xs transition-colors"
          style={{ color: "var(--kipu-accent)" }}
          onMouseEnter={e => e.currentTarget.style.color = "var(--kipu-accent-h)"}
          onMouseLeave={e => e.currentTarget.style.color = "var(--kipu-accent)"}
        >
          Ver todos <ArrowRight size={12} />
        </Link>
      </div>

      {recientes.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <span className="text-3xl mb-2">📄</span>
          <p className="text-sm" style={{ color: "var(--kipu-muted)" }}>
            Sin comprobantes este mes
          </p>
          <Link
            href="/documentos/nueva"
            className="mt-3 text-xs transition-colors"
            style={{ color: "var(--kipu-accent)" }}
            onMouseEnter={e => e.currentTarget.style.color = "var(--kipu-accent-h)"}
            onMouseLeave={e => e.currentTarget.style.color = "var(--kipu-accent)"}
          >
            Emitir primero →
          </Link>
        </div>
      ) : (
        <div>
          {recientes.map((d: any, index: number) => {
            const estado = ESTADO_CONFIG[d.estado] ?? ESTADO_CONFIG.FIRMADO;
            const Icon   = estado.icon;
            return (
              <Link
                key={d.id}
                href={`/documentos/${d.id}`}
                className="flex items-center gap-3 px-5 py-3.5 transition-colors group"
                style={{
                  borderTop: index > 0 ? "1px solid var(--kipu-border)" : "none",
                }}
                onMouseEnter={e =>
                  (e.currentTarget.style.background =
                    "color-mix(in srgb, var(--kipu-text) 4%, transparent)")
                }
                onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
              >
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                  style={{ background: estado.bg }}
                >
                  <Icon size={14} style={{ color: estado.color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p
                      className="text-sm font-medium truncate"
                      style={{ color: "var(--kipu-text)" }}
                    >
                      {d.cliente_nombre || "—"}
                    </p>
                    {d.tipo_doc !== "FAC" && (
                      <span
                        className="text-[10px] px-1.5 py-0.5 rounded shrink-0"
                        style={{
                          background: "color-mix(in srgb, var(--kipu-text) 8%, transparent)",
                          color: "var(--kipu-muted)",
                        }}
                      >
                        {TIPO_LABEL[d.tipo_doc] ?? d.tipo_doc}
                      </span>
                    )}
                  </div>
                  <p
                    className="text-xs mt-0.5"
                    style={{ color: "var(--kipu-subtle)" }}
                  >
                    {d.numero ?? d.numero_doc} · {String(d.fecha ?? "").slice(0, 10)}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p
                    className="text-sm font-bold"
                    style={{ color: "var(--kipu-text)" }}
                  >
                    ${fmt(d.total)}
                  </p>
                  <p className="text-xs" style={{ color: estado.color }}>
                    {estado.label}
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}