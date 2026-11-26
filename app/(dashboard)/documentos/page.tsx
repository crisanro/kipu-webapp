"use client";
import { rutas } from "@/lib/rutas";
import { useState, useEffect } from "react";
import { useSandboxStore } from "@/store/sandbox.store";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { usePermiso } from "@/hooks/usePermiso";
import SinAcceso from "@/components/SinAcceso";
import { useLista, useFiltrosUrl, useBusquedaUrl } from "@/lib/useLista";
import { SegmentosDocumentos } from "@/components/shell/BarraPestanas";
import {
  Search, Plus, FileText, ChevronDown, ChevronUp, TrendingUp, FlaskConical,
} from "lucide-react";
import Paginacion, { type InfoPaginacion } from "@/components/ui/Paginacion";
import { AvisoRango, AyudaAtajos, BotonActualizar, useNavegacionLista, usePeriodo } from "./_comun";
import FilaLista, { GrupoFilas } from "@/components/ui/FilaLista";
import { InsigniaSri, InsigniaCobro } from "@/components/ui/InsigniaEstado";
import { EsqueletoFilas } from "@/components/ui/Esqueleto";
import Vacio, { VacioError } from "@/components/ui/Vacio";
import ChipsFiltro from "@/components/ui/ChipsFiltro";
import PeriodoFechas, { etiquetaPeriodo } from "@/components/ui/PeriodoFechas";
import TirarParaRefrescar from "@/components/ui/TirarParaRefrescar";
import { Entrada } from "@/components/ui/Campo";
import { clasesBoton } from "@/components/ui/Boton";
import PanelDetalle from "@/components/ui/PanelDetalle";
import { cn } from "@/components/ui/cn";
import DetalleDocumento from "./ver/components/DetalleDocumento";
import { ESTADOS_SRI, TIPOS_COMPROBANTE, tipoComprobante } from "@/lib/estados";
import { dosDecimales } from "@/lib/dinero";

// ── Tipos ─────────────────────────────────────────────────────────────────────
interface Documento {
  id:              string;
  clave_acceso:   string;
  numero_doc:      string;
  fecha_emision: string;
  estado_sri:    string;
  tipo_doc:      string;
  cod_doc:        string;
  razon_social:  string;
  identificacion: string;
  importe_total: number;
  estado_cobro:  string | null;
}

// Chips de filtro (las etiquetas salen de lib/estados.ts)
const ESTADOS_FILTRO = ["TODOS", "AUTORIZADO", "RECIBIDA", "DEVUELTA", "RECHAZADO", "ANULADO"]
  .map(v => ({ valor: v, etiqueta: v === "TODOS" ? "Todos" : ESTADOS_SRI[v]?.etiqueta ?? v }));
const TIPOS_FILTRO = ["TODOS", "FAC", "NCR", "NDB", "RET", "LIQ"]
  .map(v => ({ valor: v, etiqueta: v === "TODOS" ? "Todos los tipos" : TIPOS_COMPROBANTE[v]?.etiqueta ?? v }));

// Estos tipos llevan estado de cobro
const CON_COBRO = ["FAC", "LIQ", "NDB"];

// ── Componente ResumenTipoCard ─────────────────────────────────────────────────
const COLOR_MAP: Record<string, { color: string; bg: string }> = {
  verde:  { color: "var(--kipu-accent)", bg: "color-mix(in srgb, var(--kipu-accent) 10%, transparent)" },
  indigo: { color: "var(--kipu-info)", bg: "color-mix(in srgb, var(--kipu-info) 10%, transparent)" },
  cyan:   { color: "#22d3ee", bg: "color-mix(in srgb, #22d3ee 10%, transparent)" },
  purple: { color: "var(--kipu-muted)", bg: "color-mix(in srgb, var(--kipu-muted) 10%, transparent)" },
  amber:  { color: "#fb923c", bg: "color-mix(in srgb, #fb923c 10%, transparent)" },
  yellow: { color: "#facc15", bg: "color-mix(in srgb, #facc15 10%, transparent)" },
};

