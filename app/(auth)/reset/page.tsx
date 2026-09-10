// app/(auth)/reset/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth.store";
import Link from "next/link";
import Image from "next/image";
import api from "@/lib/api";
import { Loader2, CheckCircle2, ArrowLeft } from "lucide-react";
import { useTheme } from "next-themes";

export default function ResetPage() {
  const [email,   setEmail]   = useState("");
  const [loading, setLoading] = useState(false);
  const [sent,    setSent]    = useState(false);
  const [error,   setError]   = useState("");
  const [mounted, setMounted] = useState(false);

  const router = useRouter();
  const { uid } = useAuthStore();
  const { resolvedTheme } = useTheme();

  useEffect(() => setMounted(true), []);
  useEffect(() => {
    if (uid) router.replace("/dashboard");
  }, [uid]);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await api.post("/api/v1/app/auth/reset", { email });
      setSent(true);
    } catch {
      setError("Error al enviar el correo. Intenta de nuevo.");
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
            <div className="w-[200px] h-[40px]" />
          )}
        </div>

        {sent ? (
          <div className="text-center space-y-4">
            <div
              className="w-14 h-14 rounded-full flex items-center justify-center mx-auto"
              style={{ background: "color-mix(in srgb, var(--kipu-success) 15%, transparent)" }}
            >
              <CheckCircle2 size={28} style={{ color: "var(--kipu-success)" }} />
            </div>
            <div>
              <p className="font-medium" style={{ color: "var(--kipu-text)" }}>
                Correo enviado
              </p>
              <p className="text-sm mt-1" style={{ color: "var(--kipu-muted)" }}>
                Revisa tu bandeja de entrada en{" "}
                <strong style={{ color: "var(--kipu-text)" }}>{email}</strong>
              </p>
            </div>
            <Link
              href="/login"
              className="inline-flex items-center justify-center gap-2 text-sm transition-colors"
              style={{ color: "var(--kipu-accent)" }}
            >
              <ArrowLeft size={14} />
              Volver al login
            </Link>
          </div>
        ) : (
          <form onSubmit={handleReset} className="space-y-4">
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
                  border:     "1px solid var(--kipu-border)",
                  color:      "var(--kipu-text)",
                }}
                onFocus={e => e.currentTarget.style.borderColor = "var(--kipu-accent)"}
                onBlur={e  => e.currentTarget.style.borderColor = "var(--kipu-border)"}
              />
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
              disabled={loading}
              className="w-full py-2.5 rounded-lg font-medium text-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ background: "var(--kipu-accent)", color: "#ffffff" }}
              onMouseEnter={e => !loading && (e.currentTarget.style.background = "var(--kipu-accent-h)")}
              onMouseLeave={e => !loading && (e.currentTarget.style.background = "var(--kipu-accent)")}
            >
              {loading ? (
                <><Loader2 size={16} className="animate-spin" /> Enviando...</>
              ) : (
                "Enviar enlace"
              )}
            </button>

            <Link
              href="/login"
              className="flex items-center justify-center gap-2 text-sm transition-colors"
              style={{ color: "var(--kipu-muted)" }}
            >
              <ArrowLeft size={14} />
              Volver al login
            </Link>
          </form>
        )}

      </div>
    </div>
  );
}