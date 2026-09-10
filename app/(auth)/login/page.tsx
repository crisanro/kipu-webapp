// app/(auth)/login/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { useAuthStore } from "@/store/auth.store";
import { useTheme } from "next-themes";

export default function LoginPage() {
  const router = useRouter();
  const { uid } = useAuthStore();
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (uid) router.replace("/dashboard");
  }, [uid, router]);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await signInWithEmailAndPassword(auth, email, password);
      router.replace("/");
    } catch (err: any) {
      const code = err?.code ?? "";
      if (code === "auth/invalid-credential" || code === "auth/wrong-password") {
        setError("Correo o contraseña incorrectos.");
      } else if (code === "auth/user-not-found") {
        setError("No existe una cuenta con ese correo.");
      } else if (code === "auth/too-many-requests") {
        setError("Demasiados intentos. Espera unos minutos.");
      } else {
        setError("Error al iniciar sesión. Intenta de nuevo.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
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
            <div className="w-[120px] h-[40px]" />
          )}

        </div>

        {/* Form */}
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label
              className="block text-sm font-medium mb-1.5"
              style={{ color: "var(--kipu-muted)" }}
            >
              Correo electrónico
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tu@empresa.com"
              required
              className="w-full px-4 py-2.5 rounded-lg text-sm transition-colors focus:outline-none"
              style={{
                background: "var(--kipu-surface)",
                border: "1px solid var(--kipu-border)",
                color: "var(--kipu-text)",
              }}
              onFocus={(e) => (e.currentTarget.style.borderColor = "var(--kipu-accent)")}
              onBlur={(e) => (e.currentTarget.style.borderColor = "var(--kipu-border)")}
            />
          </div>

          <div>
            <label
              className="block text-sm font-medium mb-1.5"
              style={{ color: "var(--kipu-muted)" }}
            >
              Contraseña
            </label>
            <div className="relative">
              <input
                type={showPass ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full px-4 py-2.5 rounded-lg text-sm transition-colors focus:outline-none pr-10"
                style={{
                  background: "var(--kipu-surface)",
                  border: "1px solid var(--kipu-border)",
                  color: "var(--kipu-text)",
                }}
                onFocus={(e) => (e.currentTarget.style.borderColor = "var(--kipu-accent)")}
                onBlur={(e) => (e.currentTarget.style.borderColor = "var(--kipu-border)")}
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

          {error && (
            <p
              className="text-sm px-3 py-2 rounded-lg"
              style={{
                color: "var(--kipu-danger)",
                background: "color-mix(in srgb, var(--kipu-danger) 10%, transparent)",
              }}
            >
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-lg font-medium text-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              background: "var(--kipu-accent)",
              color: "#ffffff",
            }}
            onMouseEnter={(e) => !loading && (e.currentTarget.style.background = "var(--kipu-accent-h)")}
            onMouseLeave={(e) => !loading && (e.currentTarget.style.background = "var(--kipu-accent)")}
          >
            {loading ? (
              <>
                <Loader2 size={16} className="animate-spin" /> Ingresando...
              </>
            ) : (
              "Ingresar"
            )}
          </button>
        </form>

        {/* Links */}
        <div className="mt-6 flex flex-col items-center gap-2 text-sm">
          <Link
            href="/reset"
            className="transition-colors"
            style={{ color: "var(--kipu-muted)" }}
          >
            ¿Olvidaste tu contraseña?
          </Link>
          <p style={{ color: "var(--kipu-subtle)" }}>
            ¿No tienes cuenta?{" "}
            <Link
              href="/register"
              className="font-medium transition-colors"
              style={{ color: "var(--kipu-accent)" }}
            >
              Regístrate gratis
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}