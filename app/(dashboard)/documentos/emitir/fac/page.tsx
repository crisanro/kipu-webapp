"use client";
import SoloWeb from "@/components/SoloWeb";

import { useState, useEffect, useMemo } from "react";
import { errorIdentificacion } from "@/lib/identificacion";
import { TIPOS_IVA } from "@/lib/iva";
import { r2 } from "@/lib/dinero";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import { useAuthStore } from "@/store/auth.store";
import { CheckCircle2, AlertTriangle, CreditCard, Copy, MessageCircle } from "lucide-react";

// ── Componentes ────────────────────────────────────────────────────────────────
import PuntoEmision from "../components/PuntoEmision";
import PantallaResultado from "../components/PantallaResultado";
import { usePuntoEmision } from "../components/usePuntoEmision";
import ClienteSelector from "../components/ClienteSelector";
import ItemsEditor, { Item, calcItem, genId, EMPTY_ITEM } from "../components/ItemsEditor";
import PagosMixtos, { PagoItem, PAGO_INICIAL } from "../components/PagosMixtos";
import EstadoCobro, { DatosCobro, cobroInicial, PasarelaEstado, MomentoFactura } from "../components/EstadoCobro";
import CamposAdicionales, { CampoAdicional } from "../components/CamposAdicionales";
import ResumenTotales from "../components/ResumenTotales";
import EmisionLayout from "../components/EmisionLayout";
import { useEmision } from "../components/useEmision";
import { useBorrador } from "@/lib/borradores";

// ── Tipos ──────────────────────────────────────────────────────────────────────
interface Cliente {
  id: string;
  razon_social: string;
  identificacion: string;
  tipo_identificacion_sri: string;
  email: string;
  direccion: string;
}

interface ClienteNuevo {
  tipo_identificacion_sri: string;
  identificacion: string;
  razon_social: string;
  email: string;
}

// ── Helpers ────────────────────────────────────────────────────────────────────
const fmt = (n: number) => r2(n).toFixed(2);

/** Mapea código SRI de forma de pago al label de cobro */
const FORMA_PAGO_COBRO_MAP: Record<string, string> = {
  "01": "EFECTIVO",
  "15": "OTRO",
  "16": "TARJETA",
  "17": "TRANSFERENCIA",
  "19": "TARJETA",
  "20": "TRANSFERENCIA",
};

/** Tope del SRI para facturar a Consumidor Final (07), propina incluida */
const LIMITE_CONSUMIDOR_FINAL = 50;

function calcTotales(items: Item[], incluirPropina: boolean) {
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
  const propina = incluirPropina ? r2(base.subtotal * 0.10) : 0;
  const total   = r2(base.subtotal + base.iva + propina);
  return { ...base, propina, total };
}

/** Qué advertir antes de emitir con link de pago, según el cliente y la pasarela */
function avisoLinkPago(p: PasarelaEstado | null, consumidorFinal: boolean, email: string): string | null {
  if (!p?.conectada) return null;
  if (p.requiere_cliente && consumidorFinal)
    return `${p.nombre} no acepta Consumidor Final: elige un cliente con cédula o RUC y correo.`;
  if (p.requiere_cliente && !email)
    return `${p.nombre} exige el correo del cliente: agrégalo o la factura saldrá sin link.`;
  if (consumidorFinal || !email)
    return "El cliente no tiene correo: el link irá en el PDF; compártelo por WhatsApp desde el detalle de la factura.";
  return null;
}

/** Link de cobro creado (la factura se emitirá cuando paguen) */
interface CobroCreado {
  monto:          number;
  cliente_nombre: string | null;
  link:           { url: string } | null;
}

