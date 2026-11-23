"use client";

// Kipu Renta: pago único y el equipo de Kipu prepara y presenta la renta del año.
// Sin contratar: página de venta, términos y pago. Contratado: el avance (mismo
// panel que Kipu Al Día) y la clave del SRI. Los textos repiten
// app/legal/kipu_renta_v1.md del backend: mantenerlos iguales.

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  CheckCircle2, FileCheck2, KeyRound, Loader2, MessageCircle, ShieldCheck, XCircle,
} from "lucide-react";
import api from "@/lib/api";
import { useAuthStore } from "@/store/auth.store";
import ClaveSri from "@/components/al-dia/ClaveSri";
import PanelCliente from "@/components/al-dia/PanelCliente";
import TextoTerminos from "@/components/al-dia/TextoTerminos";
import type { EstadoRenta } from "@/components/renta/OfertaRenta";

// Contacto de ventas (transferencia, cambio de plan): el mismo número configurado
import { WHATSAPP_SOPORTE as SOPORTE_WA } from "@/lib/soporte";
const caja = { background: "var(--kipu-surface)", border: "1px solid var(--kipu-border)" };

interface Terminos { version: string; texto: string; hash: string }

function detalle(err: unknown, porDefecto: string): string {
  const d = (err as { response?: { data?: { detail?: unknown } } })?.response?.data?.detail;
  return typeof d === "string" ? d : porDefecto;
}

const whatsapp = (texto: string) => `https://wa.me/${SOPORTE_WA}?text=${encodeURIComponent(texto)}`;

// ── Venta ────────────────────────────────────────────────────────────────────
const PASOS = (anio: number) => [
  { titulo: "Pagas y aceptas los términos", texto: "Un solo pago, con tarjeta. Te llega la factura y una copia de los términos." },
  { titulo: "Guardas tu clave del SRI",     texto: "Cifrada. Con ella descargamos tus comprobantes y retenciones del año." },
  { titulo: "Te mandamos el resumen",       texto: "Tus ingresos, gastos, retenciones y el valor a pagar o a favor. Tienes 48 horas para revisarlo." },
  { titulo: "La presentamos al SRI",        texto: `Tu renta ${anio}, a tiempo, y te enviamos el comprobante. Ese día borramos tu clave.` },
];

const INCLUYE = [
  "Declaración anual de renta del año contratado",
  "Anexo de gastos personales, cuando te aplique",
  "Revisión de tus ventas, compras y retenciones del año",
  "Resumen para que lo revises antes de presentar",
  "Comprobante del SRI en tu cuenta y por correo",
  "Respuesta a notificaciones del SRI sobre esa declaración",
];
const NO_INCLUYE = [
  "Declaraciones de IVA (eso es Kipu Al Día)",
  "Declaraciones de otros años",
  "Devoluciones de impuestos",
  "El pago del impuesto: lo haces tú con el valor que te avisamos",
];

const PREGUNTAS = (anio: number): [string, string][] => [
  ["¿Qué año declaran?",
   `Tu renta ${anio}. De enero a inicios de marzo se contrata la del año pasado; después, la del año en curso, que se presenta entre enero y marzo del año siguiente.`],
  ["¿Hasta cuándo puedo contratar?",
   "Hasta 10 días antes de tu vencimiento en el SRI (en marzo, según el noveno dígito de tu RUC), para alcanzar a revisar todo y mandarte el resumen."],
  ["¿Qué necesito darles?",
   "Tu clave del SRI y lo que no está en electrónico: gastos personales con comprobante físico, retenciones en papel, ingresos que no facturaste y tus cargas familiares."],
  ["¿El impuesto se los pago a ustedes?",
   "No. El impuesto lo pagas tú al SRI; te avisamos el valor exacto y la fecha límite. A Kipu solo le pagas el servicio."],
  ["¿Qué pasa con mi clave del SRI?",
   "Se guarda cifrada y solo se usa para tu declaración, descargar tus comprobantes de ese año y consultas. Ves cada vez que alguien la usa, y la borramos el día que presentamos."],
  ["¿Y si me arrepiento?",
   "Si nos avisas antes de que empecemos a trabajar tu declaración, te devolvemos el pago. Una vez enviado el resumen, el servicio se considera prestado."],
  ["¿Para quién es?",
   "Para personas naturales no obligadas a llevar contabilidad, en régimen general o RIMPE Emprendedor. Si eres sociedad u obligado a llevar contabilidad, escríbenos."],
];

