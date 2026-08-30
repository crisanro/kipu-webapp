// app/(dashboard)/reportes/_components/SeccionCompras.tsx
"use client";
import { useState } from "react";
import { ChevronDown, ChevronUp, ShoppingCart, CheckCircle2, XCircle } from "lucide-react";
import { clsx } from "clsx";

interface DesgloseTarifa {
  tarifa:          number;
  con_credito:     number;
  sin_credito:     number;
  ncr:             number;
  neto:            number;
  iva_credito:     number;
  iva_sin_credito: number;
  iva_neto:        number;
}

interface CasillerosCompras {
  "500": number; "510": number; "520": number;
  "502": number; "512": number; "522": number;
  "507": number; "517": number;
  "509": number; "519": number; "529": number;
  "115": number; "119": number;
  [key: string]: number;
}

interface Props {
  desglose:   DesgloseTarifa[];
  casilleros: CasillerosCompras;
}

const fmt  = (n: number) => n.toLocaleString("es-EC", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtN = (n: number) => n.toLocaleString("es-EC", { minimumFractionDigits: 0 });

function Casillero({ num, label, value, highlight = false, negative = false, dimmed = false }: {
  num:       string;
  label:     string;
  value:     number;
  highlight?: boolean;
  negative?:  boolean;
  dimmed?:    boolean;
}) {
  return (
    <div className={clsx(
      "flex items-center justify-between gap-3 px-4 py-2.5 rounded-lg",
      highlight ? "bg-emerald-600/10 border border-emerald-500/20" : "hover:bg-gray-800/40",
      dimmed && "opacity-60"
    )}>
      <div className="flex items-center gap-3 min-w-0">
        <span className={clsx(
          "text-[10px] font-bold px-2 py-0.5 rounded shrink-0",
          highlight ? "bg-emerald-600 text-white" : "bg-gray-800 text-gray-400"
        )}>
          {num}
        </span>
        <span className={clsx(
          "text-xs truncate",
          highlight ? "text-white font-medium" : "text-gray-400"
        )}>
          {label}
        </span>
      </div>
      <span className={clsx(
        "text-sm font-bold shrink-0 tabular-nums",
        highlight   ? "text-emerald-400" :
        negative    ? "text-red-400"     :
        value === 0 ? "text-gray-600"    : "text-white"
      )}>
        {negative && value > 0 ? "-" : ""}${fmt(value)}
      </span>
    </div>
  );
}

export default function SeccionCompras({ desglose, casilleros }: Props) {
  const [expandido, setExpandido] = useState(true);

  const tarifasNZ = desglose.filter(d => d.tarifa > 0);
  const tieneCC   = casilleros["520"] > 0;

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">

      {/* Header */}
      <button
        onClick={() => setExpandido(!expandido)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-800/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-emerald-600/20 flex items-center justify-center">
            <ShoppingCart size={14} className="text-emerald-400" />
          </div>
          <div className="text-left">
            <p className="text-sm font-semibold text-white">Adquisiciones y pagos</p>
            <p className="text-xs text-gray-500">
              {casilleros["115"]} comprobantes recibidos
              {casilleros["119"] > 0 && ` · ${fmtN(casilleros["119"])} liquidaciones`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right hidden sm:block">
            <p className="text-xs text-gray-500">Crédito tributario IVA</p>
            <p className="text-sm font-bold text-emerald-400">${fmt(casilleros["520"])}</p>
          </div>
          {expandido
            ? <ChevronUp   size={16} className="text-gray-500 shrink-0" />
            : <ChevronDown size={16} className="text-gray-500 shrink-0" />
          }
        </div>
      </button>

      {expandido && (
        <div className="border-t border-gray-800 p-4 space-y-4">

          {/* Por tarifa */}
          {tarifasNZ.map((d) => (
            <div key={d.tarifa}>
              <p className="text-xs font-semibold text-white mb-2">
                Adquisiciones IVA {d.tarifa}%
              </p>

              {/* Con crédito tributario */}
              {d.con_credito > 0 && (
                <div className="mb-2">
                  <div className="flex items-center gap-1.5 mb-1 px-1">
                    <CheckCircle2 size={11} className="text-emerald-400" />
                    <span className="text-[10px] text-emerald-400 font-medium">Con derecho a crédito tributario</span>
                  </div>
                  <div className="space-y-1">
                    <Casillero num="500" label="Valor bruto"         value={d.con_credito} />
                    {d.ncr > 0 && (
                      <Casillero num="—"   label="Notas de crédito" value={d.ncr} negative />
                    )}
                    <Casillero num="510" label="Valor neto"          value={Math.max(d.con_credito - d.ncr, 0)} />
                    <Casillero num="520" label={`IVA crédito ${d.tarifa}%`} value={d.iva_credito} highlight />
                  </div>
                </div>
              )}

              {/* Sin crédito tributario */}
              {d.sin_credito > 0 && (
                <div>
                  <div className="flex items-center gap-1.5 mb-1 px-1">
                    <XCircle size={11} className="text-gray-500" />
                    <span className="text-[10px] text-gray-500 font-medium">Sin derecho a crédito tributario</span>
                  </div>
                  <div className="space-y-1">
                    <Casillero num="502" label="Valor bruto"              value={d.sin_credito} dimmed />
                    <Casillero num="512" label="Valor neto"               value={d.sin_credito} dimmed />
                    <Casillero num="522" label={`IVA sin crédito ${d.tarifa}%`} value={d.iva_sin_credito} dimmed />
                  </div>
                </div>
              )}
            </div>
          ))}

          {/* Tarifa 0% */}
          {casilleros["507"] > 0 && (
            <div>
              <p className="text-xs font-semibold text-white mb-2">Adquisiciones 0%</p>
              <div className="space-y-1">
                <Casillero num="507" label="Valor bruto" value={casilleros["507"]} dimmed />
                <Casillero num="517" label="Valor neto"  value={casilleros["517"]} dimmed />
              </div>
            </div>
          )}

          {/* Totales */}
          <div className="border-t border-gray-800 pt-3">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
              Totales del período
            </p>
            <div className="space-y-1">
              <Casillero num="509" label="Total adquisiciones brutas" value={casilleros["509"]} />
              <Casillero num="519" label="Total adquisiciones netas"  value={casilleros["519"]} />
              <Casillero num="529" label="Total IVA adquisiciones"    value={casilleros["529"]} />
            </div>
          </div>

          {/* Crédito tributario highlight */}
          {tieneCC && (
            <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl px-4 py-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-emerald-300">
                    Crédito tributario IVA aplicable
                  </p>
                  <p className="text-[10px] text-emerald-400/70 mt-0.5">
                    Casillero 564 — reduce el IVA a pagar
                  </p>
                </div>
                <p className="text-xl font-bold text-emerald-400">
                  ${fmt(casilleros["520"])}
                </p>
              </div>
            </div>
          )}

          {/* Comprobantes */}
          <div className="border-t border-gray-800 pt-3">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
              Comprobantes
            </p>
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-gray-800/60 rounded-lg px-3 py-2.5 text-center">
                <p className="text-xs text-gray-500 mb-0.5">Recibidos</p>
                <p className="text-lg font-bold text-white">{fmtN(casilleros["115"])}</p>
                <p className="text-[10px] text-gray-600">casillero 115</p>
              </div>
              <div className="bg-gray-800/60 rounded-lg px-3 py-2.5 text-center">
                <p className="text-xs text-gray-500 mb-0.5">Liquidaciones</p>
                <p className="text-lg font-bold text-white">{fmtN(casilleros["119"])}</p>
                <p className="text-[10px] text-gray-600">casillero 119</p>
              </div>
            </div>
          </div>

        </div>
      )}
    </div>
  );
}