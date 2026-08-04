// components/configuracion/TabApiKeys.tsx
"use client";

import { useState, useEffect } from "react";
import api from "@/lib/api";
import { Plus, Copy, Trash2, Loader2, Key, CheckCircle2, X } from "lucide-react";
import { clsx } from "clsx";
import PinInput from "@/components/PinInput";
import { useAuthStore } from "@/store/auth.store";


interface ApiKey {
  id:           number;
  nombre:       string;
  tipo:         string;
  estado:       string;
  created_at:   string;
  last_used_at: string | null;
}


export default function TabApiKeys() {
  const email = useAuthStore((s) => s.email) ?? "";
  const [keys,        setKeys]        = useState<ApiKey[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [nombre,      setNombre]      = useState("");
  const [nuevaKey,    setNuevaKey]    = useState("");
  const [copiado,     setCopiado]     = useState(false);
  const [showForm,    setShowForm]    = useState(false);
  const [keyToRevoke, setKeyToRevoke] = useState<number | null>(null);

  const cargar = async () => {
    setLoading(true);
    try {
      const res = await api.get("/api/v1/app/apikeys");
      setKeys(res.data ?? []);
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

  const copiar = async (text: string) => {
    await navigator.clipboard.writeText(text);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  };

  return (
    <div className="space-y-4">

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
            <button
              onClick={() => copiar(nuevaKey)}
              className="shrink-0 text-gray-400 hover:text-white transition-colors"
            >
              {copiado ? <CheckCircle2 size={14} className="text-emerald-400" /> : <Copy size={14} />}
            </button>
          </div>
          <button
            onClick={() => setNuevaKey("")}
            className="mt-3 text-xs text-gray-500 hover:text-white transition-colors"
          >
            Ya la guardé, cerrar
          </button>
        </div>
      )}

      {/* Lista de keys */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800">
          <h2 className="text-sm font-semibold text-white">API Keys</h2>
          <button
            onClick={() => { setShowForm(true); setNombre(""); }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium transition-colors"
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
            <p className="text-sm text-gray-500">Sin API keys creadas.</p>
            <p className="text-xs text-gray-600 mt-1">
              Crea una para conectar sistemas externos a Kipu.
            </p>
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
                      ? `Último uso: ${new Date(k.last_used_at).toLocaleDateString()}`
                      : "Sin usar aún"
                    } · Creada: {new Date(k.created_at).toLocaleDateString()}
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
                  <button
                    onClick={() => setKeyToRevoke(k.id)}
                    className="p-1.5 rounded text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-colors shrink-0"
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

      {/* Modal crear key con PinInput */}
      {showForm && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-xl w-full max-w-sm p-5 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-gray-800">
              <h2 className="text-sm font-semibold text-white">Nueva API Key</h2>
              <button onClick={() => setShowForm(false)} className="text-gray-500 hover:text-white">
                <X size={18} />
              </button>
            </div>

            <div>
              <label className="block text-xs text-gray-500 mb-1.5">Nombre de la integración</label>
              <input
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="Ej: Mi sistema ERP"
                className="w-full px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500 text-sm"
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

      {/* Modal revocar key con PinInput */}
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
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
        <h3 className="text-xs font-semibold text-white mb-2">¿Para qué sirven las API Keys?</h3>
        <p className="text-xs text-gray-500">
          Permiten conectar sistemas externos (ERP, POS, tiendas online) a Kipu para emitir facturas 
          automáticamente. Cada key descuenta créditos de tu cuenta.
        </p>
        <a
          href="https://docs.kipu.ec/api"
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-indigo-400 hover:text-indigo-300 mt-2 inline-block"
        >
          Ver documentación de la API →
        </a>
      </div>
    </div>
  );
}