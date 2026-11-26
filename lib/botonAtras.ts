// lib/botonAtras.ts
// Botón atrás de Android: primero cierra lo que esté abierto encima de la
// pantalla (una Hoja, el menú lateral, el cajón de notificaciones) y recién
// después navega. Cada capa abierta se apila aquí; PuenteNativo atiende el botón.
//
//   useCapaAtras(menuAbierto, () => setMenuAbierto(false));

import { useEffect, useRef } from "react";

type Cerrar = () => void;

const pila: { id: number; cerrar: Cerrar }[] = [];
let siguienteId = 1;

/** Apila una capa abierta. Devuelve la función que la quita al cerrarse. */
export function registrarCapa(cerrar: Cerrar): () => void {
  const id = siguienteId++;
  pila.push({ id, cerrar });
  return () => {
    const i = pila.findIndex(c => c.id === id);
    if (i >= 0) pila.splice(i, 1);
  };
}

/** Cierra la capa de arriba. false si no había ninguna (entonces se navega). */
export function cerrarCapaSuperior(): boolean {
  const capa = pila[pila.length - 1];
  if (!capa) return false;
  capa.cerrar();
  return true;
}

/** Mientras `abierta`, el botón atrás llama a `cerrar` en vez de navegar. */
export function useCapaAtras(abierta: boolean, cerrar: Cerrar): void {
  const cerrarRef = useRef(cerrar);
  useEffect(() => { cerrarRef.current = cerrar; });
  useEffect(() => {
    if (!abierta) return;
    return registrarCapa(() => cerrarRef.current());
  }, [abierta]);
}
