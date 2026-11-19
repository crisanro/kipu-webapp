"use client";

// Estado del detector de caídas del SRI, de las colas de envío y de quién las
// procesa (contenedor worker / API) (solo superadmin).

import { useCallback, useEffect, useState } from "react";
import { Radio, RotateCw, Loader2 } from "lucide-react";
import api from "@/lib/api";

const CADA_MS = 30_000;

const AMBIENTES = [
  { id: "2", nombre: "Producción" },
  { id: "1", nombre: "Pruebas" },
];
const SERVICIOS = [
  { id: "recepcion",    nombre: "Recepción" },
  { id: "autorizacion", nombre: "Autorización" },
];
const ESTADO: Record<string, { texto: string; color: string }> = {
  NORMAL:     { texto: "Normal",                    color: "var(--kipu-success)" },
  CAIDO:      { texto: "Caído",                     color: "var(--kipu-danger)" },
  PROBANDO:   { texto: "Probando con una factura",  color: "var(--kipu-warning)" },
  REANUDANDO: { texto: "Reanudando de a poco",      color: "var(--kipu-warning)" },
};
const ESTADO_DOC: Record<string, string> = {
  POR_FIRMAR:  "por firmar",
  ERROR_FIRMA: "error de firma",
  FIRMADO:     "por enviar",
  RECIBIDA:    "esperando autorización",
  EN_REVISION: "en revisión",
};

type Servicio  = { ambiente: string; servicio: string; estado: string; desde: number | null };
type Worker    = { id: string; origen: "worker" | "api"; inicio: number; hace_seg: number; en_curso: number };
type Pendiente = { estado: string; sandbox: boolean; n: number };
type Datos = {
  detector_activo: boolean;
  workers?: { en_api: boolean; vivos: Worker[]; visto_hace_seg: number | null };
  servicios:  Servicio[];
  colas: {
    emision: number; emision_prioritaria: number;
    autorizacion: number; autorizacion_prioritaria: number;
    programados: number;
  } | null;
  pendientes: Pendiente[];
  config: {
    fallas: number; ventana_seg: number; prueba_seg: number; forzar_seg: number;
    reanudar_por_seg: number; reanudar_exitos: number;
  };
};

