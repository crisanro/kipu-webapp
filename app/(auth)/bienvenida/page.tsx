// app/(auth)/bienvenida/page.tsx
// Después de registrarse: primero verificar el correo; luego unirse a la empresa
// que lo invitó (?empresa=) o crear la suya (sin invitación va directo al
// onboarding). Siempre con salida: ayuda, cerrar sesión y eliminar la cuenta.
"use client";

import { useConfirmar } from "@/components/ui/Confirmar";
import { useAvisos } from "@/components/ui/Avisos";
import { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { auth } from "@/lib/firebase";
import { aEmpresa } from "@/lib/empresa";
import LogoKipu from "@/components/auth/LogoKipu";
import Link from "next/link";
import { enlaceWhatsAppFalla } from "@/lib/soporte";
import { detalleError } from "@/lib/errores";
import api from "@/lib/api";
import { useAuthStore } from "@/store/auth.store";
import { Building2, Plus, Loader2, CheckCircle2, ChevronRight, CircleHelp, MessageCircle, LogOut } from "lucide-react";
import VerificarCorreo from "@/components/auth/VerificarCorreo";
import EliminarCuenta from "@/components/cuenta/EliminarCuenta";
import Boton from "@/components/ui/Boton";
import { cerrarSesion } from "@/lib/notifications";

export default function BienvenidaPage() {
  const confirmar = useConfirmar();
  const avisos    = useAvisos();
  const router       = useRouter();
  const searchParams = useSearchParams();
  const empresaParam = searchParams.get("empresa");
  const { setEmpresa, setEmpresas, logout } = useAuthStore();

  const [loading,        setLoading]        = useState(false);
  const [loadingEmpresa, setLoadingEmpresa] = useState(!!empresaParam);
  const [empresa,        setEmpresaData]    = useState<{ razon_social: string; nombre_comercial: string } | null>(null);
  const [error,          setError]          = useState("");
  const [unido,          setUnido]          = useState(false);
  const [confirmDelete,  setConfirmDelete]  = useState(false);
  // Primero se verifica el correo; recién después se crea o se une a una empresa
  const [correoOk,       setCorreoOk]       = useState(() => auth.currentUser?.emailVerified ?? false);
  const correoVerificado = useCallback(() => setCorreoOk(true), []);

  // Sin invitación no hay nada que elegir: directo a registrar su primera empresa
  useEffect(() => {
    if (correoOk && !empresaParam) router.replace("/onboarding");
  }, [correoOk, empresaParam, router]);

  useEffect(() => {
    if (!empresaParam) return;
    api.get(`/api/v1/app/emisor/info/${empresaParam}`)
      .then(res => setEmpresaData(res.data))
      .catch(() => setError("La invitación no es válida o ya expiró."))
      .finally(() => setLoadingEmpresa(false));
  }, [empresaParam]);

  const nombreEmpresa = empresa ? (empresa.nombre_comercial || empresa.razon_social) : "";

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
          // Token nuevo: ya pertenece a la empresa (el interceptor de lib/api lo envía)
          await auth.currentUser?.getIdToken(true);
          const res  = await api.get("/api/v1/app/usuarios/empresas");
          const data = res.data.data ?? [];
          if (data.length > 0) {
            setEmpresas(data);
            setEmpresa(aEmpresa(data[0]));
          }
        } catch {}
        router.replace("/dashboard");
      }, 1500);
    } catch (err) {
      setError(detalleError(err, "No pudimos unirte a la empresa. Intenta de nuevo."));
    } finally {
      setLoading(false);
    }
  };

  const handleCerrarSesion = async () => {
    await cerrarSesion();
    router.replace("/login");
  };

  // Correo mal escrito: no hay cómo verificarlo, se borra la cuenta y se registra de nuevo
  const handleCambiarCorreo = async () => {
    if (!(await confirmar({
      titulo: "¿Cambiar el correo?",
      mensaje: "Borraremos esta cuenta para que te registres con el correo correcto.",
      textoConfirmar: "Borrar y registrarme", peligro: true,
    }))) return;
    try {
      await auth.currentUser?.delete();
      logout();
      router.replace(empresaParam ? `/register?empresa=${encodeURIComponent(empresaParam)}` : "/register");
    } catch {
      avisos.error("Por seguridad, cierra sesión, vuelve a entrar y elige \"Eliminar mi cuenta\".", { duracion: 0 });
    }
  };

  // ── Éxito ────────────────────────────────────────────────────────────────
  if (unido) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-fondo px-4" role="status">
        <div className="text-center">
          <span className="mx-auto mb-4 flex size-16 items-center justify-center rounded-full bg-exito-suave">
            <CheckCircle2 size={32} className="text-exito" aria-hidden />
          </span>
          <h1 className="text-xl font-bold text-texto">¡Te uniste a {nombreEmpresa || "la empresa"}!</h1>
          <p className="mt-1 text-sm text-tenue">Abriendo tu panel…</p>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-fondo px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex justify-center"><LogoKipu /></div>

        {!correoOk ? (
          <>
            {empresaParam && empresa && (
              <p className="mb-3 text-center text-sm text-tenue">
                Te invitaron a <strong className="text-texto">{nombreEmpresa}</strong>. Verifica tu correo para unirte.
              </p>
            )}
            <VerificarCorreo onVerificado={correoVerificado} onCambiarCorreo={handleCambiarCorreo} />
          </>
        ) : !empresaParam ? (
          <p className="flex items-center justify-center gap-2 py-6 text-sm text-tenue" role="status">
            <Loader2 size={16} className="animate-spin" aria-hidden /> Abriendo el registro de tu empresa…
          </p>
        ) : (
          <div className="space-y-3">
            {/* Opción 1 — Unirse a la empresa que lo invitó */}
            <section className="space-y-3 rounded-xl border border-acento/30 bg-superficie p-4">
              <p className="flex items-center gap-2 text-sm font-medium text-acento">
                <Building2 size={16} aria-hidden /> Tienes una invitación
              </p>
              {loadingEmpresa ? (
                <p className="flex items-center gap-2 text-sm text-tenue">
                  <Loader2 size={14} className="animate-spin" aria-hidden /> Cargando…
                </p>
              ) : empresa ? (
                <>
                  <div>
                    <p className="font-semibold text-texto">{nombreEmpresa}</p>
                    <p className="text-xs text-tenue">Te invitaron a unirte a esta empresa.</p>
                  </div>
                  {error && (
                    <p className="rounded-lg bg-peligro-suave px-3 py-2 text-xs text-peligro-texto" role="alert">{error}</p>
                  )}
                  <Boton anchoCompleto tamano="lg" onClick={handleUnirse} cargando={loading}
                         icono={<CheckCircle2 size={16} />}>
                    {loading ? "Uniéndome…" : `Unirme a ${nombreEmpresa}`}
                  </Boton>
                </>
              ) : (
                <p className="text-sm text-peligro-texto" role="alert">{error || "Empresa no encontrada."}</p>
              )}
            </section>

            <div className="flex items-center gap-3" aria-hidden>
              <span className="h-px flex-1 bg-borde" />
              <span className="text-xs text-sutil">o</span>
              <span className="h-px flex-1 bg-borde" />
            </div>

            {/* Opción 2 — Crear su propia empresa */}
            <Link
              href="/onboarding"
              className="flex min-h-16 w-full items-center gap-3 rounded-xl border border-borde bg-superficie px-4 py-3 transition-colors hover:bg-presionado active:bg-presionado"
            >
              <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-presionado text-tenue">
                <Plus size={18} aria-hidden />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium text-texto">Crear mi empresa</span>
                <span className="block text-xs text-tenue">Registra tu RUC y empieza a facturar</span>
              </span>
              <ChevronRight size={18} className="shrink-0 text-sutil" aria-hidden />
            </Link>
          </div>
        )}

        {/* Salidas: ayuda, soporte, cerrar sesión y eliminar la cuenta */}
        <div className="mt-8 space-y-3">
          {/* Las dudas van al Centro de Ayuda. Si algo falla y no puede seguir,
              WhatsApp para todos (lib/soporte.ts). Mientras verifica el correo,
              ese enlace ya está dentro de VerificarCorreo */}
          <Link
            href="/ayuda"
            className="flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-acento/30 text-sm font-medium text-acento transition-colors hover:bg-acento-suave"
          >
            <CircleHelp size={16} aria-hidden /> Centro de Ayuda
          </Link>
          {correoOk && (
            <p className="text-center text-xs text-sutil">
              ¿Algo falla y no puedes continuar?{" "}
              <a
                href={enlaceWhatsAppFalla("Hola, no puedo continuar con mi registro en Kipu.", auth.currentUser?.email)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-acento underline underline-offset-2"
              >
                <MessageCircle size={12} aria-hidden /> Escríbenos por WhatsApp
              </a>
            </p>
          )}

          <Boton anchoCompleto variante="secundario" onClick={handleCerrarSesion} icono={<LogOut size={16} />}>
            Cerrar sesión
          </Boton>

          {/* Mismo flujo que Configuración → Eliminar mi cuenta (lo hace el backend) */}
          <div className="flex justify-center pt-1">
            {!confirmDelete ? (
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                className="min-h-11 px-3 text-xs text-sutil transition-colors hover:text-peligro"
              >
                Eliminar mi cuenta
              </button>
            ) : (
              <div className="w-full text-left">
                <EliminarCuenta onCancelar={() => setConfirmDelete(false)} />
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