function Venta({ estado, onContratar }: { estado: EstadoRenta; onContratar: () => void }) {
  const anio = estado.anio;
  return (
    <>
      {/* Hero */}
      <div className="rounded-2xl p-6 md:p-8 space-y-4"
           style={{
             background: "linear-gradient(135deg, color-mix(in srgb, var(--kipu-accent) 14%, var(--kipu-surface)), var(--kipu-surface))",
             border: "1px solid color-mix(in srgb, var(--kipu-accent) 30%, transparent)",
           }}>
        <div className="flex items-center gap-2">
          <FileCheck2 size={18} style={{ color: "var(--kipu-accent)" }} />
          <span className="text-sm font-semibold" style={{ color: "var(--kipu-accent)" }}>Kipu Renta</span>
        </div>
        <h1 className="text-2xl md:text-3xl font-extrabold leading-tight" style={{ color: "var(--kipu-text)" }}>
          Tu renta {anio},<br />te la declaramos.
        </h1>
        <p className="text-sm md:text-base max-w-xl" style={{ color: "var(--kipu-muted)" }}>
          El equipo de Kipu revisa tus ingresos, gastos y retenciones del año, te manda un resumen para que lo
          revises y presenta tu declaración al SRI. Tú solo pagas el impuesto, si sale a pagar.
        </p>
        <div className="flex flex-wrap items-center gap-4 pt-1">
          <div>
            <span className="text-3xl font-extrabold" style={{ color: "var(--kipu-text)" }}>
              ${estado.precio.total.toFixed(0)}
            </span>
            <span className="text-sm ml-1.5" style={{ color: "var(--kipu-muted)" }}>IVA incluido, un solo pago</span>
          </div>
          <button type="button" onClick={onContratar}
                  className="px-5 py-2.5 rounded-xl text-white font-semibold text-sm shadow-md transition-all
                             bg-[var(--kipu-accent)] hover:bg-[var(--kipu-accent-h)] active:scale-[0.97]">
            Quiero que me la declaren
          </button>
        </div>
        <p className="text-xs" style={{ color: "var(--kipu-subtle)" }}>
          Con gastos personales · Sustitutiva gratis si nos equivocamos · Tu clave se borra al presentar
        </p>
      </div>

      {/* Cómo funciona */}
      <section className="space-y-3">
        <h2 className="text-lg font-bold" style={{ color: "var(--kipu-text)" }}>Cómo funciona</h2>
        <ol className="grid sm:grid-cols-2 gap-3">
          {PASOS(anio).map((p, i) => (
            <li key={p.titulo} className="rounded-xl p-4 flex gap-3" style={caja}>
              <span className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-sm font-bold"
                    style={{ color: "var(--kipu-accent)", background: "color-mix(in srgb, var(--kipu-accent) 12%, transparent)" }}>
                {i + 1}
              </span>
              <div>
                <p className="text-sm font-semibold" style={{ color: "var(--kipu-text)" }}>{p.titulo}</p>
                <p className="text-xs mt-0.5" style={{ color: "var(--kipu-muted)" }}>{p.texto}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {/* Qué incluye y qué no */}
      <section className="grid md:grid-cols-2 gap-3">
        <div className="rounded-xl p-5 space-y-3" style={caja}>
          <h2 className="text-base font-bold" style={{ color: "var(--kipu-text)" }}>Qué incluye</h2>
          <ul className="space-y-2">
            {INCLUYE.map((t) => (
              <li key={t} className="flex gap-2 text-sm" style={{ color: "var(--kipu-text)" }}>
                <CheckCircle2 size={15} className="shrink-0 mt-0.5" style={{ color: "var(--kipu-success)" }} /> {t}
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-xl p-5 space-y-3" style={caja}>
          <h2 className="text-base font-bold" style={{ color: "var(--kipu-text)" }}>Qué no incluye</h2>
          <ul className="space-y-2">
            {NO_INCLUYE.map((t) => (
              <li key={t} className="flex gap-2 text-sm" style={{ color: "var(--kipu-text)" }}>
                <XCircle size={15} className="shrink-0 mt-0.5" style={{ color: "var(--kipu-subtle)" }} /> {t}
              </li>
            ))}
          </ul>
          <p className="text-xs pt-1" style={{ color: "var(--kipu-subtle)" }}>
            Si necesitas algo de esto, te cotizamos aparte y esperamos tu visto bueno antes de empezar.
          </p>
        </div>
      </section>

      {/* Garantía y clave */}
      <section className="grid md:grid-cols-2 gap-3">
        <div className="rounded-xl p-5 space-y-2" style={caja}>
          <p className="flex items-center gap-2 text-base font-bold" style={{ color: "var(--kipu-text)" }}>
            <ShieldCheck size={18} style={{ color: "var(--kipu-accent)" }} /> Nuestra garantía
          </p>
          <p className="text-sm" style={{ color: "var(--kipu-muted)" }}>
            Si la declaración que presentamos necesita corregirse, la sustitutiva va por nuestra cuenta. Una persona
            del equipo de Kipu revisa tu declaración antes de presentarla.
          </p>
        </div>
        <div className="rounded-xl p-5 space-y-2" style={caja}>
          <p className="flex items-center gap-2 text-base font-bold" style={{ color: "var(--kipu-text)" }}>
            <KeyRound size={18} style={{ color: "var(--kipu-accent)" }} /> Tu clave, cuidada
          </p>
          <p className="text-sm" style={{ color: "var(--kipu-muted)" }}>
            Se guarda cifrada y ves cada vez que alguien la usa. El día que presentamos tu renta la borramos y te
            avisamos para que la cambies.
          </p>
        </div>
      </section>

      {/* Preguntas */}
      <section className="space-y-3">
        <h2 className="text-lg font-bold" style={{ color: "var(--kipu-text)" }}>Preguntas frecuentes</h2>
        <div className="rounded-xl overflow-hidden" style={caja}>
          {PREGUNTAS(anio).map(([p, r], i) => (
            <details key={p} className="group px-4 py-3" style={{ borderTop: i ? "1px solid var(--kipu-border)" : "none" }}>
              <summary className="text-sm font-medium list-none flex items-center justify-between gap-3"
                       style={{ color: "var(--kipu-text)" }}>
                {p}
                <span className="text-lg leading-none transition-transform group-open:rotate-45" style={{ color: "var(--kipu-subtle)" }}>+</span>
              </summary>
              <p className="text-sm mt-2" style={{ color: "var(--kipu-muted)" }}>{r}</p>
            </details>
          ))}
        </div>
      </section>
    </>
  );
}

// ── Página ───────────────────────────────────────────────────────────────────
export default function KipuRentaPage() {
  const esAdmin      = useAuthStore((s) => s.empresa?.rol === "admin");
  const enProduccion = useAuthStore((s) => s.empresa?.ambiente === 2);
  const [estado,     setEstado]     = useState<EstadoRenta | null>(null);
  const [terminos,   setTerminos]   = useState<Terminos | null>(null);
  const [cargando,   setCargando]   = useState(true);
  const [acepta,     setAcepta]     = useState(false);
  const [autoriza,   setAutoriza]   = useState(false);
  const [enviando,   setEnviando]   = useState(false);
  const [error,      setError]      = useState("");
  // Vuelve de Stripe: ?pago=exitoso (el aviso del pago puede tardar unos segundos) o ?pago=cancelado
  const [pago,       setPago]       = useState<"exitoso" | "cancelado" | null>(null);

  const traer = () => Promise.all([
    api.get("/api/v1/app/renta/estado"),
    api.get("/api/v1/app/renta/terminos"),
  ]);

  const cargar = useCallback(async () => {
    try {
      const [e, t] = await traer();
      setEstado(e.data.data);
      setTerminos(t.data.data);
    } catch (err: unknown) {
      setError(detalle(err, "No pudimos cargar Kipu Renta. Intenta de nuevo."));
    }
  }, []);

  useEffect(() => {
    const p = new URLSearchParams(window.location.search).get("pago");
    let vivo = true;
    traer()
      .then(([e, t]) => {
        if (!vivo) return;
        if (p === "exitoso" || p === "cancelado") setPago(p);
        setEstado(e.data.data);
        setTerminos(t.data.data);
      })
      .catch((err: unknown) => { if (vivo) setError(detalle(err, "No pudimos cargar Kipu Renta. Intenta de nuevo.")); })
      .finally(() => { if (vivo) setCargando(false); });
    return () => { vivo = false; };
  }, []);

  // Pagó pero Stripe todavía no avisó: se reintenta unas veces
  const comprado = !!estado?.comprado;
  useEffect(() => {
    if (pago !== "exitoso" || comprado || cargando) return;
    let intentos = 0;
    const t = setInterval(async () => {
      intentos += 1;
      try {
        const r = await api.get("/api/v1/app/renta/estado");
        if (r.data.data.comprado || intentos >= 10) {
          setEstado(r.data.data);
          clearInterval(t);
        }
      } catch {
        if (intentos >= 10) clearInterval(t);
      }
    }, 3000);
    return () => clearInterval(t);
  }, [pago, comprado, cargando]);

  const contratar = async () => {
    if (!terminos || !(estado?.aceptado || (acepta && autoriza))) return;
    setEnviando(true);
    setError("");
    try {
      if (!estado?.aceptado) {
        await api.post("/api/v1/app/renta/aceptar", {
          version: terminos.version, hash: terminos.hash, acepta_terminos: true, autoriza_clave_sri: true,
        });
      }
      const r = await api.post("/api/v1/app/renta/checkout");
      window.location.href = r.data.checkout_url;
    } catch (err: unknown) {
      setError(detalle(err, "No pudimos continuar al pago. Intenta de nuevo."));
      setEnviando(false);
      void cargar();
    }
  };

  if (cargando) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 size={22} className="animate-spin" style={{ color: "var(--kipu-subtle)" }} />
      </div>
    );
  }

  const mensajeError = error && (
    <p className="text-sm px-3 py-2 rounded-lg"
       style={{ color: "var(--kipu-danger)", background: "color-mix(in srgb, var(--kipu-danger) 10%, transparent)" }}>
      {error}
    </p>
  );

  if (!estado) {
    return <div className="p-4 md:p-6 max-w-3xl mx-auto">{mensajeError}</div>;
  }

  // ── Contratado: el avance y la clave ─────────────────────────────────────
  if (estado.comprado) {
    return (
      <div className="p-4 md:p-6 max-w-3xl mx-auto space-y-5">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
               style={{ background: "color-mix(in srgb, var(--kipu-accent) 15%, transparent)" }}>
            <FileCheck2 size={20} style={{ color: "var(--kipu-accent)" }} />
          </div>
          <div>
            <h1 className="text-xl font-bold" style={{ color: "var(--kipu-text)" }}>Kipu Renta {estado.anio}</h1>
            <p className="text-sm" style={{ color: "var(--kipu-muted)" }}>El equipo de Kipu prepara y presenta tu renta.</p>
          </div>
        </div>

        {mensajeError}

        {pago === "exitoso" && (
          <div className="rounded-xl p-4 flex items-start gap-2 text-sm" style={{ ...caja, color: "var(--kipu-text)" }}>
            <CheckCircle2 size={18} className="shrink-0" style={{ color: "var(--kipu-success)" }} />
            <span>
              <strong>¡Listo, recibimos tu pago!</strong> Te llega la factura por correo.
              {esAdmin && " Ahora guarda tu clave del SRI para que podamos empezar."}
            </span>
          </div>
        )}

        <PanelCliente />
        {esAdmin && <ClaveSri />}

        <div className="rounded-xl p-4 text-sm space-y-2" style={{ ...caja, color: "var(--kipu-muted)" }}>
          <p>
            Mándanos lo que el SRI no tiene en electrónico: gastos personales con comprobante físico, retenciones en
            papel, ingresos que no facturaste y tus cargas familiares. Atendemos de lunes a viernes, de 8:00 a 17:00.
          </p>
          <a href={whatsapp(`Hola, contraté Kipu Renta ${estado.anio} y les envío mis documentos.`)}
             target="_blank" rel="noopener noreferrer"
             className="inline-flex items-center gap-1.5 font-medium" style={{ color: "var(--kipu-accent)" }}>
            <MessageCircle size={14} /> Escribir por WhatsApp
          </a>
        </div>

        <p className="text-xs text-center" style={{ color: "var(--kipu-subtle)" }}>
          ¿Quieres que también presentemos tu IVA todo el año?{" "}
          <Link href="/al-dia" className="underline">Conoce Kipu Al Día</Link>
        </p>
      </div>
    );
  }

  // ── Sin contratar: venta, términos y pago ───────────────────────────────
  const precio = estado.precio.total;
  const contratarBloque = (
    !enProduccion ? (
      <div className="rounded-xl p-4 text-sm" style={{ ...caja, color: "var(--kipu-muted)" }}>
        Podrás contratarlo cuando tu empresa esté en producción. Si tienes dudas, escríbenos por WhatsApp.
      </div>
    ) : estado.motivo_no_elegible ? (
      <div className="rounded-xl p-4 text-sm" style={{ ...caja, color: "var(--kipu-muted)" }}>
        {estado.motivo_no_elegible}
      </div>
    ) : estado.incluida_en_al_dia ? (
      <div className="rounded-xl p-4 text-sm" style={{ ...caja, color: "var(--kipu-muted)" }}>
        Tu renta {estado.anio} ya está incluida en tu Kipu Al Día: no tienes que pagar nada más.{" "}
        <Link href="/al-dia" className="underline" style={{ color: "var(--kipu-accent)" }}>Ver mis declaraciones</Link>
      </div>
    ) : !estado.disponible ? (
      <div className="rounded-xl p-4 text-sm" style={{ ...caja, color: "var(--kipu-muted)" }}>
        Kipu Renta estará disponible muy pronto.
      </div>
    ) : !esAdmin ? (
      <div className="rounded-xl p-4 text-sm" style={{ ...caja, color: "var(--kipu-muted)" }}>
        Solo el administrador de la empresa puede contratar Kipu Renta.
      </div>
    ) : terminos && (
      <div className="rounded-xl p-5 space-y-4" style={caja}>
        <div className="flex items-center gap-2">
          <ShieldCheck size={18} style={{ color: "var(--kipu-accent)" }} />
          <p className="font-semibold" style={{ color: "var(--kipu-text)" }}>Términos del servicio</p>
          <span className="text-xs" style={{ color: "var(--kipu-subtle)" }}>versión {terminos.version}</span>
        </div>
        <div className="max-h-96 overflow-y-auto rounded-lg p-4"
             style={{ background: "var(--kipu-bg)", border: "1px solid var(--kipu-border)" }}>
          <TextoTerminos texto={terminos.texto} />
        </div>

        <label className="flex items-start gap-2.5 text-sm cursor-pointer" style={{ color: "var(--kipu-text)" }}>
          <input type="checkbox" checked={acepta || estado.aceptado} disabled={estado.aceptado}
                 onChange={e => setAcepta(e.target.checked)} className="mt-0.5 w-4 h-4"
                 style={{ accentColor: "var(--kipu-accent)" }} />
          Leí y acepto los términos de Kipu Renta.
        </label>
        <label className="flex items-start gap-2.5 text-sm cursor-pointer" style={{ color: "var(--kipu-text)" }}>
          <input type="checkbox" checked={autoriza || estado.aceptado} disabled={estado.aceptado}
                 onChange={e => setAutoriza(e.target.checked)} className="mt-0.5 w-4 h-4"
                 style={{ accentColor: "var(--kipu-accent)" }} />
          Autorizo a Kipu a usar mi clave del SRI solo para lo que dice la sección 5
          (mi declaración de renta {estado.anio}, descarga de comprobantes y consultas).
        </label>

        <button
          type="button"
          onClick={contratar}
          disabled={enviando || !(estado.aceptado || (acepta && autoriza))}
          className="w-full py-3 rounded-lg text-white font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-50"
          style={{ background: "var(--kipu-accent)" }}
        >
          {enviando
            ? <><Loader2 size={16} className="animate-spin" /> Abriendo el pago...</>
            : `Pagar $${precio.toFixed(0)} y empezar`}
        </button>
        <p className="text-xs text-center" style={{ color: "var(--kipu-subtle)" }}>
          Pagas con tarjeta en Stripe. Te enviamos por correo la factura y una copia de los términos que aceptaste.
          ¿Prefieres transferencia?{" "}
          <a href={whatsapp(`Hola, quiero contratar Kipu Renta ${estado.anio} pagando por transferencia.`)}
             target="_blank" rel="noopener noreferrer" className="underline" style={{ color: "var(--kipu-accent)" }}>
            Escríbenos
          </a>.
        </p>
      </div>
    )
  );

  const irAContratar = () =>
    document.getElementById("contratar")?.scrollIntoView({ behavior: "smooth", block: "start" });

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto space-y-8">
      {mensajeError}
      {pago === "exitoso" && (
        <div className="rounded-xl p-4 flex items-center gap-2 text-sm" style={{ ...caja, color: "var(--kipu-text)" }}>
          <Loader2 size={16} className="animate-spin shrink-0" style={{ color: "var(--kipu-accent)" }} />
          Estamos confirmando tu pago. Esto toma unos segundos; si tarda, recarga la página.
        </div>
      )}
      {pago === "cancelado" && (
        <div className="rounded-xl p-4 text-sm" style={{ ...caja, color: "var(--kipu-muted)" }}>
          No se completó el pago. Puedes intentarlo de nuevo cuando quieras.
        </div>
      )}

      {/* Si ya declaramos por él antes (Kipu Renta o Al Día), su historial se sigue viendo */}
      <PanelCliente soloHistorial />

      <Venta estado={estado} onContratar={irAContratar} />

      <section id="contratar" className="space-y-3 scroll-mt-4">
        <h2 className="text-lg font-bold" style={{ color: "var(--kipu-text)" }}>Contratar Kipu Renta {estado.anio}</h2>
        {contratarBloque}
      </section>

      <p className="text-xs text-center" style={{ color: "var(--kipu-subtle)" }}>
        ¿Quieres que también presentemos tu IVA todo el año?{" "}
        <Link href="/al-dia" className="underline">Conoce Kipu Al Día</Link>
        {" · "}
        <Link href="/planes" className="underline">Ver todos los planes</Link>
      </p>
    </div>
  );
}
