const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "https://core.kipu.ec";

// CSP en modo Report-Only: no bloquea nada, solo reporta en la consola del
// navegador lo que bloquearía. Cuando la consola quede limpia en staging,
// pasar la clave a "Content-Security-Policy" para aplicarla.
const cspReportOnly = [
  "default-src 'self'",
  // Next.js inyecta scripts inline; Firebase Auth carga de apis.google.com
  "script-src 'self' 'unsafe-inline' https://apis.google.com https://www.gstatic.com",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  [
    "connect-src 'self'", API_URL,
    "https://*.googleapis.com",                  // Firebase Auth, FCM, installations
    "https://app3902.privynote.net",             // consulta de cédulas (riesgo aceptado)
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
  // La documentación para integradores vive en el backend (se genera del código).
  // /dev se mantiene como redirección para no romper enlaces existentes.
  async redirects() {
    return [
      { source: "/dev",        destination: "https://core.kipu.ec/api-docs", permanent: true },
      { source: "/dev/:path*", destination: "https://core.kipu.ec/api-docs", permanent: true },
    ];
  },
};


export default nextConfig;