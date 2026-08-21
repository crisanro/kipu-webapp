import Link from "next/link";
import { CodeBlock } from "./_components/CodeBlock";

const QUICKSTART_CURL = `curl -X POST https://api.kipufacturacion.com/api/v1/public/emit \\
  -H "Content-Type: application/json" \\
  -H "X-Api-Key: kp_live_••••••••••••••••" \\
  -H "X-Idempotency-Key: $(uuidgen)" \\
  -d '{
    "tipo": "FAC",
    "ruc_emisor": "1234567890001",
    "numero": "001-001-000000001",
    "fecha_emision": "2024-01-15",
    "cliente": {
      "identificacion": "0987654321",
      "tipo_identificacion": "05",
      "razon_social": "Juan Pérez",
      "email": "juan@ejemplo.com"
    },
    "items": [
      {
        "descripcion": "Servicio de consultoría",
        "cantidad": 1,
        "precio_unitario": 100.00,
        "iva": 15
      }
    ]
  }'`;

const SECTIONS = [
  {
    href: "/dev/autenticacion",
    icon: "🔑",
    title: "Autenticación",
    desc: "Obtén tu API Key y aprende a autenticar cada petición con headers.",
  },
  {
    href: "/dev/emision",
    icon: "📄",
    title: "Emisión",
    desc: "Emite facturas, liquidaciones, notas de crédito/débito y retenciones.",
  },
  {
    href: "/dev/referencia",
    icon: "📋",
    title: "Referencia",
    desc: "Tabla completa de endpoints, parámetros y tipos de datos.",
  },
  {
    href: "/dev/errores",
    icon: "⚠",
    title: "Errores",
    desc: "Códigos de error HTTP y mensajes del SRI con guías de solución.",
  },
];

export default function DevPage() {
  return (
    <div className="max-w-4xl mx-auto px-6 py-20">
      {/* Hero */}
      <div className="mb-16">
        <div className="inline-flex items-center gap-2 text-xs text-indigo-400 font-mono border border-indigo-500/30 bg-indigo-500/10 px-3 py-1.5 rounded-full mb-8">
          <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
          API v1 · SRI Ecuador
        </div>

        <h1 className="text-4xl md:text-5xl font-bold text-white leading-tight tracking-tight mb-5">
          Documentación para
          <br />
          <span className="text-indigo-400">Developers</span>
        </h1>

        <p className="text-slate-400 text-lg leading-relaxed max-w-2xl mb-8">
          Integra facturación electrónica conforme al SRI directamente desde tu
          aplicación. Una sola llamada emite, firma y envía al SRI — tú recibes
          el XML autorizado y el PDF.
        </p>

        <div className="flex flex-wrap gap-3">
          <Link
            href="https://app.kipufacturacion.com/register"
            className="bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2.5 rounded-lg text-sm font-medium transition-colors"
          >
            Crear cuenta gratis
          </Link>
          <Link
            href="/dev/autenticacion"
            className="border border-white/10 hover:border-white/20 text-slate-300 px-5 py-2.5 rounded-lg text-sm font-medium transition-colors hover:text-white"
          >
            Ver autenticación →
          </Link>
        </div>
      </div>

      {/* Stats strip */}
      <div className="grid grid-cols-3 gap-px bg-white/[0.06] rounded-xl overflow-hidden mb-16">
        {[
          { label: "Tipos de comprobante", value: "5" },
          { label: "Ambientes SRI", value: "Pruebas · Producción" },
          { label: "Latencia promedio", value: "< 2 s" },
        ].map((s) => (
          <div key={s.label} className="bg-[#0b0f1a] px-6 py-5">
            <p className="text-xl font-bold text-white font-mono">{s.value}</p>
            <p className="text-xs text-slate-500 mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Quickstart */}
      <section className="mb-16">
        <h2 className="text-xl font-semibold text-white mb-2">
          Quickstart — primera emisión en 3 pasos
        </h2>
        <p className="text-slate-500 text-sm mb-4">
          Desde cero hasta tu primer comprobante autorizado por el SRI.
        </p>

        <ol className="space-y-4 mb-2">
          {[
            {
              n: "1",
              title: "Crea tu cuenta y activa tu empresa en el panel",
              sub: "Ve a app.kipufacturacion.com → Empresa → Configuración SRI",
            },
            {
              n: "2",
              title: "Genera tu API Key en Ajustes → Desarrolladores",
              sub: 'Las claves live tienen el prefijo kp_live_  y las de prueba kp_test_',
            },
            {
              n: "3",
              title: "Haz tu primera petición",
              sub: "Usa el ejemplo de abajo — reemplaza tu RUC, número y datos del cliente.",
            },
          ].map((step) => (
            <li key={step.n} className="flex gap-4">
              <span className="shrink-0 w-7 h-7 rounded-full bg-indigo-600/20 border border-indigo-500/30 text-indigo-400 text-xs font-bold flex items-center justify-center font-mono">
                {step.n}
              </span>
              <div>
                <p className="text-sm font-medium text-slate-200">{step.title}</p>
                <p className="text-xs text-slate-500 mt-0.5">{step.sub}</p>
              </div>
            </li>
          ))}
        </ol>

        <CodeBlock code={QUICKSTART_CURL} lang="cURL" filename="quickstart.sh" />

        <p className="text-xs text-slate-500">
          La respuesta incluye{" "}
          <code className="text-indigo-400 font-mono">clave_acceso</code>,{" "}
          <code className="text-indigo-400 font-mono">numero_autorizacion</code>,{" "}
          <code className="text-indigo-400 font-mono">xml_url</code> y{" "}
          <code className="text-indigo-400 font-mono">pdf_url</code>.
        </p>
      </section>

      {/* Nav cards */}
      <section>
        <h2 className="text-xl font-semibold text-white mb-6">
          Explora la documentación
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {SECTIONS.map((s) => (
            <Link
              key={s.href}
              href={s.href}
              className="group border border-white/[0.08] rounded-xl p-5 hover:border-indigo-500/40 hover:bg-indigo-950/20 transition-all"
            >
              <div className="flex items-start gap-3">
                <span className="text-2xl">{s.icon}</span>
                <div>
                  <h3 className="text-sm font-semibold text-slate-100 group-hover:text-white transition-colors">
                    {s.title}
                  </h3>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    {s.desc}
                  </p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}