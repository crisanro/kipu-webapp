"use client";

import { ChevronDown, MapPin } from "lucide-react";
import type { PuntoEmisionState } from "./usePuntoEmision";

const estiloSelect = (vacio: boolean): React.CSSProperties => ({
  background: "var(--kipu-surface)",
  border: `1px solid ${vacio ? "var(--kipu-warning)" : "var(--kipu-border)"}`,
  color: vacio ? "var(--kipu-subtle)" : "var(--kipu-text)",
});

export default function PuntoEmision(pe: PuntoEmisionState) {
  const {
    establecimientos, cargando, unico, estabSelected, ptoSelected, puntos, serie,
    desdeOrigen, numeroOrigen, recordar, onEstabChange, onPtoChange, setRecordar,
  } = pe;

  if (cargando || establecimientos.length === 0) return null;

  const caja = {
    background: "var(--kipu-surface)",
    border: "1px solid var(--kipu-border)",
  };

  // Un solo establecimiento con un solo punto: no hay nada que elegir
  if (unico) {
    const e = establecimientos[0];
    const p = e.puntos_emision[0];
    return (
      <div className="rounded-xl px-4 py-3 flex items-center gap-2.5" style={caja}>
        <MapPin size={15} style={{ color: "var(--kipu-accent)" }} className="shrink-0" />
        <div className="min-w-0">
          <p className="text-sm" style={{ color: "var(--kipu-text)" }}>
            Emites desde <b className="font-mono">{e.codigo}-{p.codigo}</b>
          </p>
          <p className="text-xs truncate" style={{ color: "var(--kipu-subtle)" }}>
            {e.nombre_comercial || e.direccion}{p.nombre ? ` · ${p.nombre}` : ""}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl p-4" style={caja}>
      <h2 className="text-sm font-semibold mb-3" style={{ color: "var(--kipu-text)" }}>
        Punto de emisión
      </h2>
      <div className="space-y-2">

        {/* Establecimiento */}
        <div className="relative">
          <select
            value={estabSelected}
            onChange={(e) => onEstabChange(e.target.value)}
            aria-label="Establecimiento"
            className="w-full px-3 py-2 rounded-lg text-sm appearance-none pr-8 transition-colors focus:outline-none"
            style={estiloSelect(!estabSelected)}
          >
            <option value="" disabled>Elige el establecimiento</option>
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
            disabled={!estabSelected}
            aria-label="Punto de emisión"
            className="w-full px-3 py-2 rounded-lg text-sm appearance-none pr-8 transition-colors focus:outline-none disabled:opacity-50"
            style={estiloSelect(!!estabSelected && !ptoSelected)}
          >
            <option value="" disabled>{estabSelected ? "Elige el punto de emisión" : "Primero el establecimiento"}</option>
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

        {desdeOrigen && numeroOrigen && (
          <p className="text-xs" style={{ color: "var(--kipu-subtle)" }}>
            El mismo del comprobante <span className="font-mono">{numeroOrigen}</span>
          </p>
        )}

        <label
          className="flex items-center gap-2 pt-1 select-none"
          style={{ cursor: serie ? "pointer" : "not-allowed", opacity: serie ? 1 : 0.5 }}
          title="Para una computadora o celular que siempre emite desde el mismo punto (por ejemplo, la caja de un local)"
        >
          <input
            type="checkbox"
            checked={recordar}
            disabled={!serie}
            onChange={(e) => setRecordar(e.target.checked)}
            className="w-3.5 h-3.5 rounded"
            style={{ accentColor: "var(--kipu-accent)" }}
          />
          <span className="text-xs" style={{ color: "var(--kipu-subtle)" }}>
            Recordar en este dispositivo
          </span>
        </label>
      </div>
    </div>
  );
}
