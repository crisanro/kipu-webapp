"use client";
// Nota de crédito: la factura que se modifica, el motivo y los ítems que se
// devuelven o rebajan. Con ?doc_id=… llega con la factura y sus ítems cargados.

import { useState, useEffect, useMemo } from "react";
import { r2 } from "@/lib/dinero";
import { tipoIvaDesdeXml } from "@/lib/iva";
import { useSearchParams } from "next/navigation";
import api from "@/lib/api";
import { useAuthStore } from "@/store/auth.store";
import { useBorrador } from "@/lib/borradores";
import { AlertTriangle, MessageSquareText } from "lucide-react";
import ChipsFiltro from "@/components/ui/ChipsFiltro";
import { Entrada } from "@/components/ui/Campo";
import PuntoEmision from "../components/PuntoEmision";
import PantallaResultado from "../components/PantallaResultado";
import { usePuntoEmision } from "../components/usePuntoEmision";
import CamposAdicionales, { CampoAdicional } from "../components/CamposAdicionales";
import ItemsEditor, { Item, calcItem, genId, EMPTY_ITEM } from "../components/ItemsEditor";
import ResumenTotales from "../components/ResumenTotales";
import DocOrigenSelector, { DocOrigen } from "../components/DocOrigenSelector";
import EmisionLayout from "../components/EmisionLayout";
import { useEmision } from "../components/useEmision";

// ── Helpers ──────────────────────────────────────────────────────────────────
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

const MOTIVOS = [
  { valor: "DEVOLUCION DE BIEN",       etiqueta: "Devolución" },
  { valor: "ANULACION DE COMPROBANTE", etiqueta: "Anulación" },
  { valor: "REBAJA DE PRECIO",         etiqueta: "Rebaja de precio" },
  { valor: "DESCUENTO COMERCIAL",      etiqueta: "Descuento comercial" },
  { valor: "OTROS",                    etiqueta: "Otro motivo" },
];

const ITEMS_VACIOS = (): Item[] => [{ _id: genId(), ...EMPTY_ITEM }];

