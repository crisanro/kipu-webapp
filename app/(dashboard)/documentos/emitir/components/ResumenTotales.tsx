"use client";
import { AlertTriangle } from "lucide-react";
import { dosDecimales } from "@/lib/dinero";
import Link from "next/link";
import AccionesUsoJusto from "./AccionesUsoJusto";
import { ES_APP_NATIVA } from "@/lib/plataforma";

interface Totales {
  subtotal:    number;
  descuento:   number;
  iva:         number;
  subtotal_0:  number;
  subtotal_no_objeto?: number;
  subtotal_exento?:    number;
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
  emisionGratis?:    boolean;  // plan gratis: emite sin plan ni créditos, con uso justo
  usoJusto?:         boolean;  // el error es por el uso justo: mostrar cómo seguir
  onEmitir:          () => void;
  serie?:            string;   // "002-001": desde dónde sale, a la vista justo antes de emitir
  textoBoton?:       string;   // p. ej. "Crear link de cobro" (la factura se emite cuando paguen)
  aviso?:            string | null;  // problema que se ve antes de emitir (p. ej. Consumidor Final > $50)
  /** Con EmisionLayout: en el celular el botón está en la barra fija de abajo. */
  conBarraFija?:     boolean;
}

export default function ResumenTotales({
  totales, submitting, error, suscripcionActiva, balanceApi, emisionGratis = false, usoJusto = false,
  onEmitir, serie, textoBoton, aviso, conBarraFija = false,
}: Props) {
  const gratis      = !suscripcionActiva && emisionGratis;
  const puedeEmitir = suscripcionActiva || balanceApi > 0 || gratis;
  const usaCreditos = !suscripcionActiva && !gratis && balanceApi > 0;

  return (
    <div
      className="rounded-xl p-4 sticky top-4 bg-superficie border border-borde"
    >
      <h2 className="text-sm font-semibold mb-4 text-texto">
        Resumen
      </h2>

      <div className="space-y-2 text-sm">
        {totales.subtotal_0 > 0 && (
          <div className="flex justify-between text-tenue">
            <span>Subtotal 0%</span><span>${dosDecimales(totales.subtotal_0)}</span>
          </div>
        )}
        {(totales.subtotal_no_objeto ?? 0) > 0 && (
          <div className="flex justify-between text-tenue">
            <span>Subtotal no objeto de IVA</span><span>${dosDecimales(totales.subtotal_no_objeto ?? 0)}</span>
          </div>
        )}
        {(totales.subtotal_exento ?? 0) > 0 && (
          <div className="flex justify-between text-tenue">
            <span>Subtotal exento de IVA</span><span>${dosDecimales(totales.subtotal_exento ?? 0)}</span>
          </div>
        )}
        {totales.subtotal_5 > 0 && (
          <div className="flex justify-between text-tenue">
            <span>Subtotal 5%</span><span>${dosDecimales(totales.subtotal_5)}</span>
          </div>
        )}
        {totales.subtotal_15 > 0 && (
          <div className="flex justify-between text-tenue">
            <span>Subtotal 15%</span><span>${dosDecimales(totales.subtotal_15)}</span>
          </div>
        )}
        {totales.descuento > 0 && (
          <div className="flex justify-between text-alerta">
            <span>Descuento</span><span>-${dosDecimales(totales.descuento)}</span>
          </div>
        )}
        {totales.iva_5 > 0 && (
          <div className="flex justify-between text-tenue">
            <span>IVA 5%</span><span>${dosDecimales(totales.iva_5)}</span>
          </div>
        )}
        {totales.iva_15 > 0 && (
          <div className="flex justify-between text-tenue">
            <span>IVA 15%</span><span>${dosDecimales(totales.iva_15)}</span>
          </div>
        )}
        {totales.propina > 0 && (
          <div className="flex justify-between font-medium text-acento">
            <span>Propina (10%)</span><span>${dosDecimales(totales.propina)}</span>
          </div>
        )}
        <div
          className="pt-2 flex justify-between font-bold text-base border-t border-borde text-texto"
        >
          <span>Total</span><span>${dosDecimales(totales.total)}</span>
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
            : gratis
              ? "Plan gratis · uso justo de comprobantes al mes"
              : "✅ Incluido en tu suscripción"
          }
        </div>
      )}

      {/* Sin acceso */}
      {!puedeEmitir && (
        <div
          className="mt-3 rounded-lg px-3 py-2 bg-peligro-suave border border-peligro/20"
        >
          <div className="flex items-center gap-1.5 mb-1">
            <AlertTriangle className="text-peligro" size={12} />
            <span className="text-xs font-medium text-peligro">
              Sin acceso para emitir
            </span>
          </div>
          <p className="text-xs text-peligro/70">
            {ES_APP_NATIVA ? (
              "Tu plan actual no tiene comprobantes disponibles para emitir."
            ) : (
              <>
                Necesitas una{" "}
                <Link href="/planes" className="underline text-peligro">
                  suscripción activa
                </Link>
                {" "}o{" "}
                <Link href="/planes" className="underline text-peligro">
                  créditos API
                </Link>.
              </>
            )}
          </p>
        </div>
      )}

      {/* Aviso antes de emitir (si ya es el error, no se repite) */}
      {aviso && aviso !== error && (
        <p
          className="mt-3 flex items-start gap-1.5 text-xs px-3 py-2 rounded-lg text-alerta bg-alerta/10"
        >
          <AlertTriangle size={13} className="mt-0.5 shrink-0" />
          {aviso}
        </p>
      )}

      {/* Error */}
      {error && (
        <p
          className="mt-3 text-xs px-3 py-2 rounded-lg text-peligro bg-peligro-suave"
        >
          {error}
        </p>
      )}
      {error && usoJusto && <AccionesUsoJusto />}

      {/* Botón */}
      <button
        onClick={onEmitir}
        disabled={submitting || !puedeEmitir}
        className={`mt-4 w-full py-3 rounded-lg text-white font-semibold text-sm transition-colors items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed ${conBarraFija ? "hidden lg:flex" : "flex"}`}
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
            {textoBoton ? "Creando..." : "Emitiendo..."}
          </>
        ) : textoBoton ? (
          `${textoBoton} · $${dosDecimales(totales.total)}`
        ) : (
          `Emitir${serie ? ` desde ${serie}` : ""} · $${dosDecimales(totales.total)}`
        )}
      </button>
    </div>
  );
}