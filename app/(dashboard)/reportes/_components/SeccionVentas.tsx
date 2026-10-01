"use client";
import { useState } from "react";
import { ChevronDown, ChevronUp, TrendingUp } from "lucide-react";

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

const fmt  = (n: number = 0) => n.toLocaleString("es-EC", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtN = (n: number = 0) => n.toLocaleString("es-EC", { minimumFractionDigits: 0 });

function CeldaCasillero({ num, label, value, highlight = false }: {
  num: string;
  label: string;
  value: number;
  highlight?: boolean;
}) {
  return (
    <div
      className="p-2.5 rounded-lg flex flex-col justify-between transition-colors"
      style={{
        background: highlight
          ? "color-mix(in srgb, var(--kipu-accent) 10%, transparent)"
          : "color-mix(in srgb, var(--kipu-text) 3%, transparent)",
        border: highlight
          ? "1px solid color-mix(in srgb, var(--kipu-accent) 25%, transparent)"
          : "1px solid var(--kipu-border)",
      }}
    >
      <div className="flex items-center justify-between gap-1 mb-1">
        <span
          className="text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0"
          style={{
            background: highlight ? "var(--kipu-accent)" : "color-mix(in srgb, var(--kipu-text) 10%, transparent)",
            color: highlight ? "#FFFFFF" : "var(--kipu-subtle)",
          }}
        >
          {num}
        </span>
        <span className="text-[10px] truncate" style={{ color: "var(--kipu-subtle)" }}>
          {label}
        </span>
      </div>
      <p
        className="text-sm font-bold tabular-nums text-right"
        style={{
          color: highlight
            ? "var(--kipu-accent)"
            : value === 0
              ? "var(--kipu-subtle)"
              : "var(--kipu-text)",
        }}
      >
        ${fmt(value)}
      </p>
    </div>
  );
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
    return { brutoNum: "401", netoNum: "411", ivaNum: "421" };
  };

  const tarifasNZ = desglose.filter(d => d.tarifa > 0);
  const tarifa0   = desglose.find(d => d.tarifa === 0);

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
        className="w-full flex items-center justify-between px-4 py-3 transition-colors text-left"
        onMouseEnter={e => e.currentTarget.style.background = "color-mix(in srgb, var(--kipu-text) 4%, transparent)"}
        onMouseLeave={e => e.currentTarget.style.background = "transparent"}
      >
        <div className="flex items-center gap-2.5">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
            style={{ background: "color-mix(in srgb, var(--kipu-accent) 20%, transparent)" }}
          >
            <TrendingUp size={14} style={{ color: "var(--kipu-accent)" }} />
          </div>
          <div>
            <p className="text-sm font-semibold" style={{ color: "var(--kipu-text)" }}>
              Ventas y otras operaciones
            </p>
            <p className="text-xs" style={{ color: "var(--kipu-subtle)" }}>
              {fmtN(casilleros["111"])} comprobantes emitidos
              {(casilleros["113"] ?? 0) > 0 && ` · ${fmtN(casilleros["113"])} anulados`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-right hidden sm:block">
            <p className="text-xs" style={{ color: "var(--kipu-subtle)" }}>Total neto ventas</p>
            <p className="text-sm font-bold" style={{ color: "var(--kipu-accent)" }}>
              ${fmt(casilleros["419"] ?? 0)}
            </p>
          </div>
          {expandido ? (
            <ChevronUp size={16} className="shrink-0" style={{ color: "var(--kipu-subtle)" }} />
          ) : (
            <ChevronDown size={16} className="shrink-0" style={{ color: "var(--kipu-subtle)" }} />
          )}
        </div>
      </button>

      {expandido && (
        <div
          className="p-4 space-y-4"
          style={{ borderTop: "1px solid var(--kipu-border)" }}
        >
          {/* Desglose de Ventas Gravadas (15%, 5%, etc.) */}
          {tarifasNZ.map((d) => {
            const { brutoNum, netoNum, ivaNum } = getCasillerosPorTarifa(d.tarifa);
            return (
              <div key={d.tarifa} className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold" style={{ color: "var(--kipu-text)" }}>
                    Ventas gravadas tarifa {d.tarifa}%
                  </span>
                  <span className="text-[10px]" style={{ color: "var(--kipu-subtle)" }}>
                    {fmtN(d.num_docs)} doc(s) · N/C: -${fmt(d.ncr)}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <CeldaCasillero
                    num={brutoNum}
                    label="Valor Bruto"
                    value={d.bruto}
                  />
                  <CeldaCasillero
                    num={netoNum}
                    label="Valor Neto"
                    value={d.neto}
                  />
                  <CeldaCasillero
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
            <div className="space-y-2 pt-2" style={{ borderTop: "1px solid var(--kipu-border)" }}>
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold" style={{ color: "var(--kipu-text)" }}>
                  Ventas gravadas tarifa 0%
                </span>
                <span className="text-[10px]" style={{ color: "var(--kipu-subtle)" }}>
                  {fmtN(tarifa0.num_docs)} doc(s) · N/C: -${fmt(tarifa0.ncr)}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <CeldaCasillero
                  num="403"
                  label="Valor Bruto"
                  value={tarifa0.bruto}
                />
                <CeldaCasillero
                  num="413"
                  label="Valor Neto"
                  value={tarifa0.neto}
                />
              </div>
            </div>
          )}

          {/* Totales Consolidados de la Sección */}
          <div className="pt-3" style={{ borderTop: "1px solid var(--kipu-border)" }}>
            <p className="text-xs font-semibold uppercase tracking-wider mb-2.5" style={{ color: "var(--kipu-subtle)" }}>
              Totales de ventas y otras operaciones
            </p>
            <div className="grid grid-cols-3 gap-2">
              <CeldaCasillero
                num="409"
                label="Total Bruto"
                value={casilleros["409"] ?? 0}
              />
              <CeldaCasillero
                num="419"
                label="Total Neto"
                value={casilleros["419"] ?? 0}
              />
              <CeldaCasillero
                num="429"
                label="Total IVA Generado"
                value={casilleros["429"] ?? 0}
                highlight
              />
            </div>
          </div>

          {/* Resumen de Comprobantes Emitidos y Anulados */}
          <div className="pt-3" style={{ borderTop: "1px solid var(--kipu-border)" }}>
            <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--kipu-subtle)" }}>
              Resumen de Comprobantes
            </p>
            <div className="grid grid-cols-2 gap-2">
              <div
                className="rounded-lg px-3 py-2.5 text-center"
                style={{
                  background: "color-mix(in srgb, var(--kipu-text) 4%, transparent)",
                  border: "1px solid var(--kipu-border)",
                }}
              >
                <p className="text-xs mb-0.5" style={{ color: "var(--kipu-subtle)" }}>Emitidos (FAC + NDB + LIQ)</p>
                <p className="text-base font-bold" style={{ color: "var(--kipu-text)" }}>
                  {fmtN(casilleros["111"])}
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
                <p className="text-xs mb-0.5" style={{ color: "var(--kipu-subtle)" }}>Anulados</p>
                <p
                  className="text-base font-bold"
                  style={{
                    color: (casilleros["113"] ?? 0) > 0 ? "var(--kipu-danger)" : "var(--kipu-text)",
                  }}
                >
                  {fmtN(casilleros["113"])}
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