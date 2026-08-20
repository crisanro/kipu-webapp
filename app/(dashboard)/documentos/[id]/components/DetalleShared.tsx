// app/(dashboard)/documentos/[id]/components/DetalleShared.tsx
"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, CheckCircle2, Clock, XCircle, AlertTriangle,
  Download, Eye, Copy, RefreshCw, Loader2, RotateCcw,
  DollarSign
} from "lucide-react";
import { clsx } from "clsx";
import api from "@/lib/api";

// =============================================================================
// TIPOS
// =============================================================================

export interface FacturaBase {
  id:                      string;
  numero_doc:              string;
  clave_acceso:            string;
  fecha_emision:           string;
  estado_sri:              string;
  estado_cobro?:           string | null;
  forma_pago_cobro?:       string | null;
  numero_comprobante_pago?: string | null;
  fecha_pago?:              string | null;
  tipo_doc:                string;    // FAC|LIQ|NCR|NDB|RET
  cod_doc:                 string;
  mensajes_sri:            any;
  fecha_autorizacion?:     string;
  importe_total:           number;
  datos:                   any;
  doc_origen_emitido_id?:  string | null;
  doc_origen_recibido_id?: string | null;
  documentos_derivados?:   any[];
  doc_origen_emitido?:     any | null;
  doc_origen_recibido?:    any | null;
  cliente?:                any;
}

// =============================================================================
// CONFIGURACIÓN
// =============================================================================

export const ESTADO_CONFIG: Record<string, {
  label: string; color: string; bg: string; border: string; icon: any
}> = {
  AUTORIZADO: { label: "Autorizado",       color: "text-emerald-400", bg: "bg-emerald-500/20", border: "border-emerald-500/20", icon: CheckCircle2 },
  RECIBIDA:   { label: "Recibido por SRI", color: "text-indigo-400",  bg: "bg-indigo-500/20",  border: "border-indigo-500/20",  icon: Clock },
  FIRMADO:    { label: "En cola",           color: "text-blue-400",    bg: "bg-blue-500/20",    border: "border-blue-500/20",    icon: Clock },
  DEVUELTA:   { label: "Devuelto por SRI", color: "text-amber-400",   bg: "bg-amber-500/20",   border: "border-amber-500/20",   icon: AlertTriangle },
  RECHAZADO:  { label: "Rechazado por SRI", color: "text-red-400",     bg: "bg-red-500/20",     border: "border-red-500/20",     icon: XCircle },
};

export const TIPO_LABEL: Record<string, string> = {
  FAC: "Factura",
  LIQ: "Liquidación de Compra",
  NCR: "Nota de Crédito",
  NDB: "Nota de Débito",
  RET: "Comprobante de Retención",
};

