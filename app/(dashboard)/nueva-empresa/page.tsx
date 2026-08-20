// app/(dashboard)/nueva-empresa/page.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import { useAuthStore } from "@/store/auth.store";
import { ArrowLeft, Building2, CheckCircle2, Loader2 } from "lucide-react";

const limpiarTexto = (texto: string) =>
  texto.toUpperCase().normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Z0-9\s\.\,\-\/\#\&]/g, "")
    .replace(/\s+/g, " ").trimStart();

const validarRuc = (ruc: string): string | null => {
  if (ruc.length !== 13) return "El RUC debe tener 13 dígitos.";
  if (!ruc.endsWith("001")) return "El RUC debe terminar en 001.";
  if (!/^\d+$/.test(ruc)) return "El RUC solo debe contener números.";
  const provincia = parseInt(ruc.substring(0, 2));
  if (provincia < 1 || provincia > 24) return "Provincia inválida.";
  return null;
};

const PASOS = ["Datos", "Confirmar"];

export default function NuevaEmpresaPage() {
  const router     = useRouter();
  const { addEmpresa, empresas } = useAuthStore();

  const [paso,    setPaso]    = useState(0);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");
  const [success, setSuccess] = useState(false);

  const [form, setForm] = useState({
    ruc:                    "",
    razon_social:           "",
    nombre_comercial:       "",
    direccion_matriz:       "",
    obligado_contabilidad:  "NO",
    contribuyente_especial: "",
  });

  // Verificar si ya tiene una empresa en pruebas
  const tienePruebas = empresas.some(e => e.ambiente === 1);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setError("");
  };

  const validarPaso0 = () => {
    const errorRuc = validarRuc(form.ruc);
    if (errorRuc)                     { setError(errorRuc); return false; }
    if (!form.razon_social.trim())    { setError("La razón social es obligatoria."); return false; }
    if (!form.direccion_matriz.trim()) { setError("La dirección es obligatoria."); return false; }
    return true;
  };

  const handleSubmit = async () => {
    setError("");
    setLoading(true);
    try {
      const res = await api.post("/api/v1/app/emisor/onboarding", form);
      // Agregar la nueva empresa al store con las propiedades requeridas por el tipo Empresa
      const nuevaEmpresa = {
        id:                 res.data.emisor_id,
        ruc:                form.ruc,
        razon_social:       form.razon_social.toUpperCase(),
        nombre_comercial:   form.nombre_comercial.toUpperCase() || "",
        ambiente:           1,
        rol:                "admin",
        balance_emision:    10,
        balance_recepcion:  0,
        firma_ok:           false,
        tipo_emisor:        "NAT", // Ajusta según tu lógica (ej: "NAT" o "SOC")
        suscripcion_activa: true,
        suscripcion: {
          plan:     "gratis",
          estado:   "activo",
          activa: true,
        },
        balance_api:        0,
      };
      addEmpresa(nuevaEmpresa);
      setSuccess(true);
      setTimeout(() => router.replace("/dashboard"), 2000);
    } catch (err: any) {
      setError(err?.response?.data?.detail ?? "Error al registrar la empresa.");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <CheckCircle2 size={48} className="text-emerald-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white">¡Empresa creada!</h2>
          <p className="text-gray-500 mt-1 text-sm">Redirigiendo al dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-md mx-auto space-y-6">

      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.back()}
          className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
        >
          <ArrowLeft size={18} />
        </button>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-indigo-600/20 flex items-center justify-center">
            <Building2 size={16} className="text-indigo-400" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white">Nueva empresa</h1>
            <p className="text-xs text-gray-500">Se creará en modo pruebas</p>
          </div>
        </div>
      </div>

      {/* Bloqueo si ya tiene empresa en pruebas */}
      {tienePruebas && (
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4">
          <p className="text-sm text-amber-300 font-medium">Límite alcanzado</p>
          <p className="text-xs text-amber-400 mt-1">
            Ya tienes una empresa en modo pruebas. Para crear otra, primero activa
            la empresa existente a producción.
          </p>
        </div>
      )}

      {!tienePruebas && (
        <>
          {/* Steps */}
          <div className="flex items-center gap-2">
            {PASOS.map((label, i) => (
              <div key={i} className="flex items-center gap-2 flex-1">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                  i <= paso ? "bg-indigo-600 text-white" : "bg-gray-800 text-gray-500"
                }`}>
                  {i + 1}
                </div>
                <span className={`text-xs ${i <= paso ? "text-white" : "text-gray-600"}`}>
                  {label}
                </span>
                {i < PASOS.length - 1 && (
                  <div className={`flex-1 h-px ${i < paso ? "bg-indigo-600" : "bg-gray-800"}`} />
                )}
              </div>
            ))}
          </div>

          {/* Paso 0 — Datos */}
          {paso === 0 && (
            <div className="space-y-4">
              {[
                { name: "ruc", label: "RUC *", placeholder: "0000000000001", maxLength: 13, tipo: "text" },
              ].map(({ name, label, placeholder, maxLength }) => (
                <div key={name}>
                  <label className="block text-sm font-medium text-gray-400 mb-1.5">{label}</label>
                  <input
                    name={name} value={(form as any)[name]}
                    onChange={handleChange}
                    placeholder={placeholder} maxLength={maxLength}
                    className="w-full px-4 py-2.5 rounded-lg bg-gray-900 border border-gray-800 text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500 text-sm"
                  />
                </div>
              ))}
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1.5">Razón Social *</label>
                <input
                  name="razon_social" value={form.razon_social}
                  onChange={e => { setForm({ ...form, razon_social: limpiarTexto(e.target.value) }); setError(""); }}
                  placeholder="EMPRESA S.A."
                  className="w-full px-4 py-2.5 rounded-lg bg-gray-900 border border-gray-800 text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1.5">Nombre Comercial</label>
                <input
                  name="nombre_comercial" value={form.nombre_comercial}
                  onChange={e => { setForm({ ...form, nombre_comercial: limpiarTexto(e.target.value) }); setError(""); }}
                  placeholder="Mi Negocio (opcional)"
                  className="w-full px-4 py-2.5 rounded-lg bg-gray-900 border border-gray-800 text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1.5">Dirección Matriz *</label>
                <input
                  name="direccion_matriz" value={form.direccion_matriz}
                  onChange={e => { setForm({ ...form, direccion_matriz: limpiarTexto(e.target.value) }); setError(""); }}
                  placeholder="Av. Principal 123, Ciudad"
                  className="w-full px-4 py-2.5 rounded-lg bg-gray-900 border border-gray-800 text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500 text-sm"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1.5">Obligado Contabilidad</label>
                  <select name="obligado_contabilidad" value={form.obligado_contabilidad}
                    onChange={handleChange}
                    className="w-full px-3 py-2.5 rounded-lg bg-gray-900 border border-gray-800 text-white focus:outline-none focus:border-indigo-500 text-sm"
                  >
                    <option value="NO">NO</option>
                    <option value="SI">SI</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1.5">Contrib. Especial</label>
                  <input name="contribuyente_especial" value={form.contribuyente_especial}
                    onChange={handleChange} placeholder="Opcional"
                    className="w-full px-3 py-2.5 rounded-lg bg-gray-900 border border-gray-800 text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500 text-sm"
                  />
                </div>
              </div>
              {error && <p className="text-sm text-red-400 bg-red-400/10 px-3 py-2 rounded-lg">{error}</p>}
              <button onClick={() => { if (validarPaso0()) setPaso(1); }}
                className="w-full py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-sm transition-colors">
                Continuar
              </button>
            </div>
          )}

          {/* Paso 1 — Confirmar */}
          {paso === 1 && (
            <div className="space-y-4">
              <div className="bg-gray-900 rounded-xl border border-gray-800 p-4 space-y-3">
                <div className="flex items-center gap-2 mb-2">
                  <Building2 size={15} className="text-indigo-400" />
                  <span className="text-sm font-medium text-white">Resumen</span>
                </div>
                {[
                  { label: "RUC",            value: form.ruc },
                  { label: "Razón Social",   value: form.razon_social },
                  { label: "Nombre Comerc.", value: form.nombre_comercial || "—" },
                  { label: "Dirección",      value: form.direccion_matriz },
                  { label: "Oblig. Cont.",   value: form.obligado_contabilidad },
                ].map(({ label, value }) => (
                  <div key={label} className="flex justify-between text-sm">
                    <span className="text-gray-500">{label}</span>
                    <span className="text-white text-right max-w-[60%] truncate">{value}</span>
                  </div>
                ))}
              </div>

              <div className="bg-indigo-600/10 border border-indigo-500/20 rounded-lg px-4 py-3">
                <p className="text-xs text-indigo-300">
                  🎁 Recibirás <strong>10 créditos gratis</strong> para empezar a facturar.
                </p>
              </div>

              {error && <p className="text-sm text-red-400 bg-red-400/10 px-3 py-2 rounded-lg">{error}</p>}

              <div className="flex gap-3">
                <button onClick={() => setPaso(0)}
                  className="flex-1 py-2.5 rounded-lg border border-gray-700 text-gray-400 hover:text-white text-sm transition-colors">
                  Atrás
                </button>
                <button onClick={handleSubmit} disabled={loading}
                  className="flex-1 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-medium text-sm transition-colors flex items-center justify-center gap-2">
                  {loading
                    ? <><Loader2 size={16} className="animate-spin" /> Creando...</>
                    : "Confirmar"
                  }
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}