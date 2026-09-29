"use client";
import {
  AlertTriangle,
} from "lucide-react";
import { extraerMensajesSRI } from "./utils";

// Mensajes devueltos por el SRI (DEVUELTA / RECHAZADO).
export default function ErroresSRI({ mensajesSri }: { mensajesSri: any }) {
  const errores = extraerMensajesSRI(mensajesSri);

  return (
    <>
      {/* Errores SRI */}
      {errores.length > 0 && (
        <div
          className="rounded-xl p-4 space-y-3"
          style={{
            background: "color-mix(in srgb, var(--kipu-danger) 10%, transparent)",
            border: "1px solid color-mix(in srgb, var(--kipu-danger) 20%, transparent)",
          }}
        >
          <h2 className="text-sm font-semibold flex items-center gap-2" style={{ color: "var(--kipu-danger)" }}>
            <AlertTriangle size={15} /> Errores del SRI
          </h2>
          {errores.map((err: any, i: number) => (
            <div
              key={i}
              className="rounded-lg p-3 space-y-1"
              style={{ background: "color-mix(in srgb, var(--kipu-surface) 50%, transparent)" }}
            >
              {err.identificador && <p className="text-xs font-mono" style={{ color: "var(--kipu-danger)" }}>Código: {String(err.identificador)}</p>}
              {err.mensaje && <p className="text-sm" style={{ color: "var(--kipu-text)" }}>{String(err.mensaje)}</p>}
              {err.informacionAdicional && <p className="text-xs" style={{ color: "var(--kipu-subtle)" }}>{typeof err.informacionAdicional === 'object' ? JSON.stringify(err.informacionAdicional) : String(err.informacionAdicional)}</p>}
              {err.tipo && (
                <span
                  className="text-xs px-2 py-0.5 rounded-full"
                  style={{
                    background: err.tipo === "ERROR"
                      ? "color-mix(in srgb, var(--kipu-danger) 20%, transparent)"
                      : "color-mix(in srgb, var(--kipu-warning) 20%, transparent)",
                    color: err.tipo === "ERROR"
                      ? "var(--kipu-danger)"
                      : "var(--kipu-warning)",
                  }}
                >
                  {String(err.tipo)}
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </>
  );
}