// components/shell/PaletaComandos.tsx
// Paleta de comandos: Ctrl+K (⌘K en Mac) desde cualquier pantalla del panel,
// el botón "Buscar…" del menú lateral o la lupa de la barra superior del celular.
// Se escribe para crear, ir a una pantalla o hacer una acción (lib/comandos.ts);
// flechas para moverse, Enter para abrir, Esc para cerrar.
//   - Compu: ventana arriba al centro. Celular: pantalla completa.
//   - Sin escribir: lo último que se eligió y luego todo, por grupos.
//   - Escribiendo (2 letras o más) busca también comprobantes, personas y
//     productos, según los permisos: el comprobante se abre (en la compu ancha,
//     en el panel de Documentos), la persona en su ficha y el producto en una
//     factura nueva ya cargado.
// Se monta una vez en app/(dashboard)/layout.tsx.
// Aquí vive también la hoja de atajos de teclado ("?" o "Ver atajos" en la paleta):
// los generales, los de emitir y los de la pantalla activa (lib/useAtajos.ts).

"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { usePathname, useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { CornerDownLeft, FileText, Loader2, Package, Search, User } from "lucide-react";
import {
  comandosDisponibles, filtrarComandos, leerRecientes, recordarComando, EVENTO_NUEVO,
  type Comando, type GrupoComando,
} from "@/lib/comandos";
import { useCapaAtras } from "@/lib/botonAtras";
import { useAtajosVisibles } from "@/lib/useAtajos";
import Hoja from "@/components/ui/Hoja";
import api from "@/lib/api";
import { rutas } from "@/lib/rutas";
import { tienePermiso } from "@/components/dashboard/DashboardNav";
import { useAuthStore } from "@/store/auth.store";
import { useSandboxStore } from "@/store/sandbox.store";
import { EVENTO_CERRAR_SESION, EVENTO_SELECTOR_EMPRESA } from "@/components/shell/BarraSuperior";
import { cn } from "@/components/ui/cn";

/** Abre la paleta desde un botón: window.dispatchEvent(new Event(EVENTO_PALETA)). */
export const EVENTO_PALETA = "kipu:abrir-paleta";
/** Abre la hoja de atajos de teclado. */
export const EVENTO_ATAJOS = "kipu:ver-atajos";

const ES_MAC = typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.userAgent);
/** Texto del atajo para mostrar en botones ("⌘K" o "Ctrl K"). */
export const ATAJO_PALETA = ES_MAC ? "⌘K" : "Ctrl K";

/** ¿Se está escribiendo? (ahí "?" es un carácter, no el atajo) */
function escribiendo(el: EventTarget | null): boolean {
  if (!(el instanceof HTMLElement)) return false;
  return /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName) || el.isContentEditable;
}

export default function PaletaComandos() {
  const [abierta, setAbierta] = useState(false);
  const [verAtajos, setVerAtajos] = useState(false);
  const abiertaRef = useRef(abierta);
  useEffect(() => { abiertaRef.current = abierta; });

  useEffect(() => {
    // Ctrl/⌘+K abre o cierra, también escribiendo en un campo
    const alTeclear = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey) || e.altKey || e.shiftKey || e.key.toLowerCase() !== "k") return;
      // Con otra ventana abierta (una hoja) no se encima
      if (!abiertaRef.current && document.querySelector('[role="dialog"][aria-modal="true"]')) return;
      e.preventDefault();
      setAbierta(a => !a);
    };
    // "?" muestra los atajos (sin escribir en un campo y sin otra ventana abierta)
    const alPregunta = (e: KeyboardEvent) => {
      if (e.key !== "?" || e.ctrlKey || e.metaKey || e.altKey || e.isComposing) return;
      if (escribiendo(e.target) || document.querySelector('[role="dialog"][aria-modal="true"]')) return;
      e.preventDefault();
      setVerAtajos(true);
    };
    const alPedir = () => setAbierta(true);
    const alPedirAtajos = () => setVerAtajos(true);
    window.addEventListener("keydown", alTeclear);
    window.addEventListener("keydown", alPregunta);
    window.addEventListener(EVENTO_PALETA, alPedir);
    window.addEventListener(EVENTO_ATAJOS, alPedirAtajos);
    return () => {
      window.removeEventListener("keydown", alTeclear);
      window.removeEventListener("keydown", alPregunta);
      window.removeEventListener(EVENTO_PALETA, alPedir);
      window.removeEventListener(EVENTO_ATAJOS, alPedirAtajos);
    };
  }, []);

  return (
    <>
      {/* Se monta al abrir: cada vez empieza vacía y con el primero marcado */}
      {abierta && <Ventana onCerrar={() => setAbierta(false)} />}
      <HojaAtajos abierta={verAtajos} onCerrar={() => setVerAtajos(false)} />
    </>
  );
}

