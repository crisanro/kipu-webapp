// lib/borradores.ts
// Borradores de los comprobantes que se están escribiendo (factura, notas,
// liquidación, retención, proforma). Si la persona sale de la pantalla, Android
// cierra la app o se le acaba la batería, al volver no pierde lo escrito.
//
//   const b = useBorrador("FAC", datos, { vacio: !cliente && sinItems, desactivado: vinoDeUnaProforma });
//   b.pendiente   → hay uno guardado: la pantalla pregunta "¿Seguir o descartar?"
//   b.recuperar() → devuelve los datos guardados (la pantalla los pone en su estado)
//   b.descartar() → lo borra
//   b.borrar()    → tras emitir con éxito
//
// Por empresa y tipo (en este dispositivo), vigentes 7 días. Mientras hay uno
// pendiente sin decidir no se guarda encima: así no se pierde por abrir y salir.

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useAuthStore } from "@/store/auth.store";

const PREFIJO  = "kipu:borrador:";
const VIGENCIA = 7 * 24 * 60 * 60 * 1000;
const ESPERA   = 600;   // ms sin escribir antes de guardar

interface Guardado<T> { datos: T; guardado: number }

function clave(tipo: string): string {
  const empresaId = useAuthStore.getState().empresa?.id ?? "sin-empresa";
  return `${PREFIJO}${empresaId}:${tipo}`;
}

export function leerBorrador<T>(tipo: string): Guardado<T> | null {
  try {
    const crudo = localStorage.getItem(clave(tipo));
    if (!crudo) return null;
    const g = JSON.parse(crudo) as Guardado<T>;
    if (!g?.datos || !(Date.now() - g.guardado < VIGENCIA)) {
      localStorage.removeItem(clave(tipo));
      return null;
    }
    return g;
  } catch {
    return null;
  }
}

export function guardarBorrador<T>(tipo: string, datos: T) {
  try { localStorage.setItem(clave(tipo), JSON.stringify({ datos, guardado: Date.now() })); } catch {}
}

export function borrarBorrador(tipo: string) {
  try { localStorage.removeItem(clave(tipo)); } catch {}
}

/** "hace 5 min", "hace 2 h", "ayer", "hace 3 días". */
export function haceCuanto(ms: number, ahora = Date.now()): string {
  const min = Math.max(1, Math.round((ahora - ms) / 60000));
  if (min < 60)  return `hace ${min} min`;
  const h = Math.round(min / 60);
  if (h < 24)    return `hace ${h} h`;
  const d = Math.round(h / 24);
  return d === 1 ? "ayer" : `hace ${d} días`;
}

export function useBorrador<T>(tipo: string, datos: T, { vacio, desactivado = false }: {
  /** true si no hay nada que valga la pena guardar (pantalla recién abierta). */
  vacio:        boolean;
  /** true si la pantalla llegó con datos de fuera (duplicar, proforma): no se ofrece el borrador. */
  desactivado?: boolean;
}) {
  // El borrador que había al abrir; null cuando no hay o ya se decidió
  const [pendiente, setPendiente] = useState<Guardado<T> | null>(() =>
    typeof window === "undefined" ? null : leerBorrador<T>(tipo));
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  // Tras emitir (borrar) no se vuelve a guardar hasta que el formulario quede vacío
  // ("Nueva factura"): la pantalla del resultado todavía tiene los datos
  const terminado = useRef(false);

  // Con datos de fuera, el borrador viejo no se ofrece (se reemplaza al escribir)
  const ofrecer = pendiente && !desactivado ? pendiente : null;

  // Guardar mientras se escribe (no encima de uno pendiente sin decidir)
  useEffect(() => {
    if (terminado.current) {
      if (vacio) terminado.current = false;
      return;
    }
    if (ofrecer || vacio) return;
    clearTimeout(timer.current);
    timer.current = setTimeout(() => guardarBorrador(tipo, datos), ESPERA);
    return () => clearTimeout(timer.current);
  }, [tipo, datos, vacio, ofrecer]);

  const recuperar = useCallback((): T | null => {
    const g = pendiente;
    setPendiente(null);
    return g?.datos ?? null;
  }, [pendiente]);

  const descartar = useCallback(() => {
    borrarBorrador(tipo);
    setPendiente(null);
  }, [tipo]);

  const borrar = useCallback(() => {
    clearTimeout(timer.current);
    terminado.current = true;
    borrarBorrador(tipo);
    setPendiente(null);
  }, [tipo]);

  return {
    /** Hay un borrador para ofrecer: "Seguir / Descartar". */
    pendiente: ofrecer ? { hace: haceCuanto(ofrecer.guardado) } : null,
    recuperar, descartar, borrar,
  };
}
