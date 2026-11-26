"use client";
import { rutas } from "@/lib/rutas";
import { useRef, useState } from "react";
import { useAtajos } from "@/lib/useAtajos";
import { useNuevoDesdePaleta } from "@/lib/comandos";
import api from "@/lib/api";
import { SegmentosPersonas } from "@/components/shell/BarraPestanas";
import { usePermiso } from "@/hooks/usePermiso";
import SinAcceso from "@/components/SinAcceso";
import Hoja from "@/components/ui/Hoja";
import Boton from "@/components/ui/Boton";
import FilaLista, { GrupoFilas } from "@/components/ui/FilaLista";
import { EsqueletoFilas } from "@/components/ui/Esqueleto";
import Vacio, { VacioError } from "@/components/ui/Vacio";
import BotonFlotante from "@/components/ui/BotonFlotante";
import TirarParaRefrescar from "@/components/ui/TirarParaRefrescar";
import { Entrada } from "@/components/ui/Campo";
import { useLista } from "@/lib/useLista";
import {
  Search, Plus, Users,
  ChevronDown, Save, AlertCircle, Check, Loader2
} from "lucide-react";
import { lookupIdentificacion, useBuscaNombres, textoNombreAMano } from "@/lib/identificacion-lookup";
import { NOMBRE_TIPO_ID, validarIdentificacion } from "@/lib/identificacion";
import { tecladoIdentificacion } from "@/lib/teclado";
import { detalleError } from "@/lib/errores";

interface Persona {
  uid:                     string;
  razon_social:            string;
  identificacion:          string;
  tipo_identificacion_sri: string;
  email:                   string;
  telefono:                string;
  direccion:               string;
}

// Los que se pueden registrar (Consumidor Final no es una persona que se agrega)
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

