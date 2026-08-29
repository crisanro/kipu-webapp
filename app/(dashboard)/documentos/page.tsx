"use client";
import { useState, useEffect, useCallback } from "react";
import { useSandboxStore } from "@/store/sandbox.store";
import Link from "next/link";
import api from "@/lib/api";
import {
  Search, Plus, FileText, Loader2, CheckCircle2, Clock,
  XCircle, AlertTriangle, RefreshCw, ChevronDown, ChevronUp,
  TrendingUp, FlaskConical
} from "lucide-react";
import { clsx } from "clsx";

// ── Tipos ─────────────────────────────────────────────────────────────────────
interface Documento {
  id:             string;
  clave_acceso:   string;
  numero_doc:     string;
  fecha_emision: string;
  estado_sri:    string;
  tipo_doc:      string;
  cod_doc:       string;
  razon_social:  string;
  identificacion: string;
  importe_total: number;
  estado_cobro:  string | null;
}

// ── Configs ───────────────────────────────────────────────────────────────────
const ESTADO_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  AUTORIZADO: { label: "Autorizado", color: "text-emerald-400 bg-emerald-400/10", icon: CheckCircle2 },
  RECIBIDA:   { label: "En proceso", color: "text-indigo-400 bg-indigo-400/10",   icon: Clock },
  FIRMADO:    { label: "En cola",    color: "text-blue-400 bg-blue-400/10",       icon: Clock },
  DEVUELTA:   { label: "Devuelto",   color: "text-amber-400 bg-amber-400/10",     icon: AlertTriangle },
  RECHAZADO:  { label: "Rechazado",  color: "text-red-400 bg-red-400/10",         icon: XCircle },
  PENDIENTE:  { label: "Pendiente",  color: "text-gray-400 bg-gray-400/10",       icon: Clock },
  SANDBOX:    { label: "Prueba",     color: "text-cyan-400 bg-cyan-400/10",       icon: FlaskConical },
};

const TIPO_COMPROBANTE: Record<string, { label: string; color: string }> = {
  FAC: { label: "Factura",          color: "text-gray-400 bg-gray-400/10"     },
  NCR: { label: "Nota de Crédito",  color: "text-purple-400 bg-purple-400/10" },
  NDB: { label: "Nota de Débito",   color: "text-orange-400 bg-orange-400/10" },
  RET: { label: "Retención",        color: "text-yellow-400 bg-yellow-400/10" },
  LIQ: { label: "Liquidación",      color: "text-cyan-400 bg-cyan-400/10"     },
};

const COBRO_CONFIG: Record<string, { label: string; color: string }> = {
  PENDIENTE: { label: "Por cobrar", color: "text-amber-400"   },
  PAGADO:    { label: "Cobrado",    color: "text-emerald-400" },
  PARCIAL:   { label: "Parcial",    color: "text-blue-400"    },
  ANULADO:   { label: "Anulado",    color: "text-red-400"     },
};

const fmt = (n: any) => parseFloat(n ?? 0).toFixed(2);

// ── Componente ResumenTipoCard ─────────────────────────────────────────────────
const COLOR_MAP: Record<string, { badge: string; total: string }> = {
  indigo: { badge: "bg-indigo-400/10 text-indigo-400", total: "text-indigo-400" },
  cyan:   { badge: "bg-cyan-400/10 text-cyan-400",     total: "text-cyan-400"   },
  purple: { badge: "bg-purple-400/10 text-purple-400", total: "text-purple-400" },
  amber:  { badge: "bg-amber-400/10 text-amber-400",   total: "text-amber-400"  },
  yellow: { badge: "bg-yellow-400/10 text-yellow-400", total: "text-yellow-400" },
};

