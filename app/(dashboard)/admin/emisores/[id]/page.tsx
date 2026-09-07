// app/(dashboard)/admin/emisores/[id]/page.tsx
"use client";
import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import api from "@/lib/api";
import {
  ArrowLeft, Building2, CreditCard, FileText, Users,
  Loader2, Plus, CheckCircle2, Clock, AlertTriangle,
  XCircle, Send, RefreshCw, Banknote, ShieldCheck,
  ShieldOff, CalendarClock, Receipt, ChevronDown,
} from "lucide-react";
import { clsx } from "clsx";

const fmt     = (n: any) => parseFloat(n ?? 0).toFixed(2);
const fmtDate = (d: any) => d ? new Date(d).toLocaleDateString("es-EC", { day: "2-digit", month: "short", year: "numeric" }) : "—";

// ── Estado de suscripción ───────────────────────────────────────────────────
const SUB_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  ACTIVO:    { label: "Activo",    color: "text-emerald-400 bg-emerald-400/10 border-emerald-500/20", icon: ShieldCheck },
  TRIAL:     { label: "Trial",     color: "text-blue-400 bg-blue-400/10 border-blue-500/20",         icon: Clock },
  CANCELADO: { label: "Cancelado", color: "text-amber-400 bg-amber-400/10 border-amber-500/20",      icon: ShieldOff },
  VENCIDO:   { label: "Vencido",   color: "text-red-400 bg-red-400/10 border-red-500/20",            icon: XCircle },
};

// ── Estado de documentos ────────────────────────────────────────────────────
const DOC_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  AUTORIZADO: { label: "Autorizado", color: "text-emerald-400 bg-emerald-400/10", icon: CheckCircle2 },
  FIRMADO:    { label: "En cola",    color: "text-blue-400 bg-blue-400/10",       icon: Clock },
  DEVUELTA:   { label: "Devuelta",   color: "text-amber-400 bg-amber-400/10",     icon: AlertTriangle },
  RECHAZADO:  { label: "Rechazado",  color: "text-red-400 bg-red-400/10",         icon: XCircle },
  PENDIENTE:  { label: "Pendiente",  color: "text-gray-400 bg-gray-400/10",       icon: Clock },
};

type Tab = "overview" | "suscripcion" | "documentos" | "usuarios" | "creditos" | "notificar";

