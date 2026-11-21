// app/ayuda/layout.tsx — Centro de Ayuda. Público: se ve sin sesión y sin
// esperar a Firebase (app/providers.tsx → RUTAS_CONTENIDO).
import type { Metadata } from "next";
import EncabezadoAyuda from "@/components/ayuda/EncabezadoAyuda";

export const metadata: Metadata = {
  title: {
    default:  "Centro de Ayuda — Kipu",
    template: "%s — Ayuda de Kipu",
  },
  description: "Guías para facturar con Kipu: primeros pasos, firma electrónica, comprobantes, notas de crédito, compras y declaración de IVA.",
};

export default function AyudaLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen" style={{ background: "var(--kipu-bg)" }}>
      <EncabezadoAyuda />
      <main className="max-w-3xl mx-auto px-4 py-8 md:py-10">{children}</main>
    </div>
  );
}
