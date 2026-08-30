// app/(dashboard)/reportes/_components/SeccionRetenciones.tsx
"use client";
import { useState } from "react";
import { ChevronDown, ChevronUp, FileText, ArrowUpRight, ArrowDownLeft } from "lucide-react";
import { clsx } from "clsx";

interface LineaRetencion {
  porcentaje: number;
  valor:      number;
}

interface RetEnEmitida {
  numero_doc:     string;
  clave_acceso:   string;
  fecha_emision:  string;
  identificacion: string;
  razon_social:   string;
  periodo_fiscal: string;
  impuestos:      {
    codigo:           string;
    codigo_retencion: string;
    base_imponible:   number;
    porcentaje:       number;
    valor_retenido:   number;
  }[];
}

interface RetEnRecibida {
  numero_doc:    string;
  clave_acceso:  string;
  fecha_emision: string;
  ruc_agente:    string;
  razon_agente:  string;
  impuestos:     {
    codigo_porcentaje: string;
    tarifa:            string;
    base_imponible:    number;
    valor:             number;
    aplica_credito:    boolean;
  }[];
}

interface CasillerosRetEmitidas {
  "721": number; "723": number; "725": number;
  "727": number; "729": number; "731": number;
  "799": number; "801": number;
  [key: string]: number;
}

interface Props {
  // IVA — retenciones emitidas
  retEmitidas?: {
    desglose:   LineaRetencion[];
    casilleros: CasillerosRetEmitidas;
  };
  // IVA — retenciones recibidas
  retRecibidas?: {
    casilleros: { "609": number; [key: string]: number };
  };
  // ATS — detalle completo
  detalleEmitidas?:  RetEnEmitida[];
  detalleRecibidas?: RetEnRecibida[];
  modo: "IVA" | "ATS";
}

