"use client";
import { useState, useEffect, useCallback, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import api from "@/lib/api";
import { usePermiso } from "@/hooks/usePermiso";
import SinAcceso from "@/components/SinAcceso";
import { useAuthStore } from "@/store/auth.store";
import { hoyEC } from "@/lib/fecha";
import {
  Wallet, Plus, X, ChevronDown, Save,
  TrendingUp, TrendingDown, Scale, Search,
  AlertTriangle, CheckCircle2, Clock, Ban,
} from "lucide-react";

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
  PENDIENTE: { label: "Pendiente", color: "var(--kipu-warning)", bg: "color-mix(in srgb, var(--kipu-warning) 10%, transparent)", icon: Clock },
  PARCIAL:   { label: "Parcial",   color: "#60a5fa",           bg: "color-mix(in srgb, #60a5fa 10%, transparent)",           icon: AlertTriangle },
  PAGADO:    { label: "Pagado",    color: "var(--kipu-success)", bg: "color-mix(in srgb, var(--kipu-success) 10%, transparent)", icon: CheckCircle2 },
  ANULADO:   { label: "Anulado",   color: "var(--kipu-subtle)",  bg: "color-mix(in srgb, var(--kipu-subtle) 10%, transparent)",  icon: Ban },
};

const EMPTY_FORM = {
  cliente_id:        "",
  tipo:              "COBRAR",
  concepto:          "",
  monto_total:       "",
  fecha_emision:     hoyEC(),
  fecha_vencimiento: "",
  notas:             "",
};

