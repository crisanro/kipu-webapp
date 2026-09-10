"use client";
import { useRef, useCallback } from "react";
import { Upload } from "lucide-react";
import { DocParseado } from "./ReviewXML";

interface Props {
  empresa:     any;
  onParsed:    (parsed: DocParseado, file: File) => void;
  error:       string;
  setError:    (e: string) => void;
  dragging:    boolean;
  setDragging: (v: boolean) => void;
}

const TIPO_COLOR: Record<string, { color: string; bg: string }> = {
  FAC: { color: "var(--kipu-muted)", bg: "color-mix(in srgb, var(--kipu-muted) 10%, transparent)" },
  NCR: { color: "#c084fc", bg: "color-mix(in srgb, #c084fc 10%, transparent)" },
  NDB: { color: "var(--kipu-warning)", bg: "color-mix(in srgb, var(--kipu-warning) 10%, transparent)" },
  RET: { color: "#60a5fa", bg: "color-mix(in srgb, #60a5fa 10%, transparent)" },
};

const TIPOS: Record<string, [string, string]> = {
  factura:              ["FAC", "01"],
  notaCredito:          ["NCR", "04"],
  notaDebito:           ["NDB", "05"],
  comprobanteRetencion: ["RET", "07"],
};

function parsearXMLFrontend(xmlText: string): DocParseado {
  const parser = new DOMParser();
  const doc    = parser.parseFromString(xmlText, "text/xml");
  const comprobanteNode = doc.querySelector("comprobante");
  let facturaDoc = doc;
  let fecha_autorizacion: string | null = null;

  if (comprobanteNode) {
    fecha_autorizacion = doc.querySelector("fechaAutorizacion")?.textContent?.trim() ?? null;
    const cdataContent = comprobanteNode.textContent || "";
    facturaDoc = parser.parseFromString(cdataContent, "text/xml");
  }

  const get = (tag: string) => facturaDoc.querySelector(tag)?.textContent?.trim() ?? "";

  let tipo_doc = "FAC", cod_doc = "01";
  for (const [tag, [tipo, cod]] of Object.entries(TIPOS)) {
    if (facturaDoc.querySelector(tag)) { tipo_doc = tipo; cod_doc = cod; break; }
  }

  const estab = get("estab"), ptoEmi = get("ptoEmi"), secuencial = get("secuencial");
  const numero_doc             = `${estab}-${ptoEmi}-${secuencial}`;
  const clave_acceso           = get("claveAcceso");
  const ruc_proveedor          = get("ruc");
  const razon_social_proveedor = get("razonSocial");

  const fecha_raw = get("fechaEmision");
  const [d, m, y] = fecha_raw.split("/");
  const fecha_emision = y ? `${y}-${m}-${d}` : fecha_raw;
  const importe_total = parseFloat(get("importeTotal") || get("valorTotal") || "0");

  const items_detalle: any[] = [];

  facturaDoc.querySelectorAll("detalle").forEach((det) => {
    const descripcion = det.querySelector("descripcion")?.textContent?.trim() ?? "";
    const cantidad    = parseFloat(det.querySelector("cantidad")?.textContent ?? "1");
    const precio_unit = parseFloat(det.querySelector("precioUnitario")?.textContent ?? "0");
    const descuento   = parseFloat(det.querySelector("descuento")?.textContent ?? "0");
    const subtotal    = parseFloat(det.querySelector("precioTotalSinImpuesto")?.textContent ?? "0");
    let tarifa_iva = 0, valor_iva = 0;
    det.querySelectorAll("impuesto").forEach((imp) => {
      if (imp.querySelector("codigo")?.textContent === "2") {
        tarifa_iva = parseFloat(imp.querySelector("tarifa")?.textContent ?? "0");
        valor_iva  = parseFloat(imp.querySelector("valor")?.textContent ?? "0");
      }
    });
    items_detalle.push({
      descripcion, cantidad, precio_unitario: precio_unit, descuento, subtotal,
      tarifa_iva, valor_iva, total: subtotal + valor_iva,
      deducible_renta: true, credito_tributario_iva: tarifa_iva > 0,
    });
  });

  // Motivos NDB
  facturaDoc.querySelectorAll("motivo").forEach((m) => {
    const razon = m.querySelector("razon")?.textContent?.trim() ?? "";
    const valor = parseFloat(m.querySelector("valor")?.textContent ?? "0");
    items_detalle.push({
      descripcion: razon, cantidad: 1, precio_unitario: valor,
      descuento: 0, subtotal: valor, tarifa_iva: 0, valor_iva: 0,
      total: valor, deducible_renta: true, credito_tributario_iva: false,
    });
  });

  // Impuestos RET
  if (tipo_doc === "RET") {
    facturaDoc.querySelectorAll("impuesto").forEach((imp) => {
      const codigo = imp.querySelector("codigo")?.textContent?.trim();
      if (codigo && ["1","2","6"].includes(codigo)) {
        const base  = parseFloat(imp.querySelector("baseImponible")?.textContent ?? "0");
        const valor = parseFloat(imp.querySelector("valorRetenido")?.textContent ?? imp.querySelector("valor")?.textContent ?? "0");
        const pct   = parseFloat(imp.querySelector("porcentajeRetener")?.textContent ?? "0");
        items_detalle.push({
          descripcion: `Retención ${codigo === "1" ? "Renta" : codigo === "2" ? "IVA" : "ISD"} ${pct}%`,
          cantidad: 1, precio_unitario: base, descuento: 0, subtotal: base,
          tarifa_iva: 0, valor_iva: 0, total: valor,
          deducible_renta: false, credito_tributario_iva: codigo === "2",
        });
      }
    });
  }

  const impuestos_detalle: any[] = [];
  facturaDoc.querySelectorAll("totalImpuesto").forEach((imp) => {
    if (imp.querySelector("codigo")?.textContent === "2") {
      const tarifa = parseFloat(imp.querySelector("tarifa")?.textContent ?? "0");
      const base   = parseFloat(imp.querySelector("baseImponible")?.textContent ?? "0");
      const valor  = parseFloat(imp.querySelector("valor")?.textContent ?? "0");
      impuestos_detalle.push({ tarifa, baseImponible: base, valor, aplicaCredito: tarifa > 0 });
    }
  });

  return {
    tipo_doc, cod_doc, clave_acceso, numero_doc, fecha_emision, fecha_autorizacion,
    ruc_proveedor, razon_social_proveedor, importe_total, items_detalle, impuestos_detalle,
    deducible_renta: tipo_doc !== "RET",
    credito_tributario_iva: items_detalle.some((i: any) => i.credito_tributario_iva),
    datos: {}, errores: [],
  };
}

