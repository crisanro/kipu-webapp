// components/configuracion/TabFirma.tsx
"use client";

import { useState, useRef } from "react";
import api from "@/lib/api";
import { Upload, Trash2, CheckCircle2, AlertTriangle, Loader2 } from "lucide-react";
import { clsx } from "clsx";

interface Props {
  firma:      any;
  onActualizar: () => void;
}

export default function TabFirma({ firma, onActualizar }: Props) {
  const [p12File,    setP12File]    = useState<File | null>(null);
  const [p12Pass,    setP12Pass]    = useState("");
  const [uploading,  setUploading]  = useState(false);
  const [firmaMsg,   setFirmaMsg]   = useState("");
  const [firmaError, setFirmaError] = useState("");
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
        headers: { "Content-Type": "multipart/form-data" }
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
    if (!confirm("¿Eliminar la firma electrónica? Deberás subir una nueva para facturar.")) return;
    try {
      await api.delete("/api/v1/app/emisor/firma");
      setFirmaMsg("Firma eliminada correctamente.");
      onActualizar();
    } catch (err: any) {
      setFirmaError(err?.response?.data?.detail ?? "Error al eliminar la firma.");
    }
  };

  return (
    <div className="space-y-4">

      {/* Estado actual */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
        <h2 className="text-sm font-semibold text-white mb-4">Estado de la firma</h2>
        {firma?.configurada ? (
          <div className="space-y-3">
            <div className={clsx(
              "inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium",
              firma.estado === "VIGENTE" ? "bg-emerald-500/20 text-emerald-400" :
              firma.estado === "ALERTA"  ? "bg-amber-500/20 text-amber-400" :
                                           "bg-red-500/20 text-red-400"
            )}>
              <CheckCircle2 size={12} />
              {firma.mensaje_vencimiento}
            </div>
            <p className="text-xs text-gray-500">{firma.nombre}</p>

            <div className="pt-3 border-t border-gray-800">
              <button
                onClick={eliminarFirma}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-red-500/30 text-red-400 hover:bg-red-500/10 text-xs font-medium transition-colors"
              >
                <Trash2 size={13} />
                Eliminar firma
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-amber-400">
            <AlertTriangle size={15} />
            <span className="text-sm">Sin firma configurada</span>
          </div>
        )}
      </div>

      {/* Subir firma */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
        <h2 className="text-sm font-semibold text-white mb-4">
          {firma?.configurada ? "Reemplazar firma" : "Subir firma electrónica"}
        </h2>
        <div className="space-y-3">
          <div
            onClick={() => fileRef.current?.click()}
            className={clsx(
              "border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors",
              p12File
                ? "border-indigo-500 bg-indigo-500/10"
                : "border-gray-700 hover:border-gray-600"
            )}
          >
            <Upload size={20} className="mx-auto mb-2 text-gray-500" />
            <p className="text-sm text-gray-400">
              {p12File ? p12File.name : "Haz clic para seleccionar tu archivo .p12"}
            </p>
            <p className="text-xs text-gray-600 mt-1">Solo archivos .p12</p>
            <input
              ref={fileRef}
              type="file"
              accept=".p12"
              className="hidden"
              onChange={(e) => setP12File(e.target.files?.[0] ?? null)}
            />
          </div>

          <div>
            <label className="block text-xs text-gray-500 mb-1.5">Contraseña del certificado</label>
            <input
              type="password"
              value={p12Pass}
              onChange={(e) => setP12Pass(e.target.value)}
              placeholder="••••••••"
              className="w-full px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500 text-sm"
            />
          </div>

          {firmaError && <p className="text-xs text-red-400 bg-red-400/10 px-3 py-2 rounded-lg">{firmaError}</p>}
          {firmaMsg   && <p className="text-xs text-emerald-400 bg-emerald-400/10 px-3 py-2 rounded-lg">{firmaMsg}</p>}

          <button
            onClick={subirFirma}
            disabled={uploading || !p12File || !p12Pass}
            className="w-full py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-medium transition-colors flex items-center justify-center gap-2"
          >
            {uploading
              ? <><Loader2 size={14} className="animate-spin" /> Subiendo...</>
              : "Guardar firma"
            }
          </button>
        </div>
      </div>
    </div>
  );
}