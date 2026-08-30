// app/(dashboard)/reportes/renta/[anio]/page.tsx
"use client";
import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import api from "@/lib/api";
import {
  Loader2, ArrowLeft, RefreshCw,
  CheckCircle2, AlertTriangle, TrendingUp, TrendingDown,
} from "lucide-react";
import { clsx } from "clsx";

import PreguntasSRI        from "../../_components/PreguntasSRI";
import ResumenImpositivo   from "../../_components/ResumenImpositivo";
import DocumentosIncluidos from "../../_components/DocumentosIncluidos";
import EstadoBadge         from "../../_components/EstadoBadge";

const fmt = (n: number = 0) =>
  n.toLocaleString("es-EC", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function ReporteRentaPage() {
  const params = useParams();
  const router = useRouter();
  const anio   = parseInt(params.anio as string);

  const [data,        setData]        = useState<any>(null);
  const [loading,     setLoading]     = useState(true);
  const [regenerando, setRegenerando] = useState(false);
  const [marcando,    setMarcando]    = useState(false);
  const [declarado,   setDeclarado]   = useState(false);
  const [error,       setError]       = useState("");

  const cargar = useCallback(async (regen = false) => {
    setError("");
    if (regen) setRegenerando(true);
    else setLoading(true);
    try {
      const url = `/api/v1/app/declaraciones/renta?anio=${anio}${regen ? "&regenerar=true" : ""}`;
      const res = await api.get(url);
      setData(res.data);

      // Verificar declarado
      const resDecl = await api.get(`/api/v1/app/declaraciones/periodo/${anio}/1?tipo=102`);
      setDeclarado(resDecl.data.data?.declarado ?? false);
    } catch (e: any) {
      setError(e?.response?.data?.detail ?? "Error al cargar el reporte.");
    } finally {
      setLoading(false);
      setRegenerando(false);
    }
  }, [anio]);

  useEffect(() => { cargar(); }, [cargar]);

  const marcarDeclarado = async () => {
    setMarcando(true);
    try {
      await api.post("/api/v1/app/declaraciones/declarar?tipo=102");
      setDeclarado(true);
    } catch (e: any) {
      setError(e?.response?.data?.detail ?? "Error al marcar como declarado.");
    } finally { setMarcando(false); }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-3">
          <Loader2 size={28} className="animate-spin text-purple-400 mx-auto" />
          <p className="text-sm text-gray-500">Calculando impuesto a la renta...</p>
        </div>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="p-6 max-w-2xl mx-auto">
        <div className="flex items-start gap-3 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
          <AlertTriangle size={16} className="text-red-400 shrink-0 mt-0.5" />
          <p className="text-sm text-red-400">{error}</p>
        </div>
      </div>
    );
  }

  const reporte      = data?.data;
  const cached       = data?.cached    ?? false;
  const enCurso      = data?.en_curso  ?? false;
  const totalEmit    = data?.total_doc_emitidos  ?? 0;
  const totalRecib   = data?.total_doc_recibidos ?? 0;
  const generadoAt   = data?.generado_at;
  const regeneradoAt = data?.regenerado_at;

  const ingresos  = reporte?.ingresos   ?? {};
  const gastos    = reporte?.gastos     ?? {};
  const resumen   = reporte?.resumen    ?? {};
  const resultado = resumen?.resultado  ?? {};
  const tabla     = reporte?.tabla_ir   ?? {};

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto space-y-5">

      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <button onClick={() => router.push("/reportes")}
            className="p-2 rounded-lg border border-gray-700 text-gray-400 hover:text-white transition-colors mt-0.5">
            <ArrowLeft size={16} />
          </button>
          <div>
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-purple-600/20 text-purple-400 border border-purple-500/20">
                Renta 102
              </span>
              <h1 className="text-xl font-bold text-white">Año {anio}</h1>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {declarado
                ? <EstadoBadge estado="DECLARADO" size="sm" />
                : enCurso
                  ? <EstadoBadge estado="EN_CURSO"  size="sm" />
                  : <EstadoBadge estado="PENDIENTE" size="sm" />
              }
              {enCurso && (
                <span className="text-[10px] text-amber-400">
                  · Año en curso — valores preliminares
                </span>
              )}
            </div>
          </div>
        </div>
        <button
          onClick={() => cargar(true)}
          disabled={regenerando}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-700 text-gray-400 hover:text-white text-xs transition-colors disabled:opacity-40 shrink-0"
        >
          <RefreshCw size={13} className={regenerando ? "animate-spin" : ""} />
          {regenerando ? "Calculando..." : "Regenerar"}
        </button>
      </div>

      {error && (
        <div className="flex items-start gap-2 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2.5">
          <AlertTriangle size={14} className="text-red-400 shrink-0 mt-0.5" />
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      {/* Resumen rápido top */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-3 text-center">
          <p className="text-xs text-gray-500 mb-1">Ingresos netos</p>
          <p className="text-base font-bold text-white">${fmt(ingresos.netos ?? 0)}</p>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-3 text-center">
          <p className="text-xs text-gray-500 mb-1">Gastos deducibles</p>
          <p className="text-base font-bold text-white">${fmt(gastos.deducibles ?? 0)}</p>
        </div>
        <div className={clsx(
          "rounded-xl p-3 text-center border",
          resultado.a_pagar > 0
            ? "bg-red-500/10 border-red-500/20"
            : resultado.saldo_favor > 0
              ? "bg-emerald-500/10 border-emerald-500/20"
              : "bg-gray-900 border-gray-800"
        )}>
          <p className="text-xs text-gray-500 mb-1">
            {resultado.a_pagar > 0 ? "A pagar" : resultado.saldo_favor > 0 ? "Saldo favor" : "Impuesto"}
          </p>
          <p className={clsx(
            "text-base font-bold",
            resultado.a_pagar > 0    ? "text-red-400"     :
            resultado.saldo_favor > 0 ? "text-emerald-400" : "text-gray-400"
          )}>
            ${fmt(resultado.a_pagar > 0 ? resultado.a_pagar : resultado.saldo_favor ?? 0)}
          </p>
        </div>
      </div>

      {/* Preguntas SRI */}
      {reporte?.preguntas && (
        <PreguntasSRI preguntas={reporte.preguntas} tipo="RENTA" />
      )}

      {/* Ingresos */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-800">
          <div className="w-7 h-7 rounded-lg bg-indigo-600/20 flex items-center justify-center">
            <TrendingUp size={14} className="text-indigo-400" />
          </div>
          <div>
            <p className="text-sm font-semibold text-white">Ingresos del año</p>
            <p className="text-xs text-gray-500">Ventas autorizadas FAC + LIQ</p>
          </div>
        </div>
        <div className="p-4 space-y-1">
          {[
            { num: "501", label: "Ingresos brutos en actividad económica", value: ingresos.brutos ?? 0 },
            { num: "502", label: "Devoluciones y notas de crédito",        value: ingresos.ncr    ?? 0, resta: true },
            { num: "503", label: "Ingresos netos",                         value: ingresos.netos  ?? 0, highlight: true },
          ].map(({ num, label, value, resta, highlight }) => (
            <div key={num} className={clsx(
              "flex items-center justify-between gap-3 px-4 py-2.5 rounded-lg",
              highlight ? "bg-indigo-600/10 border border-indigo-500/20" : "hover:bg-gray-800/40"
            )}>
              <div className="flex items-center gap-3 min-w-0">
                <span className={clsx(
                  "text-[10px] font-bold px-2 py-0.5 rounded shrink-0",
                  highlight ? "bg-indigo-600 text-white" : "bg-gray-800 text-gray-400"
                )}>
                  {num}
                </span>
                <span className={clsx(
                  "text-xs truncate",
                  highlight ? "text-white font-medium" : "text-gray-400"
                )}>
                  {resta && value > 0 ? "(−) " : ""}{label}
                </span>
              </div>
              <span className={clsx(
                "text-sm font-bold shrink-0 tabular-nums",
                highlight ? "text-indigo-400" :
                resta     ? "text-red-400"    : "text-white"
              )}>
                {resta && value > 0 ? "-" : ""}${fmt(value)}
              </span>
            </div>
          ))}

          {/* Alerta ingresos adicionales */}
          <div className="flex items-start gap-2 bg-amber-500/5 border border-amber-500/20 rounded-lg px-3 py-2.5 mt-2">
            <AlertTriangle size={13} className="text-amber-400 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-300">
              <span className="font-semibold">Casillero 504:</span> Si tienes otros ingresos
              (arrendamientos, intereses, relación de dependencia), agrégalos manualmente en el SRI.
            </p>
          </div>
        </div>
      </div>

      {/* Gastos deducibles */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-800">
          <div className="w-7 h-7 rounded-lg bg-emerald-600/20 flex items-center justify-center">
            <TrendingDown size={14} className="text-emerald-400" />
          </div>
          <div>
            <p className="text-sm font-semibold text-white">Gastos deducibles</p>
            <p className="text-xs text-gray-500">Compras marcadas como deducibles de renta</p>
          </div>
        </div>
        <div className="p-4 space-y-1">
          <div className="flex items-center justify-between gap-3 px-4 py-2.5 rounded-lg bg-emerald-600/10 border border-emerald-500/20">
            <div className="flex items-center gap-3">
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-600 text-white shrink-0">
                601
              </span>
              <span className="text-xs text-white font-medium">Total gastos deducibles</span>
            </div>
            <span className="text-sm font-bold text-emerald-400 tabular-nums">
              ${fmt(gastos.deducibles ?? 0)}
            </span>
          </div>

          <div className="flex items-start gap-2 bg-amber-500/5 border border-amber-500/20 rounded-lg px-3 py-2.5 mt-2">
            <AlertTriangle size={13} className="text-amber-400 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-300">
              <span className="font-semibold">Casillero 602:</span> Los gastos personales
              (salud, educación, alimentación, vivienda, vestimenta) deben agregarse manualmente.
              El SRI tiene un límite según tu fracción básica.
            </p>
          </div>
        </div>
      </div>

      {/* Base imponible */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
          Base imponible
        </p>
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">Ingresos netos [503]</span>
            <span className="text-white">${fmt(ingresos.netos ?? 0)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">Gastos deducibles [601]</span>
            <span className="text-red-400">-${fmt(gastos.deducibles ?? 0)}</span>
          </div>
          <div className="border-t border-gray-800 pt-2 flex justify-between">
            <div>
              <span className="text-sm font-semibold text-white">Base imponible [699]</span>
              {tabla.tramo && (
                <p className="text-xs text-gray-500 mt-0.5">
                  Tramo: ${fmt(tabla.tramo.desde)} – {tabla.tramo.hasta === Infinity ? "+" : `$${fmt(tabla.tramo.hasta)}`}
                  {" · "}{tabla.tramo.porcentaje}%
                </p>
              )}
            </div>
            <span className="text-lg font-bold text-purple-400">
              ${fmt(reporte?.base_imponible ?? 0)}
            </span>
          </div>
        </div>

        {/* Tabla IR info */}
        {tabla.tabla_anio && (
          <div className="mt-3 pt-3 border-t border-gray-800">
            <p className="text-[10px] text-gray-600">
              ℹ️ Tabla IR {tabla.tabla_anio} — personas naturales.
              {tabla.nota && ` ${tabla.nota}.`}
            </p>
          </div>
        )}
      </div>

      {/* Retenciones en la fuente */}
      {(resultado.retenciones ?? 0) > 0 && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
            Crédito tributario renta
          </p>
          <div className="flex items-center justify-between gap-3 px-4 py-2.5 rounded-lg bg-blue-600/10 border border-blue-500/20">
            <div className="flex items-center gap-3">
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-600 text-white shrink-0">
                841
              </span>
              <span className="text-xs text-white font-medium">
                Retenciones en la fuente recibidas
              </span>
            </div>
            <span className="text-sm font-bold text-blue-400 tabular-nums">
              ${fmt(resultado.retenciones ?? 0)}
            </span>
          </div>
        </div>
      )}

      {/* Resumen impositivo */}
      <ResumenImpositivo
        tipo="RENTA"
        casilleros={resumen.casilleros ?? {}}
        camposManuales={resumen.campos_manuales ?? []}
        resultado={resultado}
      />

      {/* Documentos incluidos */}
      <DocumentosIncluidos
        totalEmitidos={totalEmit}
        totalRecibidos={totalRecib}
        periodo={`${anio}`}
        tipo="RENTA"
        generadoAt={generadoAt}
        regeneradoAt={regeneradoAt}
      />

      {/* Notas */}
      {reporte?.notas?.length > 0 && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 space-y-1.5">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Notas</p>
          {reporte.notas.map((nota: string, i: number) => (
            <p key={i} className="text-xs text-gray-500">· {nota}</p>
          ))}
        </div>
      )}

      {/* Marcar declarado */}
      {!declarado && !enCurso && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <p className="text-sm text-white font-medium mb-1">¿Ya declaraste en el SRI?</p>
          <p className="text-xs text-gray-500 mb-3">
            Marca el año {anio} como declarado. Esto no declara por ti —
            solo registra que ya lo hiciste en el portal del SRI.
          </p>
          <button
            onClick={marcarDeclarado}
            disabled={marcando}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-sm font-medium transition-colors"
          >
            {marcando
              ? <><Loader2 size={14} className="animate-spin" /> Marcando...</>
              : <><CheckCircle2 size={14} /> Marcar año {anio} como declarado</>
            }
          </button>
        </div>
      )}

      {declarado && (
        <div className="flex items-center gap-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-4 py-3">
          <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
          <p className="text-sm text-emerald-300 font-medium">
            Renta {anio} declarada ante el SRI ✓
          </p>
        </div>
      )}

    </div>
  );
}