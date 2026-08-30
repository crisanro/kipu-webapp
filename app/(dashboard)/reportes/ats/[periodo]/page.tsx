// app/(dashboard)/reportes/ats/[periodo]/page.tsx
"use client";
import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import api from "@/lib/api";
import {
  Loader2, ArrowLeft, RefreshCw, AlertTriangle,
  FileText, Download, ChevronDown, ChevronUp,
} from "lucide-react";
import { clsx } from "clsx";

import PreguntasSRI        from "../../_components/PreguntasSRI";
import SeccionRetenciones  from "../../_components/SeccionRetenciones";
import ResumenImpositivo   from "../../_components/ResumenImpositivo";
import DocumentosIncluidos from "../../_components/DocumentosIncluidos";
import EstadoBadge         from "../../_components/EstadoBadge";

const fmt  = (n: number = 0) =>
  n.toLocaleString("es-EC", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtN = (n: number = 0) => n.toLocaleString("es-EC");

function TablaDetalle({ titulo, rows, columnas, color = "indigo" }: {
  titulo:   string;
  rows:     any[];
  columnas: { key: string; label: string; mono?: boolean; right?: boolean }[];
  color?:   string;
}) {
  const [expandido, setExpandido] = useState(false);
  const MAX_VISIBLE = 5;
  const visibles = expandido ? rows : rows.slice(0, MAX_VISIBLE);

  if (rows.length === 0) return null;

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText size={14} className={clsx(
            color === "emerald" ? "text-emerald-400" : "text-indigo-400"
          )} />
          <p className="text-sm font-semibold text-white">{titulo}</p>
          <span className="text-xs text-gray-500">({fmtN(rows.length)})</span>
        </div>
      </div>

      {/* Desktop */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-gray-800 text-[10px] text-gray-500 uppercase tracking-wider">
              {columnas.map(c => (
                <th key={c.key} className={clsx(
                  "px-4 py-2 font-medium",
                  c.right ? "text-right" : "text-left"
                )}>
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {visibles.map((row, idx) => (
              <tr key={idx} className="hover:bg-gray-800/30 transition-colors">
                {columnas.map(c => (
                  <td key={c.key} className={clsx(
                    "px-4 py-2.5",
                    c.right ? "text-right" : "",
                    c.mono  ? "font-mono"  : ""
                  )}>
                    <span className="text-gray-300">{row[c.key] ?? "—"}</span>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile */}
      <div className="md:hidden divide-y divide-gray-800">
        {visibles.map((row, idx) => (
          <div key={idx} className="px-4 py-3 space-y-1">
            {columnas.slice(0, 3).map(c => (
              <div key={c.key} className="flex justify-between gap-2">
                <span className="text-[10px] text-gray-500">{c.label}</span>
                <span className={clsx(
                  "text-xs text-gray-300",
                  c.mono ? "font-mono" : ""
                )}>
                  {row[c.key] ?? "—"}
                </span>
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* Ver más */}
      {rows.length > MAX_VISIBLE && (
        <button
          onClick={() => setExpandido(!expandido)}
          className="w-full flex items-center justify-center gap-1.5 px-4 py-2.5 border-t border-gray-800 text-xs text-gray-500 hover:text-white transition-colors"
        >
          {expandido
            ? <><ChevronUp size={13} /> Ver menos</>
            : <><ChevronDown size={13} /> Ver {rows.length - MAX_VISIBLE} más</>
          }
        </button>
      )}
    </div>
  );
}

export default function ReporteATSPage() {
  const params  = useParams();
  const router  = useRouter();
  const periodo = params.periodo as string;

  const [data,        setData]        = useState<any>(null);
  const [loading,     setLoading]     = useState(true);
  const [regenerando, setRegenerando] = useState(false);
  const [error,       setError]       = useState("");

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
      const url = `/api/v1/app/declaraciones/ats?periodo=${periodo}${regen ? "&regenerar=true" : ""}`;
      const res = await api.get(url);
      setData(res.data);
    } catch (e: any) {
      setError(e?.response?.data?.detail ?? "Error al cargar el ATS.");
    } finally {
      setLoading(false);
      setRegenerando(false);
    }
  }, [periodo]);

  useEffect(() => { cargar(); }, [cargar]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-3">
          <Loader2 size={28} className="animate-spin text-cyan-400 mx-auto" />
          <p className="text-sm text-gray-500">Generando Anexo Transaccional...</p>
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
  const cached       = data?.cached   ?? false;
  const enCurso      = data?.en_curso ?? false;
  const totalEmit    = data?.total_doc_emitidos  ?? 0;
  const totalRecib   = data?.total_doc_recibidos ?? 0;
  const generadoAt   = data?.generado_at;
  const regeneradoAt = data?.regenerado_at;

  const ventas           = reporte?.ventas   ?? {};
  const compras          = reporte?.compras  ?? {};
  const resumen          = reporte?.resumen  ?? {};
  const totalesVentas    = ventas.totales    ?? {};
  const totalesCompras   = compras.totales   ?? {};
  const detalleVentas    = ventas.detalle    ?? [];
  const detalleCompras   = compras.detalle   ?? [];
  const retEmitidas      = ventas.retenciones  ?? [];
  const retRecibidas     = compras.retenciones ?? [];

  // Columnas tabla ventas
  const colVentas = [
    { key: "numero_doc",    label: "Número",      mono: true  },
    { key: "fecha_emision", label: "Fecha"                    },
    { key: "identificacion",label: "Identificación", mono: true },
    { key: "razon_social",  label: "Cliente"                  },
    { key: "base_iva_nz",   label: "Base IVA",    right: true },
    { key: "base_iva_0",    label: "Base 0%",     right: true },
    { key: "iva",           label: "IVA",         right: true },
  ];

  // Columnas tabla compras
  const colCompras = [
    { key: "numero_doc",      label: "Número",     mono: true  },
    { key: "fecha_emision",   label: "Fecha"                   },
    { key: "ruc_proveedor",   label: "RUC",        mono: true  },
    { key: "razon_proveedor", label: "Proveedor"               },
    { key: "base_iva_nz",     label: "Base IVA",   right: true },
    { key: "iva_credito",     label: "IVA Créd.",  right: true },
    { key: "fuente",          label: "Fuente"                  },
  ];

  // Formatear valores para tabla
  const ventasFormateadas = detalleVentas.map((r: any) => ({
    ...r,
    base_iva_nz: `$${fmt(r.base_iva_nz)}`,
    base_iva_0:  `$${fmt(r.base_iva_0)}`,
    iva:         `$${fmt(r.iva)}`,
  }));

  const comprasFormateadas = detalleCompras.map((r: any) => ({
    ...r,
    base_iva_nz:  `$${fmt(r.base_iva_nz)}`,
    iva_credito:  `$${fmt(r.iva_credito)}`,
    fuente:       r.fuente === "FISICO" ? "📄 Físico" : "🔵 XML",
  }));

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto space-y-5">

      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <button onClick={() => router.push("/reportes")}
            className="p-2 rounded-lg border border-gray-700 text-gray-400 hover:text-white transition-colors mt-0.5">
            <ArrowLeft size={16} />
          </button>
          <div>
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-cyan-600/20 text-cyan-400 border border-cyan-500/20">
                ATS
              </span>
              <h1 className="text-xl font-bold text-white capitalize">{periodoFmt}</h1>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {enCurso
                ? <EstadoBadge estado="EN_CURSO"  size="sm" />
                : cached
                  ? <EstadoBadge estado="DECLARADO" size="sm" />
                  : <EstadoBadge estado="PENDIENTE" size="sm" />
              }
              {enCurso && (
                <span className="text-[10px] text-amber-400">
                  · Período en curso
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => cargar(true)}
            disabled={regenerando}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-700 text-gray-400 hover:text-white text-xs transition-colors disabled:opacity-40"
          >
            <RefreshCw size={13} className={regenerando ? "animate-spin" : ""} />
            {regenerando ? "Generando..." : "Regenerar"}
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-2 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2.5">
          <AlertTriangle size={14} className="text-red-400 shrink-0 mt-0.5" />
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      {/* Resumen rápido */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Ventas",      value: fmtN(totalesVentas.num_docs  ?? 0), sub: `$${fmt(totalesVentas.total  ?? 0)}`, color: "indigo"  },
          { label: "Compras",     value: fmtN(totalesCompras.num_docs ?? 0), sub: `$${fmt(totalesCompras.total ?? 0)}`, color: "emerald" },
          { label: "Ret. emit.",  value: fmtN(retEmitidas.length),           sub: "comprobantes",                       color: "yellow"  },
          { label: "Ret. recib.", value: fmtN(retRecibidas.length),          sub: "comprobantes",                       color: "blue"    },
        ].map(({ label, value, sub, color }) => (
          <div key={label} className="bg-gray-900 border border-gray-800 rounded-xl p-3 text-center">
            <p className="text-xs text-gray-500 mb-1">{label}</p>
            <p className="text-xl font-bold text-white">{value}</p>
            <p className="text-[10px] text-gray-500 mt-0.5">{sub}</p>
          </div>
        ))}
      </div>

      {/* Preguntas */}
      {reporte?.preguntas && (
        <PreguntasSRI preguntas={reporte.preguntas} tipo="ATS" />
      )}

      {/* Info ATS */}
      <div className="bg-cyan-500/5 border border-cyan-500/20 rounded-xl p-4">
        <p className="text-xs font-semibold text-cyan-300 mb-1">
          ¿Qué es el ATS?
        </p>
        <p className="text-xs text-cyan-400/70">
          El Anexo Transaccional Simplificado es un reporte mensual que detalla todas
          tus compras y ventas. Debes subirlo al portal del SRI en Línea antes del
          vencimiento. Aquí tienes el resumen completo listo para revisión.
        </p>
      </div>

      {/* Detalle ventas */}
      <div>
        <p className="text-sm font-semibold text-white mb-2">
          Comprobantes emitidos — ventas
        </p>

        {/* Totales ventas */}
        <div className="grid grid-cols-3 gap-2 mb-3">
          {[
            { label: "Base IVA ≠ 0", value: totalesVentas.base_iva_diferente_0 ?? 0, color: "text-indigo-400" },
            { label: "Base 0%",      value: totalesVentas.base_iva_0            ?? 0, color: "text-gray-400"   },
            { label: "IVA generado", value: totalesVentas.iva                   ?? 0, color: "text-indigo-400" },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-gray-900 border border-gray-800 rounded-lg px-3 py-2">
              <p className="text-[10px] text-gray-500">{label}</p>
              <p className={clsx("text-sm font-bold", color)}>${fmt(value)}</p>
            </div>
          ))}
        </div>

        <TablaDetalle
          titulo="Ventas del período"
          rows={ventasFormateadas}
          columnas={colVentas}
          color="indigo"
        />
      </div>

      {/* Detalle compras */}
      <div>
        <p className="text-sm font-semibold text-white mb-2">
          Comprobantes recibidos — compras
        </p>

        {/* Totales compras */}
        <div className="grid grid-cols-3 gap-2 mb-3">
          {[
            { label: "Base IVA ≠ 0",    value: totalesCompras.base_iva_diferente_0 ?? 0, color: "text-emerald-400" },
            { label: "IVA con crédito",  value: totalesCompras.iva_con_credito       ?? 0, color: "text-emerald-400" },
            { label: "IVA sin crédito",  value: totalesCompras.iva_sin_credito       ?? 0, color: "text-gray-400"    },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-gray-900 border border-gray-800 rounded-lg px-3 py-2">
              <p className="text-[10px] text-gray-500">{label}</p>
              <p className={clsx("text-sm font-bold", color)}>${fmt(value)}</p>
            </div>
          ))}
        </div>

        <TablaDetalle
          titulo="Compras del período"
          rows={comprasFormateadas}
          columnas={colCompras}
          color="emerald"
        />
      </div>

      {/* Retenciones */}
      <div>
        <p className="text-sm font-semibold text-white mb-2">Retenciones</p>
        <SeccionRetenciones
          modo="ATS"
          detalleEmitidas={retEmitidas}
          detalleRecibidas={retRecibidas}
        />
      </div>

      {/* Resumen */}
      <ResumenImpositivo
        tipo="ATS"
        casilleros={{}}
        camposManuales={[]}
      />

      {/* Documentos */}
      <DocumentosIncluidos
        totalEmitidos={totalEmit}
        totalRecibidos={totalRecib}
        periodo={periodo}
        tipo="ATS"
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

    </div>
  );
}