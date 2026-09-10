"use client";

import { useState, useEffect } from "react";
import { AlertTriangle, CheckCircle2, TrendingDown, TrendingUp, Info, Save } from "lucide-react";

interface CampoManual {
  casillero:   string;
  descripcion: string;
}
interface CasillerosResumen {
  "499"?: number;
  "564"?: number;
  "601"?: number;
  "602"?: number;
  "609"?: number;
  "620"?: number;
  "699"?: number;
  "799"?: number;
  "801"?: number;
  "859"?: number;
  "501"?: number;
  "503"?: number;
  "601r"?: number;
  "699r"?: number;
  "801r"?: number;
  "841"?: number;
  "859r"?: number;
  "869"?: number;
  [key: string]: number | undefined;
}
interface ResultadoRenta {
  impuesto_causado: number;
  retenciones:      number;
  a_pagar:          number;
  saldo_favor:      number;
}
interface Props {
  tipo:              "IVA" | "RENTA" | "ATS";
  casilleros:        CasillerosResumen;
  camposManuales?:   CampoManual[];
  resultado?:        ResultadoRenta;
  onCampoManual?:    (casillero: string, valor: number) => void;
  valoresGuardados?: Record<string, number>;
  onGuardar?:        (valores: Record<string, number>) => Promise<void>;
}