export const COBRO_CONFIG: Record<string, { label: string; color: string }> = {
  PENDIENTE: { label: "Por cobrar", color: "text-amber-400" },
  PAGADO:    { label: "Cobrado",    color: "text-emerald-400" },
  PARCIAL:   { label: "Parcial",    color: "text-blue-400" },
  ANULADO:   { label: "Anulado",    color: "text-red-400" },
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

// =============================================================================
// COMPONENTE
// =============================================================================

interface Props {
  factura:    FacturaBase;
  onRecargar: () => void;
  children:   React.ReactNode;
}

export default function DetalleShared({ factura, onRecargar, children }: Props) {
  const router  = useRouter();
  const [copiado,   setCopiado]   = useState(false);
  const [reintento, setReintento] = useState(false);

  const estado = ESTADO_CONFIG[factura.estado_sri] ?? ESTADO_CONFIG.FIRMADO;
  const Icon   = estado.icon;
  const cobro  = factura.estado_cobro ? COBRO_CONFIG[factura.estado_cobro] : null;

  const errores = factura.mensajes_sri
    ? (Array.isArray(factura.mensajes_sri) ? factura.mensajes_sri : [factura.mensajes_sri])
    : [];

  const copiarClave = async () => {
    if (!factura.clave_acceso) return;
    await navigator.clipboard.writeText(factura.clave_acceso);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
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

  const base_url = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
  const pdf_url  = `${base_url}/api/v1/public/pdf/${factura.clave_acceso}`;
  const xml_url  = `${base_url}/api/v1/public/xml/${factura.clave_acceso}`;

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto space-y-4">

      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()}
          className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors">
          <ArrowLeft size={18} />
        </button>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-white">{factura.numero_doc}</h1>
            {factura.tipo_doc !== "FAC" && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-400 font-medium">
                {TIPO_LABEL[factura.tipo_doc] ?? factura.tipo_doc}
              </span>
            )}
          </div>
          <p className="text-sm text-gray-500">
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
      <div className={clsx(
        "flex items-center gap-3 rounded-xl p-4 border flex-wrap sm:flex-nowrap",
        estado.bg, estado.border
      )}>
        <div className={clsx("w-10 h-10 rounded-full flex items-center justify-center shrink-0", estado.bg)}>
          <Icon size={20} className={estado.color} />
        </div>
        <div className="flex-1 min-w-[200px]">
          <p className={clsx("font-semibold", estado.color)}>{estado.label}</p>
          <p className="text-xs text-gray-400">
            {factura.estado_sri === "AUTORIZADO" && factura.fecha_autorizacion
              ? `Autorizado el ${factura.fecha_autorizacion}`
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
              <a href={pdf_url} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs transition-colors">
                <Eye size={13} /> PDF
              </a>
              <a href={xml_url} download
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs transition-colors">
                <Download size={13} /> XML
              </a>
            </>
          )}
          {["DEVUELTA", "RECHAZADO", "FIRMADO"].includes(factura.estado_sri) && (
            <button onClick={forzarReintento} disabled={reintento}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs transition-colors">
              {reintento ? <Loader2 size={13} className="animate-spin" /> : <RotateCcw size={13} />}
              Reintentar
            </button>
          )}
          {["RECIBIDA", "FIRMADO"].includes(factura.estado_sri) && (
            <button onClick={onRecargar}
              className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-700 transition-colors">
              <RefreshCw size={15} />
            </button>
          )}
        </div>
      </div>

      {/* Estado de cobro — solo FAC y LIQ */}
      {["FAC", "LIQ"].includes(factura.tipo_doc) && factura.estado_sri === "AUTORIZADO" && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <DollarSign size={15} className="text-gray-500" />
              <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Estado de Cobro</h2>
            </div>
            {cobro && (
              <span className={clsx("text-sm font-semibold", cobro.color)}>
                {cobro.label}
              </span>
            )}
          </div>
          {factura.forma_pago_cobro && (
            <div className="mt-2 space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Forma de pago</span>
                <span className="text-white">{factura.forma_pago_cobro}</span>
              </div>
              {factura.numero_comprobante_pago && (
                <div className="flex justify-between">
                  <span className="text-gray-500">N° comprobante</span>
                  <span className="text-white font-mono text-xs">{factura.numero_comprobante_pago}</span>
                </div>
              )}
              {factura.fecha_pago && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Fecha de pago</span>
                  <span className="text-white">{factura.fecha_pago}</span>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Documento origen — si este es NCR/NDB/RET */}
      {factura.doc_origen_emitido && (
        <div className="bg-indigo-500/5 border border-indigo-500/20 rounded-xl p-4">
          <h2 className="text-xs font-semibold text-indigo-400 mb-3 uppercase tracking-wide">
            Documento Origen
          </h2>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-white font-medium font-mono">
                {factura.doc_origen_emitido.numero_doc}
              </p>
              <p className="text-xs text-gray-500">
                {TIPO_LABEL[factura.doc_origen_emitido.tipo_doc] ?? factura.doc_origen_emitido.tipo_doc}
                {" · "}${fmt(factura.doc_origen_emitido.importe_total)}
              </p>
            </div>
            <button
              onClick={() => router.push(`/documentos/${factura.doc_origen_emitido.id}`)}
              className="text-indigo-400 hover:text-indigo-300 text-xs transition-colors">
              Ver →
            </button>
          </div>
        </div>
      )}

      {/* Documentos derivados — emitidos a partir de este */}
      {factura.documentos_derivados && factura.documentos_derivados.length > 0 && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <h2 className="text-xs font-semibold text-gray-500 mb-3 uppercase tracking-wide">
            Documentos Relacionados
          </h2>
          <div className="space-y-2">
            {factura.documentos_derivados.map((d: any) => {
              const cfg = ESTADO_CONFIG[d.estado_sri] ?? ESTADO_CONFIG.FIRMADO;
              return (
                <div key={d.id}
                  className="flex items-center justify-between p-2.5 rounded-lg bg-gray-800/60 border border-gray-700/50">
                  <div className="flex items-center gap-2">
                    <span className={clsx(
                      "text-[10px] px-1.5 py-0.5 rounded font-bold",
                      d.tipo_doc === "NCR" ? "bg-purple-500/20 text-purple-400" :
                      d.tipo_doc === "NDB" ? "bg-amber-500/20 text-amber-400" :
                      d.tipo_doc === "RET" ? "bg-blue-500/20 text-blue-400" :
                      "bg-gray-700 text-gray-400"
                    )}>
                      {d.tipo_doc}
                    </span>
                    <span className="text-sm text-white font-mono">{d.numero_doc}</span>
                    <span className={clsx("text-xs", cfg.color)}>{cfg.label}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-gray-500">${fmt(d.importe_total)}</span>
                    <button onClick={() => router.push(`/documentos/${d.id}`)}
                      className="text-indigo-400 hover:text-indigo-300 text-xs transition-colors">
                      Ver →
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Botones para emitir comprobantes relacionados */}
      {factura.estado_sri === "AUTORIZADO" && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <h2 className="text-xs font-semibold text-gray-500 mb-3 uppercase tracking-wide">
            Emitir comprobante relacionado
          </h2>
          <div className="flex flex-wrap gap-2">
            {/* FAC emitida → NCR, NDB */}
            {factura.tipo_doc === "FAC" && (
              <>
                <button
                  onClick={() => router.push(`/documentos/emitir/ncr?doc_id=${factura.id}`)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 text-xs border border-purple-500/20 transition-colors">
                  NCR · Nota de crédito
                </button>
                <button
                  onClick={() => router.push(`/documentos/emitir/ndb?doc_id=${factura.id}`)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 text-xs border border-amber-500/20 transition-colors">
                  NDB · Nota de débito
                </button>
              </>
            )}

            {/* LIQ emitida → RET (retención enviada al proveedor) */}
            {factura.tipo_doc === "LIQ" && (
              <button
                onClick={() => router.push(`/documentos/emitir/ret?doc_origen_emitido_id=${factura.id}`)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 text-xs border border-blue-500/20 transition-colors">
                RET · Retención al proveedor
              </button>
            )}
          </div>
        </div>
      )}

      {/* Errores SRI */}
      {errores.length > 0 && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 space-y-3">
          <h2 className="text-sm font-semibold text-red-300 flex items-center gap-2">
            <AlertTriangle size={15} /> Errores del SRI
          </h2>
          {errores.map((err: any, i: number) => (
            <div key={i} className="bg-black/20 rounded-lg p-3 space-y-1">
              {err.identificador && (
                <p className="text-xs text-red-400 font-mono">Código: {err.identificador}</p>
              )}
              {err.mensaje && <p className="text-sm text-red-300">{err.mensaje}</p>}
              {err.informacionAdicional && (
                <p className="text-xs text-gray-400">{err.informacionAdicional}</p>
              )}
              {err.tipo && (
                <span className={clsx(
                  "text-xs px-2 py-0.5 rounded-full",
                  err.tipo === "ERROR" ? "bg-red-500/20 text-red-400" : "bg-amber-500/20 text-amber-400"
                )}>
                  {err.tipo}
                </span>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Clave de acceso */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
        <h2 className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">
          Clave de acceso
        </h2>
        <div className="flex items-center gap-2 bg-gray-800 rounded-lg px-3 py-2">
          <code className="text-xs text-white flex-1 break-all font-mono">
            {factura.clave_acceso}
          </code>
          <button onClick={copiarClave}
            className="shrink-0 text-gray-400 hover:text-white transition-colors">
            {copiado
              ? <CheckCircle2 size={14} className="text-emerald-400" />
              : <Copy size={14} />}
          </button>
        </div>
        {factura.estado_sri === "AUTORIZADO" && (
          <a href={`https://srienlinea.sri.gob.ec/facturacion-internet/consultas/publico/ruc-establecimiento-usuario.jspa?ruc=${factura.datos?.infoTributaria?.ruc}`}
            target="_blank" rel="noopener noreferrer"
            className="mt-2 inline-flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300 transition-colors">
            <Eye size={12} /> Verificar en portal SRI
          </a>
        )}
      </div>

      {/* Contenido específico del tipo */}
      {children}
    </div>
  );
}