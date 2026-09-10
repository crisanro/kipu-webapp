"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { v4 as uuidv4 } from "uuid";
import api from "@/lib/api";
import { useAuthStore } from "@/store/auth.store";
import { CheckCircle2, AlertTriangle, User, Search, X } from "lucide-react";
import PuntoEmision from "../components/PuntoEmision";
import ItemsEditor, { Item, calcItem, genId, EMPTY_ITEM } from "../components/ItemsEditor";
import PagosMixtos, { PagoItem, PAGO_INICIAL } from "../components/PagosMixtos";
import CamposAdicionales, { CampoAdicional } from "../components/CamposAdicionales";
import ResumenTotales from "../components/ResumenTotales";

// ── Helpers ───────────────────────────────────────────────────────────────────
const r2  = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;
const fmt = (n: number) => r2(n).toFixed(2);

function calcTotales(items: Item[]) {
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
  return { ...base, propina: 0, total: r2(base.subtotal + base.iva) };
}

// ── Tipos ─────────────────────────────────────────────────────────────────────
interface Proveedor {
  id:                      string;
  razon_social:            string;
  identificacion:          string;
  tipo_identificacion_sri: string;
  email:                   string;
  direccion:               string;
}

interface ProveedorNuevo {
  tipo_identificacion_sri: string;
  identificacion:          string;
  razon_social:            string;
  email:                   string;
  direccion:               string;
}

interface Establecimiento {
  codigo:            string;
  nombre_comercial?: string;
  direccion:         string;
  puntos_emision:    { codigo: string; nombre?: string }[];
}

