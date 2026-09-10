"use client";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import api from "@/lib/api";
import { useAuthStore } from "@/store/auth.store";
import {
  CheckCircle2, Zap, CreditCard, ArrowRight,
  FileText, Sparkles,
} from "lucide-react";

export default function PagoExitosoPage() {
  const params  = useSearchParams();
  const { updateEmpresa, empresa } = useAuthStore();

  const tipo    = params.get("tipo")    ?? "creditos";   // creditos | suscripcion
  const plan    = params.get("plan")    ?? "";
  const periodo = params.get("periodo") ?? "";
  const cantidadParam = parseInt(params.get("cantidad") ?? "0");

  const [balance, setBalance] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  // Recargar balance / estado suscripción
  useEffect(() => {
    const recargar = async () => {
      try {
        if (tipo === "creditos") {
          const res = await api.get("/api/v1/app/creditos/balance");
          setBalance(res.data.balance ?? 0);
        } else {
          // Actualizar empresa en el store para reflejar suscripción activa
          const res = await api.get("/api/v1/app/usuarios/empresas");
          const empresas = res.data.data ?? [];
          const actual   = empresas.find((e: any) => e.id === empresa?.id);
          if (actual) updateEmpresa(actual);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    // Pequeño delay para que el webhook de Stripe procese primero
    const t = setTimeout(recargar, 2000);
    return () => clearTimeout(t);
  }, [tipo]);

  const esCreditos    = tipo === "creditos";
  const esSuscripcion = tipo === "suscripcion";

  const tituloPlan = esCreditos
    ? `${cantidadParam} créditos`
    : `Plan ${plan === "NATURAL" ? "Natural" : "Jurídico"} ${periodo === "MENSUAL" ? "Mensual" : "Anual"}`;

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">

        {/* Icono animado */}
        <div className="flex justify-center">
          <div className="relative">
            <div
              className="w-24 h-24 rounded-full flex items-center justify-center animate-pulse"
              style={{ background: "color-mix(in srgb, var(--kipu-success) 20%, transparent)" }}
            >
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center"
                style={{ background: "color-mix(in srgb, var(--kipu-success) 30%, transparent)" }}
              >
                <CheckCircle2 size={36} style={{ color: "var(--kipu-success)" }} />
              </div>
            </div>
            <div className="absolute -top-1 -right-1">
              <Sparkles size={20} style={{ color: "var(--kipu-warning)" }} />
            </div>
          </div>
        </div>

        {/* Título */}
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold" style={{ color: "var(--kipu-text)" }}>¡Pago exitoso!</h1>
          <p className="text-sm" style={{ color: "var(--kipu-subtle)" }}>
            {esCreditos
              ? "Tus créditos ya están disponibles en tu cuenta."
              : "Tu suscripción está activa. Bienvenido a Kipu."}
          </p>
        </div>

        {/* Card detalle */}
        <div
          className="rounded-2xl p-5 space-y-4"
          style={{
            background: "var(--kipu-surface)",
            border: "1px solid var(--kipu-border)",
          }}
        >

          {/* Qué compraron */}
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
              style={{
                background: esCreditos
                  ? "color-mix(in srgb, var(--kipu-warning) 10%, transparent)"
                  : "color-mix(in srgb, var(--kipu-accent) 20%, transparent)",
              }}
            >
              {esCreditos
                ? <Zap size={20} style={{ color: "var(--kipu-warning)" }} />
                : <CreditCard size={20} style={{ color: "var(--kipu-accent)" }} />
              }
            </div>
            <div>
              <p className="font-semibold" style={{ color: "var(--kipu-text)" }}>{tituloPlan}</p>
              <p className="text-xs" style={{ color: "var(--kipu-subtle)" }}>
                {esCreditos
                  ? "Créditos para emitir comprobantes"
                  : "Emisión ilimitada · Sistema contable · Soporte"
                }
              </p>
            </div>
          </div>

          {/* Balance actualizado (créditos) */}
          {esCreditos && (
            <div
              className="rounded-xl px-4 py-3"
              style={{
                background: "color-mix(in srgb, var(--kipu-warning) 5%, transparent)",
                border: "1px solid color-mix(in srgb, var(--kipu-warning) 20%, transparent)",
              }}
            >
              {loading ? (
                <div className="flex items-center gap-2 text-sm" style={{ color: "var(--kipu-subtle)" }}>
                  <div
                    className="w-3.5 h-3.5 border-2 border-t-transparent rounded-full animate-spin"
                    style={{ borderColor: "currentColor", borderTopColor: "transparent" }}
                  />
                  Actualizando balance...
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <span className="text-xs" style={{ color: "var(--kipu-subtle)" }}>Balance actual</span>
                  <span className="text-xl font-bold" style={{ color: "var(--kipu-warning)" }}>
                    {balance ?? "—"} créditos
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Estado suscripción */}
          {esSuscripcion && (
            <div
              className="rounded-xl px-4 py-3"
              style={{
                background: "color-mix(in srgb, var(--kipu-success) 5%, transparent)",
                border: "1px solid color-mix(in srgb, var(--kipu-success) 20%, transparent)",
              }}
            >
              {loading ? (
                <div className="flex items-center gap-2 text-sm" style={{ color: "var(--kipu-subtle)" }}>
                  <div
                    className="w-3.5 h-3.5 border-2 border-t-transparent rounded-full animate-spin"
                    style={{ borderColor: "currentColor", borderTopColor: "transparent" }}
                  />
                  Activando suscripción...
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <span className="text-xs" style={{ color: "var(--kipu-subtle)" }}>Estado</span>
                  <span className="text-sm font-bold" style={{ color: "var(--kipu-success)" }}>
                    ✅ Activo
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Incluye (suscripción) */}
          {esSuscripcion && (
            <div className="space-y-2 pt-1">
              {[
                "Emisión ilimitada de comprobantes",
                "Registro de documentos recibidos",
                "Reportes IVA y Renta",
                "Hasta 5 usuarios",
                "Soporte por WhatsApp",
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-2">
                  <CheckCircle2 size={13} className="shrink-0" style={{ color: "var(--kipu-success)" }} />
                  <p className="text-xs" style={{ color: "var(--kipu-subtle)" }}>{item}</p>
                </div>
              ))}
            </div>
          )}

          {/* Factura */}
          <p className="text-[11px] text-center pt-1" style={{ color: "var(--kipu-subtle)" }}>
            📧 Recibirás tu factura electrónica por correo en los próximos minutos.
          </p>
        </div>

        {/* Botones */}
        <div className="space-y-3">
          <Link
            href="/documentos/nueva"
            className="flex items-center justify-center gap-2 w-full py-3 rounded-xl text-white font-semibold text-sm transition-colors"
            style={{ background: "var(--kipu-accent)" }}
            onMouseEnter={e => e.currentTarget.style.background = "var(--kipu-accent-h)"}
            onMouseLeave={e => e.currentTarget.style.background = "var(--kipu-accent)"}
          >
            <FileText size={16} />
            Emitir primer comprobante
            <ArrowRight size={16} />
          </Link>
          <Link
            href="/dashboard"
            className="flex items-center justify-center gap-2 w-full py-3 rounded-xl text-sm transition-colors"
            style={{
              border: "1px solid var(--kipu-border)",
              color: "var(--kipu-subtle)",
              background: "var(--kipu-surface)",
            }}
            onMouseEnter={e => {
              e.currentTarget.style.color = "var(--kipu-text)";
              e.currentTarget.style.borderColor = "color-mix(in srgb, var(--kipu-text) 30%, transparent)";
            }}
            onMouseLeave={e => {
              e.currentTarget.style.color = "var(--kipu-subtle)";
              e.currentTarget.style.borderColor = "var(--kipu-border)";
            }}
          >
            Ir al dashboard
          </Link>
        </div>

        {/* Link planes */}
        <p className="text-center text-xs" style={{ color: "var(--kipu-subtle)" }}>
          ¿Tienes dudas?{" "}
          <Link
            href="/planes"
            className="transition-colors"
            style={{ color: "var(--kipu-accent)" }}
            onMouseEnter={e => e.currentTarget.style.color = "var(--kipu-accent-h)"}
            onMouseLeave={e => e.currentTarget.style.color = "var(--kipu-accent)"}
          >
            Ver mi plan
          </Link>
        </p>

      </div>
    </div>
  );
}