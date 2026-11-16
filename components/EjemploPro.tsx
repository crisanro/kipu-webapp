// components/EjemploPro.tsx — aviso y etiqueta de los datos de EJEMPLO (lib/demos.ts)
import Link from "next/link";
import { Sparkles } from "lucide-react";

export function BannerEjemplo({ texto }: { texto: string }) {
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
        <p className="text-xs" style={{ color: "var(--kipu-subtle)" }}>{texto}</p>
      </div>
      <Link
        href="/planes"
        className="text-xs font-medium px-3 py-1.5 rounded-lg text-white shrink-0"
        style={{ background: "var(--kipu-accent)" }}
      >
        Ver Plan Pro
      </Link>
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
