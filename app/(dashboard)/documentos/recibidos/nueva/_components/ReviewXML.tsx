"use client";
import { useState, useCallback } from "react";
import api from "@/lib/api";
import {
  X, ChevronDown, ChevronUp, FileText, Link2, AlertTriangle,
} from "lucide-react";

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
  parsed:            DocParseado;
  xmlFile:           File;
  onBack:            () => void;
  onDone:            () => void;
  suscripcionActiva: boolean;
}

const fmt = (n: any) => parseFloat(String(n ?? 0)).toFixed(2);

const TIPO_LABEL: Record<string, string> = {
  FAC: "Factura", NCR: "Nota de Crédito",
  NDB: "Nota de Débito", RET: "Retención",
};

const TIPO_COLOR: Record<string, { color: string; bg: string }> = {
  FAC: { color: "var(--kipu-muted)", bg: "color-mix(in srgb, var(--kipu-muted) 10%, transparent)" },
  NCR: { color: "#c084fc", bg: "color-mix(in srgb, #c084fc 10%, transparent)" },
  NDB: { color: "var(--kipu-warning)", bg: "color-mix(in srgb, var(--kipu-warning) 10%, transparent)" },
  RET: { color: "#60a5fa", bg: "color-mix(in srgb, #60a5fa 10%, transparent)" },
};