// ── Componente Interno ─────────────────────────────────────────────────────────
function CuentasContent() {
  const searchParams = useSearchParams();

  const [cuentas,    setCuentas]    = useState<Cuenta[]>([]);
  const [resumen,    setResumen]    = useState<Resumen>({ por_cobrar: 0, por_pagar: 0, balance: 0 });
  const [loading,    setLoading]    = useState(true);
  const [query,      setQuery]      = useState("");
  const [filtroTipo, setFiltroTipo] = useState<"" | "COBRAR" | "PAGAR">("");
  const [filtroEst,  setFiltroEst]  = useState("");

  const empresa  = useAuthStore((s) => s.empresa);
  const tieneSub = empresa?.suscripcion_activa ?? false;

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

  // Manejo de query param para preseleccionar cliente
  useEffect(() => {
    const clienteId = searchParams.get("cliente");
    if (!clienteId) return;
    const preseleccionar = async () => {
      try {
        const res = await api.get(`/api/v1/app/clientes/detalle/${clienteId}`);
        const c = res.data.cliente;
        if (c) {
          setClienteSelec({ id: c.id, razon_social: c.razon_social, identificacion: c.identificacion });
          setShowModal(true);
          setError("");
        }
      } catch (e) {
        console.error(e);
      }
    };
    preseleccionar();
  }, [searchParams]);

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
        fecha_emision:     form.fecha_emision      || null,
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
          <h1 className="text-xl font-bold" style={{ color: "var(--kipu-text)" }}>Cuentas</h1>
          <p className="text-sm" style={{ color: "var(--kipu-subtle)" }}>{cuentas.length} registradas</p>
        </div>
        <button
          type="button"
          onClick={() => { if (!tieneSub) return; setShowModal(true); resetModal(); }}
          disabled={!tieneSub}
          title={!tieneSub ? "Requiere suscripción activa" : undefined}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:cursor-not-allowed"
          style={{
            background: tieneSub ? "var(--kipu-accent)" : "var(--kipu-surface)",
            color: tieneSub ? "#FFFFFF" : "var(--kipu-subtle)",
            border: tieneSub ? "none" : "1px solid var(--kipu-border)",
          }}
          onMouseEnter={e => {
            if (tieneSub) e.currentTarget.style.background = "var(--kipu-accent-h)";
          }}
          onMouseLeave={e => {
            if (tieneSub) e.currentTarget.style.background = "var(--kipu-accent)";
          }}
        >
          <Plus size={15} />
          Nueva cuenta
        </button>
      </div>

      {!tieneSub && (
        <div
          className="flex items-center gap-3 rounded-xl px-4 py-3 mb-4"
          style={{
            background: "color-mix(in srgb, var(--kipu-warning) 10%, transparent)",
            border: "1px solid color-mix(in srgb, var(--kipu-warning) 20%, transparent)",
          }}
        >
          <AlertTriangle size={15} className="shrink-0" style={{ color: "var(--kipu-warning)" }} />
          <div className="flex-1">
            <p className="text-sm font-medium" style={{ color: "var(--kipu-warning)" }}>Suscripción requerida</p>
            <p className="text-xs" style={{ color: "color-mix(in srgb, var(--kipu-warning) 80%, transparent)" }}>Las cuentas por cobrar/pagar requieren un plan activo.</p>
          </div>
          <Link
            href="/planes"
            className="text-xs underline underline-offset-2 shrink-0 transition-colors"
            style={{ color: "var(--kipu-warning)" }}
          >
            Ver planes
          </Link>
        </div>
      )}

      {/* Resumen */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div
          className="rounded-xl p-4"
          style={{
            background: "var(--kipu-surface)",
            border: "1px solid var(--kipu-border)",
          }}
        >
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp size={14} style={{ color: "var(--kipu-success)" }} />
            <p className="text-xs" style={{ color: "var(--kipu-subtle)" }}>Por cobrar</p>
          </div>
          <p className="text-xl font-bold" style={{ color: "var(--kipu-success)" }}>{fmt(resumen.por_cobrar)}</p>
        </div>
        <div
          className="rounded-xl p-4"
          style={{
            background: "var(--kipu-surface)",
            border: "1px solid var(--kipu-border)",
          }}
        >
          <div className="flex items-center gap-2 mb-1">
            <TrendingDown size={14} style={{ color: "var(--kipu-danger)" }} />
            <p className="text-xs" style={{ color: "var(--kipu-subtle)" }}>Por pagar</p>
          </div>
          <p className="text-xl font-bold" style={{ color: "var(--kipu-danger)" }}>{fmt(resumen.por_pagar)}</p>
        </div>
        <div
          className="rounded-xl p-4"
          style={{
            background: "var(--kipu-surface)",
            border: "1px solid var(--kipu-border)",
          }}
        >
          <div className="flex items-center gap-2 mb-1">
            <Scale
              size={14}
              style={{ color: resumen.balance >= 0 ? "var(--kipu-accent)" : "var(--kipu-warning)" }}
            />
            <p className="text-xs" style={{ color: "var(--kipu-subtle)" }}>Balance</p>
          </div>
          <p
            className="text-xl font-bold"
            style={{ color: resumen.balance >= 0 ? "var(--kipu-accent)" : "var(--kipu-warning)" }}
          >
            {fmt(resumen.balance)}
          </p>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex gap-2 mb-4 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--kipu-subtle)" }} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por persona o concepto..."
            className="w-full pl-9 pr-4 py-2.5 rounded-lg text-sm transition-colors focus:outline-none"
            style={{
              background: "var(--kipu-surface)",
              border: "1px solid var(--kipu-border)",
              color: "var(--kipu-text)",
            }}
            onFocus={e => e.currentTarget.style.borderColor = "var(--kipu-accent)"}
            onBlur={e => e.currentTarget.style.borderColor = "var(--kipu-border)"}
          />
        </div>
        <div className="relative">
          <select
            value={filtroTipo}
            onChange={(e) => setFiltroTipo(e.target.value as any)}
            className="pl-3 pr-8 py-2.5 rounded-lg text-sm appearance-none transition-colors focus:outline-none"
            style={{
              background: "var(--kipu-surface)",
              border: "1px solid var(--kipu-border)",
              color: "var(--kipu-text)",
            }}
            onFocus={e => e.currentTarget.style.borderColor = "var(--kipu-accent)"}
            onBlur={e => e.currentTarget.style.borderColor = "var(--kipu-border)"}
          >
            <option value="">Todos</option>
            <option value="COBRAR">Por cobrar</option>
            <option value="PAGAR">Por pagar</option>
          </select>
          <ChevronDown
            size={13}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none"
            style={{ color: "var(--kipu-subtle)" }}
          />
        </div>
        <div className="relative">
          <select
            value={filtroEst}
            onChange={(e) => setFiltroEst(e.target.value)}
            className="pl-3 pr-8 py-2.5 rounded-lg text-sm appearance-none transition-colors focus:outline-none"
            style={{
              background: "var(--kipu-surface)",
              border: "1px solid var(--kipu-border)",
              color: "var(--kipu-text)",
            }}
            onFocus={e => e.currentTarget.style.borderColor = "var(--kipu-accent)"}
            onBlur={e => e.currentTarget.style.borderColor = "var(--kipu-border)"}
          >
            <option value="">Todos los estados</option>
            <option value="PENDIENTE">Pendiente</option>
            <option value="PARCIAL">Parcial</option>
            <option value="PAGADO">Pagado</option>
            <option value="ANULADO">Anulado</option>
          </select>
          <ChevronDown
            size={13}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none"
            style={{ color: "var(--kipu-subtle)" }}
          />
        </div>
      </div>

      {/* Lista */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div
            className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin"
            style={{ borderColor: "var(--kipu-accent)", borderTopColor: "transparent" }}
          />
        </div>
      ) : filtradas.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Wallet size={40} className="mb-3" style={{ color: "var(--kipu-subtle)" }} />
          <p className="text-sm" style={{ color: "var(--kipu-muted)" }}>
            {query || filtroTipo || filtroEst
              ? "No hay cuentas que coincidan con los filtros."
              : "Aún no tienes cuentas registradas."}
          </p>
          {!query && !filtroTipo && !filtroEst && (
            tieneSub ? (
              <button
                type="button"
                onClick={() => { setShowModal(true); resetModal(); }}
                className="mt-4 px-4 py-2 rounded-lg text-white text-sm font-medium transition-colors"
                style={{ background: "var(--kipu-accent)" }}
                onMouseEnter={e => e.currentTarget.style.background = "var(--kipu-accent-h)"}
                onMouseLeave={e => e.currentTarget.style.background = "var(--kipu-accent)"}
              >
                Registrar primera cuenta
              </button>
            ) : (
              <Link
                href="/planes"
                className="mt-4 px-4 py-2 rounded-lg text-white text-sm font-medium transition-colors inline-block"
                style={{ background: "var(--kipu-warning)" }}
              >
                Ver planes
              </Link>
            )
          )}
        </div>
      ) : (
        <div
          className="rounded-xl overflow-hidden"
          style={{
            background: "var(--kipu-surface)",
            border: "1px solid var(--kipu-border)",
          }}
        >
          <div>
            {filtradas.map((c, idx) => {
              const est  = ESTADO_CONFIG[c.estado] ?? ESTADO_CONFIG.PENDIENTE;
              const Icon = est.icon;
              const vencida = c.fecha_vencimiento &&
                new Date(c.fecha_vencimiento) < new Date() &&
                c.estado !== "PAGADO" && c.estado !== "ANULADO";

              return (
                <Link
                  key={c.id}
                  href={`/cuentas/${c.id}`}
                  className="flex items-center gap-3 px-4 py-3 transition-colors"
                  style={{
                    borderTop: idx > 0 ? "1px solid var(--kipu-border)" : "none",
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = "color-mix(in srgb, var(--kipu-text) 4%, transparent)"}
                  onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                >
                  {/* Tipo badge */}
                  <div
                    className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 text-xs font-bold"
                    style={{
                      background: c.tipo === "COBRAR"
                        ? "color-mix(in srgb, var(--kipu-success) 10%, transparent)"
                        : "color-mix(in srgb, var(--kipu-danger) 10%, transparent)",
                      color: c.tipo === "COBRAR" ? "var(--kipu-success)" : "var(--kipu-danger)",
                    }}
                  >
                    {c.tipo === "COBRAR" ? "C" : "P"}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate" style={{ color: "var(--kipu-text)" }}>{c.concepto}</p>
                    <p className="text-xs truncate" style={{ color: "var(--kipu-subtle)" }}>
                      {c.razon_social}
                      {c.fecha_vencimiento && (
                        <span
                          className="ml-2"
                          style={{ color: vencida ? "var(--kipu-danger)" : "var(--kipu-subtle)" }}
                        >
                          · Vence {c.fecha_vencimiento}
                          {vencida && " ⚠️"}
                        </span>
                      )}
                    </p>
                  </div>

                  {/* Montos */}
                  <div className="text-right shrink-0">
                    <p className="text-sm font-semibold" style={{ color: "var(--kipu-text)" }}>{fmt(c.saldo_pendiente)}</p>
                    <p className="text-xs" style={{ color: "var(--kipu-subtle)" }}>de {fmt(c.monto_total)}</p>
                  </div>

                  {/* Estado */}
                  <div
                    className="items-center gap-1 px-2 py-1 rounded-full text-xs shrink-0 hidden sm:flex font-medium"
                    style={{
                      color: est.color,
                      background: est.bg,
                    }}
                  >
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
          <div
            className="rounded-xl w-full max-w-md"
            style={{
              background: "var(--kipu-surface)",
              border: "1px solid var(--kipu-border)",
            }}
          >
            <div
              className="flex items-center justify-between px-5 py-4"
              style={{ borderBottom: "1px solid var(--kipu-border)" }}
            >
              <h2 className="text-sm font-semibold" style={{ color: "var(--kipu-text)" }}>Nueva cuenta</h2>
              <button
                type="button"
                onClick={() => { setShowModal(false); resetModal(); }}
                className="transition-colors"
                style={{ color: "var(--kipu-subtle)" }}
                onMouseEnter={e => e.currentTarget.style.color = "var(--kipu-text)"}
                onMouseLeave={e => e.currentTarget.style.color = "var(--kipu-subtle)"}
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-5 space-y-3">
              {/* Tipo */}
              <div className="grid grid-cols-2 gap-2">
                {(["COBRAR", "PAGAR"] as const).map((t) => {
                  const isSelected = form.tipo === t;
                  return (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setForm({ ...form, tipo: t })}
                      className="py-2.5 rounded-lg text-sm font-medium transition-colors"
                      style={{
                        background: isSelected
                          ? (t === "COBRAR"
                              ? "color-mix(in srgb, var(--kipu-success) 20%, transparent)"
                              : "color-mix(in srgb, var(--kipu-danger) 20%, transparent)")
                          : "var(--kipu-surface)",
                        border: isSelected
                          ? (t === "COBRAR"
                              ? "1px solid color-mix(in srgb, var(--kipu-success) 50%, transparent)"
                              : "1px solid color-mix(in srgb, var(--kipu-danger) 50%, transparent)")
                          : "1px solid var(--kipu-border)",
                        color: isSelected
                          ? (t === "COBRAR" ? "var(--kipu-success)" : "var(--kipu-danger)")
                          : "var(--kipu-subtle)",
                      }}
                      onMouseEnter={e => {
                        if (!isSelected) e.currentTarget.style.color = "var(--kipu-text)";
                      }}
                      onMouseLeave={e => {
                        if (!isSelected) e.currentTarget.style.color = "var(--kipu-subtle)";
                      }}
                    >
                      {t === "COBRAR" ? "Por cobrar" : "Por pagar"}
                    </button>
                  );
                })}
              </div>

              {/* Selector de persona */}
              <div>
                <label className="block text-xs mb-1.5" style={{ color: "var(--kipu-subtle)" }}>Persona *</label>
                {clienteSelec ? (
                  <div
                    className="flex items-center gap-2 px-3 py-2 rounded-lg"
                    style={{
                      background: "color-mix(in srgb, var(--kipu-text) 5%, transparent)",
                      border: "1px solid var(--kipu-border)",
                    }}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm truncate" style={{ color: "var(--kipu-text)" }}>{clienteSelec.razon_social}</p>
                      <p className="text-xs" style={{ color: "var(--kipu-subtle)" }}>{clienteSelec.identificacion}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => { setClienteSelec(null); setClienteQuery(""); }}
                      className="shrink-0 transition-colors"
                      style={{ color: "var(--kipu-subtle)" }}
                      onMouseEnter={e => e.currentTarget.style.color = "var(--kipu-text)"}
                      onMouseLeave={e => e.currentTarget.style.color = "var(--kipu-subtle)"}
                    >
                      <X size={14} />
                    </button>
                  </div>
                ) : (
                  <div className="relative">
                    <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--kipu-subtle)" }} />
                    <input
                      value={clienteQuery}
                      onChange={(e) => setClienteQuery(e.target.value)}
                      placeholder="Buscar por nombre o identificación..."
                      className="w-full pl-9 pr-4 py-2 rounded-lg text-sm transition-colors focus:outline-none"
                      style={{
                        background: "var(--kipu-surface)",
                        border: "1px solid var(--kipu-border)",
                        color: "var(--kipu-text)",
                      }}
                      onFocus={e => e.currentTarget.style.borderColor = "var(--kipu-accent)"}
                      onBlur={e => e.currentTarget.style.borderColor = "var(--kipu-border)"}
                    />
                    {buscandoCliente && (
                      <div
                        className="w-3.5 h-3.5 border-2 border-t-transparent rounded-full animate-spin absolute right-3 top-1/2 -translate-y-1/2"
                        style={{ borderColor: "var(--kipu-accent)", borderTopColor: "transparent" }}
                      />
                    )}
                    {clientesBusq.length > 0 && (
                      <div
                        className="absolute top-full left-0 right-0 mt-1 rounded-lg overflow-hidden z-10 shadow-xl"
                        style={{
                          background: "var(--kipu-surface)",
                          border: "1px solid var(--kipu-border)",
                        }}
                      >
                        {clientesBusq.map((cl) => (
                          <button
                            type="button"
                            key={cl.uid ?? cl.id}
                            onClick={() => { setClienteSelec(cl); setClienteQuery(""); setClientesBusq([]); }}
                            className="w-full flex items-start gap-2 px-3 py-2.5 text-left transition-colors"
                            onMouseEnter={e => e.currentTarget.style.background = "color-mix(in srgb, var(--kipu-text) 5%, transparent)"}
                            onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                          >
                            <div>
                              <p className="text-sm" style={{ color: "var(--kipu-text)" }}>{cl.razon_social}</p>
                              <p className="text-xs" style={{ color: "var(--kipu-subtle)" }}>{cl.identificacion}</p>
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
                <label className="block text-xs mb-1.5" style={{ color: "var(--kipu-subtle)" }}>Concepto *</label>
                <input
                  value={form.concepto}
                  onChange={(e) => setForm({ ...form, concepto: e.target.value })}
                  placeholder="Descripción de la deuda..."
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

              {/* Monto */}
              <div>
                <label className="block text-xs mb-1.5" style={{ color: "var(--kipu-subtle)" }}>Monto total *</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm" style={{ color: "var(--kipu-subtle)" }}>$</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.monto_total}
                    onChange={(e) => setForm({ ...form, monto_total: e.target.value })}
                    placeholder="0.00"
                    className="w-full pl-7 pr-4 py-2 rounded-lg text-sm transition-colors focus:outline-none"
                    style={{
                      background: "var(--kipu-surface)",
                      border: "1px solid var(--kipu-border)",
                      color: "var(--kipu-text)",
                    }}
                    onFocus={e => e.currentTarget.style.borderColor = "var(--kipu-accent)"}
                    onBlur={e => e.currentTarget.style.borderColor = "var(--kipu-border)"}
                  />
                </div>
              </div>

              {/* Fechas */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs mb-1.5" style={{ color: "var(--kipu-subtle)" }}>Fecha</label>
                  <input
                    type="date"
                    value={form.fecha_emision}
                    onChange={(e) => setForm({ ...form, fecha_emision: e.target.value })}
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
                  <label className="block text-xs mb-1.5" style={{ color: "var(--kipu-subtle)" }}>Vencimiento</label>
                  <input
                    type="date"
                    value={form.fecha_vencimiento}
                    onChange={(e) => setForm({ ...form, fecha_vencimiento: e.target.value })}
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
              </div>

              {/* Notas */}
              <div>
                <label className="block text-xs mb-1.5" style={{ color: "var(--kipu-subtle)" }}>Notas</label>
                <textarea
                  value={form.notas}
                  onChange={(e) => setForm({ ...form, notas: e.target.value })}
                  placeholder="Notas adicionales (opcional)..."
                  rows={2}
                  className="w-full px-3 py-2 rounded-lg text-sm resize-none transition-colors focus:outline-none"
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
                  onClick={() => { setShowModal(false); resetModal(); }}
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
                  onClick={handleGuardar}
                  disabled={saving}
                  className="flex-1 py-2.5 rounded-lg text-white text-sm font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                  style={{ background: "var(--kipu-accent)" }}
                  onMouseEnter={e => {
                    if (!saving) e.currentTarget.style.background = "var(--kipu-accent-h)";
                  }}
                  onMouseLeave={e => {
                    if (!saving) e.currentTarget.style.background = "var(--kipu-accent)";
                  }}
                >
                  {saving ? (
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
    </div>
  );
}

// ── Página Principal Envuelta en Suspense ──────────────────────────────────────
export default function CuentasPage() {
  const puedeVer = usePermiso("reportes");
  if (!puedeVer) return <SinAcceso />;
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center py-20">
        <div
          className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin"
          style={{ borderColor: "var(--kipu-accent)", borderTopColor: "transparent" }}
        />
      </div>
    }>
      <CuentasContent />
    </Suspense>
  );
}