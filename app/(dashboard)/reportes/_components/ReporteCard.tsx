// app/(dashboard)/reportes/_components/ReporteCard.tsx
"use client";
import Link from "next/link";
import {
  FileText, ChevronRight, RefreshCw,
  Calendar, Shield, AlertTriangle,
} from "lucide-react";
import { clsx } from "clsx";
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
  IVA:   { label: "IVA 104",     color: "bg-indigo-600/20 text-indigo-400",  border: "border-indigo-500/20"  },
  RENTA: { label: "Renta 102",   color: "bg-purple-600/20 text-purple-400",  border: "border-purple-500/20"  },
  ATS:   { label: "ATS",         color: "bg-cyan-600/20   text-cyan-400",    border: "border-cyan-500/20"    },
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

  return (
    <Link href={href(tipo, periodo)}
      className={clsx(
        "block bg-gray-900 border rounded-xl p-4 hover:border-gray-600 transition-all group",
        estado === "URGENTE" ? "border-red-500/40"   :
        estado === "VENCIDO" ? "border-red-600/40"   :
        estado === "PROXIMO" ? "border-amber-500/30" :
        declarado            ? "border-gray-700"     : "border-gray-800"
      )}
    >
      <div className="flex items-start justify-between gap-3">

        {/* Izquierda */}
        <div className="flex items-start gap-3 min-w-0 flex-1">
          {/* Ícono tipo */}
          <div className={clsx(
            "w-9 h-9 rounded-lg flex items-center justify-center shrink-0 mt-0.5",
            cfg.color
          )}>
            <FileText size={16} />
          </div>

          <div className="min-w-0 flex-1">
            {/* Tipo + período */}
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className={clsx(
                "text-[10px] font-bold px-2 py-0.5 rounded-full border",
                cfg.color, cfg.border
              )}>
                {cfg.label}
              </span>
              <p className="text-sm font-semibold text-white">{periodoFmt}</p>
              {enCurso && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400 border border-blue-500/20 font-medium">
                  En curso
                </span>
              )}
            </div>

            {/* Vencimiento */}
            {vencimiento && !declarado && (
              <div className="flex items-center gap-1.5 mb-2">
                <Calendar size={11} className={clsx(
                  estado === "URGENTE" || estado === "VENCIDO" ? "text-red-400" :
                  estado === "PROXIMO" ? "text-amber-400" : "text-gray-500"
                )} />
                <p className={clsx(
                  "text-xs",
                  estado === "URGENTE" || estado === "VENCIDO" ? "text-red-400" :
                  estado === "PROXIMO" ? "text-amber-400" : "text-gray-500"
                )}>
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
                    <AlertTriangle size={11} className="text-red-400" />
                    <span className="text-xs text-red-400 font-semibold">
                      A pagar: ${fmt(resumen.ivaAPagar ?? 0)}
                    </span>
                  </div>
                )}
                {tieneSaldo && (
                  <span className="text-xs text-emerald-400 font-semibold">
                    Saldo favor: ${fmt(resumen.saldoFavor ?? 0)}
                  </span>
                )}
                {tieneCausado && !tieneAPagar && !tieneSaldo && (
                  <span className="text-xs text-purple-400 font-semibold">
                    Causado: ${fmt(resumen.impuestoCausado ?? 0)}
                  </span>
                )}
                {resumen.totalDocs !== undefined && (
                  <span className="text-xs text-gray-500">
                    {resumen.totalDocs} documentos
                  </span>
                )}
              </div>
            )}

            {/* Generado / pendiente */}
            {!cached && !enCurso && (
              <div className="flex items-center gap-1.5">
                <RefreshCw size={11} className="text-gray-600" />
                <p className="text-xs text-gray-600">Reporte no generado aún</p>
              </div>
            )}

            {cached && generadoAt && (
              <div className="flex items-center gap-1.5 mt-1">
                <Shield size={11} className="text-gray-600" />
                <p className="text-xs text-gray-600">
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
            className="text-gray-600 group-hover:text-gray-400 transition-colors mt-1"
          />
        </div>

      </div>
    </Link>
  );
}