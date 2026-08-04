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
  id:                      string;
  razon_social:            string;
  identificacion:          string;
  tipo_identificacion_sri: string;
  email:                   string;
  direccion:               string;
}

interface Item {
  _id:            string;
  descripcion:    string;
  cantidad:       number;
  precio:         number;
  descuento:      number;
  tipo_descuento: "$" | "%";
  tipo_iva:       string;
  unidad:         string;
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

// Auxiliar de redondeo exacto a 2 decimales
const r2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;
const fmt = (n: number) => r2(n).toFixed(2);

// ── Cálculos ──────────────────────────────────────────────────────────────────
function calcItem(item: Item) {
  const subtotal  = r2(item.cantidad * item.precio);
  const descuento = r2(
    item.tipo_descuento === "%" 
      ? subtotal * (item.descuento / 100)
      : item.descuento
  );
  const base      = r2(subtotal - descuento);
  const iva       = r2(base * (IVA_RATES[item.tipo_iva] ?? 0.15));
  const total     = r2(base + iva);

  return { subtotal, descuento, base, iva, total };
}

function calcTotales(items: Item[], incluirPropina: boolean) {
  const baseTotales = items.reduce(
    (acc, item) => {
      const c = calcItem(item);
      acc.subtotal    = r2(acc.subtotal + c.base);
      acc.descuento   = r2(acc.descuento + c.descuento);
      acc.iva         = r2(acc.iva + c.iva);
      acc.subtotal_0  = r2(acc.subtotal_0 + (item.tipo_iva === "0"  ? c.base : 0));
      acc.subtotal_5  = r2(acc.subtotal_5 + (item.tipo_iva === "5"  ? c.base : 0));
      acc.subtotal_15 = r2(acc.subtotal_15 + (item.tipo_iva === "15" ? c.base : 0));
      acc.iva_5       = r2(acc.iva_5  + (item.tipo_iva === "5"  ? c.iva : 0));
      acc.iva_15      = r2(acc.iva_15 + (item.tipo_iva === "15" ? c.iva : 0));
      return acc;
    },
    {
      subtotal: 0, descuento: 0, iva: 0,
      subtotal_0: 0, subtotal_5: 0, subtotal_15: 0,
      iva_5: 0, iva_15: 0
    }
  );

  const valorPropina = incluirPropina ? r2(baseTotales.subtotal * 0.10) : 0;
  const total = r2(baseTotales.subtotal + baseTotales.iva + valorPropina);

  return {
    ...baseTotales,
    propina: valorPropina,
    total
  };
}

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

  // Cliente Nuevo Inline
  const [clienteNuevo, setClienteNuevo] = useState<{
    tipo_identificacion_sri: string;
    identificacion: string;
    razon_social: string;
    email: string;
  } | null>(null);

  // Productos
  const [productoQuery,   setProductoQuery]   = useState("");
  const [productoResults, setProductoResults] = useState<Producto[]>([]);
  const [productoLoading, setProductoLoading] = useState(false);
  const [showProductos,   setShowProductos]   = useState(false);

  // Items de la factura
  const [items, setItems] = useState<Item[]>([
    { _id: genId(), descripcion: "", cantidad: 1, precio: 0, descuento: 0, tipo_descuento: "$", tipo_iva: "15", unidad: "UNIDAD" }
  ]);

  // Pago
  const [formaPago, setFormaPago] = useState<FormaPago>("01");

  // Propina
  const [propina, setPropina] = useState(false);
  const [showPropinaWarning, setShowPropinaWarning] = useState(false);

  // Información Adicional
  const [camposAdicionales, setCamposAdicionales] = useState<{nombre: string; valor: string}[]>([]);

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

