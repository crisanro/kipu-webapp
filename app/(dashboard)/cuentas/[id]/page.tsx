"use client";
import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import api from "@/lib/api";
import { useAuthStore } from "@/store/auth.store";
import { hoyEC } from "@/lib/fecha";
import {
  ArrowLeft, Save, Ban,
  CheckCircle2, Clock,
  AlertTriangle, Wallet, User, Calendar, FileText,
  ArrowUpCircle, ArrowDownCircle, X
} from "lucide-react";

// ── Helpers ────────────────────────────────────────────────────────────────────
const fmt = (n: number) => `$${n.toFixed(2)}`;

const ESTADO_CONFIG = {
  PENDIENTE: { label: "Pendiente", color: "var(--kipu-warning)", bg: "color-mix(in srgb, var(--kipu-warning) 10%, transparent)", icon: Clock },
  PARCIAL:   { label: "Parcial",   color: "#60a5fa",           bg: "color-mix(in srgb, #60a5fa 10%, transparent)",           icon: AlertTriangle },
  PAGADO:    { label: "Pagado",    color: "var(--kipu-success)", bg: "color-mix(in srgb, var(--kipu-success) 10%, transparent)", icon: CheckCircle2 },
  ANULADO:   { label: "Anulado",   color: "var(--kipu-subtle)",  bg: "color-mix(in srgb, var(--kipu-subtle) 10%, transparent)",  icon: Ban },
};

const FORMAS_PAGO = ["EFECTIVO", "TRANSFERENCIA", "CHEQUE", "TARJETA", "OTRO"];

