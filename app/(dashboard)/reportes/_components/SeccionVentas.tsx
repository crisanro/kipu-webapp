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
  num:        string;
  label:      string;
  value:      number;
  highlight?: boolean;
  negative?:  boolean;
}) {
  const getFilaEstilo = () => {
    if (highlight) {
      return {
        background: "color-mix(in srgb, var(--kipu-accent) 10%, transparent)",
        border: "1px solid color-mix(in srgb, var(--kipu-accent) 20%, transparent)",
      };
    }
    return {
      background: "transparent",
    };
  };

  const getNumBadgeEstilo = () => {
    if (highlight) {
      return {
        background: "var(--kipu-accent)",
        color: "#FFFFFF",
      };
    }
    return {
      background: "color-mix(in srgb, var(--kipu-text) 8%, transparent)",
      color: "var(--kipu-subtle)",
    };
  };

  const getValueColor = () => {
    if (highlight) return "var(--kipu-accent)";
    if (negative) return "var(--kipu-danger)";
    if (value === 0) return "var(--kipu-subtle)";
    return "var(--kipu-text)";
  };

  return (
    <div
      className="flex items-center justify-between gap-3 px-4 py-2.5 rounded-lg transition-colors"
      style={getFilaEstilo()}
      onMouseEnter={e => {
        if (!highlight) {
          e.currentTarget.style.background = "color-mix(in srgb, var(--kipu-text) 4%, transparent)";
        }
      }}
      onMouseLeave={e => {
        if (!highlight) {
          e.currentTarget.style.background = "transparent";
        }
      }}
    >
      <div className="flex items-center gap-3 min-w-0">
        <span
          className="text-[10px] font-bold px-2 py-0.5 rounded shrink-0"
          style={getNumBadgeEstilo()}
        >
          {num}
        </span>
        <span
          className={`text-xs truncate ${highlight ? "font-medium" : ""}`}
          style={{ color: highlight ? "var(--kipu-text)" : "var(--kipu-subtle)" }}
        >
          {label}
        </span>
      </div>
      <span
        className="text-sm font-bold shrink-0 tabular-nums"
        style={{ color: getValueColor() }}
      >
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
            style={{ background: "color-mix(in srgb, var(--kipu-accent) 20%, transparent)" }}
          >
            <TrendingUp size={14} style={{ color: "var(--kipu-accent)" }} />
          </div>
          <div className="text-left">
            <p className="text-sm font-semibold" style={{ color: "var(--kipu-text)" }}>Ventas y otras operaciones</p>
            <p className="text-xs" style={{ color: "var(--kipu-subtle)" }}>
              {casilleros["111"]} comprobantes emitidos
              {casilleros["113"] > 0 && ` · ${fmtN(casilleros["113"])} anulados`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right hidden sm:block">
            <p className="text-xs" style={{ color: "var(--kipu-subtle)" }}>Total neto ventas</p>
            <p className="text-sm font-bold" style={{ color: "var(--kipu-accent)" }}>${fmt(casilleros["419"])}</p>
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

          {/* Desglose por tarifa */}
          {tarifasNZ.map((d) => (
            <div key={d.tarifa}>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-semibold" style={{ color: "var(--kipu-text)" }}>
                  Ventas gravadas IVA {d.tarifa}%
                </span>
                <span className="text-[10px]" style={{ color: "var(--kipu-subtle)" }}>
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
              <p className="text-xs font-semibold mb-2" style={{ color: "var(--kipu-text)" }}>
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
          <div className="pt-3" style={{ borderTop: "1px solid var(--kipu-border)" }}>
            <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--kipu-subtle)" }}>
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
          <div className="pt-3" style={{ borderTop: "1px solid var(--kipu-border)" }}>
            <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--kipu-subtle)" }}>
              Comprobantes
            </p>
            <div className="grid grid-cols-2 gap-2">
              <div
                className="rounded-lg px-3 py-2.5 text-center"
                style={{ background: "color-mix(in srgb, var(--kipu-text) 4%, transparent)" }}
              >
                <p className="text-xs mb-0.5" style={{ color: "var(--kipu-subtle)" }}>Emitidos</p>
                <p className="text-lg font-bold" style={{ color: "var(--kipu-text)" }}>{fmtN(casilleros["111"])}</p>
                <p className="text-[10px]" style={{ color: "var(--kipu-subtle)" }}>casillero 111</p>
              </div>
              <div
                className="rounded-lg px-3 py-2.5 text-center"
                style={{
                  background: casilleros["113"] > 0
                    ? "color-mix(in srgb, var(--kipu-danger) 10%, transparent)"
                    : "color-mix(in srgb, var(--kipu-text) 4%, transparent)",
                  border: casilleros["113"] > 0
                    ? "1px solid color-mix(in srgb, var(--kipu-danger) 20%, transparent)"
                    : "none",
                }}
              >
                <p className="text-xs mb-0.5" style={{ color: "var(--kipu-subtle)" }}>Anulados</p>
                <p
                  className="text-lg font-bold"
                  style={{
                    color: casilleros["113"] > 0 ? "var(--kipu-danger)" : "var(--kipu-text)",
                  }}
                >
                  {fmtN(casilleros["113"])}
                </p>
                <p className="text-[10px]" style={{ color: "var(--kipu-subtle)" }}>casillero 113</p>
              </div>
            </div>
          </div>

        </div>
      )}
    </div>
  );
}