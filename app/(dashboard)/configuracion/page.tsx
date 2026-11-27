"use client";
// app/(dashboard)/configuracion/page.tsx
// Configuración como los Ajustes del teléfono:
//   - Celular: lista agrupada; cada fila abre su sección (?sec=empresa…) y
//     "atrás" vuelve a la lista.
//   - Compu: lista a la izquierda y la sección a la derecha.
// Tu cuenta y eliminarla son de la persona: se ven siempre, sin permisos (Apple
// y Google exigen que cualquier usuario pueda eliminar su cuenta). Lo de la
// empresa pide el permiso "configuracion".
// Los enlaces viejos (#firma, #cobros, #retenciones, #zona-de-riesgo) abren su sección.

import { useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Building2, ChevronRight, CircleUser, CreditCard, FileSignature, ImageIcon, Landmark, LogOut, Store, Trash2,
  UserCog, type LucideIcon,
} from "lucide-react";
import { auth } from "@/lib/firebase";
import { useLista } from "@/lib/useLista";
import type { HealthData } from "@/components/Checklist";
import { DatosEmpresa, ImpuestosEmpresa } from "@/components/configuracion/TabEmpresa";
import TabFirma from "@/components/configuracion/TabFirma";
import TabLogo from "@/components/configuracion/TabLogo";
import TabCobrosEnLinea from "@/components/configuracion/TabCobrosEnLinea";
import EliminarCuenta from "@/components/cuenta/EliminarCuenta";
import { tienePermiso } from "@/components/dashboard/DashboardNav";
import { EVENTO_CERRAR_SESION } from "@/components/shell/BarraSuperior";
import { Esqueleto } from "@/components/ui/Esqueleto";
import { cn } from "@/components/ui/cn";
import { useAuthStore } from "@/store/auth.store";
import { usePermiso } from "@/hooks/usePermiso";

type Sec = "empresa" | "logo" | "impuestos" | "firma" | "cobros" | "eliminar";

const TITULOS: Record<Sec, string> = {
  empresa:   "Datos de la empresa",
  logo:      "Logo de la empresa",
  impuestos: "Impuestos y leyendas",
  firma:     "Firma electrónica",
  cobros:    "Cobros en línea",
  eliminar:  "Eliminar mi cuenta",
};

const DE_EMPRESA: Sec[] = ["empresa", "logo", "impuestos", "firma", "cobros"];

