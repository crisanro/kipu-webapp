// lib/soporte.ts
//
// Política de soporte:
//   - El soporte humano (WhatsApp) es solo para Kipu Pro y Kipu Al Día.
//   - Para todos, el primer paso es el Centro de Ayuda (/ayuda): el botón
//     "Ayuda" del panel nunca abre WhatsApp directo.
//
// El plan es POR EMPRESA (la activa del store), no por persona: quien tiene
// varias empresas tiene soporte según la que tenga abierta.
//
// Ojo: el número va en el paquete del navegador (NEXT_PUBLIC_). Ocultarlo a los
// usuarios gratis es solo en pantalla; para que de verdad no lo tengan, el
// enlace lo tendría que dar el backend.

import type { Empresa } from "@/store/auth.store";

// Sin la variable (p. ej. en desarrollo) se usa el número de siempre
const NUMERO_POR_DEFECTO = "593960585581";

/** Número de WhatsApp de soporte, solo dígitos (formato wa.me: 593…). */
export const WHATSAPP_SOPORTE =
  (process.env.NEXT_PUBLIC_WHATSAPP_SOPORTE || NUMERO_POR_DEFECTO).replace(/\D/g, "");

export type PlanSoporte = "PRO" | "AL_DIA" | "GRATIS";

export const NOMBRE_PLAN: Record<PlanSoporte, string> = {
  PRO:    "Kipu Pro",
  AL_DIA: "Kipu Al Día",
  GRATIS: "Gratis",
};

/**
 * Plan de la empresa para el soporte. Igual que el backend
 * (GET /usuarios/empresas → suscripcion_vigente): sin suscripción vigente es
 * GRATIS, aunque tenga créditos. Con suscripción vigente: AL_DIA si es Al Día;
 * cualquier otra (hoy "PRO"; las filas antiguas pueden decir otra cosa) es Pro.
 * La prueba (TRIAL) cuenta como vigente.
 */
export function planDeSoporte(empresa: Pick<Empresa, "suscripcion_activa" | "suscripcion"> | null | undefined): PlanSoporte {
  if (!empresa?.suscripcion_activa) return "GRATIS";
  return empresa.suscripcion?.plan === "AL_DIA" ? "AL_DIA" : "PRO";
}

/** ¿Puede escribir al soporte por WhatsApp? Solo Pro y Al Día. */
export const tieneSoporte = (empresa: Parameters<typeof planDeSoporte>[0]) =>
  planDeSoporte(empresa) !== "GRATIS";

/** Enlace de WhatsApp con el mensaje prellenado: RUC, empresa, plan y correo. */
export function enlaceWhatsApp(
  empresa: Pick<Empresa, "ruc" | "razon_social" | "suscripcion_activa" | "suscripcion"> | null | undefined,
  email?: string | null,
): string {
  const lineas = [
    "Hola, necesito ayuda con Kipu.",
    empresa?.ruc          && `RUC: ${empresa.ruc}`,
    empresa?.razon_social && `Empresa: ${empresa.razon_social}`,
    `Plan: ${NOMBRE_PLAN[planDeSoporte(empresa)]}`,
    email                 && `Correo: ${email}`,
  ].filter(Boolean);
  return `https://wa.me/${WHATSAPP_SOPORTE}?text=${encodeURIComponent(lineas.join("\n"))}`;
}
