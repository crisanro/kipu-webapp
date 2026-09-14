"use client";
import { useState } from "react";
import {
  Pencil, X, Check, Loader2,
  Building2, FileText, Calendar, Rocket,
  ShieldCheck, HelpCircle, ChevronRight,
} from "lucide-react";
import api from "@/lib/api";
import Checklist, { HealthData } from "@/components/Checklist";
import PinInput from "@/components/PinInput";
import { useAuthStore } from "@/store/auth.store";

interface Props {
  legal:        any;
  health:       HealthData | null;
  onActualizar: () => void;
}

interface CampoFiscal {
  key:       string;
  label:     string;
  editable:  boolean;
  tipo?:     "select";
  opciones?: string[];
  render?:   (v: any) => string;
  span?:     boolean;           // ocupa ancho completo en el grid
}

const CAMPOS_FISCALES: CampoFiscal[] = [
  { key: "ruc",                     label: "RUC",                   editable: false },
  { key: "razon_social",            label: "Razón Social",          editable: true,  span: true },
  { key: "nombre_comercial",        label: "Nombre Comercial",      editable: true,  span: true },
  { key: "direccion_matriz",        label: "Dirección Matriz",      editable: true,  span: true },
  { key: "obligado_contabilidad",   label: "Obligado Contabilidad", editable: true,  tipo: "select", opciones: ["SI", "NO"] },
  { key: "contribuyente_especial",  label: "Contrib. Especial Nro", editable: true },
  { key: "ambiente",                label: "Ambiente SRI",          editable: false, render: (v: any) => v === 2 ? "🟢 Producción" : "🟡 Pruebas" },
];

const REGIMEN_OPCIONES = [
  { value: "",                                                       label: "Régimen General",       desc: "No pertenece al RIMPE" },
  { value: "CONTRIBUYENTE RÉGIMEN RIMPE",                            label: "RIMPE Emprendedor",     desc: "Ingresos anuales hasta $300.000" },
  { value: "CONTRIBUYENTE NEGOCIO POPULAR - RÉGIMEN RIMPE",          label: "RIMPE Negocio Popular", desc: "Ingresos anuales hasta $20.000" },
];

