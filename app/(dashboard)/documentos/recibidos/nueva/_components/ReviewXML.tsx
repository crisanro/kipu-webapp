// app/(dashboard)/documentos/recibidos/nueva/_components/ReviewXML.tsx
"use client";
import { useState, useCallback } from "react";
import api from "@/lib/api";
import {
  X, ChevronDown, ChevronUp, FileText, Link2, Loader2, AlertTriangle,
} from "lucide-react";
import { clsx } from "clsx";

// ── Tipos ─────────────────────────────────────────────────────────────────────
export interface ItemDetalle {
  descripcion:            string;
  cantidad:               number;
  precio_unitario:        number;
  descuento:              number;
  subtotal:               number;
  tarifa_iva:             number;
  valor_iva:              number;
  total:                  number;
  deducible_renta:        boolean;
  credito_tributario_iva: boolean;
}

export interface DocParseado {
  tipo_doc:               string;
  cod_doc:                string;
  clave_acceso:           string;
  numero_doc:             string;
  fecha_emision:          string;
  fecha_autorizacion:     string | null;
  ruc_proveedor:          string;
  razon_social_proveedor: string;
  importe_total:          number;
  items_detalle:          ItemDetalle[];
  impuestos_detalle:      any[];
  deducible_renta:        boolean;
  credito_tributario_iva: boolean;
  datos:                  any;
  errores:                string[];
}

interface DocVinculo {
  id:            string;
  numero_doc:    string;
  tipo_doc:      string;
  importe_total: number;
  razon_social:  string;
}

interface Props {
  parsed:    DocParseado;
  xmlFile:   File;
  onBack:    () => void;
  onDone:    () => void;
  suscripcionActiva: boolean;
}

const fmt = (n: any) => parseFloat(String(n ?? 0)).toFixed(2);

const TIPO_LABEL: Record<string, string> = {
  FAC: "Factura", NCR: "Nota de Crédito",
  NDB: "Nota de Débito", RET: "Retención",
};

const TIPO_COLOR: Record<string, string> = {
  FAC: "bg-gray-400/10 text-gray-400",
  NCR: "bg-purple-400/10 text-purple-400",
  NDB: "bg-amber-400/10 text-amber-400",
  RET: "bg-blue-400/10 text-blue-400",
};

