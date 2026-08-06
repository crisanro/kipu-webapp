// app/(dashboard)/facturas/nueva/components/CamposAdicionales.tsx
"use client";

import { Plus, Trash2 } from "lucide-react";

// ── Tipos ──────────────────────────────────────────────────────────────────────
export interface CampoAdicional {
  nombre: string;
  valor:  string;
}

interface Props {
  campos:   CampoAdicional[];
  onChange: (campos: CampoAdicional[]) => void;
}

// ── Componente ─────────────────────────────────────────────────────────────────
export default function CamposAdicionales({ campos, onChange }: Props) {
  const agregar = () => onChange([...campos, { nombre: "", valor: "" }]);

  const editar = (i: number, field: "nombre" | "valor", value: string) => {
    onChange(campos.map((c, idx) => idx === i ? { ...c, [field]: value } : c));
  };

  const eliminar = (i: number) => {
    onChange(campos.filter((_, idx) => idx !== i));
  };

  return (
    <div className="bg-gray-900 rounded-xl border border-gray-800 p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-white">Información adicional</h2>
        <button
          type="button"
          onClick={agregar}
          className="flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
        >
          <Plus size={13} />
          Agregar campo
        </button>
      </div>

      {campos.length === 0 ? (
        <p className="text-xs text-gray-600 text-center py-2">
          Opcional — email, teléfono, número de orden, observaciones, etc.
        </p>
      ) : (
        <div className="space-y-2">
          {campos.map((c, i) => (
            <div key={i} className="flex gap-2 items-center">
              <input
                value={c.nombre}
                onChange={(e) => editar(i, "nombre", e.target.value)}
                placeholder="Nombre (ej: Email)"
                className="flex-1 px-2.5 py-1.5 rounded-lg bg-gray-800 border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 text-xs"
              />
              <input
                value={c.valor}
                onChange={(e) => editar(i, "valor", e.target.value)}
                placeholder="Valor"
                className="flex-1 px-2.5 py-1.5 rounded-lg bg-gray-800 border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 text-xs"
              />
              <button
                type="button"
                onClick={() => eliminar(i)}
                className="p-1.5 text-gray-500 hover:text-red-400 transition-colors"
              >
                <Trash2 size={13} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}