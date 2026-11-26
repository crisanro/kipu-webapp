"use client";
import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import api from "@/lib/api";
import { rutas } from "@/lib/rutas";
import { ES_APP_NATIVA } from "@/lib/plataforma";
import { usePermiso } from "@/hooks/usePermiso";
import SinAcceso from "@/components/SinAcceso";
import OfertaRenta from "@/components/renta/OfertaRenta";
import { useAuthStore } from "@/store/auth.store";
import {
  BarChart3,
  RefreshCw,
  AlertTriangle,
  FileText,
  ChevronLeft,
  ChevronRight,
  Lock,
  Info,
} from "lucide-react";
import ReporteCard from "./_components/ReporteCard";
import { EstadoReporte } from "./_components/EstadoBadge";
import { detalleError } from "@/lib/errores";
import { MESES } from "@/lib/fecha";

type Tab = "IVA" | "RENTA" | "ATS";

const TIPO_API: Record<Tab, "104" | "102" | "ATS"> = { IVA: "104", RENTA: "102", ATS: "ATS" };

// Lo que devuelve /declaraciones/historial (todo calculado en el backend, hora Ecuador)
interface DeclaracionRow {
  id:              number;
  tipo_periodo:    "MENSUAL" | "SEMESTRAL" | "ANUAL";
  periodo:         string;   // 2026-08-01
  periodo_key:     string;   // 2026-08 | 2026-07 | 2025
  periodo_fmt:     string;   // agosto de 2026
  vencimiento:     string;
  dias_restantes:  number;
  en_curso:        boolean;
  declarado:       boolean;
  fecha_declarado: string | null;
  estado:          EstadoReporte;
}

interface ReporteRow {
  tipo:                string;
  periodo:             string;
  total_doc_emitidos:  number;
  total_doc_recibidos: number;
  generado_at:         string | null;
  resumen:             any;
}

// Lo que devuelve /declaraciones/obligaciones
interface Obligaciones {
  iva:              "MENSUAL" | "SEMESTRAL" | "NO_APLICA";
  ats:              boolean;
  renta_formulario: "102" | "101";
  renta_modo:       "CASILLEROS" | "INFORMATIVO";
  regimen:          string;
  tipo_emisor:      string;
  en_produccion:    boolean;
  inicio:           string;   // YYYY-MM-DD
  tipos:            string[];
  advertencias:     string[];
}

const TAB_CONFIG = {
  IVA:   { label: "IVA 104" },
  RENTA: { label: "Renta 102" },
  ATS:   { label: "ATS" },
};

const DEMO_CARDS: Record<Tab, { periodo: string; estado: string; monto?: string; saldo?: string }[]> = {
  IVA:   [{ periodo: "julio de 2026",  estado: "Pendiente", monto: "$145.30" }],
  RENTA: [{ periodo: "Año 2025",       estado: "Pendiente", monto: "$314.10" }],
  ATS:   [{ periodo: "julio de 2026",  estado: "Pendiente" }],
};

const capitalizar = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** "2026-03-15" → "marzo de 2026" sin pasar por Date */
function mesAnio(ymd: string) {
  const [a, m] = ymd.split("-").map(Number);
  return a && m ? `${MESES[m - 1]} de ${a}` : ymd;
}

const colorTab = (tab: Tab) =>
  tab === "IVA"
    ? { base: "var(--kipu-accent)", fuerte: "var(--kipu-accent)", texto: "var(--kipu-accent)" }
    : tab === "RENTA"
      ? { base: "#a855f7", fuerte: "#9333ea", texto: "var(--kipu-muted)" }
      : { base: "#06b6d4", fuerte: "#0891b2", texto: "#22d3ee" };

