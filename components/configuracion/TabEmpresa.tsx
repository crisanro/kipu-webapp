"use client";
// Secciones de la empresa en Configuración (app/(dashboard)/configuracion):
//   - DatosEmpresa:      datos registrados en el SRI. Cada fila se toca y se edita
//                        en una hoja (antes el lápiz solo aparecía con el mouse).
//   - ImpuestosEmpresa:  régimen y leyendas del RIDE, retenciones (#retenciones)
//                        y frecuencia de la declaración de IVA.
import { useState } from "react";
import { ChevronRight, ShieldCheck } from "lucide-react";
import api from "@/lib/api";
import Checklist, { HealthData } from "@/components/Checklist";
import { refrescarEmpresaActual } from "@/lib/empresa";
import { ES_APP_NATIVA } from "@/lib/plataforma";
import { useAuthStore } from "@/store/auth.store";
import Boton from "@/components/ui/Boton";
import Hoja from "@/components/ui/Hoja";
import ChipsFiltro from "@/components/ui/ChipsFiltro";
import { Campo, Entrada } from "@/components/ui/Campo";
import { useAvisos } from "@/components/ui/Avisos";
import { cn } from "@/components/ui/cn";

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- forma de /emisor/config
type Legal = Record<string, any>;

interface CampoFiscal {
  key:       string;
  label:     string;
  editable:  boolean;
  opciones?: { valor: string; etiqueta: string }[];
  render?:   (v: unknown) => string;
}

const CAMPOS_FISCALES: CampoFiscal[] = [
  { key: "ruc",                    label: "RUC",                          editable: false },
  { key: "razon_social",           label: "Razón social",                 editable: true },
  { key: "nombre_comercial",       label: "Nombre comercial",             editable: true },
  { key: "direccion_matriz",       label: "Dirección matriz",             editable: true },
  { key: "obligado_contabilidad",  label: "Obligado a llevar contabilidad", editable: true,
    opciones: [{ valor: "SI", etiqueta: "Sí" }, { valor: "NO", etiqueta: "No" }],
    render: (v) => v === "SI" ? "Sí" : v === "NO" ? "No" : "—" },
  { key: "contribuyente_especial", label: "Contribuyente especial (Nro.)", editable: true },
  { key: "ambiente",               label: "Ambiente SRI",                 editable: false,
    render: (v) => v === 2 ? "Producción" : "Pruebas" },
];

const REGIMEN_OPCIONES = [
  { value: "",                                              label: "Régimen General",       desc: "No pertenece al RIMPE" },
  { value: "CONTRIBUYENTE RÉGIMEN RIMPE",                   label: "RIMPE Emprendedor",     desc: "Ingresos anuales hasta $300.000" },
  { value: "CONTRIBUYENTE NEGOCIO POPULAR - RÉGIMEN RIMPE", label: "RIMPE Negocio Popular", desc: "Ingresos anuales hasta $20.000" },
];

const PERIODOS = [
  { valor: "MENSUAL",   titulo: "Mensual",   desc: "Declaración cada mes (obligatorio si llevas contabilidad)." },
  { valor: "SEMESTRAL", titulo: "Semestral", desc: "Enero–Jun (vence julio) / Jul–Dic (vence enero)." },
];

/** Tarjeta de opción (radio): régimen y período. */
function Opcion({ activo, titulo, desc, onClick, deshabilitado }: {
  activo: boolean; titulo: string; desc: string; onClick: () => void; deshabilitado?: boolean;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={activo}
      onClick={onClick}
      disabled={deshabilitado}
      className={cn(
        "flex min-h-14 w-full items-start gap-2 rounded-xl border p-3 text-left transition-colors",
        "disabled:cursor-not-allowed disabled:opacity-50",
        activo ? "border-acento bg-acento-suave" : "border-borde hover:bg-presionado active:bg-presionado",
      )}
    >
      <span className="min-w-0 flex-1">
        <span className={cn("block text-sm font-semibold", activo ? "text-acento" : "text-texto")}>{titulo}</span>
        <span className="mt-0.5 block text-xs text-sutil">{desc}</span>
      </span>
      {activo && <ShieldCheck size={16} className="mt-0.5 shrink-0 text-acento" aria-hidden />}
    </button>
  );
}

// ── Datos de la empresa ──────────────────────────────────────────────────────