// ── Página ────────────────────────────────────────────────────────────────────
export default function NuevaNcrPage() {
  const searchParams = useSearchParams();
  const empresa      = useAuthStore((s) => s.empresa);

  // Envío: clave anti-duplicados, error, uso justo y resultado
  const em = useEmision();
  const { enviando: submitting, error, setError, resultado } = em;

  // Doc origen
  const [docOrigen, setDocOrigen] = useState<DocOrigen>(null);

  // Validación Consumidor Final
  const esConsumidorFinal = docOrigen?.tipo === "kipu"
    ? docOrigen.data.identificacion === "9999999999999"
    : docOrigen?.tipo === "manual"
    ? docOrigen.data.cliente?.identificacion === "9999999999999"
    : false;

  // Formulario
  const [motivo,              setMotivo]              = useState(MOTIVOS[0].valor);
  const [motivoPersonalizado, setMotivoPersonalizado] = useState("");
  const [items,               setItems]               = useState<Item[]>(ITEMS_VACIOS);
  const [camposAdicionales,   setCamposAdicionales]   = useState<CampoAdicional[]>([]);

  // Establecimiento y punto de emisión
  const pe = usePuntoEmision(docOrigen?.tipo === "kipu" ? docOrigen.data.numero_doc : docOrigen?.tipo === "manual" ? docOrigen.data.numero : null);
  const { estabSelected, ptoSelected } = pe;

  const totales = calcTotales(items);

  const motivoFinal = motivo === "OTROS" && motivoPersonalizado.trim()
    ? motivoPersonalizado.trim().toUpperCase()
    : motivo;

  // ── Borrador (con ?doc_id la pantalla llega cargada: no se ofrece el viejo) ──
  const desdeFactura = !!searchParams.get("doc_id");
  const datosBorrador = useMemo(() => ({ docOrigen, motivo, motivoPersonalizado, items, camposAdicionales }),
    [docOrigen, motivo, motivoPersonalizado, items, camposAdicionales]);
  const borrador = useBorrador("NCR", datosBorrador, {
    vacio: !docOrigen && !motivoPersonalizado.trim() && camposAdicionales.length === 0
      && items.every(i => !i.descripcion?.trim() && !i.codigo?.trim() && !i.precio),
    desactivado: desdeFactura,
  });
  const seguirBorrador = () => {
    const d = borrador.recuperar();
    if (!d) return;
    setDocOrigen(d.docOrigen ?? null);
    setMotivo(d.motivo || MOTIVOS[0].valor);
    setMotivoPersonalizado(d.motivoPersonalizado ?? "");
    if (Array.isArray(d.items) && d.items.length) setItems(d.items);
    setCamposAdicionales(Array.isArray(d.camposAdicionales) ? d.camposAdicionales : []);
  };

  // Pre-cargar doc desde query param ?doc_id=xxx
  useEffect(() => {
    const docId = searchParams.get("doc_id");
    if (!docId) return;
    const cargar = async () => {
      try {
        const res = await api.get(`/api/v1/app/documentos/${docId}`);
        const d   = res.data.data;
        const info = d.datos?.infoFactura || d.datos?.infoLiquidacionCompra || {};

        setDocOrigen({
          tipo: "kipu",
          data: {
            id:             d.id,
            numero_doc:     d.numero_doc,
            tipo_doc:       d.tipo_doc || "FAC",
            cod_doc:        d.cod_doc || "01",
            fecha_emision:  d.fecha_emision,
            importe_total:  d.importe_total,
            razon_social:   info.razonSocialComprador || info.razonSocialProveedor || "",
            identificacion: info.identificacionComprador || info.identificacionProveedor || "",
            estado_sri:     d.estado_sri,
          }
        });

        // Pre-llenar ítems desde la factura origen
        const detalles = d.datos?.detalles?.detalle ?? [];
        const arr = Array.isArray(detalles) ? detalles : [detalles];
        if (arr.length > 0) {
          setItems(arr.map((det: any) => ({
            _id:            genId(),
            codigo:         det.codigoPrincipal || det.codigoInterno || "",
            descripcion:    det.descripcion || "",
            cantidad:       parseFloat(det.cantidad) || 1,
            precio:         parseFloat(det.precioUnitario) || 0,
            descuento:      parseFloat(det.descuento) || 0,
            tipo_descuento: "$" as "$",
            tipo_iva:       tipoIvaDesdeXml(det.impuestos?.impuesto),
            unidad:         det.unidadMedida || "UNIDAD",
          })));
        }
      } catch (e) { console.error(e); }
    };
    cargar();
  }, [searchParams]);

  const reset = () => {
    pe.reiniciar();
    em.reiniciar();
    setDocOrigen(null);
    setMotivo(MOTIVOS[0].valor);
    setMotivoPersonalizado("");
    setItems(ITEMS_VACIOS());
    setCamposAdicionales([]);
  };

  const puedeEmitir = !!empresa && (empresa.suscripcion_activa || empresa.balance_api > 0 || !!empresa.emision_gratis);

  const emitir = async () => {
    setError("");

    if (esConsumidorFinal) {
      setError("Por normativa del SRI, no se pueden emitir notas de crédito para comprobantes a Consumidor Final.");
      return;
    }
    if (!docOrigen) { setError("Selecciona el documento a modificar."); return; }
    if (motivo === "OTROS" && !motivoPersonalizado.trim()) { setError("Escribe el motivo."); return; }
    if (!estabSelected || !ptoSelected) { setError("Elige el establecimiento y el punto de emisión."); return; }
    if (items.some(i => !i.descripcion?.trim())) { setError("Todos los ítems deben tener descripción."); return; }
    if (totales.total <= 0) { setError("El valor de modificación debe ser mayor a $0."); return; }
    if (!puedeEmitir) { setError("Se requiere suscripción activa o créditos API."); return; }

    const payload: any = {
      establecimiento: estabSelected,
      punto_emision:   ptoSelected,
      motivo:          motivoFinal,
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
      campos_adicionales: camposAdicionales.filter(c => c.nombre && c.valor),
    };

    if (docOrigen.tipo === "kipu") {
      payload.doc_origen_id = docOrigen.data.id;
    } else {
      payload.doc_origen_numero  = docOrigen.data.numero;
      payload.doc_origen_fecha   = docOrigen.data.fecha;
      payload.doc_origen_cod_doc = docOrigen.data.cod_doc;
      payload.cliente_origen     = docOrigen.data.cliente;
    }

    const r = await em.enviar("/api/v1/app/documentos/emit/NCR", payload,
                              { tipo: "NCR", porDefecto: "Error al emitir la nota de crédito." });
    if (r) { borrador.borrar(); em.setResultado(r); }
  };

  // Pantalla resultado
  if (resultado) {
    return <PantallaResultado tipo="NCR" resultado={resultado} onNueva={reset} />;
  }

  return (
    <EmisionLayout
      titulo="Nueva nota de crédito"
      subtitulo={<>{empresa?.razon_social} · {empresa?.ambiente === 2 ? "Producción" : "Pruebas"}</>}
      tiposEmision={["NCR"]}
      borrador={borrador.pendiente && {
        hace: borrador.pendiente.hace, que: "una nota de crédito",
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
        total:         totales.total,
        texto:         `Emitir${pe.serie ? ` desde ${pe.serie}` : ""}`,
        onEmitir:      emitir,
        enviando:      submitting,
        deshabilitado: !puedeEmitir || esConsumidorFinal,
        error,
      }}
    >
      {/* Punto emisión — solo celular */}
      <div className="lg:hidden">
        <PuntoEmision {...pe} />
      </div>

      <DocOrigenSelector
        tiposDoc="FAC"
        tabla="emitidos"
        value={docOrigen}
        onChange={setDocOrigen}
        label="Factura a modificar"
      />

      {esConsumidorFinal && (
        <div className="flex items-start gap-3 rounded-xl border border-peligro/20 bg-peligro-suave px-4 py-3" role="alert">
          <AlertTriangle size={16} className="mt-0.5 shrink-0 text-peligro" aria-hidden />
          <div>
            <p className="text-sm font-medium text-peligro-texto">No disponible para Consumidor Final</p>
            <p className="mt-1 text-xs text-tenue">
              Por normativa del SRI, los comprobantes emitidos a Consumidor Final no se modifican con notas de crédito ni de débito.
            </p>
          </div>
        </div>
      )}

      {/* Motivo */}
      <section className="space-y-3 rounded-xl border border-borde bg-superficie p-4">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-texto">
          <MessageSquareText size={16} className="text-acento" aria-hidden /> Motivo
        </h2>
        <ChipsFiltro
          etiqueta="Motivo"
          opciones={MOTIVOS}
          valor={motivo}
          onCambio={(m) => { setMotivo(m); setMotivoPersonalizado(""); }}
        />
        {motivo === "OTROS" && (
          <div>
            <Entrada
              value={motivoPersonalizado}
              onChange={e => setMotivoPersonalizado(e.target.value.toUpperCase())}
              placeholder="Describe el motivo…"
              aria-label="Motivo"
              maxLength={300}
              autoFocus
            />
            <p className="mt-1 text-right text-[11px] text-sutil">{motivoPersonalizado.length}/300</p>
          </div>
        )}
      </section>

      {/* Ítems a devolver/rebajar */}
      <ItemsEditor items={items} onChange={setItems} />

      <CamposAdicionales campos={camposAdicionales} onChange={setCamposAdicionales} />
    </EmisionLayout>
  );
}