export default function DetalleCuentaPage() {
  const { id }   = useParams();
  const router   = useRouter();
  const empresa  = useAuthStore((s) => s.empresa);
  const tieneSub = empresa?.suscripcion_activa ?? false;

  const [data,          setData]          = useState<any>(null);
  const [loading,        setLoading]        = useState(true);
  const [showAbono,      setShowAbono]      = useState(false);
  const [showAjuste,     setShowAjuste]     = useState(false);
  const [showAnular,     setShowAnular]     = useState(false);
  const [savingAbono,   setSavingAbono]    = useState(false);
  const [savingAjuste,  setSavingAjuste]   = useState(false);
  const [savingAnular,  setSavingAnular]   = useState(false);
  const [error,         setError]          = useState("");

  const [abonoForm, setAbonoForm] = useState({
    monto:      "",
    fecha:      hoyEC(),
    forma_pago: "EFECTIVO",
    notas:      "",
  });

  const [ajusteForm, setAjusteForm] = useState({
    monto:  "",
    motivo: "",
    fecha:  hoyEC(),
  });

  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get(`/api/v1/app/cuentas/${id}`);
      setData(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { cargar(); }, [cargar]);

  const handleAbono = async () => {
    setError("");
    const monto = parseFloat(abonoForm.monto);
    if (!monto || monto <= 0) return setError("El monto debe ser mayor a cero.");
    setSavingAbono(true);
    try {
      await api.post(`/api/v1/app/cuentas/${id}/abonos`, {
        monto,
        fecha:      abonoForm.fecha      || null,
        forma_pago: abonoForm.forma_pago || null,
        notas:      abonoForm.notas      || null,
      });
      await cargar();
      setShowAbono(false);
      setAbonoForm({ monto: "", fecha: hoyEC(), forma_pago: "EFECTIVO", notas: "" });
    } catch (err: any) {
      setError(err?.response?.data?.detail ?? "Error al registrar el abono.");
    } finally {
      setSavingAbono(false);
    }
  };

  const handleAjuste = async () => {
    setError("");
    const monto = parseFloat(ajusteForm.monto);
    if (!monto || monto <= 0) return setError("El monto del ajuste debe ser mayor a cero.");
    if (!ajusteForm.motivo.trim()) return setError("El motivo es obligatorio para un ajuste.");
    setSavingAjuste(true);
    try {
      await api.post(`/api/v1/app/cuentas/${id}/ajustes`, {
        monto,
        motivo: ajusteForm.motivo.trim(),
        fecha:  ajusteForm.fecha || null,
      });
      await cargar();
      setShowAjuste(false);
      setAjusteForm({ monto: "", motivo: "", fecha: hoyEC() });
    } catch (err: any) {
      setError(err?.response?.data?.detail ?? "Error al registrar el ajuste.");
    } finally {
      setSavingAjuste(false);
    }
  };

  const handleAnular = async () => {
    setSavingAnular(true);
    try {
      await api.patch(`/api/v1/app/cuentas/${id}/anular`);
      await cargar();
      setShowAnular(false);
    } catch (err: any) {
      setError(err?.response?.data?.detail ?? "Error al anular.");
    } finally {
      setSavingAnular(false);
    }
  };

  // ── Loading / error ──────────────────────────────────────────────────────────
  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div
        className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin"
        style={{ borderColor: "var(--kipu-accent)", borderTopColor: "transparent" }}
      />
    </div>
  );
  if (!data) return (
    <div className="p-6 text-center">
      <Wallet size={40} className="mx-auto mb-3" style={{ color: "var(--kipu-subtle)" }} />
      <p className="text-sm" style={{ color: "var(--kipu-muted)" }}>Cuenta no encontrada.</p>
      <button
        onClick={() => router.back()}
        className="mt-4 text-sm transition-colors"
        style={{ color: "var(--kipu-accent)" }}
        onMouseEnter={e => e.currentTarget.style.color = "var(--kipu-accent-h)"}
        onMouseLeave={e => e.currentTarget.style.color = "var(--kipu-accent)"}
      >
        Volver
      </button>
    </div>
  );

  const { cuenta, movimientos = [] } = data;
  const est        = ESTADO_CONFIG[cuenta.estado as keyof typeof ESTADO_CONFIG] ?? ESTADO_CONFIG.PENDIENTE;
  const EstIcon    = est.icon;
  const activa     = cuenta.estado === "PENDIENTE" || cuenta.estado === "PARCIAL";
  const porcentaje = cuenta.monto_total > 0
    ? Math.min(100, (cuenta.monto_pagado / cuenta.monto_total) * 100)
    : 0;
  const vencida = cuenta.fecha_vencimiento &&
    new Date(cuenta.fecha_vencimiento) < new Date() && activa;

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto space-y-4">

      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.back()}
          className="p-2 rounded-lg transition-colors"
          style={{ color: "var(--kipu-muted)" }}
          onMouseEnter={e => {
            e.currentTarget.style.color = "var(--kipu-text)";
            e.currentTarget.style.background = "color-mix(in srgb, var(--kipu-text) 5%, transparent)";
          }}
          onMouseLeave={e => {
            e.currentTarget.style.color = "var(--kipu-muted)";
            e.currentTarget.style.background = "transparent";
          }}
        >
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold truncate" style={{ color: "var(--kipu-text)" }}>{cuenta.concepto}</h1>
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            <span
              className="text-xs px-2 py-0.5 rounded-full font-medium"
              style={{
                background: cuenta.tipo === "COBRAR"
                  ? "color-mix(in srgb, var(--kipu-success) 10%, transparent)"
                  : "color-mix(in srgb, var(--kipu-danger) 10%, transparent)",
                color: cuenta.tipo === "COBRAR" ? "var(--kipu-success)" : "var(--kipu-danger)",
              }}
            >
              {cuenta.tipo === "COBRAR" ? "Por cobrar" : "Por pagar"}
            </span>
            <span
              className="text-xs px-2 py-0.5 rounded-full flex items-center gap-1 font-medium"
              style={{
                background: est.bg,
                color: est.color,
              }}
            >
              <EstIcon size={10} />
              {est.label}
            </span>
            {vencida && (
              <span
                className="text-xs px-2 py-0.5 rounded-full flex items-center gap-1 font-medium"
                style={{
                  background: "color-mix(in srgb, var(--kipu-danger) 10%, transparent)",
                  color: "var(--kipu-danger)",
                }}
              >
                <AlertTriangle size={10} />
                Vencida
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Tarjeta principal */}
      <div
        className="rounded-xl p-5"
        style={{
          background: "var(--kipu-surface)",
          border: "1px solid var(--kipu-border)",
        }}
      >

        {/* Montos */}
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div>
            <p className="text-xs mb-1" style={{ color: "var(--kipu-subtle)" }}>Total actual</p>
            <p className="text-lg font-bold" style={{ color: "var(--kipu-text)" }}>{fmt(cuenta.monto_total)}</p>
          </div>
          <div>
            <p className="text-xs mb-1" style={{ color: "var(--kipu-subtle)" }}>Pagado</p>
            <p className="text-lg font-bold" style={{ color: "var(--kipu-success)" }}>{fmt(cuenta.monto_pagado)}</p>
          </div>
          <div>
            <p className="text-xs mb-1" style={{ color: "var(--kipu-subtle)" }}>Pendiente</p>
            <p className="text-lg font-bold" style={{ color: "var(--kipu-warning)" }}>{fmt(cuenta.saldo_pendiente)}</p>
          </div>
        </div>

        {/* Barra de progreso */}
        <div
          className="w-full h-2 rounded-full overflow-hidden mb-4"
          style={{ background: "color-mix(in srgb, var(--kipu-text) 8%, transparent)" }}
        >
          <div
            className="h-full rounded-full transition-all"
            style={{
              width: `${porcentaje}%`,
              background: cuenta.estado === "PAGADO" ? "var(--kipu-success)" : "var(--kipu-accent)",
            }}
          />
        </div>

        {/* Datos */}
        <div className="space-y-2.5 text-sm">
          <div className="flex justify-between">
            <span className="flex items-center gap-2" style={{ color: "var(--kipu-subtle)" }}>
              <User size={13} /> Persona
            </span>
            <Link
              href={`/personas/${cuenta.cliente_id}`}
              className="font-medium truncate max-w-[60%] text-right transition-colors"
              style={{ color: "var(--kipu-accent)" }}
              onMouseEnter={e => e.currentTarget.style.color = "var(--kipu-accent-h)"}
              onMouseLeave={e => e.currentTarget.style.color = "var(--kipu-accent)"}
            >
              {cuenta.razon_social}
            </Link>
          </div>
          <div className="flex justify-between">
            <span className="flex items-center gap-2" style={{ color: "var(--kipu-subtle)" }}>
              <Calendar size={13} /> Fecha
            </span>
            <span style={{ color: "var(--kipu-text)" }}>{cuenta.fecha_emision}</span>
          </div>
          {cuenta.fecha_vencimiento && (
            <div className="flex justify-between">
              <span className="flex items-center gap-2" style={{ color: "var(--kipu-subtle)" }}>
                <Calendar size={13} /> Vencimiento
              </span>
              <span
                className="font-medium"
                style={{ color: vencida ? "var(--kipu-danger)" : "var(--kipu-text)" }}
              >
                {cuenta.fecha_vencimiento}
                {vencida && " ⚠️"}
              </span>
            </div>
          )}
          {cuenta.notas && (
            <div className="flex justify-between gap-4">
              <span className="flex items-center gap-2 shrink-0" style={{ color: "var(--kipu-subtle)" }}>
                <FileText size={13} /> Notas
              </span>
              <span className="text-right" style={{ color: "var(--kipu-text)" }}>{cuenta.notas}</span>
            </div>
          )}
        </div>

        {/* Acciones */}
        {activa && tieneSub && (
          <div
            className="flex gap-2 mt-5 pt-4"
            style={{ borderTop: "1px solid var(--kipu-border)" }}
          >
            <button
              onClick={() => { setShowAbono(true); setError(""); }}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-white text-sm font-medium transition-colors"
              style={{ background: "var(--kipu-accent)" }}
              onMouseEnter={e => e.currentTarget.style.background = "var(--kipu-accent-h)"}
              onMouseLeave={e => e.currentTarget.style.background = "var(--kipu-accent)"}
            >
              <ArrowDownCircle size={14} />
              Registrar abono
            </button>
            <button
              onClick={() => { setShowAjuste(true); setError(""); }}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-colors"
              style={{
                background: "var(--kipu-surface)",
                color: "var(--kipu-warning)",
                border: "1px solid color-mix(in srgb, var(--kipu-warning) 20%, transparent)",
              }}
              onMouseEnter={e => e.currentTarget.style.background = "color-mix(in srgb, var(--kipu-warning) 10%, transparent)"}
              onMouseLeave={e => e.currentTarget.style.background = "var(--kipu-surface)"}
            >
              <ArrowUpCircle size={14} />
              Ajustar monto
            </button>
            <button
              onClick={() => setShowAnular(true)}
              className="px-4 py-2.5 rounded-lg text-sm transition-colors"
              style={{
                border: "1px solid var(--kipu-border)",
                color: "var(--kipu-muted)",
              }}
              onMouseEnter={e => {
                e.currentTarget.style.color = "var(--kipu-danger)";
                e.currentTarget.style.borderColor = "color-mix(in srgb, var(--kipu-danger) 50%, transparent)";
              }}
              onMouseLeave={e => {
                e.currentTarget.style.color = "var(--kipu-muted)";
                e.currentTarget.style.borderColor = "var(--kipu-border)";
              }}
            >
              <Ban size={14} />
            </button>
          </div>
        )}

        {activa && !tieneSub && (
          <div
            className="mt-5 pt-4"
            style={{ borderTop: "1px solid var(--kipu-border)" }}
          >
            <div
              className="flex items-center gap-2 px-3 py-2.5 rounded-lg"
              style={{
                background: "color-mix(in srgb, var(--kipu-warning) 10%, transparent)",
                border: "1px solid color-mix(in srgb, var(--kipu-warning) 20%, transparent)",
              }}
            >
              <AlertTriangle size={13} className="shrink-0" style={{ color: "var(--kipu-warning)" }} />
              <p className="text-xs" style={{ color: "var(--kipu-warning)" }}>Requiere suscripción activa para registrar movimientos.</p>
              <Link href="/planes" className="ml-auto text-xs underline shrink-0" style={{ color: "var(--kipu-warning)" }}>Ver planes</Link>
            </div>
          </div>
        )}
      </div>

      {/* Historial de movimientos (abonos + ajustes unificados) */}
      <div
        className="rounded-xl overflow-hidden"
        style={{
          background: "var(--kipu-surface)",
          border: "1px solid var(--kipu-border)",
        }}
      >
        <div
          className="px-4 py-3 flex items-center justify-between"
          style={{ borderBottom: "1px solid var(--kipu-border)" }}
        >
          <h2 className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--kipu-subtle)" }}>
            Movimientos ({movimientos.length})
          </h2>
          {movimientos.length > 0 && (
            <div className="flex items-center gap-3 text-xs" style={{ color: "var(--kipu-subtle)" }}>
              <span className="flex items-center gap-1">
                <ArrowDownCircle size={11} style={{ color: "var(--kipu-success)" }} /> Abono
              </span>
              <span className="flex items-center gap-1">
                <ArrowUpCircle size={11} style={{ color: "var(--kipu-warning)" }} /> Ajuste
              </span>
            </div>
          )}
        </div>

        {movimientos.length === 0 ? (
          <div className="px-4 py-8 text-center">
            <p className="text-xs" style={{ color: "var(--kipu-subtle)" }}>Sin movimientos registrados.</p>
          </div>
        ) : (
          <div>
            {movimientos.map((m: any, i: number) => {
              const esAjuste = m.tipo === "AJUSTE";
              return (
                <div
                  key={m.id}
                  className="flex items-center gap-3 px-4 py-3"
                  style={{
                    borderTop: i > 0 ? "1px solid var(--kipu-border)" : "none",
                  }}
                >
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center shrink-0"
                    style={{
                      background: esAjuste
                        ? "color-mix(in srgb, var(--kipu-warning) 10%, transparent)"
                        : "color-mix(in srgb, var(--kipu-success) 10%, transparent)",
                    }}
                  >
                    {esAjuste
                      ? <ArrowUpCircle size={13} style={{ color: "var(--kipu-warning)" }} />
                      : <ArrowDownCircle size={13} style={{ color: "var(--kipu-success)" }} />
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p
                        className="text-sm font-medium"
                        style={{ color: esAjuste ? "var(--kipu-warning)" : "var(--kipu-success)" }}
                      >
                        {esAjuste ? "+" : "-"}{fmt(m.monto)}
                      </p>
                      <span
                        className="text-[10px] px-1.5 py-0.5 rounded font-medium"
                        style={{
                          background: esAjuste
                            ? "color-mix(in srgb, var(--kipu-warning) 10%, transparent)"
                            : "color-mix(in srgb, var(--kipu-success) 10%, transparent)",
                          color: esAjuste ? "var(--kipu-warning)" : "var(--kipu-success)",
                        }}
                      >
                        {esAjuste ? "ajuste" : "abono"}
                      </span>
                    </div>
                    <p className="text-xs mt-0.5" style={{ color: "var(--kipu-subtle)" }}>
                      {m.fecha}
                      {m.forma_pago && ` · ${m.forma_pago}`}
                      {m.notas && ` · ${m.notas}`}
                    </p>
                  </div>
                  <span className="text-xs shrink-0" style={{ color: "var(--kipu-subtle)" }}>#{i + 1}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Modal abono ────────────────────────────────────────────────────────── */}
      {showAbono && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div
            className="rounded-xl w-full max-w-sm"
            style={{
              background: "var(--kipu-surface)",
              border: "1px solid var(--kipu-border)",
            }}
          >
            <div
              className="flex items-center justify-between px-5 py-4"
              style={{ borderBottom: "1px solid var(--kipu-border)" }}
            >
              <div className="flex items-center gap-2">
                <ArrowDownCircle size={15} style={{ color: "var(--kipu-success)" }} />
                <h2 className="text-sm font-semibold" style={{ color: "var(--kipu-text)" }}>Registrar abono</h2>
              </div>
              <button
                onClick={() => setShowAbono(false)}
                className="transition-colors"
                style={{ color: "var(--kipu-subtle)" }}
                onMouseEnter={e => e.currentTarget.style.color = "var(--kipu-text)"}
                onMouseLeave={e => e.currentTarget.style.color = "var(--kipu-subtle)"}
              >
                <X size={18} />
              </button>
            </div>
            <div className="p-5 space-y-3">
              <div
                className="rounded-lg px-3 py-2 text-xs"
                style={{
                  background: "color-mix(in srgb, var(--kipu-text) 5%, transparent)",
                  color: "var(--kipu-subtle)",
                }}
              >
                Saldo pendiente: <span className="font-semibold" style={{ color: "var(--kipu-warning)" }}>{fmt(cuenta.saldo_pendiente)}</span>
              </div>
              <div>
                <label className="block text-xs mb-1.5" style={{ color: "var(--kipu-subtle)" }}>Monto *</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm" style={{ color: "var(--kipu-subtle)" }}>$</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={abonoForm.monto}
                    onChange={(e) => setAbonoForm({ ...abonoForm, monto: e.target.value })}
                    placeholder="0.00"
                    className="w-full pl-7 pr-4 py-2 rounded-lg text-sm transition-colors focus:outline-none"
                    style={{
                      background: "var(--kipu-surface)",
                      border: "1px solid var(--kipu-border)",
                      color: "var(--kipu-text)",
                    }}
                    onFocus={e => e.currentTarget.style.borderColor = "var(--kipu-accent)"}
                    onBlur={e => e.currentTarget.style.borderColor = "var(--kipu-border)"}
                    autoFocus
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs mb-1.5" style={{ color: "var(--kipu-subtle)" }}>Fecha</label>
                <input
                  type="date"
                  value={abonoForm.fecha}
                  onChange={(e) => setAbonoForm({ ...abonoForm, fecha: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg text-sm transition-colors focus:outline-none"
                  style={{
                    background: "var(--kipu-surface)",
                    border: "1px solid var(--kipu-border)",
                    color: "var(--kipu-text)",
                  }}
                  onFocus={e => e.currentTarget.style.borderColor = "var(--kipu-accent)"}
                  onBlur={e => e.currentTarget.style.borderColor = "var(--kipu-border)"}
                />
              </div>
              <div>
                <label className="block text-xs mb-1.5" style={{ color: "var(--kipu-subtle)" }}>Forma de pago</label>
                <select
                  value={abonoForm.forma_pago}
                  onChange={(e) => setAbonoForm({ ...abonoForm, forma_pago: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg text-sm appearance-none transition-colors focus:outline-none"
                  style={{
                    background: "var(--kipu-surface)",
                    border: "1px solid var(--kipu-border)",
                    color: "var(--kipu-text)",
                  }}
                  onFocus={e => e.currentTarget.style.borderColor = "var(--kipu-accent)"}
                  onBlur={e => e.currentTarget.style.borderColor = "var(--kipu-border)"}
                >
                  {FORMAS_PAGO.map((f) => <option key={f} value={f}>{f}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs mb-1.5" style={{ color: "var(--kipu-subtle)" }}>Notas</label>
                <input
                  value={abonoForm.notas}
                  onChange={(e) => setAbonoForm({ ...abonoForm, notas: e.target.value })}
                  placeholder="Opcional..."
                  className="w-full px-3 py-2 rounded-lg text-sm transition-colors focus:outline-none"
                  style={{
                    background: "var(--kipu-surface)",
                    border: "1px solid var(--kipu-border)",
                    color: "var(--kipu-text)",
                  }}
                  onFocus={e => e.currentTarget.style.borderColor = "var(--kipu-accent)"}
                  onBlur={e => e.currentTarget.style.borderColor = "var(--kipu-border)"}
                />
              </div>
              {error && (
                <p
                  className="text-xs px-3 py-2 rounded-lg"
                  style={{
                    color: "var(--kipu-danger)",
                    background: "color-mix(in srgb, var(--kipu-danger) 10%, transparent)",
                  }}
                >
                  {error}
                </p>
              )}
              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => { setShowAbono(false); setError(""); }}
                  className="flex-1 py-2.5 rounded-lg text-sm transition-colors"
                  style={{
                    border: "1px solid var(--kipu-border)",
                    color: "var(--kipu-muted)",
                  }}
                  onMouseEnter={e => e.currentTarget.style.color = "var(--kipu-text)"}
                  onMouseLeave={e => e.currentTarget.style.color = "var(--kipu-muted)"}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleAbono}
                  disabled={savingAbono}
                  className="flex-1 py-2.5 rounded-lg text-white text-sm font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                  style={{ background: "var(--kipu-accent)" }}
                  onMouseEnter={e => {
                    if (!savingAbono) e.currentTarget.style.background = "var(--kipu-accent-h)";
                  }}
                  onMouseLeave={e => {
                    if (!savingAbono) e.currentTarget.style.background = "var(--kipu-accent)";
                  }}
                >
                  {savingAbono ? (
                    <div
                      className="w-3.5 h-3.5 border-2 border-t-transparent rounded-full animate-spin"
                      style={{ borderColor: "#FFFFFF", borderTopColor: "transparent" }}
                    />
                  ) : (
                    <Save size={14} />
                  )}
                  Guardar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal ajuste ───────────────────────────────────────────────────────── */}
      {showAjuste && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div
            className="rounded-xl w-full max-w-sm"
            style={{
              background: "var(--kipu-surface)",
              border: "1px solid var(--kipu-border)",
            }}
          >
            <div
              className="flex items-center justify-between px-5 py-4"
              style={{ borderBottom: "1px solid var(--kipu-border)" }}
            >
              <div className="flex items-center gap-2">
                <ArrowUpCircle size={15} style={{ color: "var(--kipu-warning)" }} />
                <h2 className="text-sm font-semibold" style={{ color: "var(--kipu-text)" }}>Ajustar monto</h2>
              </div>
              <button
                onClick={() => setShowAjuste(false)}
                className="transition-colors"
                style={{ color: "var(--kipu-subtle)" }}
                onMouseEnter={e => e.currentTarget.style.color = "var(--kipu-text)"}
                onMouseLeave={e => e.currentTarget.style.color = "var(--kipu-subtle)"}
              >
                <X size={18} />
              </button>
            </div>
            <div className="p-5 space-y-3">
              <div
                className="rounded-lg px-3 py-2.5 text-xs"
                style={{
                  background: "color-mix(in srgb, var(--kipu-warning) 10%, transparent)",
                  border: "1px solid color-mix(in srgb, var(--kipu-warning) 20%, transparent)",
                  color: "var(--kipu-warning)",
                }}
              >
                Esto <span className="font-semibold">aumenta el monto total</span> de la deuda. Úsalo para intereses, cargos adicionales o un préstamo extra encima del saldo actual.
              </div>
              <div>
                <label className="block text-xs mb-1.5" style={{ color: "var(--kipu-subtle)" }}>
                  Monto a añadir *
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm" style={{ color: "var(--kipu-subtle)" }}>+$</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={ajusteForm.monto}
                    onChange={(e) => setAjusteForm({ ...ajusteForm, monto: e.target.value })}
                    placeholder="0.00"
                    className="w-full pl-9 pr-4 py-2 rounded-lg text-sm transition-colors focus:outline-none"
                    style={{
                      background: "var(--kipu-surface)",
                      border: "1px solid var(--kipu-border)",
                      color: "var(--kipu-text)",
                    }}
                    onFocus={e => e.currentTarget.style.borderColor = "var(--kipu-warning)"}
                    onBlur={e => e.currentTarget.style.borderColor = "var(--kipu-border)"}
                    autoFocus
                  />
                </div>
                {ajusteForm.monto && parseFloat(ajusteForm.monto) > 0 && (
                  <p className="text-xs mt-1" style={{ color: "var(--kipu-subtle)" }}>
                    Nuevo total: <span className="font-medium" style={{ color: "var(--kipu-text)" }}>
                      {fmt(cuenta.monto_total + parseFloat(ajusteForm.monto))}
                    </span>
                  </p>
                )}
              </div>
              <div>
                <label className="block text-xs mb-1.5" style={{ color: "var(--kipu-subtle)" }}>
                  Motivo *
                </label>
                <input
                  value={ajusteForm.motivo}
                  onChange={(e) => setAjusteForm({ ...ajusteForm, motivo: e.target.value })}
                  placeholder="Ej: Intereses enero, Cargo adicional..."
                  className="w-full px-3 py-2 rounded-lg text-sm transition-colors focus:outline-none"
                  style={{
                    background: "var(--kipu-surface)",
                    border: "1px solid var(--kipu-border)",
                    color: "var(--kipu-text)",
                  }}
                  onFocus={e => e.currentTarget.style.borderColor = "var(--kipu-warning)"}
                  onBlur={e => e.currentTarget.style.borderColor = "var(--kipu-border)"}
                />
              </div>
              <div>
                <label className="block text-xs mb-1.5" style={{ color: "var(--kipu-subtle)" }}>Fecha</label>
                <input
                  type="date"
                  value={ajusteForm.fecha}
                  onChange={(e) => setAjusteForm({ ...ajusteForm, fecha: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg text-sm transition-colors focus:outline-none"
                  style={{
                    background: "var(--kipu-surface)",
                    border: "1px solid var(--kipu-border)",
                    color: "var(--kipu-text)",
                  }}
                  onFocus={e => e.currentTarget.style.borderColor = "var(--kipu-warning)"}
                  onBlur={e => e.currentTarget.style.borderColor = "var(--kipu-border)"}
                />
              </div>
              {error && (
                <p
                  className="text-xs px-3 py-2 rounded-lg"
                  style={{
                    color: "var(--kipu-danger)",
                    background: "color-mix(in srgb, var(--kipu-danger) 10%, transparent)",
                  }}
                >
                  {error}
                </p>
              )}
              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => { setShowAjuste(false); setError(""); }}
                  className="flex-1 py-2.5 rounded-lg text-sm transition-colors"
                  style={{
                    border: "1px solid var(--kipu-border)",
                    color: "var(--kipu-muted)",
                  }}
                  onMouseEnter={e => e.currentTarget.style.color = "var(--kipu-text)"}
                  onMouseLeave={e => e.currentTarget.style.color = "var(--kipu-muted)"}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleAjuste}
                  disabled={savingAjuste}
                  className="flex-1 py-2.5 rounded-lg text-white text-sm font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                  style={{ background: "var(--kipu-warning)" }}
                >
                  {savingAjuste ? (
                    <div
                      className="w-3.5 h-3.5 border-2 border-t-transparent rounded-full animate-spin"
                      style={{ borderColor: "#FFFFFF", borderTopColor: "transparent" }}
                    />
                  ) : (
                    <ArrowUpCircle size={14} />
                  )}
                  Aplicar ajuste
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal anular ───────────────────────────────────────────────────────── */}
      {showAnular && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div
            className="rounded-xl w-full max-w-sm p-5 space-y-4"
            style={{
              background: "var(--kipu-surface)",
              border: "1px solid var(--kipu-border)",
            }}
          >
            <div className="flex items-start gap-3">
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
                style={{
                  background: "color-mix(in srgb, var(--kipu-danger) 20%, transparent)",
                }}
              >
                <Ban size={16} style={{ color: "var(--kipu-danger)" }} />
              </div>
              <div>
                <p className="font-semibold text-sm" style={{ color: "var(--kipu-text)" }}>¿Anular esta cuenta?</p>
                <p className="text-xs mt-1" style={{ color: "var(--kipu-subtle)" }}>
                  Esta acción no se puede deshacer. La cuenta quedará marcada como anulada.
                </p>
              </div>
            </div>
            {error && (
              <p
                className="text-xs px-3 py-2 rounded-lg"
                style={{
                  color: "var(--kipu-danger)",
                  background: "color-mix(in srgb, var(--kipu-danger) 10%, transparent)",
                }}
              >
                {error}
              </p>
            )}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowAnular(false)}
                className="flex-1 py-2 rounded-lg text-sm transition-colors"
                style={{
                  border: "1px solid var(--kipu-border)",
                  color: "var(--kipu-muted)",
                }}
                onMouseEnter={e => e.currentTarget.style.color = "var(--kipu-text)"}
                onMouseLeave={e => e.currentTarget.style.color = "var(--kipu-muted)"}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleAnular}
                disabled={savingAnular}
                className="flex-1 py-2 rounded-lg text-white text-sm font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                style={{ background: "var(--kipu-danger)" }}
              >
                {savingAnular ? (
                  <div
                    className="w-3.5 h-3.5 border-2 border-t-transparent rounded-full animate-spin"
                    style={{ borderColor: "#FFFFFF", borderTopColor: "transparent" }}
                  />
                ) : (
                  <Ban size={14} />
                )}
                Anular
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}