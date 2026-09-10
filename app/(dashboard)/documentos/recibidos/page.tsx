"use client";
import { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import api from "@/lib/api";
import { usePermiso } from "@/hooks/usePermiso";
import SinAcceso from "@/components/SinAcceso";
import {
  Plus, FileText, RefreshCw, Search,
  ChevronDown, ChevronUp, TrendingUp, ArrowUpRight,
  Receipt, ExternalLink
} from "lucide-react";

// ── Tipos ──────────────────────────────────────────────────────────────────────
interface DocRecibido {
  id:                      string;
  razon_social_proveedor: string;
  tipo_doc:                string;
  numero_doc:              string;
  fecha_emision:          string;
  subtotal_base:          number;
  valor_iva_total:        number;
  importe_total:          number;
  deducible_renta:        boolean;
  credito_tributario_iva: boolean;
  estado_pago:            string | null;
  notas:                  string | null;
  fuente:                 string;
}
interface Resumen {
  total_documentos:        number;
  importe_total:          number;
  total_deducible:        number;
  iva_credito_tributario: number;
}

const fmt = (n: any) => parseFloat(String(n ?? 0)).toFixed(2);

const TIPO_COLOR: Record<string, { color: string; bg: string }> = {
  FAC: { color: "var(--kipu-muted)", bg: "color-mix(in srgb, var(--kipu-muted) 10%, transparent)" },
  LIQ: { color: "#22d3ee", bg: "color-mix(in srgb, #22d3ee 10%, transparent)" },
  NCR: { color: "#c084fc", bg: "color-mix(in srgb, #c084fc 10%, transparent)" },
  NDB: { color: "#fb923c", bg: "color-mix(in srgb, #fb923c 10%, transparent)" },
  RET: { color: "#60a5fa", bg: "color-mix(in srgb, #60a5fa 10%, transparent)" },
};
const PAGO_COLOR: Record<string, { color: string; bg: string }> = {
  PENDIENTE: { color: "var(--kipu-warning)", bg: "color-mix(in srgb, var(--kipu-warning) 10%, transparent)" },
  PAGADO:    { color: "var(--kipu-success)", bg: "color-mix(in srgb, var(--kipu-success) 10%, transparent)" },
  PARCIAL:   { color: "#60a5fa", bg: "color-mix(in srgb, #60a5fa 10%, transparent)" },
  ANULADO:   { color: "var(--kipu-danger)", bg: "color-mix(in srgb, var(--kipu-danger) 10%, transparent)" },
};
const PAGO_LABEL: Record<string, string> = {
  PENDIENTE: "Por pagar", PAGADO: "Pagado",
  PARCIAL: "Parcial", ANULADO: "Anulado",
};
const FUENTE_COLOR: Record<string, { color: string; bg: string }> = {
  XML:    { color: "var(--kipu-accent)", bg: "color-mix(in srgb, var(--kipu-accent) 10%, transparent)" },
  FISICO: { color: "var(--kipu-warning)", bg: "color-mix(in srgb, var(--kipu-warning) 10%, transparent)" },
  API:    { color: "#22d3ee", bg: "color-mix(in srgb, #22d3ee 10%, transparent)" },
};

// ── Storage helpers ────────────────────────────────────────────────────────────
const SS_KEY_INICIO = "kipu_recibidos_fecha_inicio";
const SS_KEY_FIN    = "kipu_recibidos_fecha_fin";

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

// ── Box expandido ──────────────────────────────────────────────────────────────
function DocExpandido({ doc, onVerDetalle }: { doc: DocRecibido; onVerDetalle: () => void }) {
  return (
    <div
      style={{
        borderTop: "1px solid var(--kipu-border)",
        background: "color-mix(in srgb, var(--kipu-text) 2%, transparent)",
      }}
    >
      {/* Resumen fiscal */}
      <div className="px-4 py-3 grid grid-cols-3 gap-2">
        <div
          className="rounded-lg p-2.5 text-center"
          style={{ background: "color-mix(in srgb, var(--kipu-text) 4%, transparent)" }}
        >
          <p className="text-[10px] mb-1" style={{ color: "var(--kipu-subtle)" }}>Base sin IVA</p>
          <p className="text-sm font-bold" style={{ color: "var(--kipu-text)" }}>${fmt(doc.subtotal_base)}</p>
        </div>
        <div
          className="rounded-lg p-2.5 text-center"
          style={{ background: "color-mix(in srgb, var(--kipu-text) 4%, transparent)" }}
        >
          <p className="text-[10px] mb-1" style={{ color: "var(--kipu-subtle)" }}>IVA</p>
          <p className="text-sm font-bold" style={{ color: "var(--kipu-text)" }}>${fmt(doc.valor_iva_total)}</p>
        </div>
        <div
          className="rounded-lg p-2.5 text-center"
          style={{ background: "color-mix(in srgb, var(--kipu-text) 4%, transparent)" }}
        >
          <p className="text-[10px] mb-1" style={{ color: "var(--kipu-subtle)" }}>Total</p>
          <p className="text-sm font-bold" style={{ color: "var(--kipu-text)" }}>${fmt(doc.importe_total)}</p>
        </div>
      </div>
      {/* Clasificación fiscal */}
      <div className="px-4 pb-3 grid grid-cols-2 gap-2">
        <div
          className="rounded-lg p-2.5 text-center"
          style={{
            background: doc.deducible_renta
              ? "color-mix(in srgb, var(--kipu-success) 5%, transparent)"
              : "color-mix(in srgb, var(--kipu-text) 4%, transparent)",
            border: doc.deducible_renta
              ? "1px solid color-mix(in srgb, var(--kipu-success) 20%, transparent)"
              : "1px solid var(--kipu-border)",
          }}
        >
          <p className="text-[10px] mb-1" style={{ color: "var(--kipu-subtle)" }}>Deducible renta</p>
          <p
            className="text-xs font-bold"
            style={{ color: doc.deducible_renta ? "var(--kipu-success)" : "var(--kipu-subtle)" }}
          >
            {doc.deducible_renta ? `$${fmt(doc.subtotal_base)}` : "No aplica"}
          </p>
        </div>
        <div
          className="rounded-lg p-2.5 text-center"
          style={{
            background: doc.credito_tributario_iva
              ? "color-mix(in srgb, #818cf8 5%, transparent)"
              : "color-mix(in srgb, var(--kipu-text) 4%, transparent)",
            border: doc.credito_tributario_iva
              ? "1px solid color-mix(in srgb, #818cf8 20%, transparent)"
              : "1px solid var(--kipu-border)",
          }}
        >
          <p className="text-[10px] mb-1" style={{ color: "var(--kipu-subtle)" }}>Crédito trib. IVA</p>
          <p
            className="text-xs font-bold"
            style={{ color: doc.credito_tributario_iva ? "#818cf8" : "var(--kipu-subtle)" }}
          >
            {doc.credito_tributario_iva ? `$${fmt(doc.valor_iva_total)}` : "No aplica"}
          </p>
        </div>
      </div>
      {/* Estado pago — solo FAC/LIQ */}
      {["FAC", "LIQ"].includes(doc.tipo_doc) && doc.estado_pago && (
        <div
          className="mx-4 mb-3 flex items-center justify-between rounded-lg px-3 py-2"
          style={{ background: "color-mix(in srgb, var(--kipu-text) 4%, transparent)" }}
        >
          <div className="flex items-center gap-2">
            <Receipt size={12} style={{ color: "var(--kipu-subtle)" }} />
            <span className="text-xs" style={{ color: "var(--kipu-subtle)" }}>Pago proveedor</span>
          </div>
          <span
            className="text-[10px] px-2 py-0.5 rounded-full font-medium"
            style={{
              color: PAGO_COLOR[doc.estado_pago]?.color ?? "var(--kipu-muted)",
              background: PAGO_COLOR[doc.estado_pago]?.bg ?? "color-mix(in srgb, var(--kipu-text) 8%, transparent)",
            }}
          >
            {PAGO_LABEL[doc.estado_pago] ?? doc.estado_pago}
          </span>
        </div>
      )}
      {/* Fuente + notas + acción */}
      <div className="mx-4 mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <span
            className="text-[10px] px-1.5 py-0.5 rounded font-medium shrink-0"
            style={{
              color: FUENTE_COLOR[doc.fuente]?.color ?? "var(--kipu-muted)",
              background: FUENTE_COLOR[doc.fuente]?.bg ?? "color-mix(in srgb, var(--kipu-text) 8%, transparent)",
            }}
          >
            {doc.fuente}
          </span>
          {doc.notas && (
            <p className="text-xs italic truncate" style={{ color: "var(--kipu-subtle)" }}>{doc.notas}</p>
          )}
        </div>
        <button
          onClick={e => { e.stopPropagation(); onVerDetalle(); }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors shrink-0"
          style={{
            background: "color-mix(in srgb, var(--kipu-accent) 12%, transparent)",
            color: "var(--kipu-accent)",
            border: "1px solid color-mix(in srgb, var(--kipu-accent) 25%, transparent)",
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background = "color-mix(in srgb, var(--kipu-accent) 20%, transparent)";
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = "color-mix(in srgb, var(--kipu-accent) 12%, transparent)";
          }}
        >
          Ver ítems y detalle <ExternalLink size={11} />
        </button>
      </div>
    </div>
  );
}

// ── Página principal ───────────────────────────────────────────────────────────
export default function FacturasRecibidasPage() {
  const puedeVer = usePermiso("documentos_recibidos");
  if (!puedeVer) return <SinAcceso />;
  const router = useRouter();
  const searchParams = useSearchParams();

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

  const [docs,        setDocs]      = useState<DocRecibido[]>([]);
  const [resumen,     setResumen]   = useState<Resumen | null>(null);
  const [loading,     setLoading]   = useState(true);
  const [query,       setQuery]     = useState("");
  const [expandido,   setExpandido] = useState<string | null>(null);
  const [resumenOpen, setResumenOpen] = useState(false);

  useEffect(() => { guardarFecha(SS_KEY_INICIO, fechaInicio); }, [fechaInicio]);
  useEffect(() => { guardarFecha(SS_KEY_FIN,    fechaFin);    }, [fechaFin]);

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
      const res = await api.get(`/api/v1/app/recibidos?${params}`);
      setDocs(res.data.data        ?? []);
      setResumen(res.data.resumen ?? null);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [fechaInicio, fechaFin, diasRango]);

  useEffect(() => { cargar(); }, [cargar]);

  const filtrados = docs.filter(d =>
    !query ||
    d.razon_social_proveedor?.toLowerCase().includes(query.toLowerCase()) ||
    d.numero_doc?.includes(query)
  );

  return (
    <div className="p-4 md:p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold" style={{ color: "var(--kipu-text)" }}>Documentos Recibidos</h1>
          <p className="text-sm" style={{ color: "var(--kipu-subtle)" }}>
            {resumen ? `${resumen.total_documentos} en el período` : "—"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={cargar}
            className="p-2 rounded-lg transition-colors"
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
          <button
            onClick={() => router.push("/documentos/recibidos/nueva")}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-medium transition-colors"
            style={{ background: "var(--kipu-accent)" }}
            onMouseEnter={e => e.currentTarget.style.background = "var(--kipu-accent-h)"}
            onMouseLeave={e => e.currentTarget.style.background = "var(--kipu-accent)"}
          >
            <Plus size={15} /> Registrar
          </button>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--kipu-subtle)" }} />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Buscar por proveedor o número..."
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
            className="px-3 py-2 rounded-lg text-sm transition-colors focus:outline-none"
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
            className="px-3 py-2 rounded-lg text-sm transition-colors focus:outline-none"
            style={{
              background: "var(--kipu-surface)",
              border: "1px solid var(--kipu-border)",
              color: "var(--kipu-text)",
            }}
            onFocus={e => e.currentTarget.style.borderColor = "var(--kipu-accent)"}
            onBlur={e => e.currentTarget.style.borderColor = "var(--kipu-border)"}
          />
          <button
            onClick={cargar}
            disabled={diasRango > 45}
            className="px-3 py-2 rounded-lg text-white text-sm font-medium transition-colors disabled:opacity-40"
            style={{ background: "var(--kipu-accent)" }}
            onMouseEnter={e => {
              if (diasRango <= 45) e.currentTarget.style.background = "var(--kipu-accent-h)";
            }}
            onMouseLeave={e => {
              if (diasRango <= 45) e.currentTarget.style.background = "var(--kipu-accent)";
            }}
          >
            Buscar
          </button>
        </div>
      </div>

      {diasRango > 45 && (
        <p className="text-xs font-medium" style={{ color: "var(--kipu-warning)" }}>El rango máximo es 45 días.</p>
      )}

      {/* Resumen fiscal */}
      {resumen && resumen.total_documentos > 0 && (
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
              <TrendingUp size={15} style={{ color: "var(--kipu-success)" }} />
              <span className="text-sm font-semibold" style={{ color: "var(--kipu-text)" }}>Resumen fiscal</span>
              <span className="text-xs" style={{ color: "var(--kipu-subtle)" }}>{fechaInicio} → {fechaFin}</span>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-xs hidden sm:block" style={{ color: "var(--kipu-muted)" }}>
                Total <span className="font-medium" style={{ color: "var(--kipu-text)" }}>${fmt(resumen.importe_total)}</span>
              </span>
              <span className="text-xs hidden sm:block" style={{ color: "var(--kipu-muted)" }}>
                Ded. <span className="font-medium" style={{ color: "var(--kipu-success)" }}>${fmt(resumen.total_deducible)}</span>
              </span>
              <span className="text-xs hidden sm:block" style={{ color: "var(--kipu-muted)" }}>
                CT IVA <span className="font-medium" style={{ color: "#818cf8" }}>${fmt(resumen.iva_credito_tributario)}</span>
              </span>
              {resumenOpen
                ? <ChevronUp size={16} style={{ color: "var(--kipu-subtle)" }} />
                : <ChevronDown size={16} style={{ color: "var(--kipu-subtle)" }} />
              }
            </div>
          </button>
          {resumenOpen && (
            <div
              className="px-4 pb-4 pt-3"
              style={{ borderTop: "2px solid var(--kipu-border)" }}
            >
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div
                  className="rounded-xl p-4 text-center"
                  style={{
                    background: "color-mix(in srgb, var(--kipu-surface) 60%, transparent)",
                    border: "1px solid var(--kipu-border)",
                  }}
                >
                  <p className="text-[10px] uppercase tracking-wider mb-1" style={{ color: "var(--kipu-subtle)" }}>Total compras</p>
                  <p className="text-lg font-bold" style={{ color: "var(--kipu-text)" }}>${fmt(resumen.importe_total)}</p>
                  <p className="text-[10px] mt-1" style={{ color: "var(--kipu-subtle)" }}>{resumen.total_documentos} documentos</p>
                </div>
                <div
                  className="rounded-xl p-4 text-center"
                  style={{
                    background: "color-mix(in srgb, var(--kipu-success) 5%, transparent)",
                    border: "1px solid color-mix(in srgb, var(--kipu-success) 10%, transparent)",
                  }}
                >
                  <p className="text-[10px] uppercase tracking-wider mb-1" style={{ color: "var(--kipu-subtle)" }}>Deducible renta</p>
                  <p className="text-lg font-bold" style={{ color: "var(--kipu-success)" }}>${fmt(resumen.total_deducible)}</p>
                  <p className="text-[10px] mt-1" style={{ color: "var(--kipu-subtle)" }}>base sin IVA de docs deducibles</p>
                </div>
                <div
                  className="rounded-xl p-4 text-center"
                  style={{
                    background: "color-mix(in srgb, #818cf8 5%, transparent)",
                    border: "1px solid color-mix(in srgb, #818cf8 10%, transparent)",
                  }}
                >
                  <p className="text-[10px] uppercase tracking-wider mb-1" style={{ color: "var(--kipu-subtle)" }}>Crédito trib. IVA</p>
                  <p className="text-lg font-bold" style={{ color: "#818cf8" }}>${fmt(resumen.iva_credito_tributario)}</p>
                  <p className="text-[10px] mt-1" style={{ color: "var(--kipu-subtle)" }}>IVA recuperable del período</p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

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
            {query ? "No hay documentos que coincidan." : "Sin documentos recibidos en este período."}
          </p>
          {!query && (
            <button
              onClick={() => router.push("/documentos/recibidos/nueva")}
              className="mt-4 px-4 py-2 rounded-lg text-white text-sm font-medium transition-colors"
              style={{ background: "var(--kipu-accent)" }}
              onMouseEnter={e => e.currentTarget.style.background = "var(--kipu-accent-h)"}
              onMouseLeave={e => e.currentTarget.style.background = "var(--kipu-accent)"}
            >
              Registrar primer documento
            </button>
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
          <div>
            {filtrados.map((doc, index) => {
              const isOpen = expandido === doc.id;
              const tColor = TIPO_COLOR[doc.tipo_doc] ?? TIPO_COLOR.FAC;
              return (
                <div
                  key={doc.id}
                  style={{
                    borderTop: index > 0 ? "1px solid var(--kipu-border)" : "none",
                  }}
                >
                  <div
                    onClick={() => setExpandido(isOpen ? null : doc.id)}
                    className="flex items-center gap-3 px-4 py-3 transition-colors cursor-pointer select-none"
                    onMouseEnter={e => e.currentTarget.style.background = "color-mix(in srgb, var(--kipu-text) 4%, transparent)"}
                    onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                  >
                    <span
                      className="text-[10px] px-1.5 py-0.5 rounded font-bold shrink-0"
                      style={{ color: tColor.color, background: tColor.bg }}
                    >
                      {doc.tipo_doc}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium truncate" style={{ color: "var(--kipu-text)" }}>
                          {doc.razon_social_proveedor}
                        </p>
                        <div className="flex gap-1 shrink-0">
                          {doc.deducible_renta && (
                            <span
                              className="text-[10px] px-1.5 py-0.5 rounded"
                              style={{
                                color: "var(--kipu-success)",
                                background: "color-mix(in srgb, var(--kipu-success) 10%, transparent)",
                              }}
                            >
                              Ded.
                            </span>
                          )}
                          {doc.credito_tributario_iva && (
                            <span
                              className="text-[10px] px-1.5 py-0.5 rounded"
                              style={{
                                color: "#818cf8",
                                background: "color-mix(in srgb, #818cf8 10%, transparent)",
                              }}
                            >
                              CT IVA
                            </span>
                          )}
                        </div>
                      </div>
                      <p className="text-xs font-mono" style={{ color: "var(--kipu-subtle)" }}>
                        {doc.numero_doc} · {doc.fecha_emision}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-semibold" style={{ color: "var(--kipu-text)" }}>${fmt(doc.importe_total)}</p>
                      {doc.estado_pago && ["FAC", "LIQ"].includes(doc.tipo_doc) && (
                        <span
                          className="text-[10px] px-1.5 py-0.5 rounded-full font-medium"
                          style={{
                            color: PAGO_COLOR[doc.estado_pago]?.color ?? "var(--kipu-muted)",
                            background: PAGO_COLOR[doc.estado_pago]?.bg ?? "color-mix(in srgb, var(--kipu-text) 8%, transparent)",
                          }}
                        >
                          {PAGO_LABEL[doc.estado_pago] ?? doc.estado_pago}
                        </span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={e => { e.stopPropagation(); router.push(`/documentos/recibidos/${doc.id}`); }}
                      className="p-1.5 rounded-lg transition-colors shrink-0"
                      style={{ color: "var(--kipu-subtle)" }}
                      onMouseEnter={e => {
                        e.currentTarget.style.color = "var(--kipu-accent)";
                        e.currentTarget.style.background = "color-mix(in srgb, var(--kipu-accent) 10%, transparent)";
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.color = "var(--kipu-subtle)";
                        e.currentTarget.style.background = "transparent";
                      }}
                      title="Ver detalle completo"
                    >
                      <ArrowUpRight size={15} />
                    </button>
                    <div className="shrink-0" style={{ color: "var(--kipu-subtle)" }}>
                      {isOpen ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                    </div>
                  </div>
                  {isOpen && (
                    <DocExpandido
                      doc={doc}
                      onVerDetalle={() => router.push(`/documentos/recibidos/${doc.id}`)}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}