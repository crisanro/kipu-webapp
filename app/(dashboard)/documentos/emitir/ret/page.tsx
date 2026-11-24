"use client";
import SoloWeb from "@/components/SoloWeb";

import { useState, useEffect, useRef } from "react";
import { r2 } from "@/lib/dinero";
import { useRouter, useSearchParams } from "next/navigation";
import AccionesUsoJusto from "../components/AccionesUsoJusto";
import { v4 as uuidv4 } from "uuid";
import { debeRenovarClave, esUsoJusto, mensajeErrorEmision } from "@/lib/emision";
import api from "@/lib/api";
import AvisoColchon from "@/components/uso-justo/AvisoColchon";
import { useAuthStore } from "@/store/auth.store";
import { CheckCircle2, AlertTriangle, Plus, Trash2, Calendar } from "lucide-react";
import PuntoEmision from "../components/PuntoEmision";
import { usePuntoEmision } from "../components/usePuntoEmision";
import CamposAdicionales, { CampoAdicional } from "../components/CamposAdicionales";
import DocOrigenSelector, { DocOrigen } from "../components/DocOrigenSelector";
import { getPaisesOrdenados } from "@/lib/catalogos/paises-sri";
import { formatoPeriodo } from "@/lib/teclado";

const fmt = (n: number) => r2(n).toFixed(2);
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
// Fase 1: catálogo en el front. En la Fase 2 pasa al backend (versionado por
// vigencia) junto con un validador. Fuentes: Catálogo ATS del SRI (tabla 3.10,
// vigente desde 06/08/2026), Resolución NAC-DGERCGC26-00000009 (desde
// 01/03/2026) y ficha técnica de comprobantes electrónicos v2.34 (tabla 20).
interface OpcionRet {
  cod:   string;
  label: string;
  pct:   number;
}

