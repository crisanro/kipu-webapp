// components/ui/cn.ts
// Une clases de Tailwind: acepta condicionales (clsx) y, si dos chocan, gana la
// última (tailwind-merge). Así un componente trae sus clases y quien lo usa las
// ajusta: cn("h-9 px-4", "px-2") → "h-9 px-2".

import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...clases: ClassValue[]): string {
  return twMerge(clsx(clases));
}
