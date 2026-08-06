// app/(dashboard)/facturas/nueva/page.tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import { useAuthStore } from "@/store/auth.store";
import { CheckCircle2, AlertTriangle } from "lucide-react";
import { clsx } from "clsx";

// ── Componentes ────────────────────────────────────────────────────────────────
import PuntoEmision from "./components/PuntoEmision";
import ClienteSelector from "./components/ClienteSelector";
import ItemsEditor, { Item, calcItem, genId, EMPTY_ITEM } from "./components/ItemsEditor";
import PagosMixtos, { PagoItem, PAGO_INICIAL } from "./components/PagosMixtos";
import CamposAdicionales, { CampoAdicional } from "./components/CamposAdicionales";
import ResumenTotales from "./components/ResumenTotales";

// ── Tipos ──────────────────────────────────────────────────────────────────────
interface Cliente {
  id:                      string;
  razon_social:            string;
  identificacion:          string;
  tipo_identificacion_sri: string;
  email:                   string;
  direccion:               string;
}

interface ClienteNuevo {
  tipo_identificacion_sri: string;
  identificacion:          string;
  razon_social:            string;
  email:                   string;
}

interface Establecimiento {
  codigo:           string;
  nombre_comercial?: string;
  direccion:        string;
  puntos_emision:   { codigo: string; nombre?: string }[];
}

// ── Helpers ────────────────────────────────────────────────────────────────────
const r2  = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;
const fmt = (n: number) => r2(n).toFixed(2);

const IVA_RATES: Record<string, number> = { "0": 0, "5": 0.05, "15": 0.15 };

function calcTotales(items: Item[], incluirPropina: boolean) {
  const base = items.reduce(
    (acc, item) => {
      const c = calcItem(item);
      acc.subtotal    = r2(acc.subtotal + c.base);
      acc.descuento   = r2(acc.descuento + c.descuento);
      acc.iva         = r2(acc.iva + c.iva);
      acc.subtotal_0  = r2(acc.subtotal_0  + (item.tipo_iva === "0"  ? c.base : 0));
      acc.subtotal_5  = r2(acc.subtotal_5  + (item.tipo_iva === "5"  ? c.base : 0));
      acc.subtotal_15 = r2(acc.subtotal_15 + (item.tipo_iva === "15" ? c.base : 0));
      acc.iva_5       = r2(acc.iva_5  + (item.tipo_iva === "5"  ? c.iva : 0));
      acc.iva_15      = r2(acc.iva_15 + (item.tipo_iva === "15" ? c.iva : 0));
      return acc;
    },
    { subtotal: 0, descuento: 0, iva: 0, subtotal_0: 0, subtotal_5: 0, subtotal_15: 0, iva_5: 0, iva_15: 0 }
  );
  const propina = incluirPropina ? r2(base.subtotal * 0.10) : 0;
  const total   = r2(base.subtotal + base.iva + propina);
  return { ...base, propina, total };
}

