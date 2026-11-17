"use client";

// Se pasó el uso justo del plan gratis: cómo seguir emitiendo (nunca en silencio).
// Emitir por el panel nunca gasta créditos, así que la salida es Kipu Pro.

import Link from "next/link";
import { Sparkles } from "lucide-react";

export default function AccionesUsoJusto() {
  return (
    <Link
      href="/planes"
      className="mt-2 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-semibold text-white transition-opacity hover:opacity-90 active:scale-[0.98]"
      style={{ background: "var(--kipu-accent)" }}
    >
      <Sparkles size={13} /> Ver Kipu Pro: emite sin límite
    </Link>
  );
}
