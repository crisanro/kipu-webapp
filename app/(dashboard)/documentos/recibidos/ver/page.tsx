"use client";

import { notFound, useSearchParams } from "next/navigation";
import DetalleRecibido from "./components/DetalleRecibido";

// /documentos/recibidos/ver?id=… (antes /documentos/recibidos/[id]; ver lib/rutas.ts)
// El detalle vive en components/DetalleRecibido.tsx: también se abre en el
// panel de la derecha de Recibidos en la compu.
export default function DetalleRecibidoPage() {
  const id = useSearchParams().get("id");
  if (!id) notFound();
  return <DetalleRecibido key={id} id={id} />;
}
