// app/(dashboard)/documentos/recibidos/nueva/_components/DoneScreen.tsx
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
    <div className="min-h-screen flex items-center justify-center p-6 bg-gray-950">
      <div className="w-full max-w-sm text-center">
        <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-4">
          <CheckCircle2 size={32} className="text-emerald-400" />
        </div>
        <h2 className="text-xl font-bold text-white mb-1">{titulo}</h2>
        <p className="text-sm text-gray-500 mb-6">{subtitulo}</p>
        <div className="flex gap-3">
          <button onClick={onOtro}
            className="flex-1 py-2.5 rounded-lg border border-gray-700 text-gray-400 hover:text-white text-sm transition-colors">
            Registrar otro
          </button>
          <button onClick={() => router.push("/documentos/recibidos")}
            className="flex-1 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium transition-colors">
            Ver historial
          </button>
        </div>
      </div>
    </div>
  );
}