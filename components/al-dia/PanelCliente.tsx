"use client";

// Panel del cliente de Kipu Al Día: lo que viene y el historial de las
// declaraciones que el equipo de Kipu presenta por él. Nunca dice quién del
// equipo lo atiende. Si ya no tiene el servicio, se muestra solo el historial.

import { useEffect, useState } from "react";
import { AlertTriangle, CalendarClock, CheckCircle2, Clock, Download, FileText, Loader2, MessageSquareText, XCircle } from "lucide-react";
import api from "@/lib/api";

interface Gestion {
  id:                number;
  nombre:            string;
  estado:            "PENDIENTE" | "RESUMEN_ENVIADO" | "PRESENTADO" | "NO_PAGADO";
  vencimiento_fmt:   string;
  valor_a_pagar:     number | null;
  resumen:           string | null;
  numero_formulario: string | null;
  tiene_comprobante: boolean;
  presentado_at:     string | null;
}
interface Datos { proxima: Gestion | null; historial: Gestion[]; clave_sri_guardada: boolean }

const ESTADO = {
  PENDIENTE:       { texto: "En preparación",              color: "var(--kipu-info)",    Icono: Clock },
  RESUMEN_ENVIADO: { texto: "Te enviamos el resumen",      color: "var(--kipu-warning)", Icono: MessageSquareText },
  PRESENTADO:      { texto: "Presentada",                  color: "var(--kipu-success)", Icono: CheckCircle2 },
  NO_PAGADO:       { texto: "No presentada: pago pendiente", color: "var(--kipu-danger)", Icono: XCircle },
} as const;

const caja = { background: "var(--kipu-surface)", border: "1px solid var(--kipu-border)" };
const dinero = (n: number) => `$${n.toFixed(2)}`;
const dia = (iso: string) => new Date(iso).toLocaleDateString("es-EC", { day: "numeric", month: "long" });

