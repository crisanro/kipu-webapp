"use client";
import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, CheckCircle2, Clock, XCircle, AlertTriangle,
  Download, Eye, Copy, RefreshCw, RotateCcw,
  DollarSign, Ban, ExternalLink, ClipboardCopy,
  Share2, ChevronDown, MessageCircle, Link2,
} from "lucide-react";
import api from "@/lib/api";

// =============================================================================
// TIPOS
// =============================================================================
export interface FacturaBase {
  id:                        string;
  numero_doc:                string;
  clave_acceso:              string;
  fecha_emision:             string;
  estado_sri:                string;
  estado_cobro?:             string | null;
  forma_pago_cobro?:         string | null;
  numero_comprobante_pago?: string | null;
  fecha_pago?:               string | null;
  tipo_doc:                  string;
  cod_doc:                   string;
  mensajes_sri:              any;
  fecha_autorizacion?:      string;
  motivo_anulacion?:         string | null;
  fecha_anulacion?:          string | null;
  importe_total:            number;
  datos:                     any;
  doc_origen_emitido_id?:    string | null;
  doc_origen_recibido_id?:   string | null;
  documentos_derivados?:     any[];
  doc_origen_emitido?:      any | null;
  doc_origen_recibido?:     any | null;
  cliente?:                  any;
}

// =============================================================================
// CONFIGURACIÓN
// =============================================================================
export const ESTADO_CONFIG: Record<string, {
  label: string; color: string; bg: string; border: string; icon: any
}> = {
  AUTORIZADO: { label: "Autorizado",         color: "var(--kipu-success)", bg: "color-mix(in srgb, var(--kipu-success) 20%, transparent)", border: "color-mix(in srgb, var(--kipu-success) 20%, transparent)", icon: CheckCircle2 },
  RECIBIDA:   { label: "Recibido por SRI",   color: "#818cf8",           bg: "color-mix(in srgb, #818cf8 20%, transparent)",           border: "color-mix(in srgb, #818cf8 20%, transparent)",           icon: Clock },
  FIRMADO:    { label: "En cola",            color: "#60a5fa",           bg: "color-mix(in srgb, #60a5fa 20%, transparent)",           border: "color-mix(in srgb, #60a5fa 20%, transparent)",           icon: Clock },
  DEVUELTA:   { label: "Devuelto por SRI",   color: "var(--kipu-warning)", bg: "color-mix(in srgb, var(--kipu-warning) 20%, transparent)", border: "color-mix(in srgb, var(--kipu-warning) 20%, transparent)", icon: AlertTriangle },
  RECHAZADO:  { label: "Rechazado por SRI",  color: "var(--kipu-danger)",  bg: "color-mix(in srgb, var(--kipu-danger) 20%, transparent)",  border: "color-mix(in srgb, var(--kipu-danger) 20%, transparent)",  icon: XCircle },
  ANULADO:    { label: "Anulado",            color: "var(--kipu-subtle)",  bg: "color-mix(in srgb, var(--kipu-subtle) 20%, transparent)",  border: "color-mix(in srgb, var(--kipu-subtle) 20%, transparent)",  icon: Ban },
};

export const TIPO_LABEL: Record<string, string> = {
  FAC: "Factura",
  LIQ: "Liquidación de Compra",
  NCR: "Nota de Crédito",
  NDB: "Nota de Débito",
  RET: "Comprobante de Retención",
};

export const COBRO_CONFIG: Record<string, { label: string; color: string }> = {
  PENDIENTE: { label: "Por cobrar", color: "var(--kipu-warning)" },
  PAGADO:    { label: "Cobrado",    color: "var(--kipu-success)" },
  PARCIAL:   { label: "Parcial",    color: "#60a5fa" },
  ANULADO:   { label: "Anulado",    color: "var(--kipu-danger)" },
};

export const FORMA_PAGO: Record<string, string> = {
  "01": "Sin utilización del sistema financiero",
  "15": "Compensación de deudas",
  "16": "Tarjeta de débito",
  "17": "Dinero electrónico",
  "18": "Tarjeta prepago",
  "19": "Tarjeta de crédito",
  "20": "Otros con utilización del sistema financiero",
  "21": "Endoso de títulos",
};

export const TIPO_ID: Record<string, string> = {
  "04": "RUC",
  "05": "Cédula",
  "06": "Pasaporte",
  "07": "Consumidor Final",
  "08": "Identificación del Exterior",
};

