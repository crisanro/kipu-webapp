// app/(dashboard)/documentos/recibidos/nueva/_components/TabFisico.tsx
"use client";
import { useState, useRef } from "react";
import api from "@/lib/api";
import {
  Camera, X, Loader2, AlertTriangle, Plus, Trash2,
} from "lucide-react";
import { hoyEC } from "@/lib/fecha";
import { clsx } from "clsx";

interface LineaRetencion {
  tipo:           string; // "1"=Renta "2"=IVA "6"=ISD
  base_imponible: string;
  porcentaje:     string;
  valor_retenido: string;
}

interface Props {
  suscripcionActiva: boolean;
  onDone: () => void;
}

const fmt = (n: any) => parseFloat(String(n ?? 0)).toFixed(2);

const TIPO_COLOR: Record<string, string> = {
  FAC: "bg-gray-400/10 text-gray-400",
  NCR: "bg-purple-400/10 text-purple-400",
  NDB: "bg-amber-400/10 text-amber-400",
  RET: "bg-blue-400/10 text-blue-400",
};

// ── Optimizar imagen ──────────────────────────────────────────────────────────
async function optimizarImagen(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const MAX_WIDTH = 1000;
      let { width, height } = img;
      if (width > MAX_WIDTH) {
        height = Math.round((height * MAX_WIDTH) / width);
        width  = MAX_WIDTH;
      }
      const canvas = document.createElement("canvas");
      canvas.width  = width;
      canvas.height = height;
      canvas.getContext("2d")!.drawImage(img, 0, 0, width, height);

      const intentar = (calidad: number) => {
        canvas.toBlob((blob) => {
          if (!blob) { reject(new Error("Error al procesar imagen")); return; }
          if (blob.size > 600 * 1024 && calidad > 0.3) intentar(calidad - 0.2);
          else resolve(blob);
        }, "image/jpeg", calidad);
      };
      intentar(0.7);
    };
    img.onerror = () => reject(new Error("No se pudo cargar la imagen"));
    img.src = url;
  });
}

