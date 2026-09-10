"use client";
import { useState, useEffect, useCallback } from "react";
import { useSandboxStore } from "@/store/sandbox.store";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { usePermiso } from "@/hooks/usePermiso";
import SinAcceso from "@/components/SinAcceso";
import api from "@/lib/api";
import {
  Search, Plus, FileText, CheckCircle2, Clock,
  XCircle, AlertTriangle, RefreshCw, ChevronDown, ChevronUp,
  TrendingUp, FlaskConical, Ban  
} from "lucide-react";

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
const ESTADO_CONFIG: Record<string, { label: string; color: string; bg: string; icon: any }> = {
  AUTORIZADO: { label: "Autorizado", color: "var(--kipu-success)", bg: "color-mix(in srgb, var(--kipu-success) 10%, transparent)", icon: CheckCircle2 },
  RECIBIDA:   { label: "En proceso", color: "#818cf8", bg: "color-mix(in srgb, #818cf8 10%, transparent)", icon: Clock },
  FIRMADO:    { label: "En cola",    color: "#60a5fa", bg: "color-mix(in srgb, #60a5fa 10%, transparent)", icon: Clock },
  DEVUELTA:   { label: "Devuelto",   color: "var(--kipu-warning)", bg: "color-mix(in srgb, var(--kipu-warning) 10%, transparent)", icon: AlertTriangle },
  RECHAZADO:  { label: "Rechazado",  color: "var(--kipu-danger)", bg: "color-mix(in srgb, var(--kipu-danger) 10%, transparent)", icon: XCircle },
  ANULADO:    { label: "Anulado",    color: "var(--kipu-muted)", bg: "color-mix(in srgb, var(--kipu-muted) 10%, transparent)", icon: Ban },
  PENDIENTE:  { label: "Pendiente",  color: "var(--kipu-subtle)", bg: "color-mix(in srgb, var(--kipu-subtle) 10%, transparent)", icon: Clock },
  SANDBOX:    { label: "Prueba",     color: "#22d3ee", bg: "color-mix(in srgb, #22d3ee 10%, transparent)", icon: FlaskConical },
};

const TIPO_COMPROBANTE: Record<string, { label: string; color: string; bg: string }> = {
  FAC: { label: "Factura",          color: "var(--kipu-muted)", bg: "color-mix(in srgb, var(--kipu-muted) 10%, transparent)" },
  NCR: { label: "Nota de Crédito",  color: "#c084fc", bg: "color-mix(in srgb, #c084fc 10%, transparent)" },
  NDB: { label: "Nota de Débito",   color: "#fb923c", bg: "color-mix(in srgb, #fb923c 10%, transparent)" },
  RET: { label: "Retención",        color: "#facc15", bg: "color-mix(in srgb, #facc15 10%, transparent)" },
  LIQ: { label: "Liquidación",      color: "#22d3ee", bg: "color-mix(in srgb, #22d3ee 10%, transparent)" },
};

const COBRO_CONFIG: Record<string, { label: string; color: string }> = {
  PENDIENTE: { label: "Por cobrar", color: "var(--kipu-warning)" },
  PAGADO:    { label: "Cobrado",    color: "var(--kipu-success)" },
  PARCIAL:   { label: "Parcial",    color: "#60a5fa" },
  ANULADO:   { label: "Anulado",    color: "var(--kipu-danger)" },
};

const fmt = (n: any) => parseFloat(n ?? 0).toFixed(2);

// ── Storage helpers ────────────────────────────────────────────────────────────
const SS_KEY_INICIO = "kipu_emitidos_fecha_inicio";
const SS_KEY_FIN    = "kipu_emitidos_fecha_fin";

function getHoy() {
  return new Date().toLocaleDateString("en-CA", { timeZone: "America/Guayaquil" });
}
function leerFecha(key: string): string {
  try { return sessionStorage.getItem(key) || getHoy(); }
  catch { return getHoy(); }
}
function guardarFecha(key: string, val: string) {
  try { sessionStorage.setItem(key, val); } catch {}
}

