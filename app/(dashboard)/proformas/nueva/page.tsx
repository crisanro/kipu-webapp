"use client";
// Nueva proforma (cotización): documento referencial, no va al SRI. Mismo
// esqueleto que emitir (EmisionLayout): en el celular, barra fija con el total
// y "Guardar"; lo escrito queda como borrador si se sale de la pantalla.
import { rutas } from "@/lib/rutas";
import { useState, useEffect, useMemo } from "react";
import { r2, dosDecimales } from "@/lib/dinero";
import { detalleError } from "@/lib/errores";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import { useAuthStore } from "@/store/auth.store";
import { useBorrador } from "@/lib/borradores";
import { ClipboardList, CalendarDays } from "lucide-react";
import { hoyEC } from "@/lib/fecha";
import { ES_APP_NATIVA } from "@/lib/plataforma";
import BloqueoPlanPro from "@/components/dashboard/BloqueoPlanPro";
import Boton from "@/components/ui/Boton";
import { Campo, Entrada } from "@/components/ui/Campo";

// ── Componentes reutilizados de factura ────────────────────────────────────────
import ClienteSelector from "../../documentos/emitir/components/ClienteSelector";
import ItemsEditor, { Item, calcItem, genId, EMPTY_ITEM } from "../../documentos/emitir/components/ItemsEditor";
import CamposAdicionales, { CampoAdicional } from "../../documentos/emitir/components/CamposAdicionales";
import EmisionLayout from "../../documentos/emitir/components/EmisionLayout";

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

// ── Helpers ────────────────────────────────────────────────────────────────────

function calcTotales(items: Item[]) {
  return items.reduce(
    (acc, item) => {
      const c = calcItem(item);
      return {
        subtotal:  r2(acc.subtotal  + c.base),
        descuento: r2(acc.descuento + c.descuento),
        iva:       r2(acc.iva       + c.iva),
        total:     r2(acc.total     + c.total),
      };
    },
    { subtotal: 0, descuento: 0, iva: 0, total: 0 }
  );
}

