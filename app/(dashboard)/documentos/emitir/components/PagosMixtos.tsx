"use client";

import { useState } from "react";
import { Plus, Trash2, AlertTriangle } from "lucide-react";

// ── Tipos ──────────────────────────────────────────────────────────────────────
export type FormaPagoCode = "01" | "15" | "16" | "17" | "19" | "20";

export interface PagoItem {
  _id:        string;
  forma_pago: FormaPagoCode;
  total:      number | null; // null = saldo restante automático
}

interface Props {
  pagos:           PagoItem[];
  totalFactura:    number;
  propina:         boolean;
  onChange:        (pagos: PagoItem[]) => void;
  onPropinaChange: (val: boolean) => void;
}

const FORMAS_PAGO: { value: FormaPagoCode; label: string }[] = [
  { value: "01", label: "Efectivo" },
  { value: "16", label: "Tarjeta de débito" },
  { value: "19", label: "Tarjeta de crédito" },
  { value: "17", label: "Dinero electrónico" },
  { value: "20", label: "Transferencia bancaria" },
  { value: "15", label: "Compensación de deudas" },
];

const r2  = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;
const fmt = (n: number) => r2(n).toFixed(2);
const genId = () => Math.random().toString(36).slice(2);

export const PAGO_INICIAL: PagoItem = {
  _id:        genId(),
  forma_pago: "01",
  total:      null, // saldo restante — cubre todo por defecto
};

