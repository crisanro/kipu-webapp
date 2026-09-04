// app/(dashboard)/documentos/emitir/fac/components/ClienteSelector.tsx
"use client";
import { useRef, useEffect, useCallback, useState } from "react";
import api from "@/lib/api";
import { Search, Loader2, User, X, Check, AlertCircle } from "lucide-react";

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
  clienteSelected:           Cliente | null;
  esConsumidorFinal:         boolean;
  clienteNuevo:              ClienteNuevo | null;
  onSelectCliente:           (c: Cliente) => void;
  onSelectConsumidorFinal:   () => void;
  onClienteNuevo:            (c: ClienteNuevo | null) => void;
  onClear:                   () => void;
}

// ── Validación identificación ────────────────────────────────────────────────
function validarIdentificacion(
  tipo: string,
  valor: string
): { ok: boolean; error: string } {
  const v = valor.replace(/\D/g, ""); // solo dígitos

  if (!v) return { ok: false, error: "" }; // vacío — sin mensaje aún

  if (tipo === "05") {
    // Cédula — 10 dígitos, módulo 10
    if (v.length !== 10) return { ok: false, error: "La cédula debe tener 10 dígitos." };
    const prov = parseInt(v.substring(0, 2));
    if ((prov < 1 || prov > 24) && prov !== 30)
      return { ok: false, error: "Provincia inválida (primeros 2 dígitos)." };
    if (parseInt(v[2]) >= 6)
      return { ok: false, error: "Tercer dígito de cédula inválido." };
    // Módulo 10
    const digitos = v.split("").map(Number);
    const verificador = digitos[9];
    let suma = 0;
    for (let i = 0; i < 9; i++) {
      let prod = digitos[i] * (i % 2 === 0 ? 2 : 1);
      if (prod > 9) prod -= 9;
      suma += prod;
    }
    const calc = suma % 10 === 0 ? 0 : 10 - (suma % 10);
    if (calc !== verificador) return { ok: false, error: "Número de cédula inválido." };
    return { ok: true, error: "" };
  }

  if (tipo === "04") {
    if (v.length !== 13) return { ok: false, error: "El RUC debe tener 13 dígitos." };
    if (!v.endsWith("001")) return { ok: false, error: "El RUC debe terminar en 001." };
    
    const prov = parseInt(v.substring(0, 2));
    if ((prov < 1 || prov > 24) && prov !== 30)
      return { ok: false, error: "Provincia inválida (primeros 2 dígitos)." };
    
    const tercero = parseInt(v[2]);

    if (tercero >= 0 && tercero <= 5) {
      // Persona natural — validar módulo 10 sobre los primeros 10 dígitos
      const digitos = v.substring(0, 10).split("").map(Number);
      const verificador = digitos[9];
      let suma = 0;
      for (let i = 0; i < 9; i++) {
        let prod = digitos[i] * (i % 2 === 0 ? 2 : 1);
        if (prod > 9) prod -= 9;
        suma += prod;
      }
      const calc = suma % 10 === 0 ? 0 : 10 - (suma % 10);
      if (calc !== verificador) return { ok: false, error: "RUC de persona natural inválido." };
    } else if (tercero === 6 || tercero === 9) {
      // Jurídico público (6) o privado (9) — no se valida dígito verificador
    } else {
      // 7 u 8 — inválido
      return { ok: false, error: "Tercer dígito de RUC inválido." };
    }

    return { ok: true, error: "" };
  }

  // Pasaporte / Exterior — libre, solo que no esté vacío
  if (tipo === "06" || tipo === "08") {
    if (valor.trim().length < 2) return { ok: false, error: "Ingresa la identificación." };
    return { ok: true, error: "" };
  }

  return { ok: true, error: "" };
}

