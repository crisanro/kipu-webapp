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

      {/* Cliente */}
      <div
        className="rounded-xl p-4"
        style={{
          background: "var(--kipu-surface)",
          border: "1px solid var(--kipu-border)",
        }}
      >
        <h2 className="text-xs font-semibold mb-3 uppercase tracking-wide" style={{ color: "var(--kipu-subtle)" }}>Cliente</h2>
        <div className="space-y-2 text-sm">
          {[
            { label: "Razón Social",   value: infoNDB.razonSocialComprador },
            { label: "Tipo ID",        value: TIPO_ID[infoNDB.tipoIdentificacionComprador] ?? infoNDB.tipoIdentificacionComprador },
            { label: "Identificación", value: infoNDB.identificacionComprador },
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
          background: "color-mix(in srgb, var(--kipu-warning) 5%, transparent)",
          border: "1px solid color-mix(in srgb, var(--kipu-warning) 20%, transparent)",
        }}
      >
        <h2 className="text-xs font-semibold mb-3 uppercase tracking-wide" style={{ color: "var(--kipu-warning)" }}>
          Documento que Modifica
        </h2>
        <div className="space-y-2 text-sm">
          {[
            { label: "Tipo",          value: infoNDB.codDocModificado === "01" ? "Factura" : infoNDB.codDocModificado },
            { label: "Número",        value: infoNDB.numDocModificado || "—" },
            { label: "Fecha emisión", value: infoNDB.fechaEmisionDocSustento },
          ].map(({ label, value }) => (
            <div key={label} className="flex justify-between">
              <span style={{ color: "var(--kipu-muted)" }}>{label}</span>
              <span className="text-right max-w-[60%] font-medium" style={{ color: "var(--kipu-text)" }}>{value}</span>
            </div>
          ))}
        </div>
        {factura.doc_origen_emitido_id && (
          <button
            onClick={() => router.push(`/documentos/${factura.doc_origen_emitido_id}`)}
            className="mt-3 text-xs transition-colors underline-offset-2 hover:underline"
            style={{ color: "var(--kipu-warning)" }}
          >
            Ver documento original →
          </button>
        )}
      </div>

      {/* Motivos */}
      {motivos.length > 0 && (
        <div
          className="rounded-xl overflow-hidden"
          style={{
            background: "var(--kipu-surface)",
            border: "1px solid var(--kipu-border)",
          }}
        >
          <div
            className="px-4 py-3"
            style={{ borderBottom: "2px solid var(--kipu-border)" }}
          >
            <h2 className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--kipu-subtle)" }}>Motivos</h2>
          </div>
          <div>
            {motivos.map((m: any, i: number) => (
              <div
                key={i}
                className="flex items-center justify-between px-4 py-3"
                style={{
                  borderTop: i > 0 ? "1px solid var(--kipu-border)" : "none",
                }}
              >
                <span className="text-sm" style={{ color: "var(--kipu-text)" }}>{m.razon}</span>
                <span className="text-sm font-bold" style={{ color: "var(--kipu-warning)" }}>${fmt(m.valor)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Impuestos */}
      {impuestos.length > 0 && (
        <div
          className="rounded-xl p-4"
          style={{
            background: "var(--kipu-surface)",
            border: "1px solid var(--kipu-border)",
          }}
        >
          <h2 className="text-xs font-semibold mb-3 uppercase tracking-wide" style={{ color: "var(--kipu-subtle)" }}>Impuestos</h2>
          <div className="space-y-2 text-sm">
            {impuestos.map((imp: any, i: number) => (
              <div key={i} className="flex justify-between" style={{ color: "var(--kipu-muted)" }}>
                <span>IVA {imp.tarifa}% · Base ${fmt(imp.baseImponible)}</span>
                <span>${fmt(imp.valor)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Total */}
      <div
        className="rounded-xl p-4"
        style={{
          background: "var(--kipu-surface)",
          border: "1px solid var(--kipu-border)",
        }}
      >
        <div className="flex justify-between font-bold text-base" style={{ color: "var(--kipu-warning)" }}>
          <span>Total nota de débito</span>
          <span>${fmt(infoNDB.valorTotal)}</span>
        </div>
      </div>

      {/* Pagos */}
      {pagos.length > 0 && (
        <div
          className="rounded-xl p-4"
          style={{
            background: "var(--kipu-surface)",
            border: "1px solid var(--kipu-border)",
          }}
        >
          <h2 className="text-xs font-semibold mb-3 uppercase tracking-wide" style={{ color: "var(--kipu-subtle)" }}>Forma de Pago</h2>
          <div className="space-y-2">
            {pagos.map((pago: any, i: number) => (
              <div key={i} className="flex justify-between text-sm">
                <span style={{ color: "var(--kipu-muted)" }}>{FORMA_PAGO[pago.formaPago] ?? pago.formaPago}</span>
                <span className="font-medium" style={{ color: "var(--kipu-text)" }}>${fmt(pago.total)}</span>
              </div>
            ))}
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
          <h2 className="text-xs font-semibold mb-3 uppercase tracking-wide" style={{ color: "var(--kipu-subtle)" }}>Información Adicional</h2>
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