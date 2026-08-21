// app/(dashboard)/documentos/recibidos/[id]/page.tsx
"use client";
import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft, Loader2, FileText, Download, Pencil,
  CheckCircle2, Clock, AlertTriangle, X, Save,
  Link2, Shield, Receipt
} from "lucide-react";
import { clsx } from "clsx";
import api from "@/lib/api";

const fmt = (n: any) => parseFloat(String(n ?? 0)).toFixed(2);

const TIPO_LABEL: Record<string, string> = {
  FAC: "Factura",
  LIQ: "Liquidación de Compra",
  NCR: "Nota de Crédito",
  NDB: "Nota de Débito",
  RET: "Retención",
};

const TIPO_COLOR: Record<string, string> = {
  FAC: "bg-gray-400/10 text-gray-400",
  LIQ: "bg-cyan-400/10 text-cyan-400",
  NCR: "bg-purple-400/10 text-purple-400",
  NDB: "bg-amber-400/10 text-amber-400",
  RET: "bg-blue-400/10 text-blue-400",
};

const PAGO_CONFIG: Record<string, { label: string; color: string }> = {
  PENDIENTE: { label: "Por pagar",  color: "text-amber-400"   },
  PAGADO:    { label: "Pagado",     color: "text-emerald-400" },
  PARCIAL:   { label: "Parcial",    color: "text-blue-400"    },
  ANULADO:   { label: "Anulado",    color: "text-red-400"     },
};

