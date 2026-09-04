"use client";
import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import api from "@/lib/api";
import {
  Wallet, Plus, Loader2, X, ChevronDown, Save,
  TrendingUp, TrendingDown, Scale, Search, Filter,
  AlertTriangle, CheckCircle2, Clock, Ban,
} from "lucide-react";
import { clsx } from "clsx";

// ── Tipos ──────────────────────────────────────────────────────────────────────
interface Cuenta {
  id:                string;
  tipo:              "COBRAR" | "PAGAR";
  concepto:          string;
  monto_total:       number;
  monto_pagado:      number;
  saldo_pendiente:   number;
  fecha_emision:     string;
  fecha_vencimiento: string | null;
  estado:            "PENDIENTE" | "PARCIAL" | "PAGADO" | "ANULADO";
  notas:             string | null;
  cliente_id:        string;
  razon_social:      string;
  identificacion:    string;
}

interface Resumen {
  por_cobrar: number;
  por_pagar:  number;
  balance:    number;
}

// ── Helpers ────────────────────────────────────────────────────────────────────
const fmt = (n: number) => `$${n.toFixed(2)}`;

const ESTADO_CONFIG = {
  PENDIENTE: { label: "Pendiente", color: "text-amber-400 bg-amber-400/10",   icon: Clock        },
  PARCIAL:   { label: "Parcial",   color: "text-blue-400 bg-blue-400/10",     icon: AlertTriangle },
  PAGADO:    { label: "Pagado",    color: "text-emerald-400 bg-emerald-400/10", icon: CheckCircle2 },
  ANULADO:   { label: "Anulado",   color: "text-gray-500 bg-gray-500/10",     icon: Ban          },
};

const FORMAS_PAGO = ["EFECTIVO", "TRANSFERENCIA", "CHEQUE", "TARJETA", "OTRO"];

const EMPTY_FORM = {
  cliente_id:        "",
  tipo:              "COBRAR",
  concepto:          "",
  monto_total:       "",
  fecha_emision:     new Date().toISOString().split("T")[0],
  fecha_vencimiento: "",
  notas:             "",
};

