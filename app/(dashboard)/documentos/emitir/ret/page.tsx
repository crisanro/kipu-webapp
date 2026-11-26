"use client";
// Comprobante de retención sobre una factura o nota de débito recibida, o sobre
// una liquidación de compra emitida. Solo con Kipu Pro o Al Día y con las
// retenciones activadas en Configuración.

import { useState, useEffect, useRef, useMemo } from "react";
import { r2, dosDecimales } from "@/lib/dinero";
import { useSearchParams } from "next/navigation";
import api from "@/lib/api";
import { useBorrador } from "@/lib/borradores";
import BloqueoPlanPro from "@/components/dashboard/BloqueoPlanPro";
import { usePermiso } from "@/hooks/usePermiso";
import { useAuthStore } from "@/store/auth.store";
import { useSandboxStore } from "@/store/sandbox.store";
import { AlertTriangle, Plus, Trash2, CalendarDays, Percent } from "lucide-react";
import Boton from "@/components/ui/Boton";
import BotonIcono from "@/components/ui/BotonIcono";
import ChipsFiltro from "@/components/ui/ChipsFiltro";
import Hoja from "@/components/ui/Hoja";
import Seccion from "@/components/ui/Seccion";
import { Campo, Entrada, Selector } from "@/components/ui/Campo";
import { cn } from "@/components/ui/cn";
import AccionesUsoJusto from "../components/AccionesUsoJusto";
import PuntoEmision from "../components/PuntoEmision";
import PantallaResultado from "../components/PantallaResultado";
import { usePuntoEmision } from "../components/usePuntoEmision";
import CamposAdicionales, { CampoAdicional } from "../components/CamposAdicionales";
import DocOrigenSelector, { DocOrigen } from "../components/DocOrigenSelector";
import EmisionLayout from "../components/EmisionLayout";
import { InputDecimal } from "../components/HojaItem";
import { useEmision } from "../components/useEmision";
import { getPaisesOrdenados } from "@/lib/catalogos/paises-sri";
import {
  fechaCatalogo, obtenerCatalogoRetenciones, type CatalogoRetenciones,
  MAS_USADOS_RESIDENTES, MAS_USADOS_NO_RESIDENTES,
} from "@/lib/catalogos/retenciones";
import { formatoPeriodo } from "@/lib/teclado";
import { MESES } from "@/lib/fecha";
import { tieneAccesoAEmitir } from "@/lib/emision";

const CLASE_VALOR =
  "h-9 w-full rounded-lg border border-borde bg-superficie px-3 text-sm tabular-nums text-texto tactil:h-11 tactil:text-base " +
  "placeholder:text-sutil focus:border-acento focus:outline-none";
const genId = () => Math.random().toString(36).slice(2);

interface ImpuestoRet {
  _id:               string;
  codigo:            string;
  codigoRetencion:   string;
  baseImponible:     number;
  porcentajeRetener: number;
  valorRetenido:     number;
}

// ── Catálogos de retención ───────────────────────────────────────────────────
// El catálogo viene del backend (lib/catalogos/retenciones.ts), versionado por
// la fecha del documento sustento. Si no se puede cargar, se usa RESPALDO: la
// lista de la Fase 1 (Catálogo ATS, bloque "Desde 06/08/2026", y ficha técnica
// v2.34, tabla 20).
interface OpcionRet {
  cod:   string;
  label: string;
  pct:   number;
}

// No residentes: el % depende del régimen fiscal (tipoRegi)
interface OpcionNoResidente extends OpcionRet {
  pctParaiso: number;   // paraíso fiscal (02) o régimen preferente (03)
}

// Lo que usa la pantalla. En cada lista, el primero es el sugerido.
interface CatalogoUI {
  version:      string | null;   // null = respaldo local
  residentes:   OpcionRet[];
  noResidentes: OpcionNoResidente[];
  iva:          OpcionRet[];
  isd:          OpcionRet[];
  sustento:     { value: string; label: string }[];
}

// Renta, pago a residentes (respaldo)
const RESPALDO_RESIDENTES: OpcionRet[] = [
  { cod: "303",  label: "Honorarios profesionales (relacionados con el título)", pct: 10 },
  { cod: "303A", label: "Servicios profesionales prestados por sociedades residentes", pct: 5 },
  { cod: "304",  label: "Servicios donde predomina el intelecto (no relacionados con el título)", pct: 10 },
  { cod: "307",  label: "Servicios donde predomina la mano de obra",        pct: 3  },
  { cod: "308",  label: "Utilización de imagen o renombre (incl. influencers)", pct: 10 },
  { cod: "309",  label: "Servicios de medios de comunicación y agencias de publicidad", pct: 3 },
  // El catálogo indica "1 /0 según resolución NAC-DGERCGC26-00000028"; se sugiere 1.
  { cod: "310",  label: "Transporte privado de pasajeros o transporte de carga", pct: 1 },
  { cod: "312",  label: "Transferencia de bienes muebles corporales",       pct: 2  },
  { cod: "319",  label: "Arrendamiento mercantil (prestado por sociedades)", pct: 2 },
  { cod: "320",  label: "Arrendamiento de bienes inmuebles",                pct: 10 },
  { cod: "322",  label: "Seguros y reaseguros (primas y cesiones)",         pct: 2  },
  { cod: "343",  label: "Otras retenciones aplicables el 1% (incluye RIMPE emprendedores)", pct: 1 },
  { cod: "343A", label: "Energía eléctrica",                                pct: 2  },
  { cod: "343B", label: "Construcción de obra material inmueble, urbanización y similares", pct: 2 },
  { cod: "3440", label: "Otras retenciones aplicables el 3%",               pct: 3  },
  { cod: "3482", label: "Comisiones a sociedades residentes y establecimientos permanentes", pct: 5 },
  { cod: "332",  label: "Otras compras no sujetas a retención (incluye RIMPE negocios populares)", pct: 0 },
];

// Renta, pago a no residentes (respaldo). 501 admite 25 o 37. 501A admite 3, 5,
// 8, 10, 15, 25 y 37 (las tarifas menores son de convenio): se sugiere 25/37 y,
// con convenio, el % queda editable.
// NOTA: 501 confirmado en el Catálogo ATS. Mapeo al casillero 422/472 del 103 deducido (501A ↔ 421 por descripción idéntica), sin tabla oficial.
const RESPALDO_NO_RESIDENTES: OpcionNoResidente[] = [
  { cod: "501",  label: "Beneficios / servicios empresariales", pct: 25, pctParaiso: 37 },
  { cod: "501A", label: "Servicios técnicos, administrativos, consultoría y regalías", pct: 25, pctParaiso: 37 },
];

