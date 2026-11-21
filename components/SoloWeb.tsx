// components/SoloWeb.tsx
//
// Lo que va solo en la web: planes, precios, "Ver planes", ofertas de pago.
// En la app de las tiendas (Apple/Google) no puede haber forma de comprar ni
// invitaciones a pagar fuera de la app, salvo Kipu Al Día (servicio contable que
// presta el equipo de Kipu). Ver lib/plataforma.ts.
//
// Para un texto distinto en la app, usar ES_APP_NATIVA directamente.

import { ES_APP_NATIVA } from "@/lib/plataforma";

export default function SoloWeb({ children }: { children: React.ReactNode }) {
  return ES_APP_NATIVA ? null : <>{children}</>;
}
