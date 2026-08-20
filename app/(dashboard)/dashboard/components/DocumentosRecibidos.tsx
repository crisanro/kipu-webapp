// app/(dashboard)/dashboard/components/DocumentosRecibidos.tsx
"use client";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

const fmt = (n: any) => parseFloat(n ?? 0).toFixed(2);

interface Props {
  docs: any[]; // Recibe del padre, sin llamadas internas a la API
}

export default function DocumentosRecibidos({ docs = [] }: Props) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800">
        <div>
          <h2 className="text-sm font-semibold text-white">Documentos recibidos</h2>
          <p className="text-xs text-gray-500 mt-0.5">Últimos 30 días</p>
        </div>
        <Link
          href="/documentos/recibidas"
          className="flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
        >
          Ver todos <ArrowRight size={12} />
        </Link>
      </div>

      {docs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <span className="text-3xl mb-2">📥</span>
          <p className="text-sm text-gray-500">Sin documentos recibidos</p>
          <Link
            href="/documentos/recibidas/nueva"
            className="mt-3 text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
          >
            Registrar factura →
          </Link>
        </div>
      ) : (
        <div className="divide-y divide-gray-800/60">
          {docs.map((d: any) => (
            <div key={d.id} className="flex items-center gap-3 px-5 py-3.5">
              <div className="w-8 h-8 rounded-lg bg-gray-800 flex items-center justify-center shrink-0">
                <span className="text-xs font-bold text-gray-400">
                  {(d.razon_social_proveedor ?? "?")[0].toUpperCase()}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-white font-medium truncate">
                  {d.razon_social_proveedor}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {d.numero_doc} · {d.fecha_emision}
                </p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-sm font-bold text-white">${fmt(d.importe_total)}</p>
                {d.credito_tributario_iva && (
                  <p className="text-xs text-indigo-400">CT IVA</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}