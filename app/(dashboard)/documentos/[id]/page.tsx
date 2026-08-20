// app/(dashboard)/documentos/[id]/page.tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { Loader2, FileText } from "lucide-react";
import api from "@/lib/api";
import DetalleShared  from "./components/DetalleShared";
import DetalleFactura from "./components/DetalleFactura";
import DetalleNC      from "./components/DetalleNC";
import DetalleNDB     from "./components/DetalleNDB";
import DetalleRET     from "./components/DetalleRET";

export default function DetalleDocumentoPage() {
  const { id }  = useParams();
  const router  = useRouter();
  const [documento, setDocumento] = useState<any>(null);
  const [loading,   setLoading]   = useState(true);

  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get(`/api/v1/app/documentos/${id}`);
      setDocumento(res.data.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { cargar(); }, [cargar]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 size={24} className="animate-spin text-indigo-400" />
      </div>
    );
  }

  if (!documento) {
    return (
      <div className="p-6 text-center">
        <FileText size={40} className="text-gray-700 mx-auto mb-3" />
        <p className="text-gray-500">Comprobante no encontrado.</p>
        <button onClick={() => router.back()} className="mt-4 text-indigo-400 text-sm">
          Volver
        </button>
      </div>
    );
  }

  // Normalizar estructura al modelo unificado
  const docBase = {
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
    importe_total:           documento.importe_total,
    datos:                   documento.datos ?? {},
    doc_origen_emitido_id:   documento.doc_origen_emitido_id,
    doc_origen_recibido_id:  documento.doc_origen_recibido_id,
    documentos_derivados:    documento.documentos_derivados ?? [],
    doc_origen_emitido:      documento.doc_origen_emitido  ?? null,
    doc_origen_recibido:     documento.doc_origen_recibido ?? null,
    cliente:                 documento.cliente ?? {},
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
    <DetalleShared factura={docBase} onRecargar={cargar}>
      {renderContenido()}
    </DetalleShared>
  );
}