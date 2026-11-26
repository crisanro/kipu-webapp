// app/(auth)/login/page.tsx
// Ingresar. En el teléfono: el llavero de iOS o el gestor de Google ofrecen el
// correo y la clave guardados (autoComplete), "Siguiente" del teclado pasa a la
// clave y "Ir" ingresa.
"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import LogoKipu from "@/components/auth/LogoKipu";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useAuthStore } from "@/store/auth.store";
import { tomarVolver } from "@/lib/volver";
import { CUENTA_ELIMINADA } from "@/lib/cuenta";
import Boton from "@/components/ui/Boton";
import { Campo, Entrada, EntradaClave } from "@/components/ui/Campo";

/** Mensaje de Firebase Auth para la persona. */
function mensajeIngreso(code: string): string {
  switch (code) {
    case "auth/invalid-credential":
    case "auth/wrong-password":      return "Correo o contraseña incorrectos.";
    case "auth/user-not-found":      return "No existe una cuenta con ese correo.";
    case "auth/invalid-email":       return "Revisa el correo: no parece válido.";
    case "auth/user-disabled":       return "Esta cuenta está en proceso de eliminación. Si fue un error, escríbenos a soporte.";
    case "auth/too-many-requests":   return "Demasiados intentos. Espera unos minutos.";
    case "auth/network-request-failed": return "Sin conexión. Revisa tu internet e intenta de nuevo.";
    default:                         return "No pudimos iniciar sesión. Intenta de nuevo.";
  }
}

export default function LoginPage() {
  const router = useRouter();
  const { uid } = useAuthStore();

  // Recién eliminó su cuenta (components/cuenta/EliminarCuenta.tsx)
  const [eliminada, setEliminada] = useState<string | null>(null);

  useEffect(() => {
    try {
      const v = sessionStorage.getItem(CUENTA_ELIMINADA);
      if (v !== null) {
        // eslint-disable-next-line react-hooks/set-state-in-effect -- sessionStorage solo existe en el navegador
        setEliminada(v);
        sessionStorage.removeItem(CUENTA_ELIMINADA);
      }
    } catch {}
  }, []);

  useEffect(() => {
    if (uid) router.replace(tomarVolver() ?? "/dashboard");
  }, [uid, router]);

  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState("");
  const clave = useRef<HTMLInputElement>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
      router.replace("/");
    } catch (err: unknown) {
      setError(mensajeIngreso((err as { code?: string })?.code ?? ""));
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-fondo px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex justify-center"><LogoKipu /></div>
        <h1 className="mb-6 text-center text-lg font-semibold text-texto">Ingresa a tu cuenta</h1>

        <form onSubmit={handleLogin} className="space-y-4" noValidate>
          <Campo etiqueta="Correo electrónico">
            <Entrada
              teclado="email"
              name="email"
              autoComplete="username"
              enterKeyHint="next"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => {
                // "Siguiente": a la clave (no envía con la clave vacía)
                if (e.key === "Enter" && !password) { e.preventDefault(); clave.current?.focus(); }
              }}
              placeholder="tu@empresa.com"
              required
            />
          </Campo>

          <div>
            <Campo etiqueta="Contraseña">
              <EntradaClave
                ref={clave}
                name="password"
                autoComplete="current-password"
                enterKeyHint="go"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </Campo>
            <div className="mt-1.5 text-right">
              <Link href="/reset" className="text-xs text-tenue underline-offset-2 hover:text-texto hover:underline tactil:text-sm">
                ¿Olvidaste tu contraseña?
              </Link>
            </div>
          </div>

          {eliminada !== null && !error && (
            <p className="rounded-lg bg-acento-suave px-3 py-2 text-sm text-texto" role="status">
              {eliminada
                ? `Tu cuenta se eliminará el ${eliminada}. Te enviamos la confirmación por correo.`
                : "Tu cuenta fue eliminada."}
            </p>
          )}

          {error && (
            <p className="rounded-lg bg-peligro-suave px-3 py-2 text-sm text-peligro-texto" role="alert">{error}</p>
          )}

          <Boton type="submit" tamano="lg" anchoCompleto cargando={loading}
                 disabled={!email.trim() || !password}>
            {loading ? "Ingresando…" : "Ingresar"}
          </Boton>
        </form>

        <p className="mt-8 text-center text-sm text-sutil">
          ¿No tienes cuenta?{" "}
          <Link href="/register" className="font-medium text-acento">Regístrate gratis</Link>
        </p>
      </div>
    </main>
  );
}
