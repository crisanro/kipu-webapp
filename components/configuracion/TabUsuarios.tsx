"use client";
import { useState, useEffect } from "react";
import api from "@/lib/api";
import {
  Plus, Trash2, Shield, User, ChevronDown,
  ChevronUp, Check, X, AlertCircle
} from "lucide-react";

interface Props {
  empresaId: number;
}

const PERMISOS_LABELS: Record<string, string> = {
  emitir:                "Emitir comprobantes",
  descargar:             "Descargar PDF/XML",
  clientes:              "Ver y editar clientes",
  productos:             "Ver y editar productos",
  declaraciones:         "Ver declaraciones SRI",
  reportes:              "Ver reportes",
  documentos_recibidos:  "Documentos recibidos",
  configuracion:         "Configuración",
  api_keys:              "API Keys",
  usuarios:              "Gestionar usuarios",
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
  const [usuarios,          setUsuarios]          = useState<any[]>([]);
  const [cargado,           setCargado]           = useState(false);
  const [invEmail,          setInvEmail]          = useState("");
  const [invRol,            setInvRol]            = useState("emisor");
  const [inviting,          setInviting]          = useState(false);
  const [invMsg,            setInvMsg]            = useState("");
  const [invError,          setInvError]          = useState("");
  const [emailError,        setEmailError]        = useState("");
  const [removiendo,        setRemoviendo]        = useState<string | null>(null);
  const [expandido,         setExpandido]         = useState<string | null>(null);
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
      <div
        className="rounded-xl p-5"
        style={{
          background: "var(--kipu-surface)",
          border: "1px solid var(--kipu-border)",
        }}
      >
        <h2 className="text-sm font-semibold mb-4" style={{ color: "var(--kipu-text)" }}>Invitar usuario</h2>
        <div className="flex gap-2 flex-wrap">
          <div className="flex-1 min-w-0">
            <input
              type="email"
              value={invEmail}
              onChange={(e) => handleEmailChange(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && invitar()}
              placeholder="correo@ejemplo.com"
              className="w-full px-3 py-2 rounded-lg text-sm transition-colors focus:outline-none"
              style={{
                background: "var(--kipu-surface)",
                border: emailError
                  ? "1px solid color-mix(in srgb, var(--kipu-danger) 70%, transparent)"
                  : "1px solid var(--kipu-border)",
                color: "var(--kipu-text)",
              }}
              onFocus={e => {
                if (!emailError) e.currentTarget.style.borderColor = "var(--kipu-accent)";
              }}
              onBlur={e => {
                if (!emailError) e.currentTarget.style.borderColor = "var(--kipu-border)";
              }}
            />
            {emailError && (
              <p className="flex items-center gap-1 mt-1 text-xs" style={{ color: "var(--kipu-danger)" }}>
                <AlertCircle size={10} /> {emailError}
              </p>
            )}
          </div>
          <select
            value={invRol}
            onChange={(e) => setInvRol(e.target.value)}
            className="px-3 py-2 rounded-lg text-sm transition-colors focus:outline-none"
            style={{
              background: "var(--kipu-surface)",
              border: "1px solid var(--kipu-border)",
              color: "var(--kipu-text)",
            }}
            onFocus={e => e.currentTarget.style.borderColor = "var(--kipu-accent)"}
            onBlur={e => e.currentTarget.style.borderColor = "var(--kipu-border)"}
          >
            <option value="emisor">Emisor</option>
            <option value="contador">Contador</option>
            <option value="admin">Admin</option>
          </select>
          <button
            type="button"
            onClick={invitar}
            disabled={inviting || !invEmail.trim() || !!emailError}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-white text-sm font-medium transition-colors disabled:opacity-50"
            style={{ background: "var(--kipu-accent)" }}
            onMouseEnter={e => {
              if (!inviting && invEmail.trim() && !emailError) e.currentTarget.style.background = "var(--kipu-accent-h)";
            }}
            onMouseLeave={e => {
              if (!inviting && invEmail.trim() && !emailError) e.currentTarget.style.background = "var(--kipu-accent)";
            }}
          >
            {inviting ? (
              <div
                className="w-3.5 h-3.5 border-2 border-t-transparent rounded-full animate-spin"
                style={{ borderColor: "#FFFFFF", borderTopColor: "transparent" }}
              />
            ) : (
              <Plus size={14} />
            )}
            Invitar
          </button>
        </div>
        {invMsg && (
          <p
            className="mt-2 text-xs px-3 py-2 rounded-lg"
            style={{
              color: "var(--kipu-success)",
              background: "color-mix(in srgb, var(--kipu-success) 10%, transparent)",
            }}
          >
            ✅ {invMsg}
          </p>
        )}
        {invError && (
          <p
            className="mt-2 text-xs px-3 py-2 rounded-lg"
            style={{
              color: "var(--kipu-danger)",
              background: "color-mix(in srgb, var(--kipu-danger) 10%, transparent)",
            }}
          >
            {invError}
          </p>
        )}
        <p className="text-xs mt-3" style={{ color: "var(--kipu-subtle)" }}>
          El usuario recibirá un email con instrucciones para acceder.
        </p>
      </div>

      {/* Lista usuarios */}
      <div
        className="rounded-xl overflow-hidden"
        style={{
          background: "var(--kipu-surface)",
          border: "1px solid var(--kipu-border)",
        }}
      >
        <div
          className="px-5 py-3"
          style={{ borderBottom: "1px solid var(--kipu-border)" }}
        >
          <h2 className="text-sm font-semibold" style={{ color: "var(--kipu-text)" }}>Usuarios con acceso</h2>
        </div>
        {!cargado ? (
          <div className="flex items-center justify-center py-8">
            <div
              className="w-4.5 h-4.5 border-2 border-t-transparent rounded-full animate-spin"
              style={{ borderColor: "var(--kipu-accent)", borderTopColor: "transparent" }}
            />
          </div>
        ) : usuarios.length === 0 ? (
          <p className="text-sm text-center py-8" style={{ color: "var(--kipu-subtle)" }}>Sin usuarios adicionales.</p>
        ) : (
          <div>
            {usuarios.map((u: any, idx: number) => {
              const esAdmin    = u.rol === "admin";
              const abierto    = expandido === u.profile_id;
              const permisos   = getPermisos(u);
              const conCambios = hayCambios(u.profile_id);

              return (
                <div
                  key={u.profile_id}
                  style={{ borderTop: idx > 0 ? "1px solid var(--kipu-border)" : "none" }}
                >
                  {/* Fila principal */}
                  <div className="flex items-center gap-3 px-5 py-3">
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
                      style={{ background: "color-mix(in srgb, var(--kipu-accent) 20%, transparent)" }}
                    >
                      <span className="text-xs font-bold" style={{ color: "var(--kipu-accent)" }}>
                        {(u.nombre || u.email)?.[0]?.toUpperCase()}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate" style={{ color: "var(--kipu-text)" }}>{u.nombre || u.email}</p>
                      <p className="text-xs truncate" style={{ color: "var(--kipu-subtle)" }}>{u.email}</p>
                    </div>
                    <span
                      className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium shrink-0"
                      style={{
                        background: esAdmin
                          ? "color-mix(in srgb, var(--kipu-accent) 20%, transparent)"
                          : "color-mix(in srgb, var(--kipu-text) 10%, transparent)",
                        color: esAdmin
                          ? "var(--kipu-accent)"
                          : "var(--kipu-subtle)",
                      }}
                    >
                      {esAdmin ? <><Shield size={10} /> Admin</> : <><User size={10} /> {u.rol}</>}
                    </span>
                    {/* Expandir permisos — solo no admin */}
                    {!esAdmin && (
                      <button
                        type="button"
                        onClick={() => setExpandido(abierto ? null : u.profile_id)}
                        className="p-1.5 rounded-lg transition-colors shrink-0"
                        style={{ color: "var(--kipu-subtle)" }}
                        onMouseEnter={e => {
                          e.currentTarget.style.color = "var(--kipu-text)";
                          e.currentTarget.style.background = "color-mix(in srgb, var(--kipu-text) 5%, transparent)";
                        }}
                        onMouseLeave={e => {
                          e.currentTarget.style.color = "var(--kipu-subtle)";
                          e.currentTarget.style.background = "transparent";
                        }}
                        title="Ver permisos"
                      >
                        {abierto ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => remover(u.profile_id, u.nombre || u.email)}
                      disabled={removiendo === u.profile_id}
                      className="p-1.5 rounded-lg transition-colors disabled:opacity-40 shrink-0"
                      style={{ color: "var(--kipu-subtle)" }}
                      onMouseEnter={e => {
                        e.currentTarget.style.color = "var(--kipu-danger)";
                        e.currentTarget.style.background = "color-mix(in srgb, var(--kipu-danger) 10%, transparent)";
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.color = "var(--kipu-subtle)";
                        e.currentTarget.style.background = "transparent";
                      }}
                      title="Remover usuario"
                    >
                      {removiendo === u.profile_id ? (
                        <div
                          className="w-3.5 h-3.5 border-2 border-t-transparent rounded-full animate-spin"
                          style={{ borderColor: "currentColor", borderTopColor: "transparent" }}
                        />
                      ) : (
                        <Trash2 size={13} />
                      )}
                    </button>
                  </div>

                  {/* Panel de permisos expandido */}
                  {abierto && !esAdmin && (
                    <div
                      className="px-5 pb-4"
                      style={{
                        background: "color-mix(in srgb, var(--kipu-text) 2%, transparent)",
                        borderTop: "1px solid var(--kipu-border)",
                      }}
                    >
                      {/* Plantillas rápidas */}
                      <div className="flex items-center gap-2 py-3">
                        <span className="text-xs" style={{ color: "var(--kipu-subtle)" }}>Plantilla:</span>
                        <button
                          type="button"
                          onClick={() => aplicarPlantilla(u.profile_id, "emisor")}
                          className="text-xs px-2 py-1 rounded-lg transition-colors"
                          style={{
                            background: "color-mix(in srgb, var(--kipu-text) 10%, transparent)",
                            color: "var(--kipu-muted)",
                          }}
                          onMouseEnter={e => {
                            e.currentTarget.style.background = "color-mix(in srgb, var(--kipu-text) 15%, transparent)";
                            e.currentTarget.style.color = "var(--kipu-text)";
                          }}
                          onMouseLeave={e => {
                            e.currentTarget.style.background = "color-mix(in srgb, var(--kipu-text) 10%, transparent)";
                            e.currentTarget.style.color = "var(--kipu-muted)";
                          }}
                        >
                          Emisor
                        </button>
                        <button
                          type="button"
                          onClick={() => aplicarPlantilla(u.profile_id, "contador")}
                          className="text-xs px-2 py-1 rounded-lg transition-colors"
                          style={{
                            background: "color-mix(in srgb, var(--kipu-text) 10%, transparent)",
                            color: "var(--kipu-muted)",
                          }}
                          onMouseEnter={e => {
                            e.currentTarget.style.background = "color-mix(in srgb, var(--kipu-text) 15%, transparent)";
                            e.currentTarget.style.color = "var(--kipu-text)";
                          }}
                          onMouseLeave={e => {
                            e.currentTarget.style.background = "color-mix(in srgb, var(--kipu-text) 10%, transparent)";
                            e.currentTarget.style.color = "var(--kipu-muted)";
                          }}
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
                              className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-left transition-colors font-medium"
                              style={{
                                background: activo
                                  ? "color-mix(in srgb, var(--kipu-accent) 20%, transparent)"
                                  : "var(--kipu-surface)",
                                border: activo
                                  ? "1px solid color-mix(in srgb, var(--kipu-accent) 40%, transparent)"
                                  : "1px solid var(--kipu-border)",
                                color: activo
                                  ? "var(--kipu-accent)"
                                  : "var(--kipu-subtle)",
                              }}
                              onMouseEnter={e => {
                                if (!activo) {
                                  e.currentTarget.style.color = "var(--kipu-text)";
                                  e.currentTarget.style.borderColor = "color-mix(in srgb, var(--kipu-text) 30%, transparent)";
                                }
                              }}
                              onMouseLeave={e => {
                                if (!activo) {
                                  e.currentTarget.style.color = "var(--kipu-subtle)";
                                  e.currentTarget.style.borderColor = "var(--kipu-border)";
                                }
                              }}
                            >
                              <div
                                className="w-4 h-4 rounded flex items-center justify-center shrink-0"
                                style={{
                                  background: activo
                                    ? "var(--kipu-accent)"
                                    : "color-mix(in srgb, var(--kipu-text) 15%, transparent)",
                                }}
                              >
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
                            type="button"
                            onClick={() => setPermisosCambiados(prev => {
                              const next = { ...prev };
                              delete next[u.profile_id];
                              return next;
                            })}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-colors"
                            style={{
                              border: "1px solid var(--kipu-border)",
                              color: "var(--kipu-muted)",
                            }}
                            onMouseEnter={e => e.currentTarget.style.color = "var(--kipu-text)"}
                            onMouseLeave={e => e.currentTarget.style.color = "var(--kipu-muted)"}
                          >
                            <X size={12} /> Descartar
                          </button>
                          <button
                            type="button"
                            onClick={() => guardarPermisos(u.profile_id)}
                            disabled={guardandoPermisos === u.profile_id}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-white text-xs font-medium transition-colors disabled:opacity-50"
                            style={{ background: "var(--kipu-accent)" }}
                            onMouseEnter={e => {
                              if (guardandoPermisos !== u.profile_id) e.currentTarget.style.background = "var(--kipu-accent-h)";
                            }}
                            onMouseLeave={e => {
                              if (guardandoPermisos !== u.profile_id) e.currentTarget.style.background = "var(--kipu-accent)";
                            }}
                          >
                            {guardandoPermisos === u.profile_id ? (
                              <div
                                className="w-3 h-3 border-2 border-t-transparent rounded-full animate-spin"
                                style={{ borderColor: "#FFFFFF", borderTopColor: "transparent" }}
                              />
                            ) : (
                              <Check size={12} />
                            )}
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