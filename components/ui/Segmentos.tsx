// components/ui/Segmentos.tsx
// Selector de 2 o 3 opciones (segmented control de iOS / Material). Cada opción
// es una pantalla: Documentos → Emitidos | Recibidos, Personas → Clientes | Productos.
// Con una sola opción visible (sin permiso o fuera del plan) no se dibuja.
//
//   <Segmentos actual={pathname} opciones={[
//     { href: "/documentos", etiqueta: "Emitidos" },
//     { href: "/documentos/recibidos", etiqueta: "Recibidos" },
//   ]} />

import Link from "next/link";
import { cn } from "./cn";

export interface OpcionSegmento { href: string; etiqueta: string }

/** /documentos/ → /documentos (el export estático usa barra final) */
const limpiar = (r: string) => r.replace(/\/+$/, "") || "/";

export default function Segmentos({ opciones, actual, className }: {
  opciones:   OpcionSegmento[];
  actual:     string;
  className?: string;
}) {
  if (opciones.length < 2) return null;
  const ruta = limpiar(actual);
  return (
    <nav aria-label="Secciones" className={cn("flex rounded-xl bg-presionado p-1", className)}>
      {opciones.map(o => {
        const activa = limpiar(o.href) === ruta;
        return (
          <Link
            key={o.href}
            href={o.href}
            aria-current={activa ? "page" : undefined}
            className={cn(
              "flex-1 rounded-lg px-3 text-center text-sm font-medium leading-9 tactil:leading-10",
              "transition-[background-color,color,box-shadow] duration-(--duracion-rapida) ease-estandar",
              activa
                ? "bg-superficie text-texto shadow-sm"
                : "text-tenue hover:text-texto active:bg-superficie/50",
            )}
          >
            {o.etiqueta}
          </Link>
        );
      })}
    </nav>
  );
}
