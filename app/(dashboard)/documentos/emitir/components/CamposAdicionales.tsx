"use client";

import { Info, Plus, Trash2 } from "lucide-react";
import Seccion from "@/components/ui/Seccion";
import Boton from "@/components/ui/Boton";
import BotonIcono from "@/components/ui/BotonIcono";
import { Entrada } from "@/components/ui/Campo";

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
// Plegable: casi nunca se usa, así que no ocupa pantalla. Plegada dice cuántos
// campos lleva; con alguno ya escrito (p. ej. el correo de una proforma) se abre.
export default function CamposAdicionales({ campos, onChange }: Props) {
  const agregar = () => onChange([...campos, { nombre: "", valor: "" }]);

  const editar = (i: number, field: "nombre" | "valor", value: string) => {
    onChange(campos.map((c, idx) => idx === i ? { ...c, [field]: value } : c));
  };

  const eliminar = (i: number) => {
    onChange(campos.filter((_, idx) => idx !== i));
  };

  const llenos = campos.filter(c => c.nombre.trim() && c.valor.trim()).length;
  const resumen = llenos === 0 ? "Ninguno" : llenos === 1 ? "1 campo" : `${llenos} campos`;

  return (
    <Seccion titulo="Información adicional" icono={Info} resumen={resumen} abierta={campos.length > 0}>
      <div className="space-y-3">
        {campos.length === 0 ? (
          <p className="text-xs text-sutil">
            Opcional: email, teléfono, número de orden, observaciones… Sale en el PDF y en el XML.
          </p>
        ) : (
          <div className="space-y-2">
            {campos.map((c, i) => (
              <div key={i} className="flex items-center gap-2">
                <Entrada
                  value={c.nombre}
                  onChange={(e) => editar(i, "nombre", e.target.value)}
                  placeholder="Nombre (ej: Email)"
                  aria-label={`Nombre del campo ${i + 1}`}
                  className="min-w-0 flex-1"
                />
                <Entrada
                  value={c.valor}
                  onChange={(e) => editar(i, "valor", e.target.value)}
                  placeholder="Valor"
                  aria-label={`Valor del campo ${i + 1}`}
                  className="min-w-0 flex-1"
                />
                <BotonIcono etiqueta={`Quitar el campo ${i + 1}`} icono={<Trash2 size={16} />}
                            variante="peligro" onClick={() => eliminar(i)} />
              </div>
            ))}
          </div>
        )}
        <Boton variante="secundario" tamano="sm" onClick={agregar} icono={<Plus size={14} />}>
          Agregar campo
        </Boton>
      </div>
    </Seccion>
  );
}
