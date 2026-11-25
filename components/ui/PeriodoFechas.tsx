// components/ui/PeriodoFechas.tsx
// El período de un listado: un chip ("Noviembre 2026 ▾") que abre una hoja con
// atajos (Hoy, 7 días, Este mes, Mes anterior, Este año) y un rango personalizado.
// Reemplaza los dos campos de fecha + "Buscar", que no cabían en el celular.
// Fechas AAAA-MM-DD en hora de Ecuador; máximo 365 días (lo pide el backend).
//
//   <PeriodoFechas inicio={fi} fin={ff} onCambio={(i, f) => { setFi(i); setFf(f); }} />

"use client";

import { useState } from "react";
import { CalendarDays, ChevronDown } from "lucide-react";
import { hoyEC } from "@/lib/fecha";
import Hoja from "./Hoja";
import Boton from "./Boton";
import { Campo, Entrada } from "./Campo";
import { cn } from "./cn";

const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio",
               "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
const MAXIMO_DIAS = 365;

// ── Fechas como texto AAAA-MM-DD (sin husos horarios de por medio) ────────────
const partes = (f: string) => f.split("-").map(Number) as [number, number, number];
const aTexto = (d: Date) => d.toISOString().slice(0, 10);
const comoUTC = (f: string) => { const [a, m, d] = partes(f); return new Date(Date.UTC(a, m - 1, d)); };
const sumarDias = (f: string, n: number) => { const d = comoUTC(f); d.setUTCDate(d.getUTCDate() + n); return aTexto(d); };
const diasEntre = (a: string, b: string) => Math.round((comoUTC(b).getTime() - comoUTC(a).getTime()) / 864e5);
const primeroDelMes = (f: string) => f.slice(0, 8) + "01";
const ultimoDelMes = (f: string) => { const [a, m] = partes(f); return aTexto(new Date(Date.UTC(a, m, 0))); };

function atajos(hoy: string) {
  const mesAnterior = sumarDias(primeroDelMes(hoy), -1);
  return [
    { id: "hoy",    etiqueta: "Hoy",              inicio: hoy,                         fin: hoy },
    { id: "7d",     etiqueta: "Últimos 7 días",   inicio: sumarDias(hoy, -6),          fin: hoy },
    { id: "mes",    etiqueta: "Este mes",         inicio: primeroDelMes(hoy),          fin: hoy },
    { id: "previo", etiqueta: "Mes anterior",     inicio: primeroDelMes(mesAnterior),  fin: ultimoDelMes(mesAnterior) },
    { id: "anio",   etiqueta: "Este año",         inicio: hoy.slice(0, 5) + "01-01",   fin: hoy },
  ];
}

/** "Hoy", "Noviembre 2026", "3 – 24 nov", "28 oct 2026 – 5 ene 2027". */
export function etiquetaPeriodo(inicio: string, fin: string, hoy = hoyEC()): string {
  if (!inicio || !fin) return "Elegir período";
  const [ai, mi, di] = partes(inicio);
  const [af, mf, df] = partes(fin);
  if (inicio === fin) return inicio === hoy ? "Hoy" : `${di} ${MESES[mi - 1].slice(0, 3)} ${ai}`;
  const mesCompleto = di === 1 && ai === af && mi === mf && (fin === ultimoDelMes(fin) || fin === hoy);
  if (mesCompleto) return `${MESES[mi - 1][0].toUpperCase()}${MESES[mi - 1].slice(1)} ${ai}`;
  if (ai === af && mi === 1 && di === 1 && (fin === hoy || (mf === 12 && df === 31))) return `Año ${ai}`;
  const corto = (m: number) => MESES[m - 1].slice(0, 3);
  if (ai === af) return mi === mf ? `${di} – ${df} ${corto(mf)}` : `${di} ${corto(mi)} – ${df} ${corto(mf)}`;
  return `${di} ${corto(mi)} ${ai} – ${df} ${corto(mf)} ${af}`;
}

export default function PeriodoFechas({ inicio, fin, onCambio, className }: {
  inicio:     string;
  fin:        string;
  onCambio:   (inicio: string, fin: string) => void;
  className?: string;
}) {
  const [abierta, setAbierta] = useState(false);
  const [desde, setDesde]     = useState(inicio);
  const [hasta, setHasta]     = useState(fin);
  const hoy = hoyEC();

  const abrir = () => { setDesde(inicio); setHasta(fin); setAbierta(true); };
  const elegir = (i: string, f: string) => { onCambio(i, f); setAbierta(false); };

  const dias = desde && hasta ? diasEntre(desde, hasta) : -1;
  const errorRango =
    !desde || !hasta ? "Elige las dos fechas."
    : dias < 0 ? "La fecha final es anterior a la inicial."
    : dias > MAXIMO_DIAS ? "El rango máximo es de un año (365 días)."
    : "";

  return (
    <>
      <button
        type="button"
        onClick={abrir}
        aria-haspopup="dialog"
        className={cn(
          "inline-flex h-9 items-center gap-2 rounded-full border border-borde bg-superficie px-3 text-sm font-medium text-texto",
          "transition-colors hover:bg-presionado active:scale-[0.98] tactil:h-10",
          className,
        )}
      >
        <CalendarDays size={16} className="text-sutil" aria-hidden />
        {etiquetaPeriodo(inicio, fin, hoy)}
        <ChevronDown size={14} className="text-sutil" aria-hidden />
      </button>

      <Hoja
        abierta={abierta}
        onCerrar={() => setAbierta(false)}
        titulo="Período"
        tamano="sm"
        pie={<>
          <Boton variante="secundario" onClick={() => setAbierta(false)}>Cancelar</Boton>
          <Boton onClick={() => elegir(desde, hasta)} disabled={!!errorRango}>Aplicar</Boton>
        </>}
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-2">
            {atajos(hoy).map(a => {
              const actual = a.inicio === inicio && a.fin === fin;
              return (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => elegir(a.inicio, a.fin)}
                  aria-pressed={actual}
                  className={cn(
                    "rounded-xl border px-3 py-2.5 text-left text-sm transition-colors active:scale-[0.98]",
                    actual ? "border-acento bg-acento-suave font-semibold text-texto" : "border-borde text-texto hover:bg-presionado",
                  )}
                >
                  {a.etiqueta}
                  <span className="block text-xs font-normal text-sutil">{etiquetaPeriodo(a.inicio, a.fin, hoy)}</span>
                </button>
              );
            })}
          </div>

          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-sutil">Personalizado</p>
            <div className="grid grid-cols-2 gap-3">
              <Campo etiqueta="Desde"><Entrada type="date" value={desde} max={hoy} onChange={e => setDesde(e.target.value)} /></Campo>
              <Campo etiqueta="Hasta"><Entrada type="date" value={hasta} max={hoy} onChange={e => setHasta(e.target.value)} /></Campo>
            </div>
            {errorRango && desde && hasta && <p role="alert" className="mt-2 text-xs text-peligro-texto">{errorRango}</p>}
          </div>
        </div>
      </Hoja>
    </>
  );
}
