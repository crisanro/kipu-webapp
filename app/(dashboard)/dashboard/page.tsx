"use client";
import dynamic from "next/dynamic";
import useSWR from "swr";
import api from "@/lib/api";
import { useAuthStore } from "@/store/auth.store";
import { useSandboxStore } from "@/store/sandbox.store";
import { Loader2, AlertTriangle, Sparkles } from "lucide-react";
import Link from "next/link";
import Checklist, { HealthData } from "@/components/Checklist";
import DeclaracionWidget from "@/components/DeclaracionWidget";
import StatsGrid from "./components/StatsGrid";
import UltimosDocumentos from "./components/UltimosDocumentos";
import DocumentosRecibidos from "./components/DocumentosRecibidos";
import AccesosRapidos from "./components/AccesosRapidos";
import OfertaRenta from "@/components/renta/OfertaRenta";
import { ES_APP_NATIVA, rutaFueraDelPlan } from "@/lib/plataforma";
import { usePermiso } from "@/hooks/usePermiso";

// El gráfico usa recharts (~370 KB): se baja aparte, después de pintar el panel.
// Mientras tanto, un esqueleto del mismo tamaño para que la pantalla no salte.
const GraficoFacturacion = dynamic(() => import("./components/GraficoFacturacion"), {
  ssr: false,
  loading: () => (
    <div
      className="rounded-xl p-5 h-full"
      style={{ background: "var(--kipu-surface)", border: "1px solid var(--kipu-border)" }}
      aria-busy="true"
      aria-label="Cargando gráfico"
    >
      <div className="mb-4 space-y-2">
        <div className="h-4 w-40 rounded animate-pulse" style={{ background: "var(--kipu-border)" }} />
        <div className="h-3 w-28 rounded animate-pulse" style={{ background: "var(--kipu-border)" }} />
      </div>
      <div className="h-[200px] rounded-lg animate-pulse" style={{ background: "color-mix(in srgb, var(--kipu-border) 50%, transparent)" }} />
    </div>
  ),
});

interface DashboardData {
  health?: HealthData;
  resumen?: any;
  documentos?: any[];
  recibidos_recientes?: any[];
  declaracion?: any;
  periodo?: { desde: string; hasta: string };
}

const fetcher = ([url]: [string, number]) => api.get(url).then((r) => r.data.data ?? r.data);

export default function DashboardPage() {
  const empresa = useAuthStore((s) => s.empresa);
  const { activo: sandbox } = useSandboxStore();

  const hoyStr = new Date().toLocaleDateString("en-CA", { timeZone: "America/Guayaquil" });
  const [anio, mes] = hoyStr.split("-");
  const primerDia = `${anio}-${mes}-01`;

  // La clave incluye la empresa: nunca se muestran cifras de otra empresa
  const { data, isLoading, error, mutate } = useSWR<DashboardData>(
    empresa?.id
      ? [`/api/v1/app/dashboard?fecha_inicio=${primerDia}&fecha_fin=${hoyStr}&sandbox=${sandbox}`, empresa.id]
      : null,
    fetcher,
    {
      revalidateOnFocus:     true,
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
  // sandbox va en la clave: al cambiarlo SWR recarga solo (un mutate() aquí
  // duplicaba la petición al abrir el dashboard)

  // Lo mismo que entrega la API (dashboard.py): cada parte, con el permiso de su pantalla
  const verDocumentos = usePermiso("descargar");
  const verRecibidos  = usePermiso("documentos_recibidos") && !rutaFueraDelPlan("/documentos/recibidos", empresa);

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
                ? "var(--kipu-sandbox)"
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

      {/* Checklist onboarding (incluye paso 6: activar producción) */}
      {data?.health && !data.health.en_produccion && (
        <Checklist health={data.health} compact onUpdate={() => mutate()} />
      )}

      {/* Widget declaraciones */}
      {declaracion && (
        <DeclaracionWidget data={declaracion} onDeclarado={() => mutate()} />
      )}

      {/* Temporada de renta (enero a inicios de marzo): Kipu Renta */}
      <OfertaRenta variante="dashboard" />

      {/* Plan gratis: no necesita un plan para facturar (ofrece planes: solo web) */}
      {!ES_APP_NATIVA && empresa && !empresa.suscripcion_activa && empresa.emision_gratis && (
        <div
          className="flex items-start gap-3 rounded-xl px-4 py-3"
          style={{
            background: "color-mix(in srgb, var(--kipu-accent) 8%, transparent)",
            border:     "1px solid color-mix(in srgb, var(--kipu-accent) 25%, transparent)",
          }}
        >
          <Sparkles size={16} className="shrink-0 mt-0.5" style={{ color: "var(--kipu-accent)" }} />
          <div>
            <p className="text-sm font-semibold" style={{ color: "var(--kipu-text)" }}>
              Estás en el plan gratis: no necesitas pagar para facturar
            </p>
            <p className="text-xs mt-0.5" style={{ color: "var(--kipu-subtle)" }}>
              Emites tus facturas desde el panel sin costo y cargas tus compras. Cuando quieras más:
              con <b>Kipu Pro</b> emites sin límite, ves el formulario 104 completo con alertas y sumas usuarios;
              con <b>Kipu Al Día</b>, el equipo de Kipu presenta tus declaraciones.{" "}
              <Link href="/planes" className="underline font-medium" style={{ color: "var(--kipu-accent)" }}>
                Ver planes
              </Link>
            </p>
          </div>
        </div>
      )}

      {/* Alerta suscripción inactiva (sin el plan gratis) */}
      {empresa && !empresa.suscripcion_activa && !empresa.emision_gratis && (
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
              {ES_APP_NATIVA ? "Sin comprobantes disponibles" : "Suscripción inactiva"}
            </p>
            <p className="text-xs mt-0.5" style={{ color: "color-mix(in srgb, var(--kipu-danger) 70%, transparent)" }}>
              {ES_APP_NATIVA ? (
                "Tu plan actual no tiene comprobantes disponibles para emitir."
              ) : (
                <>
                  Activa tu plan para emitir comprobantes.{" "}
                  <Link
                    href="/planes"
                    className="underline"
                    style={{ color: "var(--kipu-danger)" }}
                  >
                    Ver planes
                  </Link>
                </>
              )}
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
            {verDocumentos && (
              <div className="lg:col-span-2">
                <GraficoFacturacion documentos={data?.documentos ?? []} />
              </div>
            )}
            <AccesosRapidos />
          </div>
          {/* App de las tiendas: Recibidos solo si el plan lo incluye (lib/plataforma.ts) */}
          {verDocumentos && verRecibidos ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <UltimosDocumentos documentos={data?.documentos ?? []} />
              <DocumentosRecibidos docs={data?.recibidos_recientes ?? []} />
            </div>
          ) : verDocumentos ? (
            <UltimosDocumentos documentos={data?.documentos ?? []} />
          ) : verRecibidos ? (
            <DocumentosRecibidos docs={data?.recibidos_recientes ?? []} />
          ) : null}
        </div>
      )}

    </div>
  );
}