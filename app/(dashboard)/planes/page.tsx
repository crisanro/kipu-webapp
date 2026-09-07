// app/(dashboard)/planes/page.tsx
"use client";
import { useState, useEffect, useCallback } from "react";
import api from "@/lib/api";
import { useAuthStore } from "@/store/auth.store";
import {
  CreditCard, Zap, Loader2, RefreshCw,
  CheckCircle2, AlertTriangle, TrendingDown, Star, ArrowRight, Info
} from "lucide-react";
import { clsx } from "clsx";

const fmt = (n: any) => parseFloat(String(n ?? 0)).toFixed(2);

interface EstadoSub {
  plan:                 string;
  periodo:              string;
  estado:               string;
  activa:               boolean;
  period_end:           string | null;
  cancel_at_period_end: boolean;
  dias_restantes:       number | null;
}
interface PlanCredito {
  id:                 number;
  nombre:             string;
  descripcion:        string;
  cantidad:           number;
  precio:             number;
  precio_por_credito: number;
}
interface Transaccion {
  id:           string;
  tipo:         string;
  cantidad:     number;
  precio_total: number;
  metodo_pago:  string;
  notas:        string;
  created_at:   string;
}

const PRECIO_PRO_ANUAL = 69.00;
const IVA_RATE         = 0.15;
const PRECIO_CON_IVA   = +(PRECIO_PRO_ANUAL * (1 + IVA_RATE)).toFixed(2);

const ESTADO_COLOR: Record<string, string> = {
  ACTIVO:    "text-emerald-400 bg-emerald-400/10 border-emerald-500/20",
  TRIAL:     "text-blue-400 bg-blue-400/10 border-blue-500/20",
  CANCELADO: "text-amber-400 bg-amber-400/10 border-amber-500/20",
  VENCIDO:   "text-red-400 bg-red-400/10 border-red-500/20",
};

const FEATURES: { texto: string; destacado?: boolean }[] = [
  { texto: "Emisión ilimitada desde el panel web — facturas, liquidaciones, notas de crédito/débito y retenciones" },
  { texto: "API REST — 100 comprobantes/mes incluidos · más con créditos", destacado: true },
  { texto: "Registro y clasificación fiscal de documentos recibidos" },
  { texto: "Reporte de IVA mensual y semestral para declaración 104/104A" },
  { texto: "Reporte de Renta anual" },
  { texto: "Anexo Transaccional Simplificado (ATS) mensual" },
  { texto: "Proformas comerciales con descarga en PDF" },
  { texto: "Cuentas por cobrar y cuentas por pagar" },
  { texto: "Hasta 5 usuarios por empresa" },
  { texto: "Soporte por WhatsApp" },
];

