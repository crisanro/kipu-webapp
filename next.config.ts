const securityHeaders = [
  // Evita que otra web embeba la app en un iframe (clickjacking)
  { key: "X-Frame-Options",         value: "DENY" },
  { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
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