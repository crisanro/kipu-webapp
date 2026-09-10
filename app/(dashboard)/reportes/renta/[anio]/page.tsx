"use client";
import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import api from "@/lib/api";
import {
  ArrowLeft, RefreshCw,
  CheckCircle2, AlertTriangle, TrendingUp, TrendingDown,
} from "lucide-react";

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
          <div
            className="w-7 h-7 border-2 border-t-transparent rounded-full animate-spin mx-auto"
            style={{ borderColor: "#c084fc", borderTopColor: "transparent" }}
          />
          <p className="text-sm" style={{ color: "var(--kipu-subtle)" }}>Calculando impuesto a la renta...</p>
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
                  background: "color-mix(in srgb, #a855f7 20%, transparent)",
                  color: "#c084fc",
                  border: "1px solid color-mix(in srgb, #a855f7 20%, transparent)",
                }}
              >
                Renta 102
              </span>
              <h1 className="text-xl font-bold" style={{ color: "var(--kipu-text)" }}>Año {anio}</h1>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {declarado ? (
                <EstadoBadge estado="DECLARADO" size="sm" />
              ) : enCurso ? (
                <EstadoBadge estado="EN_CURSO" size="sm" />
              ) : (
                <EstadoBadge estado="PENDIENTE" size="sm" />
              )}
              {enCurso && (
                <span className="text-[10px]" style={{ color: "var(--kipu-warning)" }}>
                  · Año en curso — valores preliminares
                </span>
              )}
            </div>
          </div>
        </div>
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
          <p className="text-xs mb-1" style={{ color: "var(--kipu-subtle)" }}>Ingresos netos</p>
          <p className="text-base font-bold" style={{ color: "var(--kipu-text)" }}>${fmt(ingresos.netos ?? 0)}</p>
        </div>
        <div
          className="rounded-xl p-3 text-center"
          style={{
            background: "var(--kipu-surface)",
            border: "1px solid var(--kipu-border)",
          }}
        >
          <p className="text-xs mb-1" style={{ color: "var(--kipu-subtle)" }}>Gastos deducibles</p>
          <p className="text-base font-bold" style={{ color: "var(--kipu-text)" }}>${fmt(gastos.deducibles ?? 0)}</p>
        </div>
        <div
          className="rounded-xl p-3 text-center"
          style={{
            background: resultado.a_pagar > 0
              ? "color-mix(in srgb, var(--kipu-danger) 10%, transparent)"
              : resultado.saldo_favor > 0
                ? "color-mix(in srgb, var(--kipu-success) 10%, transparent)"
                : "var(--kipu-surface)",
            border: resultado.a_pagar > 0
              ? "1px solid color-mix(in srgb, var(--kipu-danger) 20%, transparent)"
              : resultado.saldo_favor > 0
                ? "1px solid color-mix(in srgb, var(--kipu-success) 20%, transparent)"
                : "1px solid var(--kipu-border)",
          }}
        >
          <p className="text-xs mb-1" style={{ color: "var(--kipu-subtle)" }}>
            {resultado.a_pagar > 0 ? "A pagar" : resultado.saldo_favor > 0 ? "Saldo favor" : "Impuesto"}
          </p>
          <p
            className="text-base font-bold"
            style={{
              color: resultado.a_pagar > 0
                ? "var(--kipu-danger)"
                : resultado.saldo_favor > 0
                  ? "var(--kipu-success)"
                  : "var(--kipu-text)",
            }}
          >
            ${fmt(resultado.a_pagar > 0 ? resultado.a_pagar : resultado.saldo_favor ?? 0)}
          </p>
        </div>
      </div>

      {/* Preguntas SRI */}
      {reporte?.preguntas && (
        <PreguntasSRI preguntas={reporte.preguntas} tipo="RENTA" />
      )}

      {/* Ingresos */}
      <div
        className="rounded-xl overflow-hidden"
        style={{
          background: "var(--kipu-surface)",
          border: "1px solid var(--kipu-border)",
        }}
      >
        <div
          className="flex items-center gap-2 px-4 py-3"
          style={{ borderBottom: "1px solid var(--kipu-border)" }}
        >
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
            style={{ background: "color-mix(in srgb, var(--kipu-accent) 20%, transparent)" }}
          >
            <TrendingUp size={14} style={{ color: "var(--kipu-accent)" }} />
          </div>
          <div>
            <p className="text-sm font-semibold" style={{ color: "var(--kipu-text)" }}>Ingresos del año</p>
            <p className="text-xs" style={{ color: "var(--kipu-subtle)" }}>Ventas autorizadas FAC + LIQ</p>
          </div>
        </div>
        <div className="p-4 space-y-1">
          {[
            { num: "501", label: "Ingresos brutos en actividad económica", value: ingresos.brutos ?? 0, resta: false, highlight: false },
            { num: "502", label: "Devoluciones y notas de crédito",        value: ingresos.ncr    ?? 0, resta: true,  highlight: false },
            { num: "503", label: "Ingresos netos",                          value: ingresos.netos  ?? 0, resta: false, highlight: true },
          ].map(({ num, label, value, resta, highlight }) => (
            <div
              key={num}
              className="flex items-center justify-between gap-3 px-4 py-2.5 rounded-lg transition-colors"
              style={{
                background: highlight
                  ? "color-mix(in srgb, var(--kipu-accent) 10%, transparent)"
                  : "transparent",
                border: highlight
                  ? "1px solid color-mix(in srgb, var(--kipu-accent) 20%, transparent)"
                  : "none",
              }}
              onMouseEnter={e => {
                if (!highlight) e.currentTarget.style.background = "color-mix(in srgb, var(--kipu-text) 4%, transparent)";
              }}
              onMouseLeave={e => {
                if (!highlight) e.currentTarget.style.background = "transparent";
              }}
            >
              <div className="flex items-center gap-3 min-w-0">
                <span
                  className="text-[10px] font-bold px-2 py-0.5 rounded shrink-0"
                  style={{
                    background: highlight
                      ? "var(--kipu-accent)"
                      : "color-mix(in srgb, var(--kipu-text) 8%, transparent)",
                    color: highlight ? "#FFFFFF" : "var(--kipu-subtle)",
                  }}
                >
                  {num}
                </span>
                <span
                  className={`text-xs truncate ${highlight ? "font-medium" : ""}`}
                  style={{ color: highlight ? "var(--kipu-text)" : "var(--kipu-subtle)" }}
                >
                  {resta && value > 0 ? "(−) " : ""}{label}
                </span>
              </div>
              <span
                className="text-sm font-bold shrink-0 tabular-nums"
                style={{
                  color: highlight
                    ? "var(--kipu-accent)"
                    : resta
                      ? "var(--kipu-danger)"
                      : "var(--kipu-text)",
                }}
              >
                {resta && value > 0 ? "-" : ""}${fmt(value)}
              </span>
            </div>
          ))}

          {/* Alerta ingresos adicionales */}
          <div
            className="flex items-start gap-2 rounded-lg px-3 py-2.5 mt-2"
            style={{
              background: "color-mix(in srgb, var(--kipu-warning) 5%, transparent)",
              border: "1px solid color-mix(in srgb, var(--kipu-warning) 20%, transparent)",
            }}
          >
            <AlertTriangle size={13} className="shrink-0 mt-0.5" style={{ color: "var(--kipu-warning)" }} />
            <p className="text-xs" style={{ color: "var(--kipu-warning)" }}>
              <span className="font-semibold">Casillero 504:</span> Si tienes otros ingresos
              (arrendamientos, intereses, relación de dependencia), agrégalos manualmente en el SRI.
            </p>
          </div>
        </div>
      </div>

      {/* Gastos deducibles */}
      <div
        className="rounded-xl overflow-hidden"
        style={{
          background: "var(--kipu-surface)",
          border: "1px solid var(--kipu-border)",
        }}
      >
        <div
          className="flex items-center gap-2 px-4 py-3"
          style={{ borderBottom: "1px solid var(--kipu-border)" }}
        >
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
            style={{ background: "color-mix(in srgb, var(--kipu-success) 20%, transparent)" }}
          >
            <TrendingDown size={14} style={{ color: "var(--kipu-success)" }} />
          </div>
          <div>
            <p className="text-sm font-semibold" style={{ color: "var(--kipu-text)" }}>Gastos deducibles</p>
            <p className="text-xs" style={{ color: "var(--kipu-subtle)" }}>Compras marcadas como deducibles de renta</p>
          </div>
        </div>
        <div className="p-4 space-y-1">
          <div
            className="flex items-center justify-between gap-3 px-4 py-2.5 rounded-lg"
            style={{
              background: "color-mix(in srgb, var(--kipu-success) 10%, transparent)",
              border: "1px solid color-mix(in srgb, var(--kipu-success) 20%, transparent)",
            }}
          >
            <div className="flex items-center gap-3">
              <span
                className="text-[10px] font-bold px-2 py-0.5 rounded text-white shrink-0"
                style={{ background: "var(--kipu-success)" }}
              >
                601
              </span>
              <span className="text-xs font-medium" style={{ color: "var(--kipu-text)" }}>Total gastos deducibles</span>
            </div>
            <span className="text-sm font-bold tabular-nums" style={{ color: "var(--kipu-success)" }}>
              ${fmt(gastos.deducibles ?? 0)}
            </span>
          </div>

          <div
            className="flex items-start gap-2 rounded-lg px-3 py-2.5 mt-2"
            style={{
              background: "color-mix(in srgb, var(--kipu-warning) 5%, transparent)",
              border: "1px solid color-mix(in srgb, var(--kipu-warning) 20%, transparent)",
            }}
          >
            <AlertTriangle size={13} className="shrink-0 mt-0.5" style={{ color: "var(--kipu-warning)" }} />
            <p className="text-xs" style={{ color: "var(--kipu-warning)" }}>
              <span className="font-semibold">Casillero 602:</span> Los gastos personales
              (salud, educación, alimentación, vivienda, vestimenta) deben agregarse manualmente.
              El SRI tiene un límite según tu fracción básica.
            </p>
          </div>
        </div>
      </div>

      {/* Base imponible */}
      <div
        className="rounded-xl p-4"
        style={{
          background: "var(--kipu-surface)",
          border: "1px solid var(--kipu-border)",
        }}
      >
        <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "var(--kipu-subtle)" }}>
          Base imponible
        </p>
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span style={{ color: "var(--kipu-subtle)" }}>Ingresos netos [503]</span>
            <span style={{ color: "var(--kipu-text)" }}>${fmt(ingresos.netos ?? 0)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span style={{ color: "var(--kipu-subtle)" }}>Gastos deducibles [601]</span>
            <span style={{ color: "var(--kipu-danger)" }}>-${fmt(gastos.deducibles ?? 0)}</span>
          </div>
          <div
            className="pt-2 flex justify-between"
            style={{ borderTop: "1px solid var(--kipu-border)" }}
          >
            <div>
              <span className="text-sm font-semibold" style={{ color: "var(--kipu-text)" }}>Base imponible [699]</span>
              {tabla.tramo && (
                <p className="text-xs mt-0.5" style={{ color: "var(--kipu-subtle)" }}>
                  Tramo: ${fmt(tabla.tramo.desde)} – {tabla.tramo.hasta === Infinity ? "+" : `$${fmt(tabla.tramo.hasta)}`}
                  {" · "}{tabla.tramo.porcentaje}%
                </p>
              )}
            </div>
            <span className="text-lg font-bold" style={{ color: "#c084fc" }}>
              ${fmt(reporte?.base_imponible ?? 0)}
            </span>
          </div>
        </div>

        {/* Tabla IR info */}
        {tabla.tabla_anio && (
          <div className="mt-3 pt-3" style={{ borderTop: "1px solid var(--kipu-border)" }}>
            <p className="text-[10px]" style={{ color: "var(--kipu-subtle)" }}>
              ℹ️ Tabla IR {tabla.tabla_anio} — personas naturales.
              {tabla.nota && ` ${tabla.nota}.`}
            </p>
          </div>
        )}
      </div>

      {/* Retenciones en la fuente */}
      {(resultado.retenciones ?? 0) > 0 && (
        <div
          className="rounded-xl p-4"
          style={{
            background: "var(--kipu-surface)",
            border: "1px solid var(--kipu-border)",
          }}
        >
          <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "var(--kipu-subtle)" }}>
            Crédito tributario renta
          </p>
          <div
            className="flex items-center justify-between gap-3 px-4 py-2.5 rounded-lg"
            style={{
              background: "color-mix(in srgb, #60a5fa 10%, transparent)",
              border: "1px solid color-mix(in srgb, #60a5fa 20%, transparent)",
            }}
          >
            <div className="flex items-center gap-3">
              <span className="text-[10px] font-bold px-2 py-0.5 rounded text-white shrink-0" style={{ background: "#3b82f6" }}>
                841
              </span>
              <span className="text-xs font-medium text-white">
                Retenciones en la fuente recibidas
              </span>
            </div>
            <span className="text-sm font-bold tabular-nums" style={{ color: "#60a5fa" }}>
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
        <div
          className="rounded-xl p-4 space-y-1.5"
          style={{
            background: "var(--kipu-surface)",
            border: "1px solid var(--kipu-border)",
          }}
        >
          <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--kipu-subtle)" }}>Notas</p>
          {reporte.notas.map((nota: string, i: number) => (
            <p key={i} className="text-xs" style={{ color: "var(--kipu-subtle)" }}>· {nota}</p>
          ))}
        </div>
      )}

      {/* Marcar declarado */}
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
            Marca el año {anio} como declarado. Esto no declara por ti —
            solo registra que ya lo hiciste en el portal del SRI.
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
                <CheckCircle2 size={14} /> Marcar año {anio} como declarado
              </>
            )}
          </button>
        </div>
      )}

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
            Renta {anio} declarada ante el SRI ✓
          </p>
        </div>
      )}

    </div>
  );
}