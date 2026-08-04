// components/configuracion/TabUsuarios.tsx
"use client";

import { useState } from "react";
import api from "@/lib/api";
import { Loader2, Plus } from "lucide-react";
import { clsx } from "clsx";

interface Props {
  empresaId: number;
}

export default function TabUsuarios({ empresaId }: Props) {
  const [usuarios,  setUsuarios]  = useState<any[]>([]);
  const [cargado,   setCargado]   = useState(false);
  const [invEmail,  setInvEmail]  = useState("");
  const [invRol,    setInvRol]    = useState("emisor");
  const [inviting,  setInviting]  = useState(false);
  const [invMsg,    setInvMsg]    = useState("");
  const [invError,  setInvError]  = useState("");

  // Cargar usuarios al montar
  useState(() => {
    api.get(`/api/v1/app/usuarios/empresas/${empresaId}/usuarios`)
      .then(r => { setUsuarios(r.data.data ?? []); setCargado(true); })
      .catch(console.error);
  });

  const invitar = async () => {
    if (!invEmail) return;
    setInviting(true);
    setInvMsg("");
    setInvError("");
    try {
      const r = await api.post(`/api/v1/app/usuarios/empresas/${empresaId}/invitar`, {
        email: invEmail, rol: invRol
      });
      setInvMsg(r.data.mensaje);
      setInvEmail("");
      const ru = await api.get(`/api/v1/app/usuarios/empresas/${empresaId}/usuarios`);
      setUsuarios(ru.data.data ?? []);
    } catch (err: any) {
      setInvError(err?.response?.data?.detail ?? "Error al invitar.");
    } finally {
      setInviting(false);
    }
  };

  const remover = async (profileId: string) => {
    if (!confirm("¿Remover este usuario de la empresa?")) return;
    try {
      await api.delete(`/api/v1/app/usuarios/empresas/${empresaId}/usuarios/${profileId}`);
      setUsuarios(prev => prev.filter(u => u.profile_id !== profileId));
    } catch (err: any) {
      alert(err?.response?.data?.detail ?? "Error al remover usuario.");
    }
  };

  return (
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
        {invMsg   && <p className="mt-2 text-xs text-emerald-400">{invMsg}</p>}
        {invError && <p className="mt-2 text-xs text-red-400">{invError}</p>}
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
                <button
                  onClick={() => remover(u.profile_id)}
                  className="text-xs text-red-400 hover:text-red-300 transition-colors ml-2"
                >
                  Remover
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}