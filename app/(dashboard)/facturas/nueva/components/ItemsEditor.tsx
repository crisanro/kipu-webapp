// app/(dashboard)/facturas/nueva/components/ItemsEditor.tsx
"use client";

import { useRef, useCallback, useState, useEffect } from "react";
import api from "@/lib/api";
import { Search, Plus, Trash2, Loader2 } from "lucide-react";

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

// ── Componente ─────────────────────────────────────────────────────────────────
export default function ItemsEditor({ items, onChange }: Props) {
  const [productoQuery,   setProductoQuery]   = useState("");
  const [productoResults, setProductoResults] = useState<Producto[]>([]);
  const [productoLoading, setProductoLoading] = useState(false);
  const [showProductos,   setShowProductos]   = useState(false);

  const timer      = useRef<ReturnType<typeof setTimeout> | null>(null);
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
    <div className="bg-gray-900 rounded-xl border border-gray-800 p-4 space-y-4">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Search size={15} className="text-indigo-400" />
          <h2 className="text-sm font-semibold text-white">Productos / Servicios</h2>
        </div>
        <span className="text-xs text-gray-500">{items.length} ítem(s)</span>
      </div>

      {/* Buscador catálogo */}
      <div className="relative" ref={productoRef}>
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            value={productoQuery}
            onChange={(e) => { setProductoQuery(e.target.value); setShowProductos(true); }}
            placeholder="Buscar en catálogo para agregar..."
            className="w-full pl-9 pr-4 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 text-sm"
          />
          {productoLoading && (
            <Loader2 size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 animate-spin" />
          )}
        </div>

        {showProductos && productoResults.length > 0 && (
          <div className="absolute z-10 w-full mt-1 bg-gray-800 border border-gray-700 rounded-lg shadow-xl overflow-hidden max-h-48 overflow-y-auto">
            {productoResults.map((p) => (
              <button
                key={p.id}
                onClick={() => seleccionarProducto(p)}
                className="w-full flex items-center justify-between gap-3 px-4 py-2.5 hover:bg-gray-700 text-left border-b border-gray-700/50 last:border-0"
              >
                <div>
                  <p className="text-sm text-white">{p.descripcion}</p>
                  <p className="text-xs text-gray-500">
                    {p.codigo || p.unidad} · IVA {p.tipo_iva}%
                  </p>
                </div>
                <span className="text-sm font-medium text-indigo-400 shrink-0">
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
              className="p-3.5 bg-gray-950/60 border border-gray-800/80 rounded-xl space-y-3 hover:border-gray-700/80 transition-colors"
            >
              {/* Fila 1 — índice + cantidad + descripción + eliminar */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-gray-500 w-4 shrink-0 text-center">
                  #{index + 1}
                </span>
                <input
                  type="number"
                  value={item.cantidad}
                  onChange={(e) => editItem(item._id, "cantidad", parseFloat(e.target.value) || 0)}
                  min={0.01}
                  step={0.01}
                  placeholder="Cant."
                  className="w-20 shrink-0 px-2 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white focus:outline-none focus:border-indigo-500 text-sm font-medium text-center"
                />
                <input
                  value={item.descripcion}
                  onChange={(e) => editItem(item._id, "descripcion", e.target.value)}
                  placeholder="Descripción del producto o servicio"
                  className="flex-1 px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 text-sm font-medium min-w-0"
                />
                <button
                  onClick={() => removeItem(item._id)}
                  disabled={items.length === 1}
                  className="p-2 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg disabled:opacity-20 transition-colors shrink-0"
                  title="Eliminar ítem"
                >
                  <Trash2 size={16} />
                </button>
              </div>

              {/* Fila 2 — precio + descuento + IVA + total */}
              <div className="grid grid-cols-12 gap-2 items-end">

                {/* Precio unitario */}
                <div className="col-span-4 sm:col-span-3 space-y-1">
                  <label className="text-[10px] uppercase font-semibold tracking-wider text-gray-500 block">
                    Precio Unit.
                  </label>
                  <input
                    type="number"
                    value={item.precio}
                    onChange={(e) => editItem(item._id, "precio", parseFloat(e.target.value) || 0)}
                    min={0}
                    step={0.01}
                    className="w-full px-2 py-1.5 rounded-lg bg-gray-800 border border-gray-700 text-white focus:outline-none focus:border-indigo-500 text-sm text-center"
                  />
                </div>

                {/* Descuento */}
                <div className="col-span-4 sm:col-span-4 space-y-1">
                  <label className="text-[10px] uppercase font-semibold tracking-wider text-gray-500 block">
                    Descuento
                  </label>
                  <div className="flex gap-1">
                    <select
                      value={item.tipo_descuento}
                      onChange={(e) => editItem(item._id, "tipo_descuento", e.target.value as "$" | "%")}
                      className="w-10 px-1 py-1.5 rounded-lg bg-gray-800 border border-gray-700 text-white focus:outline-none focus:border-indigo-500 text-xs shrink-0 font-medium"
                    >
                      <option value="$">$</option>
                      <option value="%">%</option>
                    </select>
                    <input
                      type="number"
                      value={item.descuento}
                      onChange={(e) => editItem(item._id, "descuento", Math.max(0, parseFloat(e.target.value) || 0))}
                      min={0}
                      step={0.01}
                      className="w-full min-w-0 px-2 py-1.5 rounded-lg bg-gray-800 border border-gray-700 text-white focus:outline-none focus:border-indigo-500 text-sm text-center"
                    />
                  </div>
                </div>

                {/* IVA */}
                <div className="col-span-4 sm:col-span-2 space-y-1">
                  <label className="text-[10px] uppercase font-semibold tracking-wider text-gray-500 block">
                    IVA
                  </label>
                  <select
                    value={item.tipo_iva}
                    onChange={(e) => editItem(item._id, "tipo_iva", e.target.value)}
                    className="w-full px-1.5 py-1.5 rounded-lg bg-gray-800 border border-gray-700 text-white focus:outline-none focus:border-indigo-500 text-xs text-center"
                  >
                    <option value="0">0%</option>
                    <option value="5">5%</option>
                    <option value="15">15%</option>
                  </select>
                </div>

                {/* Total ítem */}
                <div className="col-span-12 sm:col-span-3 flex sm:flex-col justify-between sm:justify-end items-center sm:items-end pt-2 sm:pt-0 border-t sm:border-t-0 border-gray-800/60">
                  <div className="text-right">
                    <span className="text-[10px] text-gray-500 block uppercase tracking-wider">Total Ítem</span>
                    <span className="text-sm font-bold text-indigo-400">${fmt(c.total)}</span>
                  </div>
                </div>

              </div>
            </div>
          );
        })}
      </div>

      {/* Agregar ítem manual */}
      <button
        onClick={addItem}
        className="w-full py-2.5 rounded-xl border border-dashed border-gray-700 hover:border-indigo-500/50 hover:bg-indigo-500/5 text-sm text-indigo-400 hover:text-indigo-300 transition-all flex items-center justify-center gap-2 font-medium"
      >
        <Plus size={16} />
        Agregar ítem manualmente
      </button>

    </div>
  );
}