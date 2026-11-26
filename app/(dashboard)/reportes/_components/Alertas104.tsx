"use client";

// Alertas de errores del 104 de un periodo (las calcula el backend al abrir la
// declaración): retenciones que no llegaron, IVA sin crédito, comprobantes sin
// autorizar, negocios populares con crédito, cambios después de declarar y
// SOLO_KIPU (el cálculo solo incluye lo emitido en Kipu). SOLO_KIPU lo ven todos
// los planes: también va suelto, sin encabezado, en la pantalla del total, al
// elegir periodo y en el 102.

import Link from "next/link";
import { AlertTriangle, ArrowRight, Info } from "lucide-react";

export interface Alerta104 {
  codigo:   string;
  nivel:    "importante" | "revisar";
  titulo:   string;
  detalle:  string;
  cantidad: number;
  monto:    number | null;
  ejemplos: string[];
  accion:   { texto: string; url: string } | null;
}

export default function Alertas104({ alertas, encabezado = true }: {
  alertas:     Alerta104[];
  encabezado?: boolean;            // false: solo las tarjetas (un aviso suelto)
}) {
  if (!alertas?.length) return null;

  return (
    <section className="space-y-2" aria-label="Alertas de tu declaración">
      {encabezado && (
        <p className="text-xs font-semibold uppercase tracking-wide text-sutil">
          {alertas.length === 1 ? "1 alerta en tu declaración" : `${alertas.length} alertas en tu declaración`}
        </p>
      )}
      {alertas.map((a) => {
        const importante = a.nivel === "importante";
        const color = importante ? "var(--kipu-danger)" : "var(--kipu-warning)";
        const Icono = importante ? AlertTriangle : Info;
        return (
          <div
            key={a.codigo}
            className="rounded-xl p-3.5 flex gap-3"
            style={{
              background: `color-mix(in srgb, ${color} 8%, transparent)`,
              border:     `1px solid color-mix(in srgb, ${color} 25%, transparent)`,
            }}
          >
            <Icono size={16} className="shrink-0 mt-0.5" style={{ color }} />
            <div className="min-w-0 flex-1 space-y-1.5">
              <p className="text-sm font-semibold text-texto">{a.titulo}</p>
              <p className="text-xs leading-relaxed text-texto">{a.detalle}</p>
              {a.ejemplos.length > 0 && (
                <ul className="text-[11px] space-y-0.5" style={{ color: "var(--kipu-subtle)" }}>
                  {a.ejemplos.map((ej) => <li key={ej} className="truncate">· {ej}</li>)}
                  {a.cantidad > a.ejemplos.length && (
                    <li>· y {a.cantidad - a.ejemplos.length} más</li>
                  )}
                </ul>
              )}
              {a.accion && (
                <Link
                  href={a.accion.url}
                  className="inline-flex items-center gap-1 text-xs font-semibold hover:underline underline-offset-2"
                  style={{ color }}
                >
                  {a.accion.texto} <ArrowRight size={12} />
                </Link>
              )}
            </div>
          </div>
        );
      })}
    </section>
  );
}
