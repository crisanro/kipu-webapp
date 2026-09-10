"use client";

import { useRef, useCallback, useState, useEffect } from "react";
import api from "@/lib/api";
import { Search, Plus, Trash2 } from "lucide-react";

// ── Tipos ──────────────────────────────────────────────────────────────────────
interface Producto {
  id:          string;
  descripcion: string;
  precio:      number;
  tipo_iva:    string;
  unidad:      string;
  codigo:      string;
}

export interface Item {
  _id:            string;
  codigo:         string;
  descripcion:    string;
  cantidad:       number;
  precio:         number;
  descuento:      number;
  tipo_descuento: "$" | "%";
  tipo_iva:       string;
  unidad:         string;
}

interface Props {
  items:    Item[];
  onChange: (items: Item[]) => void;
}

// ── Helpers ────────────────────────────────────────────────────────────────────
const r2  = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;
const fmt = (n: number) => r2(n).toFixed(2);

const IVA_RATES: Record<string, number> = { "0": 0, "5": 0.05, "15": 0.15 };

export function calcItem(item: Item) {
  const subtotal  = r2(item.cantidad * item.precio);
  const descuento = r2(
    item.tipo_descuento === "%"
      ? subtotal * (item.descuento / 100)
      : item.descuento
  );
  const base  = r2(subtotal - descuento);
  const iva   = r2(base * (IVA_RATES[item.tipo_iva] ?? 0.15));
  const total = r2(base + iva);
  return { subtotal, descuento, base, iva, total };
}

export const genId = () => Math.random().toString(36).slice(2);

export const EMPTY_ITEM: Omit<Item, "_id"> = {
  codigo:         "",
  descripcion:    "",
  cantidad:       1,
  precio:         0,
  descuento:      0,
  tipo_descuento: "$",
  tipo_iva:       "15",
  unidad:         "UNIDAD",
};