export default function ReviewXML({ parsed, xmlFile, onBack, onDone, suscripcionActiva }: Props) {
  const [items,           setItems]           = useState<ItemDetalle[]>(parsed.items_detalle);
  const [notas,           setNotas]           = useState("");
  const [saving,          setSaving]          = useState(false);
  const [error,           setError]           = useState("");
  const [showItems,       setShowItems]       = useState(false);
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
  const tColor = TIPO_COLOR[parsed.tipo_doc] ?? TIPO_COLOR.FAC;

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto space-y-4">

      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onBack}
          className="p-2 rounded-lg transition-colors"
          style={{
            border: "1px solid var(--kipu-border)",
            color: "var(--kipu-subtle)",
          }}
          onMouseEnter={e => {
            e.currentTarget.style.color = "var(--kipu-text)";
            e.currentTarget.style.borderColor = "color-mix(in srgb, var(--kipu-text) 30%, transparent)";
          }}
          onMouseLeave={e => {
            e.currentTarget.style.color = "var(--kipu-subtle)";
            e.currentTarget.style.borderColor = "var(--kipu-border)";
          }}
        >
          <X size={16} />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span
              className="text-xs px-2 py-0.5 rounded-full font-bold"
              style={{ color: tColor.color, background: tColor.bg }}
            >
              {parsed.tipo_doc}
            </span>
            <h1 className="text-lg font-bold" style={{ color: "var(--kipu-text)" }}>{parsed.numero_doc}</h1>
          </div>
          <p className="text-sm" style={{ color: "var(--kipu-subtle)" }}>{parsed.razon_social_proveedor}</p>
        </div>
        <div className="text-right">
          <p className="text-lg font-bold" style={{ color: "var(--kipu-text)" }}>${fmt(parsed.importe_total)}</p>
          <p className="text-xs" style={{ color: "var(--kipu-subtle)" }}>{parsed.fecha_emision}</p>
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
          <div><p className="text-xs" style={{ color: "var(--kipu-subtle)" }}>Razón social</p><p style={{ color: "var(--kipu-text)" }}>{parsed.razon_social_proveedor}</p></div>
          <div><p className="text-xs" style={{ color: "var(--kipu-subtle)" }}>RUC</p><p className="font-mono" style={{ color: "var(--kipu-text)" }}>{parsed.ruc_proveedor}</p></div>
          <div><p className="text-xs" style={{ color: "var(--kipu-subtle)" }}>Número</p><p className="font-mono" style={{ color: "var(--kipu-text)" }}>{parsed.numero_doc}</p></div>
          <div><p className="text-xs" style={{ color: "var(--kipu-subtle)" }}>Fecha emisión</p><p style={{ color: "var(--kipu-text)" }}>{parsed.fecha_emision}</p></div>
        </div>
      </div>

      {/* Vínculo */}
      {necesitaVinculo(parsed.tipo_doc) && (
        <div
          className="rounded-xl p-4"
          style={{
            background: "var(--kipu-surface)",
            border: "1px solid var(--kipu-border)",
          }}
        >
          <div className="flex items-center gap-2 mb-3">
            <Link2 size={14} style={{ color: "var(--kipu-accent)" }} />
            <h2 className="text-sm font-semibold" style={{ color: "var(--kipu-text)" }}>Vincular a {vinculoLabel(parsed.tipo_doc)}</h2>
            <span className="text-xs" style={{ color: "var(--kipu-subtle)" }}>(opcional)</span>
          </div>
          {vinculoSelected ? (
            <div
              className="flex items-center gap-3 rounded-lg px-3 py-2.5"
              style={{ background: "color-mix(in srgb, var(--kipu-text) 5%, transparent)" }}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span
                    className="text-[10px] px-1.5 py-0.5 rounded font-bold"
                    style={{
                      color: (TIPO_COLOR[vinculoSelected.tipo_doc] ?? TIPO_COLOR.FAC).color,
                      background: (TIPO_COLOR[vinculoSelected.tipo_doc] ?? TIPO_COLOR.FAC).bg,
                    }}
                  >
                    {vinculoSelected.tipo_doc}
                  </span>
                  <p className="text-sm font-mono" style={{ color: "var(--kipu-text)" }}>{vinculoSelected.numero_doc}</p>
                </div>
                <p className="text-xs" style={{ color: "var(--kipu-subtle)" }}>{vinculoSelected.razon_social} · ${fmt(vinculoSelected.importe_total)}</p>
              </div>
              <button
                type="button"
                onClick={() => setVinculoSelected(null)}
                className="p-1 transition-colors"
                style={{ color: "var(--kipu-subtle)" }}
                onMouseEnter={e => e.currentTarget.style.color = "var(--kipu-text)"}
                onMouseLeave={e => e.currentTarget.style.color = "var(--kipu-subtle)"}
              >
                <X size={14} />
              </button>
            </div>
          ) : (
            <div className="relative">
              <input
                value={vinculoQuery}
                onChange={e => { setVinculoQuery(e.target.value); buscarVinculo(e.target.value, parsed.tipo_doc); }}
                placeholder="Buscar por número o proveedor..."
                className="w-full px-3 py-2.5 rounded-lg text-sm transition-colors focus:outline-none"
                style={{
                  background: "var(--kipu-surface)",
                  border: "1px solid var(--kipu-border)",
                  color: "var(--kipu-text)",
                }}
                onFocus={e => e.currentTarget.style.borderColor = "var(--kipu-accent)"}
                onBlur={e => e.currentTarget.style.borderColor = "var(--kipu-border)"}
              />
              {vinculoLoading && (
                <div
                  className="w-3.5 h-3.5 border-2 border-t-transparent rounded-full animate-spin absolute right-3 top-1/2 -translate-y-1/2"
                  style={{ borderColor: "var(--kipu-accent)", borderTopColor: "transparent" }}
                />
              )}
              {vinculoResults.length > 0 && (
                <div
                  className="absolute z-10 w-full mt-1 rounded-lg shadow-xl overflow-hidden max-h-48 overflow-y-auto"
                  style={{
                    background: "var(--kipu-surface)",
                    border: "1px solid var(--kipu-border)",
                  }}
                >
                  {vinculoResults.map(d => {
                    const vColor = TIPO_COLOR[d.tipo_doc] ?? TIPO_COLOR.FAC;
                    return (
                      <button
                        type="button"
                        key={d.id}
                        onClick={() => { setVinculoSelected(d); setVinculoQuery(""); setVinculoResults([]); }}
                        className="w-full flex items-center justify-between gap-3 px-4 py-2.5 text-left transition-colors"
                        style={{ borderBottom: "1px solid var(--kipu-border)" }}
                        onMouseEnter={e => e.currentTarget.style.background = "color-mix(in srgb, var(--kipu-text) 5%, transparent)"}
                        onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span
                            className="text-[10px] px-1.5 py-0.5 rounded font-bold shrink-0"
                            style={{ color: vColor.color, background: vColor.bg }}
                          >
                            {d.tipo_doc}
                          </span>
                          <div className="min-w-0">
                            <p className="text-sm font-mono" style={{ color: "var(--kipu-text)" }}>{d.numero_doc}</p>
                            <p className="text-xs truncate" style={{ color: "var(--kipu-subtle)" }}>{d.razon_social}</p>
                          </div>
                        </div>
                        <span className="text-sm font-bold shrink-0" style={{ color: "var(--kipu-accent)" }}>${fmt(d.importe_total)}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Ítems */}
      <div
        className="rounded-xl overflow-hidden"
        style={{
          background: "var(--kipu-surface)",
          border: "1px solid var(--kipu-border)",
        }}
      >
        <button
          type="button"
          onClick={() => setShowItems(!showItems)}
          className="w-full flex items-center justify-between px-4 py-3 transition-colors"
          onMouseEnter={e => e.currentTarget.style.background = "color-mix(in srgb, var(--kipu-text) 4%, transparent)"}
          onMouseLeave={e => e.currentTarget.style.background = "transparent"}
        >
          <div className="flex items-center gap-2">
            <FileText size={14} style={{ color: "var(--kipu-subtle)" }} />
            <span className="text-sm font-semibold" style={{ color: "var(--kipu-text)" }}>{items.length} ítem{items.length !== 1 ? "s" : ""}</span>
            <span className="text-xs" style={{ color: "var(--kipu-subtle)" }}>— Clasificación fiscal por línea</span>
          </div>
          {showItems ? <ChevronUp size={16} style={{ color: "var(--kipu-subtle)" }} /> : <ChevronDown size={16} style={{ color: "var(--kipu-subtle)" }} />}
        </button>
        {showItems && (
          <div style={{ borderTop: "1px solid var(--kipu-border)" }}>
            <div
              className="grid grid-cols-12 gap-2 px-4 py-2 text-[10px] uppercase font-semibold tracking-wider"
              style={{ color: "var(--kipu-subtle)", borderBottom: "1px solid var(--kipu-border)" }}
            >
              <div className="col-span-4">Descripción</div>
              <div className="col-span-2 text-right">Subtotal</div>
              <div className="col-span-2 text-right">IVA</div>
              <div className="col-span-2 text-center">Deducible</div>
              <div className="col-span-2 text-center">Crédito IVA</div>
            </div>
            {items.map((item, idx) => (
              <div
                key={idx}
                className="grid grid-cols-12 gap-2 px-4 py-2.5 items-center transition-colors"
                style={{ borderTop: idx > 0 ? "1px solid var(--kipu-border)" : "none" }}
                onMouseEnter={e => e.currentTarget.style.background = "color-mix(in srgb, var(--kipu-text) 3%, transparent)"}
                onMouseLeave={e => e.currentTarget.style.background = "transparent"}
              >
                <div className="col-span-4">
                  <p className="text-xs truncate" style={{ color: "var(--kipu-text)" }}>{item.descripcion}</p>
                  <p className="text-[10px]" style={{ color: "var(--kipu-subtle)" }}>{item.cantidad} × ${fmt(item.precio_unitario)}</p>
                </div>
                <div className="col-span-2 text-right text-xs" style={{ color: "var(--kipu-muted)" }}>${fmt(item.subtotal)}</div>
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
                  ) : <span className="text-[10px]" style={{ color: "var(--kipu-subtle)" }}>N/A</span>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Resumen fiscal */}
      <div
        className="rounded-xl p-4"
        style={{
          background: "var(--kipu-surface)",
          border: "1px solid var(--kipu-border)",
        }}
      >
        <h2 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "var(--kipu-subtle)" }}>Resumen fiscal</h2>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between" style={{ color: "var(--kipu-muted)" }}>
            <span>Total documento</span>
            <span className="font-bold" style={{ color: "var(--kipu-text)" }}>${fmt(parsed.importe_total)}</span>
          </div>
          {parsed.tipo_doc !== "RET" && (
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
        <div className="mt-3 pt-3" style={{ borderTop: "1px solid var(--kipu-border)" }}>
          <label className="block text-xs mb-1.5" style={{ color: "var(--kipu-subtle)" }}>Notas (opcional)</label>
          <textarea
            value={notas}
            onChange={e => setNotas(e.target.value)}
            placeholder="Observaciones, referencia interna, etc."
            rows={2}
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
      </div>

      {error && (
        <div
          className="flex items-start gap-2 rounded-lg px-3 py-2.5"
          style={{
            background: "color-mix(in srgb, var(--kipu-danger) 10%, transparent)",
            border: "1px solid color-mix(in srgb, var(--kipu-danger) 20%, transparent)",
          }}
        >
          <AlertTriangle size={14} className="shrink-0 mt-0.5" style={{ color: "var(--kipu-danger)" }} />
          <p className="text-sm" style={{ color: "var(--kipu-danger)" }}>{error}</p>
        </div>
      )}

      <button
        type="button"
        onClick={guardar}
        disabled={saving || !suscripcionActiva}
        className="w-full py-3 rounded-lg text-white font-semibold text-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        style={{ background: "var(--kipu-accent)" }}
        onMouseEnter={e => {
          if (!saving && suscripcionActiva) e.currentTarget.style.background = "var(--kipu-accent-h)";
        }}
        onMouseLeave={e => {
          if (!saving && suscripcionActiva) e.currentTarget.style.background = "var(--kipu-accent)";
        }}
      >
        {saving ? (
          <>
            <div
              className="w-4 h-4 border-2 border-t-transparent rounded-full animate-spin"
              style={{ borderColor: "#FFFFFF", borderTopColor: "transparent" }}
            />
            Guardando...
          </>
        ) : (
          `Registrar ${TIPO_LABEL[parsed.tipo_doc] ?? parsed.tipo_doc} · $${fmt(parsed.importe_total)}`
        )}
      </button>
    </div>
  );
}