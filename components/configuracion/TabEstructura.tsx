// components/configuracion/TabEstructura.tsx
"use client";

import { useState } from "react";
import api from "@/lib/api";
import {
  Plus, X, Save, Loader2, Power, Pencil, AlertTriangle
} from "lucide-react";
import { clsx } from "clsx";

interface Props {
  estructura:   any[];
  onActualizar: () => void;
}

// ── Modal genérico ─────────────────────────────────────────────────────────────
function Modal({ title, onClose, children }: {
  title: string; onClose: () => void; children: React.ReactNode
}) {
  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
      <div className="bg-gray-900 border border-gray-800 rounded-xl w-full max-w-sm">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800">
          <h2 className="text-sm font-semibold text-white">{title}</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-white">
            <X size={18} />
          </button>
        </div>
        <div className="p-5 space-y-3">{children}</div>
      </div>
    </div>
  );
}

// ── Campo de formulario ────────────────────────────────────────────────────────
function Campo({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs text-gray-500 mb-1.5">{label}</label>
      {children}
    </div>
  );
}

const inputCls = "w-full px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500 text-sm";
const inputDisCls = "w-full px-3 py-2 rounded-lg bg-gray-700 border border-gray-600 text-gray-400 text-sm";

export default function TabEstructura({ estructura, onActualizar }: Props) {

  // ── Modales ──────────────────────────────────────────────────────────────────
  type ModalState =
    | { tipo: "crearEstab" }
    | { tipo: "editarEstab"; estab: any }
    | { tipo: "crearPunto"; estabCodigo: string }
    | { tipo: "editarPunto"; punto: any }
    | { tipo: "secuencial"; punto: any }
    | null;

  const [modal, setModal] = useState<ModalState>(null);

  // ── Forms ────────────────────────────────────────────────────────────────────
  const [estabForm,   setEstabForm]   = useState({ codigo: "001", nombre_comercial: "", direccion: "" });
  const [puntoForm,   setPuntoForm]   = useState({ establecimiento_codigo: "001", codigo: "001", nombre: "" });
  const [editEstab,   setEditEstab]   = useState({ nombre_comercial: "", direccion: "" });
  const [editPunto,   setEditPunto]   = useState({ nombre: "" });
  const [nuevoSec,    setNuevoSec]    = useState("");

  const [saving,    setSaving]    = useState(false);
  const [toggling,  setToggling]  = useState<number | null>(null);
  const [error,     setError]     = useState("");

  const cerrar = () => { setModal(null); setError(""); };

  // ── Crear establecimiento ────────────────────────────────────────────────────
  const crearEstab = async () => {
    setError(""); setSaving(true);
    try {
      await api.post("/api/v1/app/estructura/establecimientos", estabForm);
      onActualizar(); cerrar();
      setEstabForm({ codigo: "001", nombre_comercial: "", direccion: "" });
    } catch (e: any) {
      setError(e?.response?.data?.detail ?? "Error al crear.");
    } finally { setSaving(false); }
  };

  // ── Editar establecimiento ───────────────────────────────────────────────────
  const guardarEstab = async (estabId: number) => {
    setError(""); setSaving(true);
    try {
      await api.put(`/api/v1/app/estructura/establecimientos/${estabId}`, editEstab);
      onActualizar(); cerrar();
    } catch (e: any) {
      setError(e?.response?.data?.detail ?? "Error al actualizar.");
    } finally { setSaving(false); }
  };

  // ── Crear punto ──────────────────────────────────────────────────────────────
  const crearPunto = async () => {
    setError(""); setSaving(true);
    try {
      await api.post("/api/v1/app/estructura/puntos-emision", puntoForm);
      onActualizar(); cerrar();
    } catch (e: any) {
      setError(e?.response?.data?.detail ?? "Error al crear.");
    } finally { setSaving(false); }
  };

  // ── Editar punto ─────────────────────────────────────────────────────────────
  const guardarPunto = async (puntoId: number) => {
    setError(""); setSaving(true);
    try {
      await api.put(`/api/v1/app/estructura/puntos-emision/${puntoId}`, editPunto);
      onActualizar(); cerrar();
    } catch (e: any) {
      setError(e?.response?.data?.detail ?? "Error al actualizar.");
    } finally { setSaving(false); }
  };

  // ── Editar secuencial ────────────────────────────────────────────────────────
  const guardarSecuencial = async (puntoId: number) => {
    setError(""); setSaving(true);
    try {
      await api.patch(`/api/v1/app/estructura/puntos-emision/${puntoId}/secuencial`, {
        secuencial_actual: parseInt(nuevoSec),
      });
      onActualizar(); cerrar();
    } catch (e: any) {
      setError(e?.response?.data?.detail ?? "Error al actualizar secuencial.");
    } finally { setSaving(false); }
  };

  // ── Toggle activo ────────────────────────────────────────────────────────────
  const toggleEstab = async (estabId: number, activo: boolean) => {
    setToggling(estabId);
    try {
      await api.put(`/api/v1/app/estructura/establecimientos/${estabId}`, { is_active: !activo });
      onActualizar();
    } catch (e: any) {
      alert(e?.response?.data?.detail ?? "Error.");
    } finally { setToggling(null); }
  };

  const togglePunto = async (puntoId: number, activo: boolean) => {
    setToggling(puntoId);
    try {
      await api.put(`/api/v1/app/estructura/puntos-emision/${puntoId}`, { is_active: !activo });
      onActualizar();
    } catch (e: any) {
      alert(e?.response?.data?.detail ?? "Error.");
    } finally { setToggling(null); }
  };

  // ── Botones de acción ────────────────────────────────────────────────────────
  const BtnAccion = ({ onClick, color, title, children }: any) => (
    <button
      onClick={onClick}
      className={clsx("p-1.5 rounded-lg transition-colors", color)}
      title={title}
    >
      {children}
    </button>
  );

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-4">

      {/* Lista establecimientos */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800">
          <h2 className="text-sm font-semibold text-white">Establecimientos</h2>
          <button
            onClick={() => { setEstabForm({ codigo: "001", nombre_comercial: "", direccion: "" }); setModal({ tipo: "crearEstab" }); }}
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
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs bg-gray-800 px-2 py-0.5 rounded text-gray-300">
                      {estab.codigo}
                    </span>
                    <span className="text-sm font-medium text-white">
                      {estab.nombre_comercial || "Sin nombre"}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className={clsx(
                      "text-xs px-2 py-0.5 rounded-full",
                      estab.is_active
                        ? "bg-emerald-500/20 text-emerald-400"
                        : "bg-gray-700 text-gray-500"
                    )}>
                      {estab.is_active ? "Activo" : "Inactivo"}
                    </span>
                    <BtnAccion
                      onClick={() => {
                        setEditEstab({ nombre_comercial: estab.nombre_comercial || "", direccion: estab.direccion || "" });
                        setModal({ tipo: "editarEstab", estab });
                      }}
                      color="text-gray-400 hover:text-white hover:bg-gray-700"
                      title="Editar"
                    >
                      <Pencil size={13} />
                    </BtnAccion>
                    <BtnAccion
                      onClick={() => toggleEstab(estab.id, estab.is_active)}
                      color={estab.is_active ? "text-red-400 hover:bg-red-500/10" : "text-emerald-400 hover:bg-emerald-500/10"}
                      title={estab.is_active ? "Desactivar" : "Activar"}
                    >
                      {toggling === estab.id
                        ? <Loader2 size={13} className="animate-spin" />
                        : <Power size={13} />
                      }
                    </BtnAccion>
                  </div>
                </div>

                <p className="text-xs text-gray-500 mb-3">{estab.direccion}</p>

                {/* Puntos de emisión */}
                <div className="space-y-2 pl-2 border-l border-gray-800">
                  {estab.puntos_emision?.map((punto: any) => (
                    <div key={punto.id} className="flex items-center gap-2 bg-gray-800/50 rounded-lg px-3 py-2">
                      <span className="font-mono text-xs text-gray-400 shrink-0">{punto.codigo}</span>
                      <span className="text-xs text-white flex-1 truncate">{punto.nombre}</span>
                      <span className="text-xs text-gray-500 shrink-0">Sec. {punto.secuencial_actual}</span>
                      {punto.es_canal_whatsapp && (
                        <span className="text-xs bg-green-500/20 text-green-400 px-1.5 py-0.5 rounded shrink-0">WS</span>
                      )}
                      <span className={clsx(
                        "text-xs px-1.5 py-0.5 rounded-full shrink-0",
                        punto.is_active ? "bg-emerald-500/20 text-emerald-400" : "bg-gray-700 text-gray-500"
                      )}>
                        {punto.is_active ? "Activo" : "Inactivo"}
                      </span>

                      {/* Editar nombre */}
                      <BtnAccion
                        onClick={() => { setEditPunto({ nombre: punto.nombre || "" }); setModal({ tipo: "editarPunto", punto }); }}
                        color="text-gray-500 hover:text-white hover:bg-gray-700"
                        title="Editar"
                      >
                        <Pencil size={12} />
                      </BtnAccion>

                      {/* Editar secuencial */}
                      <BtnAccion
                        onClick={() => { setNuevoSec(String(punto.secuencial_actual)); setModal({ tipo: "secuencial", punto }); }}
                        color="text-gray-500 hover:text-amber-400 hover:bg-amber-500/10"
                        title="Editar secuencial"
                      >
                        <span className="text-[10px] font-mono font-bold">#</span>
                      </BtnAccion>

                      {/* Toggle activo */}
                      <BtnAccion
                        onClick={() => togglePunto(punto.id, punto.is_active)}
                        color={punto.is_active ? "text-red-400 hover:bg-red-500/10" : "text-emerald-400 hover:bg-emerald-500/10"}
                        title={punto.is_active ? "Desactivar" : "Activar"}
                      >
                        {toggling === punto.id
                          ? <Loader2 size={12} className="animate-spin" />
                          : <Power size={12} />
                        }
                      </BtnAccion>
                    </div>
                  ))}

                  <button
                    onClick={() => {
                      setPuntoForm({ establecimiento_codigo: estab.codigo, codigo: "001", nombre: "" });
                      setModal({ tipo: "crearPunto", estabCodigo: estab.codigo });
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

      {/* ── Modales ────────────────────────────────────────────────────────── */}

      {/* Crear establecimiento */}
      {modal?.tipo === "crearEstab" && (
        <Modal title="Nuevo establecimiento" onClose={cerrar}>
          <Campo label="Código (ej: 001)">
            <input value={estabForm.codigo} onChange={e => setEstabForm({ ...estabForm, codigo: e.target.value })}
              placeholder="001" maxLength={3} className={inputCls} />
          </Campo>
          <Campo label="Nombre comercial">
            <input value={estabForm.nombre_comercial} onChange={e => setEstabForm({ ...estabForm, nombre_comercial: e.target.value })}
              placeholder="Sucursal principal (opcional)" className={inputCls} />
          </Campo>
          <Campo label="Dirección">
            <input value={estabForm.direccion} onChange={e => setEstabForm({ ...estabForm, direccion: e.target.value })}
              placeholder="Dirección (opcional)" className={inputCls} />
          </Campo>
          {error && <p className="text-xs text-red-400 bg-red-400/10 px-3 py-2 rounded-lg">{error}</p>}
          <div className="flex gap-3 pt-1">
            <button onClick={cerrar} className="flex-1 py-2.5 rounded-lg border border-gray-700 text-gray-400 text-sm">Cancelar</button>
            <button onClick={crearEstab} disabled={saving}
              className="flex-1 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-medium flex items-center justify-center gap-2">
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Crear
            </button>
          </div>
        </Modal>
      )}

      {/* Editar establecimiento */}
      {modal?.tipo === "editarEstab" && (
        <Modal title={`Editar establecimiento ${modal.estab.codigo}`} onClose={cerrar}>
          <Campo label="Código">
            <input value={modal.estab.codigo} disabled className={inputDisCls} />
          </Campo>
          <Campo label="Nombre comercial">
            <input value={editEstab.nombre_comercial} onChange={e => setEditEstab({ ...editEstab, nombre_comercial: e.target.value })}
              placeholder="Nombre comercial" className={inputCls} />
          </Campo>
          <Campo label="Dirección">
            <input value={editEstab.direccion} onChange={e => setEditEstab({ ...editEstab, direccion: e.target.value })}
              placeholder="Dirección" className={inputCls} />
          </Campo>
          {error && <p className="text-xs text-red-400 bg-red-400/10 px-3 py-2 rounded-lg">{error}</p>}
          <div className="flex gap-3 pt-1">
            <button onClick={cerrar} className="flex-1 py-2.5 rounded-lg border border-gray-700 text-gray-400 text-sm">Cancelar</button>
            <button onClick={() => guardarEstab(modal.estab.id)} disabled={saving}
              className="flex-1 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-medium flex items-center justify-center gap-2">
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Guardar
            </button>
          </div>
        </Modal>
      )}

      {/* Crear punto */}
      {modal?.tipo === "crearPunto" && (
        <Modal title="Nuevo punto de emisión" onClose={cerrar}>
          <Campo label="Establecimiento">
            <input value={puntoForm.establecimiento_codigo} disabled className={inputDisCls} />
          </Campo>
          <Campo label="Código punto (ej: 001)">
            <input value={puntoForm.codigo} onChange={e => setPuntoForm({ ...puntoForm, codigo: e.target.value })}
              placeholder="001" maxLength={3} className={inputCls} />
          </Campo>
          <Campo label="Nombre">
            <input value={puntoForm.nombre} onChange={e => setPuntoForm({ ...puntoForm, nombre: e.target.value })}
              placeholder="Caja 1 (opcional)" className={inputCls} />
          </Campo>
          {error && <p className="text-xs text-red-400 bg-red-400/10 px-3 py-2 rounded-lg">{error}</p>}
          <div className="flex gap-3 pt-1">
            <button onClick={cerrar} className="flex-1 py-2.5 rounded-lg border border-gray-700 text-gray-400 text-sm">Cancelar</button>
            <button onClick={crearPunto} disabled={saving}
              className="flex-1 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-medium flex items-center justify-center gap-2">
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Crear
            </button>
          </div>
        </Modal>
      )}

      {/* Editar punto */}
      {modal?.tipo === "editarPunto" && (
        <Modal title={`Editar punto ${modal.punto.codigo}`} onClose={cerrar}>
          <Campo label="Código">
            <input value={modal.punto.codigo} disabled className={inputDisCls} />
          </Campo>
          <Campo label="Nombre">
            <input value={editPunto.nombre} onChange={e => setEditPunto({ nombre: e.target.value })}
              placeholder="Nombre del punto" className={inputCls} />
          </Campo>
          {error && <p className="text-xs text-red-400 bg-red-400/10 px-3 py-2 rounded-lg">{error}</p>}
          <div className="flex gap-3 pt-1">
            <button onClick={cerrar} className="flex-1 py-2.5 rounded-lg border border-gray-700 text-gray-400 text-sm">Cancelar</button>
            <button onClick={() => guardarPunto(modal.punto.id)} disabled={saving}
              className="flex-1 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-medium flex items-center justify-center gap-2">
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Guardar
            </button>
          </div>
        </Modal>
      )}

      {/* Editar secuencial */}
      {modal?.tipo === "secuencial" && (
        <Modal title={`Secuencial — Punto ${modal.punto.codigo}`} onClose={cerrar}>
          <div className="flex items-start gap-3 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2.5">
            <AlertTriangle size={14} className="text-amber-400 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-300">
              Solo modifica si hay un hueco en la secuencia o necesitas reiniciar.
              El SRI puede rechazar comprobantes con secuenciales duplicados.
            </p>
          </div>
          <Campo label="Secuencial actual">
            <input value={modal.punto.secuencial_actual} disabled className={inputDisCls} />
          </Campo>
          <Campo label="Nuevo secuencial">
            <input
              type="number"
              value={nuevoSec}
              onChange={e => setNuevoSec(e.target.value)}
              min={1}
              placeholder="Ej: 42"
              className={inputCls}
            />
          </Campo>
          {error && <p className="text-xs text-red-400 bg-red-400/10 px-3 py-2 rounded-lg">{error}</p>}
          <div className="flex gap-3 pt-1">
            <button onClick={cerrar} className="flex-1 py-2.5 rounded-lg border border-gray-700 text-gray-400 text-sm">Cancelar</button>
            <button onClick={() => guardarSecuencial(modal.punto.id)} disabled={saving || !nuevoSec}
              className="flex-1 py-2.5 rounded-lg bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white text-sm font-medium flex items-center justify-center gap-2">
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Actualizar
            </button>
          </div>
        </Modal>
      )}

    </div>
  );
}