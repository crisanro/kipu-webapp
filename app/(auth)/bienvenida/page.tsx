// app/bienvenida/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { auth } from "@/lib/firebase";
import { signOut } from "firebase/auth";
import Image from "next/image";
import api from "@/lib/api";
import { useAuthStore } from "@/store/auth.store";
import { Building2, Plus, Loader2, CheckCircle2, ArrowRight, MessageCircle, LogOut } from "lucide-react";
import { useTheme } from "next-themes";

export default function BienvenidaPage() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const empresaParam = searchParams.get("empresa");
  const { setEmpresa, setEmpresas, setUser, logout } = useAuthStore();
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  const [loading,        setLoading]        = useState(false);
  const [loadingEmpresa, setLoadingEmpresa] = useState(false);
  const [empresa,        setEmpresaData]    = useState<{ razon_social: string; nombre_comercial: string } | null>(null);
  const [error,          setError]          = useState("");
  const [unido,          setUnido]          = useState(false);
  const [confirmDelete,  setConfirmDelete]  = useState(false);

  useEffect(() => setMounted(true), []);

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
              id:                    e.id,
              ruc:                   e.ruc,
              razon_social:          e.razon_social,
              nombre_comercial:      e.nombre_comercial,
              ambiente:              e.ambiente,
              tipo_emisor:           e.tipo_emisor,
              rol:                   e.rol,
              permisos:              e.permisos ?? {},
              firma_ok:              e.firma_ok,
              suscripcion_activa:    e.suscripcion_activa,
              suscripcion:           e.suscripcion,
              balance_api:           e.balance_api,
              obligado_contabilidad: e.obligado_contabilidad ?? null,
              periodo_iva:           e.periodo_iva ?? null,
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
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: "var(--kipu-bg)" }}
      >
        <div className="text-center">
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
            style={{ background: "color-mix(in srgb, var(--kipu-success) 15%, transparent)" }}
          >
            <CheckCircle2 size={32} style={{ color: "var(--kipu-success)" }} />
          </div>
          <h2 className="text-xl font-bold" style={{ color: "var(--kipu-text)" }}>
            ¡Te uniste exitosamente!
          </h2>
          <p className="text-sm mt-1" style={{ color: "var(--kipu-muted)" }}>
            Redirigiendo al panel...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 py-10"
      style={{ background: "var(--kipu-bg)" }}
    >
      <div className="w-full max-w-sm">

        {/* Logo */}
        <div className="flex flex-col items-center mb-8 min-h-[68px] justify-end">
          {mounted ? (
            <Image
              src={resolvedTheme === "dark" ? "/images/logo-dark.svg" : "/images/logo.svg"}
              alt="Kipu"
              width={200}
              height={40}
              priority
            />
          ) : (
            <div className="w-[200px] h-[40px]" />
          )}
        </div>

        <div className="space-y-3">

          {/* Opción 1 — Unirse a empresa invitada */}
          {empresaParam && (
            <div
              className="rounded-xl p-4"
              style={{
                background: "var(--kipu-surface)",
                border:     "1px solid color-mix(in srgb, var(--kipu-accent) 30%, transparent)",
              }}
            >
              <div className="flex items-center gap-2 mb-3">
                <Building2 size={16} style={{ color: "var(--kipu-accent)" }} />
                <span className="text-sm font-medium" style={{ color: "var(--kipu-accent)" }}>
                  Tienes una invitación
                </span>
              </div>

              {loadingEmpresa ? (
                <div className="flex items-center gap-2 text-sm" style={{ color: "var(--kipu-muted)" }}>
                  <Loader2 size={14} className="animate-spin" />
                  Cargando...
                </div>
              ) : empresa ? (
                <>
                  <p className="font-semibold mb-1" style={{ color: "var(--kipu-text)" }}>
                    {empresa.nombre_comercial || empresa.razon_social}
                  </p>
                  <p className="text-xs mb-4" style={{ color: "var(--kipu-muted)" }}>
                    Fuiste invitado a unirte a esta empresa.
                  </p>
                  {error && (
                    <p
                      className="text-xs px-3 py-2 rounded-lg mb-3"
                      style={{
                        color:      "var(--kipu-danger)",
                        background: "color-mix(in srgb, var(--kipu-danger) 10%, transparent)",
                      }}
                    >
                      {error}
                    </p>
                  )}
                  <button
                    onClick={handleUnirse}
                    disabled={loading}
                    className="w-full py-2.5 rounded-lg font-medium text-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                    style={{ background: "var(--kipu-accent)", color: "#ffffff" }}
                    onMouseEnter={e => !loading && (e.currentTarget.style.background = "var(--kipu-accent-h)")}
                    onMouseLeave={e => !loading && (e.currentTarget.style.background = "var(--kipu-accent)")}
                  >
                    {loading
                      ? <><Loader2 size={14} className="animate-spin" /> Uniéndome...</>
                      : <><CheckCircle2 size={14} /> Unirme a {empresa.nombre_comercial || empresa.razon_social}</>
                    }
                  </button>
                </>
              ) : (
                <p className="text-xs" style={{ color: "var(--kipu-danger)" }}>
                  {error || "Empresa no encontrada."}
                </p>
              )}
            </div>
          )}

          {/* Separador */}
          {empresaParam && (
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px" style={{ background: "var(--kipu-border)" }} />
              <span className="text-xs" style={{ color: "var(--kipu-subtle)" }}>o</span>
              <div className="flex-1 h-px" style={{ background: "var(--kipu-border)" }} />
            </div>
          )}

          {/* Opción 2 — Crear empresa propia */}
          <button
            onClick={() => router.push("/onboarding")}
            className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-left transition-colors group"
            style={{
              background: "var(--kipu-surface)",
              border:     "1px solid var(--kipu-border)",
            }}
            onMouseEnter={e => e.currentTarget.style.borderColor = "var(--kipu-muted)"}
            onMouseLeave={e => e.currentTarget.style.borderColor = "var(--kipu-border)"}
          >
            <div
              className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 transition-colors"
              style={{ background: "var(--kipu-border)" }}
            >
              <Plus size={16} style={{ color: "var(--kipu-muted)" }} />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium" style={{ color: "var(--kipu-text)" }}>
                Crear mi empresa
              </p>
              <p className="text-xs" style={{ color: "var(--kipu-muted)" }}>
                Registra tu RUC y empieza a facturar
              </p>
            </div>
            <ArrowRight size={14} style={{ color: "var(--kipu-subtle)" }} />
          </button>

        </div>

        {/* Botones de acción */}
        <div className="mt-8 space-y-3">

          {/* Soporte */}
          <a
            href={`https://wa.me/593960585581?text=${encodeURIComponent("Hola, necesito soporte con Kipu.")}`}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-colors"
            style={{
              border: "1px solid color-mix(in srgb, var(--kipu-success) 30%, transparent)",
              color:  "var(--kipu-success)",
            }}
            onMouseEnter={e => (e.currentTarget.style.background = "color-mix(in srgb, var(--kipu-success) 10%, transparent)")}
            onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
          >
            <MessageCircle size={15} />
            Contactar soporte
          </a>

          {/* Cerrar sesión */}
          <button
            onClick={handleCerrarSesion}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-colors"
            style={{
              border: "1px solid var(--kipu-border)",
              color:  "var(--kipu-muted)",
            }}
            onMouseEnter={e => {
              e.currentTarget.style.borderColor = "var(--kipu-muted)";
              e.currentTarget.style.color = "var(--kipu-text)";
            }}
            onMouseLeave={e => {
              e.currentTarget.style.borderColor = "var(--kipu-border)";
              e.currentTarget.style.color = "var(--kipu-muted)";
            }}
          >
            <LogOut size={15} />
            Cerrar sesión
          </button>

          {/* Eliminar cuenta */}
          <div className="flex justify-center pt-1">
            {!confirmDelete ? (
              <button
                onClick={() => setConfirmDelete(true)}
                className="text-xs transition-colors"
                style={{ color: "var(--kipu-subtle)" }}
                onMouseEnter={e => (e.currentTarget.style.color = "var(--kipu-danger)")}
                onMouseLeave={e => (e.currentTarget.style.color = "var(--kipu-subtle)")}
              >
                Eliminar mi cuenta
              </button>
            ) : (
              <div className="text-center space-y-2">
                <p className="text-xs" style={{ color: "var(--kipu-danger)" }}>
                  ¿Estás seguro? Esta acción no se puede deshacer.
                </p>
                <div className="flex gap-3 justify-center">
                  <button
                    onClick={() => setConfirmDelete(false)}
                    className="text-xs transition-colors"
                    style={{ color: "var(--kipu-muted)" }}
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleEliminarCuenta}
                    className="text-xs font-medium transition-colors"
                    style={{ color: "var(--kipu-danger)" }}
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