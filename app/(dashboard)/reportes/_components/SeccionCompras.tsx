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
  "500"?: number; "510"?: number; "520"?: number;
  "540"?: number; "550"?: number; "560"?: number;
  "502"?: number; "512"?: number; "522"?: number;
  "507"?: number; "517"?: number;
  "509"?: number; "519"?: number; "529"?: number;
  "115"?: number; "117"?: number; "119"?: number;
  [key: string]: number | undefined;
}

interface Props {
  desglose:   DesgloseTarifa[];
  casilleros: CasillerosCompras;
}

const fmt  = (n: number = 0) => n.toLocaleString("es-EC", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtN = (n: number = 0) => n.toLocaleString("es-EC", { minimumFractionDigits: 0 });

function CeldaCasillero({ num, label, value, highlight = false, dimmed = false }: {
  num: string;
  label: string;
  value: number;
  highlight?: boolean;
  dimmed?: boolean;
}) {
  return (
    <div
      className="p-2.5 rounded-lg flex flex-col justify-between transition-colors"
      style={{
        background: highlight
          ? "color-mix(in srgb, var(--kipu-success) 10%, transparent)"
          : "color-mix(in srgb, var(--kipu-text) 3%, transparent)",
        border: highlight
          ? "1px solid color-mix(in srgb, var(--kipu-success) 25%, transparent)"
          : "1px solid var(--kipu-border)",
        opacity: dimmed ? 0.7 : 1,
      }}
    >
      <div className="flex items-center justify-between gap-1 mb-1">
        <span
          className="text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0"
          style={{
            background: highlight ? "var(--kipu-success)" : "color-mix(in srgb, var(--kipu-text) 10%, transparent)",
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
            ? "var(--kipu-success)"
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

export default function SeccionCompras({ desglose, casilleros }: Props) {
  const [expandido, setExpandido] = useState(true);

  // Mapeo dinámico de casilleros de compras según la tarifa
  const getCasillerosCompras = (tarifa: number) => {
    if (tarifa === 15 || tarifa === 12) {
      return { brutoNum: "500", netoNum: "510", ivaNum: "520" };
    }
    if (tarifa === 5) {
      return { brutoNum: "540", netoNum: "550", ivaNum: "560" };
    }
    return { brutoNum: "500", netoNum: "510", ivaNum: "520" };
  };

  const tarifasNZ = desglose.filter(d => d.tarifa > 0);
  const tieneCC   = (casilleros["520"] ?? 0) > 0 || (casilleros["560"] ?? 0) > 0;

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
            style={{ background: "color-mix(in srgb, var(--kipu-success) 20%, transparent)" }}
          >
            <ShoppingCart size={14} style={{ color: "var(--kipu-success)" }} />
          </div>
          <div>
            <p className="text-sm font-semibold" style={{ color: "var(--kipu-text)" }}>
              Adquisiciones y pagos
            </p>
            <p className="text-xs" style={{ color: "var(--kipu-subtle)" }}>
              {fmtN(casilleros["115"])} comprobantes recibidos
              {(casilleros["119"] ?? 0) > 0 && ` · ${fmtN(casilleros["119"])} liquidaciones`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-right hidden sm:block">
            <p className="text-xs" style={{ color: "var(--kipu-subtle)" }}>Crédito tributario IVA</p>
            <p className="text-sm font-bold" style={{ color: "var(--kipu-success)" }}>
              ${fmt((casilleros["520"] ?? 0) + (casilleros["560"] ?? 0))}
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
          {/* Desglose por Tarifa */}
          {tarifasNZ.map((d) => {
            const { brutoNum, netoNum, ivaNum } = getCasillerosCompras(d.tarifa);
            return (
              <div key={d.tarifa} className="space-y-3">
                <p className="text-xs font-semibold" style={{ color: "var(--kipu-text)" }}>
                  Adquisiciones IVA {d.tarifa}%
                </p>

                {/* Con Derecho a Crédito Tributario */}
                {d.con_credito > 0 && (
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-1.5 px-1">
                      <CheckCircle2 size={11} style={{ color: "var(--kipu-success)" }} />
                      <span className="text-[10px] font-medium" style={{ color: "var(--kipu-success)" }}>
                        Con derecho a crédito tributario
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      <CeldaCasillero
                        num={brutoNum}
                        label="Valor Bruto"
                        value={d.con_credito}
                      />
                      <CeldaCasillero
                        num={netoNum}
                        label="Valor Neto"
                        value={Math.max(d.con_credito - d.ncr, 0)}
                      />
                      <CeldaCasillero
                        num={ivaNum}
                        label="Crédito Tributario"
                        value={d.iva_credito}
                        highlight
                      />
                    </div>
                  </div>
                )}

                {/* Sin Derecho a Crédito Tributario */}
                {d.sin_credito > 0 && (
                  <div className="space-y-1.5 pt-1">
                    <div className="flex items-center gap-1.5 px-1">
                      <XCircle size={11} style={{ color: "var(--kipu-subtle)" }} />
                      <span className="text-[10px] font-medium" style={{ color: "var(--kipu-subtle)" }}>
                        Sin derecho a crédito tributario
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      <CeldaCasillero
                        num="502"
                        label="Valor Bruto"
                        value={d.sin_credito}
                        dimmed
                      />
                      <CeldaCasillero
                        num="512"
                        label="Valor Neto"
                        value={d.sin_credito}
                        dimmed
                      />
                      <CeldaCasillero
                        num="522"
                        label="IVA Cargado al Gasto"
                        value={d.iva_sin_credito}
                        dimmed
                      />
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {/* Adquisiciones Tarifa 0% */}
          {(casilleros["507"] ?? 0) > 0 && (
            <div className="space-y-2 pt-2" style={{ borderTop: "1px solid var(--kipu-border)" }}>
              <span className="text-xs font-semibold" style={{ color: "var(--kipu-text)" }}>
                Adquisiciones tarifa 0%
              </span>

              <div className="grid grid-cols-2 gap-2">
                <CeldaCasillero
                  num="507"
                  label="Valor Bruto"
                  value={casilleros["507"] ?? 0}
                  dimmed
                />
                <CeldaCasillero
                  num="517"
                  label="Valor Neto"
                  value={casilleros["517"] ?? 0}
                  dimmed
                />
              </div>
            </div>
          )}

          {/* Totales Consolidados de Adquisiciones */}
          <div className="pt-3" style={{ borderTop: "1px solid var(--kipu-border)" }}>
            <p className="text-xs font-semibold uppercase tracking-wider mb-2.5" style={{ color: "var(--kipu-subtle)" }}>
              Totales de adquisiciones y pagos
            </p>
            <div className="grid grid-cols-3 gap-2">
              <CeldaCasillero
                num="509"
                label="Total Bruto"
                value={casilleros["509"] ?? 0}
              />
              <CeldaCasillero
                num="519"
                label="Total Neto"
                value={casilleros["519"] ?? 0}
              />
              <CeldaCasillero
                num="529"
                label="Total IVA Adquisiciones"
                value={casilleros["529"] ?? 0}
              />
            </div>
          </div>

          {/* Destacado de Crédito Tributario */}
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
                    Casillero 520 / 560 · previo al factor de proporcionalidad
                  </p>
                </div>
                <p className="text-xl font-bold" style={{ color: "var(--kipu-success)" }}>
                  ${fmt((casilleros["520"] ?? 0) + (casilleros["560"] ?? 0))}
                </p>
              </div>
            </div>
          )}

          {/* Resumen de Comprobantes Recibidos */}
          <div className="pt-3" style={{ borderTop: "1px solid var(--kipu-border)" }}>
            <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--kipu-subtle)" }}>
              Resumen de Comprobantes Recibidos
            </p>
            <div className="grid grid-cols-3 gap-2">
              <div
                className="rounded-lg px-2.5 py-2 text-center"
                style={{
                  background: "color-mix(in srgb, var(--kipu-text) 4%, transparent)",
                  border: "1px solid var(--kipu-border)",
                }}
              >
                <p className="text-xs mb-0.5" style={{ color: "var(--kipu-subtle)" }}>Recibidos</p>
                <p className="text-base font-bold" style={{ color: "var(--kipu-text)" }}>
                  {fmtN(casilleros["115"])}
                </p>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ background: "color-mix(in srgb, var(--kipu-text) 8%, transparent)", color: "var(--kipu-subtle)" }}>
                  115
                </span>
              </div>

              <div
                className="rounded-lg px-2.5 py-2 text-center"
                style={{
                  background: "color-mix(in srgb, var(--kipu-text) 4%, transparent)",
                  border: "1px solid var(--kipu-border)",
                }}
              >
                <p className="text-xs mb-0.5" style={{ color: "var(--kipu-subtle)" }}>Notas de Venta</p>
                <p className="text-base font-bold" style={{ color: "var(--kipu-text)" }}>
                  {fmtN(casilleros["117"])}
                </p>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ background: "color-mix(in srgb, var(--kipu-text) 8%, transparent)", color: "var(--kipu-subtle)" }}>
                  117
                </span>
              </div>

              <div
                className="rounded-lg px-2.5 py-2 text-center"
                style={{
                  background: "color-mix(in srgb, var(--kipu-text) 4%, transparent)",
                  border: "1px solid var(--kipu-border)",
                }}
              >
                <p className="text-xs mb-0.5" style={{ color: "var(--kipu-subtle)" }}>Liquidaciones</p>
                <p className="text-base font-bold" style={{ color: "var(--kipu-text)" }}>
                  {fmtN(casilleros["119"])}
                </p>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ background: "color-mix(in srgb, var(--kipu-text) 8%, transparent)", color: "var(--kipu-subtle)" }}>
                  119
                </span>
              </div>
            </div>
          </div>

        </div>
      )}
    </div>
  );
}