// app/(dashboard)/facturas/[id]/page.tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import { Loader2, FileText } from "lucide-react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";

import DetalleShared  from "./components/DetalleShared";
import DetalleFactura from "./components/DetalleFactura";
import DetalleNC      from "./components/DetalleNC";

export default function DetalleComprobantePage() {
  const { id }  = useParams();
  const router  = useRouter();

  const [factura, setFactura] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get(`/api/v1/app/dashboard/factura/${id}`);
      setFactura(res.data.factura);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { cargar(); }, [cargar]);

  // ── Loading ──────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 size={24} className="animate-spin text-indigo-400" />
      </div>
    );
  }

  // ── No encontrado ────────────────────────────────────────────────────────────
  if (!factura) {
    return (
      <div className="p-6 text-center">
        <FileText size={40} className="text-gray-700 mx-auto mb-3" />
        <p className="text-gray-500">Comprobante no encontrado.</p>
        <button
          onClick={() => router.back()}
          className="mt-4 text-indigo-400 text-sm"
        >
          Volver
        </button>
      </div>
    );
  }

  // ── Normalizar estructura ────────────────────────────────────────────────────
  // El endpoint devuelve datos_factura como "datos" en la respuesta
  const facturaBase = {
    id:                factura.id,
    numero_factura:    factura.numero_factura,
    clave_acceso:      factura.clave_acceso,
    fecha_emision:     factura.fecha_emision,
    estado:            factura.estado,
    cod_doc:           factura.cod_doc ?? "01",
    mensajes_sri:      factura.mensajes_sri,
    links:             factura.links,
    datos:             factura.datos ?? {},
    fecha_autorizacion: factura.fecha_autorizacion,
  };

  // ── Despachar al componente correcto según cod_doc ───────────────────────────
  const renderContenido = () => {
    switch (facturaBase.cod_doc) {
      case "04":
        return <DetalleNC factura={facturaBase} />;
      case "05":
        // return <DetalleND factura={facturaBase} />; ← futuro
        return <DetalleFactura factura={facturaBase} />;
      case "07":
        // return <DetalleRetencion factura={facturaBase} />; ← futuro
        return <DetalleFactura factura={facturaBase} />;
      case "01":
      default:
        return <DetalleFactura factura={facturaBase} />;
    }
  };

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <DetalleShared
      factura={facturaBase}
      onRecargar={cargar}
    >
      {renderContenido()}
    </DetalleShared>
  );
}