// ── Subcomponente de Input Decimal ─────────────────────────────────────────────
function InputDecimal({
  value,
  onChange,
  placeholder = "0",
  className = "",
  style = {},
  defaultValueOnBlur = 0,
}: {
  value: number;
  onChange: (val: number) => void;
  placeholder?: string;
  className?: string;
  style?: React.CSSProperties;
  defaultValueOnBlur?: number;
}) {
  const [valStr, setValStr] = useState<string>(value === 0 ? "" : String(value));

  // Sincronizar si cambia el estado desde fuera (p. ej. al seleccionar del catálogo)
  useEffect(() => {
    setValStr(value === 0 ? "" : String(value));
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let raw = e.target.value;
    // Solo permitir números, una sola coma o un solo punto
    raw = raw.replace(/[^0-9.,]/g, "");
    
    // Evitar múltiples separadores
    const parts = raw.split(/[.,]/);
    if (parts.length > 2) return;

    setValStr(raw);

    // Convertir a número para actualizar el cálculo superior
    const num = parseFloat(raw.replace(",", "."));
    onChange(isNaN(num) ? 0 : num);
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    if (!valStr.trim()) {
      onChange(defaultValueOnBlur);
      setValStr(defaultValueOnBlur === 0 ? "" : String(defaultValueOnBlur));
    }
    e.currentTarget.style.borderColor = "var(--kipu-border)";
  };

  return (
    <input
      type="text"
      inputMode="decimal"
      value={valStr}
      onChange={handleChange}
      onFocus={(e) => {
        e.currentTarget.style.borderColor = "var(--kipu-accent)";
      }}
      onBlur={handleBlur}
      placeholder={placeholder}
      className={className}
      style={style}
    />
  );
}

// ── Componente Principal ───────────────────────────────────────────────────────
export default function ItemsEditor({ items, onChange }: Props) {
  const [productoQuery,   setProductoQuery]   = useState("");
  const [productoResults, setProductoResults] = useState<Producto[]>([]);
  const [productoLoading, setProductoLoading] = useState(false);
  const [showProductos,   setShowProductos]   = useState(false);

  const timer       = useRef<ReturnType<typeof setTimeout> | null>(null);
  const productoRef = useRef<HTMLDivElement>(null);

  // Cerrar dropdown al hacer clic fuera
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (productoRef.current && !productoRef.current.contains(e.target as Node)) {
        setShowProductos(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // ── Buscar productos ─────────────────────────────────────────────────────────
  const buscarProductos = useCallback(async (q: string) => {
    if (!q || q.length < 1) { setProductoResults([]); return; }
    setProductoLoading(true);
    try {
      const res = await api.get(`/api/v1/app/productos/buscar?q=${encodeURIComponent(q)}`);
      setProductoResults(res.data.data ?? []);
      setShowProductos(true);
    } catch {
      setProductoResults([]);
    } finally {
      setProductoLoading(false);
    }
  }, []);

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => buscarProductos(productoQuery), 250);
    return () => { if (timer.current) clearTimeout(timer.current); };
  }, [productoQuery, buscarProductos]);

  // ── Acciones ─────────────────────────────────────────────────────────────────
  const seleccionarProducto = (p: Producto) => {
    onChange([...items, {
      _id:            genId(),
      codigo:         p.codigo,
      descripcion:    p.descripcion,
      cantidad:       1,
      precio:         p.precio,
      descuento:      0,
      tipo_descuento: "$",
      tipo_iva:       p.tipo_iva,
      unidad:         p.unidad,
    }]);
    setProductoQuery("");
    setShowProductos(false);
  };

  const editItem = (id: string, field: keyof Item, value: any) => {
    onChange(items.map(item => item._id === id ? { ...item, [field]: value } : item));
  };

  const removeItem = (id: string) => {
    if (items.length === 1) return;
    onChange(items.filter(i => i._id !== id));
  };

  const addItem = () => {
    onChange([...items, { _id: genId(), ...EMPTY_ITEM }]);
  };

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div
      className="rounded-xl p-4 space-y-4"
      style={{
        background: "var(--kipu-surface)",
        border: "1px solid var(--kipu-border)",
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Search size={15} style={{ color: "var(--kipu-accent)" }} />
          <h2 className="text-sm font-semibold" style={{ color: "var(--kipu-text)" }}>
            Productos / Servicios
          </h2>
        </div>
        <span className="text-xs" style={{ color: "var(--kipu-subtle)" }}>
          {items.length} ítem(s)
        </span>
      </div>

      {/* Buscador catálogo */}
      <div className="relative" ref={productoRef}>
        <div className="relative">
          <Search
            size={15}
            className="absolute left-3 top-1/2 -translate-y-1/2"
            style={{ color: "var(--kipu-subtle)" }}
          />
          <input
            value={productoQuery}
            onChange={(e) => { setProductoQuery(e.target.value); setShowProductos(true); }}
            placeholder="Buscar en catálogo para agregar..."
            className="w-full pl-9 pr-4 py-2 rounded-lg text-sm transition-colors focus:outline-none"
            style={{
              background: "var(--kipu-surface)",
              border: "1px solid var(--kipu-border)",
              color: "var(--kipu-text)",
            }}
            onFocus={(e) => e.currentTarget.style.borderColor = "var(--kipu-accent)"}
            onBlur={(e) => e.currentTarget.style.borderColor = "var(--kipu-border)"}
          />
          {productoLoading && (
            <div
              className="w-3.5 h-3.5 border-2 border-t-transparent rounded-full animate-spin absolute right-3 top-1/2 -translate-y-1/2"
              style={{ borderColor: "var(--kipu-accent)", borderTopColor: "transparent" }}
            />
          )}
        </div>

        {showProductos && productoResults.length > 0 && (
          <div
            className="absolute z-10 w-full mt-1 rounded-lg shadow-xl overflow-hidden max-h-48 overflow-y-auto"
            style={{
              background: "var(--kipu-surface)",
              border: "1px solid var(--kipu-border)",
            }}
          >
            {productoResults.map((p) => (
              <button
                type="button"
                key={p.id}
                onClick={() => seleccionarProducto(p)}
                className="w-full flex items-center justify-between gap-3 px-4 py-2.5 text-left transition-colors"
                style={{
                  borderBottom: "1px solid var(--kipu-border)",
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.background =
                    "color-mix(in srgb, var(--kipu-text) 5%, transparent)")
                }
                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
              >
                <div>
                  <p className="text-sm" style={{ color: "var(--kipu-text)" }}>
                    {p.descripcion}
                  </p>
                  <p className="text-xs" style={{ color: "var(--kipu-subtle)" }}>
                    {p.codigo || p.unidad} · IVA {p.tipo_iva}%
                  </p>
                </div>
                <span className="text-sm font-medium shrink-0" style={{ color: "var(--kipu-accent)" }}>
                  ${fmt(p.precio)}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Lista de ítems */}
      <div className="space-y-3">
        {items.map((item, index) => {
          const c = calcItem(item);
          return (
            <div
              key={item._id}
              className="p-3.5 rounded-xl space-y-3 transition-colors"
              style={{
                background: "color-mix(in srgb, var(--kipu-surface) 60%, transparent)",
                border: "1px solid var(--kipu-border)",
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.borderColor =
                  "color-mix(in srgb, var(--kipu-text) 20%, transparent)")
              }
              onMouseLeave={(e) => (e.currentTarget.style.borderColor = "var(--kipu-border)")}
            >
              {/* Fila 1 — índice + cantidad + descripción + eliminar */}
              <div className="flex items-center gap-2">
                <span
                  className="text-xs font-semibold w-4 shrink-0 text-center"
                  style={{ color: "var(--kipu-subtle)" }}
                >
                  #{index + 1}
                </span>

                {/* Cantidad */}
                <InputDecimal
                  value={item.cantidad}
                  onChange={(v) => editItem(item._id, "cantidad", v)}
                  defaultValueOnBlur={1}
                  placeholder="Cant."
                  className="w-20 shrink-0 px-2 py-2 rounded-lg text-sm font-medium text-center transition-colors focus:outline-none"
                  style={{
                    background: "var(--kipu-surface)",
                    border: "1px solid var(--kipu-border)",
                    color: "var(--kipu-text)",
                  }}
                />

                <input
                  value={item.descripcion}
                  onChange={(e) => editItem(item._id, "descripcion", e.target.value)}
                  placeholder="Descripción del producto o servicio"
                  className="flex-1 px-3 py-2 rounded-lg text-sm font-medium min-w-0 transition-colors focus:outline-none"
                  style={{
                    background: "var(--kipu-surface)",
                    border: "1px solid var(--kipu-border)",
                    color: "var(--kipu-text)",
                  }}
                  onFocus={(e) => (e.currentTarget.style.borderColor = "var(--kipu-accent)")}
                  onBlur={(e) => (e.currentTarget.style.borderColor = "var(--kipu-border)")}
                />
                <button
                  type="button"
                  onClick={() => removeItem(item._id)}
                  disabled={items.length === 1}
                  className="p-2 rounded-lg transition-colors shrink-0 disabled:opacity-20"
                  style={{ color: "var(--kipu-subtle)" }}
                  onMouseEnter={(e) => {
                    if (items.length > 1) {
                      e.currentTarget.style.color = "var(--kipu-danger)";
                      e.currentTarget.style.background =
                        "color-mix(in srgb, var(--kipu-danger) 10%, transparent)";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (items.length > 1) {
                      e.currentTarget.style.color = "var(--kipu-subtle)";
                      e.currentTarget.style.background = "transparent";
                    }
                  }}
                  title="Eliminar ítem"
                >
                  <Trash2 size={16} />
                </button>
              </div>

              {/* Fila 2 — precio + descuento + IVA + total */}
              <div className="grid grid-cols-12 gap-2 items-end">
                {/* Precio unitario */}
                <div className="col-span-4 sm:col-span-3 space-y-1">
                  <label
                    className="text-[10px] uppercase font-semibold tracking-wider block"
                    style={{ color: "var(--kipu-subtle)" }}
                  >
                    Precio Unit.
                  </label>
                  <InputDecimal
                    value={item.precio}
                    onChange={(v) => editItem(item._id, "precio", v)}
                    defaultValueOnBlur={0}
                    placeholder="0.00"
                    className="w-full px-2 py-1.5 rounded-lg text-sm text-center transition-colors focus:outline-none"
                    style={{
                      background: "var(--kipu-surface)",
                      border: "1px solid var(--kipu-border)",
                      color: "var(--kipu-text)",
                    }}
                  />
                </div>

                {/* Descuento */}
                <div className="col-span-4 sm:col-span-4 space-y-1">
                  <label
                    className="text-[10px] uppercase font-semibold tracking-wider block"
                    style={{ color: "var(--kipu-subtle)" }}
                  >
                    Descuento
                  </label>
                  <div className="flex gap-1">
                    <select
                      value={item.tipo_descuento}
                      onChange={(e) =>
                        editItem(
                          item._id,
                          "tipo_descuento",
                          e.target.value as "$" | "%"
                        )
                      }
                      className="w-10 px-1 py-1.5 rounded-lg text-xs shrink-0 font-medium transition-colors focus:outline-none"
                      style={{
                        background: "var(--kipu-surface)",
                        border: "1px solid var(--kipu-border)",
                        color: "var(--kipu-text)",
                      }}
                      onFocus={(e) => (e.currentTarget.style.borderColor = "var(--kipu-accent)")}
                      onBlur={(e) => (e.currentTarget.style.borderColor = "var(--kipu-border)")}
                    >
                      <option value="$">$</option>
                      <option value="%">%</option>
                    </select>
                    <InputDecimal
                      value={item.descuento}
                      onChange={(v) => editItem(item._id, "descuento", Math.max(0, v))}
                      defaultValueOnBlur={0}
                      placeholder="0"
                      className="w-full min-w-0 px-2 py-1.5 rounded-lg text-sm text-center transition-colors focus:outline-none"
                      style={{
                        background: "var(--kipu-surface)",
                        border: "1px solid var(--kipu-border)",
                        color: "var(--kipu-text)",
                      }}
                    />
                  </div>
                </div>

                {/* IVA */}
                <div className="col-span-4 sm:col-span-2 space-y-1">
                  <label
                    className="text-[10px] uppercase font-semibold tracking-wider block"
                    style={{ color: "var(--kipu-subtle)" }}
                  >
                    IVA
                  </label>
                  <select
                    value={item.tipo_iva}
                    onChange={(e) => editItem(item._id, "tipo_iva", e.target.value)}
                    className="w-full px-1.5 py-1.5 rounded-lg text-xs text-center transition-colors focus:outline-none"
                    style={{
                      background: "var(--kipu-surface)",
                      border: "1px solid var(--kipu-border)",
                      color: "var(--kipu-text)",
                    }}
                    onFocus={(e) => (e.currentTarget.style.borderColor = "var(--kipu-accent)")}
                    onBlur={(e) => (e.currentTarget.style.borderColor = "var(--kipu-border)")}
                  >
                    <option value="0">0%</option>
                    <option value="5">5%</option>
                    <option value="15">15%</option>
                  </select>
                </div>

                {/* Total ítem */}
                <div
                  className="col-span-12 sm:col-span-3 flex sm:flex-col justify-between sm:justify-end items-center sm:items-end pt-2 sm:pt-0"
                  style={{
                    borderTop: "1px solid var(--kipu-border)",
                  }}
                >
                  <div className="text-right">
                    <span
                      className="text-[10px] block uppercase tracking-wider"
                      style={{ color: "var(--kipu-subtle)" }}
                    >
                      Total Ítem
                    </span>
                    <span className="text-sm font-bold" style={{ color: "var(--kipu-accent)" }}>
                      ${fmt(c.total)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Agregar ítem manual */}
      <button
        type="button"
        onClick={addItem}
        className="w-full py-2.5 rounded-xl border border-dashed text-sm transition-all flex items-center justify-center gap-2 font-medium"
        style={{
          borderColor: "var(--kipu-border)",
          color: "var(--kipu-accent)",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = "var(--kipu-accent)";
          e.currentTarget.style.background =
            "color-mix(in srgb, var(--kipu-accent) 5%, transparent)";
          e.currentTarget.style.color = "var(--kipu-accent-h)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = "var(--kipu-border)";
          e.currentTarget.style.background = "transparent";
          e.currentTarget.style.color = "var(--kipu-accent)";
        }}
      >
        <Plus size={16} />
        Agregar ítem manualmente
      </button>
    </div>
  );
}