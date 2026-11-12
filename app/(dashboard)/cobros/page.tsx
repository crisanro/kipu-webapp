"use client";
import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import api from "@/lib/api";
import { usePermiso } from "@/hooks/usePermiso";
import SinAcceso from "@/components/SinAcceso";
import {
  Link2, Plus, Copy, CheckCircle2, MessageCircle, RefreshCw, Ban, FileText, AlertTriangle, Loader2,
} from "lucide-react";

// "Facturar cuando el cliente pague": la factura ya armada espera el pago del link
interface Cobro {
  id:                     string;
  estado:                 "PENDIENTE" | "PAGADO" | "FACTURADO" | "ERROR" | "REVISAR" | "ANULADO" | "EXPIRADO";
  monto:                  number;
  descripcion:            string | null;
  cliente_nombre:         string | null;
  cliente_identificacion: string | null;
  documento_id:           string | null;
  numero_doc:             string | null;
  error:                  string | null;
  created_at:             string;
  pagado_at:              string | null;
  link: { url: string; nombre_pasarela: string; estado: string; expira_at: string | null } | null;
}

const ESTADOS: Record<Cobro["estado"], { label: string; color: string }> = {
  PENDIENTE: { label: "Esperando pago",       color: "var(--kipu-warning)" },
  PAGADO:    { label: "Pagado · facturando",  color: "var(--kipu-accent)" },
  FACTURADO: { label: "Pagado y facturado",   color: "var(--kipu-success)" },
  ERROR:     { label: "Pagado · sin factura", color: "var(--kipu-danger)" },
  REVISAR:   { label: "Revisar",              color: "var(--kipu-danger)" },
  ANULADO:   { label: "Anulado",              color: "var(--kipu-subtle)" },
  EXPIRADO:  { label: "Venció",               color: "var(--kipu-subtle)" },
};

const FILTROS: { valor: string; label: string }[] = [
  { valor: "",          label: "Todos" },
  { valor: "PENDIENTE", label: "Esperando pago" },
  { valor: "FACTURADO", label: "Facturados" },
  { valor: "ERROR",     label: "Sin factura" },
  { valor: "REVISAR",   label: "Revisar" },
];

const LIMITE = 50;
const fmt = (n: number) => `$${n.toFixed(2)}`;
const fecha = (s: string | null) =>
  s ? new Date(s).toLocaleDateString("es-EC", { day: "2-digit", month: "short", year: "numeric" }) : "";

export default function CobrosPage() {
  const puedeVer = usePermiso("emitir");
  if (!puedeVer) return <SinAcceso />;
  return <CobrosContenido />;
}