// ── Página ─────────────────────────────────────────────────────────────────────
export default function CuentasPage() {
  const [cuentas,    setCuentas]    = useState<Cuenta[]>([]);
  const [resumen,    setResumen]    = useState<Resumen>({ por_cobrar: 0, por_pagar: 0, balance: 0 });
  const [loading,    setLoading]    = useState(true);
  const [query,      setQuery]      = useState("");
  const [filtroTipo, setFiltroTipo] = useState<"" | "COBRAR" | "PAGAR">("");
  const [filtroEst,  setFiltroEst]  = useState("");

  // Modal nueva cuenta
  const [showModal,  setShowModal]  = useState(false);
  const [form,       setForm]       = useState<any>(EMPTY_FORM);
  const [saving,     setSaving]     = useState(false);
  const [error,      setError]      = useState("");

  // Búsqueda de cliente en el modal
  const [clienteQuery,    setClienteQuery]    = useState("");
  const [clientesBusq,    setClientesBusq]    = useState<any[]>([]);
  const [buscandoCliente, setBuscandoCliente] = useState(false);
  const [clienteSelec,    setClienteSelec]    = useState<any>(null);

  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (filtroTipo) params.tipo   = filtroTipo;
      if (filtroEst)  params.estado = filtroEst;
      const res = await api.get("/api/v1/app/cuentas", { params });
      setCuentas(res.data.data    ?? []);
      setResumen(res.data.resumen ?? { por_cobrar: 0, por_pagar: 0, balance: 0 });
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [filtroTipo, filtroEst]);

  useEffect(() => { cargar(); }, [cargar]);

  // Buscar clientes para el selector del modal
  useEffect(() => {
    if (clienteQuery.length < 2) { setClientesBusq([]); return; }
    const timer = setTimeout(async () => {
      setBuscandoCliente(true);
      try {
        const res = await api.get("/api/v1/app/clientes", { params: { q: clienteQuery } });
        setClientesBusq(res.data.data ?? []);
      } catch { setClientesBusq([]); }
      finally { setBuscandoCliente(false); }
    }, 350);
    return () => clearTimeout(timer);
  }, [clienteQuery]);

  const filtradas = cuentas.filter((c) => {
    if (!query) return true;
    const q = query.toLowerCase();
    return (
      c.razon_social?.toLowerCase().includes(q) ||
      c.concepto?.toLowerCase().includes(q) ||
      c.identificacion?.includes(q)
    );
  });

    const handleGuardar = async () => {
    setError("");
    if (!clienteSelec)      return setError("Selecciona una persona.");
    if (!form.concepto)     return setError("El concepto es obligatorio.");
    if (!form.monto_total || parseFloat(form.monto_total) <= 0)
        return setError("El monto debe ser mayor a cero.");

    setSaving(true);
    try {
        await api.post("/api/v1/app/cuentas", {
        cliente_id: clienteSelec.id ?? clienteSelec.uid,
        tipo:              form.tipo,
        concepto:          form.concepto,
        monto_total:       parseFloat(form.monto_total),
        fecha_emision:     form.fecha_emision     || null,
        fecha_vencimiento: form.fecha_vencimiento || null,
        notas:             form.notas             || null,
        });
        await cargar();
        setShowModal(false);
        resetModal();
    } catch (err: any) {
        const detail = err?.response?.data?.detail;
        if (Array.isArray(detail)) {
        setError(detail.map((e: any) => e.mensaje ?? e.msg ?? JSON.stringify(e)).join(", "));
        } else {
        setError(detail ?? "Error al guardar.");
        }
    } finally {
        setSaving(false);
    }
    };

  const resetModal = () => {
    setForm(EMPTY_FORM);
    setClienteQuery("");
    setClientesBusq([]);
    setClienteSelec(null);
    setError("");
  };

  return (
    <div className="p-4 md:p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-white">Cuentas</h1>
          <p className="text-sm text-gray-500">{cuentas.length} registradas</p>
        </div>
        <button
          onClick={() => { setShowModal(true); resetModal(); }}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium transition-colors"
        >
          <Plus size={15} />
          Nueva cuenta
        </button>
      </div>

      {/* Resumen */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp size={14} className="text-emerald-400" />
            <p className="text-xs text-gray-500">Por cobrar</p>
          </div>
          <p className="text-xl font-bold text-emerald-400">{fmt(resumen.por_cobrar)}</p>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <TrendingDown size={14} className="text-red-400" />
            <p className="text-xs text-gray-500">Por pagar</p>
          </div>
          <p className="text-xl font-bold text-red-400">{fmt(resumen.por_pagar)}</p>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <Scale size={14} className={resumen.balance >= 0 ? "text-indigo-400" : "text-amber-400"} />
            <p className="text-xs text-gray-500">Balance</p>
          </div>
          <p className={clsx(
            "text-xl font-bold",
            resumen.balance >= 0 ? "text-indigo-400" : "text-amber-400"
          )}>
            {fmt(resumen.balance)}
          </p>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex gap-2 mb-4 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por persona o concepto..."
            className="w-full pl-9 pr-4 py-2.5 rounded-lg bg-gray-900 border border-gray-800 text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500 text-sm"
          />
        </div>
        <div className="relative">
          <select
            value={filtroTipo}
            onChange={(e) => setFiltroTipo(e.target.value as any)}
            className="pl-3 pr-8 py-2.5 rounded-lg bg-gray-900 border border-gray-800 text-white focus:outline-none focus:border-indigo-500 text-sm appearance-none"
          >
            <option value="">Todos</option>
            <option value="COBRAR">Por cobrar</option>
            <option value="PAGAR">Por pagar</option>
          </select>
          <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
        </div>
        <div className="relative">
          <select
            value={filtroEst}
            onChange={(e) => setFiltroEst(e.target.value)}
            className="pl-3 pr-8 py-2.5 rounded-lg bg-gray-900 border border-gray-800 text-white focus:outline-none focus:border-indigo-500 text-sm appearance-none"
          >
            <option value="">Todos los estados</option>
            <option value="PENDIENTE">Pendiente</option>
            <option value="PARCIAL">Parcial</option>
            <option value="PAGADO">Pagado</option>
            <option value="ANULADO">Anulado</option>
          </select>
          <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
        </div>
      </div>

      {/* Lista */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={24} className="animate-spin text-indigo-400" />
        </div>
      ) : filtradas.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Wallet size={40} className="text-gray-700 mb-3" />
          <p className="text-gray-500 text-sm">
            {query || filtroTipo || filtroEst
              ? "No hay cuentas que coincidan con los filtros."
              : "Aún no tienes cuentas registradas."}
          </p>
          {!query && !filtroTipo && !filtroEst && (
            <button
              onClick={() => { setShowModal(true); resetModal(); }}
              className="mt-4 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium transition-colors"
            >
              Registrar primera cuenta
            </button>
          )}
        </div>
      ) : (
        <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
          <div className="divide-y divide-gray-800">
            {filtradas.map((c) => {
              const est  = ESTADO_CONFIG[c.estado] ?? ESTADO_CONFIG.PENDIENTE;
              const Icon = est.icon;
              const vencida = c.fecha_vencimiento &&
                new Date(c.fecha_vencimiento) < new Date() &&
                c.estado !== "PAGADO" && c.estado !== "ANULADO";

              return (
                <Link
                  key={c.id}
                  href={`/cuentas/${c.id}`}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-gray-800/50 transition-colors"
                >
                  {/* Tipo badge */}
                  <div className={clsx(
                    "w-9 h-9 rounded-full flex items-center justify-center shrink-0 text-xs font-bold",
                    c.tipo === "COBRAR"
                      ? "bg-emerald-400/10 text-emerald-400"
                      : "bg-red-400/10 text-red-400"
                  )}>
                    {c.tipo === "COBRAR" ? "C" : "P"}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">{c.concepto}</p>
                    <p className="text-xs text-gray-500 truncate">
                      {c.razon_social}
                      {c.fecha_vencimiento && (
                        <span className={clsx("ml-2", vencida ? "text-red-400" : "text-gray-600")}>
                          · Vence {c.fecha_vencimiento}
                          {vencida && " ⚠️"}
                        </span>
                      )}
                    </p>
                  </div>

                  {/* Montos */}
                  <div className="text-right shrink-0">
                    <p className="text-sm font-semibold text-white">{fmt(c.saldo_pendiente)}</p>
                    <p className="text-xs text-gray-600">de {fmt(c.monto_total)}</p>
                  </div>

                  {/* Estado */}
                  <div className={clsx(
                    "flex items-center gap-1 px-2 py-1 rounded-full text-xs shrink-0 hidden sm:flex",
                    est.color
                  )}>
                    <Icon size={11} />
                    {est.label}
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* Modal nueva cuenta */}
      {showModal && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-xl w-full max-w-md">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800">
              <h2 className="text-sm font-semibold text-white">Nueva cuenta</h2>
              <button onClick={() => { setShowModal(false); resetModal(); }} className="text-gray-500 hover:text-white">
                <X size={18} />
              </button>
            </div>

            <div className="p-5 space-y-3">
              {/* Tipo */}
              <div className="grid grid-cols-2 gap-2">
                {(["COBRAR", "PAGAR"] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setForm({ ...form, tipo: t })}
                    className={clsx(
                      "py-2.5 rounded-lg text-sm font-medium border transition-colors",
                      form.tipo === t
                        ? t === "COBRAR"
                          ? "bg-emerald-600/20 border-emerald-500/50 text-emerald-400"
                          : "bg-red-600/20 border-red-500/50 text-red-400"
                        : "border-gray-700 text-gray-500 hover:text-white"
                    )}
                  >
                    {t === "COBRAR" ? "Por cobrar" : "Por pagar"}
                  </button>
                ))}
              </div>

              {/* Selector de persona */}
              <div>
                <label className="block text-xs text-gray-500 mb-1.5">Persona *</label>
                {clienteSelec ? (
                  <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-800 border border-gray-700">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white truncate">{clienteSelec.razon_social}</p>
                      <p className="text-xs text-gray-500">{clienteSelec.identificacion}</p>
                    </div>
                    <button
                      onClick={() => { setClienteSelec(null); setClienteQuery(""); }}
                      className="text-gray-500 hover:text-white shrink-0"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ) : (
                  <div className="relative">
                    <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                    <input
                      value={clienteQuery}
                      onChange={(e) => setClienteQuery(e.target.value)}
                      placeholder="Buscar por nombre o identificación..."
                      className="w-full pl-9 pr-4 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500 text-sm"
                    />
                    {buscandoCliente && (
                      <Loader2 size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 animate-spin" />
                    )}
                    {clientesBusq.length > 0 && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-gray-800 border border-gray-700 rounded-lg overflow-hidden z-10 shadow-xl">
                        {clientesBusq.map((cl) => (
                          <button
                            key={cl.uid}
                            onClick={() => { setClienteSelec(cl); setClienteQuery(""); setClientesBusq([]); }}
                            className="w-full flex items-start gap-2 px-3 py-2.5 hover:bg-gray-700 transition-colors text-left"
                          >
                            <div>
                              <p className="text-sm text-white">{cl.razon_social}</p>
                              <p className="text-xs text-gray-500">{cl.identificacion}</p>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Concepto */}
              <div>
                <label className="block text-xs text-gray-500 mb-1.5">Concepto *</label>
                <input
                  value={form.concepto}
                  onChange={(e) => setForm({ ...form, concepto: e.target.value })}
                  placeholder="Descripción de la deuda..."
                  className="w-full px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500 text-sm"
                />
              </div>

              {/* Monto */}
              <div>
                <label className="block text-xs text-gray-500 mb-1.5">Monto total *</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">$</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.monto_total}
                    onChange={(e) => setForm({ ...form, monto_total: e.target.value })}
                    placeholder="0.00"
                    className="w-full pl-7 pr-4 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500 text-sm"
                  />
                </div>
              </div>

              {/* Fechas */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1.5">Fecha</label>
                  <input
                    type="date"
                    value={form.fecha_emision}
                    onChange={(e) => setForm({ ...form, fecha_emision: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white focus:outline-none focus:border-indigo-500 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1.5">Vencimiento</label>
                  <input
                    type="date"
                    value={form.fecha_vencimiento}
                    onChange={(e) => setForm({ ...form, fecha_vencimiento: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white focus:outline-none focus:border-indigo-500 text-sm"
                  />
                </div>
              </div>

              {/* Notas */}
              <div>
                <label className="block text-xs text-gray-500 mb-1.5">Notas</label>
                <textarea
                  value={form.notas}
                  onChange={(e) => setForm({ ...form, notas: e.target.value })}
                  placeholder="Notas adicionales (opcional)..."
                  rows={2}
                  className="w-full px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500 text-sm resize-none"
                />
              </div>

              {error && (
                <p className="text-xs text-red-400 bg-red-400/10 px-3 py-2 rounded-lg">{error}</p>
              )}

              <div className="flex gap-3 pt-1">
                <button
                  onClick={() => { setShowModal(false); resetModal(); }}
                  className="flex-1 py-2.5 rounded-lg border border-gray-700 text-gray-400 hover:text-white text-sm transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleGuardar}
                  disabled={saving}
                  className="flex-1 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-medium transition-colors flex items-center justify-center gap-2"
                >
                  {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                  Guardar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}