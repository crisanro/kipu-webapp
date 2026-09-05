// components/configuracion/TabUsuarios.tsx
"use client";
import { useState, useEffect } from "react";
import api from "@/lib/api";
import {
  Loader2, Plus, Trash2, Shield, User, ChevronDown,
  ChevronUp, Check, X, AlertCircle
} from "lucide-react";
import { clsx } from "clsx";

interface Props {
  empresaId: number;
}

const PERMISOS_LABELS: Record<string, string> = {
  emitir:               "Emitir comprobantes",
  descargar:            "Descargar PDF/XML",
  clientes:             "Ver y editar clientes",
  productos:            "Ver y editar productos",
  declaraciones:        "Ver declaraciones SRI",
  reportes:             "Ver reportes",
  documentos_recibidos: "Documentos recibidos",
  configuracion:        "Configuración",
  api_keys:             "API Keys",
  usuarios:             "Gestionar usuarios",
};

const PERMISOS_POR_ROL: Record<string, Record<string, boolean>> = {
  contador: {
    emitir: true, descargar: true, clientes: true, productos: true,
    declaraciones: true, reportes: true, documentos_recibidos: true,
    configuracion: false, api_keys: false, usuarios: false,
  },
  emisor: {
    emitir: true, descargar: true, clientes: true, productos: true,
    documentos_recibidos: true, declaraciones: false, reportes: false,
    configuracion: false, api_keys: false, usuarios: false,
  },
};

function validarEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export default function TabUsuarios({ empresaId }: Props) {
  const [usuarios,   setUsuarios]   = useState<any[]>([]);
  const [cargado,    setCargado]    = useState(false);
  const [invEmail,   setInvEmail]   = useState("");
  const [invRol,     setInvRol]     = useState("emisor");
  const [inviting,   setInviting]   = useState(false);
  const [invMsg,     setInvMsg]     = useState("");
  const [invError,   setInvError]   = useState("");
  const [emailError, setEmailError] = useState("");
  const [removiendo, setRemoviendo] = useState<string | null>(null);
  const [expandido,  setExpandido]  = useState<string | null>(null);
  const [permisosCambiados, setPermisosCambiados] = useState<Record<string, Record<string, boolean>>>({});
  const [guardandoPermisos, setGuardandoPermisos] = useState<string | null>(null);

  const cargar = async () => {
    try {
      const r = await api.get(`/api/v1/app/usuarios/empresas/${empresaId}/usuarios`);
      setUsuarios(r.data.data ?? []);
    } catch (e) {
      console.error(e);
    } finally {
      setCargado(true);
    }
  };

  useEffect(() => { cargar(); }, [empresaId]);

  // ── Validación email en tiempo real ──────────────────────────────────────────
  const handleEmailChange = (val: string) => {
    const lower = val.toLowerCase();
    setInvEmail(lower);
    if (lower && !validarEmail(lower)) {
      setEmailError("Email inválido.");
    } else {
      setEmailError("");
    }
  };

  // ── Invitar ───────────────────────────────────────────────────────────────────
  const invitar = async () => {
    setInvMsg("");
    setInvError("");
    if (!invEmail.trim()) { setEmailError("El email es obligatorio."); return; }
    if (!validarEmail(invEmail)) { setEmailError("Email inválido."); return; }

    setInviting(true);
    try {
      const r = await api.post(
        `/api/v1/app/usuarios/empresas/${empresaId}/invitar`,
        { email: invEmail.trim(), rol: invRol }
      );
      setInvMsg(r.data.mensaje);
      setInvEmail("");
      await cargar();
    } catch (err: any) {
      setInvError(err?.response?.data?.detail ?? "Error al invitar.");
    } finally {
      setInviting(false);
    }
  };

  // ── Remover ───────────────────────────────────────────────────────────────────
  const remover = async (profileId: string, nombre: string) => {
    if (!confirm(`¿Remover a ${nombre} de la empresa?`)) return;
    setRemoviendo(profileId);
    try {
      await api.delete(`/api/v1/app/usuarios/empresas/${empresaId}/usuarios/${profileId}`);
      setUsuarios(prev => prev.filter(u => u.profile_id !== profileId));
    } catch (err: any) {
      alert(err?.response?.data?.detail ?? "Error al remover usuario.");
    } finally {
      setRemoviendo(null);
    }
  };

  // ── Permisos ──────────────────────────────────────────────────────────────────
  const getPermisos = (u: any): Record<string, boolean> => {
    return permisosCambiados[u.profile_id] ?? u.permisos ?? {};
  };

  const togglePermiso = (profileId: string, permiso: string, valorActual: boolean) => {
    setPermisosCambiados(prev => ({
      ...prev,
      [profileId]: {
        ...(prev[profileId] ?? {}),
        [permiso]: !valorActual,
      }
    }));
  };

  const guardarPermisos = async (profileId: string) => {
    const permisos = permisosCambiados[profileId];
    if (!permisos) return;
    setGuardandoPermisos(profileId);
    try {
      await api.patch(
        `/api/v1/app/usuarios/empresas/${empresaId}/usuarios/${profileId}/permisos`,
        { permisos }
      );
      setUsuarios(prev => prev.map(u =>
        u.profile_id === profileId ? { ...u, permisos } : u
      ));
      setPermisosCambiados(prev => {
        const next = { ...prev };
        delete next[profileId];
        return next;
      });
    } catch (err: any) {
      alert(err?.response?.data?.detail ?? "Error al guardar permisos.");
    } finally {
      setGuardandoPermisos(null);
    }
  };

  const aplicarPlantilla = (profileId: string, rol: string) => {
    const plantilla = PERMISOS_POR_ROL[rol];
    if (!plantilla) return;
    setPermisosCambiados(prev => ({ ...prev, [profileId]: { ...plantilla } }));
  };

  const hayCambios = (profileId: string) => !!permisosCambiados[profileId];

  return (
    <div className="space-y-4">
      {/* Invitar */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
        <h2 className="text-sm font-semibold text-white mb-4">Invitar usuario</h2>
        <div className="flex gap-2 flex-wrap">
          <div className="flex-1 min-w-0">
            <input
              type="email"
              value={invEmail}
              onChange={(e) => handleEmailChange(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && invitar()}
              placeholder="correo@ejemplo.com"
              className={clsx(
                "w-full px-3 py-2 rounded-lg bg-gray-800 border text-white placeholder-gray-600 focus:outline-none text-sm",
                emailError ? "border-red-500/70 focus:border-red-500" : "border-gray-700 focus:border-indigo-500"
              )}
            />
            {emailError && (
              <p className="flex items-center gap-1 mt-1 text-xs text-red-400">
                <AlertCircle size={10} /> {emailError}
              </p>
            )}
          </div>
          <select
            value={invRol}
            onChange={(e) => setInvRol(e.target.value)}
            className="px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white focus:outline-none focus:border-indigo-500 text-sm"
          >
            <option value="emisor">Emisor</option>
            <option value="contador">Contador</option>
            <option value="admin">Admin</option>
          </select>
          <button
            onClick={invitar}
            disabled={inviting || !invEmail.trim() || !!emailError}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-medium transition-colors"
          >
            {inviting ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
            Invitar
          </button>
        </div>
        {invMsg && (
          <p className="mt-2 text-xs text-emerald-400 bg-emerald-400/10 px-3 py-2 rounded-lg">✅ {invMsg}</p>
        )}
        {invError && (
          <p className="mt-2 text-xs text-red-400 bg-red-400/10 px-3 py-2 rounded-lg">{invError}</p>
        )}
        <p className="text-xs text-gray-600 mt-3">
          El usuario recibirá un email con instrucciones para acceder.
        </p>
      </div>

      {/* Lista usuarios */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-800">
          <h2 className="text-sm font-semibold text-white">Usuarios con acceso</h2>
        </div>
        {!cargado ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 size={18} className="animate-spin text-indigo-400" />
          </div>
        ) : usuarios.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-8">Sin usuarios adicionales.</p>
        ) : (
          <div className="divide-y divide-gray-800">
            {usuarios.map((u: any) => {
              const esAdmin    = u.rol === "admin";
              const abierto    = expandido === u.profile_id;
              const permisos   = getPermisos(u);
              const conCambios = hayCambios(u.profile_id);

              return (
                <div key={u.profile_id}>
                  {/* Fila principal */}
                  <div className="flex items-center gap-3 px-5 py-3">
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
                      "flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium shrink-0",
                      esAdmin ? "bg-indigo-500/20 text-indigo-400" : "bg-gray-700 text-gray-400"
                    )}>
                      {esAdmin ? <><Shield size={10} /> Admin</> : <><User size={10} /> {u.rol}</>}
                    </span>
                    {/* Expandir permisos — solo no admin */}
                    {!esAdmin && (
                      <button
                        onClick={() => setExpandido(abierto ? null : u.profile_id)}
                        className="p-1.5 rounded-lg text-gray-500 hover:text-white hover:bg-gray-700 transition-colors shrink-0"
                        title="Ver permisos"
                      >
                        {abierto ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                      </button>
                    )}
                    <button
                      onClick={() => remover(u.profile_id, u.nombre || u.email)}
                      disabled={removiendo === u.profile_id}
                      className="p-1.5 rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-40 shrink-0"
                      title="Remover usuario"
                    >
                      {removiendo === u.profile_id
                        ? <Loader2 size={13} className="animate-spin" />
                        : <Trash2 size={13} />}
                    </button>
                  </div>

                  {/* Panel de permisos expandido */}
                  {abierto && !esAdmin && (
                    <div className="px-5 pb-4 bg-gray-800/30 border-t border-gray-800">
                      {/* Plantillas rápidas */}
                      <div className="flex items-center gap-2 py-3">
                        <span className="text-xs text-gray-500">Plantilla:</span>
                        <button
                          onClick={() => aplicarPlantilla(u.profile_id, "emisor")}
                          className="text-xs px-2 py-1 rounded-lg bg-gray-700 hover:bg-gray-600 text-gray-300 transition-colors"
                        >
                          Emisor
                        </button>
                        <button
                          onClick={() => aplicarPlantilla(u.profile_id, "contador")}
                          className="text-xs px-2 py-1 rounded-lg bg-gray-700 hover:bg-gray-600 text-gray-300 transition-colors"
                        >
                          Contador
                        </button>
                      </div>
                      {/* Grid de permisos */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {Object.entries(PERMISOS_LABELS).map(([key, label]) => {
                          const activo = permisos[key] ?? false;
                          return (
                            <button
                              key={key}
                              type="button"
                              onClick={() => togglePermiso(u.profile_id, key, activo)}
                              className={clsx(
                                "flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-left transition-colors border",
                                activo
                                  ? "bg-indigo-600/20 border-indigo-500/30 text-indigo-300"
                                  : "bg-gray-800 border-gray-700 text-gray-500 hover:text-gray-300"
                              )}
                            >
                              <div className={clsx(
                                "w-4 h-4 rounded flex items-center justify-center shrink-0",
                                activo ? "bg-indigo-500" : "bg-gray-700"
                              )}>
                                {activo && <Check size={10} className="text-white" />}
                              </div>
                              {label}
                            </button>
                          );
                        })}
                      </div>
                      {/* Guardar */}
                      {conCambios && (
                        <div className="flex gap-2 mt-3">
                          <button
                            onClick={() => setPermisosCambiados(prev => {
                              const next = { ...prev };
                              delete next[u.profile_id];
                              return next;
                            })}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-700 text-gray-400 hover:text-white text-xs transition-colors"
                          >
                            <X size={12} /> Descartar
                          </button>
                          <button
                            onClick={() => guardarPermisos(u.profile_id)}
                            disabled={guardandoPermisos === u.profile_id}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-medium transition-colors"
                          >
                            {guardandoPermisos === u.profile_id
                              ? <Loader2 size={12} className="animate-spin" />
                              : <Check size={12} />}
                            Guardar permisos
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}