// ── Página ─────────────────────────────────────────────────────────────────────
export default function NuevaProformaPage() {
  const router  = useRouter();
  const empresa = useAuthStore((s) => s.empresa);
  const tieneSub = empresa?.suscripcion_activa ?? false;

  // ── Estado cliente ───────────────────────────────────────────────────────────
  const [clienteSelected,   setClienteSelected]   = useState<Cliente | null>(null);
  const [esConsumidorFinal, setEsConsumidorFinal] = useState(false);
  const [clienteNuevo,      setClienteNuevo]      = useState<ClienteNuevo | null>(null);

  // ── Estado items ─────────────────────────────────────────────────────────────
  const [items, setItems] = useState<Item[]>(() => [{ _id: genId(), ...EMPTY_ITEM }]);

  // ── Estado campos adicionales ────────────────────────────────────────────────
  const [camposAdicionales, setCamposAdicionales] = useState<CampoAdicional[]>([]);

  // ── Estado fechas ────────────────────────────────────────────────────────────
  const [fechaEmision, setFechaEmision] = useState(hoyEC());
  const [fechaValidez, setFechaValidez] = useState("");

  // ── Estado UI ────────────────────────────────────────────────────────────────
  const [submitting, setSubmitting] = useState(false);
  const [error,      setError]      = useState("");

  // ── Totales ──────────────────────────────────────────────────────────────────
  const totales = calcTotales(items);

  // ── Borrador (al clonar llega con datos: no se ofrece el viejo) ──────────────
  const [conPrefill] = useState(() =>
    typeof window !== "undefined" && !!sessionStorage.getItem("kipu:prefill"));
  const datosBorrador = useMemo(() => ({
    clienteSelected, esConsumidorFinal, clienteNuevo, items, camposAdicionales, fechaValidez,
  }), [clienteSelected, esConsumidorFinal, clienteNuevo, items, camposAdicionales, fechaValidez]);
  const borrador = useBorrador("PROFORMA", datosBorrador, {
    vacio: !clienteSelected && !esConsumidorFinal && !clienteNuevo && camposAdicionales.length === 0
      && items.every(i => !i.descripcion?.trim() && !i.codigo?.trim() && !i.precio),
    desactivado: conPrefill,
  });
  const seguirBorrador = () => {
    const d = borrador.recuperar();
    if (!d) return;
    setClienteSelected(d.clienteSelected ?? null);
    setEsConsumidorFinal(!!d.esConsumidorFinal);
    setClienteNuevo(d.clienteNuevo ?? null);
    if (Array.isArray(d.items) && d.items.length) setItems(d.items);
    setCamposAdicionales(Array.isArray(d.camposAdicionales) ? d.camposAdicionales : []);
    setFechaValidez(d.fechaValidez ?? "");
  };

  // ── Prefill desde proforma existente (si viene de "clonar") ──────────────────
  useEffect(() => {
    const prefill = sessionStorage.getItem("kipu:prefill");
    if (!prefill) return;
    try {
      const data = JSON.parse(prefill);
      if (data.items && Array.isArray(data.items)) {
        setItems(data.items.map((i: Record<string, unknown>) => ({
          _id:            genId(),
          codigo:         String(i.codigo           ?? ""),
          descripcion:    String(i.descripcion     ?? ""),
          cantidad:       parseFloat(String(i.cantidad))  || 1,
          precio:         parseFloat(String(i.precio)) || parseFloat(String(i.precio_unitario)) || 0,
          descuento:      parseFloat(String(i.descuento)) || 0,
          tipo_descuento: (i.tipo_descuento === "%" ? "%" : "$") as "$" | "%",
          tipo_iva:       ["0","5","15"].includes(String(i.tipo_iva)) ? String(i.tipo_iva) : "15",
          unidad:         String(i.unidad ?? "UNIDAD"),
        })));
      }
      if (data.camposAdicionales) setCamposAdicionales(data.camposAdicionales);
      if (data.cliente) {
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

  // ── Guardar ──────────────────────────────────────────────────────────────────
  const guardar = async () => {
    setError("");

    if (!esConsumidorFinal && !clienteSelected && !clienteNuevo) {
      setError("Selecciona un cliente o elige Consumidor Final.");
      return;
    }
    if (clienteNuevo && !clienteNuevo.razon_social.trim()) {
      setError("El nombre del cliente es obligatorio.");
      return;
    }
    if (items.some((i) => !i.descripcion?.trim())) {
      setError("Todos los ítems deben tener descripción.");
      return;
    }
    if (items.some((i) => i.precio <= 0)) {
      setError("Todos los ítems deben tener precio mayor a cero.");
      return;
    }

    setSubmitting(true);
    try {
      // Si hay cliente nuevo, crearlo primero
      let clienteId: string | null = null;
      if (clienteNuevo) {
        const res = await api.post("/api/v1/app/clientes", {
          tipo_identificacion_sri: clienteNuevo.tipo_identificacion_sri,
          identificacion:          clienteNuevo.identificacion,
          razon_social:            clienteNuevo.razon_social,
          email:                   clienteNuevo.email,
        });
        clienteId = res.data.uid ?? null;
      } else if (clienteSelected && !esConsumidorFinal) {
        clienteId = clienteSelected.id;
      }

      const res = await api.post("/api/v1/app/proformas", {
        cliente_id:    clienteId,
        fecha_emision: fechaEmision || null,
        fecha_validez: fechaValidez || null,
        notas:         camposAdicionales
          .filter((c) => c.nombre && c.valor)
          .map((c) => `${c.nombre}: ${c.valor}`)
          .join(" | ") || null,
        items: items.map((i) => {
          return {
            descripcion:     i.descripcion,
            cantidad:        i.cantidad,
            precio_unitario: i.precio,
            descuento:       calcItem(i).descuento,   // en dólares, aunque se haya ingresado en %
            tipo_iva:        parseInt(i.tipo_iva) || 0,
          };
        }),
      });

      borrador.borrar();
      router.push(rutas.proforma(res.data.id));
    } catch (err: unknown) {
      setError(detalleError(err, "Error al guardar la proforma."));
    } finally {
      setSubmitting(false);
    }
  };

  // ── Sin suscripción: las proformas son del plan ──────────────────────────────
  if (!tieneSub) {
    return (
      <div className="p-4 md:p-6">
        <BloqueoPlanPro
          mensaje={ES_APP_NATIVA
            ? "Crear proformas no está incluido en tu plan actual."
            : "Crear proformas es del Plan Pro. Con créditos solo se emiten comprobantes."}
        />
      </div>
    );
  }

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <EmisionLayout
      titulo="Nueva proforma"
      subtitulo={<>{empresa?.razon_social} · Documento no tributario</>}
      borrador={borrador.pendiente && {
        hace: borrador.pendiente.hace, que: "una proforma",
        onSeguir: seguirBorrador, onDescartar: borrador.descartar,
      }}
      lateral={<>
        {/* Fechas */}
        <section className="space-y-3 rounded-xl border border-borde bg-superficie p-4">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-texto">
            <CalendarDays size={16} className="text-acento" aria-hidden /> Fechas
          </h2>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-1">
            <Campo etiqueta="Fecha de emisión">
              <Entrada type="date" value={fechaEmision} onChange={(e) => setFechaEmision(e.target.value)} />
            </Campo>
            <Campo etiqueta="Válida hasta" opcional ayuda="Si no, no vence.">
              <Entrada type="date" value={fechaValidez} onChange={(e) => setFechaValidez(e.target.value)} />
            </Campo>
          </div>
        </section>

        {/* Resumen */}
        <section className="space-y-3 rounded-xl border border-borde bg-superficie p-4 lg:sticky lg:top-4">
          <h2 className="text-sm font-semibold text-texto">Resumen</h2>
          <div className="space-y-2 text-sm">
            {totales.subtotal > 0 && (
              <div className="flex justify-between text-tenue">
                <span>Subtotal</span>
                <span className="tabular-nums">${dosDecimales(totales.subtotal)}</span>
              </div>
            )}
            {totales.descuento > 0 && (
              <div className="flex justify-between text-alerta-texto">
                <span>Descuento</span>
                <span className="tabular-nums">-${dosDecimales(totales.descuento)}</span>
              </div>
            )}
            {totales.iva > 0 && (
              <div className="flex justify-between text-tenue">
                <span>IVA</span>
                <span className="tabular-nums">${dosDecimales(totales.iva)}</span>
              </div>
            )}
            <div className="flex justify-between border-t border-borde pt-2 text-base font-bold text-texto">
              <span>Total</span>
              <span className="tabular-nums">${dosDecimales(totales.total)}</span>
            </div>
          </div>

          <p className="flex items-center gap-2 rounded-lg bg-presionado px-3 py-2 text-xs text-sutil">
            <ClipboardList size={12} aria-hidden />
            Documento referencial: no tiene validez tributaria
          </p>

          {error && (
            <p className="rounded-lg bg-peligro-suave px-3 py-2 text-xs text-peligro-texto" role="alert">{error}</p>
          )}

          <Boton anchoCompleto tamano="lg" onClick={guardar} cargando={submitting}
                 className="hidden h-auto min-h-11 whitespace-normal py-2.5 lg:flex">
            {`Guardar proforma · $${dosDecimales(totales.total)}`}
          </Boton>
        </section>
      </>}
      barra={{
        total:    totales.total,
        texto:    "Guardar proforma",
        onEmitir: guardar,
        enviando: submitting,
        error,
      }}
    >
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

      <ItemsEditor items={items} onChange={setItems} />

      {/* Campos adicionales — salen como observaciones en el PDF */}
      <CamposAdicionales campos={camposAdicionales} onChange={setCamposAdicionales} />
    </EmisionLayout>
  );
}
