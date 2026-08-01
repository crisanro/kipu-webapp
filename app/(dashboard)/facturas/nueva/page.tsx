// app/(dashboard)/facturas/nueva/page.tsx
"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import { useAuthStore } from "@/store/auth.store";
import {
  Search, Plus, Trash2, Loader2, CheckCircle2,
  ChevronDown, User, Package, AlertTriangle, X
} from "lucide-react";
import { clsx } from "clsx";

// ── Tipos ──────────────────────────────────────────────────────────────────────
interface Producto {
  id:          string;
  descripcion: string;
  precio:      number;
  tipo_iva:    string;
  unidad:      string;
  codigo:      string;
}

interface Cliente {
  id:                    string;
  razon_social:          string;
  identificacion:        string;
  tipo_identificacion_sri: string;
  email:                 string;
  direccion:             string;
}

interface Item {
  _id:         string;
  descripcion: string;
  cantidad:    number;
  precio:      number;
  descuento:   number;
  tipo_iva:    string;
  unidad:      string;
}

type FormaPago = "01" | "15" | "16" | "17" | "19" | "20";

const FORMAS_PAGO: { value: FormaPago; label: string }[] = [
  { value: "01", label: "Efectivo" },
  { value: "15", label: "Compensación de deudas" },
  { value: "16", label: "Tarjeta de débito" },
  { value: "17", label: "Dinero electrónico" },
  { value: "19", label: "Tarjeta de crédito" },
  { value: "20", label: "Otros con utilización del sistema financiero" },
];

const IVA_RATES: Record<string, number> = { "0": 0, "5": 0.05, "15": 0.15 };

const genId = () => Math.random().toString(36).slice(2);

// ── Cálculos ──────────────────────────────────────────────────────────────────
function calcItem(item: Item) {
  const subtotal  = item.cantidad * item.precio;
  const descuento = subtotal * (item.descuento / 100);
  const base      = subtotal - descuento;
  const iva       = base * (IVA_RATES[item.tipo_iva] ?? 0.15);
  return { subtotal, descuento, base, iva, total: base + iva };
}

function calcTotales(items: Item[]) {
  return items.reduce(
    (acc, item) => {
      const c = calcItem(item);
      acc.subtotal   += c.base;
      acc.descuento  += c.descuento;
      acc.iva        += c.iva;
      acc.total      += c.total;
      acc.subtotal_0 += item.tipo_iva === "0" ? c.base : 0;
      acc.subtotal_iva += item.tipo_iva !== "0" ? c.base : 0;
      return acc;
    },
    { subtotal: 0, descuento: 0, iva: 0, total: 0, subtotal_0: 0, subtotal_iva: 0 }
  );
}

const fmt = (n: number) => n.toFixed(2);

