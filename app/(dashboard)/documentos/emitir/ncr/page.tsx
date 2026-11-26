"use client";
// Nota de crédito: la factura que se modifica, el motivo y los ítems que se
// devuelven o rebajan. Con ?doc_id=… llega con la factura y sus ítems cargados.

import { useState, useEffect, useMemo } from "react";
import { tipoIvaDesdeXml } from "@/lib/iva";
import { useSearchParams } from "next/navigation";
import api from "@/lib/api";
import { useAuthStore } from "@/store/auth.store";
import { useBorrador } from "@/lib/borradores";
import { MessageSquareText } from "lucide-react";
import ChipsFiltro from "@/components/ui/ChipsFiltro";
import { Entrada } from "@/components/ui/Campo";
import PuntoEmision from "../components/PuntoEmision";
import PantallaResultado from "../components/PantallaResultado";
import { usePuntoEmision } from "../components/usePuntoEmision";
import CamposAdicionales, { CampoAdicional } from "../components/CamposAdicionales";
import ItemsEditor, { Item, calcTotales, genId, itemsParaEnviar, EMPTY_ITEM } from "../components/ItemsEditor";
import ResumenTotales from "../components/ResumenTotales";
import DocOrigenSelector, {
  DocOrigen, AvisoOrigenConsumidorFinal, docOrigenDeDocumento, esConsumidorFinal, numeroDocOrigen, payloadDocOrigen,
} from "../components/DocOrigenSelector";
import EmisionLayout from "../components/EmisionLayout";
import { useEmision } from "../components/useEmision";
import { tieneAccesoAEmitir } from "@/lib/emision";

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

  // El SRI no deja modificar comprobantes a Consumidor Final
  const aConsumidorFinal = esConsumidorFinal(docOrigen);

  // Formulario
  const [motivo,              setMotivo]              = useState(MOTIVOS[0].valor);
  const [motivoPersonalizado, setMotivoPersonalizado] = useState("");
  const [items,               setItems]               = useState<Item[]>(ITEMS_VACIOS);
  const [camposAdicionales,   setCamposAdicionales]   = useState<CampoAdicional[]>([]);

  // Establecimiento y punto de emisión
  const pe = usePuntoEmision(numeroDocOrigen(docOrigen));
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
        setDocOrigen(docOrigenDeDocumento(d));

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

  const puedeEmitir = tieneAccesoAEmitir(empresa);

  const emitir = async () => {
    setError("");

    if (aConsumidorFinal) {
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
      items: itemsParaEnviar(items),
      campos_adicionales: camposAdicionales.filter(c => c.nombre && c.valor),
      ...payloadDocOrigen(docOrigen),
    };

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
      puntoEmision={<PuntoEmision {...pe} />}
      tiposEmision={["NCR"]}
      borrador={borrador.pendiente && {
        hace: borrador.pendiente.hace, que: "una nota de crédito",
        onSeguir: seguirBorrador, onDescartar: borrador.descartar,
      }}
      lateral={
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
      }
      barra={{
        total:         totales.total,
        texto:         `Emitir${pe.serie ? ` desde ${pe.serie}` : ""}`,
        onEmitir:      emitir,
        enviando:      submitting,
        deshabilitado: !puedeEmitir || aConsumidorFinal,
        error,
      }}
    >
      <DocOrigenSelector
        tiposDoc="FAC"
        tabla="emitidos"
        value={docOrigen}
        onChange={setDocOrigen}
        label="Factura a modificar"
      />

      {aConsumidorFinal && <AvisoOrigenConsumidorFinal />}

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
