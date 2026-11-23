// app/sitemap.ts → /sitemap.xml (como robots.ts, también sale en el export de la
// app, sin efecto). Lo que queremos en Google:
// /blog y el Centro de Ayuda. El panel no va: sin sesión no muestra nada.
import type { MetadataRoute } from "next";
import { ARTICULOS_BLOG } from "@/content/blog/articulos";
import { ARTICULOS } from "@/content/ayuda/articulos";
import { URL_SITIO } from "@/lib/config";

export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: `${URL_SITIO}/blog`, changeFrequency: "weekly",  priority: 1 },
    ...ARTICULOS_BLOG.map((a) => ({
      url:             `${URL_SITIO}/blog/${a.slug}`,
      lastModified:    a.actualizado,
      changeFrequency: "monthly" as const,
      priority:        0.9,
    })),
    { url: `${URL_SITIO}/ayuda`, changeFrequency: "weekly", priority: 0.6 },
    ...ARTICULOS.map((a) => ({
      url:             `${URL_SITIO}/ayuda/${a.slug}`,
      changeFrequency: "monthly" as const,
      priority:        0.5,
    })),
  ];
}
