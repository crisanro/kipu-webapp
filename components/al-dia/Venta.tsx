"use client";
// components/al-dia/Venta.tsx — página de venta de Kipu Al Día (/al-dia sin contratar).
// La demo usa la fecha real del SRI según el RUC y, si la empresa ya factura en
// Kipu, sus ventas reales del mes pasado. Lo demás es ejemplo y se marca así.
// Los extras y la garantía repiten app/legal/kipu_al_dia_v1.md: mantenerlos iguales
// (la garantía la aprobó el dueño el 2026-11-25).
// En la app (reglas de las tiendas) Al Día es solo informativo: sin precios ni
// montos, y un solo botón de WhatsApp; se contrata y se paga por fuera.
import { useEffect, useState, type ReactNode } from "react";
import {
  CalendarCheck, CheckCircle2, Clock, FileCheck2, KeyRound, MessageCircle,
  Receipt, ShieldCheck, Users, XCircle,
} from "lucide-react";
import api from "@/lib/api";
import { hoyEC, MESES } from "@/lib/fecha";
import { EtiquetaEjemplo } from "@/components/EjemploPro";
import { ES_APP_NATIVA } from "@/lib/plataforma";
import { dolares } from "@/lib/dinero";

const caja  = { background: "var(--kipu-surface)", border: "1px solid var(--kipu-border)" };
const fechaCorta = (d: Date) => d.toLocaleDateString("es-EC", { day: "2-digit", month: "2-digit", year: "numeric" });

// ── Calendario del SRI: el día de vencimiento sale del noveno dígito del RUC ──
const DIA_POR_DIGITO: Record<string, number> = {
  "1": 10, "2": 12, "3": 14, "4": 16, "5": 18, "6": 20, "7": 22, "8": 24, "9": 26, "0": 28,
};
function diaVencimiento(ruc?: string | null): number {
  return DIA_POR_DIGITO[ruc?.[8] ?? ""] ?? 28;
}

interface Periodo { nombre: string; vence: Date; cerrado: boolean }

/** Próxima declaración de IVA y las dos anteriores. */
function calendario(ruc: string | null | undefined, semestral: boolean) {
  const [y, m, d] = hoyEC().split("-").map(Number);
  const hoy = new Date(y, m - 1, d);
  const dia = diaVencimiento(ruc);
  const lista: Periodo[] = [];
  if (semestral) {
    // 1.er semestre se declara en julio; el 2.º, en enero del año siguiente
    for (let a = y - 2; a <= y + 1; a++) {
      lista.push({ nombre: `IVA del primer semestre ${a}`,  vence: new Date(a, 6, dia),     cerrado: true });
      lista.push({ nombre: `IVA del segundo semestre ${a}`, vence: new Date(a + 1, 0, dia), cerrado: true });
    }
  } else {
    for (let k = -4; k <= 1; k++) {
      const p = new Date(y, m - 1 + k, 1);              // mes declarado
      lista.push({ nombre: `IVA de ${MESES[p.getMonth()]}`, vence: new Date(p.getFullYear(), p.getMonth() + 1, dia), cerrado: true });
    }
  }
  lista.sort((a, b) => a.vence.getTime() - b.vence.getTime());
  // La primera incluida es la del periodo en curso (se declara al mes siguiente).
  // El periodo termina el último día del mes anterior a su vencimiento.
  const fin = (p: Periodo) => new Date(p.vence.getFullYear(), p.vence.getMonth(), 0);
  const i = Math.max(0, lista.findIndex((p) => fin(p) >= hoy));
  const proxima = { ...lista[i], cerrado: false };
  const anteriores = lista.slice(Math.max(0, i - 2), i).reverse();
  return { proxima, anteriores, hoy, anioRenta: m > 3 ? y - 1 : y - 2 };
}

interface Ventas { mes: string; total: number; iva: number; docs: number }

