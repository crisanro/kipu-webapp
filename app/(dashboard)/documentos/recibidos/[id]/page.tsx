"use client";
import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft, FileText, Download, Pencil,
  CheckCircle2, X, Save,
  Link2, Shield, Receipt
} from "lucide-react";
import api from "@/lib/api";

const fmt = (n: any) => parseFloat(String(n ?? 0)).toFixed(2);

const TIPO_LABEL: Record<string, string> = {
  FAC: "Factura",
  LIQ: "Liquidación de Compra",
  NCR: "Nota de Crédito",
  NDB: "Nota de Débito",
  RET: "Retención",
};

const TIPO_COLOR: Record<string, { color: string; bg: string }> = {
  FAC: { color: "var(--kipu-muted)", bg: "color-mix(in srgb, var(--kipu-muted) 10%, transparent)" },
  LIQ: { color: "#22d3ee", bg: "color-mix(in srgb, #22d3ee 10%, transparent)" },
  NCR: { color: "#c084fc", bg: "color-mix(in srgb, #c084fc 10%, transparent)" },
  NDB: { color: "var(--kipu-warning)", bg: "color-mix(in srgb, var(--kipu-warning) 10%, transparent)" },
  RET: { color: "#60a5fa", bg: "color-mix(in srgb, #60a5fa 10%, transparent)" },
};

const PAGO_CONFIG: Record<string, { label: string; color: string }> = {
  PENDIENTE: { label: "Por pagar", color: "var(--kipu-warning)" },
  PAGADO:    { label: "Pagado",    color: "var(--kipu-success)" },
  PARCIAL:   { label: "Parcial",   color: "#60a5fa" },
  ANULADO:   { label: "Anulado",   color: "var(--kipu-danger)" },
};

