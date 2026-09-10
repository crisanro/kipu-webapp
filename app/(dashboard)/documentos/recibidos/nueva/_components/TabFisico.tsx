"use client";
import { useState, useRef } from "react";
import api from "@/lib/api";
import {
  Camera, X, AlertTriangle, Plus, Trash2,
} from "lucide-react";
import { hoyEC } from "@/lib/fecha";

interface LineaRetencion {
  tipo:            string; // "1"=Renta "2"=IVA "6"=ISD
  base_imponible: string;
  porcentaje:      string;
  valor_retenido: string;
}

interface Props {
  suscripcionActiva: boolean;
  onDone: () => void;
}

const fmt = (n: any) => parseFloat(String(n ?? 0)).toFixed(2);

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
  const [creditoTributarioIva, setCreditoTributarioIva]  = useState(false);

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
        <label className="block text-xs font-medium mb-2" style={{ color: "var(--kipu-subtle)" }}>Tipo de documento</label>
        <div className="grid grid-cols-4 gap-1.5">
          {["FAC","NCR","NDB","RET"].map(tipo => {
            const isSelected = tipoDoc === tipo;
            return (
              <button
                key={tipo}
                type="button"
                onClick={() => setTipoDoc(tipo)}
                className="py-2.5 rounded-lg text-xs font-bold transition-colors"
                style={{
                  background: isSelected ? "var(--kipu-accent)" : "var(--kipu-surface)",
                  border: isSelected ? "1px solid var(--kipu-accent)" : "1px solid var(--kipu-border)",
                  color: isSelected ? "#FFFFFF" : "var(--kipu-subtle)",
                }}
                onMouseEnter={e => {
                  if (!isSelected) e.currentTarget.style.color = "var(--kipu-text)";
                }}
                onMouseLeave={e => {
                  if (!isSelected) e.currentTarget.style.color = "var(--kipu-subtle)";
                }}
              >
                <span className="block">{tipo}</span>
                <span className="block text-[9px] font-normal mt-0.5 opacity-70">
                  {tipo === "FAC" ? "Factura" : tipo === "NCR" ? "Nota Crédito" : tipo === "NDB" ? "Nota Débito" : "Retención"}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Proveedor */}
      <div
        className="rounded-xl p-4 space-y-3"
        style={{
          background: "var(--kipu-surface)",
          border: "1px solid var(--kipu-border)",
        }}
      >
        <h2 className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--kipu-subtle)" }}>Proveedor</h2>
        <div>
          <label className="block text-xs mb-1" style={{ color: "var(--kipu-subtle)" }}>RUC / Identificación *</label>
          <input
            value={rucProveedor}
            onChange={e => setRucProveedor(e.target.value)}
            placeholder="1234567890001"
            className="w-full px-3 py-2.5 rounded-lg text-sm font-mono transition-colors focus:outline-none"
            style={{
              background: "var(--kipu-surface)",
              border: "1px solid var(--kipu-border)",
              color: "var(--kipu-text)",
            }}
            onFocus={e => e.currentTarget.style.borderColor = "var(--kipu-accent)"}
            onBlur={e => e.currentTarget.style.borderColor = "var(--kipu-border)"}
          />
        </div>
        <div>
          <label className="block text-xs mb-1" style={{ color: "var(--kipu-subtle)" }}>Razón social *</label>
          <input
            value={razonSocial}
            onChange={e => setRazonSocial(e.target.value)}
            placeholder="EMPRESA PROVEEDORA S.A."
            className="w-full px-3 py-2.5 rounded-lg text-sm transition-colors focus:outline-none"
            style={{
              background: "var(--kipu-surface)",
              border: "1px solid var(--kipu-border)",
              color: "var(--kipu-text)",
            }}
            onFocus={e => e.currentTarget.style.borderColor = "var(--kipu-accent)"}
            onBlur={e => e.currentTarget.style.borderColor = "var(--kipu-border)"}
          />
        </div>
      </div>

      {/* Documento */}
      <div
        className="rounded-xl p-4 space-y-3"
        style={{
          background: "var(--kipu-surface)",
          border: "1px solid var(--kipu-border)",
        }}
      >
        <h2 className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--kipu-subtle)" }}>Documento</h2>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs mb-1" style={{ color: "var(--kipu-subtle)" }}>Número *</label>
            <input
              value={numeroDoc}
              onChange={e => setNumeroDoc(e.target.value)}
              placeholder="001-001-000000001"
              className="w-full px-3 py-2.5 rounded-lg text-sm font-mono transition-colors focus:outline-none"
              style={{
                background: "var(--kipu-surface)",
                border: "1px solid var(--kipu-border)",
                color: "var(--kipu-text)",
              }}
              onFocus={e => e.currentTarget.style.borderColor = "var(--kipu-accent)"}
              onBlur={e => e.currentTarget.style.borderColor = "var(--kipu-border)"}
            />
          </div>
          <div>
            <label className="block text-xs mb-1" style={{ color: "var(--kipu-subtle)" }}>Fecha emisión *</label>
            <input
              type="date"
              value={fechaEmision}
              onChange={e => setFechaEmision(e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg text-sm transition-colors focus:outline-none"
              style={{
                background: "var(--kipu-surface)",
                border: "1px solid var(--kipu-border)",
                color: "var(--kipu-text)",
              }}
              onFocus={e => e.currentTarget.style.borderColor = "var(--kipu-accent)"}
              onBlur={e => e.currentTarget.style.borderColor = "var(--kipu-border)"}
            />
          </div>
        </div>
      </div>

      {/* ── Totales FAC / NCR / NDB ───────────────────────────────────────── */}
      {tipoDoc !== "RET" && (
        <div
          className="rounded-xl p-4 space-y-3"
          style={{
            background: "var(--kipu-surface)",
            border: "1px solid var(--kipu-border)",
          }}
        >
          <h2 className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--kipu-subtle)" }}>Totales</h2>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs mb-1" style={{ color: "var(--kipu-subtle)" }}>Subtotal 0%</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={subtotal0}
                onChange={e => { setSubtotal0(e.target.value); recalcularTotal(e.target.value, subtotalIva, valorIva); }}
                placeholder="0.00"
                className="w-full px-3 py-2.5 rounded-lg text-sm transition-colors focus:outline-none"
                style={{
                  background: "var(--kipu-surface)",
                  border: "1px solid var(--kipu-border)",
                  color: "var(--kipu-text)",
                }}
                onFocus={e => e.currentTarget.style.borderColor = "var(--kipu-accent)"}
                onBlur={e => e.currentTarget.style.borderColor = "var(--kipu-border)"}
              />
            </div>
            <div>
              <label className="block text-xs mb-1" style={{ color: "var(--kipu-subtle)" }}>Tarifa IVA</label>
              <select
                value={tarifaIva}
                onChange={e => { setTarifaIva(e.target.value); calcularIVA(subtotalIva, e.target.value); }}
                className="w-full px-3 py-2.5 rounded-lg text-sm transition-colors focus:outline-none"
                style={{
                  background: "var(--kipu-surface)",
                  border: "1px solid var(--kipu-border)",
                  color: "var(--kipu-text)",
                }}
                onFocus={e => e.currentTarget.style.borderColor = "var(--kipu-accent)"}
                onBlur={e => e.currentTarget.style.borderColor = "var(--kipu-border)"}
              >
                <option value="0">0%</option>
                <option value="15">15%</option>
              </select>
            </div>
            <div>
              <label className="block text-xs mb-1" style={{ color: "var(--kipu-subtle)" }}>Base gravada {tarifaIva}%</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={subtotalIva}
                onChange={e => { setSubtotalIva(e.target.value); calcularIVA(e.target.value, tarifaIva); }}
                placeholder="0.00"
                className="w-full px-3 py-2.5 rounded-lg text-sm transition-colors focus:outline-none"
                style={{
                  background: "var(--kipu-surface)",
                  border: "1px solid var(--kipu-border)",
                  color: "var(--kipu-text)",
                }}
                onFocus={e => e.currentTarget.style.borderColor = "var(--kipu-accent)"}
                onBlur={e => e.currentTarget.style.borderColor = "var(--kipu-border)"}
              />
            </div>
            <div>
              <label className="block text-xs mb-1" style={{ color: "var(--kipu-subtle)" }}>Valor IVA</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={valorIva}
                onChange={e => { setValorIva(e.target.value); recalcularTotal(subtotal0, subtotalIva, e.target.value); }}
                placeholder="0.00"
                className="w-full px-3 py-2.5 rounded-lg text-sm transition-colors focus:outline-none"
                style={{
                  background: "var(--kipu-surface)",
                  border: "1px solid var(--kipu-border)",
                  color: "var(--kipu-text)",
                }}
                onFocus={e => e.currentTarget.style.borderColor = "var(--kipu-accent)"}
                onBlur={e => e.currentTarget.style.borderColor = "var(--kipu-border)"}
              />
            </div>
          </div>
          <div className="pt-2" style={{ borderTop: "1px solid var(--kipu-border)" }}>
            <label className="block text-xs mb-1" style={{ color: "var(--kipu-subtle)" }}>Total *</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={importeTotal}
              onChange={e => setImporteTotal(e.target.value)}
              placeholder="0.00"
              className="w-full px-3 py-2.5 rounded-lg text-sm font-bold transition-colors focus:outline-none"
              style={{
                background: "var(--kipu-surface)",
                border: "1px solid var(--kipu-border)",
                color: "var(--kipu-text)",
              }}
              onFocus={e => e.currentTarget.style.borderColor = "var(--kipu-accent)"}
              onBlur={e => e.currentTarget.style.borderColor = "var(--kipu-border)"}
            />
          </div>
        </div>
      )}

      {/* ── Líneas de retención ───────────────────────────────────────────── */}
      {tipoDoc === "RET" && (
        <div
          className="rounded-xl p-4 space-y-3"
          style={{
            background: "var(--kipu-surface)",
            border: "1px solid var(--kipu-border)",
          }}
        >
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--kipu-subtle)" }}>Retenciones</h2>
            <button
              type="button"
              onClick={addLineaRet}
              className="flex items-center gap-1 text-xs transition-colors"
              style={{ color: "var(--kipu-accent)" }}
              onMouseEnter={e => e.currentTarget.style.color = "var(--kipu-accent-h)"}
              onMouseLeave={e => e.currentTarget.style.color = "var(--kipu-accent)"}
            >
              <Plus size={13} /> Agregar línea
            </button>
          </div>

          {/* Header */}
          <div className="grid grid-cols-12 gap-2 text-[10px] uppercase font-semibold tracking-wider px-1" style={{ color: "var(--kipu-subtle)" }}>
            <div className="col-span-3">Tipo</div>
            <div className="col-span-3">Base</div>
            <div className="col-span-2">%</div>
            <div className="col-span-3">Retenido</div>
            <div className="col-span-1"></div>
          </div>

          {lineasRet.map((linea, idx) => (
            <div key={idx} className="grid grid-cols-12 gap-2 items-center">
              <div className="col-span-3">
                <select
                  value={linea.tipo}
                  onChange={e => updateLineaRet(idx, "tipo", e.target.value)}
                  className="w-full px-2 py-2 rounded-lg text-xs transition-colors focus:outline-none"
                  style={{
                    background: "var(--kipu-surface)",
                    border: "1px solid var(--kipu-border)",
                    color: "var(--kipu-text)",
                  }}
                  onFocus={e => e.currentTarget.style.borderColor = "var(--kipu-accent)"}
                  onBlur={e => e.currentTarget.style.borderColor = "var(--kipu-border)"}
                >
                  <option value="1">Renta</option>
                  <option value="2">IVA</option>
                  <option value="6">ISD</option>
                </select>
              </div>
              <div className="col-span-3">
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={linea.base_imponible}
                  onChange={e => updateLineaRet(idx, "base_imponible", e.target.value)}
                  placeholder="0.00"
                  className="w-full px-2 py-2 rounded-lg text-xs transition-colors focus:outline-none"
                  style={{
                    background: "var(--kipu-surface)",
                    border: "1px solid var(--kipu-border)",
                    color: "var(--kipu-text)",
                  }}
                  onFocus={e => e.currentTarget.style.borderColor = "var(--kipu-accent)"}
                  onBlur={e => e.currentTarget.style.borderColor = "var(--kipu-border)"}
                />
              </div>
              <div className="col-span-2">
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={linea.porcentaje}
                  onChange={e => updateLineaRet(idx, "porcentaje", e.target.value)}
                  placeholder="%"
                  className="w-full px-2 py-2 rounded-lg text-xs transition-colors focus:outline-none"
                  style={{
                    background: "var(--kipu-surface)",
                    border: "1px solid var(--kipu-border)",
                    color: "var(--kipu-text)",
                  }}
                  onFocus={e => e.currentTarget.style.borderColor = "var(--kipu-accent)"}
                  onBlur={e => e.currentTarget.style.borderColor = "var(--kipu-border)"}
                />
              </div>
              <div className="col-span-3">
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={linea.valor_retenido}
                  onChange={e => updateLineaRet(idx, "valor_retenido", e.target.value)}
                  placeholder="0.00"
                  className="w-full px-2 py-2 rounded-lg text-xs transition-colors focus:outline-none"
                  style={{
                    background: "var(--kipu-surface)",
                    border: "1px solid var(--kipu-border)",
                    color: "var(--kipu-text)",
                  }}
                  onFocus={e => e.currentTarget.style.borderColor = "var(--kipu-accent)"}
                  onBlur={e => e.currentTarget.style.borderColor = "var(--kipu-border)"}
                />
              </div>
              <div className="col-span-1 flex justify-center">
                {lineasRet.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeLineaRet(idx)}
                    className="transition-colors p-1"
                    style={{ color: "var(--kipu-subtle)" }}
                    onMouseEnter={e => e.currentTarget.style.color = "var(--kipu-danger)"}
                    onMouseLeave={e => e.currentTarget.style.color = "var(--kipu-subtle)"}
                  >
                    <Trash2 size={13} />
                  </button>
                )}
              </div>
            </div>
          ))}

          <div className="flex justify-between items-center pt-2" style={{ borderTop: "1px solid var(--kipu-border)" }}>
            <span className="text-xs" style={{ color: "var(--kipu-subtle)" }}>Total retenido</span>
            <span className="text-sm font-bold" style={{ color: "#60a5fa" }}>${fmt(totalRetenido)}</span>
          </div>
        </div>
      )}

      {/* ── Clasificación fiscal (FAC / NCR / NDB) ────────────────────────── */}
      {tipoDoc !== "RET" && (
        <div
          className="rounded-xl p-4 space-y-3"
          style={{
            background: "var(--kipu-surface)",
            border: "1px solid var(--kipu-border)",
          }}
        >
          <h2 className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--kipu-subtle)" }}>Clasificación fiscal</h2>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm" style={{ color: "var(--kipu-text)" }}>Deducible de renta</p>
              <p className="text-xs" style={{ color: "var(--kipu-subtle)" }}>El gasto reduce la base imponible</p>
            </div>
            <button
              type="button"
              onClick={() => setDeducibleRenta(!deducibleRenta)}
              className="w-10 h-5 rounded-full transition-colors relative"
              style={{
                background: deducibleRenta
                  ? "var(--kipu-success)"
                  : "color-mix(in srgb, var(--kipu-text) 15%, transparent)",
              }}
            >
              <span
                className="absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all"
                style={{ left: deducibleRenta ? "20px" : "2px" }}
              />
            </button>
          </div>
          {parseFloat(valorIva) > 0 && (
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm" style={{ color: "var(--kipu-text)" }}>Crédito tributario IVA</p>
                <p className="text-xs" style={{ color: "var(--kipu-subtle)" }}>El IVA se usa como crédito</p>
              </div>
              <button
                type="button"
                onClick={() => setCreditoTributarioIva(!creditoTributarioIva)}
                className="w-10 h-5 rounded-full transition-colors relative"
                style={{
                  background: creditoTributarioIva
                    ? "var(--kipu-accent)"
                    : "color-mix(in srgb, var(--kipu-text) 15%, transparent)",
                }}
              >
                <span
                  className="absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all"
                  style={{ left: creditoTributarioIva ? "20px" : "2px" }}
                />
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── Info RET ─────────────────────────────────────────────────────── */}
      {tipoDoc === "RET" && (
        <div
          className="flex items-start gap-2 rounded-lg px-3 py-2.5"
          style={{
            background: "color-mix(in srgb, #60a5fa 10%, transparent)",
            border: "1px solid color-mix(in srgb, #60a5fa 20%, transparent)",
          }}
        >
          <span className="text-xs mt-0.5" style={{ color: "#60a5fa" }}>ℹ️</span>
          <p className="text-xs" style={{ color: "#93c5fd" }}>
            Las retenciones de IVA generan crédito tributario automáticamente.
            Las de Renta no son deducibles — ya son un pago anticipado de impuesto.
          </p>
        </div>
      )}

      {/* Imagen */}
      <div
        className="rounded-xl p-4 space-y-3"
        style={{
          background: "var(--kipu-surface)",
          border: "1px solid var(--kipu-border)",
        }}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--kipu-subtle)" }}>Foto del documento</h2>
          <span className="text-xs" style={{ color: "var(--kipu-subtle)" }}>opcional · se optimiza automáticamente</span>
        </div>
        {imagenPreview ? (
          <div className="relative">
            <img src={imagenPreview} alt="Vista previa" className="w-full rounded-lg max-h-48 object-cover" />
            <button
              type="button"
              onClick={() => { setImagenFile(null); setImagenPreview(null); }}
              className="absolute top-2 right-2 p-1.5 rounded-full transition-colors"
              style={{
                background: "color-mix(in srgb, var(--kipu-bg) 80%, transparent)",
                color: "var(--kipu-subtle)",
              }}
              onMouseEnter={e => e.currentTarget.style.color = "var(--kipu-text)"}
              onMouseLeave={e => e.currentTarget.style.color = "var(--kipu-subtle)"}
            >
              <X size={14} />
            </button>
            {imagenFile && (
              <p className="text-xs mt-1 text-center" style={{ color: "var(--kipu-subtle)" }}>
                {(imagenFile.size / 1024).toFixed(0)} KB optimizado
              </p>
            )}
          </div>
        ) : (
          <button
            type="button"
            onClick={() => imagenRef.current?.click()}
            className="w-full flex flex-col items-center gap-3 py-8 border-2 border-dashed rounded-xl transition-colors cursor-pointer"
            style={{ borderColor: "var(--kipu-border)" }}
            onMouseEnter={e => {
              e.currentTarget.style.borderColor = "color-mix(in srgb, var(--kipu-accent) 50%, transparent)";
              e.currentTarget.style.background = "color-mix(in srgb, var(--kipu-accent) 5%, transparent)";
            }}
            onMouseLeave={e => {
              e.currentTarget.style.borderColor = "var(--kipu-border)";
              e.currentTarget.style.background = "transparent";
            }}
          >
            <Camera size={24} style={{ color: "var(--kipu-subtle)" }} />
            <div className="text-center">
              <p className="text-sm" style={{ color: "var(--kipu-muted)" }}>Tomar foto o seleccionar imagen</p>
              <p className="text-xs mt-0.5" style={{ color: "var(--kipu-subtle)" }}>JPG, PNG o WEBP</p>
            </div>
          </button>
        )}
        <input
          ref={imagenRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={e => { const f = e.target.files?.[0]; if (f) seleccionarImagen(f); }}
          className="hidden"
        />
      </div>

      {/* Notas */}
      <div>
        <label className="block text-xs mb-1.5" style={{ color: "var(--kipu-subtle)" }}>Notas (opcional)</label>
        <textarea
          value={notas}
          onChange={e => setNotas(e.target.value)}
          placeholder="Observaciones, referencia interna, etc."
          rows={2}
          className="w-full px-3 py-2 rounded-lg text-sm resize-none transition-colors focus:outline-none"
          style={{
            background: "var(--kipu-surface)",
            border: "1px solid var(--kipu-border)",
            color: "var(--kipu-text)",
          }}
          onFocus={e => e.currentTarget.style.borderColor = "var(--kipu-accent)"}
          onBlur={e => e.currentTarget.style.borderColor = "var(--kipu-border)"}
        />
      </div>

      {error && (
        <div
          className="flex items-start gap-2 rounded-lg px-3 py-2.5"
          style={{
            background: "color-mix(in srgb, var(--kipu-danger) 10%, transparent)",
            border: "1px solid color-mix(in srgb, var(--kipu-danger) 20%, transparent)",
          }}
        >
          <AlertTriangle size={14} className="shrink-0 mt-0.5" style={{ color: "var(--kipu-danger)" }} />
          <p className="text-sm" style={{ color: "var(--kipu-danger)" }}>{error}</p>
        </div>
      )}

      <button
        type="button"
        onClick={guardar}
        disabled={saving || !suscripcionActiva}
        className="w-full py-3 rounded-lg text-white font-semibold text-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        style={{ background: "var(--kipu-accent)" }}
        onMouseEnter={e => {
          if (!saving && suscripcionActiva) e.currentTarget.style.background = "var(--kipu-accent-h)";
        }}
        onMouseLeave={e => {
          if (!saving && suscripcionActiva) e.currentTarget.style.background = "var(--kipu-accent)";
        }}
      >
        {saving ? (
          <>
            <div
              className="w-4 h-4 border-2 border-t-transparent rounded-full animate-spin"
              style={{ borderColor: "#FFFFFF", borderTopColor: "transparent" }}
            />
            Guardando...
          </>
        ) : (
          `Registrar ${tipoDoc === "RET" ? `Retención · $${fmt(totalRetenido)}` : tipoDoc === "FAC" ? "Factura" : tipoDoc === "NCR" ? "Nota de Crédito" : "Nota de Débito"}${tipoDoc !== "RET" && importeTotal ? ` · $${fmt(importeTotal)}` : ""}`
        )}
      </button>
    </div>
  );
}