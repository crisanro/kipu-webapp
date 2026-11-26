"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, RefreshCw, RotateCcw, ShieldCheck, ChevronDown, ChevronUp, Share2, FileText,
  MoreVertical, Copy, ExternalLink, Clock,
} from "lucide-react";
import api from "@/lib/api";
import { abrirExterno } from "@/lib/nativo";
import { useAvisos } from "@/components/ui/Avisos";
import Boton from "@/components/ui/Boton";
import BotonIcono from "@/components/ui/BotonIcono";
import HojaAcciones, { type Accion } from "@/components/ui/HojaAcciones";
import { InsigniaSri, InsigniaEstado } from "@/components/ui/InsigniaEstado";
import { type FacturaBase, TIPO_LABEL, MOTIVO_LABEL, formatearFechaHora } from "./utils";
import { useAccionesArchivo } from "./AccionesArchivo";
import { useAccionesRelacionadas } from "./ComprobantesRelacionados";
import { detalleError } from "@/lib/errores";
import { dosDecimales } from "@/lib/dinero";

// Estados en los que tiene sentido preguntarle al SRI cómo está el comprobante
const CONSULTABLES = ["FIRMADO", "RECIBIDA", "EN_REVISION", "DEVUELTA", "RECHAZADO"];
// Estados en los que se puede pedir un reenvío (el backend consulta antes de reenviar)
const REINTENTABLES = ["FIRMADO", "EN_REVISION", "DEVUELTA", "RECHAZADO"];
// Estados que cambian solos en unos segundos: vale la pena "Actualizar"
const EN_CAMINO = ["POR_FIRMAR", "RECIBIDA", "FIRMADO"];

const URL_VALIDEZ_SRI = "https://srienlinea.sri.gob.ec/comprobantes-electronicos-internet/publico/validezComprobantes.jsf";

const DESCRIPCION: Record<string, string> = {
  DEVUELTA:    "El SRI devolvió el comprobante — revisa los errores abajo",
  RECHAZADO:   "El SRI rechazó el comprobante — revisa los errores abajo",
  POR_FIRMAR:  "Recibido: se está firmando y en unos segundos se envía al SRI",
  ERROR_FIRMA: "No pudimos firmarlo. Revisa que tu firma electrónica esté vigente y su contraseña sea correcta en Configuración: lo reintentamos solos.",
  FIRMADO:     "En cola de envío al SRI",
  RECIBIDA:    "Recibido por el SRI, pendiente de autorización",
  EN_REVISION: "No pudimos confirmar el estado con el SRI. Lo seguimos verificando automáticamente: no es un rechazo.",
};

/** Con quién es el comprobante: comprador, proveedor (LIQ) o sujeto retenido (RET). */
function contraparte(f: FacturaBase): string {
  const d = f.datos ?? {};
  return d.infoFactura?.razonSocialComprador
    || d.infoLiquidacionCompra?.razonSocialProveedor
    || d.infoNotaCredito?.razonSocialComprador
    || d.infoNotaDebito?.razonSocialComprador
    || d.infoCompRetencion?.razonSocialSujetoRetenido
    || d.legacy_razon_comprador
    || f.cliente?.razon_social
    || "";
}

function fechaEmision(f: FacturaBase): string {
  const d = f.datos ?? {};
  return d.infoFactura?.fechaEmision || d.infoLiquidacionCompra?.fechaEmision || d.infoNotaCredito?.fechaEmision
    || d.infoNotaDebito?.fechaEmision || d.infoCompRetencion?.fechaEmision || f.fecha_emision;
}

type Menu = "pdf" | "compartir" | "mas" | null;

/**
 * Tarjeta de arriba del comprobante: tipo, número, con quién, el monto en grande
 * y el estado en el SRI. Debajo, lo que más se hace (Compartir, PDF, o Consultar
 * y Reintentar si está en proceso) y el resto en el menú ⋮.
 */
