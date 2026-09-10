// app/(auth)/register/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { auth } from "@/lib/firebase";
import api from "@/lib/api";
import { useAuthStore } from "@/store/auth.store";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { useTheme } from "next-themes";

export default function RegisterPage() {
  const router = useRouter();
  const { uid } = useAuthStore();
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);
  useEffect(() => {
    if (uid) router.replace("/dashboard");
  }, [uid]);

  const [email,          setEmail]          = useState("");
  const [password,       setPassword]       = useState("");
  const [showPass,       setShowPass]       = useState(false);
  const [confirm,        setConfirm]        = useState("");
  const [showConf,       setShowConf]       = useState(false);
  const [aceptaTerminos, setAceptaTerminos] = useState(false);
  const [loading,        setLoading]        = useState(false);
  const [error,          setError]          = useState("");

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password.length < 8) {
      setError("La contraseña debe tener al menos 8 caracteres.");
      return;
    }
    if (password !== confirm) {
      setError("Las contraseñas no coinciden.");
      return;
    }
    if (!aceptaTerminos) {
      setError("Debes aceptar la Política de Privacidad y el Tratamiento de Datos para continuar.");
      return;
    }

    setLoading(true);
    try {
      await createUserWithEmailAndPassword(auth, email, password);
      try {
        await api.post("/api/v1/app/auth/send-verification");
      } catch {}
      const empresaParam = new URLSearchParams(window.location.search).get("empresa");
      router.replace(empresaParam ? `/bienvenida?empresa=${empresaParam}` : "/bienvenida");
    } catch (err: any) {
      const code = err?.code ?? "";
      if (code === "auth/email-already-in-use") {
        setError("Ya existe una cuenta con ese correo.");
      } else if (code === "auth/weak-password") {
        setError("La contraseña es muy débil.");
      } else if (code === "auth/invalid-email") {
        setError("El correo no es válido.");
      } else {
        setError("Error al crear la cuenta. Intenta de nuevo.");
      }
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = {
    background: "var(--kipu-surface)",
    border:     "1px solid var(--kipu-border)",
    color:      "var(--kipu-text)",
  };

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

        {/* Form */}
        <form onSubmit={handleRegister} className="space-y-4">

          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--kipu-muted)" }}>
              Correo electrónico
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tu@empresa.com"
              required
              className="w-full px-4 py-2.5 rounded-lg text-sm transition-colors focus:outline-none"
              style={inputStyle}
              onFocus={e => e.currentTarget.style.borderColor = "var(--kipu-accent)"}
              onBlur={e  => e.currentTarget.style.borderColor = "var(--kipu-border)"}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--kipu-muted)" }}>
              Contraseña
            </label>
            <div className="relative">
              <input
                type={showPass ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mínimo 8 caracteres"
                required
                className="w-full px-4 py-2.5 rounded-lg text-sm transition-colors focus:outline-none pr-10"
                style={inputStyle}
                onFocus={e => e.currentTarget.style.borderColor = "var(--kipu-accent)"}
                onBlur={e  => e.currentTarget.style.borderColor = "var(--kipu-border)"}
              />
              <button
                type="button"
                onClick={() => setShowPass(!showPass)}
                className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
                style={{ color: "var(--kipu-subtle)" }}
              >
                {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--kipu-muted)" }}>
              Confirmar contraseña
            </label>
            <div className="relative">
              <input
                type={showConf ? "text" : "password"}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="Repite tu contraseña"
                required
                className="w-full px-4 py-2.5 rounded-lg text-sm transition-colors focus:outline-none pr-10"
                style={inputStyle}
                onFocus={e => e.currentTarget.style.borderColor = "var(--kipu-accent)"}
                onBlur={e  => e.currentTarget.style.borderColor = "var(--kipu-border)"}
              />
              <button
                type="button"
                onClick={() => setShowConf(!showConf)}
                className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
                style={{ color: "var(--kipu-subtle)" }}
              >
                {showConf ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* Checkbox LOPDP */}
          <div className="flex items-start gap-2 pt-1">
            <input
              type="checkbox"
              id="terminos"
              checked={aceptaTerminos}
              onChange={(e) => setAceptaTerminos(e.target.checked)}
              className="mt-0.5 w-4 h-4 rounded cursor-pointer"
              style={{ accentColor: "var(--kipu-accent)" }}
            />
            <label htmlFor="terminos" className="text-xs leading-relaxed" style={{ color: "var(--kipu-muted)" }}>
              He leído y acepto la{" "}
              <a
                href="https://kipu.ec/politica-de-privacidad"
                target="_blank"
                rel="noopener noreferrer"
                className="underline transition-colors"
                style={{ color: "var(--kipu-accent)" }}
              >
                Política de Privacidad
              </a>{" "}
              y el{" "}
              <a
                href="https://kipu.ec/tratamiento-de-datos-personales"
                target="_blank"
                rel="noopener noreferrer"
                className="underline transition-colors"
                style={{ color: "var(--kipu-accent)" }}
              >
                Tratamiento de Datos Personales
              </a>{" "}
              de Kipu EC.
            </label>
          </div>

          {error && (
            <p
              className="text-sm px-3 py-2 rounded-lg"
              style={{
                color:      "var(--kipu-danger)",
                background: "color-mix(in srgb, var(--kipu-danger) 10%, transparent)",
              }}
            >
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading || !aceptaTerminos}
            className="w-full py-2.5 rounded-lg font-medium text-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ background: "var(--kipu-accent)", color: "#ffffff" }}
            onMouseEnter={e => !loading && (e.currentTarget.style.background = "var(--kipu-accent-h)")}
            onMouseLeave={e => !loading && (e.currentTarget.style.background = "var(--kipu-accent)")}
          >
            {loading ? (
              <><Loader2 size={16} className="animate-spin" /> Creando cuenta...</>
            ) : (
              "Crear cuenta gratis"
            )}
          </button>
        </form>

        <p className="mt-6 text-center text-sm" style={{ color: "var(--kipu-subtle)" }}>
          ¿Ya tienes cuenta?{" "}
          <Link
            href="/login"
            className="font-medium transition-colors"
            style={{ color: "var(--kipu-accent)" }}
          >
            Inicia sesión
          </Link>
        </p>

      </div>
    </div>
  );
}