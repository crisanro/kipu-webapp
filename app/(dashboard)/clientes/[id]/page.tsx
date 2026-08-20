// app/clientes/[id]/page.tsx
"use client";
import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import api from "@/lib/api";
import {
  ArrowLeft, User, Mail, Phone, MapPin, FileText,
  CheckCircle2, Clock, AlertTriangle, XCircle,
  Loader2, Edit2, Save, X, Plus
} from "lucide-react";
import { clsx } from "clsx";

const TIPO_ID: Record<string, string> = {
  "04": "RUC",
  "05": "Cédula",
  "06": "Pasaporte",
  "07": "Consumidor Final",
  "08": "Exterior",
};

const ESTADO_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  AUTORIZADO: { label: "Autorizado", color: "text-emerald-400 bg-emerald-400/10", icon: CheckCircle2 },
  RECIBIDA:   { label: "En proceso", color: "text-indigo-400 bg-indigo-400/10",    icon: Clock },
  FIRMADO:    { label: "En cola",    color: "text-blue-400 bg-blue-400/10",        icon: Clock },
  DEVUELTA:   { label: "Devuelto",   color: "text-amber-400 bg-amber-400/10",      icon: AlertTriangle },
  RECHAZADO:  { label: "Rechazado",  color: "text-red-400 bg-red-400/10",          icon: XCircle },
};

const fmt = (n: any) => parseFloat(n ?? 0).toFixed(2);

