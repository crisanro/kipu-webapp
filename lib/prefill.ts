// lib/prefill.ts — datos que llegan ya llenos a la factura nueva
//
// Desde otra pantalla (duplicar un comprobante, facturar una proforma, facturar a
// una persona, un producto de la paleta de comandos):
//   dejarParaFactura({ cliente, items }); router.push("/documentos/emitir/fac");
//
// En la factura (fac/page.tsx), que los lee una sola vez y los borra:
//   const conDatos = useDatosParaFactura((datos) => { …llenar el formulario… });
"use client";

import { useEffect, useRef, useState } from "react";

const CLAVE = "kipu:prefill";

export interface ItemParaFactura {
  codigo?:         string;
  descripcion:     string;
  cantidad:        number;
  precio:          number;
  descuento?:      number;
  tipo_descuento?: "$" | "%";
  tipo_iva?:       string;   // "0", "5", "15", "NA", "EX"
  unidad?:         string;
}

export interface DatosParaFactura {
  cliente?:           { id?: string; razon_social: string; identificacion: string; tipo_id: string } | null;
  esConsumidorFinal?: boolean;
  items?:             ItemParaFactura[];
  camposAdicionales?: { nombre: string; valor: string }[];
  /** La proforma que se está facturando (queda marcada como facturada). */
  proformaId?:        string;
}

export function dejarParaFactura(datos: DatosParaFactura) {
  sessionStorage.setItem(CLAVE, JSON.stringify(datos));
}

/**
 * Llama a `aplicar` con los datos que dejó otra pantalla (si hay) y los borra.
 * Devuelve true si llegaron datos: entonces no se ofrece el borrador viejo.
 */
export function useDatosParaFactura(aplicar: (datos: DatosParaFactura) => void): boolean {
  const [hay] = useState(() => typeof window !== "undefined" && !!sessionStorage.getItem(CLAVE));
  const aplicarRef = useRef(aplicar);

  useEffect(() => {
    const crudo = sessionStorage.getItem(CLAVE);
    if (!crudo) return;
    sessionStorage.removeItem(CLAVE);
    try {
      aplicarRef.current(JSON.parse(crudo));
    } catch (e) {
      console.error("No se pudieron leer los datos para la factura", e);
    }
  }, []);

  return hay;
}
