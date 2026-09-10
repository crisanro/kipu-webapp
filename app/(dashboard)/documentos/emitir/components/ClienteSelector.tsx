"use client";
import { useRef, useEffect, useCallback, useState } from "react";
import api from "@/lib/api";
import { Search, User, X, Check, AlertCircle } from "lucide-react";

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
    <div
      className="rounded-xl p-4"
      style={{
        background: "var(--kipu-surface)",
        border: "1px solid var(--kipu-border)",
      }}
    >
      <div className="flex items-center gap-2 mb-3">
        <User size={15} style={{ color: "var(--kipu-accent)" }} />
        <h2 className="text-sm font-semibold" style={{ color: "var(--kipu-text)" }}>Cliente</h2>
      </div>

      {/* ── Chip cliente confirmado ── */}
      {(clienteSelected || esConsumidorFinal || (clienteNuevo && confirmado)) ? (
        <div
          className="flex items-center gap-3 rounded-lg px-3 py-2.5"
          style={{
            background: "color-mix(in srgb, var(--kipu-text) 5%, transparent)",
          }}
        >
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center shrink-0"
            style={{
              background: "color-mix(in srgb, var(--kipu-accent) 20%, transparent)",
            }}
          >
            <User size={13} style={{ color: "var(--kipu-accent)" }} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate" style={{ color: "var(--kipu-text)" }}>
              {esConsumidorFinal
                ? "CONSUMIDOR FINAL"
                : clienteSelected
                  ? clienteSelected.razon_social
                  : clienteNuevo?.razon_social.toUpperCase()}
            </p>
            <p className="text-xs" style={{ color: "var(--kipu-subtle)" }}>
              {esConsumidorFinal
                ? "9999999999999"
                : clienteSelected
                  ? clienteSelected.identificacion
                  : clienteNuevo?.identificacion || "Sin identificación"}
              {clienteNuevo && confirmado && !clienteSelected && !esConsumidorFinal && (
                <span className="ml-2" style={{ color: "var(--kipu-accent)" }}>· se creará al emitir</span>
              )}
            </p>
          </div>
          <button
            type="button"
            onClick={limpiar}
            className="p-1 transition-colors"
            style={{ color: "var(--kipu-subtle)" }}
            onMouseEnter={e => e.currentTarget.style.color = "var(--kipu-text)"}
            onMouseLeave={e => e.currentTarget.style.color = "var(--kipu-subtle)"}
          >
            <X size={16} />
          </button>
        </div>
      ) : (
        /* ── Buscador ── */
        <div className="relative" ref={wrapRef}>
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--kipu-subtle)" }} />
            <input
              value={query}
              onChange={(e) => handleInputChange(e.target.value)}
              onFocus={(e) => {
                if (query.length >= 2) setShowDrop(true);
                e.currentTarget.style.borderColor = "var(--kipu-accent)";
              }}
              onBlur={e => e.currentTarget.style.borderColor = "var(--kipu-border)"}
              placeholder="Buscar por nombre, RUC o cédula..."
              className="w-full pl-9 pr-4 py-2.5 rounded-lg text-sm transition-colors focus:outline-none"
              style={{
                background: "var(--kipu-surface)",
                border: "1px solid var(--kipu-border)",
                color: "var(--kipu-text)",
              }}
            />
            {loading && (
              <div
                className="w-3.5 h-3.5 border-2 border-t-transparent rounded-full animate-spin absolute right-3 top-1/2 -translate-y-1/2"
                style={{ borderColor: "var(--kipu-accent)", borderTopColor: "transparent" }}
              />
            )}
          </div>

          <button
            type="button"
            onClick={seleccionarConsumidorFinal}
            className="mt-2 text-xs transition-colors block"
            style={{ color: "var(--kipu-subtle)" }}
            onMouseEnter={e => e.currentTarget.style.color = "var(--kipu-text)"}
            onMouseLeave={e => e.currentTarget.style.color = "var(--kipu-subtle)"}
          >
            ¿Sin RUC? →{" "}
            <span className="underline" style={{ color: "var(--kipu-accent)" }}>Consumidor Final</span>
            <span className="ml-1" style={{ color: "var(--kipu-muted)" }}>(máx. $50)</span>
          </button>

          {/* Dropdown */}
          {showDrop && query.length >= 2 && (
            <div
              className="absolute z-10 w-full mt-1 rounded-lg shadow-xl overflow-hidden"
              style={{
                background: "var(--kipu-surface)",
                border: "1px solid var(--kipu-border)",
              }}
            >
              <button
                type="button"
                onClick={seleccionarConsumidorFinal}
                className="w-full flex items-center gap-3 px-4 py-3 text-left transition-colors"
                style={{ borderBottom: "1px solid var(--kipu-border)" }}
                onMouseEnter={e => e.currentTarget.style.background = "color-mix(in srgb, var(--kipu-text) 5%, transparent)"}
                onMouseLeave={e => e.currentTarget.style.background = "transparent"}
              >
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center shrink-0"
                  style={{ background: "color-mix(in srgb, var(--kipu-text) 10%, transparent)" }}
                >
                  <User size={13} style={{ color: "var(--kipu-subtle)" }} />
                </div>
                <div>
                  <p className="text-sm font-medium" style={{ color: "var(--kipu-text)" }}>Consumidor Final</p>
                  <p className="text-xs" style={{ color: "var(--kipu-subtle)" }}>9999999999999 · Máx. $50</p>
                </div>
              </button>

              {results.map((c) => (
                <button
                  type="button"
                  key={c.id}
                  onClick={() => seleccionar(c)}
                  className="w-full flex items-center gap-3 px-4 py-3 text-left transition-colors"
                  style={{ borderBottom: "1px solid var(--kipu-border)" }}
                  onMouseEnter={e => e.currentTarget.style.background = "color-mix(in srgb, var(--kipu-text) 5%, transparent)"}
                  onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                >
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center shrink-0"
                    style={{ background: "color-mix(in srgb, var(--kipu-accent) 20%, transparent)" }}
                  >
                    <span className="text-xs font-bold" style={{ color: "var(--kipu-accent)" }}>{c.razon_social[0]}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm truncate" style={{ color: "var(--kipu-text)" }}>{c.razon_social}</p>
                    <p className="text-xs" style={{ color: "var(--kipu-subtle)" }}>{c.identificacion}</p>
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
                className="w-full flex items-center gap-3 px-4 py-3 text-left transition-colors"
                style={{ borderTop: "1px solid var(--kipu-border)" }}
                onMouseEnter={e => e.currentTarget.style.background = "color-mix(in srgb, var(--kipu-text) 5%, transparent)"}
                onMouseLeave={e => e.currentTarget.style.background = "transparent"}
              >
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center shrink-0"
                  style={{ background: "color-mix(in srgb, var(--kipu-accent) 20%, transparent)" }}
                >
                  <span className="text-xs font-bold" style={{ color: "var(--kipu-accent)" }}>+</span>
                </div>
                <div>
                  <p className="text-sm" style={{ color: "var(--kipu-accent)" }}>Registrar nuevo cliente</p>
                  <p className="text-xs" style={{ color: "var(--kipu-subtle)" }}>"{query}"</p>
                </div>
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── Form cliente nuevo (no confirmado aún) ── */}
      {clienteNuevo && !confirmado && (
        <div
          className="mt-3 rounded-lg p-3 space-y-2"
          style={{
            background: "color-mix(in srgb, var(--kipu-surface) 60%, transparent)",
            border: "1px solid color-mix(in srgb, var(--kipu-accent) 30%, transparent)",
          }}
        >
          <p className="text-xs font-medium" style={{ color: "var(--kipu-accent)" }}>Nuevo cliente</p>

          <div className="grid grid-cols-2 gap-2">
            <select
              value={clienteNuevo.tipo_identificacion_sri}
              onChange={(e) => onClienteNuevo({ ...clienteNuevo, tipo_identificacion_sri: e.target.value, identificacion: "" })}
              className="px-2 py-1.5 rounded-lg text-xs focus:outline-none transition-colors"
              style={{
                background: "var(--kipu-surface)",
                border: "1px solid var(--kipu-border)",
                color: "var(--kipu-text)",
              }}
              onFocus={e => e.currentTarget.style.borderColor = "var(--kipu-accent)"}
              onBlur={e => e.currentTarget.style.borderColor = "var(--kipu-border)"}
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
                className="w-full px-2 py-1.5 rounded-lg text-xs focus:outline-none transition-colors"
                style={{
                  background: "var(--kipu-surface)",
                  border: validacion.error
                    ? "1px solid color-mix(in srgb, var(--kipu-danger) 70%, transparent)"
                    : "1px solid var(--kipu-border)",
                  color: "var(--kipu-text)",
                }}
                onFocus={e => {
                  if (!validacion.error) e.currentTarget.style.borderColor = "var(--kipu-accent)";
                }}
                onBlur={e => {
                  if (!validacion.error) e.currentTarget.style.borderColor = "var(--kipu-border)";
                }}
              />
              {validacion.ok && clienteNuevo.identificacion && (
                <Check size={11} className="absolute right-2 top-1/2 -translate-y-1/2" style={{ color: "var(--kipu-success)" }} />
              )}
            </div>
          </div>

          {/* Error de validación */}
          {validacion.error && (
            <div className="flex items-center gap-1.5" style={{ color: "var(--kipu-danger)" }}>
              <AlertCircle size={11} />
              <p className="text-xs">{validacion.error}</p>
            </div>
          )}

          <input
            value={clienteNuevo.razon_social}
            onChange={(e) => onClienteNuevo({ ...clienteNuevo, razon_social: e.target.value.toUpperCase() })}
            placeholder="Nombre / Razón Social *"
            className="w-full px-2 py-1.5 rounded-lg text-xs focus:outline-none transition-colors"
            style={{
              background: "var(--kipu-surface)",
              border: "1px solid var(--kipu-border)",
              color: "var(--kipu-text)",
            }}
            onFocus={e => e.currentTarget.style.borderColor = "var(--kipu-accent)"}
            onBlur={e => e.currentTarget.style.borderColor = "var(--kipu-border)"}
          />

          <input
            value={clienteNuevo.email}
            onChange={(e) => onClienteNuevo({ ...clienteNuevo, email: e.target.value.toLowerCase() })}
            onBlur={(e) => {
              const val = e.target.value.trim().toLowerCase();
              onClienteNuevo({ ...clienteNuevo, email: val });
              e.currentTarget.style.borderColor = "var(--kipu-border)";
            }}
            placeholder="Email (opcional)"
            type="email"
            className="w-full px-2 py-1.5 rounded-lg text-xs focus:outline-none transition-colors"
            style={{
              background: "var(--kipu-surface)",
              border: clienteNuevo.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clienteNuevo.email)
                ? "1px solid color-mix(in srgb, var(--kipu-danger) 70%, transparent)"
                : "1px solid var(--kipu-border)",
              color: "var(--kipu-text)",
            }}
            onFocus={e => {
              if (!(clienteNuevo.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clienteNuevo.email))) {
                e.currentTarget.style.borderColor = "var(--kipu-accent)";
              }
            }}
          />
          {clienteNuevo.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clienteNuevo.email) && (
            <div className="flex items-center gap-1.5" style={{ color: "var(--kipu-danger)" }}>
              <AlertCircle size={11} />
              <p className="text-xs">Email inválido.</p>
            </div>
          )}

          <div className="flex items-center gap-2 pt-1">
            <button
              type="button"
              onClick={confirmarClienteNuevo}
              disabled={!puedeConfirmar}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-white text-xs font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              style={{ background: "var(--kipu-accent)" }}
              onMouseEnter={e => {
                if (puedeConfirmar) e.currentTarget.style.background = "var(--kipu-accent-h)";
              }}
              onMouseLeave={e => {
                if (puedeConfirmar) e.currentTarget.style.background = "var(--kipu-accent)";
              }}
            >
              <Check size={12} />
              Confirmar
            </button>
            <button
              type="button"
              onClick={() => onClienteNuevo(null)}
              className="text-xs transition-colors"
              style={{ color: "var(--kipu-subtle)" }}
              onMouseEnter={e => e.currentTarget.style.color = "var(--kipu-text)"}
              onMouseLeave={e => e.currentTarget.style.color = "var(--kipu-subtle)"}
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}