export const fmt = (n: any) => parseFloat(n ?? 0).toFixed(2);
export const normalizarTarifa = (tarifa: any): string => {
  const t = parseInt(String(tarifa ?? "15"));
  if (t === 0) return "0";
  if (t === 5) return "5";
  return "15";
};

const MOTIVOS_ANULACION = [
  "ERROR EN DATOS DEL CLIENTE",
  "ERROR EN MONTO O ÍTEMS",
  "DOCUMENTO DUPLICADO",
  "OPERACIÓN NO REALIZADA",
  "OTRO",
];

const SRI_ANULACION_URL =
  "https://srienlinea.sri.gob.ec/comprobantes-electronicos-internet/pages/solicitud/anulacion/menuAnulacion.jsf";

// Formatos PDF disponibles
const PDF_FORMATOS = [
  { key: "a4",  label: "A4",  desc: "Impresora de oficina" },
  { key: "t80", label: "T80", desc: "Impresora térmica 80mm" },
  { key: "t58", label: "T58", desc: "Impresora térmica 58mm" },
] as const;

// =============================================================================
// FUNCIONES AUXILIARES
// =============================================================================
function extraerMensajesSRI(mensajes_sri: any): any[] {
  if (!mensajes_sri) return [];
  try {
    const comprobante = mensajes_sri?.comprobantes?.comprobante;
    if (comprobante) {
      const msgs = comprobante?.mensajes?.mensaje;
      if (!msgs) return [];
      return Array.isArray(msgs) ? msgs : [msgs];
    }
  } catch (_) {}
  if (Array.isArray(mensajes_sri)) return mensajes_sri;
  if (mensajes_sri.mensaje || mensajes_sri.identificador) return [mensajes_sri];
  return [];
}

// =============================================================================
// COMPONENTE
// =============================================================================
interface Props {
  factura:    FacturaBase;
  onRecargar: () => void;
  children:   React.ReactNode;
}

