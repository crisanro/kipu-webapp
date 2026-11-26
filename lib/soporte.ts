// lib/soporte.ts
//
// Política de soporte:
//   - El soporte humano (WhatsApp) es solo para Kipu Pro y Kipu Al Día.
//   - Para todos, el primer paso es el Centro de Ayuda (/ayuda): el botón
//     "Ayuda" del panel nunca abre WhatsApp directo.
//   - Excepción: las fallas que bloquean a la persona antes de entrar al panel
//     (no le llega el correo de verificación, no puede crear su empresa) se
//     atienden a todos, con o sin plan: enlaceWhatsAppFalla(). Solo va en esas
//     pantallas y con el problema ya escrito; las dudas de uso van al Centro
//     de Ayuda.
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

/**
 * WhatsApp para una falla que bloquea (para todos, sin importar el plan).
 * `problema` es el mensaje ya escrito; se le agrega el correo si se conoce.
 */
export function enlaceWhatsAppFalla(problema: string, email?: string | null): string {
  const texto = email ? `${problema}\nCorreo: ${email}` : problema;
  return `https://wa.me/${WHATSAPP_SOPORTE}?text=${encodeURIComponent(texto)}`;
}

/**
 * Kipu Al Día en la app (reglas de las tiendas): no se contrata ni se paga dentro
 * de la app. El equipo atiende por WhatsApp y manda el link de pago por fuera.
 *   - "informacion": quien no lo tiene y quiere contratarlo.
 *   - "pago": quien lo tiene y quiere cambiar la tarjeta, cancelar o resolver un pago.
 * Para todos, con o sin plan: es una consulta de venta, no soporte.
 */
export function enlaceWhatsAppAlDia(razonSocial: string | null | undefined,
                                    motivo: "informacion" | "pago" = "informacion"): string {
  const empresa = razonSocial?.trim();
  const texto = motivo === "pago"
    ? `Hola, tengo Kipu Al Día${empresa ? ` en mi empresa ${empresa}` : ""} y quiero cambiar la tarjeta, cancelar o resolver un pago.`
    : `Hola, quiero información sobre Kipu Al Día para mi empresa${empresa ? ` ${empresa}` : ""}`;
  return `https://wa.me/${WHATSAPP_SOPORTE}?text=${encodeURIComponent(texto)}`;
}