export default function PlanesPage() {
  const empresa = useAuthStore((s) => s.empresa);

  const [sub,        setSub]        = useState<EstadoSub | null>(null);
  const [balance,    setBalance]    = useState(0);
  const [planes,     setPlanes]     = useState<PlanCredito[]>([]);
  const [historial,  setHistorial]  = useState<Transaccion[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [pagando,    setPagando]    = useState<string | null>(null);
  const [abriendo,   setAbriendo]   = useState(false);
  const [cancelando, setCancelando] = useState(false);
  const [tab,        setTab]        = useState<"suscripcion" | "creditos">("suscripcion");

  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      const [resSub, resBal, resPlanes, resHist] = await Promise.all([
        api.get("/api/v1/app/suscripcion/estado"),
        api.get("/api/v1/app/creditos/balance"),
        api.get("/api/v1/app/creditos/planes"),
        api.get("/api/v1/app/creditos/historial?limit=10"),
      ]);
      setSub(resSub.data.data ?? null);
      setBalance(resBal.data.balance ?? 0);
      setPlanes(resPlanes.data.data ?? []);
      setHistorial(resHist.data.data ?? []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  const iniciarCheckout = async () => {
    setPagando("pro");
    try {
      const res = await api.post("/api/v1/app/suscripcion/checkout");
      window.location.href = res.data.checkout_url;
    } catch (err: any) {
      alert(err?.response?.data?.detail ?? "Error al iniciar el pago.");
      setPagando(null);
    }
  };

  const iniciarCheckoutCreditos = async (plan_id: number) => {
    setPagando(`cred_${plan_id}`);
    try {
      const res = await api.post("/api/v1/app/creditos/checkout", { plan_id });
      window.location.href = res.data.checkout_url;
    } catch (err: any) {
      alert(err?.response?.data?.detail ?? "Error al iniciar el pago.");
      setPagando(null);
    }
  };

  const abrirPortal = async () => {
    setAbriendo(true);
    try {
      const res = await api.post("/api/v1/app/suscripcion/portal");
      window.location.href = res.data.portal_url;
    } catch (err: any) {
      alert(err?.response?.data?.detail ?? "Error al abrir el portal.");
    } finally { setAbriendo(false); }
  };

  const cancelar = async () => {
    if (!confirm("¿Cancelar la suscripción al final del período actual?")) return;
    setCancelando(true);
    try {
      await api.post("/api/v1/app/suscripcion/cancelar");
      cargar();
    } catch (err: any) {
      alert(err?.response?.data?.detail ?? "Error al cancelar.");
    } finally { setCancelando(false); }
  };

  const reactivar = async () => {
    try {
      await api.post("/api/v1/app/suscripcion/reactivar");
      cargar();
    } catch (err: any) {
      alert(err?.response?.data?.detail ?? "Error al reactivar.");
    }
  };

  const enProduccion  = empresa?.ambiente === 2;
  const esFree        = !sub?.activa;
  const sinCreditos   = esFree && balance === 0;

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-indigo-600/20 flex items-center justify-center">
            <CreditCard size={18} className="text-indigo-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Plan y créditos</h1>
            <p className="text-sm text-gray-500">Gestiona tu suscripción y créditos de emisión</p>
          </div>
        </div>
        <button onClick={cargar} disabled={loading}
          className="p-2 rounded-lg border border-gray-700 text-gray-400 hover:text-white transition-colors disabled:opacity-40">
          {loading ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={24} className="animate-spin text-indigo-400" />
        </div>
      ) : (
        <>
          {/* ── Resumen rápido ─────────────────────────────────────────────── */}
          <div className="grid grid-cols-2 gap-3">

            {/* Card plan */}
            <div className={clsx(
              "bg-gray-900 border rounded-xl p-4 cursor-pointer transition-colors",
              tab === "suscripcion" ? "border-indigo-500" : "border-gray-800 hover:border-gray-700"
            )} onClick={() => setTab("suscripcion")}>
              <div className="flex items-center justify-between mb-2">
                <CreditCard size={16} className="text-indigo-400" />
                {sub?.activa
                  ? <span className={clsx("text-[10px] px-2 py-0.5 rounded-full border font-semibold", ESTADO_COLOR[sub.estado])}>
                      {sub.estado}
                    </span>
                  : <span className="text-[10px] px-2 py-0.5 rounded-full border border-gray-700 text-gray-400 font-semibold">
                      FREE
                    </span>
                }
              </div>
              <p className="text-lg font-bold text-white">
                {sub?.activa ? "Plan Pro" : "Plan Free"}
              </p>
              <p className="text-xs text-gray-500 mt-0.5">
                {sub?.activa
                  ? `Anual · ${sub.dias_restantes ?? 0} días restantes`
                  : balance > 0
                    ? "Emitiendo con créditos"
                    : "Sin créditos disponibles"
                }
              </p>
            </div>

            {/* Card créditos */}
            <div className={clsx(
              "bg-gray-900 border rounded-xl p-4 cursor-pointer transition-colors",
              tab === "creditos" ? "border-indigo-500" : "border-gray-800 hover:border-gray-700"
            )} onClick={() => setTab("creditos")}>
              <div className="flex items-center justify-between mb-2">
                <Zap size={16} className="text-yellow-400" />
                <span className="text-[10px] px-2 py-0.5 rounded-full border border-yellow-500/20 text-yellow-400 bg-yellow-400/10 font-semibold">
                  CRÉDITOS
                </span>
              </div>
              <p className="text-lg font-bold text-white">{balance} créditos</p>
              <p className="text-xs text-gray-500 mt-0.5">
                {balance === 0
                  ? "Sin créditos — compra un paquete"
                  : esFree
                    ? `${balance} comprobante${balance !== 1 ? "s" : ""} disponible${balance !== 1 ? "s" : ""}`
                    : "Complementan tu plan Pro"
                }
              </p>
            </div>
          </div>

          {/* Aviso pruebas */}
          {!enProduccion && (
            <div className="flex items-start gap-3 bg-amber-500/10 border border-amber-500/20 rounded-xl px-4 py-3">
              <AlertTriangle size={15} className="text-amber-400 shrink-0 mt-0.5" />
              <p className="text-sm text-amber-300">
                Estás en ambiente de pruebas. Solo puedes suscribirte en producción.
              </p>
            </div>
          )}

          {/* ── Tab: Suscripción ───────────────────────────────────────────── */}
          {tab === "suscripcion" && (
            <div className="space-y-4">

              {/* Banner explicativo — solo en Free */}
              {esFree && (
                <div className="flex items-start gap-3 bg-indigo-500/10 border border-indigo-500/20 rounded-xl px-4 py-3">
                  <Info size={15} className="text-indigo-400 shrink-0 mt-0.5" />
                  <div className="text-sm">
                    <p className="text-indigo-300 font-medium mb-0.5">Estás en Plan Free</p>
                    <p className="text-indigo-300/70 text-xs">
                      {balance > 0
                        ? `Tienes ${balance} crédito${balance !== 1 ? "s" : ""} para emitir comprobantes. Con Plan Pro emites sin límite por $${PRECIO_PRO_ANUAL}/año + IVA.`
                        : `Sin créditos disponibles. Con Plan Pro emites sin límite por $${PRECIO_PRO_ANUAL}/año + IVA.`
                      }
                    </p>
                  </div>
                </div>
              )}

              {/* Suscripción activa */}
              {sub?.activa && (
                <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
                  <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">
                    Suscripción activa
                  </h2>
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <p className="text-2xl font-bold text-white">Plan Pro</p>
                      <p className="text-sm text-gray-500">
                        Anual · IVA incluido
                        {sub.cancel_at_period_end && " · Cancela al vencer"}
                      </p>
                    </div>
                    <span className={clsx(
                      "text-xs px-3 py-1 rounded-full border font-semibold",
                      ESTADO_COLOR[sub.estado] ?? "text-gray-400 bg-gray-700 border-gray-600"
                    )}>
                      {sub.estado}
                    </span>
                  </div>
                  {sub.period_end && (
                    <div className="bg-gray-800 rounded-lg px-4 py-3 mb-4 flex justify-between text-sm">
                      <span className="text-gray-500">
                        {sub.cancel_at_period_end ? "Acceso hasta" : "Próximo cobro"}
                      </span>
                      <span className="text-white font-medium">
                        {new Date(sub.period_end).toLocaleDateString("es-EC")}
                        <span className="text-gray-500 ml-2 text-xs">({sub.dias_restantes} días)</span>
                      </span>
                    </div>
                  )}
                  <div className="flex gap-2 flex-wrap">
                    <button onClick={abrirPortal} disabled={abriendo}
                      className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-medium transition-colors">
                      {abriendo ? <Loader2 size={14} className="animate-spin" /> : <CreditCard size={14} />}
                      Gestionar facturación
                    </button>
                    {!sub.cancel_at_period_end ? (
                      <button onClick={cancelar} disabled={cancelando}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg border border-red-500/30 text-red-400 hover:bg-red-500/10 disabled:opacity-50 text-sm transition-colors">
                        {cancelando ? <Loader2 size={14} className="animate-spin" /> : null}
                        Cancelar al vencer
                      </button>
                    ) : (
                      <button onClick={reactivar}
                        className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium transition-colors">
                        Reactivar plan
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Card Plan Pro */}
              {(!sub?.activa || sub?.cancel_at_period_end) && (
                <div className="relative bg-gray-900 border border-indigo-500/60 rounded-xl p-6">
                  <div className="absolute -top-3 left-5">
                    <span className="flex items-center gap-1.5 bg-indigo-600 text-white text-xs px-3 py-1 rounded-full font-semibold shadow-lg">
                      <Star size={11} className="fill-white" />
                      Plan Pro · Pago único anual
                    </span>
                  </div>

                  <div className="mt-3 mb-5">
                    <div className="flex items-baseline gap-2">
                      <span className="text-4xl font-extrabold text-white">${PRECIO_PRO_ANUAL.toFixed(2)}</span>
                      <span className="text-gray-400 text-sm">+ IVA / año</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      ${PRECIO_CON_IVA} IVA incluido · equivale a ${(PRECIO_CON_IVA / 12).toFixed(2)}/mes
                    </p>
                  </div>

                  <div className="space-y-2.5 mb-6">
                    {FEATURES.map((f, i) => (
                      <div key={i} className="flex items-start gap-2.5">
                        <CheckCircle2 size={14} className="text-emerald-400 shrink-0 mt-0.5" />
                        <p className={clsx(
                          "text-sm",
                          f.destacado ? "text-indigo-200" : "text-gray-300"
                        )}>
                          {f.texto}
                        </p>
                      </div>
                    ))}
                  </div>

                  <button
                    onClick={iniciarCheckout}
                    disabled={!!pagando || !enProduccion}
                    className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold text-sm transition-colors flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20">
                    {pagando === "pro"
                      ? <Loader2 size={16} className="animate-spin" />
                      : <CreditCard size={16} />
                    }
                    {pagando === "pro" ? "Redirigiendo..." : "Suscribirme ahora"}
                  </button>

                  {!enProduccion && (
                    <p className="text-center text-xs text-gray-600 mt-2">
                      Disponible solo en producción
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ── Tab: Créditos ──────────────────────────────────────────────── */}
          {tab === "creditos" && (
            <div className="space-y-4">

              {/* Banner Pro — recordatorio en tab créditos */}
              {esFree && (
                <button
                  onClick={() => setTab("suscripcion")}
                  className="w-full flex items-center justify-between gap-3 bg-indigo-500/10 border border-indigo-500/20 rounded-xl px-4 py-3 text-left hover:bg-indigo-500/15 transition-colors group">
                  <div className="flex items-start gap-3">
                    <Star size={15} className="text-indigo-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm text-indigo-300 font-medium">¿Emites frecuentemente?</p>
                      <p className="text-xs text-indigo-300/70 mt-0.5">
                        Con Plan Pro a ${PRECIO_PRO_ANUAL}/año + IVA tienes emisión ilimitada sin comprar créditos.
                      </p>
                    </div>
                  </div>
                  <ArrowRight size={15} className="text-indigo-400 shrink-0 group-hover:translate-x-0.5 transition-transform" />
                </button>
              )}

              {/* Balance */}
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Balance actual</p>
                    <p className="text-4xl font-bold text-white">{balance}</p>
                    <p className="text-sm text-gray-500 mt-1">créditos disponibles</p>
                  </div>
                  <div className="w-16 h-16 rounded-2xl bg-yellow-400/10 flex items-center justify-center">
                    <Zap size={28} className="text-yellow-400" />
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t border-gray-800 text-xs text-gray-500 space-y-1">
                  <p>· 1 crédito = 1 comprobante emitido (FAC, LIQ, NCR, NDB, RET)</p>
                  <p>· No vencen nunca</p>
                  <p>· {esFree ? "Son tu único acceso para emitir en Plan Free" : "Complementan tu suscripción Pro activa"}</p>
                </div>
              </div>

              {/* Planes de créditos */}
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
                <h2 className="text-sm font-semibold text-white mb-1">Comprar créditos</h2>
                <p className="text-xs text-gray-500 mb-4">Pago único · No vencen · IVA incluido</p>

                {planes.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-4">No hay planes disponibles.</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {planes.map((p) => {
                      const esMejorValor = p.precio_por_credito === Math.min(...planes.map(x => x.precio_por_credito));
                      return (
                        <div key={p.id} className={clsx(
                          "relative border rounded-xl p-4 transition-colors",
                          esMejorValor ? "border-yellow-500/40 bg-yellow-400/5" : "border-gray-700"
                        )}>
                          {esMejorValor && (
                            <span className="absolute -top-2.5 left-3 bg-yellow-500 text-gray-900 text-[10px] px-2 py-0.5 rounded-full font-bold">
                              Mejor valor
                            </span>
                          )}
                          <div className="flex justify-between items-start mb-3">
                            <div>
                              <p className="text-base font-bold text-white">{p.cantidad} créditos</p>
                              <p className="text-xs text-gray-500">{p.nombre}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-xl font-bold text-white">${fmt(p.precio)}</p>
                              <p className="text-xs text-gray-500">${p.precio_por_credito.toFixed(3)}/crédito · IVA inc.</p>
                            </div>
                          </div>
                          {p.descripcion && (
                            <p className="text-xs text-gray-600 mb-3">{p.descripcion}</p>
                          )}
                          <button
                            onClick={() => iniciarCheckoutCreditos(p.id)}
                            disabled={!!pagando || !enProduccion}
                            className="w-full py-2 rounded-lg bg-yellow-500 hover:bg-yellow-400 disabled:opacity-50 text-gray-900 text-xs font-bold transition-colors flex items-center justify-center gap-2">
                            {pagando === `cred_${p.id}` ? <Loader2 size={12} className="animate-spin" /> : <Zap size={12} />}
                            Comprar
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Historial */}
              {historial.length > 0 && (
                <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
                  <div className="px-4 py-3 border-b border-gray-800">
                    <h2 className="text-sm font-semibold text-white">Historial de créditos</h2>
                  </div>
                  <div className="divide-y divide-gray-800">
                    {historial.map((t) => (
                      <div key={t.id} className="flex items-center justify-between px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className={clsx(
                            "w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
                            t.tipo === "BONO" || t.tipo === "RECARGA" ? "bg-emerald-400/10" : "bg-red-400/10"
                          )}>
                            {t.tipo === "BONO" || t.tipo === "RECARGA"
                              ? <Zap size={14} className="text-emerald-400" />
                              : <TrendingDown size={14} className="text-red-400" />
                            }
                          </div>
                          <div>
                            <p className="text-sm text-white font-medium">
                              {t.tipo === "BONO" ? "Bono" : t.tipo === "RECARGA" ? "Recarga" : "Consumo"}
                            </p>
                            <p className="text-xs text-gray-500">
                              {t.notas || t.metodo_pago} · {new Date(t.created_at).toLocaleDateString("es-EC")}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className={clsx("text-sm font-bold", t.cantidad > 0 ? "text-emerald-400" : "text-red-400")}>
                            {t.cantidad > 0 ? "+" : ""}{t.cantidad}
                          </p>
                          {t.precio_total > 0 && (
                            <p className="text-xs text-gray-500">${fmt(t.precio_total)}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}