// ── Componente demo cards ──────────────────────────────────────────────────────
function DemoCards({ tab }: { tab: Tab }) {
  const href = tab === "IVA" ? `${rutas.reporteIva("2026-07")}&demo=1`
             : tab === "RENTA" ? rutas.reporteRenta(2025)
             : rutas.reporteAts("2026-08");
  const c = colorTab(tab);
  const bg     = `color-mix(in srgb, ${c.base} 20%, transparent)`;
  const border = `color-mix(in srgb, ${c.base} 20%, transparent)`;

  return (
    <div className="space-y-3">
      {DEMO_CARDS[tab].map((card, i) => (
        <Link
          key={i}
          href={href}
          className="block rounded-xl p-4 transition-all group bg-superficie border border-borde"
          onMouseEnter={e => e.currentTarget.style.borderColor = "color-mix(in srgb, var(--kipu-text) 30%, transparent)"}
          onMouseLeave={e => e.currentTarget.style.borderColor = "var(--kipu-border)"}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <div
                className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                style={{ background: bg, color: c.texto }}
              >
                <FileText size={16} />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span
                    className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                    style={{ background: bg, color: c.texto, border: `1px solid ${border}` }}
                  >
                    {TAB_CONFIG[tab].label}
                  </span>
                  <p className="text-sm font-semibold text-texto">{card.periodo}</p>
                  <span
                    className="text-[10px] px-1.5 py-0.5 rounded font-medium"
                    style={{
                      background: "color-mix(in srgb, var(--kipu-text) 8%, transparent)",
                      color: "var(--kipu-subtle)",
                      border: "1px solid var(--kipu-border)",
                    }}
                  >
                    DEMO
                  </span>
                </div>
                {card.monto && <p className="text-xs font-semibold text-peligro">A pagar: {card.monto}</p>}
                {card.saldo && <p className="text-xs font-semibold text-exito">Saldo favor: {card.saldo}</p>}
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span
                className="text-[10px] font-semibold px-2 py-1 rounded-full"
                style={{ background: "color-mix(in srgb, var(--kipu-text) 8%, transparent)", color: "var(--kipu-subtle)" }}
              >
                {card.estado}
              </span>
              <ChevronRight className="text-sutil" size={14} />
            </div>
          </div>
        </Link>
      ))}
      <div className="flex items-center gap-2 justify-center py-2">
        <Lock className="text-sutil" size={12} />
        <p className="text-xs text-sutil">
          {ES_APP_NATIVA ? "Datos de ejemplo — no incluido en tu plan actual" : "Datos de ejemplo — suscríbete para ver los tuyos"}
        </p>
      </div>
    </div>
  );
}

// ── Aviso neutro reutilizable ──────────────────────────────────────────────────
function Aviso({ tono = "info", titulo, children }: {
  tono?: "info" | "warning";
  titulo?: string;
  children: React.ReactNode;
}) {
  const color = tono === "warning" ? "var(--kipu-warning)" : "var(--kipu-subtle)";
  const Icono = tono === "warning" ? AlertTriangle : Info;
  return (
    <div
      className="flex items-start gap-3 rounded-xl px-4 py-3"
      style={{
        background: tono === "warning"
          ? "color-mix(in srgb, var(--kipu-warning) 10%, transparent)"
          : "var(--kipu-surface)",
        border: tono === "warning"
          ? "1px solid color-mix(in srgb, var(--kipu-warning) 20%, transparent)"
          : "1px solid var(--kipu-border)",
      }}
    >
      <Icono size={15} className="shrink-0 mt-0.5" style={{ color }} />
      <div className="text-xs space-y-1" style={{ color: tono === "warning" ? color : "var(--kipu-muted)" }}>
        {titulo && <p className="text-sm font-semibold" style={{ color: tono === "warning" ? color : "var(--kipu-text)" }}>{titulo}</p>}
        <div>{children}</div>
      </div>
    </div>
  );
}

