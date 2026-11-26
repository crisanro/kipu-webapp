"use client";
// Celda de un casillero del formulario 104: número, nombre y valor. La usan las
// tres secciones del reporte (antes cada una tenía su copia); solo cambia el
// color de la destacada según la sección.
//
//   <CeldaCasillero tono="exito" num="500" label="Base imponible" value={1200} highlight />

import { montoEC } from "@/lib/dinero";

/** acento = Ventas, exito = Compras, alerta = Retenciones. */
export type TonoCasillero = "acento" | "exito" | "alerta";

const COLOR: Record<TonoCasillero, string> = {
  acento: "var(--kipu-accent)",
  exito:  "var(--kipu-success)",
  alerta: "var(--kipu-warning)",
};

export default function CeldaCasillero({ tono, num, label, value, highlight = false, dimmed = false, warning = false }: {
  tono:       TonoCasillero;
  num:        string;
  label:      string;
  value:      number;
  /** El casillero que importa de la sección (el total, lo que se paga…). */
  highlight?: boolean;
  /** Se ve más tenue (Compras: lo que no da crédito tributario). */
  dimmed?:    boolean;
  /** Fondo de aviso sin destacarla (Retenciones). */
  warning?:   boolean;
}) {
  const color = COLOR[tono];
  // En amarillo, el número del casillero se lee mejor en el color del fondo que en blanco
  const textoInsignia = tono === "alerta" ? "var(--kipu-surface)" : "#FFFFFF";
  return (
    <div
      className="p-2.5 rounded-lg flex flex-col justify-between transition-colors"
      style={{
        background: highlight
          ? `color-mix(in srgb, ${color} 10%, transparent)`
          : warning
            ? `color-mix(in srgb, ${color} 5%, transparent)`
            : "color-mix(in srgb, var(--kipu-text) 3%, transparent)",
        border: highlight
          ? `1px solid color-mix(in srgb, ${color} ${tono === "alerta" ? 30 : 25}%, transparent)`
          : warning
            ? `1px solid color-mix(in srgb, ${color} 15%, transparent)`
            : "1px solid var(--kipu-border)",
        opacity: dimmed ? 0.7 : 1,
      }}
    >
      <div className="flex items-center justify-between gap-1 mb-1">
        <span
          className="text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0"
          style={{
            background: highlight ? color : "color-mix(in srgb, var(--kipu-text) 10%, transparent)",
            color:      highlight ? textoInsignia : "var(--kipu-subtle)",
          }}
        >
          {num}
        </span>
        <span className="text-[10px] truncate" style={{ color: "var(--kipu-subtle)" }}>
          {label}
        </span>
      </div>
      <p
        className="text-sm font-bold tabular-nums text-right"
        style={{ color: highlight ? color : value === 0 ? "var(--kipu-subtle)" : "var(--kipu-text)" }}
      >
        ${montoEC(value)}
      </p>
    </div>
  );
}