export default function PanelCliente({ soloHistorial = false }: { soloHistorial?: boolean }) {
  const [datos,     setDatos]     = useState<Datos | null>(null);
  const [error,     setError]     = useState<string | null>(null);
  const [bajando,   setBajando]   = useState<number | null>(null);

  useEffect(() => {
    let vivo = true;
    api.get("/api/v1/app/al-dia/gestiones")
      .then((r) => { if (vivo) setDatos(r.data.data); })
      .catch(() => { if (vivo) setError("No pudimos cargar tus declaraciones."); });
    return () => { vivo = false; };
  }, []);

  const descargar = async (g: Gestion) => {
    setBajando(g.id);
    try {
      const r = await api.get(`/api/v1/app/al-dia/gestiones/${g.id}/comprobante`);
      window.open(r.data.url, "_blank", "noopener,noreferrer");
    } catch {
      setError("No se pudo descargar el comprobante. Intenta de nuevo.");
    } finally {
      setBajando(null);
    }
  };

  if (!datos) {
    if (soloHistorial) return null;
    return error ? <p className="text-sm" style={{ color: "var(--kipu-danger)" }}>{error}</p> : (
      <div className="flex justify-center py-6"><Loader2 size={18} className="animate-spin" style={{ color: "var(--kipu-subtle)" }} /></div>
    );
  }
  if (soloHistorial && datos.historial.length === 0) return null;

  const p = datos.proxima;

  return (
    <div className="space-y-5">
      {/* Lo que viene */}
      {!soloHistorial && (
        <section className="space-y-2">
          <h2 className="text-sm font-semibold flex items-center gap-2" style={{ color: "var(--kipu-text)" }}>
            <CalendarClock size={16} style={{ color: "var(--kipu-accent)" }} /> Lo que viene
          </h2>
          <div className="rounded-xl p-4 space-y-2" style={caja}>
            {p ? (
              <>
                <p className="text-sm" style={{ color: "var(--kipu-text)" }}>
                  <strong className="capitalize">{p.nombre}</strong>:{" "}
                  {p.estado === "RESUMEN_ENVIADO"
                    ? <>te enviamos el resumen para que lo revises. La presentamos antes del <strong>{p.vencimiento_fmt}</strong>.</>
                    : <>la presentamos antes del <strong>{p.vencimiento_fmt}</strong>. Unos días antes te enviamos el resumen por WhatsApp para que lo revises.</>}
                </p>
                {p.estado === "RESUMEN_ENVIADO" && p.valor_a_pagar !== null && (
                  <p className="text-sm" style={{ color: "var(--kipu-text)" }}>
                    Valor a pagar: <strong>{dinero(p.valor_a_pagar)}</strong>. Si algo no está bien, respóndenos por WhatsApp.
                  </p>
                )}
              </>
            ) : (
              <p className="text-sm" style={{ color: "var(--kipu-muted)" }}>
                Estás al día. La próxima declaración aparece aquí apenas empiece su periodo.
              </p>
            )}
            {!datos.clave_sri_guardada && (
              <a href="#clave-sri" className="flex items-start gap-2 rounded-lg px-3 py-2 text-xs"
                 style={{ background: "color-mix(in srgb, var(--kipu-danger) 10%, transparent)", color: "var(--kipu-text)" }}>
                <AlertTriangle size={14} className="shrink-0 mt-px" style={{ color: "var(--kipu-danger)" }} />
                <span><strong>Falta tu clave del SRI.</strong> Sin ella no podemos presentar tus declaraciones: guárdala abajo.</span>
              </a>
            )}
          </div>
        </section>
      )}

      {/* Historial */}
      <section className="space-y-2">
        <h2 className="text-sm font-semibold flex items-center gap-2" style={{ color: "var(--kipu-text)" }}>
          <FileText size={16} style={{ color: "var(--kipu-accent)" }} />
          {soloHistorial ? "Tus declaraciones con Kipu Al Día" : "Tu historial"}
        </h2>
        {datos.historial.length === 0 ? (
          <div className="rounded-xl p-4 text-sm" style={{ ...caja, color: "var(--kipu-muted)" }}>
            Todavía no hay declaraciones. Aquí vas a ver cada una que presentemos por ti, con su comprobante del SRI.
          </div>
        ) : (
          <div className="rounded-xl divide-y" style={{ ...caja, borderColor: "var(--kipu-border)" }}>
            {datos.historial.map((g) => {
              const e = ESTADO[g.estado] ?? ESTADO.PENDIENTE;
              return (
                <div key={g.id} className="p-4 space-y-1.5" style={{ borderColor: "var(--kipu-border)" }}>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-medium capitalize" style={{ color: "var(--kipu-text)" }}>{g.nombre}</p>
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold" style={{ color: e.color }}>
                      <e.Icono size={12} /> {e.texto}
                    </span>
                  </div>
                  <p className="text-xs" style={{ color: "var(--kipu-subtle)" }}>
                    {g.estado === "PRESENTADO" && g.presentado_at
                      ? `Presentada el ${dia(g.presentado_at)}`
                      : `Vence el ${g.vencimiento_fmt}`}
                    {g.valor_a_pagar !== null && g.estado !== "PENDIENTE" && ` · valor a pagar ${dinero(g.valor_a_pagar)}`}
                    {g.numero_formulario && ` · formulario n.º ${g.numero_formulario}`}
                  </p>
                  {g.estado === "RESUMEN_ENVIADO" && g.resumen && (
                    <p className="text-xs whitespace-pre-line rounded-md px-3 py-2"
                       style={{ background: "var(--kipu-bg)", color: "var(--kipu-text)" }}>{g.resumen}</p>
                  )}
                  {g.tiene_comprobante && (
                    <button type="button" onClick={() => descargar(g)} disabled={bajando === g.id}
                            className="inline-flex items-center gap-1.5 text-xs font-semibold hover:underline underline-offset-2 disabled:opacity-60"
                            style={{ color: "var(--kipu-accent)" }}>
                      {bajando === g.id ? <Loader2 size={12} className="animate-spin" /> : <Download size={12} />}
                      Descargar comprobante del SRI
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
        {error && <p className="text-xs" style={{ color: "var(--kipu-danger)" }}>{error}</p>}
      </section>
    </div>
  );
}
