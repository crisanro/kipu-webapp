// app/(dashboard)/reportes/renta/[anio]/page.tsx

"use client";
import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import api from "@/lib/api";
import { ArrowLeft, RefreshCw, FileText, AlertTriangle, TrendingUp, TrendingDown, Receipt } from "lucide-react";

const fmt = (n: number = 0) => n.toLocaleString("es-EC", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function ReporteRentaPage() {
  const params = useParams();
  const router = useRouter();
  const anio = params.anio;

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const cargar = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/api/v1/app/declaraciones/renta?anio=${anio}`);
      // Acceder a .resumen.resumen_anual en lugar de .resumen_anual directo
      const resumenAnual = res.data.data?.resumen?.resumen_anual || res.data.data?.resumen_anual;
      setData(resumenAnual);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { cargar(); }, [anio]);

  if (loading) return <div className="p-8 text-center text-xs">Cargando consolidado de Renta...</div>;

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push("/reportes")} className="p-2 rounded-lg border border-[var(--kipu-border)]">
            <ArrowLeft size={16} />
          </button>
          <div>
            <h1 className="text-xl font-bold" style={{ color: "var(--kipu-text)" }}>Consolidado Anual de Renta ({anio})</h1>
            <p className="text-xs" style={{ color: "var(--kipu-subtle)" }}>Resumen informativo de comprobantes para el Formulario 102</p>
          </div>
        </div>
        <button onClick={cargar} className="p-2 rounded-lg border border-[var(--kipu-border)]">
          <RefreshCw size={15} />
        </button>
      </div>

      {/* Nota legal / Informativa */}
      <div className="p-3.5 rounded-xl flex items-start gap-2.5 text-xs" style={{ background: "color-mix(in srgb, var(--kipu-warning) 8%, transparent)", border: "1px solid color-mix(in srgb, var(--kipu-warning) 25%, transparent)", color: "var(--kipu-warning)" }}>
        <AlertTriangle size={16} className="shrink-0 mt-0.5" />
        <p>
          <strong>Aviso Informativo:</strong> Este reporte consolida únicamente las facturas, notas de crédito, liquidaciones y retenciones registradas en Kipu durante el año {anio}. Recuerda incorporar en el portal del SRI tus ingresos por relación de dependencia, arrendamientos, rendimientos financieros y gastos personales.
        </p>
      </div>

      {/* Tarjetas Principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* EMITIDOS / INGRESOS */}
        <div className="p-4 rounded-xl space-y-3" style={{ background: "var(--kipu-surface)", border: "1px solid var(--kipu-border)" }}>
          <div className="flex items-center gap-2 pb-2" style={{ borderBottom: "1px solid var(--kipu-border)" }}>
            <TrendingUp size={16} className="text-emerald-500" />
            <h3 className="text-sm font-semibold" style={{ color: "var(--kipu-text)" }}>Comprobantes Emitidos (Ingresos)</h3>
          </div>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between">
              <span style={{ color: "var(--kipu-subtle)" }}>Ventas brutas (FAC + NDB)</span>
              <span className="font-mono font-medium">${fmt(data?.ventas_brutas)}</span>
            </div>
            <div className="flex justify-between">
              <span style={{ color: "var(--kipu-subtle)" }}>(-) Notas de crédito emitidas</span>
              <span className="font-mono text-red-400">-${fmt(data?.notas_credito_emitidas)}</span>
            </div>
            <div className="pt-2 flex justify-between font-bold text-sm" style={{ borderTop: "1px solid var(--kipu-border)" }}>
              <span>Total Ingresos Facturados</span>
              <span className="text-emerald-500">${fmt(data?.ventas_netas)}</span>
            </div>
          </div>
        </div>

        {/* RECIBIDOS / DEDUCIBLES */}
        <div className="p-4 rounded-xl space-y-3" style={{ background: "var(--kipu-surface)", border: "1px solid var(--kipu-border)" }}>
          <div className="flex items-center gap-2 pb-2" style={{ borderBottom: "1px solid var(--kipu-border)" }}>
            <TrendingDown size={16} className="text-sky-400" />
            <h3 className="text-sm font-semibold" style={{ color: "var(--kipu-text)" }}>Comprobantes Recibidos (Gastos Deducibles)</h3>
          </div>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between">
              <span style={{ color: "var(--kipu-subtle)" }}>Compras recibidas deducibles</span>
              <span className="font-mono font-medium">${fmt(data?.compras_deducibles)}</span>
            </div>
            <div className="flex justify-between">
              <span style={{ color: "var(--kipu-subtle)" }}>(+) Liquidaciones de compra emitidas</span>
              <span className="font-mono font-medium">${fmt(data?.liquidaciones_compras)}</span>
            </div>
            <div className="pt-2 flex justify-between font-bold text-sm" style={{ borderTop: "1px solid var(--kipu-border)" }}>
              <span>Total Gastos Deducibles</span>
              <span className="text-sky-400">${fmt(data?.total_gastos_deducibles)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* RETENCIONES DE RENTA */}
      <div className="p-4 rounded-xl space-y-3" style={{ background: "var(--kipu-surface)", border: "1px solid var(--kipu-border)" }}>
        <div className="flex items-center gap-2 pb-2" style={{ borderBottom: "1px solid var(--kipu-border)" }}>
          <Receipt size={16} className="text-amber-400" />
          <h3 className="text-sm font-semibold" style={{ color: "var(--kipu-text)" }}>Retenciones de Impuesto a la Renta ({anio})</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div className="p-3 rounded-lg" style={{ background: "color-mix(in srgb, #3b82f6 8%, transparent)", border: "1px solid color-mix(in srgb, #3b82f6 20%, transparent)" }}>
            <p className="text-[10px] uppercase font-bold text-sky-400">Retenciones Recibidas (Crédito a tu favor)</p>
            <p className="text-lg font-bold text-sky-400 mt-1">${fmt(data?.retenciones_renta_recibidas)}</p>
            <p className="text-[10px] text-[var(--kipu-subtle)] mt-1">Retenciones que te hicieron tus clientes en ventas (Casillero 855/841)</p>
          </div>
          <div className="p-3 rounded-lg" style={{ background: "color-mix(in srgb, #f59e0b 8%, transparent)", border: "1px solid color-mix(in srgb, #f59e0b 20%, transparent)" }}>
            <p className="text-[10px] uppercase font-bold text-amber-400">Retenciones Emitidas (A tus proveedores)</p>
            <p className="text-lg font-bold text-amber-400 mt-1">${fmt(data?.retenciones_renta_emitidas)}</p>
            <p className="text-[10px] text-[var(--kipu-subtle)] mt-1">Retenciones de Renta que realizaste a tus proveedores en compras</p>
          </div>
        </div>
      </div>
    </div>
  );
}