export default function TabXML({ empresa, onParsed, error, setError, dragging, setDragging }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);

  const procesarArchivo = useCallback((file: File) => {
    setError("");
    if (!file.name.toLowerCase().endsWith(".xml")) {
      setError("Solo se aceptan archivos .xml"); return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const xmlText = e.target?.result as string;
        const result  = parsearXMLFrontend(xmlText);

        // Validar RUC
        if (empresa?.ruc) {
          const rucComprador = xmlText.match(/<identificacionComprador>(\d+)<\/identificacionComprador>/)?.[1] || "";
          const rucSujetoRet = xmlText.match(/<identificacionSujetoRetenido>(\d+)<\/identificacionSujetoRetenido>/)?.[1] || "";
          const rucTarget    = rucComprador || rucSujetoRet;
          if (rucTarget && rucTarget !== empresa.ruc) {
            setError(`Este documento no está dirigido a tu RUC (${empresa.ruc}).`); return;
          }
        }

        // Rechazar LIQ
        if (result.tipo_doc === "LIQ") {
          setError("Las liquidaciones de compra no se registran como documentos recibidos."); return;
        }

        onParsed(result, file);
      } catch {
        setError("No se pudo leer el XML. Verifica que sea válido.");
      }
    };
    reader.readAsText(file, "UTF-8");
  }, [empresa, onParsed, setError]);

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) procesarArchivo(file);
  };

  return (
    <div className="space-y-4">
      <div
        onDragOver={e => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => fileRef.current?.click()}
        className="border-2 border-dashed rounded-xl p-12 flex flex-col items-center justify-center gap-4 cursor-pointer transition-colors"
        style={{
          borderColor: dragging
            ? "var(--kipu-accent)"
            : "var(--kipu-border)",
          background: dragging
            ? "color-mix(in srgb, var(--kipu-accent) 10%, transparent)"
            : "transparent",
        }}
        onMouseEnter={e => {
          if (!dragging) {
            e.currentTarget.style.borderColor = "color-mix(in srgb, var(--kipu-accent) 50%, transparent)";
            e.currentTarget.style.background = "color-mix(in srgb, var(--kipu-accent) 5%, transparent)";
          }
        }}
        onMouseLeave={e => {
          if (!dragging) {
            e.currentTarget.style.borderColor = "var(--kipu-border)";
            e.currentTarget.style.background = "transparent";
          }
        }}
      >
        <div
          className="w-14 h-14 rounded-xl flex items-center justify-center"
          style={{ background: "color-mix(in srgb, var(--kipu-accent) 20%, transparent)" }}
        >
          <Upload size={24} style={{ color: "var(--kipu-accent)" }} />
        </div>
        <div className="text-center">
          <p className="font-medium" style={{ color: "var(--kipu-text)" }}>Arrastra el XML aquí</p>
          <p className="text-sm mt-1" style={{ color: "var(--kipu-subtle)" }}>o haz clic para seleccionar</p>
          <p className="text-xs mt-2" style={{ color: "var(--kipu-muted)" }}>Facturas · Notas de crédito · Notas de débito · Retenciones</p>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept=".xml"
          onChange={e => { const f = e.target.files?.[0]; if (f) procesarArchivo(f); }}
          className="hidden"
        />
      </div>

      <div className="grid grid-cols-2 gap-2">
        {[
          { tipo: "FAC", desc: "Facturas de proveedores" },
          { tipo: "NCR", desc: "Notas de crédito recibidas" },
          { tipo: "NDB", desc: "Notas de débito recibidas" },
          { tipo: "RET", desc: "Retenciones que te hicieron" },
        ].map(({ tipo, desc }) => {
          const tColor = TIPO_COLOR[tipo] ?? TIPO_COLOR.FAC;
          return (
            <div
              key={tipo}
              className="flex items-center gap-2 rounded-lg px-3 py-2"
              style={{
                background: "var(--kipu-surface)",
                border: "1px solid var(--kipu-border)",
              }}
            >
              <span
                className="text-[10px] px-1.5 py-0.5 rounded font-bold"
                style={{ color: tColor.color, background: tColor.bg }}
              >
                {tipo}
              </span>
              <span className="text-xs" style={{ color: "var(--kipu-subtle)" }}>{desc}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}