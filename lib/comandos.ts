// lib/comandos.ts
// Lo que se puede hacer desde la paleta de comandos (components/shell/PaletaComandos.tsx):
//   - Crear:    factura, notas, liquidación, retención, proforma, link de cobro,
//               compra, cliente o proveedor, producto.
//   - Ir a:     las pantallas del menú (components/dashboard/DashboardNav.ts), con
//               los mismos filtros que el menú lateral: permisos, plan, retenciones
//               y páginas que solo existen en la web.
//   - Acciones: cambiar de empresa, modo sandbox, tema, ayuda y cerrar sesión.
//
// La búsqueda no distingue tildes ni mayúsculas y pide que cada palabra escrita
// sea el comienzo de alguna palabra ("not cre" encuentra "Nueva nota de crédito").

"use client";

import { useEffect, useRef } from "react";
import {
  ArrowLeftRight, CircleHelp, ClipboardList, FilePlus2, FileText, FlaskConical, Keyboard, Link2, LogOut,
  Moon, Package, ShoppingCart, Sun, UserPlus, type LucideIcon,
} from "lucide-react";
import { NAV_GROUPS, aplicaALaEmpresa, bloqueadoPorPlan, tienePermiso } from "@/components/dashboard/DashboardNav";
import { ES_APP_NATIVA, esRutaSoloWeb, rutaFueraDelPlan } from "@/lib/plataforma";
import type { Empresa } from "@/store/auth.store";

export type GrupoComando = "Recientes" | "Crear" | "Ir a" | "Acciones";

export type AccionComando = "selector-empresa" | "sandbox" | "tema" | "cerrar-sesion" | "atajos";

export interface Comando {
  id:        string;
  grupo:     Exclude<GrupoComando, "Recientes">;
  titulo:    string;
  /** Texto gris a la derecha (p. ej. "Gestión" o "Activado"). */
  detalle?:  string;
  /** Otras palabras con que se encuentra ("cotización" para proforma). */
  claves?:   string;
  icono:     LucideIcon;
  /** Navegar a esa ruta. */
  href?:     string;
  /** Abrir el "nuevo" de esa página (personas, productos): ?nuevo=1 o EVENTO_NUEVO. */
  nuevo?:    boolean;
  accion?:   AccionComando;
}

// ── Crear ────────────────────────────────────────────────────────────────────

interface Creable {
  id: string; titulo: string; href: string; icono: LucideIcon; permiso: string | string[] | null;
  claves?: string; nuevo?: boolean; requierePro?: boolean; requiereRetenciones?: boolean;
}

const CREAR: Creable[] = [
  { id: "crear-fac", titulo: "Nueva factura", href: "/documentos/emitir/fac", icono: FilePlus2, permiso: "emitir",
    claves: "emitir vender venta fac" },
  { id: "crear-ncr", titulo: "Nueva nota de crédito", href: "/documentos/emitir/ncr", icono: FileText, permiso: "emitir",
    claves: "nc devolucion anular rebaja descuento" },
  { id: "crear-ndb", titulo: "Nueva nota de débito", href: "/documentos/emitir/ndb", icono: FileText, permiso: "emitir",
    claves: "nd interes mora cargo" },
  { id: "crear-liq", titulo: "Nueva liquidación de compra", href: "/documentos/emitir/liq", icono: FileText,
    permiso: "emitir", requierePro: true, claves: "liq comprar persona natural" },
  { id: "crear-ret", titulo: "Nueva retención", href: "/documentos/emitir/ret", icono: FileText,
    permiso: "emitir", requierePro: true, requiereRetenciones: true, claves: "ret retener" },
  { id: "crear-proforma", titulo: "Nueva proforma", href: "/proformas/nueva", icono: ClipboardList, permiso: "emitir",
    claves: "cotizacion presupuesto" },
  { id: "crear-cobro", titulo: "Nuevo link de cobro", href: "/documentos/emitir/fac?cuando=al_pagar", icono: Link2,
    permiso: "emitir", claves: "cobrar pago tarjeta payphone pagoplux" },
  { id: "crear-compra", titulo: "Registrar compra", href: "/documentos/recibidos/nueva", icono: ShoppingCart,
    permiso: "documentos_recibidos", claves: "recibido gasto factura proveedor" },
  { id: "crear-persona", titulo: "Nuevo cliente o proveedor", href: "/personas", icono: UserPlus, permiso: "clientes",
    nuevo: true, claves: "persona contacto" },
  { id: "crear-producto", titulo: "Nuevo producto", href: "/productos", icono: Package, permiso: "productos",
    nuevo: true, claves: "servicio item catalogo" },
];

