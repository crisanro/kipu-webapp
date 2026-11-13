"use client";

import { useEffect, useState } from "react";
import { Eye, EyeOff, KeyRound, Loader2, Trash2 } from "lucide-react";
import api from "@/lib/api";

interface Acceso { accion: "GUARDAR" | "VER" | "BORRAR"; motivo: string; quien: string; fecha: string }
interface EstadoClave { guardada: boolean; actualizada_at: string | null; accesos: Acceso[] }

const ACCION: Record<Acceso["accion"], string> = { GUARDAR: "Guardó", VER: "Usó", BORRAR: "Borró" };

function detalle(err: unknown, porDefecto: string): string {
  const d = (err as { response?: { data?: { detail?: unknown } } })?.response?.data?.detail;
  return typeof d === "string" ? d : porDefecto;
}

/**
 * Clave del portal del SRI para que el equipo de Kipu declare por el cliente.
 * Se guarda cifrada; nunca se vuelve a mostrar aquí. Se ve quién la usó y para qué.
 */
export default function ClaveSri() {
  const [estado,   setEstado]   = useState<EstadoClave | null>(null);
  const [clave,    setClave]    = useState("");
  const [ver,      setVer]      = useState(false);
  const [editando, setEditando] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [error,    setError]    = useState("");
  const [aviso,    setAviso]    = useState("");

  const traer = () => api.get("/api/v1/app/al-dia/clave-sri").then(r => r.data.data as EstadoClave);

  useEffect(() => {
    let vivo = true;
    traer()
      .then(d => { if (vivo) setEstado(d); })
      .catch((err: unknown) => { if (vivo) setError(detalle(err, "No pudimos cargar tu clave del SRI.")); });
    return () => { vivo = false; };
  }, []);

  const guardar = async () => {
    if (clave.trim().length < 4) {
      setError("Escribe tu clave del SRI.");
      return;
    }
    setEnviando(true);
    setError("");
    setAviso("");
    try {
      await api.put("/api/v1/app/al-dia/clave-sri", { clave });
      setClave("");
      setVer(false);
      setEditando(false);
      setAviso("Guardada. Ya podemos presentar tus declaraciones.");
      setEstado(await traer());
    } catch (err: unknown) {
      setError(detalle(err, "No pudimos guardar la clave."));
    } finally {
      setEnviando(false);
    }
  };

  const borrar = async () => {
    if (!confirm("¿Borrar tu clave del SRI de Kipu? Sin ella no podemos presentar tus declaraciones.")) return;
    setEnviando(true);
    setError("");
    try {
      await api.delete("/api/v1/app/al-dia/clave-sri");
      setAviso("Borramos tu clave. Te recomendamos cambiarla en el portal del SRI.");
      setEstado(await traer());
    } catch (err: unknown) {
      setError(detalle(err, "No pudimos borrar la clave."));
    } finally {
      setEnviando(false);
    }
  };

  const caja = { background: "var(--kipu-surface)", border: "1px solid var(--kipu-border)" };
  const mostrarFormulario = estado && (!estado.guardada || editando);

  return (
    <div className="rounded-xl p-5 space-y-4" style={caja}>
      <div className="flex items-center gap-2">
        <KeyRound size={18} style={{ color: "var(--kipu-accent)" }} />
        <p className="font-semibold" style={{ color: "var(--kipu-text)" }}>Tu clave del SRI</p>
      </div>

      {!estado && !error && <Loader2 size={18} className="animate-spin" style={{ color: "var(--kipu-subtle)" }} />}

      {estado?.guardada && !editando && (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm" style={{ color: "var(--kipu-muted)" }}>
            Guardada y cifrada
            {estado.actualizada_at && ` desde el ${new Date(estado.actualizada_at).toLocaleDateString("es-EC")}`}.
            Por seguridad no la mostramos aquí.
          </p>
          <div className="flex gap-3 text-sm">
            <button type="button" onClick={() => { setEditando(true); setAviso(""); }} className="underline"
                    style={{ color: "var(--kipu-accent)" }}>
              La cambié
            </button>
            <button type="button" onClick={borrar} disabled={enviando}
                    className="inline-flex items-center gap-1 underline disabled:opacity-50" style={{ color: "var(--kipu-danger)" }}>
              <Trash2 size={13} /> Borrar
            </button>
          </div>
        </div>
      )}

      {mostrarFormulario && (
        <div className="space-y-2">
          <p className="text-sm" style={{ color: "var(--kipu-muted)" }}>
            La necesitamos para descargar tus comprobantes y presentar tus declaraciones. Se guarda cifrada y
            solo la usa el equipo que atiende tu cuenta; cada uso queda registrado abajo.
          </p>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <input
                type={ver ? "text" : "password"}
                value={clave}
                onChange={e => { setClave(e.target.value); setError(""); }}
                onKeyDown={e => { if (e.key === "Enter") void guardar(); }}
                placeholder="Clave del portal del SRI"
                autoComplete="off"
                maxLength={64}
                className="w-full px-3 py-2.5 pr-10 rounded-lg text-sm focus:outline-none"
                style={{ background: "var(--kipu-bg)", border: "1px solid var(--kipu-border)", color: "var(--kipu-text)" }}
              />
              <button type="button" onClick={() => setVer(!ver)} aria-label={ver ? "Ocultar clave" : "Mostrar clave"}
                      className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: "var(--kipu-subtle)" }}>
                {ver ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            <button type="button" onClick={guardar} disabled={enviando}
                    className="px-4 rounded-lg text-white text-sm font-semibold disabled:opacity-50 flex items-center gap-1.5"
                    style={{ background: "var(--kipu-accent)" }}>
              {enviando ? <Loader2 size={14} className="animate-spin" /> : null}
              Guardar
            </button>
          </div>
          {editando && (
            <button type="button" onClick={() => { setEditando(false); setClave(""); }} className="text-xs underline"
                    style={{ color: "var(--kipu-subtle)" }}>
              Cancelar
            </button>
          )}
        </div>
      )}

      {error && <p className="text-sm" style={{ color: "var(--kipu-danger)" }}>{error}</p>}
      {aviso && <p className="text-sm" style={{ color: "var(--kipu-success)" }}>{aviso}</p>}

      {estado && estado.accesos.length > 0 && (
        <div>
          <p className="text-xs font-semibold mb-1.5" style={{ color: "var(--kipu-subtle)" }}>Quién la usó</p>
          <ul className="space-y-1 text-xs" style={{ color: "var(--kipu-muted)" }}>
            {estado.accesos.map((a, i) => (
              <li key={i} className="flex flex-wrap gap-x-2">
                <span style={{ color: "var(--kipu-subtle)" }}>
                  {new Date(a.fecha).toLocaleString("es-EC", { dateStyle: "short", timeStyle: "short" })}
                </span>
                <span>{a.quien} · {ACCION[a.accion] ?? a.accion}</span>
                <span style={{ color: "var(--kipu-subtle)" }}>— {a.motivo}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
