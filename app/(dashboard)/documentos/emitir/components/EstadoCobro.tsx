"use client";

import Link from "next/link";
import { CheckCircle2, Clock, CreditCard, AlertTriangle, HandCoins } from "lucide-react";
import Seccion from "@/components/ui/Seccion";
import { Campo, Entrada } from "@/components/ui/Campo";
import ChipsFiltro from "@/components/ui/ChipsFiltro";
import { hoyEC } from "@/lib/fecha";
import { FORMAS_COBRO } from "@/lib/estados";

// ── Tipos ──────────────────────────────────────────────────────────────────────
export interface DatosCobro {
  estado:     "PAGADO" | "PENDIENTE";
  fecha_pago: string;       // YYYY-MM-DD
  referencia: string;       // número de comprobante / referencia
  /** Cómo se cobró (FORMAS_COBRO). La factura no lo usa: lo saca de sus formas de pago. */
  forma?:     string;
}

/** Pasarela de la empresa (GET /cobros-en-linea/estado) */
export interface PasarelaEstado {
  conectada:           boolean;
  nombre?:             string;
  marcar_por_defecto?: boolean;
  requiere_cliente?:   boolean;   // PagoPlux: exige cédula/RUC y correo del cliente
}

/** Cuándo se emite la factura cuando se cobra con link */
export type MomentoFactura = "ahora" | "al_pagar";

/** Link de pago OPCIONAL: solo lo pasa la factura, y se ofrece solo si queda por cobrar */
export interface OpcionLinkPago {
  pasarela: PasarelaEstado | null;
  activo:   boolean;
  onChange: (activo: boolean) => void;
  aviso?:   string | null;        // p. ej. cliente sin correo
  momento?:   MomentoFactura;     // si viene, se ofrece "facturar cuando pague"
  onMomento?: (m: MomentoFactura) => void;
  /** Sandbox prendido o empresa en pruebas: no hay links (el pago sería real y la factura no). */
  enPruebas?: boolean;
}

/** Mismo criterio que el servidor (SIN_LINKS_* en cobros_en_linea.py). */
export const SIN_LINKS_EN_PRUEBAS =
  "En modo de pruebas no se crean links de pago: el pago sería real y la factura de prueba.";

interface Props {
  cobro:     DatosCobro;
  onChange:  (cobro: DatosCobro) => void;
  linkPago?: OpcionLinkPago;
  /** Pregunta cómo se cobró (nota de débito: no tiene formas de pago de donde sacarlo). */
  conForma?: boolean;
}

// ── Helpers ────────────────────────────────────────────────────────────────────
// Función y no constante: una pestaña abierta desde ayer debe usar la fecha de
// hoy, y en hora de Ecuador (toISOString es UTC: después de las 19:00 da mañana).
export const cobroInicial = (): DatosCobro => ({
  estado:     "PAGADO",
  fecha_pago: hoyEC(),
  referencia: "",
  forma:      "EFECTIVO",
});

