"use client";
import { useState } from "react";
import { FileText, Shield, ChevronDown, ChevronUp, ExternalLink } from "lucide-react";
import Link from "next/link";
import { numeroEC } from "@/lib/dinero";

interface Props {
  totalEmitidos:  number;
  totalRecibidos: number;
  periodo:        string;
  tipo:           "IVA" | "RENTA" | "ATS";
  generadoAt?:    string;
  regeneradoAt?:  string;
}

export default function DocumentosIncluidos({
  totalEmitidos, totalRecibidos, periodo, tipo, generadoAt, regeneradoAt,
}: Props) {
  const [expandido, setExpandido] = useState(false);

  const total    = totalEmitidos + totalRecibidos;
  const periodoFmt = periodo.length === 7
    // new Date("2026-08-01") es medianoche UTC = 31 de julio en Ecuador
    ? new Date(parseInt(periodo.slice(0, 4)), parseInt(periodo.slice(5, 7)) - 1, 1)
        .toLocaleDateString("es-EC", { month: "long", year: "numeric" })
    : periodo;

  // Links al historial filtrado por período
  const [anio, mes] = periodo.split("-");
  const fechaInicio = `${anio}-${mes}-01`;
  const fechaFin    = mes
    ? `${anio}-${mes}-${new Date(parseInt(anio), parseInt(mes), 0).getDate()}`
    : `${anio}-12-31`;

  return (
    <div
      className="rounded-xl overflow-hidden bg-superficie border border-borde"
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
            className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 bg-texto/8"
          >
            <Shield className="text-sutil" size={14} />
          </div>
          <div className="text-left">
            <p className="text-sm font-semibold text-texto">
              Trazabilidad — {numeroEC(total)} documentos incluidos
            </p>
            <p className="text-xs text-sutil">
              Respaldo completo para auditoría SRI · {periodoFmt}
            </p>
          </div>
        </div>
        {expandido ? (
          <ChevronUp size={16} className="shrink-0 text-sutil" />
        ) : (
          <ChevronDown size={16} className="shrink-0 text-sutil" />
        )}
      </button>

      {expandido && (
        <div
          className="p-4 space-y-4 border-t border-borde"
        >

          {/* Contadores */}
          <div className="grid grid-cols-2 gap-3">
            <div
              className="rounded-xl p-4 text-center bg-texto/4"
            >
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center mx-auto mb-2 bg-acento/20"
              >
                <FileText className="text-acento" size={14} />
              </div>
              <p className="text-2xl font-bold text-texto">{numeroEC(totalEmitidos)}</p>
              <p className="text-xs mt-0.5 text-sutil">Documentos emitidos</p>
              <p className="text-[10px] mt-1" style={{ color: "var(--kipu-subtle)" }}>FAC · LIQ · NCR · NDB · RET</p>
            </div>
            <div
              className="rounded-xl p-4 text-center bg-texto/4"
            >
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center mx-auto mb-2 bg-exito/20"
              >
                <FileText className="text-exito" size={14} />
              </div>
              <p className="text-2xl font-bold text-texto">{numeroEC(totalRecibidos)}</p>
              <p className="text-xs mt-0.5 text-sutil">Documentos recibidos</p>
              <p className="text-[10px] mt-1" style={{ color: "var(--kipu-subtle)" }}>XML · Físicos · Retenciones</p>
            </div>
          </div>

          {/* Info auditoría */}
          <div
            className="rounded-xl p-4 bg-exito/5 border border-exito/20"
          >
            <div className="flex items-start gap-2">
              <Shield size={14} className="shrink-0 mt-0.5 text-exito" />
              <div>
                <p className="text-xs font-semibold text-exito">
                  Listo para auditoría SRI
                </p>
                <p className="text-xs mt-1 text-exito">
                  Todos los documentos de este período están registrados y vinculados a este reporte.
                  Si el SRI te audita, puedes mostrar el historial completo desde Kipu.
                </p>
              </div>
            </div>
          </div>

          {/* Metadatos del reporte */}
          {(generadoAt || regeneradoAt) && (
            <div className="space-y-1.5">
              <p className="text-xs font-semibold uppercase tracking-wider text-sutil">
                Metadatos del reporte
              </p>
              {generadoAt && (
                <div className="flex items-center justify-between text-xs">
                  <span className="text-sutil">Generado</span>
                  <span className="text-texto">
                    {new Date(generadoAt).toLocaleString("es-EC", {
                      day: "2-digit", month: "short", year: "numeric",
                      hour: "2-digit", minute: "2-digit",
                    })}
                  </span>
                </div>
              )}
              {regeneradoAt && (
                <div className="flex items-center justify-between text-xs">
                  <span className="text-sutil">Última regeneración</span>
                  <span className="text-alerta">
                    {new Date(regeneradoAt).toLocaleString("es-EC", {
                      day: "2-digit", month: "short", year: "numeric",
                      hour: "2-digit", minute: "2-digit",
                    })}
                  </span>
                </div>
              )}
              <div className="flex items-center justify-between text-xs">
                <span className="text-sutil">Tipo reporte</span>
                <span className="text-texto">{tipo}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-sutil">Período</span>
                <span className="text-texto">{periodoFmt}</span>
              </div>
            </div>
          )}

          {/* Links al historial */}
          <div className="space-y-2 pt-1">
            <p className="text-xs font-semibold uppercase tracking-wider text-sutil">
              Ver documentos del período
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <Link
                href={`/documentos?fecha_inicio=${fechaInicio}&fecha_fin=${fechaFin}`}
                className="flex items-center justify-between gap-2 px-3 py-2.5 rounded-lg transition-colors group bg-texto/5 hover:bg-texto/10"
              >
                <div className="flex items-center gap-2">
                  <FileText className="text-acento" size={13} />
                  <span className="text-xs transition-colors text-texto">
                    Comprobantes emitidos
                  </span>
                </div>
                <ExternalLink size={12} className="transition-colors text-sutil" />
              </Link>
              <Link
                href={`/documentos/recibidos?fecha_inicio=${fechaInicio}&fecha_fin=${fechaFin}`}
                className="flex items-center justify-between gap-2 px-3 py-2.5 rounded-lg transition-colors group bg-texto/5 hover:bg-texto/10"
              >
                <div className="flex items-center gap-2">
                  <FileText className="text-exito" size={13} />
                  <span className="text-xs transition-colors text-texto">
                    Documentos recibidos
                  </span>
                </div>
                <ExternalLink size={12} className="transition-colors text-sutil" />
              </Link>
            </div>
          </div>

        </div>
      )}
    </div>
  );
}