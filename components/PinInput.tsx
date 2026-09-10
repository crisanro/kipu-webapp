"use client";

import { useState, useEffect, useRef } from "react";
import api from "@/lib/api";
import { Mail, CheckCircle2, RefreshCw } from "lucide-react";

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
          if (timerRef.current) clearInterval(timerRef.current);
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
          <div
            className="w-12 h-12 rounded-full flex items-center justify-center mx-auto"
            style={{ background: "color-mix(in srgb, var(--kipu-accent) 20%, transparent)" }}
          >
            <Mail size={20} style={{ color: "var(--kipu-accent)" }} />
          </div>
          <div>
            <p className="text-sm font-medium" style={{ color: "var(--kipu-text)" }}>Verificación por email</p>
            <p className="text-xs mt-1" style={{ color: "var(--kipu-subtle)" }}>
              {label
                ? `Para ${label}, necesitamos verificar tu identidad.`
                : "Necesitamos verificar tu identidad."
              }
            </p>
            <p className="text-xs mt-1" style={{ color: "var(--kipu-accent)" }}>{email}</p>
          </div>

          {error && (
            <p
              className="text-xs px-3 py-2 rounded-lg"
              style={{
                color: "var(--kipu-danger)",
                background: "color-mix(in srgb, var(--kipu-danger) 10%, transparent)",
              }}
            >
              {error}
            </p>
          )}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onCancelar}
              className="flex-1 py-2.5 rounded-lg text-sm transition-colors"
              style={{
                border: "1px solid var(--kipu-border)",
                color: "var(--kipu-muted)",
              }}
              onMouseEnter={e => e.currentTarget.style.color = "var(--kipu-text)"}
              onMouseLeave={e => e.currentTarget.style.color = "var(--kipu-muted)"}
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={enviarPin}
              disabled={enviando}
              className="flex-1 py-2.5 rounded-lg text-white text-sm font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
              style={{ background: "var(--kipu-accent)" }}
              onMouseEnter={e => {
                if (!enviando) e.currentTarget.style.background = "var(--kipu-accent-h)";
              }}
              onMouseLeave={e => {
                if (!enviando) e.currentTarget.style.background = "var(--kipu-accent)";
              }}
            >
              {enviando ? (
                <>
                  <div
                    className="w-3.5 h-3.5 border-2 border-t-transparent rounded-full animate-spin"
                    style={{ borderColor: "#FFFFFF", borderTopColor: "transparent" }}
                  />
                  Enviando...
                </>
              ) : (
                <>
                  <Mail size={14} /> Enviar código
                </>
              )}
            </button>
          </div>
        </div>
      ) : (
        /* Paso 2 — Ingresar PIN */
        <div className="space-y-4">
          <div className="text-center">
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3"
              style={{ background: "color-mix(in srgb, var(--kipu-success) 20%, transparent)" }}
            >
              <CheckCircle2 size={20} style={{ color: "var(--kipu-success)" }} />
            </div>
            <p className="text-sm font-medium" style={{ color: "var(--kipu-text)" }}>Código enviado</p>
            <p className="text-xs mt-1" style={{ color: "var(--kipu-subtle)" }}>
              Revisa tu correo <span style={{ color: "var(--kipu-accent)" }}>{email}</span>
            </p>
            <p className="text-xs mt-1" style={{ color: "var(--kipu-subtle)" }}>
              ¿No lo ves? Busca un correo de <strong style={{ color: "var(--kipu-muted)" }}>no-reply@kipu.ec</strong> en tu carpeta de <strong>spam o no deseado</strong>.
            </p>
          </div>

          <div>
            <label className="block text-xs mb-1.5 text-center" style={{ color: "var(--kipu-subtle)" }}>
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
              className="w-full px-4 py-3 rounded-lg text-xl text-center tracking-[0.5em] font-mono transition-colors focus:outline-none"
              style={{
                background: "var(--kipu-surface)",
                border: "1px solid var(--kipu-border)",
                color: "var(--kipu-text)",
              }}
              onFocus={e => e.currentTarget.style.borderColor = "var(--kipu-accent)"}
              onBlur={e => e.currentTarget.style.borderColor = "var(--kipu-border)"}
            />
          </div>

          {error && (
            <p
              className="text-xs px-3 py-2 rounded-lg text-center"
              style={{
                color: "var(--kipu-danger)",
                background: "color-mix(in srgb, var(--kipu-danger) 10%, transparent)",
              }}
            >
              {error}
            </p>
          )}

          {/* Reenviar */}
          <div className="text-center">
            {countdown > 0 ? (
              <p className="text-xs" style={{ color: "var(--kipu-subtle)" }}>
                Reenviar en <span className="font-mono" style={{ color: "var(--kipu-text)" }}>{countdown}s</span>
              </p>
            ) : (
              <button
                type="button"
                onClick={enviarPin}
                disabled={enviando}
                className="flex items-center gap-1.5 text-xs disabled:opacity-50 transition-colors mx-auto"
                style={{ color: "var(--kipu-accent)" }}
                onMouseEnter={e => {
                  if (!enviando) e.currentTarget.style.color = "var(--kipu-accent-h)";
                }}
                onMouseLeave={e => {
                  if (!enviando) e.currentTarget.style.color = "var(--kipu-accent)";
                }}
              >
                {enviando ? (
                  <>
                    <div
                      className="w-3 h-3 border-2 border-t-transparent rounded-full animate-spin"
                      style={{ borderColor: "currentColor", borderTopColor: "transparent" }}
                    />
                    Enviando...
                  </>
                ) : (
                  <>
                    <RefreshCw size={12} /> Reenviar código
                  </>
                )}
              </button>
            )}
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onCancelar}
              className="flex-1 py-2.5 rounded-lg text-sm transition-colors"
              style={{
                border: "1px solid var(--kipu-border)",
                color: "var(--kipu-muted)",
              }}
              onMouseEnter={e => e.currentTarget.style.color = "var(--kipu-text)"}
              onMouseLeave={e => e.currentTarget.style.color = "var(--kipu-muted)"}
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={confirmar}
              disabled={confirmando || pin.length !== 6}
              className="flex-1 py-2.5 rounded-lg text-white text-sm font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
              style={{ background: "var(--kipu-accent)" }}
              onMouseEnter={e => {
                if (!confirmando && pin.length === 6) e.currentTarget.style.background = "var(--kipu-accent-h)";
              }}
              onMouseLeave={e => {
                if (!confirmando && pin.length === 6) e.currentTarget.style.background = "var(--kipu-accent)";
              }}
            >
              {confirmando ? (
                <>
                  <div
                    className="w-3.5 h-3.5 border-2 border-t-transparent rounded-full animate-spin"
                    style={{ borderColor: "#FFFFFF", borderTopColor: "transparent" }}
                  />
                  Verificando...
                </>
              ) : (
                "Confirmar"
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}