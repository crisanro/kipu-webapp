// app/(dashboard)/documentos/emitir/fac/components/ResumenTotales.tsx
"use client";
import { Loader2, AlertTriangle } from "lucide-react";
import Link from "next/link";

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
  totales:           Totales;
  submitting:        boolean;
  error:             string;
  suscripcionActiva: boolean;
  balanceApi:        number;   // ← nuevo
  onEmitir:          () => void;
}

const r2  = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;
const fmt = (n: number) => r2(n).toFixed(2);

export default function ResumenTotales({
  totales, submitting, error, suscripcionActiva, balanceApi, onEmitir,
}: Props) {
  const puedeEmitir = suscripcionActiva || balanceApi > 0;
  const usaCreditos = !suscripcionActiva && balanceApi > 0;

  return (
    <div className="bg-gray-900 rounded-xl border border-gray-800 p-4 sticky top-4">
      <h2 className="text-sm font-semibold text-white mb-4">Resumen</h2>

      <div className="space-y-2 text-sm">
        {totales.subtotal_0 > 0 && (
          <div className="flex justify-between text-gray-400">
            <span>Subtotal 0%</span><span>${fmt(totales.subtotal_0)}</span>
          </div>
        )}
        {totales.subtotal_5 > 0 && (
          <div className="flex justify-between text-gray-400">
            <span>Subtotal 5%</span><span>${fmt(totales.subtotal_5)}</span>
          </div>
        )}
        {totales.subtotal_15 > 0 && (
          <div className="flex justify-between text-gray-400">
            <span>Subtotal 15%</span><span>${fmt(totales.subtotal_15)}</span>
          </div>
        )}
        {totales.descuento > 0 && (
          <div className="flex justify-between text-amber-400">
            <span>Descuento</span><span>-${fmt(totales.descuento)}</span>
          </div>
        )}
        {totales.iva_5 > 0 && (
          <div className="flex justify-between text-gray-400">
            <span>IVA 5%</span><span>${fmt(totales.iva_5)}</span>
          </div>
        )}
        {totales.iva_15 > 0 && (
          <div className="flex justify-between text-gray-400">
            <span>IVA 15%</span><span>${fmt(totales.iva_15)}</span>
          </div>
        )}
        {totales.propina > 0 && (
          <div className="flex justify-between text-indigo-400 font-medium">
            <span>Propina (10%)</span><span>${fmt(totales.propina)}</span>
          </div>
        )}
        <div className="border-t border-gray-800 pt-2 flex justify-between font-bold text-white text-base">
          <span>Total</span><span>${fmt(totales.total)}</span>
        </div>
      </div>

      {/* Modo de emisión */}
      {puedeEmitir && (
        <div className={`mt-3 px-3 py-2 rounded-lg text-xs ${
          usaCreditos
            ? "bg-amber-500/10 border border-amber-500/20 text-amber-300"
            : "bg-emerald-500/10 border border-emerald-500/20 text-emerald-300"
        }`}>
          {usaCreditos
            ? `Consumirá 1 crédito API · Disponibles: ${balanceApi}`
            : "✅ Incluido en tu suscripción"
          }
        </div>
      )}

      {/* Sin acceso */}
      {!puedeEmitir && (
        <div className="mt-3 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
          <div className="flex items-center gap-1.5 mb-1">
            <AlertTriangle size={12} className="text-red-400" />
            <span className="text-xs text-red-400 font-medium">Sin acceso para emitir</span>
          </div>
          <p className="text-xs text-red-400/70">
            Necesitas una{" "}
            <Link href="/planes" className="underline hover:text-red-300">suscripción activa</Link>
            {" "}o{" "}
            <Link href="/planes" className="underline hover:text-red-300">créditos API</Link>.
          </p>
        </div>
      )}

      {/* Error */}
      {error && (
        <p className="mt-3 text-xs text-red-400 bg-red-400/10 px-3 py-2 rounded-lg">{error}</p>
      )}

      {/* Botón */}
      <button
        onClick={onEmitir}
        disabled={submitting || !puedeEmitir}
        className="mt-4 w-full py-3 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold text-sm transition-colors flex items-center justify-center gap-2"
      >
        {submitting
          ? <><Loader2 size={16} className="animate-spin" /> Emitiendo...</>
          : `Emitir · $${fmt(totales.total)}`
        }
      </button>
    </div>
  );
}