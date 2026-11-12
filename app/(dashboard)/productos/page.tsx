"use client";

import { useState, useEffect, useCallback, lazy, Suspense } from "react";
import { etiquetaIva, opcionesIva } from "@/lib/iva";
import { baseDesdeTotal, tarifaPct } from "@/lib/precios";
import { r2 } from "@/lib/dinero";
import api from "@/lib/api";
import { usePermiso } from "@/hooks/usePermiso";
import SinAcceso from "@/components/SinAcceso";
import {
  Search, Plus, Package, X,
  Save, Pencil, PowerOff, Power, Camera
} from "lucide-react";

const BarcodeScanner = lazy(() => import("@/components/BarcodeScanner"));

interface Producto {
  id:           string;
  codigo:       string;
  descripcion:  string;
  precio:       number;               // sin IVA
  precio_con_iva?:     number | null; // "IVA incluido": precio final que se mantiene
  precio_incluye_iva?: boolean;
  tipo_iva:     string;
  unidad:       string;
  activo:       boolean;
  stock:        number;
  stock_minimo: number;
}

const EMPTY_FORM = {
  codigo:       "",
  descripcion:  "",
  precio:       "",
  incluye_iva:  false,   // false: "+ IVA" (se suma) · true: "IVA incluido" (se desglosa)
  tipo_iva:     "15",
  unidad:       "UNIDAD",
  stock:        "-1",
  stock_minimo: "0",
};

const UNIDADES = ["UNIDAD", "SERVICIO", "KG", "LB", "LT", "MT", "CM", "CAJA", "PAQUETE", "HORA"];
const PRODUCTOS_LIMIT = 50;

const fmt = (n: number) => n?.toFixed(2) ?? "0.00";

/** Precio que se muestra en la lista: el final si es "IVA incluido", la base si es "+ IVA". */
const precioVisible = (p: Producto) =>
  p.precio_incluye_iva && p.precio_con_iva != null ? p.precio_con_iva : p.precio;

/** Base, IVA y final de lo que se está escribiendo (mismo redondeo que el SRI). */
function desglose(precio: number, incluyeIva: boolean, tipoIva: string) {
  const pct  = tarifaPct(tipoIva);
  const base = incluyeIva ? baseDesdeTotal(precio, tipoIva) : r2(precio);
  const iva  = r2(base * pct / 100);
  return { pct, base, iva, final: r2(base + iva) };
}

// Modo del scanner: "buscar" filtra la lista, "codigo" llena el campo código del modal
type ScanMode = "buscar" | "codigo";