/** Ventas reales del mes pasado (si la empresa ya factura en producción). */
function useVentasMesPasado(enProduccion: boolean): Ventas | null {
  const [ventas, setVentas] = useState<Ventas | null>(null);
  useEffect(() => {
    if (!enProduccion) return;
    const [y, m] = hoyEC().split("-").map(Number);
    const ini = new Date(y, m - 2, 1), fin = new Date(y, m - 1, 0);
    const iso = (x: Date) => `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}-${String(x.getDate()).padStart(2, "0")}`;
    let vivo = true;
    api.get(`/api/v1/app/dashboard?fecha_inicio=${iso(ini)}&fecha_fin=${iso(fin)}&sandbox=false`)
      .then((r) => {
        const res = r.data?.data?.resumen;
        if (vivo && res && res.total_documentos > 0) {
          setVentas({ mes: MESES[ini.getMonth()], total: res.importe_total, iva: res.valor_iva, docs: res.total_documentos });
        }
      })
      .catch(() => {});
    return () => { vivo = false; };
  }, [enProduccion]);
  return ventas;
}

// ── Encabezado ────────────────────────────────────────────────────────────────
export function HeroAlDia({ precio, base = null, periodo = "MENSUAL", onContratar, whatsapp }: {
  precio: number | null; base?: number | null; periodo?: "MENSUAL" | "ANUAL"; onContratar: () => void;
  whatsapp?: string;   // app: el enlace de "Escríbenos por WhatsApp" (en vez de precio y contratar)
}) {
  return (
    <div className="rounded-2xl p-6 md:p-8 space-y-4"
         style={{
           background: "linear-gradient(135deg, color-mix(in srgb, var(--kipu-accent) 14%, var(--kipu-surface)), var(--kipu-surface))",
           border: "1px solid color-mix(in srgb, var(--kipu-accent) 30%, transparent)",
         }}>
      <div className="flex items-center gap-2">
        <CalendarCheck size={18} style={{ color: "var(--kipu-accent)" }} />
        <span className="text-sm font-semibold" style={{ color: "var(--kipu-accent)" }}>
          {ES_APP_NATIVA ? "Kipu Al Día · Tu contador" : "Kipu Al Día"}
        </span>
      </div>
      {/* En la app se vende como el servicio de un contador (Apple 3.1.3(e));
          la web conserva su texto */}
      {ES_APP_NATIVA ? (
        <>
          <h1 className="text-2xl md:text-3xl font-extrabold leading-tight" style={{ color: "var(--kipu-text)" }}>
            Tú facturas.<br />Tu contador declara.
          </h1>
          <p className="text-sm md:text-base max-w-xl" style={{ color: "var(--kipu-muted)" }}>
            Un contador del equipo de Kipu revisa cada mes tus ventas y compras, presenta tus
            declaraciones de IVA y renta en el SRI, revisa tu buzón del SRI y te responde por WhatsApp.
            Tú sigues con tu negocio.
          </p>
        </>
      ) : (
        <>
          <h1 className="text-2xl md:text-3xl font-extrabold leading-tight" style={{ color: "var(--kipu-text)" }}>
            Tú facturas.<br />Nosotros declaramos.
          </h1>
          <p className="text-sm md:text-base max-w-xl" style={{ color: "var(--kipu-muted)" }}>
            Cada mes revisamos tus ventas y compras, te mandamos el resumen por WhatsApp y presentamos
            tus declaraciones de IVA y renta al SRI. Tú sigues con tu negocio.
          </p>
        </>
      )}
      {ES_APP_NATIVA ? (
        // App: sin precio ni compra; un solo botón, al WhatsApp del equipo
        <a href={whatsapp} target="_blank" rel="noopener noreferrer"
           className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-white font-semibold text-sm shadow-md
                      bg-[var(--kipu-accent)] active:scale-[0.97]">
          <MessageCircle size={16} /> Escríbenos por WhatsApp
        </a>
      ) : (
      <div className="flex flex-wrap items-center gap-4 pt-1">
        {precio !== null ? (
          <div>
            <span className="text-3xl font-extrabold" style={{ color: "var(--kipu-text)" }}>${precio.toFixed(2)}</span>
            <span className="text-sm ml-1.5" style={{ color: "var(--kipu-muted)" }}>
              {periodo === "ANUAL" ? "al año" : "al mes"}, IVA incluido
            </span>
            {/* La base sin IVA, como en /planes */}
            {base !== null && (
              <p className="text-xs mt-0.5" style={{ color: "var(--kipu-subtle)" }}>${base.toFixed(2)} + IVA</p>
            )}
          </div>
        ) : (
          <span className="text-sm" style={{ color: "var(--kipu-subtle)" }}>
            {periodo === "ANUAL" ? "Anual" : "Mensual"} · el precio lo ves al pagar
          </span>
        )}
        <button type="button" onClick={onContratar}
                className="px-5 py-2.5 rounded-xl text-white font-semibold text-sm shadow-md transition-all
                           bg-[var(--kipu-accent)] hover:bg-[var(--kipu-accent-h)] active:scale-[0.97]">
          Quiero que declaren por mí
        </button>
      </div>
      )}
      <p className="text-xs" style={{ color: "var(--kipu-subtle)" }}>
        {/* En la app: el servicio del contador (Apple/Google: servicio profesional,
            no contenido digital), sin precios ni condiciones de pago */}
        {ES_APP_NATIVA
          ? "Servicio de contadores del equipo de Kipu · Te contamos todo por WhatsApp"
          : "Incluye todo Kipu Pro · Tu precio no sube mientras sigas suscrito · Cancelas cuando quieras"}
      </p>
    </div>
  );
}

