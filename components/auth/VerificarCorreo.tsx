"use client";

import { useEffect } from "react";
import { CheckCircle2, Loader2, Mail, MailCheck, MessageCircle, RefreshCw } from "lucide-react";
import { auth } from "@/lib/firebase";
import { enlaceWhatsAppFalla } from "@/lib/soporte";
import { useVerificacionCorreo } from "@/hooks/useVerificacionCorreo";
import Boton from "@/components/ui/Boton";

// Remitente de los correos de cuenta (SMTP_FROM del backend)
const REMITENTE = "no-reply@kipu.ec";

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

  if (v.cargando) {
    return (
      <div className="flex justify-center rounded-xl border border-borde bg-superficie p-6">
        <Loader2 size={20} className="animate-spin text-sutil" aria-label="Cargando" />
      </div>
    );
  }

  if (v.verificado) {
    return (
      <div className="rounded-xl border border-borde bg-superficie p-6 text-center" role="status">
        <CheckCircle2 size={36} className="mx-auto mb-3 text-exito" aria-hidden />
        <p className="font-semibold text-texto">¡Correo verificado!</p>
        <p className="mt-1 text-sm text-tenue">Continuemos con tu empresa…</p>
      </div>
    );
  }

  const textoReenviar = v.enviando
    ? "Enviando…"
    : v.espera > 0
      ? `Reenviar en ${v.espera} s`
      : "Reenviar correo";

  return (
    <div className="rounded-xl border border-borde bg-superficie p-5">
      <span className="mx-auto mb-3 flex size-12 items-center justify-center rounded-full bg-acento-suave text-acento">
        {v.enviado ? <MailCheck size={22} aria-hidden /> : <Mail size={22} aria-hidden />}
      </span>

      <h2 className="text-center font-semibold text-texto">
        {v.enviado ? "Revisa tu correo" : "Verifica tu correo electrónico"}
      </h2>

      {!v.enviado ? (
        <p className="mt-2 text-center text-sm text-tenue">
          Antes de configurar tu empresa necesitamos confirmar que este correo es tuyo:
          <strong className="mt-1 block break-all text-texto">{email}</strong>
          <span className="mt-2 block text-xs text-sutil">Te llegará desde {REMITENTE}.</span>
        </p>
      ) : (
        <div className="mt-2 space-y-2 text-center text-sm text-tenue">
          <p>
            Te enviamos un enlace a <strong className="break-all text-texto">{email}</strong>.
            Ábrelo y esta pantalla avanzará sola.
          </p>
          <div className="space-y-1 rounded-lg bg-presionado px-3 py-2.5 text-left text-xs">
            <p>
              Busca un correo de <strong className="text-texto">Kipu</strong>{" "}
              <span className="break-all">&lt;{REMITENTE}&gt;</span> con el asunto{" "}
              <strong className="text-texto">“Verifica tu correo en Kipu”</strong>.
            </p>
            <p>¿No lo ves? Revisa las carpetas de Spam o Promociones y márcalo como “No es spam”.</p>
          </div>
        </div>
      )}

      {v.error && (
        <p className="mt-4 rounded-lg bg-peligro-suave px-3 py-2 text-xs text-peligro-texto" role="alert">{v.error}</p>
      )}
      {v.aviso && (
        <p className="mt-4 rounded-lg bg-alerta-suave px-3 py-2 text-xs text-alerta-texto" role="status">{v.aviso}</p>
      )}

      <div className="mt-5 space-y-2">
        {!v.enviado ? (
          <Boton anchoCompleto tamano="lg" onClick={v.enviar} cargando={v.enviando}
                 disabled={v.espera > 0} icono={<Mail size={16} />}>
            {v.enviando ? "Enviando…" : v.espera > 0 ? `Enviar en ${v.espera} s` : "Enviar correo de verificación"}
          </Boton>
        ) : (
          <>
            <Boton anchoCompleto tamano="lg" onClick={v.comprobar} cargando={v.comprobando}
                   icono={<CheckCircle2 size={16} />}>
              {v.comprobando ? "Comprobando…" : "Ya verifiqué mi correo"}
            </Boton>
            <Boton anchoCompleto variante="secundario" onClick={v.enviar} disabled={v.enviando || v.espera > 0}
                   icono={<RefreshCw size={14} className={v.enviando ? "animate-spin" : ""} />}>
              {textoReenviar}
            </Boton>
          </>
        )}
      </div>

      {/* Falla que bloquea: se atiende a todos (lib/soporte.ts). Solo después de
          pedir el correo, para que primero revise spam y reenvíe */}
      {(v.enviado || v.error) && (
        <p className="mt-4 text-center text-xs text-sutil">
          ¿Sigue sin llegar?{" "}
          <a
            href={enlaceWhatsAppFalla("Hola, no me llega el correo de verificación de Kipu.", email)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-acento underline underline-offset-2"
          >
            <MessageCircle size={12} aria-hidden /> Escríbenos por WhatsApp
          </a>
        </p>
      )}

      {onCambiarCorreo && (
        <p className="mt-4 text-center text-xs text-sutil">
          ¿Te equivocaste de correo?{" "}
          <button type="button" onClick={onCambiarCorreo} className="text-acento underline underline-offset-2">
            Regístrate de nuevo
          </button>
        </p>
      )}
    </div>
  );
}
