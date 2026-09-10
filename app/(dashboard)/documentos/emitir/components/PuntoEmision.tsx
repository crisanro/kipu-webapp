"use client";

import { ChevronDown } from "lucide-react";

interface Establecimiento {
  codigo:           string;
  nombre_comercial?: string;
  direccion:        string;
  puntos_emision:   { codigo: string; nombre?: string }[];
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
    <div
      className="rounded-xl p-4"
      style={{
        background: "var(--kipu-surface)",
        border: "1px solid var(--kipu-border)",
      }}
    >
      <h2 className="text-sm font-semibold mb-3" style={{ color: "var(--kipu-text)" }}>
        Punto de emisión
      </h2>
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
            className="w-full px-3 py-2 rounded-lg text-sm appearance-none pr-8 transition-colors focus:outline-none"
            style={{
              background: "var(--kipu-surface)",
              border: "1px solid var(--kipu-border)",
              color: "var(--kipu-text)",
            }}
            onFocus={e => e.currentTarget.style.borderColor = "var(--kipu-accent)"}
            onBlur={e => e.currentTarget.style.borderColor = "var(--kipu-border)"}
          >
            {establecimientos.map((e) => (
              <option key={e.codigo} value={e.codigo}>
                {e.codigo} — {e.nombre_comercial || e.direccion}
              </option>
            ))}
          </select>
          <ChevronDown
            size={14}
            className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none"
            style={{ color: "var(--kipu-subtle)" }}
          />
        </div>

        {/* Punto de emisión */}
        <div className="relative">
          <select
            value={ptoSelected}
            onChange={(e) => onPtoChange(e.target.value)}
            className="w-full px-3 py-2 rounded-lg text-sm appearance-none pr-8 transition-colors focus:outline-none"
            style={{
              background: "var(--kipu-surface)",
              border: "1px solid var(--kipu-border)",
              color: "var(--kipu-text)",
            }}
            onFocus={e => e.currentTarget.style.borderColor = "var(--kipu-accent)"}
            onBlur={e => e.currentTarget.style.borderColor = "var(--kipu-border)"}
          >
            {puntos.map((p) => (
              <option key={p.codigo} value={p.codigo}>
                PTO {p.codigo}{p.nombre ? ` — ${p.nombre}` : ""}
              </option>
            ))}
          </select>
          <ChevronDown
            size={14}
            className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none"
            style={{ color: "var(--kipu-subtle)" }}
          />
        </div>

      </div>
    </div>
  );
}