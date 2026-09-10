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
    <div
      className="rounded-xl p-4"
      style={{
        background: "var(--kipu-surface)",
        border: "1px solid var(--kipu-border)",
      }}
    >
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold" style={{ color: "var(--kipu-text)" }}>
          Información adicional
        </h2>
        <button
          type="button"
          onClick={agregar}
          className="flex items-center gap-1 text-xs transition-colors"
          style={{ color: "var(--kipu-accent)" }}
          onMouseEnter={e => e.currentTarget.style.color = "var(--kipu-accent-h)"}
          onMouseLeave={e => e.currentTarget.style.color = "var(--kipu-accent)"}
        >
          <Plus size={13} />
          Agregar campo
        </button>
      </div>

      {campos.length === 0 ? (
        <p className="text-xs text-center py-2" style={{ color: "var(--kipu-subtle)" }}>
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
                className="flex-1 px-2.5 py-1.5 rounded-lg text-xs transition-colors focus:outline-none"
                style={{
                  background: "var(--kipu-surface)",
                  border: "1px solid var(--kipu-border)",
                  color: "var(--kipu-text)",
                }}
                onFocus={e => e.currentTarget.style.borderColor = "var(--kipu-accent)"}
                onBlur={e => e.currentTarget.style.borderColor = "var(--kipu-border)"}
              />
              <input
                value={c.valor}
                onChange={(e) => editar(i, "valor", e.target.value)}
                placeholder="Valor"
                className="flex-1 px-2.5 py-1.5 rounded-lg text-xs transition-colors focus:outline-none"
                style={{
                  background: "var(--kipu-surface)",
                  border: "1px solid var(--kipu-border)",
                  color: "var(--kipu-text)",
                }}
                onFocus={e => e.currentTarget.style.borderColor = "var(--kipu-accent)"}
                onBlur={e => e.currentTarget.style.borderColor = "var(--kipu-border)"}
              />
              <button
                type="button"
                onClick={() => eliminar(i)}
                className="p-1.5 transition-colors"
                style={{ color: "var(--kipu-subtle)" }}
                onMouseEnter={e => e.currentTarget.style.color = "var(--kipu-danger)"}
                onMouseLeave={e => e.currentTarget.style.color = "var(--kipu-subtle)"}
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