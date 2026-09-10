"use client";
import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import api from "@/lib/api";
import { usePermiso } from "@/hooks/usePermiso";
import SinAcceso from "@/components/SinAcceso";
import { useAuthStore } from "@/store/auth.store";
import {
  BarChart3,
  RefreshCw,
  AlertTriangle,
  FileText,
  ChevronLeft,
  ChevronRight,
  ChevronRight as ChevronRightIcon,
  Lock,
  Info,
} from "lucide-react";
import ReporteCard from "./_components/ReporteCard";
import { EstadoReporte } from "./_components/EstadoBadge";

type Tab = "IVA" | "RENTA" | "ATS";

interface DeclaracionRow {
  periodo: string;
  periodo_fmt: string;
  vencimiento: string;
  declarado: boolean;
  fecha_declarado: string | null;
  estado: string;
  totales: any;
}
interface ReporteRow {
  tipo: string;
  periodo: string;
  cached: boolean;
  total_doc_emitidos: number;
  total_doc_recibidos: number;
  generado_at: string;
  resumen: any;
}

const TAB_CONFIG = {
  IVA:   { label: "IVA 104" },
  RENTA: { label: "Renta 102" },
  ATS:   { label: "ATS" },
};

const DEMO_CARDS: Record<Tab, { periodo: string; estado: string; monto?: string; saldo?: string }[]> = {
  IVA: [
    { periodo: "agosto de 2026",  estado: "En curso",  monto: "$208.58" },
    { periodo: "julio de 2026",   estado: "Pendiente", monto: "$145.30" },
    { periodo: "junio de 2026",   estado: "Declarado", saldo: "$32.10"  },
  ],
  RENTA: [
    { periodo: "Año 2025", estado: "Pendiente", monto: "$314.10" },
    { periodo: "Año 2024", estado: "Declarado", saldo: "$0.00"   },
  ],
  ATS: [
    { periodo: "agosto de 2026", estado: "En curso"  },
    { periodo: "julio de 2026",  estado: "Pendiente" },
    { periodo: "junio de 2026",  estado: "Declarado" },
  ],
};

function periodoFmt(periodo: string, tipo: Tab, periodoIva: string = "MENSUAL"): string {
  try {
    if (tipo === "RENTA") return `Año ${periodo.split("-")[0]}`;
    const [a, m] = periodo.split("-");
    if (periodoIva === "SEMESTRAL") {
      return parseInt(m) <= 6
        ? `1er semestre ${a}`
        : `2do semestre ${a}`;
    }
    return new Date(parseInt(a), parseInt(m) - 1, 1).toLocaleDateString("es-EC", {
      month: "long", year: "numeric",
    });
  } catch { return periodo; }
}

function periodoKey(decl: DeclaracionRow, tipo: Tab): string {
  if (tipo === "RENTA") return decl.periodo.split("-")[0];
  return decl.periodo.slice(0, 7);
}

function estadoFromDecl(decl: DeclaracionRow): EstadoReporte {
  switch (decl.estado) {
    case "DECLARADO": return "DECLARADO";
    case "VENCIDO":   return "VENCIDO";
    case "URGENTE":   return "URGENTE";
    case "PROXIMO":   return "PROXIMO";
    default:          return "PENDIENTE";
  }
}

