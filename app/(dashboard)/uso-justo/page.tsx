"use client";

// Uso justo del plan gratis: nivel, cuánto lleva la empresa y "Solicitar ampliación".
// Dirección fija para enlazar desde otros productos (Wappti):
//   https://app.kipu.ec/uso-justo?ruc=<RUC>
// Con ?ruc= se abre esa empresa si el usuario pertenece a ella (si tiene varias);
// si no pertenece, se avisa y no se cambia nada. Sin sesión, después del login
// vuelve aquí (lib/volver.ts).

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { AlertTriangle, Gauge, Loader2, Sparkles } from "lucide-react";
import api from "@/lib/api";
import { useAuthStore } from "@/store/auth.store";
import { SESSION_EMPRESA_KEY } from "@/app/providers";
import SolicitarAmpliacion from "@/components/uso-justo/SolicitarAmpliacion";
import SoloWeb from "@/components/SoloWeb";
import { ES_APP_NATIVA } from "@/lib/plataforma";

interface UsoJusto {
  plan_pro:        boolean;
  emision_gratis:  boolean;
  nivel:           number;
  nivel_maximo:    number;
  limite_mes:      number;
  limite_dia:      number;
  colchon:         number;
  usados_mes:      number;
  usados_hoy:      number;
  en_colchon:      boolean;
  restantes_mes:   number;
  solicitud:       { estado: string } | null;
  puede_solicitar: boolean;
}

const n = (x: number) => x.toLocaleString("es-EC");

function Barra({ usados, limite, extra = 0 }: { usados: number; limite: number; extra?: number }) {
  const total = limite + extra;
  const pct   = Math.min(100, Math.round((usados / Math.max(total, 1)) * 100));
  const color = usados >= total ? "var(--kipu-danger)" : usados >= limite ? "var(--kipu-warning)" : "var(--kipu-accent)";
  return (
    <div className="h-2 rounded-full overflow-hidden" style={{ background: "color-mix(in srgb, var(--kipu-text) 8%, transparent)" }}>
      <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
    </div>
  );
}

