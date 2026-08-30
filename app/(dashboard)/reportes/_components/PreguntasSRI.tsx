// app/(dashboard)/reportes/_components/PreguntasSRI.tsx
"use client";
import { CheckCircle2, XCircle, AlertTriangle } from "lucide-react";
import { clsx } from "clsx";

interface Preguntas {
  requiere_informar?:        boolean;
  credito_tributario_renta?: boolean;
  comercio_exterior?:        boolean;
  notas_credito?:            boolean;
  tarifa_turismo?:           boolean;
  ha_realizado_ventas?:      boolean;
  ventas_tarifa_0?:          boolean;
  ventas_activos_fijos?:     boolean;
  ventas_tarifa_nz?:         boolean;
  ha_realizado_compras?:     boolean;
  importaciones?:            boolean;
  compras_activos_fijos?:    boolean;
  ha_realizado_retenciones?: boolean;
  materiales_construccion?:  boolean;
  // Renta
  tiene_ingresos?:           boolean;
  tiene_gastos_deducibles?:  boolean;
  tiene_retenciones?:        boolean;
  debe_pagar?:               boolean;
  tiene_saldo_favor?:        boolean;
  supera_fraccion_basica?:   boolean;
  // ATS
  tiene_ventas?:                   boolean;
  tiene_compras?:                  boolean;
  tiene_retenciones_emitidas?:     boolean;
  tiene_retenciones_recibidas?:    boolean;
  obligado_contabilidad?:          boolean;
  [key: string]: boolean | undefined;
}

interface Props {
  preguntas: Preguntas;
  tipo:      "IVA" | "RENTA" | "ATS";
}

const LABELS_IVA: Record<string, string> = {
  requiere_informar:        "¿Requiere informar valores en su declaración?",
  credito_tributario_renta: "¿Tiene crédito tributario de IVA para renta?",
  comercio_exterior:        "¿Realizó transacciones de comercio exterior o activos fijos?",
  notas_credito:            "¿Emitió y/o recibió notas de crédito?",
  tarifa_turismo:           "¿Realizó ventas con IVA tarifa diferenciada (turismo)?",
  ha_realizado_ventas:      "¿Ha realizado ventas en este período?",
  ventas_tarifa_0:          "¿Realizó ventas con tarifa 0% o exentas?",
  ventas_activos_fijos:     "¿Ha realizado ventas de activos fijos?",
  ventas_tarifa_nz:         "¿Realizó ventas con IVA tarifa diferente de 0%?",
  ha_realizado_compras:     "¿Ha realizado compras en este período?",
  importaciones:            "¿Ha realizado importaciones?",
  compras_activos_fijos:    "¿Ha realizado compras de activos fijos?",
  ha_realizado_retenciones: "¿Ha realizado retenciones en este período?",
  materiales_construccion:  "¿Realiza operaciones de materiales de construcción?",
};

const LABELS_RENTA: Record<string, string> = {
  tiene_ingresos:          "¿Tuvo ingresos gravados en el año?",
  tiene_gastos_deducibles: "¿Tuvo gastos deducibles?",
  tiene_retenciones:       "¿Le realizaron retenciones en la fuente?",
  supera_fraccion_basica:  "¿Su base imponible supera la fracción básica?",
  debe_pagar:              "¿Debe pagar impuesto a la renta?",
  tiene_saldo_favor:       "¿Tiene saldo a favor?",
};

const LABELS_ATS: Record<string, string> = {
  tiene_ventas:                  "¿Realizó ventas en el período?",
  tiene_compras:                 "¿Realizó compras en el período?",
  tiene_retenciones_emitidas:    "¿Emitió comprobantes de retención?",
  tiene_retenciones_recibidas:   "¿Le realizaron retenciones?",
  obligado_contabilidad:         "¿Es obligado a llevar contabilidad?",
};

const LABELS: Record<string, Record<string, string>> = {
  IVA:   LABELS_IVA,
  RENTA: LABELS_RENTA,
  ATS:   LABELS_ATS,
};

// Preguntas que requieren acción manual si son true
const REQUIERE_MANUAL: Record<string, string> = {
  comercio_exterior:     "Completa los casilleros de activos fijos e importaciones manualmente.",
  ventas_activos_fijos:  "Completa los casilleros 402/412/422 manualmente.",
  compras_activos_fijos: "Completa los casilleros 501/511/521 manualmente.",
  importaciones:         "Completa los casilleros 504/514/524 manualmente.",
  materiales_construccion: "Consulta con tu contador para el tratamiento correcto.",
};

export default function PreguntasSRI({ preguntas, tipo }: Props) {
  const labels  = LABELS[tipo] ?? LABELS_IVA;
  const entries = Object.entries(labels);

  const conAdvertencia = entries.filter(([k]) =>
    preguntas[k] === true && REQUIERE_MANUAL[k]
  );

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-800 flex items-center gap-2">
        <span className="text-sm font-semibold text-white">
          Preguntas previas SRI
        </span>
        <span className="text-xs text-gray-500">
          — respondidas automáticamente con tus documentos
        </span>
      </div>

      {/* Lista */}
      <div className="divide-y divide-gray-800/60">
        {entries.map(([key, label]) => {
          const valor = preguntas[key];
          if (valor === undefined) return null;

          return (
            <div key={key} className="flex items-start gap-3 px-4 py-2.5">
              {valor
                ? <CheckCircle2 size={15} className="text-emerald-400 shrink-0 mt-0.5" />
                : <XCircle     size={15} className="text-gray-600    shrink-0 mt-0.5" />
              }
              <div className="flex-1 min-w-0">
                <p className={clsx(
                  "text-xs",
                  valor ? "text-white" : "text-gray-500"
                )}>
                  {label}
                </p>
                {valor && REQUIERE_MANUAL[key] && (
                  <p className="text-[10px] text-amber-400 mt-0.5 flex items-center gap-1">
                    <AlertTriangle size={10} />
                    {REQUIERE_MANUAL[key]}
                  </p>
                )}
              </div>
              <span className={clsx(
                "text-xs font-bold shrink-0",
                valor ? "text-emerald-400" : "text-gray-600"
              )}>
                {valor ? "SÍ" : "NO"}
              </span>
            </div>
          );
        })}
      </div>

      {/* Advertencias */}
      {conAdvertencia.length > 0 && (
        <div className="px-4 py-3 border-t border-amber-500/20 bg-amber-500/5">
          <p className="text-xs font-semibold text-amber-400 mb-1 flex items-center gap-1.5">
            <AlertTriangle size={12} />
            Campos que requieren tu atención manual
          </p>
          <p className="text-xs text-amber-400/70">
            Algunos casilleros no se pueden calcular automáticamente.
            Revísalos antes de declarar en el portal del SRI.
          </p>
        </div>
      )}
    </div>
  );
}
