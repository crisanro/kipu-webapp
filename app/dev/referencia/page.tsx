import { MethodBadge, AlertBox } from "../_components/EndpointBadge";
import { CodeBlock } from "../_components/CodeBlock";

const BASE_URL = "https://api.kipufacturacion.com";

interface Endpoint {
  method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
  path: string;
  desc: string;
  auth: boolean;
  idempotency?: boolean;
  body?: string;
  response?: string;
}

const ENDPOINTS: Endpoint[] = [
  {
    method: "POST",
    path: "/api/v1/public/emit",
    desc: "Emite cualquier tipo de comprobante (FAC, LIQ, NCR, NDB, RET). Firma con XAdES-BES y envía al SRI.",
    auth: true,
    idempotency: true,
    body: `{
  "tipo": "FAC" | "LIQ" | "NCR" | "NDB" | "RET",
  "ruc_emisor": "string",
  "numero": "string",           // SSS-PPP-NNNNNNNNN
  "fecha_emision": "YYYY-MM-DD",
  "ambiente": "pruebas" | "produccion",
  "cliente": { ... },
  "items": [ ... ],
  "forma_pago": [ ... ]         // solo FAC y LIQ
}`,
    response: `// 201 Created
{
  "id": "cmp_...",
  "estado": "AUTORIZADO",
  "clave_acceso": "string (49 chars)",
  "numero_autorizacion": "string",
  "fecha_autorizacion": "ISO 8601",
  "xml_url": "https://...",
  "pdf_url": "https://..."
}`,
  },
  {
    method: "POST",
    path: "/api/v1/public/invoice",
    desc: "Alias legacy solo para FAC. Equivalente a /emit con tipo='FAC'. Se mantiene por compatibilidad.",
    auth: true,
    idempotency: true,
    body: `// Mismo body que /emit pero sin campo "tipo" (asume FAC)`,
  },
  {
    method: "POST",
    path: "/api/v1/public/validate",
    desc: "Valida la estructura del comprobante sin emitirlo ni contactar al SRI. Útil para pruebas en desarrollo.",
    auth: true,
    idempotency: false,
    body: `// Mismo body que /emit
{ "tipo": "FAC", "ruc_emisor": "...", ... }`,
    response: `// 200 OK si válido
{ "valid": true, "warnings": [] }

// 422 si hay errores
{
  "valid": false,
  "errors": [
    { "field": "cliente.email", "message": "Formato de email inválido" }
  ]
}`,
  },
  {
    method: "GET",
    path: "/api/v1/public/status",
    desc: "Devuelve el estado del emisor: ambiente activo, certificado digital (vencimiento) y conexión con el SRI.",
    auth: true,
    idempotency: false,
    response: `// 200 OK
{
  "ruc": "1234567890001",
  "razon_social": "Mi Empresa S.A.",
  "ambiente": "produccion",
  "certificado": {
    "cn": "MI EMPRESA SA",
    "vence": "2026-03-15",
    "dias_restantes": 420
  },
  "sri_conexion": "ok" | "degradado" | "inactivo"
}`,
  },
];

const TIPOS_ID = [
  { code: "04", name: "RUC", ejemplo: "1234567890001" },
  { code: "05", name: "Cédula", ejemplo: "0987654321" },
  { code: "06", name: "Pasaporte", ejemplo: "AB123456" },
  { code: "07", name: "Consumidor final", ejemplo: "9999999999999" },
  { code: "08", name: "Identificación exterior", ejemplo: "EXT-001" },
];

const FORMAS_PAGO = [
  { code: "01", name: "Efectivo" },
  { code: "15", name: "Compensación de deudas" },
  { code: "16", name: "Tarjeta débito" },
  { code: "17", name: "Dinero electrónico" },
  { code: "18", name: "Tarjeta pre-pago" },
  { code: "19", name: "Tarjeta crédito" },
  { code: "20", name: "Otros con utilización del sistema financiero" },
  { code: "21", name: "Endoso de títulos" },
];

const TIPOS_IVA = [
  { code: "0", name: "Tarifa 0%" },
  { code: "5", name: "Tarifa 5%" },
  { code: "15", name: "Tarifa 15% (general)" },
];

