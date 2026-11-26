// app/(dashboard)/mas/page.tsx
// Pestaña "Más" del celular: lista agrupada estilo Ajustes con todo lo que no
// es Inicio, Documentos, Emitir o Personas. Mismos filtros que el menú lateral:
// permisos, plan (en la app de las tiendas) y páginas que solo existen en la web.

"use client";

import Link from "next/link";
import { useTheme } from "next-themes";
import {
  CalendarCheck, ChevronRight, FlaskConical, HelpCircle, LogOut, ShieldCheck, type LucideIcon,
} from "lucide-react";
import { itemDelMenu, tienePermiso } from "@/components/dashboard/DashboardNav";
import { EVENTO_CERRAR_SESION, EVENTO_SELECTOR_EMPRESA } from "@/components/shell/BarraSuperior";
import { useEsCliente } from "@/components/ui/Hoja";
import { cn } from "@/components/ui/cn";
import Interruptor from "@/components/ui/Interruptor";
import { ES_APP_NATIVA, esRutaSoloWeb, nombrePlan, rutaFueraDelPlan } from "@/lib/plataforma";
import { useAuthStore } from "@/store/auth.store";
import { useSandboxStore } from "@/store/sandbox.store";

interface Item { href: string; etiqueta: string; icono: LucideIcon; permiso: string | string[] | null }

// Solo el nombre es propio de esta lista: ícono y permiso, los del menú lateral
function delMenu(href: string, etiqueta: string): Item {
  const { icon, permiso } = itemDelMenu(href);
  return { href, etiqueta, icono: icon, permiso };
}

const GRUPOS: { titulo: string; items: Item[] }[] = [
  { titulo: "Gestión", items: [
    delMenu("/cuentas",   "Cuentas por cobrar y pagar"),
    delMenu("/proformas", "Proformas"),
    delMenu("/cobros",    "Links de cobro"),
    delMenu("/reportes",  "Reportes y declaraciones"),
  ]},
  { titulo: "Empresa", items: [
    delMenu("/estructura",    "Establecimientos y puntos"),
    delMenu("/usuarios",      "Usuarios"),
    delMenu("/auditoria",     "Auditoría"),
    delMenu("/api-keys",      "API Keys"),
    delMenu("/configuracion", "Configuración"),
  ]},
  { titulo: "Servicios", items: [
    delMenu("/al-dia", "Kipu Al Día"),
    delMenu("/planes", "Planes y pagos"),
  ]},
];

function Fila({ href, icono: Icono, children, peligro, onClick }: {
  href?: string; icono: LucideIcon; children: React.ReactNode; peligro?: boolean; onClick?: () => void;
}) {
  const clases = cn(
    "flex min-h-13 w-full items-center gap-3 px-4 text-left text-sm transition-colors active:bg-presionado hover:bg-presionado",
    peligro ? "text-peligro" : "text-texto",
  );
  const contenido = (
    <>
      <span className={cn("inline-flex size-8 shrink-0 items-center justify-center rounded-lg",
                          peligro ? "bg-peligro-suave" : "bg-acento-suave text-acento")}>
        <Icono size={17} aria-hidden />
      </span>
      <span className="flex-1 py-3">{children}</span>
      {href && <ChevronRight size={18} className="shrink-0 text-sutil" aria-hidden />}
    </>
  );
  return href
    ? <Link href={href} className={clases}>{contenido}</Link>
    : <button type="button" onClick={onClick} className={clases}>{contenido}</button>;
}

function Grupo({ titulo, children }: { titulo?: string; children: React.ReactNode }) {
  return (
    <section>
      {titulo && <h2 className="mb-1.5 px-4 text-xs font-semibold uppercase tracking-wide text-sutil">{titulo}</h2>}
      <div className="overflow-hidden rounded-xl border border-borde bg-superficie divide-y divide-borde">
        {children}
      </div>
    </section>
  );
}

const TEMAS = ES_APP_NATIVA
  ? [{ valor: "system", etiqueta: "Sistema" }, { valor: "light", etiqueta: "Claro" }, { valor: "dark", etiqueta: "Oscuro" }]
  : [{ valor: "light", etiqueta: "Claro" }, { valor: "dark", etiqueta: "Oscuro" }];

