// app/(dashboard)/facturas/nueva/components/PagosMixtos.tsx
"use client";

import { useState } from "react";
import { Plus, Trash2, AlertTriangle } from "lucide-react";
import { clsx } from "clsx";

// ── Tipos ──────────────────────────────────────────────────────────────────────
export type FormaPagoCode = "01" | "15" | "16" | "17" | "19" | "20";

export interface PagoItem {
  _id:        string;
  forma_pago: FormaPagoCode;
  total:      number | null; // null = saldo restante automático
}

interface Props {
  pagos:          PagoItem[];
  totalFactura:   number;
  propina:        boolean;
  onChange:       (pagos: PagoItem[]) => void;
  onPropinaChange:(val: boolean) => void;
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

  // El índice del primer pago sin total (saldo restante)
  const idxSaldo = pagos.findIndex(p => p.total === null);

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
    <div className="bg-gray-900 rounded-xl border border-gray-800 p-4 space-y-4">
      <h2 className="text-sm font-semibold text-white">Forma de pago</h2>

      {/* Lista de pagos */}
      <div className="space-y-2">
        {pagos.map((pago, idx) => {
          const esSaldo = pago.total === null;

          return (
            <div
              key={pago._id}
              className={clsx(
                "flex items-center gap-2 p-3 rounded-lg border transition-colors",
                esSaldo
                  ? "border-indigo-500/30 bg-indigo-500/5"
                  : "border-gray-800 bg-gray-800/40"
              )}
            >
              {/* Forma de pago */}
              <select
                value={pago.forma_pago}
                onChange={(e) => editPago(pago._id, "forma_pago", e.target.value as FormaPagoCode)}
                className="flex-1 px-2.5 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white focus:outline-none focus:border-indigo-500 text-sm"
              >
                {FORMAS_PAGO.map(({ value, label }) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>

              {/* Monto o badge saldo restante */}
              {esSaldo ? (
                <div className="flex items-center gap-2 shrink-0">
                  <div className="text-right">
                    <p className="text-xs text-indigo-400 font-medium">
                      ${fmt(Math.max(0, saldoRestante))}
                    </p>
                    <p className="text-[10px] text-gray-500">saldo restante</p>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="text-gray-500 text-sm">$</span>
                  <input
                    type="number"
                    value={pago.total ?? ""}
                    onChange={(e) => editPago(pago._id, "total", parseFloat(e.target.value) || 0)}
                    min={0}
                    step={0.01}
                    placeholder="0.00"
                    className="w-24 px-2 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white focus:outline-none focus:border-indigo-500 text-sm text-right"
                  />
                  {/* Convertir a saldo restante */}
                  <button
                    type="button"
                    onClick={() => convertirASaldo(pago._id)}
                    title="Usar como saldo restante"
                    className="text-xs text-gray-600 hover:text-indigo-400 transition-colors px-1"
                  >
                    ↔
                  </button>
                </div>
              )}

              {/* Eliminar */}
              <button
                onClick={() => removePago(pago._id)}
                disabled={pagos.length === 1}
                className="p-1.5 text-gray-600 hover:text-red-400 hover:bg-red-500/10 rounded-lg disabled:opacity-20 transition-colors shrink-0"
              >
                <Trash2 size={14} />
              </button>
            </div>
          );
        })}
      </div>

      {/* Error si pagos superan el total */}
      {!esSaldoValido && (
        <div className="flex items-center gap-2 text-xs text-red-400 bg-red-400/10 px-3 py-2 rounded-lg">
          <AlertTriangle size={13} />
          Los pagos (${fmt(totalCubierto)}) superan el total (${fmt(totalFactura)}).
        </div>
      )}

      {/* Resumen si hay múltiples pagos */}
      {pagos.length > 1 && esSaldoValido && (
        <div className="flex justify-between text-xs text-gray-500 px-1">
          <span>Cubierto con monto fijo</span>
          <span className="text-white font-medium">${fmt(totalCubierto)}</span>
        </div>
      )}

      {/* Agregar forma de pago */}
      {pagos.length < 4 && (
        <button
          type="button"
          onClick={addPago}
          className="w-full py-2 rounded-lg border border-dashed border-gray-700 hover:border-indigo-500/50 hover:bg-indigo-500/5 text-xs text-indigo-400 hover:text-indigo-300 transition-all flex items-center justify-center gap-1.5"
        >
          <Plus size={13} />
          Agregar forma de pago
        </button>
      )}

      {/* Propina */}
      <div className="pt-2 border-t border-gray-800/80 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-300 font-medium">Propina (10%)</span>
          <span className="text-[10px] text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full">
            Requiere autorización SRI
          </span>
        </div>
        <button
          type="button"
          onClick={() => {
            if (!propina) setShowPropinaWarning(true);
            else onPropinaChange(false);
          }}
          className={clsx(
            "w-10 h-5 rounded-full transition-colors relative shrink-0",
            propina ? "bg-indigo-600" : "bg-gray-700"
          )}
        >
          <span className={clsx(
            "absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all shadow-sm",
            propina ? "left-5" : "left-0.5"
          )} />
        </button>
      </div>

      {/* Modal advertencia propina */}
      {showPropinaWarning && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-xl p-5 max-w-sm w-full space-y-4 shadow-2xl">
            <div className="flex items-start gap-3">
              <AlertTriangle size={20} className="text-amber-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-white font-semibold text-sm">Autorización requerida</p>
                <p className="text-gray-400 text-xs mt-1 leading-relaxed">
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
                className="flex-1 py-2 rounded-lg border border-gray-700 text-gray-400 hover:text-white text-sm transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => { onPropinaChange(true); setShowPropinaWarning(false); }}
                className="flex-1 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium transition-colors"
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