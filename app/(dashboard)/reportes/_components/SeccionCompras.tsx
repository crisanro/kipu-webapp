"use client";
import { useState } from "react";
import { ChevronDown, ChevronUp, ShoppingCart, CheckCircle2, XCircle } from "lucide-react";

interface DesgloseTarifa {
  tarifa:          number;
  con_credito:      number;
  sin_credito:      number;
  ncr:              number;
  neto:             number;
  iva_credito:      number;
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
  num:        string;
  label:      string;
  value:      number;
  highlight?: boolean;
  negative?:  boolean;
  dimmed?:    boolean;
}) {
  const getFilaEstilo = () => {
    if (highlight) {
      return {
        background: "color-mix(in srgb, var(--kipu-success) 10%, transparent)",
        border: "1px solid color-mix(in srgb, var(--kipu-success) 20%, transparent)",
      };
    }
    return {
      background: "transparent",
      opacity: dimmed ? 0.6 : 1,
    };
  };

  const getNumBadgeEstilo = () => {
    if (highlight) {
      return {
        background: "var(--kipu-success)",
        color: "#FFFFFF",
      };
    }
    return {
      background: "color-mix(in srgb, var(--kipu-text) 8%, transparent)",
      color: "var(--kipu-subtle)",
    };
  };

  const getValueColor = () => {
    if (highlight) return "var(--kipu-success)";
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

export default function SeccionCompras({ desglose, casilleros }: Props) {
  const [expandido, setExpandido] = useState(true);

  const tarifasNZ = desglose.filter(d => d.tarifa > 0);
  const tieneCC   = casilleros["520"] > 0;

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
            style={{ background: "color-mix(in srgb, var(--kipu-success) 20%, transparent)" }}
          >
            <ShoppingCart size={14} style={{ color: "var(--kipu-success)" }} />
          </div>
          <div className="text-left">
            <p className="text-sm font-semibold" style={{ color: "var(--kipu-text)" }}>Adquisiciones y pagos</p>
            <p className="text-xs" style={{ color: "var(--kipu-subtle)" }}>
              {casilleros["115"]} comprobantes recibidos
              {casilleros["119"] > 0 && ` · ${fmtN(casilleros["119"])} liquidaciones`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right hidden sm:block">
            <p className="text-xs" style={{ color: "var(--kipu-subtle)" }}>Crédito tributario IVA</p>
            <p className="text-sm font-bold" style={{ color: "var(--kipu-success)" }}>${fmt(casilleros["520"])}</p>
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

          {/* Por tarifa */}
          {tarifasNZ.map((d) => (
            <div key={d.tarifa}>
              <p className="text-xs font-semibold mb-2" style={{ color: "var(--kipu-text)" }}>
                Adquisiciones IVA {d.tarifa}%
              </p>

              {/* Con crédito tributario */}
              {d.con_credito > 0 && (
                <div className="mb-2">
                  <div className="flex items-center gap-1.5 mb-1 px-1">
                    <CheckCircle2 size={11} style={{ color: "var(--kipu-success)" }} />
                    <span className="text-[10px] font-medium" style={{ color: "var(--kipu-success)" }}>Con derecho a crédito tributario</span>
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
                    <XCircle size={11} style={{ color: "var(--kipu-subtle)" }} />
                    <span className="text-[10px] font-medium" style={{ color: "var(--kipu-subtle)" }}>Sin derecho a crédito tributario</span>
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
              <p className="text-xs font-semibold mb-2" style={{ color: "var(--kipu-text)" }}>Adquisiciones 0%</p>
              <div className="space-y-1">
                <Casillero num="507" label="Valor bruto" value={casilleros["507"]} dimmed />
                <Casillero num="517" label="Valor neto"  value={casilleros["517"]} dimmed />
              </div>
            </div>
          )}

          {/* Totales */}
          <div className="pt-3" style={{ borderTop: "1px solid var(--kipu-border)" }}>
            <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--kipu-subtle)" }}>
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
            <div
              className="rounded-xl px-4 py-3"
              style={{
                background: "color-mix(in srgb, var(--kipu-success) 5%, transparent)",
                border: "1px solid color-mix(in srgb, var(--kipu-success) 20%, transparent)",
              }}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold" style={{ color: "var(--kipu-success)" }}>
                    Crédito tributario IVA aplicable
                  </p>
                  <p className="text-[10px] mt-0.5" style={{ color: "var(--kipu-success)" }}>
                    Casillero 564 — reduce el IVA a pagar
                  </p>
                </div>
                <p className="text-xl font-bold" style={{ color: "var(--kipu-success)" }}>
                  ${fmt(casilleros["520"])}
                </p>
              </div>
            </div>
          )}

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
                <p className="text-xs mb-0.5" style={{ color: "var(--kipu-subtle)" }}>Recibidos</p>
                <p className="text-lg font-bold" style={{ color: "var(--kipu-text)" }}>{fmtN(casilleros["115"])}</p>
                <p className="text-[10px]" style={{ color: "var(--kipu-subtle)" }}>casillero 115</p>
              </div>
              <div
                className="rounded-lg px-3 py-2.5 text-center"
                style={{ background: "color-mix(in srgb, var(--kipu-text) 4%, transparent)" }}
              >
                <p className="text-xs mb-0.5" style={{ color: "var(--kipu-subtle)" }}>Liquidaciones</p>
                <p className="text-lg font-bold" style={{ color: "var(--kipu-text)" }}>{fmtN(casilleros["119"])}</p>
                <p className="text-[10px]" style={{ color: "var(--kipu-subtle)" }}>casillero 119</p>
              </div>
            </div>
          </div>

        </div>
      )}
    </div>
  );
}