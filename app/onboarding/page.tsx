"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import { Zap, Building2, CheckCircle2, Search, Loader2 } from "lucide-react";
import { lookupIdentificacion } from "@/lib/identificacion-lookup";

const PASOS = ["Empresa", "Confirmar"];

const limpiarTexto = (texto: string): string => {
  return texto
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Z0-9\s\.\,\-\/\#\&]/g, "")
    .replace(/\s+/g, " ")
    .trimStart();
};

const validarRuc = (ruc: string): string | null => {
  if (ruc.length !== 13) return "El RUC debe tener 13 dígitos.";
  if (!ruc.endsWith("001")) return "El RUC debe terminar en 001.";
  if (!/^\d+$/.test(ruc)) return "El RUC solo debe contener números.";
  const provincia = parseInt(ruc.substring(0, 2));
  if ((provincia < 1 || provincia > 24) && provincia !== 30) return "Provincia inválida.";
  const tercero = parseInt(ruc[2]);
  if (tercero < 6) {
    const coef = [2, 1, 2, 1, 2, 1, 2, 1, 2];
    const suma = ruc.slice(0, 9).split("").reduce((acc, d, i) => {
      const p = parseInt(d) * coef[i];
      return acc + (p >= 10 ? p - 9 : p);
    }, 0);
    const verificador = suma % 10 === 0 ? 0 : 10 - (suma % 10);
    if (verificador !== parseInt(ruc[9])) return "El número de cédula del RUC es inválido.";
  }
  return null;
};

