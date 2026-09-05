// app/(dashboard)/dashboard/page.tsx
"use client";
import { useEffect } from "react";
import useSWR from "swr";
import api from "@/lib/api";
import { useAuthStore } from "@/store/auth.store";
import { useSandboxStore } from "@/store/sandbox.store";
import { Loader2, AlertTriangle } from "lucide-react";
import Link from "next/link";
import Checklist, { HealthData } from "@/components/Checklist";
import DeclaracionWidget from "@/components/DeclaracionWidget";
import StatsGrid from "./components/StatsGrid";
import GraficoFacturacion from "./components/GraficoFacturacion";
import UltimosDocumentos from "./components/UltimosDocumentos";
import DocumentosRecibidos from "./components/DocumentosRecibidos";
import AccesosRapidos from "./components/AccesosRapidos";

interface DashboardData {
  health?:              HealthData;
  resumen?:             any;
  documentos?:          any[];
  recibidos_recientes?: any[];
  declaracion?:         any;
  periodo?:             { desde: string; hasta: string };
}

const fetcher = (url: string) => api.get(url).then((r) => r.data.data ?? r.data);

export default function DashboardPage() {
  const empresa = useAuthStore((s) => s.empresa);
  const { activo: sandbox } = useSandboxStore();

  const hoyStr    = new Date().toLocaleDateString("en-CA", { timeZone: "America/Guayaquil" });
  const [anio, mes] = hoyStr.split("-");
  const primerDia = `${anio}-${mes}-01`;

  const { data, isLoading, mutate } = useSWR<DashboardData>(
    `/api/v1/app/dashboard?fecha_inicio=${primerDia}&fecha_fin=${hoyStr}&sandbox=${sandbox}`,
    fetcher,
    {
      revalidateOnFocus:     false,
      revalidateOnReconnect: true,
      revalidateOnMount:     true,
      dedupingInterval:      5000,
    }
  );

  useEffect(() => {
    mutate();
  }, [sandbox]);

  const nombre       = empresa?.nombre_comercial || empresa?.razon_social || "tu empresa";
  const esProduccion = empresa?.ambiente === 2;
  const declaracion  = data?.declaracion;

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-6xl mx-auto">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Hola 👋</h1>
          <p className="text-sm text-gray-400 mt-0.5 truncate max-w-xs">
            {nombre} ·{" "}
            <span className={sandbox ? "text-blue-400" : esProduccion ? "text-emerald-400" : "text-amber-400"}>
              {sandbox ? "🧪 Sandbox" : esProduccion ? "🟢 Producción" : "🟡 Pruebas"}
            </span>
          </p>
        </div>
        <Link
          href="/documentos/emitir/fac"
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold transition-colors shadow-lg shadow-indigo-500/20"
        >
          <span className="text-base">+</span>
          <span className="hidden sm:inline">Nueva Factura</span>
        </Link>
      </div>

      {/* Checklist onboarding */}
      {data?.health && !data.health.listo_produccion && (
        <Checklist health={data.health} compact />
      )}

      {/* Widget declaraciones */}
      {declaracion && (
        <DeclaracionWidget
          data={declaracion}
          onDeclarado={() => mutate()}
        />
      )}

      {/* Alerta pruebas */}
      {!esProduccion && (
        <div className="flex items-start gap-3 bg-amber-500/10 border border-amber-500/20 rounded-xl px-4 py-3">
          <AlertTriangle size={16} className="text-amber-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm text-amber-300 font-semibold">Estás en ambiente de pruebas</p>
            <p className="text-xs text-amber-400/70 mt-0.5">
              Los comprobantes no son válidos ante el SRI.{" "}
              <Link href="/configuracion" className="underline hover:text-amber-300">
                Activar producción
              </Link>
            </p>
          </div>
        </div>
      )}

      {/* Alerta suscripción inactiva */}
      {empresa && !empresa.suscripcion_activa && (
        <div className="flex items-start gap-3 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
          <AlertTriangle size={16} className="text-red-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm text-red-300 font-semibold">Suscripción inactiva</p>
            <p className="text-xs text-red-400/70 mt-0.5">
              Activa tu plan para emitir comprobantes.{" "}
              <Link href="/configuracion" className="underline hover:text-red-300">
                Ver planes
              </Link>
            </p>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={28} className="animate-spin text-indigo-400" />
        </div>
      ) : (
        <div className="space-y-6">

          <StatsGrid resumen={data?.resumen} empresa={empresa} />

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2">
              <GraficoFacturacion documentos={data?.documentos ?? []} />
            </div>
            <AccesosRapidos />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <UltimosDocumentos documentos={data?.documentos ?? []} />
            <DocumentosRecibidos docs={data?.recibidos_recientes ?? []} />
          </div>

        </div>
      )}
    </div>
  );
}