export default function AdminEmisorDetallePage() {
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
  const [tfMonto,      setTfMonto]      = useState("69");
  const [tfRef,        setTfRef]        = useState("");
  const [tfBanco,      setTfBanco]      = useState("");
  const [tfFecha,      setTfFecha]      = useState(() => new Date().toISOString().split("T")[0]);
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
    razon_social:          "",
    nombre_comercial:      "",
    direccion_matriz:      "",
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
  const [notifTitulo,  setNotifTitulo]  = useState("");
  const [notifMensaje, setNotifMensaje] = useState("");
  const [notifTipo,    setNotifTipo]    = useState("SISTEMA");
  const [enviando,     setEnviando]     = useState(false);
  const [msgNotif,     setMsgNotif]     = useState("");

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
      await api.post("/api/v1/admin/panel/topup", {
        emisor_id: parseInt(id as string),
        cantidad:  parseInt(montoRecarga),
        notas:     "Recarga manual desde panel admin",
      });
      setMsgRecarga(`✅ ${montoRecarga} créditos agregados.`);
      setMontoRecarga("");
      await cargar();
    } catch (e: any) {
      setMsgRecarga(`❌ ${e?.response?.data?.detail ?? "Error al recargar."}`);
    } finally {
      setRecargando(false);
    }
  };

  const activarTransferencia = async () => {
    if (!tfRef.trim()) {
      setMsgTransf({ ok: false, texto: "La referencia de pago es obligatoria." });
      return;
    }
    if (parseFloat(tfMonto) <= 0) {
      setMsgTransf({ ok: false, texto: "El monto debe ser mayor a 0." });
      return;
    }
    setActivando(true);
    setMsgTransf(null);
    try {
      const res = await api.post("/api/v1/admin/panel/suscripcion/transferencia", {
        emisor_id:       parseInt(id as string),
        monto:           parseFloat(tfMonto),
        referencia_pago: tfRef.trim(),
        banco:           tfBanco.trim() || null,
        fecha_pago:      tfFecha,
        notas:           tfNotas.trim() || null,
        periodo:         "ANUAL",
        plan:            "PRO",
      });
      setMsgTransf({ ok: true, texto: res.data.mensaje });
      setTfRef("");
      setTfBanco("");
      setTfNotas("");
      setTfFecha(new Date().toISOString().split("T")[0]);
      await cargar();
    } catch (e: any) {
      setMsgTransf({ ok: false, texto: e?.response?.data?.detail ?? "Error al activar." });
    } finally {
      setActivando(false);
    }
  };

  const forzarEstado = async (estado: string) => {
    if (!confirm(`¿Forzar suscripción a "${estado}"? Esto no emite factura.`)) return;
    setForzandoEstado(true);
    try {
      await api.post("/api/v1/admin/panel/suscripcion/forzar", {
        emisor_id: parseInt(id as string),
        estado,
        plan:      "PRO",
        periodo:   "ANUAL",
      });
      await cargar();
    } catch (e: any) {
      alert(e?.response?.data?.detail ?? "Error.");
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
      setMsgEditar({ ok: false, texto: e?.response?.data?.detail ?? "Error al guardar." });
    } finally {
      setGuardando(false);
    }
  };

  const enviarNotificacion = async () => {
    if (!notifTitulo.trim() || !notifMensaje.trim()) return;
    setEnviando(true);
    setMsgNotif("");
    try {
      await api.post("/api/v1/admin/panel/notificar", {
        emisor_id: parseInt(id as string),
        tipo:      notifTipo,
        titulo:    notifTitulo,
        mensaje:   notifMensaje,
      });
      setMsgNotif("✅ Notificación enviada.");
      setNotifTitulo("");
      setNotifMensaje("");
    } catch (e: any) {
      setMsgNotif(`❌ ${e?.response?.data?.detail ?? "Error al enviar."}`);
    } finally {
      setEnviando(false);
    }
  };

  // ── Loading / empty ───────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 size={24} className="animate-spin text-indigo-400" />
      </div>
    );
  }
  if (!emisor) return null;

  const subCfg = SUB_CONFIG[emisor.sub_estado] ?? SUB_CONFIG.VENCIDO;
  const SubIcon = subCfg.icon;

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-5">

      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.back()}
          className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
        >
          <ArrowLeft size={18} />
        </button>
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-indigo-600/20 flex items-center justify-center shrink-0">
            <Building2 size={18} className="text-indigo-400" />
          </div>
          <div className="min-w-0">
            <h1 className="text-lg font-bold text-white truncate">
              {emisor.nombre_comercial || emisor.razon_social}
            </h1>
            <p className="text-xs text-gray-500 font-mono">{emisor.ruc}</p>
          </div>
          <span className={clsx(
            "shrink-0 text-xs px-2 py-0.5 rounded-full",
            emisor.ambiente === 2
              ? "bg-emerald-500/20 text-emerald-400"
              : "bg-amber-500/20 text-amber-400"
          )}>
            {emisor.ambiente === 2 ? "Producción" : "Pruebas"}
          </span>
        </div>
        <button
          onClick={cargar}
          className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
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
            color: emisor.balance_emision <= 5 ? "text-red-400" : "text-white",
          },
          {
            label: "Suscripción",
            value: emisor.sub_estado ?? "Sin plan",
            color: subCfg.color.split(" ")[0],
          },
          {
            label: "Documentos",
            value: emisor.conteos?.total_documentos ?? 0,
            color: "text-white",
          },
          {
            label: "Usuarios",
            value: emisor.total_usuarios,
            color: "text-white",
          },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-gray-900 border border-gray-800 rounded-xl p-3 text-center">
            <p className={clsx("text-xl font-bold truncate", color)}>{value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-900 border border-gray-800 rounded-xl p-1 overflow-x-auto">
        {([
          { key: "overview",     label: "Info",         icon: Building2   },
          { key: "suscripcion",  label: "Suscripción",  icon: CalendarClock },
          { key: "documentos",   label: "Documentos",   icon: FileText    },
          { key: "usuarios",     label: "Usuarios",     icon: Users       },
          { key: "creditos",     label: "Créditos API", icon: CreditCard  },
          { key: "notificar",    label: "Notificar",    icon: Send        },
        ] as const).map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={clsx(
              "shrink-0 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-medium transition-colors",
              tab === key ? "bg-indigo-600 text-white" : "text-gray-500 hover:text-white"
            )}
          >
            <Icon size={13} />
            <span className="hidden sm:inline">{label}</span>
          </button>
        ))}
      </div>

      {/* ── Tab: Info ──────────────────────────────────────────────────────── */}
      {tab === "overview" && (
        <div className="space-y-4">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 space-y-4">

            {/* Header con botón editar/cancelar */}
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Datos del emisor
              </h2>
              {!editando ? (
                <button
                  onClick={() => { setEditando(true); setMsgEditar(null); }}
                  className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors px-2 py-1 rounded-lg hover:bg-indigo-400/10"
                >
                  Editar
                </button>
              ) : (
                <button
                  onClick={() => { setEditando(false); setMsgEditar(null); }}
                  className="text-xs text-gray-500 hover:text-white transition-colors px-2 py-1 rounded-lg hover:bg-gray-800"
                >
                  Cancelar
                </button>
              )}
            </div>

            {/* RUC — nunca editable */}
            <div className="flex justify-between items-center text-sm gap-4">
              <span className="text-gray-500 shrink-0">RUC</span>
              <div className="flex items-center gap-2">
                <span className="text-white font-mono">{emisor.ruc}</span>
                {emisor.firma_ok && (
                  <span className="text-[10px] text-amber-500/70 bg-amber-500/10 px-1.5 py-0.5 rounded">
                    bloqueado
                  </span>
                )}
              </div>
            </div>

            {/* Razón Social — editable por soporte */}
            <div className="flex justify-between items-center text-sm gap-4">
              <span className="text-gray-500 shrink-0">Razón Social</span>
              {editando ? (
                <input
                  value={form.razon_social}
                  onChange={(e) => setForm(f => ({ ...f, razon_social: e.target.value }))}
                  className="flex-1 px-2 py-1 rounded-lg bg-gray-800 border border-gray-700 text-white focus:outline-none focus:border-indigo-500 text-sm text-right"
                />
              ) : (
                <span className="text-white text-right">{emisor.razon_social}</span>
              )}
            </div>

            {/* Nombre Comercial */}
            <div className="flex justify-between items-center text-sm gap-4">
              <span className="text-gray-500 shrink-0">Nombre Comercial</span>
              {editando ? (
                <input
                  value={form.nombre_comercial}
                  onChange={(e) => setForm(f => ({ ...f, nombre_comercial: e.target.value }))}
                  placeholder="Opcional"
                  className="flex-1 px-2 py-1 rounded-lg bg-gray-800 border border-gray-700 text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500 text-sm text-right"
                />
              ) : (
                <span className="text-white text-right">{emisor.nombre_comercial || "—"}</span>
              )}
            </div>

            {/* Dirección Matriz */}
            <div className="flex justify-between items-start text-sm gap-4">
              <span className="text-gray-500 shrink-0">Dirección Matriz</span>
              {editando ? (
                <input
                  value={form.direccion_matriz}
                  onChange={(e) => setForm(f => ({ ...f, direccion_matriz: e.target.value }))}
                  className="flex-1 px-2 py-1 rounded-lg bg-gray-800 border border-gray-700 text-white focus:outline-none focus:border-indigo-500 text-sm text-right"
                />
              ) : (
                <span className="text-white text-right max-w-[60%]">{emisor.direccion_matriz || "—"}</span>
              )}
            </div>

            {/* Obligado Contabilidad */}
            <div className="flex justify-between items-center text-sm gap-4">
              <span className="text-gray-500 shrink-0">Obligado Contabilidad</span>
              {editando ? (
                <select
                  value={form.obligado_contabilidad}
                  onChange={(e) => setForm(f => ({ ...f, obligado_contabilidad: e.target.value }))}
                  className="px-2 py-1 rounded-lg bg-gray-800 border border-gray-700 text-white focus:outline-none focus:border-indigo-500 text-sm"
                >
                  <option value="NO">NO</option>
                  <option value="SI">SI</option>
                </select>
              ) : (
                <span className={clsx(
                  "text-xs px-2 py-0.5 rounded-full",
                  emisor.obligado_contabilidad === "SI"
                    ? "bg-indigo-500/20 text-indigo-400"
                    : "bg-gray-700 text-gray-400"
                )}>
                  {emisor.obligado_contabilidad ?? "NO"}
                </span>
              )}
            </div>

            {/* Contribuyente Especial */}
            <div className="flex justify-between items-center text-sm gap-4">
              <span className="text-gray-500 shrink-0">Contribuyente Especial</span>
              {editando ? (
                <input
                  value={form.contribuyente_especial}
                  onChange={(e) => setForm(f => ({ ...f, contribuyente_especial: e.target.value }))}
                  placeholder="N° resolución o vacío"
                  className="flex-1 px-2 py-1 rounded-lg bg-gray-800 border border-gray-700 text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500 text-sm text-right"
                />
              ) : (
                <span className="text-white text-right">{emisor.contribuyente_especial || "—"}</span>
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
                <span className="text-gray-500 shrink-0">{label}</span>
                <span className="text-white text-right">{value}</span>
              </div>
            ))}

            {/* Feedback + botón guardar */}
            {msgEditar && (
              <p className={clsx(
                "text-xs px-3 py-2 rounded-lg",
                msgEditar.ok
                  ? "text-emerald-400 bg-emerald-400/10"
                  : "text-red-400 bg-red-400/10"
              )}>
                {msgEditar.ok ? "✅" : "❌"} {msgEditar.texto}
              </p>
            )}

            {editando && (
              <button
                onClick={guardarEdicion}
                disabled={guardando}
                className="w-full py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-medium text-sm transition-colors flex items-center justify-center gap-2"
              >
                {guardando
                  ? <><Loader2 size={14} className="animate-spin" /> Guardando...</>
                  : "Guardar cambios"
                }
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── Tab: Suscripción ────────────────────────────────────────────────── */}
      {tab === "suscripcion" && (
        <div className="space-y-4">

          {/* Estado actual */}
          <div className={clsx(
            "rounded-xl border p-4 flex items-center gap-3",
            subCfg.color
          )}>
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
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 space-y-4">
            <div className="flex items-center gap-2">
              <Banknote size={15} className="text-indigo-400" />
              <h2 className="text-sm font-semibold text-white">Activar por transferencia</h2>
            </div>
            <p className="text-xs text-gray-500">
              Registra el pago manual y activa la suscripción PRO ANUAL. Se emite la factura de Kipu automáticamente.
            </p>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1.5">Monto cobrado (USD + IVA)</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">$</span>
                  <input
                    type="number"
                    value={tfMonto}
                    onChange={(e) => setTfMonto(e.target.value)}
                    min="0"
                    step="0.01"
                    className="w-full pl-7 pr-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white focus:outline-none focus:border-indigo-500 text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1.5">Fecha del comprobante</label>
                <input
                  type="date"
                  value={tfFecha}
                  onChange={(e) => setTfFecha(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white focus:outline-none focus:border-indigo-500 text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs text-gray-500 mb-1.5">Banco origen</label>
              <input
                type="text"
                value={tfBanco}
                onChange={(e) => setTfBanco(e.target.value)}
                placeholder="Ej: Pichincha, Pacífico"
                className="w-full px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs text-gray-500 mb-1.5">
                Referencia / N° comprobante <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={tfRef}
                onChange={(e) => setTfRef(e.target.value)}
                placeholder="Ej: 0021234567890123456789"
                className="w-full px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500 text-sm font-mono"
              />
            </div>

            <div>
              <label className="block text-xs text-gray-500 mb-1.5">Notas internas</label>
              <input
                type="text"
                value={tfNotas}
                onChange={(e) => setTfNotas(e.target.value)}
                placeholder="Opcional — quién confirmó, canal, etc."
                className="w-full px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500 text-sm"
              />
            </div>

            {msgTransf && (
              <p className={clsx(
                "text-xs px-3 py-2 rounded-lg",
                msgTransf.ok
                  ? "text-emerald-400 bg-emerald-400/10"
                  : "text-red-400 bg-red-400/10"
              )}>
                {msgTransf.ok ? "✅" : "❌"} {msgTransf.texto}
              </p>
            )}

            <button
              onClick={activarTransferencia}
              disabled={activando || !tfRef.trim()}
              className="w-full py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-medium text-sm transition-colors flex items-center justify-center gap-2"
            >
              {activando
                ? <><Loader2 size={14} className="animate-spin" /> Activando...</>
                : <><Receipt size={14} /> Activar y emitir factura</>
              }
            </button>
          </div>

          {/* Acciones de soporte */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 space-y-3">
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Soporte — forzar estado
            </h2>
            <p className="text-xs text-gray-600">
              Sin cobro ni factura. Solo para pruebas y soporte.
            </p>
            <div className="grid grid-cols-2 gap-2">
              {(["TRIAL", "ACTIVO", "CANCELADO", "VENCIDO"] as const).map((estado) => (
                <button
                  key={estado}
                  onClick={() => forzarEstado(estado)}
                  disabled={forzandoEstado || emisor.sub_estado === estado}
                  className={clsx(
                    "py-2 rounded-lg text-xs font-medium transition-colors disabled:opacity-40",
                    estado === "ACTIVO"    && "bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30",
                    estado === "TRIAL"     && "bg-blue-500/20 text-blue-400 hover:bg-blue-500/30",
                    estado === "CANCELADO" && "bg-amber-500/20 text-amber-400 hover:bg-amber-500/30",
                    estado === "VENCIDO"   && "bg-red-500/20 text-red-400 hover:bg-red-500/30",
                  )}
                >
                  {forzandoEstado
                    ? <Loader2 size={12} className="animate-spin mx-auto" />
                    : estado
                  }
                </button>
              ))}
            </div>
          </div>

          {/* Historial de transferencias */}
          {(emisor.transferencias ?? []).length > 0 && (
            <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-800">
                <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Transferencias registradas
                </h2>
              </div>
              <div className="divide-y divide-gray-800">
                {emisor.transferencias.map((tf: any, i: number) => {
                  const d = tf.detalle ?? {};
                  return (
                    <div key={i} className="px-4 py-3 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-white font-medium">${fmt(d.monto)}</span>
                        <span className="text-xs text-gray-500">{fmtDate(tf.created_at)}</span>
                      </div>
                      <p className="text-xs text-gray-500 font-mono mt-0.5">{d.referencia_pago}</p>
                      <div className="flex gap-3 mt-0.5">
                        {d.banco && <p className="text-xs text-gray-600">{d.banco}</p>}
                        {d.fecha_comprobante && (
                          <p className="text-xs text-gray-600">
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
              <div key={label} className="bg-gray-900 border border-gray-800 rounded-xl p-3 text-center">
                <p className="text-lg font-bold text-white">{value}</p>
                <p className="text-[11px] text-gray-500 mt-0.5">{label}</p>
              </div>
            ))}
          </div>

          {/* Lista */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-800">
              <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Últimos 20 documentos
              </h2>
            </div>
            {(emisor.documentos ?? []).length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-8">Sin documentos.</p>
            ) : (
              <div className="divide-y divide-gray-800">
                {(emisor.documentos ?? []).map((d: any) => {
                  const cfg  = DOC_CONFIG[d.estado_sri] ?? DOC_CONFIG.PENDIENTE;
                  const Icon = cfg.icon;
                  return (
                    <div key={d.id} className="flex items-center gap-3 px-4 py-3">
                      <div className={clsx("w-7 h-7 rounded-full flex items-center justify-center shrink-0", cfg.color.split(" ")[1])}>
                        <Icon size={12} className={cfg.color.split(" ")[0]} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-white font-mono truncate">
                          {d.numero_doc ?? "—"}
                        </p>
                        <p className="text-xs text-gray-500">
                          {d.tipo_doc} · {fmtDate(d.fecha_emision)}
                          {d.origen && d.origen !== "web" && (
                            <span className="ml-1.5 text-[10px] text-gray-600 uppercase">{d.origen}</span>
                          )}
                        </p>
                      </div>
                      <span className="text-sm font-semibold text-white shrink-0">
                        ${fmt(d.importe_total)}
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
        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-800">
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Usuarios con acceso
            </h2>
          </div>
          {(emisor.usuarios ?? []).length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-8">Sin usuarios.</p>
          ) : (
            <div className="divide-y divide-gray-800">
              {(emisor.usuarios ?? []).map((u: any) => (
                <div key={u.profile_id} className="flex items-center gap-3 px-4 py-3">
                  <div className="w-8 h-8 rounded-full bg-indigo-600/20 flex items-center justify-center shrink-0">
                    <span className="text-xs font-bold text-indigo-400">
                      {(u.nombre || u.email)?.[0]?.toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white truncate">{u.nombre || u.email}</p>
                    <p className="text-xs text-gray-500 truncate">{u.email}</p>
                  </div>
                  <span className={clsx(
                    "text-xs px-2 py-0.5 rounded-full shrink-0",
                    u.rol === "admin"
                      ? "bg-indigo-500/20 text-indigo-400"
                      : "bg-gray-700 text-gray-400"
                  )}>
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
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 text-center">
            <p className={clsx(
              "text-5xl font-bold",
              emisor.balance_emision <= 5 ? "text-red-400" : "text-white"
            )}>
              {emisor.balance_emision}
            </p>
            <p className="text-sm text-gray-500 mt-2">créditos API disponibles</p>
            {emisor.balance_emision <= 5 && (
              <p className="text-xs text-red-400 mt-1">Balance bajo</p>
            )}
          </div>

          {/* Recargar */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 space-y-3">
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Agregar créditos manualmente
            </h2>
            <div className="flex gap-2">
              {[10, 25, 50, 100].map((n) => (
                <button
                  key={n}
                  onClick={() => setMontoRecarga(String(n))}
                  className={clsx(
                    "flex-1 py-2 rounded-lg text-sm font-medium transition-colors",
                    montoRecarga === String(n)
                      ? "bg-indigo-600 text-white"
                      : "bg-gray-800 text-gray-400 hover:text-white"
                  )}
                >
                  +{n}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="number"
                value={montoRecarga}
                onChange={(e) => setMontoRecarga(e.target.value)}
                placeholder="Cantidad personalizada"
                min={1}
                className="flex-1 px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500 text-sm"
              />
              <button
                onClick={recargarCreditos}
                disabled={recargando || !montoRecarga}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-medium transition-colors"
              >
                {recargando ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                Agregar
              </button>
            </div>
            {msgRecarga && (
              <p className={clsx(
                "text-xs px-3 py-2 rounded-lg",
                msgRecarga.startsWith("✅")
                  ? "text-emerald-400 bg-emerald-400/10"
                  : "text-red-400 bg-red-400/10"
              )}>
                {msgRecarga}
              </p>
            )}
          </div>

          {/* Historial de transacciones */}
          {(emisor.transacciones ?? []).length > 0 && (
            <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-800">
                <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Últimas transacciones
                </h2>
              </div>
              <div className="divide-y divide-gray-800">
                {emisor.transacciones.map((tx: any, i: number) => (
                  <div key={i} className="flex items-center gap-3 px-4 py-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white">{tx.tipo}</p>
                      <p className="text-xs text-gray-500 truncate">{tx.notas || tx.metodo_pago}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className={clsx(
                        "text-sm font-semibold",
                        tx.cantidad > 0 ? "text-emerald-400" : "text-red-400"
                      )}>
                        {tx.cantidad > 0 ? "+" : ""}{tx.cantidad}
                      </p>
                      <p className="text-xs text-gray-600">{fmtDate(tx.created_at)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Tab: Notificar ──────────────────────────────────────────────────── */}
      {tab === "notificar" && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 space-y-3">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
            Enviar notificación a este emisor
          </h2>
          <div>
            <label className="block text-xs text-gray-500 mb-1.5">Tipo</label>
            <select
              value={notifTipo}
              onChange={(e) => setNotifTipo(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white focus:outline-none focus:border-indigo-500 text-sm"
            >
              <option value="SISTEMA">Sistema</option>
              <option value="DECLARACION">Declaración</option>
              <option value="CREDITOS">Créditos</option>
              <option value="SUSCRIPCION">Suscripción</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1.5">Título *</label>
            <input
              value={notifTitulo}
              onChange={(e) => setNotifTitulo(e.target.value)}
              placeholder="Título de la notificación"
              className="w-full px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1.5">Mensaje *</label>
            <textarea
              value={notifMensaje}
              onChange={(e) => setNotifMensaje(e.target.value)}
              placeholder="Contenido de la notificación..."
              rows={3}
              className="w-full px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500 text-sm resize-none"
            />
          </div>
          {msgNotif && (
            <p className={clsx(
              "text-xs px-3 py-2 rounded-lg",
              msgNotif.startsWith("✅")
                ? "text-emerald-400 bg-emerald-400/10"
                : "text-red-400 bg-red-400/10"
            )}>
              {msgNotif}
            </p>
          )}
          <button
            onClick={enviarNotificacion}
            disabled={enviando || !notifTitulo.trim() || !notifMensaje.trim()}
            className="w-full py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-medium text-sm transition-colors flex items-center justify-center gap-2"
          >
            {enviando
              ? <><Loader2 size={14} className="animate-spin" /> Enviando...</>
              : <><Send size={14} /> Enviar notificación</>
            }
          </button>
        </div>
      )}
    </div>
  );
}