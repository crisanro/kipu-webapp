// app/(dashboard)/reportes/renta/page.tsx — /reportes/renta?anio=2025
// (antes /reportes/renta/[anio]; ver lib/rutas.ts)

"use client";
import { useState, useEffect } from "react";
import { notFound, useRouter, useSearchParams } from "next/navigation";
import api from "@/lib/api";
import OfertaRenta from "@/components/renta/OfertaRenta";
import Alertas104, { type Alerta104 } from "../_components/Alertas104";
import { ArrowLeft, RefreshCw, FileText, AlertTriangle, TrendingUp, TrendingDown, Receipt } from "lucide-react";
import { montoEC } from "@/lib/dinero";

export default function ReporteRentaPage() {
  const anio = useSearchParams().get("anio");
  if (!anio) notFound();
  return <ReporteRenta key={anio} anio={anio} />;
}

function ReporteRenta({ anio }: { anio: string }) {
  const router = useRouter();

  const [data, setData] = useState<any>(null);
  const [alertas, setAlertas] = useState<Alerta104[]>([]);   // SOLO_KIPU (no viene con datos de ejemplo)
  const [loading, setLoading] = useState(true);

  const cargar = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/api/v1/app/declaraciones/renta?anio=${anio}`);
      // Acceder a .resumen.resumen_anual en lugar de .resumen_anual directo
      const resumenAnual = res.data.data?.resumen?.resumen_anual || res.data.data?.resumen_anual;
      setData(resumenAnual);
      setAlertas(res.data.alertas ?? []);
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
          <button onClick={() => router.push("/reportes")} aria-label="Volver a reportes" className="hidden p-2 rounded-lg border border-[var(--kipu-border)] lg:inline-flex">
            <ArrowLeft size={16} />
          </button>
          <div>
            <h1 className="text-xl font-bold text-texto">Consolidado Anual de Renta ({anio})</h1>
            <p className="text-xs text-sutil">Resumen informativo de comprobantes para el Formulario 102</p>
          </div>
        </div>
        <button onClick={cargar} className="p-2 rounded-lg border border-[var(--kipu-border)]">
          <RefreshCw size={15} />
        </button>
      </div>

      {/* Nota legal / Informativa */}
      <div className="p-3.5 rounded-xl flex items-start gap-2.5 text-xs bg-alerta/8 border border-alerta/25 text-alerta">
        <AlertTriangle size={16} className="shrink-0 mt-0.5" />
        <p>
          <strong>Aviso Informativo:</strong> Este reporte consolida únicamente las facturas, notas de crédito, liquidaciones y retenciones registradas en Kipu durante el año {anio}. Recuerda incorporar en el portal del SRI tus ingresos por relación de dependencia, arrendamientos, rendimientos financieros y gastos personales.
        </p>
      </div>

      {/* Solo lo emitido en Kipu: el año de la primera venta en Kipu (o antes) */}
      <Alertas104 alertas={alertas} encabezado={false} />

      {/* Kipu Renta: si es el año que se vende, que el equipo de Kipu la presente */}
      <OfertaRenta variante="reportes" anio={Number(anio)} />

      {/* Tarjetas Principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* EMITIDOS / INGRESOS */}
        <div className="p-4 rounded-xl space-y-3 bg-superficie border border-borde">
          <div className="flex items-center gap-2 pb-2 border-b border-borde">
            <TrendingUp size={16} className="text-emerald-500" />
            <h3 className="text-sm font-semibold text-texto">Comprobantes Emitidos (Ingresos)</h3>
          </div>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-sutil">Ventas brutas (FAC + NDB)</span>
              <span className="font-mono font-medium">${montoEC(data?.ventas_brutas)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sutil">(-) Notas de crédito emitidas</span>
              <span className="font-mono text-red-400">-${montoEC(data?.notas_credito_emitidas)}</span>
            </div>
            {/* Liquidaciones de compra a tu nombre: las emitió tu cliente, son ventas tuyas */}
            {(data?.ventas_liquidaciones_recibidas ?? 0) > 0 && (
              <div className="flex justify-between">
                <span className="text-sutil">(+) Ventas con liquidación de compra (la emitió tu cliente)</span>
                <span className="font-mono font-medium">${montoEC(data?.ventas_liquidaciones_recibidas)}</span>
              </div>
            )}
            <div className="pt-2 flex justify-between font-bold text-sm border-t border-borde">
              <span>{(data?.ventas_liquidaciones_recibidas ?? 0) > 0 ? "Total Ingresos" : "Total Ingresos Facturados"}</span>
              <span className="text-emerald-500">${montoEC(data?.ventas_netas)}</span>
            </div>
          </div>
        </div>

        {/* RECIBIDOS / DEDUCIBLES */}
        <div className="p-4 rounded-xl space-y-3 bg-superficie border border-borde">
          <div className="flex items-center gap-2 pb-2 border-b border-borde">
            <TrendingDown size={16} className="text-sky-400" />
            <h3 className="text-sm font-semibold text-texto">Comprobantes Recibidos (Gastos Deducibles)</h3>
          </div>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-sutil">Compras recibidas deducibles</span>
              <span className="font-mono font-medium">${montoEC(data?.compras_deducibles)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sutil">(+) Liquidaciones de compra emitidas</span>
              <span className="font-mono font-medium">${montoEC(data?.liquidaciones_compras)}</span>
            </div>
            <div className="pt-2 flex justify-between font-bold text-sm border-t border-borde">
              <span>Total Gastos Deducibles</span>
              <span className="text-sky-400">${montoEC(data?.total_gastos_deducibles)}</span>
            </div>
            {/* Activos fijos: fuera del total, se deducen por depreciación */}
            {(data?.activos_fijos_comprados ?? 0) > 0 && (
              <div className="pt-2 space-y-0.5 border-t border-borde">
                <div className="flex justify-between">
                  <span className="text-sutil">Activos fijos comprados en el año</span>
                  <span className="font-mono font-medium">${montoEC(data?.activos_fijos_comprados)}</span>
                </div>
                <p className="text-[10px] text-sutil">Se deducen por depreciación, no completos.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* RETENCIONES DE RENTA */}
      <div className="p-4 rounded-xl space-y-3 bg-superficie border border-borde">
        <div className="flex items-center gap-2 pb-2 border-b border-borde">
          <Receipt size={16} className="text-amber-400" />
          <h3 className="text-sm font-semibold text-texto">Retenciones de Impuesto a la Renta ({anio})</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div className="p-3 rounded-lg bg-info/8 border border-info/20">
            <p className="text-[10px] uppercase font-bold text-sky-400">Retenciones Recibidas (Crédito a tu favor)</p>
            <p className="text-lg font-bold text-sky-400 mt-1">${montoEC(data?.retenciones_renta_recibidas)}</p>
            <p className="text-[10px] text-[var(--kipu-subtle)] mt-1">Retenciones que te hicieron tus clientes en ventas (Casillero 855/841)</p>
          </div>
          <div className="p-3 rounded-lg" style={{ background: "color-mix(in srgb, #f59e0b 8%, transparent)", border: "1px solid color-mix(in srgb, #f59e0b 20%, transparent)" }}>
            <p className="text-[10px] uppercase font-bold text-amber-400">Retenciones Emitidas (A tus proveedores)</p>
            <p className="text-lg font-bold text-amber-400 mt-1">${montoEC(data?.retenciones_renta_emitidas)}</p>
            <p className="text-[10px] text-[var(--kipu-subtle)] mt-1">Retenciones de Renta que realizaste a tus proveedores en compras</p>
          </div>
        </div>
      </div>
    </div>
  );
}