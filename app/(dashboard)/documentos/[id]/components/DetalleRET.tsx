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
  const datos   = factura.datos ?? {};
  const trib    = datos.infoTributaria    ?? {};
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
      <div
        className="rounded-xl p-4"
        style={{
          background: "var(--kipu-surface)",
          border: "1px solid var(--kipu-border)",
        }}
      >
        <h2 className="text-xs font-semibold mb-3 uppercase tracking-wide" style={{ color: "var(--kipu-subtle)" }}>Emisor</h2>
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

      {/* Sujeto retenido */}
      <div
        className="rounded-xl p-4"
        style={{
          background: "var(--kipu-surface)",
          border: "1px solid var(--kipu-border)",
        }}
      >
        <h2 className="text-xs font-semibold mb-3 uppercase tracking-wide" style={{ color: "var(--kipu-subtle)" }}>Sujeto Retenido</h2>
        <div className="space-y-2 text-sm">
          {[
            { label: "Razón Social",   value: infoRET.razonSocialSujetoRetenido },
            { label: "Tipo ID",        value: TIPO_ID[infoRET.tipoIdentificacionSujetoRetenido] ?? infoRET.tipoIdentificacionSujetoRetenido },
            { label: "Identificación", value: infoRET.identificacionSujetoRetenido },
            { label: "Período Fiscal", value: infoRET.periodoFiscal },
          ].map(({ label, value }) => (
            <div key={label} className="flex justify-between">
              <span style={{ color: "var(--kipu-muted)" }}>{label}</span>
              <span className="text-right max-w-[60%]" style={{ color: "var(--kipu-text)" }}>{value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Documento origen */}
      {(factura.doc_origen_emitido || factura.doc_origen_recibido) && (
        <div
          className="rounded-xl p-4"
          style={{
            background: "color-mix(in srgb, #60a5fa 5%, transparent)",
            border: "1px solid color-mix(in srgb, #60a5fa 20%, transparent)",
          }}
        >
          <h2 className="text-xs font-semibold mb-3 uppercase tracking-wide" style={{ color: "#60a5fa" }}>
            Documento Sustento
          </h2>
          {factura.doc_origen_emitido ? (
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-mono font-medium" style={{ color: "var(--kipu-text)" }}>
                  {factura.doc_origen_emitido.numero_doc}
                </p>
                <p className="text-xs" style={{ color: "var(--kipu-subtle)" }}>
                  Liquidación de Compra · ${fmt(factura.doc_origen_emitido.importe_total)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => router.push(`/documentos/${factura.doc_origen_emitido.id}`)}
                className="text-xs transition-colors"
                style={{ color: "#60a5fa" }}
              >
                Ver →
              </button>
            </div>
          ) : factura.doc_origen_recibido ? (
            <div>
              <p className="text-sm font-mono font-medium" style={{ color: "var(--kipu-text)" }}>
                {factura.doc_origen_recibido.numero_doc}
              </p>
              <p className="text-xs" style={{ color: "var(--kipu-subtle)" }}>
                {factura.doc_origen_recibido.razon_social_proveedor}
                {" · "}${fmt(factura.doc_origen_recibido.importe_total)}
              </p>
              <button
                type="button"
                onClick={() => router.push(`/documentos/recibidos/${factura.doc_origen_recibido_id}`)}
                className="mt-2 text-xs transition-colors"
                style={{ color: "#60a5fa" }}
              >
                Ver factura recibida →
              </button>
            </div>
          ) : null}
        </div>
      )}

      {/* Tabla de impuestos retenidos */}
      {impuestos.length > 0 && (
        <div
          className="rounded-xl overflow-hidden"
          style={{
            background: "var(--kipu-surface)",
            border: "1px solid var(--kipu-border)",
          }}
        >
          <div className="px-4 py-3" style={{ borderBottom: "2px solid var(--kipu-border)" }}>
            <h2 className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--kipu-subtle)" }}>
              Impuestos Retenidos
            </h2>
          </div>
          <div>
            {impuestos.map((imp: any, i: number) => (
              <div
                key={i}
                className="px-4 py-3 space-y-1"
                style={{ borderTop: i > 0 ? "1px solid var(--kipu-border)" : "none" }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span
                      className="text-xs px-2 py-0.5 rounded-full font-medium"
                      style={{
                        background: "color-mix(in srgb, #60a5fa 20%, transparent)",
                        color: "#60a5fa",
                      }}
                    >
                      {TIPO_IMPUESTO[imp.codigo] ?? imp.codigo}
                    </span>
                    <span className="text-sm font-mono" style={{ color: "var(--kipu-text)" }}>
                      {imp.codigoRetencion || imp.codigoPorcentaje}
                    </span>
                  </div>
                  <span className="text-sm font-bold" style={{ color: "#60a5fa" }}>
                    ${fmt(imp.valorRetenido || imp.valor)}
                  </span>
                </div>
                <div className="flex justify-between text-xs pl-1" style={{ color: "var(--kipu-subtle)" }}>
                  <span>
                    Base: ${fmt(imp.baseImponible)} ×{" "}
                    {imp.porcentajeRetener || imp.tarifa}%
                  </span>
                  <span>
                    Doc: {DOCS_SUSTENTO[imp.codDocSustento] ?? imp.codDocSustento}
                    {" · "}{imp.numDocSustento}
                  </span>
                </div>
                <p className="text-xs pl-1" style={{ color: "var(--kipu-muted)" }}>
                  Fecha sustento: {imp.fechaEmisionDocSustento}
                </p>
              </div>
            ))}
          </div>
          <div
            className="px-4 py-3 flex justify-between font-bold"
            style={{ borderTop: "2px solid var(--kipu-border)" }}
          >
            <span className="text-sm" style={{ color: "var(--kipu-muted)" }}>Total retenido</span>
            <span style={{ color: "#60a5fa" }}>${fmt(totalRetenido)}</span>
          </div>
        </div>
      )}

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
    </>
  );
}