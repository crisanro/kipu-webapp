"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import api from "@/lib/api";
import { ArrowLeft, Bell, Send, CheckCircle2, Users, User } from "lucide-react";
import { detalleError } from "@/lib/errores";

const TIPOS = [
  { value: "SISTEMA",     label: "Sistema",     color: "var(--kipu-info)", bg: "color-mix(in srgb, var(--kipu-info) 10%, transparent)" },
  { value: "DECLARACION", label: "Declaración", color: "var(--kipu-accent)", bg: "color-mix(in srgb, var(--kipu-accent) 10%, transparent)" },
  { value: "CREDITOS",    label: "Créditos",    color: "var(--kipu-warning)", bg: "color-mix(in srgb, var(--kipu-warning) 10%, transparent)" },
  { value: "FACTURA",     label: "Factura",     color: "var(--kipu-success)", bg: "color-mix(in srgb, var(--kipu-success) 10%, transparent)" },
  // Mismos tipos que entiende la bandeja (components/NotificacionesDrawer.tsx).
  // Suscripción no llega a la app de las tiendas (el backend no la envía a "app-…").
  { value: "SUSCRIPCION", label: "Suscripción", color: "var(--kipu-accent)", bg: "color-mix(in srgb, var(--kipu-accent) 10%, transparent)" },
];

// useSearchParams necesita un Suspense encima (si no, el build estático falla)
export default function AdminNotificacionesPage() {
  return <Suspense fallback={null}><Notificaciones /></Suspense>;
}

