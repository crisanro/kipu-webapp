"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import api from "@/lib/api";
import { Zap, Loader2, Building2, CheckCircle2, UserPlus } from "lucide-react";

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
  if (provincia < 1 || provincia > 24) return "Provincia inválida.";
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
  const router       = useRouter();
  const searchParams = useSearchParams();

  // Modo vinculación — viene ?empresa=123 en la URL
  const empresaParam = searchParams.get("empresa");
  const modoVinculacion = !!empresaParam;

  const [paso,    setPaso]    = useState(0);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");
  const [success, setSuccess] = useState(false);

  // Para modo vinculación — nombre de la empresa
  const [nombreEmpresa, setNombreEmpresa] = useState<string | null>(null);
  const [loadingEmpresa, setLoadingEmpresa] = useState(false);

  const [form, setForm] = useState({
    ruc:                    "",
    razon_social:           "",
    nombre_comercial:       "",
    direccion_matriz:       "",
    obligado_contabilidad:  "NO",
    contribuyente_especial: "",
    full_name:              "",
  });

  // Si viene ?empresa= buscar el nombre para mostrarlo
  useEffect(() => {
    if (!modoVinculacion) return;
    setLoadingEmpresa(true);
    api.get(`/api/v1/app/emisor/info/${empresaParam}`)
      .then(res => setNombreEmpresa(res.data.razon_social))
      .catch(() => setNombreEmpresa(null))
      .finally(() => setLoadingEmpresa(false));
  }, [empresaParam]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setError("");
  };

  const validarPaso0 = () => {
    const errorRuc = validarRuc(form.ruc);
    if (errorRuc) { setError(errorRuc); return false; }
    if (!form.razon_social.trim()) { setError("La razón social es obligatoria."); return false; }
    if (!form.direccion_matriz.trim()) { setError("La dirección es obligatoria."); return false; }
    return true;
  };

  // Modo creación — flujo normal
  const handleSubmitCreacion = async () => {
    setError("");
    setLoading(true);
    try {
      await api.post("/api/v1/app/emisor/onboarding", form);
      setSuccess(true);
      setTimeout(() => router.replace("/"), 2000);
    } catch (err: any) {
      setError(err?.response?.data?.detail ?? "Error al registrar la empresa.");
    } finally {
      setLoading(false);
    }
  };

  // Modo vinculación — solo confirmar unirse
  const handleSubmitVinculacion = async () => {
    setError("");
    setLoading(true);
    try {
      await api.post("/api/v1/app/emisor/onboarding", {
        emisor_id: parseInt(empresaParam!),
        rol:       "emisor",
      });
      setSuccess(true);
      setTimeout(() => router.replace("/"), 2000);
    } catch (err: any) {
      setError(err?.response?.data?.detail ?? "Error al unirse a la empresa.");
    } finally {
      setLoading(false);
    }
  };

  // ── Pantalla de éxito ──────────────────────────────────────────────────────
  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-950">
        <div className="text-center">
          <CheckCircle2 size={48} className="text-emerald-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white">¡Todo listo!</h2>
          <p className="text-gray-500 mt-1 text-sm">Redirigiendo a tu panel...</p>
        </div>
      </div>
    );
  }

  // ── Modo vinculación ───────────────────────────────────────────────────────
  if (modoVinculacion) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 bg-gray-950">
        <div className="w-full max-w-sm">
          <div className="flex flex-col items-center mb-8">
            <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center mb-4">
              <UserPlus size={24} className="text-white" />
            </div>
            <h1 className="text-2xl font-bold text-white">Unirte a una empresa</h1>
            <p className="text-sm text-gray-500 mt-1">Tienes una invitación pendiente</p>
          </div>

          <div className="bg-gray-900 rounded-xl border border-gray-800 p-5 mb-6">
            <div className="flex items-center gap-3 mb-3">
              <Building2 size={18} className="text-indigo-400" />
              <span className="text-sm font-medium text-gray-400">Empresa</span>
            </div>
            {loadingEmpresa ? (
              <div className="flex items-center gap-2 text-gray-500 text-sm">
                <Loader2 size={14} className="animate-spin" /> Cargando...
              </div>
            ) : (
              <p className="text-white font-semibold text-lg">
                {nombreEmpresa ?? "Empresa no encontrada"}
              </p>
            )}
          </div>

          {error && (
            <p className="text-sm text-red-400 bg-red-400/10 px-3 py-2 rounded-lg mb-4">
              {error}
            </p>
          )}

          <button
            onClick={handleSubmitVinculacion}
            disabled={loading || loadingEmpresa || !nombreEmpresa}
            className="w-full py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium text-sm transition-colors flex items-center justify-center gap-2"
          >
            {loading ? (
              <><Loader2 size={16} className="animate-spin" /> Uniéndome...</>
            ) : (
              "Confirmar y entrar"
            )}
          </button>

          <p className="mt-4 text-center text-xs text-gray-600">
            ¿No esperabas esta invitación?{" "}
            <button onClick={() => router.replace("/login")} className="text-indigo-400 hover:text-indigo-300">
              Cancelar
            </button>
          </p>
        </div>
      </div>
    );
  }

  // ── Modo creación — flujo normal ───────────────────────────────────────────
  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-gray-950">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center mb-4">
            <Zap size={24} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">Configura tu empresa</h1>
          <p className="text-sm text-gray-500 mt-1">Solo toma 2 minutos</p>
        </div>

        {/* Steps */}
        <div className="flex items-center gap-2 mb-8">
          {PASOS.map((label, i) => (
            <div key={i} className="flex items-center gap-2 flex-1">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${i <= paso ? "bg-indigo-600 text-white" : "bg-gray-800 text-gray-500"}`}>
                {i + 1}
              </div>
              <span className={`text-xs ${i <= paso ? "text-white" : "text-gray-600"}`}>{label}</span>
              {i < PASOS.length - 1 && (
                <div className={`flex-1 h-px ${i < paso ? "bg-indigo-600" : "bg-gray-800"}`} />
              )}
            </div>
          ))}
        </div>

        {/* Paso 0 */}
        {paso === 0 && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-400 mb-1.5">RUC *</label>
                <input name="ruc" value={form.ruc} onChange={handleChange} placeholder="0000000000001" maxLength={13}
                  className="w-full px-4 py-2.5 rounded-lg bg-gray-900 border border-gray-800 text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500 text-sm" />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-400 mb-1.5">Razón Social *</label>
                <input name="razon_social" value={form.razon_social}
                  onChange={(e) => { setForm({ ...form, razon_social: limpiarTexto(e.target.value) }); setError(""); }}
                  placeholder="EMPRESA S.A."
                  className="w-full px-4 py-2.5 rounded-lg bg-gray-900 border border-gray-800 text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500 text-sm" />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-400 mb-1.5">Nombre Comercial</label>
                <input name="nombre_comercial" value={form.nombre_comercial}
                  onChange={(e) => { setForm({ ...form, nombre_comercial: limpiarTexto(e.target.value) }); setError(""); }}
                  placeholder="Mi Negocio (opcional)"
                  className="w-full px-4 py-2.5 rounded-lg bg-gray-900 border border-gray-800 text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500 text-sm" />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-400 mb-1.5">Dirección Matriz *</label>
                <input name="direccion_matriz" value={form.direccion_matriz}
                  onChange={(e) => { setForm({ ...form, direccion_matriz: limpiarTexto(e.target.value) }); setError(""); }}
                  placeholder="Av. Principal 123, Ciudad"
                  className="w-full px-4 py-2.5 rounded-lg bg-gray-900 border border-gray-800 text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1.5">Obligado Contabilidad</label>
                <select name="obligado_contabilidad" value={form.obligado_contabilidad} onChange={handleChange}
                  className="w-full px-4 py-2.5 rounded-lg bg-gray-900 border border-gray-800 text-white focus:outline-none focus:border-indigo-500 text-sm">
                  <option value="NO">NO</option>
                  <option value="SI">SI</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1.5">Contrib. Especial</label>
                <input name="contribuyente_especial" value={form.contribuyente_especial} onChange={handleChange}
                  placeholder="Opcional"
                  className="w-full px-4 py-2.5 rounded-lg bg-gray-900 border border-gray-800 text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500 text-sm" />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-400 mb-1.5">Tu nombre</label>
                <input name="full_name" value={form.full_name}
                  onChange={(e) => { setForm({ ...form, full_name: limpiarTexto(e.target.value) }); setError(""); }}
                  placeholder="Juan Pérez"
                  className="w-full px-4 py-2.5 rounded-lg bg-gray-900 border border-gray-800 text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500 text-sm" />
              </div>
            </div>
            {error && <p className="text-sm text-red-400 bg-red-400/10 px-3 py-2 rounded-lg">{error}</p>}
            <button onClick={() => { if (validarPaso0()) setPaso(1); }}
              className="w-full py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-sm transition-colors">
              Continuar
            </button>
          </div>
        )}

        {/* Paso 1 */}
        {paso === 1 && (
          <div className="space-y-4">
            <div className="bg-gray-900 rounded-xl border border-gray-800 p-4 space-y-3">
              <div className="flex items-center gap-2 mb-2">
                <Building2 size={16} className="text-indigo-400" />
                <span className="text-sm font-medium text-white">Resumen de tu empresa</span>
              </div>
              {[
                { label: "RUC",              value: form.ruc },
                { label: "Razón Social",     value: form.razon_social },
                { label: "Nombre Comercial", value: form.nombre_comercial || "—" },
                { label: "Dirección",        value: form.direccion_matriz },
                { label: "Oblig. Contabilidad", value: form.obligado_contabilidad },
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
                className="flex-1 py-2.5 rounded-lg border border-gray-700 text-gray-400 hover:text-white hover:border-gray-600 text-sm transition-colors">
                Atrás
              </button>
              <button onClick={handleSubmitCreacion} disabled={loading}
                className="flex-1 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-medium text-sm transition-colors flex items-center justify-center gap-2">
                {loading ? <><Loader2 size={16} className="animate-spin" /> Creando...</> : "Confirmar y entrar"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}