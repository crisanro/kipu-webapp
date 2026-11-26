"use client";
// % a retener de una línea de retención (pieza B de retenciones): cerrado por
// defecto, con salida controlada.
//   - Un solo % permitido: fijo.
//   - Varios: lista con los que permite el Catálogo ATS (el sugerido ya elegido;
//     un código sin sugerido obliga a elegir).
//   - "Usar otro porcentaje" (solo renta): se escribe el % y se pide el motivo
//     (MotivoOtroPorcentaje, debajo de la línea). El backend lo registra en
//     retencion_overrides; no se rechaza.
//   - Convenio de doble tributación: % libre, sin motivo (lo pone el backend).
import { AlertTriangle } from "lucide-react";
import { Campo, Entrada, Selector } from "@/components/ui/Campo";
import { InputDecimal } from "../../components/HojaItem";

export const MOTIVO_MINIMO = 10;

const CLASE_VALOR =
  "h-9 w-full rounded-lg border border-borde bg-superficie px-3 text-sm tabular-nums text-texto tactil:h-11 tactil:text-base " +
  "placeholder:text-sutil focus:border-acento focus:outline-none";

const pctTexto = (p: number) => `${String(p).replace(".", ",")}%`;

function Fijo({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-9 items-center rounded-lg border border-borde bg-presionado px-3 text-sm tabular-nums text-tenue tactil:h-11 tactil:text-base">
      {children}
    </div>
  );
}

export default function PorcentajeRetencion({
  id, permitidos, valor, libre, permiteOtro, otro, onPct, onOtro,
}: {
  id:          string;
  permitidos:  number[];        // los del catálogo para el código elegido
  valor:       number | null;   // null = todavía sin elegir
  libre:       boolean;         // convenio de doble tributación: se escribe
  permiteOtro: boolean;         // solo renta
  otro:        boolean;         // eligió "Usar otro porcentaje"
  onPct:       (v: number | null) => void;
  onOtro:      (activo: boolean) => void;
}) {
  const escribe = libre || otro;
  return (
    <Campo etiqueta="% a retener" id={id} ayuda={libre ? "Según la tarifa del convenio." : undefined}>
      <div className="space-y-1">
        {escribe ? (
          <InputDecimal id={id} value={valor ?? 0} onChange={v => onPct(Math.min(100, v))} className={CLASE_VALOR} />
        ) : permitidos.length > 1 ? (
          <Selector id={id} value={valor === null ? "" : String(valor)}
                    onChange={e => onPct(e.target.value === "" ? null : Number(e.target.value))}>
            {valor === null && <option value="">Elige el %</option>}
            {permitidos.map(p => <option key={p} value={String(p)}>{pctTexto(p)}</option>)}
          </Selector>
        ) : (
          <Fijo>{valor === null ? "—" : pctTexto(valor)}</Fijo>
        )}
        {permiteOtro && !libre && (
          <button type="button" onClick={() => onOtro(!otro)}
                  className="text-xs text-acento underline underline-offset-2">
            {otro ? "Volver a los del catálogo" : "Usar otro porcentaje"}
          </button>
        )}
      </div>
    </Campo>
  );
}

/** Debajo de la línea, con "Usar otro porcentaje": la advertencia y el motivo obligatorio. */
export function MotivoOtroPorcentaje({ id, codigo, permitidos, motivo, onMotivo }: {
  id: string; codigo: string; permitidos: number[]; motivo: string; onMotivo: (m: string) => void;
}) {
  const corto = motivo.trim().length < MOTIVO_MINIMO;
  return (
    <div className="space-y-2 rounded-lg border border-alerta/40 bg-alerta-suave p-3">
      <p className="flex gap-2 text-xs text-alerta-texto">
        <AlertTriangle size={14} className="mt-0.5 shrink-0" aria-hidden />
        <span>
          El Catálogo ATS permite para el código {codigo}{" "}
          {permitidos.length ? permitidos.map(pctTexto).join(", ") : "otros porcentajes"}. Usa otro solo si tienes
          el respaldo (una resolución o un certificado): queda registrado con tu motivo.
        </span>
      </p>
      <Campo etiqueta="Motivo" id={id}
             error={motivo && corto ? `Escribe al menos ${MOTIVO_MINIMO} caracteres.` : null}>
        <Entrada id={id} value={motivo} maxLength={300} onChange={e => onMotivo(e.target.value)}
                 placeholder="Ej.: certificado de residencia fiscal del proveedor" />
      </Campo>
    </div>
  );
}
