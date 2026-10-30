import { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name:             "Kipu — Facturación Electrónica",
    short_name:       "Kipu",
    description:      "Facturación electrónica SRI para Ecuador",
    start_url:        "/dashboard",
    display:          "standalone",
    background_color: "#FAFAF8",   // --kipu-bg
    theme_color:      "#059669",   // --kipu-accent
    orientation:      "portrait",
    icons: [
      // maskable: logo con margen extra para que Android lo recorte sin cortarlo
      {
        src:     "/icons/icon-maskable-192.png",
        sizes:   "192x192",
        type:    "image/png",
        purpose: "maskable",
      },
      {
        src:     "/icons/icon-maskable-512.png",
        sizes:   "512x512",
        type:    "image/png",
        purpose: "maskable",
      },
      {
        src:     "/icons/icon-192.png",
        sizes:   "192x192",
        type:    "image/png",
        purpose: "any",
      },
      {
        src:     "/icons/icon-512.png",
        sizes:   "512x512",
        type:    "image/png",
        purpose: "any",
      },
    ],
    categories: ["finance", "business", "productivity"],
  };
}