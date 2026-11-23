"use client";

// Aviso de Kipu Pro en cada página para quien no tiene plan. La suscripción ya
// no es obligatoria (plan gratis), pero siempre se recuerda que existe y qué
// suma, con un beneficio que tenga que ver con la página en la que está.

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowRight, Sparkles } from "lucide-react";
import { useAuthStore } from "@/store/auth.store";
import { ES_APP_NATIVA } from "@/lib/plataforma";

// Páginas de venta o internas: ahí no hace falta el aviso. El dashboard tiene su
// propio recuadro del plan (gratis o suscripción inactiva), con lo mismo; /uso-justo
// también trae su recuadro de Kipu Pro.
const OCULTO_EN = ["/planes", "/al-dia", "/admin", "/equipo", "/nueva-empresa", "/dashboard", "/uso-justo"];

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

export default function AvisoPro() {
  const empresa  = useAuthStore((s) => s.empresa);
  const pathname = usePathname() ?? "";

  // En la app de las tiendas no se ofrecen planes (ver components/SoloWeb.tsx)
  if (ES_APP_NATIVA) return null;
  if (!empresa || empresa.suscripcion_activa) return null;
  if (OCULTO_EN.some((r) => pathname.startsWith(r))) return null;

  const texto = MENSAJES.find(([r]) => pathname.startsWith(r))?.[1] ?? GENERAL;

  return (
    <div
      className="w-full px-4 py-2 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-xs shrink-0"
      style={{
        background:   "color-mix(in srgb, var(--kipu-accent) 7%, transparent)",
        borderBottom: "1px solid color-mix(in srgb, var(--kipu-accent) 15%, transparent)",
        color:        "var(--kipu-text)",
      }}
    >
      <span className="flex items-start gap-2 min-w-0">
        <Sparkles size={13} className="shrink-0 mt-px" style={{ color: "var(--kipu-accent)" }} />
        <span>{texto}</span>
      </span>
      <Link
        href="/planes"
        className="inline-flex items-center gap-1 font-semibold whitespace-nowrap hover:underline underline-offset-2"
        style={{ color: "var(--kipu-accent)" }}
      >
        Ver planes <ArrowRight size={12} />
      </Link>
    </div>
  );
}
