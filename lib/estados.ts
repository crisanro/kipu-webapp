// lib/estados.ts
// Un solo catálogo de estados y tipos de comprobante para toda la app (antes
// había 6 copias, cada una con sus etiquetas y colores). Las insignias de
// components/ui/InsigniaEstado.tsx lo leen.
//
// Estados del SRI (backend: app/services/comprobante_estado_service.py):
//   POR_FIRMAR, FIRMADO, RECIBIDA, EN_REVISION, ERROR_FIRMA → en proceso
//   AUTORIZADO, DEVUELTA, RECHAZADO, ANULADO               → finales

import {
  AlertTriangle, Ban, CheckCircle2, Clock, FlaskConical, SearchCheck, XCircle, type LucideIcon,
} from "lucide-react";

export type TonoEstado = "exito" | "info" | "alerta" | "peligro" | "neutro" | "sandbox";

export interface InfoEstado {
  etiqueta: string;
  tono:     TonoEstado;
  icono:    LucideIcon;
  /** El SRI ya no lo va a cambiar (salvo que se anule). */
  final:    boolean;
}

export const ESTADOS_SRI: Record<string, InfoEstado> = {
  AUTORIZADO:  { etiqueta: "Autorizado",     tono: "exito",   icono: CheckCircle2, final: true },
  POR_FIRMAR:  { etiqueta: "Firmando",       tono: "info",    icono: Clock,        final: false },
  FIRMADO:     { etiqueta: "En cola",        tono: "info",    icono: Clock,        final: false },
  RECIBIDA:    { etiqueta: "En proceso",     tono: "info",    icono: Clock,        final: false },
  EN_REVISION: { etiqueta: "En revisión",    tono: "info",    icono: SearchCheck,  final: false },
  ERROR_FIRMA: { etiqueta: "Error de firma", tono: "peligro", icono: AlertTriangle, final: false },
  DEVUELTA:    { etiqueta: "Devuelto",       tono: "alerta",  icono: AlertTriangle, final: true },
  RECHAZADO:   { etiqueta: "Rechazado",      tono: "peligro", icono: XCircle,      final: true },
  ANULADO:     { etiqueta: "Anulado",        tono: "neutro",  icono: Ban,          final: true },
  PENDIENTE:   { etiqueta: "Pendiente",      tono: "neutro",  icono: Clock,        final: false },
  SANDBOX:     { etiqueta: "Prueba",         tono: "sandbox", icono: FlaskConical, final: false },
};

/** El estado del SRI, o uno neutro con el código tal cual si llega uno nuevo. */
export function estadoSri(codigo: string | null | undefined): InfoEstado {
  return ESTADOS_SRI[codigo ?? ""] ?? { etiqueta: codigo || "—", tono: "neutro", icono: Clock, final: false };
}

export const TIPOS_COMPROBANTE: Record<string, { etiqueta: string; corta: string }> = {
  FAC: { etiqueta: "Factura",               corta: "Factura" },
  NCR: { etiqueta: "Nota de crédito",       corta: "N. crédito" },
  NDB: { etiqueta: "Nota de débito",        corta: "N. débito" },
  LIQ: { etiqueta: "Liquidación de compra", corta: "Liquidación" },
  RET: { etiqueta: "Retención",             corta: "Retención" },
};

export const tipoComprobante = (codigo: string | null | undefined) =>
  TIPOS_COMPROBANTE[codigo ?? ""] ?? { etiqueta: codigo || "Comprobante", corta: codigo || "—" };

export const ESTADOS_COBRO: Record<string, { etiqueta: string; tono: TonoEstado }> = {
  PENDIENTE: { etiqueta: "Por cobrar", tono: "alerta" },
  PAGADO:    { etiqueta: "Cobrado",    tono: "exito" },
  PARCIAL:   { etiqueta: "Parcial",    tono: "info" },
  ANULADO:   { etiqueta: "Anulado",    tono: "neutro" },
};
