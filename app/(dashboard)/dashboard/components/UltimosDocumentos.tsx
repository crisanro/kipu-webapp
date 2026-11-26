"use client";
import { rutas } from "@/lib/rutas";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { estadoSri, tipoComprobante } from "@/lib/estados";
import { CLASES_TONO, InsigniaSri } from "@/components/ui/InsigniaEstado";
import { cn } from "@/components/ui/cn";
import { dosDecimales } from "@/lib/dinero";

interface Props {
  documentos: any[];
}

export default function UltimosDocumentos({ documentos }: Props) {
  const recientes = documentos.slice(0, 6);

  return (
    <div
      className="rounded-xl overflow-hidden bg-superficie border border-borde"
    >
      <div
        className="flex items-center justify-between px-5 py-4 border-b-2 border-borde"
      >
        <div>
          <h2 className="text-sm font-semibold text-texto">
            Últimos emitidos
          </h2>
          <p className="text-xs mt-0.5 text-sutil">
            Comprobantes recientes
          </p>
        </div>
        <Link
          href="/documentos"
          className="flex items-center gap-1 text-xs transition-colors text-acento hover:text-acento-hover"
        >
          Ver todos <ArrowRight size={12} />
        </Link>
      </div>

      {recientes.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <span className="text-3xl mb-2">📄</span>
          <p className="text-sm text-tenue">
            Sin comprobantes este mes
          </p>
          <Link
            href="/documentos/emitir/fac"
            className="mt-3 text-xs transition-colors text-acento hover:text-acento-hover"
          >
            Emitir primero →
          </Link>
        </div>
      ) : (
        <div>
          {recientes.map((d: any, index: number) => {
            const estado = estadoSri(d.estado);
            const Icon   = estado.icono;
            return (
              <Link
                key={d.id}
                href={rutas.documento(d.id)}
                className="flex items-center gap-3 px-5 py-3.5 transition-colors group hover:bg-texto/4"
                style={{
                  borderTop: index > 0 ? "1px solid var(--kipu-border)" : "none",
                }}
              >
                <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center shrink-0", CLASES_TONO[estado.tono])}>
                  <Icon size={14} aria-hidden />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p
                      className="text-sm font-medium truncate text-texto"
                    >
                      {d.cliente_nombre || "—"}
                    </p>
                    {d.tipo_doc !== "FAC" && (
                      <span
                        className="text-[10px] px-1.5 py-0.5 rounded shrink-0"
                        style={{
                          background: "color-mix(in srgb, var(--kipu-text) 8%, transparent)",
                          color: "var(--kipu-muted)",
                        }}
                      >
                        {tipoComprobante(d.tipo_doc).corta}
                      </span>
                    )}
                  </div>
                  <p
                    className="text-xs mt-0.5 text-sutil"
                  >
                    {d.numero ?? d.numero_doc} · {String(d.fecha ?? "").slice(0, 10)}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p
                    className="text-sm font-bold text-texto"
                  >
                    ${dosDecimales(d.total)}
                  </p>
                  <InsigniaSri estado={d.estado} conIcono={false} className="mt-0.5" />
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}