"use client";

import { notFound, useRouter, useSearchParams } from "next/navigation";
import { FileText } from "lucide-react";
import { useLista } from "@/lib/useLista";
import { Esqueleto, EsqueletoFilas } from "@/components/ui/Esqueleto";
import Vacio from "@/components/ui/Vacio";
import Boton from "@/components/ui/Boton";
import DetalleShared, { type FacturaBase } from "./components/DetalleShared";
import DetalleFactura from "./components/DetalleFactura";
import DetalleNC      from "./components/DetalleNC";
import DetalleNDB     from "./components/DetalleNDB";
import DetalleRET     from "./components/DetalleRET";

// /documentos/ver?id=… (antes /documentos/[id]; ver lib/rutas.ts). La key hace
// que otro id sea otra pantalla, sin arrastrar el estado del anterior.
export default function DetalleDocumentoPage() {
  const id = useSearchParams().get("id");
  if (!id) notFound();
  return <DetalleDocumento key={id} id={id} />;
}

function DetalleDocumento({ id }: { id: string }) {
  const router = useRouter();
  // Con caché: al volver de una NC o de la lista, el comprobante aparece al instante
  // y se actualiza por detrás (lib/useLista.ts)
  const res       = useLista<{ data?: any }>(`/api/v1/app/documentos/${id}`);
  const documento = res.datos?.data;

  if (res.cargando) {
    return (
      <div className="mx-auto max-w-3xl space-y-4 p-4 md:p-6" aria-busy="true">
        <Esqueleto className="h-52 rounded-2xl" />
        <EsqueletoFilas filas={4} />
      </div>
    );
  }

  if (!documento) {
    // 404/403: no existe o es de otra empresa. Otro error: la conexión, se puede reintentar.
    const estado   = (res.error as { response?: { status?: number } } | undefined)?.response?.status;
    const deRed    = !!res.error && estado !== 404 && estado !== 403;
    return (
      <Vacio
        icono={FileText}
        titulo={deRed ? "No pudimos cargar el comprobante" : "Comprobante no encontrado"}
        descripcion={deRed ? "Revisa tu conexión e intenta de nuevo." : "Puede que sea de otra empresa o que ya no exista."}
        accion={deRed
          ? <Boton onClick={() => void res.recargar()}>Reintentar</Boton>
          : <Boton variante="secundario" onClick={() => router.push("/documentos")}>Ir a Documentos</Boton>}
        className="py-20"
      />
    );
  }

  // Normalizar estructura al modelo unificado
  const docBase: FacturaBase = {
    id:                      documento.id,
    numero_doc:              documento.numero_doc,
    clave_acceso:            documento.clave_acceso,
    fecha_emision:           documento.fecha_emision,
    estado_sri:              documento.estado_sri,
    estado_cobro:            documento.estado_cobro,
    forma_pago_cobro:        documento.forma_pago_cobro,
    numero_comprobante_pago: documento.numero_comprobante_pago,
    fecha_pago:              documento.fecha_pago,
    tipo_doc:                documento.tipo_doc, // FAC|LIQ|NCR|NDB|RET
    cod_doc:                 documento.cod_doc,
    mensajes_sri:            documento.mensajes_sri,
    fecha_autorizacion:      documento.fecha_autorizacion,
    motivo_anulacion:        documento.motivo_anulacion ?? null,
    fecha_anulacion:         documento.fecha_anulacion ?? null,
    importe_total:           documento.importe_total,
    datos:                   documento.datos ?? {},
    doc_origen_emitido_id:   documento.doc_origen_emitido_id,
    doc_origen_recibido_id:  documento.doc_origen_recibido_id,
    documentos_derivados:    documento.documentos_derivados ?? [],
    doc_origen_emitido:      documento.doc_origen_emitido  ?? null,
    doc_origen_recibido:     documento.doc_origen_recibido ?? null,
    cliente:                 documento.cliente ?? {},
    email_comprador:         documento.email_comprador ?? null,
    es_sandbox:              documento.es_sandbox ?? false,
    anulacion:               documento.anulacion ?? null,
    ultimo_error_tecnico:    documento.ultimo_error_tecnico ?? null,
    sri_verificado_at:       documento.sri_verificado_at ?? null,
  };

  const renderContenido = () => {
    switch (docBase.tipo_doc) {
      case "NCR": return <DetalleNC  factura={docBase} />;
      case "NDB": return <DetalleNDB factura={docBase} />;
      case "RET": return <DetalleRET factura={docBase} />;
      case "LIQ":
      case "FAC":
      default:    return <DetalleFactura factura={docBase} />;
    }
  };

  return (
    <DetalleShared factura={docBase} onRecargar={res.recargar}>
      {renderContenido()}
    </DetalleShared>
  );
}