// ── Página principal ───────────────────────────────────────────────────────────
export default function ReportesPage() {
  // Todos los hooks primero; el return condicional va al final.
  const puedeVer         = usePermiso("reportes");
  const empresa          = useAuthStore((s) => s.empresa);
  const tieneSuscripcion = empresa?.suscripcion_activa ?? false;
  // Plan gratis (sin Pro): en IVA ve sus meses reales y el total de cada uno;
  // el 104 completo, con Pro. Renta y ATS siguen siendo de Pro.
  const planGratis       = !tieneSuscripcion && !!empresa?.emision_gratis;

  const [tab,           setTab]           = useState<Tab>("IVA");
  const verReales = tieneSuscripcion || (planGratis && tab === "IVA");
  const [anio,          setAnio]          = useState(new Date().getFullYear());
  const [obl,           setObl]           = useState<Obligaciones | null>(null);
  const [declaraciones, setDeclaraciones] = useState<DeclaracionRow[]>([]);
  const [reportes,      setReportes]      = useState<ReporteRow[]>([]);
  const [motivo,        setMotivo]        = useState<string | null>(null);
  const [loading,       setLoading]       = useState(true);
  const [error,         setError]         = useState("");

  // Qué declara esta empresa (se recarga al cambiar de empresa)
  useEffect(() => {
    if (!puedeVer || !(tieneSuscripcion || planGratis)) return;
    api.get("/api/v1/app/declaraciones/obligaciones")
      .then((r) => setObl(r.data.data))
      .catch(() => setObl(null));
  }, [puedeVer, tieneSuscripcion, planGratis, empresa?.id]);

  const cargar = useCallback(async () => {
    if (!puedeVer || !verReales) return;
    setLoading(true);
    setError("");
    try {
      const [resDecl, resRep] = await Promise.all([
        api.get(`/api/v1/app/declaraciones/historial?tipo=${TIPO_API[tab]}&anio=${anio}`),
        api.get(`/api/v1/app/declaraciones/reportes?tipo=${tab}&anio=${anio}`),
      ]);
      setDeclaraciones(resDecl.data.data ?? []);
      setMotivo(resDecl.data.aplica === false ? resDecl.data.motivo ?? null : null);
      setReportes(resRep.data.data ?? []);
    } catch (e: any) {
      setError(detalleError(e, "No se pudieron cargar las declaraciones."));
    } finally {
      setLoading(false);
    }
  }, [tab, anio, puedeVer, verReales, empresa?.id]);

  useEffect(() => { cargar(); }, [cargar]);

  if (!puedeVer) return <SinAcceso />;

  const anioActual   = new Date().getFullYear();
  const anioInicio   = obl ? parseInt(obl.inicio.slice(0, 4)) : 2020;
  const enProduccion = obl?.en_produccion ?? empresa?.ambiente === 2;
  const tabLabel     = (t: Tab) => t === "RENTA" ? `Renta ${obl?.renta_formulario ?? "102"}` : TAB_CONFIG[t].label;
  const c            = colorTab(tab);

  const items = declaraciones.map((decl) => {
    const reporte = reportes.find((r) => r.periodo.startsWith(decl.periodo_key));
    return {
      decl,
      reporte,
      totalDocs: (reporte?.total_doc_emitidos ?? 0) + (reporte?.total_doc_recibidos ?? 0),
    };
  });

  // App de las tiendas con el plan gratis: solo el IVA, que es lo que incluye
  // (Renta y ATS no se muestran: lib/plataforma.ts)
  const tabsVisibles = (Object.keys(TAB_CONFIG) as Tab[])
    .filter((t) => !ES_APP_NATIVA || tieneSuscripcion || t === "IVA");

  const TabsBar = tabsVisibles.length < 2 ? null : (
    <div
      className="flex gap-1 rounded-xl p-1 bg-superficie border border-borde"
    >
      {tabsVisibles.map((t) => {
        const activo = tab === t;
        return (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className="flex-1 py-2.5 rounded-lg text-sm font-medium transition-colors"
            style={{
              background: activo ? colorTab(t).fuerte : "transparent",
              color:      activo ? "#FFFFFF" : "var(--kipu-subtle)",
            }}
            onMouseEnter={e => { if (!activo) e.currentTarget.style.color = "var(--kipu-text)"; }}
            onMouseLeave={e => { if (!activo) e.currentTarget.style.color = "var(--kipu-subtle)"; }}
          >
            {tabLabel(t)}
          </button>
        );
      })}
    </div>
  );

  const textoInfo =
    tab === "IVA"
      ? obl?.iva === "SEMESTRAL"
        ? "Declaración semestral del IVA — Formulario 104. Enero–junio vence en julio; julio–diciembre, en enero. Día según el noveno dígito del RUC."
        : "Declaración mensual del IVA — Formulario 104. Vence el mes siguiente, el día que corresponde al noveno dígito del RUC."
      : tab === "RENTA"
        ? `Impuesto a la Renta anual — Formulario ${obl?.renta_formulario ?? "102"}. Vence en ${obl?.tipo_emisor === "JURIDICO" ? "abril" : "marzo"} del año siguiente.`
        : "Anexo Transaccional Simplificado — detalle de compras y ventas. Vence el segundo mes después del periodo.";

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 bg-acento/20"
          >
            <BarChart3 className="text-acento" size={18} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-texto">Reportes tributarios</h1>
            <p className="text-sm text-sutil">Declaraciones organizadas y listas para el SRI</p>
          </div>
        </div>
        {verReales && (
          <button
            type="button"
            onClick={cargar}
            disabled={loading}
            aria-label="Actualizar"
            className="p-2 rounded-lg transition-colors disabled:opacity-40 border border-borde text-sutil"
          >
            {loading ? (
              <div
                className="w-4 h-4 border-2 border-t-transparent rounded-full animate-spin"
                style={{ borderColor: "currentColor", borderTopColor: "transparent" }}
              />
            ) : (
              <RefreshCw size={16} />
            )}
          </button>
        )}
      </div>

      {/* ── PLAN GRATIS: el total es gratis, el 104 completo con Pro ─────────── */}
      {planGratis && !ES_APP_NATIVA && (
        <div
          className="flex items-start gap-3 rounded-xl px-4 py-3 bg-acento/8 border border-acento/25"
        >
          <Lock size={15} className="shrink-0 mt-0.5 text-acento" />
          <p className="text-xs text-tenue">
            <span className="font-semibold text-texto">Ver el total de tu IVA es gratis. </span>
            El formulario 104 completo se desbloquea con Kipu Pro, que además incluye Renta y ATS.{" "}
            <Link href="/planes" className="font-semibold underline text-acento">
              Ver planes
            </Link>
          </p>
        </div>
      )}

      {/* ── SIN DATOS REALES (sin plan; o plan gratis en Renta/ATS) ─────────── */}
      {!verReales && (
        <>
          {/* Oferta de suscripción con precio: solo en la web */}
          {!planGratis && !ES_APP_NATIVA && (
          <div
            className="relative overflow-hidden rounded-2xl p-5 bg-acento/10 border border-acento/30"
          >
            <div className="flex items-start gap-4">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-acento/30"
              >
                <Lock className="text-acento" size={18} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold mb-1 text-texto">Incluido en tu suscripción</p>
                <p className="text-xs mb-3 text-sutil">
                  Accede a tus declaraciones calculadas automáticamente. El sistema cruza tus documentos y llena los casilleros por ti.
                </p>
                <div className="flex flex-wrap gap-2 mb-4">
                  {[
                    { label: "IVA 104 mensual",        color: "var(--kipu-accent)" },
                    { label: "Renta 102 anual",         color: "var(--kipu-muted)" },
                    { label: "ATS mensual (obligados)", color: "#22d3ee" },
                    { label: "Trazabilidad auditoría",  color: "var(--kipu-success)" },
                  ].map(({ label, color }) => (
                    <span
                      key={label}
                      className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                      style={{
                        background: `color-mix(in srgb, ${color} 10%, transparent)`,
                        color,
                        border: `1px solid color-mix(in srgb, ${color} 20%, transparent)`,
                      }}
                    >
                      ✓ {label}
                    </span>
                  ))}
                </div>
                <Link
                  href="/planes"
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-white text-sm font-semibold transition-colors bg-acento"
                  onMouseEnter={e => e.currentTarget.style.background = "var(--kipu-accent-h)"}
                  onMouseLeave={e => e.currentTarget.style.background = "var(--kipu-accent)"}
                >
                  Ver planes y suscribirme
                  <ChevronRight size={15} />
                </Link>
                <p className="text-[10px] mt-2" style={{ color: "var(--kipu-subtle)" }}>Pago anual · Cancela cuando quieras</p>
              </div>
            </div>
          </div>
          )}

          {TabsBar}

          {tab === "ATS" && (
            <Aviso>
              El ATS aplica solo a <strong>obligados a llevar contabilidad</strong> y sociedades.
            </Aviso>
          )}

          {tab === "RENTA" && <OfertaRenta variante="reportes" />}

          <DemoCards tab={tab} />
        </>
      )}

      {/* ── DATOS REALES (Pro; o plan gratis en IVA) ─────────────────────────── */}
      {verReales && (
        <>
          {!enProduccion && (
            <Aviso tono="warning">Los reportes tributarios solo aplican en ambiente de producción.</Aviso>
          )}

          {obl?.advertencias?.map((a) => (
            <Aviso key={a} tono="warning">
              {a}{" "}
              <Link href="/configuracion" className="underline text-alerta">
                Ir a configuración
              </Link>
            </Aviso>
          ))}

          {TabsBar}

          {/* Selector de año */}
          <div
            className="flex items-center justify-between rounded-xl px-4 py-2.5 bg-superficie border border-borde"
          >
            <button
              type="button"
              onClick={() => setAnio((a) => a - 1)}
              disabled={anio <= anioInicio}
              aria-label="Año anterior"
              className="p-1.5 rounded-lg transition-colors disabled:opacity-30 text-sutil"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="text-sm font-semibold text-texto">{anio}</span>
            <button
              type="button"
              onClick={() => setAnio((a) => Math.min(a + 1, anioActual))}
              disabled={anio >= anioActual}
              aria-label="Año siguiente"
              className="p-1.5 rounded-lg transition-colors disabled:opacity-30 text-sutil"
            >
              <ChevronRight size={16} />
            </button>
          </div>

          {/* Info contextual */}
          <div
            className="rounded-xl px-4 py-3 text-xs"
            style={{
              background: `color-mix(in srgb, ${c.base} 5%, transparent)`,
              border: `1px solid color-mix(in srgb, ${c.base} 20%, transparent)`,
              color: c.texto,
            }}
          >
            {textoInfo}
          </div>

          {tab === "RENTA" && <OfertaRenta variante="reportes" />}

          {/* Contenido */}
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div
                className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin"
                style={{ borderColor: "var(--kipu-accent)", borderTopColor: "transparent" }}
              />
            </div>
          ) : error ? (
            <Aviso tono="warning" titulo="No se pudo cargar">{error}</Aviso>
          ) : motivo ? (
            <>
              <Aviso titulo={tab === "ATS" ? "El ATS no aplica para tu perfil" : "No aplica para tu empresa"}>
                {motivo}
                {tab === "ATS" && " Si crees que deberías presentarlo, revisa tu RUC en el portal del SRI o consulta con tu contador."}
              </Aviso>
              {tab === "ATS" && (
                <>
                  <p className="text-xs text-center text-sutil">Así se vería si aplicara:</p>
                  <DemoCards tab="ATS" />
                </>
              )}
            </>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <FileText size={40} className="mb-3 text-sutil" />
              <p className="text-sm text-tenue">No hay periodos por declarar en {anio}</p>
              {obl && anio <= anioInicio && (
                <p className="text-xs mt-1 text-sutil">
                  Tus declaraciones en Kipu empiezan en {mesAnio(obl.inicio)}.
                </p>
              )}
            </div>
          ) : (
            <>
              <div className="space-y-3">
                {items.map(({ decl, reporte, totalDocs }) => (
                  <ReporteCard
                    key={decl.periodo_key}
                    tipo={tab}
                    periodo={decl.periodo_key}
                    periodoFmt={capitalizar(decl.periodo_fmt)}
                    estado={decl.estado}
                    diasRestantes={decl.dias_restantes}
                    vencimiento={decl.vencimiento}
                    declarado={decl.declarado}
                    cached={!!reporte}
                    enCurso={decl.en_curso}
                    generadoAt={reporte?.generado_at ?? undefined}
                    sinPlan={!tieneSuscripcion}
                    resumen={reporte ? {
                      ivaAPagar:       reporte.resumen?.resultado?.a_pagar ?? reporte.resumen?.casilleros?.["859"] ?? 0,
                      saldoFavor:      reporte.resumen?.resultado?.saldo_favor ?? 0,
                      impuestoCausado: reporte.resumen?.resultado?.impuesto_causado ?? 0,
                      totalDocs,
                    } : undefined}
                  />
                ))}
              </div>

              <div
                className="rounded-xl p-4 bg-superficie border border-borde"
              >
                <p className="text-xs font-semibold uppercase tracking-wider mb-3 text-sutil">
                  Resumen {anio}
                </p>
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div>
                    <p className="text-lg font-bold text-texto">
                      {items.filter(({ decl }) => decl.declarado).length}
                    </p>
                    <p className="text-xs text-sutil">Declarados</p>
                  </div>
                  <div>
                    <p className="text-lg font-bold text-alerta">
                      {items.filter(({ decl }) => !decl.declarado && !decl.en_curso).length}
                    </p>
                    <p className="text-xs text-sutil">Pendientes</p>
                  </div>
                  <div>
                    <p className="text-lg font-bold text-peligro">
                      {items.filter(({ decl }) => decl.estado === "VENCIDO").length}
                    </p>
                    <p className="text-xs text-sutil">Vencidos</p>
                  </div>
                </div>
              </div>

              {!tieneSuscripcion && (
                <Link
                  href={`${rutas.reporteIva("2026-07")}&demo=1`}
                  className="flex items-center justify-center gap-1 py-1 text-xs text-sutil"
                >
                  Ver un ejemplo del 104 completo
                  <ChevronRight size={12} />
                </Link>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}