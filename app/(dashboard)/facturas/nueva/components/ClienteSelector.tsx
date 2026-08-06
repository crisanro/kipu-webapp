// app/(dashboard)/facturas/nueva/components/ClienteSelector.tsx
"use client";

import { useRef, useEffect, useCallback, useState } from "react";
import api from "@/lib/api";
import { Search, Loader2, User, X } from "lucide-react";

interface Cliente {
  id:                      string;
  razon_social:            string;
  identificacion:          string;
  tipo_identificacion_sri: string;
  email:                   string;
  direccion:               string;
}

interface ClienteNuevo {
  tipo_identificacion_sri: string;
  identificacion:          string;
  razon_social:            string;
  email:                   string;
}

interface Props {
  clienteSelected:    Cliente | null;
  esConsumidorFinal:  boolean;
  clienteNuevo:       ClienteNuevo | null;
  onSelectCliente:    (c: Cliente) => void;
  onSelectConsumidorFinal: () => void;
  onClienteNuevo:     (c: ClienteNuevo | null) => void;
  onClear:            () => void;
}

export default function ClienteSelector({
  clienteSelected,
  esConsumidorFinal,
  clienteNuevo,
  onSelectCliente,
  onSelectConsumidorFinal,
  onClienteNuevo,
  onClear,
}: Props) {
  const [query,    setQuery]    = useState("");
  const [results,  setResults]  = useState<Cliente[]>([]);
  const [loading,  setLoading]  = useState(false);
  const [showDrop, setShowDrop] = useState(false);

  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  // Sincronizar query con selección externa
  useEffect(() => {
    if (esConsumidorFinal) { setQuery("CONSUMIDOR FINAL"); return; }
    if (clienteSelected)   { setQuery(clienteSelected.razon_social); return; }
    if (!clienteNuevo)     { setQuery(""); }
  }, [clienteSelected, esConsumidorFinal, clienteNuevo]);

  // Cerrar dropdown al hacer clic fuera
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setShowDrop(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const buscar = useCallback(async (q: string) => {
    if (!q || q.length < 2) { setResults([]); return; }
    setLoading(true);
    try {
      const res = await api.get(`/api/v1/app/clientes?q=${encodeURIComponent(q)}`);
      setResults(res.data.data ?? []);
      setShowDrop(true);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => buscar(query), 300);
    return () => { if (timer.current) clearTimeout(timer.current); };
  }, [query, buscar]);

  const handleInputChange = (val: string) => {
    setQuery(val);
    onClear();
    setShowDrop(true);
  };

  const seleccionar = (c: Cliente) => {
    onSelectCliente(c);
    setQuery(c.razon_social);
    setShowDrop(false);
    setResults([]);
  };

  const seleccionarConsumidorFinal = () => {
    onSelectConsumidorFinal();
    setQuery("CONSUMIDOR FINAL");
    setShowDrop(false);
    setResults([]);
  };

  const limpiar = () => {
    onClear();
    onClienteNuevo(null);
    setQuery("");
    setResults([]);
    setShowDrop(false);
  };

  return (
    <div className="bg-gray-900 rounded-xl border border-gray-800 p-4">
      <div className="flex items-center gap-2 mb-3">
        <User size={15} className="text-indigo-400" />
        <h2 className="text-sm font-semibold text-white">Cliente</h2>
      </div>

      {/* Input búsqueda */}
      <div className="relative" ref={wrapRef}>
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            value={query}
            onChange={(e) => handleInputChange(e.target.value)}
            onFocus={() => { if (query.length >= 2) setShowDrop(true); }}
            placeholder="Buscar por nombre, RUC o cédula..."
            className="w-full pl-9 pr-4 py-2.5 rounded-lg bg-gray-800 border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 text-sm"
          />
          {loading && (
            <Loader2 size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 animate-spin" />
          )}
        </div>

        {/* Atajo consumidor final */}
        {!clienteSelected && !esConsumidorFinal && !clienteNuevo && (
          <button
            type="button"
            onClick={seleccionarConsumidorFinal}
            className="mt-2 text-xs text-gray-500 hover:text-white transition-colors block"
          >
            ¿Sin RUC? → Facturar a{" "}
            <span className="text-indigo-400 underline">Consumidor Final</span>
          </button>
        )}

        {/* Dropdown */}
        {showDrop && (results.length > 0 || query.length >= 2) && (
          <div className="absolute z-10 w-full mt-1 bg-gray-800 border border-gray-700 rounded-lg shadow-xl overflow-hidden">
            {/* Consumidor final siempre arriba */}
            <button
              onClick={seleccionarConsumidorFinal}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-700 text-left border-b border-gray-700"
            >
              <div className="w-7 h-7 rounded-full bg-gray-600 flex items-center justify-center shrink-0">
                <User size={13} className="text-gray-400" />
              </div>
              <div>
                <p className="text-sm text-white font-medium">Consumidor Final</p>
                <p className="text-xs text-gray-500">9999999999999 · Máx. $50</p>
              </div>
            </button>

            {/* Resultados */}
            {results.map((c) => (
              <button
                key={c.id}
                onClick={() => seleccionar(c)}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-700 text-left border-b border-gray-700/50 last:border-0"
              >
                <div className="w-7 h-7 rounded-full bg-indigo-600/30 flex items-center justify-center shrink-0">
                  <span className="text-xs text-indigo-400 font-bold">
                    {c.razon_social[0]}
                  </span>
                </div>
                <div>
                  <p className="text-sm text-white">{c.razon_social}</p>
                  <p className="text-xs text-gray-500">{c.identificacion}</p>
                </div>
              </button>
            ))}

            {/* No encontrado → registrar nuevo */}
            {results.length === 0 && query.length >= 2 && (
              <div className="px-4 py-3 space-y-2">
                <p className="text-xs text-gray-500">No encontrado.</p>
                <button
                  type="button"
                  onClick={() => {
                    setShowDrop(false);
                    onClienteNuevo({
                      tipo_identificacion_sri: "05",
                      identificacion:          query,
                      razon_social:            "",
                      email:                   "",
                    });
                  }}
                  className="text-xs text-indigo-400 underline block text-left"
                >
                  + Registrar "{query}" como nuevo cliente
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Formulario cliente nuevo inline */}
      {clienteNuevo && (
        <div className="mt-3 bg-gray-800 rounded-lg p-3 space-y-2 border border-indigo-500/30">
          <p className="text-xs text-indigo-400 font-medium">Nuevo cliente</p>
          <div className="grid grid-cols-2 gap-2">
            <select
              value={clienteNuevo.tipo_identificacion_sri}
              onChange={(e) => onClienteNuevo({ ...clienteNuevo, tipo_identificacion_sri: e.target.value })}
              className="px-2 py-1.5 rounded-lg bg-gray-700 border border-gray-600 text-white text-xs focus:outline-none focus:border-indigo-500"
            >
              <option value="04">RUC</option>
              <option value="05">Cédula</option>
              <option value="06">Pasaporte</option>
              <option value="08">Exterior</option>
            </select>
            <input
              value={clienteNuevo.identificacion}
              onChange={(e) => onClienteNuevo({ ...clienteNuevo, identificacion: e.target.value })}
              placeholder="Identificación"
              className="px-2 py-1.5 rounded-lg bg-gray-700 border border-gray-600 text-white placeholder-gray-500 text-xs focus:outline-none focus:border-indigo-500"
            />
          </div>
          <input
            value={clienteNuevo.razon_social}
            onChange={(e) => onClienteNuevo({ ...clienteNuevo, razon_social: e.target.value })}
            placeholder="Nombre / Razón Social *"
            className="w-full px-2 py-1.5 rounded-lg bg-gray-700 border border-gray-600 text-white placeholder-gray-500 text-xs focus:outline-none focus:border-indigo-500"
          />
          <input
            value={clienteNuevo.email}
            onChange={(e) => onClienteNuevo({ ...clienteNuevo, email: e.target.value })}
            placeholder="Email (opcional)"
            className="w-full px-2 py-1.5 rounded-lg bg-gray-700 border border-gray-600 text-white placeholder-gray-500 text-xs focus:outline-none focus:border-indigo-500"
          />
          <button
            type="button"
            onClick={() => onClienteNuevo(null)}
            className="text-xs text-gray-500 hover:text-white transition-colors"
          >
            Cancelar
          </button>
        </div>
      )}

      {/* Cliente seleccionado */}
      {(clienteSelected || esConsumidorFinal) && (
        <div className="mt-3 flex items-center gap-3 bg-gray-800 rounded-lg px-3 py-2.5">
          <div className="w-7 h-7 rounded-full bg-indigo-600/30 flex items-center justify-center shrink-0">
            <User size={13} className="text-indigo-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm text-white font-medium truncate">
              {esConsumidorFinal ? "Consumidor Final" : clienteSelected?.razon_social}
            </p>
            <p className="text-xs text-gray-500">
              {esConsumidorFinal ? "9999999999999" : clienteSelected?.identificacion}
            </p>
          </div>
          <button
            onClick={limpiar}
            className="text-gray-500 hover:text-white p-1 transition-colors"
          >
            <X size={16} />
          </button>
        </div>
      )}
    </div>
  );
}