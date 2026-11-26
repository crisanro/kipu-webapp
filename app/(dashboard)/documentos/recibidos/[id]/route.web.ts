// Dirección vieja (/documentos/recibidos/123), solo en la web: redirige a la nueva (lib/rutas.ts).
import { redirigirVieja, rutas } from "@/lib/rutas";

export const GET = redirigirVieja(rutas.recibido);
