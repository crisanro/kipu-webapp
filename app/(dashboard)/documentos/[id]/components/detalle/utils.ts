// Tipos, configuración y helpers compartidos del detalle de documentos.
// Sin JSX: se puede importar desde cualquier lado.
import {
  CheckCircle2, Clock, XCircle, AlertTriangle, Ban, SearchCheck,
} from "lucide-react";

// =============================================================================
// TIPOS
// =============================================================================
export interface AnulacionInfo {
  puede_anular:         boolean;
  motivo_bloqueo:       string | null;
  sugerir_nota_credito: boolean;
  fecha_limite:         string;          // YYYY-MM-DD
  dias_restantes:       number;
  requiere_aceptacion:  boolean;
  estado:               "PENDIENTE" | "ACEPTADA" | "RECHAZADA" | "VENCIDA" | null;
  solicitada_at:        string | null;
  limite_aceptacion:    string | null;   // YYYY-MM-DD
  motivo:               string | null;
  motivos:              string[];
  sri: {
    tipo_comprobante:        string;
    fecha_autorizacion:      string | null;  // dd/mm/aaaa
    clave_acceso:            string;
    numero_autorizacion:     string;
    identificacion_receptor: string;
    razon_social_receptor:   string;
    email_receptor:          string;
  };
}

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
  email_comprador?:          string | null;
  es_sandbox?:               boolean;
  anulacion?:                AnulacionInfo | null;
  ultimo_error_tecnico?:     string | null;   // detalle de la última falla técnica con el SRI
  sri_verificado_at?:        string | null;   // última vez que se consultó al SRI
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
  EN_REVISION:{ label: "En revisión",        color: "#f59e0b",           bg: "color-mix(in srgb, #f59e0b 15%, transparent)",           border: "color-mix(in srgb, #f59e0b 25%, transparent)",           icon: SearchCheck },
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

// Portal donde el usuario ingresa la solicitud de anulación
export const SRI_EN_LINEA_URL = "https://srienlinea.sri.gob.ec";

// Formatos PDF disponibles
export const PDF_FORMATOS = [
  { key: "a4",  label: "A4",  desc: "Impresora de oficina" },
  { key: "t80", label: "T80", desc: "Térmica de 80 mm" },
  { key: "t58", label: "T58", desc: "Térmica de 58 mm" },
] as const;

// =============================================================================
// FECHAS — siempre en hora de Ecuador, sin depender del navegador
// =============================================================================
const TZ_EC = "America/Guayaquil";

/** ISO con hora → "15/09/2026 14:32" */
export function formatearFechaHora(iso?: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleString("es-EC", {
    timeZone: TZ_EC, day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit", hour12: false,
  }).replace(",", "");
}

/** "2026-10-07" → "07/10/2026" (sin pasar por Date para no correr el día) */
export function formatearFecha(ymd?: string | null): string {
  if (!ymd) return "";
  const [y, m, d] = ymd.slice(0, 10).split("-");
  return y && m && d ? `${d}/${m}/${y}` : ymd;
}

// =============================================================================
// FUNCIONES AUXILIARES
// =============================================================================
export function extraerMensajesSRI(mensajes_sri: any): any[] {
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
export function esConsumidorFinal(datos: any): boolean {
  const info = datos?.infoFactura || datos?.infoLiquidacionCompra || {};
  const tipoId = info.tipoIdentificacionComprador;
  const identificacion = info.identificacionComprador;
  return tipoId === "07" || identificacion === "9999999999999";
}


// =============================================================================
// ANULACIÓN
// =============================================================================
export const MOTIVO_LABEL: Record<string, string> = {
  "ERROR EN EL COMPROBANTE": "Error en el comprobante",
  "OPERACIÓN NO REALIZADA":  "La operación no se realizó",
};

// =============================================================================
// URLs públicas del comprobante
// =============================================================================
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
export const urlXml      = (clave: string) => `${API_BASE_URL}/api/v1/public/xml/${clave}`;
export const urlPdf      = (clave: string, formato: string) => `${API_BASE_URL}/api/v1/public/pdf/${clave}?formato=${formato}`;
export const urlConsulta = (clave: string) => `https://consulta.kipu.ec/?id=${clave}`;