// ── Componente ResumenTipoCard ─────────────────────────────────────────────────
const COLOR_MAP: Record<string, { color: string; bg: string }> = {
  indigo: { color: "#818cf8", bg: "color-mix(in srgb, #818cf8 10%, transparent)" },
  cyan:   { color: "#22d3ee", bg: "color-mix(in srgb, #22d3ee 10%, transparent)" },
  purple: { color: "#c084fc", bg: "color-mix(in srgb, #c084fc 10%, transparent)" },
  amber:  { color: "#fb923c", bg: "color-mix(in srgb, #fb923c 10%, transparent)" },
  yellow: { color: "#facc15", bg: "color-mix(in srgb, #facc15 10%, transparent)" },
};

function ResumenTipoCard({ tipo, label, color, data }: {
  tipo:  string;
  label: string;
  color: string;
  data:  { num_docs: number; total: number; desglose_iva: any[] };
}) {
  const c = COLOR_MAP[color] ?? COLOR_MAP.indigo;
  return (
    <div
      className="rounded-xl p-4"
      style={{
        background: "color-mix(in srgb, var(--kipu-surface) 60%, transparent)",
        border: "1px solid var(--kipu-border)",
      }}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span
            className="text-[10px] px-2 py-0.5 rounded-full font-bold"
            style={{ color: c.color, background: c.bg }}
          >
            {tipo}
          </span>
          <h3 className="text-xs font-semibold" style={{ color: "var(--kipu-text)" }}>{label}</h3>
        </div>
        <span className="text-[10px]" style={{ color: "var(--kipu-subtle)" }}>{data.num_docs} docs</span>
      </div>
      <div className="space-y-1.5">
        {data.desglose_iva.length === 0 ? (
          <p className="text-xs" style={{ color: "var(--kipu-subtle)" }}>Sin desglose disponible</p>
        ) : (
          data.desglose_iva.map((imp, i) => (
            <div key={i} className="space-y-0.5">
              <div className="flex justify-between text-xs" style={{ color: "var(--kipu-muted)" }}>
                <span>Subtotal {imp.tarifa}%</span>
                <span>${fmt(imp.subtotal)}</span>
              </div>
              {imp.iva > 0 && (
                <div className="flex justify-between text-xs pl-3" style={{ color: "var(--kipu-subtle)" }}>
                  <span>IVA {imp.tarifa}%</span>
                  <span>${fmt(imp.iva)}</span>
                </div>
              )}
            </div>
          ))
        )}
        <div
          className="flex justify-between font-bold text-xs pt-2 mt-2"
          style={{ borderTop: "1px solid var(--kipu-border)" }}
        >
          <span style={{ color: "var(--kipu-muted)" }}>Total</span>
          <span style={{ color: c.color }}>${fmt(data.total)}</span>
        </div>
      </div>
    </div>
  );
}

