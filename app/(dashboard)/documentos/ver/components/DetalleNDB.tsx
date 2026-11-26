"use client";
import { rutas } from "@/lib/rutas";
import { useRouter } from "next/navigation";
import { User } from "lucide-react";
import Seccion from "@/components/ui/Seccion";
import Boton from "@/components/ui/Boton";
import { Dato, SeccionAdicionales, SeccionEmisor, SeccionFormaPago, TIPO_ID, type FacturaBase } from "./DetalleShared";
import { dosDecimales } from "@/lib/dinero";

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

  return (
    <>
      {/* Documento que modifica */}
      <section className="rounded-xl border border-borde bg-superficie p-4">
        <h2 className="mb-2 text-sm font-semibold text-texto">Documento que modifica</h2>
        <Dato etiqueta="Tipo"          valor={infoNDB.codDocModificado === "01" ? "Factura" : infoNDB.codDocModificado} />
        <Dato etiqueta="Número"        valor={<span className="font-mono">{infoNDB.numDocModificado || "—"}</span>} />
        <Dato etiqueta="Fecha emisión" valor={infoNDB.fechaEmisionDocSustento} />
        {factura.doc_origen_emitido_id && (
          <Boton variante="secundario" tamano="sm" className="mt-3"
                 onClick={() => router.push(rutas.documento(factura.doc_origen_emitido_id!))}>
            Ver documento original
          </Boton>
        )}
      </section>

      {/* Motivos */}
      {motivos.length > 0 && (
        <section className="overflow-hidden rounded-xl border border-borde bg-superficie">
          <h2 className="border-b border-borde px-4 py-3 text-sm font-semibold text-texto">Motivos</h2>
          <div className="divide-y divide-borde">
            {motivos.map((m: any, i: number) => (
              <div key={i} className="flex items-center justify-between gap-3 px-4 py-3">
                <span className="text-sm text-texto">{m.razon}</span>
                <span className="shrink-0 text-sm font-semibold tabular-nums text-texto">${dosDecimales(m.valor)}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Impuestos y total */}
      <section className="rounded-xl border border-borde bg-superficie p-4">
        <div className="space-y-1.5 text-sm tabular-nums">
          {impuestos.map((imp: any, i: number) => (
            <div key={i} className="flex justify-between text-tenue">
              <span>IVA {imp.tarifa}% · Base ${dosDecimales(imp.baseImponible)}</span>
              <span>${dosDecimales(imp.valor)}</span>
            </div>
          ))}
          <div className={`flex justify-between text-base font-bold text-texto ${impuestos.length > 0 ? "mt-2 border-t border-borde pt-2" : ""}`}>
            <span>Total nota de débito</span>
            <span>${dosDecimales(infoNDB.valorTotal)}</span>
          </div>
        </div>
      </section>

      {/* Cliente */}
      <Seccion titulo="Cliente" icono={User} resumen={infoNDB.identificacionComprador}>
        <Dato etiqueta="Razón social"   valor={infoNDB.razonSocialComprador} />
        <Dato etiqueta="Tipo ID"        valor={TIPO_ID[infoNDB.tipoIdentificacionComprador] ?? infoNDB.tipoIdentificacionComprador} />
        <Dato etiqueta="Identificación" valor={infoNDB.identificacionComprador} />
      </Seccion>

      {/* Pagos */}
      <SeccionFormaPago pagos={pagos} />

      {/* Info adicional */}
      <SeccionAdicionales datos={datos} />

      {/* Emisor */}
      <SeccionEmisor trib={trib} />
    </>
  );
}
