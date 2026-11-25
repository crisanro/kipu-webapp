// components/dashboard/AvisoPro.tsx
// Texto del aviso de Kipu Pro para quien no tiene plan. La suscripción ya no es
// obligatoria (plan gratis), pero siempre se recuerda que existe y qué suma, con
// un beneficio que tenga que ver con la página en la que está. Lo muestra
// components/shell/AvisoShell.tsx, como el aviso de menor prioridad.

import { ES_APP_NATIVA } from "@/lib/plataforma";

// Páginas de venta o internas: ahí no hace falta el aviso. El dashboard tiene su
// propio recuadro del plan (gratis o suscripción inactiva), con lo mismo; /uso-justo
// también trae su recuadro de Kipu Pro.
const OCULTO_EN = ["/planes", "/al-dia", "/admin", "/equipo", "/nueva-empresa", "/dashboard", "/uso-justo", "/mas"];

// El primero cuya ruta coincida (de la más específica a la más general)
const MENSAJES: [string, string][] = [
  ["/documentos/emitir",    "Con Kipu Pro emites sin límite, también por API, y tus facturas salen sin la marca de Kipu."],
  ["/documentos/recibidos", "Con Kipu Pro tus compras arman el formulario 104 de cada mes, con alertas de errores."],
  ["/reportes",             "Con Kipu Pro tienes el 104 casillero por casillero todo el año, alertas y el resumen para la renta."],
  ["/renta",                "Con Kipu Pro ves el resumen de tu renta todo el año, el 104 con alertas, y facturas sin límite."],
  ["/cuentas",              "Con Kipu Pro llevas tus cuentas por cobrar y por pagar."],
  ["/proformas",            "Con Kipu Pro haces proformas en PDF y las conviertes en factura."],
  ["/usuarios",             "Con Kipu Pro sumas usuarios a tu empresa, cada uno con sus permisos."],
  ["/api-keys",             "Con Kipu Pro tus integraciones (WooCommerce, tu sistema) tienen 300 comprobantes al mes incluidos, sin gastar créditos."],
  ["/configuracion",        "Con Kipu Pro sumas usuarios y tus facturas salen sin la marca de Kipu."],
];
const GENERAL =
  "Kipu Pro: facturas sin límite, el 104 completo con alertas, la renta y varios usuarios. "
  + "O que el equipo de Kipu declare por ti con Kipu Al Día.";

/** Qué decir de Kipu Pro en esta página, o null si no corresponde. */
export function textoAvisoPro(
  pathname: string,
  empresa: { suscripcion_activa?: boolean | null } | null | undefined,
): string | null {
  // En la app de las tiendas no se ofrecen planes (ver components/SoloWeb.tsx)
  if (ES_APP_NATIVA) return null;
  if (!empresa || empresa.suscripcion_activa) return null;
  if (OCULTO_EN.some((r) => pathname.startsWith(r))) return null;
  return MENSAJES.find(([r]) => pathname.startsWith(r))?.[1] ?? GENERAL;
}
