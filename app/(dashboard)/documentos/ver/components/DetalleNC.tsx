"use client";
import { rutas } from "@/lib/rutas";
import { useRouter } from "next/navigation";
import { Building2, Info, User } from "lucide-react";
import Seccion from "@/components/ui/Seccion";
import Boton from "@/components/ui/Boton";
import { TIPO_ID, type FacturaBase } from "./DetalleShared";
import { Dato } from "./DetalleFactura";
import { dosDecimales } from "@/lib/dinero";

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

  const adicionales = (datos.infoAdicional?.campoAdicional
    ? (Array.isArray(datos.infoAdicional.campoAdicional) ? datos.infoAdicional.campoAdicional : [datos.infoAdicional.campoAdicional])
    : []).filter((a: any) => a["@nombre"] !== "PROVEEDOR_SISTEMA_INFORMATICO");

  // «Nueva factura a partir de esta» está en el menú ⋮ (ComprobantesRelacionados)

  return (
    <>
      {/* Documento que modifica: lo primero que se quiere saber de una NC */}
      <section className="rounded-xl border border-borde bg-superficie p-4">
        <h2 className="mb-2 text-sm font-semibold text-texto">Documento que modifica</h2>
        <Dato etiqueta="Tipo"          valor={infoNC.codDocModificado === "01" ? "Factura" : infoNC.codDocModificado} />
        <Dato etiqueta="Número"        valor={<span className="font-mono">{infoNC.numDocModificado || "—"}</span>} />
        <Dato etiqueta="Fecha emisión" valor={infoNC.fechaEmisionDocSustento} />
        <Dato etiqueta="Motivo"        valor={<span className="font-medium">{infoNC.motivo}</span>} />
        {factura.doc_origen_emitido_id && (
          <Boton variante="secundario" tamano="sm" className="mt-3"
                 onClick={() => router.push(rutas.documento(factura.doc_origen_emitido_id!))}>
            Ver documento original
          </Boton>
        )}
      </section>

      {/* Ítems */}
      {detalles.length > 0 && (
        <section className="overflow-hidden rounded-xl border border-borde bg-superficie">
          <h2 className="border-b border-borde px-4 py-3 text-sm font-semibold text-texto">
            Ítems acreditados ({detalles.length})
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
                      {item.codigoInterno && item.codigoInterno !== "S/C" && (
                        <span className="mr-2 font-mono">{item.codigoInterno}</span>
                      )}
                      {parseFloat(item.cantidad).toFixed(2)} × ${parseFloat(item.precioUnitario).toFixed(4)}
                      {parseFloat(item.descuento || 0) > 0 && (
                        <span className="ml-2 text-alerta-texto">— Desc: ${dosDecimales(item.descuento)}</span>
                      )}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-sm font-semibold tabular-nums text-tenue">-${dosDecimales(item.precioTotalSinImpuesto)}</p>
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
              <span>${dosDecimales(imp.baseImponible)}</span>
            </div>
          ))}
          {resumenImpuestos.filter((imp: any) => parseFloat(imp.valor) > 0).map((imp: any, i: number) => (
            <div key={`iva-${i}`} className="flex justify-between text-tenue">
              <span>IVA {imp.tarifa}%</span>
              <span>${dosDecimales(imp.valor)}</span>
            </div>
          ))}
          <div className="mt-2 flex justify-between border-t border-borde pt-2 text-base font-bold text-texto">
            <span>Total acreditado</span>
            <span>-${dosDecimales(infoNC.valorModificacion)}</span>
          </div>
        </div>
      </section>

      {/* Cliente */}
      <Seccion titulo="Cliente" icono={User} resumen={infoNC.identificacionComprador}>
        <Dato etiqueta="Razón social"   valor={infoNC.razonSocialComprador} />
        <Dato etiqueta="Tipo ID"        valor={TIPO_ID[infoNC.tipoIdentificacionComprador] ?? infoNC.tipoIdentificacionComprador} />
        <Dato etiqueta="Identificación" valor={infoNC.identificacionComprador} />
      </Seccion>

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
