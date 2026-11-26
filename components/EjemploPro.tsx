// components/EjemploPro.tsx — aviso y etiqueta de los datos de EJEMPLO (lib/demos.ts)
// y el aviso de "esto es del Plan Pro" donde la función se ve pero el plan no la incluye
import Link from "next/link";
import { AlertTriangle, Sparkles } from "lucide-react";
import SoloWeb from "@/components/SoloWeb";
import { cn } from "@/components/ui/cn";
import { ES_APP_NATIVA } from "@/lib/plataforma";

/**
 * Sin plan: lo ya registrado se sigue viendo, pero no se puede crear más.
 *   <AvisoFuncionPro titulo texto="Crear proformas es del Plan Pro. …" textoApp="Crear proformas no está incluido en tu plan actual. …" />
 * `titulo`: con la línea "Función del Plan Pro" arriba (en la app, "No incluido en tu plan actual").
 */
export function AvisoFuncionPro({ texto, textoApp, titulo = false, className }: {
  texto: string; textoApp: string; titulo?: boolean; className?: string;
}) {
  return (
    <div className={cn("flex items-center gap-3 rounded-xl border border-alerta/20 bg-alerta-suave px-4 py-3", className)}>
      <AlertTriangle size={15} className="shrink-0 text-alerta" aria-hidden />
      <div className="min-w-0 flex-1">
        {titulo && (
          <p className="text-sm font-medium text-alerta-texto">
            {ES_APP_NATIVA ? "No incluido en tu plan actual" : "Función del Plan Pro"}
          </p>
        )}
        <p className={cn("text-xs", titulo ? "text-tenue" : "text-alerta-texto")}>{ES_APP_NATIVA ? textoApp : texto}</p>
      </div>
      <SoloWeb>
        <Link href="/planes" className="shrink-0 text-xs text-alerta-texto underline underline-offset-2">
          Ver planes
        </Link>
      </SoloWeb>
    </div>
  );
}

// textoApp: el mismo mensaje sin nombrar planes, para la app de las tiendas
export function BannerEjemplo({ texto, textoApp }: { texto: string; textoApp: string }) {
  return (
    <div
      className="flex items-center gap-3 rounded-xl px-4 py-3 mb-4 bg-acento/8 border border-acento/25"
    >
      <Sparkles size={15} className="shrink-0 text-acento" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-acento">Esto es un ejemplo</p>
        <p className="text-xs text-sutil">{ES_APP_NATIVA ? textoApp : texto}</p>
      </div>
      <SoloWeb>
        <Link
          href="/planes"
          className="text-xs font-medium px-3 py-1.5 rounded-lg text-white shrink-0 bg-acento"
        >
          Ver Plan Pro
        </Link>
      </SoloWeb>
    </div>
  );
}

export function EtiquetaEjemplo() {
  return (
    <span
      className="text-[9px] px-1.5 py-0.5 rounded font-bold tracking-wider shrink-0"
      style={{ color: "var(--kipu-accent)", background: "color-mix(in srgb, var(--kipu-accent) 12%, transparent)" }}
    >
      EJEMPLO
    </span>
  );
}
