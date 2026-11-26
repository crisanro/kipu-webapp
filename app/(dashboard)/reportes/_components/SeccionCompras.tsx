"use client";
import { useState } from "react";
import { ChevronDown, ChevronUp, ShoppingCart, CheckCircle2, XCircle } from "lucide-react";
import { montoEC, numeroEC } from "@/lib/dinero";
import CeldaCasillero from "./CeldaCasillero";

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
  "508"?: number; "518"?: number;
  "509"?: number; "519"?: number; "529"?: number;
  "115"?: number; "117"?: number; "119"?: number;
  [key: string]: number | undefined;
}

interface Props {
  desglose:   DesgloseTarifa[];
  casilleros: CasillerosCompras;
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
    if (tarifa === 8) {
      return { brutoNum: "530", netoNum: "533", ivaNum: "534" };   // igual que el backend
    }
    return { brutoNum: "500", netoNum: "510", ivaNum: "520" };
  };

  const tarifasNZ = desglose.filter(d => d.tarifa > 0);
  // Crédito antes del factor de proporcionalidad: 520 + 521 (activos fijos) + 560
  const creditoBruto = (casilleros["520"] ?? 0) + (casilleros["521"] ?? 0) + (casilleros["560"] ?? 0);
  const tieneCC   = creditoBruto > 0;

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
            className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 bg-exito/20"
          >
            <ShoppingCart className="text-exito" size={14} />
          </div>
          <div>
            <p className="text-sm font-semibold text-texto">
              Adquisiciones y pagos
            </p>
            <p className="text-xs text-sutil">
              {numeroEC(casilleros["115"])} comprobantes recibidos
              {(casilleros["117"] ?? 0) > 0 && ` · ${numeroEC(casilleros["117"])} notas de venta`}
              {(casilleros["119"] ?? 0) > 0 && ` · ${numeroEC(casilleros["119"])} liquidaciones`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-right hidden sm:block">
            <p className="text-xs text-sutil">Crédito tributario IVA</p>
            <p className="text-sm font-bold text-exito">
              ${montoEC(creditoBruto)}
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
          {/* Desglose por Tarifa */}
          {tarifasNZ.map((d) => {
            const { brutoNum, netoNum, ivaNum } = getCasillerosCompras(d.tarifa);
            return (
              <div key={d.tarifa} className="space-y-3">
                <p className="text-xs font-semibold text-texto">
                  Adquisiciones IVA {d.tarifa}%
                </p>

                {/* Con Derecho a Crédito Tributario */}
                {d.con_credito > 0 && (
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-1.5 px-1">
                      <CheckCircle2 className="text-exito" size={11} />
                      <span className="text-[10px] font-medium" style={{ color: "var(--kipu-success)" }}>
                        Con derecho a crédito tributario
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      <CeldaCasillero tono="exito"
                        num={brutoNum}
                        label="Valor Bruto"
                        value={d.con_credito}
                      />
                      <CeldaCasillero tono="exito"
                        num={netoNum}
                        label="Valor Neto"
                        value={Math.max(d.con_credito - d.ncr, 0)}
                      />
                      <CeldaCasillero tono="exito"
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
                      <XCircle className="text-sutil" size={11} />
                      <span className="text-[10px] font-medium" style={{ color: "var(--kipu-subtle)" }}>
                        Sin derecho a crédito tributario
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      <CeldaCasillero tono="exito"
                        num="502"
                        label="Valor Bruto"
                        value={d.sin_credito}
                        dimmed
                      />
                      <CeldaCasillero tono="exito"
                        num="512"
                        label="Valor Neto"
                        value={d.sin_credito}
                        dimmed
                      />
                      <CeldaCasillero tono="exito"
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
            <div className="space-y-2 pt-2 border-t border-borde">
              <span className="text-xs font-semibold text-texto">
                Adquisiciones tarifa 0%
              </span>

              <div className="grid grid-cols-2 gap-2">
                <CeldaCasillero tono="exito"
                  num="507"
                  label="Valor Bruto"
                  value={casilleros["507"] ?? 0}
                  dimmed
                />
                <CeldaCasillero tono="exito"
                  num="517"
                  label="Valor Neto"
                  value={casilleros["517"] ?? 0}
                  dimmed
                />
              </div>
            </div>
          )}

          {/* Activos fijos con crédito tributario */}
          {(casilleros["501"] ?? 0) > 0 && (
            <div className="space-y-2 pt-2 border-t border-borde">
              <span className="text-xs font-semibold text-texto">
                Activos fijos (con derecho a crédito tributario)
              </span>
              <div className="grid grid-cols-3 gap-2">
                <CeldaCasillero tono="exito" num="501" label="Valor Bruto"        value={casilleros["501"] ?? 0} />
                <CeldaCasillero tono="exito" num="511" label="Valor Neto"         value={casilleros["511"] ?? 0} />
                <CeldaCasillero tono="exito" num="521" label="Crédito Tributario" value={casilleros["521"] ?? 0} highlight />
              </div>
            </div>
          )}

          {/* No objeto / exentas: se informan aparte, no suman al total 509 */}
          {((casilleros["531"] ?? 0) > 0 || (casilleros["532"] ?? 0) > 0) && (
            <div className="space-y-2 pt-2 border-t border-borde">
              <span className="text-xs font-semibold text-texto">
                Adquisiciones no objeto o exentas de IVA
              </span>
              <div className="grid grid-cols-2 gap-2">
                {(casilleros["531"] ?? 0) > 0 && <>
                  <CeldaCasillero tono="exito" num="531" label="No objeto · Bruto" value={casilleros["531"] ?? 0} dimmed />
                  <CeldaCasillero tono="exito" num="541" label="No objeto · Neto"  value={casilleros["541"] ?? 0} dimmed />
                </>}
                {(casilleros["532"] ?? 0) > 0 && <>
                  <CeldaCasillero tono="exito" num="532" label="Exentas · Bruto" value={casilleros["532"] ?? 0} dimmed />
                  <CeldaCasillero tono="exito" num="542" label="Exentas · Neto"  value={casilleros["542"] ?? 0} dimmed />
                </>}
              </div>
            </div>
          )}

          {/* Compras a negocios populares RIMPE (notas de venta) */}
          {(casilleros["508"] ?? 0) > 0 && (
            <div className="space-y-2 pt-2 border-t border-borde">
              <div>
                <span className="text-xs font-semibold text-texto">
                  Adquisiciones a negocios populares (RIMPE)
                </span>
                <p className="text-[10px]" style={{ color: "var(--kipu-subtle)" }}>
                  Notas de venta y facturas de negocios populares. No dan crédito tributario.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <CeldaCasillero tono="exito" num="508" label="Valor Bruto" value={casilleros["508"] ?? 0} dimmed />
                <CeldaCasillero tono="exito" num="518" label="Valor Neto"  value={casilleros["518"] ?? 0} dimmed />
              </div>
            </div>
          )}

          {/* Totales Consolidados de Adquisiciones */}
          <div className="pt-3 border-t border-borde">
            <p className="text-xs font-semibold uppercase tracking-wider mb-2.5 text-sutil">
              Totales de adquisiciones y pagos
            </p>
            <div className="grid grid-cols-3 gap-2">
              <CeldaCasillero tono="exito"
                num="509"
                label="Total Bruto"
                value={casilleros["509"] ?? 0}
              />
              <CeldaCasillero tono="exito"
                num="519"
                label="Total Neto"
                value={casilleros["519"] ?? 0}
              />
              <CeldaCasillero tono="exito"
                num="529"
                label="Total IVA Adquisiciones"
                value={casilleros["529"] ?? 0}
              />
            </div>
          </div>

          {/* Destacado de Crédito Tributario */}
          {tieneCC && (
            <div
              className="rounded-xl px-4 py-3 bg-exito/5 border border-exito/20"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-exito">
                    Crédito tributario IVA aplicable
                  </p>
                  <p className="text-[10px] mt-0.5" style={{ color: "var(--kipu-success)" }}>
                    Casilleros 520 + 521 + 560 · previo al factor de proporcionalidad
                  </p>
                </div>
                <p className="text-xl font-bold text-exito">
                  ${montoEC(creditoBruto)}
                </p>
              </div>
            </div>
          )}

          {/* Resumen de Comprobantes Recibidos */}
          <div className="pt-3 border-t border-borde">
            <p className="text-xs font-semibold uppercase tracking-wider mb-2 text-sutil">
              Resumen de Comprobantes Recibidos
            </p>
            <div className="grid grid-cols-3 gap-2">
              <div
                className="rounded-lg px-2.5 py-2 text-center bg-texto/4 border border-borde"
              >
                <p className="text-xs mb-0.5 text-sutil">Recibidos</p>
                <p className="text-base font-bold text-texto">
                  {numeroEC(casilleros["115"])}
                </p>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ background: "color-mix(in srgb, var(--kipu-text) 8%, transparent)", color: "var(--kipu-subtle)" }}>
                  115
                </span>
              </div>

              <div
                className="rounded-lg px-2.5 py-2 text-center bg-texto/4 border border-borde"
              >
                <p className="text-xs mb-0.5 text-sutil">Notas de Venta</p>
                <p className="text-base font-bold text-texto">
                  {numeroEC(casilleros["117"])}
                </p>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ background: "color-mix(in srgb, var(--kipu-text) 8%, transparent)", color: "var(--kipu-subtle)" }}>
                  117
                </span>
              </div>

              <div
                className="rounded-lg px-2.5 py-2 text-center bg-texto/4 border border-borde"
              >
                <p className="text-xs mb-0.5 text-sutil">Liquidaciones</p>
                <p className="text-base font-bold text-texto">
                  {numeroEC(casilleros["119"])}
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