// ── Demo: así se ve tu Kipu Al Día ────────────────────────────────────────────
export function DemoAlDia({ ruc, semestral, enProduccion }: {
  ruc?: string | null; semestral: boolean; enProduccion: boolean;
}) {
  const ventas = useVentasMesPasado(enProduccion);
  const { proxima, anteriores, hoy, anioRenta } = calendario(ruc, semestral);
  const diasFaltan = Math.round((proxima.vence.getTime() - hoy.getTime()) / 86400000);

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-lg font-bold" style={{ color: "var(--kipu-text)" }}>Así se ve tu Kipu Al Día</h2>
        <EtiquetaEjemplo />
      </div>
      <p className="text-xs -mt-2" style={{ color: "var(--kipu-subtle)" }}>
        {ventas
          ? "Con tu fecha de vencimiento del SRI y tus ventas reales del mes pasado. El historial es de ejemplo."
          : "Con tu fecha de vencimiento del SRI. Los valores y el historial son de ejemplo."}
      </p>

      <div className="grid md:grid-cols-2 gap-3">
        {/* Próxima declaración */}
        <div className="rounded-xl p-4 space-y-2" style={caja}>
          <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--kipu-subtle)" }}>
            Tu primera declaración si contratas hoy
          </p>
          <p className="text-base font-bold" style={{ color: "var(--kipu-text)" }}>{proxima.nombre}</p>
          <p className="text-sm" style={{ color: "var(--kipu-muted)" }}>
            Vence el {proxima.vence.getDate()} de {MESES[proxima.vence.getMonth()]}
            {diasFaltan >= 0 && ` · en ${diasFaltan} día${diasFaltan !== 1 ? "s" : ""}`}
          </p>
          <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-full"
                style={{
                  color: proxima.cerrado ? "var(--kipu-info)" : "var(--kipu-subtle)",
                  background: proxima.cerrado
                    ? "color-mix(in srgb, var(--kipu-info) 12%, transparent)"
                    : "color-mix(in srgb, var(--kipu-text) 6%, transparent)",
                }}>
            <Clock size={11} />
            {proxima.cerrado ? "En revisión por el equipo de Kipu" : "Lo vamos revisando; al cerrar el periodo te mandamos el resumen"}
          </span>
          <p className="text-xs" style={{ color: "var(--kipu-subtle)" }}>
            Las de meses anteriores no están incluidas: las presentas tú o, si nos avisas con tiempo,
            las hacemos como extra ($10 por periodo).
          </p>
        </div>

        {/* Resumen por WhatsApp */}
        <div className="rounded-xl p-4 space-y-2" style={caja}>
          <p className="text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5" style={{ color: "var(--kipu-subtle)" }}>
            <MessageCircle size={12} /> Resumen que te llega por WhatsApp
          </p>
          <div className="rounded-xl rounded-tl-sm px-3 py-2.5 text-sm leading-relaxed"
               style={{ background: "color-mix(in srgb, #25D366 12%, var(--kipu-surface))", color: "var(--kipu-text)" }}>
            {ventas ? (
              <>
                Hola 👋, te escribe el equipo de Kipu. Revisamos tu {ventas.mes}: emitiste{" "}
                <b>{ventas.docs} comprobante{ventas.docs !== 1 ? "s" : ""}</b> por <b>{dolares(ventas.total)}</b>{" "}
                (IVA cobrado {dolares(ventas.iva)}). Ya restamos el IVA de tus compras y te pasamos el valor
                a pagar. Si está bien, no hagas nada: lo presentamos antes de la fecha límite.
              </>
            ) : (
              <>
                Hola 👋, te escribe el equipo de Kipu. Revisamos tu {MESES[(Number(hoyEC().slice(5, 7)) + 10) % 12]}: vendiste <b>{dolares(3240.5)}</b> y
                compraste <b>{dolares(890)}</b>. IVA cobrado {dolares(486.08)} − IVA de tus compras {dolares(133.5)} ={" "}
                <b>{dolares(352.58)} a pagar</b>. Si está bien, no hagas nada: lo presentamos antes de la fecha límite.
                Si algo no cuadra, respóndenos aquí.
              </>
            )}
          </div>
        </div>
      </div>

      {/* Historial */}
      <div className="rounded-xl overflow-hidden" style={caja}>
        <p className="text-xs font-semibold uppercase tracking-wider px-4 pt-3 pb-2" style={{ color: "var(--kipu-subtle)" }}>
          Historial
        </p>
        {[
          ...anteriores.map((p) => ({ nombre: p.nombre, fecha: new Date(p.vence.getTime() - 2 * 86400000) })),
          { nombre: `Impuesto a la renta ${anioRenta}`, fecha: new Date(anioRenta + 1, 2, 15) },
        ].map((h) => (
          <div key={h.nombre} className="flex items-center gap-3 px-4 py-2.5" style={{ borderTop: "1px solid var(--kipu-border)" }}>
            <CheckCircle2 size={16} style={{ color: "var(--kipu-success)" }} />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate" style={{ color: "var(--kipu-text)" }}>{h.nombre}</p>
              <p className="text-xs" style={{ color: "var(--kipu-subtle)" }}>Presentada el {fechaCorta(h.fecha)}</p>
            </div>
            <span className="text-xs font-medium flex items-center gap-1" style={{ color: "var(--kipu-accent)" }}>
              <FileCheck2 size={13} /> Comprobante
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}

// ── Cómo funciona ─────────────────────────────────────────────────────────────
const PASOS: { icono: ReactNode; titulo: string; texto: string }[] = [
  { icono: <KeyRound size={16} />,      titulo: "Contratas y guardas tu clave del SRI",
    texto: "Queda cifrada y solo se usa para tus declaraciones. Ves cada vez que alguien la usa." },
  { icono: <Receipt size={16} />,       titulo: "Tú facturas como siempre",
    // En la app sin "sin límite": sería prometer una función digital (reglas de las tiendas)
    texto: `Con Kipu, ${ES_APP_NATIVA ? "como siempre" : "sin límite"}. Tus compras las tomamos de los comprobantes que el SRI tiene a tu nombre.` },
  { icono: <MessageCircle size={16} />, titulo: "Te mandamos el resumen por WhatsApp",
    texto: "Lo que vendiste, lo que compraste y cuánto pagar. Tienes 24 horas para revisarlo." },
  { icono: <FileCheck2 size={16} />,    titulo: "Presentamos y te llega el comprobante",
    texto: "Dentro del plazo del SRI. Tú solo pagas el valor que te indicamos, antes de la fecha límite." },
];

export function ComoFunciona() {
  return (
    <section className="space-y-3">
      <h2 className="text-lg font-bold" style={{ color: "var(--kipu-text)" }}>Cómo funciona</h2>
      <ol className="grid sm:grid-cols-2 gap-3">
        {PASOS.map((p, i) => (
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
  );
}

// ── Qué incluye y qué no ─────────────────────────────────────────────────────
const INCLUYE = [
  "Declaración de IVA mensual o semestral, dentro del plazo del SRI",
  "Declaración anual de renta, con gastos personales (si estuviste 6 meses o más en el año)",
  "Revisión de tus compras cada mes",
  "Revisión de tu RUC: si el SRI te cambia de régimen, te avisamos y ajustamos",
  "Aviso por WhatsApp de cuánto pagar y hasta cuándo",
  "Respuesta a notificaciones del SRI de los periodos que presentamos",
  "Comprobante de cada declaración presentada",
];
const SISTEMA = [
  "Facturas, notas y retenciones sin límite",
  "Registro de compras y reportes de IVA, renta y ATS",
  "Cuentas por cobrar y pagar, y proformas",
  "Hasta 5 usuarios",
];
// Servicios aparte que se cotizan caso por caso (no son cobros automáticos ni
// Prices de Stripe): sus rangos viven solo aquí.
const EXTRAS_COTIZADOS: [string, string][] = [
  ["Declaraciones de meses anteriores a contratar", "$10 por periodo"],
  ["Sustitutivas de declaraciones que no hicimos nosotros", "$15 cada una"],
  ["Devolución de IVA o de renta", "$40 a $60"],
  ["Actualizar el RUC o ayuda con la firma electrónica", "$10 a $20"],
];

// precioRenta: el de Kipu Renta, del Price de Stripe (GET /al-dia/estado → precio_renta)
export function QueIncluye({ precioRenta = null }: { precioRenta?: number | null }) {
  // En la app, sin montos: todo "Se cotiza" (y sin nombrar Kipu Renta, que la app no vende)
  const extras: [string, string][] = ES_APP_NATIVA
    ? [["Renta anual si estuviste menos de 6 meses en el plan", "Se cotiza"],
       ...EXTRAS_COTIZADOS.map(([t]) => [t, "Se cotiza"] as [string, string])]
    : [["Renta anual si estuviste menos de 6 meses en el plan",
        precioRenta !== null ? `$${precioRenta.toFixed(2)}` : "Precio de Kipu Renta"],
       ...EXTRAS_COTIZADOS];
  return (
    <section className="grid md:grid-cols-2 gap-3">
      <div className="rounded-xl p-5 space-y-3" style={caja}>
        <h2 className="text-base font-bold" style={{ color: "var(--kipu-text)" }}>
          {ES_APP_NATIVA ? "Qué hace tu contador" : "Qué incluye"}
        </h2>
        <ul className="space-y-2">
          {INCLUYE.map((t) => (
            <li key={t} className="flex gap-2 text-sm" style={{ color: "var(--kipu-text)" }}>
              <CheckCircle2 size={15} className="shrink-0 mt-0.5" style={{ color: "var(--kipu-success)" }} /> {t}
            </li>
          ))}
        </ul>
        {/* En la app Al Día se vende solo como el servicio del contador (Apple
            3.1.3(e)): sin la lista de funciones digitales que trae, que un
            revisor leería como una compra de funciones fuera de la tienda */}
        {!ES_APP_NATIVA && (
          <>
            <p className="text-xs font-semibold pt-1" style={{ color: "var(--kipu-accent)" }}>
              Y además, todo Kipu Pro:
            </p>
            <ul className="space-y-1.5">
              {SISTEMA.map((t) => (
                <li key={t} className="flex gap-2 text-xs" style={{ color: "var(--kipu-muted)" }}>
                  <CheckCircle2 size={13} className="shrink-0 mt-0.5" style={{ color: "var(--kipu-accent)" }} /> {t}
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
      <div className="rounded-xl p-5 space-y-3" style={caja}>
        <h2 className="text-base font-bold" style={{ color: "var(--kipu-text)" }}>Aparte, solo si lo pides</h2>
        <p className="text-xs" style={{ color: "var(--kipu-muted)" }}>
          Antes de empezar te confirmamos el precio y esperamos tu visto bueno. IVA incluido.
        </p>
        <ul className="space-y-2">
          {extras.map(([t, p]) => (
            <li key={t} className="flex items-start justify-between gap-3 text-sm" style={{ color: "var(--kipu-text)" }}>
              <span className="flex gap-2">
                <XCircle size={15} className="shrink-0 mt-0.5" style={{ color: "var(--kipu-subtle)" }} /> {t}
              </span>
              <span className="shrink-0 font-medium" style={{ color: "var(--kipu-muted)" }}>{p}</span>
            </li>
          ))}
        </ul>
        <p className="text-xs pt-1" style={{ color: "var(--kipu-subtle)" }}>
          Para personas naturales no obligadas a llevar contabilidad (régimen general o RIMPE Emprendedor).
        </p>
      </div>
    </section>
  );
}

// ── Garantía y quién lo hace ─────────────────────────────────────────────────
// Garantía aprobada por el dueño el 2026-11-25, igual a la sección 7 de
// app/legal/kipu_al_dia_v1.md (con sus exclusiones y el tope de 12 meses).
export function Confianza() {
  return (
    <section className="grid md:grid-cols-2 gap-3">
      <div className="rounded-xl p-5 space-y-2" style={caja}>
        <p className="flex items-center gap-2 text-base font-bold" style={{ color: "var(--kipu-text)" }}>
          <ShieldCheck size={18} style={{ color: "var(--kipu-accent)" }} /> Nuestra garantía
        </p>
        <p className="text-sm" style={{ color: "var(--kipu-muted)" }}>
          Si una declaración que presentamos necesita corregirse, la sustitutiva va por nuestra cuenta. Y si
          por esa corrección el SRI te cobra multa o intereses, te los compensamos con meses gratis de
          Kipu Al Día (hasta 3 al año).
        </p>
      </div>
      <div className="rounded-xl p-5 space-y-2" style={caja}>
        <p className="flex items-center gap-2 text-base font-bold" style={{ color: "var(--kipu-text)" }}>
          <Users size={18} style={{ color: "var(--kipu-accent)" }} /> Quién lo hace
        </p>
        <p className="text-sm" style={{ color: "var(--kipu-muted)" }}>
          El equipo de Kipu, con experiencia en declaraciones de emprendedores. Una persona revisa cada
          declaración antes de presentarla, y siempre puedes escribirnos por WhatsApp de lunes a viernes,
          de 8:00 a 17:00.
        </p>
      </div>
    </section>
  );
}

// ── Preguntas frecuentes ─────────────────────────────────────────────────────
const PREGUNTAS: [string, string][] = [
  ["Si contrato hoy, ¿cuál es la primera declaración que hacen?",
   "La del mes en que contratas, que se presenta el mes siguiente (si declaras semestral, la del semestre en curso). Las de meses anteriores no están incluidas: las presentas tú o, si nos avisas con tiempo, las hacemos como extra ($10 por periodo)."],
  ["¿Y si no estoy de acuerdo con el resumen?",
   "Respóndenos el WhatsApp dentro de las 24 horas y lo corregimos antes de presentar. Si no nos dices nada, lo presentamos con esa información."],
  ["¿El IVA se los pago a ustedes?",
   "No. El impuesto lo pagas tú al SRI; nosotros te avisamos el valor exacto y la fecha límite. A Kipu solo le pagas la mensualidad."],
  ["¿Qué pasa con mi clave del SRI?",
   "Se guarda cifrada y solo se usa para tus declaraciones, descargar tus comprobantes y consultas. Ves cada vez que alguien la usa, y la borramos el día que termina el servicio."],
  ["¿Puedo cancelar cuando quiera?",
   "Sí, desde Kipu o escribiéndonos. No hay permanencia ni penalidad; el servicio sigue hasta el final del mes que ya pagaste."],
  ["¿Y si un mes no se pudo cobrar?",
   "Te avisamos por WhatsApp y correo. Si al día 5 sigue sin pagarse, ese mes no presentamos y te lo decimos para que lo hagas tú o pagues y lo presentemos."],
  ["¿Para quién es?",
   "Para personas naturales no obligadas a llevar contabilidad, en régimen general o RIMPE Emprendedor. Si eres sociedad, obligado a llevar contabilidad o RIMPE Negocio Popular, escríbenos."],
];

// En la app: sin montos y sin gestiones de pago dentro de Kipu (todo por WhatsApp)
const EN_LA_APP: Record<string, string> = {
  "Si contrato hoy, ¿cuál es la primera declaración que hacen?":
    "La del mes en que contratas, que se presenta el mes siguiente (si declaras semestral, la del semestre en curso). Las de meses anteriores no están incluidas: las presentas tú o, si nos avisas con tiempo, las hacemos como extra (se cotiza).",
  "¿El IVA se los pago a ustedes?":
    "No. El impuesto lo pagas tú al SRI; nosotros te avisamos el valor exacto y la fecha límite.",
  "¿Puedo cancelar cuando quiera?":
    "Sí, escribiéndonos por WhatsApp. No hay permanencia ni penalidad; el servicio sigue hasta el final del periodo que ya pagaste.",
};

export function Preguntas() {
  const preguntas = ES_APP_NATIVA
    ? PREGUNTAS.map(([p, r]) => [p, EN_LA_APP[p] ?? r] as [string, string])
    : PREGUNTAS;
  return (
    <section className="space-y-3">
      <h2 className="text-lg font-bold" style={{ color: "var(--kipu-text)" }}>Preguntas frecuentes</h2>
      <div className="rounded-xl overflow-hidden" style={caja}>
        {preguntas.map(([p, r], i) => (
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
  );
}
