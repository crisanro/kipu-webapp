"use client";
import Link from "next/link";
import {
  FileText, ChevronRight, RefreshCw,
  Calendar, Shield, AlertTriangle,
} from "lucide-react";
import EstadoBadge, { EstadoReporte } from "./EstadoBadge";

interface Props {
  tipo:           "IVA" | "RENTA" | "ATS";
  periodo:        string;   // "2026-08" | "2026"
  periodoFmt:     string;   // "Agosto 2026" | "2026"
  estado:         EstadoReporte;
  diasRestantes?: number | null;
  vencimiento?:   string;
  declarado?:     boolean;
  cached?:        boolean;  // reporte ya generado
  enCurso?:       boolean;  // período actual
  resumen?: {
    ivaAPagar?:       number;
    saldoFavor?:      number;
    impuestoCausado?: number;
    totalDocs?:       number;
  };
  generadoAt?: string;
}

const TIPO_CONFIG = {
  IVA:   { label: "IVA 104",  color: "var(--kipu-accent)", bg: "color-mix(in srgb, var(--kipu-accent) 20%, transparent)", border: "color-mix(in srgb, var(--kipu-accent) 20%, transparent)" },
  RENTA: { label: "Renta 102", color: "#c084fc",            bg: "color-mix(in srgb, #a855f7 20%, transparent)",     border: "color-mix(in srgb, #a855f7 20%, transparent)" },
  ATS:   { label: "ATS",       color: "#22d3ee",            bg: "color-mix(in srgb, #06b6d4 20%, transparent)",     border: "color-mix(in srgb, #06b6d4 20%, transparent)" },
};

const fmt = (n: number) =>
  n.toLocaleString("es-EC", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function href(tipo: string, periodo: string) {
  if (tipo === "RENTA") return `/reportes/renta/${periodo}`;
  if (tipo === "ATS")   return `/reportes/ats/${periodo}`;
  return `/reportes/iva/${periodo}`;
}

export default function ReporteCard({
  tipo, periodo, periodoFmt, estado, diasRestantes,
  vencimiento, declarado, cached, enCurso, resumen, generadoAt,
}: Props) {
  const cfg = TIPO_CONFIG[tipo];

  const tieneAPagar  = (resumen?.ivaAPagar       ?? 0) > 0;
  const tieneSaldo   = (resumen?.saldoFavor       ?? 0) > 0;
  const tieneCausado = (resumen?.impuestoCausado  ?? 0) > 0;

  const getBorderColor = () => {
    if (estado === "URGENTE" || estado === "VENCIDO") return "color-mix(in srgb, var(--kipu-danger) 40%, transparent)";
    if (estado === "PROXIMO") return "color-mix(in srgb, var(--kipu-warning) 30%, transparent)";
    return "var(--kipu-border)";
  };

  return (
    <Link
      href={href(tipo, periodo)}
      className="block rounded-xl p-4 transition-all group"
      style={{
        background: "var(--kipu-surface)",
        border: `1px solid ${getBorderColor()}`,
      }}
      onMouseEnter={e => e.currentTarget.style.borderColor = "color-mix(in srgb, var(--kipu-text) 30%, transparent)"}
      onMouseLeave={e => e.currentTarget.style.borderColor = getBorderColor()}
    >
      <div className="flex items-start justify-between gap-3">

        {/* Izquierda */}
        <div className="flex items-start gap-3 min-w-0 flex-1">
          {/* Ícono tipo */}
          <div
            className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
            style={{ background: cfg.bg, color: cfg.color }}
          >
            <FileText size={16} />
          </div>

          <div className="min-w-0 flex-1">
            {/* Tipo + período */}
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span
                className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                style={{
                  background: cfg.bg,
                  color: cfg.color,
                  border: `1px solid ${cfg.border}`,
                }}
              >
                {cfg.label}
              </span>
              <p className="text-sm font-semibold" style={{ color: "var(--kipu-text)" }}>{periodoFmt}</p>
              {enCurso && (
                <span
                  className="text-[10px] px-1.5 py-0.5 rounded font-medium"
                  style={{
                    background: "color-mix(in srgb, #60a5fa 20%, transparent)",
                    color: "#60a5fa",
                    border: "1px solid color-mix(in srgb, #60a5fa 20%, transparent)",
                  }}
                >
                  En curso
                </span>
              )}
            </div>

            {/* Vencimiento */}
            {vencimiento && !declarado && (
              <div className="flex items-center gap-1.5 mb-2">
                <Calendar
                  size={11}
                  style={{
                    color: estado === "URGENTE" || estado === "VENCIDO" ? "var(--kipu-danger)" :
                           estado === "PROXIMO" ? "var(--kipu-warning)" : "var(--kipu-subtle)",
                  }}
                />
                <p
                  className="text-xs"
                  style={{
                    color: estado === "URGENTE" || estado === "VENCIDO" ? "var(--kipu-danger)" :
                           estado === "PROXIMO" ? "var(--kipu-warning)" : "var(--kipu-subtle)",
                  }}
                >
                  Vence: {new Date(vencimiento).toLocaleDateString("es-EC", {
                    day: "2-digit", month: "short", year: "numeric"
                  })}
                </p>
              </div>
            )}

            {/* Resumen financiero */}
            {cached && resumen && (
              <div className="flex items-center gap-3 flex-wrap">
                {tieneAPagar && (
                  <div className="flex items-center gap-1">
                    <AlertTriangle size={11} style={{ color: "var(--kipu-danger)" }} />
                    <span className="text-xs font-semibold" style={{ color: "var(--kipu-danger)" }}>
                      A pagar: ${fmt(resumen.ivaAPagar ?? 0)}
                    </span>
                  </div>
                )}
                {tieneSaldo && (
                  <span className="text-xs font-semibold" style={{ color: "var(--kipu-success)" }}>
                    Saldo favor: ${fmt(resumen.saldoFavor ?? 0)}
                  </span>
                )}
                {tieneCausado && !tieneAPagar && !tieneSaldo && (
                  <span className="text-xs font-semibold" style={{ color: "#c084fc" }}>
                    Causado: ${fmt(resumen.impuestoCausado ?? 0)}
                  </span>
                )}
                {resumen.totalDocs !== undefined && (
                  <span className="text-xs" style={{ color: "var(--kipu-subtle)" }}>
                    {resumen.totalDocs} documentos
                  </span>
                )}
              </div>
            )}

            {/* Generado / pendiente */}
            {!cached && !enCurso && (
              <div className="flex items-center gap-1.5">
                <RefreshCw size={11} style={{ color: "var(--kipu-subtle)" }} />
                <p className="text-xs" style={{ color: "var(--kipu-subtle)" }}>Reporte no generado aún</p>
              </div>
            )}

            {cached && generadoAt && (
              <div className="flex items-center gap-1.5 mt-1">
                <Shield size={11} style={{ color: "var(--kipu-subtle)" }} />
                <p className="text-xs" style={{ color: "var(--kipu-subtle)" }}>
                  Generado {new Date(generadoAt).toLocaleDateString("es-EC", {
                    day: "2-digit", month: "short"
                  })}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Derecha — estado + chevron */}
        <div className="flex flex-col items-end gap-2 shrink-0">
          <EstadoBadge estado={estado} diasRestantes={diasRestantes} size="sm" />
          <ChevronRight
            size={16}
            className="transition-colors mt-1"
            style={{ color: "var(--kipu-subtle)" }}
          />
        </div>

      </div>
    </Link>
  );
}