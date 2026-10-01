"use client";

import { useState, useEffect } from "react";
import { AlertTriangle, CheckCircle2, TrendingDown, TrendingUp, Info, Save } from "lucide-react";

interface CampoManual {
  casillero: string;
  descripcion: string;
}

interface CasillerosResumen {
  "499"?: number;
  "564"?: number;
  "601"?: number;
  "602"?: number;
  "603"?: number;
  "605"?: number;
  "606"?: number;
  "607"?: number;
  "608"?: number;
  "609"?: number;
  "610"?: number;
  "612"?: number;
  "613"?: number;
  "614"?: number;
  "615"?: number;
  "617"?: number;
  "618"?: number;
  "619"?: number;
  "620"?: number;
  "622"?: number;
  "625"?: number; // <- Ajuste crédito tributario caducado (> 5 años)
  "699"?: number;
  "801"?: number;
  "859"?: number;
  [key: string]: number | undefined;
}

interface Props {
  tipo: "IVA" | "RENTA" | "ATS";
  casilleros: CasillerosResumen;
  camposManuales?: CampoManual[];
  valoresGuardados?: Record<string, number>;
  onGuardar?: (valores: Record<string, number>) => Promise<void>;
  saldos?: { origen?: string; periodo_anterior?: string | null };
  resultado?: {
    impuesto_causado?: number;
    a_pagar?: number;
    saldo_favor?: number;
    [key: string]: any;
  };
}