export default function TabFisico({ suscripcionActiva, onDone }: Props) {
  const [tipoDoc, setTipoDoc] = useState("FAC");

  // Campos comunes
  const [rucProveedor,          setRucProveedor]          = useState("");
  const [razonSocial,           setRazonSocial]           = useState("");
  const [numeroDoc,             setNumeroDoc]             = useState("");
  const [fechaEmision,          setFechaEmision]          = useState(hoyEC());
  const [notas,                 setNotas]                 = useState("");
  const [deducibleRenta,        setDeducibleRenta]        = useState(true);
  const [creditoTributarioIva,  setCreditoTributarioIva]  = useState(false);

  // Campos FAC / NCR / NDB
  const [subtotal0,    setSubtotal0]    = useState("");
  const [subtotalIva,  setSubtotalIva]  = useState("");
  const [tarifaIva,    setTarifaIva]    = useState("15");
  const [valorIva,     setValorIva]     = useState("");
  const [importeTotal, setImporteTotal] = useState("");

  // Campos RET — múltiples líneas
  const [lineasRet, setLineasRet] = useState<LineaRetencion[]>([
    { tipo: "1", base_imponible: "", porcentaje: "", valor_retenido: "" },
  ]);

  // Imagen
  const [imagenFile,    setImagenFile]    = useState<File | null>(null);
  const [imagenPreview, setImagenPreview] = useState<string | null>(null);
  const imagenRef = useRef<HTMLInputElement>(null);

  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState("");

  // ── Helpers ─────────────────────────────────────────────────────────────────
  const recalcularTotal = (sub0: string, subIva: string, iva: string) => {
    const total = (parseFloat(sub0) || 0) + (parseFloat(subIva) || 0) + (parseFloat(iva) || 0);
    setImporteTotal(total.toFixed(2));
  };

  const calcularIVA = (base: string, tarifa: string) => {
    const iva = ((parseFloat(base) || 0) * (parseFloat(tarifa) || 0) / 100).toFixed(2);
    setValorIva(iva);
    recalcularTotal(subtotal0, base, iva);
  };

  const totalRetenido = lineasRet.reduce((s, l) => s + (parseFloat(l.valor_retenido) || 0), 0);

  const addLineaRet = () =>
    setLineasRet(prev => [...prev, { tipo: "1", base_imponible: "", porcentaje: "", valor_retenido: "" }]);

  const removeLineaRet = (idx: number) =>
    setLineasRet(prev => prev.filter((_, i) => i !== idx));

  const updateLineaRet = (idx: number, field: keyof LineaRetencion, val: string) => {
    setLineasRet(prev => prev.map((l, i) => {
      if (i !== idx) return l;
      const updated = { ...l, [field]: val };
      // Calcular valor retenido automáticamente
      if (field === "base_imponible" || field === "porcentaje") {
        const base = parseFloat(field === "base_imponible" ? val : l.base_imponible) || 0;
        const pct  = parseFloat(field === "porcentaje"     ? val : l.porcentaje)     || 0;
        updated.valor_retenido = ((base * pct) / 100).toFixed(2);
      }
      return updated;
    }));
  };

  const seleccionarImagen = async (file: File) => {
    setError("");
    const validas = [".jpg", ".jpeg", ".png", ".webp"];
    if (!validas.some(e => file.name.toLowerCase().endsWith(e))) {
      setError("Solo se aceptan imágenes JPG, PNG o WEBP."); return;
    }
    try {
      const optimizada = await optimizarImagen(file);
      const optimFile  = new File([optimizada], "documento.jpg", { type: "image/jpeg" });
      setImagenFile(optimFile);
      setImagenPreview(URL.createObjectURL(optimizada));
    } catch { setError("No se pudo procesar la imagen."); }
  };

  const resetForm = () => {
    setTipoDoc("FAC"); setRucProveedor(""); setRazonSocial("");
    setNumeroDoc(""); setFechaEmision(hoyEC());
    setNotas(""); setDeducibleRenta(true); setCreditoTributarioIva(false);
    setSubtotal0(""); setSubtotalIva(""); setTarifaIva("15");
    setValorIva(""); setImporteTotal("");
    setLineasRet([{ tipo: "1", base_imponible: "", porcentaje: "", valor_retenido: "" }]);
    setImagenFile(null); setImagenPreview(null); setError("");
  };

  const guardar = async () => {
    setError("");
    if (!rucProveedor.trim())  { setError("El RUC del proveedor es obligatorio."); return; }
    if (!razonSocial.trim())   { setError("La razón social es obligatoria."); return; }
    if (!numeroDoc.trim())     { setError("El número de documento es obligatorio."); return; }

    const esRet = tipoDoc === "RET";
    const total = esRet ? totalRetenido : parseFloat(importeTotal) || 0;
    if (total <= 0) { setError("El total debe ser mayor a 0."); return; }

    if (esRet && lineasRet.some(l => !l.base_imponible || !l.porcentaje)) {
      setError("Completa la base imponible y porcentaje de cada retención."); return;
    }

    setSaving(true);
    try {
      const formData = new FormData();
      formData.append("tipo_doc",               tipoDoc);
      formData.append("ruc_proveedor",          rucProveedor.trim());
      formData.append("razon_social_proveedor", razonSocial.trim());
      formData.append("numero_doc",             numeroDoc.trim());
      formData.append("fecha_emision",          fechaEmision);
      formData.append("deducible_renta",        String(esRet ? false : deducibleRenta));
      formData.append("credito_tributario_iva", String(esRet ? lineasRet.some(l => l.tipo === "2") : creditoTributarioIva));
      if (notas) formData.append("notas", notas);

      if (esRet) {
        formData.append("subtotal_0",    "0");
        formData.append("subtotal_iva",  "0");
        formData.append("tarifa_iva",    "0");
        formData.append("valor_iva",     "0");
        formData.append("importe_total", fmt(totalRetenido));
      } else {
        formData.append("subtotal_0",    subtotal0    || "0");
        formData.append("subtotal_iva",  subtotalIva  || "0");
        formData.append("tarifa_iva",    tarifaIva);
        formData.append("valor_iva",     valorIva     || "0");
        formData.append("importe_total", importeTotal);
      }

      if (imagenFile) formData.append("imagen", imagenFile);

      await api.post("/api/v1/app/recibidos/fisico", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      resetForm();
      onDone();
    } catch (err: any) {
      const detail = err?.response?.data?.detail;
      setError(typeof detail === "string" ? detail : "Error al guardar.");
    } finally { setSaving(false); }
  };

  return (
    <div className="space-y-4">

      {/* Tipo */}
      <div>
        <label className="block text-xs font-medium text-gray-400 mb-2">Tipo de documento</label>
        <div className="grid grid-cols-4 gap-1.5">
          {["FAC","NCR","NDB","RET"].map(tipo => (
            <button key={tipo} onClick={() => setTipoDoc(tipo)}
              className={clsx(
                "py-2.5 rounded-lg text-xs font-bold transition-colors border",
                tipoDoc === tipo
                  ? "bg-indigo-600 border-indigo-600 text-white"
                  : "bg-gray-900 border-gray-800 text-gray-400 hover:text-white"
              )}>
              <span className="block">{tipo}</span>
              <span className="block text-[9px] font-normal mt-0.5 opacity-70">
                {tipo === "FAC" ? "Factura" : tipo === "NCR" ? "Nota Crédito" : tipo === "NDB" ? "Nota Débito" : "Retención"}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Proveedor */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 space-y-3">
        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Proveedor</h2>
        <div>
          <label className="block text-xs text-gray-500 mb-1">RUC / Identificación *</label>
          <input value={rucProveedor} onChange={e => setRucProveedor(e.target.value)}
            placeholder="1234567890001"
            className="w-full px-3 py-2.5 rounded-lg bg-gray-800 border border-gray-700 text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500 text-sm font-mono" />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Razón social *</label>
          <input value={razonSocial} onChange={e => setRazonSocial(e.target.value)}
            placeholder="EMPRESA PROVEEDORA S.A."
            className="w-full px-3 py-2.5 rounded-lg bg-gray-800 border border-gray-700 text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500 text-sm" />
        </div>
      </div>

      {/* Documento */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 space-y-3">
        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Documento</h2>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Número *</label>
            <input value={numeroDoc} onChange={e => setNumeroDoc(e.target.value)}
              placeholder="001-001-000000001"
              className="w-full px-3 py-2.5 rounded-lg bg-gray-800 border border-gray-700 text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500 text-sm font-mono" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Fecha emisión *</label>
            <input type="date" value={fechaEmision} onChange={e => setFechaEmision(e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg bg-gray-800 border border-gray-700 text-white focus:outline-none focus:border-indigo-500 text-sm" />
          </div>
        </div>
      </div>

      {/* ── Totales FAC / NCR / NDB ───────────────────────────────────────── */}
      {tipoDoc !== "RET" && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 space-y-3">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Totales</h2>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Subtotal 0%</label>
              <input type="number" step="0.01" min="0" value={subtotal0}
                onChange={e => { setSubtotal0(e.target.value); recalcularTotal(e.target.value, subtotalIva, valorIva); }}
                placeholder="0.00"
                className="w-full px-3 py-2.5 rounded-lg bg-gray-800 border border-gray-700 text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500 text-sm" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Tarifa IVA</label>
              <select value={tarifaIva}
                onChange={e => { setTarifaIva(e.target.value); calcularIVA(subtotalIva, e.target.value); }}
                className="w-full px-3 py-2.5 rounded-lg bg-gray-800 border border-gray-700 text-white focus:outline-none focus:border-indigo-500 text-sm">
                <option value="0">0%</option>
                <option value="15">15%</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Base gravada {tarifaIva}%</label>
              <input type="number" step="0.01" min="0" value={subtotalIva}
                onChange={e => { setSubtotalIva(e.target.value); calcularIVA(e.target.value, tarifaIva); }}
                placeholder="0.00"
                className="w-full px-3 py-2.5 rounded-lg bg-gray-800 border border-gray-700 text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500 text-sm" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Valor IVA</label>
              <input type="number" step="0.01" min="0" value={valorIva}
                onChange={e => { setValorIva(e.target.value); recalcularTotal(subtotal0, subtotalIva, e.target.value); }}
                placeholder="0.00"
                className="w-full px-3 py-2.5 rounded-lg bg-gray-800 border border-gray-700 text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500 text-sm" />
            </div>
          </div>
          <div className="pt-2 border-t border-gray-800">
            <label className="block text-xs text-gray-500 mb-1">Total *</label>
            <input type="number" step="0.01" min="0" value={importeTotal}
              onChange={e => setImporteTotal(e.target.value)}
              placeholder="0.00"
              className="w-full px-3 py-2.5 rounded-lg bg-gray-800 border border-gray-700 text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500 text-sm font-bold" />
          </div>
        </div>
      )}

      {/* ── Líneas de retención ───────────────────────────────────────────── */}
      {tipoDoc === "RET" && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Retenciones</h2>
            <button onClick={addLineaRet}
              className="flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300 transition-colors">
              <Plus size={13} /> Agregar línea
            </button>
          </div>

          {/* Header */}
          <div className="grid grid-cols-12 gap-2 text-[10px] uppercase font-semibold tracking-wider text-gray-600 px-1">
            <div className="col-span-3">Tipo</div>
            <div className="col-span-3">Base</div>
            <div className="col-span-2">%</div>
            <div className="col-span-3">Retenido</div>
            <div className="col-span-1"></div>
          </div>

          {lineasRet.map((linea, idx) => (
            <div key={idx} className="grid grid-cols-12 gap-2 items-center">
              <div className="col-span-3">
                <select value={linea.tipo} onChange={e => updateLineaRet(idx, "tipo", e.target.value)}
                  className="w-full px-2 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white focus:outline-none focus:border-indigo-500 text-xs">
                  <option value="1">Renta</option>
                  <option value="2">IVA</option>
                  <option value="6">ISD</option>
                </select>
              </div>
              <div className="col-span-3">
                <input type="number" step="0.01" min="0" value={linea.base_imponible}
                  onChange={e => updateLineaRet(idx, "base_imponible", e.target.value)}
                  placeholder="0.00"
                  className="w-full px-2 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500 text-xs" />
              </div>
              <div className="col-span-2">
                <input type="number" step="0.01" min="0" value={linea.porcentaje}
                  onChange={e => updateLineaRet(idx, "porcentaje", e.target.value)}
                  placeholder="%"
                  className="w-full px-2 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500 text-xs" />
              </div>
              <div className="col-span-3">
                <input type="number" step="0.01" min="0" value={linea.valor_retenido}
                  onChange={e => updateLineaRet(idx, "valor_retenido", e.target.value)}
                  placeholder="0.00"
                  className="w-full px-2 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500 text-xs" />
              </div>
              <div className="col-span-1 flex justify-center">
                {lineasRet.length > 1 && (
                  <button onClick={() => removeLineaRet(idx)}
                    className="text-gray-600 hover:text-red-400 transition-colors p-1">
                    <Trash2 size={13} />
                  </button>
                )}
              </div>
            </div>
          ))}

          <div className="flex justify-between items-center pt-2 border-t border-gray-800">
            <span className="text-xs text-gray-500">Total retenido</span>
            <span className="text-sm font-bold text-blue-400">${fmt(totalRetenido)}</span>
          </div>
        </div>
      )}

      {/* ── Clasificación fiscal (FAC / NCR / NDB) ────────────────────────── */}
      {tipoDoc !== "RET" && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 space-y-3">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Clasificación fiscal</h2>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-white">Deducible de renta</p>
              <p className="text-xs text-gray-500">El gasto reduce la base imponible</p>
            </div>
            <button onClick={() => setDeducibleRenta(!deducibleRenta)}
              className={clsx("w-10 h-5 rounded-full transition-colors relative", deducibleRenta ? "bg-emerald-600" : "bg-gray-700")}>
              <span className={clsx("absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all", deducibleRenta ? "left-5" : "left-0.5")} />
            </button>
          </div>
          {parseFloat(valorIva) > 0 && (
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-white">Crédito tributario IVA</p>
                <p className="text-xs text-gray-500">El IVA se usa como crédito</p>
              </div>
              <button onClick={() => setCreditoTributarioIva(!creditoTributarioIva)}
                className={clsx("w-10 h-5 rounded-full transition-colors relative", creditoTributarioIva ? "bg-indigo-600" : "bg-gray-700")}>
                <span className={clsx("absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all", creditoTributarioIva ? "left-5" : "left-0.5")} />
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── Info RET ─────────────────────────────────────────────────────── */}
      {tipoDoc === "RET" && (
        <div className="flex items-start gap-2 bg-blue-500/10 border border-blue-500/20 rounded-lg px-3 py-2.5">
          <span className="text-blue-400 text-xs mt-0.5">ℹ️</span>
          <p className="text-xs text-blue-300">
            Las retenciones de IVA generan crédito tributario automáticamente.
            Las de Renta no son deducibles — ya son un pago anticipado de impuesto.
          </p>
        </div>
      )}

      {/* Imagen */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Foto del documento</h2>
          <span className="text-xs text-gray-600">opcional · se optimiza automáticamente</span>
        </div>
        {imagenPreview ? (
          <div className="relative">
            <img src={imagenPreview} alt="Vista previa" className="w-full rounded-lg max-h-48 object-cover" />
            <button onClick={() => { setImagenFile(null); setImagenPreview(null); }}
              className="absolute top-2 right-2 p-1.5 rounded-full bg-gray-900/80 text-gray-400 hover:text-white transition-colors">
              <X size={14} />
            </button>
            {imagenFile && (
              <p className="text-xs text-gray-500 mt-1 text-center">
                {(imagenFile.size / 1024).toFixed(0)} KB optimizado
              </p>
            )}
          </div>
        ) : (
          <button onClick={() => imagenRef.current?.click()}
            className="w-full flex flex-col items-center gap-3 py-8 border-2 border-dashed border-gray-700 rounded-xl hover:border-indigo-500/50 hover:bg-indigo-500/5 transition-colors cursor-pointer">
            <Camera size={24} className="text-gray-600" />
            <div className="text-center">
              <p className="text-sm text-gray-400">Tomar foto o seleccionar imagen</p>
              <p className="text-xs text-gray-600 mt-0.5">JPG, PNG o WEBP</p>
            </div>
          </button>
        )}
        <input ref={imagenRef} type="file" accept="image/*" capture="environment"
          onChange={e => { const f = e.target.files?.[0]; if (f) seleccionarImagen(f); }}
          className="hidden" />
      </div>

      {/* Notas */}
      <div>
        <label className="block text-xs text-gray-500 mb-1.5">Notas (opcional)</label>
        <textarea value={notas} onChange={e => setNotas(e.target.value)}
          placeholder="Observaciones, referencia interna, etc." rows={2}
          className="w-full px-3 py-2 rounded-lg bg-gray-900 border border-gray-800 text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500 text-sm resize-none" />
      </div>

      {error && (
        <div className="flex items-start gap-2 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2.5">
          <AlertTriangle size={14} className="text-red-400 shrink-0 mt-0.5" />
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      <button onClick={guardar} disabled={saving || !suscripcionActiva}
        className="w-full py-3 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold text-sm transition-colors flex items-center justify-center gap-2">
        {saving
          ? <><Loader2 size={16} className="animate-spin" /> Guardando...</>
          : `Registrar ${tipoDoc === "RET" ? `Retención · $${fmt(totalRetenido)}` : tipoDoc === "FAC" ? "Factura" : tipoDoc === "NCR" ? "Nota de Crédito" : "Nota de Débito"}${tipoDoc !== "RET" && importeTotal ? ` · $${fmt(importeTotal)}` : ""}`
        }
      </button>
    </div>
  );
}