// Códigos de IVA (respaldo)
const RESPALDO_IVA: OpcionRet[] = [
  { cod: "9",  label: "Retención 10% del IVA",  pct: 10  },
  { cod: "10", label: "Retención 20% del IVA",  pct: 20  },
  { cod: "1",  label: "Retención 30% del IVA",  pct: 30  },
  { cod: "11", label: "Retención 50% del IVA",  pct: 50  },
  { cod: "2",  label: "Retención 70% del IVA",  pct: 70  },
  { cod: "3",  label: "Retención 100% del IVA", pct: 100 },
  { cod: "7",  label: "Retención en cero",      pct: 0   },
  { cod: "8",  label: "No procede retención",   pct: 0   },
];

// ISD (respaldo): 2,5% desde el 01/05/2025
const RESPALDO_ISD: OpcionRet[] = [
  { cod: "4586", label: "Impuesto a la salida de divisas 2,5%", pct: 2.5 },
];

// Sustento (respaldo): Tabla 5 del Catálogo ATS, solo códigos vigentes
const RESPALDO_SUSTENTO = [
  { value: "01", label: "Crédito tributario para IVA" },
  { value: "02", label: "Costo o gasto para IR" },
  { value: "03", label: "Activo fijo — Crédito tributario IVA" },
  { value: "04", label: "Activo fijo — Costo o gasto IR" },
  { value: "05", label: "Liquidación gastos de viaje, hospedaje y alimentación (a nombre de empleados)" },
  { value: "06", label: "Inventario — Crédito tributario IVA" },
  { value: "07", label: "Inventario — Costo o gasto IR" },
  { value: "08", label: "Valor pagado para solicitar reembolso de gasto (intermediario)" },
  { value: "09", label: "Reembolso por siniestros" },
  { value: "10", label: "Distribución de dividendos, beneficios o utilidades" },
  { value: "11", label: "Convenios de débito o recaudación para IFIs" },
  { value: "12", label: "Impuestos y retenciones presuntivos" },
  { value: "13", label: "Valores reconocidos por entidades del sector público" },
  { value: "14", label: "Valores facturados por socios a operadoras de transporte" },
  { value: "15", label: "Pagos por consumos propios y de terceros de servicios digitales" },
];

const RESPALDO: CatalogoUI = {
  version:      null,
  residentes:   RESPALDO_RESIDENTES,
  noResidentes: RESPALDO_NO_RESIDENTES,
  iva:          RESPALDO_IVA,
  isd:          RESPALDO_ISD,
  sustento:     RESPALDO_SUSTENTO,
};

// Pone primero el código sugerido por defecto (303 local, 501 exterior)
function primeroEl<T extends { cod: string }>(lista: T[], cod: string): T[] {
  const i = lista.findIndex(o => o.cod === cod);
  return i <= 0 ? lista : [lista[i], ...lista.slice(0, i), ...lista.slice(i + 1)];
}

// Catálogo del backend → listas de la pantalla. Solo códigos con
// ofrecer_en_ui y con % sugerido: los que tienen varios % sin sugerido (326,
// 504…) esperan al selector de % de la Fase B. Una lista vacía usa el respaldo.
function catalogoUI(c: CatalogoRetenciones): CatalogoUI {
  const renta = c.renta.codigos.filter(x => x.ofrecer_en_ui && x.porcentaje_sugerido !== null);
  const residentes = renta
    .filter(x => x.residencia === "residente")
    .map(x => ({ cod: x.codigo, label: x.descripcion, pct: x.porcentaje_sugerido as number }));
  const noResidentes = renta
    .filter(x => x.residencia === "no_residente")
    .map(x => ({
      cod:        x.codigo,
      label:      x.descripcion.replace(/^Pago a no residentes\s*[-–]\s*/i, ""),
      pct:        x.porcentaje_sugerido as number,
      pctParaiso: x.porcentaje_sugerido_paraiso ?? (x.porcentaje_sugerido as number),
    }));
  const impuesto = (l: CatalogoRetenciones["iva"]) => l.map(i => ({ cod: i.codigo, label: i.descripcion, pct: i.porcentaje }));
  const iva = impuesto(c.iva);
  const isd = impuesto(c.isd);
  const sustento = c.sustento.map(s => ({ value: s.codigo, label: s.descripcion }));
  return {
    version:      c.version,
    residentes:   residentes.length   ? primeroEl(residentes, "303")   : RESPALDO.residentes,
    noResidentes: noResidentes.length ? primeroEl(noResidentes, "501") : RESPALDO.noResidentes,
    iva:          iva.length      ? iva      : RESPALDO.iva,
    isd:          isd.length      ? isd      : RESPALDO.isd,
    sustento:     sustento.length ? sustento : RESPALDO.sustento,
  };
}

// Catálogo para la fecha del documento sustento; si el backend falla, el respaldo
async function cargarCatalogoUI(fecha: string): Promise<{ cat: CatalogoUI; ok: boolean }> {
  try {
    return { cat: catalogoUI(await obtenerCatalogoRetenciones(fecha)), ok: true };
  } catch {
    return { cat: RESPALDO, ok: false };
  }
}

// Régimen general (01) → % general; paraíso fiscal (02) o preferente (03) → % de paraíso
function getOpciones(cat: CatalogoUI, codigo: string, exterior: boolean, tipoRegi: string): OpcionRet[] {
  if (codigo === "2") return cat.iva;
  if (codigo === "6") return cat.isd;
  if (!exterior) return cat.residentes;
  return cat.noResidentes.map(o => ({ cod: o.cod, label: o.label, pct: tipoRegi === "01" ? o.pct : o.pctParaiso }));
}

// Selector de renta: "Más usados" (en el orden de la constante) y después el
// resto en orden numérico, sin repetir
function agruparRenta(opciones: OpcionRet[], exterior: boolean) {
  const lista     = exterior ? MAS_USADOS_NO_RESIDENTES : MAS_USADOS_RESIDENTES;
  const masUsados = lista.flatMap(cod => opciones.filter(o => o.cod === cod));
  const enGrupo   = new Set(masUsados.map(o => o.cod));
  const todos     = opciones
    .filter(o => !enGrupo.has(o.cod))
    .sort((a, b) => a.cod.localeCompare(b.cod, "es", { numeric: true }));
  return { masUsados, todos };
}

function lineaRenta(cat: CatalogoUI, base: number, exterior: boolean, tipoRegi: string): ImpuestoRet {
  const opcion = getOpciones(cat, "1", exterior, tipoRegi)[0];
  return {
    _id: genId(), codigo: "1", codigoRetencion: opcion.cod,
    baseImponible: r2(base), porcentajeRetener: opcion.pct,
    valorRetenido: r2(base * (opcion.pct / 100)),
  };
}