// ── Modal edición clasificación ───────────────────────────────────────────────
function ModalClasificacion({ doc, onClose, onSaved }: {
  doc:     any;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [items,  setItems]  = useState<any[]>(doc.items_detalle ?? []);
  const [notas,  setNotas]  = useState(doc.notas ?? "");
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState("");

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

  const totalDeducible = items.filter(i => i.deducible_renta).reduce((s, i) => s + i.subtotal, 0);
  const totalCredito   = items.filter(i => i.credito_tributario_iva).reduce((s, i) => s + i.valor_iva, 0);

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
      <div
        className="rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
        style={{
          background: "var(--kipu-surface)",
          border: "1px solid var(--kipu-border)",
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-4 sticky top-0"
          style={{
            background: "var(--kipu-surface)",
            borderBottom: "1px solid var(--kipu-border)",
          }}
        >
          <h2 className="text-sm font-semibold" style={{ color: "var(--kipu-text)" }}>
            Clasificación fiscal
          </h2>
          <button
            onClick={onClose}
            className="transition-colors"
            style={{ color: "var(--kipu-subtle)" }}
            onMouseEnter={e => e.currentTarget.style.color = "var(--kipu-text)"}
            onMouseLeave={e => e.currentTarget.style.color = "var(--kipu-subtle)"}
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Ítems — misma estructura que ReviewXML */}
          {items.length > 0 ? (
            <div
              className="rounded-xl overflow-hidden"
              style={{ border: "1px solid var(--kipu-border)" }}
            >
              {/* Header columnas */}
              <div
                className="grid grid-cols-12 gap-2 px-4 py-2 text-[10px] uppercase font-semibold tracking-wider"
                style={{
                  color: "var(--kipu-subtle)",
                  background: "color-mix(in srgb, var(--kipu-text) 4%, transparent)",
                }}
              >
                <div className="col-span-4">Descripción</div>
                <div className="col-span-2 text-right">Subtotal</div>
                <div className="col-span-2 text-right">IVA</div>
                <div className="col-span-2 text-center">Deducible</div>
                <div className="col-span-2 text-center">Crédito IVA</div>
              </div>

              {/* Filas */}
              <div>
                {items.map((item, idx) => (
                  <div
                    key={idx}
                    className="grid grid-cols-12 gap-2 px-4 py-2.5 items-center transition-colors"
                    style={{
                      borderTop: idx > 0 ? "1px solid var(--kipu-border)" : "none",
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = "color-mix(in srgb, var(--kipu-text) 3%, transparent)"}
                    onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                  >
                    <div className="col-span-4">
                      <p className="text-xs truncate" style={{ color: "var(--kipu-text)" }}>{item.descripcion}</p>
                      <p className="text-[10px]" style={{ color: "var(--kipu-subtle)" }}>
                        {item.cantidad} × ${fmt(item.precio_unitario)}
                      </p>
                    </div>
                    <div className="col-span-2 text-right text-xs" style={{ color: "var(--kipu-muted)" }}>
                      ${fmt(item.subtotal)}
                    </div>
                    <div className="col-span-2 text-right text-xs" style={{ color: "var(--kipu-muted)" }}>
                      {item.tarifa_iva > 0 ? `${item.tarifa_iva}% $${fmt(item.valor_iva)}` : "—"}
                    </div>
                    <div className="col-span-2 flex justify-center">
                      <button
                        type="button"
                        onClick={() => editItem(idx, "deducible_renta", !item.deducible_renta)}
                        className="w-8 h-4 rounded-full transition-colors relative"
                        style={{
                          background: item.deducible_renta
                            ? "var(--kipu-success)"
                            : "color-mix(in srgb, var(--kipu-text) 15%, transparent)",
                        }}
                      >
                        <span
                          className="absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all"
                          style={{ left: item.deducible_renta ? "16px" : "2px" }}
                        />
                      </button>
                    </div>
                    <div className="col-span-2 flex justify-center">
                      {item.tarifa_iva > 0 ? (
                        <button
                          type="button"
                          onClick={() => editItem(idx, "credito_tributario_iva", !item.credito_tributario_iva)}
                          className="w-8 h-4 rounded-full transition-colors relative"
                          style={{
                            background: item.credito_tributario_iva
                              ? "var(--kipu-accent)"
                              : "color-mix(in srgb, var(--kipu-text) 15%, transparent)",
                          }}
                        >
                          <span
                            className="absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all"
                            style={{ left: item.credito_tributario_iva ? "16px" : "2px" }}
                          />
                        </button>
                      ) : (
                        <span className="text-[10px]" style={{ color: "var(--kipu-subtle)" }}>N/A</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-sm text-center py-4" style={{ color: "var(--kipu-subtle)" }}>
              Sin ítems registrados.
            </p>
          )}

          {/* Resumen fiscal */}
          <div
            className="rounded-xl p-4 space-y-2 text-sm"
            style={{ background: "color-mix(in srgb, var(--kipu-text) 4%, transparent)" }}
          >
            <h3 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "var(--kipu-subtle)" }}>
              Resumen fiscal
            </h3>
            <div className="flex justify-between" style={{ color: "var(--kipu-muted)" }}>
              <span>Total documento</span>
              <span className="font-bold" style={{ color: "var(--kipu-text)" }}>${fmt(doc.importe_total)}</span>
            </div>
            {doc.tipo_doc !== "RET" && (
              <div className="flex justify-between" style={{ color: "var(--kipu-muted)" }}>
                <span>Deducible renta</span>
                <span style={{ color: "var(--kipu-success)" }}>${fmt(totalDeducible)}</span>
              </div>
            )}
            <div className="flex justify-between" style={{ color: "var(--kipu-muted)" }}>
              <span>Crédito tributario IVA</span>
              <span style={{ color: "var(--kipu-accent)" }}>${fmt(totalCredito)}</span>
            </div>
          </div>

          {/* Notas */}
          <div>
            <label className="block text-xs mb-1.5" style={{ color: "var(--kipu-subtle)" }}>Notas</label>
            <textarea
              value={notas}
              onChange={e => setNotas(e.target.value)}
              rows={2}
              placeholder="Observaciones internas..."
              className="w-full px-3 py-2 rounded-lg text-sm resize-none transition-colors focus:outline-none"
              style={{
                background: "var(--kipu-surface)",
                border: "1px solid var(--kipu-border)",
                color: "var(--kipu-text)",
              }}
              onFocus={e => e.currentTarget.style.borderColor = "var(--kipu-accent)"}
              onBlur={e => e.currentTarget.style.borderColor = "var(--kipu-border)"}
            />
          </div>

          {error && (
            <p
              className="text-xs px-3 py-2 rounded-lg"
              style={{
                color: "var(--kipu-danger)",
                background: "color-mix(in srgb, var(--kipu-danger) 10%, transparent)",
              }}
            >
              {error}
            </p>
          )}

          {/* Botones */}
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 py-2.5 rounded-lg text-sm transition-colors"
              style={{
                border: "1px solid var(--kipu-border)",
                color: "var(--kipu-muted)",
              }}
              onMouseEnter={e => e.currentTarget.style.color = "var(--kipu-text)"}
              onMouseLeave={e => e.currentTarget.style.color = "var(--kipu-muted)"}
            >
              Cancelar
            </button>
            <button
              onClick={guardar}
              disabled={saving}
              className="flex-1 py-2.5 rounded-lg text-white text-sm font-medium flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
              style={{ background: "var(--kipu-accent)" }}
              onMouseEnter={e => {
                if (!saving) e.currentTarget.style.background = "var(--kipu-accent-h)";
              }}
              onMouseLeave={e => {
                if (!saving) e.currentTarget.style.background = "var(--kipu-accent)";
              }}
            >
              {saving ? (
                <div
                  className="w-3.5 h-3.5 border-2 border-t-transparent rounded-full animate-spin"
                  style={{ borderColor: "#FFFFFF", borderTopColor: "transparent" }}
                />
              ) : (
                <Save size={14} />
              )}
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

  const [doc,      setDoc]      = useState<any>(null);
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
      <div
        className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin"
        style={{ borderColor: "var(--kipu-accent)", borderTopColor: "transparent" }}
      />
    </div>
  );

  if (!doc) return (
    <div className="p-6 text-center">
      <FileText size={40} className="mx-auto mb-3" style={{ color: "var(--kipu-subtle)" }} />
      <p className="text-sm" style={{ color: "var(--kipu-subtle)" }}>Documento no encontrado.</p>
      <button
        onClick={() => router.back()}
        className="mt-4 text-sm transition-colors"
        style={{ color: "var(--kipu-accent)" }}
        onMouseEnter={e => e.currentTarget.style.color = "var(--kipu-accent-h)"}
        onMouseLeave={e => e.currentTarget.style.color = "var(--kipu-accent)"}
      >
        Volver
      </button>
    </div>
  );

  const pago           = doc.estado_pago ? PAGO_CONFIG[doc.estado_pago] : null;
  const totalDeducible = (doc.items_detalle ?? []).filter((i: any) => i.deducible_renta).reduce((s: number, i: any) => s + i.subtotal, 0);
  const totalCredito   = (doc.items_detalle ?? []).filter((i: any) => i.credito_tributario_iva).reduce((s: number, i: any) => s + i.valor_iva, 0);
  const base_url      = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
  const tColor        = TIPO_COLOR[doc.tipo_doc] ?? TIPO_COLOR.FAC;

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto space-y-4">

      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.back()}
          className="p-2 rounded-lg transition-colors"
          style={{ color: "var(--kipu-muted)" }}
          onMouseEnter={e => {
            e.currentTarget.style.color = "var(--kipu-text)";
            e.currentTarget.style.background = "color-mix(in srgb, var(--kipu-text) 5%, transparent)";
          }}
          onMouseLeave={e => {
            e.currentTarget.style.color = "var(--kipu-muted)";
            e.currentTarget.style.background = "transparent";
          }}
        >
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span
              className="text-xs px-2 py-0.5 rounded-full font-bold"
              style={{ color: tColor.color, background: tColor.bg }}
            >
              {doc.tipo_doc}
            </span>
            <h1 className="text-xl font-bold font-mono" style={{ color: "var(--kipu-text)" }}>{doc.numero_doc}</h1>
          </div>
          <p className="text-sm" style={{ color: "var(--kipu-subtle)" }}>{doc.razon_social_proveedor}</p>
        </div>
        <div className="text-right">
          <p className="text-xl font-bold" style={{ color: "var(--kipu-text)" }}>${fmt(doc.importe_total)}</p>
          <p className="text-xs" style={{ color: "var(--kipu-subtle)" }}>{doc.fecha_emision}</p>
        </div>
      </div>

      {/* Proveedor */}
      <div
        className="rounded-xl p-4"
        style={{
          background: "var(--kipu-surface)",
          border: "1px solid var(--kipu-border)",
        }}
      >
        <h2 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "var(--kipu-subtle)" }}>Proveedor</h2>
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
              <p className="text-xs" style={{ color: "var(--kipu-subtle)" }}>{label}</p>
              <p className="font-medium truncate" style={{ color: "var(--kipu-text)" }}>{value || "—"}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Clasificación fiscal */}
      <div
        className="rounded-xl p-4"
        style={{
          background: "var(--kipu-surface)",
          border: "1px solid var(--kipu-border)",
        }}
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Shield size={14} style={{ color: "var(--kipu-accent)" }} />
            <h2 className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--kipu-subtle)" }}>Clasificación fiscal</h2>
          </div>
          <button
            onClick={() => setEditando(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-colors"
            style={{
              background: "var(--kipu-surface)",
              color: "var(--kipu-text)",
              border: "1px solid var(--kipu-border)",
            }}
            onMouseEnter={e => e.currentTarget.style.background = "color-mix(in srgb, var(--kipu-text) 5%, transparent)"}
            onMouseLeave={e => e.currentTarget.style.background = "var(--kipu-surface)"}
          >
            <Pencil size={12} /> Editar
          </button>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div
            className="rounded-lg p-3 text-center"
            style={{ background: "color-mix(in srgb, var(--kipu-text) 4%, transparent)" }}
          >
            <p className="text-xs mb-1" style={{ color: "var(--kipu-subtle)" }}>Total</p>
            <p className="text-base font-bold" style={{ color: "var(--kipu-text)" }}>${fmt(doc.importe_total)}</p>
          </div>
          <div
            className="rounded-lg p-3 text-center"
            style={{
              background: "color-mix(in srgb, var(--kipu-success) 5%, transparent)",
              border: "1px solid color-mix(in srgb, var(--kipu-success) 20%, transparent)",
            }}
          >
            <p className="text-xs mb-1" style={{ color: "var(--kipu-subtle)" }}>Deducible renta</p>
            <p className="text-base font-bold" style={{ color: "var(--kipu-success)" }}>${fmt(totalDeducible)}</p>
          </div>
          <div
            className="rounded-lg p-3 text-center"
            style={{
              background: "color-mix(in srgb, var(--kipu-accent) 5%, transparent)",
              border: "1px solid color-mix(in srgb, var(--kipu-accent) 20%, transparent)",
            }}
          >
            <p className="text-xs mb-1" style={{ color: "var(--kipu-subtle)" }}>Crédito trib. IVA</p>
            <p className="text-base font-bold" style={{ color: "var(--kipu-accent)" }}>${fmt(totalCredito)}</p>
          </div>
        </div>

        {/* Ítems */}
        {(doc.items_detalle ?? []).length > 0 && (
          <div
            className="mt-3 pt-3 space-y-2"
            style={{ borderTop: "1px solid var(--kipu-border)" }}
          >
            {doc.items_detalle.map((item: any, idx: number) => (
              <div key={idx} className="flex items-center gap-3 text-xs">
                <div className="flex-1 min-w-0">
                  <p className="truncate" style={{ color: "var(--kipu-text)" }}>{item.descripcion}</p>
                  <p style={{ color: "var(--kipu-subtle)" }}>{item.cantidad} × ${fmt(item.precio_unitario)}</p>
                </div>
                <div className="text-right shrink-0">
                  <p style={{ color: "var(--kipu-muted)" }}>${fmt(item.subtotal)}</p>
                  {item.tarifa_iva > 0 && (
                    <p style={{ color: "var(--kipu-subtle)" }}>IVA {item.tarifa_iva}% ${fmt(item.valor_iva)}</p>
                  )}
                </div>
                <div className="flex gap-1.5 shrink-0">
                  {item.deducible_renta && (
                    <span
                      className="text-[10px] px-1.5 py-0.5 rounded"
                      style={{
                        background: "color-mix(in srgb, var(--kipu-success) 10%, transparent)",
                        color: "var(--kipu-success)",
                      }}
                    >
                      Ded.
                    </span>
                  )}
                  {item.credito_tributario_iva && (
                    <span
                      className="text-[10px] px-1.5 py-0.5 rounded"
                      style={{
                        background: "color-mix(in srgb, var(--kipu-accent) 10%, transparent)",
                        color: "var(--kipu-accent)",
                      }}
                    >
                      CT
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {doc.notas && (
          <p
            className="mt-3 pt-3 text-xs"
            style={{
              borderTop: "1px solid var(--kipu-border)",
              color: "var(--kipu-subtle)",
            }}
          >
            {doc.notas}
          </p>
        )}
      </div>

      {/* Estado de pago al proveedor — solo FAC/LIQ */}
      {["FAC", "LIQ"].includes(doc.tipo_doc) && (
        <div
          className="rounded-xl p-4"
          style={{
            background: "var(--kipu-surface)",
            border: "1px solid var(--kipu-border)",
          }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Receipt size={14} style={{ color: "var(--kipu-subtle)" }} />
              <h2 className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--kipu-subtle)" }}>Pago al proveedor</h2>
            </div>
            {pago && <span className="text-sm font-semibold" style={{ color: pago.color }}>{pago.label}</span>}
          </div>
          {doc.forma_pago && (
            <div className="mt-3 space-y-1.5 text-sm">
              <div className="flex justify-between">
                <span style={{ color: "var(--kipu-subtle)" }}>Forma de pago</span>
                <span style={{ color: "var(--kipu-text)" }}>{doc.forma_pago}</span>
              </div>
              {doc.numero_comprobante_pago && (
                <div className="flex justify-between">
                  <span style={{ color: "var(--kipu-subtle)" }}>N° comprobante</span>
                  <span className="font-mono text-xs" style={{ color: "var(--kipu-text)" }}>{doc.numero_comprobante_pago}</span>
                </div>
              )}
              {doc.fecha_pago && (
                <div className="flex justify-between">
                  <span style={{ color: "var(--kipu-subtle)" }}>Fecha de pago</span>
                  <span style={{ color: "var(--kipu-text)" }}>{doc.fecha_pago}</span>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Documento origen — NCR/NDB vinculada a FAC recibida */}
      {doc.doc_origen_recibido_id && (
        <div
          className="rounded-xl p-4"
          style={{
            background: "color-mix(in srgb, #c084fc 5%, transparent)",
            border: "1px solid color-mix(in srgb, #c084fc 20%, transparent)",
          }}
        >
          <div className="flex items-center gap-2 mb-2">
            <Link2 size={13} style={{ color: "#c084fc" }} />
            <h2 className="text-xs font-semibold uppercase tracking-wider" style={{ color: "#c084fc" }}>
              Documento que modifica
            </h2>
          </div>
          <button
            onClick={() => router.push(`/documentos/recibidos/${doc.doc_origen_recibido_id}`)}
            className="text-sm transition-colors"
            style={{ color: "var(--kipu-accent)" }}
            onMouseEnter={e => e.currentTarget.style.color = "var(--kipu-accent-h)"}
            onMouseLeave={e => e.currentTarget.style.color = "var(--kipu-accent)"}
          >
            Ver documento recibido →
          </button>
        </div>
      )}

      {/* RET recibida → FAC/LIQ emitida */}
      {doc.doc_origen_emitido_id && (
        <div
          className="rounded-xl p-4"
          style={{
            background: "color-mix(in srgb, #60a5fa 5%, transparent)",
            border: "1px solid color-mix(in srgb, #60a5fa 20%, transparent)",
          }}
        >
          <div className="flex items-center gap-2 mb-2">
            <Link2 size={13} style={{ color: "#60a5fa" }} />
            <h2 className="text-xs font-semibold uppercase tracking-wider" style={{ color: "#60a5fa" }}>
              Documento retenido
            </h2>
          </div>
          <button
            onClick={() => router.push(`/documentos/${doc.doc_origen_emitido_id}`)}
            className="text-sm transition-colors"
            style={{ color: "var(--kipu-accent)" }}
            onMouseEnter={e => e.currentTarget.style.color = "var(--kipu-accent-h)"}
            onMouseLeave={e => e.currentTarget.style.color = "var(--kipu-accent)"}
          >
            Ver comprobante emitido →
          </button>
        </div>
      )}

      {/* RET emitida desde este documento */}
      {doc.retencion_emitida && (
        <div
          className="rounded-xl p-4"
          style={{
            background: "color-mix(in srgb, var(--kipu-warning) 5%, transparent)",
            border: "1px solid color-mix(in srgb, var(--kipu-warning) 20%, transparent)",
          }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 size={13} style={{ color: "var(--kipu-warning)" }} />
              <h2 className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--kipu-warning)" }}>
                Retención emitida
              </h2>
            </div>
            <button
              onClick={() => router.push(`/documentos/${doc.retencion_emitida.id}`)}
              className="text-xs transition-colors"
              style={{ color: "var(--kipu-accent)" }}
              onMouseEnter={e => e.currentTarget.style.color = "var(--kipu-accent-h)"}
              onMouseLeave={e => e.currentTarget.style.color = "var(--kipu-accent)"}
            >
              Ver →
            </button>
          </div>
          <p className="text-sm font-mono mt-2" style={{ color: "var(--kipu-text)" }}>{doc.retencion_emitida.numero_doc}</p>
          <p
            className="text-xs mt-0.5"
            style={{
              color: doc.retencion_emitida.estado_sri === "AUTORIZADO"
                ? "var(--kipu-success)"
                : "var(--kipu-warning)",
            }}
          >
            {doc.retencion_emitida.estado_sri}
          </p>
        </div>
      )}

      {/* Acciones */}
      <div className="flex gap-2 flex-wrap">
        {/* Descargar XML original */}
        {doc.xml_path && (
          <a
            href={`${base_url}/api/v1/app/recibidos/${doc.id}/xml`}
            download
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs transition-colors"
            style={{
              background: "var(--kipu-surface)",
              color: "var(--kipu-text)",
              border: "1px solid var(--kipu-border)",
            }}
            onMouseEnter={e => e.currentTarget.style.background = "color-mix(in srgb, var(--kipu-text) 5%, transparent)"}
            onMouseLeave={e => e.currentTarget.style.background = "var(--kipu-surface)"}
          >
            <Download size={13} /> Descargar XML
          </a>
        )}
        {/* Emitir RET — solo FAC/LIQ sin retención */}
        {["FAC", "LIQ"].includes(doc.tipo_doc) && !doc.retencion_emitida && (
          <button
            onClick={() => router.push(`/documentos/emitir/ret?doc_origen_recibido_id=${doc.id}`)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs transition-colors"
            style={{
              background: "color-mix(in srgb, #60a5fa 10%, transparent)",
              color: "#60a5fa",
              border: "1px solid color-mix(in srgb, #60a5fa 20%, transparent)",
            }}
            onMouseEnter={e => e.currentTarget.style.background = "color-mix(in srgb, #60a5fa 20%, transparent)"}
            onMouseLeave={e => e.currentTarget.style.background = "color-mix(in srgb, #60a5fa 10%, transparent)"}
          >
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