// app/(dashboard)/admin/notificaciones/page.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import { ArrowLeft, Bell, Send, Loader2, CheckCircle2, Users, User } from "lucide-react";
import { clsx } from "clsx";

const TIPOS = [
  { value: "SISTEMA",     label: "Sistema",      color: "text-blue-400 bg-blue-400/10" },
  { value: "DECLARACION", label: "Declaración",  color: "text-indigo-400 bg-indigo-400/10" },
  { value: "CREDITOS",    label: "Créditos",     color: "text-amber-400 bg-amber-400/10" },
  { value: "FACTURA",     label: "Factura",      color: "text-emerald-400 bg-emerald-400/10" },
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
          onClick={() => router.back()}
          className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
        >
          <ArrowLeft size={18} />
        </button>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-indigo-600/20 flex items-center justify-center">
            <Bell size={16} className="text-indigo-400" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white">Enviar Notificación</h1>
            <p className="text-xs text-gray-500">Push + in-app a emisores</p>
          </div>
        </div>
      </div>

      {/* Resultado exitoso */}
      {resultado?.ok && (
        <div className="flex items-center gap-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-4 py-3">
          <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
          <p className="text-sm text-emerald-300">{resultado.mensaje}</p>
        </div>
      )}

      {/* Destino */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 space-y-3">
        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Destino</h2>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => setDestino("todos")}
            className={clsx(
              "flex items-center gap-2 px-3 py-2.5 rounded-lg border text-sm transition-colors",
              destino === "todos"
                ? "border-indigo-500 bg-indigo-500/10 text-indigo-400"
                : "border-gray-700 text-gray-400 hover:text-white"
            )}
          >
            <Users size={15} />
            Todos en producción
          </button>
          <button
            onClick={() => setDestino("individual")}
            className={clsx(
              "flex items-center gap-2 px-3 py-2.5 rounded-lg border text-sm transition-colors",
              destino === "individual"
                ? "border-indigo-500 bg-indigo-500/10 text-indigo-400"
                : "border-gray-700 text-gray-400 hover:text-white"
            )}
          >
            <User size={15} />
            Emisor específico
          </button>
        </div>

        {destino === "individual" && (
          <div>
            <label className="block text-xs text-gray-500 mb-1.5">ID del emisor</label>
            <input
              type="number"
              value={emisorId}
              onChange={(e) => setEmisorId(e.target.value)}
              placeholder="Ej: 42"
              className="w-full px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500 text-sm"
            />
            <p className="text-xs text-gray-600 mt-1">
              Encuéntralo en la lista de emisores del panel.
            </p>
          </div>
        )}
      </div>

      {/* Tipo */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 space-y-3">
        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Tipo</h2>
        <div className="flex gap-2 flex-wrap">
          {TIPOS.map((t) => (
            <button
              key={t.value}
              onClick={() => setTipo(t.value)}
              className={clsx(
                "px-3 py-1.5 rounded-lg text-xs font-medium transition-colors",
                tipo === t.value
                  ? t.color
                  : "bg-gray-800 text-gray-400 hover:text-white"
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Contenido */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 space-y-3">
        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Contenido</h2>

        <div>
          <label className="block text-xs text-gray-500 mb-1.5">Título *</label>
          <input
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            placeholder="Ej: 🔔 Nueva funcionalidad disponible"
            maxLength={100}
            className="w-full px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500 text-sm"
          />
          <p className="text-xs text-gray-600 mt-1 text-right">{titulo.length}/100</p>
        </div>

        <div>
          <label className="block text-xs text-gray-500 mb-1.5">Mensaje *</label>
          <textarea
            value={mensaje}
            onChange={(e) => setMensaje(e.target.value)}
            placeholder="Descripción detallada de la notificación..."
            rows={4}
            maxLength={500}
            className="w-full px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500 text-sm resize-none"
          />
          <p className="text-xs text-gray-600 mt-1 text-right">{mensaje.length}/500</p>
        </div>

        <div>
          <label className="block text-xs text-gray-500 mb-1.5">URL de redirección</label>
          <input
            value={referencia}
            onChange={(e) => setReferencia(e.target.value)}
            placeholder="/dashboard"
            className="w-full px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500 text-sm"
          />
          <p className="text-xs text-gray-600 mt-1">
            Ruta a la que se redirige al hacer click en la notificación.
          </p>
        </div>
      </div>

      {/* Preview */}
      {(titulo || mensaje) && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 space-y-2">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Preview</h2>
          <div className="bg-gray-800 rounded-lg p-3 flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-600/20 flex items-center justify-center shrink-0">
              <Bell size={14} className="text-indigo-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-white">{titulo || "Título"}</p>
              <p className="text-xs text-gray-400 mt-0.5">{mensaje || "Mensaje..."}</p>
            </div>
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <p className="text-xs text-red-400 bg-red-400/10 px-3 py-2 rounded-lg">{error}</p>
      )}

      {/* Botones */}
      <div className="flex gap-3 pb-4">
        <button
          onClick={() => router.back()}
          className="flex-1 py-3 rounded-lg border border-gray-700 text-gray-400 hover:text-white text-sm transition-colors"
        >
          Cancelar
        </button>
        <button
          onClick={enviar}
          disabled={enviando || !titulo.trim() || !mensaje.trim()}
          className="flex-1 py-3 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold text-sm transition-colors flex items-center justify-center gap-2"
        >
          {enviando
            ? <><Loader2 size={16} className="animate-spin" /> Enviando...</>
            : <><Send size={16} /> {destino === "todos" ? "Enviar a todos" : "Enviar"}</>
          }
        </button>
      </div>

    </div>
  );
}