export default function UsoJustoPage() {
  const params   = useSearchParams();
  const rucPedido = (params.get("ruc") ?? "").replace(/\D/g, "");
  const empresa  = useAuthStore((s) => s.empresa);
  const empresas = useAuthStore((s) => s.empresas);

  const [datos,  setDatos]  = useState<UsoJusto | null>(null);
  const [error,  setError]  = useState<string | null>(null);

  // ?ruc= de otra empresa del usuario: se abre esa (misma recarga que el selector de empresas)
  const destino   = rucPedido && empresa && empresa.ruc !== rucPedido
    ? empresas.find((e) => e.ruc === rucPedido) ?? null : null;
  const sinAcceso = !!rucPedido && !!empresa && empresa.ruc !== rucPedido && empresas.length > 0 && !destino;
  const cambiando = !!destino;

  useEffect(() => {
    if (!destino) return;
    try {
      localStorage.setItem("kipu-ext-emisor", String(destino.id));
      localStorage.setItem("kipu-ext-ruc", destino.ruc);
      localStorage.setItem("kipu-ext-razon", destino.razon_social);
      sessionStorage.clear();
      sessionStorage.setItem(SESSION_EMPRESA_KEY, String(destino.id));
    } catch {}
    window.location.replace("/uso-justo");
  }, [destino]);

  const cargar = useCallback(() => {
    return api.get("/api/v1/app/uso-justo")
      .then((r) => { setDatos(r.data.data); setError(null); })
      .catch(() => setError("No pudimos cargar tu uso justo. Vuelve a intentar en un momento."));
  }, []);

  useEffect(() => {
    if (cambiando || sinAcceso || !empresa) return;
    let vivo = true;
    api.get("/api/v1/app/uso-justo")
      .then((r) => { if (vivo) { setDatos(r.data.data); setError(null); } })
      .catch(() => { if (vivo) setError("No pudimos cargar tu uso justo. Vuelve a intentar en un momento."); });
    return () => { vivo = false; };
  }, [cambiando, sinAcceso, empresa]);

  const caja = { background: "var(--kipu-surface)", border: "1px solid var(--kipu-border)" };

  if (sinAcceso) {
    return (
      <div className="max-w-2xl mx-auto px-4 md:px-6 py-6">
        <div className="rounded-xl p-5 space-y-3" style={caja}>
          <p className="flex items-start gap-2 text-sm" style={{ color: "var(--kipu-text)" }}>
            <AlertTriangle size={16} className="mt-0.5 shrink-0" style={{ color: "var(--kipu-warning)" }} />
            Tu usuario no tiene acceso a la empresa con RUC {rucPedido}. Inicia sesión con la cuenta de esa
            empresa o pide a su administrador que te invite.
          </p>
          <Link href="/uso-justo" className="text-xs font-semibold hover:underline" style={{ color: "var(--kipu-accent)" }}>
            Ver el uso justo de {empresa?.razon_social}
          </Link>
        </div>
      </div>
    );
  }

  if (cambiando || (!datos && !error)) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 size={20} className="animate-spin" style={{ color: "var(--kipu-accent)" }} />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 md:px-6 py-4 md:py-6 space-y-4">
      <div>
        <h2 className="text-base font-semibold flex items-center gap-2" style={{ color: "var(--kipu-text)" }}>
          <Gauge size={16} style={{ color: "var(--kipu-accent)" }} /> Tu uso justo
        </h2>
        <p className="text-xs" style={{ color: "var(--kipu-subtle)" }}>
          {empresa?.razon_social} · RUC {empresa?.ruc}
        </p>
      </div>

      {error && (
        <p className="text-xs rounded-lg px-3 py-2"
           style={{ background: "color-mix(in srgb, var(--kipu-danger) 10%, transparent)", color: "var(--kipu-danger)" }}>
          {error}
        </p>
      )}

      {datos && datos.plan_pro && (
        <div className="rounded-xl p-5 text-sm" style={{ ...caja, color: "var(--kipu-text)" }}>
          Con tu plan emites sin límite: el uso justo no aplica a tu empresa.
        </div>
      )}

      {datos && !datos.plan_pro && (
        <>
          <div className="rounded-xl p-5 space-y-4" style={caja}>
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <p className="text-sm font-semibold" style={{ color: "var(--kipu-text)" }}>
                Nivel {datos.nivel} de {datos.nivel_maximo}
              </p>
              <p className="text-xs" style={{ color: "var(--kipu-subtle)" }}>
                Hasta {n(datos.limite_mes)} comprobantes al mes y {n(datos.limite_dia)} al día, gratis
              </p>
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between text-xs" style={{ color: "var(--kipu-muted)" }}>
                <span>Este mes</span>
                <span className="tabular-nums">{n(datos.usados_mes)} de {n(datos.limite_mes)}</span>
              </div>
              <Barra usados={datos.usados_mes} limite={datos.limite_mes} extra={datos.colchon} />
            </div>
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs" style={{ color: "var(--kipu-muted)" }}>
                <span>Hoy</span>
                <span className="tabular-nums">{n(datos.usados_hoy)} de {n(datos.limite_dia)}</span>
              </div>
              <Barra usados={datos.usados_hoy} limite={datos.limite_dia} />
            </div>

            {datos.en_colchon && (
              <p className="flex items-start gap-1.5 text-xs rounded-lg px-3 py-2"
                 style={{ color: "var(--kipu-warning)", background: "color-mix(in srgb, var(--kipu-warning) 10%, transparent)" }}>
                <AlertTriangle size={13} className="mt-0.5 shrink-0" />
                Llegaste a tu límite de este mes. Te {datos.restantes_mes === 1 ? "queda 1 comprobante" : `quedan ${n(datos.restantes_mes)} comprobantes`} de
                margen; después tendrás que esperar al próximo mes{ES_APP_NATIVA ? " o solicitar ampliación." : ", solicitar ampliación o pasarte a Kipu Pro."}
              </p>
            )}
            {!datos.en_colchon && datos.usados_mes >= datos.limite_mes + datos.colchon && (
              <p className="flex items-start gap-1.5 text-xs rounded-lg px-3 py-2"
                 style={{ color: "var(--kipu-danger)", background: "color-mix(in srgb, var(--kipu-danger) 10%, transparent)" }}>
                <AlertTriangle size={13} className="mt-0.5 shrink-0" />
                Usaste todo tu uso justo de este mes. Se reinicia el próximo mes.
              </p>
            )}

            <p className="text-xs" style={{ color: "var(--kipu-subtle)" }}>
              Tu límite sube solo cuando tu empresa lleva un tiempo facturando sin problemas.
              {datos.nivel < datos.nivel_maximo && " Si lo necesitas antes, pide una ampliación: es gratis."}
            </p>
            <SolicitarAmpliacion onResultado={cargar} />
          </div>

          <SoloWeb>
            <div className="rounded-xl p-5 space-y-3"
                 style={{ background: "color-mix(in srgb, var(--kipu-accent) 6%, transparent)",
                          border: "1px solid color-mix(in srgb, var(--kipu-accent) 20%, transparent)" }}>
              <p className="flex items-start gap-2 text-sm" style={{ color: "var(--kipu-text)" }}>
                <Sparkles size={15} className="mt-0.5 shrink-0" style={{ color: "var(--kipu-accent)" }} />
                Con Kipu Pro no tienes límite de uso justo: emites sin límite desde el panel y por API,
                tus facturas salen sin la marca de Kipu, y tienes el 104 con alertas y el resumen de la renta.
              </p>
              <Link
                href="/planes"
                className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-semibold text-white transition-opacity hover:opacity-90"
                style={{ background: "var(--kipu-accent)" }}
              >
                <Sparkles size={13} /> Ver Kipu Pro
              </Link>
            </div>
          </SoloWeb>
        </>
      )}
    </div>
  );
}
