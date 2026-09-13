"use client";
import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, CheckCircle2, Clock, XCircle, AlertTriangle,
  Download, Eye, Copy, RefreshCw, RotateCcw,
  DollarSign, Ban, ExternalLink, Info, Pencil,
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

// URL del artículo del blog sobre anulación
const BLOG_ANULACION_URL = "https://kipu.ec/blog/por-que-no-puedo-anular-comprobantes";

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

/** Detecta si el comprobante fue emitido a Consumidor Final */
function esConsumidorFinal(datos: any): boolean {
  const info = datos?.infoFactura || datos?.infoLiquidacionCompra || {};
  const tipoId = info.tipoIdentificacionComprador;
  const identificacion = info.identificacionComprador;
  return tipoId === "07" || identificacion === "9999999999999";
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

  // estados
  const [copiado,       setCopiado]       = useState(false);
  const [reintento,     setReintento]     = useState(false);

  // nuevos estados
  const [showPdfMenu,   setShowPdfMenu]   = useState(false);
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [compartidoMsg, setCompartidoMsg] = useState<string | null>(null);

  // Estado de cobro — edición inline
  const [editandoCobro,      setEditandoCobro]      = useState(false);
  const [cobroEstado,         setCobroEstado]         = useState(factura.estado_cobro ?? "PENDIENTE");
  const [cobroFormaPago,      setCobroFormaPago]      = useState(factura.forma_pago_cobro ?? "EFECTIVO");
  const [cobroFecha,          setCobroFecha]          = useState(factura.fecha_pago ?? new Date().toISOString().split("T")[0]);
  const [cobroReferencia,     setCobroReferencia]     = useState(factura.numero_comprobante_pago ?? "");
  const [guardandoCobro,      setGuardandoCobro]      = useState(false);
  const [errorCobro,          setErrorCobro]          = useState("");

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

  const consumidorFinal = esConsumidorFinal(factura.datos);

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

  const formatearFechaSRI = (fecha: string | undefined): string => {
    if (!fecha) return "";
    const d = new Date(fecha);
    if (isNaN(d.getTime())) return fecha;
    return `${String(d.getDate()).padStart(2,"0")}/${String(d.getMonth()+1).padStart(2,"0")}/${d.getFullYear()}`;
  };

  const FORMAS_PAGO_COBRO = [
    { value: "EFECTIVO",      label: "Efectivo" },
    { value: "TRANSFERENCIA", label: "Transferencia bancaria" },
    { value: "TARJETA",       label: "Tarjeta" },
    { value: "CHEQUE",        label: "Cheque" },
    { value: "OTRO",          label: "Otro" },
  ];

  const abrirEdicionCobro = () => {
    setCobroEstado(factura.estado_cobro ?? "PENDIENTE");
    setCobroFormaPago(factura.forma_pago_cobro ?? "EFECTIVO");
    setCobroFecha(factura.fecha_pago ?? new Date().toISOString().split("T")[0]);
    setCobroReferencia(factura.numero_comprobante_pago ?? "");
    setErrorCobro("");
    setEditandoCobro(true);
  };

  const guardarCobro = async () => {
    setErrorCobro("");
    setGuardandoCobro(true);
    try {
      await api.patch(`/api/v1/app/documentos/${factura.id}/cobro`, {
        estado_cobro:            cobroEstado,
        forma_pago_cobro:        cobroEstado === "PAGADO" ? cobroFormaPago : null,
        fecha_pago:              cobroEstado === "PAGADO" ? cobroFecha : null,
        numero_comprobante_pago: cobroEstado === "PAGADO" && cobroReferencia.trim()
                                   ? cobroReferencia.trim()
                                   : null,
      });
      setEditandoCobro(false);
      onRecargar();
    } catch (err: any) {
      setErrorCobro(err?.response?.data?.detail ?? "Error al actualizar el cobro.");
    } finally {
      setGuardandoCobro(false);
    }
  };

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
      {["FAC", "LIQ", "NDB"].includes(factura.tipo_doc) && factura.estado_sri === "AUTORIZADO" && (
        <div
          className="rounded-xl p-4"
          style={{
            background: "var(--kipu-surface)",
            border: "1px solid var(--kipu-border)",
          }}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <DollarSign size={15} style={{ color: "var(--kipu-subtle)" }} />
              <h2 className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--kipu-subtle)" }}>
                Estado de Cobro
              </h2>
            </div>
            {!editandoCobro && (
              <button
                onClick={abrirEdicionCobro}
                className="flex items-center gap-1 text-xs transition-colors"
                style={{ color: "var(--kipu-subtle)" }}
                onMouseEnter={e => e.currentTarget.style.color = "var(--kipu-accent)"}
                onMouseLeave={e => e.currentTarget.style.color = "var(--kipu-subtle)"}
              >
                <Pencil size={11} />
                {factura.estado_cobro === "PAGADO" ? "Editar" : "Registrar cobro"}
              </button>
            )}
          </div>

          {editandoCobro ? (
            /* ── Modo edición ── */
            <div className="space-y-3">
              {/* Toggle estado */}
              <div
                className="flex rounded-lg overflow-hidden"
                style={{ border: "1px solid var(--kipu-border)" }}
              >
                <button
                  type="button"
                  onClick={() => setCobroEstado("PAGADO")}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 text-xs font-medium transition-colors"
                  style={{
                    background: cobroEstado === "PAGADO"
                      ? "color-mix(in srgb, var(--kipu-success) 15%, transparent)"
                      : "transparent",
                    color: cobroEstado === "PAGADO" ? "var(--kipu-success)" : "var(--kipu-subtle)",
                    borderRight: "1px solid var(--kipu-border)",
                  }}
                >
                  <CheckCircle2 size={13} />
                  Cobrada
                </button>
                <button
                  type="button"
                  onClick={() => setCobroEstado("PENDIENTE")}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 text-xs font-medium transition-colors"
                  style={{
                    background: cobroEstado === "PENDIENTE"
                      ? "color-mix(in srgb, var(--kipu-warning) 15%, transparent)"
                      : "transparent",
                    color: cobroEstado === "PENDIENTE" ? "var(--kipu-warning)" : "var(--kipu-subtle)",
                  }}
                >
                  <Clock size={13} />
                  Pendiente
                </button>
              </div>

              {/* Campos de pago — solo cuando está cobrada */}
              {cobroEstado === "PAGADO" && (
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <label className="block text-xs mb-1" style={{ color: "var(--kipu-subtle)" }}>Forma de pago</label>
                      <select
                        value={cobroFormaPago}
                        onChange={e => setCobroFormaPago(e.target.value)}
                        className="w-full px-2.5 py-2 rounded-lg text-sm transition-colors focus:outline-none"
                        style={{
                          background: "var(--kipu-surface)",
                          border: "1px solid var(--kipu-border)",
                          color: "var(--kipu-text)",
                        }}
                        onFocus={e => e.currentTarget.style.borderColor = "var(--kipu-accent)"}
                        onBlur={e => e.currentTarget.style.borderColor = "var(--kipu-border)"}
                      >
                        {FORMAS_PAGO_COBRO.map(f => (
                          <option key={f.value} value={f.value}>{f.label}</option>
                        ))}
                      </select>
                    </div>
                    <div className="flex-1">
                      <label className="block text-xs mb-1" style={{ color: "var(--kipu-subtle)" }}>Fecha de pago</label>
                      <input
                        type="date"
                        value={cobroFecha}
                        onChange={e => setCobroFecha(e.target.value)}
                        className="w-full px-2.5 py-2 rounded-lg text-sm transition-colors focus:outline-none"
                        style={{
                          background: "var(--kipu-surface)",
                          border: "1px solid var(--kipu-border)",
                          color: "var(--kipu-text)",
                        }}
                        onFocus={e => e.currentTarget.style.borderColor = "var(--kipu-accent)"}
                        onBlur={e => e.currentTarget.style.borderColor = "var(--kipu-border)"}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs mb-1" style={{ color: "var(--kipu-subtle)" }}>
                      Referencia <span style={{ color: "var(--kipu-subtle)" }}>(opcional)</span>
                    </label>
                    <input
                      type="text"
                      value={cobroReferencia}
                      onChange={e => setCobroReferencia(e.target.value)}
                      placeholder="N° transferencia, recibo..."
                      maxLength={100}
                      className="w-full px-2.5 py-2 rounded-lg text-sm transition-colors focus:outline-none"
                      style={{
                        background: "var(--kipu-surface)",
                        border: "1px solid var(--kipu-border)",
                        color: "var(--kipu-text)",
                      }}
                      onFocus={e => e.currentTarget.style.borderColor = "var(--kipu-accent)"}
                      onBlur={e => e.currentTarget.style.borderColor = "var(--kipu-border)"}
                    />
                  </div>
                </div>
              )}

              {/* Error */}
              {errorCobro && (
                <p
                  className="text-xs px-3 py-2 rounded-lg"
                  style={{
                    color: "var(--kipu-danger)",
                    background: "color-mix(in srgb, var(--kipu-danger) 10%, transparent)",
                  }}
                >
                  {errorCobro}
                </p>
              )}

              {/* Acciones */}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setEditandoCobro(false)}
                  className="flex-1 py-2 rounded-lg text-xs transition-colors"
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
                  onClick={guardarCobro}
                  disabled={guardandoCobro}
                  className="flex-1 py-2 rounded-lg text-white text-xs font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                  style={{ background: "var(--kipu-accent)" }}
                  onMouseEnter={e => { if (!guardandoCobro) e.currentTarget.style.background = "var(--kipu-accent-h)"; }}
                  onMouseLeave={e => { if (!guardandoCobro) e.currentTarget.style.background = "var(--kipu-accent)"; }}
                >
                  {guardandoCobro ? (
                    <div
                      className="w-3 h-3 border-2 border-t-transparent rounded-full animate-spin"
                      style={{ borderColor: "#FFFFFF", borderTopColor: "transparent" }}
                    />
                  ) : (
                    "Guardar"
                  )}
                </button>
              </div>
            </div>
          ) : (
            /* ── Modo lectura ── */
            <>
              {cobro && (
                <div
                  className="flex items-center gap-2 px-3 py-2 rounded-lg mb-2"
                  style={{
                    background: cobro.color === "var(--kipu-success)"
                      ? "color-mix(in srgb, var(--kipu-success) 10%, transparent)"
                      : "color-mix(in srgb, var(--kipu-warning) 10%, transparent)",
                  }}
                >
                  {factura.estado_cobro === "PAGADO" ? (
                    <CheckCircle2 size={14} style={{ color: cobro.color }} />
                  ) : (
                    <Clock size={14} style={{ color: cobro.color }} />
                  )}
                  <span className="text-sm font-medium" style={{ color: cobro.color }}>{cobro.label}</span>
                </div>
              )}
              {factura.estado_cobro === "PAGADO" && (
                <div className="space-y-1 text-sm">
                  {factura.forma_pago_cobro && (
                    <div className="flex justify-between">
                      <span style={{ color: "var(--kipu-subtle)" }}>Forma de pago</span>
                      <span style={{ color: "var(--kipu-text)" }}>{factura.forma_pago_cobro}</span>
                    </div>
                  )}
                  {factura.fecha_pago && (
                    <div className="flex justify-between">
                      <span style={{ color: "var(--kipu-subtle)" }}>Fecha de pago</span>
                      <span style={{ color: "var(--kipu-text)" }}>{factura.fecha_pago}</span>
                    </div>
                  )}
                  {factura.numero_comprobante_pago && (
                    <div className="flex justify-between">
                      <span style={{ color: "var(--kipu-subtle)" }}>Referencia</span>
                      <span className="font-mono text-xs" style={{ color: "var(--kipu-text)" }}>{factura.numero_comprobante_pago}</span>
                    </div>
                  )}
                </div>
              )}
              {factura.estado_cobro === "PENDIENTE" && (
                <p className="text-xs" style={{ color: "var(--kipu-subtle)" }}>
                  Registra el cobro cuando recibas el pago.
                </p>
              )}
            </>
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
                  onClick={consumidorFinal ? undefined : () => router.push(`/documentos/emitir/ncr?doc_id=${factura.id}`)}
                  disabled={consumidorFinal}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  style={{
                    background: "color-mix(in srgb, #c084fc 10%, transparent)",
                    color: "#c084fc",
                    border: "1px solid color-mix(in srgb, #c084fc 20%, transparent)",
                  }}
                  onMouseEnter={e => { if (!consumidorFinal) e.currentTarget.style.background = "color-mix(in srgb, #c084fc 20%, transparent)"; }}
                  onMouseLeave={e => { if (!consumidorFinal) e.currentTarget.style.background = "color-mix(in srgb, #c084fc 10%, transparent)"; }}
                >
                  NCR · Nota de crédito
                </button>
                <button
                  onClick={consumidorFinal ? undefined : () => router.push(`/documentos/emitir/ndb?doc_id=${factura.id}`)}
                  disabled={consumidorFinal}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  style={{
                    background: "color-mix(in srgb, var(--kipu-warning) 10%, transparent)",
                    color: "var(--kipu-warning)",
                    border: "1px solid color-mix(in srgb, var(--kipu-warning) 20%, transparent)",
                  }}
                  onMouseEnter={e => { if (!consumidorFinal) e.currentTarget.style.background = "color-mix(in srgb, var(--kipu-warning) 20%, transparent)"; }}
                  onMouseLeave={e => { if (!consumidorFinal) e.currentTarget.style.background = "color-mix(in srgb, var(--kipu-warning) 10%, transparent)"; }}
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

            {/* Duplicar / Crear nueva */}
            {["FAC", "LIQ"].includes(factura.tipo_doc) && (
              <button
                onClick={() => {
                  const datos = factura.datos ?? {};
                  const info = datos.infoFactura || datos.infoLiquidacionCompra || {};
                  const detalles = datos.detalles?.detalle
                    ? (Array.isArray(datos.detalles.detalle) ? datos.detalles.detalle : [datos.detalles.detalle])
                    : [];
                  const adicionales = datos.infoAdicional?.campoAdicional
                    ? (Array.isArray(datos.infoAdicional.campoAdicional) ? datos.infoAdicional.campoAdicional : [datos.infoAdicional.campoAdicional])
                    : [];
                  const idComp = info.identificacionComprador || factura.cliente?.identificacion || "";
                  const razon  = info.razonSocialComprador || factura.cliente?.razon_social || "";
                  const tipoId = info.tipoIdentificacionComprador || "05";

                  sessionStorage.setItem("kipu:prefill", JSON.stringify({
                    cliente: idComp === "9999999999999" ? null : {
                      identificacion: idComp,
                      razon_social:   razon,
                      tipo_id:        tipoId,
                    },
                    esConsumidorFinal: idComp === "9999999999999",
                    items: detalles.map((d: any) => {
                      const imp    = d.impuestos?.impuesto;
                      const impArr = Array.isArray(imp) ? imp : [imp];
                      const tarifa = impArr[0]?.tarifa ?? "15";
                      return {
                        codigo:          d.codigoPrincipal !== "S/C" ? d.codigoPrincipal : "",
                        descripcion:     d.descripcion,
                        cantidad:        parseFloat(d.cantidad),
                        precio:          parseFloat(d.precioUnitario),
                        descuento:       parseFloat(d.descuento || 0),
                        tipo_descuento:  "$",
                        tipo_iva:        normalizarTarifa(tarifa),
                        unidad:          "UNIDAD",
                      };
                    }),
                    camposAdicionales: adicionales
                      .filter((a: any) => a["@nombre"] !== "PROVEEDOR_SISTEMA_INFORMATICO")
                      .map((a: any) => ({ nombre: a["@nombre"], valor: a["#text"] })),
                  }));
                  router.push("/documentos/emitir/fac");
                }}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs transition-colors"
                style={{
                  background: "var(--kipu-surface)",
                  color: "var(--kipu-text)",
                  border: "1px solid var(--kipu-border)",
                }}
                onMouseEnter={e => e.currentTarget.style.background = "color-mix(in srgb, var(--kipu-text) 5%, transparent)"}
                onMouseLeave={e => e.currentTarget.style.background = "var(--kipu-surface)"}
              >
                <Copy size={13} />
                Crear nueva a partir de esta
              </button>
            )}
          </div>

          {/* Leyenda consumidor final */}
          {consumidorFinal && ["FAC", "LIQ"].includes(factura.tipo_doc) && (
            <div
              className="mt-3 rounded-lg px-3 py-2.5 flex items-start gap-2.5"
              style={{
                background: "color-mix(in srgb, var(--kipu-warning) 8%, transparent)",
                border: "1px solid color-mix(in srgb, var(--kipu-warning) 15%, transparent)",
              }}
            >
              <Info size={13} className="shrink-0 mt-0.5" style={{ color: "var(--kipu-warning)" }} />
              <p className="text-xs" style={{ color: "var(--kipu-muted)" }}>
                Por normativa del SRI, los comprobantes emitidos a <span className="font-medium" style={{ color: "var(--kipu-warning)" }}>Consumidor Final</span> no
                pueden ser modificados mediante notas de crédito ni notas de débito.
              </p>
            </div>
          )}

          {/* Link al blog sobre anulación */}
          {["FAC", "LIQ"].includes(factura.tipo_doc) && (
            <a
              href={BLOG_ANULACION_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-flex items-center gap-1.5 text-xs transition-colors"
              style={{ color: "var(--kipu-subtle)" }}
              onMouseEnter={e => e.currentTarget.style.color = "var(--kipu-accent)"}
              onMouseLeave={e => e.currentTarget.style.color = "var(--kipu-subtle)"}
            >
              <ExternalLink size={11} /> ¿Quieres anular una factura? Conoce por qué es mejor emitir una nota de crédito
            </a>
          )}
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
              {err.identificador && <p className="text-xs font-mono" style={{ color: "var(--kipu-danger)" }}>Código: {String(err.identificador)}</p>}
              {err.mensaje && <p className="text-sm" style={{ color: "var(--kipu-text)" }}>{String(err.mensaje)}</p>}
              {err.informacionAdicional && <p className="text-xs" style={{ color: "var(--kipu-subtle)" }}>{typeof err.informacionAdicional === 'object' ? JSON.stringify(err.informacionAdicional) : String(err.informacionAdicional)}</p>}
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
                  {String(err.tipo)}
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
    </div>
  );
}