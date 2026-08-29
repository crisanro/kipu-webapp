// app/(dashboard)/planes/exitoso/page.tsx
"use client";
import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import api from "@/lib/api";
import { useAuthStore } from "@/store/auth.store";
import {
  CheckCircle2, Zap, CreditCard, ArrowRight,
  FileText, Loader2, Sparkles,
} from "lucide-react";
import { clsx } from "clsx";

export default function PagoExitosoPage() {
  const params  = useSearchParams();
  const router  = useRouter();
  const { updateEmpresa, empresa } = useAuthStore();

  const tipo    = params.get("tipo")    ?? "creditos";   // creditos | suscripcion
  const plan    = params.get("plan")    ?? "";
  const periodo = params.get("periodo") ?? "";
  const cantidadParam = parseInt(params.get("cantidad") ?? "0");

  const [balance,  setBalance]  = useState<number | null>(null);
  const [loading,  setLoading]  = useState(true);

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
    <div className="min-h-screen flex items-center justify-center p-4 bg-gray-950">
      <div className="w-full max-w-md space-y-6">

        {/* Icono animado */}
        <div className="flex justify-center">
          <div className="relative">
            <div className="w-24 h-24 rounded-full bg-emerald-500/20 flex items-center justify-center animate-pulse">
              <div className="w-16 h-16 rounded-full bg-emerald-500/30 flex items-center justify-center">
                <CheckCircle2 size={36} className="text-emerald-400" />
              </div>
            </div>
            <div className="absolute -top-1 -right-1">
              <Sparkles size={20} className="text-yellow-400" />
            </div>
          </div>
        </div>

        {/* Título */}
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold text-white">¡Pago exitoso!</h1>
          <p className="text-gray-400 text-sm">
            {esCreditos
              ? "Tus créditos ya están disponibles en tu cuenta."
              : "Tu suscripción está activa. Bienvenido a Kipu."}
          </p>
        </div>

        {/* Card detalle */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 space-y-4">

          {/* Qué compraron */}
          <div className="flex items-center gap-3">
            <div className={clsx(
              "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
              esCreditos ? "bg-yellow-400/10" : "bg-indigo-600/20"
            )}>
              {esCreditos
                ? <Zap size={20} className="text-yellow-400" />
                : <CreditCard size={20} className="text-indigo-400" />
              }
            </div>
            <div>
              <p className="text-white font-semibold">{tituloPlan}</p>
              <p className="text-xs text-gray-500">
                {esCreditos
                  ? "Créditos para emitir comprobantes"
                  : "Emisión ilimitada · Sistema contable · Soporte"
                }
              </p>
            </div>
          </div>

          {/* Balance actualizado (créditos) */}
          {esCreditos && (
            <div className="bg-yellow-400/5 border border-yellow-500/20 rounded-xl px-4 py-3">
              {loading ? (
                <div className="flex items-center gap-2 text-gray-500 text-sm">
                  <Loader2 size={14} className="animate-spin" />
                  Actualizando balance...
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">Balance actual</span>
                  <span className="text-xl font-bold text-yellow-400">
                    {balance ?? "—"} créditos
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Estado suscripción */}
          {esSuscripcion && (
            <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl px-4 py-3">
              {loading ? (
                <div className="flex items-center gap-2 text-gray-500 text-sm">
                  <Loader2 size={14} className="animate-spin" />
                  Activando suscripción...
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">Estado</span>
                  <span className="text-sm font-bold text-emerald-400">
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
                  <CheckCircle2 size={13} className="text-emerald-400 shrink-0" />
                  <p className="text-xs text-gray-400">{item}</p>
                </div>
              ))}
            </div>
          )}

          {/* Factura */}
          <p className="text-[11px] text-gray-600 text-center pt-1">
            📧 Recibirás tu factura electrónica por correo en los próximos minutos.
          </p>
        </div>

        {/* Botones */}
        <div className="space-y-3">
          <Link href="/documentos/nueva"
            className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm transition-colors">
            <FileText size={16} />
            Emitir primer comprobante
            <ArrowRight size={16} />
          </Link>
          <Link href="/dashboard"
            className="flex items-center justify-center gap-2 w-full py-3 rounded-xl border border-gray-700 text-gray-400 hover:text-white hover:border-gray-600 text-sm transition-colors">
            Ir al dashboard
          </Link>
        </div>

        {/* Link planes */}
        <p className="text-center text-xs text-gray-600">
          ¿Tienes dudas?{" "}
          <Link href="/planes" className="text-indigo-400 hover:text-indigo-300">
            Ver mi plan
          </Link>
        </p>

      </div>
    </div>
  );
}