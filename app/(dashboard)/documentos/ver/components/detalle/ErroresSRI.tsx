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
          className="rounded-xl p-4 space-y-3 bg-peligro-suave border border-peligro/20"
        >
          <h2 className="text-sm font-semibold flex items-center gap-2 text-peligro">
            <AlertTriangle size={15} /> Errores del SRI
          </h2>
          {errores.map((err: any, i: number) => (
            <div
              key={i}
              className="rounded-lg p-3 space-y-1 bg-superficie/50"
            >
              {err.identificador && <p className="text-xs font-mono text-peligro">Código: {String(err.identificador)}</p>}
              {err.mensaje && <p className="text-sm text-texto">{String(err.mensaje)}</p>}
              {err.informacionAdicional && <p className="text-xs text-sutil">{typeof err.informacionAdicional === 'object' ? JSON.stringify(err.informacionAdicional) : String(err.informacionAdicional)}</p>}
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