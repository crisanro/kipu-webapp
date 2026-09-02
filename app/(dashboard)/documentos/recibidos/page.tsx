// app/(dashboard)/documentos/recibidas/page.tsx
"use client";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import {
  Plus, FileText, Loader2, RefreshCw, Search,
  ChevronDown, ChevronUp, TrendingUp, ArrowUpRight,
  Shield, Receipt, ExternalLink
} from "lucide-react";
import { clsx } from "clsx";

// ── Tipos ──────────────────────────────────────────────────────────────────────
interface ItemDetalle {
  descripcion:            string;
  cantidad:               number;
  precio_unitario:        number;
  subtotal:               number;
  tarifa_iva:             number;
  valor_iva:              number;
  total:                  number;
  deducible_renta:        boolean;
  credito_tributario_iva: boolean;
}

interface DocRecibido {
  id:                     string;
  ruc_proveedor:          string;
  razon_social_proveedor: string;
  numero_doc:             string;
  tipo_doc:               string;
  fecha_emision:          string;
  importe_total:          number;
  items_detalle:          ItemDetalle[];
  impuestos_detalle:      any[];
  deducible_renta:        boolean;
  credito_tributario_iva: boolean;
  estado_pago:            string | null;
  forma_pago:             string | null;
  fecha_pago:             string | null;
  notas:                  string | null;
  fuente:                 string;
}

interface Resumen {
  total_documentos:       number;
  importe_total:          number;
  total_deducible:        number;
  iva_credito_tributario: number;
  desglose_iva?: Array<{
    tarifa: string; subtotal: number; iva: number; con_credito: number;
  }>;
}

const fmt = (n: any) => parseFloat(String(n ?? 0)).toFixed(2);

const TIPO_COLOR: Record<string, string> = {
  FAC: "bg-gray-400/10 text-gray-400",
  LIQ: "bg-cyan-400/10 text-cyan-400",
  NCR: "bg-purple-400/10 text-purple-400",
  NDB: "bg-amber-400/10 text-amber-400",
  RET: "bg-blue-400/10 text-blue-400",
};

