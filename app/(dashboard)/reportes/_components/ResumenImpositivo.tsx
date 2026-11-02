"use client";

import { useState } from "react";
import { Info, Save } from "lucide-react";

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
  onGuardar?: (valores: Record<string, number | null>) => Promise<void>;
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
  manual = false,
  onRestaurar,
}: {
  num: string;
  label: string;
  value: number;
  onChange: (val: number) => void;
  manual?: boolean;
  onRestaurar?: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 px-4 py-2 rounded-lg" style={{ background: "color-mix(in srgb, var(--kipu-warning) 5%, transparent)", border: "1px solid color-mix(in srgb, var(--kipu-warning) 20%, transparent)" }}>
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <span className="text-[10px] font-bold px-2 py-0.5 rounded shrink-0" style={{ background: "color-mix(in srgb, var(--kipu-warning) 20%, transparent)", color: "var(--kipu-warning)" }}>
          {num}
        </span>
        <div className="min-w-0">
          <span className="block text-xs truncate font-medium" style={{ color: "var(--kipu-warning)" }}>
            {label}
          </span>
          <span className="block text-[10px]" style={{ color: "var(--kipu-subtle)" }}>
            {manual ? "Ingresado a mano · " : "Calculado por Kipu"}
            {manual && onRestaurar && (
              <button type="button" onClick={onRestaurar} className="underline" style={{ color: "var(--kipu-accent)" }}>
                usar cálculo automático
              </button>
            )}
          </span>
        </div>
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

type Ajustable = "605" | "606" | "625";

export default function ResumenImpositivo({
  tipo,
  casilleros,
  valoresGuardados = {},
  onGuardar,
  saldos,
  resultado,
}: Props) {
  // Solo los casilleros que el usuario editó y aún no guardó. Todo lo demás
  // (incluido el resultado) viene del backend: aquí no se recalcula nada, para
  // que la cifra que se copia al SRI sea una sola.
  const [editados, setEditados] = useState<Partial<Record<Ajustable, number | null>>>({});
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");

  const dirty = Object.keys(editados).length > 0;
  const esManual = (c: Ajustable) =>
    editados[c] !== undefined ? editados[c] !== null : c in valoresGuardados;
  const valorCampo = (c: Ajustable) => {
    const e = editados[c];
    if (e !== undefined && e !== null) return e;
    return casilleros[c] ?? 0;
  };
  const editar = (c: Ajustable, v: number | null) => {
    setEditados(prev => ({ ...prev, [c]: v }));
    setError("");
  };

  const ejecutarGuardado = async () => {
    if (!onGuardar || !dirty) return;
    setGuardando(true);
    setError("");
    try {
      // null = volver al cálculo automático (el backend lo quita de los manuales)
      await onGuardar(editados as Record<string, number | null>);
      setEditados({});
    } catch (e: any) {
      setError(e?.response?.data?.detail ?? "No se pudieron guardar los valores.");
    } finally {
      setGuardando(false);
    }
  };

  const c = (n: string) => casilleros[n] ?? 0;
  const c601 = c("601");
  const c801 = c("801");

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
                disabled={guardando || !dirty}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors disabled:opacity-50"
                style={{
                  background: dirty ? "var(--kipu-warning)" : "color-mix(in srgb, var(--kipu-text) 10%, transparent)",
                  color: dirty ? "var(--kipu-surface)" : "var(--kipu-text)",
                }}
              >
                <Save size={13} />
                {guardando ? "Recalculando..." : "Guardar y recalcular"}
              </button>
            )}
          </div>

          <div className="p-4 space-y-1">
            {dirty && (
              <div className="flex items-start gap-2 rounded-lg px-3 py-2 mb-2" style={{ background: "color-mix(in srgb, var(--kipu-warning) 10%, transparent)" }}>
                <Info size={13} className="shrink-0 mt-0.5" style={{ color: "var(--kipu-warning)" }} />
                <p className="text-[11px]" style={{ color: "var(--kipu-warning)" }}>
                  Tienes cambios sin guardar. Los totales de abajo se actualizan al guardar.
                </p>
              </div>
            )}
            {error && (
              <p className="text-[11px] px-1 pb-1" style={{ color: "var(--kipu-danger)" }}>{error}</p>
            )}

            <FilaCasillero num="499" label="Total IVA generado en ventas" value={c("499")} rojo />
            <FilaCasillero num="564" label="Crédito tributario aplicable por compras" value={c("564")} verde resta />

            {c601 > 0 ? (
              <FilaCasillero num="601" label="Impuesto causado" value={c601} subtotal />
            ) : (
              <FilaCasillero num="602" label="Crédito tributario del período" value={c("602")} verde />
            )}

            {/* Saldos Anteriores */}
            <div className="pt-3 pb-1 space-y-1.5">
              <p className="text-[11px] font-semibold" style={{ color: "var(--kipu-subtle)" }}>
                Saldos crédito tributario del mes anterior
                {saldos?.origen === "KIPU" && saldos.periodo_anterior ? ` (tomados de ${saldos.periodo_anterior})` : ""}:
              </p>
              {(["605", "606"] as const).map(cas => (
                <InputCampoAjuste
                  key={cas}
                  num={cas}
                  label={cas === "605" ? "Por adquisiciones e importaciones" : "Por retenciones en la fuente de IVA"}
                  value={valorCampo(cas)}
                  manual={esManual(cas)}
                  onChange={v => editar(cas, v)}
                  onRestaurar={onGuardar ? () => editar(cas, null) : undefined}
                />
              ))}
            </div>

            <FilaCasillero num="609" label="Retenciones de IVA que le han sido efectuadas" value={c("609")} verde resta />

            <div className="my-2" style={{ borderTop: "1px solid var(--kipu-border)" }} />

            <FilaCasillero num="620" label="Subtotal a pagar" value={c("620")} subtotal />
            <FilaCasillero num="699" label="Total impuesto a pagar por percepción" value={c("699")} subtotal />
            {c801 > 0 && (
              <FilaCasillero num="801" label="Retenciones de IVA que tú hiciste (a pagar)" value={c801} rojo />
            )}
            <FilaCasillero num="859" label="Total a pagar" value={c("859")} subtotal highlight />

            {/* Ajuste por caducidad y saldos próximo mes */}
            <div className="pt-3 space-y-2">
              <p className="text-[11px] font-semibold" style={{ color: "var(--kipu-subtle)" }}>
                Ajustes al Crédito Tributario e importes para el próximo mes:
              </p>

              <InputCampoAjuste
                num="625"
                label="Ajuste crédito tributario adquisiciones superior a 5 años (caducado)"
                value={valorCampo("625")}
                manual={esManual("625")}
                onChange={v => editar("625", v)}
                onRestaurar={onGuardar ? () => editar("625", null) : undefined}
              />

              <FilaCasillero num="615" label="Saldo crédito tributario para el próximo mes (Adquisiciones e Importaciones)" value={c("615")} verde />
              <FilaCasillero num="617" label="Saldo crédito tributario para el próximo mes (Retenciones en la Fuente)" value={c("617")} verde />
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