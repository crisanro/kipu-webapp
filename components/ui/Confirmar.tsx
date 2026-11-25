// components/ui/Confirmar.tsx
// Reemplazo de window.confirm(): una Hoja propia, con título, texto y la acción
// peligrosa en rojo. Dentro de la app de las tiendas, confirm() sale como un
// diálogo del sistema sin título ni estilo.
//
//   const confirmar = useConfirmar();
//   if (!(await confirmar({ titulo: "¿Desactivar este producto?",
//                           mensaje: "Ya no aparecerá al facturar.",
//                           textoConfirmar: "Desactivar", peligro: true }))) return;
//
// Requiere <ProveedorConfirmar> (está en app/providers.tsx). Sin él, usa confirm().

"use client";

import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from "react";
import Hoja from "./Hoja";
import Boton from "./Boton";

export interface OpcionesConfirmar {
  titulo:          string;
  mensaje?:        ReactNode;
  textoConfirmar?: string;
  textoCancelar?:  string;
  /** Acción que no se puede deshacer: botón rojo y el foco empieza en Cancelar. */
  peligro?:        boolean;
}

type Confirmar = (opciones: OpcionesConfirmar | string) => Promise<boolean>;

const Contexto = createContext<Confirmar | null>(null);

const normalizar = (o: OpcionesConfirmar | string): OpcionesConfirmar =>
  typeof o === "string" ? { titulo: o } : o;

/** Sin proveedor: el confirm() del navegador, para no romper nada. */
const confirmarNativo: Confirmar = async (o) => {
  const { titulo, mensaje } = normalizar(o);
  return window.confirm(typeof mensaje === "string" ? `${titulo}\n\n${mensaje}` : titulo);
};

export function ProveedorConfirmar({ children }: { children: ReactNode }) {
  const [opciones, setOpciones] = useState<OpcionesConfirmar | null>(null);
  const [abierta, setAbierta]   = useState(false);
  const resolver = useRef<((ok: boolean) => void) | null>(null);

  const confirmar = useCallback<Confirmar>((o) => new Promise<boolean>((resolve) => {
    resolver.current?.(false);           // si había otra pendiente, se da por cancelada
    resolver.current = resolve;
    setOpciones(normalizar(o));
    setAbierta(true);
  }), []);

  const responder = (ok: boolean) => {
    const r = resolver.current;
    if (!r) return;                       // doble toque: solo cuenta el primero
    resolver.current = null;
    setAbierta(false);
    r(ok);
  };

  const peligro = !!opciones?.peligro;

  return (
    <Contexto.Provider value={confirmar}>
      {children}
      <Hoja
        abierta={abierta}
        onCerrar={() => responder(false)}
        titulo={opciones?.titulo ?? ""}
        tamano="sm"
        pie={
          <>
            <Boton variante="secundario" onClick={() => responder(false)} data-autofocus={peligro || undefined}>
              {opciones?.textoCancelar ?? "Cancelar"}
            </Boton>
            <Boton variante={peligro ? "peligro" : "principal"} onClick={() => responder(true)}
                   data-autofocus={!peligro || undefined}>
              {opciones?.textoConfirmar ?? "Aceptar"}
            </Boton>
          </>
        }
      >
        {opciones?.mensaje && <div className="text-sm text-tenue">{opciones.mensaje}</div>}
      </Hoja>
    </Contexto.Provider>
  );
}

export function useConfirmar(): Confirmar {
  return useContext(Contexto) ?? confirmarNativo;
}
