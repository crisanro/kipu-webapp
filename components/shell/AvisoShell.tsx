// components/shell/AvisoShell.tsx
// Un solo lugar para los avisos de arriba del panel. Antes eran hasta 5 franjas
// apiladas (SRI, correo, notificaciones, sandbox, Kipu Pro) que en el celular se
// comían media pantalla. Ahora se ve el más importante en una línea; si hay más,
// "+N" los despliega. Orden: sin conexión > SRI > correo > notificaciones >
// sandbox (solo en la compu: en el celular está el chip de la barra superior) > Kipu Pro.

"use client";

import { useEffect, useState, useSyncExternalStore, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  AlertTriangle, ArrowRight, Bell, ChevronDown, CloudOff, FlaskConical, Sparkles, WifiOff, X,
  type LucideIcon,
} from "lucide-react";
import api from "@/lib/api";
import { cn } from "@/components/ui/cn";
import { textoAvisoPro } from "@/components/dashboard/AvisoPro";
import { useAuthStore } from "@/store/auth.store";

type Tono = "peligro" | "alerta" | "acento" | "sandbox";

interface Aviso {
  id:       string;
  tono:     Tono;
  icono:    LucideIcon;
  texto:    ReactNode;
  detalle?: ReactNode;
  acciones?: ReactNode;
  alCerrar?: () => void;
}

const TONOS: Record<Tono, { fondo: string; borde: string; icono: string }> = {
  peligro: { fondo: "bg-peligro-suave", borde: "border-peligro/20", icono: "text-peligro" },
  alerta:  { fondo: "bg-alerta-suave",  borde: "border-alerta/20",  icono: "text-alerta" },
  acento:  { fondo: "bg-acento-suave",  borde: "border-acento/20",  icono: "text-acento" },
  sandbox: { fondo: "bg-sandbox-suave", borde: "border-sandbox/20", icono: "text-sandbox" },
};

// ── Conexión y tamaño de pantalla (sin desajustes al hidratar) ────────────────
const suscribirRed = (cb: () => void) => {
  window.addEventListener("online", cb); window.addEventListener("offline", cb);
  return () => { window.removeEventListener("online", cb); window.removeEventListener("offline", cb); };
};
const useEnLinea = () => useSyncExternalStore(suscribirRed, () => navigator.onLine, () => true);

const MQ_COMPU = "(min-width: 1024px)";
const suscribirAncho = (cb: () => void) => {
  const mq = window.matchMedia(MQ_COMPU); mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
};
const useEsCompu = () => useSyncExternalStore(suscribirAncho, () => window.matchMedia(MQ_COMPU).matches, () => true);

// ── Estado del SRI (el backend detecta las caídas: app/services/sri_disponibilidad.py) ──
type EstadoSRI = { ambientes: Record<string, { intermitencias: boolean }>; en_espera: number };
const SRI_CADA_MS = 60_000;

function useEstadoSRI(): EstadoSRI | null {
  const [estado, setEstado] = useState<EstadoSRI | null>(null);
  useEffect(() => {
    let vivo = true;
    const cargar = () => {
      if (document.visibilityState !== "visible") return;
      api.get("/api/v1/app/dashboard/estado-sri")
        .then((r) => { if (vivo) setEstado(r.data); })
        .catch(() => {});   // si no se puede consultar, simplemente no se muestra
    };
    cargar();
    const intervalo = setInterval(cargar, SRI_CADA_MS);
    document.addEventListener("visibilitychange", cargar);
    return () => { vivo = false; clearInterval(intervalo); document.removeEventListener("visibilitychange", cargar); };
  }, []);
  return estado;
}

const CLAVE_PRO_OCULTO = "kipu:aviso-pro-oculto";

export interface AvisoShellProps {
  sandbox:          boolean;
  puedeProduccion:  boolean;
  onSalirSandbox:   () => void;
  correo: {
    cargando: boolean; verificado: boolean; error: string; enviado: boolean;
    enviando: boolean; espera: number; enviar: () => void;
  };
  email?:           string | null;
  pedirNotificaciones: boolean;
  onActivarNotificaciones: () => void;
  onPosponerNotificaciones: () => void;
}