export default function EstadoDocumento({ factura, onRecargar, consumidorFinal, enPanel = false }: {
  factura: FacturaBase; onRecargar: () => void; consumidorFinal: boolean; enPanel?: boolean;
}) {
  const router = useRouter();
  const avisos = useAvisos();
  const [accion,     setAccion]     = useState<"consultar" | "reintentar" | null>(null);
  const [verDetalle, setVerDetalle] = useState(false);
  const [menu,       setMenu]       = useState<Menu>(null);

  const archivo      = useAccionesArchivo(factura);
  const relacionadas = useAccionesRelacionadas(factura, consumidorFinal);

  const ejecutar = async (tipo: "consultar" | "reintentar") => {
    setAccion(tipo);
    try {
      const ruta = tipo === "consultar" ? "sincronizar" : "reintentar";
      const res  = await api.post(`/api/v1/app/documentos/${factura.id}/${ruta}`);
      avisos.exito(res.data?.mensaje || "Listo.");
      onRecargar();
    } catch (e: any) {
      avisos.error(detalleError(e, "No pudimos completar la acción. Intenta de nuevo."));
    } finally {
      setAccion(null);
    }
  };

  const copiarClave = async () => {
    if (!factura.clave_acceso) return;
    try { await navigator.clipboard.writeText(factura.clave_acceso); avisos.exito("Clave de acceso copiada"); }
    catch { avisos.info(factura.clave_acceso); }
  };

  const descripcion =
    factura.estado_sri === "AUTORIZADO"
      ? [
          factura.fecha_autorizacion ? `Autorizado el ${formatearFechaHora(factura.fecha_autorizacion)}` : "Autorizado por el SRI",
          factura.anulacion?.estado === "PENDIENTE" ? "Anulación en espera del receptor" : null,
        ].filter(Boolean).join(" · ")
      : factura.estado_sri === "ANULADO"
      ? [
          factura.fecha_anulacion ? `Anulado el ${formatearFechaHora(factura.fecha_anulacion)}` : "Anulado",
          factura.motivo_anulacion ? (MOTIVO_LABEL[factura.motivo_anulacion] ?? factura.motivo_anulacion) : null,
        ].filter(Boolean).join(" · ")
      : DESCRIPCION[factura.estado_sri] ?? DESCRIPCION.RECIBIDA;

  const consultable = CONSULTABLES.includes(factura.estado_sri);
  const reintentable = REINTENTABLES.includes(factura.estado_sri);

  // ⋮: lo que no está a la vista. Consultar/Reintentar ya son botones si aplican.
  const mas: Accion[] = [
    ...(archivo.xml ? [archivo.xml] : []),
    ...relacionadas,
    ...(EN_CAMINO.includes(factura.estado_sri)
      ? [{ etiqueta: "Actualizar", descripcion: "Ver si ya cambió el estado", icono: RefreshCw, onClick: onRecargar }] : []),
    ...(factura.clave_acceso
      ? [{ etiqueta: "Copiar clave de acceso", icono: Copy, onClick: () => void copiarClave() }] : []),
    ...(["AUTORIZADO", "ANULADO"].includes(factura.estado_sri)
      ? [{ etiqueta: "Verificar en el portal del SRI", icono: ExternalLink, onClick: () => void abrirExterno(URL_VALIDEZ_SRI) }] : []),
  ];

  const hoja = {
    pdf: {
      titulo: archivo.esProvisional ? "PDF provisional" : "PDF",
      descripcion: archivo.esProvisional
        ? "Pendiente de autorización del SRI. El PDF definitivo estará disponible una vez autorizado."
        : "Elige el formato de impresión",
      acciones: archivo.pdf,
    },
    compartir: { titulo: "Compartir con tu cliente", descripcion: "Un enlace donde ve y descarga el comprobante", acciones: archivo.compartir },
    mas:       { titulo: `${TIPO_LABEL[factura.tipo_doc] ?? "Comprobante"} ${factura.numero_doc}`, descripcion: undefined, acciones: mas },
  } as const;

  const nombre = contraparte(factura);

  return (
    <section className="rounded-2xl border border-borde bg-superficie p-4 sm:p-5">
      {/* Tipo, número y con quién; el estado arriba a la derecha */}
      <div className="flex items-start gap-2">
        {/* En el celular la flecha atrás ya está en la barra superior; en el panel, la X del panel */}
        {!enPanel && (
          <BotonIcono etiqueta="Volver" icono={<ArrowLeft size={18} />} onClick={() => router.back()}
                      className="-ml-2 -mt-1 hidden lg:inline-flex" />
        )}
        <div className="min-w-0 flex-1">
          <p className="text-xs text-sutil">
            {TIPO_LABEL[factura.tipo_doc] ?? factura.tipo_doc} · {fechaEmision(factura)}
          </p>
          <h1 className="font-mono text-base font-semibold text-texto sm:text-lg">{factura.numero_doc}</h1>
          {nombre && <p className="truncate text-sm text-tenue">{nombre}</p>}
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <InsigniaSri estado={factura.estado_sri} />
          {factura.es_sandbox && <InsigniaEstado tono="sandbox">Prueba</InsigniaEstado>}
        </div>
      </div>

      {/* El monto, en grande */}
      <p className="mt-4 text-3xl font-bold tabular-nums text-texto">${dosDecimales(factura.importe_total)}</p>
      <p className="mt-1 text-xs leading-relaxed text-tenue">{descripcion}</p>
      {factura.es_sandbox && (
        <p className="mt-1 text-xs leading-relaxed text-sutil">
          Los comprobantes de prueba no se envían por correo. Descarga el PDF para ver cómo quedará.
        </p>
      )}
      {factura.sri_verificado_at && consultable && (
        <p className="mt-0.5 text-[11px] text-sutil">
          Última consulta al SRI: {formatearFechaHora(factura.sri_verificado_at)}
        </p>
      )}

      {/* Lo que más se hace; el resto en ⋮ */}
      <div className="mt-4 flex flex-wrap items-center gap-2">
        {archivo.puedeCompartir && (
          <Boton onClick={() => setMenu("compartir")} cargando={archivo.preparando === "compartir"}
                 icono={<Share2 size={16} />} className="flex-1 sm:flex-none">
            Compartir
          </Boton>
        )}
        {archivo.puedePdf && (
          <Boton variante="secundario" onClick={() => setMenu("pdf")} cargando={archivo.preparando === "pdf"}
                 icono={archivo.esProvisional ? <Clock size={16} /> : <FileText size={16} />} className="flex-1 sm:flex-none">
            {archivo.esProvisional ? "PDF provisional" : "PDF"}
          </Boton>
        )}
        {consultable && (
          <Boton variante="secundario" onClick={() => ejecutar("consultar")} cargando={accion === "consultar"}
                 disabled={accion !== null} icono={<ShieldCheck size={16} />}
                 title="Preguntarle al SRI el estado real de este comprobante" className="flex-1 sm:flex-none">
            Consultar en el SRI
          </Boton>
        )}
        {reintentable && (
          <Boton onClick={() => ejecutar("reintentar")} cargando={accion === "reintentar"}
                 disabled={accion !== null} icono={<RotateCcw size={16} />}
                 title="Primero se consulta al SRI; solo se reenvía si el SRI no lo tiene" className="flex-1 sm:flex-none">
            Reintentar
          </Boton>
        )}
        {mas.length > 0 && (
          <BotonIcono etiqueta="Más acciones" icono={<MoreVertical size={20} />} variante="secundario"
                      onClick={() => setMenu("mas")} disabled={archivo.preparando === "xml"} />
        )}
      </div>

      {/* Detalle técnico (para soporte) */}
      {factura.ultimo_error_tecnico && consultable && (
        <div className="mt-3">
          <button
            type="button"
            onClick={() => setVerDetalle(v => !v)}
            aria-expanded={verDetalle}
            className="flex items-center gap-1 text-[11px] text-sutil"
          >
            {verDetalle ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            Detalle técnico
          </button>
          {verDetalle && (
            <pre className="mt-1 whitespace-pre-wrap break-words rounded-lg bg-presionado px-3 py-2 text-[11px] text-tenue">
              {factura.ultimo_error_tecnico}
            </pre>
          )}
        </div>
      )}

      <HojaAcciones
        abierta={menu !== null}
        onCerrar={() => setMenu(null)}
        titulo={menu ? hoja[menu].titulo : ""}
        descripcion={menu ? hoja[menu].descripcion : undefined}
        acciones={menu ? [...hoja[menu].acciones] : []}
      />
    </section>
  );
}
