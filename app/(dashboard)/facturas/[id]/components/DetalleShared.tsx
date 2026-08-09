// app/(dashboard)/facturas/[id]/components/DetalleShared.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, CheckCircle2, Clock, XCircle, AlertTriangle,
  Download, Eye, Copy, RefreshCw, Loader2, RotateCcw
} from "lucide-react";
import { clsx } from "clsx";
import api from "@/lib/api";

// ── Tipos ──────────────────────────────────────────────────────────────────────
export interface FacturaBase {
  id:             string;
  numero_factura: string;
  clave_acceso:   string;
  fecha_emision:  string;
  estado:         string;
  cod_doc:        string;
  mensajes_sri:   any;
  links?:         { pdf?: string; xml?: string };
  datos:          any;
  fecha_autorizacion?: string;
}

// ── Configuración ──────────────────────────────────────────────────────────────
export const ESTADO_CONFIG: Record<string, {
  label: string; color: string; bg: string; border: string; icon: any
}> = {
  AUTORIZADO: { label: "Autorizada",        color: "text-emerald-400", bg: "bg-emerald-500/20", border: "border-emerald-500/20", icon: CheckCircle2 },
  RECIBIDA:   { label: "Recibida por SRI",  color: "text-indigo-400",  bg: "bg-indigo-500/20",  border: "border-indigo-500/20",  icon: Clock },
  FIRMADO:    { label: "En cola",           color: "text-blue-400",    bg: "bg-blue-500/20",    border: "border-blue-500/20",    icon: Clock },
  DEVUELTA:   { label: "Devuelta por SRI",  color: "text-amber-400",   bg: "bg-amber-500/20",   border: "border-amber-500/20",   icon: AlertTriangle },
  RECHAZADO:  { label: "Rechazada por SRI", color: "text-red-400",     bg: "bg-red-500/20",     border: "border-red-500/20",     icon: XCircle },
};

export const TIPO_LABEL: Record<string, string> = {
  "01": "Factura",
  "04": "Nota de Crédito",
  "05": "Nota de Débito",
  "07": "Comprobante de Retención",
  "03": "Liquidación de Compra",
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
  if (t === 0)  return "0";
  if (t === 5)  return "5";
  if (t === 15) return "15";
  return "15";
};

// ── Componente ─────────────────────────────────────────────────────────────────
interface Props {
  factura:   FacturaBase;
  onRecargar: () => void;
  // Botón extra específico de cada tipo (ej: "Nota de crédito" en factura)
  accionExtra?: React.ReactNode;
  // Contenido específico del tipo
  children: React.ReactNode;
}

export default function DetalleShared({ factura, onRecargar, accionExtra, children }: Props) {
  const router  = useRouter();
  const [copiado,   setCopiado]   = useState(false);
  const [reintento, setReintento] = useState(false);

  const estado = ESTADO_CONFIG[factura.estado] ?? ESTADO_CONFIG.FIRMADO;
  const Icon   = estado.icon;

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
      await api.post(`/api/v1/app/invoices/${factura.id}/reintentar`);
      onRecargar();
    } catch (e) {
      console.error(e);
    } finally {
      setReintento(false);
    }
  };

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto space-y-4">

      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-white">{factura.numero_factura}</h1>
              {/* Badge tipo — solo si no es factura */}
              {factura.cod_doc !== "01" && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-400 font-medium">
                  {TIPO_LABEL[factura.cod_doc] ?? factura.cod_doc}
                </span>
              )}
            </div>
            <p className="text-sm text-gray-500">
              {factura.datos?.infoFactura?.fechaEmision ||
               factura.datos?.infoNotaCredito?.fechaEmision ||
               factura.datos?.infoNotaDebito?.fechaEmision ||
               factura.fecha_emision}
            </p>
          </div>
        </div>

        {/* Acciones del header */}
        <div className="flex items-center gap-2 shrink-0">
          {accionExtra}
        </div>
      </div>

      {/* Estado */}
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
            {factura.estado === "AUTORIZADO" && factura.fecha_autorizacion
              ? `Autorizado el ${factura.fecha_autorizacion}`
              : factura.estado === "DEVUELTA"
              ? "El SRI devolvió el comprobante — revisa los errores abajo"
              : factura.estado === "RECHAZADO"
              ? "El SRI rechazó el comprobante — revisa los errores abajo"
              : factura.estado === "FIRMADO"
              ? "En cola de envío al SRI"
              : "Recibido por el SRI, pendiente de autorización"}
          </p>
        </div>

        {/* Botones de acción según estado */}
        <div className="flex gap-2 ml-auto w-full sm:w-auto justify-end flex-wrap">
          {factura.estado === "AUTORIZADO" && factura.links && (
            <>
              {factura.links.pdf && (
                <a
                  href={factura.links.pdf}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs transition-colors"
                >
                  <Eye size={13} /> PDF
                </a>
              )}
              {factura.links.xml && (
                <a
                  href={factura.links.xml}
                  download
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs transition-colors"
                >
                  <Download size={13} /> XML
                </a>
              )}
            </>
          )}
          {factura.estado === "FIRMADO" && (
            <button
              onClick={forzarReintento}
              disabled={reintento}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs transition-colors"
            >
              {reintento ? <Loader2 size={13} className="animate-spin" /> : <RotateCcw size={13} />}
              Reintentar
            </button>
          )}
          {["RECIBIDA", "FIRMADO"].includes(factura.estado) && (
            <button
              onClick={onRecargar}
              className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-700 transition-colors"
            >
              <RefreshCw size={15} />
            </button>
          )}
        </div>
      </div>

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
                  err.tipo === "ERROR"
                    ? "bg-red-500/20 text-red-400"
                    : "bg-amber-500/20 text-amber-400"
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
          <button
            onClick={copiarClave}
            className="shrink-0 text-gray-400 hover:text-white transition-colors"
          >
            {copiado
              ? <CheckCircle2 size={14} className="text-emerald-400" />
              : <Copy size={14} />
            }
          </button>
        </div>
        {factura.estado === "AUTORIZADO" && (
          <a
            href={`https://consulta.kipu.ec/?id=${factura.clave_acceso}`}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 inline-flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
          >
            <Eye size={12} /> Verificar en portal Kipu
          </a>
        )}
      </div>

      {/* Contenido específico del tipo */}
      {children}

    </div>
  );
}