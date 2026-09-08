"use client";
import { useState } from "react";
import { AlertTriangle, Loader2 } from "lucide-react";
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
  const esObligado        = legal.obligado_contabilidad === "SI";
  const periodoEfectivo   = esObligado ? "MENSUAL" : periodoIva;
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
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
        <h2 className="text-sm font-semibold text-white mb-4">Datos fiscales</h2>
        <div className="space-y-3">
          {[
            { label: "RUC",                   value: legal.ruc },
            { label: "Razón Social",          value: legal.razon_social },
            { label: "Nombre Comercial",      value: legal.nombre_comercial || "—" },
            { label: "Dirección Matriz",      value: legal.direccion_matriz },
            { label: "Obligado Contabilidad", value: legal.obligado_contabilidad },
            { label: "Contrib. Especial",     value: legal.contribuyente_especial || "—" },
            { label: "Ambiente",              value: legal.ambiente === 2 ? "🟢 Producción" : "🟡 Pruebas" },
          ].map(({ label, value }) => (
            <div key={label} className="flex justify-between text-sm border-b border-gray-800 pb-2 last:border-0 last:pb-0">
              <span className="text-gray-500">{label}</span>
              <span className="text-white font-medium text-right max-w-[60%]">{value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Período de declaración IVA */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
        <h2 className="text-sm font-semibold text-white mb-1">Período de declaración IVA</h2>
        <p className="text-xs text-gray-500 mb-4">
          {esObligado
            ? "Los obligados a llevar contabilidad declaran mensualmente."
            : "Selecciona tu período según lo indicado en tu RUC en el SRI."}
        </p>

        <div className="flex gap-3">
          {/* Mensual */}
          <button
            disabled={!puedeEditarPeriodo || guardando}
            onClick={() => {
              setPeriodoIva("MENSUAL");
              guardarPeriodo("MENSUAL");
            }}
            className={`flex-1 rounded-lg border px-4 py-3 text-sm font-medium transition-colors
              ${periodoEfectivo === "MENSUAL"
                ? "bg-indigo-600/20 border-indigo-500 text-indigo-300"
                : "border-gray-700 text-gray-400 hover:border-gray-600 hover:text-white"}
              ${!puedeEditarPeriodo ? "opacity-60 cursor-not-allowed" : "cursor-pointer"}
            `}
          >
            <div className="font-semibold">Mensual</div>
            <div className="text-xs mt-0.5 opacity-70">Declara cada mes</div>
          </button>

          {/* Semestral */}
          <button
            disabled={!puedeEditarPeriodo || guardando}
            onClick={() => {
              setPeriodoIva("SEMESTRAL");
              guardarPeriodo("SEMESTRAL");
            }}
            className={`flex-1 rounded-lg border px-4 py-3 text-sm font-medium transition-colors
              ${periodoEfectivo === "SEMESTRAL"
                ? "bg-indigo-600/20 border-indigo-500 text-indigo-300"
                : "border-gray-700 text-gray-400 hover:border-gray-600 hover:text-white"}
              ${!puedeEditarPeriodo ? "opacity-60 cursor-not-allowed" : "cursor-pointer"}
            `}
          >
            <div className="font-semibold">Semestral</div>
            <div className="text-xs mt-0.5 opacity-70">Enero–Jun / Jul–Dic</div>
          </button>
        </div>

        {/* Feedback */}
        <div className="mt-2 min-h-[20px]">
          {guardando && (
            <div className="flex items-center gap-1.5 text-xs text-gray-400">
              <Loader2 size={12} className="animate-spin" />
              Guardando...
            </div>
          )}
          {!guardando && msgPeriodo && (
            <p className="text-xs text-gray-400">{msgPeriodo}</p>
          )}
        </div>
      </div>

      {/* Activar producción */}
      {health?.listo_produccion && legal.ambiente !== 2 && (
        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-5">
          <div className="flex items-start gap-3">
            <AlertTriangle size={18} className="text-emerald-400 shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-emerald-300 mb-1">
                ¡Todo listo para producción!
              </h3>
              <p className="text-xs text-emerald-400/80 mb-3">
                Has completado todos los pasos. Activa el ambiente de producción para emitir facturas reales ante el SRI.
              </p>
              <button
                onClick={() => setShowProdModal(true)}
                className="px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-bold transition-colors"
              >
                Activar producción
              </button>
              {prodMsg && <p className="mt-2 text-xs text-emerald-400">{prodMsg}</p>}
            </div>
          </div>
        </div>
      )}

      {/* Modal activar producción con PIN */}
      {showProdModal && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-xl w-full max-w-sm p-5">
            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-3 mb-4">
              <p className="text-xs text-emerald-300">
                🎉 Al activar producción podrás emitir documentos reales ante el SRI.
                Seguirás teniendo acceso al modo sandbox para pruebas.
              </p>
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