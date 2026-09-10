"use client";
import { useState, useRef } from "react";
import api from "@/lib/api";
import { Upload, Trash2, CheckCircle2, AlertTriangle } from "lucide-react";

interface Props {
  firma:        any;
  onActualizar: () => void;
}

export default function TabFirma({ firma, onActualizar }: Props) {
  const [p12File,           setP12File]           = useState<File | null>(null);
  const [p12Pass,           setP12Pass]           = useState("");
  const [uploading,         setUploading]         = useState(false);
  const [firmaMsg,          setFirmaMsg]          = useState("");
  const [firmaError,        setFirmaError]        = useState("");
  const [eliminando,        setEliminando]        = useState(false);
  const [confirmarEliminar, setConfirmarEliminar] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const subirFirma = async () => {
    if (!p12File || !p12Pass) {
      setFirmaError("Selecciona el archivo y escribe la contraseña.");
      return;
    }
    setUploading(true);
    setFirmaError("");
    setFirmaMsg("");
    try {
      const fd = new FormData();
      fd.append("file",     p12File);
      fd.append("password", p12Pass);
      await api.post("/api/v1/app/emisor/firma", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setFirmaMsg("Firma configurada correctamente.");
      setP12File(null);
      setP12Pass("");
      onActualizar();
    } catch (err: any) {
      setFirmaError(err?.response?.data?.detail ?? "Error al subir la firma.");
    } finally {
      setUploading(false);
    }
  };

  const eliminarFirma = async () => {
    setEliminando(true);
    setFirmaError("");
    setFirmaMsg("");
    try {
      await api.delete("/api/v1/app/emisor/firma");
      setFirmaMsg("Firma eliminada. Ahora puedes subir una nueva.");
      setConfirmarEliminar(false);
      onActualizar();
    } catch (err: any) {
      setFirmaError(err?.response?.data?.detail ?? "Error al eliminar la firma.");
    } finally {
      setEliminando(false);
    }
  };

  const getEstadoBadgeStyle = (estado: string) => {
    if (estado === "VIGENTE") {
      return {
        background: "color-mix(in srgb, var(--kipu-success) 20%, transparent)",
        color: "var(--kipu-success)",
      };
    }
    if (estado === "ALERTA") {
      return {
        background: "color-mix(in srgb, var(--kipu-warning) 20%, transparent)",
        color: "var(--kipu-warning)",
      };
    }
    return {
      background: "color-mix(in srgb, var(--kipu-danger) 20%, transparent)",
      color: "var(--kipu-danger)",
    };
  };

  return (
    <div className="space-y-4">

      {/* Estado actual */}
      <div
        className="rounded-xl p-5"
        style={{
          background: "var(--kipu-surface)",
          border: "1px solid var(--kipu-border)",
        }}
      >
        <h2 className="text-sm font-semibold mb-4" style={{ color: "var(--kipu-text)" }}>
          Firma electrónica
        </h2>

        {firma?.configurada ? (
          <div className="space-y-3">
            <div
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium"
              style={getEstadoBadgeStyle(firma.estado)}
            >
              <CheckCircle2 size={12} />
              {firma.mensaje_vencimiento}
            </div>
            <p className="text-xs" style={{ color: "var(--kipu-subtle)" }}>{firma.nombre}</p>

            {/* Info — para reemplazar hay que eliminar primero */}
            <div
              className="flex items-start gap-2 rounded-lg px-3 py-2.5 mt-2"
              style={{
                background: "color-mix(in srgb, var(--kipu-warning) 10%, transparent)",
                border: "1px solid color-mix(in srgb, var(--kipu-warning) 20%, transparent)",
              }}
            >
              <AlertTriangle size={13} className="shrink-0 mt-0.5" style={{ color: "var(--kipu-warning)" }} />
              <p className="text-xs" style={{ color: "var(--kipu-warning)" }}>
                Para subir una nueva firma debes eliminar la actual primero.
              </p>
            </div>

            {/* Confirmar eliminación */}
            {!confirmarEliminar ? (
              <button
                type="button"
                onClick={() => setConfirmarEliminar(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
                style={{
                  border: "1px solid color-mix(in srgb, var(--kipu-danger) 30%, transparent)",
                  color: "var(--kipu-danger)",
                  background: "transparent",
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = "color-mix(in srgb, var(--kipu-danger) 10%, transparent)";
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = "transparent";
                }}
              >
                <Trash2 size={13} />
                Eliminar firma
              </button>
            ) : (
              <div
                className="rounded-lg p-3 space-y-2"
                style={{
                  background: "color-mix(in srgb, var(--kipu-danger) 10%, transparent)",
                  border: "1px solid color-mix(in srgb, var(--kipu-danger) 20%, transparent)",
                }}
              >
                <p className="text-xs font-medium" style={{ color: "var(--kipu-danger)" }}>
                  ¿Confirmas eliminar la firma? No podrás emitir hasta subir una nueva.
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setConfirmarEliminar(false)}
                    className="flex-1 py-1.5 rounded-lg text-xs transition-colors"
                    style={{
                      border: "1px solid var(--kipu-border)",
                      color: "var(--kipu-muted)",
                    }}
                    onMouseEnter={e => e.currentTarget.style.color = "var(--kipu-text)"}
                    onMouseLeave={e => e.currentTarget.style.color = "var(--kipu-muted)"}
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={eliminarFirma}
                    disabled={eliminando}
                    className="flex-1 py-1.5 rounded-lg text-white text-xs font-medium transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
                    style={{ background: "var(--kipu-danger)" }}
                  >
                    {eliminando ? (
                      <>
                        <div
                          className="w-3 h-3 border-2 border-t-transparent rounded-full animate-spin"
                          style={{ borderColor: "#FFFFFF", borderTopColor: "transparent" }}
                        />
                        Eliminando...
                      </>
                    ) : (
                      "Sí, eliminar"
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-2" style={{ color: "var(--kipu-warning)" }}>
            <AlertTriangle size={15} />
            <span className="text-sm">Sin firma configurada</span>
          </div>
        )}

        {firmaError && (
          <p
            className="text-xs px-3 py-2 rounded-lg mt-3"
            style={{
              color: "var(--kipu-danger)",
              background: "color-mix(in srgb, var(--kipu-danger) 10%, transparent)",
            }}
          >
            {firmaError}
          </p>
        )}
        {firmaMsg && (
          <p
            className="text-xs px-3 py-2 rounded-lg mt-3"
            style={{
              color: "var(--kipu-success)",
              background: "color-mix(in srgb, var(--kipu-success) 10%, transparent)",
            }}
          >
            {firmaMsg}
          </p>
        )}
      </div>

      {/* Subir firma — solo si no hay firma configurada */}
      {!firma?.configurada && (
        <div
          className="rounded-xl p-5"
          style={{
            background: "var(--kipu-surface)",
            border: "1px solid var(--kipu-border)",
          }}
        >
          <h2 className="text-sm font-semibold mb-4" style={{ color: "var(--kipu-text)" }}>
            Subir firma electrónica
          </h2>
          <div className="space-y-3">
            <div
              onClick={() => fileRef.current?.click()}
              className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors"
              style={{
                borderColor: p12File
                  ? "var(--kipu-accent)"
                  : "var(--kipu-border)",
                background: p12File
                  ? "color-mix(in srgb, var(--kipu-accent) 10%, transparent)"
                  : "transparent",
              }}
              onMouseEnter={e => {
                if (!p12File) {
                  e.currentTarget.style.borderColor = "color-mix(in srgb, var(--kipu-text) 30%, transparent)";
                }
              }}
              onMouseLeave={e => {
                if (!p12File) {
                  e.currentTarget.style.borderColor = "var(--kipu-border)";
                }
              }}
            >
              <Upload size={20} className="mx-auto mb-2" style={{ color: "var(--kipu-subtle)" }} />
              <p className="text-sm" style={{ color: "var(--kipu-muted)" }}>
                {p12File ? p12File.name : "Haz clic para seleccionar tu archivo .p12"}
              </p>
              <p className="text-xs mt-1" style={{ color: "var(--kipu-subtle)" }}>Solo archivos .p12</p>
              <input
                ref={fileRef}
                type="file"
                accept=".p12"
                className="hidden"
                onChange={e => setP12File(e.target.files?.[0] ?? null)}
              />
            </div>
            <div>
              <label className="block text-xs mb-1.5" style={{ color: "var(--kipu-subtle)" }}>Contraseña del certificado</label>
              <input
                type="password"
                value={p12Pass}
                onChange={e => setP12Pass(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3 py-2 rounded-lg text-sm transition-colors focus:outline-none"
                style={{
                  background: "var(--kipu-surface)",
                  border: "1px solid var(--kipu-border)",
                  color: "var(--kipu-text)",
                }}
                onFocus={e => e.currentTarget.style.borderColor = "var(--kipu-accent)"}
                onBlur={e => e.currentTarget.style.borderColor = "var(--kipu-border)"}
              />
            </div>
            <button
              type="button"
              onClick={subirFirma}
              disabled={uploading || !p12File || !p12Pass}
              className="w-full py-2.5 rounded-lg text-white text-sm font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
              style={{ background: "var(--kipu-accent)" }}
              onMouseEnter={e => {
                if (!uploading && p12File && p12Pass) e.currentTarget.style.background = "var(--kipu-accent-h)";
              }}
              onMouseLeave={e => {
                if (!uploading && p12File && p12Pass) e.currentTarget.style.background = "var(--kipu-accent)";
              }}
            >
              {uploading ? (
                <>
                  <div
                    className="w-3.5 h-3.5 border-2 border-t-transparent rounded-full animate-spin"
                    style={{ borderColor: "#FFFFFF", borderTopColor: "transparent" }}
                  />
                  Subiendo...
                </>
              ) : (
                "Guardar firma"
              )}
            </button>
          </div>
        </div>
      )}

    </div>
  );
}