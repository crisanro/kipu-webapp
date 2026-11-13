"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { CalendarCheck, CheckCircle2, Loader2, MessageCircle, ShieldCheck } from "lucide-react";
import api from "@/lib/api";
import { useAuthStore } from "@/store/auth.store";
import ClaveSri from "@/components/al-dia/ClaveSri";

const SOPORTE_WA = "593960585581";

interface Precio { total: number; base: number; iva: number }
interface Estado {
  disponible:           boolean;
  precio:               Precio | null;
  motivo_no_elegible:   string | null;
  version_terminos:     string;
  aceptado:             boolean;
  contratado:           boolean;
  otra_suscripcion:     string | null;
  period_end:           string | null;
  cancel_at_period_end: boolean;
}
interface Terminos { version: string; texto: string; hash: string }

function detalle(err: unknown, porDefecto: string): string {
  const d = (err as { response?: { data?: { detail?: unknown } } })?.response?.data?.detail;
  return typeof d === "string" ? d : porDefecto;
}

// ── Términos: markdown sencillo (títulos, listas, tablas, negritas), sin HTML ──
function enLinea(texto: string): ReactNode[] {
  return texto.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g).filter(Boolean).map((parte, i) => {
    if (parte.startsWith("**")) return <strong key={i} style={{ color: "var(--kipu-text)" }}>{parte.slice(2, -2)}</strong>;
    if (parte.startsWith("*")) return <em key={i}>{parte.slice(1, -1)}</em>;
    return parte;
  });
}