// ── Componente ─────────────────────────────────────────────────────────────────
export default function PagosMixtos({
  pagos,
  totalFactura,
  propina,
  onChange,
  onPropinaChange,
}: Props) {
  const [showPropinaWarning, setShowPropinaWarning] = useState(false);

  // Calcular saldo cubierto y restante
  const totalCubierto = pagos.reduce((s, p) => s + (p.total ?? 0), 0);
  const saldoRestante = r2(totalFactura - totalCubierto);

  const editPago = (id: string, field: keyof PagoItem, value: any) => {
    onChange(pagos.map(p => p._id === id ? { ...p, [field]: value } : p));
  };

  const addPago = () => {
    // Solo se puede agregar si ya hay un pago con monto fijo — el nuevo recibe el saldo
    // Si ya existe uno sin total, el nuevo debe tener monto
    const hayUnoSinTotal = pagos.some(p => p.total === null);
    onChange([...pagos, {
      _id:        genId(),
      forma_pago: "19",
      total:      hayUnoSinTotal ? 0 : null,
    }]);
  };

  const removePago = (id: string) => {
    if (pagos.length === 1) return;
    const nuevos = pagos.filter(p => p._id !== id);
    // Si ninguno quedó sin total, el último recibe el saldo
    if (!nuevos.some(p => p.total === null)) {
      nuevos[nuevos.length - 1] = { ...nuevos[nuevos.length - 1], total: null };
    }
    onChange(nuevos);
  };

  const convertirASaldo = (id: string) => {
    // Quitar el "sin total" anterior y asignar monto, luego este pasa a sin total
    onChange(pagos.map(p => {
      if (p._id === id) return { ...p, total: null };
      if (p.total === null) return { ...p, total: 0 };
      return p;
    }));
  };

  const esSaldoValido = saldoRestante >= 0;

  return (
    <div
      className="rounded-xl p-4 space-y-4"
      style={{
        background: "var(--kipu-surface)",
        border: "1px solid var(--kipu-border)",
      }}
    >
      <h2 className="text-sm font-semibold" style={{ color: "var(--kipu-text)" }}>Forma de pago</h2>

      {/* Lista de pagos */}
      <div className="space-y-2">
        {pagos.map((pago) => {
          const esSaldo = pago.total === null;

          return (
            <div
              key={pago._id}
              className="flex items-center gap-2 p-3 rounded-lg transition-colors"
              style={{
                border: esSaldo
                  ? "1px solid color-mix(in srgb, var(--kipu-accent) 30%, transparent)"
                  : "1px solid var(--kipu-border)",
                background: esSaldo
                  ? "color-mix(in srgb, var(--kipu-accent) 5%, transparent)"
                  : "color-mix(in srgb, var(--kipu-surface) 60%, transparent)",
              }}
            >
              {/* Forma de pago */}
              <select
                value={pago.forma_pago}
                onChange={(e) => editPago(pago._id, "forma_pago", e.target.value as FormaPagoCode)}
                className="flex-1 px-2.5 py-2 rounded-lg text-sm transition-colors focus:outline-none"
                style={{
                  background: "var(--kipu-surface)",
                  border: "1px solid var(--kipu-border)",
                  color: "var(--kipu-text)",
                }}
                onFocus={(e) => (e.currentTarget.style.borderColor = "var(--kipu-accent)")}
                onBlur={(e) => (e.currentTarget.style.borderColor = "var(--kipu-border)")}
              >
                {FORMAS_PAGO.map(({ value, label }) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>

              {/* Monto o badge saldo restante */}
              {esSaldo ? (
                <div className="flex items-center gap-2 shrink-0">
                  <div className="text-right">
                    <p className="text-xs font-medium" style={{ color: "var(--kipu-accent)" }}>
                      ${fmt(Math.max(0, saldoRestante))}
                    </p>
                    <p className="text-[10px]" style={{ color: "var(--kipu-subtle)" }}>saldo restante</p>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="text-sm" style={{ color: "var(--kipu-subtle)" }}>$</span>
                  <input
                    type="number"
                    value={pago.total ?? ""}
                    onChange={(e) => editPago(pago._id, "total", parseFloat(e.target.value) || 0)}
                    min={0}
                    step={0.01}
                    placeholder="0.00"
                    className="w-24 px-2 py-2 rounded-lg text-sm text-right transition-colors focus:outline-none"
                    style={{
                      background: "var(--kipu-surface)",
                      border: "1px solid var(--kipu-border)",
                      color: "var(--kipu-text)",
                    }}
                    onFocus={(e) => (e.currentTarget.style.borderColor = "var(--kipu-accent)")}
                    onBlur={(e) => (e.currentTarget.style.borderColor = "var(--kipu-border)")}
                  />
                  {/* Convertir a saldo restante */}
                  <button
                    type="button"
                    onClick={() => convertirASaldo(pago._id)}
                    title="Usar como saldo restante"
                    className="text-xs px-1 transition-colors"
                    style={{ color: "var(--kipu-subtle)" }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = "var(--kipu-accent)")}
                    onMouseLeave={(e) => (e.currentTarget.style.color = "var(--kipu-subtle)")}
                  >
                    ↔
                  </button>
                </div>
              )}

              {/* Eliminar */}
              <button
                type="button"
                onClick={() => removePago(pago._id)}
                disabled={pagos.length === 1}
                className="p-1.5 rounded-lg transition-colors shrink-0 disabled:opacity-20"
                style={{ color: "var(--kipu-subtle)" }}
                onMouseEnter={(e) => {
                  if (pagos.length > 1) {
                    e.currentTarget.style.color = "var(--kipu-danger)";
                    e.currentTarget.style.background =
                      "color-mix(in srgb, var(--kipu-danger) 10%, transparent)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (pagos.length > 1) {
                    e.currentTarget.style.color = "var(--kipu-subtle)";
                    e.currentTarget.style.background = "transparent";
                  }
                }}
              >
                <Trash2 size={14} />
              </button>
            </div>
          );
        })}
      </div>

      {/* Error si pagos superan el total */}
      {!esSaldoValido && (
        <div
          className="flex items-center gap-2 text-xs px-3 py-2 rounded-lg"
          style={{
            color: "var(--kipu-danger)",
            background: "color-mix(in srgb, var(--kipu-danger) 10%, transparent)",
          }}
        >
          <AlertTriangle size={13} />
          Los pagos (${fmt(totalCubierto)}) superan el total (${fmt(totalFactura)}).
        </div>
      )}

      {/* Resumen si hay múltiples pagos */}
      {pagos.length > 1 && esSaldoValido && (
        <div className="flex justify-between text-xs px-1" style={{ color: "var(--kipu-subtle)" }}>
          <span>Cubierto con monto fijo</span>
          <span className="font-medium" style={{ color: "var(--kipu-text)" }}>${fmt(totalCubierto)}</span>
        </div>
      )}

      {/* Agregar forma de pago */}
      {pagos.length < 4 && (
        <button
          type="button"
          onClick={addPago}
          className="w-full py-2 rounded-lg border border-dashed text-xs transition-all flex items-center justify-center gap-1.5"
          style={{
            borderColor: "var(--kipu-border)",
            color: "var(--kipu-accent)",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = "var(--kipu-accent)";
            e.currentTarget.style.background =
              "color-mix(in srgb, var(--kipu-accent) 5%, transparent)";
            e.currentTarget.style.color = "var(--kipu-accent-h)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = "var(--kipu-border)";
            e.currentTarget.style.background = "transparent";
            e.currentTarget.style.color = "var(--kipu-accent)";
          }}
        >
          <Plus size={13} />
          Agregar forma de pago
        </button>
      )}

      {/* Propina */}
      <div
        className="pt-2 flex items-center justify-between"
        style={{ borderTop: "1px solid var(--kipu-border)" }}
      >
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium" style={{ color: "var(--kipu-muted)" }}>
            Propina (10%)
          </span>
          <span
            className="text-[10px] px-2 py-0.5 rounded-full"
            style={{
              color: "var(--kipu-warning)",
              background: "color-mix(in srgb, var(--kipu-warning) 10%, transparent)",
              border: "1px solid color-mix(in srgb, var(--kipu-warning) 20%, transparent)",
            }}
          >
            Requiere autorización SRI
          </span>
        </div>
        <button
          type="button"
          onClick={() => {
            if (!propina) setShowPropinaWarning(true);
            else onPropinaChange(false);
          }}
          className="w-10 h-5 rounded-full transition-colors relative shrink-0"
          style={{
            background: propina
              ? "var(--kipu-accent)"
              : "color-mix(in srgb, var(--kipu-text) 15%, transparent)",
          }}
        >
          <span
            className="absolute top-0.5 w-4 h-4 rounded-full transition-all shadow-sm"
            style={{
              background: "#FFFFFF",
              left: propina ? "20px" : "2px",
            }}
          />
        </button>
      </div>

      {/* Modal advertencia propina */}
      {showPropinaWarning && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div
            className="rounded-xl p-5 max-w-sm w-full space-y-4 shadow-2xl"
            style={{
              background: "var(--kipu-surface)",
              border: "1px solid var(--kipu-border)",
            }}
          >
            <div className="flex items-start gap-3">
              <AlertTriangle size={20} className="shrink-0 mt-0.5" style={{ color: "var(--kipu-warning)" }} />
              <div>
                <p className="font-semibold text-sm" style={{ color: "var(--kipu-text)" }}>
                  Autorización requerida
                </p>
                <p className="text-xs mt-1 leading-relaxed" style={{ color: "var(--kipu-muted)" }}>
                  La propina del 10% requiere autorización previa del SRI.
                  Solo aplica para establecimientos de alimentos y bebidas autorizados.
                  ¿Confirmas que tienes esta autorización?
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowPropinaWarning(false)}
                className="flex-1 py-2 rounded-lg text-sm transition-colors"
                style={{
                  border: "1px solid var(--kipu-border)",
                  color: "var(--kipu-muted)",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.color = "var(--kipu-text)")}
                onMouseLeave={(e) => (e.currentTarget.style.color = "var(--kipu-muted)")}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => { onPropinaChange(true); setShowPropinaWarning(false); }}
                className="flex-1 py-2 rounded-lg text-white text-sm font-medium transition-colors"
                style={{ background: "var(--kipu-accent)" }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "var(--kipu-accent-h)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "var(--kipu-accent)")}
              >
                Sí, tengo autorización
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}