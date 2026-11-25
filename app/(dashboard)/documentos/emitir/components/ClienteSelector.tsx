"use client";
// Cliente del comprobante (factura y proforma).
//   - Sin elegir: buscador; debajo "Consumidor final" y "Nuevo cliente", y los
//     clientes recientes de este dispositivo cuando no se ha escrito nada.
//   - Resultados como filas táctiles dentro de la tarjeta (en la compu, Enter
//     elige el primero).
//   - Nuevo cliente: en una hoja con campos grandes y el teclado correcto; si en
//     el buscador se escribió una cédula/RUC o un nombre, la hoja ya lo trae.
//   - `proveedor` (liquidación de compra): el SRI no acepta RUC ni consumidor
//     final, así que no se ofrecen; la hoja pide además la dirección.
import { useRef, useEffect, useCallback, useMemo, useState } from "react";
import { validarIdentificacion } from "@/lib/identificacion";
import api from "@/lib/api";
import { Search, User, X, Loader2, Plus, Clock } from "lucide-react";
import { lookupIdentificacion, useBuscaNombres, textoNombreAMano } from "@/lib/identificacion-lookup";
import { useAuthStore } from "@/store/auth.store";
import Hoja from "@/components/ui/Hoja";
import Boton from "@/components/ui/Boton";
import BotonIcono from "@/components/ui/BotonIcono";
import ChipsFiltro from "@/components/ui/ChipsFiltro";
import { Campo, Entrada, type Teclado } from "@/components/ui/Campo";
import { cn } from "@/components/ui/cn";

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
  direccion?:              string;   // solo proveedor (liquidación)
}
interface Props {
  clienteSelected:           Cliente | null;
  esConsumidorFinal?:        boolean;
  clienteNuevo:              ClienteNuevo | null;
  onSelectCliente:           (c: Cliente) => void;
  /** Sin esto no se ofrece "Consumidor final". */
  onSelectConsumidorFinal?:  () => void;
  onClienteNuevo:            (c: ClienteNuevo | null) => void;
  onClear:                   () => void;
  /** Liquidación de compra: proveedor persona natural (sin RUC ni consumidor final). */
  proveedor?:                boolean;
}

const TIPOS_ID = [
  { valor: "05", etiqueta: "Cédula" },
  { valor: "04", etiqueta: "RUC" },
  { valor: "06", etiqueta: "Pasaporte" },
  { valor: "08", etiqueta: "Exterior" },
];
const TIPOS_ID_PROVEEDOR = TIPOS_ID.filter(t => t.valor !== "04");
// La liquidación no acepta RUC ni consumidor final
const NO_PROVEEDOR = ["04", "07"];
const TECLADO_ID: Record<string, Teclado> = { "04": "ruc", "05": "cedula", "06": "pasaporte", "08": "pasaporte" };
const EMAIL_OK = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// ── Clientes recientes (en este dispositivo, por empresa) ─────────────────────
const MAX_RECIENTES = 5;
type IdEmpresa = number | string | undefined;
const claveRecientes = (empresaId: IdEmpresa, proveedor: boolean) =>
  `kipu:${proveedor ? "proveedores" : "clientes"}-recientes:${empresaId ?? "x"}`;

function leerRecientes(empresaId: IdEmpresa, proveedor: boolean): Cliente[] {
  try { return JSON.parse(localStorage.getItem(claveRecientes(empresaId, proveedor)) ?? "[]") as Cliente[]; }
  catch { return []; }
}
function recordarCliente(empresaId: IdEmpresa, proveedor: boolean, c: Cliente) {
  try {
    const lista = [c, ...leerRecientes(empresaId, proveedor).filter(r => r.id !== c.id)].slice(0, MAX_RECIENTES);
    localStorage.setItem(claveRecientes(empresaId, proveedor), JSON.stringify(lista));
  } catch {}
}