// Nombres más claros que los del menú lateral, para buscar
const TITULO_IR: Record<string, string> = {
  "/dashboard":            "Inicio",
  "/documentos":           "Comprobantes emitidos",
  "/documentos/recibidos": "Comprobantes recibidos (compras)",
  "/estructura":           "Establecimientos y puntos de emisión",
};
const CLAVES_IR: Record<string, string> = {
  "/dashboard":     "dashboard panel resumen",
  "/documentos":    "documentos facturas ventas",
  "/reportes":      "declaracion iva ats renta",
  "/configuracion": "ajustes firma empresa ruc",
  "/personas":      "clientes proveedores",
  "/cuentas":       "cobrar pagar saldos",
};

/** Lo que la empresa puede usar (mismas reglas que el menú lateral). */
function visible(empresa: Empresa, item: { href: string; permiso?: string | string[] | null; requierePro?: boolean; requiereRetenciones?: boolean }): boolean {
  if (!tienePermiso(empresa, item.permiso ?? null)) return false;
  if (!aplicaALaEmpresa(item, empresa)) return false;
  if (ES_APP_NATIVA && (esRutaSoloWeb(item.href) || rutaFueraDelPlan(item.href, empresa) || bloqueadoPorPlan(item, empresa))) return false;
  return true;
}

export function comandosDisponibles({ empresa, varias, sandbox, puedeSandbox, temaOscuro, conTeclado = false }: {
  empresa:      Empresa;
  /** Tiene más de una empresa: se ofrece cambiar. */
  varias:       boolean;
  sandbox:      boolean;
  /** Firma lista y empresa en producción (mismas reglas que el menú). */
  puedeSandbox: boolean;
  temaOscuro:   boolean;
  /** Hay mouse/teclado (compu): se ofrece la lista de atajos. */
  conTeclado?:  boolean;
}): Comando[] {
  const crear: Comando[] = CREAR.filter(c => visible(empresa, c)).map(c => ({
    id: c.id, grupo: "Crear", titulo: c.titulo, claves: c.claves, icono: c.icono, href: c.href, nuevo: c.nuevo,
  }));

  // Ir a: lo del menú, sin las de "Emitir" (ya están en Crear)
  const irA: Comando[] = [];
  for (const g of NAV_GROUPS) {
    const grupo = g as { label?: string; base?: string; permiso?: string | string[] | null;
      items?: { href: string; label: string; icon: LucideIcon; permiso?: string | string[] | null }[];
      children?: { href: string; label: string; icon: LucideIcon; permiso?: string | string[] | null }[] };
    if (grupo.base === "/documentos/emitir") continue;
    if (grupo.permiso !== undefined && !tienePermiso(empresa, grupo.permiso ?? null)) continue;
    for (const i of [...(grupo.items ?? []), ...(grupo.children ?? [])]) {
      if (!visible(empresa, i)) continue;
      irA.push({
        id: `ir-${i.href}`, grupo: "Ir a", titulo: TITULO_IR[i.href] ?? i.label,
        claves: `${i.label} ${CLAVES_IR[i.href] ?? ""}`, icono: i.icon, href: i.href,
      });
    }
  }

  const acciones: Comando[] = [];
  if (varias) acciones.push({ id: "accion-empresa", grupo: "Acciones", titulo: "Cambiar de empresa",
    icono: ArrowLeftRight, accion: "selector-empresa", claves: "empresa ruc" });
  if (puedeSandbox) acciones.push({ id: "accion-sandbox", grupo: "Acciones",
    titulo: sandbox ? "Desactivar el modo sandbox" : "Activar el modo sandbox",
    detalle: sandbox ? "Activado" : undefined, icono: FlaskConical, accion: "sandbox", claves: "pruebas sandbox" });
  acciones.push({ id: "accion-tema", grupo: "Acciones", titulo: temaOscuro ? "Cambiar a tema claro" : "Cambiar a tema oscuro",
    icono: temaOscuro ? Sun : Moon, accion: "tema", claves: "apariencia modo oscuro claro" });
  if (conTeclado) acciones.push({ id: "accion-atajos", grupo: "Acciones", titulo: "Ver atajos de teclado",
    icono: Keyboard, accion: "atajos", claves: "teclas teclado shortcuts ayuda" });
  acciones.push({ id: "accion-ayuda", grupo: "Acciones", titulo: "Centro de Ayuda", icono: CircleHelp,
    href: "/ayuda", claves: "ayuda guias soporte" });
  acciones.push({ id: "accion-salir", grupo: "Acciones", titulo: "Cerrar sesión", icono: LogOut,
    accion: "cerrar-sesion", claves: "salir logout" });

  return [...crear, ...irA, ...acciones];
}