export default function MasPage() {
  const empresa     = useAuthStore((s) => s.empresa);
  const role        = useAuthStore((s) => s.role);
  const equipoAlDia = useAuthStore((s) => s.equipoAlDia);
  const { activo: sandbox, setSandbox } = useSandboxStore();
  const { theme, setTheme } = useTheme();
  const esCliente = useEsCliente();

  if (!empresa) return null;

  const visible = (i: Item) =>
    tienePermiso(empresa, i.permiso) &&
    !rutaFueraDelPlan(i.href, empresa) &&
    !(ES_APP_NATIVA && esRutaSoloWeb(i.href));

  const planGratis = !empresa.suscripcion_activa && !!empresa.emision_gratis;
  const plan = nombrePlan(empresa);   // en la app, sin "Gratis" ni "Kipu Pro"
  const firmaOk = empresa.firma_ok ?? false;
  const puedeProduccion = firmaOk && empresa.ambiente === 2;

  return (
    <div className="mx-auto max-w-xl space-y-6 p-4 pb-8">
      {/* Empresa activa */}
      <button
        type="button"
        onClick={() => window.dispatchEvent(new Event(EVENTO_SELECTOR_EMPRESA))}
        className="flex w-full items-center gap-3 rounded-xl border border-borde bg-superficie p-4 text-left transition-colors active:bg-presionado hover:bg-presionado"
      >
        <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-xl bg-boton text-lg font-bold text-sobre-acento">
          {(empresa.nombre_comercial || empresa.razon_social || "K")[0]}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate font-semibold text-texto">{empresa.nombre_comercial || empresa.razon_social}</span>
          <span className="block text-xs text-sutil">
            RUC {empresa.ruc}{plan && <> · {plan}{planGratis ? " (facturas gratis)" : ""}</>} · {empresa.ambiente === 2 ? "Producción" : "Pruebas"}
          </span>
        </span>
        <span className="shrink-0 text-xs font-medium text-acento">Cambiar</span>
      </button>

      {GRUPOS.map(g => {
        const items = g.items.filter(visible);
        if (items.length === 0) return null;
        return (
          <Grupo key={g.titulo} titulo={g.titulo}>
            {items.map(i => <Fila key={i.href} href={i.href} icono={i.icono}>{i.etiqueta}</Fila>)}
          </Grupo>
        );
      })}

      {/* Herramientas internas: solo en la web */}
      {!ES_APP_NATIVA && (equipoAlDia || role === "superadmin") && (
        <Grupo titulo="Equipo Kipu">
          {equipoAlDia && <Fila href="/equipo" icono={CalendarCheck}>Equipo Al Día</Fila>}
          {role === "superadmin" && <Fila href="/admin" icono={ShieldCheck}>Administración</Fila>}
        </Grupo>
      )}

      <Grupo titulo="Preferencias">
        {/* Sandbox: mismas reglas que el menú lateral */}
        {firmaOk && (
          <Interruptor
            className="min-h-13 px-4"
            tono="sandbox"
            inicio={
              <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg bg-sandbox-suave text-sandbox">
                <FlaskConical size={17} aria-hidden />
              </span>
            }
            etiqueta="Modo sandbox"
            descripcion={puedeProduccion ? "Comprobantes de prueba, sin validez tributaria" : "Tu empresa aún está en pruebas"}
            activo={sandbox}
            deshabilitado={!puedeProduccion}
            onCambio={setSandbox}
          />
        )}
        {/* Tema */}
        <div className="flex min-h-13 items-center gap-3 px-4 py-2 text-sm">
          <span className="flex-1 text-texto">Apariencia</span>
          <div role="radiogroup" aria-label="Apariencia" className="flex rounded-lg bg-presionado p-0.5">
            {TEMAS.map(t => {
              const activo = esCliente && (theme ?? (ES_APP_NATIVA ? "system" : "light")) === t.valor;
              return (
                <button
                  key={t.valor}
                  type="button"
                  role="radio"
                  aria-checked={activo}
                  onClick={() => setTheme(t.valor)}
                  className={cn(
                    "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                    activo ? "bg-superficie text-texto shadow-sm" : "text-tenue",
                  )}
                >
                  {t.etiqueta}
                </button>
              );
            })}
          </div>
        </div>
      </Grupo>

      <Grupo>
        <Fila href="/ayuda" icono={HelpCircle}>Centro de Ayuda</Fila>
        <Fila icono={LogOut} peligro onClick={() => window.dispatchEvent(new Event(EVENTO_CERRAR_SESION))}>
          Cerrar sesión
        </Fila>
      </Grupo>
    </div>
  );
}
