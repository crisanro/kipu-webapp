// lib/planes.ts
// Qué incluye cada plan, en un solo lugar. Lo usan la página de Planes y la
// pantalla después de pagar (antes cada una tenía su lista y ya no coincidían).
//
// La página de venta de Kipu Al Día (components/al-dia/Venta.tsx) tiene su
// versión detallada, alineada con los términos del servicio: no es esta.
// Solo web: la app de las tiendas no muestra planes (lib/plataforma.ts).

/** Kipu Pro. */
export const INCLUYE_PRO = [
  "Facturas, liquidaciones, notas y retenciones sin límite",
  "Tus compras del SRI importadas con un clic (extensión para Chrome y Firefox)",
  "Reportes de IVA (104), renta y ATS",
  "Cuentas por cobrar y pagar, y proformas en PDF",
  "Alertas de errores antes de declarar y facturas sin la marca de Kipu",
  "API: 300 comprobantes al mes incluidos",
  "Hasta 5 usuarios · soporte por WhatsApp",
];

/** Kipu Al Día: lo que hace el equipo de Kipu. */
export const INCLUYE_AL_DIA = [
  "Declaramos tu IVA, mensual o semestral",
  "Declaramos tu renta anual",
  "Revisamos tus compras cada mes",
  "Te avisamos por WhatsApp cuánto pagar y hasta cuándo",
  "Respondemos al SRI por las declaraciones que presentamos",
];

/** Kipu Al Día: el sistema que viene con el servicio. */
export const SISTEMA_AL_DIA = [
  "Facturas sin límite",
  "Tus compras del SRI importadas con un clic",
  "Reportes de IVA, renta y ATS",
  "Cuentas por cobrar y pagar, y proformas",
  "Hasta 5 usuarios",
];

/** Plan gratis (solo con el interruptor EMISION_GRATIS encendido). */
export const GRATIS_INCLUYE = [
  "Facturas desde el panel web, con uso justo",
  "Importa tus compras y mira el IVA a pagar de cada mes",
];
export const GRATIS_NO_INCLUYE = [
  "Formulario 104 casillero por casillero y alertas",
  "API, WooCommerce y varios usuarios",
];
