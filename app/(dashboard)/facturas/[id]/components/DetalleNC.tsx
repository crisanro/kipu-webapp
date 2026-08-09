// app/(dashboard)/facturas/[id]/components/DetalleNC.tsx
"use client";

import { useRouter } from "next/navigation";
import { Copy } from "lucide-react";
import { fmt, TIPO_ID, type FacturaBase } from "./DetalleShared";

interface Props {
  factura: FacturaBase;
}

export default function DetalleNC({ factura }: Props) {
  const router = useRouter();
  const datos  = factura.datos ?? {};
  const trib   = datos.infoTributaria    ?? {};
  const infoNC = datos.infoNotaCredito   ?? {};

  const detalles = datos.detalles?.detalle
    ? (Array.isArray(datos.detalles.detalle)
        ? datos.detalles.detalle
        : [datos.detalles.detalle])
    : [];

  const impuestos = infoNC.totalConImpuestos?.totalImpuesto
    ? (Array.isArray(infoNC.totalConImpuestos.totalImpuesto)
        ? infoNC.totalConImpuestos.totalImpuesto
        : [infoNC.totalConImpuestos.totalImpuesto])
    : [];

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

  // Prefill para nueva factura basada en la NC
  const duplicar = () => {
    sessionStorage.setItem("kipu:prefill", JSON.stringify({
      cliente: infoNC.identificacionComprador === "9999999999999" ? null : {
        identificacion: infoNC.identificacionComprador,
        razon_social:   infoNC.razonSocialComprador,
        tipo_id:        infoNC.tipoIdentificacionComprador,
      },
      esConsumidorFinal: infoNC.identificacionComprador === "9999999999999",
      items: detalles.map((d: any) => {
        const imp    = d.impuestos?.impuesto;
        const impArr = Array.isArray(imp) ? imp : [imp];
        const tarifa = impArr[0]?.tarifa ?? "15";
        const t      = parseInt(String(tarifa));
        return {
          codigo:         d.codigoInterno || "",
          descripcion:    d.descripcion,
          cantidad:       parseFloat(d.cantidad),
          precio:         parseFloat(d.precioUnitario),
          descuento:      parseFloat(d.descuento || 0),
          tipo_descuento: "$",
          tipo_iva:       t === 0 ? "0" : t === 5 ? "5" : "15",
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
            { label: "Razón Social",   value: infoNC.razonSocialComprador },
            { label: "Tipo ID",        value: TIPO_ID[infoNC.tipoIdentificacionComprador] ?? infoNC.tipoIdentificacionComprador },
            { label: "Identificación", value: infoNC.identificacionComprador },
          ].map(({ label, value }) => (
            <div key={label} className="flex justify-between">
              <span className="text-gray-500">{label}</span>
              <span className="text-white text-right max-w-[60%]">{value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Referencia a factura original */}
      <div className="bg-purple-500/5 border border-purple-500/20 rounded-xl p-4">
        <h2 className="text-xs font-semibold text-purple-400 mb-3 uppercase tracking-wide">
          Documento que Modifica
        </h2>
        <div className="space-y-2 text-sm">
          {[
            { label: "Tipo Doc.",       value: infoNC.codDocModificado === "01" ? "Factura" : infoNC.codDocModificado },
            { label: "Número",          value: infoNC.numDocModificado || "—" },
            { label: "Fecha emisión",   value: infoNC.fechaEmisionDocSustento },
            { label: "Motivo",          value: infoNC.motivo },
          ].map(({ label, value }) => (
            <div key={label} className="flex justify-between">
              <span className="text-gray-500">{label}</span>
              <span className="text-white text-right max-w-[60%] font-medium">{value}</span>
            </div>
          ))}
        </div>

        {/* Link a la factura original */}
        {datos.factura_referencia && (
          <button
            onClick={() => router.push(`/facturas/${datos.factura_referencia}`)}
            className="mt-3 text-xs text-purple-400 hover:text-purple-300 transition-colors underline-offset-2 hover:underline"
          >
            Ver factura original →
          </button>
        )}
      </div>

      {/* Ítems */}
      {detalles.length > 0 && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-800">
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Ítems acreditados
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
                        {item.codigoInterno && item.codigoInterno !== "S/C" && (
                          <span className="font-mono mr-2">{item.codigoInterno}</span>
                        )}
                        {parseFloat(item.cantidad).toFixed(2)} × ${parseFloat(item.precioUnitario).toFixed(4)}
                        {parseFloat(item.descuento || 0) > 0 && (
                          <span className="text-amber-400 ml-2">— Desc: ${fmt(item.descuento)}</span>
                        )}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-semibold text-purple-400">
                        -${fmt(item.precioTotalSinImpuesto)}
                      </p>
                      {tarifa && (
                        <span className="text-xs text-gray-500">IVA {tarifa}%</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Totales NC */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
        <h2 className="text-xs font-semibold text-gray-500 mb-3 uppercase tracking-wide">
          Valor de Modificación
        </h2>
        <div className="space-y-2 text-sm">
          {resumenImpuestos.map((imp: any, i: number) => (
            <div key={`sub-${i}`} className="flex justify-between text-gray-400">
              <span>Subtotal {imp.tarifa}%</span>
              <span>${fmt(imp.baseImponible)}</span>
            </div>
          ))}
          {resumenImpuestos
            .filter((imp: any) => parseFloat(imp.valor) > 0)
            .map((imp: any, i: number) => (
              <div key={`iva-${i}`} className="flex justify-between text-gray-400">
                <span>IVA {imp.tarifa}%</span>
                <span>${fmt(imp.valor)}</span>
              </div>
            ))
          }
          <div className="flex justify-between font-bold text-purple-400 text-base border-t border-gray-800 pt-2 mt-2">
            <span>Total acreditado</span>
            <span>-${fmt(infoNC.valorModificacion)}</span>
          </div>
        </div>
      </div>

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
        <button
          onClick={duplicar}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs transition-colors border border-gray-700"
        >
          <Copy size={13} />
          Nueva factura a partir de esta
        </button>
      </div>
    </>
  );
}