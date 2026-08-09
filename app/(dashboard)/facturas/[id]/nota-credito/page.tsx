// app/(dashboard)/facturas/[id]/nota-credito/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import api from "@/lib/api";
import { useAuthStore } from "@/store/auth.store";
import {
  ArrowLeft, Loader2, CheckCircle2, AlertTriangle,
  Trash2, Plus
} from "lucide-react";
import { clsx } from "clsx";

// ── Tipos ──────────────────────────────────────────────────────────────────────
interface ItemNC {
  _id:            string;
  codigo:         string;
  descripcion:    string;
  cantidad:       number;
  precio_unitario: number;
  descuento:      number;
  tipo_iva:       string;
  unidad_medida:  string;
}

// ── Helpers ────────────────────────────────────────────────────────────────────
const r2  = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;
const fmt = (n: number) => r2(n).toFixed(2);
const genId = () => Math.random().toString(36).slice(2);

const IVA_RATES: Record<string, number> = { "0": 0, "5": 0.05, "15": 0.15 };

function calcItem(item: ItemNC) {
  const subtotal  = r2(item.cantidad * item.precio_unitario);
  const descuento = r2(item.descuento);
  const base      = r2(subtotal - descuento);
  const iva       = r2(base * (IVA_RATES[item.tipo_iva] ?? 0.15));
  return { subtotal, descuento, base, iva, total: r2(base + iva) };
}

function calcTotales(items: ItemNC[]) {
  return items.reduce(
    (acc, item) => {
      const c = calcItem(item);
      return {
        subtotal:  r2(acc.subtotal + c.base),
        descuento: r2(acc.descuento + c.descuento),
        iva:       r2(acc.iva + c.iva),
        total:     r2(acc.total + c.total),
      };
    },
    { subtotal: 0, descuento: 0, iva: 0, total: 0 }
  );
}

