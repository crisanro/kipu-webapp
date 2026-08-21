import { CodeBlock } from "../_components/CodeBlock";
import { AlertBox } from "../_components/EndpointBadge";

const EXAMPLES = {
  curl: `curl -X POST https://api.kipufacturacion.com/api/v1/public/emit \\
  -H "Content-Type: application/json" \\
  -H "X-Api-Key: kp_live_tu_clave_aqui" \\
  -H "X-Idempotency-Key: f47ac10b-58cc-4372-a567-0e02b2c3d479" \\
  -d '{ ... }'`,

  javascript: `import { randomUUID } from "crypto";

const response = await fetch(
  "https://api.kipufacturacion.com/api/v1/public/emit",
  {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Api-Key": process.env.KIPU_API_KEY,       // kp_live_...
      "X-Idempotency-Key": randomUUID(),
    },
    body: JSON.stringify({ tipo: "FAC", /* ... */ }),
  }
);

if (!response.ok) {
  const err = await response.json();
  throw new Error(\`Kipu error \${err.code}: \${err.message}\`);
}

const comprobante = await response.json();
console.log(comprobante.numero_autorizacion);`,

  python: `import httpx
import uuid

KIPU_API_KEY = "kp_live_tu_clave_aqui"   # mejor desde env

response = httpx.post(
    "https://api.kipufacturacion.com/api/v1/public/emit",
    headers={
        "X-Api-Key": KIPU_API_KEY,
        "X-Idempotency-Key": str(uuid.uuid4()),
    },
    json={
        "tipo": "FAC",
        # ...
    },
    timeout=30,
)
response.raise_for_status()
comprobante = response.json()
print(comprobante["numero_autorizacion"])`,
};

export default function AutenticacionPage() {
  return (
    <div className="max-w-4xl mx-auto px-6 py-20">
      {/* Header */}
      <div className="mb-12">
        <p className="text-xs text-indigo-400 font-mono mb-3">AUTENTICACIÓN</p>
        <h1 className="text-3xl font-bold text-white mb-4">
          Cómo autenticar tus peticiones
        </h1>
        <p className="text-slate-400 leading-relaxed max-w-2xl">
          Kipu usa API Keys estáticas por empresa. Cada petición de emisión
          también requiere una{" "}
          <strong className="text-slate-200">Idempotency Key</strong> única para
          prevenir duplicados ante reintentos.
        </p>
      </div>

      {/* Obtener API Key */}
      <section className="mb-14">
        <h2 className="text-lg font-semibold text-white mb-4">
          1 · Obtén tu API Key
        </h2>
        <ol className="space-y-3 text-sm text-slate-400 mb-6">
          <li className="flex gap-2">
            <span className="text-indigo-400 font-mono shrink-0">01.</span>
            Inicia sesión en{" "}
            <strong className="text-slate-200">
              app.kipufacturacion.com
            </strong>
          </li>
          <li className="flex gap-2">
            <span className="text-indigo-400 font-mono shrink-0">02.</span>
            Ve a <strong className="text-slate-200">Ajustes → Desarrolladores</strong>
          </li>
          <li className="flex gap-2">
            <span className="text-indigo-400 font-mono shrink-0">03.</span>
            Haz clic en{" "}
            <strong className="text-slate-200">Generar nueva clave</strong> y
            cópiala — solo se muestra una vez
          </li>
        </ol>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {[
            {
              prefix: "kp_test_",
              name: "Pruebas",
              desc: "Apunta al ambiente de certificación del SRI. Las emisiones no tienen valor tributario.",
              color: "border-amber-700/40 bg-amber-950/20",
              badge: "text-amber-400",
            },
            {
              prefix: "kp_live_",
              name: "Producción",
              desc: "Emite comprobantes con efecto tributario real ante el SRI de Ecuador.",
              color: "border-emerald-700/40 bg-emerald-950/20",
              badge: "text-emerald-400",
            },
          ].map((env) => (
            <div
              key={env.name}
              className={`border rounded-xl p-5 ${env.color}`}
            >
              <p
                className={`font-mono text-sm font-bold mb-1 ${env.badge}`}
              >
                {env.prefix}
                <span className="opacity-50">••••••••••••••</span>
              </p>
              <p className="text-xs font-semibold text-slate-300 mb-1">
                {env.name}
              </p>
              <p className="text-xs text-slate-500">{env.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Headers */}
      <section className="mb-14">
        <h2 className="text-lg font-semibold text-white mb-4">
          2 · Headers requeridos
        </h2>

        <div className="border border-white/[0.08] rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/[0.07] bg-[#161b27]">
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide">
                  Header
                </th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide">
                  Requerido
                </th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide">
                  Descripción
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {[
                {
                  header: "X-Api-Key",
                  req: "Siempre",
                  desc: "Tu clave de API. Formato: kp_live_... o kp_test_...",
                },
                {
                  header: "X-Idempotency-Key",
                  req: "En emisión",
                  desc: "UUID v4 único por comprobante. Reusar el mismo key devuelve el comprobante original sin re-emitir.",
                },
                {
                  header: "Content-Type",
                  req: "Siempre",
                  desc: "Debe ser application/json",
                },
              ].map((row) => (
                <tr key={row.header} className="hover:bg-white/[0.02]">
                  <td className="px-5 py-3.5 font-mono text-indigo-300 text-xs">
                    {row.header}
                  </td>
                  <td className="px-5 py-3.5 text-xs text-slate-400">
                    {row.req}
                  </td>
                  <td className="px-5 py-3.5 text-xs text-slate-500">
                    {row.desc}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <AlertBox type="warning">
          <strong>Idempotencia:</strong> Si una petición falla por timeout o error
          de red, reenvíala con el <em>mismo</em>{" "}
          <code className="font-mono text-xs">X-Idempotency-Key</code>. Kipu
          detecta que ya existe y devuelve el comprobante sin volver a llamar al SRI.
          Usar un key diferente emite un nuevo comprobante.
        </AlertBox>
      </section>

      {/* Ejemplos */}
      <section className="mb-14">
        <h2 className="text-lg font-semibold text-white mb-2">
          3 · Ejemplos de autenticación
        </h2>
        <p className="text-slate-500 text-sm mb-4">
          Selecciona tu lenguaje — los headers son idénticos en todos los endpoints.
        </p>

        <CodeBlock
          tabs={[
            { label: "cURL", code: EXAMPLES.curl },
            { label: "JavaScript", code: EXAMPLES.javascript },
            { label: "Python", code: EXAMPLES.python },
          ]}
        />
      </section>

      {/* Seguridad */}
      <section>
        <h2 className="text-lg font-semibold text-white mb-4">
          Buenas prácticas de seguridad
        </h2>
        <ul className="space-y-2 text-sm text-slate-400">
          {[
            "Nunca expongas tu API Key en código frontend o repositorios públicos.",
            "Almacénala como variable de entorno (process.env.KIPU_API_KEY).",
            "Si sospechas que fue comprometida, ve a Ajustes → Desarrolladores y regenera la clave — la anterior se invalida de inmediato.",
            "Desde el panel puedes ver el historial de peticiones por API Key.",
          ].map((tip) => (
            <li key={tip} className="flex gap-2">
              <span className="text-indigo-500 mt-0.5 shrink-0">·</span>
              {tip}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}