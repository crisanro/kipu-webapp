// app/(dashboard)/clientes/page.tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import api from "@/lib/api";
import {
  Search, Plus, User, Loader2, X,
  ChevronDown, Save, Trash2
} from "lucide-react";
import { clsx } from "clsx";

interface Cliente {
  uid:                      string;
  razon_social:            string;
  identificacion:          string;
  tipo_identificacion_sri: string;
  email:                   string;
  telefono:                string;
  direccion:               string;
}

const TIPO_ID = [
  { value: "04", label: "RUC" },
  { value: "05", label: "Cédula" },
  { value: "06", label: "Pasaporte" },
  { value: "08", label: "Exterior" },
];

const EMPTY_FORM = {
  tipo_identificacion_sri: "05",
  identificacion:          "",
  razon_social:            "",
  email:                   "",
  telefono:                "",
  direccion:               "",
};

export default function ClientesPage() {
  const [clientes,  setClientes]  = useState<Cliente[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [query,     setQuery]     = useState("");
  const [showModal, setShowModal] = useState(false);
  const [form,      setForm]      = useState(EMPTY_FORM);
  const [saving,    setSaving]    = useState(false);
  const [error,     setError]     = useState("");

  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get("/api/v1/app/clientes");
      setClientes(res.data.data ?? res.data ?? []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  const filtrados = clientes.filter((c) =>
    !query ||
    c.razon_social?.toLowerCase().includes(query.toLowerCase()) ||
    c.identificacion?.includes(query) ||
    c.email?.toLowerCase().includes(query.toLowerCase())
  );

  const handleSave = async () => {
    setError("");
    if (!form.identificacion || !form.razon_social) {
      setError("Identificación y razón social son obligatorios.");
      return;
    }
    setSaving(true);
    try {
      await api.post("/api/v1/app/clientes", form);
      await cargar();
      setShowModal(false);
      setForm(EMPTY_FORM);
    } catch (err: any) {
      setError(err?.response?.data?.detail ?? "Error al guardar el cliente.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-4 md:p-6">

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-white">Clientes</h1>
          <p className="text-sm text-gray-500">{clientes.length} registrados</p>
        </div>
        <button
          onClick={() => { setShowModal(true); setForm(EMPTY_FORM); setError(""); }}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium transition-colors"
        >
          <Plus size={15} />
          Nuevo cliente
        </button>
      </div>

      {/* Buscador */}
      <div className="relative mb-4">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar por nombre, RUC, cédula o email..."
          className="w-full pl-9 pr-4 py-2.5 rounded-lg bg-gray-900 border border-gray-800 text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500 text-sm"
        />
      </div>

      {/* Lista */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={24} className="animate-spin text-indigo-400" />
        </div>
      ) : filtrados.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <User size={40} className="text-gray-700 mb-3" />
          <p className="text-gray-500 text-sm">
            {query ? "No hay clientes que coincidan." : "Aún no tienes clientes registrados."}
          </p>
          {!query && (
            <button
              onClick={() => setShowModal(true)}
              className="mt-4 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium transition-colors"
            >
              Agregar primer cliente
            </button>
          )}
        </div>
      ) : (
        <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
          <div className="divide-y divide-gray-800">
            {filtrados.map((c) => (
              <Link
                key={c.uid}
                href={`/clientes/${c.uid}`}
                className="flex items-center gap-3 px-4 py-3 hover:bg-gray-800/50 transition-colors"
              >
                <div className="w-9 h-9 rounded-full bg-indigo-600/20 flex items-center justify-center shrink-0">
                  <span className="text-sm font-bold text-indigo-400">
                    {c.razon_social?.[0] ?? "?"}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">{c.razon_social}</p>
                  <p className="text-xs text-gray-500">
                    {TIPO_ID.find(t => t.value === c.tipo_identificacion_sri)?.label ?? "ID"}: {c.identificacion}
                    {c.email && ` · ${c.email}`}
                  </p>
                </div>
                {c.telefono && (
                  <span className="text-xs text-gray-500 hidden md:block">{c.telefono}</span>
                )}
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Modal crear cliente */}
      {showModal && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-xl w-full max-w-md">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800">
              <h2 className="text-sm font-semibold text-white">Nuevo cliente</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-500 hover:text-white">
                <X size={18} />
              </button>
            </div>

            <div className="p-5 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1.5">Tipo ID</label>
                  <div className="relative">
                    <select
                      value={form.tipo_identificacion_sri}
                      onChange={(e) => setForm({ ...form, tipo_identificacion_sri: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white focus:outline-none focus:border-indigo-500 text-sm appearance-none"
                    >
                      {TIPO_ID.map(t => (
                        <option key={t.value} value={t.value}>{t.label}</option>
                      ))}
                    </select>
                    <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1.5">Identificación *</label>
                  <input
                    value={form.identificacion}
                    onChange={(e) => setForm({ ...form, identificacion: e.target.value })}
                    placeholder="0000000000"
                    className="w-full px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500 text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs text-gray-500 mb-1.5">Razón Social / Nombre *</label>
                <input
                  value={form.razon_social}
                  onChange={(e) => setForm({ ...form, razon_social: e.target.value })}
                  placeholder="EMPRESA S.A. o Juan Pérez"
                  className="w-full px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs text-gray-500 mb-1.5">Email</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="cliente@email.com"
                  className="w-full px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500 text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1.5">Teléfono</label>
                  <input
                    value={form.telefono}
                    onChange={(e) => setForm({ ...form, telefono: e.target.value })}
                    placeholder="0999999999"
                    className="w-full px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1.5">Dirección</label>
                  <input
                    value={form.direccion}
                    onChange={(e) => setForm({ ...form, direccion: e.target.value })}
                    placeholder="Av. Principal 123"
                    className="w-full px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500 text-sm"
                  />
                </div>
              </div>

              {error && (
                <p className="text-xs text-red-400 bg-red-400/10 px-3 py-2 rounded-lg">{error}</p>
              )}

              <div className="flex gap-3 pt-1">
                <button
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-2.5 rounded-lg border border-gray-700 text-gray-400 hover:text-white text-sm transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex-1 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-medium transition-colors flex items-center justify-center gap-2"
                >
                  {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                  Guardar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}