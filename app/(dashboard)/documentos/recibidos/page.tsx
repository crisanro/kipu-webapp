"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { rutas } from "@/lib/rutas";
import Link from "next/link";
import { useLista, useFiltrosUrl } from "@/lib/useLista";
import { SegmentosDocumentos } from "@/components/shell/BarraPestanas";
import { hoyEC, inicioMesEC } from "@/lib/fecha";
import { usePermiso } from "@/hooks/usePermiso";
import SinAcceso from "@/components/SinAcceso";
import { useAuthStore } from "@/store/auth.store";
import { demoRecibidos, resumenRecibidos } from "@/lib/demos";
import { BannerEjemplo, EtiquetaEjemplo } from "@/components/EjemploPro";
import { ES_APP_NATIVA } from "@/lib/plataforma";
import {
  Plus, FileText, RefreshCw, Search,
  ChevronDown, ChevronUp, TrendingUp, ArrowUpRight,
  Receipt, ExternalLink, ChevronLeft, ChevronRight,
  AlertTriangle, CreditCard
} from "lucide-react";
import FilaLista, { GrupoFilas } from "@/components/ui/FilaLista";
import { InsigniaEstado } from "@/components/ui/InsigniaEstado";
import { EsqueletoFilas } from "@/components/ui/Esqueleto";
import Vacio from "@/components/ui/Vacio";
import BotonFlotante from "@/components/ui/BotonFlotante";
import PeriodoFechas, { etiquetaPeriodo } from "@/components/ui/PeriodoFechas";
import TirarParaRefrescar from "@/components/ui/TirarParaRefrescar";
import { Entrada } from "@/components/ui/Campo";
import Boton from "@/components/ui/Boton";
import { ESTADOS_PAGO, tipoComprobante } from "@/lib/estados";
import PanelDetalle from "@/components/ui/PanelDetalle";
import { cn } from "@/components/ui/cn";
import { useAtajos } from "@/lib/useAtajos";
import DetalleRecibido from "./ver/components/DetalleRecibido";

// Lista y detalle lado a lado desde este ancho (components/ui/PanelDetalle.tsx)
const ANCHO_PANEL = "(min-width: 1280px)";

// ── Tipos ──────────────────────────────────────────────────────────────────────
interface DocRecibido {
  id:                     string;
  razon_social_proveedor: string;
  tipo_doc:               string;
  numero_doc:             string;
  fecha_emision:          string;
  subtotal_base:          number;
  valor_iva_total:        number;
  importe_total:          number;
  deducible_renta:        boolean;
  credito_tributario_iva: boolean;
  estado_pago:            string | null;
  notas:                  string | null;
  fuente:                 string;
}

interface Bloque { cantidad?: number; subtotal: number; iva: number; total: number }

interface Resumen {
  total_documentos:       number;
  importe_total:          number;   // neto: compras − notas de crédito
  total_deducible:        number;
  iva_credito_tributario: number;
  // El backend los manda desde 2026-11-19 (el ejemplo sin datos no los trae)
  compras?:       Bloque;
  notas_credito?: Bloque;
  neto?:          Bloque;
  retenciones?:   { cantidad: number; total: number; iva: number; renta: number; otros: number };
}

interface PaginationInfo {
  page:        number;
  limit:       number;
  total_items: number;
  total_pages: number;
  has_next:    boolean;
  has_prev:    boolean;
}

const UMBRAL_BANCARIZACION = 500.00;

const fmt = (n: any) => parseFloat(String(n ?? 0)).toFixed(2);

const TIPO_COLOR: Record<string, { color: string; bg: string }> = {
  FAC: { color: "var(--kipu-muted)", bg: "color-mix(in srgb, var(--kipu-muted) 10%, transparent)" },
  NVE: { color: "var(--kipu-muted)", bg: "color-mix(in srgb, var(--kipu-muted) 10%, transparent)" },
  LIQ: { color: "#22d3ee", bg: "color-mix(in srgb, #22d3ee 10%, transparent)" },
  NCR: { color: "var(--kipu-muted)", bg: "color-mix(in srgb, var(--kipu-muted) 10%, transparent)" },
  NDB: { color: "#fb923c", bg: "color-mix(in srgb, #fb923c 10%, transparent)" },
  RET: { color: "var(--kipu-info)", bg: "color-mix(in srgb, var(--kipu-info) 10%, transparent)" },
};

const PAGO_COLOR: Record<string, { color: string; bg: string }> = {
  PENDIENTE: { color: "var(--kipu-warning)", bg: "color-mix(in srgb, var(--kipu-warning) 10%, transparent)" },
  PAGADO:    { color: "var(--kipu-success)", bg: "color-mix(in srgb, var(--kipu-success) 10%, transparent)" },
  PARCIAL:   { color: "var(--kipu-info)", bg: "color-mix(in srgb, var(--kipu-info) 10%, transparent)" },
  ANULADO:   { color: "var(--kipu-danger)", bg: "color-mix(in srgb, var(--kipu-danger) 10%, transparent)" },
};

