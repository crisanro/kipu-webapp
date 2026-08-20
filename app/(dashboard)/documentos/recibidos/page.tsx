// app/(dashboard)/documentos/recibidas/page.tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import {
  Plus, FileText, Loader2, RefreshCw,
  Search, ChevronDown, ChevronUp, Pencil, Check, X, TrendingUp
} from "lucide-react";
import { clsx } from "clsx";

// ── Tipos ──────────────────────────────────────────────────────────────────────
interface ImpuestoDetalle {
  codigoPorcentaje: string;
  tarifa:           string;
  baseImponible:    number;
  valor:            number;
  aplicaCredito:    boolean;
}

interface FacturaRecibida {
  id:                     string;
  ruc_proveedor:          string;
  razon_social_proveedor: string;
  numero_doc:             string;
  tipo_doc:               string;
  fecha_emision:          string;
  importe_total:          number;
  impuestos_detalle:      ImpuestoDetalle[];
  deducible_renta:        boolean;
  credito_tributario_iva: boolean;
  notas:                  string | null;
  fuente:                 string;
  estado_pago:            string | null;
  created_at:             string;
}

interface Resumen {
  total_documentos:        number;
  importe_total:           number;
  total_deducible:         number;
  iva_credito_tributario:  number;
  periodo?: {
    desde: string;
    hasta: string;
  };
  desglose_iva?: Array<{
    tarifa: string;
    subtotal: number;
    iva: number;
    con_credito: number;
  }>;
}

const fmt = (n: any) => parseFloat(String(n ?? 0)).toFixed(2);

// ── Modal edición ──────────────────────────────────────────────────────────────
interface EditModalProps {
  factura: FacturaRecibida;
  onClose: () => void;
  onSaved: () => void;
}

