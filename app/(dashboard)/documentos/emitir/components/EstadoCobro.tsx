"use client";

import { CheckCircle2, Clock } from "lucide-react";

// ── Tipos ──────────────────────────────────────────────────────────────────────
export interface DatosCobro {
  estado:     "PAGADO" | "PENDIENTE";
  fecha_pago: string;       // YYYY-MM-DD
  referencia: string;       // número de comprobante / referencia
}

interface Props {
  cobro:    DatosCobro;
  onChange: (cobro: DatosCobro) => void;
}

// ── Helpers ────────────────────────────────────────────────────────────────────
const hoy = () => new Date().toISOString().split("T")[0];

export const COBRO_INICIAL: DatosCobro = {
  estado:     "PAGADO",
  fecha_pago: hoy(),
  referencia: "",
};

// ── Componente ─────────────────────────────────────────────────────────────────
export default function EstadoCobro({ cobro, onChange }: Props) {
  const esPagado = cobro.estado === "PAGADO";

  const toggleEstado = (estado: "PAGADO" | "PENDIENTE") => {
    onChange({
      ...cobro,
      estado,
      fecha_pago: estado === "PAGADO" ? (cobro.fecha_pago || hoy()) : "",
      referencia: estado === "PENDIENTE" ? "" : cobro.referencia,
    });
  };

  return (
    <div
      className="rounded-xl p-4 space-y-3"
      style={{
        background: "var(--kipu-surface)",
        border: "1px solid var(--kipu-border)",
      }}
    >
      <h2 className="text-sm font-semibold" style={{ color: "var(--kipu-text)" }}>
        Estado de cobro
      </h2>

      {/* Toggle Cobrada / Pendiente */}
      <div
        className="flex rounded-lg overflow-hidden"
        style={{ border: "1px solid var(--kipu-border)" }}
      >
        <button
          type="button"
          onClick={() => toggleEstado("PAGADO")}
          className="flex-1 flex items-center justify-center gap-2 py-2.5 text-xs font-medium transition-colors"
          style={{
            background: esPagado
              ? "color-mix(in srgb, var(--kipu-success) 15%, transparent)"
              : "transparent",
            color: esPagado ? "var(--kipu-success)" : "var(--kipu-subtle)",
            borderRight: "1px solid var(--kipu-border)",
          }}
        >
          <CheckCircle2 size={13} />
          Cobrada
        </button>
        <button
          type="button"
          onClick={() => toggleEstado("PENDIENTE")}
          className="flex-1 flex items-center justify-center gap-2 py-2.5 text-xs font-medium transition-colors"
          style={{
            background: !esPagado
              ? "color-mix(in srgb, var(--kipu-warning) 15%, transparent)"
              : "transparent",
            color: !esPagado ? "var(--kipu-warning)" : "var(--kipu-subtle)",
          }}
        >
          <Clock size={13} />
          Pendiente de cobro
        </button>
      </div>

      {/* Campos de pago — solo cuando está cobrada */}
      {esPagado && (
        <div className="flex gap-3">
          {/* Fecha de pago */}
          <div className="flex-1">
            <label className="block text-xs mb-1" style={{ color: "var(--kipu-subtle)" }}>
              Fecha de pago
            </label>
            <input
              type="date"
              value={cobro.fecha_pago}
              onChange={(e) => onChange({ ...cobro, fecha_pago: e.target.value })}
              className="w-full px-2.5 py-2 rounded-lg text-sm transition-colors focus:outline-none"
              style={{
                background: "var(--kipu-surface)",
                border: "1px solid var(--kipu-border)",
                color: "var(--kipu-text)",
              }}
              onFocus={(e) => (e.currentTarget.style.borderColor = "var(--kipu-accent)")}
              onBlur={(e) => (e.currentTarget.style.borderColor = "var(--kipu-border)")}
            />
          </div>

          {/* Referencia / comprobante */}
          <div className="flex-1">
            <label className="block text-xs mb-1" style={{ color: "var(--kipu-subtle)" }}>
              Referencia <span style={{ color: "var(--kipu-subtle)" }}>(opcional)</span>
            </label>
            <input
              type="text"
              value={cobro.referencia}
              onChange={(e) => onChange({ ...cobro, referencia: e.target.value })}
              placeholder="N° transferencia, recibo..."
              maxLength={100}
              className="w-full px-2.5 py-2 rounded-lg text-sm transition-colors focus:outline-none"
              style={{
                background: "var(--kipu-surface)",
                border: "1px solid var(--kipu-border)",
                color: "var(--kipu-text)",
              }}
              onFocus={(e) => (e.currentTarget.style.borderColor = "var(--kipu-accent)")}
              onBlur={(e) => (e.currentTarget.style.borderColor = "var(--kipu-border)")}
            />
          </div>
        </div>
      )}

      {/* Nota para pendiente */}
      {!esPagado && (
        <p className="text-xs" style={{ color: "var(--kipu-subtle)" }}>
          Podrás registrar el cobro después desde el detalle del comprobante.
        </p>
      )}
    </div>
  );
}