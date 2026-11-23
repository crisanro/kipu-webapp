// GET /health — para monitores externos (UptimeRobot): si responde 200, el
// servidor de la web está vivo. No consulta el backend a propósito: así, si
// algo cae, se sabe cuál fue (el backend tiene su propio core.kipu.ec/health).
// Solo en la web (.web.ts): la app nativa no tiene servidor.

export function GET() {
  return Response.json(
    { status: "ok" },
    { headers: { "Cache-Control": "no-store" } },
  );
}

// Los monitores suelen consultar con HEAD (UptimeRobot gratis, por defecto)
export const HEAD = GET;
