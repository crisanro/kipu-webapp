"use client";
import { useState, useEffect } from "react";
import { AlertTriangle, CheckCircle2, TrendingDown, TrendingUp, Info, Save } from "lucide-react";
import { clsx } from "clsx";

interface CampoManual {
  casillero:   string;
  descripcion: string;
}
interface CasillerosResumen {
  "499"?: number;
  "564"?: number;
  "601"?: number;
  "602"?: number;
  "609"?: number;
  "620"?: number;
  "699"?: number;
  "799"?: number;
  "801"?: number;
  "859"?: number;
  "501"?: number;
  "503"?: number;
  "601r"?: number;
  "699r"?: number;
  "801r"?: number;
  "841"?: number;
  "859r"?: number;
  "869"?: number;
  [key: string]: number | undefined;
}
interface ResultadoRenta {
  impuesto_causado: number;
  retenciones:      number;
  a_pagar:          number;
  saldo_favor:      number;
}
interface Props {
  tipo:                    "IVA" | "RENTA" | "ATS";
  casilleros:              CasillerosResumen;
  camposManuales?:         CampoManual[];
  resultado?:              ResultadoRenta;
  onCampoManual?:          (casillero: string, valor: number) => void;
  valoresGuardados?:       Record<string, number>;
  onGuardar?:              (valores: Record<string, number>) => Promise<void>;
}