// ── Hoja de atajos ───────────────────────────────────────────────────────────

const NOMBRE_TECLA: Record<string, string> = {
  ArrowDown: "↓", ArrowUp: "↑", Escape: "Esc", Enter: "Enter",
};

function HojaAtajos({ abierta, onCerrar }: { abierta: boolean; onCerrar: () => void }) {
  const dePantalla = useAtajosVisibles();
  const mod = ES_MAC ? "⌘" : "Ctrl";
  // combo: teclas juntas (Ctrl + K); si no, alternativas (j o ↓)
  const grupos: { titulo: string; filas: { teclas: string[]; texto: string; combo?: boolean }[] }[] = [
    { titulo: "En todo el panel", filas: [
      { teclas: [mod, "K"], combo: true, texto: "Paleta: crear, ir a una pantalla o buscar" },
      { teclas: ["?"],      texto: "Ver estos atajos" },
      { teclas: ["Esc"],    texto: "Cerrar la ventana de arriba" },
    ] },
    { titulo: "Al emitir o guardar", filas: [
      { teclas: [mod, "Enter"], combo: true, texto: "Emitir sin ir al botón (también desde un campo)" },
    ] },
    ...(dePantalla.length ? [{ titulo: "En esta pantalla", filas: dePantalla }] : []),
  ];

  return (
    <Hoja abierta={abierta} onCerrar={onCerrar} titulo="Atajos de teclado" tamano="sm">
      <div className="space-y-5">
        {grupos.map(g => (
          <section key={g.titulo}>
            <h3 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-sutil">{g.titulo}</h3>
            <dl className="divide-y divide-borde">
              {g.filas.map(f => (
                <div key={f.texto} className="flex items-center justify-between gap-4 py-2">
                  <dt className="text-sm text-texto">{f.texto}</dt>
                  <dd className="flex shrink-0 items-center gap-1 text-xs text-sutil">
                    {f.teclas.map((t, i) => (
                      <span key={t} className="flex items-center gap-1">
                        {i > 0 && <span>{"combo" in f && f.combo ? "+" : "o"}</span>}
                        <Tecla>{NOMBRE_TECLA[t] ?? t}</Tecla>
                      </span>
                    ))}
                  </dd>
                </div>
              ))}
            </dl>
          </section>
        ))}
      </div>
    </Hoja>
  );
}

const ORDEN: Exclude<GrupoComando, "Recientes">[] = ["Crear", "Ir a", "Acciones"];

/** Un comando o un dato encontrado (comprobante, persona, producto). */
type Resultado = Omit<Comando, "grupo"> & { grupo: string; subtitulo?: string; ejecutar?: () => void };
type Seccion = { grupo: string | null; items: Resultado[] };

const MINIMO_BUSQUEDA = 2;
const POR_TIPO = 5;
// Lista y detalle lado a lado desde este ancho (app/(dashboard)/documentos/page.tsx)
const ANCHO_PANEL = "(min-width: 1280px)";
const FAC = "/documentos/emitir/fac";

const fmt = (n: unknown) => (Number(n) || 0).toFixed(2);

// Filas de los listados (solo lo que se muestra)
interface DocFila { id: string; numero_doc: string; tipo_doc?: string; razon_social?: string; importe_total?: number }
interface PersonaFila { id: string; razon_social: string; identificacion?: string }
interface ProductoFila {
  id: string; codigo?: string; descripcion: string; precio: number; tipo_iva?: string; unidad?: string;
}

