// app/(dashboard)/facturas/recibidas/nueva/page.tsx
"use client";

import { useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import { useAuthStore } from "@/store/auth.store";
import {
  Upload, FileText, Loader2, CheckCircle2,
  AlertTriangle, X, ChevronDown, ChevronUp
} from "lucide-react";
import { clsx } from "clsx";

// ── Tipos ──────────────────────────────────────────────────────────────────────
interface ImpuestoDetalle {
  codigoPorcentaje: string;
  tarifa:           string;
  baseImponible:    number;
  valor:            number;
  aplicaCredito:    boolean;
}

interface FacturaParseada {
  // Proveedor
  ruc_proveedor:          string;
  razon_social_proveedor: string;
  contribuyente_especial: string | null;

  // Identificación
  clave_acceso:        string;
  numero_autorizacion: string;
  numero_factura:      string;
  fecha_emision:       string;
  fecha_autorizacion:  string | null;

  // Totales
  total_sin_impuestos: number;
  total_descuento:     number;
  subtotal_0:          number;
  subtotal_iva:        number;
  valor_iva:           number;
  importe_total:       number;

  // Impuestos detalle
  impuestos_detalle: ImpuestoDetalle[];

  // Comprador (para validar RUC)
  identificacion_comprador: string;

  // Datos completos sin firma
  datos_factura: any;
}

const fmt = (n: number) => parseFloat(String(n ?? 0)).toFixed(2);

// ── Parser de XML ──────────────────────────────────────────────────────────────
function parsearXML(xmlText: string): FacturaParseada {
  const parser = new DOMParser();
  const doc    = parser.parseFromString(xmlText, "text/xml");

  // Extraer el comprobante del CDATA si viene envuelto en <autorizacion>
  const comprobanteNode = doc.querySelector("comprobante");
  let facturaDoc = doc;
  if (comprobanteNode) {
    const cdataContent = comprobanteNode.textContent || "";
    facturaDoc = parser.parseFromString(cdataContent, "text/xml");
  }

  const get = (tag: string) =>
    facturaDoc.querySelector(tag)?.textContent?.trim() ?? "";

  // infoTributaria
  const ruc_proveedor          = get("ruc");
  const razon_social_proveedor = get("razonSocial");
  const clave_acceso           = get("claveAcceso");
  const estab                  = get("estab");
  const ptoEmi                 = get("ptoEmi");
  const secuencial             = get("secuencial");
  const numero_factura         = `${estab}-${ptoEmi}-${secuencial}`;

  // infoFactura
  const fecha_emision_raw      = get("fechaEmision"); // DD/MM/YYYY
  const [d, m, y]              = fecha_emision_raw.split("/");
  const fecha_emision          = `${y}-${m}-${d}`;
  const contribuyente_especial = get("contribuyenteEspecial") || null;
  const total_sin_impuestos    = parseFloat(get("totalSinImpuestos")) || 0;
  const total_descuento        = parseFloat(get("totalDescuento"))    || 0;
  const importe_total          = parseFloat(get("importeTotal"))      || 0;
  const identificacion_comprador = get("identificacionComprador");

  // autorizacion (wrapper)
  const numero_autorizacion = doc.querySelector("numeroAutorizacion")?.textContent?.trim() ?? clave_acceso;
  const fecha_auth_raw      = doc.querySelector("fechaAutorizacion")?.textContent?.trim() ?? null;

  // totalConImpuestos → impuestos_detalle
  const totalImpuestos = facturaDoc.querySelectorAll("totalImpuesto");
  const impuestos_detalle: ImpuestoDetalle[] = [];
  let subtotal_0   = 0;
  let subtotal_iva = 0;
  let valor_iva    = 0;

  totalImpuestos.forEach((imp) => {
    const codigoPorcentaje = imp.querySelector("codigoPorcentaje")?.textContent?.trim() ?? "0";
    const tarifa           = imp.querySelector("tarifa")?.textContent?.trim()           ?? "0";
    const baseImponible    = parseFloat(imp.querySelector("baseImponible")?.textContent ?? "0");
    const valor            = parseFloat(imp.querySelector("valor")?.textContent         ?? "0");

    // código 2 = IVA, codigoPorcentaje 0 = 0%, 4 = 15%, otros = 5%, 8%, etc.
    if (codigoPorcentaje === "0") {
      subtotal_0 += baseImponible;
    } else {
      subtotal_iva += baseImponible;
      valor_iva    += valor;
    }

    impuestos_detalle.push({
      codigoPorcentaje,
      tarifa,
      baseImponible,
      valor,
      aplicaCredito: false, // el cliente lo define
    });
  });

  // Construir datos_factura sin la firma digital
  const infoTributaria: any = {};
  const infoFactura: any    = {};
  const detalles: any[]     = [];

  facturaDoc.querySelectorAll("infoTributaria > *").forEach((n) => {
    infoTributaria[n.tagName] = n.textContent?.trim();
  });
  facturaDoc.querySelectorAll("infoFactura > *").forEach((n) => {
    if (n.tagName === "totalConImpuestos") {
      infoFactura.totalConImpuestos = impuestos_detalle;
    } else if (n.tagName === "pagos") {
      infoFactura.pagos = [];
      n.querySelectorAll("pago").forEach((p) => {
        const pago: any = {};
        p.querySelectorAll("*").forEach((c) => { pago[c.tagName] = c.textContent?.trim(); });
        infoFactura.pagos.push(pago);
      });
    } else {
      infoFactura[n.tagName] = n.textContent?.trim();
    }
  });

  facturaDoc.querySelectorAll("detalle").forEach((d) => {
    const det: any = {};
    d.querySelectorAll(":scope > *").forEach((c) => {
      if (c.tagName === "impuestos") {
        det.impuestos = [];
        c.querySelectorAll("impuesto").forEach((i) => {
          const imp: any = {};
          i.querySelectorAll("*").forEach((x) => { imp[x.tagName] = x.textContent?.trim(); });
          det.impuestos.push(imp);
        });
      } else {
        det[c.tagName] = c.textContent?.trim();
      }
    });
    detalles.push(det);
  });

  const infoAdicional: any[] = [];
  facturaDoc.querySelectorAll("campoAdicional").forEach((c) => {
    infoAdicional.push({
      nombre: c.getAttribute("nombre"),
      valor:  c.textContent?.trim(),
    });
  });

  return {
    ruc_proveedor,
    razon_social_proveedor,
    contribuyente_especial,
    clave_acceso,
    numero_autorizacion,
    numero_factura,
    fecha_emision,
    fecha_autorizacion: fecha_auth_raw,
    total_sin_impuestos,
    total_descuento,
    subtotal_0,
    subtotal_iva,
    valor_iva,
    importe_total,
    impuestos_detalle,
    identificacion_comprador,
    datos_factura: { infoTributaria, infoFactura, detalles, infoAdicional },
  };
}

// ── Componente principal ───────────────────────────────────────────────────────
export default function NuevaFacturaRecibidaPage() {
  const router  = useRouter();
  const empresa = useAuthStore((s) => s.empresa);
  const updateBalance = useAuthStore((s) => s.updateBalance);

  const [step,      setStep]      = useState<"upload" | "review" | "done">("upload");
  const [factura,   setFactura]   = useState<FacturaParseada | null>(null);
  const [impuestos, setImpuestos] = useState<ImpuestoDetalle[]>([]);
  const [deducibleRenta,        setDeducibleRenta]        = useState(true);
  const [creditoTributarioIva,  setCreditoTributarioIva]  = useState(false);
  const [notas,     setNotas]     = useState("");
  const [error,     setError]     = useState("");
  const [saving,    setSaving]    = useState(false);
  const [dragging,  setDragging]  = useState(false);
  const [showDetalles, setShowDetalles] = useState(false);

  const fileRef = useRef<HTMLInputElement>(null);

  // ── Procesar archivo XML ───────────────────────────────────────────────────
  const procesarArchivo = useCallback((file: File) => {
    setError("");
    if (!file.name.endsWith(".xml")) {
      setError("Solo se aceptan archivos XML.");
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const xmlText = e.target?.result as string;
        const parsed  = parsearXML(xmlText);

        // Validar que la factura esté dirigida al RUC del emisor
        if (empresa?.ruc && parsed.identificacion_comprador !== empresa.ruc) {
          setError(
            `Esta factura está dirigida a ${parsed.identificacion_comprador}, no a tu RUC (${empresa.ruc}).`
          );
          return;
        }

        setFactura(parsed);
        setImpuestos(parsed.impuestos_detalle.map(i => ({ ...i, aplicaCredito: false })));
        setStep("review");
      } catch (err) {
        setError("No se pudo leer el XML. Verifica que sea una factura electrónica válida.");
      }
    };
    reader.readAsText(file, "UTF-8");
  }, [empresa]);

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) procesarArchivo(file);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) procesarArchivo(file);
  };

  const toggleCredito = (idx: number) => {
    setImpuestos(prev => prev.map((imp, i) =>
      i === idx ? { ...imp, aplicaCredito: !imp.aplicaCredito } : imp
    ));
  };

  // ── Guardar ───────────────────────────────────────────────────────────────
  const guardar = async () => {
    if (!factura) return;
    setSaving(true);
    setError("");
    try {
      await api.post("/api/v1/app/invoices/received", {
        ruc_proveedor:          factura.ruc_proveedor,
        razon_social_proveedor: factura.razon_social_proveedor,
        contribuyente_especial: factura.contribuyente_especial,
        clave_acceso:           factura.clave_acceso,
        numero_autorizacion:    factura.numero_autorizacion,
        numero_factura:         factura.numero_factura,
        fecha_emision:          factura.fecha_emision,
        fecha_autorizacion:     factura.fecha_autorizacion,
        total_sin_impuestos:    factura.total_sin_impuestos,
        total_descuento:        factura.total_descuento,
        subtotal_0:             factura.subtotal_0,
        subtotal_iva:           factura.subtotal_iva,
        valor_iva:              factura.valor_iva,
        importe_total:          factura.importe_total,
        impuestos_detalle:      impuestos,
        deducible_renta:        deducibleRenta,
        credito_tributario_iva: creditoTributarioIva,
        notas_cliente:          notas || null,
        datos_factura:          factura.datos_factura,
        fuente:                 "MANUAL",
      });

      if (empresa) {
        updateBalance(empresa.balance_emision, empresa.balance_recepcion - 1);
      }
      setStep("done");
    } catch (err: any) {
      const detail = err?.response?.data?.detail;
      setError(typeof detail === "string" ? detail : "Error al guardar la factura.");
    } finally {
      setSaving(false);
    }
  };

  // ── Step: Done ────────────────────────────────────────────────────────────
  if (step === "done") {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-gray-950">
        <div className="w-full max-w-sm text-center">
          <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 size={32} className="text-emerald-400" />
          </div>
          <h2 className="text-xl font-bold text-white mb-1">¡Factura registrada!</h2>
          <p className="text-sm text-gray-500 mb-6">{factura?.numero_factura}</p>
          <div className="flex gap-3">
            <button
              onClick={() => {
                setStep("upload");
                setFactura(null);
                setImpuestos([]);
                setNotas("");
                setError("");
                setDeducibleRenta(true);
                setCreditoTributarioIva(false);
                if (fileRef.current) fileRef.current.value = "";
              }}
              className="flex-1 py-2.5 rounded-lg border border-gray-700 text-gray-400 hover:text-white text-sm transition-colors"
            >
              Registrar otra
            </button>
            <button
              onClick={() => router.push("/facturas/recibidas")}
              className="flex-1 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium transition-colors"
            >
              Ver historial
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Step: Review ──────────────────────────────────────────────────────────
  if (step === "review" && factura) {
    return (
      <div className="p-4 md:p-6 max-w-2xl mx-auto space-y-4">

        {/* Header */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => { setStep("upload"); setFactura(null); setError(""); }}
            className="p-2 rounded-lg border border-gray-700 text-gray-400 hover:text-white transition-colors"
          >
            <X size={16} />
          </button>
          <div>
            <h1 className="text-xl font-bold text-white">Revisar factura</h1>
            <p className="text-sm text-gray-500">{factura.numero_factura}</p>
          </div>
        </div>

        {/* Datos del proveedor */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Proveedor</h2>
          <p className="text-white font-semibold">{factura.razon_social_proveedor}</p>
          <p className="text-sm text-gray-400">{factura.ruc_proveedor}</p>
          {factura.contribuyente_especial && (
            <span className="inline-block mt-1 text-xs text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded-full">
              Contribuyente especial #{factura.contribuyente_especial}
            </span>
          )}
          <div className="grid grid-cols-2 gap-3 mt-3 pt-3 border-t border-gray-800">
            <div>
              <p className="text-xs text-gray-500">Fecha emisión</p>
              <p className="text-sm text-white">{factura.fecha_emision}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Clave de acceso</p>
              <p className="text-xs text-gray-400 font-mono truncate">{factura.clave_acceso}</p>
            </div>
          </div>
        </div>

        {/* Totales */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Totales</h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between text-gray-400">
              <span>Total sin impuestos</span>
              <span>${fmt(factura.total_sin_impuestos)}</span>
            </div>
            {factura.total_descuento > 0 && (
              <div className="flex justify-between text-amber-400">
                <span>Descuento</span>
                <span>-${fmt(factura.total_descuento)}</span>
              </div>
            )}
            {factura.subtotal_0 > 0 && (
              <div className="flex justify-between text-gray-400">
                <span>Base 0%</span>
                <span>${fmt(factura.subtotal_0)}</span>
              </div>
            )}
            {factura.subtotal_iva > 0 && (
              <div className="flex justify-between text-gray-400">
                <span>Base con IVA</span>
                <span>${fmt(factura.subtotal_iva)}</span>
              </div>
            )}
            {factura.valor_iva > 0 && (
              <div className="flex justify-between text-gray-400">
                <span>IVA total</span>
                <span>${fmt(factura.valor_iva)}</span>
              </div>
            )}
            <div className="border-t border-gray-800 pt-2 flex justify-between font-bold text-white text-base">
              <span>Total</span>
              <span>${fmt(factura.importe_total)}</span>
            </div>
          </div>
        </div>

        {/* Desglose de impuestos — decisiones fiscales */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
            Desglose de impuestos
          </h2>
          <p className="text-xs text-gray-600 mb-3">
            Marca qué líneas de IVA aplican como crédito tributario para tu declaración.
          </p>
          <div className="space-y-2">
            {impuestos.map((imp, idx) => (
              <div
                key={idx}
                className={clsx(
                  "flex items-center justify-between p-3 rounded-lg border transition-colors",
                  imp.aplicaCredito
                    ? "border-indigo-500/40 bg-indigo-500/5"
                    : "border-gray-800 bg-gray-800/30"
                )}
              >
                <div>
                  <p className="text-sm text-white font-medium">
                    IVA {imp.tarifa}%
                    {imp.valor === 0 && (
                      <span className="ml-2 text-xs text-gray-500">(tarifa 0)</span>
                    )}
                  </p>
                  <p className="text-xs text-gray-500">
                    Base: ${fmt(imp.baseImponible)}
                    {imp.valor > 0 && ` · IVA: $${fmt(imp.valor)}`}
                  </p>
                </div>
                {imp.valor > 0 ? (
                  <button
                    onClick={() => toggleCredito(idx)}
                    className={clsx(
                      "flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors",
                      imp.aplicaCredito
                        ? "bg-indigo-600 text-white"
                        : "bg-gray-700 text-gray-400 hover:text-white"
                    )}
                  >
                    {imp.aplicaCredito ? "✓ Crédito tributario" : "Sin crédito"}
                  </button>
                ) : (
                  <span className="text-xs text-gray-600 px-3 py-1.5">No aplica</span>
                )}
              </div>
            ))}
          </div>

          {/* Resumen crédito tributario */}
          {impuestos.some(i => i.aplicaCredito) && (
            <div className="mt-3 pt-3 border-t border-gray-800 flex justify-between text-sm">
              <span className="text-indigo-400 font-medium">Crédito tributario total</span>
              <span className="text-indigo-400 font-bold">
                ${fmt(impuestos.filter(i => i.aplicaCredito).reduce((s, i) => s + i.valor, 0))}
              </span>
            </div>
          )}
        </div>

        {/* Decisiones fiscales globales */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 space-y-3">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
            Declaración
          </h2>

          {/* Deducible renta */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-white font-medium">Deducible en renta</p>
              <p className="text-xs text-gray-500">¿Este gasto es deducible para el impuesto a la renta?</p>
            </div>
            <button
              onClick={() => setDeducibleRenta(!deducibleRenta)}
              className={clsx(
                "w-10 h-5 rounded-full transition-colors relative shrink-0",
                deducibleRenta ? "bg-indigo-600" : "bg-gray-700"
              )}
            >
              <span className={clsx(
                "absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all shadow-sm",
                deducibleRenta ? "left-5" : "left-0.5"
              )} />
            </button>
          </div>

          {/* Crédito tributario IVA global */}
          <div className="flex items-center justify-between pt-2 border-t border-gray-800">
            <div>
              <p className="text-sm text-white font-medium">Crédito tributario IVA</p>
              <p className="text-xs text-gray-500">¿El IVA de esta factura aplica como crédito tributario?</p>
            </div>
            <button
              onClick={() => {
                const nuevo = !creditoTributarioIva;
                setCreditoTributarioIva(nuevo);
                // Sincronizar todos los impuestos con IVA > 0
                setImpuestos(prev => prev.map(i => ({
                  ...i,
                  aplicaCredito: i.valor > 0 ? nuevo : false,
                })));
              }}
              className={clsx(
                "w-10 h-5 rounded-full transition-colors relative shrink-0",
                creditoTributarioIva ? "bg-indigo-600" : "bg-gray-700"
              )}
            >
              <span className={clsx(
                "absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all shadow-sm",
                creditoTributarioIva ? "left-5" : "left-0.5"
              )} />
            </button>
          </div>

          {/* Notas */}
          <div className="pt-2 border-t border-gray-800">
            <label className="block text-xs text-gray-500 mb-1.5">Notas (opcional)</label>
            <textarea
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              placeholder="Observaciones, referencia interna, etc."
              rows={2}
              className="w-full px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500 text-sm resize-none"
            />
          </div>
        </div>

        {/* Ver detalles de ítems */}
        {factura.datos_factura?.detalles?.length > 0 && (
          <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
            <button
              onClick={() => setShowDetalles(!showDetalles)}
              className="w-full flex items-center justify-between px-4 py-3 text-sm text-gray-400 hover:text-white transition-colors"
            >
              <span>{factura.datos_factura.detalles.length} ítems en la factura</span>
              {showDetalles ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
            {showDetalles && (
              <div className="border-t border-gray-800 divide-y divide-gray-800 max-h-64 overflow-y-auto">
                {factura.datos_factura.detalles.map((d: any, i: number) => (
                  <div key={i} className="px-4 py-2.5 flex justify-between items-center">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white truncate">{d.descripcion}</p>
                      <p className="text-xs text-gray-500">
                        {d.cantidad} × ${fmt(parseFloat(d.precioUnitario ?? 0))}
                      </p>
                    </div>
                    <span className="text-sm font-semibold text-white ml-3">
                      ${fmt(parseFloat(d.precioTotalSinImpuesto ?? 0))}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {error && (
          <p className="text-xs text-red-400 bg-red-400/10 px-3 py-2 rounded-lg">{error}</p>
        )}

        {/* Créditos */}
        <p className="text-xs text-gray-600 text-center">
          Créditos de recepción disponibles: {empresa?.balance_recepcion ?? 0}
        </p>

        <button
          onClick={guardar}
          disabled={saving || !empresa || (empresa.balance_recepcion ?? 0) <= 0}
          className="w-full py-3 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold text-sm transition-colors flex items-center justify-center gap-2"
        >
          {saving
            ? <><Loader2 size={16} className="animate-spin" /> Guardando...</>
            : `Registrar factura · $${fmt(factura.importe_total)}`
          }
        </button>
      </div>
    );
  }

  // ── Step: Upload ──────────────────────────────────────────────────────────
  return (
    <div className="p-4 md:p-6 max-w-lg mx-auto space-y-6">

      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-white">Registrar factura recibida</h1>
        <p className="text-sm text-gray-500">Sube el XML de la factura electrónica que recibiste</p>
      </div>

      {/* Sin créditos */}
      {empresa && (empresa.balance_recepcion ?? 0) <= 0 && (
        <div className="flex items-start gap-3 bg-amber-500/10 border border-amber-500/20 rounded-lg px-4 py-3">
          <AlertTriangle size={16} className="text-amber-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm text-amber-300 font-medium">Sin créditos de recepción</p>
            <p className="text-xs text-amber-400/70 mt-0.5">
              Recarga créditos para registrar facturas recibidas.
            </p>
          </div>
        </div>
      )}

      {/* Zona de carga */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
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
          <p className="text-xs text-gray-600 mt-2">Solo archivos .xml de facturas electrónicas SRI</p>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept=".xml"
          onChange={onFileChange}
          className="hidden"
        />
      </div>

      {error && (
        <div className="flex items-start gap-3 bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3">
          <AlertTriangle size={16} className="text-red-400 shrink-0 mt-0.5" />
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      {/* Tips */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 space-y-2">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">¿Cómo obtengo el XML?</p>
        <div className="space-y-1.5 text-xs text-gray-500">
          <p>· El proveedor debe enviarte el XML por email junto con el PDF.</p>
          <p>· También puedes descargarlo desde el portal del SRI con tu clave de acceso.</p>
          <p>· Algunos sistemas como Kipu adjuntan el XML automáticamente al email.</p>
        </div>
      </div>

      <div className="flex items-center justify-between text-xs text-gray-600">
        <span>Créditos de recepción: {empresa?.balance_recepcion ?? 0}</span>
        <button
          onClick={() => router.push("/facturas/recibidas")}
          className="text-indigo-400 hover:text-indigo-300 transition-colors"
        >
          Ver historial →
        </button>
      </div>
    </div>
  );
}