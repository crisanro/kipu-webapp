// components/ui/Avisos.tsx
// Mensajes breves (toasts / snackbars) en lugar de window.alert(): no bloquean la
// pantalla y se van solos. En el celular salen abajo al centro, sobre el área
// segura; en la compu, abajo a la derecha.
//
//   const avisos = useAvisos();
//   avisos.exito("Enlace copiado");
//   avisos.error("No se pudo guardar. Intenta de nuevo.");
//   avisos.info("Producto desactivado", { accion: { texto: "Deshacer", alHacer: reactivar } });
//
// Requiere <ProveedorAvisos> (está en app/providers.tsx). Sin él, los errores
// usan alert() y el resto va a la consola.

"use client";

import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { AlertCircle, CheckCircle2, Info, X } from "lucide-react";
import { useEsCliente } from "./Hoja";
import { cn } from "./cn";

type TipoAviso = "exito" | "error" | "info";

export interface OpcionesAviso {
  /** Milisegundos en pantalla. Por defecto 4 s (errores 6 s); 0 = hasta cerrarlo. */
  duracion?: number;
  accion?:   { texto: string; alHacer: () => void };
}

interface Aviso extends OpcionesAviso { id: number; tipo: TipoAviso; mensaje: ReactNode }

export interface ApiAvisos {
  mostrar: (mensaje: ReactNode, opciones?: OpcionesAviso & { tipo?: TipoAviso }) => number;
  exito:   (mensaje: ReactNode, opciones?: OpcionesAviso) => number;
  error:   (mensaje: ReactNode, opciones?: OpcionesAviso) => number;
  info:    (mensaje: ReactNode, opciones?: OpcionesAviso) => number;
  cerrar:  (id: number) => void;
}

const MAXIMO_VISIBLES = 3;
const ICONOS = { exito: CheckCircle2, error: AlertCircle, info: Info } as const;

const Contexto = createContext<ApiAvisos | null>(null);

/** Sin proveedor: no se pierde un error, el resto a la consola. */
const avisosNativos: ApiAvisos = (() => {
  const mostrar: ApiAvisos["mostrar"] = (mensaje, o) => {
    if (o?.tipo === "error") window.alert(String(mensaje));
    else console.info("[aviso]", mensaje);
    return 0;
  };
  return {
    mostrar,
    exito: (m, o) => mostrar(m, { ...o, tipo: "exito" }),
    error: (m, o) => mostrar(m, { ...o, tipo: "error" }),
    info:  (m, o) => mostrar(m, { ...o, tipo: "info" }),
    cerrar: () => {},
  };
})();

export function ProveedorAvisos({ children }: { children: ReactNode }) {
  const esCliente = useEsCliente();
  const [avisos, setAvisos] = useState<Aviso[]>([]);
  const siguienteId = useRef(1);
  const timers      = useRef(new Map<number, ReturnType<typeof setTimeout>>());

  const cerrar = useCallback((id: number) => {
    const t = timers.current.get(id);
    if (t) { clearTimeout(t); timers.current.delete(id); }
    setAvisos(prev => prev.filter(a => a.id !== id));
  }, []);

  const mostrar = useCallback<ApiAvisos["mostrar"]>((mensaje, opciones = {}) => {
    const id   = siguienteId.current++;
    const tipo = opciones.tipo ?? "info";
    const duracion = opciones.duracion ?? (tipo === "error" ? 6000 : 4000);
    setAvisos(prev => [...prev, { ...opciones, id, tipo, mensaje }].slice(-MAXIMO_VISIBLES));
    if (duracion > 0) timers.current.set(id, setTimeout(() => cerrar(id), duracion));
    return id;
  }, [cerrar]);

  const api = useMemo<ApiAvisos>(() => ({
    mostrar,
    exito: (m, o) => mostrar(m, { ...o, tipo: "exito" }),
    error: (m, o) => mostrar(m, { ...o, tipo: "error" }),
    info:  (m, o) => mostrar(m, { ...o, tipo: "info" }),
    cerrar,
  }), [mostrar, cerrar]);

  return (
    <Contexto.Provider value={api}>
      {children}
      {esCliente && createPortal(
        <div
          aria-live="polite"
          className={cn(
            "pointer-events-none fixed inset-x-0 bottom-0 z-(--capa-aviso) flex flex-col items-center gap-2 px-4",
            // --alto-barra-inferior: lo pondrá la barra de pestañas (Fase 2) para no taparla
            "pb-[calc(1rem+var(--sa-bottom)+var(--alto-barra-inferior,0px))]",
            "sm:inset-x-auto sm:right-4 sm:items-end sm:px-0 sm:pb-4",
          )}
        >
          {avisos.map(a => {
            const Icono = ICONOS[a.tipo];
            return (
              <div
                key={a.id}
                role={a.tipo === "error" ? "alert" : "status"}
                className={cn(
                  "pointer-events-auto flex w-full max-w-sm items-center gap-3 rounded-xl px-4 py-3 text-sm",
                  "shadow-(--sombra-flotante) animate-aviso-entra",
                  a.tipo === "error" ? "bg-peligro text-sobre-acento" : "bg-texto text-superficie",
                )}
              >
                <Icono size={18} className="shrink-0" aria-hidden />
                <div className="min-w-0 flex-1">{a.mensaje}</div>
                {a.accion && (
                  <button
                    type="button"
                    onClick={() => { a.accion!.alHacer(); cerrar(a.id); }}
                    className="shrink-0 rounded-md px-2 py-1 font-semibold underline-offset-2 hover:underline active:opacity-70"
                  >
                    {a.accion.texto}
                  </button>
                )}
                <button
                  type="button"
                  aria-label="Cerrar aviso"
                  onClick={() => cerrar(a.id)}
                  className="-mr-1 shrink-0 rounded-md p-1 opacity-70 hover:opacity-100 active:opacity-50"
                >
                  <X size={16} aria-hidden />
                </button>
              </div>
            );
          })}
        </div>,
        document.body,
      )}
    </Contexto.Provider>
  );
}

export function useAvisos(): ApiAvisos {
  return useContext(Contexto) ?? avisosNativos;
}
