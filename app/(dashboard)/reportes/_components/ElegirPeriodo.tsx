"use client";

// Pro mensual: elegir el periodo de la declaración del ciclo. Como el plan gratis,
// ve solo el total de cada periodo y cuántas alertas hay; el desglose y los
// casilleros del 104, al confirmar. El sugerido viene marcado (noveno dígito del
// RUC); al confirmar se abre el 104 de ese periodo. El anual y Al Día no llegan
// aquí: el backend les abre el 104 directo. El aviso de «solo lo emitido en Kipu»
// se ve antes de elegir: marcado en cada periodo y completo en el que está marcado.
// Datos: GET/POST /declaraciones/periodos-habilitados (y .../elegir).

import { useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangle, ArrowLeft, CalendarCheck, Info, Loader2 } from "lucide-react";
import api from "@/lib/api";
import { detalleError } from "@/lib/errores";
import { ES_APP_NATIVA } from "@/lib/plataforma";
import Alertas104, { type Alerta104 } from "./Alertas104";
import { montoEC } from "@/lib/dinero";
import { MESES } from "@/lib/fecha";

interface TotalPeriodo {
  iva_a_pagar:   number;
  saldo_a_favor: number;
}

/** "IVA a pagar $12,40" o "Saldo a favor $3,10" */
function textoTotal(t: TotalPeriodo) {
  return t.iva_a_pagar === 0 && t.saldo_a_favor > 0
    ? `Saldo a favor $${montoEC(t.saldo_a_favor)}`
    : `IVA a pagar $${montoEC(t.iva_a_pagar)}`;
}

interface OpcionPeriodo {
  periodo:      string;                       // 2026-10 (el semestre: su primer mes)
  nombre:       string;                       // octubre de 2026 | 2do semestre 2026
  tipo_periodo: "MENSUAL" | "SEMESTRAL";
  en_curso:     boolean;
  vencimiento:  string;                       // 2026-11-30
  habilitado:   boolean;
  total:        TotalPeriodo | null;          // solo el total (null si no se pudo calcular)
  aviso:        Alerta104 | null;             // SOLO_KIPU, si aplica a ese periodo
}

interface EstadoEleccion {
  sin_usar: number;
  opciones: OpcionPeriodo[];
  sugerido: string | null;
}

/** "2026-11-30" → "30 de noviembre" */
function diaYMes(ymd: string) {
  const [, m, d] = ymd.slice(0, 10).split("-").map(Number);
  return m && d ? `${d} de ${MESES[m - 1]}` : ymd;
}

/** Cómo se nombra en la confirmación: "octubre" o "2do semestre 2026" */
function nombreCorto(o: OpcionPeriodo) {
  if (o.tipo_periodo === "SEMESTRAL") return o.nombre;
  return MESES[Number(o.periodo.split("-")[1]) - 1] ?? o.nombre;
}

const capital = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

interface Props {
  periodoVisto:    string;                    // el que abrió (puede estar fuera de la ventana)
  periodoVistoFmt: string;                    // su nombre: "septiembre de 2026"
  totalVisto:      TotalPeriodo | null;       // su total (de /iva)
  alertasVisto:    number;                    // cuántas alertas tiene, aviso incluido (el detalle, en el 104)
  avisoVisto?:     Alerta104 | null;          // su SOLO_KIPU (de /iva)
  onElegido:       (periodo: string) => void; // lleva al 104 de ese periodo
  onVolver:        () => void;
}

