"use client";
import { useState, useRef, useEffect } from "react";
import {
  CheckCircle2, Download, Eye, Share2, ChevronDown, MessageCircle, Link2,
} from "lucide-react";
import { type FacturaBase, PDF_FORMATOS, urlXml, urlPdf, urlConsulta } from "./utils";

// Descargas y compartir: PDF (A4 / T80 / T58), XML y enlace para el cliente.
// PDF y XML también en anulados (respaldo contable). Compartir solo en vigentes.
export default function AccionesArchivo({ factura }: { factura: FacturaBase }) {
  const [showPdfMenu,   setShowPdfMenu]   = useState(false);
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [compartidoMsg, setCompartidoMsg] = useState<string | null>(null);

  const pdfMenuRef   = useRef<HTMLDivElement>(null);
  const shareMenuRef = useRef<HTMLDivElement>(null);

  // Cerrar dropdowns al hacer clic fuera
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (pdfMenuRef.current && !pdfMenuRef.current.contains(e.target as Node)) {
        setShowPdfMenu(false);
      }
      if (shareMenuRef.current && !shareMenuRef.current.contains(e.target as Node)) {
        setShowShareMenu(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const xml_url      = urlXml(factura.clave_acceso);
  const consulta_url = urlConsulta(factura.clave_acceso);

  const abrirPDF = (formato: string) => {
    window.open(urlPdf(factura.clave_acceso, formato), "_blank");
    setShowPdfMenu(false);
  };

  const compartirLink = async () => {
    await navigator.clipboard.writeText(consulta_url);
    setCompartidoMsg("¡Enlace copiado!");
    setShowShareMenu(false);
    setTimeout(() => setCompartidoMsg(null), 2500);
  };

  const abrirWhatsApp = () => {
    const msg = encodeURIComponent(
      `Aquí está tu comprobante electrónico:\n${consulta_url}`
    );
    window.open(`https://wa.me/?text=${msg}`, "_blank");
    setShowShareMenu(false);
  };

  return (
    <>
      {/* Toast compartir */}
      {compartidoMsg && (
        <div
          className="fixed top-4 left-1/2 -translate-x-1/2 z-50 text-white text-sm px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 animate-in fade-in slide-in-from-top-2"
          style={{ background: "var(--kipu-success)" }}
        >
          <CheckCircle2 size={14} /> {compartidoMsg}
        </div>
      )}

          {["AUTORIZADO", "ANULADO"].includes(factura.estado_sri) && (
            <>
              {/* ── Dropdown PDF ─────────────────────────────────────── */}
              <div className="relative" ref={pdfMenuRef}>
                <button
                  onClick={() => { setShowPdfMenu(v => !v); setShowShareMenu(false); }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-colors"
                  style={{
                    background: "var(--kipu-surface)",
                    color: "var(--kipu-text)",
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = "color-mix(in srgb, var(--kipu-text) 5%, transparent)"}
                  onMouseLeave={e => e.currentTarget.style.background = "var(--kipu-surface)"}
                >
                  <Eye size={13} /> PDF
                  <ChevronDown size={11} className={showPdfMenu ? "rotate-180 transition-transform" : "transition-transform"} />
                </button>
                {showPdfMenu && (
                  <div
                    className="absolute right-0 top-full mt-1.5 z-30 rounded-xl shadow-xl overflow-hidden w-60 py-1"
                    style={{
                      background: "var(--kipu-surface)",
                      border: "1px solid var(--kipu-border)",
                    }}
                  >
                    <p
                      className="text-[11px] px-3 pt-1.5 pb-1 font-medium"
                      style={{ color: "var(--kipu-subtle)" }}
                    >
                      Formato de impresión
                    </p>
                    {PDF_FORMATOS.map(f => (
                      <button
                        key={f.key}
                        onClick={() => abrirPDF(f.key)}
                        className="w-full flex items-center gap-3 px-3 py-2 transition-colors text-left"
                        style={{ background: "transparent" }}
                        onMouseEnter={e => e.currentTarget.style.background = "color-mix(in srgb, var(--kipu-text) 5%, transparent)"}
                        onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                      >
                        <span className="w-9 shrink-0 text-sm font-semibold" style={{ color: "var(--kipu-text)" }}>{f.label}</span>
                        <span className="text-xs whitespace-nowrap" style={{ color: "var(--kipu-subtle)" }}>{f.desc}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* ── XML ─────────────────────────────────────────────── */}
              <a
                href={xml_url}
                download
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-colors"
                style={{
                  background: "var(--kipu-surface)",
                  color: "var(--kipu-text)",
                }}
                onMouseEnter={e => e.currentTarget.style.background = "color-mix(in srgb, var(--kipu-text) 5%, transparent)"}
                onMouseLeave={e => e.currentTarget.style.background = "var(--kipu-surface)"}
              >
                <Download size={13} /> XML
              </a>

              {/* ── Dropdown Compartir (solo vigentes) ───────────────── */}
              {factura.estado_sri === "AUTORIZADO" && (
              <div className="relative" ref={shareMenuRef}>
                <button
                  onClick={() => { setShowShareMenu(v => !v); setShowPdfMenu(false); }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-colors"
                  style={{
                    background: "color-mix(in srgb, var(--kipu-accent) 15%, transparent)",
                    color: "var(--kipu-accent)",
                    border: "1px solid color-mix(in srgb, var(--kipu-accent) 20%, transparent)",
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = "color-mix(in srgb, var(--kipu-accent) 25%, transparent)"}
                  onMouseLeave={e => e.currentTarget.style.background = "color-mix(in srgb, var(--kipu-accent) 15%, transparent)"}
                >
                  <Share2 size={13} /> Compartir
                  <ChevronDown size={11} className={showShareMenu ? "rotate-180 transition-transform" : "transition-transform"} />
                </button>
                {showShareMenu && (
                  <div
                    className="absolute right-0 top-full mt-1.5 z-30 rounded-xl shadow-xl overflow-hidden w-56"
                    style={{
                      background: "var(--kipu-surface)",
                      border: "1px solid var(--kipu-border)",
                    }}
                  >
                    {/* URL preview */}
                    <div className="px-3 py-2.5" style={{ borderBottom: "1px solid var(--kipu-border)" }}>
                      <p className="text-[10px] mb-1" style={{ color: "var(--kipu-subtle)" }}>Enlace del cliente</p>
                      <p className="text-[10px] font-mono break-all leading-relaxed" style={{ color: "var(--kipu-muted)" }}>
                        consulta.kipu.ec/?id={factura.clave_acceso.slice(0, 12)}…
                      </p>
                    </div>
                    {/* Opciones */}
                    <button
                      onClick={compartirLink}
                      className="w-full flex items-center gap-2.5 px-3 py-2.5 transition-colors text-left"
                      onMouseEnter={e => e.currentTarget.style.background = "color-mix(in srgb, var(--kipu-text) 5%, transparent)"}
                      onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                    >
                      <Link2 size={13} className="shrink-0" style={{ color: "var(--kipu-subtle)" }} />
                      <div>
                        <p className="text-sm" style={{ color: "var(--kipu-text)" }}>Copiar enlace</p>
                        <p className="text-[10px]" style={{ color: "var(--kipu-subtle)" }}>Para enviar por cualquier medio</p>
                      </div>
                    </button>
                    <button
                      onClick={abrirWhatsApp}
                      className="w-full flex items-center gap-2.5 px-3 py-2.5 transition-colors text-left"
                      style={{ borderTop: "1px solid var(--kipu-border)" }}
                      onMouseEnter={e => e.currentTarget.style.background = "color-mix(in srgb, var(--kipu-text) 5%, transparent)"}
                      onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                    >
                      <MessageCircle size={13} className="shrink-0" style={{ color: "var(--kipu-success)" }} />
                      <div>
                        <p className="text-sm" style={{ color: "var(--kipu-text)" }}>Enviar por WhatsApp</p>
                        <p className="text-[10px]" style={{ color: "var(--kipu-subtle)" }}>Abre WhatsApp con el enlace listo</p>
                      </div>
                    </button>
                  </div>
                )}
              </div>
              )}
            </>
          )}

    </>
  );
}