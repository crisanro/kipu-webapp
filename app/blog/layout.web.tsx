// app/blog/layout.web.tsx — Blog de Kipu: dudas de impuestos en Ecuador, explicadas fácil.
// Pública y pensada para buscadores (Google): el HTML ya trae el artículo
// completo. Solo en la web: la app de las tiendas no la incluye (`.web.tsx`).
import type { Metadata } from "next";
import EncabezadoAyuda from "@/components/ayuda/EncabezadoAyuda";

export const metadata: Metadata = {
  title: {
    default:  "Blog de Kipu: impuestos en Ecuador sin complicaciones",
    template: "%s | Kipu",
  },
  description: "Respuestas claras a las dudas de siempre con el SRI: cuándo declarar, qué pasa si te atrasas, qué gastos te sirven y más.",
  openGraph: { siteName: "Kipu", locale: "es_EC" },
};

export default function BlogLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen" style={{ background: "var(--kipu-bg)" }}>
      <EncabezadoAyuda seccion="blog" />
      <main className="max-w-3xl mx-auto px-4 py-8 md:py-10">{children}</main>
    </div>
  );
}
