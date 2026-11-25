// app/(dashboard)/documentos/emitir/components/EmisionLayout.tsx
// El esqueleto de toda pantalla de emitir:
//   - Encabezado: en el celular el título ya está en la barra superior, aquí
//     solo la empresa y el ambiente; en la compu, el título también.
//   - Compu: el formulario a la izquierda y el panel (punto de emisión, totales,
//     botón) a la derecha, como antes.
//   - Celular: el panel queda al final del formulario y abajo hay una BARRA FIJA
//     con el total y el botón, siempre a mano del pulgar. Mientras se escribe se
//     esconde: el teclado la taparía (igual que en las apps nativas).
//
//   <EmisionLayout titulo="Nueva factura" subtitulo="Mi empresa · Producción"
//     lateral={<ResumenTotales … conBarraFija />}
//     barra={{ total, texto: "Emitir", onEmitir, enviando, deshabilitado, error }}>
//     …formulario…
//   </EmisionLayout>

"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { AlertTriangle, FileClock, X } from "lucide-react";
import Boton from "@/components/ui/Boton";
import BotonIcono from "@/components/ui/BotonIcono";
import { r2 } from "@/lib/dinero";
import { hayEmisionSinConfirmar } from "@/lib/emision";

export interface BarraEmision {
  total:          number;
  /** Texto del botón (p. ej. "Emitir" o "Crear link de cobro"). */
  texto:          string;
  onEmitir:       () => void;
  enviando:       boolean;
  deshabilitado?: boolean;
  /** El error del último intento: en el celular se ve sobre la barra. */
  error?:         string;
}

const fmt = (n: number) => r2(n).toFixed(2);

// Campos donde aparece el teclado (no casillas ni botones)
function abreTeclado(el: EventTarget | null): boolean {
  if (!(el instanceof HTMLElement)) return false;
  if (el.isContentEditable || el.tagName === "TEXTAREA") return true;
  if (el.tagName !== "INPUT") return false;
  const tipo = (el as HTMLInputElement).type;
  return !["checkbox", "radio", "button", "submit", "range", "file", "color"].includes(tipo);
}

/** true mientras hay un campo con teclado enfocado, solo en pantallas táctiles. */
function useEscribiendo(): boolean {
  const [escribiendo, setEscribiendo] = useState(false);
  useEffect(() => {
    if (!window.matchMedia("(pointer: coarse)").matches) return;
    const entra = (e: FocusEvent) => { if (abreTeclado(e.target)) setEscribiendo(true); };
    // Al pasar de un campo a otro llega focusout y luego focusin: se espera un
    // instante para que la barra no parpadee
    let timer: ReturnType<typeof setTimeout> | undefined;
    const sale = () => {
      clearTimeout(timer);
      timer = setTimeout(() => setEscribiendo(abreTeclado(document.activeElement)), 120);
    };
    document.addEventListener("focusin", entra);
    document.addEventListener("focusout", sale);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("focusin", entra);
      document.removeEventListener("focusout", sale);
    };
  }, []);
  return escribiendo;
}

export interface AvisoBorrador {
  /** "hace 2 h" (lib/borradores.ts). */
  hace:        string;
  /** "una factura", "una nota de crédito"… */
  que:         string;
  onSeguir:    () => void;
  onDescartar: () => void;
}

export default function EmisionLayout({
  titulo, subtitulo, alerta, lateral, barra, children, tiposEmision, borrador,
}: {
  titulo:     string;
  subtitulo?: ReactNode;
  /** Aviso arriba del formulario (p. ej. sin acceso para emitir). */
  alerta?:    ReactNode;
  /** Panel derecho en la compu; en el celular va al final del formulario. */
  lateral:    ReactNode;
  barra:      BarraEmision;
  children:   ReactNode;
  /** Tipos que envía esta pantalla ("FAC", "FAC-COBRO"…): si uno quedó sin confirmar, se avisa. */
  tiposEmision?: string[];
  /** Hay un borrador guardado: "¿Seguir o descartar?". */
  borrador?:  AvisoBorrador | null;
}) {
  const escribiendo = useEscribiendo();
  // Al abrir: ¿quedó un envío sin respuesta (se cortó la conexión, se cerró la app)?
  const [sinConfirmar, setSinConfirmar] = useState(() =>
    typeof window !== "undefined" && !!tiposEmision?.length && hayEmisionSinConfirmar(tiposEmision));

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-4 pb-[calc(7rem+var(--sa-bottom))] md:p-6 lg:pb-6">
      <div>
        <h1 className="hidden text-xl font-bold text-texto lg:block">{titulo}</h1>
        {subtitulo && <p className="text-xs text-sutil lg:text-sm">{subtitulo}</p>}
      </div>

      {sinConfirmar && (
        <div className="flex items-start gap-3 rounded-xl border border-alerta/20 bg-alerta-suave px-4 py-3" role="status">
          <AlertTriangle size={16} className="mt-0.5 shrink-0 text-alerta" aria-hidden />
          <div className="min-w-0 flex-1 space-y-1">
            <p className="text-sm font-medium text-alerta-texto">Un envío anterior no se confirmó</p>
            <p className="text-xs leading-relaxed text-tenue">
              Se cortó la conexión antes de la respuesta. Revisa en{" "}
              <Link href="/documentos" className="font-medium text-acento underline underline-offset-2">Documentos</Link>{" "}
              si se emitió antes de enviar otro. Si vuelves a enviar el mismo, no se duplica.
            </p>
          </div>
          <BotonIcono etiqueta="Cerrar aviso" icono={<X size={16} />} tamano="sm" onClick={() => setSinConfirmar(false)} />
        </div>
      )}

      {borrador && (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-acento/20 bg-acento-suave px-4 py-3">
          <FileClock size={18} className="shrink-0 text-acento" aria-hidden />
          <p className="min-w-0 flex-1 text-sm text-texto">
            Tienes {borrador.que} sin terminar <span className="text-sutil">({borrador.hace})</span>
          </p>
          <div className="flex gap-2">
            <Boton variante="fantasma" tamano="sm" onClick={borrador.onDescartar}>Descartar</Boton>
            <Boton tamano="sm" onClick={borrador.onSeguir}>Seguir</Boton>
          </div>
        </div>
      )}

      {alerta}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">{children}</div>
        <div className="space-y-4">{lateral}</div>
      </div>

      {/* Celular: el total y el botón, fijos abajo (se esconden mientras se escribe) */}
      {!escribiendo && (
        <div className="fixed inset-x-0 bottom-0 z-(--capa-nav) border-t border-borde bg-superficie/95 px-4 pt-3 pb-[calc(0.75rem+var(--sa-bottom))] backdrop-blur-md lg:hidden">
          {barra.error && (
            <p className="mb-2 flex items-start gap-1.5 text-xs text-peligro-texto" role="alert">
              <AlertTriangle size={13} className="mt-0.5 shrink-0" aria-hidden />
              <span className="line-clamp-2">{barra.error}</span>
            </p>
          )}
          <div className="flex items-center gap-3">
            <div className="min-w-0">
              <p className="text-xs text-sutil">Total</p>
              <p className="text-xl font-bold tabular-nums text-texto">${fmt(barra.total)}</p>
            </div>
            <Boton
              onClick={barra.onEmitir}
              cargando={barra.enviando}
              disabled={barra.deshabilitado}
              tamano="lg"
              className="ml-auto min-w-0 flex-1"
            >
              {barra.texto}
            </Boton>
          </div>
        </div>
      )}
    </div>
  );
}
