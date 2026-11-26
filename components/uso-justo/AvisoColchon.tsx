"use client";

// El comprobante salió, pero la empresa llegó a su límite de uso justo del mes
// y está usando el margen (colchón). Se le dice cuántos le quedan y cómo seguir:
// solicitar ampliación gratis o Kipu Pro (emite sin límite).

import Link from "next/link";
import { AlertTriangle, Sparkles } from "lucide-react";
import SolicitarAmpliacion from "./SolicitarAmpliacion";
import SoloWeb from "@/components/SoloWeb";

export interface AvisoUsoJusto {
  codigo:               string;
  mensaje:              string;
  restantes:            number;
  solicitar_ampliacion: boolean;
}

export default function AvisoColchon({ aviso }: { aviso: AvisoUsoJusto }) {
  const quedan = aviso.restantes > 0
    ? `Te ${aviso.restantes === 1 ? "queda 1 comprobante" : `quedan ${aviso.restantes} comprobantes`} este mes.`
    : "Este fue tu último comprobante gratis del mes.";
  return (
    <div className="text-left rounded-xl p-3 mb-4 border border-alerta/40 bg-alerta/8">
      <p className="flex items-start gap-1.5 text-xs font-medium text-alerta">
        <AlertTriangle size={13} className="mt-0.5 shrink-0" />
        <span>
          {aviso.mensaje} {quedan}{" "}
          <Link href="/uso-justo" className="underline underline-offset-2 whitespace-nowrap">Ver mi uso justo</Link>
        </span>
      </p>
      {aviso.solicitar_ampliacion && <SolicitarAmpliacion />}
      <SoloWeb>
        <Link
          href="/planes"
          className="mt-2 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-semibold text-white transition-opacity hover:opacity-90 bg-acento"
        >
          <Sparkles size={13} /> Ver Kipu Pro: emite sin límite
        </Link>
      </SoloWeb>
    </div>
  );
}
