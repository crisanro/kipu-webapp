// app/(dashboard)/reportes/page.tsx
"use client";
import { useState, useEffect, useCallback } from "react";
import api from "@/lib/api";
import { useAuthStore } from "@/store/auth.store";
import {
  Loader2, BarChart3, RefreshCw, AlertTriangle,
  FileText, ChevronLeft, ChevronRight,
} from "lucide-react";
import { clsx } from "clsx";
import ReporteCard from "./_components/ReporteCard";
import { EstadoReporte } from "./_components/EstadoBadge";

type Tab = "IVA" | "RENTA" | "ATS";

interface DeclaracionRow {
  periodo:         string;
  periodo_fmt:     string;
  vencimiento:     string;
  declarado:       boolean;
  fecha_declarado: string | null;
  estado:          string;
  totales:         any;
}

interface ReporteRow {
  tipo:                string;
  periodo:             string;
  cached:              boolean;
  total_doc_emitidos:  number;
  total_doc_recibidos: number;
  generado_at:         string;
  resumen:             any;
}

const TAB_CONFIG = {
  IVA:   { label: "IVA 104",   color: "bg-indigo-600 text-white",                         inactive: "text-gray-400 hover:text-white" },
  RENTA: { label: "Renta 102", color: "bg-purple-600 text-white",                         inactive: "text-gray-400 hover:text-white" },
  ATS:   { label: "ATS",       color: "bg-cyan-600   text-white",                         inactive: "text-gray-400 hover:text-white" },
};

function periodoFmt(periodo: string, tipo: Tab): string {
  try {
    if (tipo === "RENTA") return `Año ${periodo.split("-")[0]}`;
    const [a, m] = periodo.split("-");
    return new Date(parseInt(a), parseInt(m) - 1, 1)
      .toLocaleDateString("es-EC", { month: "long", year: "numeric" });
  } catch { return periodo; }
}