// ── Página ────────────────────────────────────────────────────────────────────
export default function NuevaLiqPage() {
  const router  = useRouter();
  const empresa = useAuthStore((s) => s.empresa);

  // ── Idempotencia ────────────────────────────────────────────────────────────
  const idempotencyKey = useRef(uuidv4());

  // Proveedor
  const [query,             setQuery]             = useState("");
  const [results,           setResults]           = useState<Proveedor[]>([]);
  const [loading,           setLoading]           = useState(false);
  const [showDrop,          setShowDrop]          = useState(false);
  const [proveedorSelected, setProveedorSelected] = useState<Proveedor | null>(null);
  const [proveedorNuevo,    setProveedorNuevo]    = useState<ProveedorNuevo | null>(null);

  // Items
  const [items, setItems] = useState<Item[]>([{ _id: genId(), ...EMPTY_ITEM }]);

  // Pagos
  const [pagos, setPagos] = useState<PagoItem[]>([{ ...PAGO_INICIAL }]);

  // Campos adicionales
  const [camposAdicionales, setCamposAdicionales] = useState<CampoAdicional[]>([]);

  // Establecimiento
  const [establecimientos, setEstablecimientos] = useState<Establecimiento[]>([]);
  const [estabSelected,    setEstabSelected]    = useState("");
  const [ptoSelected,      setPtoSelected]      = useState("");
  const [puntos,           setPuntos]           = useState<{ codigo: string; nombre?: string }[]>([]);

  // UI
  const [submitting, setSubmitting] = useState(false);
  const [resultado,  setResultado]  = useState<any>(null);
  const [error,      setError]      = useState("");

  const totales = calcTotales(items);

  // Cargar estructura
  useEffect(() => {
    const cargar = async () => {
      try {
        const cached = sessionStorage.getItem("kipu:estructura");
        const estabs = cached
          ? JSON.parse(cached)
          : (await api.get("/api/v1/app/estructura")).data.data ?? [];
        if (!cached) sessionStorage.setItem("kipu:estructura", JSON.stringify(estabs));
        setEstablecimientos(estabs);
        if (estabs.length > 0) {
          setEstabSelected(estabs[0].codigo);
          const ptos = estabs[0].puntos_emision ?? [];
          setPuntos(ptos);
          if (ptos.length > 0) setPtoSelected(ptos[0].codigo);
        }
      } catch (e) { console.error(e); }
    };
    cargar();
  }, []);

  // Buscar proveedor — solo cédula/pasaporte/exterior (no RUC)
  useEffect(() => {
    if (!query || query.length < 2) { setResults([]); return; }
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        // Buscar en clientes pero filtrar solo los que no son RUC
        const res = await api.get(`/api/v1/app/clientes?q=${encodeURIComponent(query)}`);
        const todos = res.data.data ?? [];
        // LIQ no acepta RUC ni consumidor final
        setResults(todos.filter((c: Proveedor) =>
          !["04", "07"].includes(c.tipo_identificacion_sri)
        ));
        setShowDrop(true);
      } catch { setResults([]); }
      finally { setLoading(false); }
    }, 300);
    return () => clearTimeout(t);
  }, [query]);

  const handleEstabChange = (codigo: string, ptos: { codigo: string; nombre?: string }[]) => {
    setEstabSelected(codigo);
    setPuntos(ptos);
    setPtoSelected(ptos[0]?.codigo ?? "");
  };

  const seleccionar = (p: Proveedor) => {
    setProveedorSelected(p);
    setQuery(p.razon_social);
    setShowDrop(false);
    setResults([]);
  };

  const limpiar = () => {
    setProveedorSelected(null);
    setProveedorNuevo(null);
    setQuery("");
    setResults([]);
    setShowDrop(false);
  };

  const reset = () => {
    idempotencyKey.current = uuidv4(); // Regenerar key al resetear
    setResultado(null);
    limpiar();
    setItems([{ _id: genId(), ...EMPTY_ITEM }]);
    setPagos([{ ...PAGO_INICIAL, _id: Math.random().toString(36).slice(2) }]);
    setCamposAdicionales([]);
    setError("");
  };

  const emitir = async () => {
    setError("");

    if (!proveedorSelected && !proveedorNuevo) {
      setError("Selecciona o registra el proveedor."); return;
    }
    if (proveedorNuevo && !proveedorNuevo.razon_social.trim()) {
      setError("El nombre del proveedor es obligatorio."); return;
    }
    if (proveedorNuevo && ["04", "07"].includes(proveedorNuevo.tipo_identificacion_sri)) {
      setError("La liquidación de compra no acepta RUC. Use cédula, pasaporte o identificación exterior."); return;
    }
    if (!estabSelected || !ptoSelected) {
      setError("Configura el punto de emisión."); return;
    }
    if (items.some(i => !i.descripcion?.trim())) {
      setError("Todos los ítems deben tener descripción."); return;
    }

    const puedeEmitir = empresa?.suscripcion_activa || (empresa?.balance_api ?? 0) > 0;
    if (!puedeEmitir) { setError("Se requiere suscripción activa o créditos API."); return; }

    const totalCubierto = pagos.reduce((s, p) => s + (p.total ?? 0), 0);
    if (totalCubierto > totales.total) {
      setError(`Los pagos ($${fmt(totalCubierto)}) superan el total ($${fmt(totales.total)}).`); return;
    }

    setSubmitting(true);
    try {
      const res = await api.post(
        "/api/v1/app/documentos/emit/LIQ",
        {
          establecimiento: estabSelected,
          punto_emision:   ptoSelected,
          cliente_id:      proveedorNuevo ? undefined : proveedorSelected?.id,
          cliente:         proveedorNuevo ? {
            tipo_id:        proveedorNuevo.tipo_identificacion_sri,
            nombre:         proveedorNuevo.razon_social,
            identificacion: proveedorNuevo.identificacion,
            email:          proveedorNuevo.email,
            direccion:      proveedorNuevo.direccion,
          } : undefined,
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
          pagos: pagos.map(p => ({
            forma_pago: p.forma_pago,
            ...(p.total !== null ? { total: p.total } : {}),
          })),
          campos_adicionales: camposAdicionales.filter(c => c.nombre && c.valor),
        },
        {
          headers: {
            "X-Idempotency-Key": idempotencyKey.current,
          },
        }
      );
      setResultado(res.data);
    } catch (err: any) {
      // Regenerar la clave en caso de error para permitir un nuevo intento limpio
      idempotencyKey.current = uuidv4();

      const detail = err?.response?.data?.detail;
      setError(Array.isArray(detail)
        ? detail.map((e: any) => `${e.campo}: ${e.mensaje}`).join(" | ")
        : detail ?? "Error al emitir la liquidación."
      );
    } finally {
      setSubmitting(false);
    }
  };

  // Pantalla resultado
  if (resultado) {
    return (
      <div
        className="min-h-screen flex items-center justify-center p-6"
        style={{ background: "var(--kipu-bg)" }}
      >
        <div className="w-full max-w-sm text-center">
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
            style={{
              background: "color-mix(in srgb, var(--kipu-success) 20%, transparent)",
            }}
          >
            <CheckCircle2 size={32} style={{ color: "var(--kipu-success)" }} />
          </div>
          <h2 className="text-xl font-bold mb-1" style={{ color: "var(--kipu-text)" }}>
            Liquidación emitida
          </h2>
          <p className="text-sm mb-2" style={{ color: "var(--kipu-subtle)" }}>{resultado.claveAcceso}</p>
          <span
            className="inline-block px-3 py-1 rounded-full text-xs font-medium mb-6"
            style={{
              background: "color-mix(in srgb, var(--kipu-success) 20%, transparent)",
              color: "var(--kipu-success)",
            }}
          >
            {resultado.estado}
          </span>
          <div className="flex gap-3">
            <button
              onClick={reset}
              className="flex-1 py-2.5 rounded-lg text-sm transition-colors"
              style={{
                border: "1px solid var(--kipu-border)",
                color: "var(--kipu-muted)",
              }}
              onMouseEnter={e => e.currentTarget.style.color = "var(--kipu-text)"}
              onMouseLeave={e => e.currentTarget.style.color = "var(--kipu-muted)"}
            >
              Nueva LIQ
            </button>
            <button
              onClick={() => router.push("/documentos")}
              className="flex-1 py-2.5 rounded-lg text-white text-sm font-medium transition-colors"
              style={{ background: "var(--kipu-accent)" }}
              onMouseEnter={e => e.currentTarget.style.background = "var(--kipu-accent-h)"}
              onMouseLeave={e => e.currentTarget.style.background = "var(--kipu-accent)"}
            >
              Ver documentos
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-bold" style={{ color: "var(--kipu-text)" }}>
          Nueva Liquidación de Compra{" "}
          <span className="text-base font-normal" style={{ color: "var(--kipu-subtle)" }}>
            LIQ
          </span>
        </h1>
        <p className="text-sm" style={{ color: "var(--kipu-subtle)" }}>
          {empresa?.razon_social} · {empresa?.ambiente === 2 ? "Producción" : "Pruebas"}
        </p>
      </div>

      {empresa && !empresa.suscripcion_activa && empresa.balance_api === 0 && (
        <div
          className="flex items-center gap-2 rounded-lg px-4 py-3"
          style={{
            background: "color-mix(in srgb, var(--kipu-danger) 10%, transparent)",
            border: "1px solid color-mix(in srgb, var(--kipu-danger) 20%, transparent)",
          }}
        >
          <AlertTriangle size={16} className="shrink-0" style={{ color: "var(--kipu-danger)" }} />
          <p className="text-sm" style={{ color: "var(--kipu-danger)" }}>
            Sin acceso para emitir.{" "}
            <a href="/planes" className="underline">Ver opciones</a>
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">

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

          {/* Selector proveedor */}
          <div
            className="rounded-xl p-4"
            style={{
              background: "var(--kipu-surface)",
              border: "1px solid var(--kipu-border)",
            }}
          >
            <div className="flex items-center gap-2 mb-3">
              <User size={15} style={{ color: "var(--kipu-accent)" }} />
              <h2 className="text-sm font-semibold" style={{ color: "var(--kipu-text)" }}>
                Proveedor
              </h2>
              <span
                className="text-[10px] px-2 py-0.5 rounded-full"
                style={{
                  color: "var(--kipu-warning)",
                  background: "color-mix(in srgb, var(--kipu-warning) 10%, transparent)",
                  border: "1px solid color-mix(in srgb, var(--kipu-warning) 20%, transparent)",
                }}
              >
                Solo cédula / pasaporte / exterior
              </span>
            </div>

            <div className="relative">
              <Search
                size={15}
                className="absolute left-3 top-1/2 -translate-y-1/2"
                style={{ color: "var(--kipu-subtle)" }}
              />
              <input
                value={query}
                onChange={e => {
                  setQuery(e.target.value);
                  setProveedorSelected(null);
                  setProveedorNuevo(null);
                  setShowDrop(true);
                }}
                onFocus={(e) => {
                  if (query.length >= 2) setShowDrop(true);
                  e.currentTarget.style.borderColor = "var(--kipu-accent)";
                }}
                onBlur={(e) => e.currentTarget.style.borderColor = "var(--kipu-border)"}
                placeholder="Buscar por nombre o cédula..."
                className="w-full pl-9 pr-4 py-2.5 rounded-lg text-sm transition-colors focus:outline-none"
                style={{
                  background: "var(--kipu-surface)",
                  border: "1px solid var(--kipu-border)",
                  color: "var(--kipu-text)",
                }}
              />
              {loading && (
                <div
                  className="w-3.5 h-3.5 border-2 border-t-transparent rounded-full animate-spin absolute right-3 top-1/2 -translate-y-1/2"
                  style={{ borderColor: "var(--kipu-accent)", borderTopColor: "transparent" }}
                />
              )}

              {showDrop && query.length >= 2 && (
                <div
                  className="absolute z-10 w-full mt-1 rounded-lg shadow-xl overflow-hidden max-h-60 overflow-y-auto"
                  style={{
                    background: "var(--kipu-surface)",
                    border: "1px solid var(--kipu-border)",
                  }}
                >
                  {results.map(p => (
                    <button
                      type="button"
                      key={p.id}
                      onClick={() => seleccionar(p)}
                      className="w-full flex items-center gap-3 px-4 py-3 text-left transition-colors"
                      style={{ borderBottom: "1px solid var(--kipu-border)" }}
                      onMouseEnter={e => e.currentTarget.style.background = "color-mix(in srgb, var(--kipu-text) 5%, transparent)"}
                      onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                    >
                      <div
                        className="w-7 h-7 rounded-full flex items-center justify-center shrink-0"
                        style={{ background: "color-mix(in srgb, var(--kipu-accent) 20%, transparent)" }}
                      >
                        <span className="text-xs font-bold" style={{ color: "var(--kipu-accent)" }}>
                          {p.razon_social[0]}
                        </span>
                      </div>
                      <div>
                        <p className="text-sm" style={{ color: "var(--kipu-text)" }}>{p.razon_social}</p>
                        <p className="text-xs" style={{ color: "var(--kipu-subtle)" }}>{p.identificacion}</p>
                      </div>
                    </button>
                  ))}
                  {results.length === 0 && (
                    <div className="px-4 py-3 space-y-2">
                      <p className="text-xs" style={{ color: "var(--kipu-subtle)" }}>No encontrado.</p>
                      <button
                        type="button"
                        onClick={() => {
                          setShowDrop(false);
                          setProveedorNuevo({
                            tipo_identificacion_sri: "05",
                            identificacion:          query,
                            razon_social:            "",
                            email:                   "",
                            direccion:               "",
                          });
                        }}
                        className="text-xs underline text-left block"
                        style={{ color: "var(--kipu-accent)" }}
                      >
                        + Registrar "{query}" como nuevo proveedor
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Formulario proveedor nuevo */}
            {proveedorNuevo && (
              <div
                className="mt-3 rounded-lg p-3 space-y-2"
                style={{
                  background: "color-mix(in srgb, var(--kipu-surface) 60%, transparent)",
                  border: "1px solid color-mix(in srgb, var(--kipu-accent) 30%, transparent)",
                }}
              >
                <p className="text-xs font-medium" style={{ color: "var(--kipu-accent)" }}>
                  Nuevo proveedor
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <select
                    value={proveedorNuevo.tipo_identificacion_sri}
                    onChange={e => setProveedorNuevo({ ...proveedorNuevo, tipo_identificacion_sri: e.target.value })}
                    className="px-2 py-1.5 rounded-lg text-xs transition-colors focus:outline-none"
                    style={{
                      background: "var(--kipu-surface)",
                      border: "1px solid var(--kipu-border)",
                      color: "var(--kipu-text)",
                    }}
                    onFocus={e => e.currentTarget.style.borderColor = "var(--kipu-accent)"}
                    onBlur={e => e.currentTarget.style.borderColor = "var(--kipu-border)"}
                  >
                    <option value="05">Cédula</option>
                    <option value="06">Pasaporte</option>
                    <option value="08">Exterior</option>
                  </select>
                  <input
                    value={proveedorNuevo.identificacion}
                    onChange={e => setProveedorNuevo({ ...proveedorNuevo, identificacion: e.target.value })}
                    placeholder="Identificación"
                    className="px-2 py-1.5 rounded-lg text-xs transition-colors focus:outline-none"
                    style={{
                      background: "var(--kipu-surface)",
                      border: "1px solid var(--kipu-border)",
                      color: "var(--kipu-text)",
                    }}
                    onFocus={e => e.currentTarget.style.borderColor = "var(--kipu-accent)"}
                    onBlur={e => e.currentTarget.style.borderColor = "var(--kipu-border)"}
                  />
                </div>
                <input
                  value={proveedorNuevo.razon_social}
                  onChange={e => setProveedorNuevo({ ...proveedorNuevo, razon_social: e.target.value })}
                  placeholder="Nombre completo *"
                  className="w-full px-2 py-1.5 rounded-lg text-xs transition-colors focus:outline-none"
                  style={{
                    background: "var(--kipu-surface)",
                    border: "1px solid var(--kipu-border)",
                    color: "var(--kipu-text)",
                  }}
                  onFocus={e => e.currentTarget.style.borderColor = "var(--kipu-accent)"}
                  onBlur={e => e.currentTarget.style.borderColor = "var(--kipu-border)"}
                />
                <input
                  value={proveedorNuevo.direccion}
                  onChange={e => setProveedorNuevo({ ...proveedorNuevo, direccion: e.target.value })}
                  placeholder="Dirección (opcional)"
                  className="w-full px-2 py-1.5 rounded-lg text-xs transition-colors focus:outline-none"
                  style={{
                    background: "var(--kipu-surface)",
                    border: "1px solid var(--kipu-border)",
                    color: "var(--kipu-text)",
                  }}
                  onFocus={e => e.currentTarget.style.borderColor = "var(--kipu-accent)"}
                  onBlur={e => e.currentTarget.style.borderColor = "var(--kipu-border)"}
                />
                <input
                  value={proveedorNuevo.email}
                  onChange={e => setProveedorNuevo({ ...proveedorNuevo, email: e.target.value })}
                  placeholder="Email (opcional)"
                  className="w-full px-2 py-1.5 rounded-lg text-xs transition-colors focus:outline-none"
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
                  onClick={() => setProveedorNuevo(null)}
                  className="text-xs transition-colors"
                  style={{ color: "var(--kipu-subtle)" }}
                  onMouseEnter={e => e.currentTarget.style.color = "var(--kipu-text)"}
                  onMouseLeave={e => e.currentTarget.style.color = "var(--kipu-subtle)"}
                >
                  Cancelar
                </button>
              </div>
            )}

            {/* Proveedor seleccionado */}
            {proveedorSelected && (
              <div
                className="mt-3 flex items-center gap-3 rounded-lg px-3 py-2.5"
                style={{
                  background: "color-mix(in srgb, var(--kipu-text) 5%, transparent)",
                }}
              >
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center shrink-0"
                  style={{ background: "color-mix(in srgb, var(--kipu-accent) 20%, transparent)" }}
                >
                  <User size={13} style={{ color: "var(--kipu-accent)" }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate" style={{ color: "var(--kipu-text)" }}>
                    {proveedorSelected.razon_social}
                  </p>
                  <p className="text-xs" style={{ color: "var(--kipu-subtle)" }}>
                    {proveedorSelected.identificacion}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={limpiar}
                  className="p-1 transition-colors"
                  style={{ color: "var(--kipu-subtle)" }}
                  onMouseEnter={e => e.currentTarget.style.color = "var(--kipu-text)"}
                  onMouseLeave={e => e.currentTarget.style.color = "var(--kipu-subtle)"}
                >
                  <X size={16} />
                </button>
              </div>
            )}
          </div>

          {/* Ítems */}
          <ItemsEditor items={items} onChange={setItems} />

          {/* Pagos */}
          <PagosMixtos
            pagos={pagos}
            totalFactura={totales.total}
            propina={false}
            onChange={setPagos}
            onPropinaChange={() => {}}
          />

          <CamposAdicionales campos={camposAdicionales} onChange={setCamposAdicionales} />
        </div>

        {/* Panel lateral */}
        <div className="space-y-4">
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
          <ResumenTotales
            totales={totales}
            submitting={submitting}
            error={error}
            suscripcionActiva={empresa?.suscripcion_activa ?? false}
            balanceApi={empresa?.balance_api ?? 0}
            onEmitir={emitir}
          />
        </div>
      </div>
    </div>
  );
}