// ── Componente principal ───────────────────────────────────────────────────────
export default function NuevaFacturaPage() {
  const router  = useRouter();
  const empresa = useAuthStore((s) => s.empresa);
  const updateBalance = useAuthStore((s) => s.updateBalance);

  // Cliente
  const [clienteQuery,    setClienteQuery]    = useState("");
  const [clienteResults,  setClienteResults]  = useState<Cliente[]>([]);
  const [clienteSelected, setClienteSelected] = useState<Cliente | null>(null);
  const [clienteLoading,  setClienteLoading]  = useState(false);
  const [showClientes,    setShowClientes]    = useState(false);
  const [esConsumidorFinal, setEsConsumidorFinal] = useState(false);

  // Productos
  const [productoQuery,   setProductoQuery]   = useState("");
  const [productoResults, setProductoResults] = useState<Producto[]>([]);
  const [productoLoading, setProductoLoading] = useState(false);
  const [showProductos,   setShowProductos]   = useState(false);

  // Items de la factura
  const [items, setItems] = useState<Item[]>([
    { _id: genId(), descripcion: "", cantidad: 1, precio: 0, descuento: 0, tipo_iva: "15", unidad: "UNIDAD" }
  ]);

  // Pago
  const [formaPago, setFormaPago] = useState<FormaPago>("01");

  // Establecimiento
  const [establecimientos, setEstablecimientos] = useState<any[]>([]);
  const [estabSelected,    setEstabSelected]    = useState("");
  const [ptoSelected,      setPtoSelected]      = useState("");
  const [puntos,           setPuntos]           = useState<any[]>([]);

  // Estado
  const [submitting, setSubmitting]   = useState(false);
  const [resultado,  setResultado]    = useState<any>(null);
  const [error,      setError]        = useState("");

  const clienteRef  = useRef<HTMLDivElement>(null);
  const productoRef = useRef<HTMLDivElement>(null);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Cargar estructura al montar ──────────────────────────────────────────
  useEffect(() => {
    const cargarEstructura = async () => {
      try {
        const res = await api.get("/api/v1/app/estructura");
        const estabs = res.data.data ?? [];
        setEstablecimientos(estabs);
        if (estabs.length > 0) {
          setEstabSelected(estabs[0].codigo);
          setPuntos(estabs[0].puntos_emision ?? []);
          if (estabs[0].puntos_emision?.length > 0) {
            setPtoSelected(estabs[0].puntos_emision[0].codigo);
          }
        }
      } catch (e) {
        console.error("Error cargando estructura", e);
      }
    };
    cargarEstructura();
  }, []);

  // ── Buscar clientes ──────────────────────────────────────────────────────
  const buscarClientes = useCallback(async (q: string) => {
    if (!q || q.length < 2) { setClienteResults([]); return; }
    setClienteLoading(true);
    try {
      const res = await api.get(`/api/v1/app/clientes?q=${encodeURIComponent(q)}`);
      setClienteResults(res.data.data ?? []);
      setShowClientes(true);
    } catch { setClienteResults([]); }
    finally { setClienteLoading(false); }
  }, []);

  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => buscarClientes(clienteQuery), 300);
    return () => {
      if (searchTimer.current) clearTimeout(searchTimer.current);
    };
  }, [clienteQuery, buscarClientes]);

  // ── Buscar productos ─────────────────────────────────────────────────────
  const buscarProductos = useCallback(async (q: string) => {
    if (!q || q.length < 1) { setProductoResults([]); return; }
    setProductoLoading(true);
    try {
      const res = await api.get(`/api/v1/app/productos/buscar?q=${encodeURIComponent(q)}`);
      setProductoResults(res.data.data ?? []);
      setShowProductos(true);
    } catch { setProductoResults([]); }
    finally { setProductoLoading(false); }
  }, []);

  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => buscarProductos(productoQuery), 250);
    return () => {
      if (searchTimer.current) clearTimeout(searchTimer.current);
    };
  }, [productoQuery, buscarProductos]);

  // ── Seleccionar cliente ──────────────────────────────────────────────────
  const seleccionarCliente = (c: Cliente) => {
    setClienteSelected(c);
    setClienteQuery(c.razon_social);
    setShowClientes(false);
    setEsConsumidorFinal(false);
  };

  const seleccionarConsumidorFinal = () => {
    setClienteSelected(null);
    setEsConsumidorFinal(true);
    setClienteQuery("CONSUMIDOR FINAL");
    setShowClientes(false);
  };

  // ── Seleccionar producto → agregar item ──────────────────────────────────
  const seleccionarProducto = (p: Producto) => {
    setItems(prev => [...prev, {
      _id:         genId(),
      descripcion: p.descripcion,
      cantidad:    1,
      precio:      p.precio,
      descuento:   0,
      tipo_iva:    p.tipo_iva,
      unidad:      p.unidad,
    }]);
    setProductoQuery("");
    setShowProductos(false);
  };

  // ── Editar item ──────────────────────────────────────────────────────────
  const editItem = (id: string, field: keyof Item, value: any) => {
    setItems(prev => prev.map(item =>
      item._id === id ? { ...item, [field]: value } : item
    ));
  };

  const removeItem = (id: string) => {
    if (items.length === 1) return;
    setItems(prev => prev.filter(i => i._id !== id));
  };

  const addItem = () => {
    setItems(prev => [...prev, {
      _id: genId(), descripcion: "", cantidad: 1,
      precio: 0, descuento: 0, tipo_iva: "15", unidad: "UNIDAD"
    }]);
  };

  // ── Totales ──────────────────────────────────────────────────────────────
  const totales = calcTotales(items);

  // ── Emitir ───────────────────────────────────────────────────────────────
  const emitir = async () => {
    setError("");

    if (!esConsumidorFinal && !clienteSelected) {
      setError("Selecciona un cliente o elige Consumidor Final.");
      return;
    }
    if (!estabSelected || !ptoSelected) {
      setError("Configura el establecimiento y punto de emisión.");
      return;
    }
    if (items.some(i => !i.descripcion || i.precio <= 0)) {
      setError("Todos los items deben tener descripción y precio mayor a 0.");
      return;
    }
    if (empresa?.balance_emision === 0) {
      setError("Sin créditos disponibles. Recarga para continuar.");
      return;
    }

    setSubmitting(true);

    const payload: any = {
      establecimiento: estabSelected,
      punto_emision:   ptoSelected,
      cliente_id:      esConsumidorFinal ? "consumidor_final" : clienteSelected?.id,
      items: items.map(i => ({
        descripcion:        i.descripcion,
        cantidad:           i.cantidad,
        precio_unitario:    i.precio,
        descuento:          i.descuento,
        tipo_iva:           i.tipo_iva,
        unidad_medida:      i.unidad,
      })),
      pagos: [{
        forma_pago:   formaPago,
        total:        totales.total,
        plazo:        "0",
        unidad_tiempo: "dias",
      }],
    };

    try {
      const res = await api.post("/api/v1/app/invoices/emit", payload);
      setResultado(res.data);

      // Actualizar balance en store
      if (empresa) {
        updateBalance(empresa.balance_emision - 1, empresa.balance_recepcion);
      }
    } catch (err: any) {
      setError(err?.response?.data?.detail ?? "Error al emitir la factura.");
    } finally {
      setSubmitting(false);
    }
  };

  // ── Resultado exitoso ────────────────────────────────────────────────────
  if (resultado) {
    const isAutorizado = resultado.estado === "AUTORIZADO";
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-gray-950">
        <div className="w-full max-w-sm text-center">
          <div className={clsx(
            "w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4",
            isAutorizado ? "bg-emerald-500/20" : "bg-indigo-500/20"
          )}>
            <CheckCircle2 size={32} className={isAutorizado ? "text-emerald-400" : "text-indigo-400"} />
          </div>
          <h2 className="text-xl font-bold text-white mb-1">
            {isAutorizado ? "¡Factura autorizada!" : "Factura en proceso"}
          </h2>
          <p className="text-sm text-gray-500 mb-2">{resultado.claveAcceso}</p>
          <span className={clsx(
            "inline-block px-3 py-1 rounded-full text-xs font-medium mb-6",
            isAutorizado
              ? "bg-emerald-500/20 text-emerald-400"
              : "bg-indigo-500/20 text-indigo-400"
          )}>
            {resultado.estado}
          </span>
          <div className="flex gap-3">
            <button
              onClick={() => {
                setResultado(null);
                setClienteSelected(null);
                setClienteQuery("");
                setEsConsumidorFinal(false);
                setItems([{ _id: genId(), descripcion: "", cantidad: 1, precio: 0, descuento: 0, tipo_iva: "15", unidad: "UNIDAD" }]);
              }}
              className="flex-1 py-2.5 rounded-lg border border-gray-700 text-gray-400 hover:text-white text-sm transition-colors"
            >
              Nueva factura
            </button>
            <button
              onClick={() => router.push("/facturas")}
              className="flex-1 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium transition-colors"
            >
              Ver historial
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Formulario ───────────────────────────────────────────────────────────
  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto">

      {/* Header */}
      <div className="mb-6">
        <h1 className="text-xl font-bold text-white">Nueva Factura</h1>
        <p className="text-sm text-gray-500">
          {empresa?.razon_social} · {empresa?.ambiente === 2 ? "Producción" : "Pruebas"}
        </p>
      </div>

      {/* Créditos bajos */}
      {empresa && empresa.balance_emision <= 5 && (
        <div className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/20 rounded-lg px-4 py-3 mb-4">
          <AlertTriangle size={16} className="text-amber-400 shrink-0" />
          <p className="text-sm text-amber-300">
            Te quedan <strong>{empresa.balance_emision}</strong> créditos.
            <a href="/configuracion" className="underline ml-1">Recargar ahora</a>
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Columna principal */}
        <div className="lg:col-span-2 space-y-4">

          {/* ── Cliente ── */}
          <div className="bg-gray-900 rounded-xl border border-gray-800 p-4">
            <div className="flex items-center gap-2 mb-3">
              <User size={15} className="text-indigo-400" />
              <h2 className="text-sm font-semibold text-white">Cliente</h2>
            </div>

            <div className="relative" ref={clienteRef}>
              <div className="relative">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                <input
                  value={clienteQuery}
                  onChange={(e) => {
                    setClienteQuery(e.target.value);
                    setClienteSelected(null);
                    setEsConsumidorFinal(false);
                    setShowClientes(true);
                  }}
                  placeholder="Buscar por nombre, RUC o cédula..."
                  className="w-full pl-9 pr-4 py-2.5 rounded-lg bg-gray-800 border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 text-sm"
                />
                {clienteLoading && (
                  <Loader2 size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 animate-spin" />
                )}
              </div>

              {/* Dropdown clientes */}
              {showClientes && (clienteResults.length > 0 || clienteQuery.length >= 2) && (
                <div className="absolute z-10 w-full mt-1 bg-gray-800 border border-gray-700 rounded-lg shadow-xl overflow-hidden">
                  {/* Consumidor final */}
                  <button
                    onClick={seleccionarConsumidorFinal}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-700 text-left border-b border-gray-700"
                  >
                    <div className="w-7 h-7 rounded-full bg-gray-600 flex items-center justify-center">
                      <User size={13} className="text-gray-400" />
                    </div>
                    <div>
                      <p className="text-sm text-white font-medium">Consumidor Final</p>
                      <p className="text-xs text-gray-500">9999999999999 · Máx. $50</p>
                    </div>
                  </button>

                  {clienteResults.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => seleccionarCliente(c)}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-700 text-left"
                    >
                      <div className="w-7 h-7 rounded-full bg-indigo-600/30 flex items-center justify-center">
                        <span className="text-xs text-indigo-400 font-bold">
                          {c.razon_social[0]}
                        </span>
                      </div>
                      <div>
                        <p className="text-sm text-white">{c.razon_social}</p>
                        <p className="text-xs text-gray-500">{c.identificacion}</p>
                      </div>
                    </button>
                  ))}

                  {clienteResults.length === 0 && clienteQuery.length >= 2 && (
                    <div className="px-4 py-3 text-sm text-gray-500">
                      No encontrado. <a href="/clientes" className="text-indigo-400 underline">Crear cliente</a>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Cliente seleccionado */}
            {(clienteSelected || esConsumidorFinal) && (
              <div className="mt-3 flex items-center gap-3 bg-gray-800 rounded-lg px-3 py-2.5">
                <div className="w-7 h-7 rounded-full bg-indigo-600/30 flex items-center justify-center shrink-0">
                  <User size={13} className="text-indigo-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white font-medium truncate">
                    {esConsumidorFinal ? "Consumidor Final" : clienteSelected?.razon_social}
                  </p>
                  <p className="text-xs text-gray-500">
                    {esConsumidorFinal ? "9999999999999" : clienteSelected?.identificacion}
                  </p>
                </div>
                <button
                  onClick={() => { setClienteSelected(null); setEsConsumidorFinal(false); setClienteQuery(""); }}
                  className="text-gray-500 hover:text-white"
                >
                  <X size={14} />
                </button>
              </div>
            )}
          </div>

          {/* ── Items ── */}
          <div className="bg-gray-900 rounded-xl border border-gray-800 p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Package size={15} className="text-indigo-400" />
                <h2 className="text-sm font-semibold text-white">Productos / Servicios</h2>
              </div>
              <span className="text-xs text-gray-500">{items.length} item(s)</span>
            </div>

            {/* Buscador de productos */}
            <div className="relative mb-4" ref={productoRef}>
              <div className="relative">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                <input
                  value={productoQuery}
                  onChange={(e) => { setProductoQuery(e.target.value); setShowProductos(true); }}
                  placeholder="Buscar en catálogo..."
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
                      className="w-full flex items-center justify-between gap-3 px-4 py-2.5 hover:bg-gray-700 text-left"
                    >
                      <div>
                        <p className="text-sm text-white">{p.descripcion}</p>
                        <p className="text-xs text-gray-500">{p.codigo || p.unidad} · IVA {p.tipo_iva}%</p>
                      </div>
                      <span className="text-sm font-medium text-indigo-400 shrink-0">
                        ${fmt(p.precio)}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Lista de items */}
            <div className="space-y-3">
              {/* Headers */}
              <div className="hidden md:grid grid-cols-12 gap-2 text-xs text-gray-500 px-1">
                <span className="col-span-4">Descripción</span>
                <span className="col-span-2 text-center">Cant.</span>
                <span className="col-span-2 text-center">Precio</span>
                <span className="col-span-1 text-center">Desc%</span>
                <span className="col-span-1 text-center">IVA</span>
                <span className="col-span-1 text-right">Total</span>
                <span className="col-span-1" />
              </div>

              {items.map((item) => {
                const c = calcItem(item);
                return (
                  <div key={item._id} className="grid grid-cols-12 gap-2 items-center">
                    <input
                      value={item.descripcion}
                      onChange={(e) => editItem(item._id, "descripcion", e.target.value)}
                      placeholder="Descripción del producto/servicio"
                      className="col-span-12 md:col-span-4 px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500 text-sm"
                    />
                    <input
                      type="number"
                      value={item.cantidad}
                      onChange={(e) => editItem(item._id, "cantidad", parseFloat(e.target.value) || 0)}
                      min={0.01}
                      step={0.01}
                      className="col-span-3 md:col-span-2 px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white focus:outline-none focus:border-indigo-500 text-sm text-center"
                    />
                    <input
                      type="number"
                      value={item.precio}
                      onChange={(e) => editItem(item._id, "precio", parseFloat(e.target.value) || 0)}
                      min={0}
                      step={0.01}
                      className="col-span-3 md:col-span-2 px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white focus:outline-none focus:border-indigo-500 text-sm text-center"
                    />
                    <input
                      type="number"
                      value={item.descuento}
                      onChange={(e) => editItem(item._id, "descuento", Math.min(100, parseFloat(e.target.value) || 0))}
                      min={0}
                      max={100}
                      className="col-span-2 md:col-span-1 px-2 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white focus:outline-none focus:border-indigo-500 text-sm text-center"
                    />
                    <select
                      value={item.tipo_iva}
                      onChange={(e) => editItem(item._id, "tipo_iva", e.target.value)}
                      className="col-span-2 md:col-span-1 px-2 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white focus:outline-none focus:border-indigo-500 text-sm"
                    >
                      <option value="0">0%</option>
                      <option value="5">5%</option>
                      <option value="15">15%</option>
                    </select>
                    <span className="col-span-2 md:col-span-1 text-sm font-medium text-white text-right">
                      ${fmt(c.total)}
                    </span>
                    <button
                      onClick={() => removeItem(item._id)}
                      disabled={items.length === 1}
                      className="col-span-1 flex justify-center text-gray-600 hover:text-red-400 disabled:opacity-30 transition-colors"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                );
              })}
            </div>

            <button
              onClick={addItem}
              className="mt-4 flex items-center gap-2 text-sm text-indigo-400 hover:text-indigo-300 transition-colors"
            >
              <Plus size={15} />
              Agregar item manualmente
            </button>
          </div>

          {/* ── Forma de pago ── */}
          <div className="bg-gray-900 rounded-xl border border-gray-800 p-4">
            <h2 className="text-sm font-semibold text-white mb-3">Forma de pago</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {FORMAS_PAGO.map(({ value, label }) => (
                <button
                  key={value}
                  onClick={() => setFormaPago(value)}
                  className={clsx(
                    "px-3 py-2 rounded-lg text-xs font-medium transition-colors text-left",
                    formaPago === value
                      ? "bg-indigo-600 text-white"
                      : "bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700"
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ── Panel lateral — Totales ── */}
        <div className="space-y-4">

          {/* Establecimiento */}
          {establecimientos.length > 0 && (
            <div className="bg-gray-900 rounded-xl border border-gray-800 p-4">
              <h2 className="text-sm font-semibold text-white mb-3">Punto de emisión</h2>
              <div className="space-y-2">
                <div className="relative">
                  <select
                    value={estabSelected}
                    onChange={(e) => {
                      setEstabSelected(e.target.value);
                      const estab = establecimientos.find(es => es.codigo === e.target.value);
                      const ptos  = estab?.puntos_emision ?? [];
                      setPuntos(ptos);
                      setPtoSelected(ptos[0]?.codigo ?? "");
                    }}
                    className="w-full px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white focus:outline-none focus:border-indigo-500 text-sm appearance-none"
                  >
                    {establecimientos.map((e: any) => (
                      <option key={e.codigo} value={e.codigo}>
                        {e.codigo} — {e.nombre_comercial || e.direccion}
                      </option>
                    ))}
                  </select>
                  <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
                </div>
                <div className="relative">
                  <select
                    value={ptoSelected}
                    onChange={(e) => setPtoSelected(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white focus:outline-none focus:border-indigo-500 text-sm appearance-none"
                  >
                    {puntos.map((p: any) => (
                      <option key={p.codigo} value={p.codigo}>
                        PTO {p.codigo} {p.nombre ? `— ${p.nombre}` : ""}
                      </option>
                    ))}
                  </select>
                  <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
                </div>
              </div>
            </div>
          )}

          {/* Totales */}
          <div className="bg-gray-900 rounded-xl border border-gray-800 p-4 sticky top-4">
            <h2 className="text-sm font-semibold text-white mb-4">Resumen</h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between text-gray-400">
                <span>Subtotal 0%</span>
                <span>${fmt(totales.subtotal_0)}</span>
              </div>
              <div className="flex justify-between text-gray-400">
                <span>Subtotal gravado</span>
                <span>${fmt(totales.subtotal_iva)}</span>
              </div>
              {totales.descuento > 0 && (
                <div className="flex justify-between text-amber-400">
                  <span>Descuento</span>
                  <span>-${fmt(totales.descuento)}</span>
                </div>
              )}
              <div className="flex justify-between text-gray-400">
                <span>IVA</span>
                <span>${fmt(totales.iva)}</span>
              </div>
              <div className="border-t border-gray-800 pt-2 flex justify-between font-bold text-white text-base">
                <span>Total</span>
                <span>${fmt(totales.total)}</span>
              </div>
            </div>

            {error && (
              <p className="mt-3 text-xs text-red-400 bg-red-400/10 px-3 py-2 rounded-lg">
                {error}
              </p>
            )}

            <button
              onClick={emitir}
              disabled={submitting || !empresa || empresa.balance_emision === 0}
              className="mt-4 w-full py-3 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold text-sm transition-colors flex items-center justify-center gap-2"
            >
              {submitting ? (
                <><Loader2 size={16} className="animate-spin" /> Emitiendo...</>
              ) : (
                `Emitir Factura · $${fmt(totales.total)}`
              )}
            </button>

            <p className="mt-2 text-center text-xs text-gray-600">
              Créditos disponibles: {empresa?.balance_emision ?? 0}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}