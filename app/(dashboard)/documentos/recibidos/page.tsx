// app/(dashboard)/documentos/recibidas/page.tsx
"use client";
import { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import api from "@/lib/api";
import { usePermiso } from "@/hooks/usePermiso";
import SinAcceso from "@/components/SinAcceso";
import {
  Plus, FileText, Loader2, RefreshCw, Search,
  ChevronDown, ChevronUp, TrendingUp, ArrowUpRight,
  Receipt, ExternalLink
} from "lucide-react";
import { clsx } from "clsx";

// ── Tipos ──────────────────────────────────────────────────────────────────────
interface DocRecibido {
  id:                     string;
  razon_social_proveedor: string;
  tipo_doc:               string;
  numero_doc:             string;
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

const TIPO_COLOR: Record<string, string> = {
  FAC: "bg-gray-400/10 text-gray-400",
  LIQ: "bg-cyan-400/10 text-cyan-400",
  NCR: "bg-purple-400/10 text-purple-400",
  NDB: "bg-amber-400/10 text-amber-400",
  RET: "bg-blue-400/10 text-blue-400",
};
const PAGO_COLOR: Record<string, string> = {
  PENDIENTE: "text-amber-400 bg-amber-400/10",
  PAGADO:    "text-emerald-400 bg-emerald-400/10",
  PARCIAL:   "text-blue-400 bg-blue-400/10",
  ANULADO:   "text-red-400 bg-red-400/10",
};
const PAGO_LABEL: Record<string, string> = {
  PENDIENTE: "Por pagar", PAGADO: "Pagado",
  PARCIAL: "Parcial", ANULADO: "Anulado",
};
const FUENTE_COLOR: Record<string, string> = {
  XML:    "text-indigo-400 bg-indigo-400/10",
  FISICO: "text-amber-400 bg-amber-400/10",
  API:    "text-cyan-400 bg-cyan-400/10",
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
    <div className="border-t border-gray-800/60 bg-gray-800/20">
      {/* Resumen fiscal */}
      <div className="px-4 py-3 grid grid-cols-3 gap-2">
        <div className="bg-gray-900/60 rounded-lg p-2.5 text-center">
          <p className="text-[10px] text-gray-500 mb-1">Base sin IVA</p>
          <p className="text-sm font-bold text-white">${fmt(doc.subtotal_base)}</p>
        </div>
        <div className="bg-gray-900/60 rounded-lg p-2.5 text-center">
          <p className="text-[10px] text-gray-500 mb-1">IVA</p>
          <p className="text-sm font-bold text-white">${fmt(doc.valor_iva_total)}</p>
        </div>
        <div className="bg-gray-900/60 rounded-lg p-2.5 text-center">
          <p className="text-[10px] text-gray-500 mb-1">Total</p>
          <p className="text-sm font-bold text-white">${fmt(doc.importe_total)}</p>
        </div>
      </div>
      {/* Clasificación fiscal */}
      <div className="px-4 pb-3 grid grid-cols-2 gap-2">
        <div className={clsx(
          "rounded-lg p-2.5 text-center border",
          doc.deducible_renta
            ? "bg-emerald-500/5 border-emerald-500/10"
            : "bg-gray-900/60 border-gray-800"
        )}>
          <p className="text-[10px] text-gray-500 mb-1">Deducible renta</p>
          <p className={clsx("text-xs font-bold", doc.deducible_renta ? "text-emerald-400" : "text-gray-600")}>
            {doc.deducible_renta ? `$${fmt(doc.subtotal_base)}` : "No aplica"}
          </p>
        </div>
        <div className={clsx(
          "rounded-lg p-2.5 text-center border",
          doc.credito_tributario_iva
            ? "bg-indigo-500/5 border-indigo-500/10"
            : "bg-gray-900/60 border-gray-800"
        )}>
          <p className="text-[10px] text-gray-500 mb-1">Crédito trib. IVA</p>
          <p className={clsx("text-xs font-bold", doc.credito_tributario_iva ? "text-indigo-400" : "text-gray-600")}>
            {doc.credito_tributario_iva ? `$${fmt(doc.valor_iva_total)}` : "No aplica"}
          </p>
        </div>
      </div>
      {/* Estado pago — solo FAC/LIQ */}
      {["FAC", "LIQ"].includes(doc.tipo_doc) && doc.estado_pago && (
        <div className="mx-4 mb-3 flex items-center justify-between bg-gray-900/60 rounded-lg px-3 py-2">
          <div className="flex items-center gap-2">
            <Receipt size={12} className="text-gray-500" />
            <span className="text-xs text-gray-500">Pago proveedor</span>
          </div>
          <span className={clsx("text-[10px] px-2 py-0.5 rounded-full font-medium", PAGO_COLOR[doc.estado_pago] ?? "text-gray-400")}>
            {PAGO_LABEL[doc.estado_pago] ?? doc.estado_pago}
          </span>
        </div>
      )}
      {/* Fuente + notas + acción */}
      <div className="mx-4 mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <span className={clsx(
            "text-[10px] px-1.5 py-0.5 rounded font-medium shrink-0",
            FUENTE_COLOR[doc.fuente] ?? "text-gray-500 bg-gray-800"
          )}>
            {doc.fuente}
          </span>
          {doc.notas && (
            <p className="text-xs text-gray-500 italic truncate">{doc.notas}</p>
          )}
        </div>
        <button
          onClick={e => { e.stopPropagation(); onVerDetalle(); }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-400 text-xs font-medium transition-colors shrink-0 border border-indigo-500/20"
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
          <h1 className="text-xl font-bold text-white">Documentos Recibidos</h1>
          <p className="text-sm text-gray-500">
            {resumen ? `${resumen.total_documentos} en el período` : "—"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={cargar}
            className="p-2 rounded-lg border border-gray-800 bg-gray-900 text-gray-400 hover:text-white transition-colors">
            <RefreshCw size={16} />
          </button>
          <button onClick={() => router.push("/documentos/recibidos/nueva")}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium transition-colors">
            <Plus size={15} /> Registrar
          </button>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input value={query} onChange={e => setQuery(e.target.value)}
            placeholder="Buscar por proveedor o número..."
            className="w-full pl-9 pr-4 py-2.5 rounded-lg bg-gray-900 border border-gray-800 text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500 text-sm" />
        </div>
        <div className="flex gap-2 items-center shrink-0">
          <input type="date" value={fechaInicio} onChange={e => setFechaInicio(e.target.value)}
            className="px-3 py-2 rounded-lg bg-gray-900 border border-gray-800 text-white text-sm focus:outline-none focus:border-indigo-500" />
          <span className="text-gray-600 text-xs">—</span>
          <input type="date" value={fechaFin} onChange={e => setFechaFin(e.target.value)}
            className="px-3 py-2 rounded-lg bg-gray-900 border border-gray-800 text-white text-sm focus:outline-none focus:border-indigo-500" />
          <button onClick={cargar} disabled={diasRango > 45}
            className="px-3 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white text-sm font-medium transition-colors">
            Buscar
          </button>
        </div>
      </div>

      {diasRango > 45 && (
        <p className="text-xs text-amber-400 font-medium">El rango máximo es 45 días.</p>
      )}

      {/* Resumen fiscal */}
      {resumen && resumen.total_documentos > 0 && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          <button onClick={() => setResumenOpen(!resumenOpen)}
            className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-800/50 transition-colors">
            <div className="flex items-center gap-2">
              <TrendingUp size={15} className="text-emerald-400" />
              <span className="text-sm font-semibold text-white">Resumen fiscal</span>
              <span className="text-xs text-gray-600">{fechaInicio} → {fechaFin}</span>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-xs text-gray-400 hidden sm:block">
                Total <span className="text-white font-medium">${fmt(resumen.importe_total)}</span>
              </span>
              <span className="text-xs text-gray-400 hidden sm:block">
                Ded. <span className="text-emerald-400 font-medium">${fmt(resumen.total_deducible)}</span>
              </span>
              <span className="text-xs text-gray-400 hidden sm:block">
                CT IVA <span className="text-indigo-400 font-medium">${fmt(resumen.iva_credito_tributario)}</span>
              </span>
              {resumenOpen
                ? <ChevronUp size={16} className="text-gray-500" />
                : <ChevronDown size={16} className="text-gray-500" />
              }
            </div>
          </button>
          {resumenOpen && (
            <div className="px-4 pb-4 border-t border-gray-800 pt-3">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="bg-gray-950/60 border border-gray-800 rounded-xl p-4 text-center">
                  <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Total compras</p>
                  <p className="text-lg font-bold text-white">${fmt(resumen.importe_total)}</p>
                  <p className="text-[10px] text-gray-600 mt-1">{resumen.total_documentos} documentos</p>
                </div>
                <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-xl p-4 text-center">
                  <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Deducible renta</p>
                  <p className="text-lg font-bold text-emerald-400">${fmt(resumen.total_deducible)}</p>
                  <p className="text-[10px] text-gray-600 mt-1">base sin IVA de docs deducibles</p>
                </div>
                <div className="bg-indigo-500/5 border border-indigo-500/10 rounded-xl p-4 text-center">
                  <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Crédito trib. IVA</p>
                  <p className="text-lg font-bold text-indigo-400">${fmt(resumen.iva_credito_tributario)}</p>
                  <p className="text-[10px] text-gray-600 mt-1">IVA recuperable del período</p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Lista */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={24} className="animate-spin text-indigo-400" />
        </div>
      ) : filtrados.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <FileText size={40} className="text-gray-700 mb-3" />
          <p className="text-gray-500 text-sm">
            {query ? "No hay documentos que coincidan." : "Sin documentos recibidos en este período."}
          </p>
          {!query && (
            <button onClick={() => router.push("/documentos/recibidos/nueva")}
              className="mt-4 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium transition-colors">
              Registrar primer documento
            </button>
          )}
        </div>
      ) : (
        <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
          <div className="divide-y divide-gray-800">
            {filtrados.map(doc => {
              const isOpen = expandido === doc.id;
              return (
                <div key={doc.id}>
                  <div
                    onClick={() => setExpandido(isOpen ? null : doc.id)}
                    className="flex items-center gap-3 px-4 py-3 hover:bg-gray-800/40 transition-colors cursor-pointer select-none"
                  >
                    <span className={clsx("text-[10px] px-1.5 py-0.5 rounded font-bold shrink-0", TIPO_COLOR[doc.tipo_doc] ?? TIPO_COLOR.FAC)}>
                      {doc.tipo_doc}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm text-white font-medium truncate">
                          {doc.razon_social_proveedor}
                        </p>
                        <div className="flex gap-1 shrink-0">
                          {doc.deducible_renta && (
                            <span className="text-[10px] text-emerald-400 bg-emerald-400/10 px-1.5 py-0.5 rounded">Ded.</span>
                          )}
                          {doc.credito_tributario_iva && (
                            <span className="text-[10px] text-indigo-400 bg-indigo-400/10 px-1.5 py-0.5 rounded">CT IVA</span>
                          )}
                        </div>
                      </div>
                      <p className="text-xs text-gray-500 font-mono">
                        {doc.numero_doc} · {doc.fecha_emision}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-semibold text-white">${fmt(doc.importe_total)}</p>
                      {doc.estado_pago && ["FAC", "LIQ"].includes(doc.tipo_doc) && (
                        <span className={clsx(
                          "text-[10px] px-1.5 py-0.5 rounded-full font-medium",
                          PAGO_COLOR[doc.estado_pago]?.split(" ")[0] ?? "text-gray-500"
                        )}>
                          {PAGO_LABEL[doc.estado_pago] ?? doc.estado_pago}
                        </span>
                      )}
                    </div>
                    <button
                      onClick={e => { e.stopPropagation(); router.push(`/documentos/recibidos/${doc.id}`); }}
                      className="p-1.5 rounded-lg text-gray-600 hover:text-indigo-400 hover:bg-indigo-400/10 transition-colors shrink-0"
                      title="Ver detalle completo"
                    >
                      <ArrowUpRight size={15} />
                    </button>
                    <div className="text-gray-600 shrink-0">
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