function EditModal({ factura, onClose, onSaved }: EditModalProps) {
  const [deducibleRenta,        setDeducibleRenta]        = useState(factura.deducible_renta);
  const [creditoTributarioIva, setCreditoTributarioIva] = useState(factura.credito_tributario_iva);
  const [impuestos,            setImpuestos]            = useState<ImpuestoDetalle[]>(
    factura.impuestos_detalle ?? []
  );
  const [notas,   setNotas]   = useState(factura.notas ?? "");
  const [saving,  setSaving]  = useState(false);
  const [error,   setError]   = useState("");

  const toggleCredito = (idx: number) => {
    setImpuestos(prev => prev.map((imp, i) =>
      i === idx ? { ...imp, aplicaCredito: !imp.aplicaCredito } : imp
    ));
  };

  const guardar = async () => {
    setSaving(true);
    setError("");
    try {
      await api.patch(`/api/v1/app/recibidos/${factura.id}`, {
        deducible_renta:        deducibleRenta,
        credito_tributario_iva: creditoTributarioIva,
        notas:                  notas || null,
        impuestos_detalle:      impuestos,
      });
      onSaved();
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.detail ?? "Error al guardar.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
      <div className="bg-gray-900 border border-gray-800 rounded-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800 sticky top-0 bg-gray-900">
          <div>
            <h2 className="text-sm font-semibold text-white">Editar clasificación</h2>
            <p className="text-xs text-gray-500">{factura.numero_doc}</p>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white">
            <X size={18} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Proveedor */}
          <div>
            <p className="text-sm font-medium text-white">{factura.razon_social_proveedor}</p>
            <p className="text-xs text-gray-500">{factura.ruc_proveedor} · {factura.fecha_emision}</p>
            <p className="text-sm font-bold text-white mt-1">${fmt(factura.importe_total)}</p>
          </div>

          {/* Impuestos detalle */}
          {impuestos.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                Crédito tributario por línea
              </p>
              <div className="space-y-2">
                {impuestos.map((imp, idx) => (
                  <div
                    key={idx}
                    className={clsx(
                      "flex items-center justify-between p-3 rounded-lg border transition-colors",
                      imp.aplicaCredito
                        ? "border-indigo-500/40 bg-indigo-500/5"
                        : "border-gray-800 bg-gray-800/30"
                    )}
                  >
                    <div>
                      <p className="text-sm text-white font-medium">IVA {imp.tarifa}%</p>
                      <p className="text-xs text-gray-500">
                        Base: ${fmt(imp.baseImponible)}
                        {imp.valor > 0 && ` · IVA: $${fmt(imp.valor)}`}
                      </p>
                    </div>
                    {imp.valor > 0 ? (
                      <button
                        onClick={() => toggleCredito(idx)}
                        className={clsx(
                          "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors",
                          imp.aplicaCredito
                            ? "bg-indigo-600 text-white"
                            : "bg-gray-700 text-gray-400 hover:text-white"
                        )}
                      >
                        {imp.aplicaCredito ? <><Check size={11} /> Crédito</> : "Sin crédito"}
                      </button>
                    ) : (
                      <span className="text-xs text-gray-600 px-3 py-1.5">No aplica</span>
                    )}
                  </div>
                ))}
              </div>
              {impuestos.some(i => i.aplicaCredito) && (
                <div className="mt-2 flex justify-between text-xs font-medium">
                  <span className="text-indigo-400">Crédito tributario total</span>
                  <span className="text-indigo-400">
                    ${fmt(impuestos.filter(i => i.aplicaCredito).reduce((s, i) => s + i.valor, 0))}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Deducible renta */}
          <div className="flex items-center justify-between py-2 border-t border-gray-800">
            <div>
              <p className="text-sm text-white font-medium">Deducible en renta</p>
              <p className="text-xs text-gray-500">¿Aplica como gasto deducible?</p>
            </div>
            <button
              onClick={() => setDeducibleRenta(!deducibleRenta)}
              className={clsx(
                "w-10 h-5 rounded-full transition-colors relative shrink-0",
                deducibleRenta ? "bg-indigo-600" : "bg-gray-700"
              )}
            >
              <span className={clsx(
                "absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all shadow-sm",
                deducibleRenta ? "left-5" : "left-0.5"
              )} />
            </button>
          </div>

          {/* Crédito tributario IVA global */}
          <div className="flex items-center justify-between py-2 border-t border-gray-800">
            <div>
              <p className="text-sm text-white font-medium">Crédito tributario IVA</p>
              <p className="text-xs text-gray-500">Toggle global — sincroniza todas las líneas</p>
            </div>
            <button
              onClick={() => {
                const nuevo = !creditoTributarioIva;
                setCreditoTributarioIva(nuevo);
                setImpuestos(prev => prev.map(i => ({
                  ...i,
                  aplicaCredito: i.valor > 0 ? nuevo : false,
                })));
              }}
              className={clsx(
                "w-10 h-5 rounded-full transition-colors relative shrink-0",
                creditoTributarioIva ? "bg-indigo-600" : "bg-gray-700"
              )}
            >
              <span className={clsx(
                "absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all shadow-sm",
                creditoTributarioIva ? "left-5" : "left-0.5"
              )} />
            </button>
          </div>

          {/* Notas */}
          <div className="border-t border-gray-800 pt-3">
            <label className="block text-xs text-gray-500 mb-1.5">Notas</label>
            <textarea
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              placeholder="Observaciones, referencia interna, etc."
              rows={2}
              className="w-full px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500 text-sm resize-none"
            />
          </div>

          {error && (
            <p className="text-xs text-red-400 bg-red-400/10 px-3 py-2 rounded-lg">{error}</p>
          )}

          <div className="flex gap-3 pt-1">
            <button
              onClick={onClose}
              className="flex-1 py-2.5 rounded-lg border border-gray-700 text-gray-400 hover:text-white text-sm transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={guardar}
              disabled={saving}
              className="flex-1 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-medium transition-colors flex items-center justify-center gap-2"
            >
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
              Guardar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Página principal ───────────────────────────────────────────────────────────
export default function FacturasRecibidasPage() {
  const router = useRouter();

  const hoy    = new Date().toISOString().split("T")[0];
  const hace45 = new Date(Date.now() - 44 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

  const [facturas,     setFacturas]     = useState<FacturaRecibida[]>([]);
  const [resumen,      setResumen]      = useState<Resumen | null>(null);
  const [loading,      setLoading]      = useState(true);
  const [fechaInicio,  setFechaInicio]  = useState(hace45);
  const [fechaFin,     setFechaFin]     = useState(hoy);
  const [query,        setQuery]        = useState("");
  const [editando,     setEditando]     = useState<FacturaRecibida | null>(null);
  const [expandida,    setExpandida]    = useState<string | null>(null);
  const [resumenOpen,  setResumenOpen]  = useState(false);

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
      setFacturas(res.data.data    ?? []);
      setResumen(res.data.resumen  ?? null);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [fechaInicio, fechaFin, diasRango]);

  useEffect(() => { cargar(); }, [cargar]);

  const filtradas = facturas.filter((f) =>
    !query ||
    f.razon_social_proveedor?.toLowerCase().includes(query.toLowerCase()) ||
    f.ruc_proveedor?.includes(query) ||
    f.numero_doc?.includes(query)
  );

  return (
    <div className="p-4 md:p-6 space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Facturas Recibidas</h1>
          <p className="text-sm text-gray-500">{facturas.length} registradas en el período</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={cargar}
            className="p-2 rounded-lg border border-gray-700 text-gray-400 hover:text-white transition-colors"
          >
            <RefreshCw size={16} />
          </button>
          <button
            onClick={() => router.push("/documentos/recibidos/nueva")}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium transition-colors"
          >
            <Plus size={15} />
            Registrar
          </button>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por proveedor, RUC o número..."
            className="w-full pl-9 pr-4 py-2.5 rounded-lg bg-gray-900 border border-gray-800 text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500 text-sm"
          />
        </div>
        <div className="flex gap-2 items-center shrink-0">
          <input
            type="date"
            value={fechaInicio}
            onChange={(e) => setFechaInicio(e.target.value)}
            className="px-3 py-2 rounded-lg bg-gray-900 border border-gray-800 text-white text-sm focus:outline-none focus:border-indigo-500"
          />
          <span className="text-gray-600 text-xs">—</span>
          <input
            type="date"
            value={fechaFin}
            onChange={(e) => setFechaFin(e.target.value)}
            className="px-3 py-2 rounded-lg bg-gray-900 border border-gray-800 text-white text-sm focus:outline-none focus:border-indigo-500"
          />
        </div>
      </div>
      {diasRango > 45 && (
        <p className="text-xs text-amber-400">El rango máximo es 45 días.</p>
      )}

      {/* Resumen fiscal desplegable */}
      {resumen && resumen.total_documentos > 0 && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          <button
            onClick={() => setResumenOpen(!resumenOpen)}
            className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-800/50 transition-colors"
          >
            <div className="flex items-center gap-2">
              <TrendingUp size={15} className="text-emerald-400" />
              <span className="text-sm font-semibold text-white">Resumen fiscal</span>
              {resumen.periodo && (
                <span className="text-xs text-gray-500">
                  {resumen.periodo.desde} → {resumen.periodo.hasta}
                </span>
              )}
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-gray-400 hidden sm:block">
                Compras <span className="text-white font-medium">${fmt(resumen.importe_total)}</span>
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
            <div className="px-4 pb-4 border-t border-gray-800">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-3">

                {/* Totales generales */}
                <div className="bg-gray-950/60 border border-gray-800 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-gray-400/10 text-gray-400">
                      COMPRAS
                    </span>
                    <h3 className="text-xs font-semibold text-white">Total período</h3>
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
                    <div className="flex justify-between text-xs text-gray-500 pt-1 border-t border-gray-800">
                      <span>Documentos</span>
                      <span>{resumen.total_documentos}</span>
                    </div>
                  </div>
                </div>

                {/* Desglose por tarifa IVA */}
                {(resumen.desglose_iva ?? []).length > 0 && (
                  <div className="bg-gray-950/60 border border-gray-800 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-indigo-400/10 text-indigo-400">
                        IVA
                      </span>
                      <h3 className="text-xs font-semibold text-white">Desglose por tarifa</h3>
                    </div>
                    <div className="space-y-2">
                      {resumen.desglose_iva!.map((imp: any, i: number) => (
                        <div key={i} className="space-y-0.5">
                          <div className="flex justify-between text-xs text-gray-400">
                            <span>Subtotal {imp.tarifa}%</span>
                            <span>${fmt(imp.subtotal)}</span>
                          </div>
                          {parseFloat(imp.iva) > 0 && (
                            <>
                              <div className="flex justify-between text-xs text-gray-500 pl-3">
                                <span>IVA {imp.tarifa}%</span>
                                <span>${fmt(imp.iva)}</span>
                              </div>
                              {parseFloat(imp.con_credito) > 0 && (
                                <div className="flex justify-between text-xs text-indigo-400 pl-3">
                                  <span>→ Con crédito trib.</span>
                                  <span>${fmt(imp.con_credito)}</span>
                                </div>
                              )}
                            </>
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
      ) : filtradas.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <FileText size={40} className="text-gray-700 mb-3" />
          <p className="text-gray-500 text-sm">
            {query ? "No hay facturas que coincidan." : "Sin facturas recibidas en este período."}
          </p>
          {!query && (
            <button
              onClick={() => router.push("/documentos/recibidos/nueva")}
              className="mt-4 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium transition-colors"
            >
              Registrar primera factura
            </button>
          )}
        </div>
      ) : (
        <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
          <div className="divide-y divide-gray-800">
            {filtradas.map((f) => {
              const expanded = expandida === f.id;
              const creditoTotal = (f.impuestos_detalle ?? [])
                .filter(i => i.aplicaCredito)
                .reduce((s, i) => s + i.valor, 0);

              return (
                <div key={f.id}>
                  {/* Fila principal */}
                  <div className="flex items-center gap-3 px-4 py-3 hover:bg-gray-800/50 transition-colors">
                    <div
                      className="flex-1 min-w-0 cursor-pointer"
                      onClick={() => setExpandida(expanded ? null : f.id)}
                    >
                      <div className="flex items-center gap-2">
                        <p className="text-sm text-white font-medium truncate">
                          {f.razon_social_proveedor}
                        </p>
                        <div className="flex gap-1 shrink-0">
                          {f.deducible_renta && (
                            <span className="text-[10px] text-emerald-400 bg-emerald-400/10 px-1.5 py-0.5 rounded">
                              Renta
                            </span>
                          )}
                          {f.credito_tributario_iva && (
                            <span className="text-[10px] text-indigo-400 bg-indigo-400/10 px-1.5 py-0.5 rounded">
                              Crédito IVA
                            </span>
                          )}
                        </div>
                      </div>
                      <p className="text-xs text-gray-500">
                        {f.numero_doc} · {f.fecha_emision}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-semibold text-white">${fmt(f.importe_total)}</p>
                      {creditoTotal > 0 && (
                        <p className="text-xs text-indigo-400">CT: ${fmt(creditoTotal)}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => setEditando(f)}
                        className="p-1.5 rounded text-gray-500 hover:text-white hover:bg-gray-700 transition-colors"
                        title="Editar clasificación"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        onClick={() => setExpandida(expanded ? null : f.id)}
                        className="p-1.5 rounded text-gray-500 hover:text-white hover:bg-gray-700 transition-colors"
                      >
                        {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      </button>
                    </div>
                  </div>

                  {/* Expansión — desglose de impuestos */}
                  {expanded && (
                    <div className="px-4 pb-3 bg-gray-800/30 border-t border-gray-800/50">
                      <div className="pt-3 space-y-2">
                        {/* Impuestos por línea */}
                        {(f.impuestos_detalle ?? []).length > 0 && (
                          <div className="space-y-1">
                            {f.impuestos_detalle.map((imp, idx) => (
                              <div key={idx} className="flex items-center justify-between text-xs">
                                <span className="text-gray-500">
                                  IVA {imp.tarifa}% — base ${fmt(imp.baseImponible)}
                                </span>
                                <div className="flex items-center gap-2">
                                  {imp.valor > 0 && (
                                    <span className="text-gray-400">${fmt(imp.valor)}</span>
                                  )}
                                  {imp.valor > 0 && (
                                    <span className={clsx(
                                      "px-2 py-0.5 rounded-full text-[10px] font-medium",
                                      imp.aplicaCredito
                                        ? "text-indigo-400 bg-indigo-400/10"
                                        : "text-gray-600 bg-gray-800"
                                    )}>
                                      {imp.aplicaCredito ? "Crédito trib." : "Sin crédito"}
                                    </span>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Notas */}
                        {f.notas && (
                          <p className="text-xs text-gray-500 pt-2 border-t border-gray-800/50">
                            {f.notas}
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Modal edición */}
      {editando && (
        <EditModal
          factura={editando}
          onClose={() => setEditando(null)}
          onSaved={cargar}
        />
      )}
    </div>
  );
}