export default function TabEmpresa({ legal, health, onActualizar }: Props) {
  const [prodMsg,        setProdMsg]        = useState("");
  const [showProdModal,  setShowProdModal]  = useState(false);
  const [periodoIva,     setPeriodoIva]     = useState<string>(legal?.periodo_iva ?? "MENSUAL");
  const [guardando,      setGuardando]      = useState(false);
  const [msgPeriodo,     setMsgPeriodo]     = useState("");

  // Edición inline
  const [editando,       setEditando]       = useState<string | null>(null);
  const [editValor,      setEditValor]      = useState("");
  const [guardandoCampo, setGuardandoCampo] = useState(false);
  const [errorCampo,     setErrorCampo]     = useState("");

  // Leyendas SRI
  const [leyendaMsg,        setLeyendaMsg]        = useState("");
  const [guardandoLeyenda,  setGuardandoLeyenda]  = useState(false);
  const [agenteRetencion,   setAgenteRetencion]   = useState(legal?.agente_retencion ?? "");
  const [regimenRimpe,      setRegimenRimpe]      = useState(legal?.regimen_rimpe ?? "");
  const [granContribuyente, setGranContribuyente]  = useState(legal?.gran_contribuyente_resolucion ?? "");

  const email = useAuthStore((s) => s.email) ?? "";

  if (!legal) return null;

  const esObligado         = legal.obligado_contabilidad === "SI";
  const periodoEfectivo    = esObligado ? "MENSUAL" : periodoIva;
  const puedeEditarPeriodo = !esObligado;

  // ── Guardar campo individual ────────────────────────────────────
  const guardarCampo = async (key: string, valor: string) => {
    setGuardandoCampo(true);
    setErrorCampo("");
    try {
      await api.patch("/api/v1/app/emisor/config", { [key]: valor || null });
      setEditando(null);
      onActualizar();
    } catch {
      setErrorCampo("No se pudo guardar. Intenta de nuevo.");
    } finally {
      setGuardandoCampo(false);
    }
  };

  const iniciarEdicion = (key: string) => {
    setEditando(key);
    setEditValor(legal[key] || "");
    setErrorCampo("");
  };

  // ── Guardar leyendas SRI ────────────────────────────────────────
  const guardarLeyendas = async () => {
    setGuardandoLeyenda(true);
    setLeyendaMsg("");
    try {
      await api.patch("/api/v1/app/emisor/config", {
        agente_retencion:              agenteRetencion || null,
        regimen_rimpe:                 regimenRimpe || null,
        gran_contribuyente_resolucion: granContribuyente || null,
      });
      setLeyendaMsg("✅ Leyendas actualizadas correctamente.");
      onActualizar();
    } catch {
      setLeyendaMsg("❌ Error al guardar las leyendas.");
    } finally {
      setGuardandoLeyenda(false);
    }
  };

  // ── Guardar período IVA ─────────────────────────────────────────
  const guardarPeriodo = async (nuevo: string) => {
    if (nuevo === legal.periodo_iva) return;
    setGuardando(true);
    setMsgPeriodo("");
    try {
      await api.patch("/api/v1/app/emisor/config", { periodo_iva: nuevo });
      setMsgPeriodo("✅ Período guardado.");
      onActualizar();
    } catch {
      setMsgPeriodo("❌ Error al guardar el período.");
      setPeriodoIva(legal.periodo_iva ?? "MENSUAL");
    } finally {
      setGuardando(false);
    }
  };

  // ── Detectar si leyendas tienen cambios sin guardar ─────────────
  const leyendasModificadas =
    agenteRetencion   !== (legal?.agente_retencion ?? "") ||
    regimenRimpe      !== (legal?.regimen_rimpe ?? "") ||
    granContribuyente !== (legal?.gran_contribuyente_resolucion ?? "");

  return (
    <div className="space-y-6">
      {/* Checklist */}
      {health && !health.listo_produccion && (
        <Checklist health={health} />
      )}

      {/* ══ Card 1: Datos Fiscales ════════════════════════════════ */}
      <section
        className="rounded-2xl p-5 md:p-6"
        style={{
          background: "var(--kipu-surface)",
          border: "1px solid var(--kipu-border)",
        }}
      >
        <div className="flex items-center gap-2.5 mb-5 pb-3" style={{ borderBottom: "1px solid var(--kipu-border)" }}>
          <div className="p-2 rounded-lg" style={{ background: "color-mix(in srgb, var(--kipu-accent) 12%, transparent)", color: "var(--kipu-accent)" }}>
            <Building2 size={18} />
          </div>
          <div>
            <h2 className="text-sm font-bold" style={{ color: "var(--kipu-text)" }}>
              Datos Fiscales
            </h2>
            <p className="text-xs" style={{ color: "var(--kipu-subtle)" }}>
              Información registrada ante el SRI. Haz clic en el lápiz para editar.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {CAMPOS_FISCALES.map((campo) => {
            const { key, label, editable, tipo, opciones, render, span } = campo;
            const valor        = render ? render(legal[key]) : (legal[key] || "—");
            const estaEditando = editando === key;

            return (
              <div
                key={key}
                className={`rounded-xl p-3.5 group transition-all ${span ? "sm:col-span-2" : ""}`}
                style={{
                  background: estaEditando
                    ? "color-mix(in srgb, var(--kipu-accent) 5%, transparent)"
                    : "var(--kipu-bg)",
                  border: estaEditando
                    ? "1px solid var(--kipu-accent)"
                    : "1px solid var(--kipu-border)",
                }}
              >
                <div className="flex items-center justify-between mb-1">
                  <span
                    className="text-[11px] font-medium uppercase tracking-wider"
                    style={{ color: "var(--kipu-subtle)" }}
                  >
                    {label}
                  </span>
                  {editable && !estaEditando && (
                    <button
                      onClick={() => iniciarEdicion(key)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-md flex items-center gap-1"
                      style={{ color: "var(--kipu-accent)" }}
                    >
                      <Pencil size={12} />
                      <span className="text-[11px]">Editar</span>
                    </button>
                  )}
                </div>

                {estaEditando ? (
                  <div className="flex items-center gap-2 mt-1">
                    {tipo === "select" ? (
                      <select
                        value={editValor}
                        onChange={(e) => setEditValor(e.target.value)}
                        className="flex-1 rounded-lg px-2.5 py-1.5 text-sm font-medium focus:outline-none"
                        style={{
                          background: "var(--kipu-surface)",
                          border: "1px solid var(--kipu-accent)",
                          color: "var(--kipu-text)",
                        }}
                      >
                        {opciones?.map((op) => (
                          <option key={op} value={op}>{op}</option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type="text"
                        value={editValor}
                        onChange={(e) => setEditValor(e.target.value)}
                        className="flex-1 rounded-lg px-2.5 py-1.5 text-sm font-medium focus:outline-none"
                        style={{
                          background: "var(--kipu-surface)",
                          border: "1px solid var(--kipu-accent)",
                          color: "var(--kipu-text)",
                        }}
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === "Enter") guardarCampo(key, editValor);
                          if (e.key === "Escape") setEditando(null);
                        }}
                      />
                    )}
                    <button
                      onClick={() => guardarCampo(key, editValor)}
                      disabled={guardandoCampo}
                      className="p-1.5 rounded-lg text-white transition-colors"
                      style={{ background: "var(--kipu-success)" }}
                    >
                      {guardandoCampo ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                    </button>
                    <button
                      onClick={() => setEditando(null)}
                      className="p-1.5 rounded-lg transition-colors"
                      style={{ background: "var(--kipu-bg)", color: "var(--kipu-text)" }}
                    >
                      <X size={14} />
                    </button>
                  </div>
                ) : (
                  <div
                    className="text-sm font-semibold leading-snug"
                    style={{ color: "var(--kipu-text)", wordBreak: "break-word" }}
                  >
                    {valor}
                  </div>
                )}

                {estaEditando && errorCampo && (
                  <p className="text-[11px] mt-1.5" style={{ color: "var(--kipu-error, #ef4444)" }}>{errorCampo}</p>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* ══ Card 2: Leyendas Tributarias SRI ═══════════════════════ */}
      <section
        className="rounded-2xl p-5 md:p-6"
        style={{
          background: "var(--kipu-surface)",
          border: "1px solid var(--kipu-border)",
        }}
      >
        <div className="flex items-center gap-2.5 mb-5 pb-3" style={{ borderBottom: "1px solid var(--kipu-border)" }}>
          <div className="p-2 rounded-lg" style={{ background: "color-mix(in srgb, #f59e0b 12%, transparent)", color: "#f59e0b" }}>
            <FileText size={18} />
          </div>
          <div>
            <h2 className="text-sm font-bold" style={{ color: "var(--kipu-text)" }}>
              Leyendas Tributarias
            </h2>
            <p className="text-xs" style={{ color: "var(--kipu-subtle)" }}>
              Ficha Técnica SRI v2.34 — se incluyen automáticamente en el XML y RIDE.
            </p>
          </div>
        </div>

        <div className="space-y-5">
          {/* Régimen RIMPE */}
          <div>
            <label
              className="block text-[11px] font-semibold uppercase tracking-wider mb-2"
              style={{ color: "var(--kipu-subtle)" }}
            >
              Régimen tributario
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {REGIMEN_OPCIONES.map((op) => {
                const activo = regimenRimpe === op.value;
                return (
                  <button
                    key={op.value}
                    type="button"
                    onClick={() => setRegimenRimpe(op.value)}
                    className="p-3 rounded-xl text-left transition-all"
                    style={{
                      background: activo
                        ? "color-mix(in srgb, var(--kipu-accent) 10%, transparent)"
                        : "var(--kipu-bg)",
                      border: activo
                        ? "1.5px solid var(--kipu-accent)"
                        : "1px solid var(--kipu-border)",
                    }}
                  >
                    <span
                      className="text-xs font-bold block"
                      style={{ color: activo ? "var(--kipu-accent)" : "var(--kipu-text)" }}
                    >
                      {op.label}
                    </span>
                    <span className="text-[10px] mt-0.5 block" style={{ color: "var(--kipu-subtle)" }}>
                      {op.desc}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Agente de Retención + Gran Contribuyente */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label
                className="block text-[11px] font-semibold uppercase tracking-wider mb-1.5"
                style={{ color: "var(--kipu-subtle)" }}
              >
                Agente de Retención
              </label>
              <input
                type="text"
                value={agenteRetencion}
                onChange={(e) => setAgenteRetencion(e.target.value.replace(/\D/g, "").slice(0, 8))}
                placeholder="Nro. resolución (ej: 1)"
                className="w-full rounded-xl px-3 py-2.5 text-sm focus:outline-none"
                style={{
                  background: "var(--kipu-bg)",
                  border: "1px solid var(--kipu-border)",
                  color: "var(--kipu-text)",
                }}
              />
              <p className="text-[10px] mt-1 flex items-start gap-1" style={{ color: "var(--kipu-subtle)" }}>
                <HelpCircle size={10} className="shrink-0 mt-0.5" />
                Vacío si no eres agente de retención.
              </p>
            </div>

            <div>
              <label
                className="block text-[11px] font-semibold uppercase tracking-wider mb-1.5"
                style={{ color: "var(--kipu-subtle)" }}
              >
                Gran Contribuyente
              </label>
              <input
                type="text"
                value={granContribuyente}
                onChange={(e) => setGranContribuyente(e.target.value.slice(0, 50))}
                placeholder="Nro. resolución (ej: NAC-GCF...)"
                className="w-full rounded-xl px-3 py-2.5 text-sm focus:outline-none"
                style={{
                  background: "var(--kipu-bg)",
                  border: "1px solid var(--kipu-border)",
                  color: "var(--kipu-text)",
                }}
              />
              <p className="text-[10px] mt-1 flex items-start gap-1" style={{ color: "var(--kipu-subtle)" }}>
                <HelpCircle size={10} className="shrink-0 mt-0.5" />
                Vacío si no aplica.
              </p>
            </div>
          </div>

          {/* Botón guardar */}
          <div className="flex items-center gap-3 pt-1">
            <button
              onClick={guardarLeyendas}
              disabled={guardandoLeyenda || !leyendasModificadas}
              className="px-5 py-2 rounded-xl text-sm font-semibold text-white transition-all flex items-center gap-2"
              style={{
                background: leyendasModificadas ? "var(--kipu-accent)" : "var(--kipu-border)",
                cursor: leyendasModificadas ? "pointer" : "default",
                opacity: guardandoLeyenda ? 0.7 : 1,
              }}
            >
              {guardandoLeyenda ? (
                <><Loader2 size={14} className="animate-spin" /> Guardando...</>
              ) : leyendasModificadas ? (
                "Guardar cambios"
              ) : (
                "Sin cambios"
              )}
            </button>
            {leyendaMsg && (
              <span className="text-xs" style={{ color: "var(--kipu-subtle)" }}>{leyendaMsg}</span>
            )}
          </div>
        </div>
      </section>

      {/* ══ Card 3: Período de IVA ═════════════════════════════════ */}
      <section
        className="rounded-2xl p-5 md:p-6"
        style={{
          background: "var(--kipu-surface)",
          border: "1px solid var(--kipu-border)",
        }}
      >
        <div className="flex items-center gap-2.5 mb-5 pb-3" style={{ borderBottom: "1px solid var(--kipu-border)" }}>
          <div className="p-2 rounded-lg" style={{ background: "color-mix(in srgb, #10b981 12%, transparent)", color: "#10b981" }}>
            <Calendar size={18} />
          </div>
          <div>
            <h2 className="text-sm font-bold" style={{ color: "var(--kipu-text)" }}>
              Frecuencia de Declaración de IVA
            </h2>
            <p className="text-xs" style={{ color: "var(--kipu-subtle)" }}>
              {esObligado
                ? "Obligados a llevar contabilidad declaran mensualmente."
                : "Según tu configuración en el RUC del SRI."}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[
            { valor: "MENSUAL",   titulo: "Mensual",   desc: "Declaración cada mes (obligatorio si llevas contabilidad)." },
            { valor: "SEMESTRAL", titulo: "Semestral",  desc: "Enero–Jun (vence julio) / Jul–Dic (vence enero)." },
          ].map(({ valor, titulo, desc }) => {
            const seleccionado = periodoEfectivo === valor;
            return (
              <button
                key={valor}
                type="button"
                disabled={!puedeEditarPeriodo || guardando}
                onClick={() => { setPeriodoIva(valor); guardarPeriodo(valor); }}
                className="p-4 rounded-xl text-left transition-all"
                style={{
                  background: seleccionado
                    ? "color-mix(in srgb, var(--kipu-accent) 10%, transparent)"
                    : "var(--kipu-bg)",
                  border: seleccionado
                    ? "1.5px solid var(--kipu-accent)"
                    : "1px solid var(--kipu-border)",
                  opacity: !puedeEditarPeriodo ? 0.5 : 1,
                  cursor: !puedeEditarPeriodo ? "not-allowed" : "pointer",
                }}
              >
                <div className="flex items-center justify-between mb-1">
                  <span
                    className="font-bold text-sm"
                    style={{ color: seleccionado ? "var(--kipu-accent)" : "var(--kipu-text)" }}
                  >
                    {titulo}
                  </span>
                  {seleccionado && <ShieldCheck size={16} style={{ color: "var(--kipu-accent)" }} />}
                </div>
                <p className="text-[11px] leading-relaxed" style={{ color: "var(--kipu-subtle)" }}>
                  {desc}
                </p>
              </button>
            );
          })}
        </div>

        <div className="mt-2 min-h-[20px]">
          {guardando && (
            <div className="flex items-center gap-1.5 text-xs" style={{ color: "var(--kipu-subtle)" }}>
              <Loader2 size={12} className="animate-spin" /> Guardando...
            </div>
          )}
          {!guardando && msgPeriodo && (
            <p className="text-xs" style={{ color: "var(--kipu-subtle)" }}>{msgPeriodo}</p>
          )}
        </div>
      </section>

      {/* ══ Card 4: Activar Producción ═════════════════════════════ */}
      {health?.listo_produccion && legal.ambiente !== 2 && (
        <section
          className="rounded-2xl p-5 md:p-6 relative overflow-hidden"
          style={{
            background: "linear-gradient(135deg, color-mix(in srgb, var(--kipu-success) 12%, transparent), var(--kipu-surface))",
            border: "1px solid color-mix(in srgb, var(--kipu-success) 30%, transparent)",
          }}
        >
          <div className="flex items-start gap-3">
            <div
              className="p-2.5 rounded-xl shrink-0"
              style={{ background: "color-mix(in srgb, var(--kipu-success) 15%, transparent)", color: "var(--kipu-success)" }}
            >
              <Rocket size={22} />
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-bold mb-1" style={{ color: "var(--kipu-text)" }}>
                ¡Todo listo para producción!
              </h3>
              <p className="text-xs mb-3 leading-relaxed" style={{ color: "var(--kipu-subtle)" }}>
                Completaste todos los requisitos. Al activar producción podrás emitir comprobantes reales autorizados por el SRI.
              </p>
              <button
                type="button"
                onClick={() => setShowProdModal(true)}
                className="px-5 py-2 rounded-xl text-white text-xs font-bold transition-all flex items-center gap-1.5"
                style={{ background: "var(--kipu-success)" }}
              >
                Activar producción <ChevronRight size={14} />
              </button>
              {prodMsg && (
                <p className="mt-2 text-xs font-medium" style={{ color: "var(--kipu-success)" }}>{prodMsg}</p>
              )}
            </div>
          </div>
        </section>
      )}

      {/* ══ Modal PIN ══════════════════════════════════════════════ */}
      {showProdModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div
            className="rounded-2xl w-full max-w-sm p-6 relative"
            style={{
              background: "var(--kipu-surface)",
              border: "1px solid var(--kipu-border)",
            }}
          >
            <div className="text-center mb-5">
              <div
                className="w-11 h-11 rounded-xl flex items-center justify-center mx-auto mb-3"
                style={{ background: "color-mix(in srgb, var(--kipu-success) 12%, transparent)", color: "var(--kipu-success)" }}
              >
                <Rocket size={20} />
              </div>
              <h3 className="text-sm font-bold mb-0.5" style={{ color: "var(--kipu-text)" }}>
                Confirmar pase a producción
              </h3>
              <p className="text-xs" style={{ color: "var(--kipu-subtle)" }}>
                Ingresa el PIN enviado a tu correo.
              </p>
            </div>
            <PinInput
              tipoAccion="ACTIVAR_PRODUCCION"
              email={email}
              label="activar producción"
              onCancelar={() => setShowProdModal(false)}
              onConfirmar={async (pin) => {
                await api.post(`/api/v1/app/emisor/produccion?pin=${pin}`);
                setProdMsg("¡Bienvenido a producción!");
                setShowProdModal(false);
                onActualizar();
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}