function periodoKey(decl: DeclaracionRow, tipo: Tab): string {
  if (tipo === "RENTA") return decl.periodo.split("-")[0];
  return decl.periodo.slice(0, 7); // YYYY-MM
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

export default function ReportesPage() {
  const empresa = useAuthStore((s) => s.empresa);
  const [tab,          setTab]          = useState<Tab>("IVA");
  const [declaraciones, setDeclaraciones] = useState<DeclaracionRow[]>([]);
  const [reportes,      setReportes]      = useState<ReporteRow[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [anio,          setAnio]          = useState(new Date().getFullYear());

  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      const tipoAPI = tab === "IVA" ? "104" : tab === "RENTA" ? "102" : "ATS";
      const [resDecl, resRep] = await Promise.all([
        api.get(`/api/v1/app/declaraciones/historial?tipo=${tipoAPI}&anio=${anio}`),
        api.get(`/api/v1/app/declaraciones/reportes?tipo=${tab}&anio=${anio}`),
      ]);
      setDeclaraciones(resDecl.data.data ?? []);
      setReportes(resRep.data.data ?? []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [tab, anio]);

  useEffect(() => { cargar(); }, [cargar]);

  // Merge declaraciones + reportes por período
  const items = declaraciones.map((decl) => {
    const key    = periodoKey(decl, tab);
    const reporte = reportes.find(r => r.periodo.startsWith(key));
    const hoy    = new Date();
    const venc   = new Date(decl.vencimiento);
    const dias   = Math.ceil((venc.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));

    // Es mes/año actual
    const esActual = tab === "RENTA"
      ? parseInt(key) === hoy.getFullYear()
      : key === `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, "0")}`;

    return {
      periodo:        key,
      periodoFmt:     periodoFmt(decl.periodo, tab),
      estado:         estadoFromDecl(decl) as EstadoReporte,
      diasRestantes:  dias,
      vencimiento:    decl.vencimiento,
      declarado:      decl.declarado,
      cached:         !!reporte,
      enCurso:        esActual,
      generadoAt:     reporte?.generado_at,
      totalDocs:      (reporte?.total_doc_emitidos ?? 0) + (reporte?.total_doc_recibidos ?? 0),
      resumen:        reporte?.resumen ?? null,
    };
  });

  const enProduccion = empresa?.ambiente === 2;

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-indigo-600/20 flex items-center justify-center">
            <BarChart3 size={18} className="text-indigo-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Reportes tributarios</h1>
            <p className="text-sm text-gray-500">
              Declaraciones organizadas y listas para el SRI
            </p>
          </div>
        </div>
        <button onClick={cargar} disabled={loading}
          className="p-2 rounded-lg border border-gray-700 text-gray-400 hover:text-white transition-colors disabled:opacity-40">
          {loading ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
        </button>
      </div>

      {/* Alerta producción */}
      {!enProduccion && (
        <div className="flex items-start gap-3 bg-amber-500/10 border border-amber-500/20 rounded-xl px-4 py-3">
          <AlertTriangle size={15} className="text-amber-400 shrink-0 mt-0.5" />
          <p className="text-sm text-amber-300">
            Los reportes tributarios solo aplican en ambiente de producción.
          </p>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-900 border border-gray-800 rounded-xl p-1">
        {(Object.keys(TAB_CONFIG) as Tab[]).map((t) => (
          <button key={t}
            onClick={() => setTab(t)}
            className={clsx(
              "flex-1 py-2.5 rounded-lg text-sm font-medium transition-colors",
              tab === t ? TAB_CONFIG[t].color : TAB_CONFIG[t].inactive
            )}
          >
            {TAB_CONFIG[t].label}
          </button>
        ))}
      </div>

      {/* Selector año */}
      <div className="flex items-center justify-between bg-gray-900 border border-gray-800 rounded-xl px-4 py-2.5">
        <button
          onClick={() => setAnio(a => a - 1)}
          className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
        >
          <ChevronLeft size={16} />
        </button>
        <span className="text-sm font-semibold text-white">{anio}</span>
        <button
          onClick={() => setAnio(a => Math.min(a + 1, new Date().getFullYear()))}
          disabled={anio >= new Date().getFullYear()}
          className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors disabled:opacity-30"
        >
          <ChevronRight size={16} />
        </button>
      </div>

      {/* Info tab */}
      <div className={clsx(
        "rounded-xl px-4 py-3 border text-xs",
        tab === "IVA"   ? "bg-indigo-500/5 border-indigo-500/20 text-indigo-300" :
        tab === "RENTA" ? "bg-purple-500/5 border-purple-500/20 text-purple-300" :
                          "bg-cyan-500/5   border-cyan-500/20   text-cyan-300"
      )}>
        {tab === "IVA" && "Declaración mensual del IVA — Formulario 104. Vence según el noveno dígito del RUC."}
        {tab === "RENTA" && "Declaración anual del Impuesto a la Renta — Formulario 102. Vence entre marzo y abril del año siguiente."}
        {tab === "ATS" && "Anexo Transaccional Simplificado — Detalle mensual de todas tus compras y ventas. Solo obligados a contabilidad."}
      </div>

      {/* Lista */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 size={24} className="animate-spin text-indigo-400" />
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <FileText size={40} className="text-gray-700 mb-3" />
          <p className="text-gray-500 text-sm">
            No hay declaraciones registradas para {anio}
          </p>
          <p className="text-gray-600 text-xs mt-1">
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
                ivaAPagar:       item.resumen?.resultado?.a_pagar       ?? item.resumen?.casilleros?.["859"] ?? 0,
                saldoFavor:      item.resumen?.resultado?.saldo_favor   ?? 0,
                impuestoCausado: item.resumen?.resultado?.impuesto_causado ?? 0,
                totalDocs:       item.totalDocs,
              } : undefined}
            />
          ))}
        </div>
      )}

      {/* Stats resumen año */}
      {!loading && items.length > 0 && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
            Resumen {anio}
          </p>
          <div className="grid grid-cols-3 gap-3 text-center">
            <div>
              <p className="text-lg font-bold text-white">
                {items.filter(i => i.declarado).length}
              </p>
              <p className="text-xs text-gray-500">Declarados</p>
            </div>
            <div>
              <p className="text-lg font-bold text-amber-400">
                {items.filter(i => !i.declarado && !i.enCurso).length}
              </p>
              <p className="text-xs text-gray-500">Pendientes</p>
            </div>
            <div>
              <p className="text-lg font-bold text-indigo-400">
                {items.filter(i => i.cached).length}
              </p>
              <p className="text-xs text-gray-500">Con reporte</p>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}