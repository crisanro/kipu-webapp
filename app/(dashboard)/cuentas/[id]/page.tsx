"use client";
import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import api from "@/lib/api";
import { useAuthStore } from "@/store/auth.store";
import { hoyEC } from "@/lib/fecha";
import {
  ArrowLeft, Loader2, Plus, X, Save, Ban,
  TrendingUp, TrendingDown, CheckCircle2, Clock,
  AlertTriangle, Wallet, User, Calendar, FileText,
} from "lucide-react";
import { clsx } from "clsx";

// ── Helpers ────────────────────────────────────────────────────────────────────
const fmt = (n: number) => `$${n.toFixed(2)}`;

const ESTADO_CONFIG = {
  PENDIENTE: { label: "Pendiente", color: "text-amber-400 bg-amber-400/10",    icon: Clock         },
  PARCIAL:   { label: "Parcial",   color: "text-blue-400 bg-blue-400/10",      icon: AlertTriangle },
  PAGADO:    { label: "Pagado",    color: "text-emerald-400 bg-emerald-400/10", icon: CheckCircle2  },
  ANULADO:   { label: "Anulado",   color: "text-gray-500 bg-gray-500/10",      icon: Ban           },
};

const FORMAS_PAGO = ["EFECTIVO", "TRANSFERENCIA", "CHEQUE", "TARJETA", "OTRO"];