function Notificaciones() {
  const router = useRouter();

  // ?emisor=123 (desde el detalle del emisor): ya elegido como destino
  const emisorDeUrl = useSearchParams().get("emisor") ?? "";
  const conEmisor   = /^\d+$/.test(emisorDeUrl);
  const [destino,    setDestino]    = useState<"todos" | "individual">(conEmisor ? "individual" : "todos");
  const [emisorId,   setEmisorId]   = useState(conEmisor ? emisorDeUrl : "");
  const [tipo,       setTipo]       = useState("SISTEMA");
  const [titulo,     setTitulo]     = useState("");
  const [mensaje,    setMensaje]    = useState("");
  const [referencia, setReferencia] = useState("/dashboard");
  const [enviando,   setEnviando]   = useState(false);
  const [resultado,  setResultado]  = useState<{ ok: boolean; mensaje: string } | null>(null);
  const [error,      setError]      = useState("");

  const enviar = async () => {
    if (!titulo.trim()) { setError("El título es obligatorio."); return; }
    if (!mensaje.trim()) { setError("El mensaje es obligatorio."); return; }
    if (destino === "individual" && !emisorId.trim()) {
      setError("Debes ingresar el ID del emisor."); return;
    }

    setEnviando(true);
    setError("");
    setResultado(null);

    try {
      const res = await api.post("/api/v1/admin/panel/notificar", {
        titulo,
        mensaje,
        tipo,
        referencia: referencia || "/dashboard",
        emisor_id:  destino === "individual" ? parseInt(emisorId) : null,
      });
      setResultado(res.data);
      // Limpiar form
      setTitulo("");
      setMensaje("");
      setEmisorId("");
    } catch (e: any) {
      if (e?.response?.status === 403) {
        router.replace("/dashboard");
        return;
      }
      setError(detalleError(e, "Error al enviar notificación."));
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto space-y-5">

      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => router.back()}
          className="p-2 rounded-lg transition-colors text-sutil hover:text-texto hover:bg-texto/5"
        >
          <ArrowLeft size={18} />
        </button>
        <div className="flex items-center gap-2">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 bg-acento/20"
          >
            <Bell className="text-acento" size={16} />
          </div>
          <div>
            <h1 className="text-lg font-bold text-texto">Enviar Notificación</h1>
            <p className="text-xs text-sutil">Push + in-app a emisores</p>
          </div>
        </div>
      </div>

      {/* Resultado exitoso */}
      {resultado?.ok && (
        <div
          className="flex items-center gap-3 rounded-xl px-4 py-3 bg-exito/10 border border-exito/20"
        >
          <CheckCircle2 size={16} className="shrink-0 text-exito" />
          <p className="text-sm font-medium text-exito">{resultado.mensaje}</p>
        </div>
      )}

      {/* Destino */}
      <div
        className="rounded-xl p-4 space-y-3 bg-superficie border border-borde"
      >
        <h2 className="text-xs font-semibold uppercase tracking-wide text-sutil">Destino</h2>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setDestino("todos")}
            className="flex items-center gap-2 px-3 py-2.5 rounded-lg border text-sm transition-colors font-medium"
            style={{
              border: destino === "todos"
                ? "1px solid var(--kipu-accent)"
                : "1px solid var(--kipu-border)",
              background: destino === "todos"
                ? "color-mix(in srgb, var(--kipu-accent) 10%, transparent)"
                : "transparent",
              color: destino === "todos"
                ? "var(--kipu-accent)"
                : "var(--kipu-subtle)",
            }}
            onMouseEnter={e => {
              if (destino !== "todos") e.currentTarget.style.color = "var(--kipu-text)";
            }}
            onMouseLeave={e => {
              if (destino !== "todos") e.currentTarget.style.color = "var(--kipu-subtle)";
            }}
          >
            <Users size={15} />
            Todos en producción
          </button>
          <button
            type="button"
            onClick={() => setDestino("individual")}
            className="flex items-center gap-2 px-3 py-2.5 rounded-lg border text-sm transition-colors font-medium"
            style={{
              border: destino === "individual"
                ? "1px solid var(--kipu-accent)"
                : "1px solid var(--kipu-border)",
              background: destino === "individual"
                ? "color-mix(in srgb, var(--kipu-accent) 10%, transparent)"
                : "transparent",
              color: destino === "individual"
                ? "var(--kipu-accent)"
                : "var(--kipu-subtle)",
            }}
            onMouseEnter={e => {
              if (destino !== "individual") e.currentTarget.style.color = "var(--kipu-text)";
            }}
            onMouseLeave={e => {
              if (destino !== "individual") e.currentTarget.style.color = "var(--kipu-subtle)";
            }}
          >
            <User size={15} />
            Emisor específico
          </button>
        </div>

        {destino === "individual" && (
          <div>
            <label className="block text-xs mb-1.5 text-sutil">ID del emisor</label>
            <input
              type="number"
              value={emisorId}
              inputMode="numeric"
              onChange={(e) => setEmisorId(e.target.value)}
              placeholder="Ej: 42"
              className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none transition-colors bg-superficie border border-borde text-texto focus:border-acento"
            />
            <p className="text-xs mt-1 text-sutil">
              Encuéntralo en la lista de emisores del panel.
            </p>
          </div>
        )}
      </div>

      {/* Tipo */}
      <div
        className="rounded-xl p-4 space-y-3 bg-superficie border border-borde"
      >
        <h2 className="text-xs font-semibold uppercase tracking-wide text-sutil">Tipo</h2>
        <div className="flex gap-2 flex-wrap">
          {TIPOS.map((t) => {
            const active = tipo === t.value;
            return (
              <button
                key={t.value}
                type="button"
                onClick={() => setTipo(t.value)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
                style={{
                  background: active
                    ? t.bg
                    : "color-mix(in srgb, var(--kipu-text) 5%, transparent)",
                  color: active
                    ? t.color
                    : "var(--kipu-subtle)",
                  border: active
                    ? `1px solid ${t.color}`
                    : "1px solid transparent",
                }}
                onMouseEnter={e => {
                  if (!active) e.currentTarget.style.color = "var(--kipu-text)";
                }}
                onMouseLeave={e => {
                  if (!active) e.currentTarget.style.color = "var(--kipu-subtle)";
                }}
              >
                {t.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Contenido */}
      <div
        className="rounded-xl p-4 space-y-3 bg-superficie border border-borde"
      >
        <h2 className="text-xs font-semibold uppercase tracking-wide text-sutil">Contenido</h2>

        <div>
          <label className="block text-xs mb-1.5 text-sutil">Título *</label>
          <input
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            placeholder="Ej: 🔔 Nueva funcionalidad disponible"
            maxLength={100}
            className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none transition-colors bg-superficie border border-borde text-texto focus:border-acento"
          />
          <p className="text-xs mt-1 text-right text-sutil">{titulo.length}/100</p>
        </div>

        <div>
          <label className="block text-xs mb-1.5 text-sutil">Mensaje *</label>
          <textarea
            value={mensaje}
            onChange={(e) => setMensaje(e.target.value)}
            placeholder="Descripción detallada de la notificación..."
            rows={4}
            maxLength={500}
            className="w-full px-3 py-2 rounded-lg text-sm resize-none focus:outline-none transition-colors bg-superficie border border-borde text-texto focus:border-acento"
          />
          <p className="text-xs mt-1 text-right text-sutil">{mensaje.length}/500</p>
        </div>

        <div>
          <label className="block text-xs mb-1.5 text-sutil">URL de redirección</label>
          <input
            value={referencia}
            onChange={(e) => setReferencia(e.target.value)}
            placeholder="/dashboard"
            className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none transition-colors bg-superficie border border-borde text-texto focus:border-acento"
          />
          <p className="text-xs mt-1 text-sutil">
            Ruta a la que se redirige al hacer click en la notificación.
          </p>
        </div>
      </div>

      {/* Preview */}
      {(titulo || mensaje) && (
        <div
          className="rounded-xl p-4 space-y-2 bg-superficie border border-borde"
        >
          <h2 className="text-xs font-semibold uppercase tracking-wide text-sutil">Preview</h2>
          <div
            className="rounded-lg p-3 flex items-start gap-3 bg-texto/5"
          >
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 bg-acento/20"
            >
              <Bell className="text-acento" size={14} />
            </div>
            <div>
              <p className="text-sm font-medium text-texto">{titulo || "Título"}</p>
              <p className="text-xs mt-0.5 text-sutil">{mensaje || "Mensaje..."}</p>
            </div>
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <p
          className="text-xs px-3 py-2 rounded-lg font-medium bg-peligro-suave text-peligro"
        >
          {error}
        </p>
      )}

      {/* Botones */}
      <div className="flex gap-3 pb-4">
        <button
          type="button"
          onClick={() => router.back()}
          className="flex-1 py-3 rounded-lg text-sm transition-colors font-medium"
          style={{
            border: "1px solid var(--kipu-border)",
            color: "var(--kipu-subtle)",
            background: "transparent",
          }}
          onMouseEnter={e => {
            e.currentTarget.style.color = "var(--kipu-text)";
            e.currentTarget.style.borderColor = "color-mix(in srgb, var(--kipu-text) 30%, transparent)";
          }}
          onMouseLeave={e => {
            e.currentTarget.style.color = "var(--kipu-subtle)";
            e.currentTarget.style.borderColor = "var(--kipu-border)";
          }}
        >
          Cancelar
        </button>
        <button
          type="button"
          onClick={enviar}
          disabled={enviando || !titulo.trim() || !mensaje.trim()}
          className="flex-1 py-3 rounded-lg text-white font-semibold text-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-50 bg-acento"
          onMouseEnter={e => {
            if (!enviando && titulo.trim() && mensaje.trim()) {
              e.currentTarget.style.background = "var(--kipu-accent-h)";
            }
          }}
          onMouseLeave={e => {
            if (!enviando && titulo.trim() && mensaje.trim()) {
              e.currentTarget.style.background = "var(--kipu-accent)";
            }
          }}
        >
          {enviando ? (
            <>
              <div
                className="w-4 h-4 border-2 border-t-transparent rounded-full animate-spin"
                style={{ borderColor: "#FFFFFF", borderTopColor: "transparent" }}
              />
              Enviando...
            </>
          ) : (
            <>
              <Send size={16} /> {destino === "todos" ? "Enviar a todos" : "Enviar"}
            </>
          )}
        </button>
      </div>

    </div>
  );
}