// app/(dashboard)/dashboard/components/UltimosDocumentos.tsx
"use client";
import Link from "next/link";
import { ArrowRight, CheckCircle2, Clock, AlertTriangle, XCircle } from "lucide-react";
import { clsx } from "clsx";

interface Props {
  documentos: any[];
}

const ESTADO_CONFIG: Record<string, { label: string; color: string; bg: string; icon: any }> = {
  AUTORIZADO: { label: "Autorizado", color: "text-emerald-400", bg: "bg-emerald-400/10", icon: CheckCircle2 },
  RECIBIDA:   { label: "En proceso", color: "text-indigo-400",  bg: "bg-indigo-400/10",  icon: Clock },
  FIRMADO:    { label: "En cola",    color: "text-blue-400",    bg: "bg-blue-400/10",    icon: Clock },
  DEVUELTA:   { label: "Devuelto",   color: "text-amber-400",   bg: "bg-amber-400/10",   icon: AlertTriangle },
  RECHAZADO:  { label: "Rechazado",  color: "text-red-400",     bg: "bg-red-400/10",     icon: XCircle },
};

const TIPO_LABEL: Record<string, string> = {
  FAC: "FAC", LIQ: "LIQ", NCR: "NC", NDB: "ND", RET: "RET",
};

const fmt = (n: any) => parseFloat(n ?? 0).toFixed(2);

export default function UltimosDocumentos({ documentos }: Props) {
  const recientes = documentos.slice(0, 6);

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800">
        <div>
          <h2 className="text-sm font-semibold text-white">Últimos emitidos</h2>
          <p className="text-xs text-gray-500 mt-0.5">Comprobantes recientes</p>
        </div>
        <Link
          href="/documentos"
          className="flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
        >
          Ver todos <ArrowRight size={12} />
        </Link>
      </div>

      {recientes.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <span className="text-3xl mb-2">📄</span>
          <p className="text-sm text-gray-500">Sin comprobantes este mes</p>
          <Link
            href="/documentos/nueva"
            className="mt-3 text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
          >
            Emitir primero →
          </Link>
        </div>
      ) : (
        <div className="divide-y divide-gray-800/60">
          {recientes.map((d: any) => {
            const estado = ESTADO_CONFIG[d.estado] ?? ESTADO_CONFIG.FIRMADO;
            const Icon   = estado.icon;
            return (
              <Link
                key={d.id}
                href={`/documentos/${d.id}`}
                className="flex items-center gap-3 px-5 py-3.5 hover:bg-gray-800/40 transition-colors group"
              >
                <div className={clsx(
                  "w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
                  estado.bg
                )}>
                  <Icon size={14} className={estado.color} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm text-white font-medium truncate">
                      {d.cliente_nombre || "—"}
                    </p>
                    {d.tipo_doc !== "FAC" && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-800 text-gray-400 shrink-0">
                        {TIPO_LABEL[d.tipo_doc] ?? d.tipo_doc}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {d.numero ?? d.numero_doc} · {String(d.fecha ?? "").slice(0, 10)}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-bold text-white">${fmt(d.total)}</p>
                  <p className={clsx("text-xs", estado.color)}>{estado.label}</p>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}