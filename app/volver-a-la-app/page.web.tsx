// app/volver-a-la-app/page.web.tsx
// A dónde vuelve Stripe (pago, cancelación o portal) cuando se abrió desde la app
// de las tiendas (backend: url_volver_a_la_app). El navegador interno de la app
// muestra la versión web de Kipu, que ofrece planes: esta página es neutra a
// propósito (Apple 3.1.1 / Google Play): sin menú, sin planes, sin enlaces.
// Al cerrar la ventana, la app vuelve a consultar si el pago entró.
// Pública (app/providers.tsx): el navegador interno no tiene la sesión.
// Solo web (.web.tsx): la abre app.kipu.ec, nunca el build de la app.
import type { Metadata } from "next";
import { CheckCircle2 } from "lucide-react";

export const metadata: Metadata = {
  title:  "Vuelve a Kipu",
  robots: { index: false, follow: false },
};

export default function VolverALaApp() {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-fondo p-6">
      <div className="w-full max-w-sm space-y-5 text-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/images/logo.svg" alt="Kipu" width={120} height={40} className="mx-auto h-10 w-auto" />
        <span className="mx-auto inline-flex size-14 items-center justify-center rounded-full bg-acento-suave text-acento">
          <CheckCircle2 size={28} aria-hidden />
        </span>
        <div className="space-y-2">
          <h1 className="text-xl font-bold text-texto">Listo</h1>
          <p className="text-sm leading-relaxed text-tenue">
            Cierra esta ventana para volver a Kipu.
          </p>
          <p className="text-xs leading-relaxed text-sutil">
            Si hiciste un pago, en unos segundos lo verás reflejado en la app.
          </p>
        </div>
      </div>
    </main>
  );
}
