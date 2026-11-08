"use client";
/**
 * Establecimiento y punto de emisión de un comprobante.
 *
 * - Un solo establecimiento con un solo punto: se usa ese, sin preguntar.
 * - Varios: no se preselecciona nada (para no emitir por apuro desde el que
 *   "estaba ahí"), salvo que la persona marque "Recordar en este dispositivo".
 * - NC, ND o retención sobre un comprobante propio: se propone el mismo
 *   establecimiento y punto del documento de origen.
 * Solo se ofrecen establecimientos y puntos activos (el backend rechaza los otros).
 */
import { useEffect, useMemo, useState } from "react";
import api from "@/lib/api";
import { useAuthStore } from "@/store/auth.store";

export interface PuntoEmisionInfo { codigo: string; nombre?: string; is_active?: boolean }
export interface Establecimiento {
  codigo:            string;
  nombre_comercial?: string;
  direccion:         string;
  is_active?:        boolean;
  puntos_emision:    PuntoEmisionInfo[];
}
interface Serie { estab: string; pto: string }

const CACHE = "kipu:estructura";
const claveRecordar = (empresaId?: number) => `kipu-punto-emision:${empresaId ?? "x"}`;

/** "001-002-000000123" → { estab: "001", pto: "002" } */
export function serieDeNumero(numero?: string | null): Serie | null {
  const m = /^\s*(\d{3})-(\d{3})-\d+/.exec(numero ?? "");
  return m ? { estab: m[1], pto: m[2] } : null;
}

function activos(estabs: Establecimiento[]): Establecimiento[] {
  return estabs
    .filter(e => e.is_active !== false)
    .map(e => ({ ...e, puntos_emision: (e.puntos_emision ?? []).filter(p => p.is_active !== false) }))
    .filter(e => e.puntos_emision.length > 0);
}

function leerCache(): Establecimiento[] | null {
  try { const c = sessionStorage.getItem(CACHE); return c ? JSON.parse(c) : null; } catch { return null; }
}

function leerRecordado(clave: string): Serie | null {
  try { const v = localStorage.getItem(clave); return v ? JSON.parse(v) : null; } catch { return null; }
}

/**
 * @param numeroOrigen número del comprobante PROPIO que se modifica o retiene
 *                     (NC/ND sobre factura, retención sobre liquidación), o null.
 */
export function usePuntoEmision(numeroOrigen?: string | null) {
  const empresaId = useAuthStore((s) => s.empresa?.id);
  const clave     = claveRecordar(empresaId);

  const [estructura, setEstructura] = useState<Establecimiento[] | null>(leerCache);
  const [recordado,  setRecordado]  = useState<Serie | null>(() => leerRecordado(clave));
  // Elección manual; vale mientras no cambie el documento de origen
  const [manual, setManual] = useState<(Serie & { origen: string | null }) | null>(null);

  useEffect(() => {
    if (estructura) return;
    let vivo = true;
    api.get("/api/v1/app/estructura")
      .then(res => {
        const data = res.data.data ?? [];
        try { sessionStorage.setItem(CACHE, JSON.stringify(data)); } catch {}
        if (vivo) setEstructura(data);
      })
      .catch(e => console.error("Error cargando estructura", e));
    return () => { vivo = false; };
  }, [estructura]);

  const establecimientos = useMemo(() => activos(estructura ?? []), [estructura]);
  const existe = (s: Serie | null): s is Serie =>
    !!s && establecimientos.some(e => e.codigo === s.estab && e.puntos_emision.some(p => p.codigo === s.pto));

  const unico = establecimientos.length === 1 && establecimientos[0].puntos_emision.length === 1;
  const origen = serieDeNumero(numeroOrigen);
  const claveOrigen = origen ? `${origen.estab}-${origen.pto}` : null;

  const manualVigente = manual && manual.origen === claveOrigen
    && establecimientos.some(e => e.codigo === manual.estab) ? manual : null;

  let elegido: Serie = { estab: "", pto: "" };
  let desdeOrigen = false;
  if (manualVigente)        elegido = manualVigente;
  else if (existe(origen))  { elegido = origen; desdeOrigen = true; }
  else if (unico)           elegido = { estab: establecimientos[0].codigo, pto: establecimientos[0].puntos_emision[0].codigo };
  else if (existe(recordado)) elegido = recordado;

  const puntos = establecimientos.find(e => e.codigo === elegido.estab)?.puntos_emision ?? [];
  const serie  = elegido.estab && elegido.pto ? `${elegido.estab}-${elegido.pto}` : "";

  const guardar = (s: Serie | null) => {
    setRecordado(s);
    try { s ? localStorage.setItem(clave, JSON.stringify(s)) : localStorage.removeItem(clave); } catch {}
  };

  const elegir = (s: Serie) => {
    setManual({ ...s, origen: claveOrigen });
    if (recordado && s.estab && s.pto) guardar({ estab: s.estab, pto: s.pto });
  };

  return {
    establecimientos,
    cargando:      estructura === null,
    unico,
    estabSelected: elegido.estab,
    ptoSelected:   elegido.pto,
    puntos,
    serie,
    desdeOrigen,
    numeroOrigen:  desdeOrigen ? numeroOrigen ?? null : null,
    recordar:      recordado !== null,
    onEstabChange: (codigo: string) => {
      const ptos = establecimientos.find(e => e.codigo === codigo)?.puntos_emision ?? [];
      // Si el establecimiento tiene un solo punto, no hay nada más que elegir
      elegir({ estab: codigo, pto: ptos.length === 1 ? ptos[0].codigo : "" });
    },
    onPtoChange: (codigo: string) => elegir({ estab: elegido.estab, pto: codigo }),
    setRecordar: (si: boolean) => guardar(si && serie ? { estab: elegido.estab, pto: elegido.pto } : null),
    /** Para "nueva factura": vuelve a la regla por defecto (no arrastra la elección anterior). */
    reiniciar: () => setManual(null),
  };
}

export type PuntoEmisionState = ReturnType<typeof usePuntoEmision>;