const fmt  = (n: number) => n.toLocaleString("es-EC", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtN = (n: number) => n.toLocaleString("es-EC", { minimumFractionDigits: 0 });

const PCT_LABEL: Record<number, string> = {
  10: "10%", 20: "20%", 30: "30%",
  50: "50%", 70: "70%", 100: "100%",
};
const PCT_CAS: Record<number, string> = {
  10: "721", 20: "723", 30: "725",
  50: "727", 70: "729", 100: "731",
};

export default function SeccionRetenciones({
  retEmitidas, retRecibidas, detalleEmitidas, detalleRecibidas, modo,
}: Props) {
  const [expandEmitidas,  setExpandEmitidas]  = useState(true);
  const [expandRecibidas, setExpandRecibidas] = useState(true);
  const [showDetalleE,    setShowDetalleE]    = useState(false);
  const [showDetalleR,    setShowDetalleR]    = useState(false);

  const tieneEmitidas  = (retEmitidas?.casilleros["799"] ?? 0) > 0 ||
                         (detalleEmitidas?.length ?? 0) > 0;
  const tieneRecibidas = (retRecibidas?.casilleros["609"] ?? 0) > 0 ||
                         (detalleRecibidas?.length ?? 0) > 0;

  if (!tieneEmitidas && !tieneRecibidas) {
    return (
      <div className="bg-gray-900 border border-gray-800 rounded-xl px-4 py-6 text-center">
        <FileText size={28} className="text-gray-700 mx-auto mb-2" />
        <p className="text-sm text-gray-500">Sin retenciones en este período</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">

      {/* ── RETENCIONES QUE NOSOTROS EMITIMOS ───────────────────────────── */}
      {tieneEmitidas && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          <button
            onClick={() => setExpandEmitidas(!expandEmitidas)}
            className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-800/50 transition-colors"
          >
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-yellow-400/10 flex items-center justify-center">
                <ArrowUpRight size={14} className="text-yellow-400" />
              </div>
              <div className="text-left">
                <p className="text-sm font-semibold text-white">Retenciones que emitimos</p>
                <p className="text-xs text-gray-500">
                  {modo === "ATS"
                    ? `${detalleEmitidas?.length ?? 0} comprobantes`
                    : `Agente de retención IVA`
                  }
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              {retEmitidas && (
                <div className="text-right hidden sm:block">
                  <p className="text-xs text-gray-500">Total retenido</p>
                  <p className="text-sm font-bold text-yellow-400">
                    ${fmt(retEmitidas.casilleros["799"])}
                  </p>
                </div>
              )}
              {expandEmitidas
                ? <ChevronUp   size={16} className="text-gray-500 shrink-0" />
                : <ChevronDown size={16} className="text-gray-500 shrink-0" />
              }
            </div>
          </button>

          {expandEmitidas && (
            <div className="border-t border-gray-800 p-4 space-y-4">

              {/* Modo IVA — por porcentaje */}
              {modo === "IVA" && retEmitidas && (
                <>
                  {retEmitidas.desglose.length > 0 ? (
                    <div className="space-y-1">
                      {retEmitidas.desglose.map((d) => {
                        const cas = PCT_CAS[d.porcentaje];
                        return (
                          <div key={d.porcentaje}
                            className="flex items-center justify-between gap-3 px-4 py-2.5 rounded-lg hover:bg-gray-800/40">
                            <div className="flex items-center gap-3">
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-gray-800 text-gray-400 shrink-0">
                                {cas ?? "—"}
                              </span>
                              <span className="text-xs text-gray-400">
                                Retención {PCT_LABEL[d.porcentaje] ?? `${d.porcentaje}%`}
                              </span>
                            </div>
                            <span className="text-sm font-bold text-white tabular-nums">
                              ${fmt(d.valor)}
                            </span>
                          </div>
                        );
                      })}
                      {/* Total 799 */}
                      <div className="flex items-center justify-between gap-3 px-4 py-2.5 rounded-lg bg-yellow-400/10 border border-yellow-500/20 mt-2">
                        <div className="flex items-center gap-3">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-yellow-500 text-gray-900 shrink-0">
                            799
                          </span>
                          <span className="text-xs font-medium text-white">
                            Total IVA retenido
                          </span>
                        </div>
                        <span className="text-sm font-bold text-yellow-400 tabular-nums">
                          ${fmt(retEmitidas.casilleros["799"])}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-3 px-4 py-2.5 rounded-lg hover:bg-gray-800/40">
                        <div className="flex items-center gap-3">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-gray-800 text-gray-400 shrink-0">
                            801
                          </span>
                          <span className="text-xs text-gray-400">Total a pagar por retención</span>
                        </div>
                        <span className="text-sm font-bold text-white tabular-nums">
                          ${fmt(retEmitidas.casilleros["801"])}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-gray-600 text-center py-2">
                      Sin retenciones de IVA emitidas
                    </p>
                  )}
                </>
              )}

              {/* Modo ATS — detalle por comprobante */}
              {modo === "ATS" && detalleEmitidas && (
                <>
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-gray-500">
                      {detalleEmitidas.length} comprobantes de retención emitidos
                    </p>
                    <button
                      onClick={() => setShowDetalleE(!showDetalleE)}
                      className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
                    >
                      {showDetalleE ? "Ocultar detalle" : "Ver detalle"}
                    </button>
                  </div>

                  {showDetalleE && (
                    <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                      {detalleEmitidas.map((ret, idx) => (
                        <div key={idx} className="bg-gray-800/60 rounded-lg p-3 space-y-2">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <p className="text-xs font-mono text-white">{ret.numero_doc}</p>
                              <p className="text-[10px] text-gray-500">{ret.razon_social} · {ret.identificacion}</p>
                            </div>
                            <p className="text-[10px] text-gray-500 shrink-0">{ret.fecha_emision}</p>
                          </div>
                          <div className="space-y-1">
                            {ret.impuestos.map((imp, i) => (
                              <div key={i} className="flex items-center justify-between text-[10px]">
                                <span className="text-gray-500">
                                  Cod {imp.codigo} · {imp.porcentaje}% · Base ${fmt(imp.base_imponible)}
                                </span>
                                <span className="text-yellow-400 font-bold">
                                  ${fmt(imp.valor_retenido)}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}

            </div>
          )}
        </div>
      )}

      {/* ── RETENCIONES QUE NOS HICIERON ────────────────────────────────── */}
      {tieneRecibidas && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          <button
            onClick={() => setExpandRecibidas(!expandRecibidas)}
            className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-800/50 transition-colors"
          >
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-blue-400/10 flex items-center justify-center">
                <ArrowDownLeft size={14} className="text-blue-400" />
              </div>
              <div className="text-left">
                <p className="text-sm font-semibold text-white">Retenciones que nos hicieron</p>
                <p className="text-xs text-gray-500">
                  {modo === "ATS"
                    ? `${detalleRecibidas?.length ?? 0} comprobantes recibidos`
                    : "Crédito tributario — reduce el IVA a pagar"
                  }
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              {retRecibidas && (
                <div className="text-right hidden sm:block">
                  <p className="text-xs text-gray-500">Casillero 609</p>
                  <p className="text-sm font-bold text-blue-400">
                    ${fmt(retRecibidas.casilleros["609"])}
                  </p>
                </div>
              )}
              {expandRecibidas
                ? <ChevronUp   size={16} className="text-gray-500 shrink-0" />
                : <ChevronDown size={16} className="text-gray-500 shrink-0" />
              }
            </div>
          </button>

          {expandRecibidas && (
            <div className="border-t border-gray-800 p-4 space-y-3">

              {/* Modo IVA */}
              {modo === "IVA" && retRecibidas && (
                <div className="flex items-center justify-between gap-3 px-4 py-2.5 rounded-lg bg-blue-400/10 border border-blue-500/20">
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-600 text-white shrink-0">
                      609
                    </span>
                    <span className="text-xs font-medium text-white">
                      Retenciones IVA recibidas en el período
                    </span>
                  </div>
                  <span className="text-sm font-bold text-blue-400 tabular-nums">
                    ${fmt(retRecibidas.casilleros["609"])}
                  </span>
                </div>
              )}

              {/* Modo ATS — detalle */}
              {modo === "ATS" && detalleRecibidas && (
                <>
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-gray-500">
                      {detalleRecibidas.length} retenciones recibidas
                    </p>
                    <button
                      onClick={() => setShowDetalleR(!showDetalleR)}
                      className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
                    >
                      {showDetalleR ? "Ocultar detalle" : "Ver detalle"}
                    </button>
                  </div>

                  {showDetalleR && (
                    <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                      {detalleRecibidas.map((ret, idx) => (
                        <div key={idx} className="bg-gray-800/60 rounded-lg p-3 space-y-2">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <p className="text-xs font-mono text-white">{ret.numero_doc}</p>
                              <p className="text-[10px] text-gray-500">
                                {ret.razon_agente} · {ret.ruc_agente}
                              </p>
                            </div>
                            <p className="text-[10px] text-gray-500 shrink-0">{ret.fecha_emision}</p>
                          </div>
                          <div className="space-y-1">
                            {ret.impuestos.map((imp, i) => (
                              <div key={i} className="flex items-center justify-between text-[10px]">
                                <span className="text-gray-500">
                                  {imp.tarifa}% · Base ${fmt(imp.base_imponible)}
                                  {imp.aplica_credito && (
                                    <span className="text-emerald-400 ml-1">· crédito</span>
                                  )}
                                </span>
                                <span className="text-blue-400 font-bold">${fmt(imp.valor)}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}

            </div>
          )}
        </div>
      )}
    </div>
  );
}