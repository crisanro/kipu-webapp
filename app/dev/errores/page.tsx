import { AlertBox } from "../_components/EndpointBadge";
import { CodeBlock } from "../_components/CodeBlock";

interface ErrorEntry {
  code: string;
  http: number;
  titulo: string;
  desc: string;
  solucion: string;
}

const ERRORS: ErrorEntry[] = [
  {
    code: "INVALID_API_KEY",
    http: 401,
    titulo: "API Key inválida o inactiva",
    desc: "La clave enviada en X-Api-Key no existe o fue revocada.",
    solucion:
      "Verifica que estés usando la clave correcta. Si la regeneraste, actualiza la variable de entorno en tu servidor.",
  },
  {
    code: "MISSING_API_KEY",
    http: 401,
    titulo: "Header X-Api-Key ausente",
    desc: "La petición no incluye el header de autenticación.",
    solucion:
      "Incluye el header X-Api-Key en todas las peticiones a endpoints autenticados.",
  },
  {
    code: "MISSING_IDEMPOTENCY_KEY",
    http: 400,
    titulo: "Falta X-Idempotency-Key",
    desc: "Las peticiones de emisión requieren X-Idempotency-Key para prevenir duplicados.",
    solucion:
      "Genera un UUID v4 por cada comprobante nuevo y envíalo en el header. Reutiliza el mismo key al reintentar.",
  },
  {
    code: "VALIDATION_ERROR",
    http: 422,
    titulo: "Error de validación del cuerpo",
    desc: "Uno o más campos del payload no cumplen con el esquema esperado (tipo de dato, formato, rango).",
    solucion:
      "Revisa el array errors en la respuesta — cada objeto indica el campo y el motivo del fallo.",
  },
  {
    code: "SRI_REJECTED",
    http: 422,
    titulo: "Comprobante rechazado por el SRI",
    desc: "El XML fue procesado por el SRI pero contiene errores tributarios (RUC inválido, número duplicado, certificado vencido, etc.).",
    solucion:
      "Revisa el campo sri_errors en la respuesta. Los mensajes son literales del SRI. Los más comunes: número de comprobante ya autorizado, firma digital vencida, RUC no habilitado.",
  },
  {
    code: "DUPLICATE_COMPROBANTE",
    http: 409,
    titulo: "Comprobante ya existe",
    desc: "Ya existe un comprobante con ese número (numero) para el mismo emisor. Diferente al caso de idempotencia: aquí se intentó emitir un número diferente al del key original.",
    solucion:
      "Usa un número de comprobante diferente (el siguiente en tu secuencia). Recupera el existente con GET /status.",
  },
  {
    code: "EMISOR_NOT_CONFIGURED",
    http: 412,
    titulo: "Empresa no configurada",
    desc: "El emisor (RUC) no tiene certificado digital cargado o la firma no está activa en el ambiente solicitado.",
    solucion:
      "Ve al panel → Empresa → Firma digital y sube el archivo .p12 con su contraseña. Verifica el ambiente (pruebas/producción).",
  },
  {
    code: "SRI_UNAVAILABLE",
    http: 503,
    titulo: "SRI no disponible",
    desc: "Los servidores del SRI están caídos o en mantenimiento. Kipu no pudo completar la autorización.",
    solucion:
      "Reintenta con el mismo X-Idempotency-Key usando backoff exponencial. Consulta GET /status para ver el estado de la conexión SRI.",
  },
  {
    code: "RATE_LIMIT_EXCEEDED",
    http: 429,
    titulo: "Demasiadas peticiones",
    desc: "Superaste el límite de peticiones por minuto para tu plan.",
    solucion:
      "Implementa backoff exponencial. El header Retry-After indica los segundos de espera.",
  },
];

const ERROR_RESPONSE = `// HTTP 422 — SRI_REJECTED
{
  "error": "SRI_REJECTED",
  "message": "El comprobante fue rechazado por el SRI",
  "http_status": 422,
  "sri_errors": [
    {
      "tipo": "ERROR",
      "identificador": "35",
      "mensaje": "CLAVE DE ACCESO REGISTRADA",
      "informacion_adicional": "El número de comprobante ya fue autorizado"
    }
  ],
  "request_id": "req_01hx..."
}

// HTTP 422 — VALIDATION_ERROR
{
  "error": "VALIDATION_ERROR",
  "message": "El cuerpo de la petición contiene errores",
  "http_status": 422,
  "errors": [
    {
      "field": "cliente.identificacion",
      "message": "La cédula debe tener 10 dígitos",
      "value": "098765432"
    },
    {
      "field": "items[0].iva",
      "message": "IVA debe ser 0, 5 o 15",
      "value": 12
    }
  ],
  "request_id": "req_01hx..."
}`;

