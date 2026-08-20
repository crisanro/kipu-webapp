// app/(dashboard)/documentos/recibidos/nueva/page.tsx
"use client";
import { useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import { useAuthStore } from "@/store/auth.store";
import {
  Upload, Loader2, CheckCircle2, AlertTriangle,
  X, ChevronDown, ChevronUp, FileText, Link2
} from "lucide-react";
import { clsx } from "clsx";

// ── Tipos ─────────────────────────────────────────────────────────────────────
interface ItemDetalle {
  descripcion:            string;
  cantidad:               number;
  precio_unitario:        number;
  descuento:              number;
  subtotal:               number;
  tarifa_iva:              number;
  valor_iva:              number;
  total:                  number;
  deducible_renta:        boolean;
  credito_tributario_iva: boolean;
}

interface ImpuestoDetalle {
  tarifa:        number;
  baseImponible: number;
  valor:         number;
  aplicaCredito: boolean;
}

interface DocParseado {
  tipo_doc:               string;
  cod_doc:                string;
  clave_acceso:           string;
  numero_doc:             string;
  fecha_emision:          string;
  fecha_autorizacion:     string | null;
  ruc_proveedor:          string;
  razon_social_proveedor: string;
  importe_total:          number;
  items_detalle:          ItemDetalle[];
  impuestos_detalle:      ImpuestoDetalle[];
  deducible_renta:        boolean;
  credito_tributario_iva: boolean;
  datos:                  any;
  errores:                string[];
}

interface DocVinculo {
  id:            string;
  numero_doc:    string;
  tipo_doc:      string;
  importe_total: number;
  razon_social:  string;
}

const fmt = (n: any) => parseFloat(String(n ?? 0)).toFixed(2);

const TIPO_LABEL: Record<string, string> = {
  FAC: "Factura",
  LIQ: "Liquidación de Compra",
  NCR: "Nota de Crédito",
  NDB: "Nota de Débito",
  RET: "Retención",
};

const TIPO_COLOR: Record<string, string> = {
  FAC: "bg-gray-400/10 text-gray-400",
  LIQ: "bg-cyan-400/10 text-cyan-400",
  NCR: "bg-purple-400/10 text-purple-400",
  NDB: "bg-amber-400/10 text-amber-400",
  RET: "bg-blue-400/10 text-blue-400",
};

// ── Parser XML en frontend ────────────────────────────────────────────────────
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

  // Detectar tipo
  const TIPOS: Record<string, [string, string]> = {
    factura:              ["FAC", "01"],
    liquidacionCompra:    ["LIQ", "03"],
    notaCredito:          ["NCR", "04"],
    notaDebito:           ["NDB", "05"],
    comprobanteRetencion: ["RET", "07"],
  };

  let tipo_doc = "FAC", cod_doc = "01";
  for (const [tag, [tipo, cod]] of Object.entries(TIPOS)) {
    if (facturaDoc.querySelector(tag)) {
      tipo_doc = tipo; cod_doc = cod; break;
    }
  }

  const estab      = get("estab");
  const ptoEmi     = get("ptoEmi");
  const secuencial = get("secuencial");
  const numero_doc = `${estab}-${ptoEmi}-${secuencial}`;
  const clave_acceso           = get("claveAcceso");
  const ruc_proveedor          = get("ruc");
  const razon_social_proveedor = get("razonSocial");

  // Fecha
  const fecha_raw = get("fechaEmision");
  const [d, m, y] = fecha_raw.split("/");
  const fecha_emision = y ? `${y}-${m}-${d}` : fecha_raw;

  // Importe
  const importe_total = parseFloat(
    get("importeTotal") || get("valorTotal") || "0"
  );

  // Ítems
  const items_detalle: ItemDetalle[] = [];
  facturaDoc.querySelectorAll("detalle").forEach((det) => {
    const descripcion   = det.querySelector("descripcion")?.textContent?.trim() ?? "";
    const cantidad      = parseFloat(det.querySelector("cantidad")?.textContent ?? "1");
    const precio_unit   = parseFloat(det.querySelector("precioUnitario")?.textContent ?? "0");
    const descuento     = parseFloat(det.querySelector("descuento")?.textContent ?? "0");
    const subtotal      = parseFloat(det.querySelector("precioTotalSinImpuesto")?.textContent ?? "0");

    let tarifa_iva = 0, valor_iva = 0;
    det.querySelectorAll("impuesto").forEach((imp) => {
      if (imp.querySelector("codigo")?.textContent === "2") {
        tarifa_iva = parseFloat(imp.querySelector("tarifa")?.textContent ?? "0");
        valor_iva  = parseFloat(imp.querySelector("valor")?.textContent ?? "0");
      }
    });

    items_detalle.push({
      descripcion,
      cantidad,
      precio_unitario:        precio_unit,
      descuento,
      subtotal,
      tarifa_iva,
      valor_iva,
      total:                  subtotal + valor_iva,
      deducible_renta:        true,
      credito_tributario_iva: tarifa_iva > 0,
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

  // Impuestos RET — solo procesar si es un Comprobante de Retención
  if (tipo_doc === "RET") {
    facturaDoc.querySelectorAll("impuesto").forEach((imp) => {
      const codigo = imp.querySelector("codigo")?.textContent?.trim();
      if (codigo && ["1","2","6"].includes(codigo)) {
        const base  = parseFloat(imp.querySelector("baseImponible")?.textContent ?? "0");
        const valor = parseFloat(imp.querySelector("valorRetenido")?.textContent ?? imp.querySelector("valor")?.textContent ?? "0");
        const pct   = parseFloat(imp.querySelector("porcentajeRetener")?.textContent ?? "0");
        items_detalle.push({
          descripcion:            `Retención ${codigo === "1" ? "Renta" : codigo === "2" ? "IVA" : "ISD"} ${pct}%`,
          cantidad:               1,
          precio_unitario:        base,
          descuento:              0,
          subtotal:               base,
          tarifa_iva:              0,
          valor_iva:              0,
          total:                  valor,
          deducible_renta:        false,
          credito_tributario_iva: codigo === "2",
        });
      }
    });
  }

  // Impuestos totales
  const impuestos_detalle: ImpuestoDetalle[] = [];
  facturaDoc.querySelectorAll("totalImpuesto").forEach((imp) => {
    if (imp.querySelector("codigo")?.textContent === "2") {
      const tarifa = parseFloat(imp.querySelector("tarifa")?.textContent ?? "0");
      const base   = parseFloat(imp.querySelector("baseImponible")?.textContent ?? "0");
      const valor  = parseFloat(imp.querySelector("valor")?.textContent ?? "0");
      impuestos_detalle.push({
        tarifa, baseImponible: base, valor,
        aplicaCredito: tarifa > 0,
      });
    }
  });

  const credito_tributario_iva = items_detalle.some(i => i.credito_tributario_iva);

  return {
    tipo_doc, cod_doc, clave_acceso, numero_doc,
    fecha_emision, fecha_autorizacion,
    ruc_proveedor, razon_social_proveedor,
    importe_total, items_detalle, impuestos_detalle,
    deducible_renta: tipo_doc !== "RET",
    credito_tributario_iva,
    datos: {},
    errores: [],
  };
}

// ── Página principal ──────────────────────────────────────────────────────────
export default function NuevaRecibidaPage() {
  const router  = useRouter();
  const empresa = useAuthStore((s) => s.empresa);

  const [step,     setStep]     = useState<"upload" | "review" | "done">("upload");
  const [parsed,   setParsed]   = useState<DocParseado | null>(null);
  const [xmlFile,  setXmlFile]  = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [error,    setError]    = useState("");
  const [saving,   setSaving]   = useState(false);

  // Clasificación editable
  const [items,    setItems]    = useState<ItemDetalle[]>([]);
  const [notas,    setNotas]    = useState("");

  // Vínculo con otro documento
  const [vinculoQuery,   setVinculoQuery]   = useState("");
  const [vinculoResults, setVinculoResults] = useState<DocVinculo[]>([]);
  const [vinculoSelected, setVinculoSelected] = useState<DocVinculo | null>(null);
  const [vinculoLoading, setVinculoLoading] = useState(false);
  const [showVinculo, setShowVinculo] = useState(false);
  const [showItems,   setShowItems]   = useState(false);

  const fileRef = useRef<HTMLInputElement>(null);

  // Determinar si el tipo necesita vínculo
  const necesitaVinculo = (tipo: string) =>
    ["NCR", "NDB", "RET"].includes(tipo);

  const vinculoTabla = (tipo: string) =>
    tipo === "RET" ? "emitidos" : "recibidos";

  const vinculoLabel = (tipo: string) => {
    if (tipo === "RET") return "FAC/LIQ que nosotros emitimos";
    if (tipo === "NCR") return "FAC/LIQ recibida que modifica";
    if (tipo === "NDB") return "FAC/LIQ recibida que modifica";
    return "";
  };

  // Buscar vínculo
  const buscarVinculo = useCallback(async (q: string, tipo: string) => {
    if (!q || q.length < 3) { setVinculoResults([]); return; }
    setVinculoLoading(true);
    try {
      const tabla = vinculoTabla(tipo);
      const endpoint = tabla === "emitidos"
        ? `/api/v1/app/documentos?estado_sri=AUTORIZADO&q=${encodeURIComponent(q)}&limit=6`
        : `/api/v1/app/recibidos?q=${encodeURIComponent(q)}&limit=6`;
      const res  = await api.get(endpoint);
      const rows = res.data.data ?? [];
      setVinculoResults(rows.map((d: any) => ({
        id:            d.id,
        numero_doc:    d.numero_doc,
        tipo_doc:      d.tipo_doc || "FAC",
        importe_total: d.importe_total,
        razon_social:  d.razon_social || d.razon_social_proveedor || "",
      })));
    } catch { setVinculoResults([]); }
    finally { setVinculoLoading(false); }
  }, []);

  // Procesar XML
  const procesarArchivo = useCallback((file: File) => {
    setError("");
    if (!file.name.toLowerCase().endsWith(".xml")) {
      setError("Solo se aceptan archivos .xml"); return;
    }
    setXmlFile(file);
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const xmlText = e.target?.result as string;
        const result  = parsearXMLFrontend(xmlText);
        if (empresa?.ruc) {
          const rucComprador = xmlText.match(/<identificacionComprador>(\d+)<\/identificacionComprador>/)?.[1] || "";
          const rucSujetoRet = xmlText.match(/<identificacionSujetoRetenido>(\d+)<\/identificacionSujetoRetenido>/)?.[1] || "";
          const rucTarget    = rucComprador || rucSujetoRet;
          if (rucTarget && rucTarget !== empresa.ruc) {
            setError(`Este documento no está dirigido a tu RUC (${empresa.ruc}).`);
            return;
          }
        }
        setParsed(result);
        setItems(result.items_detalle);
        setShowVinculo(necesitaVinculo(result.tipo_doc));
        setStep("review");
      } catch {
        setError("No se pudo leer el XML. Verifica que sea válido.");
      }
    };
    reader.readAsText(file, "UTF-8");
  }, [empresa]);

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) procesarArchivo(file);
  };

  // Editar clasificación de ítem
  const editItem = (idx: number, field: "deducible_renta" | "credito_tributario_iva", val: boolean) => {
    setItems(prev => prev.map((item, i) => i === idx ? { ...item, [field]: val } : item));
  };

  // Guardar
  const guardar = async () => {
    if (!parsed || !xmlFile) return;
    setSaving(true); setError("");
    try {
      const formData = new FormData();
      formData.append("file", xmlFile);

      // Subir XML al backend
      const resXml = await api.post("/api/v1/app/recibidos/xml", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      const docId = resXml.data.id;

      // Actualizar con clasificación fiscal y vínculo
      const payload: any = {
        items_detalle:          items,
        deducible_renta:        items.some(i => i.deducible_renta),
        credito_tributario_iva: items.some(i => i.credito_tributario_iva),
        notas:                  notas || null,
      };

      if (vinculoSelected) {
        if (parsed.tipo_doc === "RET") {
          payload.doc_origen_emitido_id  = vinculoSelected.id;
        } else {
          payload.doc_origen_recibido_id = vinculoSelected.id;
        }
      }

      await api.patch(`/api/v1/app/recibidos/${docId}`, payload);
      setStep("done");
    } catch (err: any) {
      const detail = err?.response?.data?.detail;
      setError(typeof detail === "string" ? detail : "Error al guardar.");
    } finally { setSaving(false); }
  };

  // ── Done ──────────────────────────────────────────────────────────────────
  if (step === "done") {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-gray-950">
        <div className="w-full max-w-sm text-center">
          <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 size={32} className="text-emerald-400" />
          </div>
          <h2 className="text-xl font-bold text-white mb-1">
            {TIPO_LABEL[parsed?.tipo_doc ?? "FAC"]} registrada
          </h2>
          <p className="text-sm text-gray-500 mb-6">{parsed?.numero_doc}</p>
          <div className="flex gap-3">
            <button onClick={() => { setStep("upload"); setParsed(null); setXmlFile(null); setItems([]); setVinculoSelected(null); setError(""); }}
              className="flex-1 py-2.5 rounded-lg border border-gray-700 text-gray-400 hover:text-white text-sm transition-colors">
              Registrar otro
            </button>
            <button onClick={() => router.push("/documentos/recibidos")}
              className="flex-1 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium transition-colors">
              Ver historial
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Review ────────────────────────────────────────────────────────────────
  if (step === "review" && parsed) {
    const totalDeducible = items.filter(i => i.deducible_renta).reduce((s, i) => s + i.subtotal, 0);
    const totalCredito   = items.filter(i => i.credito_tributario_iva).reduce((s, i) => s + i.valor_iva, 0);

    return (
      <div className="p-4 md:p-6 max-w-2xl mx-auto space-y-4">
        {/* Header */}
        <div className="flex items-center gap-3">
          <button onClick={() => { setStep("upload"); setParsed(null); setError(""); }}
            className="p-2 rounded-lg border border-gray-700 text-gray-400 hover:text-white transition-colors">
            <X size={16} />
          </button>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className={clsx("text-xs px-2 py-0.5 rounded-full font-bold", TIPO_COLOR[parsed.tipo_doc])}>
                {parsed.tipo_doc}
              </span>
              <h1 className="text-lg font-bold text-white">{parsed.numero_doc}</h1>
            </div>
            <p className="text-sm text-gray-500">{parsed.razon_social_proveedor}</p>
          </div>
          <div className="text-right">
            <p className="text-lg font-bold text-white">${fmt(parsed.importe_total)}</p>
            <p className="text-xs text-gray-500">{parsed.fecha_emision}</p>
          </div>
        </div>

        {/* Info del proveedor */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Proveedor</h2>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-xs text-gray-500">Razón social</p>
              <p className="text-white">{parsed.razon_social_proveedor}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">RUC</p>
              <p className="text-white font-mono">{parsed.ruc_proveedor}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Número</p>
              <p className="text-white font-mono">{parsed.numero_doc}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Fecha emisión</p>
              <p className="text-white">{parsed.fecha_emision}</p>
            </div>
          </div>
        </div>

        {/* Vínculo — NCR, NDB, RET */}
        {necesitaVinculo(parsed.tipo_doc) && (
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <Link2 size={14} className="text-indigo-400" />
              <h2 className="text-sm font-semibold text-white">
                Vincular a {vinculoLabel(parsed.tipo_doc)}
              </h2>
              <span className="text-xs text-gray-600">(opcional)</span>
            </div>

            {vinculoSelected ? (
              <div className="flex items-center gap-3 bg-gray-800 rounded-lg px-3 py-2.5">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={clsx("text-[10px] px-1.5 py-0.5 rounded font-bold", TIPO_COLOR[vinculoSelected.tipo_doc])}>
                      {vinculoSelected.tipo_doc}
                    </span>
                    <p className="text-sm text-white font-mono">{vinculoSelected.numero_doc}</p>
                  </div>
                  <p className="text-xs text-gray-500">{vinculoSelected.razon_social} · ${fmt(vinculoSelected.importe_total)}</p>
                </div>
                <button onClick={() => setVinculoSelected(null)}
                  className="text-gray-500 hover:text-white p-1 transition-colors">
                  <X size={14} />
                </button>
              </div>
            ) : (
              <div className="relative">
                <input
                  value={vinculoQuery}
                  onChange={e => { setVinculoQuery(e.target.value); buscarVinculo(e.target.value, parsed.tipo_doc); }}
                  placeholder="Buscar por número o proveedor..."
                  className="w-full px-3 py-2.5 rounded-lg bg-gray-800 border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 text-sm"
                />
                {vinculoLoading && <Loader2 size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 animate-spin" />}
                {vinculoResults.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-gray-800 border border-gray-700 rounded-lg shadow-xl overflow-hidden max-h-48 overflow-y-auto">
                    {vinculoResults.map(d => (
                      <button key={d.id}
                        onClick={() => { setVinculoSelected(d); setVinculoQuery(""); setVinculoResults([]); }}
                        className="w-full flex items-center justify-between gap-3 px-4 py-2.5 hover:bg-gray-700 text-left border-b border-gray-700/50 last:border-0">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className={clsx("text-[10px] px-1.5 py-0.5 rounded font-bold shrink-0", TIPO_COLOR[d.tipo_doc])}>
                            {d.tipo_doc}
                          </span>
                          <div className="min-w-0">
                            <p className="text-sm text-white font-mono">{d.numero_doc}</p>
                            <p className="text-xs text-gray-500 truncate">{d.razon_social}</p>
                          </div>
                        </div>
                        <span className="text-sm font-bold text-indigo-400 shrink-0">${fmt(d.importe_total)}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Ítems con clasificación fiscal */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          <button
            onClick={() => setShowItems(!showItems)}
            className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-800/50 transition-colors"
          >
            <div className="flex items-center gap-2">
              <FileText size={14} className="text-gray-400" />
              <span className="text-sm font-semibold text-white">
                {items.length} ítem{items.length !== 1 ? "s" : ""}
              </span>
              <span className="text-xs text-gray-500">— Clasificación fiscal por línea</span>
            </div>
            {showItems ? <ChevronUp size={16} className="text-gray-500" /> : <ChevronDown size={16} className="text-gray-500" />}
          </button>

          {showItems && (
            <div className="border-t border-gray-800 divide-y divide-gray-800">
              {/* Header tabla */}
              <div className="grid grid-cols-12 gap-2 px-4 py-2 text-[10px] uppercase font-semibold tracking-wider text-gray-600">
                <div className="col-span-4">Descripción</div>
                <div className="col-span-2 text-right">Subtotal</div>
                <div className="col-span-2 text-right">IVA</div>
                <div className="col-span-2 text-center">Deducible</div>
                <div className="col-span-2 text-center">Crédito IVA</div>
              </div>
              {items.map((item, idx) => (
                <div key={idx} className="grid grid-cols-12 gap-2 px-4 py-2.5 items-center hover:bg-gray-800/30">
                  <div className="col-span-4">
                    <p className="text-xs text-white truncate">{item.descripcion}</p>
                    <p className="text-[10px] text-gray-600">
                      {item.cantidad} × ${fmt(item.precio_unitario)}
                    </p>
                  </div>
                  <div className="col-span-2 text-right text-xs text-gray-400">
                    ${fmt(item.subtotal)}
                  </div>
                  <div className="col-span-2 text-right text-xs text-gray-400">
                    {item.tarifa_iva > 0 ? `${item.tarifa_iva}% $${fmt(item.valor_iva)}` : "—"}
                  </div>
                  {/* Toggle deducible */}
                  <div className="col-span-2 flex justify-center">
                    <button
                      onClick={() => editItem(idx, "deducible_renta", !item.deducible_renta)}
                      className={clsx(
                        "w-8 h-4 rounded-full transition-colors relative",
                        item.deducible_renta ? "bg-emerald-600" : "bg-gray-700"
                      )}
                    >
                      <span className={clsx(
                        "absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all",
                        item.deducible_renta ? "left-4" : "left-0.5"
                      )} />
                    </button>
                  </div>
                  {/* Toggle crédito IVA */}
                  <div className="col-span-2 flex justify-center">
                    {item.tarifa_iva > 0 ? (
                      <button
                        onClick={() => editItem(idx, "credito_tributario_iva", !item.credito_tributario_iva)}
                        className={clsx(
                          "w-8 h-4 rounded-full transition-colors relative",
                          item.credito_tributario_iva ? "bg-indigo-600" : "bg-gray-700"
                        )}
                      >
                        <span className={clsx(
                          "absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all",
                          item.credito_tributario_iva ? "left-4" : "left-0.5"
                        )} />
                      </button>
                    ) : (
                      <span className="text-[10px] text-gray-700">N/A</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Resumen fiscal */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
            Resumen fiscal
          </h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between text-gray-400">
              <span>Total documento</span>
              <span className="text-white font-bold">${fmt(parsed.importe_total)}</span>
            </div>
            {parsed.tipo_doc !== "RET" && (
              <div className="flex justify-between text-gray-400">
                <span>Deducible renta</span>
                <span className="text-emerald-400">${fmt(totalDeducible)}</span>
              </div>
            )}
            <div className="flex justify-between text-gray-400">
              <span>Crédito tributario IVA</span>
              <span className="text-indigo-400">${fmt(totalCredito)}</span>
            </div>
          </div>

          {/* Notas */}
          <div className="mt-3 pt-3 border-t border-gray-800">
            <label className="block text-xs text-gray-500 mb-1.5">Notas (opcional)</label>
            <textarea
              value={notas}
              onChange={e => setNotas(e.target.value)}
              placeholder="Observaciones, referencia interna, etc."
              rows={2}
              className="w-full px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500 text-sm resize-none"
            />
          </div>
        </div>

        {error && (
          <div className="flex items-start gap-2 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2.5">
            <AlertTriangle size={14} className="text-red-400 shrink-0 mt-0.5" />
            <p className="text-sm text-red-400">{error}</p>
          </div>
        )}

        <button
          onClick={guardar}
          disabled={saving || !empresa?.suscripcion_activa}
          className="w-full py-3 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold text-sm transition-colors flex items-center justify-center gap-2"
        >
          {saving
            ? <><Loader2 size={16} className="animate-spin" /> Guardando...</>
            : `Registrar ${TIPO_LABEL[parsed.tipo_doc]} · $${fmt(parsed.importe_total)}`
          }
        </button>
      </div>
    );
  }

  // ── Upload ────────────────────────────────────────────────────────────────
  return (
    <div className="p-4 md:p-6 max-w-lg mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-bold text-white">Registrar documento recibido</h1>
        <p className="text-sm text-gray-500">
          Sube el XML electrónico — factura, nota de crédito, nota de débito o retención
        </p>
      </div>

      {empresa && !empresa.suscripcion_activa && (
        <div className="flex items-start gap-3 bg-amber-500/10 border border-amber-500/20 rounded-lg px-4 py-3">
          <AlertTriangle size={16} className="text-amber-400 shrink-0 mt-0.5" />
          <p className="text-sm text-amber-300">Se requiere suscripción activa para registrar documentos.</p>
        </div>
      )}

      {/* Zona de carga */}
      <div
        onDragOver={e => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => fileRef.current?.click()}
        className={clsx(
          "border-2 border-dashed rounded-xl p-12 flex flex-col items-center justify-center gap-4 cursor-pointer transition-colors",
          dragging
            ? "border-indigo-500 bg-indigo-500/10"
            : "border-gray-700 hover:border-indigo-500/50 hover:bg-indigo-500/5"
        )}
      >
        <div className="w-14 h-14 rounded-xl bg-indigo-600/20 flex items-center justify-center">
          <Upload size={24} className="text-indigo-400" />
        </div>
        <div className="text-center">
          <p className="text-white font-medium">Arrastra el XML aquí</p>
          <p className="text-sm text-gray-500 mt-1">o haz clic para seleccionar</p>
          <p className="text-xs text-gray-600 mt-2">Facturas · Notas de crédito · Notas de débito · Retenciones</p>
        </div>
        <input ref={fileRef} type="file" accept=".xml" onChange={e => { const f = e.target.files?.[0]; if (f) procesarArchivo(f); }} className="hidden" />
      </div>

      {error && (
        <div className="flex items-start gap-3 bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3">
          <AlertTriangle size={16} className="text-red-400 shrink-0 mt-0.5" />
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      {/* Tipos soportados */}
      <div className="grid grid-cols-2 gap-2">
        {[
          { tipo: "FAC", desc: "Facturas de proveedores" },
          { tipo: "LIQ", desc: "Liquidaciones de compra" },
          { tipo: "NCR", desc: "Notas de crédito recibidas" },
          { tipo: "NDB", desc: "Notas de débito recibidas" },
          { tipo: "RET", desc: "Retenciones que te hicieron" },
        ].map(({ tipo, desc }) => (
          <div key={tipo} className="flex items-center gap-2 bg-gray-900 border border-gray-800 rounded-lg px-3 py-2">
            <span className={clsx("text-[10px] px-1.5 py-0.5 rounded font-bold", TIPO_COLOR[tipo])}>
              {tipo}
            </span>
            <span className="text-xs text-gray-500">{desc}</span>
          </div>
        ))}
      </div>

      <div className="flex justify-end">
        <button onClick={() => router.push("/documentos/recibidos")}
          className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors">
          Ver historial →
        </button>
      </div>
    </div>
  );
}