function ResumenTipoCard({ tipo, label, color, data }: {
  tipo:  string;
  label: string;
  color: string;
  data:  { num_docs: number; total: number; desglose_iva: any[] };
}) {
  const c = COLOR_MAP[color] ?? COLOR_MAP.indigo;
  return (
    <div className="bg-gray-950/60 border border-gray-800 rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className={clsx("text-[10px] px-2 py-0.5 rounded-full font-bold", c.badge)}>
            {tipo}
          </span>
          <h3 className="text-xs font-semibold text-white">{label}</h3>
        </div>
        <span className="text-[10px] text-gray-500">{data.num_docs} docs</span>
      </div>
      <div className="space-y-1.5">
        {data.desglose_iva.length === 0 ? (
          <p className="text-xs text-gray-600">Sin desglose disponible</p>
        ) : (
          data.desglose_iva.map((imp, i) => (
            <div key={i} className="space-y-0.5">
              <div className="flex justify-between text-xs text-gray-400">
                <span>Subtotal {imp.tarifa}%</span>
                <span>${fmt(imp.subtotal)}</span>
              </div>
              {imp.iva > 0 && (
                <div className="flex justify-between text-xs text-gray-600 pl-3">
                  <span>IVA {imp.tarifa}%</span>
                  <span>${fmt(imp.iva)}</span>
                </div>
              )}
            </div>
          ))
        )}
        <div className="flex justify-between font-bold text-xs pt-2 border-t border-gray-800/60 mt-2">
          <span className="text-gray-400">Total</span>
          <span className={c.total}>${fmt(data.total)}</span>
        </div>
      </div>
    </div>
  );
}

