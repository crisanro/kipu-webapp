"use client";
import { useRouter } from "next/navigation";
import { Copy, FileMinus, FilePlus, Info, Lock, Receipt } from "lucide-react";
import type { FacturaBase } from "./utils";
import { tipoIvaDesdeXml } from "@/lib/iva";
import type { Accion } from "@/components/ui/HojaAcciones";
import { useAuthStore } from "@/store/auth.store";
import { rutaFueraDelPlan } from "@/lib/plataforma";
import { aplicaALaEmpresa, bloqueadoPorPlan } from "@/components/dashboard/DashboardNav";

// Retención: misma regla que el menú (DashboardNav). Sin retenciones activadas no
// aparece; sin Kipu Pro / Al Día va con candado y lleva a planes (en la app no aparece).
const RET = { href: "/documentos/emitir/ret", requierePro: true, requiereRetenciones: true };

const NO_CONSUMIDOR_FINAL = "No se permite con Consumidor Final";

/**
 * Emitir NC, ND o RET a partir de este comprobante, o crear uno nuevo copiándolo.
 * Son acciones del menú ⋮ de la tarjeta de arriba (EstadoDocumento).
 */
export function useAccionesRelacionadas(factura: FacturaBase, consumidorFinal: boolean): Accion[] {
  const router  = useRouter();
  const empresa = useAuthStore((s) => s.empresa);
  if (factura.estado_sri !== "AUTORIZADO") return [];

  const verRet     = aplicaALaEmpresa(RET, empresa) && !rutaFueraDelPlan(RET.href, empresa);
  const retSinPlan = bloqueadoPorPlan(RET, empresa);
  const acciones: Accion[] = [];

  if (factura.tipo_doc === "FAC") {
    acciones.push(
      { etiqueta: "Emitir nota de crédito", icono: FileMinus, deshabilitada: consumidorFinal,
        descripcion: consumidorFinal ? NO_CONSUMIDOR_FINAL : "Devolución o descuento sobre esta factura",
        onClick: () => router.push(`/documentos/emitir/ncr?doc_id=${factura.id}`) },
      { etiqueta: "Emitir nota de débito", icono: FilePlus, deshabilitada: consumidorFinal,
        descripcion: consumidorFinal ? NO_CONSUMIDOR_FINAL : "Intereses o cargos adicionales",
        onClick: () => router.push(`/documentos/emitir/ndb?doc_id=${factura.id}`) },
    );
  }
  if (factura.tipo_doc === "LIQ" && verRet) {
    acciones.push({
      etiqueta: "Emitir retención al proveedor", icono: retSinPlan ? Lock : Receipt,
      descripcion: retSinPlan ? "Disponible en Kipu Pro" : undefined,
      onClick: () => router.push(retSinPlan ? "/planes" : `/documentos/emitir/ret?doc_origen_emitido_id=${factura.id}`),
    });
  }
  if (["FAC", "LIQ", "NCR"].includes(factura.tipo_doc)) {
    const esNc = factura.tipo_doc === "NCR";
    acciones.push({
      etiqueta: esNc ? "Nueva factura a partir de esta" : "Crear nueva a partir de esta",
      descripcion: "Mismo cliente e ítems, como borrador", icono: Copy,
      onClick: () => {
        const datos = factura.datos ?? {};
        const info = datos.infoFactura || datos.infoLiquidacionCompra || datos.infoNotaCredito || {};
        const detalles = datos.detalles?.detalle
          ? (Array.isArray(datos.detalles.detalle) ? datos.detalles.detalle : [datos.detalles.detalle])
          : [];
        const adicionales = datos.infoAdicional?.campoAdicional
          ? (Array.isArray(datos.infoAdicional.campoAdicional) ? datos.infoAdicional.campoAdicional : [datos.infoAdicional.campoAdicional])
          : [];
        const idComp = info.identificacionComprador || factura.cliente?.identificacion || "";
        const razon  = info.razonSocialComprador || factura.cliente?.razon_social || "";
        const tipoId = info.tipoIdentificacionComprador || "05";

        sessionStorage.setItem("kipu:prefill", JSON.stringify({
          cliente: idComp === "9999999999999" ? null : {
            identificacion: idComp,
            razon_social:   razon,
            tipo_id:        tipoId,
          },
          esConsumidorFinal: idComp === "9999999999999",
          items: detalles.map((d: any) => {
            return {
              // La NC trae codigoInterno; FAC y LIQ, codigoPrincipal
              codigo:          esNc ? (d.codigoInterno || "") : d.codigoPrincipal !== "S/C" ? d.codigoPrincipal : "",
              descripcion:     d.descripcion,
              cantidad:        parseFloat(d.cantidad),
              precio:          parseFloat(d.precioUnitario),
              descuento:       parseFloat(d.descuento || 0),
              tipo_descuento:  "$",
              tipo_iva:        tipoIvaDesdeXml(d.impuestos?.impuesto),
              unidad:          "UNIDAD",
            };
          }),
          camposAdicionales: adicionales
            .filter((a: any) => a["@nombre"] !== "PROVEEDOR_SISTEMA_INFORMATICO")
            .map((a: any) => ({ nombre: a["@nombre"], valor: a["#text"] })),
        }));
        router.push("/documentos/emitir/fac");
      },
    });
  }
  return acciones;
}

/** Por qué una factura a Consumidor Final no se puede anular ni corregir con notas. */
export function AvisoConsumidorFinal({ factura, consumidorFinal }: { factura: FacturaBase; consumidorFinal: boolean }) {
  if (!consumidorFinal || factura.estado_sri !== "AUTORIZADO" || !["FAC", "LIQ"].includes(factura.tipo_doc)) return null;
  return (
    <div className="flex items-start gap-2.5 rounded-xl border border-alerta/20 bg-alerta-suave px-4 py-3">
      <Info size={15} className="mt-0.5 shrink-0 text-alerta" aria-hidden />
      <p className="text-xs leading-relaxed text-tenue">
        Por normativa del SRI, las facturas a <span className="font-medium text-alerta-texto">Consumidor Final</span> no
        se pueden anular ni modificar con notas de crédito o débito una vez enviadas.
      </p>
    </div>
  );
}
