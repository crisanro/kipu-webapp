// app/(auth)/register/page.tsx
// Crear cuenta. autoComplete="new-password": el teléfono sugiere una clave
// segura y la guarda en el llavero; "Siguiente" del teclado avanza de campo.
"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "@/lib/firebase";
import api from "@/lib/api";
import { useAuthStore } from "@/store/auth.store";
import { detalleError } from "@/lib/errores";
import Turnstile, { TURNSTILE_ACTIVO } from "@/components/auth/Turnstile";
import Boton from "@/components/ui/Boton";
import { Campo, Entrada, EntradaClave } from "@/components/ui/Campo";

const MINIMO = 8;
const EMAIL_OK = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function RegisterPage() {
  const router = useRouter();
  const { uid } = useAuthStore();

  useEffect(() => {
    if (uid) router.replace("/dashboard");
  }, [uid, router]);

  const [email,          setEmail]          = useState("");
  const [password,       setPassword]       = useState("");
  const [confirm,        setConfirm]        = useState("");
  const [aceptaTerminos, setAceptaTerminos] = useState(false);
  const [loading,        setLoading]        = useState(false);
  const [error,          setError]          = useState("");
  // Errores de cada campo: se muestran al salir del campo o al enviar
  const [tocados,        setTocados]        = useState<Record<string, boolean>>({});
  // Captcha: cada token sirve una vez; "intento" vuelve a montar el widget
  const [captcha,        setCaptcha]        = useState<string | null>(null);
  const [intento,        setIntento]        = useState(0);

  const clave    = useRef<HTMLInputElement>(null);
  const confirma = useRef<HTMLInputElement>(null);

  const tocar = (campo: string) => setTocados(t => ({ ...t, [campo]: true }));
  const errEmail   = tocados.email   && email && !EMAIL_OK.test(email.trim()) ? "Revisa el correo: no parece válido." : null;
  const errClave   = tocados.clave   && password.length < MINIMO ? `Mínimo ${MINIMO} caracteres.` : null;
  const errConfirm = tocados.confirm && confirm !== password ? "Las contraseñas no coinciden." : null;

  // "Siguiente" en el teclado: al campo que sigue en vez de enviar
  const pasarA = (e: React.KeyboardEvent, ref: React.RefObject<HTMLInputElement | null>) => {
    if (e.key === "Enter") { e.preventDefault(); ref.current?.focus(); }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setTocados({ email: true, clave: true, confirm: true });

    if (!EMAIL_OK.test(email.trim()))  { setError("Revisa el correo: no parece válido."); return; }
    if (password.length < MINIMO)      { setError(`La contraseña debe tener al menos ${MINIMO} caracteres.`); return; }
    if (password !== confirm)          { setError("Las contraseñas no coinciden."); return; }
    if (!aceptaTerminos) {
      setError("Debes aceptar la Política de Privacidad y el Tratamiento de Datos para continuar.");
      return;
    }
    if (TURNSTILE_ACTIVO && !captcha) {
      setError("Completa la verificación de seguridad.");
      return;
    }

    setLoading(true);
    let creada = false;
    try {
      // La cuenta la crea el backend (captcha, correos temporales, límite por IP);
      // el registro directo en Firebase está desactivado
      await api.post("/api/v1/public/registro/cuenta", {
        email: email.trim(), password, captcha_token: captcha,
      });
      creada = true;
      await signInWithEmailAndPassword(auth, email.trim(), password);
      // El correo de verificación NO se envía solo: en la bienvenida se pide con
      // un botón, así la persona sabe que debe buscarlo en su bandeja.
      const empresaParam = new URLSearchParams(window.location.search).get("empresa");
      router.replace(empresaParam ? `/bienvenida?empresa=${empresaParam}` : "/bienvenida");
    } catch (err) {
      if (creada) {
        // La cuenta existe; solo falló el inicio de sesión automático
        router.replace("/login");
        return;
      }
      setError(detalleError(err, "No pudimos crear la cuenta. Intenta de nuevo."));
      setCaptcha(null);
      setIntento(i => i + 1);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-fondo px-4 py-10">
      <div className="w-full max-w-sm">
        <LogoKipu />
        <h1 className="mb-6 text-center text-lg font-semibold text-texto">Crea tu cuenta</h1>

        <form onSubmit={handleRegister} className="space-y-4" noValidate>
          <Campo etiqueta="Correo electrónico" error={errEmail}>
            <Entrada
              teclado="email"
              name="email"
              autoComplete="email"
              enterKeyHint="next"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onBlur={() => tocar("email")}
              onKeyDown={(e) => pasarA(e, clave)}
              placeholder="tu@empresa.com"
              required
            />
          </Campo>

          <Campo etiqueta="Contraseña" error={errClave} ayuda={errClave ? undefined : `Mínimo ${MINIMO} caracteres.`}>
            <EntradaClave
              ref={clave}
              name="new-password"
              autoComplete="new-password"
              enterKeyHint="next"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onBlur={() => tocar("clave")}
              onKeyDown={(e) => pasarA(e, confirma)}
              required
            />
          </Campo>

          <Campo etiqueta="Confirmar contraseña" error={errConfirm}>
            <EntradaClave
              ref={confirma}
              name="confirm-password"
              autoComplete="new-password"
              enterKeyHint="done"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              onBlur={() => tocar("confirm")}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); e.currentTarget.blur(); } }}
              required
            />
          </Campo>

          {/* Aceptación LOPDP: toda la fila se toca */}
          <label htmlFor="terminos" className="flex cursor-pointer items-start gap-3 rounded-lg py-1">
            <input
              type="checkbox"
              id="terminos"
              checked={aceptaTerminos}
              onChange={(e) => setAceptaTerminos(e.target.checked)}
              className="mt-0.5 size-5 shrink-0 cursor-pointer rounded accent-acento"
            />
            <span className="text-xs leading-relaxed text-tenue tactil:text-sm">
              He leído y acepto la{" "}
              <a href="https://kipu.ec/politica-de-privacidad" target="_blank" rel="noopener noreferrer"
                 className="text-acento underline underline-offset-2">
                Política de Privacidad
              </a>{" "}
              y el{" "}
              <a href="https://kipu.ec/tratamiento-de-datos-personales" target="_blank" rel="noopener noreferrer"
                 className="text-acento underline underline-offset-2">
                Tratamiento de Datos Personales
              </a>{" "}
              de Kipu EC.
            </span>
          </label>

          {TURNSTILE_ACTIVO && <Turnstile key={intento} onToken={setCaptcha} />}

          {error && (
            <p className="rounded-lg bg-peligro-suave px-3 py-2 text-sm text-peligro-texto" role="alert">{error}</p>
          )}

          <Boton type="submit" tamano="lg" anchoCompleto cargando={loading}
                 disabled={!aceptaTerminos || (TURNSTILE_ACTIVO && !captcha)}>
            {loading ? "Creando cuenta…" : "Crear cuenta gratis"}
          </Boton>
        </form>

        <p className="mt-8 text-center text-sm text-sutil">
          ¿Ya tienes cuenta?{" "}
          <Link href="/login" className="font-medium text-acento">Inicia sesión</Link>
        </p>
      </div>
    </main>
  );
}

/** Logo según el tema, sin esperar a montar: el CSS elige (data-theme en <html>). */
function LogoKipu() {
  return (
    <div className="mb-8 flex h-10 justify-center">
      <Image src="/images/logo.svg" alt="Kipu" width={200} height={40} priority
             className="h-10 w-auto [[data-theme=dark]_&]:hidden" />
      <Image src="/images/logo-dark.svg" alt="" aria-hidden width={200} height={40} priority
             className="hidden h-10 w-auto [[data-theme=dark]_&]:block" />
    </div>
  );
}
