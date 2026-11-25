"use client";
import { useRouter } from "next/navigation";
import {
  Copy, Info, Lock,
} from "lucide-react";
import { type FacturaBase, normalizarTarifa } from "./utils";
import { useAuthStore } from "@/store/auth.store";
import { rutaFueraDelPlan } from "@/lib/plataforma";
import { aplicaALaEmpresa, bloqueadoPorPlan } from "@/components/dashboard/DashboardNav";

// Retención: misma regla que el menú (DashboardNav). Sin retenciones activadas no
// aparece; sin Kipu Pro / Al Día va con candado y lleva a planes (en la app no aparece).
const RET = { href: "/documentos/emitir/ret", requierePro: true, requiereRetenciones: true };

// Acciones para emitir NC, ND o RET a partir de este comprobante, o duplicarlo.
export default function ComprobantesRelacionados({
  factura, consumidorFinal,
}: { factura: FacturaBase; consumidorFinal: boolean }) {
  const router  = useRouter();
  const empresa = useAuthStore((s) => s.empresa);
  const verRet  = aplicaALaEmpresa(RET, empresa) && !rutaFueraDelPlan(RET.href, empresa);
  const retSinPlan = bloqueadoPorPlan(RET, empresa);

  return (
    <>
      {/* Emitir comprobante relacionado */}
      {factura.estado_sri === "AUTORIZADO" && (
        <div
          className="rounded-xl p-4"
          style={{
            background: "var(--kipu-surface)",
            border: "1px solid var(--kipu-border)",
          }}
        >
          <h2 className="text-xs font-semibold mb-3 uppercase tracking-wide" style={{ color: "var(--kipu-subtle)" }}>
            Emitir comprobante relacionado
          </h2>

          <div className="flex flex-wrap gap-2">
            {factura.tipo_doc === "FAC" && (
              <>
                <button
                  onClick={consumidorFinal ? undefined : () => router.push(`/documentos/emitir/ncr?doc_id=${factura.id}`)}
                  disabled={consumidorFinal}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  style={{
                    background: "color-mix(in srgb, var(--kipu-muted) 10%, transparent)",
                    color: "var(--kipu-muted)",
                    border: "1px solid color-mix(in srgb, var(--kipu-muted) 20%, transparent)",
                  }}
                  onMouseEnter={e => { if (!consumidorFinal) e.currentTarget.style.background = "color-mix(in srgb, var(--kipu-muted) 20%, transparent)"; }}
                  onMouseLeave={e => { if (!consumidorFinal) e.currentTarget.style.background = "color-mix(in srgb, var(--kipu-muted) 10%, transparent)"; }}
                >
                  NCR · Nota de crédito
                </button>
                <button
                  onClick={consumidorFinal ? undefined : () => router.push(`/documentos/emitir/ndb?doc_id=${factura.id}`)}
                  disabled={consumidorFinal}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  style={{
                    background: "color-mix(in srgb, var(--kipu-warning) 10%, transparent)",
                    color: "var(--kipu-warning)",
                    border: "1px solid color-mix(in srgb, var(--kipu-warning) 20%, transparent)",
                  }}
                  onMouseEnter={e => { if (!consumidorFinal) e.currentTarget.style.background = "color-mix(in srgb, var(--kipu-warning) 20%, transparent)"; }}
                  onMouseLeave={e => { if (!consumidorFinal) e.currentTarget.style.background = "color-mix(in srgb, var(--kipu-warning) 10%, transparent)"; }}
                >
                  NDB · Nota de débito
                </button>
              </>
            )}
            {factura.tipo_doc === "LIQ" && verRet && (
              <button
                onClick={() => router.push(retSinPlan ? "/planes" : `/documentos/emitir/ret?doc_origen_emitido_id=${factura.id}`)}
                title={retSinPlan ? "Disponible en Kipu Pro" : undefined}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs transition-colors"
                style={{
                  background: "color-mix(in srgb, var(--kipu-info) 10%, transparent)",
                  color: "var(--kipu-info)",
                  border: "1px solid color-mix(in srgb, var(--kipu-info) 20%, transparent)",
                }}
                onMouseEnter={e => e.currentTarget.style.background = "color-mix(in srgb, var(--kipu-info) 20%, transparent)"}
                onMouseLeave={e => e.currentTarget.style.background = "color-mix(in srgb, var(--kipu-info) 10%, transparent)"}
              >
                {retSinPlan && <Lock size={12} aria-hidden />}
                RET · Retención al proveedor
              </button>
            )}

            {/* Duplicar / Crear nueva */}
            {["FAC", "LIQ"].includes(factura.tipo_doc) && (
              <button
                onClick={() => {
                  const datos = factura.datos ?? {};
                  const info = datos.infoFactura || datos.infoLiquidacionCompra || {};
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
                      const imp    = d.impuestos?.impuesto;
                      const impArr = Array.isArray(imp) ? imp : [imp];
                      const tarifa = impArr[0]?.tarifa ?? "15";
                      return {
                        codigo:          d.codigoPrincipal !== "S/C" ? d.codigoPrincipal : "",
                        descripcion:     d.descripcion,
                        cantidad:        parseFloat(d.cantidad),
                        precio:          parseFloat(d.precioUnitario),
                        descuento:       parseFloat(d.descuento || 0),
                        tipo_descuento:  "$",
                        tipo_iva:        normalizarTarifa(tarifa),
                        unidad:          "UNIDAD",
                      };
                    }),
                    camposAdicionales: adicionales
                      .filter((a: any) => a["@nombre"] !== "PROVEEDOR_SISTEMA_INFORMATICO")
                      .map((a: any) => ({ nombre: a["@nombre"], valor: a["#text"] })),
                  }));
                  router.push("/documentos/emitir/fac");
                }}
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
            )}
          </div>

          {/* Leyenda consumidor final */}
          {consumidorFinal && ["FAC", "LIQ"].includes(factura.tipo_doc) && (
            <div
              className="mt-3 rounded-lg px-3 py-2.5 flex items-start gap-2.5"
              style={{
                background: "color-mix(in srgb, var(--kipu-warning) 8%, transparent)",
                border: "1px solid color-mix(in srgb, var(--kipu-warning) 15%, transparent)",
              }}
            >
              <Info size={13} className="shrink-0 mt-0.5" style={{ color: "var(--kipu-warning)" }} />
              <p className="text-xs" style={{ color: "var(--kipu-muted)" }}>
                Por normativa del SRI, las facturas a <span className="font-medium" style={{ color: "var(--kipu-warning)" }}>Consumidor Final</span> no
                se pueden anular ni modificar con notas de crédito o débito una vez enviadas.
              </p>
            </div>
          )}
        </div>
      )}
    </>
  );
}