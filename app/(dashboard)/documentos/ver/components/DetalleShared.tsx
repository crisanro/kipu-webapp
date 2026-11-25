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
import { type FacturaBase, esConsumidorFinal } from "./detalle/utils";
import TirarParaRefrescar       from "@/components/ui/TirarParaRefrescar";

// Re-export: DetalleFactura, DetalleNC, DetalleNDB y DetalleRET siguen
// importando tipos y helpers desde "./DetalleShared" sin cambios.
export * from "./detalle/utils";

interface Props {
  factura:    FacturaBase;
  onRecargar: () => Promise<unknown> | void;
  children:   React.ReactNode;
}

export default function DetalleShared({ factura, onRecargar, children }: Props) {
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
      <div className="mx-auto max-w-3xl space-y-4 p-4 md:p-6">
        <EstadoDocumento factura={factura} onRecargar={recargar} consumidorFinal={consumidorFinal} />
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
