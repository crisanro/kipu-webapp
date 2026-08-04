// components/configuracion/TabEstructura.tsx
"use client";

import { useState } from "react";
import api from "@/lib/api";
import { Plus, X, Save, Loader2, Power } from "lucide-react";
import { clsx } from "clsx";

interface Props {
  estructura:    any[];
  onActualizar:  () => void;
}

export default function TabEstructura({ estructura, onActualizar }: Props) {
  const [showEstab,   setShowEstab]   = useState(false);
  const [showPunto,   setShowPunto]   = useState(false);
  const [estabForm,   setEstabForm]   = useState({ codigo: "001", nombre_comercial: "", direccion: "" });
  const [puntoForm,   setPuntoForm]   = useState({ establecimiento_codigo: "001", codigo: "001", nombre: "" });
  const [savingEstab, setSavingEstab] = useState(false);
  const [savingPunto, setSavingPunto] = useState(false);
  const [estabError,  setEstabError]  = useState("");
  const [puntoError,  setPuntoError]  = useState("");
  const [toggling,    setToggling]    = useState<number | null>(null);

  const crearEstablecimiento = async () => {
    setEstabError("");
    setSavingEstab(true);
    try {
      await api.post("/api/v1/app/estructura/establecimientos", estabForm);
      onActualizar();
      setShowEstab(false);
      setEstabForm({ codigo: "001", nombre_comercial: "", direccion: "" });
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
      onActualizar();
      setShowPunto(false);
    } catch (err: any) {
      setPuntoError(err?.response?.data?.detail ?? "Error al crear punto.");
    } finally {
      setSavingPunto(false);
    }
  };

  const toggleEstab = async (estabId: number, activo: boolean) => {
    setToggling(estabId);
    try {
      await api.put(`/api/v1/app/estructura/establecimientos/${estabId}`, {
        is_active: !activo
      });
      onActualizar();
    } catch (err: any) {
      alert(err?.response?.data?.detail ?? "Error al actualizar establecimiento.");
    } finally {
      setToggling(null);
    }
  };

  const togglePunto = async (puntoId: number, activo: boolean) => {
    setToggling(puntoId);
    try {
      await api.put(`/api/v1/app/estructura/puntos-emision/${puntoId}`, {
        is_active: !activo
      });
      onActualizar();
    } catch (err: any) {
      alert(err?.response?.data?.detail ?? "Error al actualizar punto.");
    } finally {
      setToggling(null);
    }
  };

  return (
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

                {/* Header establecimiento */}
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs bg-gray-800 px-2 py-0.5 rounded text-gray-300">
                      {estab.codigo}
                    </span>
                    <span className="text-sm font-medium text-white">
                      {estab.nombre_comercial || "Sin nombre"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={clsx(
                      "text-xs px-2 py-0.5 rounded-full",
                      estab.is_active
                        ? "bg-emerald-500/20 text-emerald-400"
                        : "bg-gray-700 text-gray-500"
                    )}>
                      {estab.is_active ? "Activo" : "Inactivo"}
                    </span>
                    <button
                      onClick={() => toggleEstab(estab.id, estab.is_active)}
                      disabled={toggling === estab.id}
                      className={clsx(
                        "p-1.5 rounded-lg text-xs transition-colors",
                        estab.is_active
                          ? "text-red-400 hover:bg-red-500/10"
                          : "text-emerald-400 hover:bg-emerald-500/10"
                      )}
                      title={estab.is_active ? "Desactivar" : "Activar"}
                    >
                      {toggling === estab.id
                        ? <Loader2 size={13} className="animate-spin" />
                        : <Power size={13} />
                      }
                    </button>
                  </div>
                </div>

                <p className="text-xs text-gray-500 mb-3">{estab.direccion}</p>

                {/* Puntos de emisión */}
                <div className="space-y-2 pl-2 border-l border-gray-800">
                  {estab.puntos_emision?.map((punto: any) => (
                    <div key={punto.id} className="flex items-center gap-3 bg-gray-800/50 rounded-lg px-3 py-2">
                      <span className="font-mono text-xs text-gray-400">{punto.codigo}</span>
                      <span className="text-xs text-white flex-1">{punto.nombre}</span>
                      <span className="text-xs text-gray-500">Sec. {punto.secuencial_actual}</span>
                      {punto.es_canal_whatsapp && (
                        <span className="text-xs bg-green-500/20 text-green-400 px-1.5 py-0.5 rounded">WS</span>
                      )}
                      <span className={clsx(
                        "text-xs px-1.5 py-0.5 rounded-full",
                        punto.is_active
                          ? "bg-emerald-500/20 text-emerald-400"
                          : "bg-gray-700 text-gray-500"
                      )}>
                        {punto.is_active ? "Activo" : "Inactivo"}
                      </span>
                      <button
                        onClick={() => togglePunto(punto.id, punto.is_active)}
                        disabled={toggling === punto.id}
                        className={clsx(
                          "p-1 rounded transition-colors",
                          punto.is_active
                            ? "text-red-400 hover:bg-red-500/10"
                            : "text-emerald-400 hover:bg-emerald-500/10"
                        )}
                        title={punto.is_active ? "Desactivar" : "Activar"}
                      >
                        {toggling === punto.id
                          ? <Loader2 size={12} className="animate-spin" />
                          : <Power size={12} />
                        }
                      </button>
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

      {/* Modal crear punto */}
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
  );
}