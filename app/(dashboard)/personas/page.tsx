"use client";
import { rutas } from "@/lib/rutas";
import { useRef, useState, Suspense } from "react";
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
import { Campo, Entrada, Selector } from "@/components/ui/Campo";
import BotonIcono from "@/components/ui/BotonIcono";
import { cn } from "@/components/ui/cn";
import { useLista, useBusquedaUrl } from "@/lib/useLista";
import {
  Search, Plus, Users,
  Save, AlertCircle, Check, Loader2
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
  // La búsqueda vive en la URL (useSearchParams): necesita un Suspense encima
  return <Suspense fallback={<div className="p-4 md:p-6"><EsqueletoFilas filas={6} /></div>}><PersonasContenido /></Suspense>;
}

// Separado del chequeo de permiso: los hooks se llaman siempre en el mismo orden
// aunque el permiso cambie con la página abierta (antes React lanzaba un error).
function PersonasContenido() {
  const [query,     setQuery]     = useBusquedaUrl();   // en la URL: sigue al volver de una persona
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
                <Campo etiqueta="Tipo ID">
                  <Selector value={form.tipo_identificacion_sri} onChange={(e) => handleTipoChange(e.target.value)}>
                    {TIPO_ID.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </Selector>
                </Campo>
                <Campo etiqueta="Identificación *" error={valId.error || null}>
                  <div className="flex gap-1">
                    <Entrada
                      value={form.identificacion}
                      inputMode={tecladoIdentificacion(form.tipo_identificacion_sri)}
                      autoComplete="off"
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
                      sufijo={valId.ok && form.identificacion && (!buscaNombres || !["04", "05"].includes(form.tipo_identificacion_sri))
                        ? <Check size={14} className="text-exito" aria-hidden /> : undefined}
                      className="min-w-0 flex-1"
                    />
                    {/* Buscar el nombre (solo cuentas que pagan) */}
                    {buscaNombres && ["04", "05"].includes(form.tipo_identificacion_sri) && (
                      <BotonIcono
                        variante="secundario"
                        etiqueta="Buscar nombre por cédula/RUC"
                        icono={lookupLoading ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
                        onClick={handleLookup}
                        disabled={!puedeBuscar}
                      />
                    )}
                  </div>
                  {lookupMsg && (
                    <p className={cn("text-xs",
                      lookupMsg.startsWith("✓") ? "text-exito"
                        : lookupMsg.includes("Demasiadas") ? "text-peligro" : "text-sutil")}>
                      {lookupMsg}
                    </p>
                  )}
                  {/* Sin buscador: el nombre se escribe a mano */}
                  {!buscaNombres && ["04", "05"].includes(form.tipo_identificacion_sri) && valId.ok && (
                    <p className="text-xs text-sutil">{textoNombreAMano()}</p>
                  )}
                </Campo>
              </div>

              <Campo etiqueta="Razón Social / Nombre *">
                <Entrada
                  teclado="nombre"
                  value={form.razon_social}
                  onChange={(e) => setForm({ ...form, razon_social: e.target.value.toUpperCase() })}
                  placeholder="APELLIDOS NOMBRES o EMPRESA S.A."
                />
              </Campo>

              <Campo etiqueta="Email" error={form.email && !emailOk ? "Email inválido." : null}>
                <Entrada
                  teclado="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value.toLowerCase() })}
                  placeholder="persona@email.com"
                />
              </Campo>

              <div className="grid grid-cols-2 gap-3">
                <Campo etiqueta="Teléfono">
                  <Entrada
                    teclado="telefono"
                    value={form.telefono}
                    onChange={(e) => setForm({ ...form, telefono: e.target.value.replace(/\D/g, "") })}
                    placeholder="0999999999"
                    maxLength={15}
                  />
                </Campo>
                <Campo etiqueta="Dirección">
                  <Entrada
                    value={form.direccion}
                    onChange={(e) => setForm({ ...form, direccion: e.target.value.toUpperCase() })}
                    placeholder="AV. PRINCIPAL 123"
                  />
                </Campo>
              </div>

              {error && (
                <p role="alert" className="flex items-center gap-2 rounded-lg bg-peligro-suave px-3 py-2 text-xs text-peligro-texto">
                  <AlertCircle size={12} aria-hidden /> {error}
                </p>
              )}
            </div>
      </Hoja>
    </div>
  );
}