const RETRY_EXAMPLE = `async function emitirConRetry(payload, maxRetries = 3) {
  const idempotencyKey = crypto.randomUUID(); // fijo para todos los reintentos

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const res = await fetch(
        "https://api.kipufacturacion.com/api/v1/public/emit",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Api-Key": process.env.KIPU_API_KEY,
            "X-Idempotency-Key": idempotencyKey, // mismo en reintentos
          },
          body: JSON.stringify(payload),
        }
      );

      // Errores permanentes — no reintentar
      if ([400, 401, 409, 412, 422].includes(res.status)) {
        const err = await res.json();
        throw new Error(\`Error permanente: \${err.error} — \${err.message}\`);
      }

      // Éxito
      if (res.ok) return await res.json();

      // Errores transitorios (503, 429) — reintentar
      const retryAfter = res.headers.get("Retry-After");
      const delay = retryAfter
        ? parseInt(retryAfter) * 1000
        : Math.pow(2, attempt) * 1000;

      console.warn(\`Intento \${attempt + 1} fallido (\${res.status}), reintentando en \${delay}ms...\`);
      await new Promise((r) => setTimeout(r, delay));

    } catch (err) {
      if (attempt === maxRetries - 1) throw err;
    }
  }
}`;

const HTTP_COLORS: Record<number, string> = {
  400: "text-amber-400",
  401: "text-rose-400",
  409: "text-orange-400",
  412: "text-yellow-400",
  422: "text-amber-400",
  429: "text-orange-400",
  503: "text-slate-400",
};

export default function ErroresPage() {
  return (
    <div className="max-w-4xl mx-auto px-6 py-20">
      {/* Header */}
      <div className="mb-12">
        <p className="text-xs text-indigo-400 font-mono mb-3">ERRORES</p>
        <h1 className="text-3xl font-bold text-white mb-4">
          Manejo de errores
        </h1>
        <p className="text-slate-400 leading-relaxed max-w-2xl">
          Kipu usa códigos HTTP estándar. Cada respuesta de error incluye un
          campo <code className="font-mono text-indigo-400 text-sm">error</code>{" "}
          legible por máquina y un{" "}
          <code className="font-mono text-indigo-400 text-sm">message</code>{" "}
          para humanos.
        </p>
      </div>

      {/* Estructura de error */}
      <section className="mb-14">
        <h2 className="text-lg font-semibold text-white mb-4">
          Estructura de la respuesta de error
        </h2>
        <CodeBlock code={ERROR_RESPONSE} lang="JSON" filename="error_response.json" />
      </section>

      {/* Tabla de errores */}
      <section className="mb-14">
        <h2 className="text-lg font-semibold text-white mb-6">
          Códigos de error
        </h2>

        <div className="space-y-3">
          {ERRORS.map((e) => (
            <div
              key={e.code}
              className="border border-white/[0.08] rounded-xl overflow-hidden"
            >
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 px-5 py-3.5 bg-[#161b27] border-b border-white/[0.07]">
                <span className="font-mono text-xs text-rose-300 bg-rose-950/40 border border-rose-700/30 px-2.5 py-1 rounded">
                  {e.code}
                </span>
                <span
                  className={`font-mono text-sm font-bold ${
                    HTTP_COLORS[e.http] ?? "text-slate-400"
                  }`}
                >
                  HTTP {e.http}
                </span>
                <span className="text-sm text-slate-300">{e.titulo}</span>
              </div>
              <div className="px-5 py-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
                    Descripción
                  </p>
                  <p className="text-sm text-slate-400">{e.desc}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wide mb-1">
                    Solución
                  </p>
                  <p className="text-sm text-slate-400">{e.solucion}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Reintentos */}
      <section className="mb-8">
        <h2 className="text-lg font-semibold text-white mb-2">
          Estrategia de reintentos recomendada
        </h2>
        <p className="text-slate-500 text-sm mb-2">
          Errores 4xx son permanentes — no reintentar. Errores 503 y 429 son
          transitorios — reintenta con el <em>mismo</em> idempotency key y
          backoff exponencial.
        </p>

        <AlertBox type="warning">
          Nunca generes un nuevo <code className="font-mono text-xs">X-Idempotency-Key</code>{" "}
          al reintentar. Si la primera petición llegó al SRI antes del timeout,
          un key diferente emitiría un comprobante duplicado.
        </AlertBox>

        <CodeBlock
          code={RETRY_EXAMPLE}
          lang="JavaScript"
          filename="retry.js"
        />
      </section>
    </div>
  );
}