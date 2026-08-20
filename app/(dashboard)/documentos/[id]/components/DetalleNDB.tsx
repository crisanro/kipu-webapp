// app/(dashboard)/documentos/[id]/components/DetalleNDB.tsx
"use client";
import { useRouter } from "next/navigation";
import { fmt, TIPO_ID, type FacturaBase } from "./DetalleShared";

interface Props { factura: FacturaBase; }

export default function DetalleNDB({ factura }: Props) {
  const router  = useRouter();
  const datos   = factura.datos ?? {};
  const trib    = datos.infoTributaria ?? {};
  const infoNDB = datos.infoNotaDebito ?? {};

  const motivos = datos.motivos?.motivo
    ? (Array.isArray(datos.motivos.motivo) ? datos.motivos.motivo : [datos.motivos.motivo])
    : [];

  const impuestos = infoNDB.impuestos?.impuesto
    ? (Array.isArray(infoNDB.impuestos.impuesto) ? infoNDB.impuestos.impuesto : [infoNDB.impuestos.impuesto])
    : [];

  const pagos = infoNDB.pagos?.pago
    ? (Array.isArray(infoNDB.pagos.pago) ? infoNDB.pagos.pago : [infoNDB.pagos.pago])
    : [];

  const adicionales = datos.infoAdicional?.campoAdicional
    ? (Array.isArray(datos.infoAdicional.campoAdicional)
        ? datos.infoAdicional.campoAdicional
        : [datos.infoAdicional.campoAdicional])
    : [];

  const FORMA_PAGO: Record<string, string> = {
    "01": "Sin utilización del sistema financiero",
    "16": "Tarjeta de débito",
    "17": "Dinero electrónico",
    "19": "Tarjeta de crédito",
    "20": "Transferencia bancaria",
    "15": "Compensación de deudas",
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
            { label: "Razón Social",   value: infoNDB.razonSocialComprador },
            { label: "Tipo ID",        value: TIPO_ID[infoNDB.tipoIdentificacionComprador] ?? infoNDB.tipoIdentificacionComprador },
            { label: "Identificación", value: infoNDB.identificacionComprador },
          ].map(({ label, value }) => (
            <div key={label} className="flex justify-between">
              <span className="text-gray-500">{label}</span>
              <span className="text-white text-right max-w-[60%]">{value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Documento que modifica */}
      <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-4">
        <h2 className="text-xs font-semibold text-amber-400 mb-3 uppercase tracking-wide">
          Documento que Modifica
        </h2>
        <div className="space-y-2 text-sm">
          {[
            { label: "Tipo",          value: infoNDB.codDocModificado === "01" ? "Factura" : infoNDB.codDocModificado },
            { label: "Número",        value: infoNDB.numDocModificado || "—" },
            { label: "Fecha emisión", value: infoNDB.fechaEmisionDocSustento },
          ].map(({ label, value }) => (
            <div key={label} className="flex justify-between">
              <span className="text-gray-500">{label}</span>
              <span className="text-white text-right max-w-[60%] font-medium">{value}</span>
            </div>
          ))}
        </div>
        {factura.doc_origen_emitido_id && (
          <button
            onClick={() => router.push(`/documentos/${factura.doc_origen_emitido_id}`)}
            className="mt-3 text-xs text-amber-400 hover:text-amber-300 transition-colors underline-offset-2 hover:underline">
            Ver documento original →
          </button>
        )}
      </div>

      {/* Motivos */}
      {motivos.length > 0 && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-800">
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Motivos</h2>
          </div>
          <div className="divide-y divide-gray-800">
            {motivos.map((m: any, i: number) => (
              <div key={i} className="flex items-center justify-between px-4 py-3">
                <span className="text-sm text-white">{m.razon}</span>
                <span className="text-sm font-bold text-amber-400">${fmt(m.valor)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Impuestos */}
      {impuestos.length > 0 && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <h2 className="text-xs font-semibold text-gray-500 mb-3 uppercase tracking-wide">Impuestos</h2>
          <div className="space-y-2 text-sm">
            {impuestos.map((imp: any, i: number) => (
              <div key={i} className="flex justify-between text-gray-400">
                <span>IVA {imp.tarifa}% · Base ${fmt(imp.baseImponible)}</span>
                <span>${fmt(imp.valor)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Total */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
        <div className="flex justify-between font-bold text-amber-400 text-base">
          <span>Total nota de débito</span>
          <span>${fmt(infoNDB.valorTotal)}</span>
        </div>
      </div>

      {/* Pagos */}
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
    </>
  );
}