export function DatosEmpresa({ legal, health, onActualizar }: {
  legal:        Legal | null;
  health:       HealthData | null;
  onActualizar: () => void;
}) {
  const avisos = useAvisos();
  const [editando,  setEditando]  = useState<CampoFiscal | null>(null);
  const [valor,     setValor]     = useState("");
  const [guardando, setGuardando] = useState(false);
  const [error,     setError]     = useState("");

  if (!legal) return null;

  const abrir = (c: CampoFiscal) => {
    setEditando(c);
    setValor(String(legal[c.key] ?? ""));
    setError("");
  };

  const guardar = async () => {
    if (!editando) return;
    setGuardando(true);
    setError("");
    try {
      await api.patch("/api/v1/app/emisor/config", { [editando.key]: valor.trim() || null });
      setEditando(null);
      avisos.exito("Guardado");
      onActualizar();
    } catch {
      setError("No se pudo guardar. Intenta de nuevo.");
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Pasos para pasar a producción (incluye el aviso de producción) */}
      {health && !health.en_produccion && <Checklist health={health} onUpdate={onActualizar} />}

      <section>
        <p className="mb-2 px-1 text-xs text-sutil">Información registrada ante el SRI. Toca un dato para corregirlo.</p>
        <div className="divide-y divide-borde overflow-hidden rounded-xl border border-borde bg-superficie">
          {CAMPOS_FISCALES.map((c) => {
            const texto = c.render ? c.render(legal[c.key]) : (legal[c.key] || "—");
            const contenido = (
              <>
                <span className="min-w-0 flex-1">
                  <span className="block text-xs text-sutil">{c.label}</span>
                  <span className="mt-0.5 block break-words text-sm font-medium text-texto">{texto}</span>
                </span>
                {c.editable && <ChevronRight size={18} className="shrink-0 text-sutil" aria-hidden />}
              </>
            );
            return c.editable ? (
              <button key={c.key} type="button" onClick={() => abrir(c)}
                      className="flex min-h-14 w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-presionado active:bg-presionado">
                {contenido}
              </button>
            ) : (
              <div key={c.key} className="flex min-h-14 items-center gap-3 px-4 py-3">{contenido}</div>
            );
          })}
        </div>
      </section>

      <Hoja
        abierta={!!editando}
        onCerrar={() => !guardando && setEditando(null)}
        titulo={editando?.label ?? ""}
        tamano="sm"
        pie={<>
          <Boton variante="secundario" onClick={() => setEditando(null)} disabled={guardando}>Cancelar</Boton>
          <Boton onClick={guardar} cargando={guardando}>Guardar</Boton>
        </>}
      >
        {editando && (editando.opciones ? (
          <ChipsFiltro etiqueta={editando.label} opciones={editando.opciones} valor={valor} onCambio={setValor} />
        ) : (
          <Campo etiqueta={editando.label} error={error || null}>
            <Entrada
              value={valor}
              onChange={(e) => setValor(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); guardar(); } }}
              enterKeyHint="done"
              autoFocus
            />
          </Campo>
        ))}
        {editando?.opciones && error && <p className="mt-2 text-xs text-peligro-texto" role="alert">{error}</p>}
      </Hoja>
    </div>
  );
}

// ── Impuestos y leyendas ─────────────────────────────────────────────────────

