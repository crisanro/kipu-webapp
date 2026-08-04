"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import api from "@/lib/api";
import {
  ArrowLeft, CheckCircle2, Clock, XCircle, AlertTriangle,
  Download, Eye, Copy, RefreshCw, Loader2, FileText, RotateCcw
} from "lucide-react";
import { clsx } from "clsx";

const ESTADO_CONFIG: Record<string, { label: string; color: string; bg: string; border: string; icon: any }> = {
  AUTORIZADO: { label: "Autorizada",        color: "text-emerald-400", bg: "bg-emerald-500/20", border: "border-emerald-500/20", icon: CheckCircle2 },
  RECIBIDA:   { label: "Recibida por SRI",  color: "text-indigo-400",  bg: "bg-indigo-500/20",  border: "border-indigo-500/20",  icon: Clock },
  FIRMADO:    { label: "En cola",           color: "text-blue-400",    bg: "bg-blue-500/20",    border: "border-blue-500/20",    icon: Clock },
  DEVUELTA:   { label: "Devuelta por SRI",  color: "text-amber-400",   bg: "bg-amber-500/20",   border: "border-amber-500/20",   icon: AlertTriangle },
  RECHAZADO:  { label: "Rechazada por SRI", color: "text-red-400",     bg: "bg-red-500/20",     border: "border-red-500/20",     icon: XCircle },
};

const FORMA_PAGO: Record<string, string> = {
  "01": "Sin utilización del sistema financiero",
  "15": "Compensación de deudas",
  "16": "Tarjeta de débito",
  "17": "Dinero electrónico",
  "18": "Tarjeta prepago",
  "19": "Tarjeta de crédito",
  "20": "Otros con utilización del sistema financiero",
  "21": "Endoso de títulos",
};

const TIPO_ID: Record<string, string> = {
  "04": "RUC",
  "05": "Cédula",
  "06": "Pasaporte",
  "07": "Consumidor Final",
  "08": "Identificación del Exterior",
};

const fmt = (n: any) => parseFloat(n ?? 0).toFixed(2);

const normalizarTarifa = (tarifa: any): string => {
  const t = parseInt(String(tarifa ?? "15"));
  if (t === 0)  return "0";
  if (t === 5)  return "5";
  if (t === 15) return "15";
  return "15"; // fallback seguro
};