const PAGO_LABEL: Record<string, string> = {
  PENDIENTE: "Por pagar", PAGADO: "Pagado",
  PARCIAL: "Parcial", ANULADO: "Anulado",
};

const FUENTE_COLOR: Record<string, { color: string; bg: string }> = {
  XML:    { color: "var(--kipu-accent)", bg: "color-mix(in srgb, var(--kipu-accent) 10%, transparent)" },
  FISICO: { color: "var(--kipu-warning)", bg: "color-mix(in srgb, var(--kipu-warning) 10%, transparent)" },
  API:    { color: "#22d3ee", bg: "color-mix(in srgb, #22d3ee 10%, transparent)" },
};

// ── Storage helpers ────────────────────────────────────────────────────────────
const SS_KEY_INICIO = "kipu_recibidos_fecha_inicio";
const SS_KEY_FIN    = "kipu_recibidos_fecha_fin";

// Sin fechas guardadas en la sesión: el mes en curso (solo hoy casi siempre salía vacío)
function leerFecha(key: string, porDefecto: string): string {
  try { return sessionStorage.getItem(key) || porDefecto; }
  catch { return porDefecto; }
}

function guardarFecha(key: string, val: string) {
  try { sessionStorage.setItem(key, val); } catch {}
}

// ── Componente Insignia de Bancarización ────────────────────────────────────────
function BadgeBancarizacion({ doc }: { doc: DocRecibido }) {
  const requiereBancarizacion = 
    ["FAC", "NDB"].includes(doc.tipo_doc) && 
    doc.importe_total > UMBRAL_BANCARIZACION;

  if (!requiereBancarizacion) return null;

  return (
    <div className="relative group inline-block">
      <span
        className="text-[10px] px-1.5 py-0.5 rounded font-semibold flex items-center gap-1 cursor-help"
        style={{
          color: "var(--kipu-warning)",
          background: "color-mix(in srgb, var(--kipu-warning) 12%, transparent)",
          border: "1px solid color-mix(in srgb, var(--kipu-warning) 30%, transparent)",
        }}
      >
        <CreditCard size={10} /> {">"} $500 Bancarizable
      </span>

      {/* Tooltip explicativo al pasar el mouse */}
      <div 
        className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-2.5 rounded-lg text-[11px] leading-tight shadow-xl opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-opacity z-50 text-left"
        style={{
          background: "var(--kipu-surface)",
          border: "1px solid color-mix(in srgb, var(--kipu-warning) 40%, transparent)",
          color: "var(--kipu-text)",
        }}
      >
        <p className="font-bold flex items-center gap-1 mb-1" style={{ color: "var(--kipu-warning)" }}>
          <AlertTriangle size={12} /> Requiere Bancarización (Art. 103 LRTI)
        </p>
        <p style={{ color: "var(--kipu-subtle)" }}>
          Al superar $500.00, debe pagarse mediante el sistema financiero (transferencia, tarjeta o cheque) para ser deducible de Renta y conservar el Crédito Tributario de IVA.
        </p>
        {/* Triángulo indicador del tooltip */}
        <div 
          className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-x-4 border-x-transparent border-t-4"
          style={{ borderTopColor: "var(--kipu-surface)" }}
        />
      </div>
    </div>
  );
}

