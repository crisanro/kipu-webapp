"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import { ArrowLeft, Bell, Send, CheckCircle2, Users, User } from "lucide-react";

const TIPOS = [
  { value: "SISTEMA",     label: "Sistema",     color: "#60a5fa", bg: "color-mix(in srgb, #60a5fa 10%, transparent)" },
  { value: "DECLARACION", label: "Declaración", color: "var(--kipu-accent)", bg: "color-mix(in srgb, var(--kipu-accent) 10%, transparent)" },
  { value: "CREDITOS",    label: "Créditos",    color: "var(--kipu-warning)", bg: "color-mix(in srgb, var(--kipu-warning) 10%, transparent)" },
  { value: "FACTURA",     label: "Factura",     color: "var(--kipu-success)", bg: "color-mix(in srgb, var(--kipu-success) 10%, transparent)" },
];

export default function AdminNotificacionesPage() {
  const router = useRouter();

  const [destino,    setDestino]    = useState<"todos" | "individual">("todos");
  const [emisorId,   setEmisorId]   = useState("");
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
      setError(e?.response?.data?.detail ?? "Error al enviar notificación.");
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
          className="p-2 rounded-lg transition-colors"
          style={{ color: "var(--kipu-subtle)" }}
          onMouseEnter={e => {
            e.currentTarget.style.color = "var(--kipu-text)";
            e.currentTarget.style.background = "color-mix(in srgb, var(--kipu-text) 5%, transparent)";
          }}
          onMouseLeave={e => {
            e.currentTarget.style.color = "var(--kipu-subtle)";
            e.currentTarget.style.background = "transparent";
          }}
        >
          <ArrowLeft size={18} />
        </button>
        <div className="flex items-center gap-2">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
            style={{ background: "color-mix(in srgb, var(--kipu-accent) 20%, transparent)" }}
          >
            <Bell size={16} style={{ color: "var(--kipu-accent)" }} />
          </div>
          <div>
            <h1 className="text-lg font-bold" style={{ color: "var(--kipu-text)" }}>Enviar Notificación</h1>
            <p className="text-xs" style={{ color: "var(--kipu-subtle)" }}>Push + in-app a emisores</p>
          </div>
        </div>
      </div>

      {/* Resultado exitoso */}
      {resultado?.ok && (
        <div
          className="flex items-center gap-3 rounded-xl px-4 py-3"
          style={{
            background: "color-mix(in srgb, var(--kipu-success) 10%, transparent)",
            border: "1px solid color-mix(in srgb, var(--kipu-success) 20%, transparent)",
          }}
        >
          <CheckCircle2 size={16} className="shrink-0" style={{ color: "var(--kipu-success)" }} />
          <p className="text-sm font-medium" style={{ color: "var(--kipu-success)" }}>{resultado.mensaje}</p>
        </div>
      )}

      {/* Destino */}
      <div
        className="rounded-xl p-4 space-y-3"
        style={{
          background: "var(--kipu-surface)",
          border: "1px solid var(--kipu-border)",
        }}
      >
        <h2 className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--kipu-subtle)" }}>Destino</h2>
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
            <label className="block text-xs mb-1.5" style={{ color: "var(--kipu-subtle)" }}>ID del emisor</label>
            <input
              type="number"
              value={emisorId}
              onChange={(e) => setEmisorId(e.target.value)}
              placeholder="Ej: 42"
              className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none transition-colors"
              style={{
                background: "var(--kipu-surface)",
                border: "1px solid var(--kipu-border)",
                color: "var(--kipu-text)",
              }}
              onFocus={e => e.currentTarget.style.borderColor = "var(--kipu-accent)"}
              onBlur={e => e.currentTarget.style.borderColor = "var(--kipu-border)"}
            />
            <p className="text-xs mt-1" style={{ color: "var(--kipu-subtle)" }}>
              Encuéntralo en la lista de emisores del panel.
            </p>
          </div>
        )}
      </div>

      {/* Tipo */}
      <div
        className="rounded-xl p-4 space-y-3"
        style={{
          background: "var(--kipu-surface)",
          border: "1px solid var(--kipu-border)",
        }}
      >
        <h2 className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--kipu-subtle)" }}>Tipo</h2>
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
        className="rounded-xl p-4 space-y-3"
        style={{
          background: "var(--kipu-surface)",
          border: "1px solid var(--kipu-border)",
        }}
      >
        <h2 className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--kipu-subtle)" }}>Contenido</h2>

        <div>
          <label className="block text-xs mb-1.5" style={{ color: "var(--kipu-subtle)" }}>Título *</label>
          <input
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            placeholder="Ej: 🔔 Nueva funcionalidad disponible"
            maxLength={100}
            className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none transition-colors"
            style={{
              background: "var(--kipu-surface)",
              border: "1px solid var(--kipu-border)",
              color: "var(--kipu-text)",
            }}
            onFocus={e => e.currentTarget.style.borderColor = "var(--kipu-accent)"}
            onBlur={e => e.currentTarget.style.borderColor = "var(--kipu-border)"}
          />
          <p className="text-xs mt-1 text-right" style={{ color: "var(--kipu-subtle)" }}>{titulo.length}/100</p>
        </div>

        <div>
          <label className="block text-xs mb-1.5" style={{ color: "var(--kipu-subtle)" }}>Mensaje *</label>
          <textarea
            value={mensaje}
            onChange={(e) => setMensaje(e.target.value)}
            placeholder="Descripción detallada de la notificación..."
            rows={4}
            maxLength={500}
            className="w-full px-3 py-2 rounded-lg text-sm resize-none focus:outline-none transition-colors"
            style={{
              background: "var(--kipu-surface)",
              border: "1px solid var(--kipu-border)",
              color: "var(--kipu-text)",
            }}
            onFocus={e => e.currentTarget.style.borderColor = "var(--kipu-accent)"}
            onBlur={e => e.currentTarget.style.borderColor = "var(--kipu-border)"}
          />
          <p className="text-xs mt-1 text-right" style={{ color: "var(--kipu-subtle)" }}>{mensaje.length}/500</p>
        </div>

        <div>
          <label className="block text-xs mb-1.5" style={{ color: "var(--kipu-subtle)" }}>URL de redirección</label>
          <input
            value={referencia}
            onChange={(e) => setReferencia(e.target.value)}
            placeholder="/dashboard"
            className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none transition-colors"
            style={{
              background: "var(--kipu-surface)",
              border: "1px solid var(--kipu-border)",
              color: "var(--kipu-text)",
            }}
            onFocus={e => e.currentTarget.style.borderColor = "var(--kipu-accent)"}
            onBlur={e => e.currentTarget.style.borderColor = "var(--kipu-border)"}
          />
          <p className="text-xs mt-1" style={{ color: "var(--kipu-subtle)" }}>
            Ruta a la que se redirige al hacer click en la notificación.
          </p>
        </div>
      </div>

      {/* Preview */}
      {(titulo || mensaje) && (
        <div
          className="rounded-xl p-4 space-y-2"
          style={{
            background: "var(--kipu-surface)",
            border: "1px solid var(--kipu-border)",
          }}
        >
          <h2 className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--kipu-subtle)" }}>Preview</h2>
          <div
            className="rounded-lg p-3 flex items-start gap-3"
            style={{ background: "color-mix(in srgb, var(--kipu-text) 5%, transparent)" }}
          >
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
              style={{ background: "color-mix(in srgb, var(--kipu-accent) 20%, transparent)" }}
            >
              <Bell size={14} style={{ color: "var(--kipu-accent)" }} />
            </div>
            <div>
              <p className="text-sm font-medium" style={{ color: "var(--kipu-text)" }}>{titulo || "Título"}</p>
              <p className="text-xs mt-0.5" style={{ color: "var(--kipu-subtle)" }}>{mensaje || "Mensaje..."}</p>
            </div>
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <p
          className="text-xs px-3 py-2 rounded-lg font-medium"
          style={{
            background: "color-mix(in srgb, var(--kipu-danger) 10%, transparent)",
            color: "var(--kipu-danger)",
          }}
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
          className="flex-1 py-3 rounded-lg text-white font-semibold text-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
          style={{ background: "var(--kipu-accent)" }}
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