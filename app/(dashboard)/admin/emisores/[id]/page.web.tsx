"use client";
import Link from "next/link";
import { useConfirmar } from "@/components/ui/Confirmar";
import { useAvisos } from "@/components/ui/Avisos";
import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import api from "@/lib/api";
import { hoyEC } from "@/lib/fecha";
import {
  ArrowLeft, Building2, CreditCard, FileText, Users,
  Plus, CheckCircle2, Clock, AlertTriangle,
  XCircle, Send, RefreshCw, Banknote, ShieldCheck,
  ShieldOff, CalendarClock, Receipt,
} from "lucide-react";
import { detalleError } from "@/lib/errores";
import { dosDecimales } from "@/lib/dinero";
import { useModoSeguro } from "@/components/admin/ModoSeguro";

const fmtDate = (d: any) => d ? new Date(d).toLocaleDateString("es-EC", { day: "2-digit", month: "short", year: "numeric" }) : "—";

// ── Estado de suscripción ───────────────────────────────────────────────────
const SUB_CONFIG: Record<string, { label: string; color: string; bg: string; border: string; icon: any }> = {
  ACTIVO:    { label: "Activo",    color: "var(--kipu-success)", bg: "color-mix(in srgb, var(--kipu-success) 10%, transparent)", border: "color-mix(in srgb, var(--kipu-success) 20%, transparent)", icon: ShieldCheck },
  TRIAL:     { label: "Trial",     color: "var(--kipu-info)",            bg: "color-mix(in srgb, var(--kipu-info) 10%, transparent)",            border: "color-mix(in srgb, var(--kipu-info) 20%, transparent)",            icon: Clock },
  CANCELADO: { label: "Cancelado", color: "var(--kipu-warning)", bg: "color-mix(in srgb, var(--kipu-warning) 10%, transparent)", border: "color-mix(in srgb, var(--kipu-warning) 20%, transparent)", icon: ShieldOff },
  VENCIDO:   { label: "Vencido",   color: "var(--kipu-danger)",  bg: "color-mix(in srgb, var(--kipu-danger) 10%, transparent)",  border: "color-mix(in srgb, var(--kipu-danger) 20%, transparent)",  icon: XCircle },
};

// ── Estado de documentos ────────────────────────────────────────────────────
const DOC_CONFIG: Record<string, { label: string; color: string; bg: string; icon: any }> = {
  AUTORIZADO: { label: "Autorizado", color: "var(--kipu-success)", bg: "color-mix(in srgb, var(--kipu-success) 10%, transparent)", icon: CheckCircle2 },
  FIRMADO:    { label: "En cola",    color: "var(--kipu-info)",            bg: "color-mix(in srgb, var(--kipu-info) 10%, transparent)",            icon: Clock },
  DEVUELTA:   { label: "Devuelta",   color: "var(--kipu-warning)", bg: "color-mix(in srgb, var(--kipu-warning) 10%, transparent)", icon: AlertTriangle },
  RECHAZADO:  { label: "Rechazado",  color: "var(--kipu-danger)",  bg: "color-mix(in srgb, var(--kipu-danger) 10%, transparent)",  icon: XCircle },
  PENDIENTE:  { label: "Pendiente",  color: "var(--kipu-subtle)",  bg: "color-mix(in srgb, var(--kipu-text) 10%, transparent)",  icon: Clock },
};

type Tab = "overview" | "suscripcion" | "documentos" | "usuarios" | "creditos" | "notificar";

