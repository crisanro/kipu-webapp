"use client";
import { useState } from "react";
import { FileText, Shield, ChevronDown, ChevronUp, ExternalLink } from "lucide-react";
import Link from "next/link";

interface Props {
  totalEmitidos:  number;
  totalRecibidos: number;
  periodo:        string;
  tipo:           "IVA" | "RENTA" | "ATS";
  generadoAt?:    string;
  regeneradoAt?:  string;
}

const fmt = (n: number) => n.toLocaleString("es-EC");

export default function DocumentosIncluidos({
  totalEmitidos, totalRecibidos, periodo, tipo, generadoAt, regeneradoAt,
}: Props) {
  const [expandido, setExpandido] = useState(false);

  const total    = totalEmitidos + totalRecibidos;
  const periodoFmt = periodo.length === 7
    ? new Date(periodo + "-01").toLocaleDateString("es-EC", { month: "long", year: "numeric" })
    : periodo;

  // Links al historial filtrado por período
  const [anio, mes] = periodo.split("-");
  const fechaInicio = `${anio}-${mes}-01`;
  const fechaFin    = mes
    ? `${anio}-${mes}-${new Date(parseInt(anio), parseInt(mes), 0).getDate()}`
    : `${anio}-12-31`;

  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{
        background: "var(--kipu-surface)",
        border: "1px solid var(--kipu-border)",
      }}
    >

      {/* Header */}
      <button
        type="button"
        onClick={() => setExpandido(!expandido)}
        className="w-full flex items-center justify-between px-4 py-3 transition-colors"
        style={{ background: "transparent" }}
        onMouseEnter={e => e.currentTarget.style.background = "color-mix(in srgb, var(--kipu-text) 4%, transparent)"}
        onMouseLeave={e => e.currentTarget.style.background = "transparent"}
      >
        <div className="flex items-center gap-2">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
            style={{ background: "color-mix(in srgb, var(--kipu-text) 8%, transparent)" }}
          >
            <Shield size={14} style={{ color: "var(--kipu-subtle)" }} />
          </div>
          <div className="text-left">
            <p className="text-sm font-semibold" style={{ color: "var(--kipu-text)" }}>
              Trazabilidad — {fmt(total)} documentos incluidos
            </p>
            <p className="text-xs" style={{ color: "var(--kipu-subtle)" }}>
              Respaldo completo para auditoría SRI · {periodoFmt}
            </p>
          </div>
        </div>
        {expandido ? (
          <ChevronUp size={16} className="shrink-0" style={{ color: "var(--kipu-subtle)" }} />
        ) : (
          <ChevronDown size={16} className="shrink-0" style={{ color: "var(--kipu-subtle)" }} />
        )}
      </button>

      {expandido && (
        <div
          className="p-4 space-y-4"
          style={{ borderTop: "1px solid var(--kipu-border)" }}
        >

          {/* Contadores */}
          <div className="grid grid-cols-2 gap-3">
            <div
              className="rounded-xl p-4 text-center"
              style={{ background: "color-mix(in srgb, var(--kipu-text) 4%, transparent)" }}
            >
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center mx-auto mb-2"
                style={{ background: "color-mix(in srgb, var(--kipu-accent) 20%, transparent)" }}
              >
                <FileText size={14} style={{ color: "var(--kipu-accent)" }} />
              </div>
              <p className="text-2xl font-bold" style={{ color: "var(--kipu-text)" }}>{fmt(totalEmitidos)}</p>
              <p className="text-xs mt-0.5" style={{ color: "var(--kipu-subtle)" }}>Documentos emitidos</p>
              <p className="text-[10px] mt-1" style={{ color: "var(--kipu-subtle)" }}>FAC · LIQ · NCR · NDB · RET</p>
            </div>
            <div
              className="rounded-xl p-4 text-center"
              style={{ background: "color-mix(in srgb, var(--kipu-text) 4%, transparent)" }}
            >
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center mx-auto mb-2"
                style={{ background: "color-mix(in srgb, var(--kipu-success) 20%, transparent)" }}
              >
                <FileText size={14} style={{ color: "var(--kipu-success)" }} />
              </div>
              <p className="text-2xl font-bold" style={{ color: "var(--kipu-text)" }}>{fmt(totalRecibidos)}</p>
              <p className="text-xs mt-0.5" style={{ color: "var(--kipu-subtle)" }}>Documentos recibidos</p>
              <p className="text-[10px] mt-1" style={{ color: "var(--kipu-subtle)" }}>XML · Físicos · Retenciones</p>
            </div>
          </div>

          {/* Info auditoría */}
          <div
            className="rounded-xl p-4"
            style={{
              background: "color-mix(in srgb, var(--kipu-success) 5%, transparent)",
              border: "1px solid color-mix(in srgb, var(--kipu-success) 20%, transparent)",
            }}
          >
            <div className="flex items-start gap-2">
              <Shield size={14} className="shrink-0 mt-0.5" style={{ color: "var(--kipu-success)" }} />
              <div>
                <p className="text-xs font-semibold" style={{ color: "var(--kipu-success)" }}>
                  Listo para auditoría SRI
                </p>
                <p className="text-xs mt-1" style={{ color: "var(--kipu-success)" }}>
                  Todos los documentos de este período están registrados y vinculados a este reporte.
                  Si el SRI te audita, puedes mostrar el historial completo desde Kipu.
                </p>
              </div>
            </div>
          </div>

          {/* Metadatos del reporte */}
          {(generadoAt || regeneradoAt) && (
            <div className="space-y-1.5">
              <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--kipu-subtle)" }}>
                Metadatos del reporte
              </p>
              {generadoAt && (
                <div className="flex items-center justify-between text-xs">
                  <span style={{ color: "var(--kipu-subtle)" }}>Generado</span>
                  <span style={{ color: "var(--kipu-text)" }}>
                    {new Date(generadoAt).toLocaleString("es-EC", {
                      day: "2-digit", month: "short", year: "numeric",
                      hour: "2-digit", minute: "2-digit",
                    })}
                  </span>
                </div>
              )}
              {regeneradoAt && (
                <div className="flex items-center justify-between text-xs">
                  <span style={{ color: "var(--kipu-subtle)" }}>Última regeneración</span>
                  <span style={{ color: "var(--kipu-warning)" }}>
                    {new Date(regeneradoAt).toLocaleString("es-EC", {
                      day: "2-digit", month: "short", year: "numeric",
                      hour: "2-digit", minute: "2-digit",
                    })}
                  </span>
                </div>
              )}
              <div className="flex items-center justify-between text-xs">
                <span style={{ color: "var(--kipu-subtle)" }}>Tipo reporte</span>
                <span style={{ color: "var(--kipu-text)" }}>{tipo}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span style={{ color: "var(--kipu-subtle)" }}>Período</span>
                <span style={{ color: "var(--kipu-text)" }}>{periodoFmt}</span>
              </div>
            </div>
          )}

          {/* Links al historial */}
          <div className="space-y-2 pt-1">
            <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--kipu-subtle)" }}>
              Ver documentos del período
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <Link
                href={`/documentos?fecha_inicio=${fechaInicio}&fecha_fin=${fechaFin}`}
                className="flex items-center justify-between gap-2 px-3 py-2.5 rounded-lg transition-colors group"
                style={{
                  background: "color-mix(in srgb, var(--kipu-text) 5%, transparent)",
                }}
                onMouseEnter={e => e.currentTarget.style.background = "color-mix(in srgb, var(--kipu-text) 10%, transparent)"}
                onMouseLeave={e => e.currentTarget.style.background = "color-mix(in srgb, var(--kipu-text) 5%, transparent)"}
              >
                <div className="flex items-center gap-2">
                  <FileText size={13} style={{ color: "var(--kipu-accent)" }} />
                  <span className="text-xs transition-colors" style={{ color: "var(--kipu-text)" }}>
                    Comprobantes emitidos
                  </span>
                </div>
                <ExternalLink size={12} className="transition-colors" style={{ color: "var(--kipu-subtle)" }} />
              </Link>
              <Link
                href={`/documentos/recibidos?fecha_inicio=${fechaInicio}&fecha_fin=${fechaFin}`}
                className="flex items-center justify-between gap-2 px-3 py-2.5 rounded-lg transition-colors group"
                style={{
                  background: "color-mix(in srgb, var(--kipu-text) 5%, transparent)",
                }}
                onMouseEnter={e => e.currentTarget.style.background = "color-mix(in srgb, var(--kipu-text) 10%, transparent)"}
                onMouseLeave={e => e.currentTarget.style.background = "color-mix(in srgb, var(--kipu-text) 5%, transparent)"}
              >
                <div className="flex items-center gap-2">
                  <FileText size={13} style={{ color: "var(--kipu-success)" }} />
                  <span className="text-xs transition-colors" style={{ color: "var(--kipu-text)" }}>
                    Documentos recibidos
                  </span>
                </div>
                <ExternalLink size={12} className="transition-colors" style={{ color: "var(--kipu-subtle)" }} />
              </Link>
            </div>
          </div>

        </div>
      )}
    </div>
  );
}