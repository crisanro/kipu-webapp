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
  NCR: "Nota de Crédito",
  NDB: "Nota de Débito",
  RET: "Retención",
};

export default function DoneScreen({ titulo, subtitulo, onOtro }: Props) {
  const router = useRouter();
  return (
    <div
      className="min-h-screen flex items-center justify-center p-6"
      style={{ background: "var(--kipu-bg)" }}
    >
      <div className="w-full max-w-sm text-center">
        <div
          className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
          style={{
            background: "color-mix(in srgb, var(--kipu-success) 20%, transparent)",
          }}
        >
          <CheckCircle2 size={32} style={{ color: "var(--kipu-success)" }} />
        </div>
        <h2 className="text-xl font-bold mb-1" style={{ color: "var(--kipu-text)" }}>
          {titulo}
        </h2>
        <p className="text-sm mb-6" style={{ color: "var(--kipu-subtle)" }}>
          {subtitulo}
        </p>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onOtro}
            className="flex-1 py-2.5 rounded-lg text-sm transition-colors"
            style={{
              border: "1px solid var(--kipu-border)",
              color: "var(--kipu-muted)",
            }}
            onMouseEnter={e => e.currentTarget.style.color = "var(--kipu-text)"}
            onMouseLeave={e => e.currentTarget.style.color = "var(--kipu-muted)"}
          >
            Registrar otro
          </button>
          <button
            type="button"
            onClick={() => router.push("/documentos/recibidos")}
            className="flex-1 py-2.5 rounded-lg text-white text-sm font-medium transition-colors"
            style={{ background: "var(--kipu-accent)" }}
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