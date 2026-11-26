"use client";
import { dolares } from "@/lib/dinero";

// Mensual / Anual en las pantallas de planes: /planes (solo web: Pro y Al Día)
// y /al-dia (web y app: solo Al Día). Los montos nunca se escriben aquí: salen
// del Price de Stripe vía backend (GET /suscripcion/precios, /al-dia/estado).

export type Periodo = "MENSUAL" | "ANUAL";

export interface PrecioStripe {
  total:     number;          // lo que cobra Stripe, IVA incluido
  base:      number;          // sin IVA
  iva:       number;
  intervalo: string | null;   // month | year
  etiqueta:  string | null;   // p. ej. "Precio de lanzamiento" (metadatos del Price en Stripe)
}

export interface PreciosPlan {
  MENSUAL: PrecioStripe | null;
  ANUAL:   PrecioStripe | null;
}

/** Cuánto se ahorra en un año pagando anual frente a 12 meses (null si falta un precio o no hay ahorro). */
export function ahorroAnual(p: PreciosPlan | null | undefined): number | null {
  if (!p?.MENSUAL || !p?.ANUAL) return null;
  const ahorro = Math.round((p.MENSUAL.total * 12 - p.ANUAL.total) * 100) / 100;
  return ahorro > 0 ? ahorro : null;
}

/** El periodo pedido si se ofrece; si no, el que sí se ofrece. */
export function periodoDisponible(p: PreciosPlan | null | undefined, pedido: Periodo): Periodo {
  if (!p || p[pedido]) return pedido;
  const otro: Periodo = pedido === "MENSUAL" ? "ANUAL" : "MENSUAL";
  return p[otro] ? otro : pedido;
}

export default function SelectorPeriodo({ valor, onCambio, precios, disponibles }: {
  valor:    Periodo;
  onCambio: (p: Periodo) => void;
  // Para apagar la opción que no se ofrece y mostrar el ahorro del anual. Si
  // ninguno se pudo leer (Stripe caído), las dos opciones quedan disponibles.
  precios:  PreciosPlan | null | undefined;
  // Con varias tarjetas (/planes): qué opciones ofrece alguna de ellas. Manda
  // sobre `precios` para apagar; `precios` queda solo para el ahorro.
  disponibles?: Record<Periodo, boolean>;
}) {
  const conocidos = !!(precios?.MENSUAL || precios?.ANUAL);
  const ahorro    = ahorroAnual(precios);
  const opciones: { id: Periodo; texto: string }[] = [
    { id: "MENSUAL", texto: "Mensual" },
    { id: "ANUAL",   texto: ahorro !== null ? `Anual · ahorras ${dolares(ahorro)}` : "Anual" },
  ];

  return (
    <div role="radiogroup" aria-label="Forma de pago"
         className="inline-flex p-1 rounded-xl"
         style={{ background: "var(--kipu-surface)", border: "1px solid var(--kipu-border)" }}>
      {opciones.map(({ id, texto }) => {
        const activo    = valor === id;
        const apagado   = disponibles ? !disponibles[id] : conocidos && !precios?.[id];
        return (
          <button
            key={id}
            type="button"
            role="radio"
            aria-checked={activo}
            disabled={apagado}
            onClick={() => onCambio(id)}
            className="px-4 py-1.5 rounded-lg text-sm font-semibold transition-colors disabled:opacity-40"
            style={activo
              ? { background: "var(--kipu-accent)", color: "#fff" }
              : { background: "transparent", color: "var(--kipu-muted)" }}
          >
            {texto}
          </button>
        );
      })}
    </div>
  );
}