export default function DetalleShared({ factura, onRecargar, children }: Props) {
  const router = useRouter();

  // estados existentes
  const [copiado,       setCopiado]       = useState(false);
  const [reintento,     setReintento]     = useState(false);
  const [showAnular,    setShowAnular]    = useState(false);
  const [motivoCustom,  setMotivoCustom]  = useState("");
  const [confirmado,    setConfirmado]    = useState(false);
  const [anulando,      setAnulando]      = useState(false);
  const [errorAnular,   setErrorAnular]   = useState("");
  const [copiandoCampo, setCopiandoCampo] = useState<string | null>(null);

  // nuevos estados
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

  const estado = ESTADO_CONFIG[factura.estado_sri] ?? ESTADO_CONFIG.FIRMADO;
  const Icon   = estado.icon;
  const cobro  = factura.estado_cobro ? COBRO_CONFIG[factura.estado_cobro] : null;

  const errores = extraerMensajesSRI(factura.mensajes_sri);

  const infoFac         = factura.datos?.infoFactura || factura.datos?.infoLiquidacionCompra || {};
  const idComprador     = infoFac.identificacionComprador || infoFac.identificacionProveedor || factura.cliente?.identificacion || "";
  const emailComprador  = factura.datos?.legacy_email_comprador || factura.cliente?.email || "";

  const motivoFinal = motivoCustom.trim();
  const puedeAnular = confirmado && !anulando;

  const base_url     = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
  const xml_url      = `${base_url}/api/v1/public/xml/${factura.clave_acceso}`;
  const consulta_url = `https://consulta.kipu.ec/?id=${factura.clave_acceso}`;

  const getPdfUrl = (formato: string) =>
    `${base_url}/api/v1/public/pdf/${factura.clave_acceso}?formato=${formato}`;

  // ── handlers ────────────────────────────────────────────────────────────────
  const copiarClave = async () => {
    if (!factura.clave_acceso) return;
    await navigator.clipboard.writeText(factura.clave_acceso);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  };

  const copiarCampo = async (valor: string, campo: string) => {
    await navigator.clipboard.writeText(valor);
    setCopiandoCampo(campo);
    setTimeout(() => setCopiandoCampo(null), 1500);
  };

  const abrirPDF = (formato: string) => {
    window.open(getPdfUrl(formato), "_blank");
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

  const forzarReintento = async () => {
    setReintento(true);
    try {
      await api.post(`/api/v1/app/documentos/${factura.id}/reintentar`);
      onRecargar();
    } catch (e) {
      console.error(e);
    } finally {
      setReintento(false);
    }
  };

  const anular = async () => {
    setErrorAnular("");
    if (!motivoFinal) { setErrorAnular("Selecciona o ingresa un motivo."); return; }
    if (!confirmado)  { setErrorAnular("Debes confirmar que ya lo anulaste en el SRI."); return; }
    setAnulando(true);
    try {
      await api.post(`/api/v1/app/documentos/${factura.id}/anular`, {
        motivo: motivoFinal,
        confirmado,
      });
      setShowAnular(false);
      setMotivoCustom("");
    } catch (err: any) {
      setErrorAnular(err?.response?.data?.detail ?? "Error al anular.");
    } finally {
      setAnulando(false);
    }
  };

  const formatearFechaSRI = (fecha: string | undefined): string => {
    if (!fecha) return "";
    const d = new Date(fecha);
    if (isNaN(d.getTime())) return fecha;
    return `${String(d.getDate()).padStart(2,"0")}/${String(d.getMonth()+1).padStart(2,"0")}/${d.getFullYear()}`;
  };

  const camposSRI = [
    { label: "Tipo de comprobante",     valor: TIPO_LABEL[factura.tipo_doc] ?? factura.tipo_doc },
    { label: "Fecha autorización",       valor: formatearFechaSRI(factura.fecha_autorizacion) },
    { label: "Clave de acceso",          valor: factura.clave_acceso },
    { label: "No. Autorización",         valor: factura.clave_acceso },
    { label: "Identificación receptor",  valor: idComprador },
    { label: "Correo receptor",          valor: emailComprador },
  ];

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto space-y-4">

      {/* Toast compartir */}
      {compartidoMsg && (
        <div
          className="fixed top-4 left-1/2 -translate-x-1/2 z-50 text-white text-sm px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 animate-in fade-in slide-in-from-top-2"
          style={{ background: "var(--kipu-success)" }}
        >
          <CheckCircle2 size={14} /> {compartidoMsg}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.back()}
          className="p-2 rounded-lg transition-colors"
          style={{ color: "var(--kipu-muted)" }}
          onMouseEnter={e => {
            e.currentTarget.style.color = "var(--kipu-text)";
            e.currentTarget.style.background = "color-mix(in srgb, var(--kipu-text) 5%, transparent)";
          }}
          onMouseLeave={e => {
            e.currentTarget.style.color = "var(--kipu-muted)";
            e.currentTarget.style.background = "transparent";
          }}
        >
          <ArrowLeft size={18} />
        </button>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold" style={{ color: "var(--kipu-text)" }}>{factura.numero_doc}</h1>
            {factura.tipo_doc !== "FAC" && (
              <span
                className="text-xs px-2 py-0.5 rounded-full font-medium"
                style={{
                  background: "color-mix(in srgb, #c084fc 20%, transparent)",
                  color: "#c084fc",
                }}
              >
                {TIPO_LABEL[factura.tipo_doc] ?? factura.tipo_doc}
              </span>
            )}
          </div>
          <p className="text-sm" style={{ color: "var(--kipu-subtle)" }}>
            {factura.datos?.infoFactura?.fechaEmision ||
             factura.datos?.infoLiquidacionCompra?.fechaEmision ||
             factura.datos?.infoNotaCredito?.fechaEmision ||
             factura.datos?.infoNotaDebito?.fechaEmision ||
             factura.datos?.infoCompRetencion?.fechaEmision ||
             factura.fecha_emision}
          </p>
        </div>
      </div>

      {/* Estado SRI */}
      <div
        className="flex items-center gap-3 rounded-xl p-4 flex-wrap sm:flex-nowrap"
        style={{
          background: estado.bg,
          border: `1px solid ${estado.border}`,
        }}
      >
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
          style={{ background: estado.bg }}
        >
          <Icon size={20} style={{ color: estado.color }} />
        </div>
        <div className="flex-1 min-w-[200px]">
          <p className="font-semibold" style={{ color: estado.color }}>{estado.label}</p>
          <p className="text-xs" style={{ color: "var(--kipu-muted)" }}>
            {factura.estado_sri === "AUTORIZADO" && factura.fecha_autorizacion
              ? `Autorizado el ${factura.fecha_autorizacion}`
              : factura.estado_sri === "ANULADO"
              ? `Anulado · ${factura.motivo_anulacion ?? ""}`
              : factura.estado_sri === "DEVUELTA"
              ? "El SRI devolvió el comprobante — revisa los errores abajo"
              : factura.estado_sri === "RECHAZADO"
              ? "El SRI rechazó el comprobante — revisa los errores abajo"
              : factura.estado_sri === "FIRMADO"
              ? "En cola de envío al SRI"
              : "Recibido por el SRI, pendiente de autorización"}
          </p>
        </div>

        <div className="flex gap-2 ml-auto w-full sm:w-auto justify-end flex-wrap">
          {factura.estado_sri === "AUTORIZADO" && (
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
                    className="absolute right-0 top-full mt-1.5 z-30 rounded-xl shadow-xl overflow-hidden w-48"
                    style={{
                      background: "var(--kipu-surface)",
                      border: "1px solid var(--kipu-border)",
                    }}
                  >
                    <p
                      className="text-[10px] px-3 pt-2.5 pb-1 uppercase tracking-wide font-medium"
                      style={{ color: "var(--kipu-subtle)" }}
                    >
                      Formato de impresión
                    </p>
                    {PDF_FORMATOS.map(f => (
                      <button
                        key={f.key}
                        onClick={() => abrirPDF(f.key)}
                        className="w-full flex items-center justify-between px-3 py-2.5 transition-colors text-left"
                        style={{ background: "transparent" }}
                        onMouseEnter={e => e.currentTarget.style.background = "color-mix(in srgb, var(--kipu-text) 5%, transparent)"}
                        onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                      >
                        <span className="text-sm font-medium" style={{ color: "var(--kipu-text)" }}>{f.label}</span>
                        <span className="text-xs" style={{ color: "var(--kipu-subtle)" }}>{f.desc}</span>
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

              {/* ── Dropdown Compartir ───────────────────────────────── */}
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

              {/* ── Anular ──────────────────────────────────────────── */}
              {["FAC", "LIQ"].includes(factura.tipo_doc) && (
                <button
                  onClick={() => { setShowAnular(true); setMotivoCustom(""); setConfirmado(false); setErrorAnular(""); }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-colors"
                  style={{
                    background: "color-mix(in srgb, var(--kipu-danger) 10%, transparent)",
                    color: "var(--kipu-danger)",
                    border: "1px solid color-mix(in srgb, var(--kipu-danger) 20%, transparent)",
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = "color-mix(in srgb, var(--kipu-danger) 20%, transparent)"}
                  onMouseLeave={e => e.currentTarget.style.background = "color-mix(in srgb, var(--kipu-danger) 10%, transparent)"}
                >
                  <Ban size={13} /> Anular
                </button>
              )}
            </>
          )}

          {["DEVUELTA", "RECHAZADO", "FIRMADO"].includes(factura.estado_sri) && (
            <button
              onClick={forzarReintento}
              disabled={reintento}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-white text-xs transition-colors disabled:opacity-50"
              style={{ background: "var(--kipu-accent)" }}
              onMouseEnter={e => {
                if (!reintento) e.currentTarget.style.background = "var(--kipu-accent-h)";
              }}
              onMouseLeave={e => {
                if (!reintento) e.currentTarget.style.background = "var(--kipu-accent)";
              }}
            >
              {reintento ? (
                <div
                  className="w-3.5 h-3.5 border-2 border-t-transparent rounded-full animate-spin"
                  style={{ borderColor: "#FFFFFF", borderTopColor: "transparent" }}
                />
              ) : (
                <RotateCcw size={13} />
              )}
              Reintentar
            </button>
          )}
          {["RECIBIDA", "FIRMADO"].includes(factura.estado_sri) && (
            <button
              onClick={onRecargar}
              className="p-2 rounded-lg transition-colors"
              style={{ color: "var(--kipu-subtle)" }}
              onMouseEnter={e => {
                e.currentTarget.style.color = "var(--kipu-text)";
                e.currentTarget.style.background = "color-mix(in srgb, var(--kipu-text) 5%, transparent)";
              }}
              onMouseLeave={e => {
                e.currentTarget.style.color = "var(--kipu-subtle)";
                e.currentTarget.style.background = "transparent";
              }}
            >
              <RefreshCw size={15} />
            </button>
          )}
        </div>
      </div>

      {/* Estado de cobro */}
      {["FAC", "LIQ"].includes(factura.tipo_doc) && factura.estado_sri === "AUTORIZADO" && (
        <div
          className="rounded-xl p-4"
          style={{
            background: "var(--kipu-surface)",
            border: "1px solid var(--kipu-border)",
          }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <DollarSign size={15} style={{ color: "var(--kipu-subtle)" }} />
              <h2 className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--kipu-subtle)" }}>
                Estado de Cobro
              </h2>
            </div>
            {cobro && <span className="text-sm font-semibold" style={{ color: cobro.color }}>{cobro.label}</span>}
          </div>
          {factura.forma_pago_cobro && (
            <div className="mt-2 space-y-1 text-sm">
              <div className="flex justify-between">
                <span style={{ color: "var(--kipu-subtle)" }}>Forma de pago</span>
                <span style={{ color: "var(--kipu-text)" }}>{factura.forma_pago_cobro}</span>
              </div>
              {factura.numero_comprobante_pago && (
                <div className="flex justify-between">
                  <span style={{ color: "var(--kipu-subtle)" }}>N° comprobante</span>
                  <span className="font-mono text-xs" style={{ color: "var(--kipu-text)" }}>{factura.numero_comprobante_pago}</span>
                </div>
              )}
              {factura.fecha_pago && (
                <div className="flex justify-between">
                  <span style={{ color: "var(--kipu-subtle)" }}>Fecha de pago</span>
                  <span style={{ color: "var(--kipu-text)" }}>{factura.fecha_pago}</span>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Documento origen */}
      {factura.doc_origen_emitido && (
        <div
          className="rounded-xl p-4"
          style={{
            background: "color-mix(in srgb, var(--kipu-accent) 5%, transparent)",
            border: "1px solid color-mix(in srgb, var(--kipu-accent) 20%, transparent)",
          }}
        >
          <h2 className="text-xs font-semibold mb-3 uppercase tracking-wide" style={{ color: "var(--kipu-accent)" }}>
            Documento Origen
          </h2>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium font-mono" style={{ color: "var(--kipu-text)" }}>{factura.doc_origen_emitido.numero_doc}</p>
              <p className="text-xs" style={{ color: "var(--kipu-subtle)" }}>
                {TIPO_LABEL[factura.doc_origen_emitido.tipo_doc] ?? factura.doc_origen_emitido.tipo_doc}
                {" · "}${fmt(factura.doc_origen_emitido.importe_total)}
              </p>
            </div>
            <button
              onClick={() => router.push(`/documentos/${factura.doc_origen_emitido.id}`)}
              className="text-xs transition-colors"
              style={{ color: "var(--kipu-accent)" }}
              onMouseEnter={e => e.currentTarget.style.color = "var(--kipu-accent-h)"}
              onMouseLeave={e => e.currentTarget.style.color = "var(--kipu-accent)"}
            >
              Ver →
            </button>
          </div>
        </div>
      )}

      {/* Documentos derivados */}
      {factura.documentos_derivados && factura.documentos_derivados.length > 0 && (
        <div
          className="rounded-xl p-4"
          style={{
            background: "var(--kipu-surface)",
            border: "1px solid var(--kipu-border)",
          }}
        >
          <h2 className="text-xs font-semibold mb-3 uppercase tracking-wide" style={{ color: "var(--kipu-subtle)" }}>
            Documentos Relacionados
          </h2>
          <div className="space-y-2">
            {factura.documentos_derivados.map((d: any) => {
              const cfg = ESTADO_CONFIG[d.estado_sri] ?? ESTADO_CONFIG.FIRMADO;
              return (
                <div
                  key={d.id}
                  className="flex items-center justify-between p-2.5 rounded-lg"
                  style={{
                    background: "color-mix(in srgb, var(--kipu-text) 4%, transparent)",
                    border: "1px solid var(--kipu-border)",
                  }}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="text-[10px] px-1.5 py-0.5 rounded font-bold"
                      style={{
                        background: d.tipo_doc === "NCR"
                          ? "color-mix(in srgb, #c084fc 20%, transparent)"
                          : d.tipo_doc === "NDB"
                          ? "color-mix(in srgb, var(--kipu-warning) 20%, transparent)"
                          : d.tipo_doc === "RET"
                          ? "color-mix(in srgb, #60a5fa 20%, transparent)"
                          : "color-mix(in srgb, var(--kipu-text) 10%, transparent)",
                        color: d.tipo_doc === "NCR"
                          ? "#c084fc"
                          : d.tipo_doc === "NDB"
                          ? "var(--kipu-warning)"
                          : d.tipo_doc === "RET"
                          ? "#60a5fa"
                          : "var(--kipu-muted)",
                      }}
                    >
                      {d.tipo_doc}
                    </span>
                    <span className="text-sm font-mono" style={{ color: "var(--kipu-text)" }}>{d.numero_doc}</span>
                    <span className="text-xs" style={{ color: cfg.color }}>{cfg.label}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs" style={{ color: "var(--kipu-subtle)" }}>${fmt(d.importe_total)}</span>
                    <button
                      onClick={() => router.push(`/documentos/${d.id}`)}
                      className="text-xs transition-colors"
                      style={{ color: "var(--kipu-accent)" }}
                      onMouseEnter={e => e.currentTarget.style.color = "var(--kipu-accent-h)"}
                      onMouseLeave={e => e.currentTarget.style.color = "var(--kipu-accent)"}
                    >
                      Ver →
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Emitir comprobante relacionado */}
      {factura.estado_sri === "AUTORIZADO" && (
        <div
          className="rounded-xl p-4"
          style={{
            background: "var(--kipu-surface)",
            border: "1px solid var(--kipu-border)",
          }}
        >
          <h2 className="text-xs font-semibold mb-3 uppercase tracking-wide" style={{ color: "var(--kipu-subtle)" }}>
            Emitir comprobante relacionado
          </h2>
          <div className="flex flex-wrap gap-2">
            {factura.tipo_doc === "FAC" && (
              <>
                <button
                  onClick={() => router.push(`/documentos/emitir/ncr?doc_id=${factura.id}`)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs transition-colors"
                  style={{
                    background: "color-mix(in srgb, #c084fc 10%, transparent)",
                    color: "#c084fc",
                    border: "1px solid color-mix(in srgb, #c084fc 20%, transparent)",
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = "color-mix(in srgb, #c084fc 20%, transparent)"}
                  onMouseLeave={e => e.currentTarget.style.background = "color-mix(in srgb, #c084fc 10%, transparent)"}
                >
                  NCR · Nota de crédito
                </button>
                <button
                  onClick={() => router.push(`/documentos/emitir/ndb?doc_id=${factura.id}`)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs transition-colors"
                  style={{
                    background: "color-mix(in srgb, var(--kipu-warning) 10%, transparent)",
                    color: "var(--kipu-warning)",
                    border: "1px solid color-mix(in srgb, var(--kipu-warning) 20%, transparent)",
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = "color-mix(in srgb, var(--kipu-warning) 20%, transparent)"}
                  onMouseLeave={e => e.currentTarget.style.background = "color-mix(in srgb, var(--kipu-warning) 10%, transparent)"}
                >
                  NDB · Nota de débito
                </button>
              </>
            )}
            {factura.tipo_doc === "LIQ" && (
              <button
                onClick={() => router.push(`/documentos/emitir/ret?doc_origen_emitido_id=${factura.id}`)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs transition-colors"
                style={{
                  background: "color-mix(in srgb, #60a5fa 10%, transparent)",
                  color: "#60a5fa",
                  border: "1px solid color-mix(in srgb, #60a5fa 20%, transparent)",
                }}
                onMouseEnter={e => e.currentTarget.style.background = "color-mix(in srgb, #60a5fa 20%, transparent)"}
                onMouseLeave={e => e.currentTarget.style.background = "color-mix(in srgb, #60a5fa 10%, transparent)"}
              >
                RET · Retención al proveedor
              </button>
            )}
          </div>
        </div>
      )}

      {/* Errores SRI */}
      {errores.length > 0 && (
        <div
          className="rounded-xl p-4 space-y-3"
          style={{
            background: "color-mix(in srgb, var(--kipu-danger) 10%, transparent)",
            border: "1px solid color-mix(in srgb, var(--kipu-danger) 20%, transparent)",
          }}
        >
          <h2 className="text-sm font-semibold flex items-center gap-2" style={{ color: "var(--kipu-danger)" }}>
            <AlertTriangle size={15} /> Errores del SRI
          </h2>
          {errores.map((err: any, i: number) => (
            <div
              key={i}
              className="rounded-lg p-3 space-y-1"
              style={{ background: "color-mix(in srgb, var(--kipu-surface) 50%, transparent)" }}
            >
              {err.identificador && <p className="text-xs font-mono" style={{ color: "var(--kipu-danger)" }}>Código: {err.identificador}</p>}
              {err.mensaje && <p className="text-sm" style={{ color: "var(--kipu-text)" }}>{err.mensaje}</p>}
              {err.informacionAdicional && <p className="text-xs" style={{ color: "var(--kipu-subtle)" }}>{err.informacionAdicional}</p>}
              {err.tipo && (
                <span
                  className="text-xs px-2 py-0.5 rounded-full"
                  style={{
                    background: err.tipo === "ERROR"
                      ? "color-mix(in srgb, var(--kipu-danger) 20%, transparent)"
                      : "color-mix(in srgb, var(--kipu-warning) 20%, transparent)",
                    color: err.tipo === "ERROR"
                      ? "var(--kipu-danger)"
                      : "var(--kipu-warning)",
                  }}
                >
                  {err.tipo}
                </span>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Clave de acceso */}
      <div
        className="rounded-xl p-4"
        style={{
          background: "var(--kipu-surface)",
          border: "1px solid var(--kipu-border)",
        }}
      >
        <h2 className="text-xs font-semibold mb-2 uppercase tracking-wide" style={{ color: "var(--kipu-subtle)" }}>
          Clave de acceso
        </h2>
        <div
          className="flex items-center gap-2 rounded-lg px-3 py-2"
          style={{ background: "color-mix(in srgb, var(--kipu-text) 5%, transparent)" }}
        >
          <code className="text-xs flex-1 break-all font-mono" style={{ color: "var(--kipu-text)" }}>{factura.clave_acceso}</code>
          <button
            onClick={copiarClave}
            className="shrink-0 transition-colors"
            style={{ color: "var(--kipu-subtle)" }}
            onMouseEnter={e => e.currentTarget.style.color = "var(--kipu-text)"}
            onMouseLeave={e => e.currentTarget.style.color = "var(--kipu-subtle)"}
          >
            {copiado ? <CheckCircle2 size={14} style={{ color: "var(--kipu-success)" }} /> : <Copy size={14} />}
          </button>
        </div>
        {factura.estado_sri === "AUTORIZADO" && (
          <a
            href="https://srienlinea.sri.gob.ec/comprobantes-electronicos-internet/publico/validezComprobantes.jsf"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 inline-flex items-center gap-1.5 text-xs transition-colors"
            style={{ color: "var(--kipu-accent)" }}
            onMouseEnter={e => e.currentTarget.style.color = "var(--kipu-accent-h)"}
            onMouseLeave={e => e.currentTarget.style.color = "var(--kipu-accent)"}
          >
            <Eye size={12} /> Verificar en portal SRI
          </a>
        )}
      </div>

      {/* Contenido específico */}
      {children}

      {/* ── Modal anulación ── */}
      {showAnular && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <div
            className="rounded-xl w-full max-w-lg"
            style={{
              background: "var(--kipu-surface)",
              border: "1px solid var(--kipu-border)",
            }}
          >
            {/* Header modal */}
            <div
              className="flex items-center gap-3 px-5 py-4"
              style={{ borderBottom: "1px solid var(--kipu-border)" }}
            >
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
                style={{ background: "color-mix(in srgb, var(--kipu-danger) 20%, transparent)" }}
              >
                <Ban size={15} style={{ color: "var(--kipu-danger)" }} />
              </div>
              <div>
                <h2 className="text-sm font-semibold" style={{ color: "var(--kipu-text)" }}>Anular comprobante</h2>
                <p className="text-xs" style={{ color: "var(--kipu-subtle)" }}>{factura.numero_doc}</p>
              </div>
            </div>
            <div className="p-5 space-y-4">
              {/* Advertencia */}
              <div
                className="rounded-lg px-4 py-3"
                style={{
                  background: "color-mix(in srgb, var(--kipu-warning) 10%, transparent)",
                  border: "1px solid color-mix(in srgb, var(--kipu-warning) 20%, transparent)",
                }}
              >
                <p className="text-xs font-medium mb-1" style={{ color: "var(--kipu-warning)" }}>
                  ⚠️ Esta acción es irreversible en Kipu
                </p>
                <p className="text-xs" style={{ color: "color-mix(in srgb, var(--kipu-warning) 80%, transparent)" }}>
                  Antes de continuar, debes anular el comprobante en el portal del SRI.
                  Usa los datos de abajo para completar el formulario de anulación.
                </p>
                <a
                  href={SRI_ANULACION_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 inline-flex items-center gap-1.5 text-xs transition-colors"
                  style={{ color: "var(--kipu-warning)" }}
                >
                  <ExternalLink size={11} /> Ir al portal del SRI → Anulación
                </a>
              </div>

              {/* Datos para el SRI */}
              <div
                className="rounded-lg overflow-hidden"
                style={{ background: "color-mix(in srgb, var(--kipu-text) 4%, transparent)" }}
              >
                <p
                  className="text-xs px-3 py-2"
                  style={{
                    color: "var(--kipu-subtle)",
                    borderBottom: "1px solid var(--kipu-border)",
                  }}
                >
                  Datos para el formulario del SRI — haz clic para copiar
                </p>
                <div>
                  {camposSRI.map(({ label, valor }, idx) => (
                    <button
                      key={label}
                      type="button"
                      onClick={() => copiarCampo(valor, label)}
                      disabled={!valor}
                      className="w-full flex items-center justify-between px-3 py-2.5 transition-colors text-left disabled:opacity-40"
                      style={{
                        borderTop: idx > 0 ? "1px solid var(--kipu-border)" : "none",
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = "color-mix(in srgb, var(--kipu-text) 5%, transparent)"}
                      onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                    >
                      <span className="text-xs" style={{ color: "var(--kipu-subtle)" }}>{label}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono max-w-[200px] truncate" style={{ color: "var(--kipu-text)" }}>
                          {valor || "—"}
                        </span>
                        {copiandoCampo === label
                          ? <CheckCircle2 size={12} className="shrink-0" style={{ color: "var(--kipu-success)" }} />
                          : <ClipboardCopy size={12} className="shrink-0" style={{ color: "var(--kipu-subtle)" }} />}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Motivo */}
              <div>
                <label className="block text-xs mb-1.5" style={{ color: "var(--kipu-subtle)" }}>
                  Motivo de anulación <span style={{ color: "var(--kipu-subtle)" }}>(opcional)</span>
                </label>
                <div className="relative">
                  <textarea
                    value={motivoCustom}
                    onChange={(e) => setMotivoCustom(e.target.value.toUpperCase().slice(0, 100))}
                    placeholder="Ej: ERROR EN DATOS DEL CLIENTE, DOCUMENTO DUPLICADO..."
                    maxLength={100}
                    rows={2}
                    className="w-full px-3 py-2 rounded-lg text-sm resize-none pr-12 transition-colors focus:outline-none"
                    style={{
                      background: "var(--kipu-surface)",
                      border: "1px solid var(--kipu-border)",
                      color: "var(--kipu-text)",
                    }}
                    onFocus={e => e.currentTarget.style.borderColor = "var(--kipu-danger)"}
                    onBlur={e => e.currentTarget.style.borderColor = "var(--kipu-border)"}
                  />
                  <span className="absolute right-3 bottom-2 text-xs" style={{ color: "var(--kipu-subtle)" }}>
                    {motivoCustom.length}/100
                  </span>
                </div>
                {/* Sugerencias rápidas */}
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {MOTIVOS_ANULACION.filter(m => m !== "OTRO").map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setMotivoCustom(m.slice(0, 100))}
                      className="text-[10px] px-2 py-1 rounded-lg transition-colors"
                      style={{
                        background: "var(--kipu-surface)",
                        border: "1px solid var(--kipu-border)",
                        color: "var(--kipu-muted)",
                      }}
                      onMouseEnter={e => {
                        e.currentTarget.style.color = "var(--kipu-text)";
                        e.currentTarget.style.borderColor = "color-mix(in srgb, var(--kipu-text) 20%, transparent)";
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.color = "var(--kipu-muted)";
                        e.currentTarget.style.borderColor = "var(--kipu-border)";
                      }}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>

              {/* Confirmación */}
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={confirmado}
                  onChange={(e) => setConfirmado(e.target.checked)}
                  className="mt-0.5"
                  style={{ accentColor: "var(--kipu-danger)" }}
                />
                <span className="text-xs" style={{ color: "var(--kipu-muted)" }}>
                  Confirmo que ya anulé este comprobante en el portal del SRI y que entiendo
                  que esta acción es <span className="font-medium" style={{ color: "var(--kipu-danger)" }}>irreversible</span> en Kipu.
                </span>
              </label>

              {/* Error */}
              {errorAnular && (
                <p
                  className="text-xs px-3 py-2 rounded-lg"
                  style={{
                    color: "var(--kipu-danger)",
                    background: "color-mix(in srgb, var(--kipu-danger) 10%, transparent)",
                  }}
                >
                  {errorAnular}
                </p>
              )}

              {/* Acciones */}
              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => { setShowAnular(false); setMotivoCustom(""); }}
                  className="flex-1 py-2.5 rounded-lg text-sm transition-colors"
                  style={{
                    border: "1px solid var(--kipu-border)",
                    color: "var(--kipu-muted)",
                  }}
                  onMouseEnter={e => e.currentTarget.style.color = "var(--kipu-text)"}
                  onMouseLeave={e => e.currentTarget.style.color = "var(--kipu-muted)"}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={anular}
                  disabled={!puedeAnular}
                  className="flex-1 py-2.5 rounded-lg text-white text-sm font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
                  style={{ background: "var(--kipu-danger)" }}
                >
                  {anulando ? (
                    <div
                      className="w-3.5 h-3.5 border-2 border-t-transparent rounded-full animate-spin"
                      style={{ borderColor: "#FFFFFF", borderTopColor: "transparent" }}
                    />
                  ) : (
                    <Ban size={14} />
                  )}
                  Anular comprobante
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}