const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "https://core.kipu.ec";
// La documentación para integradores la genera el backend de producción
const DOCS_ORIGIN = "https://core.kipu.ec";

// CSP en modo Report-Only: no bloquea nada, solo reporta en la consola del
// navegador lo que bloquearía. Cuando la consola quede limpia en staging,
// pasar la clave a "Content-Security-Policy" para aplicarla.
const cspReportOnly = [
  "default-src 'self'",
  // Next.js inyecta scripts inline; Firebase Auth carga de apis.google.com
  // static.cloudflareinsights.com: Cloudflare Web Analytics (lo inyecta Cloudflare)
  "script-src 'self' 'unsafe-inline' https://apis.google.com https://www.gstatic.com https://static.cloudflareinsights.com",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  [
    "connect-src 'self'", API_URL,
    "https://*.googleapis.com",                  // Firebase Auth, FCM, installations
    "https://cloudflareinsights.com",            // envío de métricas de Cloudflare Web Analytics
  ].join(" "),
  "frame-src https://*.firebaseapp.com https://www.youtube.com",
  "worker-src 'self' blob:",
  "manifest-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join("; ");

const securityHeaders = [
  // Evita que otra web embeba la app en un iframe (clickjacking)
  { key: "X-Frame-Options",         value: "DENY" },
  { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
  { key: "Content-Security-Policy-Report-Only", value: cspReportOnly },
  { key: "X-Content-Type-Options",  value: "nosniff" },
  { key: "Referrer-Policy",         value: "strict-origin-when-cross-origin" },
];

const nextConfig = {
  output: "standalone",
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
  // La documentación para integradores vive en el backend (se genera del código)
  // y se sirve en app.kipu.ec/dev sin redirigir: Next la pide por detrás. El
  // HTML carga /openapi-public.json y /docs-assets/… con rutas relativas, así
  // que también se reescriben. "Probar" va a core.kipu.ec porque la especificación declara su
  // servidor. (Antes era una redirección 308: los navegadores que la guardaron
  // seguirán yendo a core.kipu.ec/api-docs, que sigue funcionando.)
  async rewrites() {
    return [
      { source: "/dev",                 destination: `${DOCS_ORIGIN}/api-docs` },
      { source: "/dev/:path*",          destination: `${DOCS_ORIGIN}/api-docs` },
      { source: "/openapi-public.json", destination: `${DOCS_ORIGIN}/openapi-public.json` },
      // El visor (Scalar) lo sirve el backend: así /dev carga solo scripts del
      // propio dominio y funciona con la CSP estricta, sin CDN de terceros
      { source: "/docs-assets/:archivo", destination: `${DOCS_ORIGIN}/docs-assets/:archivo` },
    ];
  },
};


export default nextConfig;