// Enlaces de antes (y de los correos del backend) con ancla
const POR_ANCLA: Record<string, Sec> = {
  firma: "firma", cobros: "cobros", retenciones: "impuestos", "zona-de-riesgo": "eliminar",
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- forma de /emisor/config
type Config = { data?: { legal?: any; firma?: any; logo?: { configurado?: boolean; url?: string | null };
                         clasificacion_ia?: boolean } };
type Dashboard = { data?: { health?: HealthData | null } };

export default function ConfiguracionPage() {
  const router   = useRouter();
  const params   = useSearchParams();
  const puedeVer = usePermiso("configuracion");
  const empresa  = useAuthStore((s) => s.empresa);
  const updateEmpresa = useAuthStore((s) => s.updateEmpresa);
  const email    = useAuthStore((s) => s.email) ?? auth.currentUser?.email ?? "";

  const pedida = params.get("sec") as Sec | null;
  const sec: Sec | null = pedida && TITULOS[pedida] && (puedeVer || !DE_EMPRESA.includes(pedida)) ? pedida : null;
  // En la compu, sin sección elegida se ve la primera
  const secCompu: Sec | null = sec ?? (puedeVer ? "empresa" : null);

  // ── Datos de la empresa (los usan la lista y las secciones) ──
  const hoy = new Date().toLocaleDateString("en-CA", { timeZone: "America/Guayaquil" });
  const cfg  = useLista<Config>(puedeVer ? "/api/v1/app/emisor/config" : null);
  const dash = useLista<Dashboard>(puedeVer ? `/api/v1/app/dashboard?fecha_inicio=${hoy}&fecha_fin=${hoy}` : null);
  const legal = cfg.datos?.data?.legal ?? null;
  const firma = cfg.datos?.data?.firma ?? null;
  const logo  = cfg.datos?.data?.logo ?? null;
  const health = dash.datos?.data?.health ?? null;
  const recargar = () => { cfg.recargar(); dash.recargar(); };

  // El menú avisa si falta la firma: que vea lo mismo que esta pantalla
  const firmaOk = !!firma?.configurada && firma?.estado !== "EXPIRADA";
  useEffect(() => {
    if (!firma || !empresa || empresa.firma_ok === firmaOk) return;
    updateEmpresa({ ...empresa, firma_ok: firmaOk });
  }, [firma, firmaOk, empresa, updateEmpresa]);

  // Enlaces con ancla (#firma…): a su sección; #retenciones además baja hasta ahí
  useEffect(() => {
    const ancla = window.location.hash.slice(1);
    const destino = POR_ANCLA[ancla];
    if (destino && !pedida) router.replace(`/configuracion?sec=${destino}${ancla === "retenciones" ? "#retenciones" : ""}`);
  }, [pedida, router]);
  useEffect(() => {
    if (sec !== "impuestos" || !legal || window.location.hash !== "#retenciones") return;
    const t = setTimeout(() => document.getElementById("retenciones")?.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
    return () => clearTimeout(t);
  }, [sec, legal]);

  const subtitulo: Partial<Record<Sec, string>> = {
    empresa:   empresa ? `${empresa.razon_social} · ${empresa.ambiente === 2 ? "Producción" : "Pruebas"}` : undefined,
    logo:      cfg.datos ? (logo?.configurado ? "Sale en tus comprobantes" : "Sin logo") : undefined,
    impuestos: legal ? `IVA ${(legal.obligado_contabilidad === "SI" ? "MENSUAL" : legal.periodo_iva ?? "MENSUAL").toLowerCase()}`
                       + (legal.emite_retenciones ? " · emite retenciones" : "") : undefined,
    firma:     firma ? (firma.configurada ? firma.mensaje_vencimiento : "Sin configurar") : undefined,
    cobros:    "Payphone o PagoPlux",
  };

  const verEstructura = !!empresa && tienePermiso(empresa, ["emitir", "estructura"]);
  const verUsuarios   = !!empresa && tienePermiso(empresa, "usuarios");

  const lista = (
    <div className="space-y-6">
      {/* Tu cuenta */}
      <Grupo>
        <div className="flex min-h-14 items-center gap-3 px-4 py-3">
          <Icono icono={CircleUser} />
          <span className="min-w-0 flex-1">
            <span className="block text-xs text-sutil">Tu cuenta</span>
            <span className="block truncate text-sm font-medium text-texto">{email}</span>
          </span>
        </div>
      </Grupo>

      {puedeVer ? (
        <Grupo titulo="Empresa">
          <Fila sec="empresa"   activa={secCompu} icono={Building2}     subtitulo={subtitulo.empresa} />
          <Fila sec="logo"      activa={secCompu} icono={ImageIcon}     subtitulo={subtitulo.logo} />
          <Fila sec="impuestos" activa={secCompu} icono={Landmark}      subtitulo={subtitulo.impuestos} />
          <Fila sec="firma"     activa={secCompu} icono={FileSignature} subtitulo={subtitulo.firma}
                alerta={!!firma && !firmaOk} />
          <Fila sec="cobros"    activa={secCompu} icono={CreditCard}    subtitulo={subtitulo.cobros} />
        </Grupo>
      ) : (
        <p className="px-4 text-sm text-tenue">
          Los datos de la empresa, la firma electrónica y los cobros los configura el administrador.
        </p>
      )}

      {(verEstructura || verUsuarios) && (
        <Grupo titulo="Equipo">
          {verEstructura && <FilaEnlace href="/estructura" icono={Store}   texto="Establecimientos y puntos" />}
          {verUsuarios   && <FilaEnlace href="/usuarios"   icono={UserCog} texto="Usuarios" />}
        </Grupo>
      )}

      <Grupo titulo="Cuenta">
        <button
          type="button"
          onClick={() => window.dispatchEvent(new Event(EVENTO_CERRAR_SESION))}
          className="flex min-h-13 w-full items-center gap-3 px-4 text-left text-sm text-texto transition-colors hover:bg-presionado active:bg-presionado"
        >
          <Icono icono={LogOut} />
          <span className="flex-1 py-3">Cerrar sesión</span>
        </button>
        <Fila sec="eliminar" activa={secCompu} icono={Trash2} peligro />
      </Grupo>
    </div>
  );

  const seccion = (s: Sec) => (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-texto">{TITULOS[s]}</h2>
      {s === "eliminar" ? (
        <section className="space-y-3 rounded-xl border border-peligro/30 bg-superficie p-4">
          <p className="text-sm text-tenue">
            Eliminar tu cuenta borra tu usuario y tus datos. Si eres el único usuario de una empresa,
            también se eliminan la empresa y sus comprobantes. Antes de confirmar te mostramos qué
            pasará con cada una.
          </p>
          <EliminarCuenta onCancelar={() => router.push("/configuracion")} />
        </section>
      ) : cfg.cargando ? (
        <div className="space-y-3"><Esqueleto className="h-14" /><Esqueleto className="h-14" /><Esqueleto className="h-14" /></div>
      ) : s === "empresa" ? (
        <DatosEmpresa legal={legal} health={health} onActualizar={recargar}
                      conIa={!!cfg.datos?.data?.clasificacion_ia} />
      ) : s === "logo" ? (
        <TabLogo logo={logo} onActualizar={recargar} />
      ) : s === "impuestos" ? (
        // key: al llegar los datos nuevos, el formulario parte de ellos
        <ImpuestosEmpresa key={JSON.stringify(legal)} legal={legal} onActualizar={recargar} />
      ) : s === "firma" ? (
        <TabFirma firma={firma} onActualizar={recargar} />
      ) : (
        <TabCobrosEnLinea />
      )}
    </div>
  );

  return (
    <div className="mx-auto max-w-5xl p-4 pb-8 md:p-6">
      <h1 className="mb-6 hidden text-xl font-bold text-texto lg:block">Configuración</h1>

      <div className="lg:grid lg:grid-cols-[18rem_1fr] lg:items-start lg:gap-8">
        {/* Lista: en el celular solo si no hay sección abierta */}
        <div className={cn(sec && "hidden lg:block", "lg:sticky lg:top-4")}>{lista}</div>

        {/* Sección (una sola vez): celular la pedida; compu la pedida o la primera */}
        {secCompu ? (
          <div className={cn("min-w-0", !sec && "hidden lg:block")}>{seccion(secCompu)}</div>
        ) : (
          <p className="hidden pt-2 text-sm text-tenue lg:block">Elige una opción de la lista.</p>
        )}
      </div>
    </div>
  );
}

// ── Piezas de la lista ───────────────────────────────────────────────────────

function Grupo({ titulo, children }: { titulo?: string; children: React.ReactNode }) {
  return (
    <section>
      {titulo && <h2 className="mb-1.5 px-4 text-xs font-semibold uppercase tracking-wide text-sutil">{titulo}</h2>}
      <div className="divide-y divide-borde overflow-hidden rounded-xl border border-borde bg-superficie">{children}</div>
    </section>
  );
}

function Icono({ icono: I, peligro }: { icono: LucideIcon; peligro?: boolean }) {
  return (
    <span className={cn("inline-flex size-8 shrink-0 items-center justify-center rounded-lg",
                        peligro ? "bg-peligro-suave text-peligro" : "bg-acento-suave text-acento")}>
      <I size={17} aria-hidden />
    </span>
  );
}

/** Fila que abre una sección. En la compu se marca la que se está viendo. */
function Fila({ sec, activa, icono, subtitulo, peligro, alerta }: {
  sec: Sec; activa: Sec | null; icono: LucideIcon; subtitulo?: string; peligro?: boolean; alerta?: boolean;
}) {
  return (
    <Link
      href={`/configuracion?sec=${sec}`}
      aria-current={activa === sec ? "page" : undefined}
      className={cn(
        "flex min-h-13 items-center gap-3 px-4 py-2.5 transition-colors hover:bg-presionado active:bg-presionado",
        activa === sec && "lg:bg-presionado",
      )}
    >
      <Icono icono={icono} peligro={peligro} />
      <span className="min-w-0 flex-1">
        <span className={cn("block text-sm", peligro ? "text-peligro" : "text-texto")}>{TITULOS[sec]}</span>
        {subtitulo && (
          <span className={cn("block truncate text-xs", alerta ? "text-alerta-texto" : "text-sutil")}>{subtitulo}</span>
        )}
      </span>
      <ChevronRight size={18} className="shrink-0 text-sutil" aria-hidden />
    </Link>
  );
}

function FilaEnlace({ href, icono, texto }: { href: string; icono: LucideIcon; texto: string }) {
  return (
    <Link href={href}
          className="flex min-h-13 items-center gap-3 px-4 py-2.5 transition-colors hover:bg-presionado active:bg-presionado">
      <Icono icono={icono} />
      <span className="flex-1 text-sm text-texto">{texto}</span>
      <ChevronRight size={18} className="shrink-0 text-sutil" aria-hidden />
    </Link>
  );
}