// ── Página ─────────────────────────────────────────────────────────────────────
export default function HistorialPage() {
  const puedeVer = usePermiso("descargar");
  if (!puedeVer) return <SinAcceso />;
  const searchParams = useSearchParams();
  const [documentos,   setDocumentos]   = useState<Documento[]>([]);
  const [resumen,      setResumen]      = useState<any>(null);
  const [loading,      setLoading]      = useState(true);
  const [resumenOpen,  setResumenOpen]  = useState(false);
  const [query,        setQuery]        = useState("");
  const [filtroEstado, setFiltroEstado] = useState("TODOS");
  const [filtroTipo,   setFiltroTipo]   = useState("TODOS");

  const { activo: sandboxGlobal } = useSandboxStore();
  const [sandbox, setSandbox] = useState(sandboxGlobal);

  const [fechaInicio, setFechaInicio] = useState<string>(() => {
    const fromUrl = searchParams.get("fecha_inicio");
    if (fromUrl) {
      guardarFecha(SS_KEY_INICIO, fromUrl);
      return fromUrl;
    }
    return leerFecha(SS_KEY_INICIO);
  });
  const [fechaFin, setFechaFin] = useState<string>(() => {
    const fromUrl = searchParams.get("fecha_fin");
    if (fromUrl) {
      guardarFecha(SS_KEY_FIN, fromUrl);
      return fromUrl;
    }
    return leerFecha(SS_KEY_FIN);
  });

  useEffect(() => { guardarFecha(SS_KEY_INICIO, fechaInicio); }, [fechaInicio]);
  useEffect(() => { guardarFecha(SS_KEY_FIN,    fechaFin);    }, [fechaFin]);

  useEffect(() => { setSandbox(sandboxGlobal); }, [sandboxGlobal]);

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
          <h1 className="text-xl font-bold" style={{ color: "var(--kipu-text)" }}>Comprobantes Emitidos</h1>
          <p className="text-sm" style={{ color: "var(--kipu-subtle)" }}>{documentos.length} comprobantes encontrados</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSandbox(!sandbox)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
            style={{
              background: sandbox
                ? "color-mix(in srgb, #22d3ee 20%, transparent)"
                : "var(--kipu-surface)",
              color: sandbox ? "#22d3ee" : "var(--kipu-muted)",
              border: sandbox
                ? "1px solid color-mix(in srgb, #22d3ee 30%, transparent)"
                : "1px solid var(--kipu-border)",
            }}
            onMouseEnter={e => {
              if (!sandbox) e.currentTarget.style.color = "var(--kipu-text)";
            }}
            onMouseLeave={e => {
              if (!sandbox) e.currentTarget.style.color = "var(--kipu-muted)";
            }}
          >
            <FlaskConical size={14} />
            {sandbox ? "Sandbox" : "Producción"}
          </button>
          <button
            onClick={() => { cargar(); cargarResumen(); }}
            disabled={diasRango > 45}
            className="p-2 rounded-lg transition-colors disabled:opacity-40"
            style={{
              background: "var(--kipu-surface)",
              border: "1px solid var(--kipu-border)",
              color: "var(--kipu-muted)",
            }}
            onMouseEnter={e => e.currentTarget.style.color = "var(--kipu-text)"}
            onMouseLeave={e => e.currentTarget.style.color = "var(--kipu-muted)"}
          >
            <RefreshCw size={16} />
          </button>
          <Link
            href="/documentos/emitir/fac"
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-medium transition-colors"
            style={{ background: "var(--kipu-accent)" }}
            onMouseEnter={e => e.currentTarget.style.background = "var(--kipu-accent-h)"}
            onMouseLeave={e => e.currentTarget.style.background = "var(--kipu-accent)"}
          >
            <Plus size={15} /> Nueva
          </Link>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--kipu-subtle)" }} />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Buscar por cliente, RUC o número..."
            className="w-full pl-9 pr-4 py-2.5 rounded-lg text-sm transition-colors focus:outline-none"
            style={{
              background: "var(--kipu-surface)",
              border: "1px solid var(--kipu-border)",
              color: "var(--kipu-text)",
            }}
            onFocus={e => e.currentTarget.style.borderColor = "var(--kipu-accent)"}
            onBlur={e => e.currentTarget.style.borderColor = "var(--kipu-border)"}
          />
        </div>
        <div className="flex gap-2 items-center shrink-0">
          <input
            type="date"
            value={fechaInicio}
            onChange={e => setFechaInicio(e.target.value)}
            className="px-3 py-2 rounded-lg text-sm focus:outline-none transition-colors"
            style={{
              background: "var(--kipu-surface)",
              border: "1px solid var(--kipu-border)",
              color: "var(--kipu-text)",
            }}
            onFocus={e => e.currentTarget.style.borderColor = "var(--kipu-accent)"}
            onBlur={e => e.currentTarget.style.borderColor = "var(--kipu-border)"}
          />
          <span className="text-xs" style={{ color: "var(--kipu-subtle)" }}>—</span>
          <input
            type="date"
            value={fechaFin}
            onChange={e => setFechaFin(e.target.value)}
            className="px-3 py-2 rounded-lg text-sm focus:outline-none transition-colors"
            style={{
              background: "var(--kipu-surface)",
              border: "1px solid var(--kipu-border)",
              color: "var(--kipu-text)",
            }}
            onFocus={e => e.currentTarget.style.borderColor = "var(--kipu-accent)"}
            onBlur={e => e.currentTarget.style.borderColor = "var(--kipu-border)"}
          />
        </div>
      </div>

      {diasRango > 45 && (
        <p className="text-xs font-medium" style={{ color: "var(--kipu-warning)" }}>El rango máximo es de 45 días.</p>
      )}

      {/* Resumen fiscal */}
      {!sandbox && tieneResumen && (
        <div
          className="rounded-xl overflow-hidden"
          style={{
            background: "var(--kipu-surface)",
            border: "1px solid var(--kipu-border)",
          }}
        >
          <button
            onClick={() => setResumenOpen(!resumenOpen)}
            className="w-full flex items-center justify-between px-4 py-3 transition-colors"
            onMouseEnter={e => e.currentTarget.style.background = "color-mix(in srgb, var(--kipu-text) 4%, transparent)"}
            onMouseLeave={e => e.currentTarget.style.background = "transparent"}
          >
            <div className="flex items-center gap-2">
              <TrendingUp size={15} style={{ color: "var(--kipu-accent)" }} />
              <span className="text-sm font-semibold" style={{ color: "var(--kipu-text)" }}>Resumen fiscal</span>
              <span className="text-xs" style={{ color: "var(--kipu-subtle)" }}>
                {resumen.periodo?.desde} → {resumen.periodo?.hasta}
              </span>
            </div>
            <div className="flex items-center gap-3">
              {resumen.por_tipo?.FAC && (
                <span className="text-xs hidden sm:block" style={{ color: "var(--kipu-muted)" }}>
                  FAC <span className="font-medium" style={{ color: "var(--kipu-text)" }}>${fmt(resumen.por_tipo.FAC.total)}</span>
                </span>
              )}
              {resumen.retenciones?.num_docs > 0 && (
                <span className="text-xs hidden sm:block" style={{ color: "var(--kipu-muted)" }}>
                  RET <span className="font-medium" style={{ color: "var(--kipu-warning)" }}>${fmt(resumen.retenciones.total)}</span>
                </span>
              )}
              {resumenOpen
                ? <ChevronUp size={16} style={{ color: "var(--kipu-subtle)" }} />
                : <ChevronDown size={16} style={{ color: "var(--kipu-subtle)" }} />
              }
            </div>
          </button>
          {resumenOpen && (
            <div
              className="px-4 pb-4 space-y-3"
              style={{ borderTop: "2px solid var(--kipu-border)" }}
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3 pt-3">
                {resumen.por_tipo?.FAC && (
                  <ResumenTipoCard tipo="FAC" label="Facturas Emitidas"        color="indigo" data={resumen.por_tipo.FAC} />
                )}
                {resumen.por_tipo?.LIQ && (
                  <ResumenTipoCard tipo="LIQ" label="Liquidaciones de Compra" color="cyan"   data={resumen.por_tipo.LIQ} />
                )}
                {resumen.por_tipo?.NCR && (
                  <ResumenTipoCard tipo="NCR" label="Notas de Crédito"         color="purple" data={resumen.por_tipo.NCR} />
                )}
                {resumen.por_tipo?.NDB && (
                  <ResumenTipoCard tipo="NDB" label="Notas de Débito"          color="amber"  data={resumen.por_tipo.NDB} />
                )}
                {resumen.retenciones?.num_docs > 0 && (
                  <div
                    className="rounded-xl p-4"
                    style={{
                      background: "color-mix(in srgb, var(--kipu-surface) 60%, transparent)",
                      border: "1px solid var(--kipu-border)",
                    }}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span
                          className="text-[10px] px-2 py-0.5 rounded-full font-bold"
                          style={{
                            color: "#facc15",
                            background: "color-mix(in srgb, #facc15 10%, transparent)",
                          }}
                        >
                          RET
                        </span>
                        <h3 className="text-xs font-semibold" style={{ color: "var(--kipu-text)" }}>Retenciones Emitidas</h3>
                      </div>
                      <span className="text-[10px]" style={{ color: "var(--kipu-subtle)" }}>{resumen.retenciones.num_docs} docs</span>
                    </div>
                    <div className="space-y-1.5">
                      {Object.entries(resumen.retenciones.por_tipo).map(([tipo, data]: [string, any]) => (
                        <div key={tipo} className="space-y-0.5">
                          <div className="flex justify-between text-xs" style={{ color: "var(--kipu-muted)" }}>
                            <span>Retención {tipo}</span>
                            <span style={{ color: "var(--kipu-text)" }}>${fmt(data.valor_retenido)}</span>
                          </div>
                          <div className="flex justify-between text-xs pl-3" style={{ color: "var(--kipu-subtle)" }}>
                            <span>Base imponible</span>
                            <span>${fmt(data.base)}</span>
                          </div>
                        </div>
                      ))}
                      <div
                        className="flex justify-between font-bold text-xs pt-2 mt-2"
                        style={{ borderTop: "1px solid var(--kipu-border)" }}
                      >
                        <span style={{ color: "var(--kipu-muted)" }}>Total retenido</span>
                        <span style={{ color: "var(--kipu-warning)" }}>${fmt(resumen.retenciones.total)}</span>
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
          {["TODOS", "AUTORIZADO", "RECIBIDA", "DEVUELTA", "RECHAZADO", "ANULADO"].map(estado => {
            const isSelected = filtroEstado === estado;
            return (
              <button
                key={estado}
                onClick={() => setFiltroEstado(estado)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
                style={{
                  background: isSelected ? "var(--kipu-accent)" : "var(--kipu-surface)",
                  color: isSelected ? "#FFFFFF" : "var(--kipu-muted)",
                  border: isSelected ? "1px solid var(--kipu-accent)" : "1px solid var(--kipu-border)",
                }}
                onMouseEnter={e => {
                  if (!isSelected) {
                    e.currentTarget.style.color = "var(--kipu-text)";
                  }
                }}
                onMouseLeave={e => {
                  if (!isSelected) {
                    e.currentTarget.style.color = "var(--kipu-muted)";
                  }
                }}
              >
                {estado === "TODOS" ? "Todos" : ESTADO_CONFIG[estado]?.label ?? estado}
              </button>
            );
          })}
        </div>
        <div className="flex gap-2 flex-wrap">
          {["TODOS", "FAC", "NCR", "NDB", "RET", "LIQ"].map(tipo => {
            const isSelected = filtroTipo === tipo;
            return (
              <button
                key={tipo}
                onClick={() => setFiltroTipo(tipo)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
                style={{
                  background: isSelected ? "var(--kipu-accent)" : "var(--kipu-surface)",
                  color: isSelected ? "#FFFFFF" : "var(--kipu-muted)",
                  border: isSelected ? "1px solid var(--kipu-accent)" : "1px solid var(--kipu-border)",
                }}
                onMouseEnter={e => {
                  if (!isSelected) {
                    e.currentTarget.style.color = "var(--kipu-text)";
                  }
                }}
                onMouseLeave={e => {
                  if (!isSelected) {
                    e.currentTarget.style.color = "var(--kipu-muted)";
                  }
                }}
              >
                {tipo === "TODOS" ? "Todos los tipos" : TIPO_COMPROBANTE[tipo]?.label ?? tipo}
              </button>
            );
          })}
        </div>
      </div>

      {/* Lista */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div
            className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin"
            style={{ borderColor: "var(--kipu-accent)", borderTopColor: "transparent" }}
          />
        </div>
      ) : filtrados.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <FileText size={40} className="mb-3" style={{ color: "var(--kipu-subtle)" }} />
          <p className="text-sm" style={{ color: "var(--kipu-muted)" }}>
            {query || filtroEstado !== "TODOS" || filtroTipo !== "TODOS"
              ? "No hay comprobantes que coincidan."
              : `Sin comprobantes de ${sandbox ? "prueba (Sandbox)" : "producción"} en este rango.`}
          </p>
          {!query && filtroEstado === "TODOS" && (
            <Link
              href="/documentos/emitir/fac"
              className="mt-4 px-4 py-2 rounded-lg text-white text-sm font-medium transition-colors"
              style={{ background: "var(--kipu-accent)" }}
              onMouseEnter={e => e.currentTarget.style.background = "var(--kipu-accent-h)"}
              onMouseLeave={e => e.currentTarget.style.background = "var(--kipu-accent)"}
            >
              Emitir primer comprobante
            </Link>
          )}
        </div>
      ) : (
        <div
          className="rounded-xl overflow-hidden"
          style={{
            background: "var(--kipu-surface)",
            border: "1px solid var(--kipu-border)",
          }}
        >
          {/* Desktop */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr
                  className="text-xs"
                  style={{
                    color: "var(--kipu-subtle)",
                    borderBottom: "2px solid var(--kipu-border)",
                  }}
                >
                  <th className="text-left px-4 py-3 font-medium">Número</th>
                  <th className="text-left px-4 py-3 font-medium">Tipo</th>
                  <th className="text-left px-4 py-3 font-medium">Cliente</th>
                  <th className="text-left px-4 py-3 font-medium">Fecha</th>
                  <th className="text-left px-4 py-3 font-medium">Estado</th>
                  <th className="text-left px-4 py-3 font-medium">Cobro</th>
                  <th className="text-right px-4 py-3 font-medium">Total</th>
                </tr>
              </thead>
              <tbody>
                {filtrados.map((d, index) => {
                  const estado = ESTADO_CONFIG[d.estado_sri] ?? ESTADO_CONFIG.PENDIENTE;
                  const tipo   = TIPO_COMPROBANTE[d.tipo_doc] ?? TIPO_COMPROBANTE.FAC;
                  const cobro  = d.estado_cobro ? COBRO_CONFIG[d.estado_cobro] : null;
                  const Icon   = estado.icon;
                  return (
                    <tr
                      key={d.id}
                      className="transition-colors"
                      style={{
                        borderTop: index > 0 ? "1px solid var(--kipu-border)" : "none",
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = "color-mix(in srgb, var(--kipu-text) 4%, transparent)"}
                      onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                    >
                      <td className="px-4 py-3">
                        <Link
                          href={`/documentos/${d.id}`}
                          className="font-mono text-xs transition-colors hover:underline underline-offset-2"
                          style={{ color: "var(--kipu-accent)" }}
                          onMouseEnter={e => e.currentTarget.style.color = "var(--kipu-accent-h)"}
                          onMouseLeave={e => e.currentTarget.style.color = "var(--kipu-accent)"}
                        >
                          {d.numero_doc ?? "—"}
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
                          style={{ color: tipo.color, background: tipo.bg }}
                        >
                          {tipo.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium truncate max-w-[160px]" style={{ color: "var(--kipu-text)" }}>{d.razon_social}</p>
                        <p className="text-xs" style={{ color: "var(--kipu-subtle)" }}>{d.identificacion}</p>
                      </td>
                      <td className="px-4 py-3 text-xs" style={{ color: "var(--kipu-muted)" }}>{d.fecha_emision}</td>
                      <td className="px-4 py-3">
                        <span
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium"
                          style={{ color: estado.color, background: estado.bg }}
                        >
                          <Icon size={11} />
                          {estado.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {cobro && ["FAC", "LIQ"].includes(d.tipo_doc) && (
                          <span className="text-xs font-medium" style={{ color: cobro.color }}>
                            {cobro.label}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold" style={{ color: "var(--kipu-text)" }}>
                        ${fmt(d.importe_total)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {/* Móvil */}
          <div className="md:hidden">
            {filtrados.map((d, index) => {
              const estado = ESTADO_CONFIG[d.estado_sri] ?? ESTADO_CONFIG.PENDIENTE;
              const tipo   = TIPO_COMPROBANTE[d.tipo_doc] ?? TIPO_COMPROBANTE.FAC;
              const Icon   = estado.icon;
              return (
                <div
                  key={d.id}
                  className="px-4 py-3 space-y-1.5"
                  style={{
                    borderTop: index > 0 ? "1px solid var(--kipu-border)" : "none",
                  }}
                >
                  <div className="flex items-center justify-between gap-2">
                    <Link
                      href={`/documentos/${d.id}`}
                      className="font-mono text-xs transition-colors"
                      style={{ color: "var(--kipu-accent)" }}
                      onMouseEnter={e => e.currentTarget.style.color = "var(--kipu-accent-h)"}
                      onMouseLeave={e => e.currentTarget.style.color = "var(--kipu-accent)"}
                    >
                      {d.numero_doc ?? "—"}
                    </Link>
                    <div className="flex items-center gap-1.5">
                      <span
                        className="px-1.5 py-0.5 rounded text-[10px] font-medium"
                        style={{ color: tipo.color, background: tipo.bg }}
                      >
                        {tipo.label}
                      </span>
                      <span
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium"
                        style={{ color: estado.color, background: estado.bg }}
                      >
                        <Icon size={10} />
                        {estado.label}
                      </span>
                    </div>
                  </div>
                  <p className="text-sm font-medium" style={{ color: "var(--kipu-text)" }}>{d.razon_social}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-xs" style={{ color: "var(--kipu-subtle)" }}>{d.fecha_emision}</span>
                    <span className="text-sm font-bold" style={{ color: "var(--kipu-text)" }}>${fmt(d.importe_total)}</span>
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