// ── Componente ─────────────────────────────────────────────────────────────────
export default function EstadoCobro({ cobro, onChange, linkPago, conForma = false }: Props) {
  const esPagado = cobro.estado === "PAGADO";
  const forma    = cobro.forma ?? "EFECTIVO";   // borradores de antes no la traen

  const toggleEstado = (estado: "PAGADO" | "PENDIENTE") => {
    onChange({
      ...cobro,
      estado,
      fecha_pago: estado === "PAGADO" ? (cobro.fecha_pago || hoyEC()) : "",
      referencia: estado === "PENDIENTE" ? "" : cobro.referencia,
    });
  };

  // Plegada se ve cómo queda; por cobrar se abre sola (hay que decidir el link)
  const conLink = !esPagado && !!linkPago?.activo && !!linkPago.pasarela?.conectada && !linkPago.enPruebas;
  const etiquetaForma = FORMAS_COBRO.find(f => f.valor === forma)?.etiqueta ?? forma;
  const resumen = esPagado ? (conForma ? `Cobrada · ${etiquetaForma}` : "Cobrada")
    : conLink ? (linkPago?.momento === "al_pagar" ? "Por cobrar · factura al pagar" : "Por cobrar · con link")
    : "Por cobrar";

  return (
    <Seccion titulo="Cobro" icono={HandCoins} resumen={resumen} abierta={!esPagado}>
    <div className="space-y-3">

      {/* Toggle Cobrada / Pendiente */}
      <div
        className="flex rounded-lg overflow-hidden border border-borde"
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

      {/* Cómo se cobró — solo donde no sale de las formas de pago */}
      {esPagado && conForma && (
        <ChipsFiltro
          etiqueta="Cómo se cobró"
          opciones={FORMAS_COBRO}
          valor={forma}
          onCambio={(f) => onChange({ ...cobro, forma: f })}
        />
      )}

      {/* Campos de pago — solo cuando está cobrada */}
      {esPagado && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Campo etiqueta="Fecha de pago">
            <Entrada type="date" value={cobro.fecha_pago}
                     onChange={(e) => onChange({ ...cobro, fecha_pago: e.target.value })} />
          </Campo>
          <Campo etiqueta="Referencia" opcional>
            <Entrada value={cobro.referencia} maxLength={100} placeholder="N° transferencia, recibo…"
                     onChange={(e) => onChange({ ...cobro, referencia: e.target.value })} />
          </Campo>
        </div>
      )}

      {/* Nota para pendiente */}
      {!esPagado && (
        <p className="text-xs text-sutil">
          Podrás registrar el cobro después desde el detalle del comprobante.
        </p>
      )}

      {/* Link de pago: opcional, factura por factura (en pruebas, no: el pago sería real) */}
      {!esPagado && linkPago?.pasarela?.conectada && linkPago.enPruebas && (
        <p className="flex items-start gap-1.5 text-xs text-sutil">
          <CreditCard size={13} className="mt-0.5 shrink-0" />
          {SIN_LINKS_EN_PRUEBAS}
        </p>
      )}
      {!esPagado && linkPago?.pasarela?.conectada && !linkPago.enPruebas && (
        <div className="rounded-lg p-3 space-y-2 border border-borde">
          <label className="flex items-start gap-2.5 cursor-pointer">
            <input
              type="checkbox"
              className="mt-0.5"
              checked={linkPago.activo}
              onChange={(e) => linkPago.onChange(e.target.checked)}
            />
            <span className="min-w-0">
              <span className="flex items-center gap-1.5 text-sm font-medium text-texto">
                <CreditCard className="text-acento" size={14} />
                Cobrar con link de pago ({linkPago.pasarela.nombre})
              </span>
              <span className="block text-xs mt-0.5 text-sutil">
                {linkPago.momento === "al_pagar"
                  ? "Se crea solo el link. Cuando tu cliente pague, la factura se emite sola, ya cobrada, y le llega por correo."
                  : "El link va en la información adicional de la factura (XML y PDF) y en el correo al cliente. Cuando pague, la factura queda cobrada sola."}
              </span>
            </span>
          </label>
          {linkPago.activo && linkPago.onMomento && (
            <div role="radiogroup" aria-label="Cuándo emitir la factura" className="pl-6 space-y-1.5">
              {([
                ["ahora",    "Emitir la factura ahora", "con el link adentro"],
                ["al_pagar", "Emitir la factura cuando pague", "anticipos, reservas, cobrar antes de entregar"],
              ] as const).map(([valor, titulo, ayuda]) => (
                <label key={valor} className="flex items-start gap-2 cursor-pointer text-xs">
                  <input
                    type="radio"
                    name="momento-factura"
                    className="mt-0.5"
                    checked={(linkPago.momento ?? "ahora") === valor}
                    onChange={() => linkPago.onMomento?.(valor)}
                  />
                  <span>
                    <span className="font-medium text-texto">{titulo}</span>
                    <span className="text-sutil"> · {ayuda}</span>
                  </span>
                </label>
              ))}
            </div>
          )}
          {linkPago.activo && linkPago.aviso && (
            <p className="flex items-start gap-1.5 text-xs text-alerta">
              <AlertTriangle size={13} className="mt-0.5 shrink-0" />
              {linkPago.aviso}
            </p>
          )}
        </div>
      )}
      {!esPagado && linkPago?.pasarela && !linkPago.pasarela.conectada && (
        <p className="text-xs text-sutil">
          ¿Quieres cobrarla con tarjeta?{" "}
          <Link href="/configuracion#cobros" className="underline text-acento">
            Conecta Payphone o PagoPlux
          </Link>
        </p>
      )}
    </div>
    </Seccion>
  );
}