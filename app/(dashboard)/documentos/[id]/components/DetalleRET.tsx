// app/(dashboard)/documentos/[id]/components/DetalleRET.tsx
"use client";
import { useRouter } from "next/navigation";
import { fmt, TIPO_ID, type FacturaBase } from "./DetalleShared";

interface Props { factura: FacturaBase; }

const TIPO_IMPUESTO: Record<string, string> = {
  "1": "Renta",
  "2": "IVA",
  "6": "ISD",
};

const DOCS_SUSTENTO: Record<string, string> = {
  "01": "Factura",
  "03": "Liquidación de Compra",
  "04": "Nota de Crédito",
  "05": "Nota de Débito",
  "07": "Comprobante de Retención",
};

export default function DetalleRET({ factura }: Props) {
  const router = useRouter();
  const datos  = factura.datos ?? {};
  const trib   = datos.infoTributaria    ?? {};
  const infoRET = datos.infoCompRetencion ?? {};

  const impuestos = datos.impuestos?.impuesto
    ? (Array.isArray(datos.impuestos.impuesto)
        ? datos.impuestos.impuesto
        : [datos.impuestos.impuesto])
    : [];

  const adicionales = datos.infoAdicional?.campoAdicional
    ? (Array.isArray(datos.infoAdicional.campoAdicional)
        ? datos.infoAdicional.campoAdicional
        : [datos.infoAdicional.campoAdicional])
    : [];

  const totalRetenido = impuestos.reduce(
    (s: number, i: any) => s + parseFloat(i.valorRetenido || i.valor || 0), 0
  );

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

      {/* Sujeto retenido */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
        <h2 className="text-xs font-semibold text-gray-500 mb-3 uppercase tracking-wide">Sujeto Retenido</h2>
        <div className="space-y-2 text-sm">
          {[
            { label: "Razón Social",   value: infoRET.razonSocialSujetoRetenido },
            { label: "Tipo ID",        value: TIPO_ID[infoRET.tipoIdentificacionSujetoRetenido] ?? infoRET.tipoIdentificacionSujetoRetenido },
            { label: "Identificación", value: infoRET.identificacionSujetoRetenido },
            { label: "Período Fiscal", value: infoRET.periodoFiscal },
          ].map(({ label, value }) => (
            <div key={label} className="flex justify-between">
              <span className="text-gray-500">{label}</span>
              <span className="text-white text-right max-w-[60%]">{value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Documento origen */}
      {(factura.doc_origen_emitido || factura.doc_origen_recibido) && (
        <div className="bg-blue-500/5 border border-blue-500/20 rounded-xl p-4">
          <h2 className="text-xs font-semibold text-blue-400 mb-3 uppercase tracking-wide">
            Documento Sustento
          </h2>
          {factura.doc_origen_emitido ? (
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-white font-mono font-medium">
                  {factura.doc_origen_emitido.numero_doc}
                </p>
                <p className="text-xs text-gray-500">
                  Liquidación de Compra · ${fmt(factura.doc_origen_emitido.importe_total)}
                </p>
              </div>
              <button
                onClick={() => router.push(`/documentos/${factura.doc_origen_emitido.id}`)}
                className="text-blue-400 hover:text-blue-300 text-xs transition-colors">
                Ver →
              </button>
            </div>
          ) : factura.doc_origen_recibido ? (
            <div>
              <p className="text-sm text-white font-mono font-medium">
                {factura.doc_origen_recibido.numero_doc}
              </p>
              <p className="text-xs text-gray-500">
                {factura.doc_origen_recibido.razon_social_proveedor}
                {" · "}${fmt(factura.doc_origen_recibido.importe_total)}
              </p>
              <button
                onClick={() => router.push(`/documentos/recibidos/${factura.doc_origen_recibido_id}`)}
                className="mt-2 text-blue-400 hover:text-blue-300 text-xs transition-colors">
                Ver factura recibida →
              </button>
            </div>
          ) : null}
        </div>
      )}

      {/* Tabla de impuestos retenidos */}
      {impuestos.length > 0 && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-800">
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Impuestos Retenidos
            </h2>
          </div>
          <div className="divide-y divide-gray-800">
            {impuestos.map((imp: any, i: number) => (
              <div key={i} className="px-4 py-3 space-y-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 font-medium">
                      {TIPO_IMPUESTO[imp.codigo] ?? imp.codigo}
                    </span>
                    <span className="text-sm text-white font-mono">
                      {imp.codigoRetencion || imp.codigoPorcentaje}
                    </span>
                  </div>
                  <span className="text-sm font-bold text-blue-400">
                    ${fmt(imp.valorRetenido || imp.valor)}
                  </span>
                </div>
                <div className="flex justify-between text-xs text-gray-500 pl-1">
                  <span>
                    Base: ${fmt(imp.baseImponible)} ×{" "}
                    {imp.porcentajeRetener || imp.tarifa}%
                  </span>
                  <span>
                    Doc: {DOCS_SUSTENTO[imp.codDocSustento] ?? imp.codDocSustento}
                    {" · "}{imp.numDocSustento}
                  </span>
                </div>
                <p className="text-xs text-gray-600 pl-1">
                  Fecha sustento: {imp.fechaEmisionDocSustento}
                </p>
              </div>
            ))}
          </div>
          <div className="px-4 py-3 border-t border-gray-800 flex justify-between font-bold">
            <span className="text-gray-400 text-sm">Total retenido</span>
            <span className="text-blue-400">${fmt(totalRetenido)}</span>
          </div>
        </div>
      )}

      {/* Info adicional */}
      {adicionales.filter((a: any) => a["@nombre"] !== "PROVEEDOR_SISTEMA_INFORMATICO").length > 0 && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <h2 className="text-xs font-semibold text-gray-500 mb-3 uppercase tracking-wide">
            Información Adicional
          </h2>
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
    </>
  );
}