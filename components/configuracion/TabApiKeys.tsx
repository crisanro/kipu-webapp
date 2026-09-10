"use client";
import { useState, useEffect } from "react";
import api from "@/lib/api";
import {
  Plus, Copy, Trash2, Key, CheckCircle2, X,
  FlaskConical, RefreshCw, Eye, EyeOff
} from "lucide-react";
import PinInput from "@/components/PinInput";
import { useAuthStore } from "@/store/auth.store";

interface ApiKey {
  id:           number;
  nombre:       string;
  estado:       string;
  created_at:   string;
  last_used_at: string | null;
}

interface SandboxKey {
  id:           number;
  key:          string | null; // null si no se ha generado aún
  created_at:   string;
  last_used_at: string | null;
}

export default function TabApiKeys() {
  const email   = useAuthStore((s) => s.email) ?? "";
  const empresa = useAuthStore((s) => s.empresa);

  const [keys,         setKeys]         = useState<ApiKey[]>([]);
  const [sandboxKey,   setSandboxKey]   = useState<SandboxKey | null>(null);
  const [loading,      setLoading]      = useState(true);
  const [nombre,       setNombre]       = useState("");
  const [nuevaKey,     setNuevaKey]     = useState("");
  const [copiado,      setCopiado]      = useState<string | null>(null);
  const [showForm,     setShowForm]     = useState(false);
  const [keyToRevoke,  setKeyToRevoke]  = useState<number | null>(null);
  const [showSandbox,  setShowSandbox]  = useState(false);
  const [regenSandbox, setRegenSandbox] = useState(false);

  const cargar = async () => {
    setLoading(true);
    try {
      const [resKeys, resSandbox] = await Promise.all([
        api.get("/api/v1/app/apikeys"),
        api.get("/api/v1/app/apikeys/sandbox"),
      ]);
      setKeys(resKeys.data ?? []);
      setSandboxKey(resSandbox.data.data ?? null);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { cargar(); }, []);

  const crearConPin = async (pin: string) => {
    const res = await api.post("/api/v1/app/apikeys", { nombre, pin });
    setNuevaKey(res.data.api_key);
    setNombre("");
    setShowForm(false);
    await cargar();
  };

  const revocarConPin = async (pin: string) => {
    if (!keyToRevoke) return;
    await api.delete(`/api/v1/app/apikeys/${keyToRevoke}?pin=${pin}`);
    setKeyToRevoke(null);
    await cargar();
  };

  const regenerarSandbox = async () => {
    if (!confirm("¿Regenerar la key de sandbox? La anterior dejará de funcionar.")) return;
    setRegenSandbox(true);
    try {
      const res = await api.post("/api/v1/app/apikeys/sandbox/regenerar");
      setSandboxKey(res.data.data);
      setShowSandbox(true);
    } catch (e: any) {
      alert(e?.response?.data?.detail ?? "Error al regenerar.");
    } finally {
      setRegenSandbox(false);
    }
  };

  const copiar = async (text: string, id: string) => {
    await navigator.clipboard.writeText(text);
    setCopiado(id);
    setTimeout(() => setCopiado(null), 2000);
  };

  return (
    <div className="space-y-4">

      {/* ── Sandbox Key ───────────────────────────────────────────────────── */}
      <div
        className="rounded-xl overflow-hidden"
        style={{
          background: "var(--kipu-surface)",
          border: "1px solid var(--kipu-border)",
        }}
      >
        <div
          className="flex items-center justify-between px-5 py-4"
          style={{ borderBottom: "1px solid var(--kipu-border)" }}
        >
          <div className="flex items-center gap-2">
            <FlaskConical size={15} style={{ color: "#60a5fa" }} />
            <h2 className="text-sm font-semibold" style={{ color: "var(--kipu-text)" }}>API Key de Pruebas</h2>
            <span
              className="text-[10px] px-2 py-0.5 rounded-full font-bold"
              style={{
                background: "color-mix(in srgb, #60a5fa 20%, transparent)",
                color: "#60a5fa",
              }}
            >
              SANDBOX
            </span>
          </div>
          <button
            type="button"
            onClick={regenerarSandbox}
            disabled={regenSandbox}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-colors disabled:opacity-40"
            style={{
              border: "1px solid var(--kipu-border)",
              color: "var(--kipu-muted)",
            }}
            onMouseEnter={e => {
              if (!regenSandbox) e.currentTarget.style.color = "var(--kipu-text)";
            }}
            onMouseLeave={e => {
              if (!regenSandbox) e.currentTarget.style.color = "var(--kipu-muted)";
            }}
          >
            {regenSandbox ? (
              <div
                className="w-3 h-3 border-2 border-t-transparent rounded-full animate-spin"
                style={{ borderColor: "currentColor", borderTopColor: "transparent" }}
              />
            ) : (
              <RefreshCw size={12} />
            )}
            Regenerar
          </button>
        </div>

        <div className="p-5 space-y-3">
          <p className="text-xs" style={{ color: "var(--kipu-subtle)" }}>
            Usa esta key para probar tu integración. No emite documentos reales al SRI
            ni consume créditos.
          </p>

          {sandboxKey ? (
            <div className="space-y-2">
              {/* Key en texto plano — siempre visible */}
              <div
                className="flex items-center gap-2 rounded-lg px-3 py-2.5"
                style={{ background: "color-mix(in srgb, var(--kipu-text) 5%, transparent)" }}
              >
                <FlaskConical size={13} className="shrink-0" style={{ color: "#60a5fa" }} />
                <code
                  className="text-xs flex-1 break-all transition-all"
                  style={{
                    color: showSandbox ? "var(--kipu-text)" : "var(--kipu-subtle)",
                    filter: showSandbox ? "none" : "blur(4px)",
                    userSelect: showSandbox ? "auto" : "none",
                  }}
                >
                  {sandboxKey.key ?? "kp_test_••••••••••••••••••••••••••••••••"}
                </code>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => setShowSandbox(!showSandbox)}
                    className="p-1 transition-colors"
                    style={{ color: "var(--kipu-subtle)" }}
                    onMouseEnter={e => e.currentTarget.style.color = "var(--kipu-text)"}
                    onMouseLeave={e => e.currentTarget.style.color = "var(--kipu-subtle)"}
                    title={showSandbox ? "Ocultar" : "Mostrar"}
                  >
                    {showSandbox ? <EyeOff size={13} /> : <Eye size={13} />}
                  </button>
                  {sandboxKey.key && (
                    <button
                      type="button"
                      onClick={() => copiar(sandboxKey.key!, "sandbox")}
                      className="p-1 transition-colors"
                      style={{ color: "var(--kipu-subtle)" }}
                      onMouseEnter={e => e.currentTarget.style.color = "var(--kipu-text)"}
                      onMouseLeave={e => e.currentTarget.style.color = "var(--kipu-subtle)"}
                      title="Copiar"
                    >
                      {copiado === "sandbox" ? (
                        <CheckCircle2 size={13} style={{ color: "var(--kipu-success)" }} />
                      ) : (
                        <Copy size={13} />
                      )}
                    </button>
                  )}
                </div>
              </div>

              <div className="flex justify-between text-xs" style={{ color: "var(--kipu-subtle)" }}>
                <span>
                  {sandboxKey.last_used_at
                    ? `Último uso: ${new Date(sandboxKey.last_used_at).toLocaleDateString("es-EC")}`
                    : "Sin usar aún"
                  }
                </span>
                <span>
                  Creada: {new Date(sandboxKey.created_at).toLocaleDateString("es-EC")}
                </span>
              </div>
            </div>
          ) : (
            <div className="text-center py-4">
              <p className="text-sm mb-3" style={{ color: "var(--kipu-subtle)" }}>Sin key de sandbox.</p>
              <button
                type="button"
                onClick={regenerarSandbox}
                disabled={regenSandbox}
                className="px-4 py-2 rounded-lg text-white text-xs font-medium transition-colors disabled:opacity-50"
                style={{ background: "#3b82f6" }}
              >
                Generar key de sandbox
              </button>
            </div>
          )}

          {/* Info de uso */}
          <div
            className="rounded-lg px-3 py-2.5 text-xs space-y-1"
            style={{
              background: "color-mix(in srgb, #60a5fa 5%, transparent)",
              border: "1px solid color-mix(in srgb, #60a5fa 15%, transparent)",
              color: "#93c5fd",
            }}
          >
            <p>· Prefix: <code className="font-semibold" style={{ color: "#bfdbfe" }}>kp_test_</code></p>
            <p>· Endpoint: mismo que producción</p>
            <p>· Documentos van al SRI de pruebas — no son legales</p>
            <p>· Email de confirmación va al dueño de la cuenta, no al cliente</p>
          </div>
        </div>
      </div>

      {/* Key nueva generada */}
      {nuevaKey && (
        <div
          className="rounded-xl p-4"
          style={{
            background: "color-mix(in srgb, var(--kipu-success) 10%, transparent)",
            border: "1px solid color-mix(in srgb, var(--kipu-success) 20%, transparent)",
          }}
        >
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle2 size={15} style={{ color: "var(--kipu-success)" }} />
            <p className="text-sm font-semibold" style={{ color: "var(--kipu-success)" }}>API Key creada</p>
          </div>
          <p className="text-xs mb-3" style={{ color: "var(--kipu-success)" }}>
            Guárdala ahora — no podrás verla de nuevo.
          </p>
          <div
            className="flex items-center gap-2 rounded-lg px-3 py-2"
            style={{ background: "color-mix(in srgb, var(--kipu-surface) 80%, transparent)" }}
          >
            <code className="text-xs flex-1 break-all" style={{ color: "var(--kipu-text)" }}>{nuevaKey}</code>
            <button
              type="button"
              onClick={() => copiar(nuevaKey, "nueva")}
              className="shrink-0 transition-colors"
              style={{ color: "var(--kipu-subtle)" }}
              onMouseEnter={e => e.currentTarget.style.color = "var(--kipu-text)"}
              onMouseLeave={e => e.currentTarget.style.color = "var(--kipu-subtle)"}
            >
              {copiado === "nueva" ? (
                <CheckCircle2 size={14} style={{ color: "var(--kipu-success)" }} />
              ) : (
                <Copy size={14} />
              )}
            </button>
          </div>
          <button
            type="button"
            onClick={() => setNuevaKey("")}
            className="mt-3 text-xs transition-colors"
            style={{ color: "var(--kipu-subtle)" }}
            onMouseEnter={e => e.currentTarget.style.color = "var(--kipu-text)"}
            onMouseLeave={e => e.currentTarget.style.color = "var(--kipu-subtle)"}
          >
            Ya la guardé, cerrar
          </button>
        </div>
      )}

      {/* ── Live Keys ─────────────────────────────────────────────────────── */}
      <div
        className="rounded-xl overflow-hidden"
        style={{
          background: "var(--kipu-surface)",
          border: "1px solid var(--kipu-border)",
        }}
      >
        <div
          className="flex items-center justify-between px-5 py-4"
          style={{ borderBottom: "1px solid var(--kipu-border)" }}
        >
          <div className="flex items-center gap-2">
            <Key size={15} style={{ color: "var(--kipu-accent)" }} />
            <h2 className="text-sm font-semibold" style={{ color: "var(--kipu-text)" }}>API Keys de Producción</h2>
            <span
              className="text-[10px] px-2 py-0.5 rounded-full font-bold"
              style={{
                background: "color-mix(in srgb, var(--kipu-success) 20%, transparent)",
                color: "var(--kipu-success)",
              }}
            >
              LIVE
            </span>
          </div>
          <button
            type="button"
            onClick={() => { setShowForm(true); setNombre(""); }}
            disabled={empresa?.ambiente !== 2}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-white text-xs font-medium transition-colors disabled:opacity-40"
            style={{ background: "var(--kipu-accent)" }}
            onMouseEnter={e => {
              if (empresa?.ambiente === 2) e.currentTarget.style.background = "var(--kipu-accent-h)";
            }}
            onMouseLeave={e => {
              if (empresa?.ambiente === 2) e.currentTarget.style.background = "var(--kipu-accent)";
            }}
            title={empresa?.ambiente !== 2 ? "Solo disponible en producción" : ""}
          >
            <Plus size={13} /> Nueva key
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div
              className="w-4 h-4 border-2 border-t-transparent rounded-full animate-spin"
              style={{ borderColor: "var(--kipu-accent)", borderTopColor: "transparent" }}
            />
          </div>
        ) : keys.length === 0 ? (
          <div className="text-center py-8">
            <Key size={32} className="mx-auto mb-2" style={{ color: "var(--kipu-subtle)" }} />
            <p className="text-sm" style={{ color: "var(--kipu-subtle)" }}>Sin API keys de producción.</p>
            {empresa?.ambiente !== 2 && (
              <p className="text-xs mt-2" style={{ color: "var(--kipu-warning)" }}>
                Activa tu cuenta en producción para crear keys live.
              </p>
            )}
          </div>
        ) : (
          <div>
            {keys.map((k, idx) => (
              <div
                key={k.id}
                className="flex items-center gap-3 px-5 py-3"
                style={{ borderTop: idx > 0 ? "1px solid var(--kipu-border)" : "none" }}
              >
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                  style={{ background: "color-mix(in srgb, var(--kipu-text) 5%, transparent)" }}
                >
                  <Key size={14} style={{ color: "var(--kipu-subtle)" }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium" style={{ color: "var(--kipu-text)" }}>{k.nombre}</p>
                  <p className="text-xs" style={{ color: "var(--kipu-subtle)" }}>
                    {k.last_used_at
                      ? `Último uso: ${new Date(k.last_used_at).toLocaleDateString("es-EC")}`
                      : "Sin usar aún"
                    } · Creada: {new Date(k.created_at).toLocaleDateString("es-EC")}
                  </p>
                </div>
                <span
                  className="text-xs px-2 py-0.5 rounded-full font-medium shrink-0"
                  style={{
                    background: k.estado === "activa"
                      ? "color-mix(in srgb, var(--kipu-success) 20%, transparent)"
                      : "color-mix(in srgb, var(--kipu-text) 10%, transparent)",
                    color: k.estado === "activa"
                      ? "var(--kipu-success)"
                      : "var(--kipu-subtle)",
                  }}
                >
                  {k.estado}
                </span>
                {k.estado === "activa" && (
                  <button
                    type="button"
                    onClick={() => setKeyToRevoke(k.id)}
                    className="p-1.5 rounded transition-colors shrink-0"
                    style={{ color: "var(--kipu-subtle)" }}
                    onMouseEnter={e => {
                      e.currentTarget.style.color = "var(--kipu-danger)";
                      e.currentTarget.style.background = "color-mix(in srgb, var(--kipu-danger) 10%, transparent)";
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.color = "var(--kipu-subtle)";
                      e.currentTarget.style.background = "transparent";
                    }}
                    title="Revocar"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal crear key */}
      {showForm && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div
            className="rounded-xl w-full max-w-sm p-5 space-y-4"
            style={{
              background: "var(--kipu-surface)",
              border: "1px solid var(--kipu-border)",
            }}
          >
            <div
              className="flex items-center justify-between pb-2"
              style={{ borderBottom: "1px solid var(--kipu-border)" }}
            >
              <h2 className="text-sm font-semibold" style={{ color: "var(--kipu-text)" }}>Nueva API Key Live</h2>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="transition-colors"
                style={{ color: "var(--kipu-subtle)" }}
                onMouseEnter={e => e.currentTarget.style.color = "var(--kipu-text)"}
                onMouseLeave={e => e.currentTarget.style.color = "var(--kipu-subtle)"}
              >
                <X size={18} />
              </button>
            </div>
            <div>
              <label className="block text-xs mb-1.5" style={{ color: "var(--kipu-subtle)" }}>Nombre de la integración</label>
              <input
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="Ej: WooCommerce, ERP, POS..."
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
            {nombre.trim() && (
              <PinInput
                tipoAccion="CREAR_TOKEN"
                email={email}
                label="crear una nueva API Key"
                onCancelar={() => setShowForm(false)}
                onConfirmar={crearConPin}
              />
            )}
          </div>
        </div>
      )}

      {/* Modal revocar key */}
      {keyToRevoke && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div
            className="rounded-xl w-full max-w-sm p-5"
            style={{
              background: "var(--kipu-surface)",
              border: "1px solid var(--kipu-border)",
            }}
          >
            <div
              className="rounded-lg p-3 mb-4 text-xs"
              style={{
                background: "color-mix(in srgb, var(--kipu-danger) 10%, transparent)",
                border: "1px solid color-mix(in srgb, var(--kipu-danger) 20%, transparent)",
                color: "var(--kipu-danger)",
              }}
            >
              ⚠️ Revocar una API Key deshabilitará inmediatamente cualquier integración vinculada.
            </div>
            <PinInput
              tipoAccion="ELIMINAR_TOKEN"
              email={email}
              label="revocar la API Key"
              onCancelar={() => setKeyToRevoke(null)}
              onConfirmar={revocarConPin}
            />
          </div>
        </div>
      )}

      {/* Info */}
      <div
        className="rounded-xl p-4 text-xs space-y-1.5"
        style={{
          background: "var(--kipu-surface)",
          border: "1px solid var(--kipu-border)",
          color: "var(--kipu-subtle)",
        }}
      >
        <p className="font-semibold mb-2" style={{ color: "var(--kipu-text)" }}>Diferencias entre keys</p>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <p className="font-medium" style={{ color: "#60a5fa" }}>kp_test_ (Sandbox)</p>
            <p>· SRI de pruebas</p>
            <p>· Sin cobro de créditos</p>
            <p>· Email al dueño de cuenta</p>
            <p>· Siempre visible</p>
          </div>
          <div className="space-y-1">
            <p className="font-medium" style={{ color: "var(--kipu-success)" }}>kp_live_ (Producción)</p>
            <p>· SRI real</p>
            <p>· Consume créditos</p>
            <p>· Email al cliente</p>
            <p>· Se muestra una sola vez</p>
          </div>
        </div>
      </div>
    </div>
  );
}