export default function ProductosPage() {
  const puedeVer = usePermiso("productos");

  const [productos,    setProductos]    = useState<Producto[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [total,        setTotal]        = useState(0);
  const [loadingMore,  setLoadingMore]  = useState(false);

  const [query,        setQuery]        = useState("");
  const [showModal,    setShowModal]    = useState(false);
  const [editando,     setEditando]     = useState<Producto | null>(null);
  const [form,         setForm]         = useState(EMPTY_FORM);
  const [saving,       setSaving]       = useState(false);
  const [error,        setError]        = useState("");
  const [verInactivos, setVerInactivos] = useState(false);
  const [showScanner,  setShowScanner]  = useState(false);
  const [scanMode,     setScanMode]     = useState<ScanMode>("buscar");

  const cargar = useCallback(async (append = false) => {
    if (append) setLoadingMore(true); else setLoading(true);
    try {
      const offset = append ? productos.length : 0;
      const res = await api.get(
        `/api/v1/app/productos?incluir_inactivos=${verInactivos}&limit=${PRODUCTOS_LIMIT}&offset=${offset}`
      );
      const nuevos = res.data.data ?? [];
      setTotal(res.data.total ?? 0);
      setProductos(prev => append ? [...prev, ...nuevos] : nuevos);
    } catch (e) {
      console.error(e);
    } finally {
      if (append) setLoadingMore(false); else setLoading(false);
    }
  }, [verInactivos, productos.length]);

  useEffect(() => {
    cargar();
  }, [verInactivos]);

  if (!puedeVer) return <SinAcceso />;

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
      codigo:       p.codigo ?? "",
      descripcion:  p.descripcion,
      precio:       String(precioVisible(p)),
      incluye_iva:  !!(p.precio_incluye_iva && p.precio_con_iva != null),
      tipo_iva:     p.tipo_iva,
      unidad:       p.unidad,
      stock:        String(p.stock ?? -1),
      stock_minimo: String(p.stock_minimo ?? 0),
    });
    setError("");
    setShowModal(true);
  };

  const stockValue = () => form.stock === "" ? -1 : parseInt(form.stock);

  // ── Scanner handlers ──────────────────────────────────────────────────────
  const abrirScannerBuscar = () => {
    setScanMode("buscar");
    setShowScanner(true);
  };

  const abrirScannerCodigo = () => {
    setScanMode("codigo");
    setShowScanner(true);
  };

  const handleScan = (code: string) => {
    setShowScanner(false);
    if (scanMode === "buscar") {
      // Poner el código escaneado en el filtro de búsqueda
      setQuery(code);
    } else {
      // Llenar el campo código del formulario
      setForm(prev => ({ ...prev, codigo: code.toUpperCase() }));
    }
  };

  // ── Save ──────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    setError("");

    if (!form.codigo.trim()) {
      setError("El código es obligatorio.");
      return;
    }
    if (!form.descripcion || form.precio === "") {
      setError("Descripción y precio son obligatorios.");
      return;
    }
    if (parseFloat(form.precio) < 0) {
      setError("El precio no puede ser negativo.");
      return;
    }

    // Verificar código único (solo si es nuevo o cambió el código)
    if (!editando || editando.codigo !== form.codigo.trim()) {
      const existente = productos.find(
        p => p.codigo?.toUpperCase() === form.codigo.trim().toUpperCase() && p.id !== editando?.id
      );
      if (existente) {
        setError(`El código "${form.codigo}" ya existe (${existente.descripcion}).`);
        return;
      }
    }

    setSaving(true);
    try {
      const { incluye_iva, ...resto } = form;
      const payload = {
        ...resto,
        codigo:       form.codigo.trim().toUpperCase(),
        precio:       parseFloat(form.precio),
        precio_incluye_iva: incluye_iva,
        stock:        stockValue(),
        stock_minimo: parseInt(form.stock_minimo) || 0,
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
          <h1 className="text-xl font-bold" style={{ color: "var(--kipu-text)" }}>Productos y Servicios</h1>
          <p className="text-sm" style={{ color: "var(--kipu-subtle)" }}>
            {total > 0 ? `${total} producto${total !== 1 ? "s" : ""}` : "0 productos"}
          </p>
        </div>
        <button
          type="button"
          onClick={abrirCrear}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-medium transition-colors"
          style={{ background: "var(--kipu-accent)" }}
          onMouseEnter={e => e.currentTarget.style.background = "var(--kipu-accent-h)"}
          onMouseLeave={e => e.currentTarget.style.background = "var(--kipu-accent)"}
        >
          <Plus size={15} />
          Nuevo
        </button>
      </div>

      {/* Filtros — con botón de scanner */}
      <div className="flex gap-3 mb-4">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--kipu-subtle)" }} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por descripción o código..."
            className="w-full pl-9 pr-10 py-2.5 rounded-lg text-sm transition-colors focus:outline-none"
            style={{
              background: "var(--kipu-surface)",
              border: "1px solid var(--kipu-border)",
              color: "var(--kipu-text)",
            }}
            onFocus={e => e.currentTarget.style.borderColor = "var(--kipu-accent)"}
            onBlur={e => e.currentTarget.style.borderColor = "var(--kipu-border)"}
          />
          <button
            type="button"
            onClick={abrirScannerBuscar}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded transition-colors"
            style={{ color: "var(--kipu-subtle)" }}
            onMouseEnter={e => e.currentTarget.style.color = "var(--kipu-accent)"}
            onMouseLeave={e => e.currentTarget.style.color = "var(--kipu-subtle)"}
            title="Escanear código de barras para buscar"
          >
            <Camera size={16} />
          </button>
        </div>
        <button
          type="button"
          onClick={() => setVerInactivos(!verInactivos)}
          className="px-3 py-2 rounded-lg text-xs font-medium transition-colors"
          style={{
            background: verInactivos ? "color-mix(in srgb, var(--kipu-text) 15%, transparent)" : "var(--kipu-surface)",
            border: verInactivos ? "1px solid color-mix(in srgb, var(--kipu-text) 30%, transparent)" : "1px solid var(--kipu-border)",
            color: verInactivos ? "var(--kipu-text)" : "var(--kipu-subtle)",
          }}
          onMouseEnter={e => {
            if (!verInactivos) e.currentTarget.style.color = "var(--kipu-text)";
          }}
          onMouseLeave={e => {
            if (!verInactivos) e.currentTarget.style.color = "var(--kipu-subtle)";
          }}
        >
          {verInactivos ? "Ocultar inactivos" : "Ver inactivos"}
        </button>
      </div>

      {/* Lista */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div
            className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin"
            style={{ borderColor: "var(--kipu-accent)", borderTopColor: "transparent" }}
          />
        </div>
      ) : filtrados.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Package size={40} className="mb-3" style={{ color: "var(--kipu-subtle)" }} />
          <p className="text-sm" style={{ color: "var(--kipu-muted)" }}>
            {query ? "No hay productos que coincidan." : "Aún no tienes productos en el catálogo."}
          </p>
          {!query && (
            <button
              type="button"
              onClick={abrirCrear}
              className="mt-4 px-4 py-2 rounded-lg text-white text-sm font-medium transition-colors"
              style={{ background: "var(--kipu-accent)" }}
              onMouseEnter={e => e.currentTarget.style.background = "var(--kipu-accent-h)"}
              onMouseLeave={e => e.currentTarget.style.background = "var(--kipu-accent)"}
            >
              Agregar primer producto
            </button>
          )}
        </div>
      ) : (
        <>
          <div
            className="rounded-xl overflow-hidden"
            style={{
              background: "var(--kipu-surface)",
              border: "1px solid var(--kipu-border)",
            }}
          >
            {/* Header tabla */}
            <div
              className="hidden md:grid grid-cols-12 gap-3 px-4 py-2.5 text-xs"
              style={{
                borderBottom: "1px solid var(--kipu-border)",
                color: "var(--kipu-subtle)",
              }}
            >
              <span className="col-span-2">Código</span>
              <span className="col-span-4">Descripción</span>
              <span className="col-span-2 text-center">Precio</span>
              <span className="col-span-1 text-center">IVA</span>
              <span className="col-span-1 text-center">Stock</span>
              <span className="col-span-2 text-right">Acciones</span>
            </div>
            <div>
              {filtrados.map((p, idx) => (
                <div
                  key={p.id}
                  className="flex md:grid md:grid-cols-12 gap-3 items-center px-4 py-3 transition-colors"
                  style={{
                    borderTop: idx > 0 ? "1px solid var(--kipu-border)" : "none",
                    opacity: !p.activo ? 0.5 : 1,
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = "color-mix(in srgb, var(--kipu-text) 4%, transparent)"}
                  onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                >
                  <span className="hidden md:block col-span-2 text-xs font-mono truncate" style={{ color: "var(--kipu-subtle)" }}>
                    {p.codigo || "—"}
                  </span>
                  <div className="flex-1 md:col-span-4 min-w-0">
                    <p className="text-sm truncate" style={{ color: "var(--kipu-text)" }}>{p.descripcion}</p>
                    <p className="text-xs md:hidden" style={{ color: "var(--kipu-subtle)" }}>
                      {p.codigo || "Sin código"} · IVA {etiquetaIva(p.tipo_iva)} · {p.unidad}
                      {p.stock !== -1 && ` · Stock: ${p.stock}`}
                    </p>
                  </div>
                  <span className="hidden md:block col-span-2 text-sm font-semibold text-center" style={{ color: "var(--kipu-text)" }}>
                    ${fmt(precioVisible(p))}
                    {tarifaPct(p.tipo_iva) > 0 && (
                      <span className="block text-[10px] font-normal" style={{ color: "var(--kipu-subtle)" }}>
                        {p.precio_incluye_iva ? "IVA incluido" : "+ IVA"}
                      </span>
                    )}
                  </span>
                  <span className="hidden md:block col-span-1 text-xs text-center" style={{ color: "var(--kipu-muted)" }}>
                    {etiquetaIva(p.tipo_iva)}
                  </span>
                  <span className="hidden md:block col-span-1 text-xs text-center font-medium">
                    {p.stock === -1 ? (
                      <span style={{ color: "var(--kipu-subtle)" }}>—</span>
                    ) : p.stock === 0 ? (
                      <span
                        className="px-2 py-0.5 rounded-full"
                        style={{
                          color: "var(--kipu-danger)",
                          background: "color-mix(in srgb, var(--kipu-danger) 10%, transparent)",
                        }}
                      >
                        Sin stock
                      </span>
                    ) : (
                      <span
                        className="px-2 py-0.5 rounded-full"
                        style={{
                          color: (p.stock_minimo > 0 && p.stock <= p.stock_minimo)
                            ? "var(--kipu-danger)"
                            : p.stock <= 5
                            ? "var(--kipu-warning)"
                            : "var(--kipu-success)",
                          background: (p.stock_minimo > 0 && p.stock <= p.stock_minimo)
                            ? "color-mix(in srgb, var(--kipu-danger) 10%, transparent)"
                            : p.stock <= 5
                            ? "color-mix(in srgb, var(--kipu-warning) 10%, transparent)"
                            : "color-mix(in srgb, var(--kipu-success) 10%, transparent)",
                        }}
                      >
                        {p.stock}
                      </span>
                    )}
                  </span>
                  <div className="md:col-span-2 flex items-center justify-end gap-2 shrink-0">
                    <span className="text-sm font-semibold md:hidden text-right" style={{ color: "var(--kipu-text)" }}>
                      ${fmt(precioVisible(p))}
                      {tarifaPct(p.tipo_iva) > 0 && (
                        <span className="block text-[10px] font-normal" style={{ color: "var(--kipu-subtle)" }}>
                          {p.precio_incluye_iva ? "IVA incl." : "+ IVA"}
                        </span>
                      )}
                    </span>
                    <button
                      type="button"
                      onClick={() => abrirEditar(p)}
                      className="p-1.5 rounded transition-colors"
                      style={{ color: "var(--kipu-subtle)" }}
                      onMouseEnter={e => {
                        e.currentTarget.style.color = "var(--kipu-text)";
                        e.currentTarget.style.background = "color-mix(in srgb, var(--kipu-text) 10%, transparent)";
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.color = "var(--kipu-subtle)";
                        e.currentTarget.style.background = "transparent";
                      }}
                      title="Editar"
                    >
                      <Pencil size={14} />
                    </button>
                    {p.activo ? (
                      <button
                        type="button"
                        onClick={() => desactivar(p.id)}
                        className="p-1.5 rounded transition-colors"
                        style={{ color: "var(--kipu-subtle)" }}
                        onMouseEnter={e => {
                          e.currentTarget.style.color = "var(--kipu-danger)";
                          e.currentTarget.style.background = "color-mix(in srgb, var(--kipu-danger) 10%, transparent)";
                        }}
                        onMouseLeave={e => {
                          e.currentTarget.style.color = "var(--kipu-subtle)";
                          e.currentTarget.style.background = "transparent";
                        }}
                        title="Desactivar"
                      >
                        <PowerOff size={14} />
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => reactivar(p.id)}
                        className="p-1.5 rounded transition-colors"
                        style={{ color: "var(--kipu-subtle)" }}
                        onMouseEnter={e => {
                          e.currentTarget.style.color = "var(--kipu-success)";
                          e.currentTarget.style.background = "color-mix(in srgb, var(--kipu-success) 10%, transparent)";
                        }}
                        onMouseLeave={e => {
                          e.currentTarget.style.color = "var(--kipu-subtle)";
                          e.currentTarget.style.background = "transparent";
                        }}
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

          {/* Cargar más */}
          {!loading && productos.length < total && (
            <div className="flex justify-center mt-4">
              <button
                type="button"
                onClick={() => cargar(true)}
                disabled={loadingMore}
                className="px-6 py-2.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                style={{
                  border: "1px solid var(--kipu-border)",
                  color: "var(--kipu-accent)",
                }}
              >
                {loadingMore ? "Cargando..." : `Cargar más (${productos.length} de ${total})`}
              </button>
            </div>
          )}
        </>
      )}

      {/* Modal crear/editar */}
      {showModal && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div
            className="rounded-xl w-full max-w-md max-h-[90vh] overflow-y-auto"
            style={{
              background: "var(--kipu-surface)",
              border: "1px solid var(--kipu-border)",
            }}
          >
            <div
              className="flex items-center justify-between px-5 py-4 sticky top-0"
              style={{
                borderBottom: "1px solid var(--kipu-border)",
                background: "var(--kipu-surface)",
              }}
            >
              <h2 className="text-sm font-semibold" style={{ color: "var(--kipu-text)" }}>
                {editando ? "Editar producto" : "Nuevo producto"}
              </h2>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="transition-colors"
                style={{ color: "var(--kipu-subtle)" }}
                onMouseEnter={e => e.currentTarget.style.color = "var(--kipu-text)"}
                onMouseLeave={e => e.currentTarget.style.color = "var(--kipu-subtle)"}
              >
                <X size={18} />
              </button>
            </div>
            <div className="p-5 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                {/* Código */}
                <div>
                  <label className="block text-xs mb-1.5" style={{ color: "var(--kipu-subtle)" }}>
                    Código <span style={{ color: "var(--kipu-danger)" }}>*</span>
                  </label>
                  <input
                    value={form.codigo}
                    onChange={(e) => setForm({ ...form, codigo: e.target.value.toUpperCase() })}
                    placeholder="PROD-001"
                    disabled={Boolean(editando)}
                    className="w-full px-3 py-2 rounded-lg text-sm transition-colors focus:outline-none"
                    style={{
                      background: "var(--kipu-surface)",
                      border: "1px solid var(--kipu-border)",
                      color: "var(--kipu-text)",
                      opacity: editando ? 0.6 : 1,
                      cursor: editando ? "not-allowed" : "text",
                    }}
                    onFocus={e => e.currentTarget.style.borderColor = "var(--kipu-accent)"}
                    onBlur={e => e.currentTarget.style.borderColor = "var(--kipu-border)"}
                  />
                  {/* Botón escanear — solo al crear */}
                  <button
                    type="button"
                    onClick={abrirScannerCodigo}
                    className="mt-1.5 items-center gap-1.5 text-xs transition-colors"
                    style={{
                      display: editando ? "none" : "inline-flex",
                      color: "var(--kipu-subtle)",
                    }}
                    onMouseEnter={e => e.currentTarget.style.color = "var(--kipu-accent)"}
                    onMouseLeave={e => e.currentTarget.style.color = "var(--kipu-subtle)"}
                  >
                    <Camera size={13} />
                    Escanear
                  </button>
                </div>
                {/* Precio */}
                <div>
                  <label className="block text-xs mb-1.5" style={{ color: "var(--kipu-subtle)" }}>Precio *</label>
                  <input
                    type="number"
                    value={form.precio}
                    onChange={(e) => setForm({ ...form, precio: e.target.value })}
                    placeholder="0.00"
                    min={0}
                    step={0.01}
                    className="w-full px-3 py-2 rounded-lg text-sm transition-colors focus:outline-none"
                    style={{
                      background: "var(--kipu-surface)",
                      border: "1px solid var(--kipu-border)",
                      color: "var(--kipu-text)",
                    }}
                    onFocus={e => e.currentTarget.style.borderColor = "var(--kipu-accent)"}
                    onBlur={e => e.currentTarget.style.borderColor = "var(--kipu-border)"}
                  />
                  {/* ¿Al precio se le suma el IVA o ya lo incluye? */}
                  <div
                    role="radiogroup"
                    aria-label="El precio que ingreso"
                    className="mt-1.5 grid grid-cols-2 rounded-lg overflow-hidden text-[11px]"
                    style={{ border: "1px solid var(--kipu-border)" }}
                  >
                    {([[false, "+ IVA", "Kipu le suma el IVA"], [true, "IVA incluido", "Kipu desglosa el IVA"]] as const)
                      .map(([valor, etiqueta, ayuda]) => {
                        const activo = form.incluye_iva === valor;
                        return (
                          <button
                            key={etiqueta}
                            type="button"
                            role="radio"
                            aria-checked={activo}
                            title={ayuda}
                            onClick={() => setForm({ ...form, incluye_iva: valor })}
                            className="py-1 transition-colors"
                            style={{
                              background: activo ? "var(--kipu-accent)" : "transparent",
                              color:      activo ? "#FFFFFF" : "var(--kipu-muted)",
                            }}
                          >
                            {etiqueta}
                          </button>
                        );
                      })}
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-xs mb-1.5" style={{ color: "var(--kipu-subtle)" }}>Descripción *</label>
                <input
                  value={form.descripcion}
                  onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
                  placeholder="Nombre del producto o servicio"
                  className="w-full px-3 py-2 rounded-lg text-sm transition-colors focus:outline-none"
                  style={{
                    background: "var(--kipu-surface)",
                    border: "1px solid var(--kipu-border)",
                    color: "var(--kipu-text)",
                  }}
                  onFocus={e => e.currentTarget.style.borderColor = "var(--kipu-accent)"}
                  onBlur={e => e.currentTarget.style.borderColor = "var(--kipu-border)"}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs mb-1.5" style={{ color: "var(--kipu-subtle)" }}>IVA</label>
                  <select
                    value={form.tipo_iva}
                    onChange={(e) => setForm({ ...form, tipo_iva: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg text-sm transition-colors focus:outline-none"
                    style={{
                      background: "var(--kipu-surface)",
                      border: "1px solid var(--kipu-border)",
                      color: "var(--kipu-text)",
                    }}
                    onFocus={e => e.currentTarget.style.borderColor = "var(--kipu-accent)"}
                    onBlur={e => e.currentTarget.style.borderColor = "var(--kipu-border)"}
                  >
                    {opcionesIva(editando?.tipo_iva).map(o => (
                      <option key={o.valor} value={o.valor}>{o.etiqueta}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs mb-1.5" style={{ color: "var(--kipu-subtle)" }}>Unidad</label>
                  <select
                    value={form.unidad}
                    onChange={(e) => setForm({ ...form, unidad: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg text-sm transition-colors focus:outline-none"
                    style={{
                      background: "var(--kipu-surface)",
                      border: "1px solid var(--kipu-border)",
                      color: "var(--kipu-text)",
                    }}
                    onFocus={e => e.currentTarget.style.borderColor = "var(--kipu-accent)"}
                    onBlur={e => e.currentTarget.style.borderColor = "var(--kipu-border)"}
                  >
                    {UNIDADES.map(u => <option key={u} value={u}>{u}</option>)}
                  </select>
                </div>
              </div>

              {/* Desglose de lo que se escribió */}
              {parseFloat(form.precio) > 0 && (() => {
                const d = desglose(parseFloat(form.precio), form.incluye_iva, form.tipo_iva);
                if (d.pct === 0) return (
                  <p className="text-[11px]" style={{ color: "var(--kipu-subtle)" }}>
                    Sin IVA: tu cliente paga ${fmt(d.final)}.
                  </p>
                );
                const redondeo = form.incluye_iva && d.final !== r2(parseFloat(form.precio));
                return (
                  <div className="text-[11px] rounded-lg px-3 py-2 space-y-0.5"
                       style={{ background: "color-mix(in srgb, var(--kipu-text) 4%, transparent)", color: "var(--kipu-muted)" }}>
                    <p>
                      Base ${fmt(d.base)} · IVA {d.pct}% ${fmt(d.iva)} ·{" "}
                      <strong style={{ color: "var(--kipu-text)" }}>Tu cliente paga ${fmt(d.final)}</strong>
                    </p>
                    <p style={{ color: "var(--kipu-subtle)" }}>
                      {form.incluye_iva
                        ? "Si cambia el IVA, el precio final se mantiene y la base se ajusta."
                        : "Si cambia el IVA, la base se mantiene y el precio final se ajusta."}
                    </p>
                    {redondeo && (
                      <p style={{ color: "var(--kipu-warning)" }}>
                        Con el redondeo del SRI no hay una base exacta para ese precio: queda en ${fmt(d.final)}.
                      </p>
                    )}
                  </div>
                );
              })()}
              {/* Stock */}
              <div>
                <label className="block text-xs mb-1.5" style={{ color: "var(--kipu-subtle)" }}>
                  {editando ? "Stock actual" : "Stock inicial"}
                </label>
                <input
                  type="number"
                  value={form.stock}
                  onChange={(e) => setForm({ ...form, stock: e.target.value })}
                  placeholder="-1"
                  min={-1}
                  step={1}
                  className="w-full px-3 py-2 rounded-lg text-sm transition-colors focus:outline-none"
                  style={{
                    background: "var(--kipu-surface)",
                    border: "1px solid var(--kipu-border)",
                    color: "var(--kipu-text)",
                  }}
                  onFocus={e => e.currentTarget.style.borderColor = "var(--kipu-accent)"}
                  onBlur={e => e.currentTarget.style.borderColor = "var(--kipu-border)"}
                />
                <p className="text-[11px] mt-1" style={{ color: "var(--kipu-subtle)" }}>-1 = sin control de stock</p>
              </div>

              {/* Stock mínimo */}
              {stockValue() !== -1 && (
                <div>
                  <label className="block text-xs mb-1.5" style={{ color: "var(--kipu-subtle)" }}>
                    Stock mínimo <span style={{ color: "var(--kipu-subtle)" }}>(alerta cuando llegue a este nivel)</span>
                  </label>
                  <input
                    type="number"
                    value={form.stock_minimo}
                    onChange={(e) => setForm({ ...form, stock_minimo: e.target.value })}
                    placeholder="0"
                    min={0}
                    step={1}
                    className="w-full px-3 py-2 rounded-lg text-sm transition-colors focus:outline-none"
                    style={{
                      background: "var(--kipu-surface)",
                      border: "1px solid var(--kipu-border)",
                      color: "var(--kipu-text)",
                    }}
                    onFocus={e => e.currentTarget.style.borderColor = "var(--kipu-accent)"}
                    onBlur={e => e.currentTarget.style.borderColor = "var(--kipu-border)"}
                  />
                  <p className="text-[11px] mt-1" style={{ color: "var(--kipu-subtle)" }}>0 = sin alerta de stock bajo</p>
                </div>
              )}

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
              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
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
                  type="button"
                  onClick={handleSave}
                  disabled={saving}
                  className="flex-1 py-2.5 rounded-lg text-white text-sm font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
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
                  {editando ? "Actualizar" : "Guardar"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Barcode Scanner — compartido entre búsqueda y código */}
      {showScanner && (
        <Suspense fallback={null}>
          <BarcodeScanner
            onScan={handleScan}
            onClose={() => setShowScanner(false)}
          />
        </Suspense>
      )}
    </div>
  );
}