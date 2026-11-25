"use client";
// Liquidación de compra: lo que se le compra a una persona natural que no
// factura (sin RUC). Solo con Kipu Pro o Al Día.

import { useState, useMemo } from "react";
import { errorIdentificacion } from "@/lib/identificacion";
import { r2 } from "@/lib/dinero";
import { useBorrador } from "@/lib/borradores";
import BloqueoPlanPro from "@/components/dashboard/BloqueoPlanPro";
import { useAuthStore } from "@/store/auth.store";
import PuntoEmision from "../components/PuntoEmision";
import PantallaResultado from "../components/PantallaResultado";
import { usePuntoEmision } from "../components/usePuntoEmision";
import ClienteSelector from "../components/ClienteSelector";
import ItemsEditor, { Item, calcItem, genId, EMPTY_ITEM } from "../components/ItemsEditor";
import PagosMixtos, { PagoItem, PAGO_INICIAL } from "../components/PagosMixtos";
import CamposAdicionales, { CampoAdicional } from "../components/CamposAdicionales";
import ResumenTotales from "../components/ResumenTotales";
import EmisionLayout from "../components/EmisionLayout";
import { useEmision } from "../components/useEmision";

// ── Helpers ───────────────────────────────────────────────────────────────────
const fmt = (n: number) => r2(n).toFixed(2);

