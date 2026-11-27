"use client";

// Modo seguro del panel admin.
//
// Las acciones de soporte que dan acceso a cuentas ajenas (enlace de contraseña,
// cambiar o verificar correos, ver la clave del SRI, dar planes o créditos) piden,
// además de la sesión, un PIN que llega al correo de quien las hace. El backend
// responde 403 "MODO_SEGURO_REQUERIDO"; esta hoja pide el PIN, abre el modo
// seguro (15 minutos) y repite la acción sola.
//
// Uso:
//   const { conModoSeguro, hojaModoSeguro } = useModoSeguro();
//   await conModoSeguro(() => api.post("/api/v1/admin/panel/topup", datos));
//   ...
//   return <>{hojaModoSeguro} ...</>;

import { useCallback, useRef, useState } from "react";
import api from "@/lib/api";
import Hoja from "@/components/ui/Hoja";
import PinInput from "@/components/PinInput";
import { useAuthStore } from "@/store/auth.store";

export const MODO_SEGURO_REQUERIDO = "MODO_SEGURO_REQUERIDO";

function pideModoSeguro(err: unknown): boolean {
  const r = (err as { response?: { status?: number; data?: { detail?: unknown } } })?.response;
  return r?.status === 403 && r.data?.detail === MODO_SEGURO_REQUERIDO;
}

// Mismo formato que un error de axios: las páginas lo muestran con detalleError()
function errorSinPin(): Error {
  return Object.assign(new Error("Falta el PIN del modo seguro."), {
    response: { status: 403, data: { detail: "Para hacer esto necesitas confirmar con el PIN que te enviamos al correo." } },
  });
}

export function useModoSeguro() {
  const email = useAuthStore(s => s.email) ?? "";
  const [abierta, setAbierta] = useState(false);
  const responder = useRef<((ok: boolean) => void) | null>(null);

  const cerrar = useCallback((ok: boolean) => {
    setAbierta(false);
    responder.current?.(ok);
    responder.current = null;
  }, []);

  const pedirPin = useCallback(() => new Promise<boolean>(resolver => {
    responder.current?.(false);   // si había otra esperando, se cancela
    responder.current = resolver;
    setAbierta(true);
  }), []);

  /** Hace la acción; si el backend pide el modo seguro, pide el PIN y la repite una vez. */
  const conModoSeguro = useCallback(async <T,>(accion: () => Promise<T>): Promise<T> => {
    try {
      return await accion();
    } catch (err) {
      if (!pideModoSeguro(err)) throw err;
      if (!(await pedirPin())) throw errorSinPin();
      return await accion();
    }
  }, [pedirPin]);

  const hojaModoSeguro = (
    <Hoja
      abierta={abierta}
      onCerrar={() => cerrar(false)}
      titulo="Modo seguro"
      descripcion="Esta acción da acceso a la cuenta de un cliente. Confírmala con el código que te enviamos al correo: el modo seguro queda activo 15 minutos."
    >
      {abierta && (
        <PinInput
          tipoAccion="MODO_SEGURO"
          email={email}
          label="entrar al modo seguro"
          onConfirmar={async pin => {
            await api.post("/api/v1/admin/panel/modo-seguro", { pin });
            cerrar(true);
          }}
          onCancelar={() => cerrar(false)}
        />
      )}
    </Hoja>
  );

  return { conModoSeguro, hojaModoSeguro };
}
