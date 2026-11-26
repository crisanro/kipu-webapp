// components/ui/BotonFlotante.tsx
// El botón redondo de "nuevo" del celular (FAB), abajo a la derecha, encima de
// la barra de pestañas y del área segura. En la compu no se muestra: ahí el
// botón va en el encabezado de la pantalla.
//
//   <BotonFlotante href="/personas?nueva=1" etiqueta="Nueva persona" />
//   <BotonFlotante onClick={abrirNuevo} etiqueta="Nuevo producto" texto="Nuevo" />

"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { vibrar } from "@/lib/nativo";
import { cn } from "./cn";

export default function BotonFlotante({ etiqueta, texto, icono, href, onClick, className }: {
  /** Lo que lee el lector de pantalla (y el tooltip). */
  etiqueta:   string;
  /** Con texto se vuelve una píldora ("+ Nuevo"); sin texto, solo el ícono. */
  texto?:     string;
  icono?:     ReactNode;
  href?:      string;
  onClick?:   () => void;
  className?: string;
}) {
  const clases = cn(
    "fixed right-4 z-(--capa-nav) inline-flex items-center justify-center gap-2 lg:hidden",
    "bottom-[calc(1rem+var(--alto-barra-inferior,0px)+var(--sa-bottom))]",
    "bg-boton text-sobre-acento shadow-(--sombra-flotante)",
    "transition-transform duration-(--duracion-rapida) ease-estandar active:scale-95",
    texto ? "h-14 rounded-2xl px-5 text-sm font-semibold" : "size-14 rounded-2xl",
    className,
  );
  const contenido = <>{icono ?? <Plus size={24} strokeWidth={2.5} aria-hidden />}{texto}</>;
  const alTocar = () => { void vibrar("ligera"); onClick?.(); };

  return href
    ? <Link href={href} aria-label={etiqueta} title={etiqueta} className={clases} onClick={() => void vibrar("ligera")}>{contenido}</Link>
    : <button type="button" aria-label={etiqueta} title={etiqueta} className={clases} onClick={alTocar}>{contenido}</button>;
}
