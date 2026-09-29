"use client";
// Detalle de un comprobante emitido: arma la página con las secciones comunes
// a todos los tipos y deja el contenido específico (FAC, NC, ND, RET) en children.
//
// Cada sección vive en ./detalle/ y se encarga de su propio estado y de decidir
// si se muestra o no según el estado del documento.

import EstadoDocumento          from "./detalle/EstadoDocumento";
import SeccionCobro             from "./detalle/SeccionCobro";
import DocumentosVinculados     from "./detalle/DocumentosVinculados";
import ComprobantesRelacionados from "./detalle/ComprobantesRelacionados";
import PanelAnulacion           from "./detalle/PanelAnulacion";
import ErroresSRI               from "./detalle/ErroresSRI";
import ClaveAcceso              from "./detalle/ClaveAcceso";
import { type FacturaBase, esConsumidorFinal } from "./detalle/utils";

// Re-export: DetalleFactura, DetalleNC, DetalleNDB y DetalleRET siguen
// importando tipos y helpers desde "./DetalleShared" sin cambios.
export * from "./detalle/utils";

interface Props {
  factura:    FacturaBase;
  onRecargar: () => void;
  children:   React.ReactNode;
}

export default function DetalleShared({ factura, onRecargar, children }: Props) {
  const consumidorFinal = esConsumidorFinal(factura.datos);

  // La leyenda de consumidor final (en ComprobantesRelacionados) ya explica
  // por qué no se puede anular, así que el panel no se repite en ese caso.
  const mostrarAnulacion =
    !!factura.anulacion &&
    !factura.es_sandbox &&
    factura.estado_sri === "AUTORIZADO" &&
    !(consumidorFinal && !factura.anulacion.puede_anular);

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto space-y-4">
      <EstadoDocumento factura={factura} onRecargar={onRecargar} />
      <SeccionCobro factura={factura} onRecargar={onRecargar} />
      <DocumentosVinculados factura={factura} />
      <ComprobantesRelacionados factura={factura} consumidorFinal={consumidorFinal} />
      {mostrarAnulacion && <PanelAnulacion factura={factura} onRecargar={onRecargar} />}
      <ErroresSRI mensajesSri={factura.mensajes_sri} />
      <ClaveAcceso factura={factura} />

      {/* Contenido específico del tipo de documento */}
      {children}
    </div>
  );
}