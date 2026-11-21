// app/robots.ts → /robots.txt. (No admite el sufijo .web: también sale en el
// export de la app, donde es un archivo suelto que nadie lee.)
// Los buscadores entran a /aprende, /ayuda, la documentación para integradores
// (/dev), el login y el registro. El resto del panel no: sin sesión solo muestra
// un spinner o el login. /_next/ y /images/ quedan abiertos porque Google
// necesita el CSS y las imágenes para ver bien las páginas.
import type { MetadataRoute } from "next";
import { URL_SITIO } from "@/lib/config";

export const dynamic = "force-static";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow:     ["/aprende", "/ayuda", "/dev", "/login", "/register", "/_next/", "/images/"],
      disallow:  "/",
    },
    sitemap: `${URL_SITIO}/sitemap.xml`,
  };
}
