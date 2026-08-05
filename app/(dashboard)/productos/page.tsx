// app/(dashboard)/productos/page.tsx
"use client";
import { useState, useEffect, useCallback } from "react";
import api from "@/lib/api";
import {
  Search, Plus, Package, Loader2, X,
  Save, Pencil, PowerOff, Power
} from "lucide-react";
import { clsx } from "clsx";

interface Producto {
  id:          string;
  codigo:      string;
  descripcion: string;
  precio:      number;
  tipo_iva:    string;
  unidad:      string;
  activo:      boolean;
  stock:       number;
}

const EMPTY_FORM = {
  codigo:      "",
  descripcion: "",
  precio:      "",
  tipo_iva:    "15",
  unidad:      "UNIDAD",
  stock:       "-1",
};

const UNIDADES = ["UNIDAD", "SERVICIO", "KG", "LB", "LT", "MT", "CM", "CAJA", "PAQUETE", "HORA"];
const fmt = (n: number) => n?.toFixed(2) ?? "0.00";

export default function ProductosPage() {
  const [productos,    setProductos]    = useState<Producto[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [query,        setQuery]        = useState("");
  const [showModal,    setShowModal]    = useState(false);
  const [editando,     setEditando]     = useState<Producto | null>(null);
  const [form,         setForm]         = useState(EMPTY_FORM);
  const [saving,       setSaving]       = useState(false);
  const [error,        setError]        = useState("");
  const [verInactivos, setVerInactivos] = useState(false);

  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get(`/api/v1/app/productos?incluir_inactivos=${verInactivos}`);
      setProductos(res.data.data ?? []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [verInactivos]);

  useEffect(() => { cargar(); }, [cargar]);

  const filtrados = productos.filter((p) =>
    !query ||
    p.descripcion?.toLowerCase().includes(query.toLowerCase()) ||
    p.codigo?.toLowerCase().includes(query.toLowerCase())
  );

  const abrirCrear = () => {
    setEditando(null);
    setForm(EMPTY_FORM);
    setError("");
    setShowModal(true);
  };

  const abrirEditar = (p: Producto) => {
    setEditando(p);
    setForm({
      codigo:      p.codigo   ?? "",
      descripcion: p.descripcion,
      precio:      String(p.precio),
      tipo_iva:    p.tipo_iva,
      unidad:      p.unidad,
      stock:       String(p.stock ?? -1),
    });
    setError("");
    setShowModal(true);
  };

  const stockValue = () => form.stock === "" ? -1 : parseInt(form.stock);

  const handleSave = async () => {
    setError("");

    if (!form.descripcion || form.precio === "") {
      setError("Descripción y precio son obligatorios.");
      return;
    }
    if (parseFloat(form.precio) < 0) {
      setError("El precio no puede ser negativo.");
      return;
    }
    // Fix #5: código obligatorio si maneja stock
    if (stockValue() !== -1 && !form.codigo.trim()) {
      setError("El código es obligatorio cuando el producto maneja stock.");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        ...form,
        precio: parseFloat(form.precio),
        stock:  stockValue(), // Fix #1: stock 0 ya no se convierte a -1
      };
      if (editando) {
        await api.patch(`/api/v1/app/productos/${editando.id}`, payload);
      } else {
        await api.post("/api/v1/app/productos", payload);
      }
      await new Promise(r => setTimeout(r, 300));
      await cargar();
      setShowModal(false);
    } catch (err: any) {
      setError(err?.response?.data?.detail ?? "Error al guardar.");
    } finally {
      setSaving(false);
    }
  };

  const desactivar = async (id: string) => {
    if (!confirm("¿Desactivar este producto?")) return;
    try {
      await api.delete(`/api/v1/app/productos/${id}`);
      await cargar();
    } catch (e) {
      console.error(e);
    }
  };

  // Fix #4: reactivar producto
  const reactivar = async (id: string) => {
    if (!confirm("¿Reactivar este producto?")) return;
    try {
      await api.patch(`/api/v1/app/productos/${id}`, { activo: true });
      await cargar();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="p-4 md:p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-white">Productos y Servicios</h1>
          <p className="text-sm text-gray-500">{productos.filter(p => p.activo).length} activos</p>
        </div>
        <button
          onClick={abrirCrear}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium transition-colors"
        >
          <Plus size={15} />
          Nuevo
        </button>
      </div>

      {/* Filtros */}
      <div className="flex gap-3 mb-4">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por descripción o código..."
            className="w-full pl-9 pr-4 py-2.5 rounded-lg bg-gray-900 border border-gray-800 text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500 text-sm"
          />
        </div>
        <button
          onClick={() => setVerInactivos(!verInactivos)}
          className={clsx(
            "px-3 py-2 rounded-lg text-xs font-medium transition-colors border",
            verInactivos
              ? "bg-gray-700 border-gray-600 text-white"
              : "bg-gray-900 border-gray-800 text-gray-500 hover:text-white"
          )}
        >
          {verInactivos ? "Ocultar inactivos" : "Ver inactivos"}
        </button>
      </div>

      {/* Lista */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={24} className="animate-spin text-indigo-400" />
        </div>
      ) : filtrados.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Package size={40} className="text-gray-700 mb-3" />
          <p className="text-gray-500 text-sm">
            {query ? "No hay productos que coincidan." : "Aún no tienes productos en el catálogo."}
          </p>
          {!query && (
            <button
              onClick={abrirCrear}
              className="mt-4 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium transition-colors"
            >
              Agregar primer producto
            </button>
          )}
        </div>
      ) : (
        <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
          {/* Header tabla */}
          <div className="hidden md:grid grid-cols-12 gap-3 px-4 py-2.5 border-b border-gray-800 text-xs text-gray-500">
            <span className="col-span-2">Código</span>
            <span className="col-span-4">Descripción</span>
            <span className="col-span-2 text-center">Precio</span>
            <span className="col-span-1 text-center">IVA</span>
            <span className="col-span-1 text-center">Stock</span>
            <span className="col-span-2 text-right">Acciones</span>
          </div>
          <div className="divide-y divide-gray-800">
            {filtrados.map((p) => (
              <div
                key={p.id}
                className={clsx(
                  "flex md:grid md:grid-cols-12 gap-3 items-center px-4 py-3 hover:bg-gray-800/50 transition-colors",
                  !p.activo && "opacity-50"
                )}
              >
                <span className="hidden md:block col-span-2 text-xs text-gray-500 font-mono truncate">
                  {p.codigo || "—"}
                </span>
                <div className="flex-1 md:col-span-4 min-w-0">
                  <p className="text-sm text-white truncate">{p.descripcion}</p>
                  <p className="text-xs text-gray-500 md:hidden">
                    {p.codigo || "Sin código"} · IVA {p.tipo_iva}% · {p.unidad}
                    {p.stock !== -1 && ` · Stock: ${p.stock}`}
                  </p>
                </div>
                <span className="hidden md:block col-span-2 text-sm font-semibold text-white text-center">
                  ${fmt(p.precio)}
                </span>
                <span className="hidden md:block col-span-1 text-xs text-gray-400 text-center">
                  {p.tipo_iva}%
                </span>
                {/* Columna Stock */}
                <span className="hidden md:block col-span-1 text-xs text-center font-medium">
                  {p.stock === -1 ? (
                    <span className="text-gray-600">—</span>
                  ) : p.stock === 0 ? (
                    <span className="text-red-400 bg-red-400/10 px-2 py-0.5 rounded-full">Sin stock</span>
                  ) : (
                    <span className={clsx(
                      "px-2 py-0.5 rounded-full",
                      p.stock <= 5 ? "text-amber-400 bg-amber-400/10" : "text-emerald-400 bg-emerald-400/10"
                    )}>
                      {p.stock}
                    </span>
                  )}
                </span>
                <div className="md:col-span-2 flex items-center justify-end gap-2 shrink-0">
                  <span className="text-sm font-semibold text-white md:hidden">${fmt(p.precio)}</span>
                  <button
                    onClick={() => abrirEditar(p)}
                    className="p-1.5 rounded text-gray-500 hover:text-white hover:bg-gray-700 transition-colors"
                    title="Editar"
                  >
                    <Pencil size={14} />
                  </button>
                  {/* Fix #4: botón reactivar/desactivar */}
                  {p.activo ? (
                    <button
                      onClick={() => desactivar(p.id)}
                      className="p-1.5 rounded text-gray-500 hover:text-red-400 hover:bg-gray-700 transition-colors"
                      title="Desactivar"
                    >
                      <PowerOff size={14} />
                    </button>
                  ) : (
                    <button
                      onClick={() => reactivar(p.id)}
                      className="p-1.5 rounded text-gray-500 hover:text-emerald-400 hover:bg-gray-700 transition-colors"
                      title="Reactivar"
                    >
                      <Power size={14} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal crear/editar */}
      {showModal && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-xl w-full max-w-md">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800">
              <h2 className="text-sm font-semibold text-white">
                {editando ? "Editar producto" : "Nuevo producto"}
              </h2>
              <button onClick={() => setShowModal(false)} className="text-gray-500 hover:text-white">
                <X size={18} />
              </button>
            </div>
            <div className="p-5 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  {/* Fix #5: asterisco si maneja stock */}
                  <label className="block text-xs text-gray-500 mb-1.5">
                    Código {stockValue() !== -1 ? <span className="text-red-400">*</span> : "(opcional)"}
                  </label>
                  <input
                    value={form.codigo}
                    onChange={(e) => setForm({ ...form, codigo: e.target.value })}
                    placeholder="PROD-001"
                    className="w-full px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1.5">Precio *</label>
                  <input
                    type="number"
                    value={form.precio}
                    onChange={(e) => setForm({ ...form, precio: e.target.value })}
                    placeholder="0.00"
                    min={0}
                    step={0.01}
                    className="w-full px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500 text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1.5">Descripción *</label>
                <input
                  value={form.descripcion}
                  onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
                  placeholder="Nombre del producto o servicio"
                  className="w-full px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500 text-sm"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1.5">IVA</label>
                  <select
                    value={form.tipo_iva}
                    onChange={(e) => setForm({ ...form, tipo_iva: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white focus:outline-none focus:border-indigo-500 text-sm"
                  >
                    <option value="0">0%</option>
                    <option value="5">5%</option>
                    <option value="15">15%</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1.5">Unidad</label>
                  <select
                    value={form.unidad}
                    onChange={(e) => setForm({ ...form, unidad: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white focus:outline-none focus:border-indigo-500 text-sm"
                  >
                    {UNIDADES.map(u => <option key={u} value={u}>{u}</option>)}
                  </select>
                </div>
              </div>
              {/* Campo Stock */}
              <div>
                {/* Fix #3: label dinámico */}
                <label className="block text-xs text-gray-500 mb-1.5">
                  {editando ? "Stock actual" : "Stock inicial"}
                </label>
                <input
                  type="number"
                  value={form.stock}
                  onChange={(e) => setForm({ ...form, stock: e.target.value })}
                  placeholder="-1"
                  min={-1}
                  step={1}
                  className="w-full px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500 text-sm"
                />
                <p className="text-[11px] text-gray-600 mt-1">-1 = sin control de stock</p>
              </div>
              {error && (
                <p className="text-xs text-red-400 bg-red-400/10 px-3 py-2 rounded-lg">{error}</p>
              )}
              <div className="flex gap-3 pt-1">
                <button
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-2.5 rounded-lg border border-gray-700 text-gray-400 hover:text-white text-sm transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex-1 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-medium transition-colors flex items-center justify-center gap-2"
                >
                  {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                  {editando ? "Actualizar" : "Guardar"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}