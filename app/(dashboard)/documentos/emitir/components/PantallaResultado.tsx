"use client";

// Pantalla después de emitir (FAC, NCR, NDB, LIQ, RET).
//
// La emisión es asíncrona: el backend responde FIRMADO, RECIBIDO (en cola para
// firmar) o SANDBOX, y el worker la lleva al SRI. Esta pantalla consulta el
// documento unos segundos para mostrar el resultado real:
//   POR_FIRMAR, FIRMADO, RECIBIDA   en proceso
//   EN_REVISION                     falla técnica que el sistema resuelve solo
//   ERROR_FIRMA                     no se pudo firmar; el backend reintenta
//   AUTORIZADO, DEVUELTA,           finales
//   RECHAZADO, ANULADO
// Los de sandbox también pasan por el SRI (ambiente de pruebas).

import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle, Ban, CheckCircle2, Clock, FileText, FlaskConical, Loader2, XCircle,
  type LucideIcon,
} from "lucide-react";
import api from "@/lib/api";
import { rutas } from "@/lib/rutas";
import { vibrar } from "@/lib/nativo";
import AvisoColchon, { type AvisoUsoJusto } from "@/components/uso-justo/AvisoColchon";
import ErroresSRI from "../../ver/components/detalle/ErroresSRI";

export type TipoEmision = "FAC" | "NCR" | "NDB" | "LIQ" | "RET";

/** Respuesta de POST /documentos/emit/{tipo}. */
export interface ResultadoEmision {
  id?:              string;
  claveAcceso?:     string;
  estado?:          string;
  es_sandbox?:      boolean;
  mensaje?:         string;
  aviso_uso_justo?: AvisoUsoJusto;
}

const NOMBRE: Record<TipoEmision, string> = {
  FAC: "Factura",
  NCR: "Nota de crédito",
  NDB: "Nota de débito",
  LIQ: "Liquidación de compra",
  RET: "Retención",
};

const FINALES = new Set(["AUTORIZADO", "DEVUELTA", "RECHAZADO", "ANULADO"]);

const PRIMERA_CONSULTA_MS = 2_000;
const INTERVALO_MS        = 3_000;
const ESPERA_MAXIMA_MS    = 60_000;

type Tono = "success" | "info" | "warning" | "danger" | "muted";

interface Vista {
  tono:    Tono;
  icono:   LucideIcon;
  girar?:  boolean;
  titulo:  string;
  detalle: string;
}

/** Qué mostrar según el estado del documento (todos los tipos son femeninos). */
function vistaDe(nombre: string, estado: string, agotado: boolean, mensajeEmision?: string): Vista {
  switch (estado) {
    case "AUTORIZADO":
      return { tono: "success", icono: CheckCircle2, titulo: `¡${nombre} autorizada!`,
               detalle: "El SRI la autorizó. Ya tiene validez tributaria." };
    case "DEVUELTA":
      return { tono: "warning", icono: AlertTriangle, titulo: `${nombre} devuelta por el SRI`,
               detalle: "El SRI no la aceptó. Revisa los motivos, corrígela y emite una nueva." };
    case "RECHAZADO":
      return { tono: "danger", icono: XCircle, titulo: `${nombre} no autorizada`,
               detalle: "El SRI no la autorizó. Revisa los motivos, corrígela y emite una nueva." };
    case "ANULADO":
      return { tono: "muted", icono: Ban, titulo: `${nombre} anulada`, detalle: "" };
    case "ERROR_FIRMA":
      return { tono: "danger", icono: AlertTriangle, titulo: "No pudimos firmarla",
               detalle: "Kipu lo seguirá intentando. Si no se resuelve, revisa tu firma electrónica en Configuración." };
    case "EN_REVISION":
      return { tono: "info", icono: Clock, titulo: `${nombre} emitida`,
               detalle: "El SRI está tardando en responder. La seguimos verificando automáticamente." };
  }
  // POR_FIRMAR, FIRMADO, RECIBIDA (o RECIBIDO / SANDBOX de la respuesta de emisión)
  if (agotado) {
    return { tono: "info", icono: Clock, titulo: `${nombre} emitida`,
             detalle: "Sigue en proceso en el SRI. Te avisaremos cuando se autorice; también puedes verla en Documentos." };
  }
  return { tono: "info", icono: Loader2, girar: true, titulo: `${nombre} emitida`,
           detalle: mensajeEmision || "Enviándola al SRI…" };
}

const color = (t: Tono) => `var(--kipu-${t === "muted" ? "subtle" : t})`;
const fondo = (t: Tono) => `color-mix(in srgb, ${color(t)} 15%, transparent)`;

