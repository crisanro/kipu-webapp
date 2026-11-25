"use client";
import { Building2, CreditCard, Info, User } from "lucide-react";
import Seccion from "@/components/ui/Seccion";
import {
  fmt, FORMA_PAGO, TIPO_ID,
  type FacturaBase
} from "./DetalleShared";

interface Props { factura: FacturaBase; }

/** Fila etiqueta → valor de las secciones (Cliente, Emisor, Pago…). */
export function Dato({ etiqueta, valor }: { etiqueta: string; valor: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4 py-1 text-sm">
      <span className="shrink-0 text-tenue">{etiqueta}</span>
      <span className="min-w-0 break-words text-right text-texto">{valor}</span>
    </div>
  );
}

export default function DetalleFactura({ factura }: Props) {
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

  const adicionales = (datos.infoAdicional?.campoAdicional
    ? (Array.isArray(datos.infoAdicional.campoAdicional) ? datos.infoAdicional.campoAdicional : [datos.infoAdicional.campoAdicional])
    : []).filter((a: any) => a["@nombre"] !== "PROVEEDOR_SISTEMA_INFORMATICO");

  // Contraparte: comprador (FAC) o proveedor (LIQ)
  const esLiq   = factura.tipo_doc === "LIQ";
  const cliente = factura.cliente ?? {};
  const razon   = (esLiq ? info.razonSocialProveedor   : info.razonSocialComprador)
                  || datos.legacy_razon_comprador || cliente.razon_social || "—";
  const idComp  = (esLiq ? info.identificacionProveedor : info.identificacionComprador)
                  || datos.legacy_id_comprador   || cliente.identificacion || "—";
  const tipoId  = (esLiq ? info.tipoIdentificacionProveedor : info.tipoIdentificacionComprador) || "05";
  const direccion = (esLiq ? info.direccionProveedor : info.direccionComprador)
                  || cliente.direccion || "—";

  const formaPago = (p: any) => FORMA_PAGO[p.formaPago] ?? p.formaPago;

  return (
    <>
      {/* Ítems */}
      {detalles.length > 0 && (
        <section className="overflow-hidden rounded-xl border border-borde bg-superficie">
          <h2 className="border-b border-borde px-4 py-3 text-sm font-semibold text-texto">
            {detalles.length === 1 ? "1 ítem" : `${detalles.length} ítems`}
          </h2>
          <div className="divide-y divide-borde">
            {detalles.map((item: any, i: number) => {
              const imp    = item.impuestos?.impuesto;
              const impArr = Array.isArray(imp) ? imp : [imp];
              const tarifa = impArr[0]?.tarifa ?? null;
              return (
                <div key={i} className="flex items-start justify-between gap-3 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-texto">{item.descripcion}</p>
                    <p className="mt-0.5 text-xs text-sutil">
                      {item.codigoPrincipal && item.codigoPrincipal !== "S/C" && (
                        <span className="mr-2 font-mono">{item.codigoPrincipal}</span>
                      )}
                      {parseFloat(item.cantidad).toFixed(2)} × ${parseFloat(item.precioUnitario).toFixed(4)}
                      {parseFloat(item.descuento || 0) > 0 && (
                        <span className="ml-2 text-alerta-texto">— Desc: ${fmt(item.descuento)}</span>
                      )}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-sm font-semibold tabular-nums text-texto">${fmt(item.precioTotalSinImpuesto)}</p>
                    {tarifa && <span className="text-xs text-sutil">IVA {tarifa}%</span>}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Totales */}
      <section className="rounded-xl border border-borde bg-superficie p-4">
        <div className="space-y-1.5 text-sm tabular-nums">
          {resumenImpuestos.map((imp: any, i: number) => (
            <div key={`sub-${i}`} className="flex justify-between text-tenue">
              <span>Subtotal {imp.tarifa}%</span>
              <span>${fmt(imp.baseImponible)}</span>
            </div>
          ))}
          {parseFloat(info.totalDescuento) > 0 && (
            <div className="flex justify-between text-alerta-texto">
              <span>Descuento</span>
              <span>-${fmt(info.totalDescuento)}</span>
            </div>
          )}
          {resumenImpuestos.filter((imp: any) => parseFloat(imp.valor) > 0).map((imp: any, i: number) => (
            <div key={`iva-${i}`} className="flex justify-between text-tenue">
              <span>IVA {imp.tarifa}%</span>
              <span>${fmt(imp.valor)}</span>
            </div>
          ))}
          {parseFloat(info.propina) > 0 && (
            <div className="flex justify-between text-tenue">
              <span>Propina</span>
              <span>${fmt(info.propina)}</span>
            </div>
          )}
          <div className="mt-2 flex justify-between border-t border-borde pt-2 text-base font-bold text-texto">
            <span>Total</span>
            <span>${fmt(factura.importe_total)}</span>
          </div>
        </div>
      </section>

      {/* Cliente o proveedor */}
      <Seccion titulo={esLiq ? "Proveedor" : "Cliente"} icono={User} resumen={idComp !== "—" ? idComp : undefined}>
        <Dato etiqueta="Razón social"   valor={razon} />
        <Dato etiqueta="Tipo ID"        valor={TIPO_ID[tipoId] ?? tipoId} />
        <Dato etiqueta="Identificación" valor={idComp} />
        <Dato etiqueta="Dirección"      valor={direccion} />
        {factura.email_comprador && <Dato etiqueta="Correo" valor={factura.email_comprador} />}
      </Seccion>

      {/* Formas de pago */}
      {pagos.length > 0 && (
        <Seccion titulo="Forma de pago" icono={CreditCard}
                 resumen={pagos.length === 1 ? formaPago(pagos[0]) : `${pagos.length} formas`}>
          {pagos.map((pago: any, i: number) => (
            <Dato key={i} etiqueta={formaPago(pago)} valor={<span className="font-medium tabular-nums">${fmt(pago.total)}</span>} />
          ))}
        </Seccion>
      )}

      {/* Info adicional */}
      {adicionales.length > 0 && (
        <Seccion titulo="Información adicional" icono={Info}
                 resumen={adicionales.length === 1 ? "1 campo" : `${adicionales.length} campos`}>
          {adicionales.map((campo: any, i: number) => (
            <Dato key={i} etiqueta={campo["@nombre"]} valor={campo["#text"]} />
          ))}
        </Seccion>
      )}

      {/* Emisor */}
      <Seccion titulo="Emisor" icono={Building2} resumen={trib.ruc}>
        <Dato etiqueta="Razón social"    valor={trib.razonSocial} />
        <Dato etiqueta="RUC"             valor={trib.ruc} />
        <Dato etiqueta="Dirección"       valor={trib.dirMatriz} />
        <Dato etiqueta="Establecimiento" valor={`${trib.estab}-${trib.ptoEmi}`} />
        <Dato etiqueta="Ambiente"        valor={trib.ambiente == 2 ? "Producción" : "Pruebas"} />
      </Seccion>
    </>
  );
}
