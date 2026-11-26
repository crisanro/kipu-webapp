"use client";

// Fase 2 (convertir): a quien se está enredando con su declaración (vencida sin
// declarar, o con varias alertas importantes) se le ofrece Kipu Al Día. No se
// muestra a quien ya tiene Al Día.

import Link from "next/link";
import { ArrowRight, LifeBuoy } from "lucide-react";
import { useAuthStore } from "@/store/auth.store";

export default function AyudaAlDia({ vencida }: { vencida: boolean }) {
  const empresa = useAuthStore((s) => s.empresa);
  if (empresa?.suscripcion?.plan === "AL_DIA") return null;

  return (
    <div
      className="rounded-xl p-4 flex flex-col sm:flex-row sm:items-center gap-3 bg-acento/8 border border-acento/25"
    >
      <LifeBuoy size={20} className="shrink-0 text-acento" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-texto">
          {vencida ? "¿Te ayudamos a ponerte al día?" : "¿Te ayudamos con esta declaración?"}
        </p>
        <p className="text-xs mt-0.5 text-sutil">
          Con Kipu Al Día, el equipo de Kipu revisa tus comprobantes y presenta tus declaraciones por ti.
          Tú solo facturas.
        </p>
      </div>
      <Link
        href="/al-dia"
        className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold text-white whitespace-nowrap transition-opacity hover:opacity-90 active:scale-[0.98] bg-acento"
      >
        Conocer Kipu Al Día <ArrowRight size={13} />
      </Link>
    </div>
  );
}
