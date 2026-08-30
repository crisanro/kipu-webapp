// app/(dashboard)/reportes/_components/DocumentosIncluidos.tsx
"use client";
import { useState } from "react";
import { FileText, Shield, ChevronDown, ChevronUp, ExternalLink } from "lucide-react";
import Link from "next/link";
import { clsx } from "clsx";

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
    <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">

      {/* Header */}
      <button
        onClick={() => setExpandido(!expandido)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-800/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-gray-700/60 flex items-center justify-center">
            <Shield size={14} className="text-gray-400" />
          </div>
          <div className="text-left">
            <p className="text-sm font-semibold text-white">
              Trazabilidad — {fmt(total)} documentos incluidos
            </p>
            <p className="text-xs text-gray-500">
              Respaldo completo para auditoría SRI · {periodoFmt}
            </p>
          </div>
        </div>
        {expandido
          ? <ChevronUp   size={16} className="text-gray-500 shrink-0" />
          : <ChevronDown size={16} className="text-gray-500 shrink-0" />
        }
      </button>

      {expandido && (
        <div className="border-t border-gray-800 p-4 space-y-4">

          {/* Contadores */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-gray-800/60 rounded-xl p-4 text-center">
              <div className="w-8 h-8 rounded-lg bg-indigo-600/20 flex items-center justify-center mx-auto mb-2">
                <FileText size={14} className="text-indigo-400" />
              </div>
              <p className="text-2xl font-bold text-white">{fmt(totalEmitidos)}</p>
              <p className="text-xs text-gray-500 mt-0.5">Documentos emitidos</p>
              <p className="text-[10px] text-gray-600 mt-1">FAC · LIQ · NCR · NDB · RET</p>
            </div>
            <div className="bg-gray-800/60 rounded-xl p-4 text-center">
              <div className="w-8 h-8 rounded-lg bg-emerald-600/20 flex items-center justify-center mx-auto mb-2">
                <FileText size={14} className="text-emerald-400" />
              </div>
              <p className="text-2xl font-bold text-white">{fmt(totalRecibidos)}</p>
              <p className="text-xs text-gray-500 mt-0.5">Documentos recibidos</p>
              <p className="text-[10px] text-gray-600 mt-1">XML · Físicos · Retenciones</p>
            </div>
          </div>

          {/* Info auditoría */}
          <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-4">
            <div className="flex items-start gap-2">
              <Shield size={14} className="text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-semibold text-emerald-300">
                  Listo para auditoría SRI
                </p>
                <p className="text-xs text-emerald-400/70 mt-1">
                  Todos los documentos de este período están registrados y vinculados a este reporte.
                  Si el SRI te audita, puedes mostrar el historial completo desde Kipu.
                </p>
              </div>
            </div>
          </div>

          {/* Metadatos del reporte */}
          {(generadoAt || regeneradoAt) && (
            <div className="space-y-1.5">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Metadatos del reporte
              </p>
              {generadoAt && (
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-500">Generado</span>
                  <span className="text-gray-400">
                    {new Date(generadoAt).toLocaleString("es-EC", {
                      day: "2-digit", month: "short", year: "numeric",
                      hour: "2-digit", minute: "2-digit",
                    })}
                  </span>
                </div>
              )}
              {regeneradoAt && (
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-500">Última regeneración</span>
                  <span className="text-amber-400">
                    {new Date(regeneradoAt).toLocaleString("es-EC", {
                      day: "2-digit", month: "short", year: "numeric",
                      hour: "2-digit", minute: "2-digit",
                    })}
                  </span>
                </div>
              )}
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-500">Tipo reporte</span>
                <span className="text-gray-400">{tipo}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-500">Período</span>
                <span className="text-gray-400">{periodoFmt}</span>
              </div>
            </div>
          )}

          {/* Links al historial */}
          <div className="space-y-2 pt-1">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Ver documentos del período
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <Link
                href={`/documentos?fecha_inicio=${fechaInicio}&fecha_fin=${fechaFin}`}
                className="flex items-center justify-between gap-2 px-3 py-2.5 rounded-lg bg-gray-800 hover:bg-gray-700 transition-colors group"
              >
                <div className="flex items-center gap-2">
                  <FileText size={13} className="text-indigo-400" />
                  <span className="text-xs text-gray-300 group-hover:text-white transition-colors">
                    Comprobantes emitidos
                  </span>
                </div>
                <ExternalLink size={12} className="text-gray-600 group-hover:text-gray-400 transition-colors" />
              </Link>
              <Link
                href={`/documentos/recibidos?fecha_inicio=${fechaInicio}&fecha_fin=${fechaFin}`}
                className="flex items-center justify-between gap-2 px-3 py-2.5 rounded-lg bg-gray-800 hover:bg-gray-700 transition-colors group"
              >
                <div className="flex items-center gap-2">
                  <FileText size={13} className="text-emerald-400" />
                  <span className="text-xs text-gray-300 group-hover:text-white transition-colors">
                    Documentos recibidos
                  </span>
                </div>
                <ExternalLink size={12} className="text-gray-600 group-hover:text-gray-400 transition-colors" />
              </Link>
            </div>
          </div>

        </div>
      )}
    </div>
  );
}