// ── Modal edición clasificación ───────────────────────────────────────────────
function ModalClasificacion({ doc, onClose, onSaved }: {
  doc:     any;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [items,   setItems]   = useState<any[]>(doc.items_detalle ?? []);
  const [notas,   setNotas]   = useState(doc.notas ?? "");
  const [saving,  setSaving]  = useState(false);
  const [error,   setError]   = useState("");

  const editItem = (idx: number, field: string, val: boolean) => {
    setItems(prev => prev.map((item, i) =>
      i === idx ? { ...item, [field]: val } : item
    ));
  };

  const guardar = async () => {
    setSaving(true); setError("");
    try {
      await api.patch(`/api/v1/app/recibidos/${doc.id}`, {
        items_detalle:          items,
        deducible_renta:        items.some(i => i.deducible_renta),
        credito_tributario_iva: items.some(i => i.credito_tributario_iva),
        notas:                  notas || null,
      });
      onSaved();
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.detail ?? "Error al guardar.");
    } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
      <div className="bg-gray-900 border border-gray-800 rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800 sticky top-0 bg-gray-900">
          <h2 className="text-sm font-semibold text-white">Clasificación fiscal</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-white">
            <X size={18} />
          </button>
        </div>
        <div className="p-5 space-y-4">
          {items.length > 0 ? (
            <div className="space-y-2">
              <div className="grid grid-cols-12 gap-2 text-[10px] uppercase font-semibold tracking-wider text-gray-600 px-1">
                <div className="col-span-5">Descripción</div>
                <div className="col-span-2 text-right">Subtotal</div>
                <div className="col-span-2 text-right">IVA</div>
                <div className="col-span-1.5 text-center">Ded.</div>
                <div className="col-span-1.5 text-center">CT IVA</div>
              </div>
              {items.map((item, idx) => (
                <div key={idx} className="grid grid-cols-12 gap-2 items-center bg-gray-800/40 rounded-lg px-3 py-2.5">
                  <div className="col-span-5">
                    <p className="text-xs text-white truncate">{item.descripcion}</p>
                    <p className="text-[10px] text-gray-600">
                      {item.cantidad} × ${fmt(item.precio_unitario)}
                    </p>
                  </div>
                  <div className="col-span-2 text-right text-xs text-gray-400">
                    ${fmt(item.subtotal)}
                  </div>
                  <div className="col-span-2 text-right text-xs text-gray-400">
                    {item.tarifa_iva > 0 ? `${item.tarifa_iva}% $${fmt(item.valor_iva)}` : "—"}
                  </div>
                  <div className="col-span-1 flex justify-center">
                    <button onClick={() => editItem(idx, "deducible_renta", !item.deducible_renta)}
                      className={clsx("w-8 h-4 rounded-full transition-colors relative",
                        item.deducible_renta ? "bg-emerald-600" : "bg-gray-700")}>
                      <span className={clsx("absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all",
                        item.deducible_renta ? "left-4" : "left-0.5")} />
                    </button>
                  </div>
                  <div className="col-span-2 flex justify-center">
                    {item.tarifa_iva > 0 ? (
                      <button onClick={() => editItem(idx, "credito_tributario_iva", !item.credito_tributario_iva)}
                        className={clsx("w-8 h-4 rounded-full transition-colors relative",
                          item.credito_tributario_iva ? "bg-indigo-600" : "bg-gray-700")}>
                        <span className={clsx("absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all",
                          item.credito_tributario_iva ? "left-4" : "left-0.5")} />
                      </button>
                    ) : (
                      <span className="text-[10px] text-gray-700">N/A</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500 text-center py-4">Sin ítems registrados.</p>
          )}

          <div className="border-t border-gray-800 pt-3">
            <label className="block text-xs text-gray-500 mb-1.5">Notas</label>
            <textarea value={notas} onChange={e => setNotas(e.target.value)}
              rows={2} placeholder="Observaciones internas..."
              className="w-full px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white text-sm resize-none focus:outline-none focus:border-indigo-500" />
          </div>

          {error && <p className="text-xs text-red-400 bg-red-400/10 px-3 py-2 rounded-lg">{error}</p>}

          <div className="flex gap-3">
            <button onClick={onClose}
              className="flex-1 py-2.5 rounded-lg border border-gray-700 text-gray-400 text-sm">
              Cancelar
            </button>
            <button onClick={guardar} disabled={saving}
              className="flex-1 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-medium flex items-center justify-center gap-2">
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
              Guardar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Página principal ──────────────────────────────────────────────────────────
export default function DetalleRecibidoPage() {
  const { id }  = useParams();
  const router  = useRouter();

  const [doc,     setDoc]     = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [editando, setEditando] = useState(false);

  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get(`/api/v1/app/recibidos/${id}`);
      setDoc(res.data.data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [id]);

  useEffect(() => { cargar(); }, [cargar]);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 size={24} className="animate-spin text-indigo-400" />
    </div>
  );

  if (!doc) return (
    <div className="p-6 text-center">
      <FileText size={40} className="text-gray-700 mx-auto mb-3" />
      <p className="text-gray-500">Documento no encontrado.</p>
      <button onClick={() => router.back()} className="mt-4 text-indigo-400 text-sm">Volver</button>
    </div>
  );

  const pago          = doc.estado_pago ? PAGO_CONFIG[doc.estado_pago] : null;
  const totalDeducible = (doc.items_detalle ?? []).filter((i: any) => i.deducible_renta).reduce((s: number, i: any) => s + i.subtotal, 0);
  const totalCredito   = (doc.items_detalle ?? []).filter((i: any) => i.credito_tributario_iva).reduce((s: number, i: any) => s + i.valor_iva, 0);
  const base_url      = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto space-y-4">

      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()}
          className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors">
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className={clsx("text-xs px-2 py-0.5 rounded-full font-bold", TIPO_COLOR[doc.tipo_doc])}>
              {doc.tipo_doc}
            </span>
            <h1 className="text-xl font-bold text-white font-mono">{doc.numero_doc}</h1>
          </div>
          <p className="text-sm text-gray-500">{doc.razon_social_proveedor}</p>
        </div>
        <div className="text-right">
          <p className="text-xl font-bold text-white">${fmt(doc.importe_total)}</p>
          <p className="text-xs text-gray-500">{doc.fecha_emision}</p>
        </div>
      </div>

      {/* Proveedor */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Proveedor</h2>
        <div className="grid grid-cols-2 gap-3 text-sm">
          {[
            { label: "Razón social", value: doc.razon_social_proveedor },
            { label: "RUC",          value: doc.ruc_proveedor },
            { label: "N° documento", value: doc.numero_doc },
            { label: "Fecha",        value: doc.fecha_emision },
            { label: "Fuente",       value: doc.fuente },
            { label: "Autorización", value: doc.fecha_autorizacion ? new Date(doc.fecha_autorizacion).toLocaleDateString("es-EC") : "—" },
          ].map(({ label, value }) => (
            <div key={label}>
              <p className="text-xs text-gray-500">{label}</p>
              <p className="text-white font-medium truncate">{value || "—"}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Clasificación fiscal */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Shield size={14} className="text-indigo-400" />
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Clasificación fiscal</h2>
          </div>
          <button onClick={() => setEditando(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs transition-colors border border-gray-700">
            <Pencil size={12} /> Editar
          </button>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="bg-gray-800/60 rounded-lg p-3 text-center">
            <p className="text-xs text-gray-500 mb-1">Total</p>
            <p className="text-base font-bold text-white">${fmt(doc.importe_total)}</p>
          </div>
          <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-lg p-3 text-center">
            <p className="text-xs text-gray-500 mb-1">Deducible renta</p>
            <p className="text-base font-bold text-emerald-400">${fmt(totalDeducible)}</p>
          </div>
          <div className="bg-indigo-500/5 border border-indigo-500/20 rounded-lg p-3 text-center">
            <p className="text-xs text-gray-500 mb-1">Crédito trib. IVA</p>
            <p className="text-base font-bold text-indigo-400">${fmt(totalCredito)}</p>
          </div>
        </div>

        {/* Ítems */}
        {(doc.items_detalle ?? []).length > 0 && (
          <div className="mt-3 pt-3 border-t border-gray-800 space-y-2">
            {doc.items_detalle.map((item: any, idx: number) => (
              <div key={idx} className="flex items-center gap-3 text-xs">
                <div className="flex-1 min-w-0">
                  <p className="text-white truncate">{item.descripcion}</p>
                  <p className="text-gray-600">{item.cantidad} × ${fmt(item.precio_unitario)}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-gray-400">${fmt(item.subtotal)}</p>
                  {item.tarifa_iva > 0 && (
                    <p className="text-gray-600">IVA {item.tarifa_iva}% ${fmt(item.valor_iva)}</p>
                  )}
                </div>
                <div className="flex gap-1.5 shrink-0">
                  {item.deducible_renta && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400">Ded.</span>
                  )}
                  {item.credito_tributario_iva && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-400">CT</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {doc.notas && (
          <p className="mt-3 pt-3 border-t border-gray-800 text-xs text-gray-500">{doc.notas}</p>
        )}
      </div>

      {/* Estado de pago al proveedor — solo FAC/LIQ */}
      {["FAC", "LIQ"].includes(doc.tipo_doc) && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Receipt size={14} className="text-gray-500" />
              <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Pago al proveedor</h2>
            </div>
            {pago && <span className={clsx("text-sm font-semibold", pago.color)}>{pago.label}</span>}
          </div>
          {doc.forma_pago && (
            <div className="mt-3 space-y-1.5 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Forma de pago</span>
                <span className="text-white">{doc.forma_pago}</span>
              </div>
              {doc.numero_comprobante_pago && (
                <div className="flex justify-between">
                  <span className="text-gray-500">N° comprobante</span>
                  <span className="text-white font-mono text-xs">{doc.numero_comprobante_pago}</span>
                </div>
              )}
              {doc.fecha_pago && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Fecha de pago</span>
                  <span className="text-white">{doc.fecha_pago}</span>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Documento origen — NCR/NDB vinculada a FAC recibida */}
      {doc.doc_origen_recibido_id && (
        <div className="bg-purple-500/5 border border-purple-500/20 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Link2 size={13} className="text-purple-400" />
            <h2 className="text-xs font-semibold text-purple-400 uppercase tracking-wider">
              Documento que modifica
            </h2>
          </div>
          <button onClick={() => router.push(`/documentos/recibidos/${doc.doc_origen_recibido_id}`)}
            className="text-sm text-indigo-400 hover:text-indigo-300 transition-colors">
            Ver documento recibido →
          </button>
        </div>
      )}

      {/* RET recibida → FAC/LIQ emitida */}
      {doc.doc_origen_emitido_id && (
        <div className="bg-blue-500/5 border border-blue-500/20 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Link2 size={13} className="text-blue-400" />
            <h2 className="text-xs font-semibold text-blue-400 uppercase tracking-wider">
              Documento retenido
            </h2>
          </div>
          <button onClick={() => router.push(`/documentos/${doc.doc_origen_emitido_id}`)}
            className="text-sm text-indigo-400 hover:text-indigo-300 transition-colors">
            Ver comprobante emitido →
          </button>
        </div>
      )}

      {/* RET emitida desde este documento */}
      {doc.retencion_emitida && (
        <div className="bg-yellow-500/5 border border-yellow-500/20 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 size={13} className="text-yellow-400" />
              <h2 className="text-xs font-semibold text-yellow-400 uppercase tracking-wider">
                Retención emitida
              </h2>
            </div>
            <button onClick={() => router.push(`/documentos/${doc.retencion_emitida.id}`)}
              className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors">
              Ver →
            </button>
          </div>
          <p className="text-sm text-white font-mono mt-2">{doc.retencion_emitida.numero_doc}</p>
          <p className={clsx("text-xs mt-0.5",
            doc.retencion_emitida.estado_sri === "AUTORIZADO" ? "text-emerald-400" : "text-amber-400")}>
            {doc.retencion_emitida.estado_sri}
          </p>
        </div>
      )}

      {/* Acciones */}
      <div className="flex gap-2 flex-wrap">
        {/* Descargar XML original */}
        {doc.xml_path && (
          <a href={`${base_url}/api/v1/app/recibidos/${doc.id}/xml`}
            download
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs border border-gray-700 transition-colors">
            <Download size={13} /> Descargar XML
          </a>
        )}
        {/* Emitir RET — solo FAC/LIQ sin retención */}
        {["FAC", "LIQ"].includes(doc.tipo_doc) && !doc.retencion_emitida && (
          <button
            onClick={() => router.push(`/documentos/emitir/ret?doc_origen_recibido_id=${doc.id}`)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 text-xs border border-blue-500/20 transition-colors">
            RET · Emitir retención
          </button>
        )}
      </div>

      {/* Modal clasificación */}
      {editando && (
        <ModalClasificacion
          doc={doc}
          onClose={() => setEditando(false)}
          onSaved={cargar}
        />
      )}
    </div>
  );
}