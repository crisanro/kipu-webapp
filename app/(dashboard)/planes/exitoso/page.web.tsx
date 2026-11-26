"use client";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import api from "@/lib/api";
import { useAuthStore } from "@/store/auth.store";
import {
  CheckCircle2, Zap, CreditCard, ArrowRight,
  FileText, Sparkles, KeyRound,
} from "lucide-react";
import { INCLUYE_AL_DIA, INCLUYE_PRO } from "@/lib/planes";

export default function PagoExitosoPage() {
  const params  = useSearchParams();
  const { updateEmpresa, empresa } = useAuthStore();

  const tipo    = params.get("tipo")    ?? "creditos";   // creditos | suscripcion
  const plan    = params.get("plan")    ?? "";
  const periodo = params.get("periodo") ?? "";
  const cantidadParam = parseInt(params.get("cantidad") ?? "0");

  const [balance, setBalance] = useState<number | null>(null);
  // Stripe confirma el pago por webhook unos segundos DESPUÉS de volver a esta
  // página: se consulta hasta que se refleje (máx. 40 s) en vez de una sola vez.
  const [estado, setEstado] = useState<"esperando" | "confirmado" | "demora">("esperando");
  const loading = estado === "esperando";

  useEffect(() => {
    let cancelado = false;
    let timer: ReturnType<typeof setTimeout>;
    const inicio       = Date.now();
    const saldoInicial = empresa?.balance_api ?? 0;

    const revisar = async () => {
      try {
        if (tipo === "creditos") {
          const res = await api.get("/api/v1/app/creditos/balance");
          const nuevo = res.data.balance ?? 0;
          if (cancelado) return;
          setBalance(nuevo);
          if (nuevo > saldoInicial) {
            if (empresa) updateEmpresa({ ...empresa, balance_api: nuevo });
            setEstado("confirmado");
            return;
          }
        } else {
          const res = await api.get("/api/v1/app/usuarios/empresas");
          const actual = (res.data.data ?? []).find((e: { id: number }) => e.id === empresa?.id);
          if (cancelado) return;
          if (actual?.suscripcion_activa) {
            updateEmpresa(actual);          // la pantalla de emitir ya deja facturar
            setEstado("confirmado");
            return;
          }
        }
      } catch (e) {
        console.error(e);
      }
      if (cancelado) return;
      if (Date.now() - inicio < 40_000) timer = setTimeout(revisar, 2500);
      else setEstado("demora");
    };

    timer = setTimeout(revisar, 1500);
    return () => { cancelado = true; clearTimeout(timer); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tipo]);

  const esCreditos    = tipo === "creditos";
  const esSuscripcion = tipo === "suscripcion";
  const esAlDia       = esSuscripcion && plan === "AL_DIA";

  const tituloPlan = esCreditos
    ? `${cantidadParam} créditos`
    : plan === "AL_DIA"
      ? "Kipu Al Día"
      : `Plan ${plan === "PRO" || !plan ? "Pro" : plan} ${periodo === "MENSUAL" ? "Mensual" : "Anual"}`;

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">

        {/* Icono animado */}
        <div className="flex justify-center">
          <div className="relative">
            <div
              className="w-24 h-24 rounded-full flex items-center justify-center animate-pulse bg-exito/20"
            >
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center bg-exito/30"
              >
                <CheckCircle2 className="text-exito" size={36} />
              </div>
            </div>
            <div className="absolute -top-1 -right-1">
              <Sparkles className="text-alerta" size={20} />
            </div>
          </div>
        </div>

        {/* Título */}
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold text-texto">¡Pago exitoso!</h1>
          <p className="text-sm text-sutil">
            {estado !== "confirmado"
              ? (esCreditos ? "Tu pago fue recibido. Estamos acreditando tus créditos."
                            : "Tu pago fue recibido. Estamos activando tu suscripción.")
              : (esCreditos ? "Tus créditos ya están disponibles en tu cuenta."
                            : "Tu suscripción está activa. Bienvenido a Kipu.")}
          </p>
        </div>

        {/* Card detalle */}
        <div
          className="rounded-2xl p-5 space-y-4 bg-superficie border border-borde"
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
                ? <Zap className="text-alerta" size={20} />
                : <CreditCard className="text-acento" size={20} />
              }
            </div>
            <div>
              <p className="font-semibold text-texto">{tituloPlan}</p>
              <p className="text-xs text-sutil">
                {esCreditos
                  ? "Créditos para emitir comprobantes"
                  : esAlDia
                    ? "Facturación sin límite · Declaraciones de IVA y renta"
                    : "Facturación sin límite · Reportes para el SRI · Soporte"
                }
              </p>
            </div>
          </div>

          {/* Balance actualizado (créditos) */}
          {esCreditos && (
            <div
              className="rounded-xl px-4 py-3 bg-alerta/5 border border-alerta/20"
            >
              {loading ? (
                <div className="flex items-center gap-2 text-sm text-sutil">
                  <div
                    className="w-3.5 h-3.5 border-2 border-t-transparent rounded-full animate-spin"
                    style={{ borderColor: "currentColor", borderTopColor: "transparent" }}
                  />
                  Confirmando tu pago con el banco...
                </div>
              ) : estado === "demora" ? (
                <p className="text-xs text-sutil">
                  Recibimos tu pago. Los créditos se acreditarán en unos minutos y te avisaremos con una notificación.
                </p>
              ) : (
                <div className="flex items-center justify-between">
                  <span className="text-xs text-sutil">Balance actual</span>
                  <span className="text-xl font-bold text-alerta">
                    {balance ?? "—"} créditos
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Estado suscripción */}
          {esSuscripcion && (
            <div
              className="rounded-xl px-4 py-3 bg-exito/5 border border-exito/20"
            >
              {loading ? (
                <div className="flex items-center gap-2 text-sm text-sutil">
                  <div
                    className="w-3.5 h-3.5 border-2 border-t-transparent rounded-full animate-spin"
                    style={{ borderColor: "currentColor", borderTopColor: "transparent" }}
                  />
                  Confirmando tu pago con el banco...
                </div>
              ) : estado === "confirmado" ? (
                <div className="flex items-center justify-between">
                  <span className="text-xs text-sutil">Estado</span>
                  <span className="text-sm font-bold text-exito">
                    ✅ Activo
                  </span>
                </div>
              ) : (
                <p className="text-xs text-sutil">
                  Recibimos tu pago. La activación está tardando un poco más de lo normal:
                  te avisaremos con una notificación apenas quede lista (normalmente en minutos).
                </p>
              )}
            </div>
          )}

          {/* Incluye (suscripción) */}
          {esSuscripcion && (
            <div className="space-y-2 pt-1">
              {/* Las mismas listas que la página de Planes (lib/planes.ts) */}
              {(esAlDia
                // El horario es el de los términos de Al Día (app/legal/kipu_al_dia_v1.md, en el backend)
                ? [...INCLUYE_AL_DIA, "Soporte de lunes a viernes, de 8:00 a 17:00"]
                : INCLUYE_PRO
              ).map((item, i) => (
                <div key={i} className="flex items-center gap-2">
                  <CheckCircle2 size={13} className="shrink-0 text-exito" />
                  <p className="text-xs text-sutil">{item}</p>
                </div>
              ))}
            </div>
          )}

          {/* Factura */}
          <p className="text-[11px] text-center pt-1" style={{ color: "var(--kipu-subtle)" }}>
            📧 Recibirás tu factura electrónica por correo en los próximos minutos.
          </p>
        </div>

        {/* Kipu Al Día: sin la clave del SRI no podemos declarar */}
        {esAlDia && (
          <div
            className="rounded-2xl p-5 space-y-3 bg-acento/10 border border-acento/40"
          >
            <div className="flex items-center gap-2">
              <KeyRound className="text-acento" size={18} />
              <p className="font-semibold text-texto">Último paso: guarda tu clave del SRI</p>
            </div>
            <p className="text-sm text-tenue">
              Sin ella no podemos presentar tus declaraciones. Queda cifrada, solo la usa el equipo de Kipu
              y ves cada vez que alguien la consulta.
            </p>
            {estado === "confirmado" || estado === "demora" ? (
              <Link
                href="/al-dia#clave-sri"
                className="flex items-center justify-center gap-2 w-full py-3 rounded-xl text-white font-semibold text-sm bg-acento"
              >
                <KeyRound size={16} />
                Guardar mi clave del SRI
                <ArrowRight size={16} />
              </Link>
            ) : (
              <p className="text-xs text-sutil">
                En cuanto confirmemos tu pago aparecerá aquí el botón para guardarla.
              </p>
            )}
          </div>
        )}

        {/* Botones */}
        <div className="space-y-3">
          <Link
            href="/documentos/emitir"
            className="flex items-center justify-center gap-2 w-full py-3 rounded-xl text-sm transition-colors"
            style={esAlDia
              ? { border: "1px solid var(--kipu-border)", color: "var(--kipu-text)", background: "var(--kipu-surface)" }
              : { background: "var(--kipu-accent)", color: "#FFFFFF", fontWeight: 600 }}
          >
            <FileText size={16} />
            Emitir primer comprobante
            <ArrowRight size={16} />
          </Link>
          <Link
            href="/dashboard"
            className="flex items-center justify-center gap-2 w-full py-3 rounded-xl text-sm transition-colors border border-borde text-sutil bg-superficie"
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
        <p className="text-center text-xs text-sutil">
          ¿Tienes dudas?{" "}
          <Link
            href="/planes"
            className="transition-colors text-acento"
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