function ResumenTipoCard({ tipo, label, color, data }: {
  tipo:  string;
  label: string;
  color: string;
  data:  { num_docs: number; total: number; desglose_iva: any[] };
}) {
  const c = COLOR_MAP[color] ?? COLOR_MAP.indigo;
  return (
    <div
      className="rounded-xl p-4"
      style={{
        background: "color-mix(in srgb, var(--kipu-surface) 60%, transparent)",
        border: "1px solid var(--kipu-border)",
      }}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span
            className="text-[10px] px-2 py-0.5 rounded-full font-bold"
            style={{ color: c.color, background: c.bg }}
          >
            {tipo}
          </span>
          <h3 className="text-xs font-semibold" style={{ color: "var(--kipu-text)" }}>{label}</h3>
        </div>
        <span className="text-[10px]" style={{ color: "var(--kipu-subtle)" }}>{data.num_docs} docs</span>
      </div>
      <div className="space-y-1.5">
        {data.desglose_iva.length === 0 ? (
          <p className="text-xs" style={{ color: "var(--kipu-subtle)" }}>Sin desglose disponible</p>
        ) : (
          data.desglose_iva.map((imp, i) => (
            <div key={i} className="space-y-0.5">
              <div className="flex justify-between text-xs" style={{ color: "var(--kipu-muted)" }}>
                <span>Subtotal {imp.tarifa}%</span>
                <span>${dosDecimales(imp.subtotal)}</span>
              </div>
              {imp.iva > 0 && (
                <div className="flex justify-between text-xs pl-3" style={{ color: "var(--kipu-subtle)" }}>
                  <span>IVA {imp.tarifa}%</span>
                  <span>${dosDecimales(imp.iva)}</span>
                </div>
              )}
            </div>
          ))
        )}
        <div
          className="flex justify-between font-bold text-xs pt-2 mt-2"
          style={{ borderTop: "1px solid var(--kipu-border)" }}
        >
          <span style={{ color: "var(--kipu-muted)" }}>Total</span>
          <span style={{ color: c.color }}>${dosDecimales(data.total)}</span>
        </div>
      </div>
    </div>
  );
}