const fmt = (n: number = 0) =>
  n.toLocaleString("es-EC", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function FilaCasillero({
  num, label, value = 0, highlight = false, resta = false, subtotal = false, grande = false,
  rojo = false, verde = false,
}: {
  num:        string;
  label:      string;
  value?:     number;
  highlight?: boolean;
  resta?:     boolean;
  subtotal?:  boolean;
  grande?:    boolean;
  rojo?:      boolean;
  verde?:     boolean;
}) {
  const getFilaEstilo = () => {
    if (highlight) {
      return {
        background: "color-mix(in srgb, var(--kipu-accent) 15%, transparent)",
        border: "1px solid color-mix(in srgb, var(--kipu-accent) 30%, transparent)",
      };
    }
    if (rojo) {
      return {
        background: "color-mix(in srgb, var(--kipu-danger) 5%, transparent)",
        border: "1px solid color-mix(in srgb, var(--kipu-danger) 10%, transparent)",
      };
    }
    if (verde) {
      return {
        background: "color-mix(in srgb, var(--kipu-success) 5%, transparent)",
        border: "1px solid color-mix(in srgb, var(--kipu-success) 10%, transparent)",
      };
    }
    if (subtotal) {
      return {
        background: "color-mix(in srgb, var(--kipu-text) 5%, transparent)",
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
    if (rojo) {
      return {
        background: "color-mix(in srgb, var(--kipu-danger) 20%, transparent)",
        color: "var(--kipu-danger)",
      };
    }
    if (verde) {
      return {
        background: "color-mix(in srgb, var(--kipu-success) 20%, transparent)",
        color: "var(--kipu-success)",
      };
    }
    if (subtotal) {
      return {
        background: "color-mix(in srgb, var(--kipu-text) 15%, transparent)",
        color: "var(--kipu-text)",
      };
    }
    return {
      background: "color-mix(in srgb, var(--kipu-text) 8%, transparent)",
      color: "var(--kipu-subtle)",
    };
  };

  const getLabelColor = () => {
    if (highlight) return "var(--kipu-text)";
    if (rojo) return "var(--kipu-danger)";
    if (verde) return "var(--kipu-success)";
    if (subtotal) return "var(--kipu-text)";
    return "var(--kipu-subtle)";
  };

  const getValueColor = () => {
    if (highlight) return "var(--kipu-accent)";
    if (rojo || resta) return "var(--kipu-danger)";
    if (verde) return "var(--kipu-success)";
    if (value === 0) return "var(--kipu-subtle)";
    return "var(--kipu-text)";
  };

  return (
    <div
      className={`flex items-center justify-between gap-3 rounded-lg px-4 transition-colors ${
        grande ? "py-4" : "py-2.5"
      }`}
      style={getFilaEstilo()}
      onMouseEnter={e => {
        if (!highlight && !rojo && !verde && !subtotal) {
          e.currentTarget.style.background = "color-mix(in srgb, var(--kipu-text) 3%, transparent)";
        }
      }}
      onMouseLeave={e => {
        if (!highlight && !rojo && !verde && !subtotal) {
          e.currentTarget.style.background = "transparent";
        }
      }}
    >
      <div className="flex items-center gap-3 min-w-0">
        <span
          className={`text-[10px] font-bold px-2 py-0.5 rounded shrink-0 ${
            grande ? "text-sm px-3 py-1" : ""
          }`}
          style={getNumBadgeEstilo()}
        >
          {num}
        </span>
        <span
          className={`text-xs truncate ${
            grande ? "text-base font-semibold" : ""
          } ${highlight || rojo || verde || subtotal ? "font-semibold" : ""}`}
          style={{ color: getLabelColor() }}
        >
          {resta && value > 0 ? "(−) " : ""}{label}
        </span>
      </div>
      <span
        className={`font-bold shrink-0 tabular-nums ${
          grande ? "text-2xl" : "text-sm"
        }`}
        style={{ color: getValueColor() }}
      >
        {resta && value > 0 ? "-" : ""}${fmt(value)}
      </span>
    </div>
  );
}

function InputManual({
  campo,
  value,
  onChange,
}: {
  campo:    CampoManual;
  value:    string;
  onChange: (casillero: string, val: string) => void;
}) {
  return (
    <div
      className="flex items-center justify-between gap-3 px-4 py-2 rounded-lg"
      style={{
        background: "color-mix(in srgb, var(--kipu-warning) 5%, transparent)",
        border: "1px solid color-mix(in srgb, var(--kipu-warning) 20%, transparent)",
      }}
    >
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <span
          className="text-[10px] font-bold px-2 py-0.5 rounded shrink-0"
          style={{
            background: "color-mix(in srgb, var(--kipu-warning) 20%, transparent)",
            color: "var(--kipu-warning)",
          }}
        >
          {campo.casillero}
        </span>
        <span className="text-xs truncate font-medium" style={{ color: "var(--kipu-warning)" }}>{campo.descripcion}</span>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <span className="text-xs" style={{ color: "var(--kipu-warning)" }}>$</span>
        <input
          type="number"
          step="0.01"
          min="0"
          value={value}
          onChange={e => onChange(campo.casillero, e.target.value)}
          placeholder="0.00"
          className="w-24 px-2 py-1 rounded text-xs text-right focus:outline-none tabular-nums"
          style={{
            background: "var(--kipu-surface)",
            border: "1px solid color-mix(in srgb, var(--kipu-warning) 30%, transparent)",
            color: "var(--kipu-text)",
          }}
          onFocus={e => e.currentTarget.style.borderColor = "var(--kipu-warning)"}
          onBlur={e => e.currentTarget.style.borderColor = "color-mix(in srgb, var(--kipu-warning) 30%, transparent)"}
        />
      </div>
    </div>
  );
}

export default function ResumenImpositivo({
  tipo, casilleros, camposManuales, resultado, onCampoManual,
  valoresGuardados = {}, onGuardar,
}: Props) {
  const [manuales, setManuales] = useState<Record<string, string>>({});
  const [guardando, setGuardando] = useState(false);
  const [guardado,  setGuardado]  = useState(false);
  const [dirty,     setDirty]     = useState(false);

  useEffect(() => {
    if (dirty) return;
    const init: Record<string, string> = {};
    for (const [k, v] of Object.entries(valoresGuardados)) {
      if (v !== undefined && v !== 0) init[k] = String(v);
    }
    setManuales(init);
  }, [JSON.stringify(valoresGuardados), dirty]);

  const handleManual = (casillero: string, val: string) => {
    setManuales(prev => ({ ...prev, [casillero]: val }));
    setDirty(true);
    setGuardado(false);
    const num = parseFloat(val) || 0;
    onCampoManual?.(casillero, num);
  };

  const ejecutarGuardado = async () => {
    if (!onGuardar) return;
    setGuardando(true);
    try {
      const numericos: Record<string, number> = {};
      for (const [k, v] of Object.entries(manuales)) {
        numericos[k] = parseFloat(v) || 0;
      }
      await onGuardar(numericos);
      setGuardado(true);
      setDirty(false);
    } catch (e) {
      console.error("Error guardando campos manuales:", e);
    } finally {
      setGuardando(false);
    }
  };

  const c605 = parseFloat(manuales["605"] || "0") || 0;
  const c606 = parseFloat(manuales["606"] || "0") || 0;
  const c564 = casilleros["564"] ?? 0;
  const c499 = casilleros["499"] ?? 0;

  const ivaAPagar = tipo === "IVA"
    ? Math.max(c499 - c564 - (casilleros["609"] ?? 0) - c605 - c606, 0)
    : 0;
  const saldoFavor = tipo === "IVA"
    ? Math.max(c564 + (casilleros["609"] ?? 0) + c605 + c606 - c499, 0)
    : 0;
  const tieneAPagar = tipo === "IVA" ? ivaAPagar > 0  : (resultado?.a_pagar ?? 0) > 0;
  const tieneSaldo   = tipo === "IVA" ? saldoFavor > 0 : (resultado?.saldo_favor ?? 0) > 0;

  const getCardEstiloFinal = () => {
    if (tieneAPagar) {
      return {
        background: "color-mix(in srgb, var(--kipu-danger) 10%, transparent)",
        border: "1px solid color-mix(in srgb, var(--kipu-danger) 30%, transparent)",
      };
    }
    if (tieneSaldo) {
      return {
        background: "color-mix(in srgb, var(--kipu-success) 10%, transparent)",
        border: "1px solid color-mix(in srgb, var(--kipu-success) 30%, transparent)",
      };
    }
    return {
      background: "color-mix(in srgb, var(--kipu-text) 5%, transparent)",
      border: "1px solid var(--kipu-border)",
    };
  };

  return (
    <div className="space-y-4">
      {tipo === "IVA" && (
        <div
          className="rounded-xl overflow-hidden"
          style={{
            background: "var(--kipu-surface)",
            border: "1px solid var(--kipu-border)",
          }}
        >
          <div
            className="px-4 py-3 flex items-center justify-between"
            style={{ borderBottom: "1px solid var(--kipu-border)" }}
          >
            <div>
              <p className="text-sm font-semibold" style={{ color: "var(--kipu-text)" }}>Resumen impositivo</p>
              <p className="text-xs" style={{ color: "var(--kipu-subtle)" }}>Liquidación del IVA en el período</p>
            </div>
            {onGuardar && (
              <div className="flex items-center gap-3">
                {dirty && (
                  <span className="text-xs font-medium" style={{ color: "var(--kipu-warning)" }}>Sin guardar</span>
                )}
                <button
                  type="button"
                  onClick={ejecutarGuardado}
                  disabled={guardando || (!dirty && guardado)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors shadow-sm disabled:opacity-50"
                  style={{
                    background: dirty
                      ? "var(--kipu-warning)"
                      : guardado
                        ? "color-mix(in srgb, var(--kipu-success) 20%, transparent)"
                        : "color-mix(in srgb, var(--kipu-text) 10%, transparent)",
                    color: dirty
                      ? "var(--kipu-surface)"
                      : guardado
                        ? "var(--kipu-success)"
                        : "var(--kipu-text)",
                    border: guardado && !dirty ? "1px solid color-mix(in srgb, var(--kipu-success) 30%, transparent)" : "none",
                  }}
                >
                  <Save size={13} />
                  {guardando ? "Guardando..." : guardado && !dirty ? "Guardado" : "Guardar cambios"}
                </button>
              </div>
            )}
          </div>
          <div className="p-4 space-y-1">
            <FilaCasillero num="499" label="Total IVA generado (ventas)"  value={casilleros["499"]} rojo />
            <FilaCasillero num="564" label="Crédito tributario (compras)" value={casilleros["564"]} verde resta />
            <FilaCasillero num="609" label="Retenciones IVA recibidas"    value={casilleros["609"]} verde resta />
            {(camposManuales ?? []).filter(c => ["605","606"].includes(c.casillero)).map(campo => (
              <InputManual
                key={campo.casillero}
                campo={campo}
                value={manuales[campo.casillero] ?? ""}
                onChange={handleManual}
              />
            ))}
            <div className="my-2" style={{ borderTop: "1px solid var(--kipu-border)" }} />
            <FilaCasillero num="859" label="Total consolidado IVA" value={casilleros["859"]} subtotal />
          </div>
        </div>
      )}

      {tipo === "RENTA" && resultado && (
        <div
          className="rounded-xl overflow-hidden"
          style={{
            background: "var(--kipu-surface)",
            border: "1px solid var(--kipu-border)",
          }}
        >
          <div
            className="px-4 py-3 flex items-center justify-between"
            style={{ borderBottom: "1px solid var(--kipu-border)" }}
          >
            <div>
              <p className="text-sm font-semibold" style={{ color: "var(--kipu-text)" }}>Resumen impositivo</p>
              <p className="text-xs" style={{ color: "var(--kipu-subtle)" }}>Liquidación del Impuesto a la Renta</p>
            </div>
            {onGuardar && (
              <div className="flex items-center gap-3">
                {dirty && (
                  <span className="text-xs font-medium" style={{ color: "var(--kipu-warning)" }}>Sin guardar</span>
                )}
                <button
                  type="button"
                  onClick={ejecutarGuardado}
                  disabled={guardando || (!dirty && guardado)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors shadow-sm disabled:opacity-50"
                  style={{
                    background: dirty
                      ? "var(--kipu-warning)"
                      : guardado
                        ? "color-mix(in srgb, var(--kipu-success) 20%, transparent)"
                        : "color-mix(in srgb, var(--kipu-text) 10%, transparent)",
                    color: dirty
                      ? "var(--kipu-surface)"
                      : guardado
                        ? "var(--kipu-success)"
                        : "var(--kipu-text)",
                    border: guardado && !dirty ? "1px solid color-mix(in srgb, var(--kipu-success) 30%, transparent)" : "none",
                  }}
                >
                  <Save size={13} />
                  {guardando ? "Guardando..." : guardado && !dirty ? "Guardado" : "Guardar cambios"}
                </button>
              </div>
            )}
          </div>
          <div className="p-4 space-y-1">
            <FilaCasillero num="699" label="Base imponible"            value={casilleros["699"]} />
            <FilaCasillero num="801" label="Impuesto causado"          value={resultado.impuesto_causado} />
            <FilaCasillero num="841" label="Retenciones en la fuente"  value={resultado.retenciones} verde resta />
            {(camposManuales ?? []).map(campo => (
              <InputManual
                key={campo.casillero}
                campo={campo}
                value={manuales[campo.casillero] ?? ""}
                onChange={handleManual}
              />
            ))}
            <div className="my-2" style={{ borderTop: "1px solid var(--kipu-border)" }} />
            <FilaCasillero num="859" label="Impuesto a pagar" value={resultado.a_pagar}    subtotal />
            <FilaCasillero num="869" label="Saldo a favor"    value={resultado.saldo_favor} subtotal />
          </div>
        </div>
      )}

      {tipo !== "ATS" && (
        <div
          className="rounded-2xl p-5"
          style={getCardEstiloFinal()}
        >
          <div className="flex items-center justify-between gap-4">
            <div>
              {tieneAPagar ? (
                <>
                  <div className="flex items-center gap-2 mb-1">
                    <TrendingUp size={16} style={{ color: "var(--kipu-danger)" }} />
                    <p className="text-sm font-semibold" style={{ color: "var(--kipu-danger)" }}>Impuesto a pagar</p>
                  </div>
                  <p className="text-xs" style={{ color: "var(--kipu-danger)" }}>
                    Declara y paga antes del vencimiento para evitar multas e intereses.
                  </p>
                </>
              ) : tieneSaldo ? (
                <>
                  <div className="flex items-center gap-2 mb-1">
                    <TrendingDown size={16} style={{ color: "var(--kipu-success)" }} />
                    <p className="text-sm font-semibold" style={{ color: "var(--kipu-success)" }}>Saldo a favor</p>
                  </div>
                  <p className="text-xs" style={{ color: "var(--kipu-success)" }}>
                    Puedes usar este saldo como crédito tributario el próximo mes.
                  </p>
                </>
              ) : (
                <>
                  <div className="flex items-center gap-2 mb-1">
                    <CheckCircle2 size={16} style={{ color: "var(--kipu-subtle)" }} />
                    <p className="text-sm font-semibold" style={{ color: "var(--kipu-text)" }}>Sin impuesto a pagar</p>
                  </div>
                  <p className="text-xs" style={{ color: "var(--kipu-subtle)" }}>
                    El crédito tributario cubre el IVA generado.
                  </p>
                </>
              )}
            </div>
            <p
              className="text-3xl font-bold shrink-0"
              style={{
                color: tieneAPagar
                  ? "var(--kipu-danger)"
                  : tieneSaldo
                    ? "var(--kipu-success)"
                    : "var(--kipu-subtle)",
              }}
            >
              ${fmt(tipo === "IVA"
                ? (tieneAPagar ? ivaAPagar : saldoFavor)
                : (tieneAPagar ? resultado?.a_pagar ?? 0 : resultado?.saldo_favor ?? 0)
              )}
            </p>
          </div>
        </div>
      )}

      {(camposManuales ?? []).filter(c => !["605","606"].includes(c.casillero)).length > 0 && (
        <div
          className="rounded-xl p-4"
          style={{
            background: "color-mix(in srgb, var(--kipu-warning) 5%, transparent)",
            border: "1px solid color-mix(in srgb, var(--kipu-warning) 20%, transparent)",
          }}
        >
          <div className="flex items-start gap-2 mb-3">
            <AlertTriangle size={14} className="shrink-0 mt-0.5" style={{ color: "var(--kipu-warning)" }} />
            <div>
              <p className="text-xs font-semibold" style={{ color: "var(--kipu-warning)" }}>
                Campos que debes completar manualmente en el SRI
              </p>
              <p className="text-[10px] mt-0.5" style={{ color: "var(--kipu-warning)" }}>
                No podemos calcularlos automáticamente — requieren información adicional.
              </p>
            </div>
          </div>
          <div className="space-y-2">
            {(camposManuales ?? [])
              .filter(c => !["605","606"].includes(c.casillero))
              .map(campo => (
                <div key={campo.casillero} className="flex items-center gap-3">
                  <span
                    className="text-[10px] font-bold px-2 py-0.5 rounded shrink-0"
                    style={{
                      background: "color-mix(in srgb, var(--kipu-warning) 20%, transparent)",
                      color: "var(--kipu-warning)",
                    }}
                  >
                    {campo.casillero}
                  </span>
                  <span className="text-xs font-medium" style={{ color: "var(--kipu-warning)" }}>{campo.descripcion}</span>
                </div>
              ))
            }
          </div>
        </div>
      )}

      {tipo === "ATS" && (
        <div
          className="rounded-xl p-4"
          style={{
            background: "color-mix(in srgb, #60a5fa 5%, transparent)",
            border: "1px solid color-mix(in srgb, #60a5fa 20%, transparent)",
          }}
        >
          <div className="flex items-start gap-2">
            <Info size={14} className="shrink-0 mt-0.5" style={{ color: "#60a5fa" }} />
            <div>
              <p className="text-xs font-semibold" style={{ color: "#60a5fa" }}>Sobre el ATS</p>
              <p className="text-xs mt-1" style={{ color: "#93c5fd" }}>
                El Anexo Transaccional Simplificado debe presentarse mensualmente en el portal del SRI.
                Descarga el archivo XML generado y súbelo directamente al sistema del SRI en Línea.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}