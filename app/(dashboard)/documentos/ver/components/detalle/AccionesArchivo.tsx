"use client";
import { useState, useRef, useEffect } from "react";
import {
  Download, Eye, Share2, ChevronDown, MessageCircle, Link2, Clock, FileText, Loader2,
} from "lucide-react";
import { type FacturaBase, PDF_FORMATOS, urlXml, urlPdf, urlConsulta } from "./utils";
import { useAvisos } from "@/components/ui/Avisos";
import { esNativo, guardarYCompartir } from "@/lib/nativo";

// Estados que pueden generar PDF. Los anulados no: el servidor ya no los entrega (410)
const ESTADOS_CON_PDF = ["AUTORIZADO", "FIRMADO", "RECIBIDA", "EN_REVISION"];
// Estados en proceso (PDF provisional)
const ESTADOS_EN_PROCESO = ["FIRMADO", "RECIBIDA", "EN_REVISION"];
// Estados que pueden descargar XML (solo autorizado tiene XML válido)
const ESTADOS_CON_XML = ["AUTORIZADO"];
// Estados que pueden compartir (solo vigentes)
const ESTADOS_COMPARTIR = ["AUTORIZADO"];

// Descargas y compartir: PDF (A4 / T80 / T58), XML y enlace para el cliente.
// PDF disponible en autorizados y en proceso (provisional).
// XML solo en autorizados. Compartir solo en vigentes.
export default function AccionesArchivo({ factura }: { factura: FacturaBase }) {
  const [showPdfMenu,   setShowPdfMenu]   = useState(false);
  const [showShareMenu, setShowShareMenu] = useState(false);
  // Archivo que se está bajando para compartir (en la app tarda un momento)
  const [preparando,    setPreparando]    = useState<"pdf" | "xml" | "compartir" | null>(null);
  const avisos = useAvisos();

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

  const esProvisional   = ESTADOS_EN_PROCESO.includes(factura.estado_sri);
  const puedeDescargarPdf = ESTADOS_CON_PDF.includes(factura.estado_sri);
  const puedeDescargarXml = ESTADOS_CON_XML.includes(factura.estado_sri);
  const puedeCompartir    = ESTADOS_COMPARTIR.includes(factura.estado_sri);

  const numero = factura.numero_doc || factura.clave_acceso;

  // Web: el PDF se abre en otra pestaña; app: se guarda y sale la hoja de compartir
  // (abrir, imprimir, guardar en Archivos, WhatsApp…). Ver lib/nativo.ts
  const conArchivo = async (tipo: "pdf" | "xml" | "compartir", accion: () => Promise<void>) => {
    setShowPdfMenu(false);
    setShowShareMenu(false);
    setPreparando(tipo);
    try {
      await accion();
    } catch {
      avisos.error("No se pudo preparar el archivo. Revisa tu conexión e intenta de nuevo.");
    } finally {
      setPreparando(null);
    }
  };

  const abrirPDF = (formato: string) => conArchivo("pdf", () =>
    guardarYCompartir({ url: urlPdf(factura.clave_acceso, formato) }, `${numero}-${formato}.pdf`,
                      { titulo: `Comprobante ${numero}`, abrirEnWeb: true }));

  const descargarXML = () => conArchivo("xml", () =>
    guardarYCompartir({ url: xml_url }, `${factura.clave_acceso}.xml`, { titulo: `XML ${numero}` }));

  const compartirPDF = () => conArchivo("compartir", () =>
    guardarYCompartir({ url: urlPdf(factura.clave_acceso, "a4") }, `${numero}.pdf`, {
      titulo: `Comprobante ${numero}`,
      texto:  `Aquí está tu comprobante electrónico:\n${consulta_url}`,
    }));

  const compartirLink = async () => {
    await navigator.clipboard.writeText(consulta_url);
    avisos.exito("Enlace copiado");
    setShowShareMenu(false);
  };

  const abrirWhatsApp = () => {
    const msg = encodeURIComponent(
      `Aquí está tu comprobante electrónico:\n${consulta_url}`
    );
    window.open(`https://wa.me/?text=${msg}`, "_blank");
    setShowShareMenu(false);
  };

  if (!puedeDescargarPdf) return null;

  return (
    <>
      {/* ── Dropdown PDF ─────────────────────────────────────── */}
      <div className="relative" ref={pdfMenuRef}>
        <button
          onClick={() => { setShowPdfMenu(v => !v); setShowShareMenu(false); }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-colors"
          style={{
            background: esProvisional
              ? "color-mix(in srgb, var(--kipu-warning) 12%, transparent)"
              : "var(--kipu-surface)",
            color: esProvisional
              ? "var(--kipu-warning)"
              : "var(--kipu-text)",
            border: esProvisional
              ? "1px solid color-mix(in srgb, var(--kipu-warning) 25%, transparent)"
              : "none",
          }}
          onMouseEnter={e => e.currentTarget.style.background = esProvisional
            ? "color-mix(in srgb, var(--kipu-warning) 20%, transparent)"
            : "color-mix(in srgb, var(--kipu-text) 5%, transparent)"
          }
          onMouseLeave={e => e.currentTarget.style.background = esProvisional
            ? "color-mix(in srgb, var(--kipu-warning) 12%, transparent)"
            : "var(--kipu-surface)"
          }
        >
          {preparando === "pdf" ? <Loader2 size={13} className="animate-spin" /> : esProvisional ? <Clock size={13} /> : <Eye size={13} />}
          {esProvisional ? "PDF provisional" : "PDF"}
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
            {/* Aviso provisional */}
            {esProvisional && (
              <div
                className="mx-2 mb-1 px-2.5 py-2 rounded-lg flex items-start gap-2"
                style={{
                  background: "color-mix(in srgb, var(--kipu-warning) 10%, transparent)",
                }}
              >
                <Clock size={11} className="shrink-0 mt-0.5" style={{ color: "var(--kipu-warning)" }} />
                <p className="text-[10px] leading-relaxed" style={{ color: "var(--kipu-warning)" }}>
                  Pendiente de autorización del SRI. El PDF definitivo estará disponible una vez autorizado.
                </p>
              </div>
            )}
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

      {/* ── XML (solo autorizado/anulado) ────────────────────── */}
      {puedeDescargarXml && (
        <button
          type="button"
          onClick={descargarXML}
          disabled={preparando !== null}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-colors disabled:opacity-60"
          style={{
            background: "var(--kipu-surface)",
            color: "var(--kipu-text)",
          }}
          onMouseEnter={e => e.currentTarget.style.background = "color-mix(in srgb, var(--kipu-text) 5%, transparent)"}
          onMouseLeave={e => e.currentTarget.style.background = "var(--kipu-surface)"}
        >
          {preparando === "xml" ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />} XML
        </button>
      )}

      {/* ── Dropdown Compartir (solo vigentes) ───────────────── */}
      {puedeCompartir && (
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
            {preparando === "compartir" ? <Loader2 size={13} className="animate-spin" /> : <Share2 size={13} />} Compartir
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
              {/* App: el PDF por la hoja de compartir del sistema (WhatsApp, correo, Drive…) */}
              {esNativo() && (
                <button
                  onClick={compartirPDF}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 transition-colors text-left"
                  style={{ borderBottom: "1px solid var(--kipu-border)" }}
                >
                  <FileText size={13} className="shrink-0" style={{ color: "var(--kipu-accent)" }} />
                  <div>
                    <p className="text-sm" style={{ color: "var(--kipu-text)" }}>Compartir PDF</p>
                    <p className="text-[10px]" style={{ color: "var(--kipu-subtle)" }}>WhatsApp, correo, Drive… con el enlace incluido</p>
                  </div>
                </button>
              )}
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
  );
}