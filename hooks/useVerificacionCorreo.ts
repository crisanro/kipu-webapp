"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { auth } from "@/lib/firebase";
import api from "@/lib/api";

// Igual que ESPERA_REENVIO_SEG en el backend (app/api/v1/app/auth.py)
export const ESPERA_REENVIO = 60;

const REVISAR_CADA_MS  = 5000;           // mientras espera que abra el enlace
const REVISAR_DURANTE  = 15 * 60 * 1000; // luego solo al volver a la pestaña

interface ErrorApi { response?: { status?: number; data?: { detail?: unknown } } }

function leerError(e: unknown): { status?: number; detalle: string } {
  const r = (e as ErrorApi)?.response;
  const d = r?.data?.detail;
  return { status: r?.status, detalle: typeof d === "string" ? d : "" };
}

function segundosEn(texto: string): number | null {
  const m = texto.match(/(\d+)\s*segundo/i);
  return m ? Number(m[1]) : null;
}

/**
 * Verificación del correo de la cuenta. Nada se envía solo: `enviar()` manda el
 * enlace y deja una cuenta regresiva de 60 s para reenviar. Mientras haya un
 * enlace enviado, revisa cada pocos segundos si ya lo abrió (en este u otro
 * dispositivo) y llama a `alVerificar`.
 */
export function useVerificacionCorreo(alVerificar?: () => void) {
  const [verificado,  setVerificado]  = useState(() => auth.currentUser?.emailVerified ?? false);
  const [cargando,    setCargando]    = useState(() => !(auth.currentUser?.emailVerified ?? false));
  const [enviado,     setEnviado]     = useState(false);
  const [enviando,    setEnviando]    = useState(false);
  const [comprobando, setComprobando] = useState(false);
  const [error,       setError]       = useState("");
  const [aviso,       setAviso]       = useState("");
  const [hasta,       setHasta]       = useState(0);
  const [ahora,       setAhora]       = useState(0);

  const alVerificarRef = useRef(alVerificar);
  useEffect(() => { alVerificarRef.current = alVerificar; });

  const espera = Math.max(0, Math.ceil((hasta - ahora) / 1000));

  const iniciarEspera = useCallback((segundos: number) => {
    const t = Date.now();
    setAhora(t);
    setHasta(t + segundos * 1000);
  }, []);

  useEffect(() => {
    if (!hasta) return;
    const id = setInterval(() => {
      const t = Date.now();
      setAhora(t);
      if (t >= hasta) clearInterval(id);
    }, 1000);
    return () => clearInterval(id);
  }, [hasta]);

  const marcarVerificado = useCallback(async () => {
    // Token nuevo: el anterior todavía dice email_verified = false
    try {
      const token = await auth.currentUser?.getIdToken(true);
      if (token) localStorage.setItem("kipu-ext-token", token);
    } catch {}
    setVerificado(true);
    setAviso("");
    setError("");
    alVerificarRef.current?.();
  }, []);

  const revisar = useCallback(async (manual: boolean): Promise<boolean> => {
    const user = auth.currentUser;
    if (!user) return false;
    if (manual) { setComprobando(true); setAviso(""); }
    try {
      await user.reload();
      if (auth.currentUser?.emailVerified) {
        await marcarVerificado();
        return true;
      }
      if (manual) setAviso("Todavía no aparece verificado. Abre el enlace del correo y vuelve a esta pantalla.");
    } catch {
      if (manual) setAviso("No pudimos comprobarlo. Revisa tu conexión e intenta de nuevo.");
    } finally {
      if (manual) setComprobando(false);
    }
    return false;
  }, [marcarVerificado]);

  // Al abrir: ¿ya lo verificó (quizá desde el enlace) o hay un envío reciente?
  useEffect(() => {
    if (verificado) return;
    let vivo = true;
    (async () => {
      if (await revisar(false)) return;
      try {
        const r = await api.get("/api/v1/app/auth/verification-status");
        if (!vivo) return;
        if (r.data?.verificado) {
          await marcarVerificado();
        } else {
          if (r.data?.enviado_at) setEnviado(true);
          const s = Number(r.data?.espera_segundos) || 0;
          if (s > 0) iniciarEspera(s);
        }
      } catch {
        // Backend anterior sin este endpoint: simplemente se ofrece enviar
      } finally {
        if (vivo) setCargando(false);
      }
    })();
    return () => { vivo = false; };
  }, [verificado, revisar, marcarVerificado, iniciarEspera]);

  // Con un enlace enviado: revisar solo hasta que lo abra
  useEffect(() => {
    if (verificado || !enviado) return;
    const desde = Date.now();
    const tick = () => {
      if (document.visibilityState === "visible" && Date.now() - desde < REVISAR_DURANTE) void revisar(false);
    };
    const alVolver = () => { if (document.visibilityState === "visible") void revisar(false); };
    const id = setInterval(tick, REVISAR_CADA_MS);
    window.addEventListener("focus", alVolver);
    document.addEventListener("visibilitychange", alVolver);
    return () => {
      clearInterval(id);
      window.removeEventListener("focus", alVolver);
      document.removeEventListener("visibilitychange", alVolver);
    };
  }, [verificado, enviado, revisar]);

  const enviar = useCallback(async () => {
    if (enviando) return;
    setEnviando(true);
    setError("");
    setAviso("");
    try {
      const r = await api.post("/api/v1/app/auth/send-verification");
      setEnviado(true);
      iniciarEspera(Number(r.data?.espera_segundos) || ESPERA_REENVIO);
    } catch (e: unknown) {
      const { status, detalle } = leerError(e);
      if (status === 429) {
        if (/enviamos/i.test(detalle)) setEnviado(true);
        iniciarEspera(segundosEn(detalle) ?? ESPERA_REENVIO);
      } else if (/ya fue verificado/i.test(detalle)) {
        await marcarVerificado();
      } else {
        setError(detalle || "No pudimos enviar el correo. Intenta de nuevo en unos minutos.");
      }
    } finally {
      setEnviando(false);
    }
  }, [enviando, iniciarEspera, marcarVerificado]);

  const comprobar = useCallback(() => revisar(true), [revisar]);

  return { verificado, cargando, enviado, enviando, comprobando, espera, error, aviso, enviar, comprobar };
}
