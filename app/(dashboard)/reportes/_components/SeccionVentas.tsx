"use client";
import { useState } from "react";
import { ChevronDown, ChevronUp, TrendingUp } from "lucide-react";
import { montoEC, numeroEC } from "@/lib/dinero";
import CeldaCasillero from "./CeldaCasillero";

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
  "401"?: number; "411"?: number; "421"?: number;
  "425"?: number; "435"?: number; "445"?: number;
  "403"?: number; "413"?: number;
  "405"?: number; "415"?: number;
  "409"?: number; "419"?: number; "429"?: number;
  "111"?: number; "113"?: number;
  [key: string]: number | undefined;
}

interface Props {
  desglose:   DesgloseTarifa[];
  casilleros: CasillerosVentas;
}

export default function SeccionVentas({ desglose, casilleros }: Props) {
  const [expandido, setExpandido] = useState(true);

  // Mapeo dinámico de casilleros según la tarifa
  const getCasillerosPorTarifa = (tarifa: number) => {
    if (tarifa === 15 || tarifa === 12) {
      return { brutoNum: "401", netoNum: "411", ivaNum: "421" };
    }
    if (tarifa === 5) {
      return { brutoNum: "425", netoNum: "435", ivaNum: "445" };
    }
    if (tarifa === 8) {
      return { brutoNum: "410", netoNum: "420", ivaNum: "430" };   // igual que el backend
    }
    return { brutoNum: "401", netoNum: "411", ivaNum: "421" };
  };

  const tarifasNZ = desglose.filter(d => d.tarifa > 0);
  const tarifa0   = desglose.find(d => d.tarifa === 0);

  return (
    <div
      className="rounded-xl overflow-hidden bg-superficie border border-borde"
    >
      {/* Header */}
      <button
        type="button"
        onClick={() => setExpandido(!expandido)}
        className="w-full flex items-center justify-between px-4 py-3 transition-colors text-left"
        onMouseEnter={e => e.currentTarget.style.background = "color-mix(in srgb, var(--kipu-text) 4%, transparent)"}
        onMouseLeave={e => e.currentTarget.style.background = "transparent"}
      >
        <div className="flex items-center gap-2.5">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 bg-acento/20"
          >
            <TrendingUp className="text-acento" size={14} />
          </div>
          <div>
            <p className="text-sm font-semibold text-texto">
              Ventas y otras operaciones
            </p>
            <p className="text-xs text-sutil">
              {numeroEC(casilleros["111"])} comprobantes emitidos
              {(casilleros["113"] ?? 0) > 0 && ` · ${numeroEC(casilleros["113"])} anulados`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-right hidden sm:block">
            <p className="text-xs text-sutil">Total neto ventas</p>
            <p className="text-sm font-bold text-acento">
              ${montoEC(casilleros["419"] ?? 0)}
            </p>
          </div>
          {expandido ? (
            <ChevronUp size={16} className="shrink-0 text-sutil" />
          ) : (
            <ChevronDown size={16} className="shrink-0 text-sutil" />
          )}
        </div>
      </button>

      {expandido && (
        <div
          className="p-4 space-y-4 border-t border-borde"
        >
          {/* Desglose de Ventas Gravadas (15%, 5%, etc.) */}
          {tarifasNZ.map((d) => {
            const { brutoNum, netoNum, ivaNum } = getCasillerosPorTarifa(d.tarifa);
            return (
              <div key={d.tarifa} className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-texto">
                    Ventas gravadas tarifa {d.tarifa}%
                  </span>
                  <span className="text-[10px]" style={{ color: "var(--kipu-subtle)" }}>
                    {numeroEC(d.num_docs)} doc(s) · N/C: -${montoEC(d.ncr)}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <CeldaCasillero tono="acento"
                    num={brutoNum}
                    label="Valor Bruto"
                    value={d.bruto}
                  />
                  <CeldaCasillero tono="acento"
                    num={netoNum}
                    label="Valor Neto"
                    value={d.neto}
                  />
                  <CeldaCasillero tono="acento"
                    num={ivaNum}
                    label="Impuesto Generado"
                    value={d.iva_neto}
                    highlight
                  />
                </div>
              </div>
            );
          })}

          {/* Ventas Tarifa 0% */}
          {tarifa0 && tarifa0.bruto > 0 && (
            <div className="space-y-2 pt-2 border-t border-borde">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-texto">
                  Ventas gravadas tarifa 0%
                </span>
                <span className="text-[10px]" style={{ color: "var(--kipu-subtle)" }}>
                  {numeroEC(tarifa0.num_docs)} doc(s) · N/C: -${montoEC(tarifa0.ncr)}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <CeldaCasillero tono="acento"
                  num="403"
                  label="Valor Bruto"
                  value={tarifa0.bruto}
                />
                <CeldaCasillero tono="acento"
                  num="413"
                  label="Valor Neto"
                  value={tarifa0.neto}
                />
              </div>
            </div>
          )}

          {/* Exportación de servicios: ventas 0% a clientes del exterior */}
          {(casilleros["408"] ?? 0) > 0 && (
            <div className="space-y-2 pt-2 border-t border-borde">
              <div>
                <span className="text-xs font-semibold text-texto">
                  Exportaciones de servicios
                </span>
                <p className="text-[10px]" style={{ color: "var(--kipu-subtle)" }}>
                  Facturas al 0% a clientes con identificación del exterior. Dan derecho a crédito tributario.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <CeldaCasillero tono="acento" num="408" label="Valor Bruto" value={casilleros["408"] ?? 0} />
                <CeldaCasillero tono="acento" num="418" label="Valor Neto"  value={casilleros["418"] ?? 0} />
              </div>
            </div>
          )}

          {/* No objeto / exentas: se informan aparte, no suman al total 409 */}
          {(casilleros["431"] ?? 0) > 0 && (
            <div className="space-y-2 pt-2 border-t border-borde">
              <div>
                <span className="text-xs font-semibold text-texto">
                  Ventas no objeto o exentas de IVA
                </span>
                <p className="text-[10px]" style={{ color: "var(--kipu-subtle)" }}>
                  Se informan aparte: no suman al total de ventas ni al factor de proporcionalidad.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <CeldaCasillero tono="acento" num="431" label="Valor Bruto" value={casilleros["431"] ?? 0} />
                <CeldaCasillero tono="acento" num="441" label="Valor Neto"  value={casilleros["441"] ?? 0} />
              </div>
            </div>
          )}

          {/* Totales Consolidados de la Sección */}
          <div className="pt-3 border-t border-borde">
            <p className="text-xs font-semibold uppercase tracking-wider mb-2.5 text-sutil">
              Totales de ventas y otras operaciones
            </p>
            <div className="grid grid-cols-3 gap-2">
              <CeldaCasillero tono="acento"
                num="409"
                label="Total Bruto"
                value={casilleros["409"] ?? 0}
              />
              <CeldaCasillero tono="acento"
                num="419"
                label="Total Neto"
                value={casilleros["419"] ?? 0}
              />
              <CeldaCasillero tono="acento"
                num="429"
                label="Total IVA Generado"
                value={casilleros["429"] ?? 0}
                highlight
              />
            </div>
          </div>

          {/* Resumen de Comprobantes Emitidos y Anulados */}
          <div className="pt-3 border-t border-borde">
            <p className="text-xs font-semibold uppercase tracking-wider mb-2 text-sutil">
              Resumen de Comprobantes
            </p>
            <div className="grid grid-cols-2 gap-2">
              <div
                className="rounded-lg px-3 py-2.5 text-center bg-texto/4 border border-borde"
              >
                <p className="text-xs mb-0.5 text-sutil">Emitidos (FAC + NDB + LIQ)</p>
                <p className="text-base font-bold text-texto">
                  {numeroEC(casilleros["111"])}
                </p>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ background: "color-mix(in srgb, var(--kipu-text) 8%, transparent)", color: "var(--kipu-subtle)" }}>
                  111
                </span>
              </div>

              <div
                className="rounded-lg px-3 py-2.5 text-center"
                style={{
                  background: (casilleros["113"] ?? 0) > 0
                    ? "color-mix(in srgb, var(--kipu-danger) 10%, transparent)"
                    : "color-mix(in srgb, var(--kipu-text) 4%, transparent)",
                  border: (casilleros["113"] ?? 0) > 0
                    ? "1px solid color-mix(in srgb, var(--kipu-danger) 20%, transparent)"
                    : "1px solid var(--kipu-border)",
                }}
              >
                <p className="text-xs mb-0.5 text-sutil">Anulados</p>
                <p
                  className="text-base font-bold"
                  style={{
                    color: (casilleros["113"] ?? 0) > 0 ? "var(--kipu-danger)" : "var(--kipu-text)",
                  }}
                >
                  {numeroEC(casilleros["113"])}
                </p>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ background: "color-mix(in srgb, var(--kipu-text) 8%, transparent)", color: "var(--kipu-subtle)" }}>
                  113
                </span>
              </div>
            </div>
          </div>

        </div>
      )}
    </div>
  );
}