// ── Componente demo cards ──────────────────────────────────────────────────────
function DemoCards({ tab }: { tab: Tab }) {
  const href = tab === "IVA" ? "/reportes/iva/2026-08"
             : tab === "RENTA" ? "/reportes/renta/2025"
             : "/reportes/ats/2026-08";

  const getTabColors = () => {
    if (tab === "IVA") {
      return {
        bg: "color-mix(in srgb, var(--kipu-accent) 20%, transparent)",
        color: "var(--kipu-accent)",
        border: "color-mix(in srgb, var(--kipu-accent) 20%, transparent)",
      };
    }
    if (tab === "RENTA") {
      return {
        bg: "color-mix(in srgb, #a855f7 20%, transparent)",
        color: "#c084fc",
        border: "color-mix(in srgb, #a855f7 20%, transparent)",
      };
    }
    return {
      bg: "color-mix(in srgb, #06b6d4 20%, transparent)",
      color: "#22d3ee",
      border: "color-mix(in srgb, #06b6d4 20%, transparent)",
    };
  };

  const colors = getTabColors();

  return (
    <div className="space-y-3">
      {DEMO_CARDS[tab].map((card, i) => (
        <Link
          key={i}
          href={href}
          className="block rounded-xl p-4 transition-all group"
          style={{
            background: "var(--kipu-surface)",
            border: "1px solid var(--kipu-border)",
          }}
          onMouseEnter={e => e.currentTarget.style.borderColor = "color-mix(in srgb, var(--kipu-text) 30%, transparent)"}
          onMouseLeave={e => e.currentTarget.style.borderColor = "var(--kipu-border)"}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <div
                className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                style={{ background: colors.bg, color: colors.color }}
              >
                <FileText size={16} />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span
                    className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                    style={{
                      background: colors.bg,
                      color: colors.color,
                      border: `1px solid ${colors.border}`,
                    }}
                  >
                    {TAB_CONFIG[tab].label}
                  </span>
                  <p className="text-sm font-semibold" style={{ color: "var(--kipu-text)" }}>{card.periodo}</p>
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
                {card.monto && <p className="text-xs font-semibold" style={{ color: "var(--kipu-danger)" }}>A pagar: {card.monto}</p>}
                {card.saldo && <p className="text-xs font-semibold" style={{ color: "var(--kipu-success)" }}>Saldo favor: {card.saldo}</p>}
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span
                className="text-[10px] font-semibold px-2 py-1 rounded-full"
                style={{
                  background: "color-mix(in srgb, var(--kipu-text) 8%, transparent)",
                  color: "var(--kipu-subtle)",
                }}
              >
                {card.estado}
              </span>
              <ChevronRightIcon
                size={14}
                className="transition-colors"
                style={{ color: "var(--kipu-subtle)" }}
              />
            </div>
          </div>
        </Link>
      ))}
      <div className="flex items-center gap-2 justify-center py-2">
        <Lock size={12} style={{ color: "var(--kipu-subtle)" }} />
        <p className="text-xs" style={{ color: "var(--kipu-subtle)" }}>Datos de ejemplo — suscríbete para ver los tuyos</p>
      </div>
    </div>
  );
}