// ── Página principal ───────────────────────────────────────────────────────────
export default function NuevaFacturaPage() {
  const router  = useRouter();
  const empresa = useAuthStore((s) => s.empresa);

  // ── Envío: clave anti-duplicados, error, uso justo y resultado (useEmision) ──
  const em = useEmision();
  const { enviando: submitting, error, setError, resultado, setResultado } = em;

  // ── Estado cliente ──────────────────────────────────────────────────────────
  const [clienteSelected,   setClienteSelected]   = useState<Cliente | null>(null);
  const [esConsumidorFinal, setEsConsumidorFinal] = useState(false);
  const [clienteNuevo,      setClienteNuevo]      = useState<ClienteNuevo | null>(null);

  // ── Estado items ────────────────────────────────────────────────────────────
  const [items, setItems] = useState<Item[]>([{ _id: genId(), ...EMPTY_ITEM }]);

  // ── Estado pagos ────────────────────────────────────────────────────────────
  const [pagos,   setPagos]   = useState<PagoItem[]>([{ ...PAGO_INICIAL }]);
  const [propina, setPropina] = useState(false);

  // ── Estado cobro ────────────────────────────────────────────────────────────
  const [cobro, setCobro] = useState<DatosCobro>(cobroInicial);

  // ── Link de pago (opcional, factura por factura) ────────────────────────────
  const [pasarela, setPasarela] = useState<PasarelaEstado | null>(null);
  const [linkPago, setLinkPago] = useState(false);
  const [linkCopiado, setLinkCopiado] = useState(false);
  const [momento, setMomento] = useState<MomentoFactura>("ahora");   // "al_pagar": se factura cuando pague
  const [cobroCreado, setCobroCreado] = useState<CobroCreado | null>(null);
  useEffect(() => {
    api.get("/api/v1/app/cobros-en-linea/estado")
      .then(r => {
        const p: PasarelaEstado = r.data.data ?? { conectada: false };
        setPasarela(p);
        setLinkPago(!!p.marcar_por_defecto);
        // Desde "Links de cobro" → Nuevo: ya elegido "emitir la factura cuando pague"
        if (p.conectada && new URLSearchParams(window.location.search).get("cuando") === "al_pagar") {
          setCobro({ ...cobroInicial(), estado: "PENDIENTE", fecha_pago: "" });
          setLinkPago(true);
          setMomento("al_pagar");
        }
      })
      .catch(() => setPasarela(null));   // sin permiso o sin servicio: no se ofrece
  }, []);

  // ── Estado campos adicionales ───────────────────────────────────────────────
  const [camposAdicionales, setCamposAdicionales] = useState<CampoAdicional[]>([]);

  // ── Estado establecimiento ──────────────────────────────────────────────────
  const pe = usePuntoEmision();
  const { estabSelected, ptoSelected } = pe;

  // ── Estado Proforma ─────────────────────────────────────────────────────────
  const [proformaId, setProformaId] = useState<string | null>(null);

  // ── Borrador: lo escrito sobrevive a salir de la pantalla o al cierre de la app ──
  // Con datos de fuera (duplicar, desde proforma) no se ofrece el borrador viejo
  const [conPrefill] = useState(() =>
    typeof window !== "undefined" && !!sessionStorage.getItem("kipu:prefill"));
  const datosBorrador = useMemo(() => ({
    clienteSelected, esConsumidorFinal, clienteNuevo, items, pagos, propina, cobro, camposAdicionales, proformaId,
  }), [clienteSelected, esConsumidorFinal, clienteNuevo, items, pagos, propina, cobro, camposAdicionales, proformaId]);
  const formularioVacio = !clienteSelected && !esConsumidorFinal && !clienteNuevo
    && camposAdicionales.length === 0
    && items.every(i => !i.descripcion?.trim() && !i.codigo?.trim() && !i.precio);
  const borrador = useBorrador("FAC", datosBorrador, { vacio: formularioVacio, desactivado: conPrefill });

  const seguirBorrador = () => {
    const d = borrador.recuperar();
    if (!d) return;
    setClienteSelected(d.clienteSelected ?? null);
    setEsConsumidorFinal(!!d.esConsumidorFinal);
    setClienteNuevo(d.clienteNuevo ?? null);
    if (Array.isArray(d.items) && d.items.length) setItems(d.items);
    if (Array.isArray(d.pagos) && d.pagos.length) setPagos(d.pagos);
    setPropina(!!d.propina);
    if (d.cobro) setCobro(d.cobro);
    setCamposAdicionales(Array.isArray(d.camposAdicionales) ? d.camposAdicionales : []);
    setProformaId(d.proformaId ?? null);
  };

  // ── Totales ─────────────────────────────────────────────────────────────────
  const totales = calcTotales(items, propina);

  // Consumidor Final: el SRI no acepta facturas de más de $50 (propina incluida;
  // el backend valida lo mismo en documento_service)
  const aConsumidorFinal = esConsumidorFinal
    || clienteSelected?.tipo_identificacion_sri === "07"
    || clienteNuevo?.tipo_identificacion_sri === "07";
  const avisoConsumidorFinal = aConsumidorFinal && totales.total > LIMITE_CONSUMIDOR_FINAL
    ? `A Consumidor Final no se puede facturar más de $${fmt(LIMITE_CONSUMIDOR_FINAL)} `
      + `(total: $${fmt(totales.total)}). Elige un cliente con cédula o RUC.`
    : null;

  // ── Cargar estructura ────────────────────────────────────────────────────────

  // ── Prefill / clonación ──────────────────────────────────────────────────────
  useEffect(() => {
    const prefill = sessionStorage.getItem("kipu:prefill");
    if (!prefill) return;
    try {
      const data = JSON.parse(prefill);

      if (data.items && Array.isArray(data.items)) {
        setItems(data.items.map((i: any) => ({
          _id:              genId(),
          codigo:          String(i.codigo ?? ""),
          descripcion:     String(i.descripcion ?? ""),
          cantidad:        parseFloat(i.cantidad)  || 1,
          precio:          parseFloat(i.precio)    || 0,
          descuento:       parseFloat(i.descuento) || 0,
          tipo_descuento: (i.tipo_descuento === "%" ? "%" : "$") as "$" | "%",
          tipo_iva:        TIPOS_IVA.includes(String(i.tipo_iva)) ? String(i.tipo_iva) : "15",
          unidad:          String(i.unidad ?? "UNIDAD"),
        })));
      }

      if (data.camposAdicionales) setCamposAdicionales(data.camposAdicionales);

      if (data._proforma_id) {
        setProformaId(data._proforma_id);
      }

      if (data.esConsumidorFinal) {
        setEsConsumidorFinal(true);
      } else if (data.cliente) {
        setClienteSelected({
          id:                    data.cliente.id || "",
          razon_social:          data.cliente.razon_social || "",
          identificacion:        data.cliente.identificacion || "",
          tipo_identificacion_sri: data.cliente.tipo_id || "05",
          email:                 "",
          direccion:             "",
        });
      }
    } catch (e) {
      console.error("Error al procesar prefill", e);
    } finally {
      sessionStorage.removeItem("kipu:prefill");
    }
  }, []);

  // ── Handlers establecimiento ─────────────────────────────────────────────────

  // ── Reset ────────────────────────────────────────────────────────────────────
  const reset = () => {
    pe.reiniciar();
    em.reiniciar();
    setClienteSelected(null);
    setEsConsumidorFinal(false);
    setClienteNuevo(null);
    setItems([{ _id: genId(), ...EMPTY_ITEM }]);
    setPagos([{ ...PAGO_INICIAL, _id: Math.random().toString(36).slice(2) }]);
    setPropina(false);
    setCobro(cobroInicial());
    setLinkPago(!!pasarela?.marcar_por_defecto);
    setLinkCopiado(false);
    setMomento("ahora");
    setCobroCreado(null);
    setCamposAdicionales([]);
    setProformaId(null);
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
    if (clienteNuevo) {
      const errId = errorIdentificacion(clienteNuevo.tipo_identificacion_sri, clienteNuevo.identificacion);
      if (errId) { setError(`Cliente: ${errId}`); return; }
    }
    if (avisoConsumidorFinal) {
      setError(avisoConsumidorFinal);
      return;
    }
    if (!estabSelected || !ptoSelected) {
      setError("Elige el establecimiento y el punto de emisión.");
      return;
    }
    if (items.some(i => !i.descripcion?.trim())) {
      setError("Todos los ítems deben tener descripción.");
      return;
    }
    // Validar descuento no exceda el subtotal
    const itemDescuentoInvalido = items.find(i => {
      const subtotal = r2(i.cantidad * i.precio);
      return i.tipo_descuento === "%"
        ? i.descuento > 100
        : i.descuento > subtotal;
    });
    if (itemDescuentoInvalido) {
      setError("El descuento no puede superar el valor del ítem.");
      return;
    }

    // Validar código en ítems para catálogo
    if (items.some(i => i.guardar_catalogo && !i.codigo?.trim())) {
      setError("Los ítems marcados para guardar en catálogo necesitan un código.");
      return;
    }

    // Verificar códigos duplicados en catálogo
    const itemsParaCatalogo = items.filter(i => i.guardar_catalogo && i.codigo?.trim());
    if (itemsParaCatalogo.length > 0) {
      try {
        const res = await api.get("/api/v1/app/productos?incluir_inactivos=false");
        const existentes = (res.data.data ?? []).map((p: any) => (p.codigo || "").toUpperCase());
        const duplicado = itemsParaCatalogo.find(i => existentes.includes(i.codigo.trim().toUpperCase()));
        if (duplicado) {
          setError(`El código "${duplicado.codigo}" ya existe en tu catálogo. Cámbialo o desmarca "Guardar en catálogo".`);
          return;
        }
      } catch {}
    }
    
    const puedeEmitir = empresa?.suscripcion_activa || (empresa?.balance_api ?? 0) > 0 || !!empresa?.emision_gratis;
    if (!puedeEmitir) {
      setError("Se requiere suscripción activa o créditos API para emitir.");
      return;
    }

    const totalCubierto = pagos.reduce((s, p) => s + (p.total ?? 0), 0);
    if (totalCubierto > totales.total) {
      setError(`Los pagos ($${fmt(totalCubierto)}) superan el total ($${fmt(totales.total)}).`);
      return;
    }

    // Derivar forma_pago_cobro del primer pago
    const formaPagoPrincipal = pagos[0]?.forma_pago ?? "01";
    const formaPagoCobro = FORMA_PAGO_COBRO_MAP[formaPagoPrincipal] ?? "OTRO";

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
          codigo:          i.codigo || undefined,
          descripcion:     i.descripcion,
          cantidad:        i.cantidad,
          precio_unitario: i.precio,
          descuento:       c.descuento,
          tipo_iva:        i.tipo_iva,
          unidad_medida:   i.unidad,
          guardar_catalogo: !!i.guardar_catalogo,
          // Al guardarlo en el catálogo, conserva el precio final que se escribió
          ...(i.guardar_catalogo && i.precio_iva !== undefined ? { precio_con_iva: i.precio_iva } : {}),
        };
      }),

      pagos: pagos.map(p => ({
        forma_pago: p.forma_pago,
        ...(p.total !== null ? { total: p.total } : {}),
      })),

      ...(propina ? { propina: totales.propina } : {}),
      campos_adicionales: camposAdicionales.filter(c => c.nombre && c.valor),
      ...(proformaId ? { proforma_id: proformaId } : {}),

      // ── Datos de cobro ──
      estado_cobro:            cobro.estado,
      forma_pago_cobro:        cobro.estado === "PAGADO" ? formaPagoCobro : null,
      fecha_pago:              cobro.estado === "PAGADO" ? cobro.fecha_pago : null,
      numero_comprobante_pago: cobro.estado === "PAGADO" && cobro.referencia.trim()
                                 ? cobro.referencia.trim()
                                 : null,
      // Link de pago: solo si quien emite lo pidió y la factura queda por cobrar
      ...(cobro.estado === "PENDIENTE" && linkPago && pasarela?.conectada ? { link_pago: true } : {}),
    };

    // "Emitir cuando pague": solo el link; la factura se emite sola al confirmarse el pago
    if (cobro.estado === "PENDIENTE" && linkPago && pasarela?.conectada && momento === "al_pagar") {
      const factura = { ...payload };
      for (const campo of ["estado_cobro", "forma_pago_cobro", "fecha_pago", "numero_comprobante_pago",
                           "link_pago", "proforma_id"]) delete factura[campo];
      // Sin plan, el link cuenta en el uso justo: agotado, mismo aviso con ampliación
      const r = await em.enviar<{ data: CobroCreado }>("/api/v1/app/cobros-en-linea/cobros", factura,
                                                       { tipo: "FAC-COBRO", porDefecto: "No se pudo crear el link de cobro." });
      if (r) { borrador.borrar(); setCobroCreado(r.data); }
      return;
    }

    const r = await em.enviar("/api/v1/app/documentos/emit/FAC", payload,
                              { tipo: "FAC", porDefecto: "Error al emitir la factura." });
    if (r) { borrador.borrar(); setResultado(r); }
  };

  // ── Link de cobro creado (la factura se emite cuando pague) ──────────────────
  if (cobroCreado) {
    const url: string = cobroCreado.link?.url ?? "";
    return (
      <div className="min-h-screen flex items-center justify-center p-6" style={{ background: "var(--kipu-bg)" }}>
        <div className="w-full max-w-sm text-center">
          <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
               style={{ background: "color-mix(in srgb, var(--kipu-accent) 15%, transparent)" }}>
            <CreditCard size={30} style={{ color: "var(--kipu-accent)" }} />
          </div>
          <h2 className="text-xl font-bold mb-1" style={{ color: "var(--kipu-text)" }}>Link de cobro listo</h2>
          <p className="text-sm mb-4" style={{ color: "var(--kipu-subtle)" }}>
            Cuando {cobroCreado.cliente_nombre || "tu cliente"} pague ${fmt(cobroCreado.monto)}, la factura
            se emitirá sola, ya cobrada, y le llegará por correo.
          </p>
          <div className="text-left rounded-xl p-3 mb-6 space-y-2"
               style={{ border: "1px solid var(--kipu-border)", background: "var(--kipu-surface)" }}>
            <code className="block truncate text-[11px] px-2 py-1.5 rounded"
                  style={{ background: "color-mix(in srgb, var(--kipu-text) 5%, transparent)", color: "var(--kipu-text)" }}>
              {url}
            </code>
            <div className="flex gap-2">
              <button
                onClick={async () => { await navigator.clipboard.writeText(url); setLinkCopiado(true); }}
                className="flex-1 inline-flex items-center justify-center gap-1.5 text-xs py-1.5 rounded-lg"
                style={{ border: "1px solid var(--kipu-border)", color: "var(--kipu-muted)" }}
              >
                {linkCopiado ? <CheckCircle2 size={12} style={{ color: "var(--kipu-success)" }} /> : <Copy size={12} />}
                {linkCopiado ? "Copiado" : "Copiar"}
              </button>
              <a
                href={`https://wa.me/?text=${encodeURIComponent(`Hola, te comparto el link para tu pago: ${url}`)}`}
                target="_blank" rel="noopener noreferrer"
                className="flex-1 inline-flex items-center justify-center gap-1.5 text-xs py-1.5 rounded-lg"
                style={{ border: "1px solid var(--kipu-border)", color: "var(--kipu-muted)" }}
              >
                <MessageCircle size={12} /> WhatsApp
              </a>
            </div>
          </div>
          <div className="flex gap-3">
            <button
              onClick={reset}
              className="flex-1 py-2.5 rounded-lg text-sm transition-colors"
              style={{ border: "1px solid var(--kipu-border)", color: "var(--kipu-muted)" }}
            >
              Nueva factura
            </button>
            <button
              onClick={() => router.push("/cobros")}
              className="flex-1 py-2.5 rounded-lg text-white text-sm font-medium transition-colors"
              style={{ background: "var(--kipu-accent)" }}
            >
              Ver links de cobro
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Pantalla de resultado ────────────────────────────────────────────────────
  if (resultado) {
    return (
      <PantallaResultado tipo="FAC" resultado={resultado} onNueva={reset}>
        {resultado.link_pago && (
          <div className="text-left rounded-xl p-3 mb-4 space-y-2"
               style={{ border: "1px solid var(--kipu-border)", background: "var(--kipu-surface)" }}>
            <p className="flex items-center gap-1.5 text-xs font-medium" style={{ color: "var(--kipu-text)" }}>
              <CreditCard size={13} style={{ color: "var(--kipu-accent)" }} />
              Link de pago incluido en la factura
            </p>
            <code className="block truncate text-[11px] px-2 py-1.5 rounded"
                  style={{ background: "color-mix(in srgb, var(--kipu-text) 5%, transparent)", color: "var(--kipu-text)" }}>
              {resultado.link_pago}
            </code>
            <div className="flex gap-2">
              <button
                onClick={async () => { await navigator.clipboard.writeText(resultado.link_pago); setLinkCopiado(true); }}
                className="flex-1 inline-flex items-center justify-center gap-1.5 text-xs py-1.5 rounded-lg"
                style={{ border: "1px solid var(--kipu-border)", color: "var(--kipu-muted)" }}
              >
                {linkCopiado ? <CheckCircle2 size={12} style={{ color: "var(--kipu-success)" }} /> : <Copy size={12} />}
                {linkCopiado ? "Copiado" : "Copiar"}
              </button>
              <a
                href={`https://wa.me/?text=${encodeURIComponent(`Hola, te comparto el link para pagar tu factura: ${resultado.link_pago}`)}`}
                target="_blank" rel="noopener noreferrer"
                className="flex-1 inline-flex items-center justify-center gap-1.5 text-xs py-1.5 rounded-lg"
                style={{ border: "1px solid var(--kipu-border)", color: "var(--kipu-muted)" }}
              >
                <MessageCircle size={12} /> WhatsApp
              </a>
            </div>
          </div>
        )}
        {resultado.aviso_link_pago && (
          <p className="flex items-start gap-1.5 text-left text-xs rounded-lg px-3 py-2 mb-4"
             style={{ color: "var(--kipu-warning)", background: "color-mix(in srgb, var(--kipu-warning) 10%, transparent)" }}>
            <AlertTriangle size={13} className="mt-0.5 shrink-0" />
            {resultado.aviso_link_pago}
          </p>
        )}
      </PantallaResultado>
    );
  }

  // ── Formulario ───────────────────────────────────────────────────────────────
  // "Emitir cuando pague": el botón crea el link de cobro en vez de la factura
  const soloLink = cobro.estado === "PENDIENTE" && linkPago && !!pasarela?.conectada && momento === "al_pagar";
  const puedeEmitir = !!empresa && (empresa.suscripcion_activa || empresa.balance_api > 0 || !!empresa.emision_gratis);

  return (
    <EmisionLayout
      titulo="Nueva factura"
      subtitulo={<>{empresa?.razon_social} · {empresa?.ambiente === 2 ? "Producción" : "Pruebas"}</>}
      tiposEmision={["FAC", "FAC-COBRO"]}
      borrador={borrador.pendiente && {
        hace: borrador.pendiente.hace, que: "una factura",
        onSeguir: seguirBorrador, onDescartar: borrador.descartar,
      }}
      alerta={
        // Sin suscripción activa ni créditos API (con el plan gratis sí puede emitir)
        empresa && !empresa.suscripcion_activa && empresa.balance_api === 0 && !empresa.emision_gratis && (
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
              <SoloWeb><a href="/planes" className="underline">Ver opciones</a></SoloWeb>
            </p>
          </div>
        )
      }
      lateral={<>
        {/* Punto de emisión — compu (en el celular va arriba del formulario) */}
        <div className="hidden lg:block">
          <PuntoEmision {...pe} />
        </div>

        {/* Totales + botón emitir (en el celular el botón está en la barra fija) */}
        <ResumenTotales
          serie={pe.serie}
          totales={totales}
          submitting={submitting}
          error={error}
          aviso={avisoConsumidorFinal}
          suscripcionActiva={empresa?.suscripcion_activa ?? false}
          balanceApi={empresa?.balance_api ?? 0}
          emisionGratis={!!empresa?.emision_gratis && !soloLink}
          usoJusto={em.esUsoJusto}
          onEmitir={emitir}
          textoBoton={soloLink ? "Crear link de cobro" : undefined}
          conBarraFija
        />
      </>}
      barra={{
        total:         totales.total,
        texto:         soloLink ? "Crear link de cobro" : `Emitir${pe.serie ? ` desde ${pe.serie}` : ""}`,
        onEmitir:      emitir,
        enviando:      submitting,
        deshabilitado: !puedeEmitir,
        error,
      }}
    >
      {/* Punto de emisión — solo celular */}
      <div className="lg:hidden">
        <PuntoEmision {...pe} />
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

      {/* Estado de cobro */}
      <EstadoCobro
        cobro={cobro}
        onChange={setCobro}
        linkPago={{
          pasarela,
          activo:   linkPago,
          onChange: setLinkPago,
          aviso:    avisoLinkPago(pasarela, esConsumidorFinal, clienteSelected?.email || clienteNuevo?.email || ""),
          momento,
          onMomento: setMomento,
        }}
      />

      {/* Campos adicionales */}
      <CamposAdicionales
        campos={camposAdicionales}
        onChange={setCamposAdicionales}
      />
    </EmisionLayout>
  );
}
