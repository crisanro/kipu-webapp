"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { CalendarCheck, CheckCircle2, Loader2, MessageCircle, ShieldCheck } from "lucide-react";
import api from "@/lib/api";
import { useAuthStore } from "@/store/auth.store";
import ClaveSri from "@/components/al-dia/ClaveSri";
import PanelCliente from "@/components/al-dia/PanelCliente";
import TextoTerminos from "@/components/al-dia/TextoTerminos";
import OfertaRenta from "@/components/renta/OfertaRenta";
import { HeroAlDia, DemoAlDia, ComoFunciona, QueIncluye, Confianza, Preguntas } from "@/components/al-dia/Venta";

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
  // Tiene Kipu Pro: al pagar Al Día se cancela el Pro y se devuelve lo no usado
  cambio_desde_pro: {
    metodo:         "TARJETA" | "TRANSFERENCIA";
    dias_no_usados: number | null;
    monto_estimado: number | null;
    sin_devolucion: boolean;
    minimo:         number;
  } | null;
  period_end:           string | null;
  cancel_at_period_end: boolean;
}
interface Terminos { version: string; texto: string; hash: string }

function detalle(err: unknown, porDefecto: string): string {
  const d = (err as { response?: { data?: { detail?: unknown } } })?.response?.data?.detail;
  return typeof d === "string" ? d : porDefecto;
}