// ── Componente ───────────────────────────────────────────────────────────────
export default function ClienteSelector({
  clienteSelected,
  esConsumidorFinal,
  clienteNuevo,
  onSelectCliente,
  onSelectConsumidorFinal,
  onClienteNuevo,
  onClear,
}: Props) {
  const [query,      setQuery]      = useState("");
  const [results,    setResults]    = useState<Cliente[]>([]);
  const [loading,    setLoading]    = useState(false);
  const [showDrop,   setShowDrop]   = useState(false);
  const [confirmado, setConfirmado] = useState(false);

  const timer   = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  // Validación en tiempo real
  const validacion = clienteNuevo
    ? validarIdentificacion(clienteNuevo.tipo_identificacion_sri, clienteNuevo.identificacion)
    : { ok: false, error: "" };

  const puedeConfirmar =
    !!clienteNuevo?.razon_social.trim() &&
    (validacion.ok || clienteNuevo?.identificacion === ""); // permite vacío para pasaporte raro

  // ── Sync query ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (esConsumidorFinal) { setQuery("CONSUMIDOR FINAL"); return; }
    if (clienteSelected)   { setQuery(clienteSelected.razon_social); return; }
    if (!clienteNuevo)     { setQuery(""); }
  }, [clienteSelected, esConsumidorFinal, clienteNuevo]);

  // ── Cerrar dropdown al clic fuera ────────────────────────────────────────
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node))
        setShowDrop(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // ── Búsqueda ─────────────────────────────────────────────────────────────
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

  // ── Handlers ──────────────────────────────────────────────────────────────
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
    setConfirmado(false);
  };

  // Confirmar — solo por clic explícito, nunca automático
  const confirmarClienteNuevo = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!puedeConfirmar) return;
    setConfirmado(true);
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="bg-gray-900 rounded-xl border border-gray-800 p-4">
      <div className="flex items-center gap-2 mb-3">
        <User size={15} className="text-indigo-400" />
        <h2 className="text-sm font-semibold text-white">Cliente</h2>
      </div>

      {/* ── Chip cliente confirmado ── */}
      {(clienteSelected || esConsumidorFinal || (clienteNuevo && confirmado)) ? (
        <div className="flex items-center gap-3 bg-gray-800 rounded-lg px-3 py-2.5">
          <div className="w-7 h-7 rounded-full bg-indigo-600/30 flex items-center justify-center shrink-0">
            <User size={13} className="text-indigo-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm text-white font-medium truncate">
              {esConsumidorFinal
                ? "CONSUMIDOR FINAL"
                : clienteSelected
                  ? clienteSelected.razon_social
                  : clienteNuevo?.razon_social.toUpperCase()}
            </p>
            <p className="text-xs text-gray-500">
              {esConsumidorFinal
                ? "9999999999999"
                : clienteSelected
                  ? clienteSelected.identificacion
                  : clienteNuevo?.identificacion || "Sin identificación"}
              {clienteNuevo && confirmado && !clienteSelected && !esConsumidorFinal && (
                <span className="ml-2 text-indigo-400">· se creará al emitir</span>
              )}
            </p>
          </div>
          <button type="button" onClick={limpiar} className="text-gray-500 hover:text-white p-1 transition-colors">
            <X size={16} />
          </button>
        </div>
      ) : (
        /* ── Buscador ── */
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

          <button
            type="button"
            onClick={seleccionarConsumidorFinal}
            className="mt-2 text-xs text-gray-500 hover:text-white transition-colors block"
          >
            ¿Sin RUC? →{" "}
            <span className="text-indigo-400 underline">Consumidor Final</span>
            <span className="text-gray-600 ml-1">(máx. $50)</span>
          </button>

          {/* Dropdown */}
          {showDrop && query.length >= 2 && (
            <div className="absolute z-10 w-full mt-1 bg-gray-800 border border-gray-700 rounded-lg shadow-xl overflow-hidden">
              <button
                type="button"
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

              {results.map((c) => (
                <button
                  type="button"
                  key={c.id}
                  onClick={() => seleccionar(c)}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-700 text-left border-b border-gray-700/50 last:border-0"
                >
                  <div className="w-7 h-7 rounded-full bg-indigo-600/30 flex items-center justify-center shrink-0">
                    <span className="text-xs text-indigo-400 font-bold">{c.razon_social[0]}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white truncate">{c.razon_social}</p>
                    <p className="text-xs text-gray-500">{c.identificacion}</p>
                  </div>
                </button>
              ))}

              {/* Registrar nuevo — siempre al final */}
              <button
                type="button"
                onClick={() => {
                  setShowDrop(false);
                  setConfirmado(false);
                  onClienteNuevo({
                    tipo_identificacion_sri: "05",
                    identificacion:          "",
                    razon_social:            "",
                    email:                   "",
                  });
                }}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-700 text-left border-t border-gray-700"
              >
                <div className="w-7 h-7 rounded-full bg-indigo-600/20 flex items-center justify-center shrink-0">
                  <span className="text-xs text-indigo-400 font-bold">+</span>
                </div>
                <div>
                  <p className="text-sm text-indigo-400">Registrar nuevo cliente</p>
                  <p className="text-xs text-gray-500">"{query}"</p>
                </div>
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── Form cliente nuevo (no confirmado aún) ── */}
      {clienteNuevo && !confirmado && (
        <div className="mt-3 bg-gray-800 rounded-lg p-3 space-y-2 border border-indigo-500/30">
          <p className="text-xs text-indigo-400 font-medium">Nuevo cliente</p>

          <div className="grid grid-cols-2 gap-2">
            <select
              value={clienteNuevo.tipo_identificacion_sri}
              onChange={(e) => onClienteNuevo({ ...clienteNuevo, tipo_identificacion_sri: e.target.value, identificacion: "" })}
              className="px-2 py-1.5 rounded-lg bg-gray-700 border border-gray-600 text-white text-xs focus:outline-none focus:border-indigo-500"
            >
              <option value="04">RUC</option>
              <option value="05">Cédula</option>
              <option value="06">Pasaporte</option>
              <option value="08">Exterior</option>
            </select>
            <div className="relative">
              <input
                value={clienteNuevo.identificacion}
                onChange={(e) => {
                  const val = ["04", "05"].includes(clienteNuevo.tipo_identificacion_sri)
                    ? e.target.value.replace(/\D/g, "")
                    : e.target.value.toUpperCase();
                  onClienteNuevo({ ...clienteNuevo, identificacion: val });
                }}
                placeholder={
                  clienteNuevo.tipo_identificacion_sri === "04" ? "RUC (13 dígitos)" :
                  clienteNuevo.tipo_identificacion_sri === "05" ? "Cédula (10 dígitos)" :
                  "Número de pasaporte"
                }
                maxLength={clienteNuevo.tipo_identificacion_sri === "04" ? 13 : clienteNuevo.tipo_identificacion_sri === "05" ? 10 : 20}
                className={`w-full px-2 py-1.5 rounded-lg bg-gray-700 border text-white placeholder-gray-500 text-xs focus:outline-none focus:border-indigo-500 ${
                  validacion.error ? "border-red-500/70" : "border-gray-600"
                }`}
              />
              {validacion.ok && clienteNuevo.identificacion && (
                <Check size={11} className="absolute right-2 top-1/2 -translate-y-1/2 text-emerald-400" />
              )}
            </div>
          </div>

          {/* Error de validación */}
          {validacion.error && (
            <div className="flex items-center gap-1.5 text-red-400">
              <AlertCircle size={11} />
              <p className="text-xs">{validacion.error}</p>
            </div>
          )}

          <input
            value={clienteNuevo.razon_social}
            onChange={(e) => onClienteNuevo({ ...clienteNuevo, razon_social: e.target.value.toUpperCase() })}
            placeholder="Nombre / Razón Social *"
            className="w-full px-2 py-1.5 rounded-lg bg-gray-700 border border-gray-600 text-white placeholder-gray-500 text-xs focus:outline-none focus:border-indigo-500"
          />

          <input
            value={clienteNuevo.email}
            onChange={(e) => onClienteNuevo({ ...clienteNuevo, email: e.target.value.toLowerCase() })}
            onBlur={(e) => {
              const val = e.target.value.trim().toLowerCase();
              onClienteNuevo({ ...clienteNuevo, email: val });
            }}
            placeholder="Email (opcional)"
            type="email"
            className={`w-full px-2 py-1.5 rounded-lg bg-gray-700 border text-white placeholder-gray-500 text-xs focus:outline-none focus:border-indigo-500 ${
              clienteNuevo.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clienteNuevo.email)
                ? "border-red-500/70"
                : "border-gray-600"
            }`}
          />
          {clienteNuevo.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clienteNuevo.email) && (
            <div className="flex items-center gap-1.5 text-red-400">
              <AlertCircle size={11} />
              <p className="text-xs">Email inválido.</p>
            </div>
          )}

          <div className="flex items-center gap-2 pt-1">
            <button
              type="button"
              onClick={confirmarClienteNuevo}
              disabled={!puedeConfirmar}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-medium transition-colors"
            >
              <Check size={12} />
              Confirmar
            </button>
            <button
              type="button"
              onClick={() => onClienteNuevo(null)}
              className="text-xs text-gray-500 hover:text-white transition-colors"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}