export default function ReferenciaPage() {
  return (
    <div className="max-w-5xl mx-auto px-6 py-20">
      {/* Header */}
      <div className="mb-12">
        <p className="text-xs text-indigo-400 font-mono mb-3">REFERENCIA</p>
        <h1 className="text-3xl font-bold text-white mb-4">
          Referencia completa de la API
        </h1>
        <p className="text-slate-400 leading-relaxed max-w-2xl">
          Todos los endpoints públicos de Kipu. URL base:{" "}
          <code className="font-mono text-indigo-400 text-sm">{BASE_URL}</code>
        </p>
      </div>

      {/* Endpoints */}
      <section className="mb-16">
        <h2 className="text-lg font-semibold text-white mb-6">Endpoints</h2>

        <div className="space-y-6">
          {ENDPOINTS.map((ep) => (
            <div
              key={ep.path}
              className="border border-white/[0.08] rounded-xl overflow-hidden"
            >
              {/* Endpoint header */}
              <div className="flex flex-col sm:flex-row sm:items-center gap-3 px-5 py-4 bg-[#161b27] border-b border-white/[0.07]">
                <MethodBadge method={ep.method} />
                <code className="font-mono text-sm text-slate-200 flex-1">
                  {ep.path}
                </code>
                <div className="flex gap-2">
                  {ep.auth && (
                    <span className="text-xs text-slate-500 border border-white/[0.08] px-2 py-0.5 rounded">
                      🔑 API Key
                    </span>
                  )}
                  {ep.idempotency && (
                    <span className="text-xs text-amber-500 border border-amber-700/30 px-2 py-0.5 rounded">
                      ⚡ Idempotency
                    </span>
                  )}
                </div>
              </div>

              {/* Description */}
              <div className="px-5 py-4">
                <p className="text-sm text-slate-400">{ep.desc}</p>

                {ep.body && (
                  <>
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mt-5 mb-1">
                      Request body
                    </p>
                    <CodeBlock code={ep.body} lang="JSON" />
                  </>
                )}

                {ep.response && (
                  <>
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
                      Response
                    </p>
                    <CodeBlock code={ep.response} lang="JSON" />
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Tablas de referencia */}
      <section className="mb-12">
        <h2 className="text-lg font-semibold text-white mb-6">
          Tablas de referencia SRI
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Tipos de identificación */}
          <div>
            <h3 className="text-sm font-semibold text-slate-300 mb-3">
              Tipos de identificación
            </h3>
            <div className="border border-white/[0.08] rounded-xl overflow-hidden">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-[#161b27] border-b border-white/[0.07]">
                    <th className="px-4 py-2.5 text-left text-slate-400 font-semibold">
                      Código
                    </th>
                    <th className="px-4 py-2.5 text-left text-slate-400 font-semibold">
                      Nombre
                    </th>
                    <th className="px-4 py-2.5 text-left text-slate-400 font-semibold">
                      Ejemplo
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04]">
                  {TIPOS_ID.map((t) => (
                    <tr key={t.code} className="hover:bg-white/[0.02]">
                      <td className="px-4 py-2.5 font-mono text-indigo-300">
                        {t.code}
                      </td>
                      <td className="px-4 py-2.5 text-slate-400">{t.name}</td>
                      <td className="px-4 py-2.5 font-mono text-slate-600">
                        {t.ejemplo}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Formas de pago */}
          <div>
            <h3 className="text-sm font-semibold text-slate-300 mb-3">
              Formas de pago
            </h3>
            <div className="border border-white/[0.08] rounded-xl overflow-hidden">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-[#161b27] border-b border-white/[0.07]">
                    <th className="px-4 py-2.5 text-left text-slate-400 font-semibold">
                      Código
                    </th>
                    <th className="px-4 py-2.5 text-left text-slate-400 font-semibold">
                      Descripción
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04]">
                  {FORMAS_PAGO.map((f) => (
                    <tr key={f.code} className="hover:bg-white/[0.02]">
                      <td className="px-4 py-2.5 font-mono text-indigo-300">
                        {f.code}
                      </td>
                      <td className="px-4 py-2.5 text-slate-400">{f.name}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Tarifas IVA */}
        <div className="mt-8">
          <h3 className="text-sm font-semibold text-slate-300 mb-3">
            Tarifas de IVA vigentes
          </h3>
          <div className="flex flex-wrap gap-3">
            {TIPOS_IVA.map((t) => (
              <div
                key={t.code}
                className="border border-white/[0.08] rounded-lg px-5 py-3"
              >
                <p className="font-mono text-2xl font-bold text-indigo-400">
                  {t.code}
                </p>
                <p className="text-xs text-slate-500 mt-0.5">{t.name}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <AlertBox type="tip">
        Los códigos de retención (para RET) siguen la tabla oficial del SRI
        disponible en{" "}
        <a
          href="https://www.sri.gob.ec"
          target="_blank"
          rel="noopener noreferrer"
          className="underline text-emerald-300 hover:text-emerald-200"
        >
          sri.gob.ec
        </a>
        . Los más comunes: 303 (honorarios), 310 (arrendamiento), 341 (servicios
        entre personas naturales), 503 (IVA bienes), 504 (IVA servicios).
      </AlertBox>
    </div>
  );
}