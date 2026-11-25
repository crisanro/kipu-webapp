"use client";
import { useState } from "react";
import { Download, FileText, Link2, MessageCircle, Share2 } from "lucide-react";
import { type FacturaBase, PDF_FORMATOS, urlXml, urlPdf, urlConsulta } from "./utils";
import { useAvisos } from "@/components/ui/Avisos";
import type { Accion } from "@/components/ui/HojaAcciones";
import { esNativo, guardarYCompartir, compartir, abrirExterno } from "@/lib/nativo";

// Estados que pueden generar PDF. Los anulados no: el servidor ya no los entrega (410)
const ESTADOS_CON_PDF = ["AUTORIZADO", "FIRMADO", "RECIBIDA", "EN_REVISION"];
// Estados en proceso (PDF provisional)
const ESTADOS_EN_PROCESO = ["FIRMADO", "RECIBIDA", "EN_REVISION"];
// Estados que pueden descargar XML (solo autorizado tiene XML válido)
const ESTADOS_CON_XML = ["AUTORIZADO"];
// Estados que pueden compartir (solo vigentes)
const ESTADOS_COMPARTIR = ["AUTORIZADO"];

export type Preparando = "pdf" | "xml" | "compartir" | null;

/**
 * Descargas y compartir del comprobante: PDF (A4 / T80 / T58), XML y enlace para
 * el cliente. Devuelve las acciones para los menús de la tarjeta de arriba
 * (EstadoDocumento): PDF en autorizados y en proceso (provisional), XML solo en
 * autorizados y compartir solo en vigentes.
 *
 * Web: el PDF se abre en otra pestaña. App: se guarda y sale la hoja de compartir
 * (abrir, imprimir, guardar en Archivos, WhatsApp…). Ver lib/nativo.ts
 */
export function useAccionesArchivo(factura: FacturaBase) {
  // Archivo que se está bajando (en la app tarda un momento)
  const [preparando, setPreparando] = useState<Preparando>(null);
  const avisos = useAvisos();

  const xml_url      = urlXml(factura.clave_acceso);
  const consulta_url = urlConsulta(factura.clave_acceso);
  const numero       = factura.numero_doc || factura.clave_acceso;
  const textoCliente = `Aquí está tu comprobante electrónico:\n${consulta_url}`;

  const esProvisional  = ESTADOS_EN_PROCESO.includes(factura.estado_sri);
  const puedePdf       = ESTADOS_CON_PDF.includes(factura.estado_sri);
  const puedeXml       = ESTADOS_CON_XML.includes(factura.estado_sri);
  const puedeCompartir = ESTADOS_COMPARTIR.includes(factura.estado_sri);

  const conArchivo = async (tipo: Exclude<Preparando, null>, accion: () => Promise<void>) => {
    setPreparando(tipo);
    try {
      await accion();
    } catch {
      avisos.error("No se pudo preparar el archivo. Revisa tu conexión e intenta de nuevo.");
    } finally {
      setPreparando(null);
    }
  };

  const abrirPDF = (formato: string) => conArchivo("pdf", () =>
    guardarYCompartir({ url: urlPdf(factura.clave_acceso, formato) }, `${numero}-${formato}.pdf`,
                      { titulo: `Comprobante ${numero}`, abrirEnWeb: true }));

  const copiarEnlace = async () => {
    try { await navigator.clipboard.writeText(consulta_url); avisos.exito("Enlace copiado"); }
    catch { avisos.info(consulta_url); }
  };

  const pdf: Accion[] = puedePdf
    ? PDF_FORMATOS.map(f => ({
        etiqueta:    `PDF ${f.label}`,
        descripcion: f.desc,
        icono:       FileText,
        onClick:     () => void abrirPDF(f.key),
      }))
    : [];

  const xml: Accion | null = puedeXml ? {
    etiqueta: "Descargar XML", descripcion: "El archivo que vale ante el SRI", icono: Download,
    onClick: () => void conArchivo("xml", () =>
      guardarYCompartir({ url: xml_url }, `${factura.clave_acceso}.xml`, { titulo: `XML ${numero}` })),
  } : null;

  const compartirAcciones: Accion[] = !puedeCompartir ? [] : [
    // App: el PDF por la hoja del sistema (WhatsApp, correo, Drive…), con el enlace incluido
    ...(esNativo() ? [{
      etiqueta: "Compartir PDF", descripcion: "WhatsApp, correo, Drive… con el enlace incluido", icono: FileText,
      onClick: () => void conArchivo("compartir", () =>
        guardarYCompartir({ url: urlPdf(factura.clave_acceso, "a4") }, `${numero}.pdf`,
                          { titulo: `Comprobante ${numero}`, texto: textoCliente })),
    }] : [{
      etiqueta: "Compartir enlace", descripcion: "Para que tu cliente vea y descargue el comprobante", icono: Share2,
      onClick: () => void compartir({ titulo: `Comprobante ${numero}`, texto: textoCliente, url: consulta_url })
        .then(ok => { if (!ok) void copiarEnlace(); }),
    }]),
    { etiqueta: "Enviar por WhatsApp", descripcion: "Abre WhatsApp con el enlace listo", icono: MessageCircle,
      onClick: () => void abrirExterno(`https://wa.me/?text=${encodeURIComponent(textoCliente)}`) },
    { etiqueta: "Copiar enlace", descripcion: "Para enviar por cualquier medio", icono: Link2,
      onClick: () => void copiarEnlace() },
  ];

  return { preparando, esProvisional, puedePdf, puedeCompartir, pdf, xml, compartir: compartirAcciones };
}
