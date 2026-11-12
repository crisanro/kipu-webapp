"use client";

import Link from "next/link";
import { CheckCircle2, Clock, CreditCard, AlertTriangle } from "lucide-react";
import { hoyEC } from "@/lib/fecha";

// ── Tipos ──────────────────────────────────────────────────────────────────────
export interface DatosCobro {
  estado:     "PAGADO" | "PENDIENTE";
  fecha_pago: string;       // YYYY-MM-DD
  referencia: string;       // número de comprobante / referencia
}

/** Pasarela de la empresa (GET /cobros-en-linea/estado) */
export interface PasarelaEstado {
  conectada:           boolean;
  nombre?:             string;
  marcar_por_defecto?: boolean;
  requiere_cliente?:   boolean;   // PagoPlux: exige cédula/RUC y correo del cliente
}

/** Link de pago OPCIONAL: solo lo pasa la factura, y se ofrece solo si queda por cobrar */
export interface OpcionLinkPago {
  pasarela: PasarelaEstado | null;
  activo:   boolean;
  onChange: (activo: boolean) => void;
  aviso?:   string | null;        // p. ej. cliente sin correo
}

interface Props {
  cobro:     DatosCobro;
  onChange:  (cobro: DatosCobro) => void;
  linkPago?: OpcionLinkPago;
}

// ── Helpers ────────────────────────────────────────────────────────────────────
// Función y no constante: una pestaña abierta desde ayer debe usar la fecha de
// hoy, y en hora de Ecuador (toISOString es UTC: después de las 19:00 da mañana).
export const cobroInicial = (): DatosCobro => ({
  estado:     "PAGADO",
  fecha_pago: hoyEC(),
  referencia: "",
});

// ── Componente ─────────────────────────────────────────────────────────────────
export default function EstadoCobro({ cobro, onChange, linkPago }: Props) {
  const esPagado = cobro.estado === "PAGADO";

  const toggleEstado = (estado: "PAGADO" | "PENDIENTE") => {
    onChange({
      ...cobro,
      estado,
      fecha_pago: estado === "PAGADO" ? (cobro.fecha_pago || hoyEC()) : "",
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

      {/* Link de pago: opcional, factura por factura */}
      {!esPagado && linkPago?.pasarela?.conectada && (
        <div className="rounded-lg p-3 space-y-2" style={{ border: "1px solid var(--kipu-border)" }}>
          <label className="flex items-start gap-2.5 cursor-pointer">
            <input
              type="checkbox"
              className="mt-0.5"
              checked={linkPago.activo}
              onChange={(e) => linkPago.onChange(e.target.checked)}
            />
            <span className="min-w-0">
              <span className="flex items-center gap-1.5 text-sm font-medium" style={{ color: "var(--kipu-text)" }}>
                <CreditCard size={14} style={{ color: "var(--kipu-accent)" }} />
                Cobrar con link de pago ({linkPago.pasarela.nombre})
              </span>
              <span className="block text-xs mt-0.5" style={{ color: "var(--kipu-subtle)" }}>
                El link va en la información adicional de la factura (XML y PDF) y en el correo
                al cliente. Cuando pague, la factura queda cobrada sola.
              </span>
            </span>
          </label>
          {linkPago.activo && linkPago.aviso && (
            <p className="flex items-start gap-1.5 text-xs" style={{ color: "var(--kipu-warning)" }}>
              <AlertTriangle size={13} className="mt-0.5 shrink-0" />
              {linkPago.aviso}
            </p>
          )}
        </div>
      )}
      {!esPagado && linkPago?.pasarela && !linkPago.pasarela.conectada && (
        <p className="text-xs" style={{ color: "var(--kipu-subtle)" }}>
          ¿Quieres cobrarla con tarjeta?{" "}
          <Link href="/configuracion#cobros" className="underline" style={{ color: "var(--kipu-accent)" }}>
            Conecta Payphone o PagoPlux
          </Link>
        </p>
      )}
    </div>
  );
}