export default function DetalleCuentaPage() {
  const { id }  = useParams();
  const router  = useRouter();

  const empresa  = useAuthStore((s) => s.empresa);
  const tieneSub = empresa?.suscripcion_activa ?? false;

  const [data,         setData]         = useState<any>(null);
  const [loading,      setLoading]      = useState(true);
  const [showAbono,    setShowAbono]    = useState(false);
  const [showAnular,   setShowAnular]   = useState(false);
  const [savingAbono,  setSavingAbono]  = useState(false);
  const [savingAnular, setSavingAnular] = useState(false);
  const [error,        setError]        = useState("");

  const [abonoForm, setAbonoForm] = useState({
    monto:      "",
    fecha:      hoyEC(),
    forma_pago: "EFECTIVO",
    notas:      "",
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
      <Loader2 size={24} className="animate-spin text-indigo-400" />
    </div>
  );

  if (!data) return (
    <div className="p-6 text-center">
      <Wallet size={40} className="text-gray-700 mx-auto mb-3" />
      <p className="text-gray-500">Cuenta no encontrada.</p>
      <button onClick={() => router.back()} className="mt-4 text-indigo-400 text-sm">Volver</button>
    </div>
  );

  const { cuenta, abonos } = data;
  const est    = ESTADO_CONFIG[cuenta.estado as keyof typeof ESTADO_CONFIG] ?? ESTADO_CONFIG.PENDIENTE;
  const Icon   = est.icon;
  const activa = cuenta.estado === "PENDIENTE" || cuenta.estado === "PARCIAL";
  const porcentaje = cuenta.monto_total > 0
    ? Math.min(100, (cuenta.monto_pagado / cuenta.monto_total) * 100)
    : 0;

  const vencida = cuenta.fecha_vencimiento &&
    new Date(cuenta.fecha_vencimiento) < new Date() && activa;

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto space-y-4">

      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.back()}
          className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
        >
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold text-white truncate">{cuenta.concepto}</h1>
          <div className="flex items-center gap-2 mt-0.5">
            <span className={clsx(
              "text-xs px-2 py-0.5 rounded-full font-medium",
              cuenta.tipo === "COBRAR"
                ? "bg-emerald-400/10 text-emerald-400"
                : "bg-red-400/10 text-red-400"
            )}>
              {cuenta.tipo === "COBRAR" ? "Por cobrar" : "Por pagar"}
            </span>
            <span className={clsx("text-xs px-2 py-0.5 rounded-full flex items-center gap-1", est.color)}>
              <Icon size={10} />
              {est.label}
            </span>
            {vencida && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-red-500/10 text-red-400 flex items-center gap-1">
                <AlertTriangle size={10} />
                Vencida
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Tarjeta principal */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
        {/* Montos */}
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div>
            <p className="text-xs text-gray-500 mb-1">Total</p>
            <p className="text-lg font-bold text-white">{fmt(cuenta.monto_total)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-1">Pagado</p>
            <p className="text-lg font-bold text-emerald-400">{fmt(cuenta.monto_pagado)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-1">Pendiente</p>
            <p className="text-lg font-bold text-amber-400">{fmt(cuenta.saldo_pendiente)}</p>
          </div>
        </div>

        {/* Barra de progreso */}
        <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden mb-4">
          <div
            className={clsx(
              "h-full rounded-full transition-all",
              cuenta.estado === "PAGADO" ? "bg-emerald-500" : "bg-indigo-500"
            )}
            style={{ width: `${porcentaje}%` }}
          />
        </div>

        {/* Datos */}
        <div className="space-y-2.5 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-500 flex items-center gap-2">
              <User size={13} /> Persona
            </span>
            <Link
              href={`/personas/${cuenta.cliente_id}`}
              className="text-indigo-400 hover:text-indigo-300 font-medium truncate max-w-[60%] text-right"
            >
              {cuenta.razon_social}
            </Link>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500 flex items-center gap-2">
              <Calendar size={13} /> Fecha
            </span>
            <span className="text-white">{cuenta.fecha_emision}</span>
          </div>
          {cuenta.fecha_vencimiento && (
            <div className="flex justify-between">
              <span className="text-gray-500 flex items-center gap-2">
                <Calendar size={13} /> Vencimiento
              </span>
              <span className={clsx("font-medium", vencida ? "text-red-400" : "text-white")}>
                {cuenta.fecha_vencimiento}
                {vencida && " ⚠️"}
              </span>
            </div>
          )}
          {cuenta.notas && (
            <div className="flex justify-between gap-4">
              <span className="text-gray-500 flex items-center gap-2 shrink-0">
                <FileText size={13} /> Notas
              </span>
              <span className="text-white text-right">{cuenta.notas}</span>
            </div>
          )}
        </div>

        {/* Acciones */}
        {activa && tieneSub && (
          <div className="flex gap-2 mt-5 pt-4 border-t border-gray-800">
            <button
              onClick={() => { setShowAbono(true); setError(""); }}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium transition-colors"
            >
              <Plus size={14} />
              Registrar abono
            </button>
            <button
              onClick={() => setShowAnular(true)}
              className="px-4 py-2.5 rounded-lg border border-gray-700 text-gray-400 hover:text-red-400 hover:border-red-500/50 text-sm transition-colors"
            >
              <Ban size={14} />
            </button>
          </div>
        )}
        {activa && !tieneSub && (
          <div className="mt-5 pt-4 border-t border-gray-800">
            <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20">
              <AlertTriangle size={13} className="text-amber-400 shrink-0" />
              <p className="text-xs text-amber-300">Requiere suscripción activa para registrar abonos.</p>
              <Link href="/planes" className="ml-auto text-xs text-amber-400 underline shrink-0">Ver planes</Link>
            </div>
          </div>
        )}
      </div>

      {/* Historial de abonos */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-800">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
            Abonos ({abonos.length})
          </h2>
        </div>
        {abonos.length === 0 ? (
          <div className="px-4 py-8 text-center">
            <p className="text-xs text-gray-600">Sin abonos registrados.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-800">
            {abonos.map((a: any, i: number) => (
              <div key={a.id} className="flex items-center gap-3 px-4 py-3">
                <div className="w-7 h-7 rounded-full bg-emerald-400/10 flex items-center justify-center shrink-0">
                  <CheckCircle2 size={13} className="text-emerald-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white font-medium">{fmt(a.monto)}</p>
                  <p className="text-xs text-gray-500">
                    {a.fecha}
                    {a.forma_pago && ` · ${a.forma_pago}`}
                    {a.notas && ` · ${a.notas}`}
                  </p>
                </div>
                <span className="text-xs text-gray-600">#{i + 1}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal abono */}
      {showAbono && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-xl w-full max-w-sm">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800">
              <h2 className="text-sm font-semibold text-white">Registrar abono</h2>
              <button onClick={() => setShowAbono(false)} className="text-gray-500 hover:text-white">
                <X size={18} />
              </button>
            </div>
            <div className="p-5 space-y-3">
              <div className="bg-gray-800 rounded-lg px-3 py-2 text-xs text-gray-400">
                Saldo pendiente: <span className="text-amber-400 font-semibold">{fmt(cuenta.saldo_pendiente)}</span>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1.5">Monto *</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">$</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={abonoForm.monto}
                    onChange={(e) => setAbonoForm({ ...abonoForm, monto: e.target.value })}
                    placeholder="0.00"
                    className="w-full pl-7 pr-4 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500 text-sm"
                    autoFocus
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1.5">Fecha</label>
                <input
                  type="date"
                  value={abonoForm.fecha}
                  onChange={(e) => setAbonoForm({ ...abonoForm, fecha: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white focus:outline-none focus:border-indigo-500 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1.5">Forma de pago</label>
                <div className="relative">
                  <select
                    value={abonoForm.forma_pago}
                    onChange={(e) => setAbonoForm({ ...abonoForm, forma_pago: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white focus:outline-none focus:border-indigo-500 text-sm appearance-none"
                  >
                    {FORMAS_PAGO.map((f) => (
                      <option key={f} value={f}>{f}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1.5">Notas</label>
                <input
                  value={abonoForm.notas}
                  onChange={(e) => setAbonoForm({ ...abonoForm, notas: e.target.value })}
                  placeholder="Opcional..."
                  className="w-full px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500 text-sm"
                />
              </div>
              {error && (
                <p className="text-xs text-red-400 bg-red-400/10 px-3 py-2 rounded-lg">{error}</p>
              )}
              <div className="flex gap-3 pt-1">
                <button
                  onClick={() => setShowAbono(false)}
                  className="flex-1 py-2.5 rounded-lg border border-gray-700 text-gray-400 hover:text-white text-sm transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleAbono}
                  disabled={savingAbono}
                  className="flex-1 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-medium transition-colors flex items-center justify-center gap-2"
                >
                  {savingAbono ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                  Guardar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal anular */}
      {showAnular && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-xl w-full max-w-sm p-5 space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-full bg-red-500/20 flex items-center justify-center shrink-0">
                <Ban size={16} className="text-red-400" />
              </div>
              <div>
                <p className="text-white font-semibold text-sm">¿Anular esta cuenta?</p>
                <p className="text-gray-400 text-xs mt-1">
                  Esta acción no se puede deshacer. La cuenta quedará marcada como anulada.
                </p>
              </div>
            </div>
            {error && (
              <p className="text-xs text-red-400 bg-red-400/10 px-3 py-2 rounded-lg">{error}</p>
            )}
            <div className="flex gap-2">
              <button
                onClick={() => setShowAnular(false)}
                className="flex-1 py-2 rounded-lg border border-gray-700 text-gray-400 hover:text-white text-sm transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleAnular}
                disabled={savingAnular}
                className="flex-1 py-2 rounded-lg bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white text-sm font-medium transition-colors flex items-center justify-center gap-2"
              >
                {savingAnular ? <Loader2 size={14} className="animate-spin" /> : <Ban size={14} />}
                Anular
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}