export default function AvisoShell({
  sandbox, puedeProduccion, onSalirSandbox, correo, email,
  pedirNotificaciones, onActivarNotificaciones, onPosponerNotificaciones,
}: AvisoShellProps) {
  const pathname  = usePathname() ?? "";
  const empresa   = useAuthStore((s) => s.empresa);
  const enLinea   = useEnLinea();
  const esCompu   = useEsCompu();
  const sri       = useEstadoSRI();
  const [desplegado, setDesplegado] = useState(false);
  const [proOculto, setProOculto] = useState(() => {
    try { return typeof window !== "undefined" && sessionStorage.getItem(CLAVE_PRO_OCULTO) === "1"; } catch { return false; }
  });

  const avisos: Aviso[] = [];

  if (!enLinea) avisos.push({
    id: "red", tono: "peligro", icono: WifiOff,
    texto: "Sin conexión a internet.",
    detalle: "Revisa tu red: hasta que vuelva no se puede emitir ni actualizar la información.",
  });

  const ambiente = sandbox ? "1" : "2";
  if (sri?.ambientes?.[ambiente]?.intermitencias) {
    const n = sri.en_espera;
    avisos.push({
      id: "sri", tono: "alerta", icono: CloudOff,
      texto: <><strong>El SRI{sandbox ? " de pruebas" : ""} tiene intermitencias.</strong></>,
      detalle:
        n === 1 ? "Tu comprobante en cola se enviará solo cuando responda. Te avisamos al terminar."
        : n > 1 ? `Tus ${n} comprobantes en cola se enviarán solos cuando responda. Te avisamos al terminar.`
        : "Puedes seguir emitiendo: tus comprobantes se enviarán solos cuando responda.",
    });
  }

  if (!correo.cargando && !correo.verificado) avisos.push({
    id: "correo", tono: "alerta", icono: AlertTriangle,
    texto: correo.error || (correo.enviado ? "Revisa tu correo y abre el enlace." : "Verifica tu correo para emitir comprobantes."),
    detalle: correo.enviado
      ? <>Te enviamos un enlace a <strong>{email}</strong>. Busca el correo de no-reply@kipu.ec (revisa también Spam).</>
      : <>Tu correo <strong>{email}</strong> no está verificado.</>,
    acciones: (
      <button
        type="button"
        onClick={correo.enviar}
        disabled={correo.enviando || correo.espera > 0}
        className="whitespace-nowrap rounded-md px-2 py-1 text-xs font-semibold text-alerta underline-offset-2 hover:underline disabled:opacity-50 disabled:no-underline"
      >
        {correo.enviando ? "Enviando…" : correo.espera > 0 ? `Reenviar en ${correo.espera} s` : correo.enviado ? "Reenviar" : "Enviar enlace"}
      </button>
    ),
  });

  if (pedirNotificaciones) avisos.push({
    id: "notif", tono: "acento", icono: Bell,
    texto: "Activa las notificaciones para saber cuándo el SRI autoriza tus comprobantes.",
    acciones: (
      <>
        <button type="button" onClick={onPosponerNotificaciones} className="whitespace-nowrap rounded-md px-2 py-1 text-xs text-tenue hover:text-texto">
          Ahora no
        </button>
        <button type="button" onClick={onActivarNotificaciones} className="whitespace-nowrap rounded-md bg-boton px-2.5 py-1 text-xs font-semibold text-sobre-acento hover:bg-boton-hover">
          Activar
        </button>
      </>
    ),
  });

  if (sandbox && esCompu) avisos.push({
    id: "sandbox", tono: "sandbox", icono: FlaskConical,
    texto: <><strong>Modo sandbox:</strong> las facturas no van al SRI real ni tienen validez tributaria.</>,
    acciones: puedeProduccion ? (
      <button type="button" onClick={onSalirSandbox} className="whitespace-nowrap rounded-md px-2 py-1 text-xs font-semibold text-sandbox underline-offset-2 hover:underline">
        Salir
      </button>
    ) : undefined,
  });

  const pro = proOculto ? null : textoAvisoPro(pathname, empresa);
  if (pro) avisos.push({
    id: "pro", tono: "acento", icono: Sparkles,
    texto: pro,
    acciones: (
      <Link href="/planes" className="inline-flex items-center gap-1 whitespace-nowrap rounded-md px-2 py-1 text-xs font-semibold text-acento hover:underline underline-offset-2">
        Ver planes <ArrowRight size={12} aria-hidden />
      </Link>
    ),
    alCerrar: () => {
      setProOculto(true);
      try { sessionStorage.setItem(CLAVE_PRO_OCULTO, "1"); } catch {}
    },
  });

  if (avisos.length === 0) return null;

  const [principal, ...resto] = avisos;
  const visibles = desplegado ? avisos : [principal];

  return (
    <div role="status" aria-live="polite" className="shrink-0">
      {visibles.map((a, i) => {
        const t = TONOS[a.tono];
        const Icono = a.icono;
        const esPrincipal = i === 0;
        return (
          <div key={a.id} className={cn("flex w-full flex-wrap items-center gap-x-2 gap-y-1 border-b px-4 py-2 text-xs text-texto", t.fondo, t.borde)}>
            <Icono size={14} className={cn("shrink-0", t.icono)} aria-hidden />
            <span className="min-w-0 flex-1">
              {a.texto}
              {desplegado && a.detalle && <span className="mt-0.5 block text-tenue">{a.detalle}</span>}
            </span>
            {a.acciones && <span className="flex shrink-0 items-center gap-1">{a.acciones}</span>}
            {esPrincipal && (resto.length > 0 || a.detalle) && (
              <button
                type="button"
                onClick={() => setDesplegado(d => !d)}
                aria-expanded={desplegado}
                aria-label={desplegado ? "Ver menos avisos" : resto.length > 0 ? `Ver ${resto.length} aviso${resto.length > 1 ? "s" : ""} más` : "Ver detalle"}
                className="inline-flex shrink-0 items-center gap-0.5 rounded-md px-1.5 py-1 text-xs font-medium text-tenue hover:text-texto"
              >
                {!desplegado && resto.length > 0 && `+${resto.length}`}
                <ChevronDown size={14} className={cn("transition-transform duration-(--duracion-rapida)", desplegado && "rotate-180")} aria-hidden />
              </button>
            )}
            {a.alCerrar && (
              <button type="button" onClick={a.alCerrar} aria-label="Ocultar este aviso" className="shrink-0 rounded-md p-1 text-sutil hover:text-texto">
                <X size={14} aria-hidden />
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
