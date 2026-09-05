// app/(dashboard)/planes/page.tsx
"use client";
import { useState, useEffect, useCallback } from "react";
import api from "@/lib/api";
import { useAuthStore } from "@/store/auth.store";
import {
  CreditCard, Zap, Loader2, RefreshCw,
  CheckCircle2, AlertTriangle, ChevronRight,
  TrendingDown
} from "lucide-react";
import { clsx } from "clsx";

const fmt = (n: any) => parseFloat(String(n ?? 0)).toFixed(2);

// ── Tipos ─────────────────────────────────────────────────────────────────────
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
  id:                   number;
  nombre:               string;
  descripcion:          string;
  cantidad:             number;
  precio:               number;
  precio_por_credito:   number;
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

// ── Página ────────────────────────────────────────────────────────────────────
export default function CreditosPage() {
  const empresa = useAuthStore((s) => s.empresa);

  const [sub,         setSub]         = useState<EstadoSub | null>(null);
  const [balance,     setBalance]     = useState(0);
  const [planes,      setPlanes]      = useState<PlanCredito[]>([]);
  const [historial,   setHistorial]   = useState<Transaccion[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [pagando,     setPagando]     = useState<string | null>(null);
  const [abriendo,    setAbriendo]    = useState(false);
  const [cancelando,  setCancelando]  = useState(false);
  const [tab,         setTab]         = useState<"suscripcion" | "creditos">("suscripcion");

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

  const iniciarCheckoutSub = async (plan: string, periodo: string) => {
    const key = `${plan}_${periodo}`;
    setPagando(key);
    try {
      const res = await api.post("/api/v1/app/suscripcion/checkout", { plan, periodo });
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

  const ESTADO_COLOR: Record<string, string> = {
    ACTIVO:    "text-emerald-400 bg-emerald-400/10 border-emerald-500/20",
    TRIAL:     "text-blue-400 bg-blue-400/10 border-blue-500/20",
    CANCELADO: "text-amber-400 bg-amber-400/10 border-amber-500/20",
    VENCIDO:   "text-red-400 bg-red-400/10 border-red-500/20",
  };

  const enProduccion = empresa?.ambiente === 2;

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
            <p className="text-sm text-gray-500">Suscripción mensual o créditos por uso</p>
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
          {/* Resumen rápido */}
          <div className="grid grid-cols-2 gap-3">
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
                  : <span className="text-[10px] px-2 py-0.5 rounded-full border border-gray-700 text-gray-500">
                      SIN PLAN
                    </span>
                }
              </div>
              <p className="text-lg font-bold text-white">
                {sub?.activa ? `Plan ${sub.plan}` : "Sin suscripción"}
              </p>
              <p className="text-xs text-gray-500 mt-0.5">
                {sub?.activa
                  ? `${sub.periodo === "MENSUAL" ? "Mensual" : "Anual"} · ${sub.dias_restantes ?? 0} días`
                  : "Panel web completo"
                }
              </p>
            </div>

            <div className={clsx(
              "bg-gray-900 border rounded-xl p-4 cursor-pointer transition-colors",
              tab === "creditos" ? "border-indigo-500" : "border-gray-800 hover:border-gray-700"
            )} onClick={() => setTab("creditos")}>
              <div className="flex items-center justify-between mb-2">
                <Zap size={16} className="text-yellow-400" />
                <span className="text-[10px] px-2 py-0.5 rounded-full border border-yellow-500/20 text-yellow-400 bg-yellow-400/10 font-semibold">
                  API
                </span>
              </div>
              <p className="text-lg font-bold text-white">{balance} créditos</p>
              <p className="text-xs text-gray-500 mt-0.5">Para emitir comprobantes</p>
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
              {/* Estado actual */}
              {sub?.activa && (
                <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
                  <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">
                    Suscripción activa
                  </h2>
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <p className="text-2xl font-bold text-white">Plan {sub.plan}</p>
                      <p className="text-sm text-gray-500">
                        {sub.periodo === "MENSUAL" ? "Mensual" : "Anual"} · IVA incluido
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
                        <span className="text-gray-500 ml-2 text-xs">
                          ({sub.dias_restantes} días)
                        </span>
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

              {/* Planes disponibles */}
              {(!sub?.activa || sub?.cancel_at_period_end) && (
                <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
                  <h2 className="text-sm font-semibold text-white mb-1">Planes disponibles</h2>
                  <p className="text-xs text-gray-500 mb-4">IVA incluido · Cancela cuando quieras · Hasta 5 usuarios</p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {[
                      { plan: "PROFESIONAL",  label: "Profesional",   desc: "Personas no obligadas a llevar contabilidad", mensual: 14.99, anual: 129.99, popular: false },
                      { plan: "EMPRESARIAL", label: "Empresarial",  desc: "Personas obligadas a llevar contabilidad",    mensual: 24.99, anual: 199.99, popular: false },
                    ].map((p) => (
                      <div key={p.plan} className={clsx(
                        "relative border rounded-xl p-5 space-y-3",
                        p.popular ? "border-indigo-500 bg-indigo-500/5" : "border-gray-700"
                      )}>
                        {p.popular && (
                          <span className="absolute -top-2.5 left-4 bg-indigo-600 text-white text-xs px-2.5 py-0.5 rounded-full font-semibold">
                            Recomendado
                          </span>
                        )}
                        <div>
                          <h3 className="text-base font-bold text-white">{p.label}</h3>
                          <p className="text-xs text-gray-500">{p.desc}</p>
                        </div>

                        {/* Mensual */}
                        <div className="bg-gray-800/60 rounded-lg p-3">
                          <div className="flex items-baseline justify-between mb-2">
                            <span className="text-xl font-bold text-white">${p.mensual}<span className="text-xs text-gray-500 font-normal ml-1">/mes</span></span>
                            <span className="text-xs text-emerald-400/70 font-medium">IVA incluido</span>
                          </div>
                          <button onClick={() => iniciarCheckoutSub(p.plan, "MENSUAL")}
                            disabled={!!pagando || !enProduccion}
                            className="w-full py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold transition-colors flex items-center justify-center gap-1.5">
                            {pagando === `${p.plan}_MENSUAL` ? <Loader2 size={12} className="animate-spin" /> : null}
                            Suscribir mensual
                          </button>
                        </div>

                        {/* Anual */}
                        <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-lg p-3">
                          <div className="flex items-baseline justify-between mb-1">
                            <span className="text-xl font-bold text-white">${p.anual}<span className="text-xs text-gray-500 font-normal ml-1">/año</span></span>
                            <span className="text-xs text-emerald-400 font-medium">
                              Ahorra ${((p.mensual * 12) - p.anual).toFixed(0)}
                            </span>
                          </div>
                          <p className="text-xs text-gray-500 mb-2">${(p.anual / 12).toFixed(2)}/mes · IVA incluido</p>
                          <button onClick={() => iniciarCheckoutSub(p.plan, "ANUAL")}
                            disabled={!!pagando || !enProduccion}
                            className="w-full py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-semibold transition-colors flex items-center justify-center gap-1.5">
                            {pagando === `${p.plan}_ANUAL` ? <Loader2 size={12} className="animate-spin" /> : null}
                            Suscribir anual
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Qué incluye */}
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Todos los planes incluyen</h3>
                <div className="space-y-2 mb-4">
                  {[
                    "Emisión ilimitada de facturas, liquidaciones, notas de crédito/débito y retenciones (web + API 200/mes)",
                    "Registro y clasificación fiscal de documentos recibidos",
                    "Proformas comerciales con descarga en PDF",
                    "Cuentas por cobrar y cuentas por pagar",
                    "Reportes de IVA y Renta para declaraciones",
                    "Hasta 5 usuarios por empresa",
                    "Soporte por WhatsApp",
                  ].map((item, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <CheckCircle2 size={13} className="text-emerald-400 shrink-0 mt-0.5" />
                      <p className="text-xs text-gray-400">{item}</p>
                    </div>
                  ))}
                </div>
                <div className="border-t border-gray-800 pt-3">
                  <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                    Solo plan Empresarial
                  </h3>
                  <div className="flex items-start gap-2">
                    <CheckCircle2 size={13} className="text-indigo-400 shrink-0 mt-0.5" />
                    <p className="text-xs text-gray-400">
                      Reporte ATS (Anexo Transaccional Simplificado) para empresas obligadas a presentarlo al SRI
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── Tab: Créditos API ──────────────────────────────────────────── */}
          {tab === "creditos" && (
            <div className="space-y-4">
              {/* Balance actual */}
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
                  <p>· 1 crédito = 1 comprobante emitido</p>
                  <p>· No vencen nunca</p>
                  <p>· Compatibles con suscripción activa</p>
                </div>
              </div>

              {/* Planes de créditos */}
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
                <h2 className="text-sm font-semibold text-white mb-1">Comprar créditos</h2>
                <p className="text-xs text-gray-500 mb-4">Pago único · Sin suscripción · No vencen · IVA incluido</p>

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
                            t.tipo === "BONO" || t.tipo === "RECARGA"
                              ? "bg-emerald-400/10"
                              : "bg-red-400/10"
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
                          <p className={clsx(
                            "text-sm font-bold",
                            t.cantidad > 0 ? "text-emerald-400" : "text-red-400"
                          )}>
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

              {/* Info */}
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 text-xs text-gray-500 space-y-1.5">
                <p className="font-semibold text-gray-400 mb-2">¿Para qué sirven los créditos?</p>
                <p>· Para emitir comprobantes desde el panel o vía API REST</p>
                <p>· Cada comprobante emitido (FAC, LIQ, NCR, NDB, RET) consume 1 crédito</p>
                <p>· Con suscripción activa, los créditos son adicionales</p>
                <p>· Sin suscripción, los créditos son tu acceso para emitir</p>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}