// ── Página principal ───────────────────────────────────────────────────────────
export default function NuevaFacturaPage() {
  const router        = useRouter();
  const empresa       = useAuthStore((s) => s.empresa);
  const updateBalance = useAuthStore((s) => s.updateBalance);

  // ── Estado cliente ──────────────────────────────────────────────────────────
  const [clienteSelected,   setClienteSelected]   = useState<Cliente | null>(null);
  const [esConsumidorFinal, setEsConsumidorFinal] = useState(false);
  const [clienteNuevo,      setClienteNuevo]      = useState<ClienteNuevo | null>(null);

  // ── Estado items ────────────────────────────────────────────────────────────
  const [items, setItems] = useState<Item[]>([{ _id: genId(), ...EMPTY_ITEM }]);

  // ── Estado pagos ────────────────────────────────────────────────────────────
  const [pagos,   setPagos]   = useState<PagoItem[]>([{ ...PAGO_INICIAL }]);
  const [propina, setPropina] = useState(false);

  // ── Estado campos adicionales ───────────────────────────────────────────────
  const [camposAdicionales, setCamposAdicionales] = useState<CampoAdicional[]>([]);

  // ── Estado establecimiento ──────────────────────────────────────────────────
  const [establecimientos, setEstablecimientos] = useState<Establecimiento[]>([]);
  const [estabSelected,    setEstabSelected]    = useState("");
  const [ptoSelected,      setPtoSelected]      = useState("");
  const [puntos,           setPuntos]           = useState<{ codigo: string; nombre?: string }[]>([]);

  // ── Estado UI ───────────────────────────────────────────────────────────────
  const [submitting, setSubmitting] = useState(false);
  const [resultado,  setResultado]  = useState<any>(null);
  const [error,      setError]      = useState("");

  // ── Totales ─────────────────────────────────────────────────────────────────
  const totales = calcTotales(items, propina);

  // ── Cargar estructura ────────────────────────────────────────────────────────
  useEffect(() => {
    const cargar = async () => {
      try {
        const aplicar = (estabs: Establecimiento[]) => {
          setEstablecimientos(estabs);
          if (estabs.length > 0) {
            setEstabSelected(estabs[0].codigo);
            const ptos = estabs[0].puntos_emision ?? [];
            setPuntos(ptos);
            if (ptos.length > 0) setPtoSelected(ptos[0].codigo);
          }
        };
        const cached = sessionStorage.getItem("kipu:estructura");
        if (cached) { aplicar(JSON.parse(cached)); return; }
        const res    = await api.get("/api/v1/app/estructura");
        const estabs = res.data.data ?? [];
        sessionStorage.setItem("kipu:estructura", JSON.stringify(estabs));
        aplicar(estabs);
      } catch (e) {
        console.error("Error cargando estructura", e);
      }
    };
    cargar();
  }, []);

  // ── Prefill / clonación ──────────────────────────────────────────────────────
  useEffect(() => {
    const prefill = sessionStorage.getItem("kipu:prefill");
    if (!prefill) return;
    try {
      const data = JSON.parse(prefill);

      if (data.items && Array.isArray(data.items)) {
        setItems(data.items.map((i: any) => ({
          _id:            genId(),
          codigo:         String(i.codigo ?? ""),
          descripcion:    String(i.descripcion ?? ""),
          cantidad:       parseFloat(i.cantidad)  || 1,
          precio:         parseFloat(i.precio)    || 0,
          descuento:      parseFloat(i.descuento) || 0,
          tipo_descuento: (i.tipo_descuento === "%" ? "%" : "$") as "$" | "%",
          tipo_iva:       ["0","5","15"].includes(String(i.tipo_iva)) ? String(i.tipo_iva) : "15",
          unidad:         String(i.unidad ?? "UNIDAD"),
        })));
      }

      if (data.camposAdicionales) setCamposAdicionales(data.camposAdicionales);

      if (data.esConsumidorFinal) {
        setEsConsumidorFinal(true);
      } else if (data.cliente) {
        setClienteSelected({
          id:                      data.cliente.id || "",
          razon_social:            data.cliente.razon_social || "",
          identificacion:          data.cliente.identificacion || "",
          tipo_identificacion_sri: data.cliente.tipo_id || "05",
          email:                   "",
          direccion:               "",
        });
      }
    } catch (e) {
      console.error("Error al procesar prefill", e);
    } finally {
      sessionStorage.removeItem("kipu:prefill");
    }
  }, []);

  // ── Sincronizar total con pagos cuando cambia el total ───────────────────────
  useEffect(() => {
    // Si hay un solo pago con saldo null, no hay nada que sincronizar
    // Si hay pagos con monto fijo, actualizar el saldo del que tiene null
    // El backend también lo valida, esto es solo para mostrar bien el saldo en UI
  }, [totales.total]);

  // ── Handlers establecimiento ─────────────────────────────────────────────────
  const handleEstabChange = (codigo: string, ptos: { codigo: string; nombre?: string }[]) => {
    setEstabSelected(codigo);
    setPuntos(ptos);
    setPtoSelected(ptos[0]?.codigo ?? "");
  };

  // ── Reset ────────────────────────────────────────────────────────────────────
  const reset = () => {
    setResultado(null);
    setClienteSelected(null);
    setEsConsumidorFinal(false);
    setClienteNuevo(null);
    setItems([{ _id: genId(), ...EMPTY_ITEM }]);
    setPagos([{ ...PAGO_INICIAL, _id: Math.random().toString(36).slice(2) }]);
    setPropina(false);
    setCamposAdicionales([]);
    setError("");
  };

  // ── Emitir ───────────────────────────────────────────────────────────────────
  const emitir = async () => {
    setError("");

    // Validaciones
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
      setError("Todos los ítems deben tener descripción.");
      return;
    }
    if ((empresa?.balance_emision ?? 0) === 0) {
      setError("Sin créditos disponibles. Recarga para continuar.");
      return;
    }

    // Validar pagos — la suma de montos fijos no puede superar el total
    const totalCubierto = pagos.reduce((s, p) => s + (p.total ?? 0), 0);
    if (totalCubierto > totales.total) {
      setError(`Los pagos ($${fmt(totalCubierto)}) superan el total ($${fmt(totales.total)}).`);
      return;
    }

    setSubmitting(true);

    // Construir payload
    const payload: any = {
      establecimiento: estabSelected,
      punto_emision:   ptoSelected,

      // Cliente
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

      // Items — el backend completa desde catálogo si hay código
      items: items.map(i => {
        const c = calcItem(i);
        return {
          codigo:          i.codigo || undefined,
          descripcion:     i.descripcion,
          cantidad:        i.cantidad,
          precio_unitario: i.precio,
          descuento:       c.descuento,
          tipo_iva:        i.tipo_iva,
          unidad_medida:   i.unidad,
        };
      }),

      // Pagos — el backend resuelve el saldo restante
      pagos: pagos.map(p => ({
        forma_pago: p.forma_pago,
        ...(p.total !== null ? { total: p.total } : {}),
      })),

      // Propina
      ...(propina ? { propina: totales.propina } : {}),

      // Campos adicionales
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

  // ── Pantalla de resultado ────────────────────────────────────────────────────
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
            isAutorizado ? "bg-emerald-500/20 text-emerald-400" : "bg-indigo-500/20 text-indigo-400"
          )}>
            {resultado.estado}
          </span>
          <div className="flex gap-3">
            <button
              onClick={reset}
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

  // ── Formulario ───────────────────────────────────────────────────────────────
  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-6">

      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-white">Nueva Factura</h1>
        <p className="text-sm text-gray-500">
          {empresa?.razon_social} · {empresa?.ambiente === 2 ? "Producción" : "Pruebas"}
        </p>
      </div>

      {/* Sin créditos */}
      {empresa && empresa.balance_emision === 0 && (
        <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3">
          <AlertTriangle size={16} className="text-red-400 shrink-0" />
          <p className="text-sm text-red-300">
            Sin créditos disponibles.{" "}
            <a href="/configuracion" className="underline">Recargar ahora</a>
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* ── Columna principal ── */}
        <div className="lg:col-span-2 space-y-6">

          {/* Punto de emisión — solo móvil */}
          <div className="lg:hidden">
            <PuntoEmision
              establecimientos={establecimientos}
              estabSelected={estabSelected}
              ptoSelected={ptoSelected}
              puntos={puntos}
              onEstabChange={handleEstabChange}
              onPtoChange={setPtoSelected}
            />
          </div>

          {/* Cliente */}
          <ClienteSelector
            clienteSelected={clienteSelected}
            esConsumidorFinal={esConsumidorFinal}
            clienteNuevo={clienteNuevo}
            onSelectCliente={(c) => {
              setClienteSelected(c);
              setEsConsumidorFinal(false);
              setClienteNuevo(null);
            }}
            onSelectConsumidorFinal={() => {
              setClienteSelected(null);
              setEsConsumidorFinal(true);
              setClienteNuevo(null);
            }}
            onClienteNuevo={(c) => {
              setClienteNuevo(c);
              if (c) {
                setClienteSelected(null);
                setEsConsumidorFinal(false);
              }
            }}
            onClear={() => {
              setClienteSelected(null);
              setEsConsumidorFinal(false);
            }}
          />

          {/* Items */}
          <ItemsEditor
            items={items}
            onChange={setItems}
          />

          {/* Pagos mixtos */}
          <PagosMixtos
            pagos={pagos}
            totalFactura={totales.total}
            propina={propina}
            onChange={setPagos}
            onPropinaChange={setPropina}
          />

          {/* Campos adicionales */}
          <CamposAdicionales
            campos={camposAdicionales}
            onChange={setCamposAdicionales}
          />

        </div>

        {/* ── Panel lateral ── */}
        <div className="space-y-4">

          {/* Punto de emisión — desktop */}
          <div className="hidden lg:block">
            <PuntoEmision
              establecimientos={establecimientos}
              estabSelected={estabSelected}
              ptoSelected={ptoSelected}
              puntos={puntos}
              onEstabChange={handleEstabChange}
              onPtoChange={setPtoSelected}
            />
          </div>

          {/* Totales + botón emitir */}
          <ResumenTotales
            totales={totales}
            submitting={submitting}
            error={error}
            balanceEmision={empresa?.balance_emision ?? 0}
            onEmitir={emitir}
          />

        </div>
      </div>
    </div>
  );
}