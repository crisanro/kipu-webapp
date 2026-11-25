// app/(dashboard)/documentos/emitir/components/useEmision.ts
// El envío de un comprobante, igual para todas las pantallas de emitir (FAC,
// NCR, NDB, LIQ, RET y el link de cobro): la clave anti-duplicados (lib/emision.ts),
// el estado de envío, el error para el usuario, el uso justo y el resultado.
//
//   const em = useEmision();
//   const r = await em.enviar("/api/v1/app/documentos/emit/FAC", payload, {
//     tipo: "FAC", porDefecto: "Error al emitir la factura.",
//   });
//   if (r) em.setResultado(r);
//
// Las validaciones propias de cada comprobante quedan en su pantalla: si algo
// falta, `em.setError("…")` y no se envía.

"use client";

import { useCallback, useRef, useState } from "react";
import { v4 as uuidv4 } from "uuid";
import api from "@/lib/api";
import { anotarEnvio, claveParaEnviar, esUsoJusto, mensajeErrorEmision } from "@/lib/emision";

export interface OpcionesEnvio {
  /** Distingue la clave guardada por endpoint: "FAC", "FAC-COBRO", "NCR", "NDB", "LIQ", "RET". */
  tipo:       string;
  /** Mensaje si el error no trae uno propio. */
  porDefecto: string;
}

// La respuesta cambia según el comprobante; cada pantalla puede tiparla con <R>
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useEmision<R = any>() {
  // La clave se renueva solo cuando seguro no se emitió nada (lib/emision.ts)
  const clave = useRef(uuidv4());
  const [enviando,  setEnviando]  = useState(false);
  const [error,     setError]     = useState("");
  const [usoJusto,  setUsoJusto]  = useState("");      // mensaje del uso justo (para ofrecer cómo seguir)
  const [resultado, setResultado] = useState<R | null>(null);

  /** Envía el comprobante. Devuelve la respuesta, o null si falló (el error queda en `error`). */
  const enviar = useCallback(async <T = R>(url: string, payload: unknown, { tipo, porDefecto }: OpcionesEnvio): Promise<T | null> => {
    setError("");
    setUsoJusto("");
    setEnviando(true);
    try {
      const res = await api.post(url, payload, {
        headers: { "X-Idempotency-Key": claveParaEnviar(clave, tipo, payload) },
      });
      anotarEnvio(clave, tipo);
      return res.data as T;
    } catch (err: unknown) {
      // Solo con un rechazo definitivo se usa otra clave; ante timeout, red, 5xx
      // o 409 se reintenta con la misma (aunque la app se recargue)
      anotarEnvio(clave, tipo, err);
      const mensaje = mensajeErrorEmision(err, porDefecto);
      setError(mensaje);
      setUsoJusto(esUsoJusto(err) ? mensaje : "");
      return null;
    } finally {
      setEnviando(false);
    }
  }, []);

  /** Para empezar otro comprobante: clave nueva y sin resultado ni error. */
  const reiniciar = useCallback(() => {
    clave.current = uuidv4();
    setResultado(null);
    setError("");
    setUsoJusto("");
  }, []);

  return {
    enviando, error, setError,
    /** true si `error` es el del uso justo (la pantalla ofrece cómo seguir). */
    esUsoJusto: !!usoJusto && usoJusto === error,
    resultado, setResultado,
    enviar, reiniciar,
  };
}
