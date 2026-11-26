"use client";

import { useEffect, useRef, useState } from "react";

// Captcha de Cloudflare Turnstile. Sin NEXT_PUBLIC_TURNSTILE_SITE_KEY no se muestra
// nada (y el backend no lo pide mientras TURNSTILE_EN_REGISTRO esté apagado).
const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
export const TURNSTILE_ACTIVO = !!SITE_KEY;

interface TurnstileApi {
  render: (el: HTMLElement, opciones: Record<string, unknown>) => string;
  remove: (id: string) => void;
}
declare global {
  interface Window { turnstile?: TurnstileApi }
}

let carga: Promise<void> | null = null;
function cargarScript(): Promise<void> {
  if (window.turnstile) return Promise.resolve();
  if (carga) return carga;
  carga = new Promise((resolver, fallar) => {
    const s = document.createElement("script");
    s.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
    s.async = true;
    s.onload = () => resolver();
    s.onerror = () => { carga = null; fallar(new Error("turnstile")); };
    document.head.appendChild(s);
  });
  return carga;
}

/**
 * El captcha de un formulario: `widget` va donde se muestra; antes de enviar,
 * `if (captcha.falta) …`; se manda `captcha.token` y, si el envío falla,
 * `captcha.renovar()` (cada token sirve una sola vez).
 */
export function useCaptcha() {
  const [token,   setToken]   = useState<string | null>(null);
  const [intento, setIntento] = useState(0);
  return {
    token,
    falta:   TURNSTILE_ACTIVO && !token,
    renovar: () => { setToken(null); setIntento(n => n + 1); },
    widget:  <Turnstile key={intento} onToken={setToken} />,
  };
}

export const FALTA_CAPTCHA = "Completa la verificación de seguridad.";

/**
 * Cada token sirve una sola vez: después de enviar (aunque falle), el padre debe
 * volver a montar el componente con otra `key` para obtener uno nuevo (useCaptcha).
 */
export default function Turnstile({ onToken }: { onToken: (token: string | null) => void }) {
  const caja = useRef<HTMLDivElement>(null);
  const onTokenRef = useRef(onToken);
  useEffect(() => { onTokenRef.current = onToken; });
  const [fallo, setFallo] = useState(false);

  useEffect(() => {
    if (!SITE_KEY) return;
    let vivo = true;
    let id: string | undefined;
    cargarScript()
      .then(() => {
        if (!vivo || !caja.current || !window.turnstile) return;
        id = window.turnstile.render(caja.current, {
          sitekey: SITE_KEY,
          language: "es",
          theme: "auto",
          callback:           (t: string) => onTokenRef.current(t),
          "expired-callback": () => onTokenRef.current(null),
          "error-callback":   () => onTokenRef.current(null),
        });
      })
      .catch(() => { if (vivo) setFallo(true); });
    return () => {
      vivo = false;
      if (id && window.turnstile) window.turnstile.remove(id);
    };
  }, []);

  if (!SITE_KEY) return null;
  return (
    <div className="flex flex-col items-center gap-1">
      <div ref={caja} />
      {fallo && (
        <p className="text-xs text-center text-peligro">
          No se pudo cargar la verificación de seguridad. Revisa tu conexión y recarga la página.
        </p>
      )}
    </div>
  );
}