// ── Página ─────────────────────────────────────────────────────────────────────
export default function HistorialPage() {
  const [documentos,   setDocumentos]   = useState<Documento[]>([]);
  const [resumen,      setResumen]      = useState<any>(null);
  const [loading,      setLoading]      = useState(true);
  const [resumenOpen,  setResumenOpen]  = useState(false);
  const [query,        setQuery]        = useState("");
  const [filtroEstado, setFiltroEstado] = useState("TODOS");
  const [filtroTipo,   setFiltroTipo]   = useState("TODOS");
  const { activo: sandboxGlobal } = useSandboxStore();
  const [sandbox,      setSandbox]      = useState(sandboxGlobal);

  const hoy = new Date().toISOString().split("T")[0];
  const [fechaInicio, setFechaInicio] = useState(hoy);
  const [fechaFin,    setFechaFin]    = useState(hoy);

  useEffect(() => {
      setSandbox(sandboxGlobal);
  }, [sandboxGlobal]);

  const diasRango = fechaInicio && fechaFin
    ? Math.ceil((new Date(fechaFin).getTime() - new Date(fechaInicio).getTime()) / (1000 * 60 * 60 * 24))
    : 0;

  const cargar = useCallback(async () => {
    if (diasRango > 45) return;
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (fechaInicio) params.append("fecha_inicio", fechaInicio);
      if (fechaFin)    params.append("fecha_fin",    fechaFin);
      if (sandbox)     params.append("sandbox",      "true");
      
      const res = await api.get(`/api/v1/app/documentos?${params.toString()}`);
      setDocumentos(res.data.data ?? []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [fechaInicio, fechaFin, diasRango, sandbox]);

  const cargarResumen = useCallback(async () => {
    if (diasRango > 45) return;
    try {
      const params = new URLSearchParams();
      if (fechaInicio) params.append("fecha_inicio", fechaInicio);
      if (fechaFin)    params.append("fecha_fin",    fechaFin);
      
      const res = await api.get(`/api/v1/app/documentos/resumen?${params.toString()}`);
      setResumen(res.data.data);
    } catch (e) { console.error(e); }
  }, [fechaInicio, fechaFin, diasRango]);

  useEffect(() => {
    cargar();
    cargarResumen();
  }, [cargar, cargarResumen]);

  const filtrados = documentos.filter((d) => {
    const matchEstado = filtroEstado === "TODOS" || d.estado_sri === filtroEstado;
    const matchTipo   = filtroTipo   === "TODOS" || d.tipo_doc   === filtroTipo;
    const matchQuery  = !query ||
      d.razon_social?.toLowerCase().includes(query.toLowerCase()) ||
      d.identificacion?.includes(query) ||
      d.numero_doc?.includes(query);
    return matchEstado && matchTipo && matchQuery;
  });

  const tieneResumen = resumen && (
    Object.keys(resumen.por_tipo ?? {}).length > 0 ||
    (resumen.retenciones?.num_docs ?? 0) > 0
  );

  return (
    <div className="p-4 md:p-6 space-y-4">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Comprobantes Emitidos</h1>
          <p className="text-sm text-gray-500">{documentos.length} comprobantes encontrados</p>
        </div>
        <div className="flex items-center gap-2">
          {/* Toggle Sandbox */}
          <button
            onClick={() => setSandbox(!sandbox)}
            className={clsx(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border",
              sandbox
                ? "bg-cyan-500/20 text-cyan-400 border-cyan-500/30"
                : "bg-gray-900 text-gray-400 border-gray-800 hover:text-white"
            )}
          >
            <FlaskConical size={14} />
            {sandbox ? "Sandbox" : "Producción"}
          </button>

          <button
            onClick={() => { cargar(); cargarResumen(); }}
            disabled={diasRango > 45}
            className="p-2 rounded-lg border border-gray-800 bg-gray-900 text-gray-400 hover:text-white transition-colors disabled:opacity-40"
          >
            <RefreshCw size={16} />
          </button>
          <Link href="/documentos/emitir/fac"
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium transition-colors">
            <Plus size={15} /> Nueva
          </Link>
        </div>
      </div>

      {/* Fechas */}
      <div className="flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Buscar por cliente, RUC o número..."
            className="w-full pl-9 pr-4 py-2.5 rounded-lg bg-gray-900 border border-gray-800 text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500 text-sm"
          />
        </div>
        <div className="flex gap-2 items-center shrink-0">
          <input type="date" value={fechaInicio} onChange={e => setFechaInicio(e.target.value)}
            className="px-3 py-2 rounded-lg bg-gray-900 border border-gray-800 text-white text-sm focus:outline-none focus:border-indigo-500" />
          <span className="text-gray-600 text-xs">—</span>
          <input type="date" value={fechaFin} onChange={e => setFechaFin(e.target.value)}
            className="px-3 py-2 rounded-lg bg-gray-900 border border-gray-800 text-white text-sm focus:outline-none focus:border-indigo-500" />
        </div>
      </div>
      {diasRango > 45 && (
        <p className="text-xs text-amber-400 font-medium">El rango máximo es de 45 días.</p>
      )}

      {/* ── RESUMEN FISCAL COLAPSABLE ────────────────────────────────────── */}
      {!sandbox && tieneResumen && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          {/* Header colapsable */}
          <button
            onClick={() => setResumenOpen(!resumenOpen)}
            className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-800/50 transition-colors"
          >
            <div className="flex items-center gap-2">
              <TrendingUp size={15} className="text-indigo-400" />
              <span className="text-sm font-semibold text-white">Resumen fiscal</span>
              <span className="text-xs text-gray-500">
                {resumen.periodo?.desde} → {resumen.periodo?.hasta}
              </span>
            </div>
            <div className="flex items-center gap-3">
              {/* Totales rápidos siempre visibles */}
              {resumen.por_tipo?.FAC && (
                <span className="text-xs text-gray-400 hidden sm:block">
                  FAC <span className="text-white font-medium">${fmt(resumen.por_tipo.FAC.total)}</span>
                </span>
              )}
              {resumen.retenciones?.num_docs > 0 && (
                <span className="text-xs text-gray-400 hidden sm:block">
                  RET <span className="text-yellow-400 font-medium">${fmt(resumen.retenciones.total)}</span>
                </span>
              )}
              {resumenOpen
                ? <ChevronUp size={16} className="text-gray-500" />
                : <ChevronDown size={16} className="text-gray-500" />
              }
            </div>
          </button>

          {/* Contenido expandido */}
          {resumenOpen && (
            <div className="px-4 pb-4 space-y-3 border-t border-gray-800">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3 pt-3">

                {/* FAC */}
                {resumen.por_tipo?.FAC && (
                  <ResumenTipoCard
                    tipo="FAC" label="Facturas Emitidas"
                    color="indigo" data={resumen.por_tipo.FAC}
                  />
                )}

                {/* LIQ */}
                {resumen.por_tipo?.LIQ && (
                  <ResumenTipoCard
                    tipo="LIQ" label="Liquidaciones de Compra"
                    color="cyan" data={resumen.por_tipo.LIQ}
                  />
                )}

                {/* NCR */}
                {resumen.por_tipo?.NCR && (
                  <ResumenTipoCard
                    tipo="NCR" label="Notas de Crédito"
                    color="purple" data={resumen.por_tipo.NCR}
                  />
                )}

                {/* NDB */}
                {resumen.por_tipo?.NDB && (
                  <ResumenTipoCard
                    tipo="NDB" label="Notas de Débito"
                    color="amber" data={resumen.por_tipo.NDB}
                  />
                )}

                {/* RET */}
                {resumen.retenciones?.num_docs > 0 && (
                  <div className="bg-gray-950/60 border border-gray-800 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-yellow-400/10 text-yellow-400">
                          RET
                        </span>
                        <h3 className="text-xs font-semibold text-white">Retenciones Emitidas</h3>
                      </div>
                      <span className="text-[10px] text-gray-500">
                        {resumen.retenciones.num_docs} docs
                      </span>
                    </div>
                    <div className="space-y-1.5">
                      {Object.entries(resumen.retenciones.por_tipo).map(([tipo, data]: [string, any]) => (
                        <div key={tipo} className="space-y-0.5">
                          <div className="flex justify-between text-xs text-gray-400">
                            <span>Retención {tipo}</span>
                            <span className="text-white">${fmt(data.valor_retenido)}</span>
                          </div>
                          <div className="flex justify-between text-xs text-gray-600 pl-3">
                            <span>Base imponible</span>
                            <span>${fmt(data.base)}</span>
                          </div>
                        </div>
                      ))}
                      <div className="flex justify-between font-bold text-xs pt-2 border-t border-gray-800/60 mt-2">
                        <span className="text-gray-400">Total retenido</span>
                        <span className="text-yellow-400">${fmt(resumen.retenciones.total)}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Filtros por estado y tipo */}
      <div className="space-y-2">
        <div className="flex gap-2 flex-wrap">
          {["TODOS", "AUTORIZADO", "RECIBIDA", "DEVUELTA", "RECHAZADO"].map(estado => (
            <button key={estado} onClick={() => setFiltroEstado(estado)}
              className={clsx(
                "px-3 py-1.5 rounded-lg text-xs font-medium transition-colors",
                filtroEstado === estado
                  ? "bg-indigo-600 text-white"
                  : "bg-gray-900 border border-gray-800 text-gray-400 hover:text-white"
              )}>
              {estado === "TODOS" ? "Todos" : ESTADO_CONFIG[estado]?.label ?? estado}
            </button>
          ))}
        </div>
        <div className="flex gap-2 flex-wrap">
          {["TODOS", "FAC", "NCR", "NDB", "RET", "LIQ"].map(tipo => (
            <button key={tipo} onClick={() => setFiltroTipo(tipo)}
              className={clsx(
                "px-3 py-1.5 rounded-lg text-xs font-medium transition-colors",
                filtroTipo === tipo
                  ? "bg-indigo-600 text-white"
                  : "bg-gray-900 border border-gray-800 text-gray-400 hover:text-white"
              )}>
              {tipo === "TODOS" ? "Todos los tipos" : TIPO_COMPROBANTE[tipo]?.label ?? tipo}
            </button>
          ))}
        </div>
      </div>

      {/* Lista */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={24} className="animate-spin text-indigo-400" />
        </div>
      ) : filtrados.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <FileText size={40} className="text-gray-700 mb-3" />
          <p className="text-gray-500 text-sm">
            {query || filtroEstado !== "TODOS" || filtroTipo !== "TODOS"
              ? "No hay comprobantes que coincidan."
              : `Sin comprobantes de ${sandbox ? "prueba (Sandbox)" : "producción"} en este rango.`}
          </p>
          {!query && filtroEstado === "TODOS" && (
            <Link href="/documentos/emitir/fac"
              className="mt-4 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium transition-colors">
              Emitir primer comprobante
            </Link>
          )}
        </div>
      ) : (
        <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
          {/* Desktop */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800 text-xs text-gray-500">
                  <th className="text-left px-4 py-3 font-medium">Número</th>
                  <th className="text-left px-4 py-3 font-medium">Tipo</th>
                  <th className="text-left px-4 py-3 font-medium">Cliente</th>
                  <th className="text-left px-4 py-3 font-medium">Fecha</th>
                  <th className="text-left px-4 py-3 font-medium">Estado</th>
                  <th className="text-left px-4 py-3 font-medium">Cobro</th>
                  <th className="text-right px-4 py-3 font-medium">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {filtrados.map((d) => {
                  const estado = ESTADO_CONFIG[d.estado_sri] ?? ESTADO_CONFIG.PENDIENTE;
                  const tipo   = TIPO_COMPROBANTE[d.tipo_doc] ?? TIPO_COMPROBANTE.FAC;
                  const cobro  = d.estado_cobro ? COBRO_CONFIG[d.estado_cobro] : null;
                  const Icon   = estado.icon;
                  return (
                    <tr key={d.id} className="hover:bg-gray-800/50 transition-colors">
                      <td className="px-4 py-3">
                        <Link href={`/documentos/${d.id}`}
                          className="font-mono text-xs text-indigo-400 hover:text-indigo-300 hover:underline underline-offset-2">
                          {d.numero_doc ?? "—"}
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        <span className={clsx("inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium", tipo.color)}>
                          {tipo.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-white font-medium truncate max-w-[160px]">{d.razon_social}</p>
                        <p className="text-xs text-gray-500">{d.identificacion}</p>
                      </td>
                      <td className="px-4 py-3 text-gray-400 text-xs">{d.fecha_emision}</td>
                      <td className="px-4 py-3">
                        <span className={clsx("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium", estado.color)}>
                          <Icon size={11} />
                          {estado.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {cobro && ["FAC", "LIQ"].includes(d.tipo_doc) && (
                          <span className={clsx("text-xs font-medium", cobro.color)}>
                            {cobro.label}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-white">
                        ${fmt(d.importe_total)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {/* Móvil */}
          <div className="md:hidden divide-y divide-gray-800">
            {filtrados.map((d) => {
              const estado = ESTADO_CONFIG[d.estado_sri] ?? ESTADO_CONFIG.PENDIENTE;
              const tipo   = TIPO_COMPROBANTE[d.tipo_doc] ?? TIPO_COMPROBANTE.FAC;
              const Icon   = estado.icon;
              return (
                <div key={d.id} className="px-4 py-3 space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <Link href={`/documentos/${d.id}`}
                      className="font-mono text-xs text-indigo-400 hover:text-indigo-300">
                      {d.numero_doc ?? "—"}
                    </Link>
                    <div className="flex items-center gap-1.5">
                      <span className={clsx("px-1.5 py-0.5 rounded text-[10px] font-medium", tipo.color)}>
                        {tipo.label}
                      </span>
                      <span className={clsx("inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium", estado.color)}>
                        <Icon size={10} />
                        {estado.label}
                      </span>
                    </div>
                  </div>
                  <p className="text-sm font-medium text-white">{d.razon_social}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">{d.fecha_emision}</span>
                    <span className="text-sm font-bold text-white">${fmt(d.importe_total)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}