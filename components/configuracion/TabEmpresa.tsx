// components/configuracion/TabEmpresa.tsx
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
  const email = useAuthStore((s) => s.email) ?? "";

  if (!legal) return null;

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

      {/* Activar producción — solo si checklist completo y aún en pruebas */}
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
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 mb-4">
              <p className="text-xs text-red-300">
                ⚠️ Esta acción es <strong>irreversible</strong>. Las facturas de prueba serán eliminadas.
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