// Retenciones sugeridas para una compra: la de renta va sobre la base SIN IVA
// (sobre el total retenía de más: 10% de $115 en vez de $100) y la de IVA
// sobre el IVA (una línea por cada IVA distinto de cero).
// Local: renta 303 al 10% e IVA código 1 al 30%.
// Exterior: renta 501 según el régimen e IVA código 3 al 100%.
// El usuario ajusta códigos y porcentajes antes de emitir.
function lineasSugeridas(cat: CatalogoUI, base: number, ivas: number[], exterior: boolean, tipoRegi: string): ImpuestoRet[] {
  const iva = exterior
    ? { codigoRetencion: "3", porcentajeRetener: 100 }
    : { codigoRetencion: "1", porcentajeRetener: 30 };
  return [
    lineaRenta(cat, base, exterior, tipoRegi),
    ...ivas.filter(v => v > 0).map(v => ({
      _id: genId(), codigo: "2", ...iva,
      baseImponible: r2(v), valorRetenido: r2(v * (iva.porcentajeRetener / 100)),
    })),
  ];
}

// FAC y NDB recibidas: siempre pago local
function retencionesSugeridas(cat: CatalogoUI, base: number, iva: number): ImpuestoRet[] {
  return lineasSugeridas(cat, base, [iva], false, "01");
}

// Ajusta las líneas de renta al catálogo del tipo de pago y régimen actuales:
// un código que no está en la lista toma el primero de ella, y el % se toma de
// la lista (así un cambio de régimen pasa el 501 de 25% a 37%).
function reajustarRenta(cat: CatalogoUI, lineas: ImpuestoRet[], exterior: boolean, tipoRegi: string): ImpuestoRet[] {
  const opciones = getOpciones(cat, "1", exterior, tipoRegi);
  return lineas.map(l => {
    if (l.codigo !== "1") return l;
    const opcion = opciones.find(o => o.cod === l.codigoRetencion) ?? opciones[0];
    return {
      ...l, codigoRetencion: opcion.cod, porcentajeRetener: opcion.pct,
      valorRetenido: r2(l.baseImponible * (opcion.pct / 100)),
    };
  });
}

// Al cambiar de catálogo (otra fecha de sustento): solo las líneas de renta
// cuyo código ya no se ofrece pasan al primero de la lista; las demás no se tocan.
function reemplazarNoOfrecidos(cat: CatalogoUI, lineas: ImpuestoRet[], exterior: boolean, tipoRegi: string): ImpuestoRet[] {
  const opciones = getOpciones(cat, "1", exterior, tipoRegi);
  return lineas.map(l => {
    if (l.codigo !== "1" || opciones.some(o => o.cod === l.codigoRetencion)) return l;
    const opcion = opciones[0];
    return {
      ...l, codigoRetencion: opcion.cod, porcentajeRetener: opcion.pct,
      valorRetenido: r2(l.baseImponible * (opcion.pct / 100)),
    };
  });
}

// Proveedor del exterior: tipo de identificación 08. Si el registro no trae el
// tipo, se usa como respaldo la identificación: lo que no es cédula ni RUC
// (10 o 13 dígitos numéricos) se trata como del exterior.
function esProveedorExterior(tipoId?: string | null, identificacion?: string | null): boolean {
  if (tipoId) return tipoId === "08";
  const ident = (identificacion ?? "").trim();
  if (!ident) return false;
  return !/^(\d{10}|\d{13})$/.test(ident);
}

// Tipo de identificación del proveedor de una LIQ emitida (null si no se pudo leer)
async function tipoIdProveedorLiq(liqId: string): Promise<string | null> {
  try {
    const res = await api.get(`/api/v1/app/documentos/${liqId}`);
    return res.data.data?.datos?.infoLiquidacionCompra?.tipoIdentificacionProveedor ?? null;
  } catch {
    return null;
  }
}

// Líneas sugeridas para una LIQ emitida a partir de su desglose. Sin desglose,
// el total se toma como base sin IVA.
async function lineasDesdeLiq(cat: CatalogoUI, liqId: string, importeTotal: number, exterior: boolean, tipoRegi: string): Promise<ImpuestoRet[]> {
  try {
    const res     = await api.get(`/api/v1/app/documentos/${liqId}/desglose`);
    const desglose = res.data.data as {
      subtotal: number;
      resumen_impuestos?: { tarifa?: string | number; valor?: string | number }[];
    };
    const ivas = (desglose.resumen_impuestos ?? [])
      .filter(imp => parseFloat(String(imp.tarifa ?? "0")) > 0)
      .map(imp => parseFloat(String(imp.valor ?? "0")));
    return lineasSugeridas(cat, Number(desglose.subtotal) || 0, ivas, exterior, tipoRegi);
  } catch {
    return lineasSugeridas(cat, Number(importeTotal) || 0, [], exterior, tipoRegi);
  }
}

// Base e IVA de un recibido; si el backend no los manda (registros viejos),
// el total se toma como base sin IVA.
function baseEIva(d: { importe_total: number; subtotal_base?: number; valor_iva_total?: number }) {
  const base = Number(d.subtotal_base);
  if (Number.isFinite(base) && base > 0) return { base, iva: Number(d.valor_iva_total) || 0 };
  return { base: Number(d.importe_total) || 0, iva: 0 };
}

const TIPOS_IMPUESTO = [
  { value: "1", label: "Renta" },
  { value: "2", label: "IVA"   },
  { value: "6", label: "ISD"   },
];

type OrigenRet = "fac_recibida" | "liq_emitida" | "ndb_recibida";

const ORIGEN_CONFIG: Record<OrigenRet, {
  chip: string; label: string; tiposDoc: string; tabla: "emitidos" | "recibidos"; nota: string;
}> = {
  fac_recibida: {
    chip:     "Factura recibida",
    label:    "Factura del proveedor",
    tiposDoc: "FAC",
    tabla:    "recibidos",
    nota:     "Retención sobre una factura que recibiste de un proveedor",
  },
  liq_emitida: {
    chip:     "Liquidación que emití",
    label:    "Liquidación de compra",
    tiposDoc: "LIQ",
    tabla:    "emitidos",
    nota:     "Retención sobre una liquidación de compra que tú emitiste al proveedor",
  },
  ndb_recibida: {
    chip:     "Nota de débito recibida",
    label:    "Nota de débito del proveedor",
    tiposDoc: "NDB",
    tabla:    "recibidos",
    nota:     "Retención sobre una nota de débito que recibiste de un proveedor",
  },
};

const FORMAS_PAGO_RET = [
  { value: "01", label: "Sin sistema financiero" },
  { value: "16", label: "Tarjeta de débito" },
  { value: "17", label: "Dinero electrónico" },
  { value: "19", label: "Tarjeta de crédito" },
  { value: "20", label: "Otros con sistema financiero" },
  { value: "15", label: "Compensación de deudas" },
];

