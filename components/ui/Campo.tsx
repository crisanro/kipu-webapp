// components/ui/Campo.tsx
// Campo de formulario: etiqueta + control + ayuda + error, ya conectados entre
// sí (htmlFor, aria-describedby, aria-invalid). El control trae el teclado
// correcto según lo que se escribe y, al dedo, letra de 16 px: con menos, iOS
// hace zoom al enfocar.
//
//   <Campo etiqueta="Correo" error={errores.email}>
//     <Entrada teclado="email" value={email} onChange={e => setEmail(e.target.value)} />
//   </Campo>
//   <Campo etiqueta="Precio" ayuda="Sin IVA">
//     <Entrada teclado="decimal" … />
//   </Campo>

"use client";

import { createContext, useContext, useId, type ComponentProps, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { tecladoIdentificacion } from "@/lib/teclado";
import { cn } from "./cn";

interface Contexto { id: string; ayudaId?: string; errorId?: string; invalido: boolean }
const CampoContexto = createContext<Contexto | null>(null);

export interface CampoProps {
  etiqueta:   ReactNode;
  children:   ReactNode;
  ayuda?:     ReactNode;
  /** Texto del error; si hay, el campo se marca inválido y se lee en voz alta. */
  error?:     string | null | false;
  opcional?:  boolean;
  /** Para unir el campo con un control propio que no sea Entrada/Selector/AreaTexto. */
  id?:        string;
  className?: string;
}

export function Campo({ etiqueta, children, ayuda, error, opcional, id, className }: CampoProps) {
  const auto     = useId();
  const base     = id ?? `campo-${auto}`;
  const ayudaId  = ayuda ? `${base}-ayuda` : undefined;
  const errorId  = error ? `${base}-error` : undefined;

  return (
    <CampoContexto.Provider value={{ id: base, ayudaId, errorId, invalido: !!error }}>
      <div className={cn("flex flex-col gap-1.5", className)}>
        <label htmlFor={base} className="text-xs font-medium text-tenue tactil:text-sm">
          {etiqueta}
          {opcional && <span className="font-normal text-sutil"> (opcional)</span>}
        </label>
        {children}
        {ayuda && !error && <p id={ayudaId} className="text-xs text-sutil">{ayuda}</p>}
        {error && <p id={errorId} role="alert" className="text-xs text-peligro">{error}</p>}
      </div>
    </CampoContexto.Provider>
  );
}

/** Props de accesibilidad del Campo que envuelve al control (si hay uno). */
function useConexionCampo(propsId?: string, invalidoPropio?: boolean, descritoPor?: string) {
  const c = useContext(CampoContexto);
  const describe = [c?.errorId ?? c?.ayudaId, descritoPor].filter(Boolean).join(" ") || undefined;
  return {
    id:                 propsId ?? c?.id,
    "aria-invalid":     (invalidoPropio ?? c?.invalido) || undefined,
    "aria-describedby": describe,
  };
}

const CLASES_CONTROL = cn(
  "w-full rounded-lg bg-superficie text-texto border border-borde px-3",
  "text-sm tactil:text-base placeholder:text-sutil",
  "transition-[border-color,box-shadow] duration-(--duracion-rapida) ease-estandar",
  "focus:outline-none focus:border-acento focus:ring-2 focus:ring-acento-suave",
  "aria-invalid:border-peligro aria-invalid:focus:ring-peligro-suave",
  "disabled:opacity-60 disabled:cursor-not-allowed",
);

// ── Entrada ──────────────────────────────────────────────────────────────────

/**
 * Qué se escribe → teclado del celular, autocompletado y corrector.
 * "decimal" usa texto (no type=number): acepta la coma de los teclados en
 * español y la rueda del mouse no cambia el valor.
 */
export type Teclado =
  | "texto" | "nombre" | "numero" | "decimal" | "email" | "telefono" | "buscar" | "url" | "clave"
  | "ruc" | "cedula" | "pasaporte";

const TECLADOS: Record<Teclado, ComponentProps<"input">> = {
  texto:     { type: "text" },
  nombre:    { type: "text", autoCapitalize: "words", autoComplete: "off" },
  numero:    { type: "text", inputMode: "numeric", pattern: "[0-9]*", autoComplete: "off" },
  decimal:   { type: "text", inputMode: "decimal", autoComplete: "off" },
  email:     { type: "email", inputMode: "email", autoCapitalize: "none", autoCorrect: "off", spellCheck: false },
  telefono:  { type: "tel", inputMode: "tel" },
  buscar:    { type: "search", inputMode: "search", enterKeyHint: "search", autoCorrect: "off" },
  url:       { type: "url", inputMode: "url", autoCapitalize: "none", spellCheck: false },
  clave:     { type: "password", autoCapitalize: "none", autoCorrect: "off", spellCheck: false },
  ruc:       { type: "text", inputMode: tecladoIdentificacion("04"), autoComplete: "off" },
  cedula:    { type: "text", inputMode: tecladoIdentificacion("05"), autoComplete: "off" },
  pasaporte: { type: "text", inputMode: tecladoIdentificacion("06"), autoCapitalize: "characters", autoComplete: "off" },
};

export interface EntradaProps extends ComponentProps<"input"> {
  teclado?:   Teclado;
  invalido?:  boolean;
  /** Ícono o texto pegado a la izquierda (p. ej. "$" o una lupa). */
  prefijo?:   ReactNode;
  sufijo?:    ReactNode;
}

export function Entrada({
  teclado = "texto", invalido, prefijo, sufijo, className, id, "aria-describedby": descritoPor, ...resto
}: EntradaProps) {
  const conexion = useConexionCampo(id, invalido, descritoPor);
  const input = (
    <input
      {...TECLADOS[teclado]}
      {...conexion}
      {...resto}
      className={cn(
        CLASES_CONTROL, "h-9 tactil:h-11",
        prefijo && "pl-9", sufijo && "pr-9",
        !prefijo && !sufijo && className,
      )}
    />
  );
  if (!prefijo && !sufijo) return input;
  return (
    <div className={cn("relative", className)}>
      {prefijo && <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sutil inline-flex">{prefijo}</span>}
      {input}
      {sufijo && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sutil inline-flex">{sufijo}</span>}
    </div>
  );
}

// ── Selector ─────────────────────────────────────────────────────────────────

export interface SelectorProps extends ComponentProps<"select"> {
  invalido?: boolean;
}

export function Selector({ invalido, className, id, children, "aria-describedby": descritoPor, ...resto }: SelectorProps) {
  const conexion = useConexionCampo(id, invalido, descritoPor);
  return (
    <div className={cn("relative", className)}>
      <select {...conexion} {...resto} className={cn(CLASES_CONTROL, "h-9 tactil:h-11 appearance-none pr-9")}>
        {children}
      </select>
      <ChevronDown size={16} aria-hidden className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sutil" />
    </div>
  );
}

// ── AreaTexto ────────────────────────────────────────────────────────────────

export interface AreaTextoProps extends ComponentProps<"textarea"> {
  invalido?: boolean;
}

export function AreaTexto({ invalido, className, id, rows = 3, "aria-describedby": descritoPor, ...resto }: AreaTextoProps) {
  const conexion = useConexionCampo(id, invalido, descritoPor);
  return (
    <textarea
      rows={rows}
      {...conexion}
      {...resto}
      className={cn(CLASES_CONTROL, "py-2 min-h-20 resize-y", className)}
    />
  );
}