/** Lo escrito en el buscador, como punto de partida del cliente nuevo. */
function borradorDesde(query: string, proveedor: boolean): ClienteNuevo {
  const q = query.trim();
  const digitos = q.replace(/\D/g, "");
  const extra = proveedor ? { direccion: "" } : {};
  if (digitos && digitos === q.replace(/[\s-]/g, "")) {
    const tipo = digitos.length === 13 && !proveedor ? "04" : "05";
    return { tipo_identificacion_sri: tipo, identificacion: digitos, razon_social: "", email: "", ...extra };
  }
  return { tipo_identificacion_sri: "05", identificacion: "", razon_social: q.toUpperCase(), email: "", ...extra };
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
  proveedor = false,
}: Props) {
  const empresaId = useAuthStore((s) => s.empresa?.id);
  const [query,     setQuery]     = useState("");
  const [results,   setResults]   = useState<Cliente[]>([]);
  const [loading,   setLoading]   = useState(false);
  // Recientes de este dispositivo: se vuelven a leer al elegir un cliente
  const [versionRecientes, setVersionRecientes] = useState(0);
  const recientes = useMemo(() => leerRecientes(empresaId, proveedor),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [empresaId, proveedor, versionRecientes]);
  const quien = proveedor ? "proveedor" : "cliente";
  const tiposId = proveedor ? TIPOS_ID_PROVEEDOR : TIPOS_ID;

  // Hoja "Nuevo cliente": se edita un borrador y se entrega al confirmar
  const [borrador,      setBorrador]      = useState<ClienteNuevo | null>(null);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupMsg,     setLookupMsg]     = useState("");

  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Buscar nombres de terceros es de las cuentas que pagan (lib/identificacion-lookup.ts)
  const buscaNombres = useBuscaNombres();

  const validacion = borrador
    ? validarIdentificacion(borrador.tipo_identificacion_sri, borrador.identificacion)
    : { ok: false, error: "" };
  const emailInvalido = !!borrador?.email && !EMAIL_OK.test(borrador.email);
  const puedeConfirmar =
    !!borrador?.razon_social.trim() &&
    (validacion.ok || borrador?.identificacion === "") &&
    !emailInvalido;

  // Solo cédula o RUC natural son buscables
  const puedeBuscar =
    buscaNombres &&
    !!borrador &&
    ["04", "05"].includes(borrador.tipo_identificacion_sri) &&
    validacion.ok &&
    !lookupLoading;

  // ── Búsqueda clientes ────────────────────────────────────────────────────
  const buscar = useCallback(async (q: string) => {
    if (!q || q.length < 2) { setResults([]); return; }
    setLoading(true);
    try {
      const res = await api.get(`/api/v1/app/clientes?q=${encodeURIComponent(q)}`);
      const filas: Cliente[] = res.data.data ?? [];
      setResults(proveedor ? filas.filter(c => !NO_PROVEEDOR.includes(c.tipo_identificacion_sri)) : filas);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, [proveedor]);

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => buscar(query), 300);
    return () => { if (timer.current) clearTimeout(timer.current); };
  }, [query, buscar]);

  // ── Lookup identificación ────────────────────────────────────────────────
  const handleLookup = async () => {
    if (!borrador || !puedeBuscar) return;
    setLookupLoading(true);
    setLookupMsg("");
    const result = await lookupIdentificacion(borrador.identificacion);
    if (result.error) {
      setLookupMsg(result.error);
    } else if (result.found && result.nombre) {
      setBorrador({ ...borrador, razon_social: result.nombre });
      setLookupMsg("✓ Encontrado");
    } else {
      setLookupMsg("No encontrado — escribe el nombre");
    }
    setLookupLoading(false);
  };

  // ── Handlers ──────────────────────────────────────────────────────────────
  const seleccionar = (c: Cliente) => {
    onSelectCliente(c);
    recordarCliente(empresaId, proveedor, c);
    setVersionRecientes(v => v + 1);
    setQuery("");
    setResults([]);
  };

  const seleccionarConsumidorFinal = () => {
    onSelectConsumidorFinal?.();
    setQuery("");
    setResults([]);
  };

  const limpiar = () => {
    onClear();
    onClienteNuevo(null);
    setQuery("");
    setResults([]);
  };

  const abrirNuevo = () => {
    setLookupMsg("");
    setBorrador(borradorDesde(query, proveedor));
  };

  const confirmarNuevo = () => {
    if (!borrador || !puedeConfirmar) return;
    onClienteNuevo({ ...borrador, email: borrador.email.trim().toLowerCase(),
                     ...(proveedor ? { direccion: (borrador.direccion ?? "").trim() } : {}) });
    setBorrador(null);
    setQuery("");
    setResults([]);
  };

  const elegido = clienteSelected || esConsumidorFinal || clienteNuevo;
  const buscando = query.trim().length >= 2;

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <section className="rounded-xl border border-borde bg-superficie p-4">
      <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-texto">
        <User size={16} className="text-acento" aria-hidden /> {proveedor ? "Proveedor" : "Cliente"}
        {proveedor && <span className="text-xs font-normal text-sutil">· cédula, pasaporte o exterior</span>}
      </h2>

      {elegido ? (
        /* ── Cliente elegido ── */
        <div className="flex items-center gap-3 rounded-lg bg-presionado px-3 py-2.5">
          <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-acento-suave text-sm font-bold text-acento">
            {esConsumidorFinal ? <User size={16} aria-hidden />
              : (clienteSelected?.razon_social ?? clienteNuevo?.razon_social ?? "?")[0]?.toUpperCase()}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-texto">
              {esConsumidorFinal ? "CONSUMIDOR FINAL"
                : clienteSelected ? clienteSelected.razon_social
                : clienteNuevo?.razon_social.toUpperCase()}
            </p>
            <p className="text-xs text-sutil">
              {esConsumidorFinal ? "9999999999999 · máximo $50"
                : clienteSelected ? clienteSelected.identificacion
                : clienteNuevo?.identificacion || "Sin identificación"}
              {clienteNuevo && !clienteSelected && !esConsumidorFinal && (
                <span className="text-acento"> · se guarda al emitir</span>
              )}
            </p>
          </div>
          <BotonIcono etiqueta={`Cambiar ${quien}`} icono={<X size={18} />} onClick={limpiar} />
        </div>
      ) : (
        /* ── Buscador ── */
        <div className="space-y-3">
          <Entrada
            teclado="buscar"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              // Compu: Enter elige el primer resultado (Ctrl+Enter es emitir: EmisionLayout)
              if (e.key === "Enter" && !e.ctrlKey && !e.metaKey && results[0]) { e.preventDefault(); seleccionar(results[0]); }
            }}
            placeholder={proveedor ? "Buscar por nombre o cédula…" : "Buscar por nombre, RUC o cédula…"}
            aria-label={`Buscar ${quien}`}
            prefijo={<Search size={16} />}
            sufijo={loading ? <Loader2 size={16} className="animate-spin" aria-hidden /> : undefined}
          />

          {/* Resultados (o los recientes, si no se ha escrito nada) */}
          {buscando ? (
            results.length > 0 ? (
              <ul className="-mx-1 divide-y divide-borde">
                {results.slice(0, 8).map((c) => (
                  <li key={c.id}>
                    <FilaCliente cliente={c} onClick={() => seleccionar(c)} />
                  </li>
                ))}
              </ul>
            ) : !loading && (
              <p className="px-1 text-xs text-sutil">Ningún {quien} coincide. Puedes crearlo como nuevo.</p>
            )
          ) : recientes.length > 0 && (
            <div>
              <p className="mb-1 flex items-center gap-1.5 px-1 text-xs text-sutil">
                <Clock size={12} aria-hidden /> Recientes
              </p>
              <ul className="-mx-1 divide-y divide-borde">
                {recientes.map((c) => (
                  <li key={c.id}>
                    <FilaCliente cliente={c} onClick={() => seleccionar(c)} />
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            {onSelectConsumidorFinal && !proveedor && (
              <Boton variante="secundario" tamano="sm" onClick={seleccionarConsumidorFinal} icono={<User size={14} />}>
                Consumidor final <span className="font-normal text-sutil">· máx. $50</span>
              </Boton>
            )}
            <Boton variante="secundario" tamano="sm" onClick={abrirNuevo} icono={<Plus size={14} />}>
              Nuevo {quien}
            </Boton>
          </div>
        </div>
      )}

      {/* ── Hoja: nuevo cliente ── */}
      <Hoja
        abierta={!!borrador}
        onCerrar={() => setBorrador(null)}
        titulo={`Nuevo ${quien}`}
        descripcion="Se guarda en tus contactos al emitir."
        pie={<>
          <Boton variante="secundario" onClick={() => setBorrador(null)}>Cancelar</Boton>
          <Boton onClick={confirmarNuevo} disabled={!puedeConfirmar}>Usar este {quien}</Boton>
        </>}
      >
        {borrador && (
          <div className="space-y-3">
            <ChipsFiltro
              etiqueta="Tipo de identificación"
              opciones={tiposId}
              valor={borrador.tipo_identificacion_sri}
              onCambio={(tipo) => {
                setBorrador({ ...borrador, tipo_identificacion_sri: tipo, identificacion: "" });
                setLookupMsg("");
              }}
            />
            <Campo
              etiqueta={TIPOS_ID.find(t => t.valor === borrador.tipo_identificacion_sri)?.etiqueta ?? "Identificación"}
              error={validacion.error || null}
              ayuda={lookupMsg || (!buscaNombres && ["04", "05"].includes(borrador.tipo_identificacion_sri) && validacion.ok
                ? textoNombreAMano() : undefined)}
            >
              <Entrada
                teclado={TECLADO_ID[borrador.tipo_identificacion_sri] ?? "texto"}
                value={borrador.identificacion}
                maxLength={borrador.tipo_identificacion_sri === "04" ? 13 : borrador.tipo_identificacion_sri === "05" ? 10 : 20}
                placeholder={borrador.tipo_identificacion_sri === "04" ? "13 dígitos" : borrador.tipo_identificacion_sri === "05" ? "10 dígitos" : ""}
                onChange={(e) => {
                  const val = ["04", "05"].includes(borrador.tipo_identificacion_sri)
                    ? e.target.value.replace(/\D/g, "")
                    : e.target.value.toUpperCase();
                  setBorrador({ ...borrador, identificacion: val });
                  setLookupMsg("");
                }}
                sufijo={buscaNombres && ["04", "05"].includes(borrador.tipo_identificacion_sri) ? (
                  <BotonIcono
                    etiqueta="Buscar el nombre"
                    icono={lookupLoading ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
                    tamano="sm"
                    onClick={handleLookup}
                    disabled={!puedeBuscar}
                    className="-mr-2"
                  />
                ) : undefined}
              />
            </Campo>
            <Campo etiqueta="Nombre o razón social">
              <Entrada
                teclado="nombre"
                value={borrador.razon_social}
                placeholder="APELLIDOS NOMBRES"
                onChange={(e) => setBorrador({ ...borrador, razon_social: e.target.value.toUpperCase() })}
              />
            </Campo>
            {proveedor && (
              <Campo etiqueta="Dirección" opcional>
                <Entrada
                  value={borrador.direccion ?? ""}
                  onChange={(e) => setBorrador({ ...borrador, direccion: e.target.value })}
                />
              </Campo>
            )}
            <Campo etiqueta="Correo" opcional ayuda="Ahí le llega su comprobante." error={emailInvalido ? "Correo inválido." : null}>
              <Entrada
                teclado="email"
                value={borrador.email}
                placeholder="cliente@correo.com"
                onChange={(e) => setBorrador({ ...borrador, email: e.target.value.toLowerCase() })}
              />
            </Campo>
          </div>
        )}
      </Hoja>
    </section>
  );
}

function FilaCliente({ cliente, onClick }: { cliente: Cliente; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn("flex min-h-12 w-full items-center gap-3 rounded-lg px-1 py-2 text-left",
        "transition-colors hover:bg-presionado active:bg-presionado")}
    >
      <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-acento-suave text-xs font-bold text-acento">
        {cliente.razon_social?.[0] ?? "?"}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm text-texto">{cliente.razon_social}</span>
        <span className="block text-xs text-sutil">{cliente.identificacion}</span>
      </span>
    </button>
  );
}
