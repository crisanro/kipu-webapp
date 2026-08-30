// app/(dashboard)/reportes/iva/[periodo]/page.tsx
"use client";
import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import api from "@/lib/api";
import {
  Loader2, ArrowLeft, RefreshCw, CheckCircle2, AlertTriangle,
} from "lucide-react";
import { clsx } from "clsx";

import PreguntasSRI        from "../../_components/PreguntasSRI";
import SeccionVentas       from "../../_components/SeccionVentas";
import SeccionCompras      from "../../_components/SeccionCompras";
import SeccionRetenciones  from "../../_components/SeccionRetenciones";
import ResumenImpositivo   from "../../_components/ResumenImpositivo";
import DocumentosIncluidos from "../../_components/DocumentosIncluidos";
import EstadoBadge         from "../../_components/EstadoBadge";

const fmt = (n: number = 0) =>
  n.toLocaleString("es-EC", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function ReporteIVAPage() {
  const params  = useParams();
  const router  = useRouter();
  const periodo = params.periodo as string;  // "2026-08"

  const [data,         setData]         = useState<any>(null);
  const [loading,      setLoading]      = useState(true);
  const [regenerando,  setRegenerando]  = useState(false);
  const [marcando,     setMarcando]     = useState(false);
  const [error,        setError]        = useState("");
  const [declarado,    setDeclarado]    = useState(false);

  const periodoFmt = (() => {
    try {
      const [a, m] = periodo.split("-");
      return new Date(parseInt(a), parseInt(m) - 1, 1)
        .toLocaleDateString("es-EC", { month: "long", year: "numeric" });
    } catch { return periodo; }
  })();

  const cargar = useCallback(async (regen = false) => {
    setError("");
    if (regen) setRegenerando(true);
    else setLoading(true);
    try {
      const url = `/api/v1/app/declaraciones/iva?periodo=${periodo}${regen ? "&regenerar=true" : ""}`;
      const res = await api.get(url);
      setData(res.data);

      // Verificar si ya está declarado
      const [a, m] = periodo.split("-");
      const resDecl = await api.get(`/api/v1/app/declaraciones/periodo/${a}/${m}?tipo=104`);
      setDeclarado(resDecl.data.data?.declarado ?? false);
    } catch (e: any) {
      setError(e?.response?.data?.detail ?? "Error al cargar el reporte.");
    } finally {
      setLoading(false);
      setRegenerando(false);
    }
  }, [periodo]);

  useEffect(() => { cargar(); }, [cargar]);

  const marcarDeclarado = async () => {
    setMarcando(true);
    try {
      await api.post("/api/v1/app/declaraciones/declarar?tipo=104");
      setDeclarado(true);
    } catch (e: any) {
      setError(e?.response?.data?.detail ?? "Error al marcar como declarado.");
    } finally { setMarcando(false); }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-3">
          <Loader2 size={28} className="animate-spin text-indigo-400 mx-auto" />
          <p className="text-sm text-gray-500">Calculando casilleros...</p>
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

  const reporte       = data?.data;
  const cached        = data?.cached        ?? false;
  const enCurso       = data?.en_curso      ?? false;
  const totalEmit     = data?.total_doc_emitidos  ?? 0;
  const totalRecib    = data?.total_doc_recibidos ?? 0;
  const generadoAt    = data?.generado_at;
  const regeneradoAt  = data?.regenerado_at;

  const casVentas  = reporte?.ventas?.casilleros    ?? {};
  const casCompras = reporte?.compras?.casilleros   ?? {};
  const casResumen = reporte?.resumen?.casilleros   ?? {};

  const ivaAPagar  = casResumen["601"] > 0
    ? Math.max((casResumen["601"] ?? 0) - (casResumen["609"] ?? 0), 0)
    : 0;
  const saldoFavor = casResumen["602"] ?? 0;

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
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-indigo-600/20 text-indigo-400 border border-indigo-500/20">
                IVA 104
              </span>
              <h1 className="text-xl font-bold text-white capitalize">{periodoFmt}</h1>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {declarado
                ? <EstadoBadge estado="DECLARADO" size="sm" />
                : enCurso
                  ? <EstadoBadge estado="EN_CURSO" size="sm" />
                  : <EstadoBadge estado="PENDIENTE" size="sm" />
              }
              {cached && (
                <span className="text-[10px] text-gray-500">
                  · Reporte guardado
                </span>
              )}
              {enCurso && (
                <span className="text-[10px] text-amber-400">
                  · Período en curso — valores preliminares
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Regenerar */}
        <button
          onClick={() => cargar(true)}
          disabled={regenerando}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-700 text-gray-400 hover:text-white text-xs transition-colors disabled:opacity-40 shrink-0"
        >
          <RefreshCw size={13} className={regenerando ? "animate-spin" : ""} />
          {regenerando ? "Calculando..." : "Regenerar"}
        </button>
      </div>

      {/* Alerta error */}
      {error && (
        <div className="flex items-start gap-2 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2.5">
          <AlertTriangle size={14} className="text-red-400 shrink-0 mt-0.5" />
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      {/* Resumen rápido top */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-3 text-center">
          <p className="text-xs text-gray-500 mb-1">Ventas netas</p>
          <p className="text-base font-bold text-white">${fmt(casVentas["419"] ?? 0)}</p>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-3 text-center">
          <p className="text-xs text-gray-500 mb-1">Compras netas</p>
          <p className="text-base font-bold text-white">${fmt(casCompras["519"] ?? 0)}</p>
        </div>
        <div className={clsx(
          "rounded-xl p-3 text-center border",
          ivaAPagar > 0
            ? "bg-red-500/10 border-red-500/20"
            : saldoFavor > 0
              ? "bg-emerald-500/10 border-emerald-500/20"
              : "bg-gray-900 border-gray-800"
        )}>
          <p className="text-xs text-gray-500 mb-1">
            {ivaAPagar > 0 ? "A pagar" : saldoFavor > 0 ? "Saldo favor" : "IVA neto"}
          </p>
          <p className={clsx(
            "text-base font-bold",
            ivaAPagar > 0  ? "text-red-400"     :
            saldoFavor > 0 ? "text-emerald-400" : "text-white"
          )}>
            ${fmt(ivaAPagar > 0 ? ivaAPagar : saldoFavor > 0 ? saldoFavor : 0)}
          </p>
        </div>
      </div>

      {/* Preguntas SRI */}
      {reporte?.preguntas && (
        <PreguntasSRI preguntas={reporte.preguntas} tipo="IVA" />
      )}

      {/* Ventas */}
      {reporte?.ventas && (
        <SeccionVentas
          desglose={reporte.ventas.desglose ?? []}
          casilleros={reporte.ventas.casilleros ?? {}}
        />
      )}

      {/* Compras */}
      {reporte?.compras && (
        <SeccionCompras
          desglose={reporte.compras.desglose ?? []}
          casilleros={reporte.compras.casilleros ?? {}}
        />
      )}

      {/* Retenciones */}
      <SeccionRetenciones
        modo="IVA"
        retEmitidas={{
          desglose:   reporte?.retenciones_emitidas?.desglose   ?? [],
          casilleros: reporte?.retenciones_emitidas?.casilleros ?? {},
        }}
        retRecibidas={{
          casilleros: reporte?.retenciones_recibidas?.casilleros ?? {},
        }}
      />

      {/* Resumen impositivo */}
      {reporte?.resumen && (
        <ResumenImpositivo
          tipo="IVA"
          casilleros={reporte.resumen.casilleros ?? {}}
          camposManuales={reporte.resumen.campos_manuales ?? []}
        />
      )}

      {/* Documentos incluidos */}
      <DocumentosIncluidos
        totalEmitidos={totalEmit}
        totalRecibidos={totalRecib}
        periodo={periodo}
        tipo="IVA"
        generadoAt={generadoAt}
        regeneradoAt={regeneradoAt}
      />

      {/* Notas */}
      {reporte?.notas?.length > 0 && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 space-y-1.5">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
            Notas
          </p>
          {reporte.notas.map((nota: string, i: number) => (
            <p key={i} className="text-xs text-gray-500">· {nota}</p>
          ))}
        </div>
      )}

      {/* Botón marcar declarado */}
      {!declarado && !enCurso && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <p className="text-sm text-white font-medium mb-1">¿Ya declaraste en el SRI?</p>
          <p className="text-xs text-gray-500 mb-3">
            Marca este período como declarado para mantener tu historial al día.
            Esto no declara por ti — solo registra que ya lo hiciste en el portal del SRI.
          </p>
          <button
            onClick={marcarDeclarado}
            disabled={marcando}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-sm font-medium transition-colors"
          >
            {marcando
              ? <><Loader2 size={14} className="animate-spin" /> Marcando...</>
              : <><CheckCircle2 size={14} /> Marcar como declarado</>
            }
          </button>
        </div>
      )}

      {/* Ya declarado */}
      {declarado && (
        <div className="flex items-center gap-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-4 py-3">
          <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
          <p className="text-sm text-emerald-300 font-medium">
            Período declarado ante el SRI ✓
          </p>
        </div>
      )}

    </div>
  );
}