export default function KipuAlDiaPage() {
  // Contratar y gestionar el pago es solo del administrador (igual que en el backend)
  const esAdmin = useAuthStore((s) => s.empresa?.rol === "admin");
  const empresa = useAuthStore((s) => s.empresa);
  const enProduccion = empresa?.ambiente === 2;
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

  // Desde "pago exitoso" se llega con #clave-sri: bajar al recuadro cuando ya cargó
  const contratado = !!estado?.contratado;
  useEffect(() => {
    if (cargando || !contratado || window.location.hash !== "#clave-sri") return;
    const t = setTimeout(() => document.getElementById("clave-sri")?.scrollIntoView({ behavior: "smooth" }), 100);
    return () => clearTimeout(t);
  }, [cargando, contratado]);

  // Desde "Quiero que declaren por mí" en /planes se llega con #contratar
  useEffect(() => {
    if (cargando || contratado || window.location.hash !== "#contratar") return;
    const t = setTimeout(() => document.getElementById("contratar")?.scrollIntoView({ behavior: "smooth" }), 100);
    return () => clearTimeout(t);
  }, [cargando, contratado]);

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
  // Sin el precio de Stripe no se muestra un monto (se ve al pagar)
  const precio = estado?.precio?.total ?? null;

  if (cargando) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 size={22} className="animate-spin" style={{ color: "var(--kipu-subtle)" }} />
      </div>
    );
  }

  // Elegibilidad, términos y pago (al final de la página de venta)
  const contratarBloque = (
    !enProduccion ? (
      <div className="rounded-xl p-4 text-sm" style={{ ...caja, color: "var(--kipu-muted)" }}>
        Podrás contratarlo cuando tu empresa esté en producción. Mientras tanto, revisa cómo funciona
        o escríbenos por WhatsApp si tienes dudas.
      </div>
    ) : estado?.motivo_no_elegible ? (
      <div className="rounded-xl p-4 text-sm" style={{ ...caja, color: "var(--kipu-muted)" }}>
        {estado.motivo_no_elegible}
      </div>
    ) : estado?.otra_suscripcion && !estado?.cambio_desde_pro ? (
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

        {/* Tiene Pro: qué pasa con lo que ya pagó */}
        {estado?.cambio_desde_pro && (() => {
          const c = estado.cambio_desde_pro;
          const dias = c.dias_no_usados ?? 0;
          return (
            <div className="rounded-lg px-4 py-3 text-sm space-y-1"
                 style={{ background: "color-mix(in srgb, var(--kipu-accent) 8%, transparent)",
                          border: "1px solid color-mix(in srgb, var(--kipu-accent) 25%, transparent)",
                          color: "var(--kipu-text)" }}>
              <p className="font-semibold">Tienes Kipu Pro: no pierdes lo que ya pagaste</p>
              <p className="text-xs" style={{ color: "var(--kipu-muted)" }}>
                {c.sin_devolucion
                  ? `A tu Kipu Pro le quedan ${dias} día${dias === 1 ? "" : "s"}: es menos de $${c.minimo.toFixed(2)}, así que no hay devolución.`
                  : c.monto_estimado !== null
                    ? <>Cuando se confirme el pago de Al Día cancelamos tu Pro y te devolvemos <b>unos ${c.monto_estimado.toFixed(2)}</b> por
                        los {dias} días que no vas a usar{c.metodo === "TARJETA"
                          ? ", a la tarjeta con la que pagaste (se ve en 5 a 10 días hábiles)."
                          : ": te pediremos tu cuenta bancaria y te lo transferimos."}</>
                    : "Cuando se confirme el pago de Al Día cancelamos tu Pro y te devolvemos los días que no vas a usar; te confirmamos el monto por correo."}
                {" "}Kipu Al Día incluye todo lo de Kipu Pro.
              </p>
            </div>
          );
        })()}

        <button
          type="button"
          onClick={contratar}
          disabled={enviando || !(estado?.aceptado || (acepta && autoriza))}
          className="w-full py-3 rounded-lg text-white font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-50"
          style={{ background: "var(--kipu-accent)" }}
        >
          {enviando
            ? <><Loader2 size={16} className="animate-spin" /> Abriendo el pago...</>
            : precio !== null ? `Contratar por $${precio.toFixed(0)} al mes` : "Continuar al pago"}
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
    )
  );

  const irAContratar = () =>
    document.getElementById("contratar")?.scrollIntoView({ behavior: "smooth", block: "start" });

  // Sin contratar: página de venta (la demo muestra lo que verá después)
  if (!estado?.contratado) {
    return (
      <div className="p-4 md:p-6 max-w-3xl mx-auto space-y-8">
        {error && (
          <p className="text-sm px-3 py-2 rounded-lg"
             style={{ color: "var(--kipu-danger)", background: "color-mix(in srgb, var(--kipu-danger) 10%, transparent)" }}>
            {error}
          </p>
        )}
        {/* Si tuvo el servicio, su historial se sigue viendo */}
        <PanelCliente soloHistorial />
        <HeroAlDia precio={precio} onContratar={irAContratar} />
        <DemoAlDia ruc={empresa?.ruc} semestral={empresa?.periodo_iva === "SEMESTRAL"} enProduccion={enProduccion} />
        <ComoFunciona />
        <QueIncluye />
        <Confianza />
        <Preguntas />

        <section id="contratar" className="space-y-3 scroll-mt-4">
          <h2 className="text-lg font-bold" style={{ color: "var(--kipu-text)" }}>Contratar Kipu Al Día</h2>
          {contratarBloque}
        </section>

        {/* ¿Solo la renta? Kipu Renta (pago único) */}
        <OfertaRenta variante="al-dia" />

        <p className="text-xs text-center" style={{ color: "var(--kipu-subtle)" }}>
          <Link href="/planes" className="underline">Ver todos los planes</Link>
        </p>
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
            Tú facturas. Nosotros declaramos.
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

      {/* Lo que el equipo de Kipu hace por él: lo que viene y el historial */}
      {estado?.contratado && <PanelCliente />}

      {/* Clave del SRI: solo con el servicio contratado y para el administrador */}
      {estado?.contratado && esAdmin && <ClaveSri />}

      <p className="text-xs text-center" style={{ color: "var(--kipu-subtle)" }}>
        <Link href="/planes" className="underline">Volver a Plan y créditos</Link>
      </p>
    </div>
  );
}
