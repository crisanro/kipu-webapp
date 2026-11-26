"use client";
import { useRouter } from "next/navigation";
import { CheckCircle2 } from "lucide-react";

interface Props {
  titulo:    string;
  subtitulo: string;
  onOtro:    () => void;
}

const TIPO_LABEL: Record<string, string> = {
  FAC: "Factura",
  NVE: "Nota de venta",
  NCR: "Nota de Crédito",
  NDB: "Nota de Débito",
  RET: "Retención",
};

export default function DoneScreen({ titulo, subtitulo, onOtro }: Props) {
  const router = useRouter();
  return (
    <div
      className="min-h-screen flex items-center justify-center p-6 bg-fondo"
    >
      <div className="w-full max-w-sm text-center">
        <div
          className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 bg-exito/20"
        >
          <CheckCircle2 className="text-exito" size={32} />
        </div>
        <h2 className="text-xl font-bold mb-1 text-texto">
          {titulo}
        </h2>
        <p className="text-sm mb-6 text-sutil">
          {subtitulo}
        </p>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onOtro}
            className="flex-1 py-2.5 rounded-lg text-sm transition-colors border border-borde text-tenue"
            onMouseEnter={e => e.currentTarget.style.color = "var(--kipu-text)"}
            onMouseLeave={e => e.currentTarget.style.color = "var(--kipu-muted)"}
          >
            Registrar otro
          </button>
          <button
            type="button"
            onClick={() => router.push("/documentos/recibidos")}
            className="flex-1 py-2.5 rounded-lg text-white text-sm font-medium transition-colors bg-acento"
            onMouseEnter={e => e.currentTarget.style.background = "var(--kipu-accent-h)"}
            onMouseLeave={e => e.currentTarget.style.background = "var(--kipu-accent)"}
          >
            Ver historial
          </button>
        </div>
      </div>
    </div>
  );
}