export default function ElegirPeriodo({
  periodoVisto, periodoVistoFmt, totalVisto, alertasVisto, avisoVisto = null, onElegido, onVolver,
}: Props) {
  const otrasVisto = alertasVisto - (avisoVisto ? 1 : 0);   // el aviso se muestra aparte
  const [estado,           setEstado]           = useState<EstadoEleccion | null>(null);
  const [cargando,         setCargando]         = useState(true);
  const [marcado,          setMarcado]          = useState<string | null>(null);
  const [confirmando,      setConfirmando]      = useState(false);
  const [enviando,         setEnviando]         = useState(false);
  const [sinDeclaraciones, setSinDeclaraciones] = useState(false);
  const [error,            setError]            = useState("");

  useEffect(() => {
    api.get("/api/v1/app/declaraciones/periodos-habilitados")
      .then((r) => {
        const d = r.data.data as EstadoEleccion;
        setEstado(d);
        setMarcado(d.sugerido);                // el sugerido, preseleccionado
        setSinDeclaraciones(d.sin_usar === 0);
      })
      .catch((e) => setError(detalleError(e, "No se pudieron cargar tus declaraciones.")))
      .finally(() => setCargando(false));
  }, []);

  const opcion = estado?.opciones.find((o) => o.periodo === marcado && !o.habilitado) ?? null;
  const fueraDeVentana = !!estado && !estado.opciones.some((o) => o.periodo === periodoVisto);

  const usar = async () => {
    if (!opcion) return;
    setEnviando(true);
    setError("");
    try {
      await api.post("/api/v1/app/declaraciones/periodos-habilitados/elegir",
                     { periodo: opcion.periodo, confirmar: true });
      onElegido(opcion.periodo);
    } catch (e) {
      const status = (e as { response?: { status?: number } })?.response?.status;
      if (status === 409) { onElegido(opcion.periodo); return; }   // ya estaba habilitado: se abre
      if (status === 402) setSinDeclaraciones(true);
      else setError(detalleError(e, "No se pudo usar la declaración. Intenta de nuevo."));
      setConfirmando(false);
      setEnviando(false);
    }
  };

  const volver = (
    <button
      type="button"
      onClick={onVolver}
      className="hidden items-center gap-1.5 text-xs transition-colors hover:underline lg:flex text-sutil"
    >
      <ArrowLeft size={14} /> Volver a reportes
    </button>
  );

  if (cargando) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 size={22} className="animate-spin text-acento" />
      </div>
    );
  }

  // Sin declaraciones en este ciclo (402). En la app, sin enlace ni precios (reglas de las tiendas)
  if (sinDeclaraciones) {
    return (
      <div className="p-4 md:p-6 max-w-2xl mx-auto space-y-5">
        {volver}
        <div className="rounded-2xl p-5 text-center space-y-2 bg-superficie border border-borde">
          <CalendarCheck size={22} className="mx-auto text-sutil" />
          {ES_APP_NATIVA ? (
            <p className="text-sm text-texto">
              No tienes declaraciones disponibles en este ciclo.
            </p>
          ) : (
            <>
              <p className="text-sm font-semibold text-texto">
                Ya usaste la declaración de este ciclo.
              </p>
              <p className="text-sm text-sutil">
                Con tu próxima renovación tendrás otra. Si quieres todos los meses, mira los planes.
              </p>
              <Link href="/planes" className="inline-block text-sm font-semibold hover:underline text-acento">
                Ver planes
              </Link>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto space-y-5">
      {volver}

      <div className="rounded-2xl p-5 space-y-4 bg-superficie border border-borde">
        <div className="text-center space-y-1.5">
          <CalendarCheck size={22} className="mx-auto text-acento" />
          <h1 className="text-lg font-bold text-texto">
            ¿Para qué periodo usas la declaración de este ciclo?
          </h1>
          <p className="text-sm text-sutil">
            Tu plan incluye una declaración por ciclo. Elige el periodo y verás su formulario 104 completo.
          </p>
          {(estado?.sin_usar ?? 0) > 1 && (
            <p className="text-sm font-semibold text-acento">
              Te quedan {estado!.sin_usar} declaraciones
            </p>
          )}
        </div>

        {fueraDeVentana && (
          <p className="text-xs rounded-lg px-3 py-2 bg-texto/5 text-sutil">
            {capital(periodoVistoFmt)}{totalVisto ? ` (${textoTotal(totalVisto)})` : ""} ya no se puede
            elegir: la declaración es para el último periodo cerrado o el que está en curso.
          </p>
        )}

        {/* El que abrió, si no está entre las opciones (las opciones traen el suyo) */}
        {fueraDeVentana && avisoVisto && <Alertas104 alertas={[avisoVisto]} encabezado={false} />}

        {otrasVisto > 0 && (
          <div className="rounded-lg px-3 py-2 flex items-start gap-2 bg-alerta/10 border border-alerta/30">
            <AlertTriangle size={14} className="shrink-0 mt-0.5 text-alerta" />
            <p className="text-xs text-texto">
              Encontramos {otrasVisto === 1 ? "1 alerta" : `${otrasVisto} alertas`} en {periodoVistoFmt}:
              las verás con el formulario 104 completo.
            </p>
          </div>
        )}

        <div role="radiogroup" aria-label="Periodo" className="space-y-2">
          {estado?.opciones.map((o) => {
            const activo = marcado === o.periodo && !o.habilitado;
            return (
              <button
                key={o.periodo}
                type="button"
                role="radio"
                aria-checked={activo}
                onClick={() => (o.habilitado ? onElegido(o.periodo) : setMarcado(o.periodo))}
                className="w-full text-left rounded-xl px-4 py-3 flex items-center justify-between gap-3 transition-colors"
                style={{
                  border: activo ? "2px solid var(--kipu-accent)" : "1px solid var(--kipu-border)",
                  background: activo ? "color-mix(in srgb, var(--kipu-accent) 8%, transparent)" : "transparent",
                }}
              >
                <span>
                  <span className="block text-sm font-semibold text-texto">
                    {capital(o.nombre)}
                  </span>
                  <span className="block text-xs text-sutil">
                    {o.en_curso ? "En curso · " : ""}vence el {diaYMes(o.vencimiento)}
                  </span>
                  {o.total && (
                    <span className="block text-xs font-medium tabular-nums mt-0.5 text-texto">
                      {textoTotal(o.total)}{o.en_curso ? " hasta hoy" : ""}
                    </span>
                  )}
                  {o.aviso && (
                    <span className="flex items-center gap-1 text-xs mt-0.5 text-alerta">
                      <Info size={12} className="shrink-0" /> {o.aviso.titulo}
                    </span>
                  )}
                </span>
                {o.habilitado ? (
                  <span className="text-xs font-semibold shrink-0 text-exito">
                    Ya habilitado · Abrir
                  </span>
                ) : o.periodo === estado.sugerido ? (
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full text-white shrink-0 bg-acento">
                    Sugerido
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>

        {/* El aviso completo del periodo marcado, antes de usar la declaración */}
        {opcion?.aviso && <Alertas104 alertas={[opcion.aviso]} encabezado={false} />}

        {error && <p className="text-xs text-center text-peligro">{error}</p>}

        <button
          type="button"
          disabled={!opcion}
          onClick={() => setConfirmando(true)}
          className="w-full py-2.5 rounded-lg text-sm font-semibold text-white transition-opacity hover:opacity-90 active:scale-[0.98] disabled:opacity-50 bg-acento"
        >
          {opcion ? `Usar para ${nombreCorto(opcion)}` : "Elige un periodo"}
        </button>
      </div>

      {/* Confirmación: una vez elegido no se cambia */}
      {confirmando && opcion && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4"
             role="dialog" aria-modal="true" aria-labelledby="confirmar-periodo">
          <div className="rounded-xl w-full max-w-sm p-5 space-y-4 bg-superficie border border-borde">
            <p id="confirmar-periodo" className="text-sm text-texto">
              Vas a usar la declaración de este ciclo para {nombreCorto(opcion).toUpperCase()}. No podrás
              cambiarla hasta tu próxima renovación.
            </p>
            <div className="flex gap-2 justify-end">
              <button
                type="button"
                disabled={enviando}
                onClick={() => setConfirmando(false)}
                className="px-4 py-2 rounded-lg text-sm transition-colors disabled:opacity-50 border border-borde text-texto"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={enviando}
                onClick={usar}
                className="px-4 py-2 rounded-lg text-sm font-semibold text-white flex items-center gap-2 transition-opacity hover:opacity-90 disabled:opacity-60 bg-acento"
              >
                {enviando && <Loader2 size={14} className="animate-spin" />}
                Sí, usar para {nombreCorto(opcion)}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
