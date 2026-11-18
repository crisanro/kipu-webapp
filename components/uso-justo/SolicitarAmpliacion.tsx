"use client";

// "Solicitar ampliación" del uso justo del plan gratis. Si la empresa cumple
// los criterios, sube de nivel al instante; si no, queda pendiente y el equipo
// de Kipu la revisa (y le avisa por las notificaciones del panel).
// Solo se muestra cuando se puede pedir: sin plan, antes del nivel más alto y
// sin otra solicitud pendiente.

import { useEffect, useState } from "react";
import { CheckCircle2, Clock, Loader2, TrendingUp } from "lucide-react";
import api from "@/lib/api";

interface EstadoUsoJusto {
  plan_pro:        boolean;
  puede_solicitar: boolean;
  solicitud:       { estado: string } | null;
}

type Resultado = { tipo: "ok" | "pendiente" | "error"; texto: string };

export default function SolicitarAmpliacion() {
  const [estado,    setEstado]    = useState<EstadoUsoJusto | null>(null);
  const [enviando,  setEnviando]  = useState(false);
  const [resultado, setResultado] = useState<Resultado | null>(null);

  useEffect(() => {
    let vivo = true;
    api.get("/api/v1/app/uso-justo")
      .then((r) => { if (vivo) setEstado(r.data.data); })
      .catch(() => { /* sin el estado no se ofrece el botón */ });
    return () => { vivo = false; };
  }, []);

  const solicitar = async () => {
    setEnviando(true);
    try {
      const r = await api.post("/api/v1/app/uso-justo/ampliacion");
      const d = r.data.data as { estado: string; mensaje: string };
      setResultado({ tipo: d.estado === "APROBADA" ? "ok" : "pendiente", texto: d.mensaje });
    } catch (e) {
      const det = (e as { response?: { data?: { detail?: unknown } } })?.response?.data?.detail;
      setResultado({ tipo: "error", texto: typeof det === "string" ? det : "No se pudo enviar la solicitud. Intenta de nuevo." });
    } finally {
      setEnviando(false);
    }
  };

  if (resultado) {
    const color = resultado.tipo === "ok" ? "var(--kipu-success)"
                : resultado.tipo === "pendiente" ? "var(--kipu-info)" : "var(--kipu-danger)";
    const Icono = resultado.tipo === "ok" ? CheckCircle2 : Clock;
    return (
      <p className="mt-2 flex items-start gap-1.5 text-left text-xs rounded-lg px-3 py-2"
         style={{ color, background: `color-mix(in srgb, ${color} 10%, transparent)` }}>
        <Icono size={13} className="mt-0.5 shrink-0" /> {resultado.texto}
      </p>
    );
  }

  if (!estado || estado.plan_pro) return null;

  if (estado.solicitud?.estado === "PENDIENTE") {
    return (
      <p className="mt-2 flex items-start gap-1.5 text-left text-xs rounded-lg px-3 py-2"
         style={{ color: "var(--kipu-info)", background: "color-mix(in srgb, var(--kipu-info) 10%, transparent)" }}>
        <Clock size={13} className="mt-0.5 shrink-0" />
        Tu solicitud de ampliación está en revisión. El equipo de Kipu te avisará por aquí.
      </p>
    );
  }

  if (!estado.puede_solicitar) return null;

  return (
    <button
      type="button"
      onClick={solicitar}
      disabled={enviando}
      className="mt-2 w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-semibold transition-colors disabled:opacity-60"
      style={{ border: "1px solid var(--kipu-accent)", color: "var(--kipu-accent)" }}
    >
      {enviando ? <Loader2 size={13} className="animate-spin" /> : <TrendingUp size={13} />}
      Solicitar ampliación gratis
    </button>
  );
}