/** Consulta el documento hasta que llegue a un estado final o pase la espera máxima. */
function useEstadoDocumento(id: string | undefined, estadoInicial: string) {
  const [estado,   setEstado]   = useState(estadoInicial);
  const [mensajes, setMensajes] = useState<unknown>(null);
  const [agotado,  setAgotado]  = useState(!id);

  useEffect(() => {
    if (!id) return;
    let activo = true;
    let timer: ReturnType<typeof setTimeout>;
    const inicio = Date.now();

    const consultar = async () => {
      try {
        const res = await api.get(`/api/v1/app/documentos/${id}`);
        const doc = res.data?.data;
        if (!activo || !doc) return;
        if (doc.estado_sri) setEstado(doc.estado_sri);
        setMensajes(doc.mensajes_sri ?? null);
        if (FINALES.has(doc.estado_sri)) return;
      } catch {
        if (!activo) return;   // sin red o error: se reintenta en la siguiente vuelta
      }
      if (Date.now() - inicio >= ESPERA_MAXIMA_MS) { setAgotado(true); return; }
      timer = setTimeout(consultar, INTERVALO_MS);
    };

    timer = setTimeout(consultar, PRIMERA_CONSULTA_MS);
    return () => { activo = false; clearTimeout(timer); };
  }, [id]);

  return { estado, mensajes, agotado };
}

export default function PantallaResultado({
  tipo, resultado, onNueva, children,
}: {
  tipo:      TipoEmision;
  resultado: ResultadoEmision;
  onNueva:   () => void;
  /** Lo propio de cada comprobante (p. ej. el link de pago de la factura). */
  children?: ReactNode;
}) {
  const router = useRouter();
  const nombre = NOMBRE[tipo];
  const { estado, mensajes, agotado } = useEstadoDocumento(resultado.id, resultado.estado ?? "");
  const vista  = vistaDe(nombre, estado, agotado, resultado.mensaje);
  const Icono  = vista.icono;
  const esFinalConError = estado === "DEVUELTA" || estado === "RECHAZADO";

  // En el teléfono se siente el resultado del SRI (lib/nativo.ts; en la web no hace nada)
  useEffect(() => {
    if (estado === "AUTORIZADO") void vibrar("exito");
    else if (estado === "DEVUELTA" || estado === "RECHAZADO") void vibrar("error");
  }, [estado]);

  return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ background: "var(--kipu-bg)" }}>
      <div className="w-full max-w-sm text-center" aria-live="polite">
        <div
          className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
          style={{ background: fondo(vista.tono) }}
        >
          <Icono size={32} className={vista.girar ? "animate-spin" : undefined} style={{ color: color(vista.tono) }} />
        </div>

        <h2 className="text-xl font-bold mb-1" style={{ color: "var(--kipu-text)" }}>{vista.titulo}</h2>
        {vista.detalle && (
          <p className="text-sm mb-3" style={{ color: "var(--kipu-muted)" }}>{vista.detalle}</p>
        )}

        {resultado.es_sandbox && (
          <p
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium mb-3"
            style={{ background: "color-mix(in srgb, var(--kipu-sandbox) 15%, transparent)", color: "var(--kipu-sandbox)" }}
          >
            <FlaskConical size={13} /> Prueba · sin validez tributaria
          </p>
        )}

        {resultado.claveAcceso && (
          <p className="text-xs font-mono break-all mb-4" style={{ color: "var(--kipu-subtle)" }}>
            {resultado.claveAcceso}
          </p>
        )}

        {esFinalConError && (
          <div className="text-left mb-4">
            <ErroresSRI mensajesSri={mensajes} />
          </div>
        )}

        {resultado.aviso_uso_justo && <AvisoColchon aviso={resultado.aviso_uso_justo} />}

        {children}

        <div className="space-y-2 mt-2">
          {resultado.id && (
            <button
              onClick={() => router.push(rutas.documento(resultado.id!))}
              className="w-full inline-flex items-center justify-center gap-2 py-3 rounded-lg text-white text-sm font-medium transition-opacity hover:opacity-90 active:opacity-80"
              style={{ background: "var(--kipu-accent)" }}
            >
              <FileText size={16} /> Ver {nombre.toLowerCase()}
            </button>
          )}
          <div className="flex gap-2">
            <button
              onClick={onNueva}
              className="flex-1 py-3 rounded-lg text-sm transition-opacity active:opacity-70"
              style={{ border: "1px solid var(--kipu-border)", color: "var(--kipu-text)" }}
            >
              Nueva {nombre.toLowerCase()}
            </button>
            <button
              onClick={() => router.push("/documentos")}
              className="flex-1 py-3 rounded-lg text-sm transition-opacity active:opacity-70"
              style={{ border: "1px solid var(--kipu-border)", color: "var(--kipu-text)" }}
            >
              Ver historial
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
