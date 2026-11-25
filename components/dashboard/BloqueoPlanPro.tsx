"use client";

// Va en lugar del formulario cuando la empresa no puede emitir ese comprobante:
//   - sin Kipu Pro / Al Día (liquidación de compra y retención): "Ver planes", solo en la web;
//   - u otra razón con su propia salida (p. ej. retenciones apagadas → Configuración).
// En la app de las tiendas no hay botón de compra (ver components/SoloWeb.tsx); igual,
// sin plan esas rutas ni se abren en la app (RUTAS_CON_SUSCRIPCION en lib/plataforma.ts).

import Link from "next/link";
import { ArrowRight, Lock } from "lucide-react";
import { ES_APP_NATIVA } from "@/lib/plataforma";

/** El mismo texto que devuelve el backend con 402 PLAN_REQUERIDO. */
export const MENSAJE_PLAN_LIQ_RET = "Las liquidaciones de compra y las retenciones están disponibles en Kipu Pro.";

interface Props {
  titulo?:  string;
  mensaje?: string;
  /** Salida propia; sin ella, "Ver planes" (solo en la web); null = sin botón. */
  accion?:  { href: string; label: string } | null;
}

export default function BloqueoPlanPro({
  titulo  = "Disponible en Kipu Pro",
  mensaje = MENSAJE_PLAN_LIQ_RET,
  accion,
}: Props) {
  const salida = accion !== undefined ? accion : ES_APP_NATIVA ? null : { href: "/planes", label: "Ver planes" };

  return (
    <div
      className="max-w-xl mx-auto mt-10 rounded-2xl p-6 text-center space-y-3"
      style={{
        background: "color-mix(in srgb, var(--kipu-accent) 6%, var(--kipu-surface))",
        border:     "1px solid color-mix(in srgb, var(--kipu-accent) 20%, transparent)",
      }}
    >
      <div
        className="mx-auto w-11 h-11 rounded-full flex items-center justify-center"
        style={{ background: "color-mix(in srgb, var(--kipu-accent) 15%, transparent)" }}
      >
        <Lock size={20} style={{ color: "var(--kipu-accent)" }} />
      </div>
      <h2 className="text-base font-semibold" style={{ color: "var(--kipu-text)" }}>{titulo}</h2>
      <p className="text-sm" style={{ color: "var(--kipu-muted)" }}>{mensaje}</p>
      {salida && (
        <Link
          href={salida.href}
          className="inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-white text-sm font-medium"
          style={{ background: "var(--kipu-accent)" }}
        >
          {salida.label} <ArrowRight size={14} />
        </Link>
      )}
    </div>
  );
}
