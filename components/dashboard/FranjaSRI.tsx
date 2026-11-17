"use client";

// Franja del panel mientras el SRI tiene intermitencias. El backend la decide con
// su detector de caídas (app/services/sri_disponibilidad.py): durante la caída no
// llegan avisos por cada comprobante, solo esta franja y un aviso final.

import { useEffect, useState } from "react";
import { CloudOff } from "lucide-react";
import api from "@/lib/api";

const CADA_MS = 60_000;

type EstadoSRI = {
  ambientes: Record<string, { intermitencias: boolean }>;
  en_espera: number;
};

export default function FranjaSRI({ sandbox }: { sandbox: boolean }) {
  const [estado, setEstado] = useState<EstadoSRI | null>(null);

  useEffect(() => {
    let vivo = true;
    const cargar = () => {
      if (document.visibilityState !== "visible") return;
      api.get("/api/v1/app/dashboard/estado-sri")
        .then((r) => { if (vivo) setEstado(r.data); })
        .catch(() => {});   // si no se puede consultar, simplemente no se muestra
    };
    cargar();
    const intervalo = setInterval(cargar, CADA_MS);
    document.addEventListener("visibilitychange", cargar);
    return () => {
      vivo = false;
      clearInterval(intervalo);
      document.removeEventListener("visibilitychange", cargar);
    };
  }, []);

  const ambiente = sandbox ? "1" : "2";
  if (!estado?.ambientes?.[ambiente]?.intermitencias) return null;

  const n = estado.en_espera;
  const detalle =
    n === 1 ? "Tu comprobante en cola se enviará solo cuando responda. Te avisamos al terminar."
    : n > 1 ? `Tus ${n} comprobantes en cola se enviarán solos cuando responda. Te avisamos al terminar.`
    : "Puedes seguir emitiendo: tus comprobantes se enviarán solos cuando responda.";

  return (
    <div
      role="status"
      className="w-full px-4 py-2.5 flex items-start gap-2 text-xs shrink-0"
      style={{
        background:   "color-mix(in srgb, var(--kipu-warning) 10%, transparent)",
        borderBottom: "1px solid color-mix(in srgb, var(--kipu-warning) 20%, transparent)",
        color:        "var(--kipu-text)",
      }}
    >
      <CloudOff size={14} className="shrink-0 mt-px" style={{ color: "var(--kipu-warning)" }} />
      <span>
        <strong>El SRI{sandbox ? " de pruebas" : ""} tiene intermitencias.</strong> {detalle}
      </span>
    </div>
  );
}
