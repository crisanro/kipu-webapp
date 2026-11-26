"use client";
// Logo de la empresa, en Configuración → Logo de la empresa (cualquier plan).
// Se reduce en el navegador (lib/reducirLogo.ts) y solo se sube ese archivo
// chico. Sale en el RIDE: a color en el A4 y en blanco y negro en los tickets.
import { useEffect, useRef, useState } from "react";
import { ImageIcon, ImagePlus, RefreshCw, Trash2 } from "lucide-react";
import api from "@/lib/api";
import { LogoNoLegible, pesoLegible, reducirLogo, type LogoReducido } from "@/lib/reducirLogo";
import Boton from "@/components/ui/Boton";
import { useAvisos } from "@/components/ui/Avisos";
import { useConfirmar } from "@/components/ui/Confirmar";
import { detalleError } from "@/lib/errores";
import { useAuthStore } from "@/store/auth.store";

export interface LogoEmpresa {
  configurado?: boolean;
  url?:         string | null;   // enlace temporal para verlo
}

export default function TabLogo({ logo, onActualizar }: { logo: LogoEmpresa | null; onActualizar: () => void }) {
  const avisos    = useAvisos();
  const confirmar = useConfirmar();
  const razonSocial = useAuthStore((s) => s.empresa?.razon_social) ?? "TU EMPRESA";
  const [nuevo,      setNuevo]      = useState<LogoReducido | null>(null);
  const [reduciendo, setReduciendo] = useState(false);
  const [guardando,  setGuardando]  = useState(false);
  const [quitando,   setQuitando]   = useState(false);
  const [error,      setError]      = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  // La vista previa es un enlace local: se libera al cambiarla o al salir
  useEffect(() => () => { if (nuevo) URL.revokeObjectURL(nuevo.url); }, [nuevo]);

  const elegir = async (archivo: File | undefined) => {
    if (fileRef.current) fileRef.current.value = "";   // elegir el mismo archivo otra vez también avisa
    if (!archivo) return;
    setError("");
    setReduciendo(true);
    try {
      setNuevo(await reducirLogo(archivo));
    } catch (err) {
      setNuevo(null);
      setError(err instanceof LogoNoLegible ? err.message : "No pudimos abrir esa imagen. Prueba con una foto o un PNG/JPG.");
    } finally {
      setReduciendo(false);
    }
  };

  const guardar = async () => {
    if (!nuevo) return;
    setGuardando(true);
    setError("");
    try {
      const fd = new FormData();
      fd.append("file", nuevo.archivo);
      await api.post("/api/v1/app/emisor/logo", fd, { headers: { "Content-Type": "multipart/form-data" } });
      avisos.exito("Logo guardado. Ya sale en tus comprobantes.");
      setNuevo(null);
      onActualizar();
    } catch (err) {
      setError(detalleError(err, "No se pudo guardar el logo. Intenta de nuevo."));
    } finally {
      setGuardando(false);
    }
  };

  const quitar = async () => {
    if (!(await confirmar({
      titulo: "¿Quitar el logo?",
      mensaje: "Tus comprobantes saldrán sin logo hasta que subas otro.",
      textoConfirmar: "Quitar logo",
      peligro: true,
    }))) return;
    setQuitando(true);
    setError("");
    try {
      await api.delete("/api/v1/app/emisor/logo");
      avisos.exito("Logo quitado.");
      onActualizar();
    } catch (err) {
      setError(detalleError(err, "No se pudo quitar el logo."));
    } finally {
      setQuitando(false);
    }
  };

  const verUrl = nuevo?.url ?? (logo?.configurado ? logo.url ?? null : null);

  return (
    <div className="space-y-4">
      <section className="space-y-4 rounded-xl border border-borde bg-superficie p-4">
        <p className="text-sm text-tenue">
          Tu logo sale arriba en tus comprobantes: a color en el PDF y en blanco y negro en los tickets.
          Puedes elegir cualquier foto o imagen; antes de subirla la reducimos a unos pocos KB.
        </p>

        {verUrl ? (
          <VistaPrevia url={verUrl} razonSocial={razonSocial} />
        ) : (
          <p className="flex items-center gap-2 text-sm text-sutil">
            <ImageIcon size={16} aria-hidden /> Todavía no tienes logo.
          </p>
        )}

        {nuevo && (
          <p className="text-xs text-sutil">
            Listo para guardar: {nuevo.ancho} × {nuevo.alto} px · {pesoLegible(nuevo.bytes)}
          </p>
        )}

        {error && (
          <p className="rounded-lg bg-peligro-suave px-3 py-2 text-xs text-peligro-texto" role="alert">{error}</p>
        )}

        <div className="flex flex-wrap gap-2">
          {nuevo ? (
            <>
              <Boton onClick={guardar} cargando={guardando}>{guardando ? "Guardando…" : "Guardar logo"}</Boton>
              <Boton variante="secundario" onClick={() => { setNuevo(null); setError(""); }} disabled={guardando}>
                Cancelar
              </Boton>
            </>
          ) : (
            <>
              <Boton variante={logo?.configurado ? "secundario" : "principal"}
                     icono={logo?.configurado ? <RefreshCw size={14} /> : <ImagePlus size={16} />}
                     onClick={() => fileRef.current?.click()} cargando={reduciendo}>
                {reduciendo ? "Preparando…" : logo?.configurado ? "Cambiar logo" : "Elegir imagen"}
              </Boton>
              {logo?.configurado && (
                <Boton variante="secundario" icono={<Trash2 size={14} />} className="text-peligro"
                       onClick={quitar} cargando={quitando}>
                  Quitar
                </Boton>
              )}
            </>
          )}
        </div>

        <input
          ref={fileRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="hidden"
          onChange={(e) => elegir(e.target.files?.[0])}
        />
      </section>
    </div>
  );
}

/** Imita el recuadro del emisor del RIDE A4 y la cabecera del ticket. */
function VistaPrevia({ url, razonSocial }: { url: string; razonSocial: string }) {
  return (
    <div className="flex flex-wrap items-start gap-4">
      <figure className="space-y-1">
        <div className="flex w-64 flex-col items-center gap-2 border border-black bg-white p-3">
          <div className="flex h-16 w-full items-center justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element -- blob: o enlace temporal de R2 */}
            <img src={url} alt="Logo de la empresa" className="max-h-full max-w-full object-contain" />
          </div>
          <span className="text-center text-xs font-bold text-black">{razonSocial}</span>
        </div>
        <figcaption className="text-xs text-sutil">En el PDF</figcaption>
      </figure>
      <figure className="space-y-1">
        <div className="flex w-32 flex-col items-center gap-1.5 bg-white p-2 shadow-sm ring-1 ring-borde">
          <div className="flex h-12 w-full items-center justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element -- blob: o enlace temporal de R2 */}
            <img src={url} alt="" className="max-h-full max-w-full object-contain grayscale" />
          </div>
          <span className="text-center text-[10px] font-bold leading-tight text-black">{razonSocial}</span>
        </div>
        <figcaption className="text-xs text-sutil">En el ticket</figcaption>
      </figure>
    </div>
  );
}
