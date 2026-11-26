// components/shell/BarraPestanas.tsx
// Barra de pestañas de abajo (solo celular y tablet; en la compu está el menú
// lateral): Inicio · Documentos · Emitir · Personas · Más.
//   - Emitir es el botón central y abre HojaEmitir.
//   - Tocar la pestaña en la que ya estás sube la pantalla al inicio.
//   - Se oculta en los formularios de emisión (tienen su propio botón abajo).
//   - Con id="barra-pestanas": globals.css reserva su alto (--alto-barra-inferior).

"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { FileText, Home, LayoutGrid, Plus, Users, type LucideIcon } from "lucide-react";
import { tienePermiso } from "@/components/dashboard/DashboardNav";
import { rutaFueraDelPlan } from "@/lib/plataforma";
import { vibrar } from "@/lib/nativo";
import { useAuthStore } from "@/store/auth.store";
import { cn } from "@/components/ui/cn";
import Segmentos from "@/components/ui/Segmentos";
import HojaEmitir from "./HojaEmitir";

/** /documentos/ → /documentos */
const limpiar = (r: string) => r.replace(/\/+$/, "") || "/";

// Pantallas con su propio botón de acción abajo: sin barra de pestañas
const SIN_BARRA = ["/documentos/emitir/", "/proformas/nueva", "/documentos/recibidos/nueva"];

interface Pestana { id: string; href: string; etiqueta: string; icono: LucideIcon; activa: (r: string) => boolean }

const esDocumentos = (r: string) => r.startsWith("/documentos") && !r.startsWith("/documentos/emitir");
const esPersonas   = (r: string) => r.startsWith("/personas") || r.startsWith("/productos");

// ── Sub-secciones de una pestaña (solo celular; en la compu, el menú lateral) ──

/** Documentos → Emitidos | Recibidos (según permisos y plan). */
export function SegmentosDocumentos() {
  const ruta    = usePathname() ?? "";
  const empresa = useAuthStore((s) => s.empresa);
  const opciones = [
    tienePermiso(empresa, "descargar") && { href: "/documentos", etiqueta: "Emitidos" },
    tienePermiso(empresa, "documentos_recibidos") && !rutaFueraDelPlan("/documentos/recibidos", empresa)
      && { href: "/documentos/recibidos", etiqueta: "Recibidos" },
  ].filter(Boolean) as { href: string; etiqueta: string }[];
  return <Segmentos actual={ruta} opciones={opciones} className="lg:hidden" />;
}

/** Personas → Clientes | Productos (según permisos). */
export function SegmentosPersonas() {
  const ruta    = usePathname() ?? "";
  const empresa = useAuthStore((s) => s.empresa);
  const opciones = [
    tienePermiso(empresa, "clientes")  && { href: "/personas",  etiqueta: "Clientes" },
    tienePermiso(empresa, "productos") && { href: "/productos", etiqueta: "Productos" },
  ].filter(Boolean) as { href: string; etiqueta: string }[];
  return <Segmentos actual={ruta} opciones={opciones} className="lg:hidden" />;
}

export default function BarraPestanas() {
  const ruta    = limpiar(usePathname() ?? "/");
  const empresa = useAuthStore((s) => s.empresa);
  const [emitirAbierta, setEmitirAbierta] = useState(false);

  if (SIN_BARRA.some(p => (ruta + "/").startsWith(p))) return null;

  // Cada pestaña lleva a lo que el usuario sí puede ver
  const verEmitidos  = tienePermiso(empresa, "descargar");
  const verRecibidos = tienePermiso(empresa, "documentos_recibidos") && !rutaFueraDelPlan("/documentos/recibidos", empresa);
  const verClientes  = tienePermiso(empresa, "clientes");
  const verProductos = tienePermiso(empresa, "productos");
  const puedeEmitir  = tienePermiso(empresa, "emitir");

  const izquierda: Pestana[] = [
    { id: "inicio", href: "/dashboard", etiqueta: "Inicio", icono: Home, activa: r => r === "/dashboard" },
  ];
  if (verEmitidos || verRecibidos) izquierda.push({
    id: "documentos", href: verEmitidos ? "/documentos" : "/documentos/recibidos",
    etiqueta: "Documentos", icono: FileText, activa: esDocumentos,
  });
  const derecha: Pestana[] = [];
  if (verClientes || verProductos) derecha.push({
    id: "personas", href: verClientes ? "/personas" : "/productos",
    etiqueta: "Personas", icono: Users, activa: esPersonas,
  });
  derecha.push({
    id: "mas", href: "/mas", etiqueta: "Más", icono: LayoutGrid,
    // Todo lo que no es de otra pestaña (Cuentas, Reportes, Configuración…) vive en Más
    activa: r => r !== "/dashboard" && !esDocumentos(r) && !esPersonas(r),
  });

  const alTocar = (p: Pestana) => (e: React.MouseEvent) => {
    void vibrar("ligera");
    if (p.activa(ruta)) {
      // Ya estás aquí: subir al inicio (el scroll vive en <main> del layout)
      e.preventDefault();
      document.querySelector("main")?.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const enlace = (p: Pestana) => {
    const Icono  = p.icono;
    const activa = p.activa(ruta);
    return (
      <Link
        key={p.id}
        href={p.href}
        onClick={alTocar(p)}
        aria-current={activa ? "page" : undefined}
        className={cn(
          "flex flex-1 flex-col items-center justify-center gap-0.5 text-[11px] font-medium",
          "transition-colors duration-(--duracion-rapida) active:opacity-70",
          activa ? "text-acento" : "text-sutil",
        )}
      >
        <span className={cn(
          "inline-flex h-7 w-14 items-center justify-center rounded-full transition-colors duration-(--duracion-base)",
          activa && "bg-acento-suave",
        )}>
          <Icono size={21} strokeWidth={activa ? 2.4 : 2} aria-hidden />
        </span>
        {p.etiqueta}
      </Link>
    );
  };

  return (
    <>
      <nav
        id="barra-pestanas"
        aria-label="Navegación principal"
        className="fixed inset-x-0 bottom-0 z-(--capa-nav) border-t border-borde bg-superficie/95 pb-(--sa-bottom) backdrop-blur-md lg:hidden"
      >
        <div className="mx-auto flex h-14 max-w-xl items-stretch">
          {izquierda.map(enlace)}
          {puedeEmitir && (
            <div className="flex flex-1 items-center justify-center">
              <button
                type="button"
                onClick={() => { void vibrar("media"); setEmitirAbierta(true); }}
                aria-label="Emitir comprobante"
                aria-haspopup="dialog"
                className="-mt-5 inline-flex size-14 items-center justify-center rounded-full bg-boton text-sobre-acento shadow-(--sombra-flotante) ring-4 ring-fondo transition-transform duration-(--duracion-rapida) ease-estandar active:scale-95"
              >
                <Plus size={26} strokeWidth={2.5} aria-hidden />
              </button>
            </div>
          )}
          {derecha.map(enlace)}
        </div>
      </nav>
      <HojaEmitir abierta={emitirAbierta} onCerrar={() => setEmitirAbierta(false)} />
    </>
  );
}