function TextoTerminos({ texto }: { texto: string }) {
  const bloques = texto.trim().split(/\n\s*\n/);
  return (
    <div className="space-y-3 text-sm leading-relaxed" style={{ color: "var(--kipu-muted)" }}>
      {bloques.map((bloque, i) => {
        const lineas = bloque.split("\n");
        if (bloque.startsWith("# "))
          return <h2 key={i} className="text-base font-bold" style={{ color: "var(--kipu-text)" }}>{bloque.slice(2)}</h2>;
        if (bloque.startsWith("## "))
          return <h3 key={i} className="text-sm font-bold pt-2" style={{ color: "var(--kipu-text)" }}>{bloque.slice(3)}</h3>;
        if (lineas.every(l => l.startsWith("|"))) {
          const filas = lineas.filter(l => !/^\|\s*-/.test(l)).map(l => l.split("|").slice(1, -1).map(c => c.trim()));
          return (
            <table key={i} className="w-full text-xs">
              <tbody>
                {filas.map((celdas, f) => (
                  <tr key={f} style={{ borderBottom: "1px solid var(--kipu-border)" }}>
                    {celdas.map((c, k) => (
                      <td key={k} className="py-1.5 pr-2" style={{ fontWeight: f === 0 ? 600 : 400, color: f === 0 ? "var(--kipu-text)" : undefined }}>
                        {c}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          );
        }
        if (lineas.every(l => l.startsWith("- ")))
          return <ul key={i} className="list-disc pl-5 space-y-1">{lineas.map((l, k) => <li key={k}>{enLinea(l.slice(2))}</li>)}</ul>;
        if (lineas.every(l => /^\d+\. /.test(l)))
          return <ol key={i} className="list-decimal pl-5 space-y-1">{lineas.map((l, k) => <li key={k}>{enLinea(l.replace(/^\d+\. /, ""))}</li>)}</ol>;
        return <p key={i}>{enLinea(bloque)}</p>;
      })}
    </div>
  );
}

export default function KipuAlDiaPage() {
  // Contratar y gestionar el pago es solo del administrador (igual que en el backend)
  const esAdmin = useAuthStore((s) => s.empresa?.rol === "admin");
  const [estado,    setEstado]    = useState<Estado | null>(null);
  const [terminos,  setTerminos]  = useState<Terminos | null>(null);
  const [cargando,  setCargando]  = useState(true);
  const [acepta,    setAcepta]    = useState(false);
  const [autoriza,  setAutoriza]  = useState(false);
  const [enviando,  setEnviando]  = useState(false);
  const [error,     setError]     = useState("");

  const traer = () => Promise.all([
    api.get("/api/v1/app/al-dia/estado"),
    api.get("/api/v1/app/al-dia/terminos"),
  ]);

  // Recarga tras un error al contratar (p. ej. los términos cambiaron)
  const cargar = useCallback(async () => {
    try {
      const [e, t] = await traer();
      setEstado(e.data.data);
      setTerminos(t.data.data);
    } catch (err: unknown) {
      setError(detalle(err, "No pudimos cargar Kipu Al Día. Intenta de nuevo."));
    }
  }, []);

  useEffect(() => {
    let vivo = true;
    traer()
      .then(([e, t]) => {
        if (!vivo) return;
        setEstado(e.data.data);
        setTerminos(t.data.data);
      })
      .catch((err: unknown) => { if (vivo) setError(detalle(err, "No pudimos cargar Kipu Al Día. Intenta de nuevo.")); })
      .finally(() => { if (vivo) setCargando(false); });
    return () => { vivo = false; };
  }, []);

  const contratar = async () => {
    // Quien ya aceptó (y volvió tras cancelar el pago) pasa directo al pago
    if (!terminos || !(estado?.aceptado || (acepta && autoriza))) return;
    setEnviando(true);
    setError("");
    try {
      if (!estado?.aceptado) {
        await api.post("/api/v1/app/al-dia/aceptar", {
          version: terminos.version, hash: terminos.hash, acepta_terminos: true, autoriza_clave_sri: true,
        });
      }
      const r = await api.post("/api/v1/app/al-dia/checkout");
      window.location.href = r.data.checkout_url;
    } catch (err: unknown) {
      setError(detalle(err, "No pudimos continuar al pago. Intenta de nuevo."));
      setEnviando(false);
      void cargar();
    }
  };

  const gestionarPago = async () => {
    try {
      const r = await api.post("/api/v1/app/suscripcion/portal");
      window.location.href = r.data.portal_url;
    } catch (err: unknown) {
      setError(detalle(err, "No pudimos abrir la gestión del pago."));
    }
  };

  const caja = { background: "var(--kipu-surface)", border: "1px solid var(--kipu-border)" };
  const precio = estado?.precio?.total ?? 40;

  if (cargando) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 size={22} className="animate-spin" style={{ color: "var(--kipu-subtle)" }} />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto space-y-5">
      {/* Encabezado */}
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
             style={{ background: "color-mix(in srgb, var(--kipu-accent) 15%, transparent)" }}>
          <CalendarCheck size={20} style={{ color: "var(--kipu-accent)" }} />
        </div>
        <div>
          <h1 className="text-xl font-bold" style={{ color: "var(--kipu-text)" }}>Kipu Al Día</h1>
          <p className="text-sm" style={{ color: "var(--kipu-muted)" }}>
            Tú atiende a tus clientes. Del SRI nos encargamos nosotros.
          </p>
        </div>
      </div>

      {error && (
        <p className="text-sm px-3 py-2 rounded-lg"
           style={{ color: "var(--kipu-danger)", background: "color-mix(in srgb, var(--kipu-danger) 10%, transparent)" }}>
          {error}
        </p>
      )}

      {/* Ya contratado */}
      {estado?.contratado && (
        <div className="rounded-xl p-5 space-y-2" style={caja}>
          <div className="flex items-center gap-2">
            <CheckCircle2 size={18} style={{ color: "var(--kipu-success)" }} />
            <p className="font-semibold" style={{ color: "var(--kipu-text)" }}>Tienes Kipu Al Día activo</p>
          </div>
          <p className="text-sm" style={{ color: "var(--kipu-muted)" }}>
            {estado.cancel_at_period_end ? "Cancelado: el servicio sigue hasta " : "Próximo cobro: "}
            {estado.period_end ? new Date(estado.period_end).toLocaleDateString("es-EC") : "—"}.
            Cualquier duda, escríbenos por WhatsApp de lunes a viernes, de 8:00 a 17:00.
          </p>
          {esAdmin && (
            <button type="button" onClick={gestionarPago} className="text-sm underline" style={{ color: "var(--kipu-accent)" }}>
              Cambiar tarjeta o cancelar
            </button>
          )}
        </div>
      )}

      {/* Clave del SRI: solo con el servicio contratado y para el administrador */}
      {estado?.contratado && esAdmin && <ClaveSri />}

      {!estado?.contratado && (
        <>
          {/* Qué incluye */}
          <div className="rounded-xl p-5 space-y-4" style={caja}>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold" style={{ color: "var(--kipu-text)" }}>${precio.toFixed(0)}</span>
              <span className="text-sm" style={{ color: "var(--kipu-muted)" }}>al mes, IVA incluido</span>
            </div>
            <p className="text-xs" style={{ color: "var(--kipu-subtle)" }}>
              Precio de lanzamiento: si entras ahora, mantienes este precio mientras sigas en el plan.
            </p>
            <ul className="grid sm:grid-cols-2 gap-2 text-sm" style={{ color: "var(--kipu-muted)" }}>
              {[
                "Kipu Pro: facturas sin límite",
                "Declaración de IVA mensual o semestral",
                "Revisión de tus compras cada mes",
                "Declaración anual de renta",
                "Aviso por WhatsApp de cuánto pagar",
                "Resumen para revisar antes de declarar",
              ].map(t => (
                <li key={t} className="flex items-start gap-2">
                  <CheckCircle2 size={15} className="shrink-0 mt-0.5" style={{ color: "var(--kipu-accent)" }} />
                  {t}
                </li>
              ))}
            </ul>
            <p className="text-xs" style={{ color: "var(--kipu-subtle)" }}>
              Para personas naturales no obligadas a llevar contabilidad (régimen general o RIMPE Emprendedor).
            </p>
          </div>

          {/* No aplica / otra suscripción / no disponible */}
          {estado?.motivo_no_elegible ? (
            <div className="rounded-xl p-4 text-sm" style={{ ...caja, color: "var(--kipu-muted)" }}>
              {estado.motivo_no_elegible}
            </div>
          ) : estado?.otra_suscripcion ? (
            <div className="rounded-xl p-4 text-sm space-y-2" style={{ ...caja, color: "var(--kipu-muted)" }}>
              <p>Ya tienes Kipu Pro activo. Escríbenos y te pasamos a Kipu Al Día sin perder lo que ya pagaste.</p>
              <a href={`https://wa.me/${SOPORTE_WA}?text=${encodeURIComponent("Hola, tengo Kipu Pro y quiero pasarme a Kipu Al Día.")}`}
                 target="_blank" rel="noopener noreferrer"
                 className="inline-flex items-center gap-1.5 font-medium" style={{ color: "var(--kipu-accent)" }}>
                <MessageCircle size={14} /> Escribir por WhatsApp
              </a>
            </div>
          ) : !estado?.disponible ? (
            <div className="rounded-xl p-4 text-sm" style={{ ...caja, color: "var(--kipu-muted)" }}>
              Kipu Al Día estará disponible muy pronto.
            </div>
          ) : !esAdmin ? (
            <div className="rounded-xl p-4 text-sm" style={{ ...caja, color: "var(--kipu-muted)" }}>
              Solo el administrador de la empresa puede contratar Kipu Al Día.
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
                <input type="checkbox" checked={acepta || !!estado?.aceptado} disabled={!!estado?.aceptado}
                       onChange={e => setAcepta(e.target.checked)} className="mt-0.5 w-4 h-4"
                       style={{ accentColor: "var(--kipu-accent)" }} />
                Leí y acepto los términos de Kipu Al Día.
              </label>
              <label className="flex items-start gap-2.5 text-sm cursor-pointer" style={{ color: "var(--kipu-text)" }}>
                <input type="checkbox" checked={autoriza || !!estado?.aceptado} disabled={!!estado?.aceptado}
                       onChange={e => setAutoriza(e.target.checked)} className="mt-0.5 w-4 h-4"
                       style={{ accentColor: "var(--kipu-accent)" }} />
                Autorizo a Kipu a usar mi clave del SRI solo para lo que dice la sección 5
                (declaraciones, descarga de comprobantes y consultas).
              </label>

              <button
                type="button"
                onClick={contratar}
                disabled={enviando || !(estado?.aceptado || (acepta && autoriza))}
                className="w-full py-3 rounded-lg text-white font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-50"
                style={{ background: "var(--kipu-accent)" }}
              >
                {enviando
                  ? <><Loader2 size={16} className="animate-spin" /> Abriendo el pago...</>
                  : `Contratar por $${precio.toFixed(0)} al mes`}
              </button>
              <p className="text-xs text-center" style={{ color: "var(--kipu-subtle)" }}>
                Pagas con tarjeta en Stripe. Te enviamos por correo una copia de los términos que aceptaste.
                ¿Prefieres transferencia?{" "}
                <a href={`https://wa.me/${SOPORTE_WA}?text=${encodeURIComponent("Hola, quiero contratar Kipu Al Día pagando por transferencia.")}`}
                   target="_blank" rel="noopener noreferrer" className="underline" style={{ color: "var(--kipu-accent)" }}>
                  Escríbenos
                </a>.
              </p>
            </div>
          )}
        </>
      )}

      <p className="text-xs text-center" style={{ color: "var(--kipu-subtle)" }}>
        <Link href="/planes" className="underline">Volver a Plan y créditos</Link>
      </p>
    </div>
  );
}