// ── Validación ────────────────────────────────────────────────────────────────
function validarEmail(email: string): boolean {
  if (!email) return true;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// ── Página ────────────────────────────────────────────────────────────────────
export default function PersonasPage() {
  const puedeVer = usePermiso("clientes");
  if (!puedeVer) return <SinAcceso />;
  return <PersonasContenido />;
}

// Separado del chequeo de permiso: los hooks se llaman siempre en el mismo orden
// aunque el permiso cambie con la página abierta (antes React lanzaba un error).
function PersonasContenido() {
  const [query,     setQuery]     = useState("");
  const [showModal, setShowModal] = useState(false);
  const [form,      setForm]      = useState(EMPTY_FORM);
  const [saving,    setSaving]    = useState(false);
  const [error,     setError]     = useState("");

  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupMsg,     setLookupMsg]     = useState("");

  const valId    = validarIdentificacion(form.tipo_identificacion_sri, form.identificacion);
  const emailOk  = validarEmail(form.email);
  const puedeGuardar =
    valId.ok &&
    emailOk &&
    form.razon_social.trim().length > 0 &&
    !saving;

  // Buscar nombres de terceros es de las cuentas que pagan (lib/identificacion-lookup.ts)
  const buscaNombres = useBuscaNombres();
  const puedeBuscar =
    buscaNombres &&
    ["04", "05"].includes(form.tipo_identificacion_sri) &&
    valId.ok &&
    !lookupLoading;

  // Con caché: al volver de una persona la lista aparece al instante (lib/useLista.ts)
  const lista    = useLista<{ data?: Persona[] } | Persona[]>("/api/v1/app/clientes");
  const personas: Persona[] = Array.isArray(lista.datos) ? lista.datos : lista.datos?.data ?? [];
  const loading  = lista.cargando;
  const cargar   = lista.recargar;

  const filtrados = personas.filter((c) =>
    !query ||
    c.razon_social?.toLowerCase().includes(query.toLowerCase()) ||
    c.identificacion?.includes(query) ||
    c.email?.toLowerCase().includes(query.toLowerCase())
  );

  const handleTipoChange = (tipo: string) => {
    setForm({ ...form, tipo_identificacion_sri: tipo, identificacion: "", razon_social: "" });
    setLookupMsg("");
  };

  // ── Lookup ──────────────────────────────────────────────────────────────────
  const handleLookup = async () => {
    if (!puedeBuscar) return;
    setLookupLoading(true);
    setLookupMsg("");

    const result = await lookupIdentificacion(form.identificacion);

    if (result.error) {
      setLookupMsg(result.error);
    } else if (result.found && result.nombre) {
      setForm((prev) => ({ ...prev, razon_social: result.nombre! }));
      setLookupMsg("✓ Encontrado");
    } else {
      setLookupMsg("No encontrado — ingresa el nombre manualmente");
    }

    setLookupLoading(false);
  };

  const handleSave = async () => {
    setError("");
    if (!valId.ok) { setError(valId.error || "Identificación inválida."); return; }
    if (!emailOk)  { setError("El email no es válido."); return; }
    if (!form.razon_social.trim()) { setError("El nombre es obligatorio."); return; }

    setSaving(true);
    try {
      await api.post("/api/v1/app/clientes", {
        ...form,
        razon_social: form.razon_social.trim().toUpperCase(),
        direccion:    form.direccion.trim().toUpperCase(),
        email:        form.email.trim().toLowerCase(),
      });
      await cargar();
      setShowModal(false);
      setForm(EMPTY_FORM);
      setLookupMsg("");
    } catch (err: any) {
      setError(detalleError(err, "Error al guardar."));
    } finally {
      setSaving(false);
    }
  };

  const abrirModal = () => {
    setShowModal(true);
    setForm(EMPTY_FORM);
    setError("");
    setLookupMsg("");
  };

  // Compu: "/" busca y "n" agrega una persona (lib/useAtajos.ts)
  const buscadorRef = useRef<HTMLInputElement>(null);
  useAtajos({
    "/": () => buscadorRef.current?.focus(),
    "n": () => abrirModal(),
  }, true, { n: "Nuevo cliente o proveedor" });
  // "Nuevo cliente o proveedor" desde la paleta de comandos (lib/comandos.ts)
  useNuevoDesdePaleta(() => abrirModal());

  return (
    <div className="p-4 md:p-6">
      <SegmentosPersonas />
      {/* Encabezado: en el celular el título ya está en la barra superior */}
      <div className="mb-4 mt-4 hidden items-center justify-between lg:mt-0 lg:flex">
        <div>
          <h1 className="text-xl font-bold text-texto">Personas</h1>
          <p className="text-sm text-sutil">{personas.length} registradas</p>
        </div>
        <Boton onClick={abrirModal} icono={<Plus size={16} />}>Nueva persona</Boton>
      </div>

      <Entrada
        teclado="buscar"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Buscar por nombre, RUC, cédula o email…"
        aria-label="Buscar personas"
        prefijo={<Search size={16} />}
        ref={buscadorRef}
        className="mb-4 mt-4 lg:mt-0"
      />

      {/* Lista */}
      {loading ? (
        <EsqueletoFilas filas={8} />
      ) : lista.fallo ? (
        <VacioError que="tus clientes y proveedores" onReintentar={lista.recargar} />
      ) : filtrados.length === 0 ? (
        query ? (
          <Vacio icono={Search} titulo="Nadie coincide con la búsqueda" descripcion="Prueba con otro nombre o número." />
        ) : (
          <Vacio icono={Users} titulo="Aún no tienes personas registradas"
                 descripcion="Tus clientes y proveedores aparecen aquí al facturarles o al agregarlos."
                 accion={<Boton onClick={abrirModal} icono={<Plus size={16} />}>Agregar persona</Boton>} />
        )
      ) : (
        <TirarParaRefrescar alRefrescar={cargar}>
          <GrupoFilas>
            {filtrados.map((c) => (
              <FilaLista
                key={c.uid}
                href={rutas.persona(c.uid)}
                inicio={
                  <span className="inline-flex size-10 items-center justify-center rounded-full bg-acento-suave text-sm font-bold text-acento">
                    {c.razon_social?.[0] ?? "?"}
                  </span>
                }
                titulo={c.razon_social}
                subtitulo={`${NOMBRE_TIPO_ID[c.tipo_identificacion_sri] ?? "ID"}: ${c.identificacion}`}
                detalle={c.email || c.telefono || undefined}
              />
            ))}
          </GrupoFilas>
        </TirarParaRefrescar>
      )}

      {/* Celular: agregar una persona */}
      <BotonFlotante onClick={abrirModal} etiqueta="Nueva persona" />

      {/* Nueva persona: Hoja (en el celular sube desde abajo, con los botones fijos abajo) */}
      <Hoja
        abierta={showModal}
        onCerrar={() => setShowModal(false)}
        titulo="Nueva persona"
        cerrable={!saving}
        pie={<>
          <Boton variante="secundario" onClick={() => setShowModal(false)} disabled={saving}>Cancelar</Boton>
          <Boton onClick={handleSave} disabled={!puedeGuardar} cargando={saving} icono={<Save size={16} />}>
            Guardar
          </Boton>
        </>}
      >
            <div className="space-y-3">
              {/* Tipo + Identificación + Buscar */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs mb-1.5" style={{ color: "var(--kipu-subtle)" }}>Tipo ID</label>
                  <div className="relative">
                    <select
                      value={form.tipo_identificacion_sri}
                      onChange={(e) => handleTipoChange(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg text-sm appearance-none transition-colors focus:outline-none"
                      style={{
                        background: "var(--kipu-surface)",
                        border: "1px solid var(--kipu-border)",
                        color: "var(--kipu-text)",
                      }}
                      onFocus={e => e.currentTarget.style.borderColor = "var(--kipu-accent)"}
                      onBlur={e => e.currentTarget.style.borderColor = "var(--kipu-border)"}
                    >
                      {TIPO_ID.map(t => (
                        <option key={t.value} value={t.value}>{t.label}</option>
                      ))}
                    </select>
                    <ChevronDown
                      size={13}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none"
                      style={{ color: "var(--kipu-subtle)" }}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs mb-1.5" style={{ color: "var(--kipu-subtle)" }}>Identificación *</label>
                  <div className="flex gap-1">
                    <div className="relative flex-1">
                      <input
                        value={form.identificacion}
                        inputMode={tecladoIdentificacion(form.tipo_identificacion_sri)}
                        onChange={(e) => {
                          const val = ["04", "05"].includes(form.tipo_identificacion_sri)
                            ? e.target.value.replace(/\D/g, "")
                            : e.target.value.toUpperCase();
                          setForm({ ...form, identificacion: val });
                          setLookupMsg("");
                        }}
                        placeholder={
                          form.tipo_identificacion_sri === "04" ? "RUC 13 dígitos" :
                          form.tipo_identificacion_sri === "05" ? "Cédula 10 dígitos" :
                          "Número"
                        }
                        maxLength={
                          form.tipo_identificacion_sri === "04" ? 13 :
                          form.tipo_identificacion_sri === "05" ? 10 : 20
                        }
                        className="w-full px-3 py-2 rounded-lg text-sm pr-7 transition-colors focus:outline-none"
                        style={{
                          background: "var(--kipu-surface)",
                          border: valId.error
                            ? "1px solid color-mix(in srgb, var(--kipu-danger) 70%, transparent)"
                            : "1px solid var(--kipu-border)",
                          color: "var(--kipu-text)",
                        }}
                        onFocus={e => {
                          if (!valId.error) e.currentTarget.style.borderColor = "var(--kipu-accent)";
                        }}
                        onBlur={e => {
                          if (!valId.error) e.currentTarget.style.borderColor = "var(--kipu-border)";
                        }}
                      />
                      {valId.ok && form.identificacion && (!buscaNombres || !["04", "05"].includes(form.tipo_identificacion_sri)) && (
                        <Check size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2" style={{ color: "var(--kipu-success)" }} />
                      )}
                    </div>

                    {/* Botón buscar (solo cuentas que pagan) */}
                    {buscaNombres && ["04", "05"].includes(form.tipo_identificacion_sri) && (
                      <button
                        type="button"
                        onClick={handleLookup}
                        disabled={!puedeBuscar}
                        className="px-2 rounded-lg transition-colors shrink-0 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center"
                        style={{
                          border: "1px solid var(--kipu-border)",
                          color: "var(--kipu-subtle)",
                          minWidth: "32px",
                        }}
                        onMouseEnter={e => {
                          if (puedeBuscar) {
                            e.currentTarget.style.color = "var(--kipu-accent)";
                            e.currentTarget.style.borderColor = "var(--kipu-accent)";
                          }
                        }}
                        onMouseLeave={e => {
                          if (puedeBuscar) {
                            e.currentTarget.style.color = "var(--kipu-subtle)";
                            e.currentTarget.style.borderColor = "var(--kipu-border)";
                          }
                        }}
                        title="Buscar nombre por cédula/RUC"
                      >
                        {lookupLoading
                          ? <Loader2 size={13} className="animate-spin" />
                          : <Search size={13} />
                        }
                      </button>
                    )}
                  </div>
                  {valId.error && (
                    <p className="flex items-center gap-1 mt-1 text-xs" style={{ color: "var(--kipu-danger)" }}>
                      <AlertCircle size={10} /> {valId.error}
                    </p>
                  )}
                  {lookupMsg && (
                    <p
                      className="text-xs mt-1"
                      style={{
                        color: lookupMsg.startsWith("✓")
                          ? "var(--kipu-success)"
                          : lookupMsg.includes("Demasiadas")
                            ? "var(--kipu-danger)"
                            : "var(--kipu-subtle)",
                      }}
                    >
                      {lookupMsg}
                    </p>
                  )}
                  {/* Sin buscador: el nombre se escribe a mano */}
                  {!buscaNombres && ["04", "05"].includes(form.tipo_identificacion_sri) && valId.ok && (
                    <p className="mt-1 text-xs text-sutil">{textoNombreAMano()}</p>
                  )}
                </div>
              </div>

              {/* Razón social */}
              <div>
                <label className="block text-xs mb-1.5" style={{ color: "var(--kipu-subtle)" }}>Razón Social / Nombre *</label>
                <input
                  value={form.razon_social}
                  onChange={(e) => setForm({ ...form, razon_social: e.target.value.toUpperCase() })}
                  placeholder="APELLIDOS NOMBRES o EMPRESA S.A."
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

              {/* Email */}
              <div>
                <label className="block text-xs mb-1.5" style={{ color: "var(--kipu-subtle)" }}>Email</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value.toLowerCase() })}
                  placeholder="persona@email.com"
                  className="w-full px-3 py-2 rounded-lg text-sm transition-colors focus:outline-none"
                  style={{
                    background: "var(--kipu-surface)",
                    border: form.email && !emailOk
                      ? "1px solid color-mix(in srgb, var(--kipu-danger) 70%, transparent)"
                      : "1px solid var(--kipu-border)",
                    color: "var(--kipu-text)",
                  }}
                  onFocus={e => {
                    if (!(form.email && !emailOk)) e.currentTarget.style.borderColor = "var(--kipu-accent)";
                  }}
                  onBlur={e => {
                    if (!(form.email && !emailOk)) e.currentTarget.style.borderColor = "var(--kipu-border)";
                  }}
                />
                {form.email && !emailOk && (
                  <p className="flex items-center gap-1 mt-1 text-xs" style={{ color: "var(--kipu-danger)" }}>
                    <AlertCircle size={10} /> Email inválido.
                  </p>
                )}
              </div>

              {/* Teléfono + Dirección */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs mb-1.5" style={{ color: "var(--kipu-subtle)" }}>Teléfono</label>
                  <input
                    value={form.telefono}
                    type="tel"
                    onChange={(e) => setForm({ ...form, telefono: e.target.value.replace(/\D/g, "") })}
                    placeholder="0999999999"
                    maxLength={15}
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
                <div>
                  <label className="block text-xs mb-1.5" style={{ color: "var(--kipu-subtle)" }}>Dirección</label>
                  <input
                    value={form.direccion}
                    onChange={(e) => setForm({ ...form, direccion: e.target.value.toUpperCase() })}
                    placeholder="AV. PRINCIPAL 123"
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
              </div>

              {/* Error general */}
              {error && (
                <div
                  className="flex items-center gap-2 text-xs px-3 py-2 rounded-lg"
                  style={{
                    color: "var(--kipu-danger)",
                    background: "color-mix(in srgb, var(--kipu-danger) 10%, transparent)",
                  }}
                >
                  <AlertCircle size={12} />
                  {error}
                </div>
              )}
            </div>
      </Hoja>
    </div>
  );
}