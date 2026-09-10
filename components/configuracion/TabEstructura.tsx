"use client";

import { useState } from "react";
import api from "@/lib/api";
import {
  Plus, X, Save, Power, Pencil, AlertTriangle
} from "lucide-react";

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
      <div
        className="rounded-xl w-full max-w-sm"
        style={{
          background: "var(--kipu-surface)",
          border: "1px solid var(--kipu-border)",
        }}
      >
        <div
          className="flex items-center justify-between px-5 py-4"
          style={{ borderBottom: "1px solid var(--kipu-border)" }}
        >
          <h2 className="text-sm font-semibold" style={{ color: "var(--kipu-text)" }}>{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="transition-colors"
            style={{ color: "var(--kipu-subtle)" }}
            onMouseEnter={e => e.currentTarget.style.color = "var(--kipu-text)"}
            onMouseLeave={e => e.currentTarget.style.color = "var(--kipu-subtle)"}
          >
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
      <label className="block text-xs mb-1.5" style={{ color: "var(--kipu-subtle)" }}>{label}</label>
      {children}
    </div>
  );
}

const inputStyle = {
  background: "var(--kipu-surface)",
  border: "1px solid var(--kipu-border)",
  color: "var(--kipu-text)",
};

const inputDisStyle = {
  background: "color-mix(in srgb, var(--kipu-text) 5%, transparent)",
  border: "1px solid var(--kipu-border)",
  color: "var(--kipu-subtle)",
};

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
  const BtnAccion = ({ onClick, style, title, children }: any) => (
    <button
      type="button"
      onClick={onClick}
      className="p-1.5 rounded-lg transition-colors flex items-center justify-center"
      style={style}
      title={title}
    >
      {children}
    </button>
  );

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-4">

      {/* Lista establecimientos */}
      <div
        className="rounded-xl overflow-hidden"
        style={{
          background: "var(--kipu-surface)",
          border: "1px solid var(--kipu-border)",
        }}
      >
        <div
          className="flex items-center justify-between px-5 py-4"
          style={{ borderBottom: "1px solid var(--kipu-border)" }}
        >
          <h2 className="text-sm font-semibold" style={{ color: "var(--kipu-text)" }}>Establecimientos</h2>
          <button
            type="button"
            onClick={() => { setEstabForm({ codigo: "001", nombre_comercial: "", direccion: "" }); setModal({ tipo: "crearEstab" }); }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-white text-xs font-medium transition-colors"
            style={{ background: "var(--kipu-accent)" }}
            onMouseEnter={e => e.currentTarget.style.background = "var(--kipu-accent-h)"}
            onMouseLeave={e => e.currentTarget.style.background = "var(--kipu-accent)"}
          >
            <Plus size={13} /> Agregar
          </button>
        </div>

        {estructura.length === 0 ? (
          <p className="text-sm text-center py-8" style={{ color: "var(--kipu-subtle)" }}>
            Sin establecimientos. Crea uno para poder facturar.
          </p>
        ) : (
          <div>
            {estructura.map((estab: any, idx: number) => (
              <div
                key={estab.id}
                className="px-5 py-4"
                style={{ borderTop: idx > 0 ? "1px solid var(--kipu-border)" : "none" }}
              >

                {/* Header establecimiento */}
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span
                      className="font-mono text-xs px-2 py-0.5 rounded"
                      style={{
                        background: "color-mix(in srgb, var(--kipu-text) 6%, transparent)",
                        color: "var(--kipu-muted)",
                      }}
                    >
                      {estab.codigo}
                    </span>
                    <span className="text-sm font-medium" style={{ color: "var(--kipu-text)" }}>
                      {estab.nombre_comercial || "Sin nombre"}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span
                      className="text-xs px-2 py-0.5 rounded-full font-medium"
                      style={{
                        background: estab.is_active
                          ? "color-mix(in srgb, var(--kipu-success) 20%, transparent)"
                          : "color-mix(in srgb, var(--kipu-text) 10%, transparent)",
                        color: estab.is_active
                          ? "var(--kipu-success)"
                          : "var(--kipu-subtle)",
                      }}
                    >
                      {estab.is_active ? "Activo" : "Inactivo"}
                    </span>
                    <BtnAccion
                      onClick={() => {
                        setEditEstab({ nombre_comercial: estab.nombre_comercial || "", direccion: estab.direccion || "" });
                        setModal({ tipo: "editarEstab", estab });
                      }}
                      style={{ color: "var(--kipu-subtle)" }}
                      title="Editar"
                    >
                      <Pencil size={13} />
                    </BtnAccion>
                    <BtnAccion
                      onClick={() => toggleEstab(estab.id, estab.is_active)}
                      style={{ color: estab.is_active ? "var(--kipu-danger)" : "var(--kipu-success)" }}
                      title={estab.is_active ? "Desactivar" : "Activar"}
                    >
                      {toggling === estab.id ? (
                        <div
                          className="w-3.5 h-3.5 border-2 border-t-transparent rounded-full animate-spin"
                          style={{ borderColor: "currentColor", borderTopColor: "transparent" }}
                        />
                      ) : (
                        <Power size={13} />
                      )}
                    </BtnAccion>
                  </div>
                </div>

                <p className="text-xs mb-3" style={{ color: "var(--kipu-subtle)" }}>{estab.direccion}</p>

                {/* Puntos de emisión */}
                <div
                  className="space-y-2 pl-2"
                  style={{ borderLeft: "1px solid var(--kipu-border)" }}
                >
                  {estab.puntos_emision?.map((punto: any) => (
                    <div
                      key={punto.id}
                      className="flex items-center gap-2 rounded-lg px-3 py-2"
                      style={{ background: "color-mix(in srgb, var(--kipu-text) 4%, transparent)" }}
                    >
                      <span className="font-mono text-xs shrink-0" style={{ color: "var(--kipu-subtle)" }}>{punto.codigo}</span>
                      <span className="text-xs flex-1 truncate" style={{ color: "var(--kipu-text)" }}>{punto.nombre}</span>

                      {/* Desglose de secuenciales por tipo */}
                      <div className="flex gap-1 shrink-0">
                        {punto.secuenciales?.produccion && Object.entries(punto.secuenciales.produccion).map(([tipo, sec]: [string, any]) => (
                          (sec as number) > 0 && (
                            <span
                              key={tipo}
                              className="text-[10px] font-mono px-1.5 py-0.5 rounded"
                              style={{
                                background: "color-mix(in srgb, var(--kipu-text) 6%, transparent)",
                                color: "var(--kipu-subtle)",
                              }}
                            >
                              {tipo}:{sec}
                            </span>
                          )
                        ))}
                      </div>

                      {punto.es_canal_whatsapp && (
                        <span
                          className="text-xs px-1.5 py-0.5 rounded shrink-0 font-medium"
                          style={{
                            background: "color-mix(in srgb, var(--kipu-success) 20%, transparent)",
                            color: "var(--kipu-success)",
                          }}
                        >
                          WS
                        </span>
                      )}
                      <span
                        className="text-xs px-1.5 py-0.5 rounded-full shrink-0 font-medium"
                        style={{
                          background: punto.is_active
                            ? "color-mix(in srgb, var(--kipu-success) 20%, transparent)"
                            : "color-mix(in srgb, var(--kipu-text) 10%, transparent)",
                          color: punto.is_active
                            ? "var(--kipu-success)"
                            : "var(--kipu-subtle)",
                        }}
                      >
                        {punto.is_active ? "Activo" : "Inactivo"}
                      </span>

                      {/* Editar nombre */}
                      <BtnAccion
                        onClick={() => { setEditPunto({ nombre: punto.nombre || "" }); setModal({ tipo: "editarPunto", punto }); }}
                        style={{ color: "var(--kipu-subtle)" }}
                        title="Editar"
                      >
                        <Pencil size={12} />
                      </BtnAccion>

                      {/* Editar secuencial */}
                      <BtnAccion
                        onClick={() => { setModal({ tipo: "secuencial", punto }); }}
                        style={{ color: "var(--kipu-warning)" }}
                        title="Editar secuenciales"
                      >
                        <span className="text-[10px] font-mono font-bold">#</span>
                      </BtnAccion>

                      {/* Toggle activo */}
                      <BtnAccion
                        onClick={() => togglePunto(punto.id, punto.is_active)}
                        style={{ color: punto.is_active ? "var(--kipu-danger)" : "var(--kipu-success)" }}
                        title={punto.is_active ? "Desactivar" : "Activar"}
                      >
                        {toggling === punto.id ? (
                          <div
                            className="w-3 h-3 border-2 border-t-transparent rounded-full animate-spin"
                            style={{ borderColor: "currentColor", borderTopColor: "transparent" }}
                          />
                        ) : (
                          <Power size={12} />
                        )}
                      </BtnAccion>
                    </div>
                  ))}

                  <button
                    type="button"
                    onClick={() => {
                      setPuntoForm({ establecimiento_codigo: estab.codigo, codigo: "001", nombre: "" });
                      setModal({ tipo: "crearPunto", estabCodigo: estab.codigo });
                    }}
                    className="flex items-center gap-1.5 text-xs transition-colors mt-1 font-medium"
                    style={{ color: "var(--kipu-accent)" }}
                    onMouseEnter={e => e.currentTarget.style.color = "var(--kipu-accent-h)"}
                    onMouseLeave={e => e.currentTarget.style.color = "var(--kipu-accent)"}
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
            <input
              value={estabForm.codigo}
              onChange={e => setEstabForm({ ...estabForm, codigo: e.target.value })}
              placeholder="001"
              maxLength={3}
              className="w-full px-3 py-2 rounded-lg text-sm transition-colors focus:outline-none"
              style={inputStyle}
              onFocus={e => e.currentTarget.style.borderColor = "var(--kipu-accent)"}
              onBlur={e => e.currentTarget.style.borderColor = "var(--kipu-border)"}
            />
          </Campo>
          <Campo label="Nombre comercial">
            <input
              value={estabForm.nombre_comercial}
              onChange={e => setEstabForm({ ...estabForm, nombre_comercial: e.target.value })}
              placeholder="Sucursal principal (opcional)"
              className="w-full px-3 py-2 rounded-lg text-sm transition-colors focus:outline-none"
              style={inputStyle}
              onFocus={e => e.currentTarget.style.borderColor = "var(--kipu-accent)"}
              onBlur={e => e.currentTarget.style.borderColor = "var(--kipu-border)"}
            />
          </Campo>
          <Campo label="Dirección">
            <input
              value={estabForm.direccion}
              onChange={e => setEstabForm({ ...estabForm, direccion: e.target.value })}
              placeholder="Dirección (opcional)"
              className="w-full px-3 py-2 rounded-lg text-sm transition-colors focus:outline-none"
              style={inputStyle}
              onFocus={e => e.currentTarget.style.borderColor = "var(--kipu-accent)"}
              onBlur={e => e.currentTarget.style.borderColor = "var(--kipu-border)"}
            />
          </Campo>
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
              onClick={cerrar}
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
              onClick={crearEstab}
              disabled={saving}
              className="flex-1 py-2.5 rounded-lg text-white text-sm font-medium flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
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
              Crear
            </button>
          </div>
        </Modal>
      )}

      {/* Editar establecimiento */}
      {modal?.tipo === "editarEstab" && (
        <Modal title={`Editar establecimiento ${modal.estab.codigo}`} onClose={cerrar}>
          <Campo label="Código">
            <input value={modal.estab.codigo} disabled className="w-full px-3 py-2 rounded-lg text-sm" style={inputDisStyle} />
          </Campo>
          <Campo label="Nombre comercial">
            <input
              value={editEstab.nombre_comercial}
              onChange={e => setEditEstab({ ...editEstab, nombre_comercial: e.target.value })}
              placeholder="Nombre comercial"
              className="w-full px-3 py-2 rounded-lg text-sm transition-colors focus:outline-none"
              style={inputStyle}
              onFocus={e => e.currentTarget.style.borderColor = "var(--kipu-accent)"}
              onBlur={e => e.currentTarget.style.borderColor = "var(--kipu-border)"}
            />
          </Campo>
          <Campo label="Dirección">
            <input
              value={editEstab.direccion}
              onChange={e => setEditEstab({ ...editEstab, direccion: e.target.value })}
              placeholder="Dirección"
              className="w-full px-3 py-2 rounded-lg text-sm transition-colors focus:outline-none"
              style={inputStyle}
              onFocus={e => e.currentTarget.style.borderColor = "var(--kipu-accent)"}
              onBlur={e => e.currentTarget.style.borderColor = "var(--kipu-border)"}
            />
          </Campo>
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
              onClick={cerrar}
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
              onClick={() => guardarEstab(modal.estab.id)}
              disabled={saving}
              className="flex-1 py-2.5 rounded-lg text-white text-sm font-medium flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
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
        </Modal>
      )}

      {/* Crear punto */}
      {modal?.tipo === "crearPunto" && (
        <Modal title="Nuevo punto de emisión" onClose={cerrar}>
          <Campo label="Establecimiento">
            <input value={puntoForm.establecimiento_codigo} disabled className="w-full px-3 py-2 rounded-lg text-sm" style={inputDisStyle} />
          </Campo>
          <Campo label="Código punto (ej: 001)">
            <input
              value={puntoForm.codigo}
              onChange={e => setPuntoForm({ ...puntoForm, codigo: e.target.value })}
              placeholder="001"
              maxLength={3}
              className="w-full px-3 py-2 rounded-lg text-sm transition-colors focus:outline-none"
              style={inputStyle}
              onFocus={e => e.currentTarget.style.borderColor = "var(--kipu-accent)"}
              onBlur={e => e.currentTarget.style.borderColor = "var(--kipu-border)"}
            />
          </Campo>
          <Campo label="Nombre">
            <input
              value={puntoForm.nombre}
              onChange={e => setPuntoForm({ ...puntoForm, nombre: e.target.value })}
              placeholder="Caja 1 (opcional)"
              className="w-full px-3 py-2 rounded-lg text-sm transition-colors focus:outline-none"
              style={inputStyle}
              onFocus={e => e.currentTarget.style.borderColor = "var(--kipu-accent)"}
              onBlur={e => e.currentTarget.style.borderColor = "var(--kipu-border)"}
            />
          </Campo>
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
              onClick={cerrar}
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
              onClick={crearPunto}
              disabled={saving}
              className="flex-1 py-2.5 rounded-lg text-white text-sm font-medium flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
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
              Crear
            </button>
          </div>
        </Modal>
      )}

      {/* Editar punto */}
      {modal?.tipo === "editarPunto" && (
        <Modal title={`Editar punto ${modal.punto.codigo}`} onClose={cerrar}>
          <Campo label="Código">
            <input value={modal.punto.codigo} disabled className="w-full px-3 py-2 rounded-lg text-sm" style={inputDisStyle} />
          </Campo>
          <Campo label="Nombre">
            <input
              value={editPunto.nombre}
              onChange={e => setEditPunto({ nombre: e.target.value })}
              placeholder="Nombre del punto"
              className="w-full px-3 py-2 rounded-lg text-sm transition-colors focus:outline-none"
              style={inputStyle}
              onFocus={e => e.currentTarget.style.borderColor = "var(--kipu-accent)"}
              onBlur={e => e.currentTarget.style.borderColor = "var(--kipu-border)"}
            />
          </Campo>
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
              onClick={cerrar}
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
              onClick={() => guardarPunto(modal.punto.id)}
              disabled={saving}
              className="flex-1 py-2.5 rounded-lg text-white text-sm font-medium flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
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
        </Modal>
      )}

      {/* Editar secuencial */}
      {modal?.tipo === "secuencial" && (
        <Modal title={`Secuenciales — Punto ${modal.punto.codigo}`} onClose={cerrar}>
          <div
            className="flex items-start gap-3 rounded-lg px-3 py-2.5"
            style={{
              background: "color-mix(in srgb, var(--kipu-warning) 10%, transparent)",
              border: "1px solid color-mix(in srgb, var(--kipu-warning) 20%, transparent)",
            }}
          >
            <AlertTriangle size={14} className="shrink-0 mt-0.5" style={{ color: "var(--kipu-warning)" }} />
            <p className="text-xs" style={{ color: "var(--kipu-warning)" }}>
              Solo modifica si hay un hueco en la secuencia o necesitas reiniciar.
              El SRI puede rechazar comprobantes con secuenciales duplicados.
            </p>
          </div>

          {/* Producción */}
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--kipu-success)" }}>
              Producción
            </p>
            {Object.entries(modal.punto.secuenciales?.produccion || {}).map(([tipo, sec]: [string, any]) => (
              <div key={`prod-${tipo}`} className="flex items-center gap-3">
                <span className="text-xs font-bold w-10 shrink-0" style={{ color: "var(--kipu-subtle)" }}>{tipo}</span>
                <input
                  type="number"
                  defaultValue={sec}
                  min={0}
                  id={`sec-produccion-${tipo}`}
                  className="w-full px-3 py-2 rounded-lg text-sm transition-colors focus:outline-none"
                  style={inputStyle}
                  onFocus={e => e.currentTarget.style.borderColor = "var(--kipu-accent)"}
                  onBlur={e => e.currentTarget.style.borderColor = "var(--kipu-border)"}
                />
              </div>
            ))}
          </div>

          {/* Pruebas */}
          <div
            className="space-y-2 pt-2"
            style={{ borderTop: "1px solid var(--kipu-border)" }}
          >
            <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "#60a5fa" }}>
              Pruebas / Sandbox
            </p>
            {Object.entries(modal.punto.secuenciales?.pruebas || {}).map(([tipo, sec]: [string, any]) => (
              <div key={`test-${tipo}`} className="flex items-center gap-3">
                <span className="text-xs font-bold w-10 shrink-0" style={{ color: "var(--kipu-subtle)" }}>{tipo}</span>
                <input
                  type="number"
                  defaultValue={sec}
                  min={0}
                  id={`sec-pruebas-${tipo}`}
                  className="w-full px-3 py-2 rounded-lg text-sm transition-colors focus:outline-none"
                  style={inputStyle}
                  onFocus={e => e.currentTarget.style.borderColor = "var(--kipu-accent)"}
                  onBlur={e => e.currentTarget.style.borderColor = "var(--kipu-border)"}
                />
              </div>
            ))}
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
              onClick={cerrar}
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
              onClick={async () => {
                setError(""); setSaving(true);
                try {
                  const produccion: Record<string, number> = {};
                  const pruebas:    Record<string, number> = {};

                  Object.keys(modal.punto.secuenciales?.produccion || {}).forEach(tipo => {
                    const el = document.getElementById(`sec-produccion-${tipo}`) as HTMLInputElement;
                    produccion[tipo] = parseInt(el?.value || "0");
                  });

                  Object.keys(modal.punto.secuenciales?.pruebas || {}).forEach(tipo => {
                    const el = document.getElementById(`sec-pruebas-${tipo}`) as HTMLInputElement;
                    pruebas[tipo] = parseInt(el?.value || "0");
                  });

                  await api.patch(
                    `/api/v1/app/estructura/puntos-emision/${modal.punto.id}/secuencial`,
                    { secuenciales: { produccion, pruebas } }
                  );
                  onActualizar(); cerrar();
                } catch (e: any) {
                  setError(e?.response?.data?.detail ?? "Error al actualizar secuenciales.");
                } finally { setSaving(false); }
              }}
              disabled={saving}
              className="flex-1 py-2.5 rounded-lg text-white text-sm font-medium flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
              style={{ background: "var(--kipu-warning)" }}
            >
              {saving ? (
                <div
                  className="w-3.5 h-3.5 border-2 border-t-transparent rounded-full animate-spin"
                  style={{ borderColor: "#FFFFFF", borderTopColor: "transparent" }}
                />
              ) : (
                <Save size={14} />
              )}
              Actualizar
            </button>
          </div>
        </Modal>
      )}

    </div>
  );
}