// Renta, pago a residentes. Códigos y % del Catálogo ATS, hoja "TABLAS
// RETENCIONES", bloque "Desde 06/08/2026". El primero es el sugerido.
const RENTA_RESIDENTES: OpcionRet[] = [
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

// Renta, pago a no residentes (serie 5xx del Catálogo ATS, bloque "Desde
// 06/08/2026"). El primero es el sugerido. El porcentaje depende del régimen
// fiscal (tipoRegi). 501 admite 25 o 37. 501A admite 3, 5, 8, 10, 15, 25 y 37
// (las tarifas menores son de convenio): se sugiere 25/37 y, con convenio, el %
// queda editable.
// NOTA: 501 confirmado en el Catálogo ATS. Mapeo al casillero 422/472 del 103 deducido (501A ↔ 421 por descripción idéntica), sin tabla oficial.
const RENTA_NO_RESIDENTES: Omit<OpcionRet, "pct">[] = [
  { cod: "501",  label: "Exterior · Beneficios / servicios empresariales" },
  { cod: "501A", label: "Exterior · Servicios técnicos, administrativos, consultoría y regalías" },
];

// Régimen general (01) → 25%; paraíso fiscal (02) o régimen preferente (03) → 37%
function pctNoResidente(tipoRegi: string): number {
  return tipoRegi === "01" ? 25 : 37;
}

// Códigos de IVA de la tabla 20 de la ficha técnica
const RETENCIONES_IVA: OpcionRet[] = [
  { cod: "9",  label: "Retención 10% del IVA",  pct: 10  },
  { cod: "10", label: "Retención 20% del IVA",  pct: 20  },
  { cod: "1",  label: "Retención 30% del IVA",  pct: 30  },
  { cod: "11", label: "Retención 50% del IVA",  pct: 50  },
  { cod: "2",  label: "Retención 70% del IVA",  pct: 70  },
  { cod: "3",  label: "Retención 100% del IVA", pct: 100 },
  { cod: "7",  label: "Retención en cero",      pct: 0   },
  { cod: "8",  label: "No procede retención",   pct: 0   },
];

// ISD: tabla 20 de la ficha v2.34 (2,5% desde el 01/05/2025)
const RETENCIONES_ISD: OpcionRet[] = [
  { cod: "4586", label: "Impuesto a la salida de divisas 2,5%", pct: 2.5 },
];

function getOpciones(codigo: string, exterior: boolean, tipoRegi: string): OpcionRet[] {
  if (codigo === "2") return RETENCIONES_IVA;
  if (codigo === "6") return RETENCIONES_ISD;
  if (!exterior) return RENTA_RESIDENTES;
  const pct = pctNoResidente(tipoRegi);
  return RENTA_NO_RESIDENTES.map(o => ({ ...o, pct }));
}

function lineaRenta(base: number, exterior: boolean, tipoRegi: string): ImpuestoRet {
  const opcion = getOpciones("1", exterior, tipoRegi)[0];
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
function lineasSugeridas(base: number, ivas: number[], exterior: boolean, tipoRegi: string): ImpuestoRet[] {
  const iva = exterior
    ? { codigoRetencion: "3", porcentajeRetener: 100 }
    : { codigoRetencion: "1", porcentajeRetener: 30 };
  return [
    lineaRenta(base, exterior, tipoRegi),
    ...ivas.filter(v => v > 0).map(v => ({
      _id: genId(), codigo: "2", ...iva,
      baseImponible: r2(v), valorRetenido: r2(v * (iva.porcentajeRetener / 100)),
    })),
  ];
}

// FAC y NDB recibidas: siempre pago local
function retencionesSugeridas(base: number, iva: number): ImpuestoRet[] {
  return lineasSugeridas(base, [iva], false, "01");
}

// Ajusta las líneas de renta al catálogo del tipo de pago y régimen actuales:
// un código que no está en la lista toma el primero de ella, y el % se toma de
// la lista (así un cambio de régimen pasa el 501 de 25% a 37%).
function reajustarRenta(lineas: ImpuestoRet[], exterior: boolean, tipoRegi: string): ImpuestoRet[] {
  const opciones = getOpciones("1", exterior, tipoRegi);
  return lineas.map(l => {
    if (l.codigo !== "1") return l;
    const opcion = opciones.find(o => o.cod === l.codigoRetencion) ?? opciones[0];
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
async function lineasDesdeLiq(liqId: string, importeTotal: number, exterior: boolean, tipoRegi: string): Promise<ImpuestoRet[]> {
  try {
    const res     = await api.get(`/api/v1/app/documentos/${liqId}/desglose`);
    const desglose = res.data.data as {
      subtotal: number;
      resumen_impuestos?: { tarifa?: string | number; valor?: string | number }[];
    };
    const ivas = (desglose.resumen_impuestos ?? [])
      .filter(imp => parseFloat(String(imp.tarifa ?? "0")) > 0)
      .map(imp => parseFloat(String(imp.valor ?? "0")));
    return lineasSugeridas(Number(desglose.subtotal) || 0, ivas, exterior, tipoRegi);
  } catch {
    return lineasSugeridas(Number(importeTotal) || 0, [], exterior, tipoRegi);
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
  label: string; sublabel: string; tiposDoc: string; tabla: "emitidos" | "recibidos"; nota: string;
}> = {
  fac_recibida: {
    label:    "FAC recibida",
    sublabel: "Factura que me emitieron",
    tiposDoc: "FAC",
    tabla:    "recibidos",
    nota:     "Retención sobre una factura que recibiste de un proveedor",
  },
  liq_emitida: {
    label:    "LIQ emitida",
    sublabel: "Liquidación que yo emití",
    tiposDoc: "LIQ",
    tabla:    "emitidos",
    nota:     "Retención sobre una liquidación de compra que tú emitiste al proveedor",
  },
  ndb_recibida: {
    label:    "NDB recibida",
    sublabel: "Nota de débito que me emitieron",
    tiposDoc: "NDB",
    tabla:    "recibidos",
    nota:     "Retención sobre una nota de débito que recibiste de un proveedor",
  },
};

// Tabla 5 del Catálogo ATS (hoja "TABLAS REFERENCIALES"), solo códigos
// vigentes. El 00 "Casos especiales" tiene fecha fin 28/02/2015 y ya no aplica.
const CODIGOS_SUSTENTO = [
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

const FORMAS_PAGO_RET = [
  { value: "01", label: "Sin sistema financiero" },
  { value: "16", label: "Tarjeta de débito" },
  { value: "17", label: "Dinero electrónico" },
  { value: "19", label: "Tarjeta de crédito" },
  { value: "20", label: "Otros con sistema financiero" },
  { value: "15", label: "Compensación de deudas" },
];

export default function NuevaRetPage() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const empresa      = useAuthStore((s) => s.empresa);
  // Con plan gratis no se gastan créditos (mismo criterio que ResumenTotales)
  const usaCreditos  = !empresa?.suscripcion_activa && !empresa?.emision_gratis && (empresa?.balance_api ?? 0) > 0;

  // Lista de países ordenada desde el módulo externo
  const paisesOrdenados = getPaisesOrdenados();

  // ── Idempotencia ────────────────────────────────────────────────────────────
  const idempotencyKey = useRef(uuidv4());

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
  const [impuestos, setImpuestos] = useState<ImpuestoRet[]>(() => [lineaRenta(0, false, "01")]);

  const [camposAdicionales, setCamposAdicionales] = useState<CampoAdicional[]>([]);

  // Establecimiento y punto de emisión
  const pe = usePuntoEmision(origenTipo === "liq_emitida" ? (docOrigen?.tipo === "kipu" ? docOrigen.data.numero_doc : docOrigen?.tipo === "manual" ? docOrigen.data.numero : null) : null);
  const { estabSelected, ptoSelected } = pe;

  // UI
  const [submitting, setSubmitting] = useState(false);
  const [resultado,  setResultado]  = useState<any>(null);
  const [error,      setError]      = useState("");
  const [usoJusto,   setUsoJusto]   = useState("");   // mensaje del uso justo (para ofrecer Pro o créditos)

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
          setImpuestos(await lineasDesdeLiq(d.id, d.importe_total, exterior, "01"));
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
          setImpuestos(retencionesSugeridas(base, iva));
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
  const addImpuesto = () => setImpuestos([...impuestos, lineaRenta(0, esExterior, tipoRegi)]);

  // Pago local/exterior: cambia el catálogo de renta
  const cambiarPagoLocExt = (valor: string) => {
    setPagoLocExt(valor);
    setImpuestos(prev => reajustarRenta(prev, valor === "02", tipoRegi));
  };

  // Régimen fiscal: cambia el % de renta (25 o 37) y pagoRegFis
  const cambiarTipoRegi = (valor: string) => {
    setTipoRegi(valor);
    setPagoRegFis(valor === "01" ? "NO" : "SI");
    setImpuestos(prev => reajustarRenta(prev, esExterior, valor));
  };

  // Sin convenio, el % de renta vuelve a la tarifa del catálogo
  const cambiarConvenio = (valor: string) => {
    setAplicConvDobTrib(valor);
    if (valor === "NO") setImpuestos(prev => reajustarRenta(prev, esExterior, tipoRegi));
  };

  // Con convenio de doble tributación, el % de renta se ajusta a la tarifa del convenio
  const pctEditable = (imp: ImpuestoRet) =>
    esExterior && aplicConvDobTrib === "SI" && imp.codigo === "1";

  // Detección local/exterior y retenciones sugeridas al elegir el documento sustento
  const sugerirDesdeOrigen = async (selected: DocOrigen) => {
    if (selected?.tipo !== "kipu") return;
    if (origenTipo === "liq_emitida") {
      const tipoId   = await tipoIdProveedorLiq(selected.data.id);
      const exterior = esProveedorExterior(tipoId, selected.data.identificacion);
      setPagoLocExt(exterior ? "02" : "01");
      setImpuestos(await lineasDesdeLiq(selected.data.id, selected.data.importe_total, exterior, tipoRegi));
    } else {
      const { base, iva } = baseEIva(selected.data);
      setPagoLocExt("01");
      setImpuestos(retencionesSugeridas(base, iva));
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
        const opciones = getOpciones(value, esExterior, tipoRegi);
        updated.codigoRetencion   = opciones[0].cod;
        updated.porcentajeRetener = opciones[0].pct;
        updated.valorRetenido     = r2(updated.baseImponible * (opciones[0].pct / 100));
      }
      if (field === "codigoRetencion") {
        const opciones = getOpciones(updated.codigo, esExterior, tipoRegi);
        const opcion   = opciones.find(o => o.cod === value);
        if (opcion) {
          updated.porcentajeRetener = opcion.pct;
          updated.valorRetenido     = r2(updated.baseImponible * (opcion.pct / 100));
        }
      }
      return updated;
    }));
  };

  const reset = () => {
    pe.reiniciar();
    idempotencyKey.current = uuidv4();
    setResultado(null);
    setDocOrigen(null);
    setOrigenTipo("fac_recibida");
    setImpuestos([lineaRenta(0, false, "01")]);
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
    setError("");
  };

  const emitir = async () => {
    setError("");
    if (!docOrigen)                     { setError("Selecciona el documento sustento."); return; }
    if (!estabSelected || !ptoSelected) { setError("Elige el establecimiento y el punto de emisión."); return; }
    if (impuestos.some(i => i.baseImponible <= 0)) { setError("La base imponible debe ser mayor a $0."); return; }
    if (esExterior && !paisEfecPago)    { setError("Selecciona el país del pago al exterior."); return; }

    const puedeEmitir = empresa?.suscripcion_activa || (empresa?.balance_api ?? 0) > 0 || !!empresa?.emision_gratis;
    if (!puedeEmitir) { setError("Se requiere suscripción activa o créditos API."); return; }

    setSubmitting(true);
    try {
      const payload: any = {
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

      const res = await api.post(
        "/api/v1/app/documentos/emit/RET",
        payload,
        {
          headers: {
            "X-Idempotency-Key": idempotencyKey.current,
          },
        }
      );
      setResultado(res.data);
    } catch (err: any) {
      // Solo con un rechazo definitivo se usa otra clave; ante timeout, red,
      // 5xx o 409 se reintenta con la misma para no duplicar el comprobante
      if (debeRenovarClave(err)) idempotencyKey.current = uuidv4();
      const mensaje = mensajeErrorEmision(err, "Error al emitir la retención.");
      setError(mensaje);
      setUsoJusto(esUsoJusto(err) ? mensaje : "");
    } finally  {
      setSubmitting(false);
    }
  };

  if (resultado) {
    return (
      <div
        className="min-h-screen flex items-center justify-center p-6"
        style={{ background: "var(--kipu-bg)" }}
      >
        <div className="w-full max-w-sm text-center">
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
            style={{
              background: "color-mix(in srgb, var(--kipu-info) 20%, transparent)",
            }}
          >
            <CheckCircle2 size={32} style={{ color: "var(--kipu-info)" }} />
          </div>
          <h2 className="text-xl font-bold mb-1" style={{ color: "var(--kipu-text)" }}>
            Retención emitida
          </h2>
          <p className="text-sm mb-2" style={{ color: "var(--kipu-subtle)" }}>{resultado.claveAcceso}</p>
          {resultado.aviso_uso_justo && <AvisoColchon aviso={resultado.aviso_uso_justo} />}
          <span
            className="inline-block px-3 py-1 rounded-full text-xs font-medium mb-6"
            style={{
              background: "color-mix(in srgb, var(--kipu-info) 20%, transparent)",
              color: "var(--kipu-info)",
            }}
          >
            {resultado.estado}
          </span>
          <div className="flex gap-3">
            <button
              onClick={reset}
              className="flex-1 py-2.5 rounded-lg text-sm transition-colors"
              style={{
                border: "1px solid var(--kipu-border)",
                color: "var(--kipu-muted)",
              }}
              onMouseEnter={e => e.currentTarget.style.color = "var(--kipu-text)"}
              onMouseLeave={e => e.currentTarget.style.color = "var(--kipu-muted)"}
            >
              Nueva RET
            </button>
            <button
              onClick={() => router.push("/documentos")}
              className="flex-1 py-2.5 rounded-lg text-white text-sm font-medium transition-colors"
              style={{ background: "var(--kipu-accent)" }}
              onMouseEnter={e => e.currentTarget.style.background = "var(--kipu-accent-h)"}
              onMouseLeave={e => e.currentTarget.style.background = "var(--kipu-accent)"}
            >
              Ver documentos
            </button>
          </div>
        </div>
      </div>
    );
  }

  const origenCfg = ORIGEN_CONFIG[origenTipo];
  const esLiqEmitida = origenTipo === "liq_emitida" && docOrigen !== null;

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-bold" style={{ color: "var(--kipu-text)" }}>
          Nueva Retención{" "}
          <span className="text-base font-normal" style={{ color: "var(--kipu-subtle)" }}>
            RET
          </span>
        </h1>
        <p className="text-sm" style={{ color: "var(--kipu-subtle)" }}>
          {empresa?.razon_social} · {empresa?.ambiente === 2 ? "Producción" : "Pruebas"}
        </p>
      </div>

      {empresa && !empresa.suscripcion_activa && empresa.balance_api === 0 && !empresa.emision_gratis && (
        <div
          className="flex items-center gap-2 rounded-lg px-4 py-3"
          style={{
            background: "color-mix(in srgb, var(--kipu-danger) 10%, transparent)",
            border: "1px solid color-mix(in srgb, var(--kipu-danger) 20%, transparent)",
          }}
        >
          <AlertTriangle size={16} className="shrink-0" style={{ color: "var(--kipu-danger)" }} />
          <p className="text-sm" style={{ color: "var(--kipu-danger)" }}>
            Sin acceso para emitir.{" "}
            <SoloWeb><a href="/planes" className="underline">Ver opciones</a></SoloWeb>
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">

          <div className="lg:hidden">
            <PuntoEmision {...pe} />
          </div>

          {/* Toggle tipo de origen */}
          <div
            className="rounded-xl p-4 space-y-3"
            style={{
              background: "var(--kipu-surface)",
              border: "1px solid var(--kipu-border)",
            }}
          >
            <h2 className="text-sm font-semibold" style={{ color: "var(--kipu-text)" }}>
              Tipo de documento sustento
            </h2>
            <div className="grid grid-cols-3 gap-2">
              {(Object.entries(ORIGEN_CONFIG) as [OrigenRet, typeof ORIGEN_CONFIG[OrigenRet]][]).map(([key, cfg]) => {
                const isSelected = origenTipo === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => cambiarOrigen(key)}
                    className="flex flex-col items-center gap-1 px-3 py-2.5 rounded-lg text-center transition-colors"
                    style={{
                      background: isSelected
                        ? "color-mix(in srgb, var(--kipu-info) 10%, transparent)"
                        : "var(--kipu-surface)",
                      border: isSelected
                        ? "1px solid var(--kipu-info)"
                        : "1px solid var(--kipu-border)",
                      color: isSelected ? "var(--kipu-info)" : "var(--kipu-muted)",
                    }}
                    onMouseEnter={e => {
                      if (!isSelected) {
                        e.currentTarget.style.color = "var(--kipu-text)";
                        e.currentTarget.style.borderColor = "color-mix(in srgb, var(--kipu-text) 20%, transparent)";
                      }
                    }}
                    onMouseLeave={e => {
                      if (!isSelected) {
                        e.currentTarget.style.color = "var(--kipu-muted)";
                        e.currentTarget.style.borderColor = "var(--kipu-border)";
                      }
                    }}
                  >
                    <span className="text-xs font-bold">{cfg.label}</span>
                    <span className="text-[10px] leading-tight" style={{ color: "var(--kipu-subtle)" }}>
                      {cfg.sublabel}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Selector de documento según tipo */}
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
            colorAccent="blue"
          />

          {/* Período fiscal */}
          <div
            className="rounded-xl p-4"
            style={{
              background: "var(--kipu-surface)",
              border: "1px solid var(--kipu-border)",
            }}
          >
            <div className="flex items-center gap-2 mb-3">
              <Calendar size={15} style={{ color: "var(--kipu-accent)" }} />
              <h2 className="text-sm font-semibold" style={{ color: "var(--kipu-text)" }}>
                Período fiscal
              </h2>
            </div>
            <input
              value={periodoFiscal}
              inputMode="numeric"
              onChange={e => setPeriodoFiscal(formatoPeriodo(e.target.value))}
              placeholder="MM/YYYY"
              maxLength={7}
              className="w-40 px-3 py-2 rounded-lg text-sm transition-colors focus:outline-none"
              style={{
                background: "var(--kipu-surface)",
                border: "1px solid var(--kipu-border)",
                color: "var(--kipu-text)",
              }}
              onFocus={e => e.currentTarget.style.borderColor = "var(--kipu-accent)"}
              onBlur={e => e.currentTarget.style.borderColor = "var(--kipu-border)"}
            />
            <p className="text-xs mt-1" style={{ color: "var(--kipu-subtle)" }}>
              Formato: MM/YYYY · ej: 08/2026
            </p>
          </div>

          {/* Datos documento sustento — RET v2.0.0 */}
          <div
            className="rounded-xl p-4 space-y-3"
            style={{
              background: "var(--kipu-surface)",
              border: "1px solid var(--kipu-border)",
            }}
          >
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold" style={{ color: "var(--kipu-text)" }}>
                Clasificación del sustento
              </h2>
              <span
                className="text-[10px] px-1.5 py-0.5 rounded font-medium"
                style={{
                  background: "color-mix(in srgb, var(--kipu-text) 8%, transparent)",
                  color: "var(--kipu-subtle)",
                }}
              >
                {codSustento} · {esExterior ? `Exterior (${paisEfecPago || "?"})` : "Local"} · Parte rel: {parteRel}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Código sustento */}
              <div className="sm:col-span-2 space-y-1">
                <label className="text-[10px] uppercase font-semibold tracking-wider" style={{ color: "var(--kipu-subtle)" }}>
                  Código de sustento (ATS)
                </label>
                <select
                  value={codSustento}
                  onChange={e => setCodSustento(e.target.value)}
                  className="w-full px-2.5 py-2 rounded-lg text-sm transition-colors focus:outline-none"
                  style={{
                    background: "var(--kipu-surface)",
                    border: "1px solid var(--kipu-border)",
                    color: "var(--kipu-text)",
                  }}
                  onFocus={e => e.currentTarget.style.borderColor = "var(--kipu-accent)"}
                  onBlur={e => e.currentTarget.style.borderColor = "var(--kipu-border)"}
                >
                  {CODIGOS_SUSTENTO.map(c => (
                    <option key={c.value} value={c.value}>{c.value} · {c.label}</option>
                  ))}
                </select>
                {esExterior && (
                  <p className="text-[10px]" style={{ color: "var(--kipu-subtle)" }}>
                    Si es un servicio digital (Meta, Google, etc.), usa sustento 15
                  </p>
                )}
              </div>

              {/* Pago local/exterior */}
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-semibold tracking-wider" style={{ color: "var(--kipu-subtle)" }}>
                  Pago
                </label>
                <select
                  value={pagoLocExt}
                  onChange={e => cambiarPagoLocExt(e.target.value)}
                  className="w-full px-2.5 py-2 rounded-lg text-sm transition-colors focus:outline-none"
                  style={{
                    background: "var(--kipu-surface)",
                    border: "1px solid var(--kipu-border)",
                    color: "var(--kipu-text)",
                  }}
                  onFocus={e => e.currentTarget.style.borderColor = "var(--kipu-accent)"}
                  onBlur={e => e.currentTarget.style.borderColor = "var(--kipu-border)"}
                >
                  <option value="01">Local</option>
                  <option value="02">Exterior</option>
                </select>
              </div>
            </div>

            {/* ── Campos pago exterior (condicional) ── */}
            {esExterior && (
              <div className="pt-2 border-t space-y-3" style={{ borderColor: "var(--kipu-border)" }}>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Tipo régimen fiscal */}
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-semibold tracking-wider" style={{ color: "var(--kipu-subtle)" }}>
                      Régimen fiscal exterior
                    </label>
                    <select
                      value={tipoRegi}
                      onChange={e => cambiarTipoRegi(e.target.value)}
                      className="w-full px-2.5 py-2 rounded-lg text-sm transition-colors focus:outline-none"
                      style={{
                        background: "var(--kipu-surface)",
                        border: "1px solid var(--kipu-border)",
                        color: "var(--kipu-text)",
                      }}
                      onFocus={e => e.currentTarget.style.borderColor = "var(--kipu-accent)"}
                      onBlur={e => e.currentTarget.style.borderColor = "var(--kipu-border)"}
                    >
                      <option value="01">01 · General</option>
                      <option value="02">02 · Paraíso fiscal</option>
                      <option value="03">03 · Régimen fiscal preferente</option>
                    </select>
                  </div>

                  {/* País efectivo del pago */}
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-semibold tracking-wider" style={{ color: "var(--kipu-subtle)" }}>
                      País del pago
                    </label>
                    <select
                      value={paisEfecPago}
                      onChange={e => setPaisEfecPago(e.target.value)}
                      className="w-full px-2.5 py-2 rounded-lg text-sm transition-colors focus:outline-none"
                      style={{
                        background: "var(--kipu-surface)",
                        border: "1px solid var(--kipu-border)",
                        color: "var(--kipu-text)",
                      }}
                      onFocus={e => e.currentTarget.style.borderColor = "var(--kipu-accent)"}
                      onBlur={e => e.currentTarget.style.borderColor = "var(--kipu-border)"}
                    >
                      <option value="">Selecciona el país…</option>
                      {paisesOrdenados.map(p => (
                        <option key={p.codigo} value={p.codigo}>{p.codigo} · {p.nombre}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Convenio doble tributación */}
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-semibold tracking-wider" style={{ color: "var(--kipu-subtle)" }}>
                      Convenio doble tributación
                    </label>
                    <select
                      value={aplicConvDobTrib}
                      onChange={e => cambiarConvenio(e.target.value)}
                      className="w-full px-2.5 py-2 rounded-lg text-sm transition-colors focus:outline-none"
                      style={{
                        background: "var(--kipu-surface)",
                        border: "1px solid var(--kipu-border)",
                        color: "var(--kipu-text)",
                      }}
                      onFocus={e => e.currentTarget.style.borderColor = "var(--kipu-accent)"}
                      onBlur={e => e.currentTarget.style.borderColor = "var(--kipu-border)"}
                    >
                      <option value="NO">NO</option>
                      <option value="SI">SI</option>
                    </select>
                  </div>

                  {/* Pago a régimen fiscal preferente */}
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-semibold tracking-wider" style={{ color: "var(--kipu-subtle)" }}>
                      Pago a régimen fiscal preferente
                    </label>
                    <select
                      value={pagoRegFis}
                      onChange={e => setPagoRegFis(e.target.value)}
                      className="w-full px-2.5 py-2 rounded-lg text-sm transition-colors focus:outline-none"
                      style={{
                        background: "var(--kipu-surface)",
                        border: "1px solid var(--kipu-border)",
                        color: "var(--kipu-text)",
                      }}
                      onFocus={e => e.currentTarget.style.borderColor = "var(--kipu-accent)"}
                      onBlur={e => e.currentTarget.style.borderColor = "var(--kipu-border)"}
                    >
                      <option value="NO">NO</option>
                      <option value="SI">SI</option>
                    </select>
                  </div>
                </div>

                {/* Pago sujeto a retención (solo si NO hay convenio) */}
                {aplicConvDobTrib === "NO" && (
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-semibold tracking-wider" style={{ color: "var(--kipu-subtle)" }}>
                      Sujeto a retención por norma legal
                    </label>
                    <select
                      value={pagExtSujRetNorLeg}
                      onChange={e => setPagExtSujRetNorLeg(e.target.value)}
                      className="w-full px-2.5 py-2 rounded-lg text-sm transition-colors focus:outline-none"
                      style={{
                        background: "var(--kipu-surface)",
                        border: "1px solid var(--kipu-border)",
                        color: "var(--kipu-text)",
                      }}
                      onFocus={e => e.currentTarget.style.borderColor = "var(--kipu-accent)"}
                      onBlur={e => e.currentTarget.style.borderColor = "var(--kipu-border)"}
                    >
                      <option value="SI">SI</option>
                      <option value="NO">NO</option>
                    </select>
                  </div>
                )}

                {/* Tipo de sujeto retenido (obligatorio con identificación 08) */}
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-semibold tracking-wider" style={{ color: "var(--kipu-subtle)" }}>
                    Tipo de sujeto retenido
                  </label>
                  <select
                    value={tipoSujetoRetenido}
                    onChange={e => setTipoSujetoRetenido(e.target.value)}
                    className="w-full px-2.5 py-2 rounded-lg text-sm transition-colors focus:outline-none"
                    style={{
                      background: "var(--kipu-surface)",
                      border: "1px solid var(--kipu-border)",
                      color: "var(--kipu-text)",
                    }}
                    onFocus={e => e.currentTarget.style.borderColor = "var(--kipu-accent)"}
                    onBlur={e => e.currentTarget.style.borderColor = "var(--kipu-border)"}
                  >
                    <option value="01">01 · Persona natural</option>
                    <option value="02">02 · Sociedad</option>
                  </select>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Parte relacionada */}
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-semibold tracking-wider" style={{ color: "var(--kipu-subtle)" }}>
                  Parte relacionada
                </label>
                <select
                  value={parteRel}
                  onChange={e => setParteRel(e.target.value)}
                  className="w-full px-2.5 py-2 rounded-lg text-sm transition-colors focus:outline-none"
                  style={{
                    background: "var(--kipu-surface)",
                    border: "1px solid var(--kipu-border)",
                    color: "var(--kipu-text)",
                  }}
                  onFocus={e => e.currentTarget.style.borderColor = "var(--kipu-accent)"}
                  onBlur={e => e.currentTarget.style.borderColor = "var(--kipu-border)"}
                >
                  <option value="NO">NO</option>
                  <option value="SI">SI</option>
                </select>
              </div>

              {/* Forma de pago del sustento */}
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-semibold tracking-wider" style={{ color: "var(--kipu-subtle)" }}>
                  Forma de pago del documento sustento
                </label>
                <select
                  value={formaPagoSustento}
                  onChange={e => setFormaPagoSustento(e.target.value)}
                  className="w-full px-2.5 py-2 rounded-lg text-sm transition-colors focus:outline-none"
                  style={{
                    background: "var(--kipu-surface)",
                    border: "1px solid var(--kipu-border)",
                    color: "var(--kipu-text)",
                  }}
                  onFocus={e => e.currentTarget.style.borderColor = "var(--kipu-accent)"}
                  onBlur={e => e.currentTarget.style.borderColor = "var(--kipu-border)"}
                >
                  {FORMAS_PAGO_RET.map(f => (
                    <option key={f.value} value={f.value}>{f.value} · {f.label}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Impuestos retenidos */}
          <div
            className="rounded-xl p-4 space-y-3"
            style={{
              background: "var(--kipu-surface)",
              border: "1px solid var(--kipu-border)",
            }}
          >
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold" style={{ color: "var(--kipu-text)" }}>
                Impuestos retenidos
              </h2>
              {!esLiqEmitida && (
                <button
                  type="button"
                  onClick={addImpuesto}
                  className="flex items-center gap-1 text-xs transition-colors"
                  style={{ color: "var(--kipu-accent)" }}
                  onMouseEnter={e => e.currentTarget.style.color = "var(--kipu-accent-h)"}
                  onMouseLeave={e => e.currentTarget.style.color = "var(--kipu-accent)"}
                >
                  <Plus size={13} /> Agregar
                </button>
              )}
            </div>

            {esLiqEmitida && (
              <p className="text-xs" style={{ color: "var(--kipu-subtle)" }}>
                Las bases imponibles se calcularon automáticamente desde la liquidación. Puedes ajustar el tipo y porcentaje de retención.
              </p>
            )}

            {impuestos.map((imp, idx) => {
              const opciones = getOpciones(imp.codigo, esExterior, tipoRegi);
              return (
                <div
                  key={imp._id}
                  className="p-3 rounded-xl space-y-3"
                  style={{
                    background: "color-mix(in srgb, var(--kipu-surface) 60%, transparent)",
                    border: "1px solid var(--kipu-border)",
                  }}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium" style={{ color: "var(--kipu-subtle)" }}>
                      Retención #{idx + 1}
                    </span>
                    {!esLiqEmitida && (
                      <button
                        type="button"
                        onClick={() => removeImpuesto(imp._id)}
                        disabled={impuestos.length === 1}
                        className="p-1.5 rounded-lg transition-colors disabled:opacity-20"
                        style={{ color: "var(--kipu-subtle)" }}
                        onMouseEnter={e => {
                          if (impuestos.length > 1) {
                            e.currentTarget.style.color = "var(--kipu-danger)";
                            e.currentTarget.style.background = "color-mix(in srgb, var(--kipu-danger) 10%, transparent)";
                          }
                        }}
                        onMouseLeave={e => {
                          if (impuestos.length > 1) {
                            e.currentTarget.style.color = "var(--kipu-subtle)";
                            e.currentTarget.style.background = "transparent";
                          }
                        }}
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className="text-[10px] uppercase font-semibold tracking-wider" style={{ color: "var(--kipu-subtle)" }}>
                        Tipo
                      </label>
                      <select
                        value={imp.codigo}
                        onChange={e => editImpuesto(imp._id, "codigo", e.target.value)}
                        className="w-full px-2.5 py-2 rounded-lg text-sm transition-colors focus:outline-none"
                        style={{
                          background: "var(--kipu-surface)",
                          border: "1px solid var(--kipu-border)",
                          color: "var(--kipu-text)",
                        }}
                        onFocus={e => e.currentTarget.style.borderColor = "var(--kipu-accent)"}
                        onBlur={e => e.currentTarget.style.borderColor = "var(--kipu-border)"}
                      >
                        {TIPOS_IMPUESTO.map(t => (
                          <option key={t.value} value={t.value}>{t.label}</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] uppercase font-semibold tracking-wider" style={{ color: "var(--kipu-subtle)" }}>
                        Código / Concepto
                      </label>
                      <select
                        value={imp.codigoRetencion}
                        onChange={e => editImpuesto(imp._id, "codigoRetencion", e.target.value)}
                        className="w-full px-2.5 py-2 rounded-lg text-sm transition-colors focus:outline-none"
                        style={{
                          background: "var(--kipu-surface)",
                          border: "1px solid var(--kipu-border)",
                          color: "var(--kipu-text)",
                        }}
                        onFocus={e => e.currentTarget.style.borderColor = "var(--kipu-accent)"}
                        onBlur={e => e.currentTarget.style.borderColor = "var(--kipu-border)"}
                      >
                        {opciones.map(o => (
                          <option key={o.cod} value={o.cod}>{o.cod} · {o.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="space-y-1">
                      <label className="text-[10px] uppercase font-semibold tracking-wider" style={{ color: "var(--kipu-subtle)" }}>
                        Base imponible
                      </label>
                      <div className="relative">
                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-sm" style={{ color: "var(--kipu-subtle)" }}>$</span>
                        <input
                          type="number"
                          value={imp.baseImponible}
                          onChange={e => editImpuesto(imp._id, "baseImponible", parseFloat(e.target.value) || 0)}
                          readOnly={esLiqEmitida}
                          min={0}
                          step={0.01}
                          className="w-full pl-6 pr-2 py-2 rounded-lg text-sm text-right transition-colors focus:outline-none"
                          style={{
                            background: "var(--kipu-surface)",
                            border: "1px solid var(--kipu-border)",
                            color: "var(--kipu-text)",
                            opacity: esLiqEmitida ? 0.7 : 1,
                            cursor: esLiqEmitida ? "not-allowed" : "text",
                          }}
                          onFocus={e => e.currentTarget.style.borderColor = "var(--kipu-accent)"}
                          onBlur={e => e.currentTarget.style.borderColor = "var(--kipu-border)"}
                        />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] uppercase font-semibold tracking-wider" style={{ color: "var(--kipu-subtle)" }}>
                        % Retener
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          value={imp.porcentajeRetener}
                          readOnly={!pctEditable(imp)}
                          onChange={e => {
                            if (pctEditable(imp)) editImpuesto(imp._id, "porcentajeRetener", parseFloat(e.target.value) || 0);
                          }}
                          min={0}
                          max={100}
                          step={0.01}
                          className="w-full px-2 pr-6 py-2 rounded-lg text-sm text-center focus:outline-none"
                          style={{
                            background: pctEditable(imp)
                              ? "var(--kipu-surface)"
                              : "color-mix(in srgb, var(--kipu-text) 4%, transparent)",
                            border: "1px solid var(--kipu-border)",
                            color: "var(--kipu-text)",
                            cursor: pctEditable(imp) ? "text" : "not-allowed",
                          }}
                        />
                        <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-sm" style={{ color: "var(--kipu-subtle)" }}>%</span>
                      </div>
                      {pctEditable(imp) && (
                        <p className="text-[10px]" style={{ color: "var(--kipu-subtle)" }}>
                          Ajusta el % según la tarifa del convenio
                        </p>
                      )}
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] uppercase font-semibold tracking-wider" style={{ color: "var(--kipu-subtle)" }}>
                        Valor retenido
                      </label>
                      <div className="relative">
                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-sm" style={{ color: "var(--kipu-subtle)" }}>$</span>
                        <input
                          type="number"
                          value={imp.valorRetenido}
                          onChange={e => editImpuesto(imp._id, "valorRetenido", parseFloat(e.target.value) || 0)}
                          min={0}
                          step={0.01}
                          className="w-full pl-6 pr-2 py-2 rounded-lg text-sm text-right transition-colors focus:outline-none"
                          style={{
                            background: "var(--kipu-surface)",
                            border: "1px solid var(--kipu-border)",
                            color: "var(--kipu-text)",
                          }}
                          onFocus={e => e.currentTarget.style.borderColor = "var(--kipu-accent)"}
                          onBlur={e => e.currentTarget.style.borderColor = "var(--kipu-border)"}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
            <div
              className="flex justify-between text-sm pt-2 px-1"
              style={{ borderTop: "1px solid var(--kipu-border)" }}
            >
              <span style={{ color: "var(--kipu-muted)" }}>Total retenido</span>
              <span className="font-bold" style={{ color: "var(--kipu-text)" }}>${fmt(totalRetenido)}</span>
            </div>
          </div>

          <CamposAdicionales campos={camposAdicionales} onChange={setCamposAdicionales} />
        </div>

        {/* Panel lateral */}
        <div className="space-y-4">
          <div className="hidden lg:block">
            <PuntoEmision {...pe} />
          </div>

          <div
            className="rounded-xl p-4 sticky top-4"
            style={{
              background: "var(--kipu-surface)",
              border: "1px solid var(--kipu-border)",
            }}
          >
            <h2 className="text-sm font-semibold mb-4" style={{ color: "var(--kipu-text)" }}>Resumen</h2>
            <div className="space-y-2 text-sm">
              {impuestos.map((imp, idx) => (
                <div key={imp._id} className="flex justify-between" style={{ color: "var(--kipu-muted)" }}>
                  <span>RET {idx + 1} · {imp.porcentajeRetener}%</span>
                  <span>${fmt(imp.valorRetenido)}</span>
                </div>
              ))}
              <div
                className="pt-2 flex justify-between font-bold text-base"
                style={{
                  borderTop: "1px solid var(--kipu-border)",
                  color: "var(--kipu-text)",
                }}
              >
                <span>Total retenido</span>
                <span>${fmt(totalRetenido)}</span>
              </div>
            </div>

            {empresa?.suscripcion_activa || (empresa?.balance_api ?? 0) > 0 || empresa?.emision_gratis ? (
              <div
                className="mt-3 px-3 py-2 rounded-lg text-xs"
                style={{
                  background: usaCreditos
                    ? "color-mix(in srgb, var(--kipu-warning) 10%, transparent)"
                    : "color-mix(in srgb, var(--kipu-success) 10%, transparent)",
                  border: usaCreditos
                    ? "1px solid color-mix(in srgb, var(--kipu-warning) 20%, transparent)"
                    : "1px solid color-mix(in srgb, var(--kipu-success) 20%, transparent)",
                  color: usaCreditos ? "var(--kipu-warning)" : "var(--kipu-success)",
                }}
              >
                {usaCreditos
                  ? `Consumirá 1 crédito API · Disponibles: ${empresa?.balance_api}`
                  : !empresa?.suscripcion_activa
                    ? "Plan gratis · uso justo de comprobantes al mes"
                    : "✅ Incluido en tu suscripción"
                }
              </div>
            ) : (
              <div
                className="mt-3 rounded-lg px-3 py-2 flex items-center"
                style={{
                  background: "color-mix(in srgb, var(--kipu-danger) 10%, transparent)",
                  border: "1px solid color-mix(in srgb, var(--kipu-danger) 20%, transparent)",
                }}
              >
                <AlertTriangle size={12} style={{ color: "var(--kipu-danger)" }} />
                <span className="text-xs font-medium ml-1.5" style={{ color: "var(--kipu-danger)" }}>Sin acceso para emitir</span>
              </div>
            )}

            {error && (
              <p
                className="mt-3 text-xs px-3 py-2 rounded-lg"
                style={{
                  color: "var(--kipu-danger)",
                  background: "color-mix(in srgb, var(--kipu-danger) 10%, transparent)",
                }}
              >
                {error}
              </p>
            )}
            {error && usoJusto === error && <AccionesUsoJusto />}

            <button
              onClick={emitir}
              disabled={submitting || (!empresa?.suscripcion_activa && (empresa?.balance_api ?? 0) === 0
                                       && !empresa?.emision_gratis)}
              className="mt-4 w-full py-3 rounded-lg text-white font-semibold text-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ background: "var(--kipu-accent)" }}
              onMouseEnter={e => {
                if (!submitting && (empresa?.suscripcion_activa || (empresa?.balance_api ?? 0) > 0)) {
                  e.currentTarget.style.background = "var(--kipu-accent-h)";
                }
              }}
              onMouseLeave={e => {
                if (!submitting && (empresa?.suscripcion_activa || (empresa?.balance_api ?? 0) > 0)) {
                  e.currentTarget.style.background = "var(--kipu-accent)";
                }
              }}
            >
              {submitting ? (
                <>
                  <div
                    className="w-4 h-4 border-2 border-t-transparent rounded-full animate-spin"
                    style={{ borderColor: "#FFFFFF", borderTopColor: "transparent" }}
                  />
                  Emitiendo...
                </>
              ) : (
                `Emitir retención${pe.serie ? ` desde ${pe.serie}` : ""} · $${fmt(totalRetenido)}`
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}