function Ventana({ onCerrar }: { onCerrar: () => void }) {
  const router   = useRouter();
  const pathname = usePathname();
  const empresa  = useAuthStore((s) => s.empresa);
  const varias   = useAuthStore((s) => s.empresas.length > 1);
  const { activo: sandbox, setSandbox } = useSandboxStore();
  const { resolvedTheme, setTheme } = useTheme();
  const temaOscuro = resolvedTheme === "dark";

  const [consulta, setConsulta] = useState("");
  const [marcado,  setMarcado]  = useState(0);
  const [recientes] = useState(leerRecientes);
  // Lo encontrado en el servidor para la consulta `q` (si es otra, todavía no llegó)
  const [datos, setDatos] = useState<{ q: string; secciones: Seccion[] } | null>(null);
  const id      = useId();
  const listaRef = useRef<HTMLUListElement>(null);

  // Botón atrás de Android: cierra la paleta
  useCapaAtras(true, onCerrar);

  // El fondo no se desplaza y, al cerrar, el foco vuelve a donde estaba
  useEffect(() => {
    const previo = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = overflow;
      if (previo && document.contains(previo)) previo.focus({ preventScroll: true });
    };
  }, []);

  const [conTeclado] = useState(() => window.matchMedia("(pointer: fine)").matches);
  const comandos = useMemo(() => empresa ? comandosDisponibles({
    empresa, varias, sandbox, temaOscuro, conTeclado,
    puedeSandbox: !!empresa.firma_ok && empresa.ambiente === 2,
  }) : [], [empresa, varias, sandbox, temaOscuro, conTeclado]);

  // ── Comprobantes, personas y productos (escribiendo) ─────────────────────────
  const q = consulta.trim();
  const buscaDocs      = !!empresa && tienePermiso(empresa, "descargar");
  const buscaPersonas  = !!empresa && tienePermiso(empresa, "clientes");
  const buscaProductos = !!empresa && tienePermiso(empresa, "productos");
  const puedeFacturar  = !!empresa && tienePermiso(empresa, "emitir") && pathname !== FAC;

  useEffect(() => {
    if (q.length < MINIMO_BUSQUEDA || !(buscaDocs || buscaPersonas || buscaProductos)) return;
    let vigente = true;
    const t = setTimeout(async () => {
      const enc = encodeURIComponent(q);
      const pedir = <T,>(activo: boolean, url: string): Promise<T[]> => !activo ? Promise.resolve([])
        : api.get(url).then(r => ((r.data?.data ?? r.data ?? []) as T[]).slice(0, POR_TIPO)).catch(() => []);
      const [docs, personas, productos] = await Promise.all([
        pedir<DocFila>(buscaDocs, `/api/v1/app/documentos?q=${enc}&limit=${POR_TIPO}`),
        pedir<PersonaFila>(buscaPersonas, `/api/v1/app/clientes?q=${enc}`),
        pedir<ProductoFila>(buscaProductos, `/api/v1/app/productos?q=${enc}&limit=${POR_TIPO}&incluir_inactivos=false`),
      ]);
      if (!vigente) return;

      const secciones: Seccion[] = [];
      if (docs.length) secciones.push({ grupo: "Comprobantes", items: docs.map(d => ({
        id: `doc-${d.id}`, grupo: "Comprobantes", icono: FileText,
        titulo: `${d.tipo_doc ?? ""} ${d.numero_doc}`.trim(), subtitulo: d.razon_social,
        detalle: d.importe_total != null ? `$${fmt(d.importe_total)}` : undefined,
        ejecutar: () => router.push(window.matchMedia(ANCHO_PANEL).matches
          ? `/documentos?sel=${encodeURIComponent(d.id)}` : rutas.documento(d.id)),
      })) });
      if (personas.length) secciones.push({ grupo: "Personas", items: personas.map(p => ({
        id: `persona-${p.id}`, grupo: "Personas", icono: User, titulo: p.razon_social, subtitulo: p.identificacion,
        ejecutar: () => router.push(rutas.persona(p.id)),
      })) });
      if (productos.length) secciones.push({ grupo: "Productos", items: productos.map(p => ({
        id: `producto-${p.id}`, grupo: "Productos", icono: Package, titulo: p.descripcion, subtitulo: p.codigo || undefined,
        detalle: `$${fmt(p.precio)}${puedeFacturar ? " · facturar" : ""}`,
        ejecutar: () => {
          if (!puedeFacturar) { router.push("/productos"); return; }
          // Factura nueva con el producto ya cargado (fac/page.tsx lee kipu:prefill)
          sessionStorage.setItem("kipu:prefill", JSON.stringify({ items: [{
            codigo: p.codigo ?? "", descripcion: p.descripcion, cantidad: 1, precio: p.precio,
            descuento: 0, tipo_descuento: "$", tipo_iva: p.tipo_iva ?? "15", unidad: p.unidad ?? "UNIDAD",
          }] }));
          router.push(FAC);
        },
      })) });
      setDatos({ q, secciones });
    }, 250);
    return () => { vigente = false; clearTimeout(t); };
  }, [q, buscaDocs, buscaPersonas, buscaProductos, puedeFacturar, router]);

  const buscandoDatos = q.length >= MINIMO_BUSQUEDA && (buscaDocs || buscaPersonas || buscaProductos) && datos?.q !== q;

  // Secciones a la vista: sin escribir, recientes y luego por grupo; escribiendo, por relevancia
  const secciones = useMemo((): Seccion[] => {
    if (q) {
      const encontrados = datos?.q === q ? datos.secciones : [];
      return [{ grupo: null, items: filtrarComandos(comandos, q) as Resultado[] }, ...encontrados]
        .filter(s => s.items.length > 0);
    }
    const porId = new Map(comandos.map(c => [c.id, c]));
    const rec = recientes.map(r => porId.get(r)).filter((c): c is Comando => !!c);
    const usados = new Set(rec.map(c => c.id));
    return [
      { grupo: "Recientes" as GrupoComando, items: rec },
      ...ORDEN.map(g => ({ grupo: g as GrupoComando, items: comandos.filter(c => c.grupo === g && !usados.has(c.id)) })),
    ].filter(s => s.items.length > 0);
  }, [comandos, q, datos, recientes]);

  const items = useMemo(() => secciones.flatMap(s => s.items), [secciones]);
  // Dónde empieza cada sección en la lista plana (para las flechas)
  const inicios = useMemo(() => {
    let n = 0;
    return secciones.map(s => { const i = n; n += s.items.length; return i; });
  }, [secciones]);
  const actual = Math.min(marcado, Math.max(0, items.length - 1));

  // El marcado siempre a la vista
  useEffect(() => {
    listaRef.current?.querySelector(`[data-indice="${actual}"]`)?.scrollIntoView({ block: "nearest" });
  }, [actual]);

  const ejecutar = (c: Resultado) => {
    onCerrar();
    if (c.ejecutar) { c.ejecutar(); return; }
    recordarComando(c.id);
    if (c.href) {
      if (c.nuevo) {
        // Ya está en la página: que abra su "nuevo"; si no, que lo abra al llegar
        if (pathname === c.href) window.dispatchEvent(new Event(EVENTO_NUEVO));
        else router.push(`${c.href}?nuevo=1`);
      } else {
        router.push(c.href);
      }
      return;
    }
    switch (c.accion) {
      case "selector-empresa": window.dispatchEvent(new Event(EVENTO_SELECTOR_EMPRESA)); break;
      case "cerrar-sesion":    window.dispatchEvent(new Event(EVENTO_CERRAR_SESION)); break;
      case "sandbox":          setSandbox(!sandbox); break;
      case "tema":             setTheme(temaOscuro ? "light" : "dark"); break;
      case "atajos":           window.dispatchEvent(new Event(EVENTO_ATAJOS)); break;
    }
  };

  const alTeclear = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setMarcado(items.length ? (actual + 1) % items.length : 0); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setMarcado(items.length ? (actual - 1 + items.length) % items.length : 0); }
    else if (e.key === "Home") { e.preventDefault(); setMarcado(0); }
    else if (e.key === "End") { e.preventDefault(); setMarcado(Math.max(0, items.length - 1)); }
    else if (e.key === "Enter") { e.preventDefault(); if (items[actual]) ejecutar(items[actual]); }
    else if (e.key === "Escape") { e.preventDefault(); onCerrar(); }
    else if (e.key === "Tab") { e.preventDefault(); }   // el foco se queda en el buscador
  };

  return createPortal(
    <div className="fixed inset-0 z-(--capa-hoja) flex justify-center sm:items-start sm:p-4 sm:pt-[12vh]">
      {/* Fondo */}
      <div aria-hidden onClick={onCerrar}
           className="absolute inset-0 bg-black/50 opacity-100 transition-opacity duration-(--duracion-base) starting:opacity-0" />

      <div
        role="dialog"
        aria-modal="true"
        aria-label="Buscar acciones y pantallas"
        className={cn(
          "relative flex w-full flex-col overflow-hidden bg-superficie text-texto shadow-(--sombra-flotante)",
          // Celular: pantalla completa (respetando la muesca); compu: ventana
          "h-full pt-(--sa-top) sm:h-auto sm:max-h-[70vh] sm:max-w-xl sm:rounded-2xl sm:pt-0",
          "transition-[transform,opacity] duration-(--duracion-base) ease-enfasis starting:opacity-0 sm:starting:scale-95",
        )}
      >
        {/* Buscador */}
        <div className="flex items-center gap-3 border-b border-borde px-4">
          <Search size={18} className="shrink-0 text-sutil" aria-hidden />
          <input
            autoFocus
            role="combobox"
            aria-expanded="true"
            aria-controls={`${id}-lista`}
            aria-activedescendant={items[actual] ? `${id}-${actual}` : undefined}
            aria-autocomplete="list"
            type="search"
            enterKeyHint="go"
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            value={consulta}
            onChange={(e) => { setConsulta(e.target.value); setMarcado(0); }}
            onKeyDown={alTeclear}
            placeholder="Crear, ir a una pantalla o hacer algo…"
            className="h-14 min-w-0 flex-1 bg-transparent text-base text-texto outline-none placeholder:text-sutil [&::-webkit-search-cancel-button]:hidden"
          />
          <button type="button" onClick={onCerrar}
                  className="shrink-0 py-2 text-sm font-medium text-acento sm:hidden">
            Cancelar
          </button>
          <kbd className="hidden shrink-0 rounded border border-borde bg-presionado px-1.5 py-0.5 font-sans text-[11px] text-tenue sm:block">
            Esc
          </kbd>
        </div>

        {/* Resultados */}
        <ul ref={listaRef} id={`${id}-lista`} role="listbox" aria-label="Resultados"
            className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-2 pb-[calc(0.5rem+var(--sa-bottom))] sm:pb-2">
          {items.length === 0 && !buscandoDatos && (
            <li className="px-3 py-8 text-center text-sm text-sutil">
              Nada coincide con «{q}».
            </li>
          )}
          {secciones.map((s, si) => (
            <li key={s.grupo ?? si} role="presentation">
              {s.grupo && (
                <p className="px-3 pb-1 pt-3 text-xs font-semibold uppercase tracking-wide text-sutil first:pt-1">{s.grupo}</p>
              )}
              <ul role="presentation">
                {s.items.map((c, j) => {
                  const i = inicios[si] + j;
                  const Icono = c.icono;
                  const esActual = i === actual;
                  return (
                    <li
                      key={`${s.grupo}-${c.id}`}
                      id={`${id}-${i}`}
                      role="option"
                      aria-selected={esActual}
                      data-indice={i}
                      onMouseMove={() => { if (!esActual) setMarcado(i); }}
                      onClick={() => ejecutar(c)}
                      className={cn(
                        "flex min-h-11 cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-sm",
                        esActual ? "bg-presionado" : "active:bg-presionado",
                      )}
                    >
                      <span className={cn("inline-flex size-8 shrink-0 items-center justify-center rounded-lg",
                                          c.accion === "cerrar-sesion" ? "bg-peligro-suave text-peligro" : "bg-acento-suave text-acento")}>
                        <Icono size={16} aria-hidden />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-texto">{c.titulo}</span>
                        {c.subtitulo && <span className="block truncate text-xs text-sutil">{c.subtitulo}</span>}
                      </span>
                      {(c.detalle || (!s.grupo && c.grupo)) && (
                        <span className="max-w-[45%] shrink-0 truncate text-xs text-sutil">{c.detalle || c.grupo}</span>
                      )}
                      {esActual && <CornerDownLeft size={14} className="hidden shrink-0 text-sutil raton:block" aria-hidden />}
                    </li>
                  );
                })}
              </ul>
            </li>
          ))}
          {buscandoDatos && (
            <li className="flex items-center gap-2 px-3 py-3 text-xs text-sutil" role="status">
              <Loader2 size={14} className="animate-spin" aria-hidden /> Buscando comprobantes, personas y productos…
            </li>
          )}
        </ul>

        {/* Ayuda del teclado (compu) */}
        <div className="hidden items-center gap-4 border-t border-borde px-4 py-2 text-[11px] text-sutil raton:flex">
          <span><Tecla>↑</Tecla> <Tecla>↓</Tecla> moverse</span>
          <span><Tecla>Enter</Tecla> abrir</span>
          <span><Tecla>Esc</Tecla> cerrar</span>
          <span className="ml-auto"><Tecla>?</Tecla> todos los atajos</span>
        </div>
      </div>
    </div>,
    document.body,
  );
}

function Tecla({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="inline-flex min-w-5 justify-center rounded border border-borde bg-presionado px-1 py-px font-sans text-[11px] text-tenue">{children}</kbd>
  );
}
