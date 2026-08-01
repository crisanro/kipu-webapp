// app/(dashboard)/configuracion/page.tsx
"use client";

import { useState, useEffect, useRef } from "react";
import api from "@/lib/api";
import { useAuthStore } from "@/store/auth.store";
import {
  Settings, Upload, Trash2, Shield, Loader2,
  CheckCircle2, AlertTriangle, Users, Plus, X,
  ChevronDown, Save, Zap, Store
} from "lucide-react";
import { clsx } from "clsx";
import Checklist, { HealthData } from "@/components/Checklist";

interface Config {
  legal:    any;
  firma:    any;
  creditos: any;
}

interface Plan {
  id:       number;
  nombre:   string;
  cantidad: number;
  precio:   number;
  popular:  boolean;
}

export default function ConfiguracionPage() {
  const empresa       = useAuthStore((s) => s.empresa);
  const updateBalance = useAuthStore((s) => s.updateBalance);

  const [config,   setConfig]   = useState<Config | null>(null);
  const [planes,   setPlanes]   = useState<Plan[]>([]);
  const [health,   setHealth]   = useState<HealthData | null>(null);
  const [loading,  setLoading]  = useState(true);
  const [tab,      setTab]      = useState<"empresa" | "firma" | "estructura" | "creditos" | "usuarios">("empresa");

  // Firma
  const [p12File,    setP12File]    = useState<File | null>(null);
  const [p12Pass,    setP12Pass]    = useState("");
  const [uploading,  setUploading]  = useState(false);
  const [firmaMsg,   setFirmaMsg]   = useState("");
  const [firmaError, setFirmaError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  // Producción
  const [pin,           setPin]           = useState("");
  const [activando,     setActivando]     = useState(false);
  const [prodMsg,       setProdMsg]       = useState("");
  const [prodError,     setProdError]     = useState("");
  const [showProdModal, setShowProdModal] = useState(false);

  // Usuarios
  const [usuarios,     setUsuarios]     = useState<any[]>([]);
  const [invEmail,     setInvEmail]     = useState("");
  const [invRol,       setInvRol]       = useState("emisor");
  const [inviting,     setInviting]     = useState(false);
  const [invMsg,       setInvMsg]       = useState("");

  // Estructura
  const [estructura,   setEstructura]   = useState<any[]>([]);
  const [showEstab,    setShowEstab]    = useState(false);
  const [showPunto,    setShowPunto]    = useState(false);
  const [estabForm,    setEstabForm]    = useState({ codigo: "001", nombre_comercial: "", direccion: "" });
  const [puntoForm,    setPuntoForm]    = useState({ establecimiento_codigo: "001", codigo: "001", nombre: "" });
  const [savingEstab,  setSavingEstab]  = useState(false);
  const [savingPunto,  setSavingPunto]  = useState(false);
  const [estabError,   setEstabError]   = useState("");
  const [puntoError,   setPuntoError]   = useState("");

  useEffect(() => {
    const cargar = async () => {
      setLoading(true);
      try {
        const hoyIso = new Date().toISOString().split("T")[0];
        const [resConfig, resPlanes, resEstructura, resDash] = await Promise.all([
          api.get("/api/v1/app/emisor/config"),
          api.get("/api/v1/app/catalogo/planes"),
          api.get("/api/v1/app/estructura"),
          api.get(`/api/v1/app/dashboard?fecha_inicio=${hoyIso}&fecha_fin=${hoyIso}`),
        ]);
        setConfig(resConfig.data.data);
        setPlanes(resPlanes.data.data?.emision ?? []);
        setEstructura(resEstructura.data.data ?? []);
        setHealth(resDash.data.data?.health ?? null);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    cargar();
  }, []);

  useEffect(() => {
    if (tab === "usuarios" && empresa) {
      api.get(`/api/v1/app/usuarios/empresas/${empresa.id}/usuarios`)
        .then(r => setUsuarios(r.data.data ?? []))
        .catch(console.error);
    }
  }, [tab, empresa]);

  // ── Handlers Estructura ──────────────────────────────────────────────────
  const crearEstablecimiento = async () => {
    setEstabError("");
    setSavingEstab(true);
    try {
      await api.post("/api/v1/app/estructura/establecimientos", estabForm);
      const r = await api.get("/api/v1/app/estructura");
      setEstructura(r.data.data ?? []);
      setShowEstab(false);
    } catch (err: any) {
      setEstabError(err?.response?.data?.detail ?? "Error al crear establecimiento.");
    } finally {
      setSavingEstab(false);
    }
  };

  const crearPunto = async () => {
    setPuntoError("");
    setSavingPunto(true);
    try {
      await api.post("/api/v1/app/estructura/puntos-emision", puntoForm);
      const r = await api.get("/api/v1/app/estructura");
      setEstructura(r.data.data ?? []);
      setShowPunto(false);
    } catch (err: any) {
      setPuntoError(err?.response?.data?.detail ?? "Error al crear punto.");
    } finally {
      setSavingPunto(false);
    }
  };

  // ── Subir firma ──────────────────────────────────────────────────────────
  const subirFirma = async () => {
    if (!p12File || !p12Pass) {
      setFirmaError("Selecciona el archivo y escribe la contraseña.");
      return;
    }
    setUploading(true);
    setFirmaError("");
    setFirmaMsg("");
    try {
      const fd = new FormData();
      fd.append("file",     p12File);
      fd.append("password", p12Pass);
      await api.post("/api/v1/app/emisor/firma", fd, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      setFirmaMsg("Firma configurada correctamente.");
      setP12File(null);
      setP12Pass("");
      // Recargar config
      const r = await api.get("/api/v1/app/emisor/config");
      setConfig(r.data.data);
    } catch (err: any) {
      setFirmaError(err?.response?.data?.detail ?? "Error al subir la firma.");
    } finally {
      setUploading(false);
    }
  };

  // ── Activar producción ───────────────────────────────────────────────────
  const activarProduccion = async () => {
    if (!pin) { setProdError("Ingresa el PIN de WhatsApp."); return; }
    setActivando(true);
    setProdError("");
    try {
      await api.post(`/api/v1/app/emisor/produccion?pin=${pin}`);
      setProdMsg("¡Bienvenido a producción! Recibiste 25 créditos de bienvenida.");
      setShowProdModal(false);
      setPin("");
      const r = await api.get("/api/v1/app/emisor/config");
      setConfig(r.data.data);
    } catch (err: any) {
      setProdError(err?.response?.data?.detail ?? "Error al activar producción.");
    } finally {
      setActivando(false);
    }
  };

  // ── Invitar usuario ──────────────────────────────────────────────────────
  const invitar = async () => {
    if (!invEmail || !empresa) return;
    setInviting(true);
    setInvMsg("");
    try {
      const r = await api.post(`/api/v1/app/usuarios/empresas/${empresa.id}/invitar`, {
        email: invEmail, rol: invRol
      });
      setInvMsg(r.data.mensaje);
      setInvEmail("");
      const ru = await api.get(`/api/v1/app/usuarios/empresas/${empresa.id}/usuarios`);
      setUsuarios(ru.data.data ?? []);
    } catch (err: any) {
      setInvMsg(err?.response?.data?.detail ?? "Error al invitar.");
    } finally {
      setInviting(false);
    }
  };

  const TABS = [
    { key: "empresa",    label: "Empresa",    icon: Settings },
    { key: "firma",      label: "Firma",      icon: Shield },
    { key: "estructura", label: "Estructura", icon: Store },
    { key: "creditos",   label: "Créditos",   icon: Zap },
    { key: "usuarios",   label: "Usuarios",   icon: Users },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 size={24} className="animate-spin text-indigo-400" />
      </div>
    );
  }

  const firma    = config?.firma;
  const creditos = config?.creditos;
  const legal    = config?.legal;

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto">

      <h1 className="text-xl font-bold text-white mb-6">Configuración</h1>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-900 border border-gray-800 rounded-xl p-1 mb-6">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key as any)}
            className={clsx(
              "flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium transition-colors",
              tab === key
                ? "bg-indigo-600 text-white"
                : "text-gray-500 hover:text-white"
            )}
          >
            <Icon size={13} />
            <span className="hidden sm:inline">{label}</span>
          </button>
        ))}
      </div>

      {/* ── Tab Empresa ── */}
      {tab === "empresa" && legal && (
        <div className="space-y-4">
          {health && !health.listo_produccion && (
            <Checklist health={health} />
          )}

          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
            <h2 className="text-sm font-semibold text-white mb-4">Datos fiscales</h2>
            <div className="space-y-3">
              {[
                { label: "RUC",                    value: legal.ruc },
                { label: "Razón Social",           value: legal.razon_social },
                { label: "Nombre Comercial",       value: legal.nombre_comercial || "—" },
                { label: "Dirección Matriz",       value: legal.direccion_matriz },
                { label: "Obligado Contabilidad",  value: legal.obligado_contabilidad },
                { label: "Contrib. Especial",      value: legal.contribuyente_especial || "—" },
                { label: "Ambiente",               value: legal.ambiente === 2 ? "🟢 Producción" : "🟡 Pruebas" },
              ].map(({ label, value }) => (
                <div key={label} className="flex justify-between text-sm border-b border-gray-800 pb-2 last:border-0 last:pb-0">
                  <span className="text-gray-500">{label}</span>
                  <span className="text-white font-medium text-right max-w-[60%]">{value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Tab Firma ── */}
      {tab === "firma" && (
        <div className="space-y-4">
          {/* Estado actual */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
            <h2 className="text-sm font-semibold text-white mb-4">Estado de la firma</h2>
            {firma?.configurada ? (
              <div className="space-y-2">
                <div className={clsx(
                  "inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium",
                  firma.estado === "VIGENTE"  ? "bg-emerald-500/20 text-emerald-400" :
                  firma.estado === "ALERTA"   ? "bg-amber-500/20 text-amber-400" :
                                                "bg-red-500/20 text-red-400"
                )}>
                  <CheckCircle2 size={12} />
                  {firma.mensaje_vencimiento}
                </div>
                <p className="text-xs text-gray-500">{firma.nombre}</p>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-amber-400">
                <AlertTriangle size={15} />
                <span className="text-sm">Sin firma configurada</span>
              </div>
            )}
          </div>

          {/* Subir firma */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
            <h2 className="text-sm font-semibold text-white mb-4">
              {firma?.configurada ? "Reemplazar firma" : "Subir firma electrónica"}
            </h2>
            <div className="space-y-3">
              <div
                onClick={() => fileRef.current?.click()}
                className={clsx(
                  "border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors",
                  p12File
                    ? "border-indigo-500 bg-indigo-500/10"
                    : "border-gray-700 hover:border-gray-600"
                )}
              >
                <Upload size={20} className="mx-auto mb-2 text-gray-500" />
                <p className="text-sm text-gray-400">
                  {p12File ? p12File.name : "Haz clic para seleccionar tu archivo .p12"}
                </p>
                <p className="text-xs text-gray-600 mt-1">Solo archivos .p12</p>
                <input
                  ref={fileRef}
                  type="file"
                  accept=".p12"
                  className="hidden"
                  onChange={(e) => setP12File(e.target.files?.[0] ?? null)}
                />
              </div>

              <div>
                <label className="block text-xs text-gray-500 mb-1.5">Contraseña del certificado</label>
                <input
                  type="password"
                  value={p12Pass}
                  onChange={(e) => setP12Pass(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500 text-sm"
                />
              </div>

              {firmaError && <p className="text-xs text-red-400 bg-red-400/10 px-3 py-2 rounded-lg">{firmaError}</p>}
              {firmaMsg   && <p className="text-xs text-emerald-400 bg-emerald-400/10 px-3 py-2 rounded-lg">{firmaMsg}</p>}

              <button
                onClick={subirFirma}
                disabled={uploading || !p12File || !p12Pass}
                className="w-full py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-medium transition-colors flex items-center justify-center gap-2"
              >
                {uploading ? <><Loader2 size={14} className="animate-spin" /> Subiendo...</> : "Guardar firma"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Tab Estructura ── */}
      {tab === "estructura" && (
        <div className="space-y-4">
          {/* Establecimientos */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800">
              <h2 className="text-sm font-semibold text-white">Establecimientos</h2>
              <button
                onClick={() => setShowEstab(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium transition-colors"
              >
                <Plus size={13} /> Agregar
              </button>
            </div>

            {estructura.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-8">
                Sin establecimientos. Crea uno para poder facturar.
              </p>
            ) : (
              <div className="divide-y divide-gray-800">
                {estructura.map((estab: any) => (
                  <div key={estab.id} className="px-5 py-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs bg-gray-800 px-2 py-0.5 rounded text-gray-300">
                          {estab.codigo}
                        </span>
                        <span className="text-sm font-medium text-white">
                          {estab.nombre_comercial || "Sin nombre"}
                        </span>
                      </div>
                      <span className={clsx(
                        "text-xs px-2 py-0.5 rounded-full",
                        estab.is_active
                          ? "bg-emerald-500/20 text-emerald-400"
                          : "bg-gray-700 text-gray-500"
                      )}>
                        {estab.is_active ? "Activo" : "Inactivo"}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mb-3">{estab.direccion}</p>

                    {/* Puntos de emisión */}
                    <div className="space-y-2">
                      {estab.puntos_emision?.map((punto: any) => (
                        <div key={punto.id} className="flex items-center gap-3 bg-gray-800 rounded-lg px-3 py-2">
                          <span className="font-mono text-xs text-gray-400">{punto.codigo}</span>
                          <span className="text-xs text-white flex-1">{punto.nombre}</span>
                          <span className="text-xs text-gray-500">Sec. {punto.secuencial_actual}</span>
                          {punto.es_canal_whatsapp && (
                            <span className="text-xs bg-green-500/20 text-green-400 px-1.5 py-0.5 rounded">WS</span>
                          )}
                        </div>
                      ))}

                      <button
                        onClick={() => {
                          setPuntoForm({ establecimiento_codigo: estab.codigo, codigo: "001", nombre: "" });
                          setShowPunto(true);
                        }}
                        className="flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300 transition-colors mt-1"
                      >
                        <Plus size={12} /> Agregar punto de emisión
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Modal crear establecimiento */}
          {showEstab && (
            <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
              <div className="bg-gray-900 border border-gray-800 rounded-xl w-full max-w-sm">
                <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800">
                  <h2 className="text-sm font-semibold text-white">Nuevo establecimiento</h2>
                  <button onClick={() => setShowEstab(false)} className="text-gray-500 hover:text-white">
                    <X size={18} />
                  </button>
                </div>
                <div className="p-5 space-y-3">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1.5">Código (ej: 001)</label>
                    <input
                      value={estabForm.codigo}
                      onChange={(e) => setEstabForm({ ...estabForm, codigo: e.target.value })}
                      placeholder="001"
                      maxLength={3}
                      className="w-full px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1.5">Nombre comercial</label>
                    <input
                      value={estabForm.nombre_comercial}
                      onChange={(e) => setEstabForm({ ...estabForm, nombre_comercial: e.target.value })}
                      placeholder="Sucursal principal (opcional)"
                      className="w-full px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1.5">Dirección</label>
                    <input
                      value={estabForm.direccion}
                      onChange={(e) => setEstabForm({ ...estabForm, direccion: e.target.value })}
                      placeholder="Dirección del establecimiento (opcional)"
                      className="w-full px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500 text-sm"
                    />
                  </div>
                  {estabError && (
                    <p className="text-xs text-red-400 bg-red-400/10 px-3 py-2 rounded-lg">{estabError}</p>
                  )}
                  <div className="flex gap-3 pt-1">
                    <button
                      onClick={() => setShowEstab(false)}
                      className="flex-1 py-2.5 rounded-lg border border-gray-700 text-gray-400 text-sm"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={crearEstablecimiento}
                      disabled={savingEstab}
                      className="flex-1 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-medium transition-colors flex items-center justify-center gap-2"
                    >
                      {savingEstab ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                      Crear
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Modal crear punto de emisión */}
          {showPunto && (
            <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
              <div className="bg-gray-900 border border-gray-800 rounded-xl w-full max-w-sm">
                <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800">
                  <h2 className="text-sm font-semibold text-white">Nuevo punto de emisión</h2>
                  <button onClick={() => setShowPunto(false)} className="text-gray-500 hover:text-white">
                    <X size={18} />
                  </button>
                </div>
                <div className="p-5 space-y-3">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1.5">Establecimiento</label>
                    <input
                      value={puntoForm.establecimiento_codigo}
                      disabled
                      className="w-full px-3 py-2 rounded-lg bg-gray-700 border border-gray-600 text-gray-400 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1.5">Código punto (ej: 001)</label>
                    <input
                      value={puntoForm.codigo}
                      onChange={(e) => setPuntoForm({ ...puntoForm, codigo: e.target.value })}
                      placeholder="001"
                      maxLength={3}
                      className="w-full px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1.5">Nombre</label>
                    <input
                      value={puntoForm.nombre}
                      onChange={(e) => setPuntoForm({ ...puntoForm, nombre: e.target.value })}
                      placeholder="Caja 1 (opcional)"
                      className="w-full px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500 text-sm"
                    />
                  </div>
                  {puntoError && (
                    <p className="text-xs text-red-400 bg-red-400/10 px-3 py-2 rounded-lg">{puntoError}</p>
                  )}
                  <div className="flex gap-3 pt-1">
                    <button
                      onClick={() => setShowPunto(false)}
                      className="flex-1 py-2.5 rounded-lg border border-gray-700 text-gray-400 text-sm"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={crearPunto}
                      disabled={savingPunto}
                      className="flex-1 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-medium transition-colors flex items-center justify-center gap-2"
                    >
                      {savingPunto ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                      Crear
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Tab Créditos ── */}
      {tab === "creditos" && (
        <div className="space-y-4">
          {/* Balance */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
            <h2 className="text-sm font-semibold text-white mb-4">Balance actual</h2>
            <div className="flex gap-4">
              <div className="flex-1 bg-gray-800 rounded-lg p-4 text-center">
                <p className="text-3xl font-bold text-white">{creditos?.balance_emision ?? 0}</p>
                <p className="text-xs text-gray-500 mt-1">Créditos de emisión</p>
              </div>
              <div className="flex-1 bg-gray-800 rounded-lg p-4 text-center">
                <p className="text-3xl font-bold text-white">{creditos?.balance_recepcion ?? 0}</p>
                <p className="text-xs text-gray-500 mt-1">Créditos de recepción</p>
              </div>
            </div>
            <p className="text-xs text-gray-600 mt-3 text-center">Los créditos no vencen — úsalos cuando quieras</p>
          </div>

          {/* Planes */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
            <h2 className="text-sm font-semibold text-white mb-4">Recargar créditos</h2>
            {planes.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-4">No hay planes disponibles.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {planes.map((p) => (
                  <div
                    key={p.id}
                    className={clsx(
                      "relative border rounded-xl p-4 transition-colors cursor-pointer hover:border-indigo-500",
                      p.popular
                        ? "border-indigo-500 bg-indigo-500/10"
                        : "border-gray-700 bg-gray-800"
                    )}
                  >
                    {p.popular && (
                      <span className="absolute -top-2 left-4 bg-indigo-600 text-white text-xs px-2 py-0.5 rounded-full font-medium">
                        Popular
                      </span>
                    )}
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-lg font-bold text-white">{p.cantidad}</span>
                      <span className="text-sm font-bold text-indigo-400">${p.precio.toFixed(2)}</span>
                    </div>
                    <p className="text-xs text-gray-500">{p.nombre}</p>
                    <p className="text-xs text-gray-600 mt-0.5">
                      ${(p.precio / p.cantidad).toFixed(3)} por factura
                    </p>
                    <button className="mt-3 w-full py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium transition-colors">
                      Comprar
                    </button>
                  </div>
                ))}
              </div>
            )}
            <p className="text-xs text-gray-600 mt-4 text-center">
              Para comprar créditos contacta a soporte por WhatsApp
            </p>
          </div>
        </div>
      )}

      {/* ── Tab Usuarios ── */}
      {tab === "usuarios" && (
        <div className="space-y-4">
          {/* Invitar */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
            <h2 className="text-sm font-semibold text-white mb-4">Invitar usuario</h2>
            <div className="flex gap-2">
              <input
                type="email"
                value={invEmail}
                onChange={(e) => setInvEmail(e.target.value)}
                placeholder="correo@ejemplo.com"
                className="flex-1 px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500 text-sm"
              />
              <select
                value={invRol}
                onChange={(e) => setInvRol(e.target.value)}
                className="px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white focus:outline-none focus:border-indigo-500 text-sm"
              >
                <option value="emisor">Emisor</option>
                <option value="admin">Admin</option>
              </select>
              <button
                onClick={invitar}
                disabled={inviting || !invEmail}
                className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-medium transition-colors flex items-center gap-1.5"
              >
                {inviting ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                Invitar
              </button>
            </div>
            {invMsg && (
              <p className="mt-2 text-xs text-emerald-400">{invMsg}</p>
            )}
          </div>

          {/* Lista usuarios */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-800">
              <h2 className="text-sm font-semibold text-white">Usuarios con acceso</h2>
            </div>
            {usuarios.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-8">Sin usuarios adicionales.</p>
            ) : (
              <div className="divide-y divide-gray-800">
                {usuarios.map((u: any) => (
                  <div key={u.profile_id} className="flex items-center gap-3 px-5 py-3">
                    <div className="w-8 h-8 rounded-full bg-indigo-600/20 flex items-center justify-center shrink-0">
                      <span className="text-xs font-bold text-indigo-400">
                        {u.email?.[0]?.toUpperCase()}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white truncate">{u.nombre || u.email}</p>
                      <p className="text-xs text-gray-500">{u.email}</p>
                    </div>
                    <span className={clsx(
                      "text-xs px-2 py-0.5 rounded-full font-medium",
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
        </div>
      )}

      {/* Modal activar producción */}
      {showProdModal && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-xl w-full max-w-sm">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800">
              <h2 className="text-sm font-semibold text-white">Activar producción</h2>
              <button onClick={() => setShowProdModal(false)} className="text-gray-500 hover:text-white">
                <X size={18} />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                <p className="text-xs text-red-300">
                  ⚠️ Esta acción es <strong>irreversible</strong>. Las facturas de prueba serán eliminadas
                  y comenzarás a emitir comprobantes reales ante el SRI.
                </p>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1.5">
                  PIN de confirmación (enviado por WhatsApp)
                </label>
                <input
                  type="text"
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  placeholder="123456"
                  maxLength={6}
                  className="w-full px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500 text-sm text-center tracking-widest"
                />
              </div>
              {prodError && (
                <p className="text-xs text-red-400 bg-red-400/10 px-3 py-2 rounded-lg">{prodError}</p>
              )}
              <div className="flex gap-3">
                <button
                  onClick={() => setShowProdModal(false)}
                  className="flex-1 py-2.5 rounded-lg border border-gray-700 text-gray-400 text-sm transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={activarProduccion}
                  disabled={activando || !pin}
                  className="flex-1 py-2.5 rounded-lg bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-black text-sm font-bold transition-colors flex items-center justify-center gap-2"
                >
                  {activando ? <Loader2 size={14} className="animate-spin" /> : null}
                  Confirmar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}