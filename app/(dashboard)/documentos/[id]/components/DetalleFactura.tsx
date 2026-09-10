"use client";
import { useRouter } from "next/navigation";
import { Copy, RotateCcw } from "lucide-react";
import {
  fmt, FORMA_PAGO, TIPO_ID, normalizarTarifa,
  type FacturaBase
} from "./DetalleShared";

interface Props { factura: FacturaBase; }

export default function DetalleFactura({ factura }: Props) {
  const router  = useRouter();
  const datos   = factura.datos ?? {};
  const trib    = datos.infoTributaria ?? {};
  const info    = datos.infoFactura ?? datos.infoLiquidacionCompra ?? {};

  const detalles = datos.detalles?.detalle
    ? (Array.isArray(datos.detalles.detalle) ? datos.detalles.detalle : [datos.detalles.detalle])
    : [];

  const pagos = info.pagos?.pago
    ? (Array.isArray(info.pagos.pago) ? info.pagos.pago : [info.pagos.pago])
    : [];

  const resumenImpuestos = datos.resumenImpuestos
    ? (Array.isArray(datos.resumenImpuestos) ? datos.resumenImpuestos : [datos.resumenImpuestos])
    : [];

  const adicionales = datos.infoAdicional?.campoAdicional
    ? (Array.isArray(datos.infoAdicional.campoAdicional) ? datos.infoAdicional.campoAdicional : [datos.infoAdicional.campoAdicional])
    : [];

  // Cliente desde datos JSONB o desde campo cliente del endpoint
  const cliente = factura.cliente ?? {};
  const razon   = info.razonSocialComprador   || datos.legacy_razon_comprador || cliente.razon_social || "—";
  const idComp  = info.identificacionComprador || datos.legacy_id_comprador   || cliente.identificacion || "—";
  const tipoId  = info.tipoIdentificacionComprador || "05";

  const duplicar = () => {
    sessionStorage.setItem("kipu:prefill", JSON.stringify({
      cliente: idComp === "9999999999999" ? null : {
        identificacion: idComp,
        razon_social:    razon,
        tipo_id:        tipoId,
      },
      esConsumidorFinal: idComp === "9999999999999",
      items: detalles.map((d: any) => {
        const imp    = d.impuestos?.impuesto;
        const impArr = Array.isArray(imp) ? imp : [imp];
        const tarifa = impArr[0]?.tarifa ?? "15";
        return {
          codigo:          d.codigoPrincipal !== "S/C" ? d.codigoPrincipal : "",
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
            { label: "Razón Social",   value: razon },
            { label: "Tipo ID",        value: TIPO_ID[tipoId] ?? tipoId },
            { label: "Identificación", value: idComp },
            { label: "Dirección",      value: info.dirEstablecimiento || cliente.direccion || "—" },
          ].map(({ label, value }) => (
            <div key={label} className="flex justify-between">
              <span style={{ color: "var(--kipu-muted)" }}>{label}</span>
              <span className="text-right max-w-[60%]" style={{ color: "var(--kipu-text)" }}>{value}</span>
            </div>
          ))}
        </div>
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
              Productos / Servicios
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
                        {item.codigoPrincipal && item.codigoPrincipal !== "S/C" && (
                          <span className="font-mono mr-2">{item.codigoPrincipal}</span>
                        )}
                        {parseFloat(item.cantidad).toFixed(2)} × ${parseFloat(item.precioUnitario).toFixed(4)}
                        {parseFloat(item.descuento || 0) > 0 && (
                          <span className="ml-2" style={{ color: "var(--kipu-warning)" }}>— Desc: ${fmt(item.descuento)}</span>
                        )}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-semibold" style={{ color: "var(--kipu-text)" }}>${fmt(item.precioTotalSinImpuesto)}</p>
                      {tarifa && <span className="text-xs" style={{ color: "var(--kipu-accent)" }}>IVA {tarifa}%</span>}
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
          Totales
        </h2>
        <div className="space-y-2 text-sm">
          {resumenImpuestos.map((imp: any, i: number) => (
            <div key={`sub-${i}`} className="flex justify-between" style={{ color: "var(--kipu-muted)" }}>
              <span>Subtotal {imp.tarifa}%</span>
              <span>${fmt(imp.baseImponible)}</span>
            </div>
          ))}
          {parseFloat(info.totalDescuento) > 0 && (
            <div className="flex justify-between" style={{ color: "var(--kipu-warning)" }}>
              <span>Descuento</span>
              <span>-${fmt(info.totalDescuento)}</span>
            </div>
          )}
          {resumenImpuestos.filter((imp: any) => parseFloat(imp.valor) > 0).map((imp: any, i: number) => (
            <div key={`iva-${i}`} className="flex justify-between" style={{ color: "var(--kipu-muted)" }}>
              <span>IVA {imp.tarifa}%</span>
              <span>${fmt(imp.valor)}</span>
            </div>
          ))}
          {parseFloat(info.propina) > 0 && (
            <div className="flex justify-between" style={{ color: "var(--kipu-muted)" }}>
              <span>Propina</span>
              <span>${fmt(info.propina)}</span>
            </div>
          )}
          <div
            className="flex justify-between font-bold text-base pt-2 mt-2"
            style={{ borderTop: "1px solid var(--kipu-border)", color: "var(--kipu-text)" }}
          >
            <span>Total</span>
            <span>${fmt(factura.importe_total)}</span>
          </div>
        </div>
      </div>

      {/* Formas de pago */}
      {pagos.length > 0 && (
        <div
          className="rounded-xl p-4"
          style={{
            background: "var(--kipu-surface)",
            border: "1px solid var(--kipu-border)",
          }}
        >
          <h2 className="text-xs font-semibold mb-3 uppercase tracking-wide" style={{ color: "var(--kipu-subtle)" }}>
            Forma de Pago
          </h2>
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
        {factura.estado_sri === "AUTORIZADO" && factura.tipo_doc === "FAC" && (
          <button
            onClick={() => router.push(`/documentos/${factura.id}/nota-credito`)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs transition-colors"
            style={{
              background: "color-mix(in srgb, var(--kipu-danger) 10%, transparent)",
              color: "var(--kipu-danger)",
              border: "1px solid color-mix(in srgb, var(--kipu-danger) 20%, transparent)",
            }}
            onMouseEnter={e => e.currentTarget.style.background = "color-mix(in srgb, var(--kipu-danger) 20%, transparent)"}
            onMouseLeave={e => e.currentTarget.style.background = "color-mix(in srgb, var(--kipu-danger) 10%, transparent)"}
          >
            <RotateCcw size={13} />
            Nota de crédito
          </button>
        )}
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
          Crear nueva a partir de esta
        </button>
      </div>
    </>
  );
}