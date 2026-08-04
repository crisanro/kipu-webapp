// components/PinInput.tsx
"use client";

import { useState, useEffect, useRef } from "react";
import api from "@/lib/api";
import { Loader2, Mail, CheckCircle2, RefreshCw } from "lucide-react";

interface Props {
  tipoAccion:  string;
  email:       string;
  onConfirmar: (pin: string) => Promise<void>;
  onCancelar:  () => void;
  label?:      string;  // texto descriptivo de la acción
}

export default function PinInput({ tipoAccion, email, onConfirmar, onCancelar, label }: Props) {
  const [pin,         setPin]         = useState("");
  const [enviando,    setEnviando]    = useState(false);
  const [enviado,     setEnviado]     = useState(false);
  const [confirmando, setConfirmando] = useState(false);
  const [error,       setError]       = useState("");
  const [countdown,   setCountdown]   = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Arrancar countdown cuando se envía el PIN
  const iniciarCountdown = () => {
    setCountdown(60);
    timerRef.current = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  useEffect(() => {
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  const enviarPin = async () => {
    setEnviando(true);
    setError("");
    try {
      await api.post("/api/v1/admin/request-pin", {
        email,
        tipo_accion: tipoAccion,
      });
      setEnviado(true);
      iniciarCountdown();
      setTimeout(() => inputRef.current?.focus(), 100);
    } catch (err: any) {
      const msg = err?.response?.data?.detail ?? "Error al enviar el PIN.";
      if (err?.response?.status === 429) {
        setEnviado(true);  // Ya hay un PIN activo, dejar ingresar
        iniciarCountdown();
        setError("Ya tienes un PIN activo. Revisa tu correo.");
      } else {
        setError(msg);
      }
    } finally {
      setEnviando(false);
    }
  };

  const confirmar = async () => {
    if (pin.length !== 6) {
      setError("El PIN debe tener 6 dígitos.");
      return;
    }
    setConfirmando(true);
    setError("");
    try {
      await onConfirmar(pin);
    } catch (err: any) {
      setError(err?.response?.data?.detail ?? "PIN incorrecto o expirado.");
      setPin("");
    } finally {
      setConfirmando(false);
    }
  };

  return (
    <div className="space-y-4">

      {/* Paso 1 — Enviar PIN */}
      {!enviado ? (
        <div className="text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-indigo-600/20 flex items-center justify-center mx-auto">
            <Mail size={20} className="text-indigo-400" />
          </div>
          <div>
            <p className="text-sm text-white font-medium">Verificación por email</p>
            <p className="text-xs text-gray-500 mt-1">
              {label
                ? `Para ${label}, necesitamos verificar tu identidad.`
                : "Necesitamos verificar tu identidad."
              }
            </p>
            <p className="text-xs text-indigo-400 mt-1">{email}</p>
          </div>

          {error && (
            <p className="text-xs text-red-400 bg-red-400/10 px-3 py-2 rounded-lg">{error}</p>
          )}

          <div className="flex gap-3">
            <button
              onClick={onCancelar}
              className="flex-1 py-2.5 rounded-lg border border-gray-700 text-gray-400 text-sm transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={enviarPin}
              disabled={enviando}
              className="flex-1 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-medium transition-colors flex items-center justify-center gap-2"
            >
              {enviando
                ? <><Loader2 size={14} className="animate-spin" /> Enviando...</>
                : <><Mail size={14} /> Enviar código</>
              }
            </button>
          </div>
        </div>
      ) : (
        /* Paso 2 — Ingresar PIN */
        <div className="space-y-4">
          <div className="text-center">
            <div className="w-12 h-12 rounded-full bg-emerald-600/20 flex items-center justify-center mx-auto mb-3">
              <CheckCircle2 size={20} className="text-emerald-400" />
            </div>
            <p className="text-sm text-white font-medium">Código enviado</p>
            <p className="text-xs text-gray-500 mt-1">
              Revisa tu correo <span className="text-indigo-400">{email}</span>
            </p>
            <p className="text-xs text-gray-600 mt-1">
            ¿No lo ves? Busca un correo de <strong className="text-gray-400">no-reply@kipu.ec</strong> en tu carpeta de <strong>spam o no deseado</strong>.
            </p>
          </div>

          <div>
            <label className="block text-xs text-gray-500 mb-1.5 text-center">
              Ingresa el código de 6 dígitos
            </label>
            <input
              ref={inputRef}
              type="text"
              value={pin}
              onChange={(e) => {
                const val = e.target.value.replace(/\D/g, "").slice(0, 6);
                setPin(val);
                setError("");
              }}
              onKeyDown={(e) => { if (e.key === "Enter" && pin.length === 6) confirmar(); }}
              placeholder="• • • • • •"
              maxLength={6}
              className="w-full px-4 py-3 rounded-lg bg-gray-800 border border-gray-700 text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500 text-xl text-center tracking-[0.5em] font-mono"
            />
          </div>

          {error && (
            <p className="text-xs text-red-400 bg-red-400/10 px-3 py-2 rounded-lg text-center">{error}</p>
          )}

          {/* Reenviar */}
          <div className="text-center">
            {countdown > 0 ? (
              <p className="text-xs text-gray-500">
                Reenviar en <span className="text-white font-mono">{countdown}s</span>
              </p>
            ) : (
              <button
                onClick={enviarPin}
                disabled={enviando}
                className="flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300 disabled:opacity-50 transition-colors mx-auto"
              >
                {enviando
                  ? <><Loader2 size={12} className="animate-spin" /> Enviando...</>
                  : <><RefreshCw size={12} /> Reenviar código</>
                }
              </button>
            )}
          </div>

          <div className="flex gap-3">
            <button
              onClick={onCancelar}
              className="flex-1 py-2.5 rounded-lg border border-gray-700 text-gray-400 text-sm transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={confirmar}
              disabled={confirmando || pin.length !== 6}
              className="flex-1 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-medium transition-colors flex items-center justify-center gap-2"
            >
              {confirmando
                ? <><Loader2 size={14} className="animate-spin" /> Verificando...</>
                : "Confirmar"
              }
            </button>
          </div>
        </div>
      )}
    </div>
  );
}