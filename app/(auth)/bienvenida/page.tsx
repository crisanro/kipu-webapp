// app/bienvenida/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { auth } from "@/lib/firebase";
import { signOut } from "firebase/auth";
import api from "@/lib/api";
import { useAuthStore } from "@/store/auth.store";
import { Zap, Building2, Plus, Loader2, CheckCircle2, ArrowRight,MessageCircle, LogOut } from "lucide-react";

export default function BienvenidaPage() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const empresaParam = searchParams.get("empresa");
  const { setEmpresa, setEmpresas, setUser, logout } = useAuthStore();

  const [loading,        setLoading]        = useState(false);
  const [loadingEmpresa, setLoadingEmpresa] = useState(false);
  const [empresa,        setEmpresaData]    = useState<{ razon_social: string; nombre_comercial: string } | null>(null);
  const [error,          setError]          = useState("");
  const [unido,          setUnido]          = useState(false);
  const [confirmDelete,  setConfirmDelete]  = useState(false);

  // Si viene con ?empresa= cargar el nombre
  useEffect(() => {
    if (!empresaParam) return;
    setLoadingEmpresa(true);
    api.get(`/api/v1/app/emisor/info/${empresaParam}`)
      .then(res => setEmpresaData(res.data))
      .catch(() => setError("La invitación no es válida o ya expiró."))
      .finally(() => setLoadingEmpresa(false));
  }, [empresaParam]);

  const handleUnirse = async () => {
    setLoading(true);
    setError("");
    try {
      await api.post("/api/v1/app/emisor/onboarding", {
        emisor_id: parseInt(empresaParam!),
        rol:       "emisor",
      });
      setUnido(true);
      // Recargar empresas y redirigir
      setTimeout(async () => {
        try {
          const token = await auth.currentUser?.getIdToken(true);
          const res   = await api.get("/api/v1/app/usuarios/empresas", {
            headers: { Authorization: `Bearer ${token}` },
          });
          const data = res.data.data ?? [];
          if (data.length > 0) {
            setEmpresas(data);
            const e = data[0];
            setEmpresa({
              id:                 e.id,
              ruc:                e.ruc,
              razon_social:       e.razon_social,
              nombre_comercial:   e.nombre_comercial,
              ambiente:           e.ambiente,
              tipo_emisor:        e.tipo_emisor,
              rol:                e.rol,
              permisos:           e.permisos ?? {},
              firma_ok:           e.firma_ok,
              suscripcion_activa: e.suscripcion_activa,
              suscripcion:        e.suscripcion,
              balance_api:        e.balance_api,
            });
          }
        } catch {}
        router.replace("/dashboard");
      }, 1500);
    } catch (err: any) {
      setError(err?.response?.data?.detail ?? "Error al unirte a la empresa.");
    } finally {
      setLoading(false);
    }
  };

  const handleCerrarSesion = async () => {
    await signOut(auth);
    logout();
    router.replace("/login");
  };

  const handleEliminarCuenta = async () => {
    try {
      await auth.currentUser?.delete();
      logout();
      router.replace("/register");
    } catch {
      alert("Por seguridad, cierra sesión y vuelve a iniciar para eliminar tu cuenta.");
    }
  };

  // ── Éxito ────────────────────────────────────────────────────────────────
  if (unido) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-950">
        <div className="text-center">
          <CheckCircle2 size={48} className="text-emerald-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white">¡Te uniste exitosamente!</h2>
          <p className="text-gray-500 mt-1 text-sm">Redirigiendo al panel...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-gray-950">
      <div className="w-full max-w-sm">

        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center mb-4">
            <Zap size={24} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">¡Bienvenido a Kipu!</h1>
          <p className="text-sm text-gray-500 mt-1">¿Cómo quieres empezar?</p>
        </div>

        <div className="space-y-3">

          {/* Opción 1 — Unirse a empresa invitada */}
          {empresaParam && (
            <div className="bg-gray-900 border border-indigo-500/30 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <Building2 size={16} className="text-indigo-400" />
                <span className="text-sm font-medium text-indigo-400">Tienes una invitación</span>
              </div>

              {loadingEmpresa ? (
                <div className="flex items-center gap-2 text-gray-500 text-sm">
                  <Loader2 size={14} className="animate-spin" />
                  Cargando...
                </div>
              ) : empresa ? (
                <>
                  <p className="text-white font-semibold mb-1">
                    {empresa.nombre_comercial || empresa.razon_social}
                  </p>
                  <p className="text-xs text-gray-500 mb-4">
                    Fuiste invitado a unirte a esta empresa.
                  </p>
                  {error && (
                    <p className="text-xs text-red-400 bg-red-400/10 px-3 py-2 rounded-lg mb-3">
                      {error}
                    </p>
                  )}
                  <button
                    onClick={handleUnirse}
                    disabled={loading}
                    className="w-full py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-medium text-sm transition-colors flex items-center justify-center gap-2"
                  >
                    {loading
                      ? <><Loader2 size={14} className="animate-spin" /> Uniéndome...</>
                      : <><CheckCircle2 size={14} /> Unirme a {empresa.nombre_comercial || empresa.razon_social}</>
                    }
                  </button>
                </>
              ) : (
                <p className="text-xs text-red-400">{error || "Empresa no encontrada."}</p>
              )}
            </div>
          )}

          {/* Separador */}
          {empresaParam && (
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-gray-800" />
              <span className="text-xs text-gray-600">o</span>
              <div className="flex-1 h-px bg-gray-800" />
            </div>
          )}

          {/* Opción 2 — Crear empresa propia */}
          <button
            onClick={() => router.push("/onboarding")}
            className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl bg-gray-900 border border-gray-800 hover:border-gray-700 text-left transition-colors group"
          >
            <div className="w-9 h-9 rounded-lg bg-gray-800 group-hover:bg-gray-700 flex items-center justify-center shrink-0 transition-colors">
              <Plus size={16} className="text-gray-400" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-white">Crear mi empresa</p>
              <p className="text-xs text-gray-500">Registra tu RUC y empieza a facturar</p>
            </div>
            <ArrowRight size={14} className="text-gray-600 group-hover:text-gray-400 transition-colors" />
          </button>

        </div>

        {/* Botones de acción */}
        <div className="mt-8 space-y-3">
          {/* Soporte */}
          <a
            href={`https://wa.me/593960585581?text=${encodeURIComponent("Hola, necesito soporte con Kipu.")}`}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg border border-green-500/30 text-green-400 hover:bg-green-500/10 text-sm font-medium transition-colors"
          >
            <MessageCircle size={15} />
            Contactar soporte
          </a>

          {/* Cerrar sesión */}
          <button
            onClick={handleCerrarSesion}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg border border-gray-700 text-gray-400 hover:text-white hover:border-gray-600 text-sm font-medium transition-colors"
          >
            <LogOut size={15} />
            Cerrar sesión
          </button>

          {/* Eliminar cuenta — discreto */}
          <div className="flex justify-center pt-1">
            {!confirmDelete ? (
              <button
                onClick={() => setConfirmDelete(true)}
                className="text-xs text-gray-700 hover:text-red-500 transition-colors"
              >
                Eliminar mi cuenta
              </button>
            ) : (
              <div className="text-center space-y-2">
                <p className="text-xs text-red-400">¿Estás seguro? Esta acción no se puede deshacer.</p>
                <div className="flex gap-3 justify-center">
                  <button
                    onClick={() => setConfirmDelete(false)}
                    className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleEliminarCuenta}
                    className="text-xs text-red-500 hover:text-red-400 transition-colors font-medium"
                  >
                    Sí, eliminar
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}