// ── Búsqueda ─────────────────────────────────────────────────────────────────

/** Sin tildes ni mayúsculas: "Crédito" → "credito". */
export function normalizar(texto: string): string {
  return texto.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
}

/**
 * Los que tienen todas las palabras escritas (como comienzo de palabra), mejor
 * los que empiezan igual. Sin texto, la lista tal cual.
 */
export function filtrarComandos(comandos: Comando[], consulta: string): Comando[] {
  const palabras = normalizar(consulta).split(/\s+/).filter(Boolean);
  if (palabras.length === 0) return comandos;
  return comandos
    .map((c) => {
      const titulo = normalizar(c.titulo);
      // Cada palabra escrita tiene que ser el comienzo de alguna palabra ("and" no
      // encuentra "sandbox"; "not cre" sí encuentra "nota de crédito")
      const palabrasDe = `${titulo} ${normalizar(c.claves ?? "")}`.split(/[\s()/]+/);
      if (!palabras.every(p => palabrasDe.some(w => w.startsWith(p)))) return null;
      // Puntaje: título que empieza con lo escrito > palabra del título que empieza > en las claves
      const p0 = palabras[0];
      const puntos = titulo.startsWith(p0) ? 0
        : titulo.split(/\s+/).some(w => w.startsWith(p0)) ? 1
        : titulo.includes(p0) ? 2 : 3;
      return { c, puntos };
    })
    .filter((x): x is { c: Comando; puntos: number } => x !== null)
    .sort((a, b) => a.puntos - b.puntos)
    .map(x => x.c);
}

// ── Recientes (en este dispositivo) ──────────────────────────────────────────

const CLAVE_RECIENTES = "kipu:comandos-recientes";
const MAX_RECIENTES = 5;

export function leerRecientes(): string[] {
  try { return JSON.parse(localStorage.getItem(CLAVE_RECIENTES) ?? "[]") as string[]; }
  catch { return []; }
}

export function recordarComando(id: string) {
  try {
    const lista = [id, ...leerRecientes().filter(r => r !== id)].slice(0, MAX_RECIENTES);
    localStorage.setItem(CLAVE_RECIENTES, JSON.stringify(lista));
  } catch {}
}

// ── "Nuevo" de una página (personas, productos) ──────────────────────────────

/** La paleta lo dispara si ya estás en la página; si no, navega con ?nuevo=1. */
export const EVENTO_NUEVO = "kipu:nuevo";

/**
 * Para las páginas con su propio "nuevo" en una hoja: lo abre si se llegó con
 * ?nuevo=1 (y lo quita de la URL) o si la paleta lo pide estando ya ahí.
 */
export function useNuevoDesdePaleta(abrir: () => void) {
  const ref = useRef(abrir);
  useEffect(() => { ref.current = abrir; });

  useEffect(() => {
    const url = new URL(window.location.href);
    if (url.searchParams.get("nuevo") !== "1") return;
    // Después del primer render (y sin ?nuevo, para que atrás o recargar no lo reabran)
    const t = setTimeout(() => {
      url.searchParams.delete("nuevo");
      window.history.replaceState(window.history.state, "", url.pathname + url.search + url.hash);
      ref.current();
    }, 0);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    const alPedir = () => ref.current();
    window.addEventListener(EVENTO_NUEVO, alPedir);
    return () => window.removeEventListener(EVENTO_NUEVO, alPedir);
  }, []);
}
