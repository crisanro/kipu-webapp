"use client";
// Detalle de un comprobante emitido: arma la página con las secciones comunes
// a todos los tipos y deja el contenido específico (FAC, NC, ND, RET) en children.
//
// Orden (como una app): arriba el monto, el estado y las acciones (⋮ para el
// resto); si hay algo que atender (errores del SRI, cobro, anulación) va después;
// luego el contenido (ítems y totales) y al final las secciones plegables.
//
// Cada sección vive en ./detalle/ y se encarga de su propio estado y de decidir
// si se muestra o no según el estado del documento.

import EstadoDocumento          from "./detalle/EstadoDocumento";
import SeccionCobro             from "./detalle/SeccionCobro";
import DocumentosVinculados     from "./detalle/DocumentosVinculados";
import { AvisoConsumidorFinal } from "./detalle/ComprobantesRelacionados";
import PanelAnulacion           from "./detalle/PanelAnulacion";
import ErroresSRI               from "./detalle/ErroresSRI";
import ClaveAcceso              from "./detalle/ClaveAcceso";
import { type FacturaBase, FORMA_PAGO, esConsumidorFinal } from "./detalle/utils";
import TirarParaRefrescar       from "@/components/ui/TirarParaRefrescar";
import Seccion                  from "@/components/ui/Seccion";
import { Building2, CreditCard, Info } from "lucide-react";
import { dosDecimales }         from "@/lib/dinero";

// Re-export: DetalleFactura, DetalleNC, DetalleNDB y DetalleRET siguen
// importando tipos y helpers desde "./DetalleShared" sin cambios.
export * from "./detalle/utils";

interface Props {
  factura:    FacturaBase;
  onRecargar: () => Promise<unknown> | void;
  children:   React.ReactNode;
  /** En el panel de la derecha de Documentos (compu): sin flecha atrás y márgenes de panel. */
  enPanel?:   boolean;
}

export default function DetalleShared({ factura, onRecargar, children, enPanel = false }: Props) {
  const consumidorFinal = esConsumidorFinal(factura.datos);
  const recargar = () => { void onRecargar(); };

  // La leyenda de consumidor final ya explica por qué no se puede anular, así
  // que el panel no se repite en ese caso.
  const mostrarAnulacion =
    !!factura.anulacion &&
    !factura.es_sandbox &&
    factura.estado_sri === "AUTORIZADO" &&
    !(consumidorFinal && !factura.anulacion.puede_anular);

  return (
    <TirarParaRefrescar alRefrescar={onRecargar}>
      <div className={enPanel ? "space-y-4 p-4" : "mx-auto max-w-3xl space-y-4 p-4 md:p-6"}>
        <EstadoDocumento factura={factura} onRecargar={recargar} consumidorFinal={consumidorFinal} enPanel={enPanel} />
        <ErroresSRI mensajesSri={factura.mensajes_sri} />
        <SeccionCobro factura={factura} onRecargar={recargar} />
        {/* La key reinicia el panel cuando cambia el estado (no quedan mensajes viejos) */}
        {mostrarAnulacion && (
          <PanelAnulacion key={`${factura.estado_sri}-${factura.anulacion?.estado ?? ""}`}
                          factura={factura} onRecargar={recargar} />
        )}

        {/* Contenido específico del tipo de documento: ítems, totales y sus secciones */}
        {children}

        <AvisoConsumidorFinal factura={factura} consumidorFinal={consumidorFinal} />
        <DocumentosVinculados factura={factura} />
        <ClaveAcceso factura={factura} />
      </div>
    </TirarParaRefrescar>
  );
}

// ── Secciones de Factura, Nota de crédito y Nota de débito ───────────────────
// Antes cada detalle tenía su copia (y NC y ND importaban Dato de DetalleFactura).

/** Fila etiqueta → valor de las secciones (Cliente, Emisor, Pago…). */
export function Dato({ etiqueta, valor }: { etiqueta: string; valor: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4 py-1 text-sm">
      <span className="shrink-0 text-tenue">{etiqueta}</span>
      <span className="min-w-0 break-words text-right text-texto">{valor}</span>
    </div>
  );
}

/** Campos adicionales del XML, sin el del proveedor del sistema (lo pone Kipu). */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function camposAdicionales(datos: any): { "@nombre": string; "#text": string }[] {
  const c = datos?.infoAdicional?.campoAdicional;
  return (c ? (Array.isArray(c) ? c : [c]) : [])
    .filter((a: { "@nombre": string }) => a["@nombre"] !== "PROVEEDOR_SISTEMA_INFORMATICO");
}

/** Forma de pago del XML (factura y nota de débito). */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function SeccionFormaPago({ pagos }: { pagos: any[] }) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const formaPago = (p: any) => FORMA_PAGO[p.formaPago] ?? p.formaPago;
  if (pagos.length === 0) return null;
  return (
    <Seccion titulo="Forma de pago" icono={CreditCard}
             resumen={pagos.length === 1 ? formaPago(pagos[0]) : `${pagos.length} formas`}>
      {pagos.map((pago, i) => (
        <Dato key={i} etiqueta={formaPago(pago)} valor={<span className="font-medium tabular-nums">${dosDecimales(pago.total)}</span>} />
      ))}
    </Seccion>
  );
}

/** Información adicional del XML (sin nada, no se muestra). */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function SeccionAdicionales({ datos }: { datos: any }) {
  const adicionales = camposAdicionales(datos);
  if (adicionales.length === 0) return null;
  return (
    <Seccion titulo="Información adicional" icono={Info}
             resumen={adicionales.length === 1 ? "1 campo" : `${adicionales.length} campos`}>
      {adicionales.map((campo, i) => <Dato key={i} etiqueta={campo["@nombre"]} valor={campo["#text"]} />)}
    </Seccion>
  );
}

/** Quién emitió (infoTributaria del XML). */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function SeccionEmisor({ trib }: { trib: any }) {
  return (
    <Seccion titulo="Emisor" icono={Building2} resumen={trib.ruc}>
      <Dato etiqueta="Razón social"    valor={trib.razonSocial} />
      <Dato etiqueta="RUC"             valor={trib.ruc} />
      <Dato etiqueta="Dirección"       valor={trib.dirMatriz} />
      <Dato etiqueta="Establecimiento" valor={`${trib.estab}-${trib.ptoEmi}`} />
      <Dato etiqueta="Ambiente"        valor={trib.ambiente == 2 ? "Producción" : "Pruebas"} />
    </Seccion>
  );
}
