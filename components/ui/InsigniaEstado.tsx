// components/ui/InsigniaEstado.tsx
// Pastilla de estado ("Autorizado", "Devuelto", "Por cobrar"). Colores de
// lib/estados.ts; el texto usa los tonos "-texto" de globals.css, que se leen
// bien en chico sobre su fondo suave (en claro y en oscuro).
//
//   <InsigniaSri estado={doc.estado_sri} />
//   <InsigniaCobro estado={doc.estado_cobro} />
//   <InsigniaEstado tono="alerta">Vence hoy</InsigniaEstado>

import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { ESTADOS_COBRO, estadoSri, type TonoEstado } from "@/lib/estados";
import { cn } from "./cn";

const TONOS: Record<TonoEstado, string> = {
  exito:   "bg-exito-suave text-exito-texto",
  info:    "bg-info-suave text-info",
  alerta:  "bg-alerta-suave text-alerta-texto",
  peligro: "bg-peligro-suave text-peligro-texto",
  neutro:  "bg-presionado text-tenue",
  sandbox: "bg-sandbox-suave text-sandbox",
};

export function InsigniaEstado({ tono, icono: Icono, children, className }: {
  tono:       TonoEstado;
  icono?:     LucideIcon;
  children:   ReactNode;
  className?: string;
}) {
  return (
    <span className={cn(
      "inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-semibold leading-4",
      TONOS[tono], className,
    )}>
      {Icono && <Icono size={12} aria-hidden className="shrink-0" />}
      {children}
    </span>
  );
}

/** Estado del comprobante en el SRI. */
export function InsigniaSri({ estado, conIcono = true, className }: {
  estado: string | null | undefined; conIcono?: boolean; className?: string;
}) {
  const e = estadoSri(estado);
  return <InsigniaEstado tono={e.tono} icono={conIcono ? e.icono : undefined} className={className}>{e.etiqueta}</InsigniaEstado>;
}

/** Estado de cobro (facturas y liquidaciones). Sin estado no dibuja nada. */
export function InsigniaCobro({ estado, className }: { estado: string | null | undefined; className?: string }) {
  const e = estado ? ESTADOS_COBRO[estado] : undefined;
  if (!e) return null;
  return <InsigniaEstado tono={e.tono} className={className}>{e.etiqueta}</InsigniaEstado>;
}
