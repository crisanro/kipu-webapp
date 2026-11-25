// components/shell/PaletaComandos.tsx
// Paleta de comandos: Ctrl+K (⌘K en Mac) desde cualquier pantalla del panel,
// el botón "Buscar…" del menú lateral o la lupa de la barra superior del celular.
// Se escribe para crear, ir a una pantalla o hacer una acción (lib/comandos.ts);
// flechas para moverse, Enter para abrir, Esc para cerrar.
//   - Compu: ventana arriba al centro. Celular: pantalla completa.
//   - Sin escribir: lo último que se eligió y luego todo, por grupos.
// Se monta una vez en app/(dashboard)/layout.tsx.

"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { usePathname, useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { CornerDownLeft, Search } from "lucide-react";
import {
  comandosDisponibles, filtrarComandos, leerRecientes, recordarComando, EVENTO_NUEVO,
  type Comando, type GrupoComando,
} from "@/lib/comandos";
import { useCapaAtras } from "@/lib/botonAtras";
import { useAuthStore } from "@/store/auth.store";
import { useSandboxStore } from "@/store/sandbox.store";
import { EVENTO_CERRAR_SESION, EVENTO_SELECTOR_EMPRESA } from "@/components/shell/BarraSuperior";
import { cn } from "@/components/ui/cn";

/** Abre la paleta desde un botón: window.dispatchEvent(new Event(EVENTO_PALETA)). */
export const EVENTO_PALETA = "kipu:abrir-paleta";

const ES_MAC = typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.userAgent);
/** Texto del atajo para mostrar en botones ("⌘K" o "Ctrl K"). */
export const ATAJO_PALETA = ES_MAC ? "⌘K" : "Ctrl K";

export default function PaletaComandos() {
  const [abierta, setAbierta] = useState(false);
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
    const alPedir = () => setAbierta(true);
    window.addEventListener("keydown", alTeclear);
    window.addEventListener(EVENTO_PALETA, alPedir);
    return () => {
      window.removeEventListener("keydown", alTeclear);
      window.removeEventListener(EVENTO_PALETA, alPedir);
    };
  }, []);

  // Se monta al abrir: cada vez empieza vacía y con el primero marcado
  return abierta ? <Ventana onCerrar={() => setAbierta(false)} /> : null;
}

const ORDEN: Exclude<GrupoComando, "Recientes">[] = ["Crear", "Ir a", "Acciones"];

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

  const comandos = useMemo(() => empresa ? comandosDisponibles({
    empresa, varias, sandbox, temaOscuro,
    puedeSandbox: !!empresa.firma_ok && empresa.ambiente === 2,
  }) : [], [empresa, varias, sandbox, temaOscuro]);

  // Secciones a la vista: sin escribir, recientes y luego por grupo; escribiendo, por relevancia
  const secciones = useMemo((): { grupo: GrupoComando | null; items: Comando[] }[] => {
    if (consulta.trim()) return [{ grupo: null, items: filtrarComandos(comandos, consulta) }];
    const porId = new Map(comandos.map(c => [c.id, c]));
    const rec = recientes.map(r => porId.get(r)).filter((c): c is Comando => !!c);
    const usados = new Set(rec.map(c => c.id));
    return [
      { grupo: "Recientes" as GrupoComando, items: rec },
      ...ORDEN.map(g => ({ grupo: g as GrupoComando, items: comandos.filter(c => c.grupo === g && !usados.has(c.id)) })),
    ].filter(s => s.items.length > 0);
  }, [comandos, consulta, recientes]);

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

  const ejecutar = (c: Comando) => {
    recordarComando(c.id);
    onCerrar();
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
          {items.length === 0 && (
            <li className="px-3 py-8 text-center text-sm text-sutil">
              Nada coincide con «{consulta.trim()}».
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
                      <span className="min-w-0 flex-1 truncate text-texto">{c.titulo}</span>
                      {(c.detalle || (!s.grupo && c.grupo)) && (
                        <span className="shrink-0 text-xs text-sutil">{c.detalle ?? c.grupo}</span>
                      )}
                      {esActual && <CornerDownLeft size={14} className="hidden shrink-0 text-sutil raton:block" aria-hidden />}
                    </li>
                  );
                })}
              </ul>
            </li>
          ))}
        </ul>

        {/* Ayuda del teclado (compu) */}
        <div className="hidden items-center gap-4 border-t border-borde px-4 py-2 text-[11px] text-sutil raton:flex">
          <span><Tecla>↑</Tecla> <Tecla>↓</Tecla> moverse</span>
          <span><Tecla>Enter</Tecla> abrir</span>
          <span><Tecla>Esc</Tecla> cerrar</span>
          <span className="ml-auto"><Tecla>{ATAJO_PALETA}</Tecla> desde cualquier pantalla</span>
        </div>
      </div>
    </div>,
    document.body,
  );
}

function Tecla({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="rounded border border-borde bg-presionado px-1 py-px font-sans text-[10px] text-tenue">{children}</kbd>
  );
}
