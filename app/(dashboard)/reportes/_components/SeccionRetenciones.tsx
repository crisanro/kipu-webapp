"use client";
import { useState } from "react";
import { ChevronDown, ChevronUp, FileText, ArrowUpRight, ArrowDownLeft } from "lucide-react";

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
      <div
        className="rounded-xl px-4 py-6 text-center"
        style={{
          background: "var(--kipu-surface)",
          border: "1px solid var(--kipu-border)",
        }}
      >
        <FileText size={28} className="mx-auto mb-2" style={{ color: "var(--kipu-subtle)" }} />
        <p className="text-sm" style={{ color: "var(--kipu-subtle)" }}>Sin retenciones en este período</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">

      {/* ── RETENCIONES QUE NOSOTROS EMITIMOS ───────────────────────────── */}
      {tieneEmitidas && (
        <div
          className="rounded-xl overflow-hidden"
          style={{
            background: "var(--kipu-surface)",
            border: "1px solid var(--kipu-border)",
          }}
        >
          <button
            type="button"
            onClick={() => setExpandEmitidas(!expandEmitidas)}
            className="w-full flex items-center justify-between px-4 py-3 transition-colors"
            style={{ background: "transparent" }}
            onMouseEnter={e => e.currentTarget.style.background = "color-mix(in srgb, var(--kipu-text) 4%, transparent)"}
            onMouseLeave={e => e.currentTarget.style.background = "transparent"}
          >
            <div className="flex items-center gap-2">
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                style={{ background: "color-mix(in srgb, var(--kipu-warning) 20%, transparent)" }}
              >
                <ArrowUpRight size={14} style={{ color: "var(--kipu-warning)" }} />
              </div>
              <div className="text-left">
                <p className="text-sm font-semibold" style={{ color: "var(--kipu-text)" }}>Retenciones que emitimos</p>
                <p className="text-xs" style={{ color: "var(--kipu-subtle)" }}>
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
                  <p className="text-xs" style={{ color: "var(--kipu-subtle)" }}>Total retenido</p>
                  <p className="text-sm font-bold" style={{ color: "var(--kipu-warning)" }}>
                    ${fmt(retEmitidas.casilleros["799"])}
                  </p>
                </div>
              )}
              {expandEmitidas ? (
                <ChevronUp size={16} className="shrink-0" style={{ color: "var(--kipu-subtle)" }} />
              ) : (
                <ChevronDown size={16} className="shrink-0" style={{ color: "var(--kipu-subtle)" }} />
              )}
            </div>
          </button>

          {expandEmitidas && (
            <div
              className="p-4 space-y-4"
              style={{ borderTop: "1px solid var(--kipu-border)" }}
            >

              {/* Modo IVA — por porcentaje */}
              {modo === "IVA" && retEmitidas && (
                <>
                  {retEmitidas.desglose.length > 0 ? (
                    <div className="space-y-1">
                      {retEmitidas.desglose.map((d) => {
                        const cas = PCT_CAS[d.porcentaje];
                        return (
                          <div
                            key={d.porcentaje}
                            className="flex items-center justify-between gap-3 px-4 py-2.5 rounded-lg transition-colors"
                            style={{ background: "transparent" }}
                            onMouseEnter={e => e.currentTarget.style.background = "color-mix(in srgb, var(--kipu-text) 4%, transparent)"}
                            onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                          >
                            <div className="flex items-center gap-3">
                              <span
                                className="text-[10px] font-bold px-2 py-0.5 rounded shrink-0"
                                style={{
                                  background: "color-mix(in srgb, var(--kipu-text) 8%, transparent)",
                                  color: "var(--kipu-subtle)",
                                }}
                              >
                                {cas ?? "—"}
                              </span>
                              <span className="text-xs" style={{ color: "var(--kipu-subtle)" }}>
                                Retención {PCT_LABEL[d.porcentaje] ?? `${d.porcentaje}%`}
                              </span>
                            </div>
                            <span className="text-sm font-bold tabular-nums" style={{ color: "var(--kipu-text)" }}>
                              ${fmt(d.valor)}
                            </span>
                          </div>
                        );
                      })}
                      {/* Total 799 */}
                      <div
                        className="flex items-center justify-between gap-3 px-4 py-2.5 rounded-lg mt-2 font-medium"
                        style={{
                          background: "color-mix(in srgb, var(--kipu-warning) 10%, transparent)",
                          border: "1px solid color-mix(in srgb, var(--kipu-warning) 20%, transparent)",
                        }}
                      >
                        <div className="flex items-center gap-3">
                          <span
                            className="text-[10px] font-bold px-2 py-0.5 rounded shrink-0"
                            style={{ background: "var(--kipu-warning)", color: "var(--kipu-surface)" }}
                          >
                            799
                          </span>
                          <span className="text-xs font-medium" style={{ color: "var(--kipu-text)" }}>
                            Total IVA retenido
                          </span>
                        </div>
                        <span className="text-sm font-bold tabular-nums" style={{ color: "var(--kipu-warning)" }}>
                          ${fmt(retEmitidas.casilleros["799"])}
                        </span>
                      </div>
                      <div
                        className="flex items-center justify-between gap-3 px-4 py-2.5 rounded-lg transition-colors"
                        style={{ background: "transparent" }}
                        onMouseEnter={e => e.currentTarget.style.background = "color-mix(in srgb, var(--kipu-text) 4%, transparent)"}
                        onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                      >
                        <div className="flex items-center gap-3">
                          <span
                            className="text-[10px] font-bold px-2 py-0.5 rounded shrink-0"
                            style={{
                              background: "color-mix(in srgb, var(--kipu-text) 8%, transparent)",
                              color: "var(--kipu-subtle)",
                            }}
                          >
                            801
                          </span>
                          <span className="text-xs" style={{ color: "var(--kipu-subtle)" }}>Total a pagar por retención</span>
                        </div>
                        <span className="text-sm font-bold tabular-nums" style={{ color: "var(--kipu-text)" }}>
                          ${fmt(retEmitidas.casilleros["801"])}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-center py-2" style={{ color: "var(--kipu-subtle)" }}>
                      Sin retenciones de IVA emitidas
                    </p>
                  )}
                </>
              )}

              {/* Modo ATS — detalle por comprobante */}
              {modo === "ATS" && detalleEmitidas && (
                <>
                  <div className="flex items-center justify-between">
                    <p className="text-xs" style={{ color: "var(--kipu-subtle)" }}>
                      {detalleEmitidas.length} comprobantes de retención emitidos
                    </p>
                    <button
                      type="button"
                      onClick={() => setShowDetalleE(!showDetalleE)}
                      className="text-xs font-medium transition-colors"
                      style={{ color: "var(--kipu-accent)" }}
                      onMouseEnter={e => e.currentTarget.style.color = "var(--kipu-accent-h)"}
                      onMouseLeave={e => e.currentTarget.style.color = "var(--kipu-accent)"}
                    >
                      {showDetalleE ? "Ocultar detalle" : "Ver detalle"}
                    </button>
                  </div>

                  {showDetalleE && (
                    <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                      {detalleEmitidas.map((ret, idx) => (
                        <div
                          key={idx}
                          className="rounded-lg p-3 space-y-2"
                          style={{ background: "color-mix(in srgb, var(--kipu-text) 4%, transparent)" }}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <p className="text-xs font-mono font-medium" style={{ color: "var(--kipu-text)" }}>{ret.numero_doc}</p>
                              <p className="text-[10px]" style={{ color: "var(--kipu-subtle)" }}>{ret.razon_social} · {ret.identificacion}</p>
                            </div>
                            <p className="text-[10px] shrink-0" style={{ color: "var(--kipu-subtle)" }}>{ret.fecha_emision}</p>
                          </div>
                          <div className="space-y-1">
                            {ret.impuestos.map((imp, i) => (
                              <div key={i} className="flex items-center justify-between text-[10px]">
                                <span style={{ color: "var(--kipu-subtle)" }}>
                                  Cod {imp.codigo} · {imp.porcentaje}% · Base ${fmt(imp.base_imponible)}
                                </span>
                                <span className="font-bold" style={{ color: "var(--kipu-warning)" }}>
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
        <div
          className="rounded-xl overflow-hidden"
          style={{
            background: "var(--kipu-surface)",
            border: "1px solid var(--kipu-border)",
          }}
        >
          <button
            type="button"
            onClick={() => setExpandRecibidas(!expandRecibidas)}
            className="w-full flex items-center justify-between px-4 py-3 transition-colors"
            style={{ background: "transparent" }}
            onMouseEnter={e => e.currentTarget.style.background = "color-mix(in srgb, var(--kipu-text) 4%, transparent)"}
            onMouseLeave={e => e.currentTarget.style.background = "transparent"}
          >
            <div className="flex items-center gap-2">
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center"
                style={{ background: "color-mix(in srgb, #60a5fa 20%, transparent)" }}
              >
                <ArrowDownLeft size={14} style={{ color: "#60a5fa" }} />
              </div>
              <div className="text-left">
                <p className="text-sm font-semibold" style={{ color: "var(--kipu-text)" }}>Retenciones que nos hicieron</p>
                <p className="text-xs" style={{ color: "var(--kipu-subtle)" }}>
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
                  <p className="text-xs" style={{ color: "var(--kipu-subtle)" }}>Casillero 609</p>
                  <p className="text-sm font-bold" style={{ color: "#60a5fa" }}>
                    ${fmt(retRecibidas.casilleros["609"])}
                  </p>
                </div>
              )}
              {expandRecibidas ? (
                <ChevronUp size={16} className="shrink-0" style={{ color: "var(--kipu-subtle)" }} />
              ) : (
                <ChevronDown size={16} className="shrink-0" style={{ color: "var(--kipu-subtle)" }} />
              )}
            </div>
          </button>

          {expandRecibidas && (
            <div
              className="p-4 space-y-3"
              style={{ borderTop: "1px solid var(--kipu-border)" }}
            >

              {/* Modo IVA */}
              {modo === "IVA" && retRecibidas && (
                <div
                  className="flex items-center justify-between gap-3 px-4 py-2.5 rounded-lg"
                  style={{
                    background: "color-mix(in srgb, #60a5fa 10%, transparent)",
                    border: "1px solid color-mix(in srgb, #60a5fa 20%, transparent)",
                  }}
                >
                  <div className="flex items-center gap-3">
                    <span
                      className="text-[10px] font-bold px-2 py-0.5 rounded shrink-0 text-white"
                      style={{ background: "#3b82f6" }}
                    >
                      609
                    </span>
                    <span className="text-xs font-medium" style={{ color: "var(--kipu-text)" }}>
                      Retenciones IVA recibidas en el período
                    </span>
                  </div>
                  <span className="text-sm font-bold tabular-nums" style={{ color: "#60a5fa" }}>
                    ${fmt(retRecibidas.casilleros["609"])}
                  </span>
                </div>
              )}

              {/* Modo ATS — detalle */}
              {modo === "ATS" && detalleRecibidas && (
                <>
                  <div className="flex items-center justify-between">
                    <p className="text-xs" style={{ color: "var(--kipu-subtle)" }}>
                      {detalleRecibidas.length} retenciones recibidas
                    </p>
                    <button
                      type="button"
                      onClick={() => setShowDetalleR(!showDetalleR)}
                      className="text-xs font-medium transition-colors"
                      style={{ color: "var(--kipu-accent)" }}
                      onMouseEnter={e => e.currentTarget.style.color = "var(--kipu-accent-h)"}
                      onMouseLeave={e => e.currentTarget.style.color = "var(--kipu-accent)"}
                    >
                      {showDetalleR ? "Ocultar detalle" : "Ver detalle"}
                    </button>
                  </div>

                  {showDetalleR && (
                    <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                      {detalleRecibidas.map((ret, idx) => (
                        <div
                          key={idx}
                          className="rounded-lg p-3 space-y-2"
                          style={{ background: "color-mix(in srgb, var(--kipu-text) 4%, transparent)" }}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <p className="text-xs font-mono font-medium" style={{ color: "var(--kipu-text)" }}>{ret.numero_doc}</p>
                              <p className="text-[10px]" style={{ color: "var(--kipu-subtle)" }}>
                                {ret.razon_agente} · {ret.ruc_agente}
                              </p>
                            </div>
                            <p className="text-[10px] shrink-0" style={{ color: "var(--kipu-subtle)" }}>{ret.fecha_emision}</p>
                          </div>
                          <div className="space-y-1">
                            {ret.impuestos.map((imp, i) => (
                              <div key={i} className="flex items-center justify-between text-[10px]">
                                <span style={{ color: "var(--kipu-subtle)" }}>
                                  {imp.tarifa}% · Base ${fmt(imp.base_imponible)}
                                  {imp.aplica_credito && (
                                    <span className="ml-1 font-medium" style={{ color: "var(--kipu-success)" }}>· crédito</span>
                                  )}
                                </span>
                                <span className="font-bold" style={{ color: "#60a5fa" }}>${fmt(imp.valor)}</span>
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