function calcTotales(items: Item[]) {
  const base = items.reduce(
    (acc, item) => {
      const c = calcItem(item);
      acc.subtotal    = r2(acc.subtotal + c.base);
      acc.descuento   = r2(acc.descuento + c.descuento);
      acc.iva         = r2(acc.iva + c.iva);
      acc.subtotal_0  = r2(acc.subtotal_0  + (item.tipo_iva === "0"  ? c.base : 0));
      acc.subtotal_no_objeto = r2(acc.subtotal_no_objeto + (item.tipo_iva === "NA" ? c.base : 0));
      acc.subtotal_exento    = r2(acc.subtotal_exento    + (item.tipo_iva === "EX" ? c.base : 0));
      acc.subtotal_5  = r2(acc.subtotal_5  + (item.tipo_iva === "5"  ? c.base : 0));
      acc.subtotal_15 = r2(acc.subtotal_15 + (item.tipo_iva === "15" ? c.base : 0));
      acc.iva_5       = r2(acc.iva_5  + (item.tipo_iva === "5"  ? c.iva : 0));
      acc.iva_15      = r2(acc.iva_15 + (item.tipo_iva === "15" ? c.iva : 0));
      return acc;
    },
    { subtotal: 0, descuento: 0, iva: 0, subtotal_0: 0, subtotal_no_objeto: 0, subtotal_exento: 0, subtotal_5: 0, subtotal_15: 0, iva_5: 0, iva_15: 0 }
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
  direccion?:              string;
}

const ITEMS_VACIOS = (): Item[] => [{ _id: genId(), ...EMPTY_ITEM }];

// ── Página ────────────────────────────────────────────────────────────────────
export default function NuevaLiqPage() {
  const empresa = useAuthStore((s) => s.empresa);

  // Envío: clave anti-duplicados, error, uso justo, plan requerido y resultado
  const em = useEmision();
  const { enviando: submitting, error, setError, resultado } = em;

  // Proveedor (persona natural: sin RUC ni consumidor final)
  const [proveedorSelected, setProveedorSelected] = useState<Proveedor | null>(null);
  const [proveedorNuevo,    setProveedorNuevo]    = useState<ProveedorNuevo | null>(null);

  // Items
  const [items, setItems] = useState<Item[]>(ITEMS_VACIOS);

  // Pagos
  const [pagos, setPagos] = useState<PagoItem[]>([{ ...PAGO_INICIAL }]);

  // Campos adicionales
  const [camposAdicionales, setCamposAdicionales] = useState<CampoAdicional[]>([]);

  // Establecimiento y punto de emisión
  const pe = usePuntoEmision();
  const { estabSelected, ptoSelected } = pe;

  const totales = calcTotales(items);

  // ── Borrador ──
  const datosBorrador = useMemo(() => ({ proveedorSelected, proveedorNuevo, items, pagos, camposAdicionales }),
    [proveedorSelected, proveedorNuevo, items, pagos, camposAdicionales]);
  const borrador = useBorrador("LIQ", datosBorrador, {
    vacio: !proveedorSelected && !proveedorNuevo && camposAdicionales.length === 0
      && items.every(i => !i.descripcion?.trim() && !i.codigo?.trim() && !i.precio),
  });
  const seguirBorrador = () => {
    const d = borrador.recuperar();
    if (!d) return;
    setProveedorSelected(d.proveedorSelected ?? null);
    setProveedorNuevo(d.proveedorNuevo ?? null);
    if (Array.isArray(d.items) && d.items.length) setItems(d.items);
    if (Array.isArray(d.pagos) && d.pagos.length) setPagos(d.pagos);
    setCamposAdicionales(Array.isArray(d.camposAdicionales) ? d.camposAdicionales : []);
  };

  const reset = () => {
    pe.reiniciar();
    em.reiniciar();
    setProveedorSelected(null);
    setProveedorNuevo(null);
    setItems(ITEMS_VACIOS());
    setPagos([{ ...PAGO_INICIAL, _id: Math.random().toString(36).slice(2) }]);
    setCamposAdicionales([]);
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
    if (proveedorNuevo) {
      const errId = errorIdentificacion(proveedorNuevo.tipo_identificacion_sri, proveedorNuevo.identificacion);
      if (errId) { setError(`Proveedor: ${errId}`); return; }
    }
    if (!estabSelected || !ptoSelected) {
      setError("Elige el establecimiento y el punto de emisión."); return;
    }
    if (items.some(i => !i.descripcion?.trim())) {
      setError("Todos los ítems deben tener descripción."); return;
    }

    const totalCubierto = pagos.reduce((s, p) => s + (p.total ?? 0), 0);
    if (totalCubierto > totales.total) {
      setError(`Los pagos ($${fmt(totalCubierto)}) superan el total ($${fmt(totales.total)}).`); return;
    }

    const payload = {
      establecimiento: estabSelected,
      punto_emision:   ptoSelected,
      cliente_id:      proveedorNuevo ? undefined : proveedorSelected?.id,
      cliente:         proveedorNuevo ? {
        tipo_id:        proveedorNuevo.tipo_identificacion_sri,
        nombre:         proveedorNuevo.razon_social,
        identificacion: proveedorNuevo.identificacion,
        email:          proveedorNuevo.email,
        direccion:      proveedorNuevo.direccion ?? "",
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
    };

    const r = await em.enviar("/api/v1/app/documentos/emit/LIQ", payload,
                              { tipo: "LIQ", porDefecto: "Error al emitir la liquidación." });
    if (r) { borrador.borrar(); em.setResultado(r); }
  };

  // Liquidación de compra: solo con Kipu Pro o Al Día (el backend responde 402 PLAN_REQUERIDO)
  if ((empresa && !empresa.suscripcion_activa) || em.planRequerido) {
    return (
      <div className="p-4 md:p-6">
        <BloqueoPlanPro mensaje={em.planRequerido || undefined} />
      </div>
    );
  }

  // Pantalla resultado
  if (resultado) {
    return <PantallaResultado tipo="LIQ" resultado={resultado} onNueva={reset} />;
  }

  return (
    <EmisionLayout
      titulo="Nueva liquidación de compra"
      subtitulo={<>{empresa?.razon_social} · {empresa?.ambiente === 2 ? "Producción" : "Pruebas"}</>}
      tiposEmision={["LIQ"]}
      borrador={borrador.pendiente && {
        hace: borrador.pendiente.hace, que: "una liquidación de compra",
        onSeguir: seguirBorrador, onDescartar: borrador.descartar,
      }}
      lateral={<>
        <div className="hidden lg:block">
          <PuntoEmision {...pe} />
        </div>
        <ResumenTotales
          serie={pe.serie}
          totales={totales}
          submitting={submitting}
          error={error}
          suscripcionActiva={empresa?.suscripcion_activa ?? false}
          balanceApi={empresa?.balance_api ?? 0}
          emisionGratis={!!empresa?.emision_gratis}
          usoJusto={em.esUsoJusto}
          onEmitir={emitir}
          conBarraFija
        />
      </>}
      barra={{
        total:    totales.total,
        texto:    `Emitir${pe.serie ? ` desde ${pe.serie}` : ""}`,
        onEmitir: emitir,
        enviando: submitting,
        error,
      }}
    >
      <div className="lg:hidden">
        <PuntoEmision {...pe} />
      </div>

      <ClienteSelector
        proveedor
        clienteSelected={proveedorSelected}
        clienteNuevo={proveedorNuevo}
        onSelectCliente={(p) => { setProveedorSelected(p); setProveedorNuevo(null); }}
        onClienteNuevo={(p) => { setProveedorNuevo(p); if (p) setProveedorSelected(null); }}
        onClear={() => { setProveedorSelected(null); setProveedorNuevo(null); }}
      />

      <ItemsEditor items={items} onChange={setItems} />

      <PagosMixtos
        pagos={pagos}
        totalFactura={totales.total}
        propina={false}
        onChange={setPagos}
        onPropinaChange={() => {}}
      />

      <CamposAdicionales campos={camposAdicionales} onChange={setCamposAdicionales} />
    </EmisionLayout>
  );
}
