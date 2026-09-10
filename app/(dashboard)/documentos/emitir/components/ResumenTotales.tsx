"use client";
import { AlertTriangle } from "lucide-react";
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
  balanceApi:        number;
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
    <div
      className="rounded-xl p-4 sticky top-4"
      style={{
        background: "var(--kipu-surface)",
        border: "1px solid var(--kipu-border)",
      }}
    >
      <h2 className="text-sm font-semibold mb-4" style={{ color: "var(--kipu-text)" }}>
        Resumen
      </h2>

      <div className="space-y-2 text-sm">
        {totales.subtotal_0 > 0 && (
          <div className="flex justify-between" style={{ color: "var(--kipu-muted)" }}>
            <span>Subtotal 0%</span><span>${fmt(totales.subtotal_0)}</span>
          </div>
        )}
        {totales.subtotal_5 > 0 && (
          <div className="flex justify-between" style={{ color: "var(--kipu-muted)" }}>
            <span>Subtotal 5%</span><span>${fmt(totales.subtotal_5)}</span>
          </div>
        )}
        {totales.subtotal_15 > 0 && (
          <div className="flex justify-between" style={{ color: "var(--kipu-muted)" }}>
            <span>Subtotal 15%</span><span>${fmt(totales.subtotal_15)}</span>
          </div>
        )}
        {totales.descuento > 0 && (
          <div className="flex justify-between" style={{ color: "var(--kipu-warning)" }}>
            <span>Descuento</span><span>-${fmt(totales.descuento)}</span>
          </div>
        )}
        {totales.iva_5 > 0 && (
          <div className="flex justify-between" style={{ color: "var(--kipu-muted)" }}>
            <span>IVA 5%</span><span>${fmt(totales.iva_5)}</span>
          </div>
        )}
        {totales.iva_15 > 0 && (
          <div className="flex justify-between" style={{ color: "var(--kipu-muted)" }}>
            <span>IVA 15%</span><span>${fmt(totales.iva_15)}</span>
          </div>
        )}
        {totales.propina > 0 && (
          <div className="flex justify-between font-medium" style={{ color: "var(--kipu-accent)" }}>
            <span>Propina (10%)</span><span>${fmt(totales.propina)}</span>
          </div>
        )}
        <div
          className="pt-2 flex justify-between font-bold text-base"
          style={{
            borderTop: "1px solid var(--kipu-border)",
            color: "var(--kipu-text)",
          }}
        >
          <span>Total</span><span>${fmt(totales.total)}</span>
        </div>
      </div>

      {/* Modo de emisión */}
      {puedeEmitir && (
        <div
          className="mt-3 px-3 py-2 rounded-lg text-xs"
          style={{
            background: usaCreditos
              ? "color-mix(in srgb, var(--kipu-warning) 10%, transparent)"
              : "color-mix(in srgb, var(--kipu-success) 10%, transparent)",
            border: usaCreditos
              ? "1px solid color-mix(in srgb, var(--kipu-warning) 20%, transparent)"
              : "1px solid color-mix(in srgb, var(--kipu-success) 20%, transparent)",
            color: usaCreditos ? "var(--kipu-warning)" : "var(--kipu-success)",
          }}
        >
          {usaCreditos
            ? `Consumirá 1 crédito API · Disponibles: ${balanceApi}`
            : "✅ Incluido en tu suscripción"
          }
        </div>
      )}

      {/* Sin acceso */}
      {!puedeEmitir && (
        <div
          className="mt-3 rounded-lg px-3 py-2"
          style={{
            background: "color-mix(in srgb, var(--kipu-danger) 10%, transparent)",
            border: "1px solid color-mix(in srgb, var(--kipu-danger) 20%, transparent)",
          }}
        >
          <div className="flex items-center gap-1.5 mb-1">
            <AlertTriangle size={12} style={{ color: "var(--kipu-danger)" }} />
            <span className="text-xs font-medium" style={{ color: "var(--kipu-danger)" }}>
              Sin acceso para emitir
            </span>
          </div>
          <p className="text-xs" style={{ color: "color-mix(in srgb, var(--kipu-danger) 70%, transparent)" }}>
            Necesitas una{" "}
            <Link href="/planes" className="underline" style={{ color: "var(--kipu-danger)" }}>
              suscripción activa
            </Link>
            {" "}o{" "}
            <Link href="/planes" className="underline" style={{ color: "var(--kipu-danger)" }}>
              créditos API
            </Link>.
          </p>
        </div>
      )}

      {/* Error */}
      {error && (
        <p
          className="mt-3 text-xs px-3 py-2 rounded-lg"
          style={{
            color: "var(--kipu-danger)",
            background: "color-mix(in srgb, var(--kipu-danger) 10%, transparent)",
          }}
        >
          {error}
        </p>
      )}

      {/* Botón */}
      <button
        onClick={onEmitir}
        disabled={submitting || !puedeEmitir}
        className="mt-4 w-full py-3 rounded-lg text-white font-semibold text-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        style={{ background: "var(--kipu-accent)" }}
        onMouseEnter={e => {
          if (!submitting && puedeEmitir) {
            e.currentTarget.style.background = "var(--kipu-accent-h)";
          }
        }}
        onMouseLeave={e => {
          if (!submitting && puedeEmitir) {
            e.currentTarget.style.background = "var(--kipu-accent)";
          }
        }}
      >
        {submitting ? (
          <>
            <div
              className="w-4 h-4 border-2 border-t-transparent rounded-full animate-spin"
              style={{ borderColor: "#FFFFFF", borderTopColor: "transparent" }}
            />
            Emitiendo...
          </>
        ) : (
          `Emitir · $${fmt(totales.total)}`
        )}
      </button>
    </div>
  );
}