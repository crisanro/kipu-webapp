"use client";
import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import api from "@/lib/api";
import {
  ArrowLeft, RefreshCw, CheckCircle2, AlertTriangle,
} from "lucide-react";
import { useAuthStore } from "@/store/auth.store";

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
  const empresa = useAuthStore((s) => s.empresa);
  const params  = useParams();
  const router  = useRouter();
  const periodo = params.periodo as string;  // "2026-08"

  const [data,        setData]        = useState<any>(null);
  const [loading,     setLoading]     = useState(true);
  const [regenerando, setRegenerando] = useState(false);
  const [marcando,    setMarcando]    = useState(false);
  const [error,       setError]       = useState("");
  const [declarado,   setDeclarado]   = useState(false);

  const periodoFmt = (() => {
    try {
      const [a, m] = periodo.split("-");
      if (empresa?.periodo_iva === "SEMESTRAL") {
        return parseInt(m) <= 6 ? `1er semestre ${a}` : `2do semestre ${a}`;
      }
      return new Date(parseInt(a), parseInt(m) - 1, 1)
        .toLocaleDateString("es-EC", { month: "long", year: "numeric" });
    } catch { return periodo; }
  })();

  const cargar = useCallback(async (regen = false) => {
    setError("");
    if (regen) setRegenerando(true);
    else setLoading(true);
    try {
      const tipoPeriodo = empresa?.periodo_iva === "SEMESTRAL" ? "SEMESTRAL" : "MENSUAL";
      const url = `/api/v1/app/declaraciones/iva?periodo=${periodo}&tipo_periodo=${tipoPeriodo}${regen ? "&regenerar=true" : ""}`;
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
  }, [periodo, empresa?.periodo_iva]);

  useEffect(() => { cargar(); }, [cargar]);

  const guardarCamposManuales = async (valores: Record<string, number>) => {
    await api.patch(
      `/api/v1/app/declaraciones/iva/campos-manuales?periodo=${periodo}`,
      valores
    );
  };

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
          <div
            className="w-7 h-7 border-2 border-t-transparent rounded-full animate-spin mx-auto"
            style={{ borderColor: "var(--kipu-accent)", borderTopColor: "transparent" }}
          />
          <p className="text-sm" style={{ color: "var(--kipu-subtle)" }}>Calculando casilleros...</p>
        </div>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="p-6 max-w-2xl mx-auto">
        <div
          className="flex items-start gap-3 rounded-xl px-4 py-3"
          style={{
            background: "color-mix(in srgb, var(--kipu-danger) 10%, transparent)",
            border: "1px solid color-mix(in srgb, var(--kipu-danger) 20%, transparent)",
          }}
        >
          <AlertTriangle size={16} className="shrink-0 mt-0.5" style={{ color: "var(--kipu-danger)" }} />
          <p className="text-sm" style={{ color: "var(--kipu-danger)" }}>{error}</p>
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
          <button
            type="button"
            onClick={() => router.push("/reportes")}
            className="p-2 rounded-lg transition-colors mt-0.5"
            style={{
              border: "1px solid var(--kipu-border)",
              color: "var(--kipu-subtle)",
              background: "transparent",
            }}
            onMouseEnter={e => {
              e.currentTarget.style.color = "var(--kipu-text)";
              e.currentTarget.style.background = "color-mix(in srgb, var(--kipu-text) 5%, transparent)";
            }}
            onMouseLeave={e => {
              e.currentTarget.style.color = "var(--kipu-subtle)";
              e.currentTarget.style.background = "transparent";
            }}
          >
            <ArrowLeft size={16} />
          </button>
          <div>
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span
                className="text-xs font-bold px-2 py-0.5 rounded-full"
                style={{
                  background: "color-mix(in srgb, var(--kipu-accent) 20%, transparent)",
                  color: "var(--kipu-accent)",
                  border: "1px solid color-mix(in srgb, var(--kipu-accent) 20%, transparent)",
                }}
              >
                IVA 104
              </span>
              <h1 className="text-xl font-bold capitalize" style={{ color: "var(--kipu-text)" }}>{periodoFmt}</h1>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {declarado ? (
                <EstadoBadge estado="DECLARADO" size="sm" />
              ) : enCurso ? (
                <EstadoBadge estado="EN_CURSO" size="sm" />
              ) : (
                <EstadoBadge estado="PENDIENTE" size="sm" />
              )}
              {cached && (
                <span className="text-[10px]" style={{ color: "var(--kipu-subtle)" }}>
                  · Reporte guardado
                </span>
              )}
              {enCurso && (
                <span className="text-[10px]" style={{ color: "var(--kipu-warning)" }}>
                  · Período en curso — valores preliminares
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Regenerar */}
        <button
          type="button"
          onClick={() => cargar(true)}
          disabled={regenerando}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs transition-colors disabled:opacity-40 shrink-0 font-medium"
          style={{
            border: "1px solid var(--kipu-border)",
            color: "var(--kipu-muted)",
            background: "transparent",
          }}
          onMouseEnter={e => {
            if (!regenerando) e.currentTarget.style.color = "var(--kipu-text)";
          }}
          onMouseLeave={e => {
            if (!regenerando) e.currentTarget.style.color = "var(--kipu-muted)";
          }}
        >
          {regenerando ? (
            <div
              className="w-3.5 h-3.5 border-2 border-t-transparent rounded-full animate-spin"
              style={{ borderColor: "currentColor", borderTopColor: "transparent" }}
            />
          ) : (
            <RefreshCw size={13} />
          )}
          {regenerando ? "Calculando..." : "Regenerar"}
        </button>
      </div>

      {/* Alerta error */}
      {error && (
        <div
          className="flex items-start gap-2 rounded-lg px-3 py-2.5"
          style={{
            background: "color-mix(in srgb, var(--kipu-danger) 10%, transparent)",
            border: "1px solid color-mix(in srgb, var(--kipu-danger) 20%, transparent)",
          }}
        >
          <AlertTriangle size={14} className="shrink-0 mt-0.5" style={{ color: "var(--kipu-danger)" }} />
          <p className="text-sm" style={{ color: "var(--kipu-danger)" }}>{error}</p>
        </div>
      )}

      {/* Resumen rápido top */}
      <div className="grid grid-cols-3 gap-3">
        <div
          className="rounded-xl p-3 text-center"
          style={{
            background: "var(--kipu-surface)",
            border: "1px solid var(--kipu-border)",
          }}
        >
          <p className="text-xs mb-1" style={{ color: "var(--kipu-subtle)" }}>Ventas netas</p>
          <p className="text-base font-bold" style={{ color: "var(--kipu-text)" }}>${fmt(casVentas["419"] ?? 0)}</p>
        </div>
        <div
          className="rounded-xl p-3 text-center"
          style={{
            background: "var(--kipu-surface)",
            border: "1px solid var(--kipu-border)",
          }}
        >
          <p className="text-xs mb-1" style={{ color: "var(--kipu-subtle)" }}>Compras netas</p>
          <p className="text-base font-bold" style={{ color: "var(--kipu-text)" }}>${fmt(casCompras["519"] ?? 0)}</p>
        </div>
        <div
          className="rounded-xl p-3 text-center"
          style={{
            background: ivaAPagar > 0
              ? "color-mix(in srgb, var(--kipu-danger) 10%, transparent)"
              : saldoFavor > 0
                ? "color-mix(in srgb, var(--kipu-success) 10%, transparent)"
                : "var(--kipu-surface)",
            border: ivaAPagar > 0
              ? "1px solid color-mix(in srgb, var(--kipu-danger) 20%, transparent)"
              : saldoFavor > 0
                ? "1px solid color-mix(in srgb, var(--kipu-success) 20%, transparent)"
                : "1px solid var(--kipu-border)",
          }}
        >
          <p className="text-xs mb-1" style={{ color: "var(--kipu-subtle)" }}>
            {ivaAPagar > 0 ? "A pagar" : saldoFavor > 0 ? "Saldo favor" : "IVA neto"}
          </p>
          <p
            className="text-base font-bold"
            style={{
              color: ivaAPagar > 0
                ? "var(--kipu-danger)"
                : saldoFavor > 0
                  ? "var(--kipu-success)"
                  : "var(--kipu-text)",
            }}
          >
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
          valoresGuardados={data?.campos_manuales_valores ?? {}}
          onGuardar={guardarCamposManuales}
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
        <div
          className="rounded-xl p-4 space-y-1.5"
          style={{
            background: "var(--kipu-surface)",
            border: "1px solid var(--kipu-border)",
          }}
        >
          <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--kipu-subtle)" }}>
            Notas
          </p>
          {reporte.notas.map((nota: string, i: number) => (
            <p key={i} className="text-xs" style={{ color: "var(--kipu-subtle)" }}>· {nota}</p>
          ))}
        </div>
      )}

      {/* Botón marcar declarado */}
      {!declarado && !enCurso && (
        <div
          className="rounded-xl p-4"
          style={{
            background: "var(--kipu-surface)",
            border: "1px solid var(--kipu-border)",
          }}
        >
          <p className="text-sm font-medium mb-1" style={{ color: "var(--kipu-text)" }}>¿Ya declaraste en el SRI?</p>
          <p className="text-xs mb-3" style={{ color: "var(--kipu-subtle)" }}>
            Marca este período como declarado para mantener tu historial al día.
            Esto no declara por ti — solo registra que ya lo hiciste en el portal del SRI.
          </p>
          <button
            type="button"
            onClick={marcarDeclarado}
            disabled={marcando}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-white text-sm font-medium transition-colors disabled:opacity-50"
            style={{ background: "var(--kipu-success)" }}
          >
            {marcando ? (
              <>
                <div
                  className="w-3.5 h-3.5 border-2 border-t-transparent rounded-full animate-spin"
                  style={{ borderColor: "#FFFFFF", borderTopColor: "transparent" }}
                />
                Marcando...
              </>
            ) : (
              <>
                <CheckCircle2 size={14} /> Marcar como declarado
              </>
            )}
          </button>
        </div>
      )}

      {/* Ya declarado */}
      {declarado && (
        <div
          className="flex items-center gap-3 rounded-xl px-4 py-3"
          style={{
            background: "color-mix(in srgb, var(--kipu-success) 10%, transparent)",
            border: "1px solid color-mix(in srgb, var(--kipu-success) 20%, transparent)",
          }}
        >
          <CheckCircle2 size={16} className="shrink-0" style={{ color: "var(--kipu-success)" }} />
          <p className="text-sm font-medium" style={{ color: "var(--kipu-success)" }}>
            Período declarado ante el SRI ✓
          </p>
        </div>
      )}

    </div>
  );
}