// ── Box expandido ──────────────────────────────────────────────────────────────
function DocExpandido({ doc, onVerDetalle }: { doc: DocRecibido; onVerDetalle: () => void }) {
  const requiereBanc = ["FAC", "NDB"].includes(doc.tipo_doc) && doc.importe_total > UMBRAL_BANCARIZACION;

  return (
    <div
      style={{
        borderTop: "1px solid var(--kipu-border)",
        background: "color-mix(in srgb, var(--kipu-text) 2%, transparent)",
      }}
    >
      <div className="px-4 py-3 grid grid-cols-3 gap-2">
        <div
          className="rounded-lg p-2.5 text-center"
          style={{ background: "color-mix(in srgb, var(--kipu-text) 4%, transparent)" }}
        >
          <p className="text-[10px] mb-1" style={{ color: "var(--kipu-subtle)" }}>Base sin IVA</p>
          <p className="text-sm font-bold" style={{ color: "var(--kipu-text)" }}>${fmt(doc.subtotal_base)}</p>
        </div>
        <div
          className="rounded-lg p-2.5 text-center"
          style={{ background: "color-mix(in srgb, var(--kipu-text) 4%, transparent)" }}
        >
          <p className="text-[10px] mb-1" style={{ color: "var(--kipu-subtle)" }}>IVA</p>
          <p className="text-sm font-bold" style={{ color: "var(--kipu-text)" }}>${fmt(doc.valor_iva_total)}</p>
        </div>
        <div
          className="rounded-lg p-2.5 text-center"
          style={{ background: "color-mix(in srgb, var(--kipu-text) 4%, transparent)" }}
        >
          <p className="text-[10px] mb-1" style={{ color: "var(--kipu-subtle)" }}>Total</p>
          <p className="text-sm font-bold" style={{ color: "var(--kipu-text)" }}>${fmt(doc.importe_total)}</p>
        </div>
      </div>

      <div className="px-4 pb-3 grid grid-cols-2 gap-2">
        <div
          className="rounded-lg p-2.5 text-center"
          style={{
            background: doc.deducible_renta
              ? "color-mix(in srgb, var(--kipu-success) 5%, transparent)"
              : "color-mix(in srgb, var(--kipu-text) 4%, transparent)",
            border: doc.deducible_renta
              ? "1px solid color-mix(in srgb, var(--kipu-success) 20%, transparent)"
              : "1px solid var(--kipu-border)",
          }}
        >
          <p className="text-[10px] mb-1" style={{ color: "var(--kipu-subtle)" }}>Deducible renta</p>
          <p
            className="text-xs font-bold"
            style={{ color: doc.deducible_renta ? "var(--kipu-success)" : "var(--kipu-subtle)" }}
          >
            {doc.deducible_renta ? `$${fmt(doc.subtotal_base)}` : "No aplica"}
          </p>
        </div>
        <div
          className="rounded-lg p-2.5 text-center"
          style={{
            background: doc.credito_tributario_iva
              ? "color-mix(in srgb, var(--kipu-info) 5%, transparent)"
              : "color-mix(in srgb, var(--kipu-text) 4%, transparent)",
            border: doc.credito_tributario_iva
              ? "1px solid color-mix(in srgb, var(--kipu-info) 20%, transparent)"
              : "1px solid var(--kipu-border)",
          }}
        >
          <p className="text-[10px] mb-1" style={{ color: "var(--kipu-subtle)" }}>Crédito trib. IVA</p>
          <p
            className="text-xs font-bold"
            style={{ color: doc.credito_tributario_iva ? "var(--kipu-info)" : "var(--kipu-subtle)" }}
          >
            {doc.credito_tributario_iva ? `$${fmt(doc.valor_iva_total)}` : "No aplica"}
          </p>
        </div>
      </div>

      {requiereBanc && (
        <div 
          className="mx-4 mb-3 p-2.5 rounded-lg flex items-start gap-2 text-xs"
          style={{
            background: "color-mix(in srgb, var(--kipu-warning) 8%, transparent)",
            border: "1px solid color-mix(in srgb, var(--kipu-warning) 25%, transparent)",
            color: "var(--kipu-warning)",
          }}
        >
          <AlertTriangle size={14} className="shrink-0 mt-0.5" />
          <p>
            <strong>Atención:</strong> Al superar $500.00, asegúrate de conservar el comprobante bancario (transferencia o cheque) para respaldar la deducibilidad ante el SRI.
          </p>
        </div>
      )}

      {["FAC", "LIQ"].includes(doc.tipo_doc) && doc.estado_pago && (
        <div
          className="mx-4 mb-3 flex items-center justify-between rounded-lg px-3 py-2"
          style={{ background: "color-mix(in srgb, var(--kipu-text) 4%, transparent)" }}
        >
          <div className="flex items-center gap-2">
            <Receipt size={12} style={{ color: "var(--kipu-subtle)" }} />
            <span className="text-xs" style={{ color: "var(--kipu-subtle)" }}>Pago proveedor</span>
          </div>
          <span
            className="text-[10px] px-2 py-0.5 rounded-full font-medium"
            style={{
              color: PAGO_COLOR[doc.estado_pago]?.color ?? "var(--kipu-muted)",
              background: PAGO_COLOR[doc.estado_pago]?.bg ?? "color-mix(in srgb, var(--kipu-text) 8%, transparent)",
            }}
          >
            {PAGO_LABEL[doc.estado_pago] ?? doc.estado_pago}
          </span>
        </div>
      )}

      <div className="mx-4 mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <span
            className="text-[10px] px-1.5 py-0.5 rounded font-medium shrink-0"
            style={{
              color: FUENTE_COLOR[doc.fuente]?.color ?? "var(--kipu-muted)",
              background: FUENTE_COLOR[doc.fuente]?.bg ?? "color-mix(in srgb, var(--kipu-text) 8%, transparent)",
            }}
          >
            {doc.fuente}
          </span>
          {doc.notas && (
            <p className="text-xs italic truncate" style={{ color: "var(--kipu-subtle)" }}>{doc.notas}</p>
          )}
        </div>
        <button
          onClick={e => { e.stopPropagation(); onVerDetalle(); }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors shrink-0"
          style={{
            background: "color-mix(in srgb, var(--kipu-accent) 12%, transparent)",
            color: "var(--kipu-accent)",
            border: "1px solid color-mix(in srgb, var(--kipu-accent) 25%, transparent)",
          }}
        >
          Ver ítems y detalle <ExternalLink size={11} />
        </button>
      </div>
    </div>
  );
}

// ── Página principal ───────────────────────────────────────────────────────────
export default function FacturasRecibidasPage() {
  const puedeVer = usePermiso("documentos_recibidos");
  const router = useRouter();
  const searchParams = useSearchParams();

  // Período: el de la URL (?fecha_inicio=), el de la sesión o el mes en curso
  const [fechaInicio, setFechaInicio] = useState<string>(() =>
    searchParams.get("fecha_inicio") || leerFecha(SS_KEY_INICIO, inicioMesEC()));
  const [fechaFin, setFechaFin] = useState<string>(() =>
    searchParams.get("fecha_fin") || leerFecha(SS_KEY_FIN, hoyEC()));

  // Búsqueda y página en la URL: al volver de un comprobante la lista queda igual
  // sel: la compra abierta en el panel de la derecha (compu, 1280 px o más)
  const [filtros, cambiarFiltros] = useFiltrosUrl({ q: "", page: "1", sel: "" });
  const queryActivo = filtros.q;
  const page        = Math.max(1, Number(filtros.page) || 1);
  const irAPagina   = (n: number) => cambiarFiltros({ page: String(n) });
  const [query, setQuery]             = useState(filtros.q);   // lo que se escribe (se busca 400 ms después)
  const debounceRef                   = useRef<NodeJS.Timeout | null>(null);

  // Con Plan Pro, o con el plan gratis encendido (importar recibidas es para todos)
  const tieneSub = useAuthStore((s) => !!(s.empresa?.suscripcion_activa || s.empresa?.emision_gratis));
  const [expandido, setExpandido]     = useState<string | null>(null);
  const [resumenOpen, setResumenOpen] = useState(false);

  const diasRango = fechaInicio && fechaFin
    ? Math.ceil((new Date(fechaFin).getTime() - new Date(fechaInicio).getTime()) / (1000 * 60 * 60 * 24))
    : 0;

  const handleQueryChange = (val: string) => {
    setQuery(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => cambiarFiltros({ q: val.trim(), page: "1" }), 400);
  };
  useEffect(() => () => { if (debounceRef.current) clearTimeout(debounceRef.current); }, []);

  // Lista paginada (25) con su resumen: con caché, al volver aparece al instante
  // y se actualiza por detrás (lib/useLista.ts)
  const params = new URLSearchParams();
  if (fechaInicio) params.append("fecha_inicio", fechaInicio);
  if (fechaFin)    params.append("fecha_fin",    fechaFin);
  if (queryActivo) params.append("q",            queryActivo);
  params.append("page", String(page));
  params.append("limit", "25");
  const lista = useLista<{ data?: DocRecibido[]; resumen?: Resumen | null; pagination?: PaginationInfo | null }>(
    diasRango <= 365 ? `/api/v1/app/recibidos?${params}` : null);
  const docs       = lista.datos?.data ?? [];
  const resumen    = lista.datos?.resumen ?? null;
  const pagination = lista.datos?.pagination ?? null;
  const loading    = lista.cargando;

  // Nuevo período (PeriodoFechas): se recuerda en la sesión y vuelve a la página 1
  const cambiarPeriodo = (inicio: string, fin: string) => {
    guardarFecha(SS_KEY_INICIO, inicio);
    guardarFecha(SS_KEY_FIN, fin);
    setFechaInicio(inicio);
    setFechaFin(fin);
    irAPagina(1);
  };
  const irARegistrar = () => router.push("/documentos/recibidos/nueva");

  // ── Compu: panel de detalle y atajos de teclado ──────────────────────────────
  // (con los ejemplos del plan no hay panel ni atajos: docs viene vacío)
  const sel = filtros.sel;
  const buscadorRef = useRef<HTMLInputElement>(null);
  const filasRef    = useRef<Map<string, HTMLDivElement>>(new Map());
  const [marcada, setMarcada] = useState(-1);   // fila marcada con j/k (-1: ninguna)
  const enPanel = () => window.matchMedia(ANCHO_PANEL).matches;

  const mover = (paso: number) => {
    if (docs.length === 0) return;
    const actual = marcada >= 0 ? marcada : docs.findIndex(d => d.id === sel);
    const nueva  = Math.min(docs.length - 1, Math.max(0, actual + paso));
    setMarcada(nueva);
    const doc = docs[nueva];
    filasRef.current.get(doc.id)?.scrollIntoView({ block: "nearest" });
    // Con el panel abierto, el detalle sigue a la fila marcada
    if (sel && enPanel()) cambiarFiltros({ sel: doc.id });
  };
  useAtajos({
    "/":         () => buscadorRef.current?.focus(),
    "n":         irARegistrar,
    "j":         () => mover(1),  "ArrowDown": () => mover(1),
    "k":         () => mover(-1), "ArrowUp":   () => mover(-1),
    "Enter":     () => {
      const d = docs[marcada];
      if (!d) return;
      if (enPanel()) cambiarFiltros({ sel: d.id }); else router.push(rutas.recibido(d.id));
    },
    "Escape":    () => {
      if (sel) cambiarFiltros({ sel: "" });
      else if (expandido) setExpandido(null);
      else setMarcada(-1);
    },
  }, true, { n: "Registrar compra" });

  if (!puedeVer) return <SinAcceso />;

  // Sin Plan Pro y sin compras propias: ejemplos para ver cómo funciona
  const esDemo    = !loading && !tieneSub && docs.length === 0 && !queryActivo;
  const filtrados = esDemo ? demoRecibidos() : docs;
  const resumenV: Resumen | null = esDemo ? resumenRecibidos(demoRecibidos()) : resumen;
  const verDetalle = (id: string) => { if (esDemo && ES_APP_NATIVA) return; router.push(esDemo ? "/planes" : rutas.recibido(id)); };

  const docSel = docs.find(d => d.id === sel);

  return (
    <div className={cn(sel && "xl:flex xl:items-start")}>
    <div className="min-w-0 flex-1 space-y-5 p-4 md:p-6">
      <SegmentosDocumentos />
      {/* Encabezado: en el celular el título ya está en la barra superior */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="mr-auto hidden lg:block">
          <h1 className="text-xl font-bold text-texto">Documentos recibidos</h1>
          <p className="text-sm text-sutil">{resumenV ? `${resumenV.total_documentos} en el período` : "—"}</p>
        </div>
        <PeriodoFechas inicio={fechaInicio} fin={fechaFin} onCambio={cambiarPeriodo} className="mr-auto lg:mr-0" />
        <button
          onClick={() => void lista.recargar()}
          disabled={diasRango > 365}
          aria-label="Actualizar"
          title="Actualizar"
          className="inline-flex size-9 items-center justify-center rounded-full border border-borde bg-superficie text-tenue transition-colors hover:text-texto disabled:opacity-40 tactil:size-10"
        >
          {/* Gira mientras se actualiza por detrás (la lista guardada sigue a la vista) */}
          <RefreshCw size={16} className={lista.actualizando ? "animate-spin" : undefined} />
        </button>
        <Boton onClick={irARegistrar} icono={<Plus size={16} />} className="hidden lg:inline-flex">Registrar</Boton>
      </div>

      <Entrada
        teclado="buscar"
        value={query}
        onChange={e => handleQueryChange(e.target.value)}
        placeholder="Buscar por proveedor o número…"
        aria-label="Buscar compras"
        prefijo={<Search size={16} />}
        ref={buscadorRef}
      />

      {diasRango > 365 && (
        <p className="text-xs font-medium text-alerta-texto">
          El rango máximo de consulta es de 365 días (1 año).
        </p>
      )}

      {esDemo && (
        <BannerEjemplo
          texto="Así se ven tus compras con el Plan Pro: las cargas desde el XML o desde el SRI con la extensión, y Kipu separa lo deducible y el IVA que puedes usar como crédito."
          textoApp="Así se ven tus compras: las cargas desde el XML y Kipu separa lo deducible y el IVA que puedes usar como crédito."
        />
      )}

      {/* Resumen Fiscal */}
      {resumenV && resumenV.total_documentos > 0 && (
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
              <TrendingUp size={15} style={{ color: "var(--kipu-success)" }} />
              <span className="text-sm font-semibold" style={{ color: "var(--kipu-text)" }}>Resumen fiscal</span>
              <span className="text-xs" style={{ color: "var(--kipu-subtle)" }}>{fechaInicio} → {fechaFin}</span>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-xs hidden sm:block" style={{ color: "var(--kipu-muted)" }}>
                Compras netas <span className="font-medium" style={{ color: "var(--kipu-text)" }}>${fmt(resumenV.importe_total)}</span>
              </span>
              <span className="text-xs hidden sm:block" style={{ color: "var(--kipu-muted)" }}>
                Ded. <span className="font-medium" style={{ color: "var(--kipu-success)" }}>${fmt(resumenV.total_deducible)}</span>
              </span>
              <span className="text-xs hidden sm:block" style={{ color: "var(--kipu-muted)" }}>
                CT IVA <span className="font-medium" style={{ color: "var(--kipu-info)" }}>${fmt(resumenV.iva_credito_tributario)}</span>
              </span>
              {resumenOpen ? <ChevronUp size={16} style={{ color: "var(--kipu-subtle)" }} /> : <ChevronDown size={16} style={{ color: "var(--kipu-subtle)" }} />}
            </div>
          </button>

          {resumenOpen && (
            <div className="px-4 pb-4 pt-3 space-y-3" style={{ borderTop: "2px solid var(--kipu-border)" }}>
              {resumenV.compras && resumenV.notas_credito && resumenV.neto && (
                <div className="rounded-xl overflow-x-auto" style={{ border: "1px solid var(--kipu-border)" }}>
                  <table className="w-full text-xs">
                    <thead>
                      <tr style={{ color: "var(--kipu-subtle)" }}>
                        <th className="text-left font-medium px-3 py-2"></th>
                        <th className="text-right font-medium px-3 py-2">Subtotal</th>
                        <th className="text-right font-medium px-3 py-2">IVA</th>
                        <th className="text-right font-medium px-3 py-2">Total</th>
                      </tr>
                    </thead>
                    <tbody style={{ color: "var(--kipu-text)" }}>
                      <tr style={{ borderTop: "1px solid var(--kipu-border)" }}>
                        <td className="px-3 py-2">
                          Compras <span style={{ color: "var(--kipu-subtle)" }}>({resumenV.compras.cantidad})</span>
                        </td>
                        <td className="text-right px-3 py-2">${fmt(resumenV.compras.subtotal)}</td>
                        <td className="text-right px-3 py-2">${fmt(resumenV.compras.iva)}</td>
                        <td className="text-right px-3 py-2">${fmt(resumenV.compras.total)}</td>
                      </tr>
                      <tr style={{ borderTop: "1px solid var(--kipu-border)", color: "var(--kipu-danger)" }}>
                        <td className="px-3 py-2">
                          Notas de crédito <span style={{ color: "var(--kipu-subtle)" }}>({resumenV.notas_credito.cantidad}, restan)</span>
                        </td>
                        <td className="text-right px-3 py-2">−${fmt(resumenV.notas_credito.subtotal)}</td>
                        <td className="text-right px-3 py-2">−${fmt(resumenV.notas_credito.iva)}</td>
                        <td className="text-right px-3 py-2">−${fmt(resumenV.notas_credito.total)}</td>
                      </tr>
                      <tr className="font-bold" style={{ borderTop: "2px solid var(--kipu-border)" }}>
                        <td className="px-3 py-2">Compras netas</td>
                        <td className="text-right px-3 py-2">${fmt(resumenV.neto.subtotal)}</td>
                        <td className="text-right px-3 py-2">${fmt(resumenV.neto.iva)}</td>
                        <td className="text-right px-3 py-2">${fmt(resumenV.neto.total)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}

              <div className={`grid grid-cols-1 gap-3 ${resumenV.retenciones ? "sm:grid-cols-3" : "sm:grid-cols-2"}`}>
                <div
                  className="rounded-xl p-4 text-center"
                  style={{
                    background: "color-mix(in srgb, var(--kipu-success) 5%, transparent)",
                    border: "1px solid color-mix(in srgb, var(--kipu-success) 10%, transparent)",
                  }}
                >
                  <p className="text-[10px] uppercase tracking-wider mb-1" style={{ color: "var(--kipu-subtle)" }}>Deducible renta</p>
                  <p className="text-lg font-bold" style={{ color: "var(--kipu-success)" }}>${fmt(resumenV.total_deducible)}</p>
                  <p className="text-[10px] mt-1" style={{ color: "var(--kipu-subtle)" }}>base sin IVA, menos notas de crédito</p>
                </div>
                <div
                  className="rounded-xl p-4 text-center"
                  style={{
                    background: "color-mix(in srgb, var(--kipu-info) 5%, transparent)",
                    border: "1px solid color-mix(in srgb, var(--kipu-info) 10%, transparent)",
                  }}
                >
                  <p className="text-[10px] uppercase tracking-wider mb-1" style={{ color: "var(--kipu-subtle)" }}>Crédito trib. IVA</p>
                  <p className="text-lg font-bold" style={{ color: "var(--kipu-info)" }}>${fmt(resumenV.iva_credito_tributario)}</p>
                  <p className="text-[10px] mt-1" style={{ color: "var(--kipu-subtle)" }}>IVA recuperable, menos notas de crédito</p>
                </div>
                {resumenV.retenciones && (
                  <div
                    className="rounded-xl p-4 text-center"
                    style={{
                      background: "color-mix(in srgb, var(--kipu-surface) 60%, transparent)",
                      border: "1px solid var(--kipu-border)",
                    }}
                  >
                    <p className="text-[10px] uppercase tracking-wider mb-1" style={{ color: "var(--kipu-subtle)" }}>Te retuvieron</p>
                    <p className="text-lg font-bold" style={{ color: "var(--kipu-text)" }}>${fmt(resumenV.retenciones.total)}</p>
                    <p className="text-[10px] mt-1" style={{ color: "var(--kipu-subtle)" }}>
                      {resumenV.retenciones.cantidad} retenciones · IVA ${fmt(resumenV.retenciones.iva)} · renta ${fmt(resumenV.retenciones.renta)}
                    </p>
                  </div>
                )}
              </div>

              <p className="text-[11px] text-center" style={{ color: "var(--kipu-subtle)" }}>
                Es la suma de tus documentos. Tu declaración de IVA (formulario 104) armada casillero por
                casillero y revisada está en{" "}
                <Link href="/reportes" className="underline" style={{ color: "var(--kipu-accent)" }}>Reportes</Link>.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Lista */}
      {loading ? (
        <EsqueletoFilas filas={8} />
      ) : filtrados.length === 0 ? (
        queryActivo ? (
          <Vacio icono={Search} titulo="Nada coincide con la búsqueda"
                 descripcion="Prueba con otro proveedor, número u otro período." />
        ) : (
          <Vacio icono={FileText} titulo="Sin compras en este período"
                 descripcion="Registra las facturas de tus proveedores para llevar tu IVA y tus gastos."
                 accion={<Boton onClick={irARegistrar} icono={<Plus size={16} />}>Registrar compra</Boton>} />
        )
      ) : (
        <>
        {/* Celular: tocar la fila abre el comprobante; deslizar hacia abajo actualiza */}
        <TirarParaRefrescar alRefrescar={lista.recargar} className="md:hidden">
          <GrupoFilas>
            {filtrados.map(doc => {
              const pago = doc.estado_pago && ["FAC", "LIQ"].includes(doc.tipo_doc) ? ESTADOS_PAGO[doc.estado_pago] : undefined;
              return (
                <FilaLista
                  key={doc.id}
                  onClick={() => verDetalle(doc.id)}
                  titulo={<>{doc.razon_social_proveedor}{esDemo && <> <EtiquetaEjemplo /></>}</>}
                  subtitulo={`${tipoComprobante(doc.tipo_doc).corta} ${doc.numero_doc} · ${etiquetaPeriodo(doc.fecha_emision, doc.fecha_emision)}`}
                  fin={`$${fmt(doc.importe_total)}`}
                  finAbajo={
                    <span className="flex flex-wrap justify-end gap-1">
                      {doc.deducible_renta && <InsigniaEstado tono="exito">Deducible</InsigniaEstado>}
                      {doc.credito_tributario_iva && <InsigniaEstado tono="info">Crédito IVA</InsigniaEstado>}
                      {pago && <InsigniaEstado tono={pago.tono}>{pago.etiqueta}</InsigniaEstado>}
                    </span>
                  }
                />
              );
            })}
          </GrupoFilas>
        </TirarParaRefrescar>

        {/* Escritorio: desde 1280 px la fila abre la compra en el panel de la derecha;
            más angosto se despliega el resumen. La flecha abre la pantalla completa. */}
        <div className="hidden overflow-hidden rounded-xl border border-borde bg-superficie md:block">
          <div>
            {filtrados.map((doc, index) => {
              const isOpen = expandido === doc.id;
              const tColor = TIPO_COLOR[doc.tipo_doc] ?? TIPO_COLOR.FAC;
              return (
                <div
                  key={doc.id}
                  ref={el => { if (el) filasRef.current.set(doc.id, el); else filasRef.current.delete(doc.id); }}
                  style={{
                    borderTop: index > 0 ? "1px solid var(--kipu-border)" : "none",
                  }}
                >
                  <div
                    onClick={() => {
                      setMarcada(index);
                      if (!esDemo && enPanel()) cambiarFiltros({ sel: doc.id });
                      else setExpandido(isOpen ? null : doc.id);
                    }}
                    aria-selected={doc.id === sel || undefined}
                    className={cn(
                      "flex cursor-pointer select-none items-center gap-3 px-4 py-3 transition-colors hover:bg-presionado",
                      doc.id === sel && "bg-acento-suave hover:bg-acento-suave",
                      index === marcada && "outline-2 -outline-offset-2 outline-acento/50",
                    )}
                  >
                    <span
                      className="text-[10px] px-1.5 py-0.5 rounded font-bold shrink-0"
                      style={{ color: tColor.color, background: tColor.bg }}
                    >
                      {doc.tipo_doc}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-medium truncate" style={{ color: "var(--kipu-text)" }}>
                          {doc.razon_social_proveedor}
                        </p>
                        {esDemo && <EtiquetaEjemplo />}
                        <div className="flex gap-1 shrink-0 items-center">
                          {doc.deducible_renta && (
                            <span
                              className="text-[10px] px-1.5 py-0.5 rounded"
                              style={{
                                color: "var(--kipu-success)",
                                background: "color-mix(in srgb, var(--kipu-success) 10%, transparent)",
                              }}
                            >
                              Ded.
                            </span>
                          )}
                          {doc.credito_tributario_iva && (
                            <span
                              className="text-[10px] px-1.5 py-0.5 rounded"
                              style={{
                                color: "var(--kipu-info)",
                                background: "color-mix(in srgb, var(--kipu-info) 10%, transparent)",
                              }}
                            >
                              CT IVA
                            </span>
                          )}
                          {/* Insignia de Bancarización */}
                          <BadgeBancarizacion doc={doc} />
                        </div>
                      </div>
                      <p className="text-xs font-mono" style={{ color: "var(--kipu-subtle)" }}>
                        {doc.numero_doc} · {doc.fecha_emision}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-semibold" style={{ color: "var(--kipu-text)" }}>${fmt(doc.importe_total)}</p>
                      {doc.estado_pago && ["FAC", "LIQ"].includes(doc.tipo_doc) && (
                        <span
                          className="text-[10px] px-1.5 py-0.5 rounded-full font-medium"
                          style={{
                            color: PAGO_COLOR[doc.estado_pago]?.color ?? "var(--kipu-muted)",
                            background: PAGO_COLOR[doc.estado_pago]?.bg ?? "color-mix(in srgb, var(--kipu-text) 8%, transparent)",
                          }}
                        >
                          {PAGO_LABEL[doc.estado_pago] ?? doc.estado_pago}
                        </span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={e => { e.stopPropagation(); verDetalle(doc.id); }}
                      className="p-1.5 rounded-lg transition-colors shrink-0"
                      style={{ color: "var(--kipu-subtle)" }}
                      title="Ver detalle completo"
                      aria-label="Ver detalle completo"
                    >
                      <ArrowUpRight size={15} />
                    </button>
                    {/* Desde 1280 px la fila abre el panel en vez de desplegarse (salvo los ejemplos) */}
                    <div className={`shrink-0 ${esDemo ? "" : "xl:hidden"}`} style={{ color: "var(--kipu-subtle)" }}>
                      {isOpen ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                    </div>
                  </div>
                  {isOpen && !sel && (
                    <DocExpandido
                      doc={doc}
                      onVerDetalle={() => verDetalle(doc.id)}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>
        </>
      )}

      {/* Celular: registrar una compra (el + de la barra es para emitir) */}
      {!esDemo && <BotonFlotante onClick={irARegistrar} etiqueta="Registrar compra" />}

      {/* Controles de Paginación */}
      {pagination && pagination.total_pages > 1 && (
        <div
          className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 rounded-xl"
          style={{
            background: "var(--kipu-surface)",
            border: "1px solid var(--kipu-border)",
          }}
        >
          <p className="text-xs" style={{ color: "var(--kipu-subtle)" }}>
            Mostrando <span className="font-semibold" style={{ color: "var(--kipu-text)" }}>{docs.length}</span> de{" "}
            <span className="font-semibold" style={{ color: "var(--kipu-text)" }}>{pagination.total_items}</span> comprobantes
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => irAPagina(Math.max(page - 1, 1))}
              disabled={!pagination.has_prev || loading}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors disabled:opacity-40"
              style={{
                background: "var(--kipu-surface)",
                border: "1px solid var(--kipu-border)",
                color: "var(--kipu-text)",
              }}
            >
              <ChevronLeft size={14} /> Anterior
            </button>
            <span className="text-xs font-medium px-2" style={{ color: "var(--kipu-subtle)" }}>
              Página {pagination.page} de {pagination.total_pages}
            </span>
            <button
              type="button"
              onClick={() => irAPagina(Math.min(page + 1, pagination.total_pages))}
              disabled={!pagination.has_next || loading}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors disabled:opacity-40"
              style={{
                background: "var(--kipu-surface)",
                border: "1px solid var(--kipu-border)",
                color: "var(--kipu-text)",
              }}
            >
              Siguiente <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}

      {/* Compu con mouse: los atajos, a la vista */}
      <p className="hidden text-center text-[11px] text-sutil raton:lg:block">
        Atajos: <kbd className="font-mono">/</kbd> buscar · <kbd className="font-mono">n</kbd> registrar compra ·{" "}
        <kbd className="font-mono">j</kbd> <kbd className="font-mono">k</kbd> moverse · <kbd className="font-mono">Enter</kbd> abrir ·{" "}
        <kbd className="font-mono">Esc</kbd> cerrar
      </p>
    </div>

    {/* Compu (1280 px o más): la compra elegida, a la derecha */}
    {sel && (
      <PanelDetalle
        titulo={docSel ? `${tipoComprobante(docSel.tipo_doc).etiqueta} ${docSel.numero_doc}` : "Comprobante recibido"}
        hrefCompleto={rutas.recibido(sel)}
        onCerrar={() => cambiarFiltros({ sel: "" })}
      >
        <DetalleRecibido key={sel} id={sel} enPanel />
      </PanelDetalle>
    )}
    </div>
  );
}