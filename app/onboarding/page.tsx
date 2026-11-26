"use client";
// Registrar la primera empresa (después de verificar el correo). El formulario
// es el mismo de Nueva empresa (components/auth/FormularioEmpresa.tsx); aquí, el
// encabezado, la salida a soporte y cerrar sesión (la única salida de la cuenta).

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { auth } from "@/lib/firebase";
import { signOut } from "firebase/auth";
import { useAuthStore } from "@/store/auth.store";
import { Zap, CheckCircle2, MessageCircle } from "lucide-react";
import { enlaceWhatsAppFalla } from "@/lib/soporte";
import FormularioEmpresa from "@/components/auth/FormularioEmpresa";

// ── Pie de soporte — visible en todos los pasos ───────────────────────────────
function SoporteFooter({ ruc }: { ruc: string }) {
  const router = useRouter();
  const texto = `Hola, necesito ayuda para configurar mi empresa en Kipu${ruc ? ` (RUC ${ruc})` : ""}.`;
  // Al verificar el correo se llega directo aquí: es la única salida de la cuenta
  const cerrarSesion = async () => {
    await signOut(auth);
    useAuthStore.getState().logout();
    router.replace("/login");
  };
  return (
    <div className="mt-8 flex flex-col items-center gap-1 pb-6 text-center md:pb-10">
      <a
        href={enlaceWhatsAppFalla(texto, auth.currentUser?.email)}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex min-h-11 items-center gap-1.5 text-xs text-sutil transition-colors hover:text-acento"
      >
        <MessageCircle size={13} aria-hidden />
        ¿Algo falla y no puedes continuar? Escríbenos por WhatsApp
      </a>
      <button
        type="button"
        onClick={cerrarSesion}
        className="min-h-11 px-3 text-xs text-sutil transition-colors hover:text-texto"
      >
        Cerrar sesión
      </button>
    </div>
  );
}

export default function OnboardingPage() {
  const router = useRouter();
  const [success, setSuccess] = useState(false);

  // Sin correo verificado el backend rechaza el registro: verificar primero
  useEffect(() => {
    if (auth.currentUser && !auth.currentUser.emailVerified) router.replace("/bienvenida");
  }, [router]);

  const listo = () => {
    setSuccess(true);
    // Carga completa: así se leen las empresas recién creadas (con router.replace
    // el panel se quedaba cargando porque la sesión ya estaba "cargada sin empresa")
    setTimeout(() => window.location.replace("/dashboard"), 1500);
  };

  // ── Pantalla de éxito ──────────────────────────────────────────────────────
  if (success) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-fondo px-4" role="status">
        <div className="text-center">
          <span className="mx-auto mb-4 flex size-16 items-center justify-center rounded-full bg-exito-suave">
            <CheckCircle2 size={32} className="text-exito" aria-hidden />
          </span>
          <h1 className="text-xl font-bold text-texto">¡Todo listo!</h1>
          <p className="mt-1 text-sm text-tenue">Abriendo tu panel…</p>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen flex-col bg-fondo">
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col px-4 pt-8 md:flex-none md:pt-12">
        <header className="mb-6 flex flex-col items-center text-center">
          <span className="mb-4 flex size-12 items-center justify-center rounded-2xl bg-acento text-sobre-acento">
            <Zap size={24} aria-hidden />
          </span>
          <h1 className="text-2xl font-bold text-texto">Configura tu empresa</h1>
          <p className="mt-1 text-sm text-sutil">Solo toma 2 minutos</p>
        </header>

        <FormularioEmpresa onCreada={listo} pie={(ruc) => <SoporteFooter ruc={ruc} />} />
      </div>
    </main>
  );
}