export function ImpuestosEmpresa({ legal, onActualizar }: {
  legal:        Legal | null;
  onActualizar: () => void;
}) {
  const avisos = useAvisos();
  const [periodoIva,        setPeriodoIva]        = useState<string>(legal?.periodo_iva ?? "MENSUAL");
  const [guardandoPeriodo,  setGuardandoPeriodo]  = useState(false);

  const [agenteRetencion,   setAgenteRetencion]   = useState(legal?.agente_retencion ?? "");
  const [regimenRimpe,      setRegimenRimpe]      = useState(legal?.regimen_rimpe ?? "");
  const [granContribuyente, setGranContribuyente] = useState(legal?.gran_contribuyente_resolucion ?? "");
  const [guardandoLeyenda,  setGuardandoLeyenda]  = useState(false);

  // Interruptor de retenciones: se guarda al tocarlo (PATCH /emisor/config)
  const [emiteRetenciones,  setEmiteRetenciones]  = useState<boolean>(!!legal?.emite_retenciones);
  const [guardandoRet,      setGuardandoRet]      = useState(false);
  const conPlan = useAuthStore((s) => !!s.empresa?.suscripcion_activa);

  if (!legal) return null;

  const esObligado      = legal.obligado_contabilidad === "SI";
  const periodoEfectivo = esObligado ? "MENSUAL" : periodoIva;

  const leyendasModificadas =
    agenteRetencion   !== (legal.agente_retencion ?? "") ||
    regimenRimpe      !== (legal.regimen_rimpe ?? "") ||
    granContribuyente !== (legal.gran_contribuyente_resolucion ?? "");

  const guardarLeyendas = async () => {
    setGuardandoLeyenda(true);
    try {
      await api.patch("/api/v1/app/emisor/config", {
        agente_retencion:              agenteRetencion || null,
        regimen_rimpe:                 regimenRimpe || null,
        gran_contribuyente_resolucion: granContribuyente || null,
      });
      avisos.exito("Leyendas guardadas");
      onActualizar();
    } catch {
      avisos.error("No se pudieron guardar las leyendas. Intenta de nuevo.");
    } finally {
      setGuardandoLeyenda(false);
    }
  };

  const cambiarRetenciones = async () => {
    const nuevo = !emiteRetenciones;
    setEmiteRetenciones(nuevo);
    setGuardandoRet(true);
    try {
      await api.patch("/api/v1/app/emisor/config", { emite_retenciones: nuevo });
      // El menú y Nueva RET ven el cambio enseguida (refresca la empresa del store)
      await refrescarEmpresaActual();
    } catch {
      setEmiteRetenciones(!nuevo);
      avisos.error("No se pudo guardar. Intenta de nuevo.");
    } finally {
      setGuardandoRet(false);
    }
  };

  const guardarPeriodo = async (nuevo: string) => {
    if (nuevo === legal.periodo_iva) return;
    const anterior = periodoIva;
    setPeriodoIva(nuevo);
    setGuardandoPeriodo(true);
    try {
      await api.patch("/api/v1/app/emisor/config", { periodo_iva: nuevo });
      avisos.exito("Período guardado");
      onActualizar();
    } catch {
      setPeriodoIva(anterior);
      avisos.error("No se pudo guardar el período. Intenta de nuevo.");
    } finally {
      setGuardandoPeriodo(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Régimen y leyendas del RIDE */}
      <section className="space-y-4 rounded-xl border border-borde bg-superficie p-4">
        <div>
          <h3 className="text-sm font-semibold text-texto">Leyendas tributarias</h3>
          <p className="mt-0.5 text-xs text-sutil">Salen solas en el XML y en el RIDE (Ficha Técnica SRI v2.34).</p>
        </div>

        <div role="radiogroup" aria-label="Régimen tributario" className="space-y-2">
          <p className="text-xs font-medium text-tenue tactil:text-sm">Régimen tributario</p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            {REGIMEN_OPCIONES.map((op) => (
              <Opcion key={op.value} activo={regimenRimpe === op.value} titulo={op.label} desc={op.desc}
                      onClick={() => setRegimenRimpe(op.value)} />
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Campo etiqueta="Agente de retención" opcional ayuda="Nro. de resolución. Vacío si no lo eres.">
            <Entrada
              teclado="numero"
              value={agenteRetencion}
              onChange={(e) => setAgenteRetencion(e.target.value.replace(/\D/g, "").slice(0, 8))}
              placeholder="Ej.: 1"
            />
          </Campo>
          <Campo etiqueta="Gran contribuyente" opcional ayuda="Nro. de resolución. Vacío si no aplica.">
            <Entrada
              value={granContribuyente}
              onChange={(e) => setGranContribuyente(e.target.value.slice(0, 50))}
              placeholder="Ej.: NAC-GCF…"
            />
          </Campo>
        </div>

        <Boton onClick={guardarLeyendas} cargando={guardandoLeyenda} disabled={!leyendasModificadas}>
          {leyendasModificadas ? "Guardar cambios" : "Sin cambios"}
        </Boton>
      </section>

      {/* Retenciones (enlace /configuracion#retenciones) */}
      <section id="retenciones" className="scroll-mt-4 rounded-xl border border-borde bg-superficie p-4">
        <label className="flex cursor-pointer items-start gap-3">
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-semibold text-texto">Emito comprobantes de retención</span>
            <span className="mt-0.5 block text-xs text-sutil">
              Muestra «Retención» en Emitir y en el detalle de tus compras. Actívalo si retienes a tus proveedores.
            </span>
            {!conPlan && !ES_APP_NATIVA && (
              <span className="mt-1 block text-xs text-tenue">Emitir retenciones requiere Kipu Pro o Kipu Al Día.</span>
            )}
          </span>
          <input
            type="checkbox"
            role="switch"
            checked={emiteRetenciones}
            disabled={guardandoRet}
            onChange={cambiarRetenciones}
            className="peer sr-only"
          />
          <span aria-hidden className={cn(
            "relative mt-0.5 h-7 w-12 shrink-0 rounded-full transition-colors duration-(--duracion-base)",
            "peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-acento",
            "peer-disabled:opacity-60",
            emiteRetenciones ? "bg-acento" : "bg-borde",
          )}>
            <span className={cn(
              "absolute top-0.5 size-6 rounded-full bg-white shadow transition-[left] duration-(--duracion-base) ease-estandar",
              emiteRetenciones ? "left-[22px]" : "left-0.5",
            )} />
          </span>
        </label>
      </section>

      {/* Frecuencia del IVA */}
      <section className="space-y-3 rounded-xl border border-borde bg-superficie p-4">
        <div>
          <h3 className="text-sm font-semibold text-texto">Declaración de IVA</h3>
          <p className="mt-0.5 text-xs text-sutil">
            {esObligado
              ? "Los obligados a llevar contabilidad declaran cada mes."
              : "Según lo que dice tu RUC en el SRI."}
          </p>
        </div>
        <div role="radiogroup" aria-label="Frecuencia de la declaración de IVA" className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {PERIODOS.map(({ valor, titulo, desc }) => (
            <Opcion key={valor} activo={periodoEfectivo === valor} titulo={titulo} desc={desc}
                    deshabilitado={esObligado || guardandoPeriodo}
                    onClick={() => guardarPeriodo(valor)} />
          ))}
        </div>
      </section>
    </div>
  );
}
