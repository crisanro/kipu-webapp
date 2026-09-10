"use client";
import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import api from "@/lib/api";
import { usePermiso } from "@/hooks/usePermiso";
import SinAcceso from "@/components/SinAcceso";
import {
  Search, Plus, Users, X,
  ChevronDown, Save, AlertCircle, Check
} from "lucide-react";

interface Persona {
  uid:                     string;
  razon_social:            string;
  identificacion:          string;
  tipo_identificacion_sri: string;
  email:                   string;
  telefono:                string;
  direccion:               string;
}

const TIPO_ID = [
  { value: "04", label: "RUC" },
  { value: "05", label: "Cédula" },
  { value: "06", label: "Pasaporte" },
  { value: "08", label: "Exterior" },
];

const EMPTY_FORM = {
  tipo_identificacion_sri: "05",
  identificacion:          "",
  razon_social:            "",
  email:                   "",
  telefono:                "",
  direccion:               "",
};

// ── Validación ────────────────────────────────────────────────────────────────
function validarIdentificacion(tipo: string, valor: string): { ok: boolean; error: string } {
  const v = valor.replace(/\D/g, "");
  if (!v) return { ok: false, error: "" };

  if (tipo === "05") {
    if (v.length !== 10) return { ok: false, error: "La cédula debe tener 10 dígitos." };
    const prov = parseInt(v.substring(0, 2));
    if ((prov < 1 || prov > 24) && prov !== 30)
      return { ok: false, error: "Provincia inválida (primeros 2 dígitos)." };
    if (parseInt(v[2]) >= 6)
      return { ok: false, error: "Tercer dígito de cédula inválido." };
    const digitos = v.split("").map(Number);
    const verificador = digitos[9];
    let suma = 0;
    for (let i = 0; i < 9; i++) {
      let prod = digitos[i] * (i % 2 === 0 ? 2 : 1);
      if (prod > 9) prod -= 9;
      suma += prod;
    }
    const calc = suma % 10 === 0 ? 0 : 10 - (suma % 10);
    if (calc !== verificador) return { ok: false, error: "Número de cédula inválido." };
    return { ok: true, error: "" };
  }

  if (tipo === "04") {
    if (v.length !== 13) return { ok: false, error: "El RUC debe tener 13 dígitos." };
    if (!v.endsWith("001")) return { ok: false, error: "El RUC debe terminar en 001." };
    const prov = parseInt(v.substring(0, 2));
    if ((prov < 1 || prov > 24) && prov !== 30)
      return { ok: false, error: "Provincia inválida (primeros 2 dígitos)." };
    const tercero = parseInt(v[2]);
    if (tercero <= 5) {
      const digitos = v.substring(0, 10).split("").map(Number);
      const verificador = digitos[9];
      let suma = 0;
      for (let i = 0; i < 9; i++) {
        let prod = digitos[i] * (i % 2 === 0 ? 2 : 1);
        if (prod > 9) prod -= 9;
        suma += prod;
      }
      const calc = suma % 10 === 0 ? 0 : 10 - (suma % 10);
      if (calc !== verificador) return { ok: false, error: "RUC de persona natural inválido." };
    } else if (tercero === 6 || tercero === 9) {
      // jurídico — no se valida dígito verificador
    } else {
      return { ok: false, error: "Tercer dígito de RUC inválido." };
    }
    return { ok: true, error: "" };
  }

  if (tipo === "06" || tipo === "08") {
    if (valor.trim().length < 2) return { ok: false, error: "Ingresa la identificación." };
    return { ok: true, error: "" };
  }

  return { ok: true, error: "" };
}

