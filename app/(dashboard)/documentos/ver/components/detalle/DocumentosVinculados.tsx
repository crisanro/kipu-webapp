"use client";
import { rutas } from "@/lib/rutas";
import { Link2 } from "lucide-react";
import { type FacturaBase, TIPO_LABEL, fmt } from "./utils";
import Seccion from "@/components/ui/Seccion";
import FilaLista from "@/components/ui/FilaLista";
import { InsigniaSri } from "@/components/ui/InsigniaEstado";

// Documento que originó este comprobante y los que se emitieron a partir de él,
// en una sección plegable: tocar uno lo abre.
export default function DocumentosVinculados({ factura }: { factura: FacturaBase }) {
  const origen     = factura.doc_origen_emitido;
  const derivados  = factura.documentos_derivados ?? [];
  const total      = (origen ? 1 : 0) + derivados.length;
  if (total === 0) return null;

  const fila = (d: any, etiqueta?: string) => (
    <FilaLista
      key={d.id}
      href={rutas.documento(d.id)}
      className="-mx-4 w-auto"
      titulo={<span className="font-mono">{d.numero_doc}</span>}
      subtitulo={[etiqueta, TIPO_LABEL[d.tipo_doc] ?? d.tipo_doc].filter(Boolean).join(" · ")}
      fin={`$${fmt(d.importe_total)}`}
      finAbajo={d.estado_sri ? <InsigniaSri estado={d.estado_sri} conIcono={false} /> : undefined}
    />
  );

  return (
    <Seccion
      titulo="Documentos relacionados"
      icono={Link2}
      resumen={total === 1 ? "1 documento" : `${total} documentos`}
    >
      <div className="-my-3 divide-y divide-borde">
        {origen && fila(origen, "Origen")}
        {derivados.map(d => fila(d))}
      </div>
    </Seccion>
  );
}
