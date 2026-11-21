// components/EjemploPro.tsx — aviso y etiqueta de los datos de EJEMPLO (lib/demos.ts)
import Link from "next/link";
import { Sparkles } from "lucide-react";
import SoloWeb from "@/components/SoloWeb";
import { ES_APP_NATIVA } from "@/lib/plataforma";

// textoApp: el mismo mensaje sin nombrar planes, para la app de las tiendas
export function BannerEjemplo({ texto, textoApp }: { texto: string; textoApp: string }) {
  return (
    <div
      className="flex items-center gap-3 rounded-xl px-4 py-3 mb-4"
      style={{
        background: "color-mix(in srgb, var(--kipu-accent) 8%, transparent)",
        border: "1px solid color-mix(in srgb, var(--kipu-accent) 25%, transparent)",
      }}
    >
      <Sparkles size={15} className="shrink-0" style={{ color: "var(--kipu-accent)" }} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium" style={{ color: "var(--kipu-accent)" }}>Esto es un ejemplo</p>
        <p className="text-xs" style={{ color: "var(--kipu-subtle)" }}>{ES_APP_NATIVA ? textoApp : texto}</p>
      </div>
      <SoloWeb>
        <Link
          href="/planes"
          className="text-xs font-medium px-3 py-1.5 rounded-lg text-white shrink-0"
          style={{ background: "var(--kipu-accent)" }}
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
