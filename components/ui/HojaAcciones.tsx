// components/ui/HojaAcciones.tsx
// El menú "⋮" del celular (action sheet): una hoja desde abajo con las acciones
// de la pantalla en filas grandes; la peligrosa (anular, eliminar) en rojo y al
// final. En la compu es el mismo diálogo, chico.
//
//   <HojaAcciones abierta={menu} onCerrar={() => setMenu(false)} titulo="Factura 001-001-123"
//     acciones={[{ etiqueta: "PDF A4", icono: FileText, onClick: verPdf },
//                { etiqueta: "Anular", icono: Ban, onClick: anular, peligro: true }]} />

"use client";

import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import Hoja from "./Hoja";
import { cn } from "./cn";

export interface Accion {
  etiqueta:      string;
  descripcion?:  ReactNode;
  icono?:        LucideIcon;
  onClick:       () => void;
  peligro?:      boolean;
  deshabilitada?: boolean;
}

export default function HojaAcciones({ abierta, onCerrar, titulo, descripcion, acciones }: {
  abierta:      boolean;
  onCerrar:     () => void;
  titulo:       ReactNode;
  descripcion?: ReactNode;
  acciones:     Accion[];
}) {
  // Las peligrosas al final, separadas de las demás
  const normales  = acciones.filter(a => !a.peligro);
  const peligrosas = acciones.filter(a => a.peligro);

  const fila = (a: Accion) => {
    const Icono = a.icono;
    return (
      <button
        key={a.etiqueta}
        type="button"
        disabled={a.deshabilitada}
        onClick={() => { onCerrar(); a.onClick(); }}
        className={cn(
          "flex min-h-13 w-full items-center gap-3 px-5 py-2.5 text-left text-sm transition-colors",
          "hover:bg-presionado active:bg-presionado disabled:opacity-40",
          a.peligro ? "text-peligro-texto" : "text-texto",
        )}
      >
        {Icono && <Icono size={19} aria-hidden className={cn("shrink-0", a.peligro ? "text-peligro" : "text-sutil")} />}
        <span className="min-w-0 flex-1">
          <span className="block font-medium">{a.etiqueta}</span>
          {a.descripcion && <span className="block text-xs text-sutil">{a.descripcion}</span>}
        </span>
      </button>
    );
  };

  return (
    <Hoja abierta={abierta} onCerrar={onCerrar} titulo={titulo} descripcion={descripcion} tamano="sm">
      <div className="-mx-5 divide-y divide-borde border-t border-borde">
        {normales.map(fila)}
        {peligrosas.length > 0 && <div>{peligrosas.map(fila)}</div>}
      </div>
    </Hoja>
  );
}
