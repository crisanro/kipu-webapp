// app/(auth)/reset/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth.store";
import Link from "next/link";
import api from "@/lib/api";
import { Zap, Loader2, CheckCircle2, ArrowLeft } from "lucide-react";

export default function ResetPage() {
  const [email,   setEmail]   = useState("");
  const [loading, setLoading] = useState(false);
  const [sent,    setSent]    = useState(false);
  const [error,   setError]   = useState("");

  const router = useRouter();
  const { uid } = useAuthStore();
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
    } catch (err: any) {
      setError("Error al enviar el correo. Intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-gray-950">
      <div className="w-full max-w-sm">

        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center mb-4">
            <Zap size={24} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">Recuperar contraseña</h1>
          <p className="text-sm text-gray-500 mt-1">Te enviamos un enlace a tu correo</p>
        </div>

        {sent ? (
          <div className="text-center space-y-4">
            <div className="w-14 h-14 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto">
              <CheckCircle2 size={28} className="text-emerald-400" />
            </div>
            <div>
              <p className="text-white font-medium">Correo enviado</p>
              <p className="text-sm text-gray-500 mt-1">
                Revisa tu bandeja de entrada en <strong className="text-white">{email}</strong>
              </p>
            </div>
            <Link
              href="/login"
              className="flex items-center justify-center gap-2 text-sm text-indigo-400 hover:text-indigo-300 transition-colors"
            >
              <ArrowLeft size={14} />
              Volver al login
            </Link>
          </div>
        ) : (
          <form onSubmit={handleReset} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1.5">
                Correo electrónico
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@empresa.com"
                required
                className="w-full px-4 py-2.5 rounded-lg bg-gray-900 border border-gray-800 text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500 transition-colors text-sm"
              />
            </div>

            {error && (
              <p className="text-sm text-red-400 bg-red-400/10 px-3 py-2 rounded-lg">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium text-sm transition-colors flex items-center justify-center gap-2"
            >
              {loading ? (
                <><Loader2 size={16} className="animate-spin" /> Enviando...</>
              ) : (
                "Enviar enlace"
              )}
            </button>

            <Link
              href="/login"
              className="flex items-center justify-center gap-2 text-sm text-gray-500 hover:text-gray-300 transition-colors"
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