function CobrosContenido() {
  const [cobros,   setCobros]   = useState<Cobro[]>([]);
  const [total,    setTotal]    = useState(0);
  const [filtro,   setFiltro]   = useState("");
  const [loading,  setLoading]  = useState(true);
  const [ocupado,  setOcupado]  = useState<string | null>(null);   // id del cobro con una acción en curso
  const [copiado,  setCopiado]  = useState<string | null>(null);
  const [mensaje,  setMensaje]  = useState<{ id: string; texto: string; error?: boolean } | null>(null);

  const cargar = useCallback(async (append = false, offset = 0) => {
    if (!append) setLoading(true);
    try {
      const qs = new URLSearchParams({ limit: String(LIMITE), offset: String(offset) });
      if (filtro) qs.set("estado", filtro);
      const res = await api.get(`/api/v1/app/cobros-en-linea/cobros?${qs}`);
      const nuevos: Cobro[] = res.data.data ?? [];
      setTotal(res.data.total ?? 0);
      setCobros(prev => append ? [...prev, ...nuevos] : nuevos);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [filtro]);

  useEffect(() => { cargar(); }, [cargar]);

  const reemplazar = (c: Cobro) => setCobros(prev => prev.map(x => x.id === c.id ? c : x));

  const accion = async (c: Cobro, ruta: "verificar" | "anular" | "facturar") => {
    if (ruta === "anular" && !confirm("¿Anular este link de cobro? Si tu cliente igual paga, te avisaremos para que decidas si emites la factura.")) return;
    setOcupado(c.id);
    setMensaje(null);
    try {
      const res = await api.post(`/api/v1/app/cobros-en-linea/cobros/${c.id}/${ruta}`);
      const nuevo: Cobro = res.data.data;
      reemplazar(nuevo);
      if (ruta === "verificar") {
        setMensaje({ id: c.id, texto: nuevo.estado === "FACTURADO" ? "¡Pagó! La factura ya se emitió."
          : nuevo.estado === "PENDIENTE" ? "Todavía no hay un pago aprobado." : ESTADOS[nuevo.estado].label });
      }
    } catch (err: unknown) {
      const detalle = (err as { response?: { data?: { detail?: unknown } } })?.response?.data?.detail;
      setMensaje({ id: c.id, texto: typeof detalle === "string" ? detalle : "No se pudo completar la acción.",
                   error: true });
    } finally {
      setOcupado(null);
    }
  };

  const copiar = async (c: Cobro) => {
    if (!c.link?.url) return;
    await navigator.clipboard.writeText(c.link.url);
    setCopiado(c.id);
    setTimeout(() => setCopiado(null), 2000);
  };

  const boton = "inline-flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg transition-colors disabled:opacity-50";
  const estiloBoton = { border: "1px solid var(--kipu-border)", color: "var(--kipu-muted)" };

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="min-w-0">
          <h1 className="text-xl font-bold" style={{ color: "var(--kipu-text)" }}>Links de cobro</h1>
          <p className="text-sm" style={{ color: "var(--kipu-subtle)" }}>
            Cobra primero: la factura se emite sola cuando tu cliente paga.
          </p>
        </div>
        <Link
          href="/documentos/emitir/fac?cuando=al_pagar"
          className="shrink-0 flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-medium"
          style={{ background: "var(--kipu-accent)" }}
        >
          <Plus size={15} />
          <span className="hidden sm:inline">Nuevo link de cobro</span>
          <span className="sm:hidden">Nuevo</span>
        </Link>
      </div>

      {/* Filtros */}
      <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
        {FILTROS.map(f => (
          <button
            key={f.valor}
            type="button"
            onClick={() => setFiltro(f.valor)}
            className="shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors"
            style={{
              border: "1px solid var(--kipu-border)",
              background: filtro === f.valor ? "var(--kipu-accent)" : "transparent",
              color: filtro === f.valor ? "#FFFFFF" : "var(--kipu-muted)",
            }}
          >
            {f.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 size={24} className="animate-spin" style={{ color: "var(--kipu-accent)" }} />
        </div>
      ) : cobros.length === 0 ? (
        <div className="flex flex-col items-center text-center py-16 px-4">
          <Link2 size={36} className="mb-3" style={{ color: "var(--kipu-subtle)" }} />
          <p className="text-sm max-w-sm" style={{ color: "var(--kipu-muted)" }}>
            {filtro ? "No hay links de cobro con este estado." :
              "Arma la factura como siempre, elige “Pendiente de cobro” → “Cobrar con link de pago” → “Emitir la factura cuando pague”. Tu cliente paga y la factura sale sola."}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {cobros.map(c => {
            const est = ESTADOS[c.estado];
            const trabajando = ocupado === c.id;
            return (
              <div key={c.id} className="rounded-xl p-4 space-y-3"
                   style={{ background: "var(--kipu-surface)", border: "1px solid var(--kipu-border)" }}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate" style={{ color: "var(--kipu-text)" }}>
                      {c.cliente_nombre || "Cliente"}
                    </p>
                    <p className="text-xs truncate" style={{ color: "var(--kipu-subtle)" }}>
                      {[c.cliente_identificacion, c.descripcion, fecha(c.created_at)].filter(Boolean).join(" · ")}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-semibold" style={{ color: "var(--kipu-text)" }}>{fmt(c.monto)}</p>
                    <span className="inline-block mt-1 px-2 py-0.5 rounded-full text-[11px] font-medium"
                          style={{ color: est.color, background: `color-mix(in srgb, ${est.color} 12%, transparent)` }}>
                      {est.label}
                    </span>
                  </div>
                </div>

                {(c.estado === "ERROR" || c.estado === "REVISAR") && (
                  <p className="flex items-start gap-1.5 text-xs rounded-lg px-3 py-2"
                     style={{ color: "var(--kipu-danger)", background: "color-mix(in srgb, var(--kipu-danger) 8%, transparent)" }}>
                    <AlertTriangle size={13} className="mt-0.5 shrink-0" />
                    <span>
                      {c.estado === "REVISAR" && !c.error
                        ? "Te pagaron un link que habías anulado. Si corresponde, emite la factura."
                        : c.error}
                    </span>
                  </p>
                )}
                {c.estado === "EXPIRADO" && (
                  <p className="text-xs" style={{ color: "var(--kipu-subtle)" }}>
                    El link venció sin pago. Si todavía quieres cobrar, crea uno nuevo.
                  </p>
                )}

                <div className="flex flex-wrap gap-2">
                  {c.estado === "PENDIENTE" && c.link?.url && (
                    <>
                      <button type="button" onClick={() => copiar(c)} className={boton} style={estiloBoton}>
                        {copiado === c.id ? <CheckCircle2 size={12} style={{ color: "var(--kipu-success)" }} /> : <Copy size={12} />}
                        {copiado === c.id ? "Copiado" : "Copiar link"}
                      </button>
                      <a
                        href={`https://wa.me/?text=${encodeURIComponent(`Hola, te comparto el link para tu pago: ${c.link.url}`)}`}
                        target="_blank" rel="noopener noreferrer" className={boton} style={estiloBoton}
                      >
                        <MessageCircle size={12} /> WhatsApp
                      </a>
                    </>
                  )}
                  {(c.estado === "PENDIENTE" || c.estado === "PAGADO") && (
                    <button type="button" disabled={trabajando} onClick={() => accion(c, "verificar")}
                            className={boton} style={estiloBoton}>
                      <RefreshCw size={12} className={trabajando ? "animate-spin" : ""} /> ¿Ya pagó?
                    </button>
                  )}
                  {(c.estado === "ERROR" || c.estado === "REVISAR") && (
                    <button type="button" disabled={trabajando} onClick={() => accion(c, "facturar")}
                            className={boton} style={{ background: "var(--kipu-accent)", color: "#FFFFFF" }}>
                      {trabajando ? <Loader2 size={12} className="animate-spin" /> : <FileText size={12} />}
                      Emitir factura
                    </button>
                  )}
                  {c.estado === "FACTURADO" && c.documento_id && (
                    <Link href={`/documentos/${c.documento_id}`} className={boton} style={estiloBoton}>
                      <FileText size={12} /> Ver factura{c.numero_doc ? ` ${c.numero_doc}` : ""}
                    </Link>
                  )}
                  {(c.estado === "PENDIENTE" || c.estado === "EXPIRADO") && (
                    <button type="button" disabled={trabajando} onClick={() => accion(c, "anular")}
                            className={boton} style={estiloBoton}>
                      <Ban size={12} /> Anular
                    </button>
                  )}
                </div>

                {mensaje?.id === c.id && (
                  <p className="text-xs" style={{ color: mensaje.error ? "var(--kipu-danger)" : "var(--kipu-muted)" }}>
                    {mensaje.texto}
                  </p>
                )}
              </div>
            );
          })}

          {cobros.length < total && (
            <div className="flex justify-center pt-2">
              <button
                type="button"
                onClick={() => cargar(true, cobros.length)}
                className="px-6 py-2.5 rounded-lg text-sm font-medium"
                style={{ border: "1px solid var(--kipu-border)", color: "var(--kipu-accent)" }}
              >
                Cargar más ({cobros.length} de {total})
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
