// app/(dashboard)/dashboard/components/DocumentosRecibidos.tsx
"use client";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { dosDecimales } from "@/lib/dinero";

interface Props {
  docs: any[];
}

export default function DocumentosRecibidos({ docs = [] }: Props) {
  return (
    <div
      className="rounded-xl overflow-hidden bg-superficie border border-borde"
    >
      <div
        className="flex items-center justify-between px-5 py-4 border-b border-borde"
      >
        <div>
          <h2 className="text-sm font-semibold text-texto">
            Documentos recibidos
          </h2>
          <p className="text-xs mt-0.5 text-tenue">
            Últimos 30 días
          </p>
        </div>
        <Link
          href="/documentos/recibidos"
          className="flex items-center gap-1 text-xs transition-colors text-acento hover:text-acento-hover"
        >
          Ver todos <ArrowRight size={12} />
        </Link>
      </div>

      {docs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <span className="text-3xl mb-2">📥</span>
          <p className="text-sm text-tenue">
            Sin documentos recibidos
          </p>
          <Link
            href="/documentos/recibidos/nueva"
            className="mt-3 text-xs transition-colors text-acento hover:text-acento-hover"
          >
            Registrar factura →
          </Link>
        </div>
      ) : (
        <div>
          {docs.map((d: any) => (
            <div
              key={d.id}
              className="flex items-center gap-3 px-5 py-3.5 border-b border-borde"
            >
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 bg-fondo"
              >
                <span className="text-xs font-bold text-tenue">
                  {(d.razon_social_proveedor ?? "?")[0].toUpperCase()}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate text-texto">
                  {d.razon_social_proveedor}
                </p>
                <p className="text-xs mt-0.5 text-tenue">
                  {d.numero_doc} · {d.fecha_emision}
                </p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-sm font-bold text-texto">
                  ${dosDecimales(d.importe_total)}
                </p>
                {d.credito_tributario_iva && (
                  <p className="text-xs text-acento">
                    CT IVA
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}