export default function DetalleFacturaPage() {
  const { id }   = useParams();
  const router   = useRouter();
  const [factura,   setFactura]   = useState<any>(null);
  const [loading,   setLoading]   = useState(true);
  const [copiado,   setCopiado]   = useState(false);
  const [reintento, setReintento] = useState(false);

  const cargar = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/api/v1/app/dashboard/factura/${id}`);
      setFactura(res.data.factura);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { cargar(); }, [id]);

  const copiarClave = async () => {
    if (!factura?.clave_acceso) return;
    await navigator.clipboard.writeText(factura.clave_acceso);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  };

  const forzarReintento = async () => {
    setReintento(true);
    try {
      await api.post(`/api/v1/app/invoices/${id}/reintentar`);
      await cargar();
    } catch (e) {
      console.error(e);
    } finally {
      setReintento(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 size={24} className="animate-spin text-indigo-400" />
      </div>
    );
  }

  if (!factura) {
    return (
      <div className="p-6 text-center">
        <FileText size={40} className="text-gray-700 mx-auto mb-3" />
        <p className="text-gray-500">Factura no encontrada.</p>
        <button onClick={() => router.back()} className="mt-4 text-indigo-400 text-sm">Volver</button>
      </div>
    );
  }

  const estado  = ESTADO_CONFIG[factura.estado] ?? ESTADO_CONFIG.FIRMADO;
  const Icon    = estado.icon;
  const datos   = factura.datos ?? {};
  const trib    = datos.infoTributaria ?? {};
  const info    = datos.infoFactura ?? {};

  const errores = factura.mensajes_sri
    ? (Array.isArray(factura.mensajes_sri) ? factura.mensajes_sri : [factura.mensajes_sri])
    : [];

  const detalles = datos.detalles?.detalle
    ? (Array.isArray(datos.detalles.detalle) ? datos.detalles.detalle : [datos.detalles.detalle])
    : [];

  const pagos = info.pagos?.pago
    ? (Array.isArray(info.pagos.pago) ? info.pagos.pago : [info.pagos.pago])
    : [];

  const impuestos = info.totalConImpuestos?.totalImpuesto
    ? (Array.isArray(info.totalConImpuestos.totalImpuesto)
        ? info.totalConImpuestos.totalImpuesto
        : [info.totalConImpuestos.totalImpuesto])
    : [];

  const adicionales = datos.infoAdicional?.campoAdicional
    ? (Array.isArray(datos.infoAdicional.campoAdicional)
        ? datos.infoAdicional.campoAdicional
        : [datos.infoAdicional.campoAdicional])
    : [];

  const crearProximaApartirDeEsta = () => {
    sessionStorage.setItem("kipu:prefill", JSON.stringify({
      cliente: info.identificacionComprador === "9999999999999" ? null : {
        identificacion: info.identificacionComprador,
        razon_social: info.razonSocialComprador,
        tipo_id: info.tipoIdentificacionComprador,
      },
      esConsumidorFinal: info.identificacionComprador === "9999999999999",
      items: detalles.map((d: any) => {
        const imp = d.impuestos?.impuesto;
        const tarifaRaw = Array.isArray(imp) ? imp[0]?.tarifa : imp?.tarifa;
        return {
          descripcion:    d.descripcion,
          cantidad:       parseFloat(d.cantidad),
          precio:         parseFloat(d.precioUnitario),
          descuento:      parseFloat(d.descuento || 0),
          tipo_descuento: "$",
          tipo_iva:       normalizarTarifa(tarifaRaw),
          unidad:         "UNIDAD",
        };
      }),
      formaPago: pagos[0]?.formaPago ?? "01",
      camposAdicionales: adicionales
        .filter((a: any) => a["@nombre"] !== "PROVEEDOR_SISTEMA_INFORMATICO")
        .map((a: any) => ({
          nombre: a["@nombre"],
          valor: a["#text"],
        })),
    }));
    router.push("/facturas/nueva");
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
            <h1 className="text-xl font-bold text-white">{factura.numero_factura}</h1>
            <p className="text-sm text-gray-500">{info.fechaEmision ?? factura.fecha_emision}</p>
          </div>
        </div>

        {/* Botón rápido arriba */}
        <button
          onClick={crearProximaApartirDeEsta}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs transition-colors border border-gray-700/60 shrink-0"
        >
          <Copy size={13} />
          <span className="hidden sm:inline">Crear nueva a partir de esta</span>
          <span className="sm:hidden">Duplicar</span>
        </button>
      </div>

      {/* Estado */}
      <div className={clsx("flex items-center gap-3 rounded-xl p-4 border flex-wrap sm:flex-nowrap", estado.bg, estado.border)}>
        <div className={clsx("w-10 h-10 rounded-full flex items-center justify-center shrink-0", estado.bg)}>
          <Icon size={20} className={estado.color} />
        </div>
        <div className="flex-1 min-w-[200px]">
          <p className={clsx("font-semibold", estado.color)}>{estado.label}</p>
          <p className="text-xs text-gray-400">
            {factura.estado === "AUTORIZADO" && factura.fecha_autorizacion
              ? `Autorizada el ${factura.fecha_autorizacion}`
              : factura.estado === "DEVUELTA"
              ? "El SRI devolvió la factura — revisa los errores abajo"
              : factura.estado === "RECHAZADO"
              ? "El SRI rechazó la factura — revisa los errores abajo"
              : factura.estado === "FIRMADO"
              ? "En cola de envío al SRI"
              : "Recibida por el SRI, pendiente de autorización"}
          </p>
        </div>
        <div className="flex gap-2 ml-auto w-full sm:w-auto justify-end">
          {factura.estado === "AUTORIZADO" && factura.links && (
            <>
              <a
                href={factura.links.pdf}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs transition-colors"
              >
                <Eye size={13} /> PDF
              </a>
              <a
                href={factura.links.xml}
                download
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs transition-colors"
              >
                <Download size={13} /> XML
              </a>
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
              onClick={cargar}
              className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-700 transition-colors"
              title="Actualizar"
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
                  err.tipo === "ERROR" ? "bg-red-500/20 text-red-400" : "bg-amber-500/20 text-amber-400"
                )}>
                  {err.tipo}
                </span>
              )}
            </div>
          ))}
          <p className="text-xs text-gray-500">
            Para corregir este error puedes crear una nueva factura basada en esta utilizando el botón de la parte superior.
          </p>
        </div>
      )}

      {/* Clave de acceso */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
        <h2 className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">Clave de acceso</h2>
        <div className="flex items-center gap-2 bg-gray-800 rounded-lg px-3 py-2">
          <code className="text-xs text-white flex-1 break-all font-mono">{factura.clave_acceso}</code>
          <button onClick={copiarClave} className="shrink-0 text-gray-400 hover:text-white transition-colors">
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

      {/* Emisor */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
        <h2 className="text-xs font-semibold text-gray-500 mb-3 uppercase tracking-wide">Emisor</h2>
        <div className="space-y-2 text-sm">
          {[
            { label: "Razón Social",   value: trib.razonSocial },
            { label: "RUC",            value: trib.ruc },
            { label: "Dirección",      value: trib.dirMatriz },
            { label: "Establecimiento", value: `${trib.estab}-${trib.ptoEmi}` },
            { label: "Ambiente",       value: trib.ambiente == 2 ? "🟢 Producción" : "🟡 Pruebas" },
          ].map(({ label, value }) => (
            <div key={label} className="flex justify-between">
              <span className="text-gray-500">{label}</span>
              <span className="text-white text-right max-w-[60%]">{value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Cliente */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
        <h2 className="text-xs font-semibold text-gray-500 mb-3 uppercase tracking-wide">Cliente</h2>
        <div className="space-y-2 text-sm">
          {[
            { label: "Razón Social",    value: info.razonSocialComprador },
            { label: "Tipo ID",         value: TIPO_ID[info.tipoIdentificacionComprador] ?? info.tipoIdentificacionComprador },
            { label: "Identificación",  value: info.identificacionComprador },
            { label: "Dirección",       value: info.dirEstablecimiento || "—" },
          ].map(({ label, value }) => (
            <div key={label} className="flex justify-between">
              <span className="text-gray-500">{label}</span>
              <span className="text-white text-right max-w-[60%]">{value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Items */}
      {detalles.length > 0 && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-800">
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Productos / Servicios</h2>
          </div>
          <div className="divide-y divide-gray-800">
            {detalles.map((item: any, i: number) => {
              const imp = item.impuestos?.impuesto;
              const tarifa = imp ? (Array.isArray(imp) ? imp[0]?.tarifa : imp?.tarifa) : null;
              return (
                <div key={i} className="px-4 py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white">{item.descripcion}</p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {item.codigoPrincipal !== "S/C" && (
                          <span className="font-mono mr-2">{item.codigoPrincipal}</span>
                        )}
                        {parseFloat(item.cantidad).toFixed(2)} × ${parseFloat(item.precioUnitario).toFixed(4)}
                        {parseFloat(item.descuento) > 0 && (
                          <span className="text-amber-400 ml-2">— Desc: ${fmt(item.descuento)}</span>
                        )}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-semibold text-white">${fmt(item.precioTotalSinImpuesto)}</p>
                      {tarifa && (
                        <span className="text-xs text-indigo-400">IVA {tarifa}%</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Totales */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
        <h2 className="text-xs font-semibold text-gray-500 mb-3 uppercase tracking-wide">Totales</h2>
        <div className="space-y-2 text-sm">

          {/* Subtotales por tarifa */}
          {impuestos.map((imp: any, i: number) => (
            <div key={`sub-${i}`} className="flex justify-between text-gray-400">
              <span>Subtotal {imp.tarifa ?? "0"}%</span>
              <span>${fmt(imp.baseImponible)}</span>
            </div>
          ))}

          {/* Descuento */}
          {parseFloat(info.totalDescuento) > 0 && (
            <div className="flex justify-between text-amber-400">
              <span>Descuento</span>
              <span>-${fmt(info.totalDescuento)}</span>
            </div>
          )}

          {/* IVA por tarifa — solo si valor > 0 */}
          {impuestos
            .filter((imp: any) => parseFloat(imp.valor) > 0)
            .map((imp: any, i: number) => (
              <div key={`iva-${i}`} className="flex justify-between text-gray-400">
                <span>IVA {imp.tarifa ?? "0"}%</span>
                <span>${fmt(imp.valor)}</span>
              </div>
            ))
          }

          {parseFloat(info.propina) > 0 && (
            <div className="flex justify-between text-gray-400">
              <span>Propina (10%)</span>
              <span>${fmt(info.propina)}</span>
            </div>
          )}

          <div className="flex justify-between font-bold text-white text-base border-t border-gray-800 pt-2 mt-2">
            <span>Total</span>
            <span>${fmt(info.importeTotal)}</span>
          </div>
        </div>
      </div>

      {/* Formas de pago */}
      {pagos.length > 0 && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <h2 className="text-xs font-semibold text-gray-500 mb-3 uppercase tracking-wide">Forma de Pago</h2>
          <div className="space-y-2">
            {pagos.map((pago: any, i: number) => (
              <div key={i} className="flex justify-between text-sm">
                <span className="text-gray-400">{FORMA_PAGO[pago.formaPago] ?? pago.formaPago}</span>
                <span className="text-white font-medium">${fmt(pago.total)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Info adicional */}
      {adicionales.filter((a: any) => a["@nombre"] !== "PROVEEDOR_SISTEMA_INFORMATICO").length > 0 && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <h2 className="text-xs font-semibold text-gray-500 mb-3 uppercase tracking-wide">Información Adicional</h2>
          <div className="space-y-2">
            {adicionales
              .filter((a: any) => a["@nombre"] !== "PROVEEDOR_SISTEMA_INFORMATICO")
              .map((campo: any, i: number) => (
                <div key={i} className="flex justify-between text-sm">
                  <span className="text-gray-500">{campo["@nombre"]}</span>
                  <span className="text-white">{campo["#text"]}</span>
                </div>
              ))}
          </div>
        </div>
      )}

    </div>
  );
}