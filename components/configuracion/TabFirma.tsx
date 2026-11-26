"use client";
// Firma electrónica (.p12) de la empresa, en Configuración → Firma electrónica.
// Para cambiarla hay que eliminar la actual primero (lo pide el backend).
import { useState, useRef } from "react";
import api from "@/lib/api";
import { Upload, Trash2, CheckCircle2, AlertTriangle, FileKey } from "lucide-react";
import Boton from "@/components/ui/Boton";
import { Campo, EntradaClave } from "@/components/ui/Campo";
import { useAvisos } from "@/components/ui/Avisos";
import { useConfirmar } from "@/components/ui/Confirmar";
import { detalleError } from "@/lib/errores";
import { cn } from "@/components/ui/cn";

interface Firma {
  configurada?:         boolean;
  estado?:              string;   // VIGENTE | ALERTA | EXPIRADA
  mensaje_vencimiento?: string;
  nombre?:              string;
}

const TONO: Record<string, string> = {
  VIGENTE: "bg-exito-suave text-exito-texto",
  ALERTA:  "bg-alerta-suave text-alerta-texto",
};

export default function TabFirma({ firma, onActualizar }: { firma: Firma | null; onActualizar: () => void }) {
  const avisos    = useAvisos();
  const confirmar = useConfirmar();
  const [p12File,    setP12File]    = useState<File | null>(null);
  const [p12Pass,    setP12Pass]    = useState("");
  const [subiendo,   setSubiendo]   = useState(false);
  const [eliminando, setEliminando] = useState(false);
  const [error,      setError]      = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const subirFirma = async () => {
    if (!p12File || !p12Pass) { setError("Elige el archivo y escribe su contraseña."); return; }
    setSubiendo(true);
    setError("");
    try {
      const fd = new FormData();
      fd.append("file",     p12File);
      fd.append("password", p12Pass);
      await api.post("/api/v1/app/emisor/firma", fd, { headers: { "Content-Type": "multipart/form-data" } });
      avisos.exito("Firma configurada");
      setP12File(null);
      setP12Pass("");
      onActualizar();
    } catch (err) {
      setError(detalleError(err, "No se pudo subir la firma. Revisa el archivo y la contraseña."));
    } finally {
      setSubiendo(false);
    }
  };

  const eliminarFirma = async () => {
    if (!(await confirmar({
      titulo: "¿Eliminar la firma?",
      mensaje: "No podrás emitir hasta subir una nueva.",
      textoConfirmar: "Eliminar firma",
      peligro: true,
    }))) return;
    setEliminando(true);
    setError("");
    try {
      await api.delete("/api/v1/app/emisor/firma");
      avisos.exito("Firma eliminada. Ya puedes subir la nueva.");
      onActualizar();
    } catch (err) {
      setError(detalleError(err, "No se pudo eliminar la firma."));
    } finally {
      setEliminando(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Estado actual */}
      <section className="space-y-3 rounded-xl border border-borde bg-superficie p-4">
        {firma?.configurada ? (
          <>
            <span className={cn("inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium",
                                TONO[firma.estado ?? ""] ?? "bg-peligro-suave text-peligro-texto")}>
              <CheckCircle2 size={13} aria-hidden /> {firma.mensaje_vencimiento}
            </span>
            {firma.nombre && <p className="break-words text-sm text-tenue">{firma.nombre}</p>}
            <p className="text-xs text-sutil">Para cambiarla, primero elimina la actual y luego sube la nueva.</p>
            <Boton variante="secundario" tamano="sm" icono={<Trash2 size={14} />} className="text-peligro"
                   onClick={eliminarFirma} cargando={eliminando}>
              Eliminar firma
            </Boton>
          </>
        ) : (
          <p className="flex items-center gap-2 text-sm text-alerta-texto">
            <AlertTriangle size={16} aria-hidden /> Sin firma configurada: sin ella no se puede emitir.
          </p>
        )}
        {error && firma?.configurada && (
          <p className="rounded-lg bg-peligro-suave px-3 py-2 text-xs text-peligro-texto" role="alert">{error}</p>
        )}
      </section>

      {/* Subir firma: solo si no hay una */}
      {!firma?.configurada && (
        <section className="space-y-4 rounded-xl border border-borde bg-superficie p-4">
          <h3 className="text-sm font-semibold text-texto">Subir firma electrónica</h3>

          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className={cn(
              "flex w-full flex-col items-center gap-1.5 rounded-xl border-2 border-dashed p-6 text-center transition-colors",
              p12File ? "border-acento bg-acento-suave" : "border-borde hover:bg-presionado active:bg-presionado",
            )}
          >
            {p12File
              ? <FileKey size={22} className="text-acento" aria-hidden />
              : <Upload size={22} className="text-sutil" aria-hidden />}
            <span className="break-all text-sm text-texto">{p12File ? p12File.name : "Elegir el archivo .p12"}</span>
            <span className="text-xs text-sutil">{p12File ? "Toca para cambiarlo" : "El que te entregó la entidad certificadora"}</span>
          </button>
          <input
            ref={fileRef}
            type="file"
            accept=".p12,application/x-pkcs12"
            className="hidden"
            onChange={(e) => { setP12File(e.target.files?.[0] ?? null); setError(""); }}
          />

          <Campo etiqueta="Contraseña del certificado">
            <EntradaClave
              autoComplete="off"
              value={p12Pass}
              onChange={(e) => setP12Pass(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); subirFirma(); } }}
              enterKeyHint="done"
            />
          </Campo>

          {error && (
            <p className="rounded-lg bg-peligro-suave px-3 py-2 text-xs text-peligro-texto" role="alert">{error}</p>
          )}

          <Boton anchoCompleto onClick={subirFirma} cargando={subiendo} disabled={!p12File || !p12Pass}>
            {subiendo ? "Subiendo…" : "Guardar firma"}
          </Boton>
        </section>
      )}
    </div>
  );
}