export default function ReviewXML({ parsed, xmlFile, onBack, onDone, suscripcionActiva }: Props) {
  const [items,   setItems]   = useState<ItemDetalle[]>(parsed.items_detalle);
  const [notas,   setNotas]   = useState("");
  const [saving,  setSaving]  = useState(false);
  const [error,   setError]   = useState("");
  const [showItems,   setShowItems]   = useState(false);
  const [vinculoQuery,    setVinculoQuery]    = useState("");
  const [vinculoResults,  setVinculoResults]  = useState<DocVinculo[]>([]);
  const [vinculoSelected, setVinculoSelected] = useState<DocVinculo | null>(null);
  const [vinculoLoading,  setVinculoLoading]  = useState(false);

  const necesitaVinculo = (tipo: string) => ["NCR", "NDB", "RET"].includes(tipo);
  const vinculoLabel    = (tipo: string) => {
    if (tipo === "RET") return "FAC/LIQ que nosotros emitimos";
    return "FAC recibida que modifica";
  };

  const buscarVinculo = useCallback(async (q: string, tipo: string) => {
    if (!q || q.length < 3) { setVinculoResults([]); return; }
    setVinculoLoading(true);
    try {
      const endpoint = tipo === "RET"
        ? `/api/v1/app/documentos?estado_sri=AUTORIZADO&q=${encodeURIComponent(q)}&limit=6`
        : `/api/v1/app/recibidos?q=${encodeURIComponent(q)}&limit=6`;
      const res  = await api.get(endpoint);
      const rows = res.data.data ?? [];
      setVinculoResults(rows.map((d: any) => ({
        id: d.id, numero_doc: d.numero_doc, tipo_doc: d.tipo_doc || "FAC",
        importe_total: d.importe_total,
        razon_social: d.razon_social || d.razon_social_proveedor || "",
      })));
    } catch { setVinculoResults([]); }
    finally { setVinculoLoading(false); }
  }, []);

  const editItem = (idx: number, field: "deducible_renta" | "credito_tributario_iva", val: boolean) => {
    setItems(prev => prev.map((item, i) => i === idx ? { ...item, [field]: val } : item));
  };

  const guardar = async () => {
    setSaving(true); setError("");
    try {
      const formData = new FormData();
      formData.append("file", xmlFile);
      const resXml = await api.post("/api/v1/app/recibidos/xml", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      const docId   = resXml.data.id;
      const payload: any = {
        items_detalle:          items,
        deducible_renta:        items.some(i => i.deducible_renta),
        credito_tributario_iva: items.some(i => i.credito_tributario_iva),
        notas:                  notas || null,
      };
      if (vinculoSelected) {
        if (parsed.tipo_doc === "RET") payload.doc_origen_emitido_id  = vinculoSelected.id;
        else                           payload.doc_origen_recibido_id = vinculoSelected.id;
      }
      await api.patch(`/api/v1/app/recibidos/${docId}`, payload);
      onDone();
    } catch (err: any) {
      const detail = err?.response?.data?.detail;
      setError(typeof detail === "string" ? detail : "Error al guardar.");
    } finally { setSaving(false); }
  };

  const totalDeducible = items.filter(i => i.deducible_renta).reduce((s, i) => s + i.subtotal, 0);
  const totalCredito   = items.filter(i => i.credito_tributario_iva).reduce((s, i) => s + i.valor_iva, 0);

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto space-y-4">

      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={onBack}
          className="p-2 rounded-lg border border-gray-700 text-gray-400 hover:text-white transition-colors">
          <X size={16} />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className={clsx("text-xs px-2 py-0.5 rounded-full font-bold", TIPO_COLOR[parsed.tipo_doc])}>
              {parsed.tipo_doc}
            </span>
            <h1 className="text-lg font-bold text-white">{parsed.numero_doc}</h1>
          </div>
          <p className="text-sm text-gray-500">{parsed.razon_social_proveedor}</p>
        </div>
        <div className="text-right">
          <p className="text-lg font-bold text-white">${fmt(parsed.importe_total)}</p>
          <p className="text-xs text-gray-500">{parsed.fecha_emision}</p>
        </div>
      </div>

      {/* Proveedor */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Proveedor</h2>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div><p className="text-xs text-gray-500">Razón social</p><p className="text-white">{parsed.razon_social_proveedor}</p></div>
          <div><p className="text-xs text-gray-500">RUC</p><p className="text-white font-mono">{parsed.ruc_proveedor}</p></div>
          <div><p className="text-xs text-gray-500">Número</p><p className="text-white font-mono">{parsed.numero_doc}</p></div>
          <div><p className="text-xs text-gray-500">Fecha emisión</p><p className="text-white">{parsed.fecha_emision}</p></div>
        </div>
      </div>

      {/* Vínculo */}
      {necesitaVinculo(parsed.tipo_doc) && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <Link2 size={14} className="text-indigo-400" />
            <h2 className="text-sm font-semibold text-white">Vincular a {vinculoLabel(parsed.tipo_doc)}</h2>
            <span className="text-xs text-gray-600">(opcional)</span>
          </div>
          {vinculoSelected ? (
            <div className="flex items-center gap-3 bg-gray-800 rounded-lg px-3 py-2.5">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className={clsx("text-[10px] px-1.5 py-0.5 rounded font-bold", TIPO_COLOR[vinculoSelected.tipo_doc])}>
                    {vinculoSelected.tipo_doc}
                  </span>
                  <p className="text-sm text-white font-mono">{vinculoSelected.numero_doc}</p>
                </div>
                <p className="text-xs text-gray-500">{vinculoSelected.razon_social} · ${fmt(vinculoSelected.importe_total)}</p>
              </div>
              <button onClick={() => setVinculoSelected(null)} className="text-gray-500 hover:text-white p-1 transition-colors">
                <X size={14} />
              </button>
            </div>
          ) : (
            <div className="relative">
              <input
                value={vinculoQuery}
                onChange={e => { setVinculoQuery(e.target.value); buscarVinculo(e.target.value, parsed.tipo_doc); }}
                placeholder="Buscar por número o proveedor..."
                className="w-full px-3 py-2.5 rounded-lg bg-gray-800 border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 text-sm"
              />
              {vinculoLoading && <Loader2 size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 animate-spin" />}
              {vinculoResults.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-gray-800 border border-gray-700 rounded-lg shadow-xl overflow-hidden max-h-48 overflow-y-auto">
                  {vinculoResults.map(d => (
                    <button key={d.id}
                      onClick={() => { setVinculoSelected(d); setVinculoQuery(""); setVinculoResults([]); }}
                      className="w-full flex items-center justify-between gap-3 px-4 py-2.5 hover:bg-gray-700 text-left border-b border-gray-700/50 last:border-0">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className={clsx("text-[10px] px-1.5 py-0.5 rounded font-bold shrink-0", TIPO_COLOR[d.tipo_doc])}>
                          {d.tipo_doc}
                        </span>
                        <div className="min-w-0">
                          <p className="text-sm text-white font-mono">{d.numero_doc}</p>
                          <p className="text-xs text-gray-500 truncate">{d.razon_social}</p>
                        </div>
                      </div>
                      <span className="text-sm font-bold text-indigo-400 shrink-0">${fmt(d.importe_total)}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Ítems */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <button onClick={() => setShowItems(!showItems)}
          className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-800/50 transition-colors">
          <div className="flex items-center gap-2">
            <FileText size={14} className="text-gray-400" />
            <span className="text-sm font-semibold text-white">{items.length} ítem{items.length !== 1 ? "s" : ""}</span>
            <span className="text-xs text-gray-500">— Clasificación fiscal por línea</span>
          </div>
          {showItems ? <ChevronUp size={16} className="text-gray-500" /> : <ChevronDown size={16} className="text-gray-500" />}
        </button>
        {showItems && (
          <div className="border-t border-gray-800 divide-y divide-gray-800">
            <div className="grid grid-cols-12 gap-2 px-4 py-2 text-[10px] uppercase font-semibold tracking-wider text-gray-600">
              <div className="col-span-4">Descripción</div>
              <div className="col-span-2 text-right">Subtotal</div>
              <div className="col-span-2 text-right">IVA</div>
              <div className="col-span-2 text-center">Deducible</div>
              <div className="col-span-2 text-center">Crédito IVA</div>
            </div>
            {items.map((item, idx) => (
              <div key={idx} className="grid grid-cols-12 gap-2 px-4 py-2.5 items-center hover:bg-gray-800/30">
                <div className="col-span-4">
                  <p className="text-xs text-white truncate">{item.descripcion}</p>
                  <p className="text-[10px] text-gray-600">{item.cantidad} × ${fmt(item.precio_unitario)}</p>
                </div>
                <div className="col-span-2 text-right text-xs text-gray-400">${fmt(item.subtotal)}</div>
                <div className="col-span-2 text-right text-xs text-gray-400">
                  {item.tarifa_iva > 0 ? `${item.tarifa_iva}% $${fmt(item.valor_iva)}` : "—"}
                </div>
                <div className="col-span-2 flex justify-center">
                  <button onClick={() => editItem(idx, "deducible_renta", !item.deducible_renta)}
                    className={clsx("w-8 h-4 rounded-full transition-colors relative", item.deducible_renta ? "bg-emerald-600" : "bg-gray-700")}>
                    <span className={clsx("absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all", item.deducible_renta ? "left-4" : "left-0.5")} />
                  </button>
                </div>
                <div className="col-span-2 flex justify-center">
                  {item.tarifa_iva > 0 ? (
                    <button onClick={() => editItem(idx, "credito_tributario_iva", !item.credito_tributario_iva)}
                      className={clsx("w-8 h-4 rounded-full transition-colors relative", item.credito_tributario_iva ? "bg-indigo-600" : "bg-gray-700")}>
                      <span className={clsx("absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all", item.credito_tributario_iva ? "left-4" : "left-0.5")} />
                    </button>
                  ) : <span className="text-[10px] text-gray-700">N/A</span>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Resumen fiscal */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Resumen fiscal</h2>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between text-gray-400">
            <span>Total documento</span>
            <span className="text-white font-bold">${fmt(parsed.importe_total)}</span>
          </div>
          {parsed.tipo_doc !== "RET" && (
            <div className="flex justify-between text-gray-400">
              <span>Deducible renta</span>
              <span className="text-emerald-400">${fmt(totalDeducible)}</span>
            </div>
          )}
          <div className="flex justify-between text-gray-400">
            <span>Crédito tributario IVA</span>
            <span className="text-indigo-400">${fmt(totalCredito)}</span>
          </div>
        </div>
        <div className="mt-3 pt-3 border-t border-gray-800">
          <label className="block text-xs text-gray-500 mb-1.5">Notas (opcional)</label>
          <textarea value={notas} onChange={e => setNotas(e.target.value)}
            placeholder="Observaciones, referencia interna, etc." rows={2}
            className="w-full px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500 text-sm resize-none" />
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-2 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2.5">
          <AlertTriangle size={14} className="text-red-400 shrink-0 mt-0.5" />
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      <button onClick={guardar} disabled={saving || !suscripcionActiva}
        className="w-full py-3 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold text-sm transition-colors flex items-center justify-center gap-2">
        {saving
          ? <><Loader2 size={16} className="animate-spin" /> Guardando...</>
          : `Registrar ${TIPO_LABEL[parsed.tipo_doc] ?? parsed.tipo_doc} · $${fmt(parsed.importe_total)}`
        }
      </button>
    </div>
  );
}