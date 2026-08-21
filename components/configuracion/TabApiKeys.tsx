"use client";
import { useState, useEffect } from "react";
import api from "@/lib/api";
import {
  Plus, Copy, Trash2, Loader2, Key, CheckCircle2, X,
  FlaskConical, RefreshCw, Eye, EyeOff
} from "lucide-react";
import { clsx } from "clsx";
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
      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800">
          <div className="flex items-center gap-2">
            <FlaskConical size={15} className="text-blue-400" />
            <h2 className="text-sm font-semibold text-white">API Key de Pruebas</h2>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 font-bold">
              SANDBOX
            </span>
          </div>
          <button
            onClick={regenerarSandbox}
            disabled={regenSandbox}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-700 text-gray-400 hover:text-white text-xs transition-colors disabled:opacity-40"
          >
            {regenSandbox
              ? <Loader2 size={12} className="animate-spin" />
              : <RefreshCw size={12} />
            }
            Regenerar
          </button>
        </div>

        <div className="p-5 space-y-3">
          <p className="text-xs text-gray-500">
            Usa esta key para probar tu integración. No emite documentos reales al SRI
            ni consume créditos.
          </p>

          {sandboxKey ? (
            <div className="space-y-2">
              {/* Key en texto plano — siempre visible */}
              <div className="flex items-center gap-2 bg-gray-800 rounded-lg px-3 py-2.5">
                <FlaskConical size={13} className="text-blue-400 shrink-0" />
                <code className={clsx(
                  "text-xs flex-1 break-all transition-all",
                  showSandbox ? "text-white" : "text-gray-600 select-none blur-sm"
                )}>
                  {sandboxKey.key ?? "kp_test_••••••••••••••••••••••••••••••••"}
                </code>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => setShowSandbox(!showSandbox)}
                    className="p-1 text-gray-500 hover:text-white transition-colors"
                    title={showSandbox ? "Ocultar" : "Mostrar"}
                  >
                    {showSandbox ? <EyeOff size={13} /> : <Eye size={13} />}
                  </button>
                  {sandboxKey.key && (
                    <button
                      onClick={() => copiar(sandboxKey.key!, "sandbox")}
                      className="p-1 text-gray-500 hover:text-white transition-colors"
                      title="Copiar"
                    >
                      {copiado === "sandbox"
                        ? <CheckCircle2 size={13} className="text-emerald-400" />
                        : <Copy size={13} />
                      }
                    </button>
                  )}
                </div>
              </div>

              <div className="flex justify-between text-xs text-gray-600">
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
              <p className="text-sm text-gray-500 mb-3">Sin key de sandbox.</p>
              <button
                onClick={regenerarSandbox}
                disabled={regenSandbox}
                className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-medium transition-colors"
              >
                Generar key de sandbox
              </button>
            </div>
          )}

          {/* Info de uso */}
          <div className="bg-blue-500/5 border border-blue-500/15 rounded-lg px-3 py-2.5 text-xs text-blue-400/70 space-y-1">
            <p>· Prefix: <code className="text-blue-300">kp_test_</code></p>
            <p>· Endpoint: mismo que producción</p>
            <p>· Documentos van al SRI de pruebas — no son legales</p>
            <p>· Email de confirmación va al dueño de la cuenta, no al cliente</p>
          </div>
        </div>
      </div>

      {/* Key nueva generada */}
      {nuevaKey && (
        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle2 size={15} className="text-emerald-400" />
            <p className="text-sm font-semibold text-emerald-300">API Key creada</p>
          </div>
          <p className="text-xs text-emerald-400/80 mb-3">
            Guárdala ahora — no podrás verla de nuevo.
          </p>
          <div className="flex items-center gap-2 bg-gray-900 rounded-lg px-3 py-2">
            <code className="text-xs text-white flex-1 break-all">{nuevaKey}</code>
            <button onClick={() => copiar(nuevaKey, "nueva")}
              className="shrink-0 text-gray-400 hover:text-white transition-colors">
              {copiado === "nueva"
                ? <CheckCircle2 size={14} className="text-emerald-400" />
                : <Copy size={14} />
              }
            </button>
          </div>
          <button onClick={() => setNuevaKey("")}
            className="mt-3 text-xs text-gray-500 hover:text-white transition-colors">
            Ya la guardé, cerrar
          </button>
        </div>
      )}

      {/* ── Live Keys ─────────────────────────────────────────────────────── */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800">
          <div className="flex items-center gap-2">
            <Key size={15} className="text-indigo-400" />
            <h2 className="text-sm font-semibold text-white">API Keys de Producción</h2>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold">
              LIVE
            </span>
          </div>
          <button
            onClick={() => { setShowForm(true); setNombre(""); }}
            disabled={empresa?.ambiente !== 2}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white text-xs font-medium transition-colors"
            title={empresa?.ambiente !== 2 ? "Solo disponible en producción" : ""}
          >
            <Plus size={13} /> Nueva key
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 size={18} className="animate-spin text-indigo-400" />
          </div>
        ) : keys.length === 0 ? (
          <div className="text-center py-8">
            <Key size={32} className="text-gray-700 mx-auto mb-2" />
            <p className="text-sm text-gray-500">Sin API keys de producción.</p>
            {empresa?.ambiente !== 2 && (
              <p className="text-xs text-amber-400 mt-2">
                Activa tu cuenta en producción para crear keys live.
              </p>
            )}
          </div>
        ) : (
          <div className="divide-y divide-gray-800">
            {keys.map((k) => (
              <div key={k.id} className="flex items-center gap-3 px-5 py-3">
                <div className="w-8 h-8 rounded-lg bg-gray-800 flex items-center justify-center shrink-0">
                  <Key size={14} className="text-gray-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white font-medium">{k.nombre}</p>
                  <p className="text-xs text-gray-500">
                    {k.last_used_at
                      ? `Último uso: ${new Date(k.last_used_at).toLocaleDateString("es-EC")}`
                      : "Sin usar aún"
                    } · Creada: {new Date(k.created_at).toLocaleDateString("es-EC")}
                  </p>
                </div>
                <span className={clsx(
                  "text-xs px-2 py-0.5 rounded-full font-medium shrink-0",
                  k.estado === "activa"
                    ? "bg-emerald-500/20 text-emerald-400"
                    : "bg-gray-700 text-gray-500"
                )}>
                  {k.estado}
                </span>
                {k.estado === "activa" && (
                  <button onClick={() => setKeyToRevoke(k.id)}
                    className="p-1.5 rounded text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-colors shrink-0"
                    title="Revocar">
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
          <div className="bg-gray-900 border border-gray-800 rounded-xl w-full max-w-sm p-5 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-gray-800">
              <h2 className="text-sm font-semibold text-white">Nueva API Key Live</h2>
              <button onClick={() => setShowForm(false)} className="text-gray-500 hover:text-white">
                <X size={18} />
              </button>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1.5">Nombre de la integración</label>
              <input value={nombre} onChange={(e) => setNombre(e.target.value)}
                placeholder="Ej: WooCommerce, ERP, POS..."
                className="w-full px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500 text-sm" />
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
          <div className="bg-gray-900 border border-gray-800 rounded-xl w-full max-w-sm p-5">
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 mb-4">
              <p className="text-xs text-red-300">
                ⚠️ Revocar una API Key deshabilitará inmediatamente cualquier integración vinculada.
              </p>
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
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 text-xs text-gray-500 space-y-1.5">
        <p className="font-semibold text-gray-400 mb-2">Diferencias entre keys</p>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <p className="text-blue-400 font-medium">kp_test_ (Sandbox)</p>
            <p>· SRI de pruebas</p>
            <p>· Sin cobro de créditos</p>
            <p>· Email al dueño de cuenta</p>
            <p>· Siempre visible</p>
          </div>
          <div className="space-y-1">
            <p className="text-emerald-400 font-medium">kp_live_ (Producción)</p>
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