  // ── Cargar Prefill (Clonación de factura con validación estricta) ────────────
  useEffect(() => {
    const prefill = sessionStorage.getItem("kipu:prefill");
    if (prefill) {
      try {
        const data = JSON.parse(prefill);
        
        if (data.items && Array.isArray(data.items)) {
          setItems(data.items.map((i: any) => ({
            _id:            genId(),
            descripcion:    String(i.descripcion ?? ""),
            cantidad:       parseFloat(i.cantidad)       || 1,
            precio:         parseFloat(i.precio)         || 0,
            descuento:      parseFloat(i.descuento)      || 0,
            tipo_descuento: (i.tipo_descuento === "%" ? "%" : "$") as "$" | "%",
            tipo_iva:       ["0", "5", "15"].includes(String(i.tipo_iva)) ? String(i.tipo_iva) : "15",
            unidad:         String(i.unidad ?? "UNIDAD"),
          })));
        }

        if (data.formaPago) setFormaPago(data.formaPago);
        if (data.camposAdicionales) setCamposAdicionales(data.camposAdicionales);

        if (data.esConsumidorFinal) {
          setEsConsumidorFinal(true);
          setClienteQuery("CONSUMIDOR FINAL");
        } else if (data.cliente) {
          setClienteSelected({
            id:                    data.cliente.id || "",
            razon_social:          data.cliente.razon_social || "",
            identificacion:        data.cliente.identificacion || "",
            tipo_identificacion_sri: data.cliente.tipo_id || "05",
            email:                 "",
            direccion:             "",
          });
          setClienteQuery(data.cliente.razon_social || "");
        }
      } catch (e) {
        console.error("Error al procesar prefill", e);
      } finally {
        sessionStorage.removeItem("kipu:prefill");
      }
    }
  }, []);

