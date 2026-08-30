// app/(dashboard)/reportes/_components/SeccionVentas.tsx
"use client";
import { useState } from "react";
import { ChevronDown, ChevronUp, TrendingUp } from "lucide-react";
import { clsx } from "clsx";

interface DesgloseTarifa {
  tarifa:    number;
  bruto:     number;
  ncr:       number;
  neto:      number;
  iva_bruto: number;
  iva_neto:  number;
  num_docs:  number;
}

interface CasillerosVentas {
  "401": number; "411": number; "421": number;
  "403": number; "413": number;
  "409": number; "419": number; "429": number;
  "111": number; "113": number;
  [key: string]: number;
}

interface Props {
  desglose:   DesgloseTarifa[];
  casilleros: CasillerosVentas;
}

const fmt  = (n: number) => n.toLocaleString("es-EC", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtN = (n: number) => n.toLocaleString("es-EC", { minimumFractionDigits: 0 });

function Casillero({ num, label, value, highlight = false, negative = false }: {
  num:       string;
  label:     string;
  value:     number;
  highlight?: boolean;
  negative?:  boolean;
}) {
  return (
    <div className={clsx(
      "flex items-center justify-between gap-3 px-4 py-2.5 rounded-lg",
      highlight ? "bg-indigo-600/10 border border-indigo-500/20" : "hover:bg-gray-800/40"
    )}>
      <div className="flex items-center gap-3 min-w-0">
        <span className={clsx(
          "text-[10px] font-bold px-2 py-0.5 rounded shrink-0",
          highlight
            ? "bg-indigo-600 text-white"
            : "bg-gray-800 text-gray-400"
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
        highlight    ? "text-indigo-400" :
        negative     ? "text-red-400"    :
        value === 0  ? "text-gray-600"   : "text-white"
      )}>
        {negative && value > 0 ? "-" : ""}${fmt(value)}
      </span>
    </div>
  );
}

export default function SeccionVentas({ desglose, casilleros }: Props) {
  const [expandido, setExpandido] = useState(true);

  const tarifasNZ = desglose.filter(d => d.tarifa > 0);
  const tarifa0   = desglose.find(d => d.tarifa === 0);

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">

      {/* Header */}
      <button
        onClick={() => setExpandido(!expandido)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-800/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-indigo-600/20 flex items-center justify-center">
            <TrendingUp size={14} className="text-indigo-400" />
          </div>
          <div className="text-left">
            <p className="text-sm font-semibold text-white">Ventas y otras operaciones</p>
            <p className="text-xs text-gray-500">
              {casilleros["111"]} comprobantes emitidos
              {casilleros["113"] > 0 && ` · ${fmtN(casilleros["113"])} anulados`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right hidden sm:block">
            <p className="text-xs text-gray-500">Total neto ventas</p>
            <p className="text-sm font-bold text-indigo-400">${fmt(casilleros["419"])}</p>
          </div>
          {expandido
            ? <ChevronUp size={16} className="text-gray-500 shrink-0" />
            : <ChevronDown size={16} className="text-gray-500 shrink-0" />
          }
        </div>
      </button>

      {expandido && (
        <div className="border-t border-gray-800 p-4 space-y-4">

          {/* Desglose por tarifa */}
          {tarifasNZ.map((d) => (
            <div key={d.tarifa}>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-semibold text-white">
                  Ventas gravadas IVA {d.tarifa}%
                </span>
                <span className="text-[10px] text-gray-500">
                  ({fmtN(d.num_docs)} docs)
                </span>
              </div>
              <div className="space-y-1">
                <Casillero
                  num="401" label="Valor bruto"
                  value={d.bruto}
                />
                {d.ncr > 0 && (
                  <Casillero
                    num="—" label="Notas de crédito"
                    value={d.ncr} negative
                  />
                )}
                <Casillero
                  num="411" label="Valor neto (bruto − N/C)"
                  value={d.neto}
                />
                <Casillero
                  num="421" label={`IVA generado ${d.tarifa}%`}
                  value={d.iva_neto} highlight
                />
              </div>
            </div>
          ))}

          {/* Tarifa 0% */}
          {tarifa0 && tarifa0.bruto > 0 && (
            <div>
              <p className="text-xs font-semibold text-white mb-2">
                Ventas gravadas 0%
              </p>
              <div className="space-y-1">
                <Casillero
                  num="403" label="Valor bruto"
                  value={tarifa0.bruto}
                />
                {tarifa0.ncr > 0 && (
                  <Casillero
                    num="—" label="Notas de crédito"
                    value={tarifa0.ncr} negative
                  />
                )}
                <Casillero
                  num="413" label="Valor neto"
                  value={tarifa0.neto}
                />
              </div>
            </div>
          )}

          {/* Separador */}
          <div className="border-t border-gray-800 pt-3">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
              Totales del período
            </p>
            <div className="space-y-1">
              <Casillero
                num="409" label="Total ventas brutas"
                value={casilleros["409"]}
              />
              <Casillero
                num="419" label="Total ventas netas"
                value={casilleros["419"]}
              />
              <Casillero
                num="429" label="Total IVA generado"
                value={casilleros["429"]} highlight
              />
            </div>
          </div>

          {/* Comprobantes */}
          <div className="border-t border-gray-800 pt-3">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
              Comprobantes
            </p>
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-gray-800/60 rounded-lg px-3 py-2.5 text-center">
                <p className="text-xs text-gray-500 mb-0.5">Emitidos</p>
                <p className="text-lg font-bold text-white">{fmtN(casilleros["111"])}</p>
                <p className="text-[10px] text-gray-600">casillero 111</p>
              </div>
              <div className={clsx(
                "rounded-lg px-3 py-2.5 text-center",
                casilleros["113"] > 0
                  ? "bg-red-500/10 border border-red-500/20"
                  : "bg-gray-800/60"
              )}>
                <p className="text-xs text-gray-500 mb-0.5">Anulados</p>
                <p className={clsx(
                  "text-lg font-bold",
                  casilleros["113"] > 0 ? "text-red-400" : "text-white"
                )}>
                  {fmtN(casilleros["113"])}
                </p>
                <p className="text-[10px] text-gray-600">casillero 113</p>
              </div>
            </div>
          </div>

        </div>
      )}
    </div>
  );
}