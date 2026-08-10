// app/manifest.ts
import { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name:             "Kipu — Facturación Electrónica",
    short_name:       "Kipu",
    description:      "Facturación electrónica SRI para Ecuador",
    start_url:        "/dashboard",
    display:          "standalone",
    background_color: "#030712",
    theme_color:      "#4f46e5",
    orientation:      "portrait",
    icons: [
      {
        src:     "/icons/icon-192.png",
        sizes:   "192x192",
        type:    "image/png",
        purpose: "maskable",
      },
      {
        src:     "/icons/icon-512.png",
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
    screenshots: [
      {
        src:          "/screenshots/dashboard.png",
        sizes:        "390x844",
        type:         "image/png",
        form_factor:  "narrow",
        label:        "Dashboard de Kipu",
      },
    ],
    categories: ["finance", "business", "productivity"],
  };
}