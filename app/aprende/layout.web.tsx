// app/aprende/layout.web.tsx — Aprende: impuestos en Ecuador explicados fácil.
// Pública y pensada para buscadores (Google): el HTML ya trae el artículo
// completo. Solo en la web: la app de las tiendas no la incluye (`.web.tsx`).
import type { Metadata } from "next";
import EncabezadoAyuda from "@/components/ayuda/EncabezadoAyuda";

export const metadata: Metadata = {
  title: {
    default:  "Aprende sobre impuestos en Ecuador — Kipu",
    template: "%s | Kipu",
  },
  description: "Guías claras sobre el IVA, el RUC, la facturación electrónica y las declaraciones al SRI en Ecuador.",
  openGraph: { siteName: "Kipu", locale: "es_EC" },
};

export default function AprendeLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen" style={{ background: "var(--kipu-bg)" }}>
      <EncabezadoAyuda seccion="aprende" />
      <main className="max-w-3xl mx-auto px-4 py-8 md:py-10">{children}</main>
    </div>
  );
}