export default function OnboardingPage() {
  const router = useRouter();

  const [paso,    setPaso]    = useState(0);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");
  const [success, setSuccess] = useState(false);

  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupMsg,     setLookupMsg]     = useState("");

  const [form, setForm] = useState({
    ruc:                    "",
    razon_social:           "",
    nombre_comercial:       "",
    direccion_matriz:       "",
    obligado_contabilidad:  "NO",
    contribuyente_especial: "",
    full_name:              "",
  });

  const rucValido = form.ruc.length === 13 && /^\d+$/.test(form.ruc) && form.ruc.endsWith("001");

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setError("");
  };

  // ── Lookup RUC ─────────────────────────────────────────────────────────────
  const handleLookup = async () => {
    if (!rucValido || lookupLoading) return;
    setLookupLoading(true);
    setLookupMsg("");

    const result = await lookupIdentificacion(form.ruc);

    if (result.error) {
      setLookupMsg(result.error);
    } else if (result.found && result.nombre) {
      setForm((prev) => ({ ...prev, razon_social: result.nombre! }));
      setLookupMsg("✓ Encontrado");
    } else {
      setLookupMsg("No encontrado — ingresa la razón social manualmente");
    }

    setLookupLoading(false);
  };

  const validarPaso0 = () => {
    const errorRuc = validarRuc(form.ruc);
    if (errorRuc) { setError(errorRuc); return false; }
    if (!form.razon_social.trim()) { setError("La razón social es obligatoria."); return false; }
    if (!form.direccion_matriz.trim()) { setError("La dirección es obligatoria."); return false; }
    if (form.direccion_matriz.trim().length < 5) { setError("La dirección debe tener al menos 5 caracteres."); return false; }
    return true;
  };

  const handleSubmit = async () => {
    setError("");
    setLoading(true);
    try {
      await api.post("/api/v1/app/emisor/onboarding", form);
      setSuccess(true);
      setTimeout(() => router.replace("/"), 2000);
    } catch (err: any) {
      const detail = err?.response?.data?.detail;
      if (typeof detail === "string") {
        setError(detail);
      } else if (Array.isArray(detail)) {
        setError(detail.map((d: any) => d.msg || d.mensaje || "").filter(Boolean).join(". "));
      } else if (detail && typeof detail === "object") {
        setError(detail.mensaje || detail.msg || "Error al registrar la empresa.");
      } else {
        setError("Error al registrar la empresa.");
      }
    } finally {
      setLoading(false);
    }
  };

  // ── Pantalla de éxito ──────────────────────────────────────────────────────
  if (success) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: "var(--kipu-bg)" }}
      >
        <div className="text-center">
          <CheckCircle2 size={48} className="mx-auto mb-4" style={{ color: "var(--kipu-success)" }} />
          <h2 className="text-xl font-bold" style={{ color: "var(--kipu-text)" }}>¡Todo listo!</h2>
          <p className="mt-1 text-sm" style={{ color: "var(--kipu-subtle)" }}>Redirigiendo a tu panel...</p>
        </div>
      </div>
    );
  }

  // ── Formulario ─────────────────────────────────────────────────────────────
  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{ background: "var(--kipu-bg)" }}
    >
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-8">
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center mb-4"
            style={{ background: "var(--kipu-accent)" }}
          >
            <Zap size={24} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold" style={{ color: "var(--kipu-text)" }}>Configura tu empresa</h1>
          <p className="text-sm mt-1" style={{ color: "var(--kipu-subtle)" }}>Solo toma 2 minutos</p>
        </div>

        {/* Steps */}
        <div className="flex items-center gap-2 mb-8">
          {PASOS.map((label, i) => (
            <div key={i} className="flex items-center gap-2 flex-1">
              <div
                className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-colors shrink-0"
                style={{
                  background: i <= paso ? "var(--kipu-accent)" : "color-mix(in srgb, var(--kipu-text) 10%, transparent)",
                  color: i <= paso ? "#FFFFFF" : "var(--kipu-subtle)",
                }}
              >
                {i + 1}
              </div>
              <span
                className="text-xs font-medium"
                style={{ color: i <= paso ? "var(--kipu-text)" : "var(--kipu-subtle)" }}
              >
                {label}
              </span>
              {i < PASOS.length - 1 && (
                <div
                  className="flex-1 h-px transition-colors"
                  style={{
                    background: i < paso ? "var(--kipu-accent)" : "var(--kipu-border)",
                  }}
                />
              )}
            </div>
          ))}
        </div>

        {/* Paso 0 — Datos */}
        {paso === 0 && (
          <div className="space-y-4">
            {/* RUC + botón buscar */}
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--kipu-subtle)" }}>RUC *</label>
              <div className="flex gap-2">
                <input
                  name="ruc"
                  value={form.ruc}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, "");
                    setForm({ ...form, ruc: val });
                    setError("");
                    setLookupMsg("");
                  }}
                  placeholder="0000000000001"
                  maxLength={13}
                  className="flex-1 px-4 py-2.5 rounded-lg text-sm focus:outline-none transition-colors"
                  style={{
                    background: "var(--kipu-surface)",
                    border: "1px solid var(--kipu-border)",
                    color: "var(--kipu-text)",
                  }}
                  onFocus={e => e.currentTarget.style.borderColor = "var(--kipu-accent)"}
                  onBlur={e => e.currentTarget.style.borderColor = "var(--kipu-border)"}
                />
                <button
                  type="button"
                  onClick={handleLookup}
                  disabled={!rucValido || lookupLoading}
                  className="px-3 rounded-lg transition-colors shrink-0 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
                  style={{
                    border: "1px solid var(--kipu-border)",
                    color: "var(--kipu-subtle)",
                  }}
                  onMouseEnter={e => {
                    if (rucValido && !lookupLoading) {
                      e.currentTarget.style.color = "var(--kipu-accent)";
                      e.currentTarget.style.borderColor = "var(--kipu-accent)";
                    }
                  }}
                  onMouseLeave={e => {
                    if (rucValido && !lookupLoading) {
                      e.currentTarget.style.color = "var(--kipu-subtle)";
                      e.currentTarget.style.borderColor = "var(--kipu-border)";
                    }
                  }}
                  title="Buscar razón social por RUC"
                >
                  {lookupLoading
                    ? <Loader2 size={15} className="animate-spin" />
                    : <Search size={15} />
                  }
                  <span className="text-xs hidden sm:inline">Buscar</span>
                </button>
              </div>
              {lookupMsg && (
                <p
                  className="text-xs mt-1.5"
                  style={{
                    color: lookupMsg.startsWith("✓")
                      ? "var(--kipu-success)"
                      : lookupMsg.includes("Demasiadas")
                        ? "var(--kipu-danger)"
                        : "var(--kipu-subtle)",
                  }}
                >
                  {lookupMsg}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--kipu-subtle)" }}>Razón Social *</label>
              <input
                name="razon_social"
                value={form.razon_social}
                onChange={(e) => { setForm({ ...form, razon_social: limpiarTexto(e.target.value) }); setError(""); }}
                placeholder="EMPRESA S.A."
                className="w-full px-4 py-2.5 rounded-lg text-sm focus:outline-none transition-colors"
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
              <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--kipu-subtle)" }}>Nombre Comercial</label>
              <input
                name="nombre_comercial"
                value={form.nombre_comercial}
                onChange={(e) => { setForm({ ...form, nombre_comercial: limpiarTexto(e.target.value) }); setError(""); }}
                placeholder="Mi Negocio (opcional)"
                className="w-full px-4 py-2.5 rounded-lg text-sm focus:outline-none transition-colors"
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
              <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--kipu-subtle)" }}>Dirección Matriz *</label>
              <input
                name="direccion_matriz"
                value={form.direccion_matriz}
                onChange={(e) => { setForm({ ...form, direccion_matriz: limpiarTexto(e.target.value) }); setError(""); }}
                placeholder="Av. Principal 123, Ciudad"
                className="w-full px-4 py-2.5 rounded-lg text-sm focus:outline-none transition-colors"
                style={{
                  background: "var(--kipu-surface)",
                  border: "1px solid var(--kipu-border)",
                  color: "var(--kipu-text)",
                }}
                onFocus={e => e.currentTarget.style.borderColor = "var(--kipu-accent)"}
                onBlur={e => e.currentTarget.style.borderColor = "var(--kipu-border)"}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--kipu-subtle)" }}>Obligado Contabilidad</label>
                <select
                  name="obligado_contabilidad"
                  value={form.obligado_contabilidad}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 rounded-lg text-sm focus:outline-none transition-colors"
                  style={{
                    background: "var(--kipu-surface)",
                    border: "1px solid var(--kipu-border)",
                    color: "var(--kipu-text)",
                  }}
                >
                  <option value="NO">NO</option>
                  <option value="SI">SI</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--kipu-subtle)" }}>Contrib. Especial</label>
                <input
                  name="contribuyente_especial"
                  value={form.contribuyente_especial}
                  onChange={handleChange}
                  placeholder="Opcional"
                  className="w-full px-4 py-2.5 rounded-lg text-sm focus:outline-none transition-colors"
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

            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--kipu-subtle)" }}>Tu nombre</label>
              <input
                name="full_name"
                value={form.full_name}
                onChange={(e) => { setForm({ ...form, full_name: limpiarTexto(e.target.value) }); setError(""); }}
                placeholder="JUAN PEREZ"
                className="w-full px-4 py-2.5 rounded-lg text-sm focus:outline-none transition-colors"
                style={{
                  background: "var(--kipu-surface)",
                  border: "1px solid var(--kipu-border)",
                  color: "var(--kipu-text)",
                }}
                onFocus={e => e.currentTarget.style.borderColor = "var(--kipu-accent)"}
                onBlur={e => e.currentTarget.style.borderColor = "var(--kipu-border)"}
              />
            </div>

            {error && (
              <div
                className="rounded-lg px-3 py-2.5 space-y-2"
                style={{
                  background: "color-mix(in srgb, var(--kipu-danger) 10%, transparent)",
                }}
              >
                <p className="text-sm font-medium" style={{ color: "var(--kipu-danger)" }}>
                  {error}
                </p>
                {error.includes("REGISTRADO") && (
                  <a
                    href={`https://wa.me/593960585581?text=${encodeURIComponent(`Hola, intento registrar el RUC ${form.ruc} en Kipu pero dice que ya está registrado. ¿Me pueden ayudar?`)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs font-medium transition-colors"
                    style={{ color: "var(--kipu-accent)" }}
                    onMouseEnter={e => e.currentTarget.style.opacity = "0.8"}
                    onMouseLeave={e => e.currentTarget.style.opacity = "1"}
                  >
                    💬 Contactar soporte
                  </a>
                )}
              </div>
            )}

            <button
              type="button"
              onClick={() => { if (validarPaso0()) setPaso(1); }}
              className="w-full py-2.5 rounded-lg text-white font-medium text-sm transition-colors"
              style={{ background: "var(--kipu-accent)" }}
              onMouseEnter={e => e.currentTarget.style.background = "var(--kipu-accent-h)"}
              onMouseLeave={e => e.currentTarget.style.background = "var(--kipu-accent)"}
            >
              Continuar
            </button>
          </div>
        )}

        {/* Paso 1 — Confirmar */}
        {paso === 1 && (
          <div className="space-y-4">
            <div
              className="rounded-xl p-4 space-y-3"
              style={{
                background: "var(--kipu-surface)",
                border: "1px solid var(--kipu-border)",
              }}
            >
              <div className="flex items-center gap-2 mb-2">
                <Building2 size={16} style={{ color: "var(--kipu-accent)" }} />
                <span className="text-sm font-medium" style={{ color: "var(--kipu-text)" }}>Resumen de tu empresa</span>
              </div>
              {[
                { label: "RUC",                  value: form.ruc },
                { label: "Razón Social",         value: form.razon_social },
                { label: "Nombre Comercial",     value: form.nombre_comercial || "—" },
                { label: "Dirección",            value: form.direccion_matriz },
                { label: "Oblig. Contabilidad",  value: form.obligado_contabilidad },
              ].map(({ label, value }) => (
                <div key={label} className="flex justify-between text-sm">
                  <span style={{ color: "var(--kipu-subtle)" }}>{label}</span>
                  <span className="text-right max-w-[60%] truncate font-medium" style={{ color: "var(--kipu-text)" }}>{value}</span>
                </div>
              ))}
            </div>

            <div
              className="rounded-lg px-4 py-3"
              style={{
                background: "color-mix(in srgb, var(--kipu-accent) 10%, transparent)",
                border: "1px solid color-mix(in srgb, var(--kipu-accent) 20%, transparent)",
              }}
            >
              <p className="text-xs" style={{ color: "var(--kipu-accent)" }}>
                🎁 Recibirás <strong>10 créditos gratis</strong> para empezar a facturar.
              </p>
            </div>

            {error && (
              <div
                className="rounded-lg px-3 py-2.5 space-y-2"
                style={{
                  background: "color-mix(in srgb, var(--kipu-danger) 10%, transparent)",
                }}
              >
                <p className="text-sm font-medium" style={{ color: "var(--kipu-danger)" }}>
                  {error}
                </p>
                {error.includes("REGISTRADO") && (
                  <a
                    href={`https://wa.me/593960585581?text=${encodeURIComponent(`Hola, intento registrar el RUC ${form.ruc} en Kipu pero dice que ya está registrado. ¿Me pueden ayudar?`)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs font-medium transition-colors"
                    style={{ color: "var(--kipu-accent)" }}
                    onMouseEnter={e => e.currentTarget.style.opacity = "0.8"}
                    onMouseLeave={e => e.currentTarget.style.opacity = "1"}
                  >
                    💬 Contactar soporte
                  </a>
                )}
              </div>
            )}

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setPaso(0)}
                className="flex-1 py-2.5 rounded-lg text-sm transition-colors font-medium"
                style={{
                  border: "1px solid var(--kipu-border)",
                  color: "var(--kipu-subtle)",
                  background: "transparent",
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.color = "var(--kipu-text)";
                  e.currentTarget.style.borderColor = "color-mix(in srgb, var(--kipu-text) 30%, transparent)";
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.color = "var(--kipu-subtle)";
                  e.currentTarget.style.borderColor = "var(--kipu-border)";
                }}
              >
                Atrás
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={loading}
                className="flex-1 py-2.5 rounded-lg text-white font-medium text-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                style={{ background: "var(--kipu-accent)" }}
                onMouseEnter={e => {
                  if (!loading) e.currentTarget.style.background = "var(--kipu-accent-h)";
                }}
                onMouseLeave={e => {
                  if (!loading) e.currentTarget.style.background = "var(--kipu-accent)";
                }}
              >
                {loading ? (
                  <>
                    <div
                      className="w-4 h-4 border-2 border-t-transparent rounded-full animate-spin"
                      style={{ borderColor: "#FFFFFF", borderTopColor: "transparent" }}
                    /> Creando...
                  </>
                ) : (
                  "Confirmar y entrar"
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}