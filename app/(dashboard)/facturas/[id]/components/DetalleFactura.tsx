// app/(dashboard)/facturas/[id]/components/DetalleFactura.tsx
"use client";

import { useRouter } from "next/navigation";
import { Copy, RotateCcw } from "lucide-react";
import { clsx } from "clsx";
import {
  fmt, FORMA_PAGO, TIPO_ID, normalizarTarifa,
  type FacturaBase
} from "./DetalleShared";

interface Props {
  factura: FacturaBase;
}

export default function DetalleFactura({ factura }: Props) {
  const router = useRouter();
  const datos  = factura.datos ?? {};
  const trib   = datos.infoTributaria ?? {};
  const info   = datos.infoFactura    ?? {};

  const detalles = datos.detalles?.detalle
    ? (Array.isArray(datos.detalles.detalle)
        ? datos.detalles.detalle
        : [datos.detalles.detalle])
    : [];

  const pagos = info.pagos?.pago
    ? (Array.isArray(info.pagos.pago)
        ? info.pagos.pago
        : [info.pagos.pago])
    : [];

  const impuestos = info.totalConImpuestos?.totalImpuesto
    ? (Array.isArray(info.totalConImpuestos.totalImpuesto)
        ? info.totalConImpuestos.totalImpuesto
        : [info.totalConImpuestos.totalImpuesto])
    : [];

  // Usa resumenImpuestos del JSONB que tiene la tarifa correcta
  const resumenImpuestos = datos.resumenImpuestos
    ? (Array.isArray(datos.resumenImpuestos)
        ? datos.resumenImpuestos
        : [datos.resumenImpuestos])
    : [];

  const adicionales = datos.infoAdicional?.campoAdicional
    ? (Array.isArray(datos.infoAdicional.campoAdicional)
        ? datos.infoAdicional.campoAdicional
        : [datos.infoAdicional.campoAdicional])
    : [];

  // Prefill para duplicar factura
  const duplicar = () => {
    sessionStorage.setItem("kipu:prefill", JSON.stringify({
      cliente: info.identificacionComprador === "9999999999999" ? null : {
        identificacion: info.identificacionComprador,
        razon_social:   info.razonSocialComprador,
        tipo_id:        info.tipoIdentificacionComprador,
      },
      esConsumidorFinal: info.identificacionComprador === "9999999999999",
      items: detalles.map((d: any) => {
        const imp     = d.impuestos?.impuesto;
        const impArr  = Array.isArray(imp) ? imp : [imp];
        const tarifa  = impArr[0]?.tarifa ?? "15";
        return {
          codigo:         d.codigoPrincipal !== "S/C" ? d.codigoPrincipal : "",
          descripcion:    d.descripcion,
          cantidad:       parseFloat(d.cantidad),
          precio:         parseFloat(d.precioUnitario),
          descuento:      parseFloat(d.descuento || 0),
          tipo_descuento: "$",
          tipo_iva:       normalizarTarifa(tarifa),
          unidad:         "UNIDAD",
        };
      }),
      camposAdicionales: adicionales
        .filter((a: any) => a["@nombre"] !== "Proveedor")
        .map((a: any) => ({ nombre: a["@nombre"], valor: a["#text"] })),
    }));
    router.push("/facturas/nueva");
  };

  return (
    <>
      {/* Botón duplicar — se pasa como accionExtra al shared pero lo definimos aquí */}
      {/* Emisor */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
        <h2 className="text-xs font-semibold text-gray-500 mb-3 uppercase tracking-wide">Emisor</h2>
        <div className="space-y-2 text-sm">
          {[
            { label: "Razón Social",    value: trib.razonSocial },
            { label: "RUC",             value: trib.ruc },
            { label: "Dirección",       value: trib.dirMatriz },
            { label: "Establecimiento", value: `${trib.estab}-${trib.ptoEmi}` },
            { label: "Ambiente",        value: trib.ambiente == 2 ? "🟢 Producción" : "🟡 Pruebas" },
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
            { label: "Razón Social",   value: info.razonSocialComprador },
            { label: "Tipo ID",        value: TIPO_ID[info.tipoIdentificacionComprador] ?? info.tipoIdentificacionComprador },
            { label: "Identificación", value: info.identificacionComprador },
            { label: "Dirección",      value: info.dirEstablecimiento || "—" },
          ].map(({ label, value }) => (
            <div key={label} className="flex justify-between">
              <span className="text-gray-500">{label}</span>
              <span className="text-white text-right max-w-[60%]">{value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Ítems */}
      {detalles.length > 0 && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-800">
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Productos / Servicios
            </h2>
          </div>
          <div className="divide-y divide-gray-800">
            {detalles.map((item: any, i: number) => {
              const imp    = item.impuestos?.impuesto;
              const impArr = Array.isArray(imp) ? imp : [imp];
              const tarifa = impArr[0]?.tarifa ?? null;
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
                      <p className="text-sm font-semibold text-white">
                        ${fmt(item.precioTotalSinImpuesto)}
                      </p>
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
          {resumenImpuestos.map((imp: any, i: number) => (
            <div key={`sub-${i}`} className="flex justify-between text-gray-400">
              <span>Subtotal {imp.tarifa}%</span>
              <span>${fmt(imp.baseImponible)}</span>
            </div>
          ))}
          {parseFloat(info.totalDescuento) > 0 && (
            <div className="flex justify-between text-amber-400">
              <span>Descuento</span>
              <span>-${fmt(info.totalDescuento)}</span>
            </div>
          )}
          {resumenImpuestos
            .filter((imp: any) => parseFloat(imp.valor) > 0)
            .map((imp: any, i: number) => (
              <div key={`iva-${i}`} className="flex justify-between text-gray-400">
                <span>IVA {imp.tarifa}%</span>
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
          <h2 className="text-xs font-semibold text-gray-500 mb-3 uppercase tracking-wide">
            Forma de Pago
          </h2>
          <div className="space-y-2">
            {pagos.map((pago: any, i: number) => (
              <div key={i} className="flex justify-between text-sm">
                <span className="text-gray-400">
                  {FORMA_PAGO[pago.formaPago] ?? pago.formaPago}
                </span>
                <span className="text-white font-medium">${fmt(pago.total)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Info adicional */}
      {adicionales.filter((a: any) => a["@nombre"] !== "Proveedor").length > 0 && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <h2 className="text-xs font-semibold text-gray-500 mb-3 uppercase tracking-wide">
            Información Adicional
          </h2>
          <div className="space-y-2">
            {adicionales
              .filter((a: any) => a["@nombre"] !== "Proveedor")
              .map((campo: any, i: number) => (
                <div key={i} className="flex justify-between text-sm">
                  <span className="text-gray-500">{campo["@nombre"]}</span>
                  <span className="text-white">{campo["#text"]}</span>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Acciones */}
      <div className="flex gap-3 pb-2">
        {factura.estado === "AUTORIZADO" && (
          <button
            onClick={() => router.push(`/facturas/${factura.id}/nota-credito`)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs transition-colors border border-red-500/20"
          >
            <RotateCcw size={13} />
            Nota de crédito
          </button>
        )}
        <button
          onClick={duplicar}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs transition-colors border border-gray-700"
        >
          <Copy size={13} />
          Crear nueva a partir de esta
        </button>
      </div>
    </>
  );
}