function desde(segundos: number | null): string {
  if (!segundos) return "";
  const f = new Date(segundos * 1000);
  const hoy = new Date().toDateString() === f.toDateString();
  return f.toLocaleString("es-EC", hoy
    ? { hour: "2-digit", minute: "2-digit" }
    : { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

function hace(seg: number): string {
  if (seg < 60) return `${seg} s`;
  if (seg < 3600) return `${Math.round(seg / 60)} min`;
  return `${Math.round(seg / 3600)} h`;
}

// Quién procesa las colas: el contenedor "worker" y, con WORKERS_EN_API=true, la API
function Workers({ w }: { w: NonNullable<Datos["workers"]> }) {
  const aparte = w.vivos.filter((v) => v.origen === "worker");
  const enApi  = w.vivos.filter((v) => v.origen === "api");
  const nadie  = w.vivos.length === 0;
  const color  = nadie ? "var(--kipu-danger)" : aparte.length ? "var(--kipu-success)" : "var(--kipu-warning)";
  const texto  = nadie
    ? `Ningún worker procesa las colas${w.visto_hace_seg !== null ? ` (último latido hace ${hace(w.visto_hace_seg)})` : ""}`
    : aparte.length
      ? `Worker activo (latido hace ${hace(Math.min(...aparte.map((v) => v.hace_seg)))}`
        + `, ${aparte.reduce((n, v) => n + v.en_curso, 0)} documentos en curso)`
      : "Sin contenedor worker: lo procesa la API";
  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs mb-3" style={{ color: "var(--kipu-text)" }}>
      <span className="w-2 h-2 rounded-full shrink-0" style={{ background: color }} />
      <span>{texto}</span>
      {w.en_api && (
        <span style={{ color: "var(--kipu-subtle)" }}>
          · la API también procesa ({enApi.length} proceso{enApi.length === 1 ? "" : "s"}, WORKERS_EN_API=true)
        </span>
      )}
    </div>
  );
}

function resumenPendientes(lista: Pendiente[], sandbox: boolean): string {
  const filas = lista.filter((p) => p.sandbox === sandbox && p.n > 0);
  if (!filas.length) return "ninguno";
  return filas.map((p) => `${p.n} ${ESTADO_DOC[p.estado] ?? p.estado}`).join(" · ");
}

type Lectura = { datos?: Datos; error?: string };

async function leer(): Promise<Lectura> {
  try {
    const res = await api.get("/api/v1/admin/panel/diagnostico/sri");
    return { datos: res.data.data };
  } catch (e) {
    const status = (e as { response?: { status?: number } })?.response?.status;
    return { error: status ? `Error ${status} al leer el estado del SRI.` : "Sin conexión con el backend." };
  }
}

export default function EstadoSRI() {
  const [datos,    setDatos]    = useState<Datos | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error,    setError]    = useState<string | null>(null);

  const aplicar = useCallback((r: Lectura) => {
    if (r.datos) setDatos(r.datos);
    setError(r.error ?? null);
    setCargando(false);
  }, []);

  useEffect(() => {
    let vivo = true;
    const tick = () => { leer().then((r) => { if (vivo) aplicar(r); }); };
    tick();
    const intervalo = setInterval(tick, CADA_MS);
    return () => {
      vivo = false;
      clearInterval(intervalo);
    };
  }, [aplicar]);

  const actualizar = () => {
    setCargando(true);
    leer().then(aplicar);
  };

  const estadoDe = (amb: string, serv: string) =>
    datos?.servicios.find((s) => s.ambiente === amb && s.servicio === serv);

  return (
    <div
      className="rounded-xl p-4"
      style={{ background: "var(--kipu-surface)", border: "1px solid var(--kipu-border)" }}
    >
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2 min-w-0">
          <Radio size={16} style={{ color: "var(--kipu-accent)" }} />
          <p className="text-sm font-medium" style={{ color: "var(--kipu-text)" }}>Estado del SRI</p>
          {datos && !datos.detector_activo && (
            <span
              className="text-[10px] px-1.5 py-0.5 rounded"
              style={{ background: "color-mix(in srgb, var(--kipu-warning) 15%, transparent)", color: "var(--kipu-text)" }}
            >
              Detector apagado
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={actualizar}
          disabled={cargando}
          className="flex items-center gap-1 text-[11px] shrink-0"
          style={{ color: "var(--kipu-subtle)" }}
        >
          <RotateCw size={11} className={cargando ? "animate-spin" : ""} /> Actualizar
        </button>
      </div>

      {error && (
        <p className="text-xs mb-2" style={{ color: "var(--kipu-danger)" }}>{error}</p>
      )}

      {!datos ? (
        cargando && (
          <div className="flex justify-center py-6">
            <Loader2 size={18} className="animate-spin" style={{ color: "var(--kipu-accent)" }} />
          </div>
        )
      ) : (
        <>
          {datos.workers && <Workers w={datos.workers} />}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {AMBIENTES.map((amb) => (
              <div
                key={amb.id}
                className="rounded-lg p-3"
                style={{ border: "1px solid var(--kipu-border)" }}
              >
                <p className="text-xs font-medium mb-2" style={{ color: "var(--kipu-text)" }}>{amb.nombre}</p>
                {SERVICIOS.map((serv) => {
                  const s = estadoDe(amb.id, serv.id);
                  const e = ESTADO[s?.estado ?? "NORMAL"] ?? ESTADO.NORMAL;
                  return (
                    <div key={serv.id} className="flex items-center justify-between gap-2 py-1">
                      <span className="text-xs" style={{ color: "var(--kipu-subtle)" }}>{serv.nombre}</span>
                      <span className="inline-flex items-center gap-1.5 text-xs text-right" style={{ color: "var(--kipu-text)" }}>
                        <span className="w-2 h-2 rounded-full shrink-0" style={{ background: e.color }} />
                        {e.texto}
                        {s?.estado && s.estado !== "NORMAL" && s.desde && (
                          <span style={{ color: "var(--kipu-subtle)" }}>· desde {desde(s.desde)}</span>
                        )}
                      </span>
                    </div>
                  );
                })}
                <p className="text-[11px] mt-2 pt-2" style={{ color: "var(--kipu-subtle)", borderTop: "1px solid var(--kipu-border)" }}>
                  Pendientes: {resumenPendientes(datos.pendientes, amb.id === "1")}
                </p>
              </div>
            ))}
          </div>

          <p className="text-[11px] mt-3" style={{ color: "var(--kipu-subtle)" }}>
            {datos.colas
              ? `En cola ahora: ${datos.colas.emision_prioritaria + datos.colas.emision} por enviar`
                + ` (${datos.colas.emision_prioritaria} con plan)`
                + ` · ${datos.colas.autorizacion_prioritaria + datos.colas.autorizacion} por autorizar`
                + ` (${datos.colas.autorizacion_prioritaria} con plan)`
                + ` · ${datos.colas.programados} reintentos programados. Los de clientes con plan salen primero.`
              : "No se pudo leer las colas (Redis)."}
          </p>
          <p className="text-[11px] mt-1" style={{ color: "var(--kipu-subtle)" }}>
            Se marca caído con {datos.config.fallas} fallas técnicas seguidas en {datos.config.ventana_seg} s;
            prueba cada {datos.config.prueba_seg} s y reanuda a {datos.config.reanudar_por_seg} por segundo
            hasta {datos.config.reanudar_exitos} éxitos seguidos. Si la prueba sigue fallando, cada{" "}
            {Math.round(datos.config.forzar_seg / 60)} min intenta igual con una factura real.
          </p>
        </>
      )}
    </div>
  );
}
