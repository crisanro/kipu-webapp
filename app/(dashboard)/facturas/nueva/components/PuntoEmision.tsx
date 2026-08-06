// app/(dashboard)/facturas/nueva/components/PuntoEmision.tsx
"use client";

import { ChevronDown } from "lucide-react";

interface Establecimiento {
  codigo:          string;
  nombre_comercial?: string;
  direccion:       string;
  puntos_emision:  { codigo: string; nombre?: string }[];
}

interface Props {
  establecimientos: Establecimiento[];
  estabSelected:    string;
  ptoSelected:      string;
  puntos:           { codigo: string; nombre?: string }[];
  onEstabChange:    (codigo: string, puntos: { codigo: string; nombre?: string }[]) => void;
  onPtoChange:      (codigo: string) => void;
}

export default function PuntoEmision({
  establecimientos,
  estabSelected,
  ptoSelected,
  puntos,
  onEstabChange,
  onPtoChange,
}: Props) {
  if (establecimientos.length === 0) return null;

  return (
    <div className="bg-gray-900 rounded-xl border border-gray-800 p-4">
      <h2 className="text-sm font-semibold text-white mb-3">Punto de emisión</h2>
      <div className="space-y-2">

        {/* Establecimiento */}
        <div className="relative">
          <select
            value={estabSelected}
            onChange={(e) => {
              const estab = establecimientos.find(es => es.codigo === e.target.value);
              const ptos  = estab?.puntos_emision ?? [];
              onEstabChange(e.target.value, ptos);
            }}
            className="w-full px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white focus:outline-none focus:border-indigo-500 text-sm appearance-none pr-8"
          >
            {establecimientos.map((e) => (
              <option key={e.codigo} value={e.codigo}>
                {e.codigo} — {e.nombre_comercial || e.direccion}
              </option>
            ))}
          </select>
          <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
        </div>

        {/* Punto de emisión */}
        <div className="relative">
          <select
            value={ptoSelected}
            onChange={(e) => onPtoChange(e.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white focus:outline-none focus:border-indigo-500 text-sm appearance-none pr-8"
          >
            {puntos.map((p) => (
              <option key={p.codigo} value={p.codigo}>
                PTO {p.codigo}{p.nombre ? ` — ${p.nombre}` : ""}
              </option>
            ))}
          </select>
          <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
        </div>

      </div>
    </div>
  );
}