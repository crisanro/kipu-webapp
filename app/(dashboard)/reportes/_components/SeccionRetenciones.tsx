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
  "721"?: number; "723"?: number; "725"?: number;
  "727"?: number; "729"?: number; "731"?: number;
  "799"?: number; "800"?: number; "801"?: number;
  [key: string]: number | undefined;
}

interface Props {
  retEmitidas?: {
    desglose:   LineaRetencion[];
    casilleros: CasillerosRetEmitidas;
  };
  retRecibidas?: {
    casilleros: { "609"?: number; [key: string]: number | undefined };
  };
  detalleEmitidas?:  RetEnEmitida[];
  detalleRecibidas?: RetEnRecibida[];
  modo: "IVA" | "ATS";
}

const fmt  = (n: number = 0) => n.toLocaleString("es-EC", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const PCT_CAS: Record<number, { cas: string; label: string }> = {
  10:  { cas: "721", label: "Retención del 10%" },
  20:  { cas: "723", label: "Retención del 20%" },
  30:  { cas: "725", label: "Retención del 30%" },
  50:  { cas: "727", label: "Retención del 50%" },
  70:  { cas: "729", label: "Retención del 70%" },
  100: { cas: "731", label: "Retención del 100%" },
};

function CeldaCasillero({ num, label, value, highlight = false, warning = false }: {
  num: string;
  label: string;
  value: number;
  highlight?: boolean;
  warning?: boolean;
}) {
  return (
    <div
      className="p-2.5 rounded-lg flex flex-col justify-between transition-colors"
      style={{
        background: highlight
          ? "color-mix(in srgb, var(--kipu-warning) 10%, transparent)"
          : warning
            ? "color-mix(in srgb, var(--kipu-warning) 5%, transparent)"
            : "color-mix(in srgb, var(--kipu-text) 3%, transparent)",
        border: highlight
          ? "1px solid color-mix(in srgb, var(--kipu-warning) 30%, transparent)"
          : warning
            ? "1px solid color-mix(in srgb, var(--kipu-warning) 15%, transparent)"
            : "1px solid var(--kipu-border)",
      }}
    >
      <div className="flex items-center justify-between gap-1 mb-1">
        <span
          className="text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0"
          style={{
            background: highlight
              ? "var(--kipu-warning)"
              : "color-mix(in srgb, var(--kipu-text) 10%, transparent)",
            color: highlight ? "var(--kipu-surface)" : "var(--kipu-subtle)",
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
            ? "var(--kipu-warning)"
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

export default function SeccionRetenciones({
  retEmitidas, retRecibidas, detalleEmitidas, detalleRecibidas, modo,
}: Props) {
  const [expandEmitidas,  setExpandEmitidas]  = useState(true);
  const [expandRecibidas, setExpandRecibidas] = useState(true);
  const [showDetalleE,    setShowDetalleE]    = useState(false);
  const [showDetalleR,    setShowDetalleR]    = useState(false);

  const tieneEmitidas  = (retEmitidas?.casilleros["799"] ?? 0) > 0 || (detalleEmitidas?.length ?? 0) > 0;
  const tieneRecibidas = (retRecibidas?.casilleros["609"] ?? 0) > 0 || (detalleRecibidas?.length ?? 0) > 0;

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
        <p className="text-sm font-medium" style={{ color: "var(--kipu-text)" }}>Sin retenciones en este período</p>
        <p className="text-xs mt-1" style={{ color: "var(--kipu-subtle)" }}>
          No se registraron retenciones emitidas como agente ni retenciones recibidas de clientes.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">

      {/* ── RETENCIONES QUE EMITIMOS (AGENTE DE RETENCIÓN) ───────────────────────────── */}
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
            className="w-full flex items-center justify-between px-4 py-3 transition-colors text-left"
            onMouseEnter={e => e.currentTarget.style.background = "color-mix(in srgb, var(--kipu-text) 4%, transparent)"}
            onMouseLeave={e => e.currentTarget.style.background = "transparent"}
          >
            <div className="flex items-center gap-2.5">
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                style={{ background: "color-mix(in srgb, var(--kipu-warning) 20%, transparent)" }}
              >
                <ArrowUpRight size={14} style={{ color: "var(--kipu-warning)" }} />
              </div>
              <div>
                <p className="text-sm font-semibold" style={{ color: "var(--kipu-text)" }}>
                  Retenciones que emitimos (Agente de Retención)
                </p>
                <p className="text-xs" style={{ color: "var(--kipu-subtle)" }}>
                  {modo === "ATS"
                    ? `${detalleEmitidas?.length ?? 0} comprobantes`
                    : "Impuesto retenido a pagar al SRI"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              {retEmitidas && (
                <div className="text-right hidden sm:block">
                  <p className="text-xs" style={{ color: "var(--kipu-subtle)" }}>Total a pagar (801)</p>
                  <p className="text-sm font-bold" style={{ color: "var(--kipu-warning)" }}>
                    ${fmt(retEmitidas.casilleros["801"] ?? retEmitidas.casilleros["799"] ?? 0)}
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
              {/* Modo IVA — Casilleros por Porcentaje */}
              {modo === "IVA" && retEmitidas && (
                <>
                  <p className="text-xs font-semibold" style={{ color: "var(--kipu-text)" }}>
                    Desglose por Porcentaje de Retención
                  </p>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {[10, 20, 30, 50, 70, 100].map((pct) => {
                      const info = PCT_CAS[pct];
                      const item = retEmitidas.desglose.find(d => d.porcentaje === pct);
                      const val  = item ? item.valor : (retEmitidas.casilleros[info.cas] ?? 0);

                      return (
                        <CeldaCasillero
                          key={pct}
                          num={info.cas}
                          label={info.label}
                          value={val}
                          warning={val > 0}
                        />
                      );
                    })}
                  </div>

                  {/* Resumen Final Agente de Retención */}
                  <div className="pt-3 border-t space-y-2" style={{ borderColor: "var(--kipu-border)" }}>
                    <div className="grid grid-cols-3 gap-2">
                      <CeldaCasillero
                        num="799"
                        label="Total Impuesto Retenido"
                        value={retEmitidas.casilleros["799"] ?? 0}
                      />
                      <CeldaCasillero
                        num="800"
                        label="Devolución / Compensación"
                        value={retEmitidas.casilleros["800"] ?? 0}
                      />
                      <CeldaCasillero
                        num="801"
                        label="Total a Pagar por Retención"
                        value={retEmitidas.casilleros["801"] ?? retEmitidas.casilleros["799"] ?? 0}
                        highlight
                      />
                    </div>
                  </div>
                </>
              )}

              {/* Modo ATS — Detalle por Comprobante */}
              {modo === "ATS" && detalleEmitidas && (
                <>
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold" style={{ color: "var(--kipu-text)" }}>
                      {detalleEmitidas.length} comprobantes de retención emitidos
                    </p>
                    <button
                      type="button"
                      onClick={() => setShowDetalleE(!showDetalleE)}
                      className="text-xs font-medium transition-colors"
                      style={{ color: "var(--kipu-accent)" }}
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
                          style={{
                            background: "color-mix(in srgb, var(--kipu-text) 4%, transparent)",
                            border: "1px solid var(--kipu-border)",
                          }}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <p className="text-xs font-mono font-bold" style={{ color: "var(--kipu-text)" }}>
                                {ret.numero_doc}
                              </p>
                              <p className="text-[10px]" style={{ color: "var(--kipu-subtle)" }}>
                                {ret.razon_social} · {ret.identificacion}
                              </p>
                            </div>
                            <span className="text-[10px] font-medium" style={{ color: "var(--kipu-subtle)" }}>
                              {ret.fecha_emision}
                            </span>
                          </div>

                          <div className="space-y-1 pt-1 border-t" style={{ borderColor: "var(--kipu-border)" }}>
                            {ret.impuestos.map((imp, i) => (
                              <div key={i} className="flex items-center justify-between text-[10px]">
                                <span style={{ color: "var(--kipu-subtle)" }}>
                                  Cód. {imp.codigo} ({imp.porcentaje}%) · Base ${fmt(imp.base_imponible)}
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

      {/* ── RETENCIONES QUE NOS HICIERON (CRÉDITO TRIBUTARIO) ────────────────────────────────── */}
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
            className="w-full flex items-center justify-between px-4 py-3 transition-colors text-left"
            onMouseEnter={e => e.currentTarget.style.background = "color-mix(in srgb, var(--kipu-text) 4%, transparent)"}
            onMouseLeave={e => e.currentTarget.style.background = "transparent"}
          >
            <div className="flex items-center gap-2.5">
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                style={{ background: "color-mix(in srgb, #60a5fa 20%, transparent)" }}
              >
                <ArrowDownLeft size={14} style={{ color: "#60a5fa" }} />
              </div>
              <div>
                <p className="text-sm font-semibold" style={{ color: "var(--kipu-text)" }}>
                  Retenciones que nos hicieron
                </p>
                <p className="text-xs" style={{ color: "var(--kipu-subtle)" }}>
                  {modo === "ATS"
                    ? `${detalleRecibidas?.length ?? 0} comprobantes recibidos`
                    : "Crédito tributario de IVA en ventas"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              {retRecibidas && (
                <div className="text-right hidden sm:block">
                  <p className="text-xs" style={{ color: "var(--kipu-subtle)" }}>Casillero 609</p>
                  <p className="text-sm font-bold" style={{ color: "#60a5fa" }}>
                    ${fmt(retRecibidas.casilleros["609"] ?? 0)}
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
              {modo === "IVA" && retRecibidas && (
                <div
                  className="p-3 rounded-lg flex items-center justify-between"
                  style={{
                    background: "color-mix(in srgb, #60a5fa 10%, transparent)",
                    border: "1px solid color-mix(in srgb, #60a5fa 25%, transparent)",
                  }}
                >
                  <div className="flex items-center gap-2.5">
                    <span
                      className="text-[10px] font-bold px-2 py-0.5 rounded text-white"
                      style={{ background: "#3b82f6" }}
                    >
                      609
                    </span>
                    <div>
                      <p className="text-xs font-semibold" style={{ color: "var(--kipu-text)" }}>
                        Retenciones en la fuente de IVA efectuadas en este período
                      </p>
                      <p className="text-[10px]" style={{ color: "var(--kipu-subtle)" }}>
                        Se descuenta directamente del IVA a pagar o incrementa el saldo a favor (617)
                      </p>
                    </div>
                  </div>
                  <p className="text-base font-bold tabular-nums" style={{ color: "#60a5fa" }}>
                    ${fmt(retRecibidas.casilleros["609"] ?? 0)}
                  </p>
                </div>
              )}

              {modo === "ATS" && detalleRecibidas && (
                <>
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold" style={{ color: "var(--kipu-text)" }}>
                      {detalleRecibidas.length} comprobantes de retención recibidos
                    </p>
                    <button
                      type="button"
                      onClick={() => setShowDetalleR(!showDetalleR)}
                      className="text-xs font-medium transition-colors"
                      style={{ color: "var(--kipu-accent)" }}
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
                          style={{
                            background: "color-mix(in srgb, var(--kipu-text) 4%, transparent)",
                            border: "1px solid var(--kipu-border)",
                          }}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <p className="text-xs font-mono font-bold" style={{ color: "var(--kipu-text)" }}>
                                {ret.numero_doc}
                              </p>
                              <p className="text-[10px]" style={{ color: "var(--kipu-subtle)" }}>
                                {ret.razon_agente} · {ret.ruc_agente}
                              </p>
                            </div>
                            <span className="text-[10px] font-medium" style={{ color: "var(--kipu-subtle)" }}>
                              {ret.fecha_emision}
                            </span>
                          </div>

                          <div className="space-y-1 pt-1 border-t" style={{ borderColor: "var(--kipu-border)" }}>
                            {ret.impuestos.map((imp, i) => (
                              <div key={i} className="flex items-center justify-between text-[10px]">
                                <span style={{ color: "var(--kipu-subtle)" }}>
                                  {imp.tarifa}% · Base ${fmt(imp.base_imponible)}
                                  {imp.aplica_credito && (
                                    <span className="ml-1 font-medium" style={{ color: "var(--kipu-success)" }}>
                                      · crédito
                                    </span>
                                  )}
                                </span>
                                <span className="font-bold" style={{ color: "#60a5fa" }}>
                                  ${fmt(imp.valor)}
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
    </div>
  );
}