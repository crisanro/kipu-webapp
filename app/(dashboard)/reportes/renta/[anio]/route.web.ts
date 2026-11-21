// Dirección vieja (/reportes/renta/[anio]): solo existe en la web, para que los enlaces guardados,
// los correos y lo que manda el backend sigan funcionando. Redirige con 307 a
// la nueva conservando el resto de la query. Ver lib/rutas.ts.
import { conQuery, rutas } from "@/lib/rutas";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ anio: string }> },
) {
  const { anio } = await params;
  const query   = Object.fromEntries(new URL(request.url).searchParams);
  // Location relativa: detrás de Traefik request.url no trae el dominio público
  return new Response(null, {
    status:  307,
    headers: { Location: conQuery(rutas.reporteRenta(anio), query) },
  });
}
