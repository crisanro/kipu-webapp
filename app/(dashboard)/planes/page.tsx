"use client";
import { useState, useEffect, useCallback } from "react";
import api from "@/lib/api";
import { useAuthStore } from "@/store/auth.store";
import {
  CreditCard, Zap, RefreshCw,
  CheckCircle2, AlertTriangle, TrendingDown, Star, ArrowRight, Info
} from "lucide-react";

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

const ESTADO_COLOR: Record<string, { color: string; bg: string; border: string }> = {
  ACTIVO:    { color: "var(--kipu-success)", bg: "color-mix(in srgb, var(--kipu-success) 10%, transparent)", border: "color-mix(in srgb, var(--kipu-success) 20%, transparent)" },
  TRIAL:     { color: "#60a5fa",            bg: "color-mix(in srgb, #60a5fa 10%, transparent)",            border: "color-mix(in srgb, #60a5fa 20%, transparent)" },
  CANCELADO: { color: "var(--kipu-warning)", bg: "color-mix(in srgb, var(--kipu-warning) 10%, transparent)", border: "color-mix(in srgb, var(--kipu-warning) 20%, transparent)" },
  VENCIDO:   { color: "var(--kipu-danger)",  bg: "color-mix(in srgb, var(--kipu-danger) 10%, transparent)",  border: "color-mix(in srgb, var(--kipu-danger) 20%, transparent)" },
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

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
            style={{ background: "color-mix(in srgb, var(--kipu-accent) 20%, transparent)" }}
          >
            <CreditCard size={18} style={{ color: "var(--kipu-accent)" }} />
          </div>
          <div>
            <h1 className="text-xl font-bold" style={{ color: "var(--kipu-text)" }}>Plan y créditos</h1>
            <p className="text-sm" style={{ color: "var(--kipu-subtle)" }}>Gestiona tu suscripción y créditos de emisión</p>
          </div>
        </div>
        <button
          type="button"
          onClick={cargar}
          disabled={loading}
          className="p-2 rounded-lg transition-colors disabled:opacity-40"
          style={{
            border: "1px solid var(--kipu-border)",
            color: "var(--kipu-subtle)",
          }}
          onMouseEnter={e => {
            if (!loading) {
              e.currentTarget.style.color = "var(--kipu-text)";
              e.currentTarget.style.background = "color-mix(in srgb, var(--kipu-text) 5%, transparent)";
            }
          }}
          onMouseLeave={e => {
            if (!loading) {
              e.currentTarget.style.color = "var(--kipu-subtle)";
              e.currentTarget.style.background = "transparent";
            }
          }}
        >
          {loading ? (
            <div
              className="w-4 h-4 border-2 border-t-transparent rounded-full animate-spin"
              style={{ borderColor: "currentColor", borderTopColor: "transparent" }}
            />
          ) : (
            <RefreshCw size={16} />
          )}
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div
            className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin"
            style={{ borderColor: "var(--kipu-accent)", borderTopColor: "transparent" }}
          />
        </div>
      ) : (
        <>
          {/* ── Resumen rápido ─────────────────────────────────────────────── */}
          <div className="grid grid-cols-2 gap-3">

            {/* Card plan */}
            <div
              className="rounded-xl p-4 cursor-pointer transition-colors"
              style={{
                background: "var(--kipu-surface)",
                border: tab === "suscripcion"
                  ? "1px solid var(--kipu-accent)"
                  : "1px solid var(--kipu-border)",
              }}
              onClick={() => setTab("suscripcion")}
              onMouseEnter={e => {
                if (tab !== "suscripcion") e.currentTarget.style.borderColor = "color-mix(in srgb, var(--kipu-text) 30%, transparent)";
              }}
              onMouseLeave={e => {
                if (tab !== "suscripcion") e.currentTarget.style.borderColor = "var(--kipu-border)";
              }}
            >
              <div className="flex items-center justify-between mb-2">
                <CreditCard size={16} style={{ color: "var(--kipu-accent)" }} />
                {sub?.activa ? (
                  <span
                    className="text-[10px] px-2 py-0.5 rounded-full font-semibold"
                    style={{
                      color: (ESTADO_COLOR[sub.estado] ?? ESTADO_COLOR.ACTIVO).color,
                      background: (ESTADO_COLOR[sub.estado] ?? ESTADO_COLOR.ACTIVO).bg,
                      border: `1px solid ${(ESTADO_COLOR[sub.estado] ?? ESTADO_COLOR.ACTIVO).border}`,
                    }}
                  >
                    {sub.estado}
                  </span>
                ) : (
                  <span
                    className="text-[10px] px-2 py-0.5 rounded-full font-semibold"
                    style={{
                      border: "1px solid var(--kipu-border)",
                      color: "var(--kipu-subtle)",
                    }}
                  >
                    FREE
                  </span>
                )}
              </div>
              <p className="text-lg font-bold" style={{ color: "var(--kipu-text)" }}>
                {sub?.activa ? "Plan Pro" : "Plan Free"}
              </p>
              <p className="text-xs mt-0.5" style={{ color: "var(--kipu-subtle)" }}>
                {sub?.activa
                  ? `Anual · ${sub.dias_restantes ?? 0} días restantes`
                  : balance > 0
                    ? "Emitiendo con créditos"
                    : "Sin créditos disponibles"
                }
              </p>
            </div>

            {/* Card créditos */}
            <div
              className="rounded-xl p-4 cursor-pointer transition-colors"
              style={{
                background: "var(--kipu-surface)",
                border: tab === "creditos"
                  ? "1px solid var(--kipu-accent)"
                  : "1px solid var(--kipu-border)",
              }}
              onClick={() => setTab("creditos")}
              onMouseEnter={e => {
                if (tab !== "creditos") e.currentTarget.style.borderColor = "color-mix(in srgb, var(--kipu-text) 30%, transparent)";
              }}
              onMouseLeave={e => {
                if (tab !== "creditos") e.currentTarget.style.borderColor = "var(--kipu-border)";
              }}
            >
              <div className="flex items-center justify-between mb-2">
                <Zap size={16} style={{ color: "var(--kipu-warning)" }} />
                <span
                  className="text-[10px] px-2 py-0.5 rounded-full font-semibold"
                  style={{
                    color: "var(--kipu-warning)",
                    background: "color-mix(in srgb, var(--kipu-warning) 10%, transparent)",
                    border: "1px solid color-mix(in srgb, var(--kipu-warning) 20%, transparent)",
                  }}
                >
                  CRÉDITOS
                </span>
              </div>
              <p className="text-lg font-bold" style={{ color: "var(--kipu-text)" }}>{balance} créditos</p>
              <p className="text-xs mt-0.5" style={{ color: "var(--kipu-subtle)" }}>
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
            <div
              className="flex items-start gap-3 rounded-xl px-4 py-3"
              style={{
                background: "color-mix(in srgb, var(--kipu-warning) 10%, transparent)",
                border: "1px solid color-mix(in srgb, var(--kipu-warning) 20%, transparent)",
              }}
            >
              <AlertTriangle size={15} className="shrink-0 mt-0.5" style={{ color: "var(--kipu-warning)" }} />
              <p className="text-sm" style={{ color: "var(--kipu-warning)" }}>
                Estás en ambiente de pruebas. Solo puedes suscribirte en producción.
              </p>
            </div>
          )}

          {/* ── Tab: Suscripción ───────────────────────────────────────────── */}
          {tab === "suscripcion" && (
            <div className="space-y-4">

              {/* Banner explicativo — solo en Free */}
              {esFree && (
                <div
                  className="flex items-start gap-3 rounded-xl px-4 py-3"
                  style={{
                    background: "color-mix(in srgb, var(--kipu-accent) 10%, transparent)",
                    border: "1px solid color-mix(in srgb, var(--kipu-accent) 20%, transparent)",
                  }}
                >
                  <Info size={15} className="shrink-0 mt-0.5" style={{ color: "var(--kipu-accent)" }} />
                  <div className="text-sm">
                    <p className="font-medium mb-0.5" style={{ color: "var(--kipu-accent)" }}>Estás en Plan Free</p>
                    <p className="text-xs" style={{ color: "var(--kipu-subtle)" }}>
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
                <div
                  className="rounded-xl p-5"
                  style={{
                    background: "var(--kipu-surface)",
                    border: "1px solid var(--kipu-border)",
                  }}
                >
                  <h2 className="text-xs font-semibold uppercase tracking-wider mb-4" style={{ color: "var(--kipu-subtle)" }}>
                    Suscripción activa
                  </h2>
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <p className="text-2xl font-bold" style={{ color: "var(--kipu-text)" }}>Plan Pro</p>
                      <p className="text-sm" style={{ color: "var(--kipu-subtle)" }}>
                        Anual · IVA incluido
                        {sub.cancel_at_period_end && " · Cancela al vencer"}
                      </p>
                    </div>
                    <span
                      className="text-xs px-3 py-1 rounded-full font-semibold"
                      style={{
                        color: (ESTADO_COLOR[sub.estado] ?? ESTADO_COLOR.ACTIVO).color,
                        background: (ESTADO_COLOR[sub.estado] ?? ESTADO_COLOR.ACTIVO).bg,
                        border: `1px solid ${(ESTADO_COLOR[sub.estado] ?? ESTADO_COLOR.ACTIVO).border}`,
                      }}
                    >
                      {sub.estado}
                    </span>
                  </div>
                  {sub.period_end && (
                    <div
                      className="rounded-lg px-4 py-3 mb-4 flex justify-between text-sm"
                      style={{ background: "color-mix(in srgb, var(--kipu-text) 5%, transparent)" }}
                    >
                      <span style={{ color: "var(--kipu-subtle)" }}>
                        {sub.cancel_at_period_end ? "Acceso hasta" : "Próximo cobro"}
                      </span>
                      <span className="font-medium" style={{ color: "var(--kipu-text)" }}>
                        {new Date(sub.period_end).toLocaleDateString("es-EC")}
                        <span className="ml-2 text-xs" style={{ color: "var(--kipu-subtle)" }}>({sub.dias_restantes} días)</span>
                      </span>
                    </div>
                  )}
                  <div className="flex gap-2 flex-wrap">
                    <button
                      type="button"
                      onClick={abrirPortal}
                      disabled={abriendo}
                      className="flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-medium transition-colors disabled:opacity-50"
                      style={{ background: "var(--kipu-accent)" }}
                      onMouseEnter={e => {
                        if (!abriendo) e.currentTarget.style.background = "var(--kipu-accent-h)";
                      }}
                      onMouseLeave={e => {
                        if (!abriendo) e.currentTarget.style.background = "var(--kipu-accent)";
                      }}
                    >
                      {abriendo ? (
                        <div
                          className="w-3.5 h-3.5 border-2 border-t-transparent rounded-full animate-spin"
                          style={{ borderColor: "#FFFFFF", borderTopColor: "transparent" }}
                        />
                      ) : (
                        <CreditCard size={14} />
                      )}
                      Gestionar facturación
                    </button>
                    {!sub.cancel_at_period_end ? (
                      <button
                        type="button"
                        onClick={cancelar}
                        disabled={cancelando}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-colors disabled:opacity-50"
                        style={{
                          border: "1px solid color-mix(in srgb, var(--kipu-danger) 30%, transparent)",
                          color: "var(--kipu-danger)",
                          background: "transparent",
                        }}
                        onMouseEnter={e => {
                          e.currentTarget.style.background = "color-mix(in srgb, var(--kipu-danger) 10%, transparent)";
                        }}
                        onMouseLeave={e => {
                          e.currentTarget.style.background = "transparent";
                        }}
                      >
                        {cancelando ? (
                          <div
                            className="w-3.5 h-3.5 border-2 border-t-transparent rounded-full animate-spin"
                            style={{ borderColor: "currentColor", borderTopColor: "transparent" }}
                          />
                        ) : null}
                        Cancelar al vencer
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={reactivar}
                        className="px-4 py-2 rounded-lg text-white text-sm font-medium transition-colors"
                        style={{ background: "var(--kipu-success)" }}
                      >
                        Reactivar plan
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Card Plan Pro */}
              {(!sub?.activa || sub?.cancel_at_period_end) && (
                <div
                  className="relative rounded-xl p-6"
                  style={{
                    background: "var(--kipu-surface)",
                    border: "1px solid color-mix(in srgb, var(--kipu-accent) 60%, transparent)",
                  }}
                >
                  <div className="absolute -top-3 left-5">
                    <span
                      className="flex items-center gap-1.5 text-white text-xs px-3 py-1 rounded-full font-semibold shadow-lg"
                      style={{ background: "var(--kipu-accent)" }}
                    >
                      <Star size={11} className="fill-white" />
                      Plan Pro · Pago único anual
                    </span>
                  </div>

                  <div className="mt-3 mb-5">
                    <div className="flex items-baseline gap-2">
                      <span className="text-4xl font-extrabold" style={{ color: "var(--kipu-text)" }}>${PRECIO_PRO_ANUAL.toFixed(2)}</span>
                      <span className="text-sm" style={{ color: "var(--kipu-subtle)" }}>+ IVA / año</span>
                    </div>
                    <p className="text-xs mt-1" style={{ color: "var(--kipu-subtle)" }}>
                      ${PRECIO_CON_IVA} IVA incluido · equivale a ${(PRECIO_CON_IVA / 12).toFixed(2)}/mes
                    </p>
                  </div>

                  <div className="space-y-2.5 mb-6">
                    {FEATURES.map((f, i) => (
                      <div key={i} className="flex items-start gap-2.5">
                        <CheckCircle2 size={14} className="shrink-0 mt-0.5" style={{ color: "var(--kipu-success)" }} />
                        <p
                          className="text-sm"
                          style={{
                            color: f.destacado ? "var(--kipu-accent)" : "var(--kipu-text)",
                            fontWeight: f.destacado ? 500 : 400,
                          }}
                        >
                          {f.texto}
                        </p>
                      </div>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={iniciarCheckout}
                    disabled={!!pagando || !enProduccion}
                    className="w-full py-3 rounded-xl text-white font-bold text-sm transition-colors flex items-center justify-center gap-2 shadow-lg disabled:opacity-50"
                    style={{
                      background: "var(--kipu-accent)",
                      boxShadow: "0 10px 15px -3px color-mix(in srgb, var(--kipu-accent) 20%, transparent)",
                    }}
                    onMouseEnter={e => {
                      if (!pagando && enProduccion) e.currentTarget.style.background = "var(--kipu-accent-h)";
                    }}
                    onMouseLeave={e => {
                      if (!pagando && enProduccion) e.currentTarget.style.background = "var(--kipu-accent)";
                    }}
                  >
                    {pagando === "pro" ? (
                      <div
                        className="w-4 h-4 border-2 border-t-transparent rounded-full animate-spin"
                        style={{ borderColor: "#FFFFFF", borderTopColor: "transparent" }}
                      />
                    ) : (
                      <CreditCard size={16} />
                    )}
                    {pagando === "pro" ? "Redirigiendo..." : "Suscribirme ahora"}
                  </button>

                  {!enProduccion && (
                    <p className="text-center text-xs mt-2" style={{ color: "var(--kipu-subtle)" }}>
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
                  type="button"
                  onClick={() => setTab("suscripcion")}
                  className="w-full flex items-center justify-between gap-3 rounded-xl px-4 py-3 text-left transition-colors group"
                  style={{
                    background: "color-mix(in srgb, var(--kipu-accent) 10%, transparent)",
                    border: "1px solid color-mix(in srgb, var(--kipu-accent) 20%, transparent)",
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.background = "color-mix(in srgb, var(--kipu-accent) 15%, transparent)";
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.background = "color-mix(in srgb, var(--kipu-accent) 10%, transparent)";
                  }}
                >
                  <div className="flex items-start gap-3">
                    <Star size={15} className="shrink-0 mt-0.5" style={{ color: "var(--kipu-accent)" }} />
                    <div>
                      <p className="text-sm font-medium mb-0.5" style={{ color: "var(--kipu-accent)" }}>¿Emites frecuentemente?</p>
                      <p className="text-xs" style={{ color: "var(--kipu-subtle)" }}>
                        Con Plan Pro a ${PRECIO_PRO_ANUAL}/año + IVA tienes emisión ilimitada sin comprar créditos.
                      </p>
                    </div>
                  </div>
                  <ArrowRight size={15} className="shrink-0 group-hover:translate-x-0.5 transition-transform" style={{ color: "var(--kipu-accent)" }} />
                </button>
              )}

              {/* Balance */}
              <div
                className="rounded-xl p-5"
                style={{
                  background: "var(--kipu-surface)",
                  border: "1px solid var(--kipu-border)",
                }}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs mb-1" style={{ color: "var(--kipu-subtle)" }}>Balance actual</p>
                    <p className="text-4xl font-bold" style={{ color: "var(--kipu-text)" }}>{balance}</p>
                    <p className="text-sm mt-1" style={{ color: "var(--kipu-subtle)" }}>créditos disponibles</p>
                  </div>
                  <div
                    className="w-16 h-16 rounded-2xl flex items-center justify-center shrink-0"
                    style={{ background: "color-mix(in srgb, var(--kipu-warning) 10%, transparent)" }}
                  >
                    <Zap size={28} style={{ color: "var(--kipu-warning)" }} />
                  </div>
                </div>
                <div
                  className="mt-4 pt-4 text-xs space-y-1"
                  style={{
                    borderTop: "1px solid var(--kipu-border)",
                    color: "var(--kipu-subtle)",
                  }}
                >
                  <p>· 1 crédito = 1 comprobante emitido (FAC, LIQ, NCR, NDB, RET)</p>
                  <p>· No vencen nunca</p>
                  <p>· {esFree ? "Son tu único acceso para emitir en Plan Free" : "Complementan tu suscripción Pro activa"}</p>
                </div>
              </div>

              {/* Planes de créditos */}
              <div
                className="rounded-xl p-5"
                style={{
                  background: "var(--kipu-surface)",
                  border: "1px solid var(--kipu-border)",
                }}
              >
                <h2 className="text-sm font-semibold mb-1" style={{ color: "var(--kipu-text)" }}>Comprar créditos</h2>
                <p className="text-xs mb-4" style={{ color: "var(--kipu-subtle)" }}>Pago único · No vencen · IVA incluido</p>

                {planes.length === 0 ? (
                  <p className="text-sm text-center py-4" style={{ color: "var(--kipu-subtle)" }}>No hay planes disponibles.</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {planes.map((p) => {
                      const esMejorValor = p.precio_por_credito === Math.min(...planes.map(x => x.precio_por_credito));
                      return (
                        <div
                          key={p.id}
                          className="relative rounded-xl p-4 transition-colors"
                          style={{
                            background: "var(--kipu-surface)",
                            border: esMejorValor
                              ? "1px solid color-mix(in srgb, var(--kipu-warning) 40%, transparent)"
                              : "1px solid var(--kipu-border)",
                          }}
                        >
                          {esMejorValor && (
                            <span
                              className="absolute -top-2.5 left-3 text-[10px] px-2 py-0.5 rounded-full font-bold"
                              style={{
                                background: "var(--kipu-warning)",
                                color: "var(--kipu-surface)",
                              }}
                            >
                              Mejor valor
                            </span>
                          )}
                          <div className="flex justify-between items-start mb-3">
                            <div>
                              <p className="text-base font-bold" style={{ color: "var(--kipu-text)" }}>{p.cantidad} créditos</p>
                              <p className="text-xs" style={{ color: "var(--kipu-subtle)" }}>{p.nombre}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-xl font-bold" style={{ color: "var(--kipu-text)" }}>${fmt(p.precio)}</p>
                              <p className="text-xs" style={{ color: "var(--kipu-subtle)" }}>${p.precio_por_credito.toFixed(3)}/crédito · IVA inc.</p>
                            </div>
                          </div>
                          {p.descripcion && (
                            <p className="text-xs mb-3" style={{ color: "var(--kipu-subtle)" }}>{p.descripcion}</p>
                          )}
                          <button
                            type="button"
                            onClick={() => iniciarCheckoutCreditos(p.id)}
                            disabled={!!pagando || !enProduccion}
                            className="w-full py-2 rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                            style={{
                              background: "var(--kipu-warning)",
                              color: "var(--kipu-surface)",
                            }}
                          >
                            {pagando === `cred_${p.id}` ? (
                              <div
                                className="w-3 h-3 border-2 border-t-transparent rounded-full animate-spin"
                                style={{ borderColor: "currentColor", borderTopColor: "transparent" }}
                              />
                            ) : (
                              <Zap size={12} />
                            )}
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
                <div
                  className="rounded-xl overflow-hidden"
                  style={{
                    background: "var(--kipu-surface)",
                    border: "1px solid var(--kipu-border)",
                  }}
                >
                  <div
                    className="px-4 py-3"
                    style={{ borderBottom: "1px solid var(--kipu-border)" }}
                  >
                    <h2 className="text-sm font-semibold" style={{ color: "var(--kipu-text)" }}>Historial de créditos</h2>
                  </div>
                  <div>
                    {historial.map((t, idx) => (
                      <div
                        key={t.id}
                        className="flex items-center justify-between px-4 py-3"
                        style={{ borderTop: idx > 0 ? "1px solid var(--kipu-border)" : "none" }}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                            style={{
                              background: t.tipo === "BONO" || t.tipo === "RECARGA"
                                ? "color-mix(in srgb, var(--kipu-success) 10%, transparent)"
                                : "color-mix(in srgb, var(--kipu-danger) 10%, transparent)",
                            }}
                          >
                            {t.tipo === "BONO" || t.tipo === "RECARGA"
                              ? <Zap size={14} style={{ color: "var(--kipu-success)" }} />
                              : <TrendingDown size={14} style={{ color: "var(--kipu-danger)" }} />
                            }
                          </div>
                          <div>
                            <p className="text-sm font-medium" style={{ color: "var(--kipu-text)" }}>
                              {t.tipo === "BONO" ? "Bono" : t.tipo === "RECARGA" ? "Recarga" : "Consumo"}
                            </p>
                            <p className="text-xs" style={{ color: "var(--kipu-subtle)" }}>
                              {t.notas || t.metodo_pago} · {new Date(t.created_at).toLocaleDateString("es-EC")}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p
                            className="text-sm font-bold"
                            style={{ color: t.cantidad > 0 ? "var(--kipu-success)" : "var(--kipu-danger)" }}
                          >
                            {t.cantidad > 0 ? "+" : ""}{t.cantidad}
                          </p>
                          {t.precio_total > 0 && (
                            <p className="text-xs" style={{ color: "var(--kipu-subtle)" }}>${fmt(t.precio_total)}</p>
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