// ── Página ─────────────────────────────────────────────────────────────────────
export default function HistorialPage() {
  const puedeVer = usePermiso("descargar");
  const router = useRouter();

  const [resumenOpen,  setResumenOpen]  = useState(false);
  // Búsqueda, filtros y página en la URL: al volver de un comprobante la lista
  // queda igual (lib/useLista.ts). Se buscan en el servidor, en todo el rango.
  // sel: el comprobante abierto en el panel de la derecha (compu, 1280 px o más)
  const [filtros, cambiarFiltros] = useFiltrosUrl({ q: "", estado: "TODOS", tipo: "TODOS", page: "1", sel: "" });
  const queryActivo  = filtros.q;
  const filtroEstado = filtros.estado;
  const filtroTipo   = filtros.tipo;
  const page         = Math.max(1, Number(filtros.page) || 1);
  const irAPagina    = (n: number) => cambiarFiltros({ page: String(n) });
  const [query, cambiarQuery] = useBusquedaUrl("q", { page: "" });   // se busca 400 ms después
  const periodo = usePeriodo("emitidos", () => irAPagina(1));

  const { activo: sandboxGlobal } = useSandboxStore();
  const [sandbox, setSandbox]     = useState(sandboxGlobal);
  useEffect(() => { setSandbox(sandboxGlobal); }, [sandboxGlobal]);

  // Lista paginada (25 por página) y resumen fiscal del rango: con caché, al
  // volver aparecen al instante y se actualizan por detrás (lib/useLista.ts)
  const paramsFechas = new URLSearchParams();
  if (periodo.inicio) paramsFechas.append("fecha_inicio", periodo.inicio);
  if (periodo.fin)    paramsFechas.append("fecha_fin",    periodo.fin);
  const paramsLista = new URLSearchParams(paramsFechas);
  if (sandbox)     paramsLista.append("sandbox", "true");
  if (queryActivo) paramsLista.append("q",       queryActivo);
  if (filtroEstado !== "TODOS") paramsLista.append("estado_sri", filtroEstado);
  if (filtroTipo   !== "TODOS") paramsLista.append("tipo_doc",   filtroTipo);
  paramsLista.append("page",  String(page));
  paramsLista.append("limit", "25");

  const lista = useLista<{ data?: Documento[]; pagination?: InfoPaginacion | null }>(
    periodo.valido ? `/api/v1/app/documentos?${paramsLista.toString()}` : null);
  const resumenLista = useLista<{ data?: any }>(
    periodo.valido ? `/api/v1/app/documentos/resumen?${paramsFechas.toString()}` : null);

  const documentos = lista.datos?.data ?? [];
  const pagination = lista.datos?.pagination ?? null;
  const loading    = lista.cargando;
  const resumen    = resumenLista.datos?.data ?? null;
  const recargarTodo = () => Promise.all([lista.recargar(), resumenLista.recargar()]);

  // ── Compu: panel de detalle y atajos de teclado ──────────────────────────────
  const sel = filtros.sel;
  const { buscadorRef, marcada, setMarcada, abrir, refFila } = useNavegacionLista({
    ids:        documentos.map(d => d.id),
    sel,
    cambiarSel: (id) => cambiarFiltros({ sel: id }),
    rutaDe:     rutas.documento,
    nuevo:      () => router.push("/documentos/emitir/fac"),
    textoNuevo: "Nueva factura",
  });

  if (!puedeVer) return <SinAcceso />;

  const tieneResumen = resumen && (
    Object.keys(resumen.por_tipo ?? {}).length > 0 ||
    (resumen.retenciones?.num_docs ?? 0) > 0
  );

  const docSel = documentos.find(d => d.id === sel);

  return (
    <div className={cn(sel && "xl:flex xl:items-start")}>
    <div className="min-w-0 flex-1 space-y-4 p-4 md:p-6">
      <SegmentosDocumentos />
      {/* Encabezado: en el celular el título ya está en la barra superior */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="mr-auto hidden lg:block">
          <h1 className="text-xl font-bold text-texto">Comprobantes emitidos</h1>
          <p className="text-sm text-sutil">
            {pagination ? `${pagination.total_items} comprobantes encontrados` : `${documentos.length} comprobantes`}
          </p>
        </div>
        <PeriodoFechas inicio={periodo.inicio} fin={periodo.fin} onCambio={periodo.cambiar} className="mr-auto lg:mr-0" />
        <button
          onClick={() => { irAPagina(1); setSandbox(!sandbox); }}
          aria-pressed={sandbox}
          className={`inline-flex h-9 items-center gap-1.5 rounded-full border px-3 text-xs font-medium transition-colors tactil:h-10 ${
            sandbox ? "border-sandbox/30 bg-sandbox-suave text-sandbox" : "border-borde bg-superficie text-tenue"}`}
        >
          <FlaskConical size={14} aria-hidden />
          {sandbox ? "Sandbox" : "Producción"}
        </button>
        <BotonActualizar onClick={() => void recargarTodo()} deshabilitado={!periodo.valido}
                         girando={lista.actualizando || resumenLista.actualizando} />
        <Link href="/documentos/emitir/fac" className={`${clasesBoton("principal", "md")} hidden lg:inline-flex`}>
          <Plus size={16} aria-hidden /> Nueva
        </Link>
      </div>

      <Entrada
        teclado="buscar"
        value={query}
        onChange={e => cambiarQuery(e.target.value)}
        placeholder="Buscar por cliente, RUC o número…"
        aria-label="Buscar comprobantes"
        prefijo={<Search size={16} />}
        ref={buscadorRef}
      />

      <AvisoRango valido={periodo.valido} />

      {/* Resumen fiscal */}
      {!sandbox && tieneResumen && (
        <div
          className="rounded-xl overflow-hidden"
          style={{
            background: "var(--kipu-surface)",
            border: "1px solid var(--kipu-border)",
          }}
        >
          <button
            onClick={() => setResumenOpen(!resumenOpen)}
            className="w-full flex items-center justify-between px-4 py-3 transition-colors"
          >
            <div className="flex items-center gap-2">
              <TrendingUp size={15} style={{ color: "var(--kipu-accent)" }} />
              <span className="text-sm font-semibold" style={{ color: "var(--kipu-text)" }}>Resumen fiscal</span>
              <span className="text-xs" style={{ color: "var(--kipu-subtle)" }}>
                {resumen.periodo?.desde} → {resumen.periodo?.hasta}
              </span>
            </div>
            <div className="flex items-center gap-3">
              {resumen.por_tipo?.FAC && (
                <span className="text-xs hidden sm:block" style={{ color: "var(--kipu-muted)" }}>
                  FAC <span className="font-medium" style={{ color: "var(--kipu-text)" }}>${dosDecimales(resumen.por_tipo.FAC.total)}</span>
                </span>
              )}
              {resumen.retenciones?.num_docs > 0 && (
                <span className="text-xs hidden sm:block" style={{ color: "var(--kipu-muted)" }}>
                  RET <span className="font-medium" style={{ color: "var(--kipu-warning)" }}>${dosDecimales(resumen.retenciones.total)}</span>
                </span>
              )}
              {resumenOpen
                ? <ChevronUp size={16} style={{ color: "var(--kipu-subtle)" }} />
                : <ChevronDown size={16} style={{ color: "var(--kipu-subtle)" }} />
              }
            </div>
          </button>
          {resumenOpen && (
            <div
              className="px-4 pb-4 space-y-3"
              style={{ borderTop: "2px solid var(--kipu-border)" }}
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3 pt-3">
                {resumen.por_tipo?.FAC && (
                  <ResumenTipoCard tipo="FAC" label="Facturas Emitidas"        color="verde"  data={resumen.por_tipo.FAC} />
                )}
                {resumen.por_tipo?.LIQ && (
                  <ResumenTipoCard tipo="LIQ" label="Liquidaciones de Compra" color="cyan"   data={resumen.por_tipo.LIQ} />
                )}
                {resumen.por_tipo?.NCR && (
                  <ResumenTipoCard tipo="NCR" label="Notas de Crédito"         color="purple" data={resumen.por_tipo.NCR} />
                )}
                {resumen.por_tipo?.NDB && (
                  <ResumenTipoCard tipo="NDB" label="Notas de Débito"          color="amber"  data={resumen.por_tipo.NDB} />
                )}
                {resumen.retenciones?.num_docs > 0 && (
                  <div
                    className="rounded-xl p-4"
                    style={{
                      background: "color-mix(in srgb, var(--kipu-surface) 60%, transparent)",
                      border: "1px solid var(--kipu-border)",
                    }}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span
                          className="text-[10px] px-2 py-0.5 rounded-full font-bold"
                          style={{
                            color: "#facc15",
                            background: "color-mix(in srgb, #facc15 10%, transparent)",
                          }}
                        >
                          RET
                        </span>
                        <h3 className="text-xs font-semibold" style={{ color: "var(--kipu-text)" }}>Retenciones Emitidas</h3>
                      </div>
                      <span className="text-[10px]" style={{ color: "var(--kipu-subtle)" }}>{resumen.retenciones.num_docs} docs</span>
                    </div>
                    <div className="space-y-1.5">
                      {Object.entries(resumen.retenciones.por_tipo).map(([tipo, data]: [string, any]) => (
                        <div key={tipo} className="space-y-0.5">
                          <div className="flex justify-between text-xs" style={{ color: "var(--kipu-muted)" }}>
                            <span>Retención {tipo}</span>
                            <span style={{ color: "var(--kipu-text)" }}>${dosDecimales(data.valor_retenido)}</span>
                          </div>
                          <div className="flex justify-between text-xs pl-3" style={{ color: "var(--kipu-subtle)" }}>
                            <span>Base imponible</span>
                            <span>${dosDecimales(data.base)}</span>
                          </div>
                        </div>
                      ))}
                      <div
                        className="flex justify-between font-bold text-xs pt-2 mt-2"
                        style={{ borderTop: "1px solid var(--kipu-border)" }}
                      >
                        <span style={{ color: "var(--kipu-muted)" }}>Total retenido</span>
                        <span style={{ color: "var(--kipu-warning)" }}>${dosDecimales(resumen.retenciones.total)}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Filtros: una fila por filtro, que se desliza de lado en el celular */}
      <div className="space-y-2">
        <ChipsFiltro etiqueta="Estado" opciones={ESTADOS_FILTRO} valor={filtroEstado}
                     onCambio={estado => cambiarFiltros({ estado, page: "1" })} />
        <ChipsFiltro etiqueta="Tipo de comprobante" opciones={TIPOS_FILTRO} valor={filtroTipo}
                     onCambio={tipo => cambiarFiltros({ tipo, page: "1" })} />
      </div>

      {/* Lista */}
      {loading ? (
        <EsqueletoFilas filas={8} />
      ) : lista.fallo ? (
        <VacioError que="tus comprobantes" onReintentar={lista.recargar} />
      ) : documentos.length === 0 ? (
        queryActivo || filtroEstado !== "TODOS" || filtroTipo !== "TODOS" ? (
          <Vacio icono={Search} titulo="Nada coincide con la búsqueda"
                 descripcion="Prueba con otro texto, otro filtro u otro período." />
        ) : (
          <Vacio icono={FileText}
                 titulo={`Sin comprobantes de ${sandbox ? "prueba" : "producción"} en este período`}
                 descripcion="Prueba con otro período o emite tu primera factura."
                 accion={<Link href="/documentos/emitir/fac" className={clasesBoton()}><Plus size={16} aria-hidden /> Emitir factura</Link>} />
        )
      ) : (
        <>
          {/* Escritorio: tabla; se abre tocando cualquier parte de la fila */}
          <div className="hidden overflow-hidden rounded-xl border border-borde bg-superficie md:block">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b-2 border-borde text-xs text-sutil">
                    <th className="px-4 py-3 text-left font-medium">Número</th>
                    <th className={`px-4 py-3 text-left font-medium ${sel ? "xl:hidden" : ""}`}>Tipo</th>
                    <th className="px-4 py-3 text-left font-medium">Cliente</th>
                    <th className={`px-4 py-3 text-left font-medium ${sel ? "xl:hidden 2xl:table-cell" : ""}`}>Fecha</th>
                    <th className="px-4 py-3 text-left font-medium">Estado</th>
                    <th className={`px-4 py-3 text-left font-medium ${sel ? "xl:hidden" : ""}`}>Cobro</th>
                    <th className="px-4 py-3 text-right font-medium">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-borde">
                  {documentos.map((d, i) => (
                    <tr
                      key={d.id}
                      ref={refFila(d.id)}
                      onClick={() => { setMarcada(i); abrir(d.id); }}
                      aria-selected={d.id === sel || undefined}
                      className={cn(
                        "cursor-pointer transition-colors hover:bg-presionado",
                        d.estado_sri === "ANULADO" && "opacity-60",
                        d.id === sel && "bg-acento-suave hover:bg-acento-suave",
                        i === marcada && "outline-2 -outline-offset-2 outline-acento/50",
                      )}
                    >
                      <td className="px-4 py-3">
                        <Link href={rutas.documento(d.id)} onClick={e => e.stopPropagation()}
                              className="whitespace-nowrap font-mono text-xs text-acento underline-offset-2 hover:underline">
                          {d.numero_doc ?? "—"}
                        </Link>
                      </td>
                      <td className={`px-4 py-3 text-xs text-tenue ${sel ? "xl:hidden" : ""}`}>{tipoComprobante(d.tipo_doc).etiqueta}</td>
                      <td className="px-4 py-3">
                        <p className={`max-w-[220px] truncate font-medium text-texto ${sel ? "xl:max-w-[150px] 2xl:max-w-[220px]" : ""}`}>{d.razon_social}</p>
                        <p className="text-xs text-sutil">{d.identificacion}</p>
                      </td>
                      <td className={`whitespace-nowrap px-4 py-3 text-xs text-tenue ${sel ? "xl:hidden 2xl:table-cell" : ""}`}>{d.fecha_emision}</td>
                      <td className="px-4 py-3"><InsigniaSri estado={d.estado_sri} /></td>
                      <td className={`px-4 py-3 ${sel ? "xl:hidden" : ""}`}>
                        {CON_COBRO.includes(d.tipo_doc) && <InsigniaCobro estado={d.estado_cobro} />}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold tabular-nums text-texto">${dosDecimales(d.importe_total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Celular: filas que se tocan enteras; deslizar hacia abajo actualiza */}
          <TirarParaRefrescar alRefrescar={recargarTodo} className="md:hidden">
            <GrupoFilas>
              {documentos.map(d => (
                <FilaLista
                  key={d.id}
                  href={rutas.documento(d.id)}
                  titulo={d.razon_social || "Consumidor final"}
                  subtitulo={`${tipoComprobante(d.tipo_doc).corta} ${d.numero_doc ?? ""} · ${etiquetaPeriodo(d.fecha_emision, d.fecha_emision)}`}
                  fin={`$${dosDecimales(d.importe_total)}`}
                  finAbajo={
                    <span className="flex flex-wrap justify-end gap-1">
                      {CON_COBRO.includes(d.tipo_doc) && <InsigniaCobro estado={d.estado_cobro} />}
                      <InsigniaSri estado={d.estado_sri} />
                    </span>
                  }
                  apagada={d.estado_sri === "ANULADO"}
                />
              ))}
            </GrupoFilas>
          </TirarParaRefrescar>
        </>
      )}

      <Paginacion info={pagination} enPantalla={documentos.length} cargando={loading} onCambio={irAPagina} />
      <AyudaAtajos nuevo="nueva factura" />
    </div>

    {/* Compu (1280 px o más): el comprobante elegido, a la derecha */}
    {sel && (
      <PanelDetalle
        titulo={docSel ? `${tipoComprobante(docSel.tipo_doc).etiqueta} ${docSel.numero_doc ?? ""}` : "Comprobante"}
        hrefCompleto={rutas.documento(sel)}
        onCerrar={() => cambiarFiltros({ sel: "" })}
      >
        <DetalleDocumento key={sel} id={sel} enPanel />
      </PanelDetalle>
    )}
    </div>
  );
}