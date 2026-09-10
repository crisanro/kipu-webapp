"use client";
import { useRouter } from "next/navigation";
import { Copy } from "lucide-react";
import { fmt, TIPO_ID, type FacturaBase } from "./DetalleShared";

interface Props { factura: FacturaBase; }

export default function DetalleNC({ factura }: Props) {
  const router = useRouter();
  const datos   = factura.datos ?? {};
  const trib    = datos.infoTributaria  ?? {};
  const infoNC = datos.infoNotaCredito ?? {};

  const detalles = datos.detalles?.detalle
    ? (Array.isArray(datos.detalles.detalle) ? datos.detalles.detalle : [datos.detalles.detalle])
    : [];

  const resumenImpuestos = datos.resumenImpuestos
    ? (Array.isArray(datos.resumenImpuestos) ? datos.resumenImpuestos : [datos.resumenImpuestos])
    : [];

  const adicionales = datos.infoAdicional?.campoAdicional
    ? (Array.isArray(datos.infoAdicional.campoAdicional) ? datos.infoAdicional.campoAdicional : [datos.infoAdicional.campoAdicional])
    : [];

  const duplicar = () => {
    sessionStorage.setItem("kipu:prefill", JSON.stringify({
      cliente: infoNC.identificacionComprador === "9999999999999" ? null : {
        identificacion: infoNC.identificacionComprador,
        razon_social:    infoNC.razonSocialComprador,
        tipo_id:        infoNC.tipoIdentificacionComprador,
      },
      esConsumidorFinal: infoNC.identificacionComprador === "9999999999999",
      items: detalles.map((d: any) => {
        const imp    = d.impuestos?.impuesto;
        const impArr = Array.isArray(imp) ? imp : [imp];
        const tarifa = impArr[0]?.tarifa ?? "15";
        const t      = parseInt(String(tarifa));
        return {
          codigo:          d.codigoInterno || "",
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
        .filter((a: any) => a["@nombre"] !== "PROVEEDOR_SISTEMA_INFORMATICO")
        .map((a: any) => ({ nombre: a["@nombre"], valor: a["#text"] })),
    }));
    router.push("/documentos/emitir/fac");
  };

  return (
    <>
      {/* Emisor */}
      <div
        className="rounded-xl p-4"
        style={{
          background: "var(--kipu-surface)",
          border: "1px solid var(--kipu-border)",
        }}
      >
        <h2 className="text-xs font-semibold mb-3 uppercase tracking-wide" style={{ color: "var(--kipu-subtle)" }}>
          Emisor
        </h2>
        <div className="space-y-2 text-sm">
          {[
            { label: "Razón Social",    value: trib.razonSocial },
            { label: "RUC",             value: trib.ruc },
            { label: "Dirección",       value: trib.dirMatriz },
            { label: "Establecimiento", value: `${trib.estab}-${trib.ptoEmi}` },
            { label: "Ambiente",        value: trib.ambiente == 2 ? "🟢 Producción" : "🟡 Pruebas" },
          ].map(({ label, value }) => (
            <div key={label} className="flex justify-between">
              <span style={{ color: "var(--kipu-muted)" }}>{label}</span>
              <span className="text-right max-w-[60%]" style={{ color: "var(--kipu-text)" }}>{value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Cliente */}
      <div
        className="rounded-xl p-4"
        style={{
          background: "var(--kipu-surface)",
          border: "1px solid var(--kipu-border)",
        }}
      >
        <h2 className="text-xs font-semibold mb-3 uppercase tracking-wide" style={{ color: "var(--kipu-subtle)" }}>
          Cliente
        </h2>
        <div className="space-y-2 text-sm">
          {[
            { label: "Razón Social",   value: infoNC.razonSocialComprador },
            { label: "Tipo ID",        value: TIPO_ID[infoNC.tipoIdentificacionComprador] ?? infoNC.tipoIdentificacionComprador },
            { label: "Identificación", value: infoNC.identificacionComprador },
          ].map(({ label, value }) => (
            <div key={label} className="flex justify-between">
              <span style={{ color: "var(--kipu-muted)" }}>{label}</span>
              <span className="text-right max-w-[60%]" style={{ color: "var(--kipu-text)" }}>{value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Documento que modifica */}
      <div
        className="rounded-xl p-4"
        style={{
          background: "color-mix(in srgb, #c084fc 5%, transparent)",
          border: "1px solid color-mix(in srgb, #c084fc 20%, transparent)",
        }}
      >
        <h2 className="text-xs font-semibold mb-3 uppercase tracking-wide" style={{ color: "#c084fc" }}>
          Documento que Modifica
        </h2>
        <div className="space-y-2 text-sm">
          {[
            { label: "Tipo",          value: infoNC.codDocModificado === "01" ? "Factura" : infoNC.codDocModificado },
            { label: "Número",        value: infoNC.numDocModificado || "—" },
            { label: "Fecha emisión", value: infoNC.fechaEmisionDocSustento },
            { label: "Motivo",        value: infoNC.motivo },
          ].map(({ label, value }) => (
            <div key={label} className="flex justify-between">
              <span style={{ color: "var(--kipu-muted)" }}>{label}</span>
              <span className="text-right max-w-[60%] font-medium" style={{ color: "var(--kipu-text)" }}>{value}</span>
            </div>
          ))}
        </div>
        {/* Link al documento origen */}
        {factura.doc_origen_emitido_id && (
          <button
            onClick={() => router.push(`/documentos/${factura.doc_origen_emitido_id}`)}
            className="mt-3 text-xs transition-colors underline-offset-2 hover:underline"
            style={{ color: "#c084fc" }}
          >
            Ver documento original →
          </button>
        )}
      </div>

      {/* Ítems */}
      {detalles.length > 0 && (
        <div
          className="rounded-xl overflow-hidden"
          style={{
            background: "var(--kipu-surface)",
            border: "1px solid var(--kipu-border)",
          }}
        >
          <div className="px-4 py-3" style={{ borderBottom: "2px solid var(--kipu-border)" }}>
            <h2 className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--kipu-subtle)" }}>
              Ítems acreditados
            </h2>
          </div>
          <div>
            {detalles.map((item: any, i: number) => {
              const imp    = item.impuestos?.impuesto;
              const impArr = Array.isArray(imp) ? imp : [imp];
              const tarifa = impArr[0]?.tarifa ?? null;
              return (
                <div
                  key={i}
                  className="px-4 py-3"
                  style={{ borderTop: i > 0 ? "1px solid var(--kipu-border)" : "none" }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm" style={{ color: "var(--kipu-text)" }}>{item.descripcion}</p>
                      <p className="text-xs mt-0.5" style={{ color: "var(--kipu-subtle)" }}>
                        {item.codigoInterno && item.codigoInterno !== "S/C" && (
                          <span className="font-mono mr-2">{item.codigoInterno}</span>
                        )}
                        {parseFloat(item.cantidad).toFixed(2)} × ${parseFloat(item.precioUnitario).toFixed(4)}
                        {parseFloat(item.descuento || 0) > 0 && (
                          <span className="ml-2" style={{ color: "var(--kipu-warning)" }}>— Desc: ${fmt(item.descuento)}</span>
                        )}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-semibold" style={{ color: "#c084fc" }}>-${fmt(item.precioTotalSinImpuesto)}</p>
                      {tarifa && <span className="text-xs" style={{ color: "var(--kipu-subtle)" }}>IVA {tarifa}%</span>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Totales */}
      <div
        className="rounded-xl p-4"
        style={{
          background: "var(--kipu-surface)",
          border: "1px solid var(--kipu-border)",
        }}
      >
        <h2 className="text-xs font-semibold mb-3 uppercase tracking-wide" style={{ color: "var(--kipu-subtle)" }}>
          Valor de Modificación
        </h2>
        <div className="space-y-2 text-sm">
          {resumenImpuestos.map((imp: any, i: number) => (
            <div key={`sub-${i}`} className="flex justify-between" style={{ color: "var(--kipu-muted)" }}>
              <span>Subtotal {imp.tarifa}%</span>
              <span>${fmt(imp.baseImponible)}</span>
            </div>
          ))}
          {resumenImpuestos.filter((imp: any) => parseFloat(imp.valor) > 0).map((imp: any, i: number) => (
            <div key={`iva-${i}`} className="flex justify-between" style={{ color: "var(--kipu-muted)" }}>
              <span>IVA {imp.tarifa}%</span>
              <span>${fmt(imp.valor)}</span>
            </div>
          ))}
          <div
            className="flex justify-between font-bold text-base pt-2 mt-2"
            style={{
              borderTop: "1px solid var(--kipu-border)",
              color: "#c084fc",
            }}
          >
            <span>Total acreditado</span>
            <span>-${fmt(infoNC.valorModificacion)}</span>
          </div>
        </div>
      </div>

      {/* Info adicional */}
      {adicionales.filter((a: any) => a["@nombre"] !== "PROVEEDOR_SISTEMA_INFORMATICO").length > 0 && (
        <div
          className="rounded-xl p-4"
          style={{
            background: "var(--kipu-surface)",
            border: "1px solid var(--kipu-border)",
          }}
        >
          <h2 className="text-xs font-semibold mb-3 uppercase tracking-wide" style={{ color: "var(--kipu-subtle)" }}>
            Información Adicional
          </h2>
          <div className="space-y-2">
            {adicionales
              .filter((a: any) => a["@nombre"] !== "PROVEEDOR_SISTEMA_INFORMATICO")
              .map((campo: any, i: number) => (
                <div key={i} className="flex justify-between text-sm">
                  <span style={{ color: "var(--kipu-subtle)" }}>{campo["@nombre"]}</span>
                  <span style={{ color: "var(--kipu-text)" }}>{campo["#text"]}</span>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Acciones */}
      <div className="flex gap-3 pb-2">
        <button
          onClick={duplicar}
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
          Nueva factura a partir de esta
        </button>
      </div>
    </>
  );
}