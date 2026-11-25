"use client";

import { notFound, useSearchParams } from "next/navigation";
import DetalleDocumento from "./components/DetalleDocumento";

// /documentos/ver?id=… (antes /documentos/[id]; ver lib/rutas.ts). La key hace
// que otro id sea otra pantalla, sin arrastrar el estado del anterior.
// El detalle vive en components/DetalleDocumento.tsx: también se abre en el
// panel de la derecha de Documentos en la compu.
export default function DetalleDocumentoPage() {
  const id = useSearchParams().get("id");
  if (!id) notFound();
  return <DetalleDocumento key={id} id={id} />;
}