// "11/2026" → "noviembre de 2026" (si no tiene ese formato, se devuelve tal cual)
// PENDIENTE-CONSULTA: confirmar con contador si el 103 corresponde a periodoFiscal o al mes de emisión de la RET (caso: compra fin de mes, RET inicio del mes siguiente).
function mesDelPeriodo(periodo: string): string {
  const m = /^(\d{2})\/(\d{4})$/.exec(periodo.trim());
  const mes = m ? MESES[Number(m[1]) - 1] : undefined;
  return mes ? `${mes} de ${m![2]}` : periodo;
}

export default function NuevaRetPage() {
  const searchParams = useSearchParams();
  const empresa      = useAuthStore((s) => s.empresa);
  // Con el sandbox activo el backend emite en pruebas aunque la empresa esté en producción
  const sandboxActivo = useSandboxStore((s) => s.activo);
  const enProduccion  = empresa?.ambiente === 2 && !sandboxActivo;
  // Activar las retenciones es de quien configura la empresa (mismo permiso que Configuración)
  const puedeConfigurar = usePermiso("configuracion");
  // Con plan gratis no se gastan créditos (mismo criterio que ResumenTotales)
  const usaCreditos  = !empresa?.suscripcion_activa && !empresa?.emision_gratis && (empresa?.balance_api ?? 0) > 0;

  // Lista de países ordenada desde el módulo externo
  const paisesOrdenados = getPaisesOrdenados();

  // Envío: clave anti-duplicados, error, uso justo, plan requerido y resultado
  const em = useEmision();
  const { enviando: submitting, error, setError, resultado } = em;

  // Tipo de origen
  const [origenTipo, setOrigenTipo] = useState<OrigenRet>("fac_recibida");
  const [docOrigen,  setDocOrigen]  = useState<DocOrigen>(null);

  // Período fiscal
  const hoy = new Date();
  const [periodoFiscal, setPeriodoFiscal] = useState(
    `${String(hoy.getMonth() + 1).padStart(2, "0")}/${hoy.getFullYear()}`
  );

  // Estados RET v2.0.0
  const [codSustento,        setCodSustento]        = useState("01");
  const [pagoLocExt,         setPagoLocExt]         = useState("01");
  const [parteRel,           setParteRel]           = useState("NO");
  const [formaPagoSustento, setFormaPagoSustento] = useState("01");

  // Estados adicionales para pago al exterior (pagoLocExt === "02")
  const [tipoRegi,           setTipoRegi]           = useState("01");
  const [paisEfecPago,       setPaisEfecPago]       = useState("");     // tabla 25 (Irlanda = 217)
  const [aplicConvDobTrib,   setAplicConvDobTrib]   = useState("NO");
  const [pagExtSujRetNorLeg, setPagExtSujRetNorLeg] = useState("SI");
  const [pagoRegFis,         setPagoRegFis]         = useState("NO");
  // Obligatorio con identificación del exterior (08): 01 persona natural, 02 sociedad
  const [tipoSujetoRetenido, setTipoSujetoRetenido] = useState("02");
  const esExterior = pagoLocExt === "02";

  // Impuestos
  const [impuestos, setImpuestos] = useState<ImpuestoRet[]>(() => [lineaRenta(RESPALDO, 0, false, "01")]);

  // Catálogo vigente para la fecha del documento sustento (sin documento, hoy)
  const [catalogo,      setCatalogo]      = useState<CatalogoUI>(RESPALDO);
  const [avisoCatalogo, setAvisoCatalogo] = useState("");
  const fechaSustento = fechaCatalogo(
    docOrigen?.tipo === "kipu" ? docOrigen.data.fecha_emision
    : docOrigen?.tipo === "manual" ? docOrigen.data.fecha
    : null
  );
  // Pago y régimen al llegar el catálogo (los cambios del usuario los ajustan
  // cambiarPagoLocExt y cambiarTipoRegi; este efecto solo reacciona a la fecha)
  const pagoActual = useRef({ esExterior, tipoRegi });
  useEffect(() => { pagoActual.current = { esExterior, tipoRegi }; }, [esExterior, tipoRegi]);

  // Único efecto que reajusta líneas: al cambiar el catálogo, solo las de renta
  // con un código que ya no se ofrece
  useEffect(() => {
    let vigente = true;
    cargarCatalogoUI(fechaSustento).then(({ cat, ok }) => {
      if (!vigente) return;
      setCatalogo(cat);
      setAvisoCatalogo(ok ? "" : "No se pudo cargar el catálogo actualizado");
      const { esExterior: exterior, tipoRegi: regimen } = pagoActual.current;
      setImpuestos(prev => reemplazarNoOfrecidos(cat, prev, exterior, regimen));
    });
    return () => { vigente = false; };
  }, [fechaSustento]);

  const [camposAdicionales, setCamposAdicionales] = useState<CampoAdicional[]>([]);

  // Establecimiento y punto de emisión
  const pe = usePuntoEmision(origenTipo === "liq_emitida" ? (docOrigen?.tipo === "kipu" ? docOrigen.data.numero_doc : docOrigen?.tipo === "manual" ? docOrigen.data.numero : null) : null);
  const { estabSelected, ptoSelected } = pe;

  // En producción, una retención genera la obligación del 103 (y del 104 si
  // retiene IVA): se pide confirmar antes de emitir para evitar "pruebas" reales.
  const [confirmarProduccion, setConfirmarProduccion] = useState(false);
  // Solo una retención de IVA con valor activa el 104: los códigos 7 y 8 (0%) no
  const retieneIva = impuestos.some(i => i.codigo === "2" && i.valorRetenido > 0);

  const totalRetenido = r2(impuestos.reduce((s, i) => s + (i.valorRetenido || 0), 0));

  // Pre-cargar desde query params
  useEffect(() => {
    const docOrigenRecibidoId = searchParams.get("doc_origen_recibido_id");
    const docOrigenEmitidoId  = searchParams.get("doc_origen_emitido_id");

    if (docOrigenEmitidoId) {
      setOrigenTipo("liq_emitida");
      const cargar = async () => {
        try {
          const res  = await api.get(`/api/v1/app/documentos/${docOrigenEmitidoId}`);
          const d    = res.data.data;
          const info = d.datos?.infoLiquidacionCompra || {};
          setDocOrigen({
            tipo: "kipu",
            data: {
              id:             d.id,
              numero_doc:     d.numero_doc,
              tipo_doc:       "LIQ",
              cod_doc:        d.cod_doc || "03",
              fecha_emision:  d.fecha_emision,
              importe_total:  d.importe_total,
              razon_social:   info.razonSocialProveedor || "",
              identificacion: info.identificacionProveedor || "",
              estado_sri:     d.estado_sri,
            }
          });

          // Al cargar la página el régimen fiscal siempre es el inicial (01)
          const exterior = esProveedorExterior(info.tipoIdentificacionProveedor, info.identificacionProveedor);
          setPagoLocExt(exterior ? "02" : "01");
          const { cat } = await cargarCatalogoUI(fechaCatalogo(d.fecha_emision));
          setImpuestos(await lineasDesdeLiq(cat, d.id, d.importe_total, exterior, "01"));
        } catch (e) { console.error(e); }
      };
      cargar();
    } else if (docOrigenRecibidoId) {
      const cargar = async () => {
        try {
          const res = await api.get(`/api/v1/app/recibidos/${docOrigenRecibidoId}`);
          const d   = res.data.data;
          if (d.tipo_doc === "NDB" || d.cod_doc === "05") {
            setOrigenTipo("ndb_recibida");
          } else {
            setOrigenTipo("fac_recibida");
          }
          setDocOrigen({
            tipo: "kipu",
            data: {
              id:             d.id,
              numero_doc:     d.numero_doc,
              tipo_doc:       d.tipo_doc || "FAC",
              cod_doc:        d.cod_doc  || "01",
              fecha_emision:  d.fecha_emision,
              importe_total:  d.importe_total,
              razon_social:   d.razon_social_proveedor || "",
              identificacion: d.ruc_proveedor || "",
              estado_sri:     d.estado_sri || "AUTORIZADO",
            }
          });
          const { base, iva } = baseEIva(d);
          setPagoLocExt("01");
          const { cat } = await cargarCatalogoUI(fechaCatalogo(d.fecha_emision));
          setImpuestos(retencionesSugeridas(cat, base, iva));
        } catch (e) { console.error(e); }
      };
      cargar();
    }
  }, [searchParams]);

  const cambiarOrigen = (nuevo: OrigenRet) => {
    setOrigenTipo(nuevo);
    setDocOrigen(null);
  };

  // La línea nueva toma el primer código del catálogo vigente (residente o exterior)
  const addImpuesto = () => setImpuestos([...impuestos, lineaRenta(catalogo, 0, esExterior, tipoRegi)]);

  // Pago local/exterior: cambia el catálogo de renta
  const cambiarPagoLocExt = (valor: string) => {
    setPagoLocExt(valor);
    setImpuestos(prev => reajustarRenta(catalogo, prev, valor === "02", tipoRegi));
  };

  // Régimen fiscal: cambia el % de renta (25 o 37) y pagoRegFis
  const cambiarTipoRegi = (valor: string) => {
    setTipoRegi(valor);
    setPagoRegFis(valor === "01" ? "NO" : "SI");
    setImpuestos(prev => reajustarRenta(catalogo, prev, esExterior, valor));
  };

  // Sin convenio, el % de renta vuelve a la tarifa del catálogo
  const cambiarConvenio = (valor: string) => {
    setAplicConvDobTrib(valor);
    if (valor === "NO") setImpuestos(prev => reajustarRenta(catalogo, prev, esExterior, tipoRegi));
  };

  // Con convenio de doble tributación, el % de renta se ajusta a la tarifa del convenio
  const pctEditable = (imp: ImpuestoRet) =>
    esExterior && aplicConvDobTrib === "SI" && imp.codigo === "1";

  // Detección local/exterior y retenciones sugeridas al elegir el documento sustento
  const sugerirDesdeOrigen = async (selected: DocOrigen) => {
    if (selected?.tipo !== "kipu") return;
    // Mismo pedido (en caché) que el efecto del catálogo: las líneas salen del de esa fecha
    const { cat } = await cargarCatalogoUI(fechaCatalogo(selected.data.fecha_emision));
    if (origenTipo === "liq_emitida") {
      const tipoId   = await tipoIdProveedorLiq(selected.data.id);
      const exterior = esProveedorExterior(tipoId, selected.data.identificacion);
      setPagoLocExt(exterior ? "02" : "01");
      setImpuestos(await lineasDesdeLiq(cat, selected.data.id, selected.data.importe_total, exterior, tipoRegi));
    } else {
      const { base, iva } = baseEIva(selected.data);
      setPagoLocExt("01");
      setImpuestos(retencionesSugeridas(cat, base, iva));
    }
  };

  const removeImpuesto = (id: string) => {
    if (impuestos.length === 1) return;
    setImpuestos(impuestos.filter(i => i._id !== id));
  };

  const editImpuesto = (id: string, field: keyof ImpuestoRet, value: any) => {
    setImpuestos(impuestos.map(imp => {
      if (imp._id !== id) return imp;
      const updated = { ...imp, [field]: value };
      if (field === "baseImponible" || field === "porcentajeRetener") {
        updated.valorRetenido = r2(
          (field === "baseImponible" ? value : updated.baseImponible) *
          ((field === "porcentajeRetener" ? value : updated.porcentajeRetener) / 100)
        );
      }
      if (field === "codigo") {
        const opciones = getOpciones(catalogo, value, esExterior, tipoRegi);
        updated.codigoRetencion   = opciones[0].cod;
        updated.porcentajeRetener = opciones[0].pct;
        updated.valorRetenido     = r2(updated.baseImponible * (opciones[0].pct / 100));
      }
      if (field === "codigoRetencion") {
        const opciones = getOpciones(catalogo, updated.codigo, esExterior, tipoRegi);
        const opcion   = opciones.find(o => o.cod === value);
        if (opcion) {
          updated.porcentajeRetener = opcion.pct;
          updated.valorRetenido     = r2(updated.baseImponible * (opcion.pct / 100));
        }
      }
      return updated;
    }));
  };

  // ── Borrador (con documento de fuera la pantalla llega cargada: no se ofrece el viejo) ──
  const desdeDocumento = !!(searchParams.get("doc_origen_recibido_id") || searchParams.get("doc_origen_emitido_id"));
  const datosBorrador = useMemo(() => ({
    origenTipo, docOrigen, periodoFiscal, codSustento, pagoLocExt, parteRel, formaPagoSustento,
    tipoRegi, paisEfecPago, aplicConvDobTrib, pagExtSujRetNorLeg, pagoRegFis, tipoSujetoRetenido,
    impuestos, camposAdicionales,
  }), [origenTipo, docOrigen, periodoFiscal, codSustento, pagoLocExt, parteRel, formaPagoSustento,
       tipoRegi, paisEfecPago, aplicConvDobTrib, pagExtSujRetNorLeg, pagoRegFis, tipoSujetoRetenido,
       impuestos, camposAdicionales]);
  const borrador = useBorrador("RET", datosBorrador, {
    vacio: !docOrigen && camposAdicionales.length === 0 && impuestos.every(i => !i.baseImponible),
    desactivado: desdeDocumento,
  });
  const seguirBorrador = () => {
    const d = borrador.recuperar();
    if (!d) return;
    setOrigenTipo(d.origenTipo ?? "fac_recibida");
    setDocOrigen(d.docOrigen ?? null);
    if (d.periodoFiscal) setPeriodoFiscal(d.periodoFiscal);
    setCodSustento(d.codSustento ?? "01");
    setPagoLocExt(d.pagoLocExt ?? "01");
    setParteRel(d.parteRel ?? "NO");
    setFormaPagoSustento(d.formaPagoSustento ?? "01");
    setTipoRegi(d.tipoRegi ?? "01");
    setPaisEfecPago(d.paisEfecPago ?? "");
    setAplicConvDobTrib(d.aplicConvDobTrib ?? "NO");
    setPagExtSujRetNorLeg(d.pagExtSujRetNorLeg ?? "SI");
    setPagoRegFis(d.pagoRegFis ?? "NO");
    setTipoSujetoRetenido(d.tipoSujetoRetenido ?? "02");
    if (Array.isArray(d.impuestos) && d.impuestos.length) setImpuestos(d.impuestos);
    setCamposAdicionales(Array.isArray(d.camposAdicionales) ? d.camposAdicionales : []);
  };

  const reset = () => {
    pe.reiniciar();
    em.reiniciar();
    setDocOrigen(null);
    setOrigenTipo("fac_recibida");
    setImpuestos([lineaRenta(catalogo, 0, false, "01")]);
    setCamposAdicionales([]);
    setCodSustento("01");
    setPagoLocExt("01");
    setParteRel("NO");
    setFormaPagoSustento("01");
    setTipoRegi("01");
    setPaisEfecPago("");
    setAplicConvDobTrib("NO");
    setPagExtSujRetNorLeg("SI");
    setPagoRegFis("NO");
    setTipoSujetoRetenido("02");
    setConfirmarProduccion(false);
  };

  const puedeEmitir = tieneAccesoAEmitir(empresa);

  const emitir = async (confirmado = false) => {
    setError("");
    if (!docOrigen)                     { setError("Selecciona el documento sustento."); return; }
    if (!estabSelected || !ptoSelected) { setError("Elige el establecimiento y el punto de emisión."); return; }
    if (impuestos.some(i => i.baseImponible <= 0)) { setError("La base imponible debe ser mayor a $0."); return; }
    if (esExterior && !paisEfecPago)    { setError("Selecciona el país del pago al exterior (en Período y sustento)."); return; }

    if (enProduccion && !confirmado) { setConfirmarProduccion(true); return; }
    setConfirmarProduccion(false);

    const payload: Record<string, unknown> = {
      establecimiento:     estabSelected,
      punto_emision:       ptoSelected,
      periodo_fiscal:      periodoFiscal,
      cod_sustento:        codSustento,
      pago_loc_ext:        pagoLocExt,
      forma_pago_sustento: formaPagoSustento,
      parte_rel:           parteRel,
      ...(esExterior ? {
        tipo_regi:               tipoRegi,
        pais_efec_pago:          paisEfecPago,
        aplic_conv_dob_trib:      aplicConvDobTrib,
        pag_ext_suj_ret_nor_leg: pagExtSujRetNorLeg,
        pago_reg_fis:            pagoRegFis,
        // El backend solo lo escribe en el XML si el sujeto retenido tiene identificación 08
        tipo_sujeto_retenido:    tipoSujetoRetenido,
      } : {}),
      impuestos: impuestos.map(i => ({
        codigo:            i.codigo,
        codigoRetencion:   i.codigoRetencion,
        baseImponible:     i.baseImponible,
        porcentajeRetener: i.porcentajeRetener,
        valorRetenido:     i.valorRetenido,
      })),
      campos_adicionales: camposAdicionales.filter(c => c.nombre && c.valor),
    };

    if (origenTipo === "liq_emitida") {
      if (docOrigen.tipo === "kipu") {
        payload.doc_origen_emitido_id = docOrigen.data.id;
      } else {
        payload.doc_origen_numero  = docOrigen.data.numero;
        payload.doc_origen_fecha   = docOrigen.data.fecha;
        payload.doc_origen_cod_doc = docOrigen.data.cod_doc;
        payload.cliente_origen     = docOrigen.data.cliente;
      }
    } else {
      if (docOrigen.tipo === "kipu") {
        payload.doc_origen_recibido_id = docOrigen.data.id;
      } else {
        payload.doc_origen_numero  = docOrigen.data.numero;
        payload.doc_origen_fecha   = docOrigen.data.fecha;
        payload.doc_origen_cod_doc = docOrigen.data.cod_doc;
        payload.cliente_origen     = docOrigen.data.cliente;
      }
    }

    const r = await em.enviar("/api/v1/app/documentos/emit/RET", payload,
                              { tipo: "RET", porDefecto: "Error al emitir la retención." });
    if (r) { borrador.borrar(); em.setResultado(r); }
  };

  // Primero el plan: a una empresa Gratis no le sirve activar las retenciones
  // (el backend responde 402 PLAN_REQUERIDO)
  if ((empresa && !empresa.suscripcion_activa) || em.planRequerido) {
    return (
      <div className="p-4 md:p-6">
        <BloqueoPlanPro mensaje={em.planRequerido || undefined} />
      </div>
    );
  }

  // Después, el interruptor de la empresa (Configuración)
  if (empresa && !empresa.emite_retenciones) {
    return (
      <div className="p-4 md:p-6">
        {puedeConfigurar ? (
          <BloqueoPlanPro
            titulo="Retenciones desactivadas"
            mensaje="Actívalas en Configuración, con «Emito comprobantes de retención»."
            accion={{ href: "/configuracion#retenciones", label: "Ir a Configuración" }}
          />
        ) : (
          <BloqueoPlanPro
            titulo="Retenciones desactivadas"
            mensaje="Pídele al administrador de la empresa que active las retenciones en Configuración."
            accion={null}
          />
        )}
      </div>
    );
  }

  if (resultado) {
    return <PantallaResultado tipo="RET" resultado={resultado} onNueva={reset} />;
  }

  const origenCfg = ORIGEN_CONFIG[origenTipo];
  const esLiqEmitida = origenTipo === "liq_emitida" && docOrigen !== null;
  const resumenSri = `${periodoFiscal} · sustento ${codSustento} · `
    + (esExterior ? `exterior${paisEfecPago ? ` (${paisEfecPago})` : ""}` : "local");

  return (
    <EmisionLayout
      titulo="Nueva retención"
      subtitulo={<>{empresa?.razon_social} · {empresa?.ambiente === 2 ? "Producción" : "Pruebas"}</>}
      tiposEmision={["RET"]}
      borrador={borrador.pendiente && {
        hace: borrador.pendiente.hace, que: "una retención",
        onSeguir: seguirBorrador, onDescartar: borrador.descartar,
      }}
      lateral={<>
        <div className="hidden lg:block">
          <PuntoEmision {...pe} />
        </div>

        <section className="space-y-3 rounded-xl border border-borde bg-superficie p-4 lg:sticky lg:top-4">
          <h2 className="text-sm font-semibold text-texto">Resumen</h2>
          <div className="space-y-2 text-sm">
            {impuestos.map((imp) => (
              <div key={imp._id} className="flex justify-between gap-3 text-tenue">
                <span>{TIPOS_IMPUESTO.find(t => t.value === imp.codigo)?.label ?? "Retención"} {imp.codigoRetencion} · {imp.porcentajeRetener}%</span>
                <span className="tabular-nums">${dosDecimales(imp.valorRetenido)}</span>
              </div>
            ))}
            <div className="flex justify-between border-t border-borde pt-2 text-base font-bold text-texto">
              <span>Total retenido</span>
              <span className="tabular-nums">${dosDecimales(totalRetenido)}</span>
            </div>
          </div>

          {puedeEmitir && (
            <p className={cn("rounded-lg px-3 py-2 text-xs",
              usaCreditos ? "bg-alerta-suave text-alerta-texto" : "bg-exito-suave text-exito-texto")}>
              {usaCreditos
                ? `Consumirá 1 crédito API · Disponibles: ${empresa?.balance_api}`
                : !empresa?.suscripcion_activa
                  ? "Plan gratis · uso justo de comprobantes al mes"
                  : "Incluido en tu suscripción"}
            </p>
          )}

          {error && (
            <p className="rounded-lg bg-peligro-suave px-3 py-2 text-xs text-peligro-texto" role="alert">{error}</p>
          )}
          {em.esUsoJusto && <AccionesUsoJusto />}

          <Boton anchoCompleto tamano="lg" onClick={() => emitir()} cargando={submitting} disabled={!puedeEmitir}
                 className="hidden h-auto min-h-11 whitespace-normal py-2.5 lg:flex">
            {`Emitir retención${pe.serie ? ` desde ${pe.serie}` : ""} · $${dosDecimales(totalRetenido)}`}
          </Boton>
        </section>
      </>}
      barra={{
        total:         totalRetenido,
        texto:         "Emitir retención",
        onEmitir:      () => emitir(),
        enviando:      submitting,
        deshabilitado: !puedeEmitir,
        error,
      }}
    >
      <div className="lg:hidden">
        <PuntoEmision {...pe} />
      </div>

      {/* Sobre qué documento se retiene */}
      <section className="space-y-3 rounded-xl border border-borde bg-superficie p-4">
        <h2 className="text-sm font-semibold text-texto">¿Sobre qué documento retienes?</h2>
        <ChipsFiltro
          etiqueta="Tipo de documento sustento"
          opciones={(Object.keys(ORIGEN_CONFIG) as OrigenRet[]).map(k => ({ valor: k, etiqueta: ORIGEN_CONFIG[k].chip }))}
          valor={origenTipo}
          onCambio={(v) => cambiarOrigen(v as OrigenRet)}
        />
      </section>

      <DocOrigenSelector
        tiposDoc={origenCfg.tiposDoc}
        tabla={origenCfg.tabla}
        value={docOrigen}
        onChange={async (selected) => {
          setDocOrigen(selected);
          await sugerirDesdeOrigen(selected);
        }}
        label={origenCfg.label}
        nota={origenCfg.nota}
        // Sin base ni IVA del documento externo el XML no sale (ver PENDIENTES.md)
        externoNoDisponible="Próximamente: retención sobre documentos que no están en Kipu"
      />

      {/* Período y clasificación del sustento (RET v2.0.0): casi siempre lo de siempre */}
      <Seccion titulo="Período y sustento" icono={CalendarDays} resumen={resumenSri} abierta={esExterior}>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Campo etiqueta="Período fiscal" ayuda="MM/AAAA">
              <Entrada
                inputMode="numeric"
                autoComplete="off"
                value={periodoFiscal}
                onChange={e => setPeriodoFiscal(formatoPeriodo(e.target.value))}
                placeholder="MM/AAAA"
                maxLength={7}
              />
            </Campo>
            <Campo etiqueta="Pago">
              <Selector value={pagoLocExt} onChange={e => cambiarPagoLocExt(e.target.value)}>
                <option value="01">Local</option>
                <option value="02">Exterior</option>
              </Selector>
            </Campo>
          </div>

          <Campo etiqueta="Código de sustento (ATS)"
                 ayuda={esExterior ? "Si es un servicio digital (Meta, Google, etc.), usa sustento 15." : undefined}>
            <Selector value={codSustento} onChange={e => setCodSustento(e.target.value)}>
              {catalogo.sustento.map(c => (
                <option key={c.value} value={c.value}>{c.value} · {c.label}</option>
              ))}
            </Selector>
          </Campo>

          {/* Pago al exterior */}
          {esExterior && (
            <div className="space-y-3 border-t border-borde pt-3">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Campo etiqueta="Régimen fiscal exterior">
                  <Selector value={tipoRegi} onChange={e => cambiarTipoRegi(e.target.value)}>
                    <option value="01">01 · General</option>
                    <option value="02">02 · Paraíso fiscal</option>
                    <option value="03">03 · Régimen fiscal preferente</option>
                  </Selector>
                </Campo>
                <Campo etiqueta="País del pago">
                  <Selector value={paisEfecPago} onChange={e => setPaisEfecPago(e.target.value)}>
                    <option value="">Elige el país…</option>
                    {paisesOrdenados.map(p => (
                      <option key={p.codigo} value={p.codigo}>{p.codigo} · {p.nombre}</option>
                    ))}
                  </Selector>
                </Campo>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Campo etiqueta="Convenio de doble tributación">
                  <Selector value={aplicConvDobTrib} onChange={e => cambiarConvenio(e.target.value)}>
                    <option value="NO">No</option>
                    <option value="SI">Sí</option>
                  </Selector>
                </Campo>
                <Campo etiqueta="Pago a régimen preferente">
                  <Selector value={pagoRegFis} onChange={e => setPagoRegFis(e.target.value)}>
                    <option value="NO">No</option>
                    <option value="SI">Sí</option>
                  </Selector>
                </Campo>
              </div>
              {/* Solo si NO hay convenio */}
              {aplicConvDobTrib === "NO" && (
                <Campo etiqueta="Sujeto a retención por norma legal">
                  <Selector value={pagExtSujRetNorLeg} onChange={e => setPagExtSujRetNorLeg(e.target.value)}>
                    <option value="SI">Sí</option>
                    <option value="NO">No</option>
                  </Selector>
                </Campo>
              )}
              {/* Obligatorio con identificación 08 */}
              <Campo etiqueta="Tipo de sujeto retenido">
                <Selector value={tipoSujetoRetenido} onChange={e => setTipoSujetoRetenido(e.target.value)}>
                  <option value="01">01 · Persona natural</option>
                  <option value="02">02 · Sociedad</option>
                </Selector>
              </Campo>
            </div>
          )}

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Campo etiqueta="Parte relacionada">
              <Selector value={parteRel} onChange={e => setParteRel(e.target.value)}>
                <option value="NO">No</option>
                <option value="SI">Sí</option>
              </Selector>
            </Campo>
            <Campo etiqueta="Forma de pago del sustento">
              <Selector value={formaPagoSustento} onChange={e => setFormaPagoSustento(e.target.value)}>
                {FORMAS_PAGO_RET.map(f => (
                  <option key={f.value} value={f.value}>{f.value} · {f.label}</option>
                ))}
              </Selector>
            </Campo>
          </div>
        </div>
      </Seccion>

      {/* Impuestos retenidos */}
      <section className="space-y-3 rounded-xl border border-borde bg-superficie p-4">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-texto">
          <Percent size={16} className="text-acento" aria-hidden /> Impuestos retenidos
        </h2>

        {avisoCatalogo && (
          <p className="flex items-center gap-1.5 text-xs text-alerta-texto">
            <AlertTriangle size={12} className="shrink-0" aria-hidden /> {avisoCatalogo}
          </p>
        )}
        {esLiqEmitida && (
          <p className="text-xs text-sutil">
            Las bases imponibles salen de la liquidación. Puedes ajustar el tipo y el porcentaje de retención.
          </p>
        )}

        {impuestos.map((imp, idx) => {
          const opciones = getOpciones(catalogo, imp.codigo, esExterior, tipoRegi);
          const pctLibre = pctEditable(imp);
          return (
            <div key={imp._id} className="space-y-3 rounded-lg border border-borde p-3">
              <div className="flex min-h-8 items-center justify-between">
                <span className="text-xs font-medium text-sutil">Retención {idx + 1}</span>
                {!esLiqEmitida && impuestos.length > 1 && (
                  <BotonIcono etiqueta={`Quitar la retención ${idx + 1}`} icono={<Trash2 size={16} />}
                              variante="peligro" tamano="sm" onClick={() => removeImpuesto(imp._id)} />
                )}
              </div>
              <div className="grid grid-cols-[6.5rem_1fr] gap-3">
                <Campo etiqueta="Impuesto">
                  <Selector value={imp.codigo} onChange={e => editImpuesto(imp._id, "codigo", e.target.value)}>
                    {TIPOS_IMPUESTO.map(t => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </Selector>
                </Campo>
                <Campo etiqueta="Código / concepto">
                  <Selector value={imp.codigoRetencion} onChange={e => editImpuesto(imp._id, "codigoRetencion", e.target.value)}>
                    {imp.codigo === "1" ? (() => {
                      const { masUsados, todos } = agruparRenta(opciones, esExterior);
                      const opcion = (o: OpcionRet) => (
                        <option key={o.cod} value={o.cod}>{o.cod} · {o.label}</option>
                      );
                      return (
                        <>
                          {masUsados.length > 0 && <optgroup label="Más usados">{masUsados.map(opcion)}</optgroup>}
                          {todos.length > 0 && <optgroup label="Todos los códigos">{todos.map(opcion)}</optgroup>}
                        </>
                      );
                    })() : opciones.map(o => (
                      <option key={o.cod} value={o.cod}>{o.cod} · {o.label}</option>
                    ))}
                  </Selector>
                </Campo>
              </div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                <Campo etiqueta="Base imponible" id={`ret-base-${imp._id}`}>
                  {esLiqEmitida ? (
                    <Fijo>${dosDecimales(imp.baseImponible)}</Fijo>
                  ) : (
                    <InputDecimal id={`ret-base-${imp._id}`} value={imp.baseImponible} placeholder="0.00"
                                  onChange={v => editImpuesto(imp._id, "baseImponible", v)} className={CLASE_VALOR} />
                  )}
                </Campo>
                <Campo etiqueta="% a retener" id={`ret-pct-${imp._id}`}
                       ayuda={pctLibre ? "Según la tarifa del convenio." : undefined}>
                  {pctLibre ? (
                    <InputDecimal id={`ret-pct-${imp._id}`} value={imp.porcentajeRetener}
                                  onChange={v => editImpuesto(imp._id, "porcentajeRetener", Math.min(100, v))}
                                  className={CLASE_VALOR} />
                  ) : (
                    <Fijo>{imp.porcentajeRetener}%</Fijo>
                  )}
                </Campo>
                <Campo etiqueta="Valor retenido" id={`ret-valor-${imp._id}`} className="col-span-2 sm:col-span-1">
                  <InputDecimal id={`ret-valor-${imp._id}`} value={imp.valorRetenido} placeholder="0.00"
                                onChange={v => editImpuesto(imp._id, "valorRetenido", v)} className={CLASE_VALOR} />
                </Campo>
              </div>
            </div>
          );
        })}

        <div className="flex items-center justify-between gap-3 border-t border-borde pt-3">
          {!esLiqEmitida ? (
            <Boton variante="secundario" tamano="sm" onClick={addImpuesto} icono={<Plus size={14} />}>
              Agregar retención
            </Boton>
          ) : <span />}
          <p className="text-sm text-tenue">
            Total <span className="font-bold tabular-nums text-texto">${dosDecimales(totalRetenido)}</span>
          </p>
        </div>
      </section>

      <CamposAdicionales campos={camposAdicionales} onChange={setCamposAdicionales} />

      {/* En producción, confirmar: la retención genera la obligación del 103 (y del 104) */}
      <Hoja
        abierta={confirmarProduccion && !submitting}
        onCerrar={() => setConfirmarProduccion(false)}
        titulo="¿Emitir en producción?"
        pie={<>
          <Boton variante="secundario" onClick={() => setConfirmarProduccion(false)}>Cancelar</Boton>
          <Boton onClick={() => emitir(true)}>Entiendo, emitir</Boton>
        </>}
      >
        <div className="space-y-2">
          <p className="flex items-start gap-2 text-sm text-texto">
            <AlertTriangle size={16} className="mt-0.5 shrink-0 text-alerta" aria-hidden />
            <span>
              Esta retención te obliga a presentar el formulario 103 de {mesDelPeriodo(periodoFiscal)}
              {retieneIva && <> y, por la retención de IVA, también el formulario 104 de ese mes</>}.
            </span>
          </p>
          <p className="text-xs text-tenue">
            Tiene validez tributaria. Si solo querías probar, activa el modo de pruebas antes de emitir.
          </p>
        </div>
      </Hoja>
    </EmisionLayout>
  );
}

/** Valor que no se edita (base que sale de la liquidación, % del catálogo). */
function Fijo({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-9 items-center rounded-lg border border-borde bg-presionado px-3 text-sm tabular-nums text-tenue tactil:h-11 tactil:text-base">
      {children}
    </div>
  );
}
