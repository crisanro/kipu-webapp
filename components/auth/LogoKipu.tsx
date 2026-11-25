// components/auth/LogoKipu.tsx
// Logo de Kipu en claro u oscuro según el tema. Lo elige el CSS (data-theme en
// <html>, app/providers.tsx), así que no hay que esperar a que la página monte:
// sin hueco ni salto al cargar.
//
//   <LogoKipu />                      → 40 px de alto (pantallas de entrada)
//   <LogoKipu className="h-7" />      → menú lateral
//
// El alto lo da className (h-*); el ancho sale de la proporción del SVG (144×41).

import Image from "next/image";
import { cn } from "@/components/ui/cn";

export default function LogoKipu({ className = "h-10", prioridad = true }: {
  className?: string;
  /** Cargar primero (arriba de la pantalla). */
  prioridad?: boolean;
}) {
  return (
    <>
      <Image src="/images/logo.svg" alt="Kipu" width={144} height={41} priority={prioridad}
             className={cn("w-auto [[data-theme=dark]_&]:hidden", className)} />
      <Image src="/images/logo-dark.svg" alt="" aria-hidden width={144} height={41} priority={prioridad}
             className={cn("hidden w-auto [[data-theme=dark]_&]:block", className)} />
    </>
  );
}