export default function AdminEmisorDetallePage() {
  const confirmar = useConfirmar();
  const avisos    = useAvisos();
  // Créditos y forzar suscripción piden el PIN del correo (modo seguro, 15 min)
  const { conModoSeguro, hojaModoSeguro } = useModoSeguro();
  const { id } = useParams();
  const router = useRouter();

  const [emisor,   setEmisor]   = useState<any>(null);
  const [loading,  setLoading]  = useState(true);
  const [tab,      setTab]      = useState<Tab>("overview");

  // ── Créditos ──────────────────────────────────────────────────────────────
  const [montoRecarga, setMontoRecarga] = useState("");
  const [recargando,   setRecargando]   = useState(false);
  const [msgRecarga,   setMsgRecarga]   = useState("");

  // ── Transferencia ─────────────────────────────────────────────────────────
  // Plan y período: por defecto los que la empresa ya tiene (antes se mandaba
  // siempre PRO ANUAL y una renovación de Al Día lo pasaba a Pro).
  const [tfPlan,       setTfPlan]       = useState<"PRO" | "AL_DIA" | null>(null);
  const [tfPeriodo,    setTfPeriodo]    = useState<"MENSUAL" | "ANUAL" | null>(null);
  // Lo que el cliente transfirió, CON IVA: el backend saca la base de ahí. null =
  // el precio vigente del plan y período elegidos (leído de Stripe).
  const [tfMonto,      setTfMonto]      = useState<string | null>(null);
  const [precios,      setPrecios]      = useState<Record<string, Record<string, { total?: number } | null>> | null>(null);
  useEffect(() => {
    api.get("/api/v1/app/suscripcion/precios")
      .then((r) => setPrecios(r.data?.data ?? null))
      .catch(() => {});
  }, []);
  const [tfRef,        setTfRef]        = useState("");
  const [tfBanco,      setTfBanco]      = useState("");
  const [tfFecha,      setTfFecha]      = useState(hoyEC);
  const [tfNotas,      setTfNotas]      = useState("");
  const [activando,    setActivando]    = useState(false);
  const [msgTransf,    setMsgTransf]    = useState<{ ok: boolean; texto: string } | null>(null);

  // ── Forzar estado ─────────────────────────────────────────────────────────
  const [forzandoEstado, setForzandoEstado] = useState(false);

  // ── Editar emisor ─────────────────────────────────────────────────────────
  const [editando,     setEditando]     = useState(false);
  const [guardando,    setGuardando]    = useState(false);
  const [msgEditar,    setMsgEditar]    = useState<{ ok: boolean; texto: string } | null>(null);
  const [form, setForm] = useState({
    razon_social:           "",
    nombre_comercial:       "",
    direccion_matriz:       "",
    obligado_contabilidad: "",
    contribuyente_especial: "",
  });

  // Inicializar form cuando llega el emisor
  useEffect(() => {
    if (emisor) {
      setForm({
        razon_social:           emisor.razon_social           ?? "",
        nombre_comercial:       emisor.nombre_comercial       ?? "",
        direccion_matriz:       emisor.direccion_matriz        ?? "",
        obligado_contabilidad:  emisor.obligado_contabilidad  ?? "NO",
        contribuyente_especial: emisor.contribuyente_especial ?? "",
      });
    }
  }, [emisor]);

  // ── Notificación ──────────────────────────────────────────────────────────

  const cargar = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/api/v1/admin/panel/emisores/${id}`);
      setEmisor(res.data.data);
    } catch (e: any) {
      if (e?.response?.status === 403) router.replace("/dashboard");
      if (e?.response?.status === 404) router.replace("/admin");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { cargar(); }, [id]);

  // ── Handlers ──────────────────────────────────────────────────────────────
  const recargarCreditos = async () => {
    if (!montoRecarga || parseInt(montoRecarga) <= 0) return;
    setRecargando(true);
    setMsgRecarga("");
    try {
      await conModoSeguro(() => api.post("/api/v1/admin/panel/topup", {
        emisor_id: parseInt(id as string),
        cantidad:  parseInt(montoRecarga),
        notas:     "Recarga manual desde panel admin",
      }));
      setMsgRecarga(`✅ ${montoRecarga} créditos agregados.`);
      setMontoRecarga("");
      await cargar();
    } catch (e: any) {
      setMsgRecarga(`❌ ${detalleError(e, "Error al recargar.")}`);
    } finally {
      setRecargando(false);
    }
  };

  const planTf: "PRO" | "AL_DIA"       = tfPlan ?? (emisor?.sub_plan === "AL_DIA" ? "AL_DIA" : "PRO");
  const periodoTf: "MENSUAL" | "ANUAL" = tfPeriodo ?? (emisor?.sub_periodo === "MENSUAL" ? "MENSUAL" : "ANUAL");
  const precioTf  = precios?.[planTf]?.[periodoTf]?.total;
  const montoTf   = tfMonto ?? (precioTf ? precioTf.toFixed(2) : "");
  const NOMBRE_PLAN = { PRO: "Kipu Pro", AL_DIA: "Kipu Al Día" } as const;

  const activarTransferencia = async () => {
    if (!tfRef.trim()) {
      setMsgTransf({ ok: false, texto: "La referencia de pago es obligatoria." });
      return;
    }
    if (!(parseFloat(montoTf) > 0)) {
      setMsgTransf({ ok: false, texto: "El monto debe ser mayor a 0." });
      return;
    }
    setActivando(true);
    setMsgTransf(null);
    try {
      const res = await api.post("/api/v1/admin/panel/suscripcion/transferencia", {
        emisor_id:       parseInt(id as string),
        monto:           parseFloat(montoTf),
        referencia_pago: tfRef.trim(),
        banco:           tfBanco.trim() || null,
        fecha_pago:      tfFecha,
        notas:           tfNotas.trim() || null,
        periodo:         periodoTf,
        plan:            planTf,
      });
      setMsgTransf({ ok: true, texto: res.data.mensaje });
      setTfRef("");
      setTfBanco("");
      setTfNotas("");
      setTfFecha(hoyEC());
      setTfMonto(null);
      await cargar();
    } catch (e: any) {
      setMsgTransf({ ok: false, texto: detalleError(e, "Error al activar.") });
    } finally {
      setActivando(false);
    }
  };

  const forzarEstado = async (estado: string) => {
    if (!(await confirmar({
      titulo: `¿Forzar la suscripción a "${estado}"?`,
      mensaje: `Se mantiene ${emisor?.sub_plan === "AL_DIA" ? "Kipu Al Día" : "Kipu Pro"} ${(emisor?.sub_periodo ?? "ANUAL").toLowerCase()}. Esto no emite factura.`,
      textoConfirmar: "Forzar", peligro: true,
    }))) return;
    setForzandoEstado(true);
    try {
      await conModoSeguro(() => api.post("/api/v1/admin/panel/suscripcion/forzar", {
        emisor_id: parseInt(id as string),
        estado,
        // El plan y el período que ya tiene (antes siempre PRO ANUAL: pisaba Al Día)
        plan:      emisor?.sub_plan === "AL_DIA" ? "AL_DIA" : "PRO",
        periodo:   emisor?.sub_periodo === "MENSUAL" ? "MENSUAL" : "ANUAL",
      }));
      await cargar();
    } catch (e: any) {
      avisos.error(detalleError(e, "No se pudo forzar la suscripción."));
    } finally {
      setForzandoEstado(false);
    }
  };

  const guardarEdicion = async () => {
    setGuardando(true);
    setMsgEditar(null);
    try {
      const res = await api.patch(`/api/v1/admin/panel/emisores/${id}`, {
        razon_social:           form.razon_social          || null,
        nombre_comercial:       form.nombre_comercial      || null,
        direccion_matriz:       form.direccion_matriz       || null,
        obligado_contabilidad:  form.obligado_contabilidad || null,
        contribuyente_especial: form.contribuyente_especial || null,
      });
      setMsgEditar({ ok: true, texto: res.data.mensaje });
      setEditando(false);
      await cargar();
    } catch (e: any) {
      setMsgEditar({ ok: false, texto: detalleError(e, "Error al guardar.") });
    } finally {
      setGuardando(false);
    }
  };

  // ── Loading / empty ───────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div
          className="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin"
          style={{ borderColor: "var(--kipu-accent)", borderTopColor: "transparent" }}
        />
      </div>
    );
  }
  if (!emisor) return null;

  const subCfg = SUB_CONFIG[emisor.sub_estado] ?? SUB_CONFIG.VENCIDO;
  const SubIcon = subCfg.icon;

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-5">
      {hojaModoSeguro}

      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => router.back()}
          className="p-2 rounded-lg transition-colors"
          style={{ color: "var(--kipu-subtle)", background: "transparent" }}
          onMouseEnter={e => {
            e.currentTarget.style.color = "var(--kipu-text)";
            e.currentTarget.style.background = "color-mix(in srgb, var(--kipu-text) 5%, transparent)";
          }}
          onMouseLeave={e => {
            e.currentTarget.style.color = "var(--kipu-subtle)";
            e.currentTarget.style.background = "transparent";
          }}
        >
          <ArrowLeft size={18} />
        </button>
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-acento/20"
          >
            <Building2 className="text-acento" size={18} />
          </div>
          <div className="min-w-0">
            <h1 className="text-lg font-bold truncate text-texto">
              {emisor.nombre_comercial || emisor.razon_social}
            </h1>
            <p className="text-xs font-mono text-sutil">{emisor.ruc}</p>
          </div>
          <span
            className="shrink-0 text-xs px-2 py-0.5 rounded-full font-medium"
            style={{
              background: emisor.ambiente === 2
                ? "color-mix(in srgb, var(--kipu-success) 20%, transparent)"
                : "color-mix(in srgb, var(--kipu-warning) 20%, transparent)",
              color: emisor.ambiente === 2
                ? "var(--kipu-success)"
                : "var(--kipu-warning)",
            }}
          >
            {emisor.ambiente === 2 ? "Producción" : "Pruebas"}
          </span>
        </div>
        <button
          type="button"
          onClick={cargar}
          className="p-2 rounded-lg transition-colors"
          style={{ color: "var(--kipu-subtle)", background: "transparent" }}
          onMouseEnter={e => {
            e.currentTarget.style.color = "var(--kipu-text)";
            e.currentTarget.style.background = "color-mix(in srgb, var(--kipu-text) 5%, transparent)";
          }}
          onMouseLeave={e => {
            e.currentTarget.style.color = "var(--kipu-subtle)";
            e.currentTarget.style.background = "transparent";
          }}
        >
          <RefreshCw size={16} />
        </button>
      </div>

      {/* Stats rápidos */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          {
            label: "Créditos API",
            value: emisor.balance_emision,
            color: emisor.balance_emision <= 5 ? "var(--kipu-danger)" : "var(--kipu-text)",
          },
          {
            label: "Suscripción",
            value: emisor.sub_estado ?? "Sin plan",
            color: subCfg.color,
          },
          {
            label: "Documentos",
            value: emisor.conteos?.total_documentos ?? 0,
            color: "var(--kipu-text)",
          },
          {
            label: "Usuarios",
            value: emisor.total_usuarios,
            color: "var(--kipu-text)",
          },
        ].map(({ label, value, color }) => (
          <div
            key={label}
            className="rounded-xl p-3 text-center bg-superficie border border-borde"
          >
            <p className="text-xl font-bold truncate" style={{ color }}>{value}</p>
            <p className="text-xs mt-0.5 text-sutil">{label}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div
        className="flex gap-1 rounded-xl p-1 overflow-x-auto bg-superficie border border-borde"
      >
        {([
          { key: "overview",    label: "Info",         icon: Building2   },
          { key: "suscripcion", label: "Suscripción",  icon: CalendarClock },
          { key: "documentos",  label: "Documentos",   icon: FileText    },
          { key: "usuarios",    label: "Usuarios",     icon: Users       },
          { key: "creditos",    label: "Créditos API", icon: CreditCard  },
          { key: "notificar",   label: "Notificar",    icon: Send        },
        ] as const).map(({ key, label, icon: Icon }) => {
          const active = tab === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              className="shrink-0 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-medium transition-colors"
              style={{
                background: active ? "var(--kipu-accent)" : "transparent",
                color: active ? "#FFFFFF" : "var(--kipu-subtle)",
              }}
              onMouseEnter={e => {
                if (!active) e.currentTarget.style.color = "var(--kipu-text)";
              }}
              onMouseLeave={e => {
                if (!active) e.currentTarget.style.color = "var(--kipu-subtle)";
              }}
            >
              <Icon size={13} />
              <span className="hidden sm:inline">{label}</span>
            </button>
          );
        })}
      </div>

      {/* ── Tab: Info ──────────────────────────────────────────────────────── */}
      {tab === "overview" && (
        <div className="space-y-4">
          <div
            className="rounded-xl p-4 space-y-4 bg-superficie border border-borde"
          >

            {/* Header con botón editar/cancelar */}
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-semibold uppercase tracking-wide text-sutil">
                Datos del emisor
              </h2>
              {!editando ? (
                <button
                  type="button"
                  onClick={() => { setEditando(true); setMsgEditar(null); }}
                  className="text-xs transition-colors px-2 py-1 rounded-lg"
                  style={{ color: "var(--kipu-accent)", background: "transparent" }}
                  onMouseEnter={e => {
                    e.currentTarget.style.color = "var(--kipu-accent-h)";
                    e.currentTarget.style.background = "color-mix(in srgb, var(--kipu-accent) 10%, transparent)";
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.color = "var(--kipu-accent)";
                    e.currentTarget.style.background = "transparent";
                  }}
                >
                  Editar
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => { setEditando(false); setMsgEditar(null); }}
                  className="text-xs transition-colors px-2 py-1 rounded-lg"
                  style={{ color: "var(--kipu-subtle)", background: "transparent" }}
                  onMouseEnter={e => {
                    e.currentTarget.style.color = "var(--kipu-text)";
                    e.currentTarget.style.background = "color-mix(in srgb, var(--kipu-text) 5%, transparent)";
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.color = "var(--kipu-subtle)";
                    e.currentTarget.style.background = "transparent";
                  }}
                >
                  Cancelar
                </button>
              )}
            </div>

            {/* RUC — nunca editable */}
            <div className="flex justify-between items-center text-sm gap-4">
              <span className="shrink-0 text-sutil">RUC</span>
              <div className="flex items-center gap-2">
                <span className="font-mono font-medium text-texto">{emisor.ruc}</span>
                {emisor.firma_ok && (
                  <span
                    className="text-[10px] px-1.5 py-0.5 rounded font-medium"
                    style={{
                      color: "var(--kipu-warning)",
                      background: "color-mix(in srgb, var(--kipu-warning) 10%, transparent)",
                    }}
                  >
                    bloqueado
                  </span>
                )}
              </div>
            </div>

            {/* Razón Social — editable por soporte */}
            <div className="flex justify-between items-center text-sm gap-4">
              <span className="shrink-0 text-sutil">Razón Social</span>
              {editando ? (
                <input
                  value={form.razon_social}
                  onChange={(e) => setForm(f => ({ ...f, razon_social: e.target.value }))}
                  className="flex-1 px-2 py-1 rounded-lg text-sm text-right focus:outline-none transition-colors bg-superficie border border-borde text-texto focus:border-acento"
                />
              ) : (
                <span className="text-right font-medium text-texto">{emisor.razon_social}</span>
              )}
            </div>

            {/* Nombre Comercial */}
            <div className="flex justify-between items-center text-sm gap-4">
              <span className="shrink-0 text-sutil">Nombre Comercial</span>
              {editando ? (
                <input
                  value={form.nombre_comercial}
                  onChange={(e) => setForm(f => ({ ...f, nombre_comercial: e.target.value }))}
                  placeholder="Opcional"
                  className="flex-1 px-2 py-1 rounded-lg text-sm text-right focus:outline-none transition-colors bg-superficie border border-borde text-texto focus:border-acento"
                />
              ) : (
                <span className="text-right font-medium text-texto">{emisor.nombre_comercial || "—"}</span>
              )}
            </div>

            {/* Dirección Matriz */}
            <div className="flex justify-between items-start text-sm gap-4">
              <span className="shrink-0 text-sutil">Dirección Matriz</span>
              {editando ? (
                <input
                  value={form.direccion_matriz}
                  onChange={(e) => setForm(f => ({ ...f, direccion_matriz: e.target.value }))}
                  className="flex-1 px-2 py-1 rounded-lg text-sm text-right focus:outline-none transition-colors bg-superficie border border-borde text-texto focus:border-acento"
                />
              ) : (
                <span className="text-right max-w-[60%] font-medium text-texto">{emisor.direccion_matriz || "—"}</span>
              )}
            </div>

            {/* Obligado Contabilidad */}
            <div className="flex justify-between items-center text-sm gap-4">
              <span className="shrink-0 text-sutil">Obligado Contabilidad</span>
              {editando ? (
                <select
                  value={form.obligado_contabilidad}
                  onChange={(e) => setForm(f => ({ ...f, obligado_contabilidad: e.target.value }))}
                  className="px-2 py-1 rounded-lg text-sm focus:outline-none transition-colors bg-superficie border border-borde text-texto"
                >
                  <option value="NO">NO</option>
                  <option value="SI">SI</option>
                </select>
              ) : (
                <span
                  className="text-xs px-2 py-0.5 rounded-full font-medium"
                  style={{
                    background: emisor.obligado_contabilidad === "SI"
                      ? "color-mix(in srgb, var(--kipu-accent) 20%, transparent)"
                      : "color-mix(in srgb, var(--kipu-text) 10%, transparent)",
                    color: emisor.obligado_contabilidad === "SI"
                      ? "var(--kipu-accent)"
                      : "var(--kipu-subtle)",
                  }}
                >
                  {emisor.obligado_contabilidad ?? "NO"}
                </span>
              )}
            </div>

            {/* Contribuyente Especial */}
            <div className="flex justify-between items-center text-sm gap-4">
              <span className="shrink-0 text-sutil">Contribuyente Especial</span>
              {editando ? (
                <input
                  value={form.contribuyente_especial}
                  inputMode="numeric"
                  onChange={(e) => setForm(f => ({ ...f, contribuyente_especial: e.target.value }))}
                  placeholder="N° resolución o vacío"
                  className="flex-1 px-2 py-1 rounded-lg text-sm text-right focus:outline-none transition-colors bg-superficie border border-borde text-texto focus:border-acento"
                />
              ) : (
                <span className="text-right font-medium text-texto">{emisor.contribuyente_especial || "—"}</span>
              )}
            </div>

            {/* Campos solo lectura siempre */}
            {[
              { label: "Tipo Emisor",      value: emisor.tipo_emisor },
              { label: "Ambiente",         value: emisor.ambiente === 2 ? "🟢 Producción" : "🟡 Pruebas" },
              { label: "Firma digital",    value: emisor.firma_ok ? "✅ Configurada" : "❌ Sin firma" },
              { label: "Vence firma",      value: fmtDate(emisor.p12_expiration) },
              { label: "Registro",         value: fmtDate(emisor.created_at) },
            ].map(({ label, value }) => (
              <div key={label} className="flex justify-between text-sm gap-4">
                <span className="shrink-0 text-sutil">{label}</span>
                <span className="text-right font-medium text-texto">{value}</span>
              </div>
            ))}

            {/* Feedback + botón guardar */}
            {msgEditar && (
              <p
                className="text-xs px-3 py-2 rounded-lg font-medium"
                style={{
                  color: msgEditar.ok ? "var(--kipu-success)" : "var(--kipu-danger)",
                  background: msgEditar.ok
                    ? "color-mix(in srgb, var(--kipu-success) 10%, transparent)"
                    : "color-mix(in srgb, var(--kipu-danger) 10%, transparent)",
                }}
              >
                {msgEditar.ok ? "✅" : "❌"} {msgEditar.texto}
              </p>
            )}

            {editando && (
              <button
                type="button"
                onClick={guardarEdicion}
                disabled={guardando}
                className="w-full py-2.5 rounded-lg text-white font-medium text-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-50 bg-acento enabled:hover:bg-acento-hover"
              >
                {guardando ? (
                  <>
                    <div
                      className="w-3.5 h-3.5 border-2 border-t-transparent rounded-full animate-spin"
                      style={{ borderColor: "#FFFFFF", borderTopColor: "transparent" }}
                    />
                    Guardando...
                  </>
                ) : (
                  "Guardar cambios"
                )}
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── Tab: Suscripción ────────────────────────────────────────────────── */}
      {tab === "suscripcion" && (
        <div className="space-y-4">

          {/* Estado actual */}
          <div
            className="rounded-xl border p-4 flex items-center gap-3"
            style={{
              color: subCfg.color,
              background: subCfg.bg,
              borderColor: subCfg.border,
            }}
          >
            <SubIcon size={20} className="shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm">
                {emisor.sub_plan ?? "Sin plan"} — {subCfg.label}
              </p>
              <p className="text-xs opacity-70 mt-0.5">
                {emisor.sub_period_end
                  ? `Vence el ${fmtDate(emisor.sub_period_end)}`
                  : "Sin período activo"}
                {emisor.stripe_subscription_id && (
                  <span className="ml-2 font-mono text-[10px] opacity-50">
                    {emisor.stripe_subscription_id}
                  </span>
                )}
              </p>
            </div>
            <span className="text-xs opacity-60 shrink-0">{emisor.sub_periodo ?? "—"}</span>
          </div>

          {/* Activar por transferencia */}
          <div
            className="rounded-xl p-4 space-y-4 bg-superficie border border-borde"
          >
            <div className="flex items-center gap-2">
              <Banknote className="text-acento" size={15} />
              <h2 className="text-sm font-semibold text-texto">Activar por transferencia</h2>
            </div>
            <p className="text-xs text-sutil">
              Registra el pago manual y activa {NOMBRE_PLAN[planTf]} {periodoTf.toLowerCase()}. Se emite la factura de Kipu automáticamente.
            </p>

            {/* Plan y período: por defecto los actuales de la empresa */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs mb-1.5 text-sutil">Plan</label>
                <select
                  value={planTf}
                  onChange={(e) => { setTfPlan(e.target.value as "PRO" | "AL_DIA"); setTfMonto(null); }}
                  className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none bg-superficie border border-borde text-texto"
                >
                  <option value="PRO">Kipu Pro</option>
                  <option value="AL_DIA">Kipu Al Día</option>
                </select>
              </div>
              <div>
                <label className="block text-xs mb-1.5 text-sutil">Período</label>
                <select
                  value={periodoTf}
                  onChange={(e) => { setTfPeriodo(e.target.value as "MENSUAL" | "ANUAL"); setTfMonto(null); }}
                  className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none bg-superficie border border-borde text-texto"
                >
                  <option value="ANUAL">Anual</option>
                  <option value="MENSUAL">Mensual</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs mb-1.5 text-sutil">Monto recibido (IVA incluido)</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-sutil">$</span>
                  <input
                    type="number"
                    value={montoTf}
                    onChange={(e) => setTfMonto(e.target.value)}
                    min="0"
                    step="0.01"
                    className="w-full pl-7 pr-3 py-2 rounded-lg text-sm focus:outline-none transition-colors bg-superficie border border-borde text-texto focus:border-acento"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs mb-1.5 text-sutil">Fecha del comprobante</label>
                <input
                  type="date"
                  value={tfFecha}
                  onChange={(e) => setTfFecha(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none transition-colors bg-superficie border border-borde text-texto focus:border-acento"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs mb-1.5 text-sutil">Banco origen</label>
              <input
                type="text"
                value={tfBanco}
                onChange={(e) => setTfBanco(e.target.value)}
                placeholder="Ej: Pichincha, Pacífico"
                className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none transition-colors bg-superficie border border-borde text-texto focus:border-acento"
              />
            </div>

            <div>
              <label className="block text-xs mb-1.5 text-sutil">
                Referencia / N° comprobante <span className="text-peligro">*</span>
              </label>
              <input
                type="text"
                value={tfRef}
                inputMode="numeric"
                onChange={(e) => setTfRef(e.target.value)}
                placeholder="Ej: 0021234567890123456789"
                className="w-full px-3 py-2 rounded-lg text-sm font-mono focus:outline-none transition-colors bg-superficie border border-borde text-texto focus:border-acento"
              />
            </div>

            <div>
              <label className="block text-xs mb-1.5 text-sutil">Notas internas</label>
              <input
                type="text"
                value={tfNotas}
                onChange={(e) => setTfNotas(e.target.value)}
                placeholder="Opcional — quién confirmó, canal, etc."
                className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none transition-colors bg-superficie border border-borde text-texto focus:border-acento"
              />
            </div>

            {msgTransf && (
              <p
                className="text-xs px-3 py-2 rounded-lg font-medium"
                style={{
                  color: msgTransf.ok ? "var(--kipu-success)" : "var(--kipu-danger)",
                  background: msgTransf.ok
                    ? "color-mix(in srgb, var(--kipu-success) 10%, transparent)"
                    : "color-mix(in srgb, var(--kipu-danger) 10%, transparent)",
                }}
              >
                {msgTransf.ok ? "✅" : "❌"} {msgTransf.texto}
              </p>
            )}

            <button
              type="button"
              onClick={activarTransferencia}
              disabled={activando || !tfRef.trim()}
              className="w-full py-2.5 rounded-lg text-white font-medium text-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-50 bg-acento"
              onMouseEnter={e => {
                if (!activando && tfRef.trim()) e.currentTarget.style.background = "var(--kipu-accent-h)";
              }}
              onMouseLeave={e => {
                if (!activando && tfRef.trim()) e.currentTarget.style.background = "var(--kipu-accent)";
              }}
            >
              {activando ? (
                <>
                  <div
                    className="w-3.5 h-3.5 border-2 border-t-transparent rounded-full animate-spin"
                    style={{ borderColor: "#FFFFFF", borderTopColor: "transparent" }}
                  />
                  Activando...
                </>
              ) : (
                <><Receipt size={14} /> Activar y emitir factura</>
              )}
            </button>
          </div>

          {/* Acciones de soporte */}
          <div
            className="rounded-xl p-4 space-y-3 bg-superficie border border-borde"
          >
            <h2 className="text-xs font-semibold uppercase tracking-wide text-sutil">
              Soporte — forzar estado
            </h2>
            <p className="text-xs text-sutil">
              Sin cobro ni factura. Solo para pruebas y soporte.
            </p>
            <div className="grid grid-cols-2 gap-2">
              {(["TRIAL", "ACTIVO", "CANCELADO", "VENCIDO"] as const).map((estado) => {
                const cfg = SUB_CONFIG[estado];
                return (
                  <button
                    key={estado}
                    type="button"
                    onClick={() => forzarEstado(estado)}
                    disabled={forzandoEstado || emisor.sub_estado === estado}
                    className="py-2 rounded-lg text-xs font-medium transition-colors disabled:opacity-40"
                    style={{
                      background: cfg.bg,
                      color: cfg.color,
                      border: `1px solid ${cfg.border}`,
                    }}
                  >
                    {forzandoEstado ? (
                      <div
                        className="w-3 h-3 border-2 border-t-transparent rounded-full animate-spin mx-auto"
                        style={{ borderColor: "currentColor", borderTopColor: "transparent" }}
                      />
                    ) : (
                      estado
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Historial de transferencias */}
          {(emisor.transferencias ?? []).length > 0 && (
            <div
              className="rounded-xl overflow-hidden bg-superficie border border-borde"
            >
              <div
                className="px-4 py-3 border-b border-borde"
              >
                <h2 className="text-xs font-semibold uppercase tracking-wide text-sutil">
                  Transferencias registradas
                </h2>
              </div>
              <div>
                {emisor.transferencias.map((tf: any, i: number) => {
                  const d = tf.detalle ?? {};
                  return (
                    <div
                      key={i}
                      className="px-4 py-3 text-sm"
                      style={{ borderTop: i > 0 ? "1px solid var(--kipu-border)" : "none" }}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-texto">${dosDecimales(d.monto)}</span>
                        <span className="text-xs text-sutil">{fmtDate(tf.created_at)}</span>
                      </div>
                      <p className="text-xs font-mono mt-0.5 text-sutil">{d.referencia_pago}</p>
                      <div className="flex gap-3 mt-0.5">
                        {d.banco && <p className="text-xs text-sutil">{d.banco}</p>}
                        {d.fecha_comprobante && (
                          <p className="text-xs text-sutil">
                            Comprobante: {new Date(d.fecha_comprobante).toLocaleDateString("es-EC", { day: "2-digit", month: "short", year: "numeric" })}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Tab: Documentos ─────────────────────────────────────────────────── */}
      {tab === "documentos" && (
        <div className="space-y-3">
          {/* Conteos */}
          <div className="grid grid-cols-4 gap-2">
            {[
              { label: "Total",       value: emisor.conteos?.total_documentos ?? 0 },
              { label: "Autorizados", value: emisor.conteos?.autorizados ?? 0 },
              { label: "Facturas",    value: emisor.conteos?.facturas ?? 0 },
              { label: "Retenciones", value: emisor.conteos?.retenciones ?? 0 },
            ].map(({ label, value }) => (
              <div
                key={label}
                className="rounded-xl p-3 text-center bg-superficie border border-borde"
              >
                <p className="text-lg font-bold text-texto">{value}</p>
                <p className="text-[11px] mt-0.5" style={{ color: "var(--kipu-subtle)" }}>{label}</p>
              </div>
            ))}
          </div>

          {/* Lista */}
          <div
            className="rounded-xl overflow-hidden bg-superficie border border-borde"
          >
            <div
              className="px-4 py-3 border-b border-borde"
            >
              <h2 className="text-xs font-semibold uppercase tracking-wide text-sutil">
                Últimos 20 documentos
              </h2>
            </div>
            {(emisor.documentos ?? []).length === 0 ? (
              <p className="text-sm text-center py-8 text-sutil">Sin documentos.</p>
            ) : (
              <div>
                {(emisor.documentos ?? []).map((d: any, idx: number) => {
                  const cfg  = DOC_CONFIG[d.estado_sri] ?? DOC_CONFIG.PENDIENTE;
                  const Icon = cfg.icon;
                  return (
                    <div
                      key={d.id}
                      className="flex items-center gap-3 px-4 py-3"
                      style={{ borderTop: idx > 0 ? "1px solid var(--kipu-border)" : "none" }}
                    >
                      <div
                        className="w-7 h-7 rounded-full flex items-center justify-center shrink-0"
                        style={{ background: cfg.bg }}
                      >
                        <Icon size={12} style={{ color: cfg.color }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-mono truncate text-texto">
                          {d.numero_doc ?? "—"}
                        </p>
                        <p className="text-xs text-sutil">
                          {d.tipo_doc} · {fmtDate(d.fecha_emision)}
                          {d.origen && d.origen !== "web" && (
                            <span className="ml-1.5 text-[10px] uppercase font-medium" style={{ color: "var(--kipu-subtle)" }}>{d.origen}</span>
                          )}
                        </p>
                      </div>
                      <span className="text-sm font-semibold shrink-0 text-texto">
                        ${dosDecimales(d.importe_total)}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Tab: Usuarios ───────────────────────────────────────────────────── */}
      {tab === "usuarios" && (
        <div
          className="rounded-xl overflow-hidden bg-superficie border border-borde"
        >
          <div
            className="px-4 py-3 border-b border-borde"
          >
            <h2 className="text-xs font-semibold uppercase tracking-wide text-sutil">
              Usuarios con acceso
            </h2>
          </div>
          {(emisor.usuarios ?? []).length === 0 ? (
            <p className="text-sm text-center py-8 text-sutil">Sin usuarios.</p>
          ) : (
            <div>
              {(emisor.usuarios ?? []).map((u: any, idx: number) => (
                <div
                  key={u.profile_id}
                  className="flex items-center gap-3 px-4 py-3"
                  style={{ borderTop: idx > 0 ? "1px solid var(--kipu-border)" : "none" }}
                >
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 bg-acento/20"
                  >
                    <span className="text-xs font-bold text-acento">
                      {(u.nombre || u.email)?.[0]?.toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm truncate text-texto">{u.nombre || u.email}</p>
                    <p className="text-xs truncate text-sutil">{u.email}</p>
                  </div>
                  <span
                    className="text-xs px-2 py-0.5 rounded-full shrink-0 font-medium"
                    style={{
                      background: u.rol === "admin"
                        ? "color-mix(in srgb, var(--kipu-accent) 20%, transparent)"
                        : "color-mix(in srgb, var(--kipu-text) 10%, transparent)",
                      color: u.rol === "admin"
                        ? "var(--kipu-accent)"
                        : "var(--kipu-subtle)",
                    }}
                  >
                    {u.rol}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Tab: Créditos API ───────────────────────────────────────────────── */}
      {tab === "creditos" && (
        <div className="space-y-4">

          {/* Balance */}
          <div
            className="rounded-xl p-6 text-center bg-superficie border border-borde"
          >
            <p
              className="text-5xl font-bold"
              style={{
                color: emisor.balance_emision <= 5 ? "var(--kipu-danger)" : "var(--kipu-text)",
              }}
            >
              {emisor.balance_emision}
            </p>
            <p className="text-sm mt-2 text-sutil">créditos API disponibles</p>
            {emisor.balance_emision <= 5 && (
              <p className="text-xs mt-1 text-peligro">Balance bajo</p>
            )}
          </div>

          {/* Recargar */}
          <div
            className="rounded-xl p-4 space-y-3 bg-superficie border border-borde"
          >
            <h2 className="text-xs font-semibold uppercase tracking-wide text-sutil">
              Agregar créditos manualmente
            </h2>
            <div className="flex gap-2">
              {[10, 25, 50, 100].map((n) => {
                const active = montoRecarga === String(n);
                return (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setMontoRecarga(String(n))}
                    className="flex-1 py-2 rounded-lg text-sm font-medium transition-colors"
                    style={{
                      background: active
                        ? "var(--kipu-accent)"
                        : "color-mix(in srgb, var(--kipu-text) 5%, transparent)",
                      color: active
                        ? "#FFFFFF"
                        : "var(--kipu-subtle)",
                    }}
                    onMouseEnter={e => {
                      if (!active) e.currentTarget.style.color = "var(--kipu-text)";
                    }}
                    onMouseLeave={e => {
                      if (!active) e.currentTarget.style.color = "var(--kipu-subtle)";
                    }}
                  >
                    +{n}
                  </button>
                );
              })}
            </div>
            <div className="flex gap-2">
              <input
                type="number"
                value={montoRecarga}
                onChange={(e) => setMontoRecarga(e.target.value)}
                placeholder="Cantidad personalizada"
                min={1}
                className="flex-1 px-3 py-2 rounded-lg text-sm focus:outline-none transition-colors bg-superficie border border-borde text-texto focus:border-acento"
              />
              <button
                type="button"
                onClick={recargarCreditos}
                disabled={recargando || !montoRecarga}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-white text-sm font-medium transition-colors disabled:opacity-50 bg-acento"
                onMouseEnter={e => {
                  if (!recargando && montoRecarga) e.currentTarget.style.background = "var(--kipu-accent-h)";
                }}
                onMouseLeave={e => {
                  if (!recargando && montoRecarga) e.currentTarget.style.background = "var(--kipu-accent)";
                }}
              >
                {recargando ? (
                  <div
                    className="w-3.5 h-3.5 border-2 border-t-transparent rounded-full animate-spin"
                    style={{ borderColor: "#FFFFFF", borderTopColor: "transparent" }}
                  />
                ) : (
                  <Plus size={14} />
                )}
                Agregar
              </button>
            </div>
            {msgRecarga && (
              <p
                className="text-xs px-3 py-2 rounded-lg font-medium"
                style={{
                  color: msgRecarga.startsWith("✅") ? "var(--kipu-success)" : "var(--kipu-danger)",
                  background: msgRecarga.startsWith("✅")
                    ? "color-mix(in srgb, var(--kipu-success) 10%, transparent)"
                    : "color-mix(in srgb, var(--kipu-danger) 10%, transparent)",
                }}
              >
                {msgRecarga}
              </p>
            )}
          </div>

          {/* Historial de transacciones */}
          {(emisor.transacciones ?? []).length > 0 && (
            <div
              className="rounded-xl overflow-hidden bg-superficie border border-borde"
            >
              <div
                className="px-4 py-3 border-b border-borde"
              >
                <h2 className="text-xs font-semibold uppercase tracking-wide text-sutil">
                  Últimas transacciones
                </h2>
              </div>
              <div>
                {emisor.transacciones.map((tx: any, i: number) => (
                  <div
                    key={i}
                    className="flex items-center gap-3 px-4 py-3"
                    style={{ borderTop: i > 0 ? "1px solid var(--kipu-border)" : "none" }}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-texto">{tx.tipo}</p>
                      <p className="text-xs truncate text-sutil">{tx.notas || tx.metodo_pago}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p
                        className="text-sm font-semibold"
                        style={{
                          color: tx.cantidad > 0 ? "var(--kipu-success)" : "var(--kipu-danger)",
                        }}
                      >
                        {tx.cantidad > 0 ? "+" : ""}{tx.cantidad}
                      </p>
                      <p className="text-xs text-sutil">{fmtDate(tx.created_at)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Tab: Notificar: el formulario es el de Notificaciones (mismos tipos y referencia) ── */}
      {tab === "notificar" && (
        <div className="space-y-3 rounded-xl border border-borde bg-superficie p-4">
          <p className="text-sm text-tenue">
            Las notificaciones se envían desde Notificaciones, con este emisor ya elegido como destino.
          </p>
          <Link href={`/admin/notificaciones?emisor=${id}`}
                className="inline-flex items-center gap-2 rounded-lg bg-acento px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-acento-hover">
            <Send size={14} aria-hidden /> Escribir notificación
          </Link>
        </div>
      )}
    </div>
  );
}