export default function DetalleClientePage() {
  const { id } = useParams();
  const router  = useRouter();

  const [data,    setData]    = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving,  setSaving]  = useState(false);
  const [error,   setError]   = useState("");
  const [form,    setForm]    = useState<any>({});

  const cargar = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/api/v1/app/clientes/detalle/${id}`);
      setData(res.data);
      setForm({
        razon_social: res.data.cliente.razon_social,
        email:        res.data.cliente.email        ?? "",
        telefono:     res.data.cliente.telefono     ?? "",
        direccion:    res.data.cliente.direccion    ?? "",
      });
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { cargar(); }, [id]);

  const guardar = async () => {
    setError("");
    setSaving(true);
    try {
      await api.patch(`/api/v1/app/clientes/${id}`, form);
      await cargar();
      setEditing(false);
    } catch (err: any) {
      setError(err?.response?.data?.detail ?? "Error al guardar.");
    } finally {
      setSaving(false);
    }
  };

  const nuevaFactura = () => {
    if (!data?.cliente) return;
    sessionStorage.setItem("kipu:prefill", JSON.stringify({
      cliente: {
        id:            data.cliente.id,
        razon_social:  data.cliente.razon_social,
        identificacion: data.cliente.identificacion,
        tipo_id:       data.cliente.tipo_identificacion_sri,
      },
      esConsumidorFinal: false,
      items: [],
      formaPago: "01",
      camposAdicionales: data.cliente.email
        ? [{ nombre: "Email", valor: data.cliente.email }]
        : [],
    }));
    router.push("/documentos/emitir/fac");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 size={24} className="animate-spin text-indigo-400" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-6 text-center">
        <User size={40} className="text-gray-700 mx-auto mb-3" />
        <p className="text-gray-500">Cliente no encontrado.</p>
        <button onClick={() => router.back()} className="mt-4 text-indigo-400 text-sm">Volver</button>
      </div>
    );
  }

  const { cliente, resumen, facturas } = data;

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto space-y-4">

      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="text-xl font-bold text-white">{cliente.razon_social}</h1>
            <p className="text-sm text-gray-500">
              {TIPO_ID[cliente.tipo_identificacion_sri] ?? "ID"}: {cliente.identificacion}
            </p>
          </div>
        </div>
        <button
          onClick={nuevaFactura}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium transition-colors shrink-0"
        >
          <Plus size={13} />
          <span className="hidden sm:inline">Nueva factura</span>
        </button>
      </div>

      {/* Resumen */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <p className="text-xs text-gray-500 mb-1">Total facturado</p>
          <p className="text-2xl font-bold text-white">${fmt(resumen.suma_facturada)}</p>
          <p className="text-xs text-gray-600 mt-0.5">solo autorizadas</p>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <p className="text-xs text-gray-500 mb-1">Facturas emitidas</p>
          <p className="text-2xl font-bold text-white">{resumen.total_documentos}</p>
          <p className="text-xs text-gray-600 mt-0.5">total histórico</p>
        </div>
      </div>

      {/* Datos del cliente */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Datos del cliente</h2>
          {!editing ? (
            <button
              onClick={() => setEditing(true)}
              className="flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
            >
              <Edit2 size={12} /> Editar
            </button>
          ) : (
            <div className="flex gap-2">
              <button
                onClick={() => { setEditing(false); setError(""); }}
                className="flex items-center gap-1 text-xs text-gray-500 hover:text-white transition-colors"
              >
                <X size={12} /> Cancelar
              </button>
              <button
                onClick={guardar}
                disabled={saving}
                className="flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
              >
                {saving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
                Guardar
              </button>
            </div>
          )}
        </div>

        <div className="space-y-3">
          {/* Tipo + Identificación — no editables */}
          <div className="flex justify-between text-sm">
            <span className="text-gray-500 flex items-center gap-2">
              <User size={13} /> Tipo
            </span>
            <span className="text-white">{TIPO_ID[cliente.tipo_identificacion_sri] ?? cliente.tipo_identificacion_sri}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500 flex items-center gap-2">
              <FileText size={13} /> Identificación
            </span>
            <span className="text-white font-mono">{cliente.identificacion}</span>
          </div>

          {/* Razón Social */}
          <div className="flex justify-between items-center text-sm">
            <span className="text-gray-500 flex items-center gap-2 shrink-0">
              <User size={13} /> Nombre
            </span>
            {editing ? (
              <input
                value={form.razon_social}
                onChange={(e) => setForm({ ...form, razon_social: e.target.value })}
                className="flex-1 ml-4 px-2 py-1 rounded-lg bg-gray-800 border border-gray-700 text-white text-xs focus:outline-none focus:border-indigo-500 text-right"
              />
            ) : (
              <span className="text-white text-right">{cliente.razon_social}</span>
            )}
          </div>

          {/* Email */}
          <div className="flex justify-between items-center text-sm">
            <span className="text-gray-500 flex items-center gap-2 shrink-0">
              <Mail size={13} /> Email
            </span>
            {editing ? (
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="cliente@email.com"
                className="flex-1 ml-4 px-2 py-1 rounded-lg bg-gray-800 border border-gray-700 text-white text-xs focus:outline-none focus:border-indigo-500 text-right"
              />
            ) : (
              <span className="text-white">{cliente.email || "—"}</span>
            )}
          </div>

          {/* Teléfono */}
          <div className="flex justify-between items-center text-sm">
            <span className="text-gray-500 flex items-center gap-2 shrink-0">
              <Phone size={13} /> Teléfono
            </span>
            {editing ? (
              <input
                value={form.telefono}
                onChange={(e) => setForm({ ...form, telefono: e.target.value })}
                placeholder="0999999999"
                className="flex-1 ml-4 px-2 py-1 rounded-lg bg-gray-800 border border-gray-700 text-white text-xs focus:outline-none focus:border-indigo-500 text-right"
              />
            ) : (
              <span className="text-white">{cliente.telefono || "—"}</span>
            )}
          </div>

          {/* Dirección */}
          <div className="flex justify-between items-center text-sm">
            <span className="text-gray-500 flex items-center gap-2 shrink-0">
              <MapPin size={13} /> Dirección
            </span>
            {editing ? (
              <input
                value={form.direccion}
                onChange={(e) => setForm({ ...form, direccion: e.target.value })}
                placeholder="Av. Principal 123"
                className="flex-1 ml-4 px-2 py-1 rounded-lg bg-gray-800 border border-gray-700 text-white text-xs focus:outline-none focus:border-indigo-500 text-right"
              />
            ) : (
              <span className="text-white text-right max-w-[60%]">{cliente.direccion || "—"}</span>
            )}
          </div>
        </div>

        {error && (
          <p className="mt-3 text-xs text-red-400 bg-red-400/10 px-3 py-2 rounded-lg">{error}</p>
        )}
      </div>

      {/* Historial de facturas */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-800">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
            Historial de facturas
          </h2>
        </div>
        {facturas.length === 0 ? (
          <div className="px-4 py-8 text-center">
            <p className="text-xs text-gray-600">Sin facturas emitidas a este cliente.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-800">
            {facturas.map((f: any) => {
              const estado = ESTADO_CONFIG[f.estado_sri] ?? ESTADO_CONFIG.FIRMADO;
              const Icon   = estado.icon;
              return (
                <Link
                  key={f.id}
                  href={`/documentos/${f.id}`}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-gray-800/50 transition-colors"
                >
                  <div className={clsx(
                    "w-7 h-7 rounded-full flex items-center justify-center shrink-0",
                    estado.color.split(" ")[1]
                  )}>
                    <Icon size={13} className={estado.color.split(" ")[0]} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-mono text-indigo-400">{f.numero_doc}</p>
                    <p className="text-xs text-gray-500">{f.fecha_emision}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-semibold text-white">${fmt(f.importe_total)}</p>
                    <p className={clsx("text-xs", estado.color.split(" ")[0])}>{estado.label}</p>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
}