// ── Página ─────────────────────────────────────────────────────────────────────
export default function NotaCreditoPage() {
  const { id }    = useParams();
  const router    = useRouter();
  const empresa   = useAuthStore((s) => s.empresa);
  const updateBalance = useAuthStore((s) => s.updateBalance);

  const [factura,    setFactura]    = useState<any>(null);
  const [loading,    setLoading]    = useState(true);
  const [items,      setItems]      = useState<ItemNC[]>([]);
  const [motivo,     setMotivo]     = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error,      setError]      = useState("");
  const [resultado,  setResultado]  = useState<any>(null);

  // ── Cargar factura original ──────────────────────────────────────────────────
  useEffect(() => {
    const cargar = async () => {
      try {
        const res = await api.get(`/api/v1/app/dashboard/factura/${id}`);
        const fac = res.data.factura;
        setFactura(fac);

        // Prellenar ítems desde la factura original
        const datos    = fac.datos ?? {};
        const detalles = datos.detalles?.detalle
          ? (Array.isArray(datos.detalles.detalle)
              ? datos.detalles.detalle
              : [datos.detalles.detalle])
          : [];

        setItems(detalles.map((d: any) => {
          const imp    = d.impuestos?.impuesto;
          const impArr = Array.isArray(imp) ? imp : [imp];
          const tarifa = impArr[0]?.tarifa ?? "15";
          const t      = parseInt(String(tarifa));
          const tipoIva = t === 0 ? "0" : t === 5 ? "5" : "15";

          return {
            _id:             genId(),
            codigo:          d.codigoPrincipal !== "S/C" ? d.codigoPrincipal : "",
            descripcion:     d.descripcion,
            cantidad:        parseFloat(d.cantidad),
            precio_unitario: parseFloat(d.precioUnitario),
            descuento:       parseFloat(d.descuento || 0),
            tipo_iva:        tipoIva,
            unidad_medida:   "UNIDAD",
          };
        }));
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    cargar();
  }, [id]);

  // ── Editar item ──────────────────────────────────────────────────────────────
  const editItem = (itemId: string, field: keyof ItemNC, value: any) => {
    setItems(prev => prev.map(i => i._id === itemId ? { ...i, [field]: value } : i));
  };

  const removeItem = (itemId: string) => {
    if (items.length === 1) return;
    setItems(prev => prev.filter(i => i._id !== itemId));
  };

  // ── Totales ──────────────────────────────────────────────────────────────────
  const totales = calcTotales(items);

  // ── Emitir NC ────────────────────────────────────────────────────────────────
  const emitir = async () => {
    setError("");

    if (!motivo.trim()) {
      setError("El motivo es obligatorio.");
      return;
    }
    if (motivo.trim().length < 5) {
      setError("El motivo debe tener al menos 5 caracteres.");
      return;
    }
    if (items.some(i => !i.descripcion.trim())) {
      setError("Todos los ítems deben tener descripción.");
      return;
    }
    if ((empresa?.balance_emision ?? 0) === 0) {
      setError("Sin créditos disponibles.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await api.post("/api/v1/app/notas-credito", {
        factura_id: id,
        motivo:     motivo.trim().toUpperCase(),
        items:      items.map(i => ({
          codigo:          i.codigo || undefined,
          descripcion:     i.descripcion,
          cantidad:        i.cantidad,
          precio_unitario: i.precio_unitario,
          descuento:       i.descuento,
          tipo_iva:        i.tipo_iva,
          unidad_medida:   i.unidad_medida,
        })),
      });
      setResultado(res.data);
      if (empresa) {
        updateBalance(empresa.balance_emision - 1, empresa.balance_recepcion);
      }
    } catch (err: any) {
      const detail = err?.response?.data?.detail;
      setError(typeof detail === "string" ? detail : "Error al emitir la nota de crédito.");
    } finally {
      setSubmitting(false);
    }
  };

  // ── Loading ──────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 size={24} className="animate-spin text-indigo-400" />
      </div>
    );
  }

  if (!factura) {
    return (
      <div className="p-6 text-center">
        <p className="text-gray-500">Factura no encontrada.</p>
        <button onClick={() => router.back()} className="mt-4 text-indigo-400 text-sm">Volver</button>
      </div>
    );
  }

  const datos = factura.datos ?? {};
  const info  = datos.infoFactura ?? {};

  // ── Resultado exitoso ────────────────────────────────────────────────────────
  if (resultado) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-gray-950">
        <div className="w-full max-w-sm text-center">
          <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 size={32} className="text-emerald-400" />
          </div>
          <h2 className="text-xl font-bold text-white mb-1">Nota de crédito en proceso</h2>
          <p className="text-sm text-gray-500 mb-2">{resultado.claveAcceso}</p>
          <span className="inline-block px-3 py-1 rounded-full text-xs font-medium mb-6 bg-indigo-500/20 text-indigo-400">
            {resultado.estado}
          </span>
          <div className="flex gap-3">
            <button
              onClick={() => router.push(`/facturas/${id}`)}
              className="flex-1 py-2.5 rounded-lg border border-gray-700 text-gray-400 hover:text-white text-sm transition-colors"
            >
              Ver factura original
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

  // ── Formulario ───────────────────────────────────────────────────────────────
  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto space-y-5">

      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.back()}
          className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
        >
          <ArrowLeft size={18} />
        </button>
        <div>
          <h1 className="text-xl font-bold text-white">Nota de Crédito</h1>
          <p className="text-sm text-gray-500">
            Factura original: {factura.numero_factura}
          </p>
        </div>
      </div>

      {/* Aviso */}
      <div className="flex items-start gap-3 bg-amber-500/10 border border-amber-500/20 rounded-xl px-4 py-3">
        <AlertTriangle size={16} className="text-amber-400 shrink-0 mt-0.5" />
        <div>
          <p className="text-sm text-amber-300 font-medium">Revisa los ítems antes de emitir</p>
          <p className="text-xs text-amber-400/70 mt-0.5">
            Para anular la factura completa deja todos los ítems con sus cantidades originales.
            Para una NC parcial ajusta las cantidades o elimina ítems.
          </p>
        </div>
      </div>

      {/* Datos factura original — readonly */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
          Factura original
        </h2>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <p className="text-xs text-gray-500">Cliente</p>
            <p className="text-white font-medium">{info.razonSocialComprador}</p>
            <p className="text-xs text-gray-500">{info.identificacionComprador}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Fecha emisión</p>
            <p className="text-white">{info.fechaEmision}</p>
            <p className="text-xs text-gray-500">Total: ${fmt(parseFloat(info.importeTotal ?? 0))}</p>
          </div>
        </div>
      </div>

      {/* Motivo */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
          Motivo *
        </label>
        <input
          value={motivo}
          onChange={(e) => setMotivo(e.target.value)}
          placeholder="Ej: DEVOLUCION DE BIEN, ANULACION DE COMPROBANTE, ERROR EN PRECIO..."
          className="w-full px-3 py-2.5 rounded-lg bg-gray-800 border border-gray-700 text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500 text-sm"
        />
        <p className="text-xs text-gray-600 mt-1">
          Motivos comunes: DEVOLUCION DE BIEN · ANULACION DE COMPROBANTE · REBAJA DE PRECIO · ERROR EN PRECIO
        </p>
      </div>

      {/* Ítems */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
            Ítems a acreditar
          </h2>
          <span className="text-xs text-gray-600">{items.length} ítem(s)</span>
        </div>

        <div className="divide-y divide-gray-800">
          {items.map((item, index) => {
            const c = calcItem(item);
            return (
              <div key={item._id} className="p-4 space-y-3">

                {/* Fila 1 — descripción + eliminar */}
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-600 w-5 shrink-0 text-center">
                    #{index + 1}
                  </span>
                  <input
                    value={item.descripcion}
                    onChange={(e) => editItem(item._id, "descripcion", e.target.value)}
                    className="flex-1 px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white focus:outline-none focus:border-indigo-500 text-sm"
                  />
                  <button
                    onClick={() => removeItem(item._id)}
                    disabled={items.length === 1}
                    className="p-2 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg disabled:opacity-20 transition-colors shrink-0"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>

                {/* Fila 2 — cantidad + precio + descuento + IVA + total */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-semibold tracking-wider text-gray-500 block">
                      Cantidad
                    </label>
                    <input
                      type="number"
                      value={item.cantidad}
                      onChange={(e) => editItem(item._id, "cantidad", parseFloat(e.target.value) || 0)}
                      min={0.01}
                      step={0.01}
                      className="w-full px-2 py-1.5 rounded-lg bg-gray-800 border border-gray-700 text-white focus:outline-none focus:border-indigo-500 text-sm text-center"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-semibold tracking-wider text-gray-500 block">
                      Precio Unit.
                    </label>
                    <input
                      type="number"
                      value={item.precio_unitario}
                      onChange={(e) => editItem(item._id, "precio_unitario", parseFloat(e.target.value) || 0)}
                      min={0}
                      step={0.01}
                      className="w-full px-2 py-1.5 rounded-lg bg-gray-800 border border-gray-700 text-white focus:outline-none focus:border-indigo-500 text-sm text-center"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-semibold tracking-wider text-gray-500 block">
                      IVA
                    </label>
                    <select
                      value={item.tipo_iva}
                      onChange={(e) => editItem(item._id, "tipo_iva", e.target.value)}
                      className="w-full px-2 py-1.5 rounded-lg bg-gray-800 border border-gray-700 text-white focus:outline-none focus:border-indigo-500 text-sm"
                    >
                      <option value="0">0%</option>
                      <option value="5">5%</option>
                      <option value="15">15%</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-semibold tracking-wider text-gray-500 block">
                      Total ítem
                    </label>
                    <div className="px-2 py-1.5 rounded-lg bg-gray-800/50 border border-gray-700/50 text-indigo-400 text-sm font-bold text-center">
                      ${fmt(c.total)}
                    </div>
                  </div>
                </div>

              </div>
            );
          })}
        </div>
      </div>

      {/* Resumen totales */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
          Resumen NC
        </h2>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between text-gray-400">
            <span>Subtotal sin impuestos</span>
            <span>${fmt(totales.subtotal)}</span>
          </div>
          {totales.descuento > 0 && (
            <div className="flex justify-between text-amber-400">
              <span>Descuento</span>
              <span>-${fmt(totales.descuento)}</span>
            </div>
          )}
          {totales.iva > 0 && (
            <div className="flex justify-between text-gray-400">
              <span>IVA</span>
              <span>${fmt(totales.iva)}</span>
            </div>
          )}
          <div className="border-t border-gray-800 pt-2 flex justify-between font-bold text-white text-base">
            <span>Valor a acreditar</span>
            <span>${fmt(totales.total)}</span>
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <p className="text-xs text-red-400 bg-red-400/10 px-3 py-2 rounded-lg">
          {error}
        </p>
      )}

      {/* Créditos */}
      <p className="text-xs text-gray-600 text-center">
        Créditos disponibles: {empresa?.balance_emision ?? 0} · Esta operación consume 1 crédito
      </p>

      {/* Botones */}
      <div className="flex gap-3 pb-6">
        <button
          onClick={() => router.back()}
          className="flex-1 py-3 rounded-lg border border-gray-700 text-gray-400 hover:text-white text-sm transition-colors"
        >
          Cancelar
        </button>
        <button
          onClick={emitir}
          disabled={submitting || (empresa?.balance_emision ?? 0) === 0}
          className="flex-1 py-3 rounded-lg bg-red-600 hover:bg-red-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold text-sm transition-colors flex items-center justify-center gap-2"
        >
          {submitting
            ? <><Loader2 size={16} className="animate-spin" /> Emitiendo...</>
            : `Emitir NC · $${fmt(totales.total)}`
          }
        </button>
      </div>

    </div>
  );
}