const fmt = (n: number = 0) =>
  n.toLocaleString("es-EC", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function FilaCasillero({
  num, label, value = 0, highlight = false, resta = false, subtotal = false, grande = false,
  rojo = false, verde = false,
}: {
  num:        string;
  label:      string;
  value?:     number;
  highlight?: boolean;
  resta?:     boolean;
  subtotal?:  boolean;
  grande?:    boolean;
  rojo?:      boolean;
  verde?:     boolean;
}) {
  return (
    <div className={clsx(
      "flex items-center justify-between gap-3 rounded-lg px-4",
      grande    ? "py-4" : "py-2.5",
      highlight ? "bg-indigo-600/15 border border-indigo-500/30" :
      rojo      ? "bg-red-500/5 border border-red-500/10" :
      verde     ? "bg-emerald-500/5 border border-emerald-500/10" :
      subtotal  ? "bg-gray-800/60" : "hover:bg-gray-800/30"
    )}>
      <div className="flex items-center gap-3 min-w-0">
        <span className={clsx(
          "text-[10px] font-bold px-2 py-0.5 rounded shrink-0",
          grande    ? "text-sm px-3 py-1" : "",
          highlight ? "bg-indigo-600 text-white" :
          rojo      ? "bg-red-500/20 text-red-400" :
          verde     ? "bg-emerald-500/20 text-emerald-400" :
          subtotal  ? "bg-gray-700 text-gray-300" : "bg-gray-800 text-gray-400"
        )}>
          {num}
        </span>
        <span className={clsx(
          "text-xs truncate",
          grande    ? "text-base font-semibold" : "",
          highlight ? "text-white font-semibold" :
          rojo      ? "text-red-300 font-medium" :
          verde     ? "text-emerald-300 font-medium" :
          subtotal  ? "text-gray-300 font-medium" : "text-gray-400"
        )}>
          {resta && value > 0 ? "(−) " : ""}{label}
        </span>
      </div>
      <span className={clsx(
        "font-bold shrink-0 tabular-nums",
        grande    ? "text-2xl" : "text-sm",
        highlight ? "text-indigo-400" :
        rojo      ? "text-red-400" :
        verde     ? "text-emerald-400" :
        resta     ? "text-red-400" :
        value === 0 ? "text-gray-600" : "text-white"
      )}>
        {resta && value > 0 ? "-" : ""}${fmt(value)}
      </span>
    </div>
  );
}

function InputManual({
  campo,
  value,
  onChange,
}: {
  campo:    CampoManual;
  value:    string;
  onChange: (casillero: string, val: string) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 px-4 py-2 rounded-lg bg-amber-500/5 border border-amber-500/20">
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 shrink-0">
          {campo.casillero}
        </span>
        <span className="text-xs text-amber-300 truncate">{campo.descripcion}</span>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <span className="text-xs text-amber-400">$</span>
        <input
          type="number"
          step="0.01"
          min="0"
          value={value}
          onChange={e => onChange(campo.casillero, e.target.value)}
          placeholder="0.00"
          className="w-24 px-2 py-1 rounded bg-gray-800 border border-amber-500/30 text-white text-xs text-right focus:outline-none focus:border-amber-400 tabular-nums"
        />
      </div>
    </div>
  );
}

export default function ResumenImpositivo({
  tipo, casilleros, camposManuales, resultado, onCampoManual,
  valoresGuardados = {}, onGuardar,
}: Props) {
  const [manuales, setManuales] = useState<Record<string, string>>({});
  const [guardando, setGuardando] = useState(false);
  const [guardado,  setGuardado]  = useState(false);
  const [dirty,     setDirty]     = useState(false);

  useEffect(() => {
    if (dirty) return;
    const init: Record<string, string> = {};
    for (const [k, v] of Object.entries(valoresGuardados)) {
      if (v !== undefined && v !== 0) init[k] = String(v);
    }
    setManuales(init);
  }, [valoresGuardados, dirty]);

  const handleManual = (casillero: string, val: string) => {
    setManuales(prev => ({ ...prev, [casillero]: val }));
    setDirty(true);
    setGuardado(false);
    const num = parseFloat(val) || 0;
    onCampoManual?.(casillero, num);
  };

  const ejecutarGuardado = async () => {
    if (!onGuardar) return;
    setGuardando(true);
    try {
      const numericos: Record<string, number> = {};
      for (const [k, v] of Object.entries(manuales)) {
        numericos[k] = parseFloat(v) || 0;
      }
      await onGuardar(numericos);
      setGuardado(true);
      setDirty(false);
    } catch (e) {
      console.error("Error guardando campos manuales:", e);
    } finally {
      setGuardando(false);
    }
  };

  const c605 = parseFloat(manuales["605"] || "0") || 0;
  const c606 = parseFloat(manuales["606"] || "0") || 0;
  const c564 = casilleros["564"] ?? 0;
  const c499 = casilleros["499"] ?? 0;

  const ivaAPagar = tipo === "IVA"
    ? Math.max(c499 - c564 - (casilleros["609"] ?? 0) - c605 - c606, 0)
    : 0;
  const saldoFavor = tipo === "IVA"
    ? Math.max(c564 + (casilleros["609"] ?? 0) + c605 + c606 - c499, 0)
    : 0;
  const tieneAPagar = tipo === "IVA" ? ivaAPagar > 0  : (resultado?.a_pagar ?? 0) > 0;
  const tieneSaldo  = tipo === "IVA" ? saldoFavor > 0 : (resultado?.saldo_favor ?? 0) > 0;

  return (
    <div className="space-y-4">
      {tipo === "IVA" && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-800 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-white">Resumen impositivo</p>
              <p className="text-xs text-gray-500">Liquidación del IVA en el período</p>
            </div>
            {onGuardar && (
              <div className="flex items-center gap-3">
                {dirty && (
                  <span className="text-xs text-amber-400 font-medium">Sin guardar</span>
                )}
                <button
                  type="button"
                  onClick={ejecutarGuardado}
                  disabled={guardando || (!dirty && guardado)}
                  className={clsx(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors shadow-sm",
                    dirty
                      ? "bg-amber-600 hover:bg-amber-500 text-white"
                      : guardado
                        ? "bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 cursor-default"
                        : "bg-gray-800 hover:bg-gray-700 text-gray-300"
                  )}
                >
                  <Save size={13} />
                  {guardando ? "Guardando..." : guardado && !dirty ? "Guardado" : "Guardar cambios"}
                </button>
              </div>
            )}
          </div>
          <div className="p-4 space-y-1">
            <FilaCasillero num="499" label="Total IVA generado (ventas)"  value={casilleros["499"]} rojo />
            <FilaCasillero num="564" label="Crédito tributario (compras)" value={casilleros["564"]} verde resta />
            <FilaCasillero num="609" label="Retenciones IVA recibidas"    value={casilleros["609"]} verde resta />
            {(camposManuales ?? []).filter(c => ["605","606"].includes(c.casillero)).map(campo => (
              <InputManual
                key={campo.casillero}
                campo={campo}
                value={manuales[campo.casillero] ?? ""}
                onChange={handleManual}
              />
            ))}
            <div className="border-t border-gray-800 my-2" />
            <FilaCasillero num="859" label="Total consolidado IVA" value={casilleros["859"]} subtotal />
          </div>
        </div>
      )}

      {tipo === "RENTA" && resultado && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-800 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-white">Resumen impositivo</p>
              <p className="text-xs text-gray-500">Liquidación del Impuesto a la Renta</p>
            </div>
            {onGuardar && (
              <div className="flex items-center gap-3">
                {dirty && (
                  <span className="text-xs text-amber-400 font-medium">Sin guardar</span>
                )}
                <button
                  type="button"
                  onClick={ejecutarGuardado}
                  disabled={guardando || (!dirty && guardado)}
                  className={clsx(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors shadow-sm",
                    dirty
                      ? "bg-amber-600 hover:bg-amber-500 text-white"
                      : guardado
                        ? "bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 cursor-default"
                        : "bg-gray-800 hover:bg-gray-700 text-gray-300"
                  )}
                >
                  <Save size={13} />
                  {guardando ? "Guardando..." : guardado && !dirty ? "Guardado" : "Guardar cambios"}
                </button>
              </div>
            )}
          </div>
          <div className="p-4 space-y-1">
            <FilaCasillero num="699" label="Base imponible"            value={casilleros["699"]} />
            <FilaCasillero num="801" label="Impuesto causado"          value={resultado.impuesto_causado} />
            <FilaCasillero num="841" label="Retenciones en la fuente"  value={resultado.retenciones} verde resta />
            {(camposManuales ?? []).map(campo => (
              <InputManual
                key={campo.casillero}
                campo={campo}
                value={manuales[campo.casillero] ?? ""}
                onChange={handleManual}
              />
            ))}
            <div className="border-t border-gray-800 my-2" />
            <FilaCasillero num="859" label="Impuesto a pagar" value={resultado.a_pagar}    subtotal />
            <FilaCasillero num="869" label="Saldo a favor"    value={resultado.saldo_favor} subtotal />
          </div>
        </div>
      )}

      {tipo !== "ATS" && (
        <div className={clsx(
          "rounded-2xl p-5 border",
          tieneAPagar
            ? "bg-red-500/10 border-red-500/30"
            : tieneSaldo
              ? "bg-emerald-500/10 border-emerald-500/30"
              : "bg-gray-800/60 border-gray-700"
        )}>
          <div className="flex items-center justify-between gap-4">
            <div>
              {tieneAPagar ? (
                <>
                  <div className="flex items-center gap-2 mb-1">
                    <TrendingUp size={16} className="text-red-400" />
                    <p className="text-sm font-semibold text-red-300">Impuesto a pagar</p>
                  </div>
                  <p className="text-xs text-red-400/70">
                    Declara y paga antes del vencimiento para evitar multas e intereses.
                  </p>
                </>
              ) : tieneSaldo ? (
                <>
                  <div className="flex items-center gap-2 mb-1">
                    <TrendingDown size={16} className="text-emerald-400" />
                    <p className="text-sm font-semibold text-emerald-300">Saldo a favor</p>
                  </div>
                  <p className="text-xs text-emerald-400/70">
                    Puedes usar este saldo como crédito tributario el próximo mes.
                  </p>
                </>
              ) : (
                <>
                  <div className="flex items-center gap-2 mb-1">
                    <CheckCircle2 size={16} className="text-gray-400" />
                    <p className="text-sm font-semibold text-gray-300">Sin impuesto a pagar</p>
                  </div>
                  <p className="text-xs text-gray-500">
                    El crédito tributario cubre el IVA generado.
                  </p>
                </>
              )}
            </div>
            <p className={clsx(
              "text-3xl font-bold shrink-0",
              tieneAPagar ? "text-red-400" : tieneSaldo ? "text-emerald-400" : "text-gray-400"
            )}>
              ${fmt(tipo === "IVA"
                ? (tieneAPagar ? ivaAPagar : saldoFavor)
                : (tieneAPagar ? resultado?.a_pagar ?? 0 : resultado?.saldo_favor ?? 0)
              )}
            </p>
          </div>
        </div>
      )}

      {(camposManuales ?? []).filter(c => !["605","606"].includes(c.casillero)).length > 0 && (
        <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-4">
          <div className="flex items-start gap-2 mb-3">
            <AlertTriangle size={14} className="text-amber-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-semibold text-amber-300">
                Campos que debes completar manualmente en el SRI
              </p>
              <p className="text-[10px] text-amber-400/70 mt-0.5">
                No podemos calcularlos automáticamente — requieren información adicional.
              </p>
            </div>
          </div>
          <div className="space-y-2">
            {(camposManuales ?? [])
              .filter(c => !["605","606"].includes(c.casillero))
              .map(campo => (
                <div key={campo.casillero} className="flex items-center gap-3">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 shrink-0">
                    {campo.casillero}
                  </span>
                  <span className="text-xs text-amber-300/80">{campo.descripcion}</span>
                </div>
              ))
            }
          </div>
        </div>
      )}

      {tipo === "ATS" && (
        <div className="bg-blue-500/5 border border-blue-500/20 rounded-xl p-4">
          <div className="flex items-start gap-2">
            <Info size={14} className="text-blue-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-semibold text-blue-300">Sobre el ATS</p>
              <p className="text-xs text-blue-400/70 mt-1">
                El Anexo Transaccional Simplificado debe presentarse mensualmente en el portal del SRI.
                Descarga el archivo XML generado y súbelo directamente al sistema del SRI en Línea.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}