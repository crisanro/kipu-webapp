// app/(auth)/reset/page.tsx
// Recuperar la contraseña: se envía el enlace al correo.
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth.store";
import Link from "next/link";
import LogoKipu from "@/components/auth/LogoKipu";
import api from "@/lib/api";
import { CheckCircle2, ArrowLeft } from "lucide-react";
import Boton from "@/components/ui/Boton";
import { Campo, Entrada } from "@/components/ui/Campo";

const EMAIL_OK = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function ResetPage() {
  const [email,   setEmail]   = useState("");
  const [loading, setLoading] = useState(false);
  const [sent,    setSent]    = useState(false);
  const [error,   setError]   = useState("");

  const router = useRouter();
  const { uid } = useAuthStore();

  useEffect(() => {
    if (uid) router.replace("/dashboard");
  }, [uid, router]);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!EMAIL_OK.test(email.trim())) { setError("Revisa el correo: no parece válido."); return; }
    setLoading(true);
    try {
      await api.post("/api/v1/app/auth/reset", { email: email.trim() });
      setSent(true);
    } catch {
      setError("No pudimos enviar el correo. Intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-fondo px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex justify-center"><LogoKipu /></div>

        {sent ? (
          <div className="space-y-4 text-center" role="status">
            <span className="mx-auto flex size-14 items-center justify-center rounded-full bg-exito-suave">
              <CheckCircle2 size={28} className="text-exito" aria-hidden />
            </span>
            <div>
              <h1 className="text-lg font-semibold text-texto">Revisa tu correo</h1>
              <p className="mt-1 text-sm text-tenue">
                Si hay una cuenta con <strong className="text-texto">{email.trim()}</strong>, te llega un
                enlace para crear una contraseña nueva. Mira también en spam.
              </p>
            </div>
            <Link href="/login"
                  className="inline-flex min-h-11 items-center justify-center gap-2 text-sm font-medium text-acento">
              <ArrowLeft size={16} aria-hidden /> Volver a iniciar sesión
            </Link>
          </div>
        ) : (
          <>
            <h1 className="text-center text-lg font-semibold text-texto">Recupera tu contraseña</h1>
            <p className="mb-6 mt-1 text-center text-sm text-tenue">Te enviamos un enlace para crear una nueva.</p>

            <form onSubmit={handleReset} className="space-y-4" noValidate>
              <Campo etiqueta="Correo electrónico">
                <Entrada
                  teclado="email"
                  name="email"
                  autoComplete="email"
                  enterKeyHint="send"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="tu@empresa.com"
                  required
                />
              </Campo>

              {error && (
                <p className="rounded-lg bg-peligro-suave px-3 py-2 text-sm text-peligro-texto" role="alert">{error}</p>
              )}

              <Boton type="submit" tamano="lg" anchoCompleto cargando={loading} disabled={!email.trim()}>
                {loading ? "Enviando…" : "Enviar enlace"}
              </Boton>
            </form>

            <div className="mt-6 text-center">
              <Link href="/login"
                    className="inline-flex min-h-11 items-center justify-center gap-2 text-sm text-tenue hover:text-texto">
                <ArrowLeft size={16} aria-hidden /> Volver a iniciar sesión
              </Link>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
