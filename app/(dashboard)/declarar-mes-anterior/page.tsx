"use client";

// /declarar-mes-anterior — guía para declarar el último periodo cerrado del 104
// (sobre todo para quien acaba de empezar en Kipu y facturaba con otro sistema):
//   1. El periodo y su vencimiento (el del registro: noveno dígito del RUC).
//   2. Compras: importarlas con la extensión desde "Comprobantes electrónicos
//      recibidos" del SRI, con el conteo de las que ya están en Kipu (cada 10 s
//      mientras la pantalla está visible; se detiene a los 15 minutos).
//   3. Ventas: lo que facturó con otro sistema se suma a mano en el SRI (SOLO_KIPU).
//   4. Ir al 104 de ese periodo (planes y elegir periodo, como siempre) o "Ya lo declaré".
//   5. Factura con Kipu y el próximo mes no sube nada.
// En la app: sin enlaces de instalación, sin planes ni precios.
// Datos: GET /declaraciones/mes-anterior · POST /declaraciones/declarar.

import { useCallback, useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import {
  ArrowLeft, ArrowRight, CalendarCheck, CheckCircle2, ExternalLink, Globe, Loader2, Puzzle, RefreshCw,
  Receipt, ShoppingCart, Sparkles,
} from "lucide-react";
import api from "@/lib/api";
import { detalleError } from "@/lib/errores";
import { ES_APP_NATIVA } from "@/lib/plataforma";
import { rutas } from "@/lib/rutas";
import { ModalConfirmar } from "@/components/DeclaracionWidget";
import { CHROME_EXT_URL, FIREFOX_EXT_URL } from "../documentos/recibidos/nueva/_components/TabSRI";
import { montoEC } from "@/lib/dinero";

const CADA_MS   = 10_000;          // el conteo de compras, mientras la pantalla está visible
const CORTE_MS  = 15 * 60_000;     // a los 15 minutos deja de consultar solo
const SRI_URL   = "https://srienlinea.sri.gob.ec";

interface MesAnterior {
  periodo:          string;        // 2026-10 (el semestre: su primer mes)
  nombre:           string;        // octubre de 2026 | 2do semestre 2026
  tipo_periodo:     "MENSUAL" | "SEMESTRAL";
  vencimiento_fmt:  string;        // 30 de noviembre de 2026
  dias_restantes:   number;
  declarado:        boolean;
  compras:          { cantidad: number; total: number };
  ventas:           { cantidad: number };
  aviso:            { codigo: string } | null;   // SOLO_KIPU
  importar_compras: boolean;
}

type Respuesta = { aplica: true; data: MesAnterior } | { aplica: false; motivo: string };

const plural = (n: number, uno: string, varios: string) => `${n} ${n === 1 ? uno : varios}`;

/** "octubre de 2026" → "octubre" (el semestre se queda entero) */
const corto = (d: MesAnterior) => d.tipo_periodo === "SEMESTRAL" ? d.nombre : d.nombre.split(" de ")[0];

function Paso({ n, titulo, icono, children }: {
  n: number; titulo: string; icono: ReactNode; children: ReactNode;
}) {
  return (
    <section className="rounded-2xl p-4 space-y-3 bg-superficie border border-borde">
      <div className="flex items-center gap-2.5">
        <span className="w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center shrink-0 bg-acento/20 text-acento">
          {n}
        </span>
        <h2 className="text-sm font-semibold flex items-center gap-1.5 text-texto">
          {icono} {titulo}
        </h2>
      </div>
      {children}
    </section>
  );
}

export default function DeclararMesAnteriorPage() {
  const [resp,        setResp]        = useState<Respuesta | null>(null);
  const [error,       setError]       = useState("");
  const [ronda,       setRonda]       = useState(0);      // al pulsar "Actualizar" vuelve a contar 15 minutos
  const [pausado,     setPausado]     = useState(false);
  const [confirmando, setConfirmando] = useState(false);
  const [guardando,   setGuardando]   = useState(false);

  const cargar = useCallback(() =>
    api.get("/api/v1/app/declaraciones/mes-anterior")
      .then((r) => { setResp(r.data as Respuesta); setError(""); })
      .catch((e) => setError(detalleError(e, "No se pudo cargar tu declaración."))),
  []);

  // Carga y, mientras la pantalla está visible, vuelve a contar cada 10 s (15 minutos)
  useEffect(() => {
    const inicio = Date.now();
    cargar();
    const id = setInterval(() => {
      if (Date.now() - inicio > CORTE_MS) {
        clearInterval(id);
        setPausado(true);
        return;
      }
      if (document.visibilityState === "visible") cargar();
    }, CADA_MS);
    return () => clearInterval(id);
  }, [cargar, ronda]);

  const marcarDeclarado = async (periodo: string) => {
    setGuardando(true);
    try {
      await api.post("/api/v1/app/declaraciones/declarar", null, { params: { tipo: "104", periodo } });
      setConfirmando(false);
      await cargar();
    } catch (e) {
      setError(detalleError(e, "No se pudo registrar la declaración."));
    } finally {
      setGuardando(false);
    }
  };

  const volver = (
    <Link href="/dashboard" className="flex items-center gap-1.5 text-xs hover:underline text-sutil">
      <ArrowLeft size={14} /> Volver al panel
    </Link>
  );

  if (!resp) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        {error
          ? <p className="text-sm text-peligro">{error}</p>
          : <Loader2 size={22} className="animate-spin text-acento" />}
      </div>
    );
  }

  if (!resp.aplica) {
    return (
      <div className="p-4 md:p-6 max-w-2xl mx-auto space-y-5">
        {volver}
        <p className="text-sm rounded-xl p-4 bg-superficie border border-borde text-texto">
          {resp.motivo}
        </p>
      </div>
    );
  }

  const d   = resp.data;
  const mes = corto(d);

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto space-y-4">
      {confirmando && (
        <ModalConfirmar
          onConfirm={() => marcarDeclarado(d.periodo)}
          onCancel={() => setConfirmando(false)}
          loading={guardando}
        />
      )}

      {volver}

      {/* 1. El periodo */}
      <div className="rounded-2xl p-5 text-center space-y-1.5 bg-superficie border border-borde">
        <CalendarCheck size={22} className="mx-auto text-acento" />
        <h1 className="text-lg font-bold text-texto">
          Declara {d.nombre} con Kipu
        </h1>
        {d.declarado ? (
          <p className="text-sm font-medium flex items-center justify-center gap-1.5 text-exito">
            <CheckCircle2 size={15} /> Ya lo marcaste como declarado
          </p>
        ) : (
          <p className="text-sm" style={{ color: d.dias_restantes < 0 ? "var(--kipu-danger)" : "var(--kipu-subtle)" }}>
            {d.dias_restantes < 0 ? `Venció el ${d.vencimiento_fmt}` : `Vence el ${d.vencimiento_fmt}`}
          </p>
        )}
      </div>

      {/* 2. Compras */}
      <Paso n={1} titulo={`Tus compras de ${mes}`} icono={<ShoppingCart size={15} />}>
        <div className="rounded-xl px-4 py-3 flex items-center justify-between gap-3 bg-acento/8">
          <p className="text-sm text-texto">
            Ya tienes <strong>{plural(d.compras.cantidad, "compra", "compras")}</strong> de {mes} en Kipu
            {d.compras.cantidad > 0 && <span className="text-sutil"> · ${montoEC(d.compras.total)}</span>}
          </p>
          {pausado ? (
            <button type="button" onClick={() => { setPausado(false); setRonda((r) => r + 1); }}
                    className="text-xs font-medium flex items-center gap-1 shrink-0 text-acento">
              <RefreshCw size={12} /> Actualizar
            </button>
          ) : (
            <span className="text-[11px] shrink-0" style={{ color: "var(--kipu-subtle)" }}>Se actualiza solo</span>
          )}
        </div>

        {!d.importar_compras ? (
          // Importar compras no está en su plan. En la app, sin nombrar planes ni precios.
          ES_APP_NATIVA ? (
            <p className="text-sm text-sutil">
              Importar compras no está disponible con tu plan.
            </p>
          ) : (
            <p className="text-sm text-sutil">
              Importar compras desde el SRI es parte de Kipu Pro.{" "}
              <Link href="/planes" className="font-medium hover:underline text-acento">
                Ver planes
              </Link>
            </p>
          )
        ) : ES_APP_NATIVA ? (
          <p className="text-sm text-sutil">
            Esto se hace desde tu computadora, con la extensión de Kipu en Chrome o Firefox. Las compras que
            importes aparecen aquí.
          </p>
        ) : (
          <>
            <ol className="space-y-2 text-sm text-tenue">
              {[
                <>Entra al <a href={SRI_URL} target="_blank" rel="noopener noreferrer"
                  className="font-medium hover:underline inline-flex items-center gap-0.5 text-acento">
                  SRI en Línea <ExternalLink size={11} /></a> con el RUC de tu empresa.</>,
                <>Ve a <strong>Facturación Electrónica → Comprobantes electrónicos recibidos</strong>.</>,
                <>Elige <strong>{d.nombre}</strong>, el tipo de comprobante y pulsa <strong>Consultar</strong>.</>,
                <>Abre la extensión de Kipu y pulsa <strong>Importar</strong>. Repite con cada tipo que tengas
                  (facturas, notas de crédito, retenciones).</>,
              ].map((texto, i) => (
                <li key={i} className="flex items-start gap-2.5">
                  <span className="text-xs font-bold w-4 shrink-0 mt-0.5 text-acento">{i + 1}.</span>
                  <span>{texto}</span>
                </li>
              ))}
            </ol>
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <span className="text-xs text-sutil">¿No tienes la extensión? Instálala:</span>
              <a href={CHROME_EXT_URL} target="_blank" rel="noopener noreferrer"
                 className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-borde text-texto">
                <Globe size={12} /> Chrome
              </a>
              <a href={FIREFOX_EXT_URL} target="_blank" rel="noopener noreferrer"
                 className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-borde text-texto">
                <Puzzle size={12} /> Firefox
              </a>
            </div>
          </>
        )}
      </Paso>

      {/* 3. Ventas */}
      <Paso n={2} titulo={`Tus ventas de ${mes}`} icono={<Receipt size={15} />}>
        {d.ventas.cantidad > 0 && (
          <p className="text-sm text-texto">
            Kipu ya tiene tus <strong>{plural(d.ventas.cantidad, "venta", "ventas")}</strong> de {mes} emitidas aquí.
          </p>
        )}
        {d.aviso ? (
          <p className="text-sm text-texto">
            Las ventas que hiciste con otro sistema no están en Kipu: <strong>súmalas en el formulario del SRI
            antes de presentarlo.</strong>
          </p>
        ) : d.ventas.cantidad === 0 && (
          <p className="text-sm text-sutil">No tienes ventas de {mes} en Kipu.</p>
        )}
      </Paso>

      {/* 4. La declaración */}
      <Paso n={3} titulo="Tu declaración" icono={<CalendarCheck size={15} />}>
        <p className="text-sm text-sutil">
          Con tus compras en Kipu, revisa el formulario 104 de {mes} y cópialo en el SRI.
        </p>
        {error && <p className="text-xs text-peligro">{error}</p>}
        <div className="flex flex-wrap gap-2">
          <Link href={rutas.reporteIva(d.periodo)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold text-white transition-opacity hover:opacity-90 bg-acento">
            Ver mi declaración de {mes} <ArrowRight size={14} />
          </Link>
          {!d.declarado && (
            <button type="button" onClick={() => setConfirmando(true)}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium border border-borde text-texto">
              <CheckCircle2 size={14} /> Ya lo declaré
            </button>
          )}
        </div>
      </Paso>

      {/* 5. Cierre */}
      <p className="text-sm text-center flex items-center justify-center gap-1.5 pt-1 text-sutil">
        <Sparkles className="text-acento" size={14} />
        Factura con Kipu y el próximo mes no tienes que subir nada.
      </p>
    </div>
  );
}
