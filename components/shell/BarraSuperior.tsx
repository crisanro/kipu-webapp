// components/shell/BarraSuperior.tsx
// Encabezado del celular (en la compu está el menú lateral): título de la
// pantalla, flecha atrás fuera de las pestañas, chip de sandbox y campana.
//   - El título sale de la ruta (TITULOS): no hay que tocar cada página.
//   - En Inicio el título es la empresa activa; tocarlo abre "Cambiar empresa".
//   - Atrás vuelve a la pantalla anterior; si se llegó directo (una notificación,
//     un enlace) no hay a dónde volver y va a la pantalla madre.

"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Bell, ChevronDown, ChevronLeft, FlaskConical, Search } from "lucide-react";
import { EVENTO_PALETA } from "@/components/shell/PaletaComandos";
import BotonIcono from "@/components/ui/BotonIcono";
import { cn } from "@/components/ui/cn";
import { useAuthStore } from "@/store/auth.store";

/** Eventos que atiende app/(dashboard)/layout.tsx (los usa también la pantalla Más). */
export const EVENTO_SELECTOR_EMPRESA = "kipu:abrir-selector-empresa";
export const EVENTO_CERRAR_SESION    = "kipu:abrir-cerrar-sesion";

// Pestañas: sin flecha atrás
const RAICES = ["/dashboard", "/documentos", "/documentos/recibidos", "/personas", "/productos", "/mas"];

// Título por ruta: gana el prefijo más largo
const TITULOS: Record<string, string> = {
  "/documentos":                  "Documentos",
  "/documentos/recibidos":        "Documentos",
  "/documentos/recibidos/nueva":  "Registrar compra",
  "/documentos/recibidos/ver":    "Comprobante recibido",
  "/documentos/ver":              "Comprobante",
  "/documentos/emitir/fac":       "Nueva factura",
  "/documentos/emitir/ncr":       "Nota de crédito",
  "/documentos/emitir/ndb":       "Nota de débito",
  "/documentos/emitir/liq":       "Liquidación de compra",
  "/documentos/emitir/ret":       "Retención",
  "/personas":                    "Personas",
  "/personas/ver":                "Persona",
  "/productos":                   "Productos",
  "/cuentas":                     "Cuentas",
  "/cuentas/ver":                 "Cuenta",
  "/proformas":                   "Proformas",
  "/proformas/nueva":             "Nueva proforma",
  "/proformas/ver":               "Proforma",
  "/cobros":                      "Links de cobro",
  "/reportes":                    "Reportes",
  "/reportes/iva":                "Declaración de IVA",
  "/reportes/ats":                "ATS",
  "/reportes/renta":              "Impuesto a la renta",
  "/estructura":                  "Estructura",
  "/usuarios":                    "Usuarios",
  "/auditoria":                   "Auditoría",
  "/configuracion":               "Configuración",
  "/al-dia":                      "Kipu Al Día",
  "/uso-justo":                   "Uso justo",
  "/nueva-empresa":               "Nueva empresa",
  "/planes":                      "Planes",
  "/renta":                       "Kipu Renta",
  "/api-keys":                    "API Keys",
  "/equipo":                      "Equipo Al Día",
  "/admin":                       "Administración",
  "/mas":                         "Más",
};

const limpiar = (r: string) => r.replace(/\/+$/, "") || "/";

function titulo(ruta: string): string {
  let mejor = "";
  for (const prefijo of Object.keys(TITULOS)) {
    if ((ruta === prefijo || ruta.startsWith(prefijo + "/")) && prefijo.length > mejor.length) mejor = prefijo;
  }
  return mejor ? TITULOS[mejor] : "Kipu";
}

/** A dónde vuelve la flecha cuando no hay historial dentro de la app. */
function rutaMadre(ruta: string): string {
  if (ruta.startsWith("/documentos/emitir")) return "/dashboard";
  if (ruta.startsWith("/documentos/recibidos/")) return "/documentos/recibidos";
  const partes = ruta.split("/").filter(Boolean);
  // /cuentas, /reportes… se abren desde Más; /cuentas/ver vuelve a /cuentas
  return partes.length <= 1 ? "/mas" : "/" + partes.slice(0, -1).join("/");
}

// ¿Hubo navegación dentro de la app en esta pestaña? (si no, router.back() saldría de Kipu)
let rutaInicial: string | null = null;
const CLAVE_NAVEGO = "kipu:navego";

export default function BarraSuperior({ noLeidas, sandbox, onAbrirNotificaciones }: {
  noLeidas:              number;
  sandbox:               boolean;
  onAbrirNotificaciones: () => void;
}) {
  const router  = useRouter();
  const ruta    = limpiar(usePathname() ?? "/");
  const empresa = useAuthStore((s) => s.empresa);

  useEffect(() => {
    if (rutaInicial === null) { rutaInicial = ruta; return; }
    if (ruta !== rutaInicial) { try { sessionStorage.setItem(CLAVE_NAVEGO, "1"); } catch {} }
  }, [ruta]);

  const esRaiz = RAICES.includes(ruta);
  const enInicio = ruta === "/dashboard";

  const volver = () => {
    let navego = false;
    try { navego = sessionStorage.getItem(CLAVE_NAVEGO) === "1"; } catch {}
    if (navego && window.history.length > 1) router.back();
    else router.replace(rutaMadre(ruta));
  };

  const nombreEmpresa = empresa?.nombre_comercial || empresa?.razon_social || "Kipu";

  return (
    <header className="flex h-14 shrink-0 items-center gap-1 border-b border-borde bg-superficie px-2 lg:hidden">
      {esRaiz ? <span className="w-2" /> : (
        <BotonIcono etiqueta="Volver" icono={<ChevronLeft size={24} />} onClick={volver} className="text-texto" />
      )}

      {enInicio ? (
        <button
          type="button"
          onClick={() => window.dispatchEvent(new Event(EVENTO_SELECTOR_EMPRESA))}
          className="flex min-w-0 items-center gap-1 rounded-lg px-1 py-1 text-left active:bg-presionado"
          aria-label={`Empresa: ${nombreEmpresa}. Cambiar empresa`}
        >
          <span className="truncate text-lg font-bold text-texto">{nombreEmpresa}</span>
          <ChevronDown size={18} className="shrink-0 text-sutil" aria-hidden />
        </button>
      ) : (
        <h1 className={cn("min-w-0 truncate font-bold text-texto", esRaiz ? "px-1 text-lg" : "text-base")}>
          {titulo(ruta)}
        </h1>
      )}

      <div className="ml-auto flex shrink-0 items-center gap-1">
        {sandbox && (
          <span className="inline-flex items-center gap-1 rounded-full bg-sandbox-suave px-2 py-1 text-[11px] font-semibold text-sandbox">
            <FlaskConical size={12} aria-hidden /> Sandbox
          </span>
        )}
        <BotonIcono
          etiqueta="Buscar"
          icono={<Search size={21} />}
          onClick={() => window.dispatchEvent(new Event(EVENTO_PALETA))}
        />
        <div className="relative">
          <BotonIcono
            etiqueta={noLeidas > 0 ? `Notificaciones (${noLeidas} sin leer)` : "Notificaciones"}
            icono={<Bell size={21} />}
            onClick={onAbrirNotificaciones}
          />
          {noLeidas > 0 && (
            <span aria-hidden className="pointer-events-none absolute right-1 top-1 flex min-w-4 h-4 items-center justify-center rounded-full bg-peligro px-1 text-[10px] font-bold text-sobre-acento">
              {noLeidas > 9 ? "9+" : noLeidas}
            </span>
          )}
        </div>
      </div>
    </header>
  );
}
