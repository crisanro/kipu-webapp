"use client";
// Link de pago de una factura por cobrar (Payphone / PagoPlux de la empresa).
import { useEffect, useState } from "react";
import Link from "next/link";
import { CreditCard, Copy, CheckCircle2, ExternalLink, RefreshCw, MessageCircle } from "lucide-react";
import api from "@/lib/api";

interface LinkPagoData {
  id:              string;
  proveedor:       string;
  nombre_pasarela: string;
  url:             string;
  monto:           number;
  estado:          "PENDIENTE" | "PAGADO" | "EXPIRADO" | "ANULADO";
  expira_at:       string | null;
  transaction_id:  string | null;
  monto_pagado:    number | null;
  pagado_at:       string | null;
}

interface Props {
  documentoId: string;
  numero:      string;
  pendiente:   boolean;          // la factura todavía tiene saldo por cobrar
  onPagado:    () => void;       // recargar la factura cuando se confirma el pago
}

const detalleError = (e: unknown, porDefecto: string): string =>
  (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail ?? porDefecto;

const fecha = (iso: string) =>
  new Date(iso).toLocaleDateString("es-EC", { day: "2-digit", month: "short", year: "numeric",
                                              timeZone: "America/Guayaquil" });

export default function LinkPago({ documentoId, numero, pendiente, onPagado }: Props) {
  const [link,       setLink]       = useState<LinkPagoData | null>(null);
  const [conectada,  setConectada]  = useState(false);
  const [cargando,   setCargando]   = useState(true);
  const [trabajando, setTrabajando] = useState(false);
  const [copiado,    setCopiado]    = useState(false);
  const [error,      setError]      = useState("");
  const [aviso,      setAviso]      = useState("");

  useEffect(() => {
    let vivo = true;
    api.get(`/api/v1/app/cobros-en-linea/documentos/${documentoId}`)
      .then(r => { if (vivo) { setLink(r.data.data); setConectada(!!r.data.pasarela_conectada); } })
      .catch(() => {})
      .finally(() => { if (vivo) setCargando(false); });
    return () => { vivo = false; };
  }, [documentoId]);

  const crear = async () => {
    setTrabajando(true); setError(""); setAviso("");
    try {
      const r = await api.post(`/api/v1/app/cobros-en-linea/documentos/${documentoId}/link`);
      setLink(r.data.data);
    } catch (e) {
      setError(detalleError(e, "No se pudo crear el link."));
    } finally {
      setTrabajando(false);
    }
  };

  const verificar = async () => {
    setTrabajando(true); setError(""); setAviso("");
    try {
      const r = await api.post(`/api/v1/app/cobros-en-linea/documentos/${documentoId}/verificar`);
      setLink(r.data.data);
      if (r.data.data?.estado === "PAGADO") onPagado();
      else setAviso("Todavía no registramos el pago.");
    } catch (e) {
      setError(detalleError(e, "No se pudo verificar."));
    } finally {
      setTrabajando(false);
    }
  };

  const copiar = async () => {
    if (!link) return;
    await navigator.clipboard.writeText(link.url);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  };

  if (cargando) return null;

  // Pagado en línea
  if (link?.estado === "PAGADO") {
    return (
      <div className="flex items-start gap-2 text-xs px-3 py-2 rounded-lg mt-2"
           style={{ color: "var(--kipu-success)", background: "color-mix(in srgb, var(--kipu-success) 8%, transparent)" }}>
        <CreditCard size={13} className="mt-0.5 shrink-0" />
        <span>
          Pagado en línea con {link.nombre_pasarela}: ${(link.monto_pagado ?? link.monto).toFixed(2)}
          {link.pagado_at && ` · ${fecha(link.pagado_at)}`}
          {link.transaction_id && ` · #${link.transaction_id}`}
        </span>
      </div>
    );
  }
  if (!pendiente) return null;

  if (!conectada && !link) {
    return (
      <p className="text-xs mt-2" style={{ color: "var(--kipu-subtle)" }}>
        ¿Quieres cobrarla con tarjeta?{" "}
        <Link href="/configuracion#cobros" className="underline" style={{ color: "var(--kipu-accent)" }}>
          Conecta Payphone o PagoPlux
        </Link>
      </p>
    );
  }

  const vigente = link?.estado === "PENDIENTE";
  const mensajeWa = link
    ? `Hola, te comparto el link para pagar la factura ${numero} por $${link.monto.toFixed(2)}: ${link.url}`
    : "";

  return (
    <div className="mt-3 pt-3 space-y-2" style={{ borderTop: "1px solid var(--kipu-border)" }}>
      <div>
        <div className="flex items-center gap-2">
          <CreditCard size={13} style={{ color: "var(--kipu-subtle)" }} />
          <span className="text-xs font-medium" style={{ color: "var(--kipu-text)" }}>Link de pago</span>
        </div>
        {link && vigente && (
          <p className="text-[11px] mt-0.5" style={{ color: "var(--kipu-subtle)" }}>
            {link.nombre_pasarela} · ${link.monto.toFixed(2)}
            {link.expira_at && ` · vence ${fecha(link.expira_at)}`}
          </p>
        )}
      </div>

      {vigente && link ? (
        <>
          <div className="flex items-center gap-2">
            <code className="flex-1 min-w-0 truncate text-[11px] px-2.5 py-2 rounded-lg"
                  style={{ background: "color-mix(in srgb, var(--kipu-text) 5%, transparent)", color: "var(--kipu-text)" }}>
              {link.url}
            </code>
            <button onClick={copiar} title="Copiar link" className="p-2 rounded-lg shrink-0"
                    style={{ border: "1px solid var(--kipu-border)", color: "var(--kipu-muted)" }}>
              {copiado ? <CheckCircle2 size={14} style={{ color: "var(--kipu-success)" }} /> : <Copy size={14} />}
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            <a href={`https://wa.me/?text=${encodeURIComponent(mensajeWa)}`} target="_blank" rel="noopener noreferrer"
               className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg"
               style={{ border: "1px solid var(--kipu-border)", color: "var(--kipu-muted)" }}>
              <MessageCircle size={12} /> WhatsApp
            </a>
            <a href={link.url} target="_blank" rel="noopener noreferrer"
               className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg"
               style={{ border: "1px solid var(--kipu-border)", color: "var(--kipu-muted)" }}>
              <ExternalLink size={12} /> Abrir
            </a>
            {link.proveedor === "PAYPHONE" && (
              <button onClick={verificar} disabled={trabajando}
                      className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg disabled:opacity-50"
                      style={{ border: "1px solid var(--kipu-border)", color: "var(--kipu-accent)" }}>
                <RefreshCw size={12} className={trabajando ? "animate-spin" : ""} /> ¿Ya pagó?
              </button>
            )}
          </div>
        </>
      ) : (
        <button onClick={crear} disabled={trabajando}
                className="w-full py-2 rounded-lg text-xs font-medium disabled:opacity-50"
                style={{ color: "var(--kipu-accent)", border: "1px dashed color-mix(in srgb, var(--kipu-accent) 45%, transparent)" }}>
          {trabajando ? "Creando link…" : link?.estado === "EXPIRADO" ? "El link venció · crear uno nuevo" : "Crear link de pago"}
        </button>
      )}

      {aviso && <p className="text-[11px]" style={{ color: "var(--kipu-subtle)" }}>{aviso}</p>}
      {error && (
        <p className="text-xs px-3 py-2 rounded-lg"
           style={{ color: "var(--kipu-danger)", background: "color-mix(in srgb, var(--kipu-danger) 10%, transparent)" }}>
          {error}
        </p>
      )}
    </div>
  );
}
