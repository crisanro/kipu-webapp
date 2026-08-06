// app/(dashboard)/facturas/nueva/components/ResumenTotales.tsx
"use client";

import { Loader2, AlertTriangle } from "lucide-react";
import { clsx } from "clsx";
import Link from "next/link";

// ── Tipos ──────────────────────────────────────────────────────────────────────
interface Totales {
  subtotal:    number;
  descuento:   number;
  iva:         number;
  subtotal_0:  number;
  subtotal_5:  number;
  subtotal_15: number;
  iva_5:       number;
  iva_15:      number;
  propina:     number;
  total:       number;
}

interface Props {
  totales:         Totales;
  submitting:      boolean;
  error:           string;
  balanceEmision:  number;
  onEmitir:        () => void;
}

const r2  = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;
const fmt = (n: number) => r2(n).toFixed(2);

// ── Componente ─────────────────────────────────────────────────────────────────
export default function ResumenTotales({
  totales,
  submitting,
  error,
  balanceEmision,
  onEmitir,
}: Props) {
  return (
    <div className="bg-gray-900 rounded-xl border border-gray-800 p-4 sticky top-4">
      <h2 className="text-sm font-semibold text-white mb-4">Resumen</h2>

      {/* Desglose */}
      <div className="space-y-2 text-sm">

        {totales.subtotal_0 > 0 && (
          <div className="flex justify-between text-gray-400">
            <span>Subtotal 0%</span>
            <span>${fmt(totales.subtotal_0)}</span>
          </div>
        )}

        {totales.subtotal_5 > 0 && (
          <div className="flex justify-between text-gray-400">
            <span>Subtotal 5%</span>
            <span>${fmt(totales.subtotal_5)}</span>
          </div>
        )}

        {totales.subtotal_15 > 0 && (
          <div className="flex justify-between text-gray-400">
            <span>Subtotal 15%</span>
            <span>${fmt(totales.subtotal_15)}</span>
          </div>
        )}

        {totales.descuento > 0 && (
          <div className="flex justify-between text-amber-400">
            <span>Descuento</span>
            <span>-${fmt(totales.descuento)}</span>
          </div>
        )}

        {totales.iva_5 > 0 && (
          <div className="flex justify-between text-gray-400">
            <span>IVA 5%</span>
            <span>${fmt(totales.iva_5)}</span>
          </div>
        )}

        {totales.iva_15 > 0 && (
          <div className="flex justify-between text-gray-400">
            <span>IVA 15%</span>
            <span>${fmt(totales.iva_15)}</span>
          </div>
        )}

        {totales.propina > 0 && (
          <div className="flex justify-between text-indigo-400 font-medium">
            <span>Propina (10%)</span>
            <span>${fmt(totales.propina)}</span>
          </div>
        )}

        <div className="border-t border-gray-800 pt-2 flex justify-between font-bold text-white text-base">
          <span>Total</span>
          <span>${fmt(totales.total)}</span>
        </div>
      </div>

      {/* Créditos bajos */}
      {balanceEmision <= 5 && balanceEmision > 0 && (
        <div className="mt-3 flex items-center gap-2 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2">
          <AlertTriangle size={13} className="text-amber-400 shrink-0" />
          <p className="text-xs text-amber-300">
            Te quedan <strong>{balanceEmision}</strong> créditos.{" "}
            <Link href="/configuracion" className="underline">Recargar</Link>
          </p>
        </div>
      )}

      {/* Error */}
      {error && (
        <p className="mt-3 text-xs text-red-400 bg-red-400/10 px-3 py-2 rounded-lg">
          {error}
        </p>
      )}

      {/* Botón emitir */}
      <button
        onClick={onEmitir}
        disabled={submitting || balanceEmision === 0}
        className="mt-4 w-full py-3 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold text-sm transition-colors flex items-center justify-center gap-2"
      >
        {submitting ? (
          <><Loader2 size={16} className="animate-spin" /> Emitiendo...</>
        ) : (
          `Emitir Factura · $${fmt(totales.total)}`
        )}
      </button>

      {/* Balance */}
      <p className="mt-2 text-center text-xs text-gray-600">
        Créditos disponibles: {balanceEmision}
      </p>
    </div>
  );
}