function validarEmail(email: string): boolean {
  if (!email) return true; // opcional
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// ── Página ────────────────────────────────────────────────────────────────────
export default function PersonasPage() {
  const puedeVer = usePermiso("clientes");
  if (!puedeVer) return <SinAcceso />;
  const [personas,  setPersonas]  = useState<Persona[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [query,     setQuery]     = useState("");
  const [showModal, setShowModal] = useState(false);
  const [form,      setForm]      = useState(EMPTY_FORM);
  const [saving,    setSaving]    = useState(false);
  const [error,     setError]     = useState("");

  // Validación reactiva
  const valId    = validarIdentificacion(form.tipo_identificacion_sri, form.identificacion);
  const emailOk  = validarEmail(form.email);
  const puedeGuardar =
    valId.ok &&
    emailOk &&
    form.razon_social.trim().length > 0 &&
    !saving;

  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get("/api/v1/app/clientes");
      setPersonas(res.data.data ?? res.data ?? []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  const filtrados = personas.filter((c) =>
    !query ||
    c.razon_social?.toLowerCase().includes(query.toLowerCase()) ||
    c.identificacion?.includes(query) ||
    c.email?.toLowerCase().includes(query.toLowerCase())
  );

  // Al cambiar tipo, limpiar identificación
  const handleTipoChange = (tipo: string) => {
    setForm({ ...form, tipo_identificacion_sri: tipo, identificacion: "" });
  };

  const handleSave = async () => {
    setError("");
    if (!valId.ok) { setError(valId.error || "Identificación inválida."); return; }
    if (!emailOk)  { setError("El email no es válido."); return; }
    if (!form.razon_social.trim()) { setError("El nombre es obligatorio."); return; }

    setSaving(true);
    try {
      await api.post("/api/v1/app/clientes", {
        ...form,
        razon_social: form.razon_social.trim().toUpperCase(),
        direccion:    form.direccion.trim().toUpperCase(),
        email:        form.email.trim().toLowerCase(),
      });
      await cargar();
      setShowModal(false);
      setForm(EMPTY_FORM);
    } catch (err: any) {
      setError(err?.response?.data?.detail ?? "Error al guardar.");
    } finally {
      setSaving(false);
    }
  };

  const abrirModal = () => {
    setShowModal(true);
    setForm(EMPTY_FORM);
    setError("");
  };

  return (
    <div className="p-4 md:p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold" style={{ color: "var(--kipu-text)" }}>Personas</h1>
          <p className="text-sm" style={{ color: "var(--kipu-subtle)" }}>{personas.length} registradas</p>
        </div>
        <button
          type="button"
          onClick={abrirModal}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-medium transition-colors"
          style={{ background: "var(--kipu-accent)" }}
          onMouseEnter={e => e.currentTarget.style.background = "var(--kipu-accent-h)"}
          onMouseLeave={e => e.currentTarget.style.background = "var(--kipu-accent)"}
        >
          <Plus size={15} />
          Nueva persona
        </button>
      </div>

      {/* Buscador */}
      <div className="relative mb-4">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--kipu-subtle)" }} />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar por nombre, RUC, cédula o email..."
          className="w-full pl-9 pr-8 py-2.5 rounded-lg text-sm transition-colors focus:outline-none"
          style={{
            background: "var(--kipu-surface)",
            border: "1px solid var(--kipu-border)",
            color: "var(--kipu-text)",
          }}
          onFocus={e => e.currentTarget.style.borderColor = "var(--kipu-accent)"}
          onBlur={e => e.currentTarget.style.borderColor = "var(--kipu-border)"}
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
            style={{ color: "var(--kipu-subtle)" }}
            onMouseEnter={e => e.currentTarget.style.color = "var(--kipu-text)"}
            onMouseLeave={e => e.currentTarget.style.color = "var(--kipu-subtle)"}
          >
            <X size={14} />
          </button>
        )}
      </div>

      {/* Lista */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div
            className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin"
            style={{ borderColor: "var(--kipu-accent)", borderTopColor: "transparent" }}
          />
        </div>
      ) : filtrados.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Users size={40} className="mb-3" style={{ color: "var(--kipu-subtle)" }} />
          <p className="text-sm" style={{ color: "var(--kipu-muted)" }}>
            {query ? "No hay personas que coincidan." : "Aún no tienes personas registradas."}
          </p>
          {!query && (
            <button
              type="button"
              onClick={abrirModal}
              className="mt-4 px-4 py-2 rounded-lg text-white text-sm font-medium transition-colors"
              style={{ background: "var(--kipu-accent)" }}
              onMouseEnter={e => e.currentTarget.style.background = "var(--kipu-accent-h)"}
              onMouseLeave={e => e.currentTarget.style.background = "var(--kipu-accent)"}
            >
              Agregar primera persona
            </button>
          )}
        </div>
      ) : (
        <div
          className="rounded-xl overflow-hidden"
          style={{
            background: "var(--kipu-surface)",
            border: "1px solid var(--kipu-border)",
          }}
        >
          <div>
            {filtrados.map((c, idx) => (
              <Link
                key={c.uid}
                href={`/personas/${c.uid}`}
                className="flex items-center gap-3 px-4 py-3 transition-colors"
                style={{
                  borderTop: idx > 0 ? "1px solid var(--kipu-border)" : "none",
                }}
                onMouseEnter={e => e.currentTarget.style.background = "color-mix(in srgb, var(--kipu-text) 4%, transparent)"}
                onMouseLeave={e => e.currentTarget.style.background = "transparent"}
              >
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
                  style={{ background: "color-mix(in srgb, var(--kipu-accent) 20%, transparent)" }}
                >
                  <span className="text-sm font-bold" style={{ color: "var(--kipu-accent)" }}>
                    {c.razon_social?.[0] ?? "?"}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate" style={{ color: "var(--kipu-text)" }}>{c.razon_social}</p>
                  <p className="text-xs" style={{ color: "var(--kipu-subtle)" }}>
                    {TIPO_ID.find(t => t.value === c.tipo_identificacion_sri)?.label ?? "ID"}: {c.identificacion}
                    {c.email && ` · ${c.email}`}
                  </p>
                </div>
                {c.telefono && (
                  <span className="text-xs hidden md:block" style={{ color: "var(--kipu-subtle)" }}>{c.telefono}</span>
                )}
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div
            className="rounded-xl w-full max-w-md"
            style={{
              background: "var(--kipu-surface)",
              border: "1px solid var(--kipu-border)",
            }}
          >
            {/* Header modal */}
            <div
              className="flex items-center justify-between px-5 py-4"
              style={{ borderBottom: "1px solid var(--kipu-border)" }}
            >
              <h2 className="text-sm font-semibold" style={{ color: "var(--kipu-text)" }}>Nueva persona</h2>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="transition-colors"
                style={{ color: "var(--kipu-subtle)" }}
                onMouseEnter={e => e.currentTarget.style.color = "var(--kipu-text)"}
                onMouseLeave={e => e.currentTarget.style.color = "var(--kipu-subtle)"}
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-5 space-y-3">
              {/* Tipo + Identificación */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs mb-1.5" style={{ color: "var(--kipu-subtle)" }}>Tipo ID</label>
                  <div className="relative">
                    <select
                      value={form.tipo_identificacion_sri}
                      onChange={(e) => handleTipoChange(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg text-sm appearance-none transition-colors focus:outline-none"
                      style={{
                        background: "var(--kipu-surface)",
                        border: "1px solid var(--kipu-border)",
                        color: "var(--kipu-text)",
                      }}
                      onFocus={e => e.currentTarget.style.borderColor = "var(--kipu-accent)"}
                      onBlur={e => e.currentTarget.style.borderColor = "var(--kipu-border)"}
                    >
                      {TIPO_ID.map(t => (
                        <option key={t.value} value={t.value}>{t.label}</option>
                      ))}
                    </select>
                    <ChevronDown
                      size={13}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none"
                      style={{ color: "var(--kipu-subtle)" }}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs mb-1.5" style={{ color: "var(--kipu-subtle)" }}>Identificación *</label>
                  <div className="relative">
                    <input
                      value={form.identificacion}
                      onChange={(e) => {
                        const val = ["04", "05"].includes(form.tipo_identificacion_sri)
                          ? e.target.value.replace(/\D/g, "")
                          : e.target.value.toUpperCase();
                        setForm({ ...form, identificacion: val });
                      }}
                      placeholder={
                        form.tipo_identificacion_sri === "04" ? "RUC 13 dígitos" :
                        form.tipo_identificacion_sri === "05" ? "Cédula 10 dígitos" :
                        "Número"
                      }
                      maxLength={
                        form.tipo_identificacion_sri === "04" ? 13 :
                        form.tipo_identificacion_sri === "05" ? 10 : 20
                      }
                      className="w-full px-3 py-2 rounded-lg text-sm pr-7 transition-colors focus:outline-none"
                      style={{
                        background: "var(--kipu-surface)",
                        border: valId.error
                          ? "1px solid color-mix(in srgb, var(--kipu-danger) 70%, transparent)"
                          : "1px solid var(--kipu-border)",
                        color: "var(--kipu-text)",
                      }}
                      onFocus={e => {
                        if (!valId.error) e.currentTarget.style.borderColor = "var(--kipu-accent)";
                      }}
                      onBlur={e => {
                        if (!valId.error) e.currentTarget.style.borderColor = "var(--kipu-border)";
                      }}
                    />
                    {valId.ok && form.identificacion && (
                      <Check size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2" style={{ color: "var(--kipu-success)" }} />
                    )}
                  </div>
                  {valId.error && (
                    <p className="flex items-center gap-1 mt-1 text-xs" style={{ color: "var(--kipu-danger)" }}>
                      <AlertCircle size={10} /> {valId.error}
                    </p>
                  )}
                </div>
              </div>

              {/* Razón social */}
              <div>
                <label className="block text-xs mb-1.5" style={{ color: "var(--kipu-subtle)" }}>Razón Social / Nombre *</label>
                <input
                  value={form.razon_social}
                  onChange={(e) => setForm({ ...form, razon_social: e.target.value.toUpperCase() })}
                  placeholder="APELLIDOS NOMBRES o EMPRESA S.A."
                  className="w-full px-3 py-2 rounded-lg text-sm transition-colors focus:outline-none"
                  style={{
                    background: "var(--kipu-surface)",
                    border: "1px solid var(--kipu-border)",
                    color: "var(--kipu-text)",
                  }}
                  onFocus={e => e.currentTarget.style.borderColor = "var(--kipu-accent)"}
                  onBlur={e => e.currentTarget.style.borderColor = "var(--kipu-border)"}
                />
              </div>

              {/* Email */}
              <div>
                <label className="block text-xs mb-1.5" style={{ color: "var(--kipu-subtle)" }}>Email</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value.toLowerCase() })}
                  placeholder="persona@email.com"
                  className="w-full px-3 py-2 rounded-lg text-sm transition-colors focus:outline-none"
                  style={{
                    background: "var(--kipu-surface)",
                    border: form.email && !emailOk
                      ? "1px solid color-mix(in srgb, var(--kipu-danger) 70%, transparent)"
                      : "1px solid var(--kipu-border)",
                    color: "var(--kipu-text)",
                  }}
                  onFocus={e => {
                    if (!(form.email && !emailOk)) e.currentTarget.style.borderColor = "var(--kipu-accent)";
                  }}
                  onBlur={e => {
                    if (!(form.email && !emailOk)) e.currentTarget.style.borderColor = "var(--kipu-border)";
                  }}
                />
                {form.email && !emailOk && (
                  <p className="flex items-center gap-1 mt-1 text-xs" style={{ color: "var(--kipu-danger)" }}>
                    <AlertCircle size={10} /> Email inválido.
                  </p>
                )}
              </div>

              {/* Teléfono + Dirección */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs mb-1.5" style={{ color: "var(--kipu-subtle)" }}>Teléfono</label>
                  <input
                    value={form.telefono}
                    onChange={(e) => setForm({ ...form, telefono: e.target.value.replace(/\D/g, "") })}
                    placeholder="0999999999"
                    maxLength={15}
                    className="w-full px-3 py-2 rounded-lg text-sm transition-colors focus:outline-none"
                    style={{
                      background: "var(--kipu-surface)",
                      border: "1px solid var(--kipu-border)",
                      color: "var(--kipu-text)",
                    }}
                    onFocus={e => e.currentTarget.style.borderColor = "var(--kipu-accent)"}
                    onBlur={e => e.currentTarget.style.borderColor = "var(--kipu-border)"}
                  />
                </div>
                <div>
                  <label className="block text-xs mb-1.5" style={{ color: "var(--kipu-subtle)" }}>Dirección</label>
                  <input
                    value={form.direccion}
                    onChange={(e) => setForm({ ...form, direccion: e.target.value.toUpperCase() })}
                    placeholder="AV. PRINCIPAL 123"
                    className="w-full px-3 py-2 rounded-lg text-sm transition-colors focus:outline-none"
                    style={{
                      background: "var(--kipu-surface)",
                      border: "1px solid var(--kipu-border)",
                      color: "var(--kipu-text)",
                    }}
                    onFocus={e => e.currentTarget.style.borderColor = "var(--kipu-accent)"}
                    onBlur={e => e.currentTarget.style.borderColor = "var(--kipu-border)"}
                  />
                </div>
              </div>

              {/* Error general */}
              {error && (
                <div
                  className="flex items-center gap-2 text-xs px-3 py-2 rounded-lg"
                  style={{
                    color: "var(--kipu-danger)",
                    background: "color-mix(in srgb, var(--kipu-danger) 10%, transparent)",
                  }}
                >
                  <AlertCircle size={12} />
                  {error}
                </div>
              )}

              {/* Acciones */}
              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
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
                  onClick={handleSave}
                  disabled={!puedeGuardar}
                  className="flex-1 py-2.5 rounded-lg text-white text-sm font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
                  style={{ background: "var(--kipu-accent)" }}
                  onMouseEnter={e => {
                    if (puedeGuardar) e.currentTarget.style.background = "var(--kipu-accent-h)";
                  }}
                  onMouseLeave={e => {
                    if (puedeGuardar) e.currentTarget.style.background = "var(--kipu-accent)";
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
            </div>
          </div>
        </div>
      )}
    </div>
  );
}