const fmt = (n: number = 0) =>
  n.toLocaleString("es-EC", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function FilaCasillero({
  num,
  label,
  value = 0,
  highlight = false,
  resta = false,
  subtotal = false,
  rojo = false,
  verde = false,
}: {
  num: string;
  label: string;
  value?: number;
  highlight?: boolean;
  resta?: boolean;
  subtotal?: boolean;
  rojo?: boolean;
  verde?: boolean;
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
    return { background: "transparent" };
  };

  const getNumBadgeEstilo = () => {
    if (highlight) return { background: "var(--kipu-accent)", color: "#FFFFFF" };
    if (rojo) return { background: "color-mix(in srgb, var(--kipu-danger) 20%, transparent)", color: "var(--kipu-danger)" };
    if (verde) return { background: "color-mix(in srgb, var(--kipu-success) 20%, transparent)", color: "var(--kipu-success)" };
    if (subtotal) return { background: "color-mix(in srgb, var(--kipu-text) 15%, transparent)", color: "var(--kipu-text)" };
    return { background: "color-mix(in srgb, var(--kipu-text) 8%, transparent)", color: "var(--kipu-subtle)" };
  };

  return (
    <div className="flex items-center justify-between gap-3 rounded-lg px-4 py-2.5 transition-colors" style={getFilaEstilo()}>
      <div className="flex items-center gap-3 min-w-0">
        <span className="text-[10px] font-bold px-2 py-0.5 rounded shrink-0" style={getNumBadgeEstilo()}>
          {num}
        </span>
        <span className="text-xs truncate font-medium" style={{ color: highlight || subtotal ? "var(--kipu-text)" : "var(--kipu-subtle)" }}>
          {resta && value > 0 ? "(−) " : ""}{label}
        </span>
      </div>
      <span className="text-sm font-bold shrink-0 tabular-nums" style={{ color: highlight ? "var(--kipu-accent)" : rojo || resta ? "var(--kipu-danger)" : verde ? "var(--kipu-success)" : value === 0 ? "var(--kipu-subtle)" : "var(--kipu-text)" }}>
        {resta && value > 0 ? "-" : ""}${fmt(value)}
      </span>
    </div>
  );
}

function InputCampoAjuste({
  num,
  label,
  value,
  onChange,
}: {
  num: string;
  label: string;
  value: number;
  onChange: (val: number) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 px-4 py-2 rounded-lg" style={{ background: "color-mix(in srgb, var(--kipu-warning) 5%, transparent)", border: "1px solid color-mix(in srgb, var(--kipu-warning) 20%, transparent)" }}>
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <span className="text-[10px] font-bold px-2 py-0.5 rounded shrink-0" style={{ background: "color-mix(in srgb, var(--kipu-warning) 20%, transparent)", color: "var(--kipu-warning)" }}>
          {num}
        </span>
        <span className="text-xs truncate font-medium" style={{ color: "var(--kipu-warning)" }}>
          {label}
        </span>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <span className="text-xs font-semibold" style={{ color: "var(--kipu-warning)" }}>$</span>
        <input
          type="number"
          step="0.01"
          min="0"
          value={value === 0 ? "" : value}
          onChange={e => onChange(parseFloat(e.target.value) || 0)}
          placeholder="0.00"
          className="w-28 px-2 py-1 rounded text-xs text-right font-bold focus:outline-none tabular-nums"
          style={{ background: "var(--kipu-surface)", border: "1px solid color-mix(in srgb, var(--kipu-warning) 30%, transparent)", color: "var(--kipu-text)" }}
        />
      </div>
    </div>
  );
}

export default function ResumenImpositivo({
  tipo,
  casilleros,
  valoresGuardados = {},
  onGuardar,
  resultado,
}: Props) {
  const [val605, setVal605] = useState<number>(0);
  const [val606, setVal606] = useState<number>(0);
  const [val625, setVal625] = useState<number>(0);
  const [guardando, setGuardando] = useState(false);
  const [guardado, setGuardado] = useState(false);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    setVal605(valoresGuardados["605"] ?? casilleros["605"] ?? 0);
    setVal606(valoresGuardados["606"] ?? casilleros["606"] ?? 0);
    setVal625(valoresGuardados["625"] ?? casilleros["625"] ?? 0);
  }, [valoresGuardados, casilleros]);

  const ejecutarGuardado = async () => {
    if (!onGuardar) return;
    setGuardando(true);
    try {
      await onGuardar({ "605": val605, "606": val606, "625": val625 });
      setGuardado(true);
      setDirty(false);
    } catch (e) {
      console.error("Error guardando ajustes manuales:", e);
    } finally {
      setGuardando(false);
    }
  };

  // --- RECALCULO DE CASILLEROS EN TIEMPO REAL PARA IVA ---
  const c499 = casilleros["499"] ?? 0;
  const c564 = casilleros["564"] ?? 0;
  const c609 = casilleros["609"] ?? 0;
  const c801 = casilleros["801"] ?? 0;

  const c601 = Math.max(c499 - c564, 0);
  const c602 = Math.max(c564 - c499, 0);

  const subtotalCalculado = c601 - val605 - val606 - c609;
  const c620 = Math.max(subtotalCalculado, 0);

  const c699 = c620 + c801;

  const c615 = Math.max(c602 + val605 - val625, 0);
  const c617 = c609 + val606;

  return (
    <div className="space-y-4">
      {/* ── MÓDULO IVA (FORMULARIO 104) ─────────────────────────────────── */}
      {tipo === "IVA" && (
        <div className="rounded-xl overflow-hidden" style={{ background: "var(--kipu-surface)", border: "1px solid var(--kipu-border)" }}>
          <div className="px-4 py-3 flex items-center justify-between" style={{ borderBottom: "1px solid var(--kipu-border)" }}>
            <div>
              <p className="text-sm font-semibold" style={{ color: "var(--kipu-text)" }}>Resumen Impositivo</p>
              <p className="text-xs" style={{ color: "var(--kipu-subtle)" }}>Agente de Percepción del IVA (Formulario 104)</p>
            </div>
            {onGuardar && (
              <button
                type="button"
                onClick={ejecutarGuardado}
                disabled={guardando || (!dirty && guardado)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors disabled:opacity-50"
                style={{
                  background: dirty ? "var(--kipu-warning)" : guardado ? "color-mix(in srgb, var(--kipu-success) 20%, transparent)" : "color-mix(in srgb, var(--kipu-text) 10%, transparent)",
                  color: dirty ? "var(--kipu-surface)" : guardado ? "var(--kipu-success)" : "var(--kipu-text)",
                }}
              >
                <Save size={13} />
                {guardando ? "Guardando..." : guardado && !dirty ? "Guardado" : "Guardar valores"}
              </button>
            )}
          </div>

          <div className="p-4 space-y-1">
            <FilaCasillero num="499" label="Total IVA generado en ventas" value={c499} rojo />
            <FilaCasillero num="564" label="Crédito tributario aplicable por compras" value={c564} verde resta />

            {c601 > 0 ? (
              <FilaCasillero num="601" label="Impuesto causado" value={c601} subtotal />
            ) : (
              <FilaCasillero num="602" label="Crédito tributario del período" value={c602} verde />
            )}

            {/* Saldos Anteriores */}
            <div className="pt-3 pb-1 space-y-1.5">
              <p className="text-[11px] font-semibold" style={{ color: "var(--kipu-subtle)" }}>
                Saldos crédito tributario del mes anterior:
              </p>
              <InputCampoAjuste
                num="605"
                label="Por adquisiciones e importaciones"
                value={val605}
                onChange={val => { setVal605(val); setDirty(true); setGuardado(false); }}
              />
              <InputCampoAjuste
                num="606"
                label="Por retenciones en la fuente de IVA"
                value={val606}
                onChange={val => { setVal606(val); setDirty(true); setGuardado(false); }}
              />
            </div>

            <FilaCasillero num="609" label="Retenciones de IVA que le han sido efectuadas" value={c609} verde resta />

            <div className="my-2" style={{ borderTop: "1px solid var(--kipu-border)" }} />

            <FilaCasillero num="620" label="Subtotal a pagar" value={c620} subtotal />
            {c801 > 0 && (
              <FilaCasillero num="801" label="Retenciones de IVA que tú hiciste (a pagar)" value={c801} rojo />
            )}
            <FilaCasillero num="699" label="Total impuesto a pagar por percepción y retenciones" value={c699} subtotal highlight />

            {/* Ajuste por caducidad y saldos próximo mes */}
            <div className="pt-3 space-y-2">
              <p className="text-[11px] font-semibold" style={{ color: "var(--kipu-subtle)" }}>
                Ajustes al Crédito Tributario e importes para el próximo mes:
              </p>
              
              <InputCampoAjuste
                num="625"
                label="Ajuste crédito tributario adquisiciones superior a 5 años (caducado)"
                value={val625}
                onChange={val => { setVal625(val); setDirty(true); setGuardado(false); }}
              />

              <FilaCasillero num="615" label="Saldo crédito tributario para el próximo mes (Adquisiciones e Importaciones)" value={c615} verde />
              <FilaCasillero num="617" label="Saldo crédito tributario para el próximo mes (Retenciones en la Fuente)" value={c617} verde />
            </div>
          </div>
        </div>
      )}

      {/* ── MÓDULO RENTA (FORMULARIO 102) ─────────────────────────────────── */}
      {tipo === "RENTA" && (
        <div className="rounded-xl overflow-hidden" style={{ background: "var(--kipu-surface)", border: "1px solid var(--kipu-border)" }}>
          <div className="px-4 py-3 flex items-center justify-between" style={{ borderBottom: "1px solid var(--kipu-border)" }}>
            <div>
              <p className="text-sm font-semibold" style={{ color: "var(--kipu-text)" }}>Resumen Impuesto a la Renta</p>
              <p className="text-xs" style={{ color: "var(--kipu-subtle)" }}>Personas Naturales (Formulario 102)</p>
            </div>
          </div>

          <div className="p-4 space-y-1">
            <FilaCasillero num="849" label="Base imponible gravada" value={casilleros["849"] ?? 0} subtotal />
            <FilaCasillero num="850" label="Impuesto a la renta causado" value={casilleros["850"] ?? resultado?.impuesto_causado ?? 0} rojo />
            <FilaCasillero num="855" label="Retenciones en la fuente que le realizaron" value={casilleros["855"] ?? 0} verde resta />
            
            <div className="my-2" style={{ borderTop: "1px solid var(--kipu-border)" }} />

            <FilaCasillero
              num="859"
              label="Total Impuesto a la Renta a pagar"
              value={casilleros["859"] ?? resultado?.a_pagar ?? 0}
              highlight
            />
          </div>
        </div>
      )}
    </div>
  );
}