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
  health?: HealthData;
  resumen?: any;
  documentos?: any[];
  recibidos_recientes?: any[];
  declaracion?: any;
  periodo?: { desde: string; hasta: string };
}

const fetcher = (url: string) => api.get(url).then((r) => r.data.data ?? r.data);

export default function DashboardPage() {
  const empresa = useAuthStore((s) => s.empresa);
  const { activo: sandbox } = useSandboxStore();

  const hoyStr = new Date().toLocaleDateString("en-CA", { timeZone: "America/Guayaquil" });
  const [anio, mes] = hoyStr.split("-");
  const primerDia = `${anio}-${mes}-01`;

  const { data, isLoading, error, mutate } = useSWR<DashboardData>(
    `/api/v1/app/dashboard?fecha_inicio=${primerDia}&fecha_fin=${hoyStr}&sandbox=${sandbox}`,
    fetcher,
    {
      revalidateOnFocus:     false,
      revalidateOnReconnect: true,
      revalidateOnMount:     true,
      dedupingInterval:      5000,
      errorRetryCount:       2,
      errorRetryInterval:    3000,
      onErrorRetry: (err, _key, _cfg, revalidate, { retryCount }) => {
        if (retryCount >= 2) return;
        setTimeout(() => revalidate({ retryCount }), 3000);
      },
    }
  );

  useEffect(() => { mutate(); }, [sandbox, mutate]);

  const nombre      = empresa?.nombre_comercial || empresa?.razon_social || "tu empresa";
  const esProduccion = empresa?.ambiente === 2;
  const declaracion  = data?.declaracion;

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-6xl mx-auto">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "var(--kipu-text)" }}>
            Hola 👋
          </h1>
          <p className="text-sm mt-0.5 truncate max-w-xs" style={{ color: "var(--kipu-muted)" }}>
            {nombre} ·{" "}
            <span style={{
              color: sandbox
                ? "#60a5fa"
                : esProduccion
                  ? "var(--kipu-success)"
                  : "var(--kipu-warning)"
            }}>
              {sandbox ? "🧪 Sandbox" : esProduccion ? "🟢 Producción" : "🟡 Pruebas"}
            </span>
          </p>
        </div>
        <Link
          href="/documentos/emitir/fac"
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-white text-sm font-semibold transition-colors"
          style={{ background: "var(--kipu-accent)" }}
          onMouseEnter={e => e.currentTarget.style.background = "var(--kipu-accent-h)"}
          onMouseLeave={e => e.currentTarget.style.background = "var(--kipu-accent)"}
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
        <DeclaracionWidget data={declaracion} onDeclarado={() => mutate()} />
      )}

      {/* Alerta pruebas */}
      {!esProduccion && (
        <div
          className="flex items-start gap-3 rounded-xl px-4 py-3"
          style={{
            background: "color-mix(in srgb, var(--kipu-warning) 10%, transparent)",
            border:     "1px solid color-mix(in srgb, var(--kipu-warning) 20%, transparent)",
          }}
        >
          <AlertTriangle size={16} className="shrink-0 mt-0.5" style={{ color: "var(--kipu-warning)" }} />
          <div>
            <p className="text-sm font-semibold" style={{ color: "var(--kipu-warning)" }}>
              Estás en ambiente de pruebas
            </p>
            <p className="text-xs mt-0.5" style={{ color: "color-mix(in srgb, var(--kipu-warning) 70%, transparent)" }}>
              Los comprobantes no son válidos ante el SRI.{" "}
              <Link
                href="/configuracion"
                className="underline"
                style={{ color: "var(--kipu-warning)" }}
              >
                Activar producción
              </Link>
            </p>
          </div>
        </div>
      )}

      {/* Alerta suscripción inactiva */}
      {empresa && !empresa.suscripcion_activa && (
        <div
          className="flex items-start gap-3 rounded-xl px-4 py-3"
          style={{
            background: "color-mix(in srgb, var(--kipu-danger) 10%, transparent)",
            border:     "1px solid color-mix(in srgb, var(--kipu-danger) 20%, transparent)",
          }}
        >
          <AlertTriangle size={16} className="shrink-0 mt-0.5" style={{ color: "var(--kipu-danger)" }} />
          <div>
            <p className="text-sm font-semibold" style={{ color: "var(--kipu-danger)" }}>
              Suscripción inactiva
            </p>
            <p className="text-xs mt-0.5" style={{ color: "color-mix(in srgb, var(--kipu-danger) 70%, transparent)" }}>
              Activa tu plan para emitir comprobantes.{" "}
              <Link
                href="/configuracion"
                className="underline"
                style={{ color: "var(--kipu-danger)" }}
              >
                Ver planes
              </Link>
            </p>
          </div>
        </div>
      )}

      {/* Contenido */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={28} className="animate-spin" style={{ color: "var(--kipu-accent)" }} />
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <AlertTriangle size={28} style={{ color: "var(--kipu-danger)" }} />
          <p className="text-sm" style={{ color: "var(--kipu-muted)" }}>
            Error al cargar el dashboard.
          </p>
          <button
            onClick={() => mutate()}
            className="text-xs underline"
            style={{ color: "var(--kipu-accent)" }}
          >
            Reintentar
          </button>
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