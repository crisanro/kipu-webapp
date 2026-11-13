"use client";

import { useEffect } from "react";
import { CheckCircle2, Loader2, Mail, MailCheck, RefreshCw } from "lucide-react";
import { auth } from "@/lib/firebase";
import { useVerificacionCorreo } from "@/hooks/useVerificacionCorreo";

interface Props {
  onVerificado:      () => void;
  onCambiarCorreo?:  () => void;
}

/**
 * Paso obligatorio antes de crear o unirse a una empresa. El correo no se
 * envía solo: la persona lo pide con el botón, así sabe que le llegó algo.
 */
export default function VerificarCorreo({ onVerificado, onCambiarCorreo }: Props) {
  const v = useVerificacionCorreo();
  const email = auth.currentUser?.email ?? "";

  // Pequeña pausa para que vea el "¡Correo verificado!" antes de avanzar
  useEffect(() => {
    if (!v.verificado) return;
    const id = setTimeout(onVerificado, 1200);
    return () => clearTimeout(id);
  }, [v.verificado, onVerificado]);

  const caja = {
    background: "var(--kipu-surface)",
    border:     "1px solid var(--kipu-border)",
  };

  if (v.cargando) {
    return (
      <div className="rounded-xl p-6 flex justify-center" style={caja}>
        <Loader2 size={20} className="animate-spin" style={{ color: "var(--kipu-subtle)" }} />
      </div>
    );
  }

  if (v.verificado) {
    return (
      <div className="rounded-xl p-6 text-center" style={caja}>
        <CheckCircle2 size={36} className="mx-auto mb-3" style={{ color: "var(--kipu-success)" }} />
        <p className="font-semibold" style={{ color: "var(--kipu-text)" }}>¡Correo verificado!</p>
        <p className="text-sm mt-1" style={{ color: "var(--kipu-muted)" }}>Continuemos con tu empresa…</p>
      </div>
    );
  }

  const textoReenviar = v.enviando
    ? "Enviando..."
    : v.espera > 0
      ? `Reenviar en ${v.espera} s`
      : "Reenviar correo";

  return (
    <div className="rounded-xl p-5" style={caja}>
      <div
        className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3"
        style={{ background: "color-mix(in srgb, var(--kipu-accent) 12%, transparent)" }}
      >
        {v.enviado
          ? <MailCheck size={22} style={{ color: "var(--kipu-accent)" }} />
          : <Mail size={22} style={{ color: "var(--kipu-accent)" }} />}
      </div>

      <h2 className="text-center font-semibold" style={{ color: "var(--kipu-text)" }}>
        {v.enviado ? "Revisa tu correo" : "Verifica tu correo electrónico"}
      </h2>

      {!v.enviado ? (
        <p className="text-sm text-center mt-2" style={{ color: "var(--kipu-muted)" }}>
          Antes de configurar tu empresa necesitamos confirmar que este correo es tuyo:
          <br />
          <strong className="break-all" style={{ color: "var(--kipu-text)" }}>{email}</strong>
        </p>
      ) : (
        <div className="text-sm text-center mt-2 space-y-2" style={{ color: "var(--kipu-muted)" }}>
          <p>
            Te enviamos un enlace a{" "}
            <strong className="break-all" style={{ color: "var(--kipu-text)" }}>{email}</strong>.
            Ábrelo y esta pantalla avanzará sola.
          </p>
          <p className="text-xs" style={{ color: "var(--kipu-subtle)" }}>
            ¿No lo ves? Revisa las carpetas de Spam o Promociones.
          </p>
        </div>
      )}

      {v.error && (
        <p
          className="text-xs px-3 py-2 rounded-lg mt-4"
          style={{ color: "var(--kipu-danger)", background: "color-mix(in srgb, var(--kipu-danger) 10%, transparent)" }}
        >
          {v.error}
        </p>
      )}
      {v.aviso && (
        <p
          className="text-xs px-3 py-2 rounded-lg mt-4"
          style={{ color: "var(--kipu-warning)", background: "color-mix(in srgb, var(--kipu-warning) 10%, transparent)" }}
        >
          {v.aviso}
        </p>
      )}

      <div className="mt-5 space-y-2">
        {!v.enviado ? (
          <button
            type="button"
            onClick={v.enviar}
            disabled={v.enviando || v.espera > 0}
            className="w-full py-2.5 rounded-lg font-medium text-sm flex items-center justify-center gap-2 disabled:opacity-50"
            style={{ background: "var(--kipu-accent)", color: "#ffffff" }}
          >
            {v.enviando
              ? <><Loader2 size={15} className="animate-spin" /> Enviando...</>
              : v.espera > 0
                ? `Enviar en ${v.espera} s`
                : <><Mail size={15} /> Enviar correo de verificación</>}
          </button>
        ) : (
          <>
            <button
              type="button"
              onClick={v.comprobar}
              disabled={v.comprobando}
              className="w-full py-2.5 rounded-lg font-medium text-sm flex items-center justify-center gap-2 disabled:opacity-50"
              style={{ background: "var(--kipu-accent)", color: "#ffffff" }}
            >
              {v.comprobando
                ? <><Loader2 size={15} className="animate-spin" /> Comprobando...</>
                : <><CheckCircle2 size={15} /> Ya verifiqué mi correo</>}
            </button>
            <button
              type="button"
              onClick={v.enviar}
              disabled={v.enviando || v.espera > 0}
              className="w-full py-2.5 rounded-lg text-sm flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ border: "1px solid var(--kipu-border)", color: "var(--kipu-muted)" }}
            >
              <RefreshCw size={14} className={v.enviando ? "animate-spin" : ""} />
              {textoReenviar}
            </button>
          </>
        )}
      </div>

      {onCambiarCorreo && (
        <p className="text-xs text-center mt-4" style={{ color: "var(--kipu-subtle)" }}>
          ¿Te equivocaste de correo?{" "}
          <button type="button" onClick={onCambiarCorreo} className="underline" style={{ color: "var(--kipu-accent)" }}>
            Regístrate de nuevo
          </button>
        </p>
      )}
    </div>
  );
}