  // ── Cargar estructura al montar (con Caché) ─────────────────────────────────
  useEffect(() => {
    const cargarEstructura = async () => {
      try {
        const aplicarEstructura = (estabs: any[]) => {
          setEstablecimientos(estabs);
          if (estabs.length > 0) {
            setEstabSelected(estabs[0].codigo);
            const ptos = estabs[0].puntos_emision ?? [];
            setPuntos(ptos);
            if (ptos.length > 0) {
              setPtoSelected(ptos[0].codigo);
            }
          }
        };

        const cached = sessionStorage.getItem("kipu:estructura");
        if (cached) {
          aplicarEstructura(JSON.parse(cached));
          return;
        }

        const res = await api.get("/api/v1/app/estructura");
        const estabs = res.data.data ?? [];
        sessionStorage.setItem("kipu:estructura", JSON.stringify(estabs));
        aplicarEstructura(estabs);
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
    setClienteNuevo(null);
  };

  const seleccionarConsumidorFinal = () => {
    setClienteSelected(null);
    setEsConsumidorFinal(true);
    setClienteQuery("CONSUMIDOR FINAL");
    setShowClientes(false);
    setClienteNuevo(null);
  };

  // ── Seleccionar producto → agregar item ──────────────────────────────────
  const seleccionarProducto = (p: Producto) => {
    setItems(prev => [...prev, {
      _id:            genId(),
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
      precio: 0, descuento: 0, tipo_descuento: "$", tipo_iva: "15", unidad: "UNIDAD"
    }]);
  };

  // ── Funciones de Información Adicional ────────────────────────────────────
  const agregarCampo = () => setCamposAdicionales(prev => [...prev, { nombre: "", valor: "" }]);

  const editCampo = (i: number, field: "nombre" | "valor", value: string) => {
    setCamposAdicionales(prev => prev.map((c, idx) => idx === i ? { ...c, [field]: value } : c));
  };

  const removeCampo = (i: number) => {
    setCamposAdicionales(prev => prev.filter((_, idx) => idx !== i));
  };

  // ── Totales ──────────────────────────────────────────────────────────────
  const totales = calcTotales(items, propina);

  // ── Emitir ───────────────────────────────────────────────────────────────
  const emitir = async () => {
    setError("");

    if (!esConsumidorFinal && !clienteSelected && !clienteNuevo) {
      setError("Selecciona un cliente o elige Consumidor Final.");
      return;
    }
    if (clienteNuevo && !clienteNuevo.razon_social.trim()) {
      setError("El nombre del cliente es obligatorio.");
      return;
    }
    if (!estabSelected || !ptoSelected) {
      setError("Configura el establecimiento y punto de emisión.");
      return;
    }
    if (items.some(i => !i.descripcion?.trim())) {
      setError("Todos los items deben tener descripción.");
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
      cliente_id: esConsumidorFinal 
        ? "consumidor_final" 
        : clienteNuevo 
          ? undefined 
          : clienteSelected?.id,
      cliente: clienteNuevo ? {
        tipo_id:        clienteNuevo.tipo_identificacion_sri,
        nombre:         clienteNuevo.razon_social,
        identificacion: clienteNuevo.identificacion,
        email:          clienteNuevo.email,
      } : undefined,
      items: items.map(i => {
        const c = calcItem(i);
        return {
          descripcion:     i.descripcion,
          cantidad:        i.cantidad,
          precio_unitario: i.precio,
          descuento:       c.descuento,
          tipo_iva:        i.tipo_iva,
          unidad_medida:   i.unidad,
        };
      }),
      pagos: [{
        forma_pago:   formaPago,
        total:        totales.total,
        plazo:        "0",
        unidad_tiempo: "dias",
      }],
      propina: totales.propina,
      campos_adicionales: camposAdicionales.filter(c => c.nombre && c.valor),
    };

    try {
      const res = await api.post("/api/v1/app/invoices/emit", payload);
      setResultado(res.data);

      if (empresa) {
        updateBalance(empresa.balance_emision - 1, empresa.balance_recepcion);
      }
    } catch (err: any) {
      const detail = err?.response?.data?.detail;
      if (Array.isArray(detail)) {
        setError(detail.map((e: any) => `${e.campo}: ${e.mensaje}`).join(" | "));
      } else {
        setError(detail ?? "Error al emitir la factura.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  // Componente de Selección de Punto de Emisión
  const BloquePuntoEmision = () => (
    establecimientos.length > 0 ? (
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
              className="w-full px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white focus:outline-none focus:border-indigo-500 text-sm appearance-none pr-8"
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
              className="w-full px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white focus:outline-none focus:border-indigo-500 text-sm appearance-none pr-8"
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
    ) : null
  );

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
                setClienteNuevo(null);
                setItems([{ _id: genId(), descripcion: "", cantidad: 1, precio: 0, descuento: 0, tipo_descuento: "$", tipo_iva: "15", unidad: "UNIDAD" }]);
                setCamposAdicionales([]);
                setPropina(false);
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
    <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-6">

      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-white">Nueva Factura</h1>
        <p className="text-sm text-gray-500">
          {empresa?.razon_social} · {empresa?.ambiente === 2 ? "Producción" : "Pruebas"}
        </p>
      </div>

      {/* Créditos bajos */}
      {empresa && empresa.balance_emision <= 5 && (
        <div className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/20 rounded-lg px-4 py-3">
          <AlertTriangle size={16} className="text-amber-400 shrink-0" />
          <p className="text-sm text-amber-300">
            Te quedan <strong>{empresa.balance_emision}</strong> créditos.
            <a href="/configuracion" className="underline ml-1">Recargar ahora</a>
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Columna principal */}
        <div className="lg:col-span-2 space-y-6">

          {/* Punto de emisión en móviles */}
          <div className="lg:hidden">
            <BloquePuntoEmision />
          </div>

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

              {/* Botón rápido Consumidor Final bajo el input */}
              {!clienteSelected && !esConsumidorFinal && !clienteNuevo && (
                <button
                  type="button"
                  onClick={seleccionarConsumidorFinal}
                  className="mt-2 text-xs text-gray-500 hover:text-white transition-colors block"
                >
                  ¿Sin RUC? → Facturar a <span className="text-indigo-400 underline">Consumidor Final</span>
                </button>
              )}

              {/* Dropdown clientes */}
              {showClientes && (clienteResults.length > 0 || clienteQuery.length >= 2) && (
                <div className="absolute z-10 w-full mt-1 bg-gray-800 border border-gray-700 rounded-lg shadow-xl overflow-hidden">
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
                    <div className="px-4 py-3 space-y-2">
                      <p className="text-xs text-gray-500">No encontrado.</p>
                      <button
                        type="button"
                        onClick={() => {
                          setShowClientes(false);
                          setClienteNuevo({
                            tipo_identificacion_sri: "05",
                            identificacion: clienteQuery,
                            razon_social: "",
                            email: "",
                          });
                        }}
                        className="text-xs text-indigo-400 underline block text-left"
                      >
                        + Registrar "{clienteQuery}" como nuevo cliente
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Formulario inline de cliente nuevo */}
            {clienteNuevo && (
              <div className="mt-3 bg-gray-800 rounded-lg p-3 space-y-2 border border-indigo-500/30">
                <p className="text-xs text-indigo-400 font-medium">Nuevo cliente</p>
                <div className="grid grid-cols-2 gap-2">
                  <select
                    value={clienteNuevo.tipo_identificacion_sri}
                    onChange={(e) => setClienteNuevo({ ...clienteNuevo, tipo_identificacion_sri: e.target.value })}
                    className="px-2 py-1.5 rounded-lg bg-gray-700 border border-gray-600 text-white text-xs focus:outline-none focus:border-indigo-500"
                  >
                    <option value="04">RUC</option>
                    <option value="05">Cédula</option>
                    <option value="06">Pasaporte</option>
                    <option value="08">Exterior</option>
                  </select>
                  <input
                    value={clienteNuevo.identificacion}
                    onChange={(e) => setClienteNuevo({ ...clienteNuevo, identificacion: e.target.value })}
                    placeholder="Identificación"
                    className="px-2 py-1.5 rounded-lg bg-gray-700 border border-gray-600 text-white placeholder-gray-500 text-xs focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <input
                  value={clienteNuevo.razon_social}
                  onChange={(e) => setClienteNuevo({ ...clienteNuevo, razon_social: e.target.value })}
                  placeholder="Nombre / Razón Social *"
                  className="w-full px-2 py-1.5 rounded-lg bg-gray-700 border border-gray-600 text-white placeholder-gray-500 text-xs focus:outline-none focus:border-indigo-500"
                />
                <input
                  value={clienteNuevo.email}
                  onChange={(e) => setClienteNuevo({ ...clienteNuevo, email: e.target.value })}
                  placeholder="Email (opcional)"
                  className="w-full px-2 py-1.5 rounded-lg bg-gray-700 border border-gray-600 text-white placeholder-gray-500 text-xs focus:outline-none focus:border-indigo-500"
                />
                <button
                  type="button"
                  onClick={() => setClienteNuevo(null)}
                  className="text-xs text-gray-500 hover:text-white transition-colors"
                >
                  Cancelar
                </button>
              </div>
            )}

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
                  className="text-gray-500 hover:text-white p-1"
                >
                  <X size={16} />
                </button>
              </div>
            )}
          </div>

          {/* ── Items ── */}
          <div className="bg-gray-900 rounded-xl border border-gray-800 p-4 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Package size={15} className="text-indigo-400" />
                <h2 className="text-sm font-semibold text-white">Productos / Servicios</h2>
              </div>
              <span className="text-xs text-gray-500">{items.length} ítem(s)</span>
            </div>

            {/* Buscador de productos */}
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

            {/* Lista de ítems */}
            <div className="space-y-3">
              {items.map((item, index) => {
                const c = calcItem(item);
                return (
                  <div 
                    key={item._id} 
                    className="p-3.5 bg-gray-950/60 border border-gray-800/80 rounded-xl space-y-3 transition-colors hover:border-gray-700/80"
                  >
                    {/* Fila 1: Cantidad + Descripción + Eliminar */}
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-gray-500 w-4 shrink-0 text-center">
                        #{index + 1}
                      </span>
                      
                      <div className="w-20 shrink-0">
                        <input
                          type="number"
                          value={item.cantidad}
                          onChange={(e) => editItem(item._id, "cantidad", parseFloat(e.target.value) || 0)}
                          min={0.01}
                          step={0.01}
                          placeholder="Cant."
                          className="w-full px-2 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white focus:outline-none focus:border-indigo-500 text-sm font-medium text-center"
                        />
                      </div>

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

                    {/* Fila 2: Precio, Descuento ($ y %), IVA, y Subtotal */}
                    <div className="grid grid-cols-12 gap-2 text-xs items-end">
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

                      <div className="col-span-12 sm:col-span-3 flex sm:flex-col justify-between sm:justify-end items-center sm:items-end pt-2 sm:pt-0 border-t sm:border-t-0 border-gray-800/60">
                        <div className="text-right">
                          <span className="text-xs text-gray-400 block text-[10px]">Total Ítem</span>
                          <span className="text-sm font-bold text-indigo-400">
                            ${fmt(c.total)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <button
              onClick={addItem}
              className="mt-2 w-full py-2.5 rounded-xl border border-dashed border-gray-700 hover:border-indigo-500/50 hover:bg-indigo-500/5 text-sm text-indigo-400 hover:text-indigo-300 transition-all flex items-center justify-center gap-2 font-medium"
            >
              <Plus size={16} />
              Agregar ítem manualmente
            </button>
          </div>

          {/* ── Forma de pago ── */}
          <div className="bg-gray-900 rounded-xl border border-gray-800 p-4 space-y-4">
            <h2 className="text-sm font-semibold text-white">Forma de pago</h2>
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

            {/* Propina (10%) */}
            <div className="pt-2 border-t border-gray-800/80 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-300 font-medium">Propina (10%)</span>
                <span className="text-[10px] text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full">
                  Requiere autorización SRI
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (!propina) setShowPropinaWarning(true);
                  else setPropina(false);
                }}
                className={clsx(
                  "w-10 h-5 rounded-full transition-colors relative shrink-0",
                  propina ? "bg-indigo-600" : "bg-gray-700"
                )}
              >
                <span className={clsx(
                  "absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all shadow-sm",
                  propina ? "left-5" : "left-0.5"
                )} />
              </button>
            </div>
          </div>

          {/* ── Información adicional ── */}
          <div className="bg-gray-900 rounded-xl border border-gray-800 p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-white">Información adicional</h2>
              <button
                type="button"
                onClick={agregarCampo}
                className="flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
              >
                <Plus size={13} /> Agregar campo
              </button>
            </div>
            {camposAdicionales.length === 0 ? (
              <p className="text-xs text-gray-600 text-center py-2">
                Opcional — email, teléfono, número de orden, observaciones, etc.
              </p>
            ) : (
              <div className="space-y-2">
                {camposAdicionales.map((c, i) => (
                  <div key={i} className="flex gap-2 items-center">
                    <input
                      value={c.nombre}
                      onChange={(e) => editCampo(i, "nombre", e.target.value)}
                      placeholder="Nombre (ej: Email)"
                      className="flex-1 px-2.5 py-1.5 rounded-lg bg-gray-800 border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 text-xs"
                    />
                    <input
                      value={c.valor}
                      onChange={(e) => editCampo(i, "valor", e.target.value)}
                      placeholder="Valor"
                      className="flex-1 px-2.5 py-1.5 rounded-lg bg-gray-800 border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 text-xs"
                    />
                    <button
                      type="button"
                      onClick={() => removeCampo(i)}
                      className="p-1.5 text-gray-500 hover:text-red-400 transition-colors"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

        {/* ── Panel lateral — Totales ── */}
        <div className="space-y-4">

          {/* Punto de emisión en desktop */}
          <div className="hidden lg:block">
            <BloquePuntoEmision />
          </div>

          {/* Totales */}
          <div className="bg-gray-900 rounded-xl border border-gray-800 p-4 sticky top-4">
            <h2 className="text-sm font-semibold text-white mb-4">Resumen</h2>
            <div className="space-y-2 text-sm">
              {totales.subtotal_0 > 0 && (
                <div className="flex justify-between text-gray-400">
                  <span>Subtotal 0%</span>
                  <span>${fmt(totales.subtotal_0)}</span>
                </div>
              )}
              {totales.subtotal_5 > 0 && (
                <div className="flex justify-between text-gray-400">
                  <span>Subtotal 5%</span>
                  <span>${fmt(totales.subtotal_5)}</span>
                </div>
              )}
              {totales.subtotal_15 > 0 && (
                <div className="flex justify-between text-gray-400">
                  <span>Subtotal 15%</span>
                  <span>${fmt(totales.subtotal_15)}</span>
                </div>
              )}
              {totales.descuento > 0 && (
                <div className="flex justify-between text-amber-400">
                  <span>Descuento</span>
                  <span>-${fmt(totales.descuento)}</span>
                </div>
              )}
              {totales.iva_5 > 0 && (
                <div className="flex justify-between text-gray-400">
                  <span>IVA 5%</span>
                  <span>${fmt(totales.iva_5)}</span>
                </div>
              )}
              {totales.iva_15 > 0 && (
                <div className="flex justify-between text-gray-400">
                  <span>IVA 15%</span>
                  <span>${fmt(totales.iva_15)}</span>
                </div>
              )}
              {totales.propina > 0 && (
                <div className="flex justify-between text-indigo-400 font-medium">
                  <span>Propina (10%)</span>
                  <span>${fmt(totales.propina)}</span>
                </div>
              )}

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

      {/* Modal Advertencia Propina */}
      {showPropinaWarning && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-xl p-5 max-w-sm w-full space-y-4 shadow-2xl">
            <div className="flex items-start gap-3">
              <AlertTriangle size={20} className="text-amber-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-white font-semibold text-sm">Autorización requerida</p>
                <p className="text-gray-400 text-xs mt-1 leading-relaxed">
                  La propina del 10% requiere autorización previa del SRI. 
                  Solo aplica para establecimientos de alimentos y bebidas autorizados.
                  ¿Confirmas que tienes esta autorización?
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowPropinaWarning(false)}
                className="flex-1 py-2 rounded-lg border border-gray-700 text-gray-400 hover:text-white text-sm transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => { setPropina(true); setShowPropinaWarning(false); }}
                className="flex-1 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium transition-colors"
              >
                Sí, tengo autorización
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}