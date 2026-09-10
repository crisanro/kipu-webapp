"use client";
import { useState } from "react";
import { AlertTriangle } from "lucide-react";
import api from "@/lib/api";
import Checklist, { HealthData } from "@/components/Checklist";
import PinInput from "@/components/PinInput";
import { useAuthStore } from "@/store/auth.store";

interface Props {
  legal:        any;
  health:       HealthData | null;
  onActualizar: () => void;
}

export default function TabEmpresa({ legal, health, onActualizar }: Props) {
  const [prodMsg,       setProdMsg]       = useState("");
  const [showProdModal, setShowProdModal] = useState(false);
  const [periodoIva,    setPeriodoIva]    = useState<string>(legal?.periodo_iva ?? "MENSUAL");
  const [guardando,     setGuardando]     = useState(false);
  const [msgPeriodo,    setMsgPeriodo]    = useState("");

  const email = useAuthStore((s) => s.email) ?? "";

  if (!legal) return null;

  // Los obligados a llevar contabilidad siempre son mensuales — no pueden cambiar
  const esObligado         = legal.obligado_contabilidad === "SI";
  const periodoEfectivo    = esObligado ? "MENSUAL" : periodoIva;
  const puedeEditarPeriodo = !esObligado;

  const guardarPeriodo = async (nuevo: string) => {
    if (nuevo === legal.periodo_iva) return;
    setGuardando(true);
    setMsgPeriodo("");
    try {
      await api.patch("/api/v1/app/emisor/config", { periodo_iva: nuevo });
      setMsgPeriodo("✅ Guardado correctamente.");
      onActualizar();
    } catch {
      setMsgPeriodo("❌ Error al guardar. Intenta de nuevo.");
      setPeriodoIva(legal.periodo_iva ?? "MENSUAL");
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Checklist */}
      {health && !health.listo_produccion && (
        <Checklist health={health} />
      )}

      {/* Datos fiscales */}
      <div
        className="rounded-xl p-5"
        style={{
          background: "var(--kipu-surface)",
          border: "1px solid var(--kipu-border)",
        }}
      >
        <h2 className="text-sm font-semibold mb-4" style={{ color: "var(--kipu-text)" }}>Datos fiscales</h2>
        <div className="space-y-3">
          {[
            { label: "RUC",                   value: legal.ruc },
            { label: "Razón Social",          value: legal.razon_social },
            { label: "Nombre Comercial",      value: legal.nombre_comercial || "—" },
            { label: "Dirección Matriz",      value: legal.direccion_matriz },
            { label: "Obligado Contabilidad", value: legal.obligado_contabilidad },
            { label: "Contrib. Especial",     value: legal.contribuyente_especial || "—" },
            { label: "Ambiente",              value: legal.ambiente === 2 ? "🟢 Producción" : "🟡 Pruebas" },
          ].map(({ label, value }, idx, arr) => (
            <div
              key={label}
              className="flex justify-between text-sm pb-2"
              style={{
                borderBottom: idx === arr.length - 1 ? "none" : "1px solid var(--kipu-border)",
                paddingBottom: idx === arr.length - 1 ? 0 : "0.5rem",
              }}
            >
              <span style={{ color: "var(--kipu-subtle)" }}>{label}</span>
              <span className="font-medium text-right max-w-[60%]" style={{ color: "var(--kipu-text)" }}>{value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Período de declaración IVA */}
      <div
        className="rounded-xl p-5"
        style={{
          background: "var(--kipu-surface)",
          border: "1px solid var(--kipu-border)",
        }}
      >
        <h2 className="text-sm font-semibold mb-1" style={{ color: "var(--kipu-text)" }}>Período de declaración IVA</h2>
        <p className="text-xs mb-4" style={{ color: "var(--kipu-subtle)" }}>
          {esObligado
            ? "Los obligados a llevar contabilidad declaran mensualmente."
            : "Selecciona tu período según lo indicado en tu RUC en el SRI."}
        </p>

        <div className="flex gap-3">
          {/* Mensual */}
          <button
            type="button"
            disabled={!puedeEditarPeriodo || guardando}
            onClick={() => {
              setPeriodoIva("MENSUAL");
              guardarPeriodo("MENSUAL");
            }}
            className="flex-1 rounded-lg px-4 py-3 text-sm font-medium transition-colors"
            style={{
              background: periodoEfectivo === "MENSUAL"
                ? "color-mix(in srgb, var(--kipu-accent) 20%, transparent)"
                : "transparent",
              border: periodoEfectivo === "MENSUAL"
                ? "1px solid var(--kipu-accent)"
                : "1px solid var(--kipu-border)",
              color: periodoEfectivo === "MENSUAL"
                ? "var(--kipu-accent)"
                : "var(--kipu-muted)",
              opacity: !puedeEditarPeriodo ? 0.6 : 1,
              cursor: !puedeEditarPeriodo ? "not-allowed" : "pointer",
            }}
            onMouseEnter={e => {
              if (puedeEditarPeriodo && periodoEfectivo !== "MENSUAL") {
                e.currentTarget.style.borderColor = "color-mix(in srgb, var(--kipu-text) 30%, transparent)";
                e.currentTarget.style.color = "var(--kipu-text)";
              }
            }}
            onMouseLeave={e => {
              if (puedeEditarPeriodo && periodoEfectivo !== "MENSUAL") {
                e.currentTarget.style.borderColor = "var(--kipu-border)";
                e.currentTarget.style.color = "var(--kipu-muted)";
              }
            }}
          >
            <div className="font-semibold">Mensual</div>
            <div className="text-xs mt-0.5 opacity-70">Declara cada mes</div>
          </button>

          {/* Semestral */}
          <button
            type="button"
            disabled={!puedeEditarPeriodo || guardando}
            onClick={() => {
              setPeriodoIva("SEMESTRAL");
              guardarPeriodo("SEMESTRAL");
            }}
            className="flex-1 rounded-lg px-4 py-3 text-sm font-medium transition-colors"
            style={{
              background: periodoEfectivo === "SEMESTRAL"
                ? "color-mix(in srgb, var(--kipu-accent) 20%, transparent)"
                : "transparent",
              border: periodoEfectivo === "SEMESTRAL"
                ? "1px solid var(--kipu-accent)"
                : "1px solid var(--kipu-border)",
              color: periodoEfectivo === "SEMESTRAL"
                ? "var(--kipu-accent)"
                : "var(--kipu-muted)",
              opacity: !puedeEditarPeriodo ? 0.6 : 1,
              cursor: !puedeEditarPeriodo ? "not-allowed" : "pointer",
            }}
            onMouseEnter={e => {
              if (puedeEditarPeriodo && periodoEfectivo !== "SEMESTRAL") {
                e.currentTarget.style.borderColor = "color-mix(in srgb, var(--kipu-text) 30%, transparent)";
                e.currentTarget.style.color = "var(--kipu-text)";
              }
            }}
            onMouseLeave={e => {
              if (puedeEditarPeriodo && periodoEfectivo !== "SEMESTRAL") {
                e.currentTarget.style.borderColor = "var(--kipu-border)";
                e.currentTarget.style.color = "var(--kipu-muted)";
              }
            }}
          >
            <div className="font-semibold">Semestral</div>
            <div className="text-xs mt-0.5 opacity-70">Enero–Jun / Jul–Dic</div>
          </button>
        </div>

        {/* Feedback */}
        <div className="mt-2 min-h-[20px]">
          {guardando && (
            <div className="flex items-center gap-1.5 text-xs" style={{ color: "var(--kipu-subtle)" }}>
              <div
                className="w-3 h-3 border-2 border-t-transparent rounded-full animate-spin"
                style={{ borderColor: "currentColor", borderTopColor: "transparent" }}
              />
              Guardando...
            </div>
          )}
          {!guardando && msgPeriodo && (
            <p className="text-xs" style={{ color: "var(--kipu-subtle)" }}>{msgPeriodo}</p>
          )}
        </div>
      </div>

      {/* Activar producción */}
      {health?.listo_produccion && legal.ambiente !== 2 && (
        <div
          className="rounded-xl p-5"
          style={{
            background: "color-mix(in srgb, var(--kipu-success) 10%, transparent)",
            border: "1px solid color-mix(in srgb, var(--kipu-success) 20%, transparent)",
          }}
        >
          <div className="flex items-start gap-3">
            <AlertTriangle size={18} className="shrink-0 mt-0.5" style={{ color: "var(--kipu-success)" }} />
            <div className="flex-1">
              <h3 className="text-sm font-semibold mb-1" style={{ color: "var(--kipu-success)" }}>
                ¡Todo listo para producción!
              </h3>
              <p className="text-xs mb-3" style={{ color: "var(--kipu-success)" }}>
                Has completado todos los pasos. Activa el ambiente de producción para emitir facturas reales ante el SRI.
              </p>
              <button
                type="button"
                onClick={() => setShowProdModal(true)}
                className="px-4 py-2 rounded-lg text-black text-xs font-bold transition-colors"
                style={{ background: "var(--kipu-success)" }}
              >
                Activar producción
              </button>
              {prodMsg && <p className="mt-2 text-xs" style={{ color: "var(--kipu-success)" }}>{prodMsg}</p>}
            </div>
          </div>
        </div>
      )}

      {/* Modal activar producción con PIN */}
      {showProdModal && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div
            className="rounded-xl w-full max-w-sm p-5"
            style={{
              background: "var(--kipu-surface)",
              border: "1px solid var(--kipu-border)",
            }}
          >
            <div
              className="rounded-lg p-3 mb-4 text-xs"
              style={{
                background: "color-mix(in srgb, var(--kipu-success) 10%, transparent)",
                border: "1px solid color-mix(in srgb, var(--kipu-success) 20%, transparent)",
                color: "var(--kipu-success)",
              }}
            >
              🎉 Al activar producción podrás emitir documentos reales ante el SRI.
              Seguirás teniendo acceso al modo sandbox para pruebas.
            </div>
            <PinInput
              tipoAccion="ACTIVAR_PRODUCCION"
              email={email}
              label="activar el ambiente de producción"
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