const TIPO_LABEL: Record<string, string> = {
  FAC: "Factura", LIQ: "Liquidación", NCR: "Nota Crédito",
  NDB: "Nota Débito", RET: "Retención",
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

// ── Box expandido ──────────────────────────────────────────────────────────────
function DocExpandido({ doc, onVerDetalle }: { doc: DocRecibido; onVerDetalle: () => void }) {
  const items          = doc.items_detalle ?? [];
  const totalDeducible = items.filter(i => i.deducible_renta).reduce((s, i) => s + i.subtotal, 0);
  const totalCredito   = items.filter(i => i.credito_tributario_iva).reduce((s, i) => s + i.valor_iva, 0);
  const tieneItems     = items.length > 0;

  return (
    <div className="border-t border-gray-800/60 bg-gray-800/20">

      {/* ── Ítems por línea ─────────────────────────────────────────────── */}
      {tieneItems && (
        <div className="px-4 pt-3 pb-1">
          <p className="text-[10px] uppercase font-semibold tracking-wider text-gray-600 mb-2">
            {items.length} ítem{items.length !== 1 ? "s" : ""} — clasificación fiscal
          </p>
          <div className="rounded-lg border border-gray-800 overflow-hidden">
            {/* Header */}
            <div className="grid grid-cols-12 gap-1 px-3 py-1.5 text-[10px] uppercase font-semibold tracking-wider text-gray-600 bg-gray-800/50">
              <div className="col-span-5">Descripción</div>
              <div className="col-span-2 text-right">Subtotal</div>
              <div className="col-span-2 text-right">IVA</div>
              <div className="col-span-2 text-center">Deducible</div>
              <div className="col-span-1 text-center">CT</div>
            </div>
            {/* Filas */}
            <div className="divide-y divide-gray-800/50">
              {items.map((item, idx) => (
                <div key={idx} className="grid grid-cols-12 gap-1 px-3 py-2 items-center">
                  <div className="col-span-5">
                    <p className="text-xs text-white truncate">{item.descripcion}</p>
                    <p className="text-[10px] text-gray-600">{item.cantidad} × ${fmt(item.precio_unitario)}</p>
                  </div>
                  <div className="col-span-2 text-right text-xs text-gray-400">${fmt(item.subtotal)}</div>
                  <div className="col-span-2 text-right text-xs text-gray-400">
                    {item.tarifa_iva > 0 ? `${item.tarifa_iva}% · $${fmt(item.valor_iva)}` : "—"}
                  </div>
                  <div className="col-span-2 flex justify-center">
                    <span className={clsx(
                      "text-[10px] px-1.5 py-0.5 rounded font-medium",
                      item.deducible_renta
                        ? "bg-emerald-400/10 text-emerald-400"
                        : "bg-gray-800 text-gray-600"
                    )}>
                      {item.deducible_renta ? "Sí" : "No"}
                    </span>
                  </div>
                  <div className="col-span-1 flex justify-center">
                    <span className={clsx(
                      "w-2 h-2 rounded-full shrink-0",
                      item.credito_tributario_iva ? "bg-indigo-400" : "bg-gray-700"
                    )} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Resumen fiscal ──────────────────────────────────────────────── */}
      <div className="px-4 py-3 grid grid-cols-3 gap-2">
        <div className="bg-gray-900/60 rounded-lg p-2.5 text-center">
          <p className="text-[10px] text-gray-500 mb-1">Total</p>
          <p className="text-sm font-bold text-white">${fmt(doc.importe_total)}</p>
        </div>
        <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-lg p-2.5 text-center">
          <p className="text-[10px] text-gray-500 mb-1">Deducible renta</p>
          <p className="text-sm font-bold text-emerald-400">
            ${tieneItems ? fmt(totalDeducible) : (doc.deducible_renta ? fmt(doc.importe_total) : "0.00")}
          </p>
        </div>
        <div className="bg-indigo-500/5 border border-indigo-500/10 rounded-lg p-2.5 text-center">
          <p className="text-[10px] text-gray-500 mb-1">Crédito IVA</p>
          <p className="text-sm font-bold text-indigo-400">
            ${tieneItems ? fmt(totalCredito) : "0.00"}
          </p>
        </div>
      </div>

      {/* ── Pago al proveedor — solo FAC/LIQ ────────────────────────────── */}
      {["FAC", "LIQ"].includes(doc.tipo_doc) && doc.estado_pago && (
        <div className="mx-4 mb-3 flex items-center justify-between bg-gray-900/60 rounded-lg px-3 py-2">
          <div className="flex items-center gap-2">
            <Receipt size={12} className="text-gray-500" />
            <span className="text-xs text-gray-500">Pago proveedor</span>
          </div>
          <div className="flex items-center gap-2">
            {doc.fecha_pago && (
              <span className="text-xs text-gray-500">{doc.fecha_pago}</span>
            )}
            {doc.forma_pago && (
              <span className="text-xs text-gray-500">{doc.forma_pago}</span>
            )}
            <span className={clsx("text-[10px] px-2 py-0.5 rounded-full font-medium", PAGO_COLOR[doc.estado_pago] ?? "text-gray-400")}>
              {PAGO_LABEL[doc.estado_pago] ?? doc.estado_pago}
            </span>
          </div>
        </div>
      )}

      {/* ── Fuente + notas + acciones ────────────────────────────────────── */}
      <div className="mx-4 mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <span className={clsx("text-[10px] px-1.5 py-0.5 rounded font-medium shrink-0", FUENTE_COLOR[doc.fuente] ?? "text-gray-500 bg-gray-800")}>
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
          Ver detalle completo <ExternalLink size={11} />
        </button>
      </div>
    </div>
  );
}

// ── Página principal ───────────────────────────────────────────────────────────
export default function FacturasRecibidasPage() {
  const router  = useRouter();
  const hoy     = new Date().toISOString().split("T")[0];

  const [docs,        setDocs]        = useState<DocRecibido[]>([]);
  const [resumen,     setResumen]     = useState<Resumen | null>(null);
  const [loading,     setLoading]     = useState(true);
const [fechaInicio, setFechaInicio] = useState(hoy);
const [fechaFin,    setFechaFin]    = useState(hoy);
  const [query,       setQuery]       = useState("");
  const [expandido,   setExpandido]   = useState<string | null>(null);
  const [resumenOpen, setResumenOpen] = useState(false);

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
      setDocs(res.data.data     ?? []);
      setResumen(res.data.resumen ?? null);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [fechaInicio, fechaFin, diasRango]);

  useEffect(() => { cargar(); }, [cargar]);

  const filtrados = docs.filter(d =>
    !query ||
    d.razon_social_proveedor?.toLowerCase().includes(query.toLowerCase()) ||
    d.ruc_proveedor?.includes(query) ||
    d.numero_doc?.includes(query)
  );

  return (
    <div className="p-4 md:p-6 space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Documentos Recibidos</h1>
          <p className="text-sm text-gray-500">{docs.length} en el período</p>
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
            placeholder="Buscar por proveedor, RUC o número..."
            className="w-full pl-9 pr-4 py-2.5 rounded-lg bg-gray-900 border border-gray-800 text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500 text-sm" />
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
            </div>
            <div className="flex items-center gap-4">
              <span className="text-xs text-gray-400 hidden sm:block">
                Total <span className="text-white font-medium">${fmt(resumen.importe_total)}</span>
              </span>
              <span className="text-xs text-gray-400 hidden sm:block">
                Deducible <span className="text-emerald-400 font-medium">${fmt(resumen.total_deducible)}</span>
              </span>
              <span className="text-xs text-gray-400 hidden sm:block">
                CT IVA <span className="text-indigo-400 font-medium">${fmt(resumen.iva_credito_tributario)}</span>
              </span>
              {resumenOpen ? <ChevronUp size={16} className="text-gray-500" /> : <ChevronDown size={16} className="text-gray-500" />}
            </div>
          </button>

          {resumenOpen && (
            <div className="px-4 pb-4 border-t border-gray-800">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3">
                <div className="bg-gray-950/60 border border-gray-800 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Receipt size={13} className="text-gray-400" />
                    <h3 className="text-xs font-semibold text-white">Total período</h3>
                    <span className="text-[10px] text-gray-600 ml-auto">{resumen.total_documentos} docs</span>
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs text-gray-400">
                      <span>Total compras</span>
                      <span className="text-white font-bold">${fmt(resumen.importe_total)}</span>
                    </div>
                    <div className="flex justify-between text-xs text-gray-400">
                      <span>Deducible renta</span>
                      <span className="text-emerald-400">${fmt(resumen.total_deducible)}</span>
                    </div>
                    <div className="flex justify-between text-xs text-gray-400">
                      <span>Crédito trib. IVA</span>
                      <span className="text-indigo-400">${fmt(resumen.iva_credito_tributario)}</span>
                    </div>
                  </div>
                </div>

                {(resumen.desglose_iva ?? []).length > 0 && (
                  <div className="bg-gray-950/60 border border-gray-800 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Shield size={13} className="text-indigo-400" />
                      <h3 className="text-xs font-semibold text-white">Desglose por tarifa IVA</h3>
                    </div>
                    <div className="space-y-2">
                      {resumen.desglose_iva!.map((imp, i) => (
                        <div key={i} className="space-y-0.5">
                          <div className="flex justify-between text-xs text-gray-400">
                            <span>Base {imp.tarifa}%</span>
                            <span>${fmt(imp.subtotal)}</span>
                          </div>
                          {parseFloat(String(imp.iva)) > 0 && (
                            <div className="flex justify-between text-xs text-gray-500 pl-3">
                              <span>IVA {imp.tarifa}%</span>
                              <span>${fmt(imp.iva)}</span>
                            </div>
                          )}
                          {parseFloat(String(imp.con_credito)) > 0 && (
                            <div className="flex justify-between text-xs text-indigo-400 pl-3">
                              <span>→ Con crédito</span>
                              <span>${fmt(imp.con_credito)}</span>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
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
                  {/* ── Fila — clic expande ──────────────────────────────── */}
                  <div
                    onClick={() => setExpandido(isOpen ? null : doc.id)}
                    className="flex items-center gap-3 px-4 py-3 hover:bg-gray-800/40 transition-colors cursor-pointer select-none"
                  >
                    {/* Tipo badge */}
                    <span className={clsx("text-[10px] px-1.5 py-0.5 rounded font-bold shrink-0", TIPO_COLOR[doc.tipo_doc] ?? TIPO_COLOR.FAC)}>
                      {doc.tipo_doc}
                    </span>

                    {/* Info */}
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

                    {/* Total + pago */}
                    <div className="text-right shrink-0">
                      <p className="text-sm font-semibold text-white">${fmt(doc.importe_total)}</p>
                      {doc.estado_pago && ["FAC", "LIQ"].includes(doc.tipo_doc) && (
                        <p className={clsx("text-[10px]", PAGO_COLOR[doc.estado_pago]?.split(" ")[0] ?? "text-gray-500")}>
                          {PAGO_LABEL[doc.estado_pago] ?? doc.estado_pago}
                        </p>
                      )}
                    </div>

                    {/* Botón detalle — no propaga */}
                    <button
                      onClick={e => { e.stopPropagation(); router.push(`/documentos/recibidos/${doc.id}`); }}
                      className="p-1.5 rounded-lg text-gray-600 hover:text-indigo-400 hover:bg-indigo-400/10 transition-colors shrink-0"
                      title="Ver detalle"
                    >
                      <ArrowUpRight size={15} />
                    </button>

                    {/* Chevron */}
                    <div className="text-gray-600 shrink-0">
                      {isOpen ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                    </div>
                  </div>

                  {/* ── Box expandido ────────────────────────────────────── */}
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