// ── Página principal ───────────────────────────────────────────────────────────
export default function ReportesPage() {
  const puedeVer = usePermiso("reportes");
  if (!puedeVer) return <SinAcceso />;

  const empresa          = useAuthStore((s) => s.empresa);
  const tieneSuscripcion = empresa?.suscripcion_activa ?? false;
  // ATS: solo para obligados a llevar contabilidad (tipo_emisor === 2 en Ecuador)
  const esObligadoContabilidad = empresa?.obligado_contabilidad === "SI";
  const tieneATS = tieneSuscripcion && esObligadoContabilidad;

  const [tab,           setTab]           = useState<Tab>("IVA");
  const [declaraciones, setDeclaraciones] = useState<DeclaracionRow[]>([]);
  const [reportes,      setReportes]      = useState<ReporteRow[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [anio,          setAnio]          = useState(new Date().getFullYear());

  const cargar = useCallback(async () => {
    if (!tieneSuscripcion) return;
    if (tab === "ATS" && !tieneATS) return;
    setLoading(true);
    try {
      const tipoAPI = tab === "IVA" ? "104" : tab === "RENTA" ? "102" : "ATS";
      const [resDecl, resRep] = await Promise.all([
        api.get(`/api/v1/app/declaraciones/historial?tipo=${tipoAPI}&anio=${anio}`),
        api.get(`/api/v1/app/declaraciones/reportes?tipo=${tab}&anio=${anio}`),
      ]);
      setDeclaraciones(resDecl.data.data ?? []);
      setReportes(resRep.data.data ?? []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [tab, anio, tieneSuscripcion, tieneATS]);

  useEffect(() => { cargar(); }, [cargar]);

  const periodoIva = empresa?.periodo_iva ?? "MENSUAL";
  const items = declaraciones.map((decl) => {
    const key    = periodoKey(decl, tab);
    const reporte = reportes.find((r) => r.periodo.startsWith(key));
    const hoy    = new Date();
    const venc    = new Date(decl.vencimiento);
    const dias    = Math.ceil((venc.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));
    const esActual =
      tab === "RENTA"
        ? parseInt(key) === hoy.getFullYear()
        : periodoIva === "SEMESTRAL"
          ? (key === `${hoy.getFullYear()}-01` && hoy.getMonth() < 6) ||
            (key === `${hoy.getFullYear()}-07` && hoy.getMonth() >= 6)
          : key === `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, "0")}`;
    return {
      periodo:       key,
      periodoFmt:    periodoFmt(decl.periodo, tab, periodoIva),
      estado:        estadoFromDecl(decl) as EstadoReporte,
      diasRestantes: dias,
      vencimiento:   decl.vencimiento,
      declarado:     decl.declarado,
      cached:        !!reporte,
      enCurso:       esActual,
      generadoAt:    reporte?.generado_at,
      totalDocs:     (reporte?.total_doc_emitidos ?? 0) + (reporte?.total_doc_recibidos ?? 0),
      resumen:       reporte?.resumen ?? null,
    };
  });

  const enProduccion = empresa?.ambiente === 2;

  const getTabStyle = (t: Tab) => {
    const active = tab === t;
    if (!active) {
      return {
        background: "transparent",
        color: "var(--kipu-subtle)",
      };
    }
    if (t === "IVA") {
      return {
        background: "var(--kipu-accent)",
        color: "#FFFFFF",
      };
    }
    if (t === "RENTA") {
      return {
        background: "#9333ea",
        color: "#FFFFFF",
      };
    }
    return {
      background: "#0891b2",
      color: "#FFFFFF",
    };
  };

  const getInfoTabStyle = () => {
    if (tab === "IVA") {
      return {
        background: "color-mix(in srgb, var(--kipu-accent) 5%, transparent)",
        border: "1px solid color-mix(in srgb, var(--kipu-accent) 20%, transparent)",
        color: "var(--kipu-accent)",
      };
    }
    if (tab === "RENTA") {
      return {
        background: "color-mix(in srgb, #a855f7 5%, transparent)",
        border: "1px solid color-mix(in srgb, #a855f7 20%, transparent)",
        color: "#c084fc",
      };
    }
    return {
      background: "color-mix(in srgb, #06b6d4 5%, transparent)",
      border: "1px solid color-mix(in srgb, #06b6d4 20%, transparent)",
      color: "#22d3ee",
    };
  };

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
            style={{ background: "color-mix(in srgb, var(--kipu-accent) 20%, transparent)" }}
          >
            <BarChart3 size={18} style={{ color: "var(--kipu-accent)" }} />
          </div>
          <div>
            <h1 className="text-xl font-bold" style={{ color: "var(--kipu-text)" }}>Reportes tributarios</h1>
            <p className="text-sm" style={{ color: "var(--kipu-subtle)" }}>Declaraciones organizadas y listas para el SRI</p>
          </div>
        </div>
        {tieneSuscripcion && !(tab === "ATS" && !tieneATS) && (
          <button
            type="button"
            onClick={cargar}
            disabled={loading}
            className="p-2 rounded-lg transition-colors disabled:opacity-40"
            style={{
              border: "1px solid var(--kipu-border)",
              color: "var(--kipu-subtle)",
            }}
            onMouseEnter={e => {
              if (!loading) {
                e.currentTarget.style.color = "var(--kipu-text)";
                e.currentTarget.style.background = "color-mix(in srgb, var(--kipu-text) 5%, transparent)";
              }
            }}
            onMouseLeave={e => {
              if (!loading) {
                e.currentTarget.style.color = "var(--kipu-subtle)";
                e.currentTarget.style.background = "transparent";
              }
            }}
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

      {/* ── SIN SUSCRIPCIÓN ────────────────────────────────────────────────── */}
      {!tieneSuscripcion && (
        <>
          {/* Banner upgrade */}
          <div
            className="relative overflow-hidden rounded-2xl p-5"
            style={{
              background: "color-mix(in srgb, var(--kipu-accent) 10%, transparent)",
              border: "1px solid color-mix(in srgb, var(--kipu-accent) 30%, transparent)",
            }}
          >
            <div className="flex items-start gap-4">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: "color-mix(in srgb, var(--kipu-accent) 30%, transparent)" }}
              >
                <Lock size={18} style={{ color: "var(--kipu-accent)" }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold mb-1" style={{ color: "var(--kipu-text)" }}>Incluido en tu suscripción</p>
                <p className="text-xs mb-3" style={{ color: "var(--kipu-subtle)" }}>
                  Accede a tus declaraciones calculadas automáticamente. El sistema cruza tus documentos y llena los casilleros por ti.
                </p>
                <div className="flex flex-wrap gap-2 mb-4">
                  {[
                    { label: "IVA 104 mensual",        color: "var(--kipu-accent)" },
                    { label: "Renta 102 anual",         color: "#c084fc" },
                    { label: "ATS mensual (obligados)", color: "#22d3ee" },
                    { label: "Trazabilidad auditoría",  color: "var(--kipu-success)" },
                  ].map(({ label, color }) => (
                    <span
                      key={label}
                      className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                      style={{
                        background: `color-mix(in srgb, ${color} 10%, transparent)`,
                        color: color,
                        border: `1px solid color-mix(in srgb, ${color} 20%, transparent)`,
                      }}
                    >
                      ✓ {label}
                    </span>
                  ))}
                </div>
                <Link
                  href="/planes"
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-white text-sm font-semibold transition-colors shadow-lg"
                  style={{
                    background: "var(--kipu-accent)",
                    boxShadow: "0 10px 15px -3px color-mix(in srgb, var(--kipu-accent) 20%, transparent)",
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = "var(--kipu-accent-h)"}
                  onMouseLeave={e => e.currentTarget.style.background = "var(--kipu-accent)"}
                >
                  Ver planes y suscribirme
                  <ChevronRightIcon size={15} />
                </Link>
                <p className="text-[10px] mt-2" style={{ color: "var(--kipu-subtle)" }}>$69/año + IVA · Cancela cuando quieras</p>
              </div>
            </div>
            <div
              className="absolute -bottom-6 -right-6 w-32 h-32 rounded-full blur-2xl pointer-events-none"
              style={{ background: "color-mix(in srgb, var(--kipu-accent) 10%, transparent)" }}
            />
          </div>

          {/* Tabs demo — los 3 visibles */}
          <div
            className="flex gap-1 rounded-xl p-1"
            style={{
              background: "var(--kipu-surface)",
              border: "1px solid var(--kipu-border)",
            }}
          >
            {(Object.keys(TAB_CONFIG) as Tab[]).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTab(t)}
                className="flex-1 py-2.5 rounded-lg text-sm font-medium transition-colors"
                style={getTabStyle(t)}
                onMouseEnter={e => {
                  if (tab !== t) e.currentTarget.style.color = "var(--kipu-text)";
                }}
                onMouseLeave={e => {
                  if (tab !== t) e.currentTarget.style.color = "var(--kipu-subtle)";
                }}
              >
                {TAB_CONFIG[t].label}
              </button>
            ))}
          </div>

          {/* Info ATS en demo */}
          {tab === "ATS" && (
            <div
              className="flex items-start gap-3 rounded-xl px-4 py-3"
              style={{
                background: "color-mix(in srgb, #06b6d4 10%, transparent)",
                border: "1px solid color-mix(in srgb, #06b6d4 20%, transparent)",
              }}
            >
              <Info size={15} className="shrink-0 mt-0.5" style={{ color: "#22d3ee" }} />
              <p className="text-xs" style={{ color: "#67e8f9" }}>
                El ATS aplica solo para personas <strong>obligadas a llevar contabilidad</strong>. Si tu negocio supera los umbrales del SRI, este reporte es obligatorio mensualmente.
              </p>
            </div>
          )}

          <DemoCards tab={tab} />
        </>
      )}

      {/* ── CON SUSCRIPCIÓN ────────────────────────────────────────────────── */}
      {tieneSuscripcion && (
        <>
          {!enProduccion && (
            <div
              className="flex items-start gap-3 rounded-xl px-4 py-3"
              style={{
                background: "color-mix(in srgb, var(--kipu-warning) 10%, transparent)",
                border: "1px solid color-mix(in srgb, var(--kipu-warning) 20%, transparent)",
              }}
            >
              <AlertTriangle size={15} className="shrink-0 mt-0.5" style={{ color: "var(--kipu-warning)" }} />
              <p className="text-sm" style={{ color: "var(--kipu-warning)" }}>
                Los reportes tributarios solo aplican en ambiente de producción.
              </p>
            </div>
          )}

          {/* Tabs — con suscripción, los 3 siempre visibles */}
          <div
            className="flex gap-1 rounded-xl p-1"
            style={{
              background: "var(--kipu-surface)",
              border: "1px solid var(--kipu-border)",
            }}
          >
            {(Object.keys(TAB_CONFIG) as Tab[]).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTab(t)}
                className="flex-1 py-2.5 rounded-lg text-sm font-medium transition-colors"
                style={getTabStyle(t)}
                onMouseEnter={e => {
                  if (tab !== t) e.currentTarget.style.color = "var(--kipu-text)";
                }}
                onMouseLeave={e => {
                  if (tab !== t) e.currentTarget.style.color = "var(--kipu-subtle)";
                }}
              >
                {TAB_CONFIG[t].label}
              </button>
            ))}
          </div>

          {/* ATS — no es obligado a contabilidad */}
          {tab === "ATS" && !esObligadoContabilidad && (
            <>
              <div
                className="relative overflow-hidden rounded-2xl p-5"
                style={{
                  background: "color-mix(in srgb, #06b6d4 10%, transparent)",
                  border: "1px solid color-mix(in srgb, #06b6d4 30%, transparent)",
                }}
              >
                <div className="flex items-start gap-4">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                    style={{ background: "color-mix(in srgb, #06b6d4 30%, transparent)" }}
                  >
                    <Info size={18} style={{ color: "#67e8f9" }} />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-bold mb-1" style={{ color: "var(--kipu-text)" }}>El ATS no aplica para tu perfil</p>
                    <p className="text-xs mb-3" style={{ color: "var(--kipu-subtle)" }}>
                      El Anexo Transaccional Simplificado es obligatorio solo para personas <strong style={{ color: "var(--kipu-text)" }}>obligadas a llevar contabilidad</strong> según el SRI — generalmente quienes superan $300.000 en ingresos anuales o tienen capital propio mayor a $60.000.
                    </p>
                    <p className="text-xs" style={{ color: "var(--kipu-subtle)" }}>
                      Si crees que deberías presentarlo, consulta con tu contador o revisa tu RUC en el portal del SRI.
                    </p>
                  </div>
                </div>
              </div>
              {/* Demo ATS igual para que vea cómo se vería */}
              <p className="text-xs text-center" style={{ color: "var(--kipu-subtle)" }}>Así se vería si fueras obligado a contabilidad:</p>
              <DemoCards tab="ATS" />
            </>
          )}

          {/* IVA, RENTA — o ATS con obligado */}
          {(tab !== "ATS" || tieneATS) && (
            <>
              {/* Selector año */}
              <div
                className="flex items-center justify-between rounded-xl px-4 py-2.5"
                style={{
                  background: "var(--kipu-surface)",
                  border: "1px solid var(--kipu-border)",
                }}
              >
                <button
                  type="button"
                  onClick={() => setAnio((a) => a - 1)}
                  className="p-1.5 rounded-lg transition-colors"
                  style={{ color: "var(--kipu-subtle)" }}
                  onMouseEnter={e => {
                    e.currentTarget.style.color = "var(--kipu-text)";
                    e.currentTarget.style.background = "color-mix(in srgb, var(--kipu-text) 5%, transparent)";
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.color = "var(--kipu-subtle)";
                    e.currentTarget.style.background = "transparent";
                  }}
                >
                  <ChevronLeft size={16} />
                </button>
                <span className="text-sm font-semibold" style={{ color: "var(--kipu-text)" }}>{anio}</span>
                <button
                  type="button"
                  onClick={() => setAnio((a) => Math.min(a + 1, new Date().getFullYear()))}
                  disabled={anio >= new Date().getFullYear()}
                  className="p-1.5 rounded-lg transition-colors disabled:opacity-30"
                  style={{ color: "var(--kipu-subtle)" }}
                  onMouseEnter={e => {
                    if (anio < new Date().getFullYear()) {
                      e.currentTarget.style.color = "var(--kipu-text)";
                      e.currentTarget.style.background = "color-mix(in srgb, var(--kipu-text) 5%, transparent)";
                    }
                  }}
                  onMouseLeave={e => {
                    if (anio < new Date().getFullYear()) {
                      e.currentTarget.style.color = "var(--kipu-subtle)";
                      e.currentTarget.style.background = "transparent";
                    }
                  }}
                >
                  <ChevronRight size={16} />
                </button>
              </div>

              {/* Info contextual por tab */}
              <div
                className="rounded-xl px-4 py-3 text-xs"
                style={getInfoTabStyle()}
              >
                {tab === "IVA" && (
                  periodoIva === "SEMESTRAL"
                    ? "Declaración semestral del IVA — Formulario 104. Enero–junio y julio–diciembre. Vence según el noveno dígito del RUC."
                    : "Declaración mensual del IVA — Formulario 104. Vence según el noveno dígito del RUC."
                )}
                {tab === "RENTA" && "Declaración anual del Impuesto a la Renta — Formulario 102. Vence entre marzo y abril del año siguiente."}
                {tab === "ATS"   && "Anexo Transaccional Simplificado — Detalle de todas tus compras y ventas. Solo obligados a contabilidad."}
              </div>

              {loading ? (
                <div className="flex items-center justify-center py-16">
                  <div
                    className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin"
                    style={{ borderColor: "var(--kipu-accent)", borderTopColor: "transparent" }}
                  />
                </div>
              ) : items.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <FileText size={40} className="mb-3" style={{ color: "var(--kipu-subtle)" }} />
                  <p className="text-sm" style={{ color: "var(--kipu-muted)" }}>No hay declaraciones registradas para {anio}</p>
                  <p className="text-xs mt-1" style={{ color: "var(--kipu-subtle)" }}>
                    Las declaraciones se crean automáticamente cuando emites documentos en producción.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {items.map((item) => (
                    <ReporteCard
                      key={item.periodo}
                      tipo={tab}
                      periodo={item.periodo}
                      periodoFmt={item.periodoFmt}
                      estado={item.estado}
                      diasRestantes={item.diasRestantes}
                      vencimiento={item.vencimiento}
                      declarado={item.declarado}
                      cached={item.cached}
                      enCurso={item.enCurso}
                      generadoAt={item.generadoAt}
                      resumen={item.resumen ? {
                        ivaAPagar:        item.resumen?.resultado?.a_pagar          ?? item.resumen?.casilleros?.["859"] ?? 0,
                        saldoFavor:       item.resumen?.resultado?.saldo_favor       ?? 0,
                        impuestoCausado:  item.resumen?.resultado?.impuesto_causado  ?? 0,
                        totalDocs:        item.totalDocs,
                      } : undefined}
                    />
                  ))}
                </div>
              )}

              {!loading && items.length > 0 && (
                <div
                  className="rounded-xl p-4"
                  style={{
                    background: "var(--kipu-surface)",
                    border: "1px solid var(--kipu-border)",
                  }}
                >
                  <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "var(--kipu-subtle)" }}>
                    Resumen {anio}
                  </p>
                  <div className="grid grid-cols-3 gap-3 text-center">
                    <div>
                      <p className="text-lg font-bold" style={{ color: "var(--kipu-text)" }}>{items.filter((i) => i.declarado).length}</p>
                      <p className="text-xs" style={{ color: "var(--kipu-subtle)" }}>Declarados</p>
                    </div>
                    <div>
                      <p className="text-lg font-bold" style={{ color: "var(--kipu-warning)" }}>{items.filter((i) => !i.declarado && !i.enCurso).length}</p>
                      <p className="text-xs" style={{ color: "var(--kipu-subtle)" }}>Pendientes</p>
                    </div>
                    <div>
                      <p className="text-lg font-bold" style={{ color: "var(--kipu-accent)" }}>{items.filter((i) => i.cached).length}</p>
                      <p className="text-xs" style={{ color: "var(--kipu-subtle)" }}>Con reporte</p>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}