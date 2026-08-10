// app/(dashboard)/admin/emisores/[id]/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import api from "@/lib/api";
import {
  ArrowLeft, Building2, CreditCard, FileText, Users,
  Loader2, Plus, CheckCircle2, Clock, AlertTriangle,
  XCircle, Send, RefreshCw
} from "lucide-react";
import { clsx } from "clsx";

const fmt = (n: any) => parseFloat(n ?? 0).toFixed(2);

export default function AdminEmisorDetallePage() {
  const { id }  = useParams();
  const router  = useRouter();

  const [emisor,    setEmisor]    = useState<any>(null);
  const [loading,   setLoading]   = useState(true);
  const [tab,       setTab]       = useState<"overview" | "facturas" | "usuarios" | "creditos" | "notificar">("overview");

  // Recargar créditos
  const [montoRecarga, setMontoRecarga] = useState("");
  const [recargando,   setRecargando]   = useState(false);
  const [msgRecarga,   setMsgRecarga]   = useState("");

  // Notificación individual
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
      setMsgRecarga(`✅ ${montoRecarga} créditos agregados correctamente.`);
      setMontoRecarga("");
      await cargar();
    } catch (e: any) {
      setMsgRecarga(`❌ ${e?.response?.data?.detail ?? "Error al recargar."}`);
    } finally {
      setRecargando(false);
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
      setMsgNotif("✅ Notificación enviada correctamente.");
      setNotifTitulo("");
      setNotifMensaje("");
    } catch (e: any) {
      setMsgNotif(`❌ ${e?.response?.data?.detail ?? "Error al enviar."}`);
    } finally {
      setEnviando(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 size={24} className="animate-spin text-indigo-400" />
      </div>
    );
  }

  if (!emisor) return null;

  const ESTADO_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
    AUTORIZADO: { label: "Autorizada", color: "text-emerald-400 bg-emerald-400/10", icon: CheckCircle2 },
    FIRMADO:    { label: "En cola",    color: "text-blue-400 bg-blue-400/10",        icon: Clock },
    DEVUELTA:   { label: "Devuelta",   color: "text-amber-400 bg-amber-400/10",      icon: AlertTriangle },
    RECHAZADO:  { label: "Rechazada",  color: "text-red-400 bg-red-400/10",          icon: XCircle },
  };

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
          { label: "Créditos emisión",   value: emisor.balance_emision,   color: emisor.balance_emision <= 5 ? "text-red-400" : "text-white" },
          { label: "Créditos recepción", value: emisor.balance_recepcion, color: "text-white" },
          { label: "Facturas totales",   value: emisor.total_facturas,    color: "text-white" },
          { label: "Usuarios",           value: emisor.total_usuarios,    color: "text-white" },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-gray-900 border border-gray-800 rounded-xl p-3 text-center">
            <p className={clsx("text-2xl font-bold", color)}>{value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-900 border border-gray-800 rounded-xl p-1">
        {[
          { key: "overview",  label: "Info",          icon: Building2  },
          { key: "facturas",  label: "Facturas",      icon: FileText   },
          { key: "usuarios",  label: "Usuarios",      icon: Users      },
          { key: "creditos",  label: "Créditos",      icon: CreditCard },
          { key: "notificar", label: "Notificar",     icon: Send       },
        ].map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key as any)}
            className={clsx(
              "flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium transition-colors",
              tab === key ? "bg-indigo-600 text-white" : "text-gray-500 hover:text-white"
            )}
          >
            <Icon size={13} />
            <span className="hidden sm:inline">{label}</span>
          </button>
        ))}
      </div>

      {/* ── Tab Overview ────────────────────────────────────────────────────── */}
      {tab === "overview" && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 space-y-3">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
            Datos del emisor
          </h2>
          {[
            { label: "Razón Social",      value: emisor.razon_social },
            { label: "Nombre Comercial",  value: emisor.nombre_comercial || "—" },
            { label: "RUC",               value: emisor.ruc },
            { label: "Dirección",         value: emisor.direccion_matriz || "—" },
            { label: "Ambiente",          value: emisor.ambiente === 2 ? "🟢 Producción" : "🟡 Pruebas" },
            { label: "Firma",             value: emisor.firma_ok ? "✅ Configurada" : "❌ Sin firma" },
            { label: "Registro",          value: new Date(emisor.created_at).toLocaleDateString("es-EC") },
          ].map(({ label, value }) => (
            <div key={label} className="flex justify-between text-sm">
              <span className="text-gray-500">{label}</span>
              <span className="text-white text-right max-w-[60%]">{value}</span>
            </div>
          ))}
        </div>
      )}

      {/* ── Tab Facturas ─────────────────────────────────────────────────────── */}
      {tab === "facturas" && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-800">
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Últimas facturas
            </h2>
          </div>
          {(emisor.facturas ?? []).length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-8">Sin facturas.</p>
          ) : (
            <div className="divide-y divide-gray-800">
              {(emisor.facturas ?? []).map((f: any) => {
                const estado = ESTADO_CONFIG[f.estado] ?? ESTADO_CONFIG.FIRMADO;
                const Icon   = estado.icon;
                return (
                  <div key={f.id} className="flex items-center gap-3 px-4 py-3">
                    <div className={clsx("w-7 h-7 rounded-full flex items-center justify-center shrink-0", estado.color.split(" ")[1])}>
                      <Icon size={12} className={estado.color.split(" ")[0]} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white font-mono truncate">{f.numero_factura}</p>
                      <p className="text-xs text-gray-500">{f.razon_social_comprador} · {f.fecha_emision}</p>
                    </div>
                    <span className="text-sm font-semibold text-white shrink-0">
                      ${fmt(f.importe_total)}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Tab Usuarios ─────────────────────────────────────────────────────── */}
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
                    <p className="text-xs text-gray-500">{u.email}</p>
                  </div>
                  <span className={clsx(
                    "text-xs px-2 py-0.5 rounded-full",
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

      {/* ── Tab Créditos ─────────────────────────────────────────────────────── */}
      {tab === "creditos" && (
        <div className="space-y-4">
          {/* Balance actual */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 text-center">
              <p className={clsx(
                "text-3xl font-bold",
                emisor.balance_emision <= 5 ? "text-red-400" : "text-white"
              )}>
                {emisor.balance_emision}
              </p>
              <p className="text-xs text-gray-500 mt-1">Créditos emisión</p>
            </div>
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 text-center">
              <p className="text-3xl font-bold text-white">{emisor.balance_recepcion}</p>
              <p className="text-xs text-gray-500 mt-1">Créditos recepción</p>
            </div>
          </div>

          {/* Recargar */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 space-y-3">
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Recargar créditos de emisión
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
                {recargando
                  ? <Loader2 size={14} className="animate-spin" />
                  : <Plus size={14} />
                }
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
        </div>
      )}

      {/* ── Tab Notificar ─────────────────────────────────────────────────────── */}
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
              <option value="FACTURA">Factura</option>
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