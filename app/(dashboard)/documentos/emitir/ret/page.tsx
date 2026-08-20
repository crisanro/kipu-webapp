// app/(dashboard)/documentos/emitir/ret/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import api from "@/lib/api";
import { useAuthStore } from "@/store/auth.store";
import { CheckCircle2, AlertTriangle, Loader2, Plus, Trash2, Calendar } from "lucide-react";
import { clsx } from "clsx";
import PuntoEmision    from "../components/PuntoEmision";
import CamposAdicionales, { CampoAdicional } from "../components/CamposAdicionales";
import DocOrigenSelector, { DocOrigen } from "../components/DocOrigenSelector";

const r2    = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;
const fmt   = (n: number) => r2(n).toFixed(2);
const genId = () => Math.random().toString(36).slice(2);

interface ImpuestoRet {
  _id:               string;
  codigo:            string;
  codigoRetencion:   string;
  baseImponible:     number;
  porcentajeRetener: number;
  valorRetenido:     number;
}

interface Establecimiento {
  codigo:            string;
  nombre_comercial?: string;
  direccion:         string;
  puntos_emision:    { codigo: string; nombre?: string }[];
}

const TIPOS_IMPUESTO = [
  { value: "1", label: "Renta" },
  { value: "2", label: "IVA"   },
  { value: "6", label: "ISD"   },
];

const PORCENTAJES_RENTA = [
  { cod: "303",  label: "Honorarios profesionales",        pct: 10 },
  { cod: "304",  label: "Servicios predomina intelecto",   pct: 8  },
  { cod: "307",  label: "Servicios predomina mano obra",   pct: 2  },
  { cod: "309",  label: "Servicios publicidad",            pct: 2  },
  { cod: "310",  label: "Transporte privado de pasajeros", pct: 1  },
  { cod: "312",  label: "Transferencia de bienes muebles", pct: 1  },
  { cod: "319",  label: "Arrendamiento mercantil",         pct: 2  },
  { cod: "320",  label: "Arrendamiento bienes inmuebles",  pct: 8  },
  { cod: "322",  label: "Seguros y reaseguros",            pct: 2  },
  { cod: "323A", label: "Rendimientos financieros",        pct: 2  },
  { cod: "332",  label: "Compra de bienes",                pct: 2  },
  { cod: "340",  label: "Otras retenciones",               pct: 2  },
];

const PORCENTAJES_IVA = [
  { cod: "9",  label: "Retención 10% del IVA",  pct: 10  },
  { cod: "10", label: "Retención 20% del IVA",  pct: 20  },
  { cod: "1",  label: "Retención 30% del IVA",  pct: 30  },
  { cod: "2",  label: "Retención 70% del IVA",  pct: 70  },
  { cod: "3",  label: "Retención 100% del IVA", pct: 100 },
];

function getOpciones(codigo: string) {
  return codigo === "2" ? PORCENTAJES_IVA : PORCENTAJES_RENTA;
}

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

export default function NuevaRetPage() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const empresa      = useAuthStore((s) => s.empresa);

  // Tipo de origen
  const [origenTipo, setOrigenTipo] = useState<OrigenRet>("fac_recibida");
  const [docOrigen,  setDocOrigen]  = useState<DocOrigen>(null);

  // Período fiscal
  const hoy = new Date();
  const [periodoFiscal, setPeriodoFiscal] = useState(
    `${String(hoy.getMonth() + 1).padStart(2, "0")}/${hoy.getFullYear()}`
  );

  // Impuestos
  const [impuestos, setImpuestos] = useState<ImpuestoRet[]>([{
    _id: genId(), codigo: "1", codigoRetencion: "303",
    baseImponible: 0, porcentajeRetener: 10, valorRetenido: 0,
  }]);

  const [camposAdicionales, setCamposAdicionales] = useState<CampoAdicional[]>([]);

  // Establecimiento
  const [establecimientos, setEstablecimientos] = useState<Establecimiento[]>([]);
  const [estabSelected,    setEstabSelected]    = useState("");
  const [ptoSelected,      setPtoSelected]      = useState("");
  const [puntos,            setPuntos]           = useState<{ codigo: string; nombre?: string }[]>([]);

  // UI
  const [submitting, setSubmitting] = useState(false);
  const [resultado,  setResultado]  = useState<any>(null);
  const [error,      setError]      = useState("");

  const totalRetenido = r2(impuestos.reduce((s, i) => s + (i.valorRetenido || 0), 0));

  // Cargar estructura
  useEffect(() => {
    const cargar = async () => {
      try {
        const cached = sessionStorage.getItem("kipu:estructura");
        const estabs = cached
          ? JSON.parse(cached)
          : (await api.get("/api/v1/app/estructura")).data.data ?? [];
        if (!cached) sessionStorage.setItem("kipu:estructura", JSON.stringify(estabs));
        setEstablecimientos(estabs);
        if (estabs.length > 0) {
          setEstabSelected(estabs[0].codigo);
          const ptos = estabs[0].puntos_emision ?? [];
          setPuntos(ptos);
          if (ptos.length > 0) setPtoSelected(ptos[0].codigo);
        }
      } catch (e) { console.error(e); }
    };
    cargar();
  }, []);

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

          // Obtener desglose para la LIQ emitida pre-cargada
          try {
            const resDesglose = await api.get(`/api/v1/app/documentos/${d.id}/desglose`);
            const desglose    = resDesglose.data.data;
            const subtotal    = desglose.subtotal;
            const resumen     = desglose.resumen_impuestos ?? [];

            const nuevasRet: ImpuestoRet[] = [];
            nuevasRet.push({
              _id:               genId(),
              codigo:            "1",
              codigoRetencion:   "303",
              baseImponible:     r2(subtotal),
              porcentajeRetener: 10,
              valorRetenido:     r2(subtotal * 0.10),
            });

            resumen.forEach((imp: any) => {
              const tarifa = parseFloat(imp.tarifa ?? "0");
              const valor  = parseFloat(imp.valor ?? "0");
              if (tarifa > 0 && valor > 0) {
                nuevasRet.push({
                  _id:               genId(),
                  codigo:            "2",
                  codigoRetencion:   "1",
                  baseImponible:     r2(valor),
                  porcentajeRetener: 30,
                  valorRetenido:     r2(valor * 0.30),
                });
              }
            });

            setImpuestos(nuevasRet);
          } catch {
            setImpuestos([{
              _id: genId(), codigo: "1", codigoRetencion: "303",
              baseImponible: d.importe_total, porcentajeRetener: 10,
              valorRetenido: r2(d.importe_total * 0.10),
            }]);
          }
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
          setImpuestos([{
            _id: genId(), codigo: "1", codigoRetencion: "303",
            baseImponible: d.importe_total, porcentajeRetener: 10,
            valorRetenido: r2(d.importe_total * 0.10),
          }]);
        } catch (e) { console.error(e); }
      };
      cargar();
    }
  }, [searchParams]);

  const handleEstabChange = (codigo: string, ptos: { codigo: string; nombre?: string }[]) => {
    setEstabSelected(codigo);
    setPuntos(ptos);
    setPtoSelected(ptos[0]?.codigo ?? "");
  };

  const cambiarOrigen = (nuevo: OrigenRet) => {
    setOrigenTipo(nuevo);
    setDocOrigen(null);
  };

  const addImpuesto = () => setImpuestos([...impuestos, {
    _id: genId(), codigo: "1", codigoRetencion: "303",
    baseImponible: 0, porcentajeRetener: 10, valorRetenido: 0,
  }]);

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
        const opciones = getOpciones(value);
        updated.codigoRetencion   = opciones[0].cod;
        updated.porcentajeRetener = opciones[0].pct;
        updated.valorRetenido     = r2(updated.baseImponible * (opciones[0].pct / 100));
      }
      if (field === "codigoRetencion") {
        const opciones = getOpciones(updated.codigo);
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
    setResultado(null);
    setDocOrigen(null);
    setOrigenTipo("fac_recibida");
    setImpuestos([{ _id: genId(), codigo: "1", codigoRetencion: "303", baseImponible: 0, porcentajeRetener: 10, valorRetenido: 0 }]);
    setCamposAdicionales([]);
    setError("");
  };

  const emitir = async () => {
    setError("");
    if (!docOrigen)                     { setError("Selecciona el documento sustento."); return; }
    if (!estabSelected || !ptoSelected) { setError("Configura el punto de emisión."); return; }
    if (impuestos.some(i => i.baseImponible <= 0)) { setError("La base imponible debe ser mayor a $0."); return; }

    const puedeEmitir = empresa?.suscripcion_activa || (empresa?.balance_api ?? 0) > 0;
    if (!puedeEmitir) { setError("Se requiere suscripción activa o créditos API."); return; }

    setSubmitting(true);
    try {
      const codDocSustento = docOrigen.tipo === "kipu"
        ? docOrigen.data.cod_doc
        : docOrigen.data.cod_doc;

      const payload: any = {
        establecimiento: estabSelected,
        punto_emision:   ptoSelected,
        periodo_fiscal:  periodoFiscal,
        impuestos: impuestos.map(i => ({
          codigo:            i.codigo,
          codigoRetencion:   i.codigoRetencion,
          baseImponible:     i.baseImponible,
          porcentajeRetener: i.porcentajeRetener,
          valorRetenido:     i.valorRetenido,
          codDocSustento,
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

      const res = await api.post("/api/v1/app/documentos/emit/RET", payload);
      setResultado(res.data);
    } catch (err: any) {
      const detail = err?.response?.data?.detail;
      setError(Array.isArray(detail)
        ? detail.map((e: any) => `${e.campo}: ${e.mensaje}`).join(" | ")
        : detail ?? "Error al emitir la retención."
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (resultado) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-gray-950">
        <div className="w-full max-w-sm text-center">
          <div className="w-16 h-16 rounded-full bg-indigo-500/20 flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 size={32} className="text-indigo-400" />
          </div>
          <h2 className="text-xl font-bold text-white mb-1">Retención emitida</h2>
          <p className="text-sm text-gray-500 mb-2">{resultado.claveAcceso}</p>
          <span className="inline-block px-3 py-1 rounded-full text-xs font-medium mb-6 bg-indigo-500/20 text-indigo-400">
            {resultado.estado}
          </span>
          <div className="flex gap-3">
            <button onClick={reset}
              className="flex-1 py-2.5 rounded-lg border border-gray-700 text-gray-400 hover:text-white text-sm transition-colors">
              Nueva RET
            </button>
            <button onClick={() => router.push("/documentos")}
              className="flex-1 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium transition-colors">
              Ver documentos
            </button>
          </div>
        </div>
      </div>
    );
  }

  const origenCfg = ORIGEN_CONFIG[origenTipo];

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-bold text-white">
          Nueva Retención <span className="text-gray-500 text-base font-normal">RET</span>
        </h1>
        <p className="text-sm text-gray-500">
          {empresa?.razon_social} · {empresa?.ambiente === 2 ? "Producción" : "Pruebas"}
        </p>
      </div>

      {empresa && !empresa.suscripcion_activa && empresa.balance_api === 0 && (
        <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3">
          <AlertTriangle size={16} className="text-red-400 shrink-0" />
          <p className="text-sm text-red-300">
            Sin acceso para emitir. <a href="/planes" className="underline">Ver opciones</a>
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">

          <div className="lg:hidden">
            <PuntoEmision
              establecimientos={establecimientos} estabSelected={estabSelected}
              ptoSelected={ptoSelected} puntos={puntos}
              onEstabChange={handleEstabChange} onPtoChange={setPtoSelected}
            />
          </div>

          {/* Toggle tipo de origen */}
          <div className="bg-gray-900 rounded-xl border border-gray-800 p-4 space-y-3">
            <h2 className="text-sm font-semibold text-white">Tipo de documento sustento</h2>
            <div className="grid grid-cols-3 gap-2">
              {(Object.entries(ORIGEN_CONFIG) as [OrigenRet, typeof ORIGEN_CONFIG[OrigenRet]][]).map(([key, cfg]) => (
                <button key={key} onClick={() => cambiarOrigen(key)}
                  className={clsx(
                    "flex flex-col items-center gap-1 px-3 py-2.5 rounded-lg border text-center transition-colors",
                    origenTipo === key
                      ? "border-indigo-500 bg-indigo-500/10 text-indigo-300"
                      : "border-gray-700 text-gray-400 hover:border-gray-600 hover:text-white"
                  )}>
                  <span className="text-xs font-bold">{cfg.label}</span>
                  <span className="text-[10px] text-gray-500 leading-tight">{cfg.sublabel}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Selector de documento según tipo */}
          <DocOrigenSelector
            tiposDoc={origenCfg.tiposDoc}
            tabla={origenCfg.tabla}
            value={docOrigen}
            onChange={async (selected) => {
              setDocOrigen(selected);
              if (selected?.tipo === "kipu") {
                try {
                  if (origenTipo === "liq_emitida") {
                    const res     = await api.get(`/api/v1/app/documentos/${selected.data.id}/desglose`);
                    const desglose = res.data.data;
                    const subtotal = desglose.subtotal;
                    const resumen  = desglose.resumen_impuestos ?? [];

                    const nuevasRet: ImpuestoRet[] = [];

                    // Retención Renta (sobre subtotal)
                    nuevasRet.push({
                      _id:               genId(),
                      codigo:            "1",
                      codigoRetencion:   "303",
                      baseImponible:     r2(subtotal),
                      porcentajeRetener: 10,
                      valorRetenido:     r2(subtotal * 0.10),
                    });

                    // Retención IVA (sobre impuestos de IVA > 0)
                    resumen.forEach((imp: any) => {
                      const tarifa = parseFloat(imp.tarifa ?? "0");
                      const valor  = parseFloat(imp.valor ?? "0");
                      if (tarifa > 0 && valor > 0) {
                        nuevasRet.push({
                          _id:               genId(),
                          codigo:            "2",
                          codigoRetencion:   "1",
                          baseImponible:     r2(valor),
                          porcentajeRetener: 30,
                          valorRetenido:     r2(valor * 0.30),
                        });
                      }
                    });

                    setImpuestos(nuevasRet);
                  } else {
                    setImpuestos([{
                      _id:               genId(),
                      codigo:            "1",
                      codigoRetencion:   "303",
                      baseImponible:     r2(selected.data.importe_total),
                      porcentajeRetener: 10,
                      valorRetenido:     r2(selected.data.importe_total * 0.10),
                    }]);
                  }
                } catch {
                  setImpuestos([{
                    _id:               genId(),
                    codigo:            "1",
                    codigoRetencion:   "303",
                    baseImponible:     r2(selected.data.importe_total),
                    porcentajeRetener: 10,
                    valorRetenido:     r2(selected.data.importe_total * 0.10),
                  }]);
                }
              }
            }}
            label={origenCfg.label}
            nota={origenCfg.nota}
            colorAccent="blue"
          />

          {/* Período fiscal */}
          <div className="bg-gray-900 rounded-xl border border-gray-800 p-4">
            <div className="flex items-center gap-2 mb-3">
              <Calendar size={15} className="text-indigo-400" />
              <h2 className="text-sm font-semibold text-white">Período fiscal</h2>
            </div>
            <input
              value={periodoFiscal}
              onChange={e => setPeriodoFiscal(e.target.value)}
              placeholder="MM/YYYY"
              maxLength={7}
              className="w-40 px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 text-sm"
            />
            <p className="text-xs text-gray-500 mt-1">Formato: MM/YYYY · ej: 08/2026</p>
          </div>

          {/* Impuestos retenidos */}
          <div className="bg-gray-900 rounded-xl border border-gray-800 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-white">Impuestos retenidos</h2>
              <button onClick={addImpuesto}
                className="flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300 transition-colors">
                <Plus size={13} /> Agregar
              </button>
            </div>
            {impuestos.map((imp, idx) => {
              const opciones = getOpciones(imp.codigo);
              return (
                <div key={imp._id} className="p-3 bg-gray-950/60 border border-gray-800 rounded-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500 font-medium">Retención #{idx + 1}</span>
                    <button onClick={() => removeImpuesto(imp._id)} disabled={impuestos.length === 1}
                      className="p-1.5 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg disabled:opacity-20 transition-colors">
                      <Trash2 size={13} />
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className="text-[10px] uppercase font-semibold tracking-wider text-gray-500">Tipo</label>
                      <select value={imp.codigo} onChange={e => editImpuesto(imp._id, "codigo", e.target.value)}
                        className="w-full px-2.5 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white focus:outline-none focus:border-indigo-500 text-sm">
                        {TIPOS_IMPUESTO.map(t => (
                          <option key={t.value} value={t.value}>{t.label}</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] uppercase font-semibold tracking-wider text-gray-500">Código / Concepto</label>
                      <select value={imp.codigoRetencion} onChange={e => editImpuesto(imp._id, "codigoRetencion", e.target.value)}
                        className="w-full px-2.5 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white focus:outline-none focus:border-indigo-500 text-sm">
                        {opciones.map(o => (
                          <option key={o.cod} value={o.cod}>{o.cod} · {o.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="space-y-1">
                      <label className="text-[10px] uppercase font-semibold tracking-wider text-gray-500">Base imponible</label>
                      <div className="relative">
                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500 text-sm">$</span>
                        <input type="number" value={imp.baseImponible}
                          onChange={e => editImpuesto(imp._id, "baseImponible", parseFloat(e.target.value) || 0)}
                          min={0} step={0.01}
                          className="w-full pl-6 pr-2 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white focus:outline-none focus:border-indigo-500 text-sm text-right" />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] uppercase font-semibold tracking-wider text-gray-500">% Retener</label>
                      <div className="relative">
                        <input type="number" value={imp.porcentajeRetener}
                          onChange={e => editImpuesto(imp._id, "porcentajeRetener", parseFloat(e.target.value) || 0)}
                          min={0} max={100} step={0.01}
                          className="w-full px-2 pr-6 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white focus:outline-none focus:border-indigo-500 text-sm text-center" />
                        <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-500 text-sm">%</span>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] uppercase font-semibold tracking-wider text-gray-500">Valor retenido</label>
                      <div className="relative">
                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500 text-sm">$</span>
                        <input type="number" value={imp.valorRetenido}
                          onChange={e => editImpuesto(imp._id, "valorRetenido", parseFloat(e.target.value) || 0)}
                          min={0} step={0.01}
                          className="w-full pl-6 pr-2 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white focus:outline-none focus:border-indigo-500 text-sm text-right" />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
            <div className="flex justify-between text-sm pt-2 border-t border-gray-800 px-1">
              <span className="text-gray-400">Total retenido</span>
              <span className="text-white font-bold">${fmt(totalRetenido)}</span>
            </div>
          </div>

          <CamposAdicionales campos={camposAdicionales} onChange={setCamposAdicionales} />
        </div>

        {/* Panel lateral */}
        <div className="space-y-4">
          <div className="hidden lg:block">
            <PuntoEmision
              establecimientos={establecimientos} estabSelected={estabSelected}
              ptoSelected={ptoSelected} puntos={puntos}
              onEstabChange={handleEstabChange} onPtoChange={setPtoSelected}
            />
          </div>

          <div className="bg-gray-900 rounded-xl border border-gray-800 p-4 sticky top-4">
            <h2 className="text-sm font-semibold text-white mb-4">Resumen</h2>
            <div className="space-y-2 text-sm">
              {impuestos.map((imp, idx) => (
                <div key={imp._id} className="flex justify-between text-gray-400">
                  <span>RET {idx + 1} · {imp.porcentajeRetener}%</span>
                  <span>${fmt(imp.valorRetenido)}</span>
                </div>
              ))}
              <div className="border-t border-gray-800 pt-2 flex justify-between font-bold text-white text-base">
                <span>Total retenido</span>
                <span>${fmt(totalRetenido)}</span>
              </div>
            </div>

            {empresa?.suscripcion_activa || (empresa?.balance_api ?? 0) > 0 ? (
              <div className={`mt-3 px-3 py-2 rounded-lg text-xs ${
                !empresa?.suscripcion_activa
                  ? "bg-amber-500/10 border border-amber-500/20 text-amber-300"
                  : "bg-emerald-500/10 border border-emerald-500/20 text-emerald-300"
              }`}>
                {!empresa?.suscripcion_activa
                  ? `Consumirá 1 crédito API · Disponibles: ${empresa?.balance_api}`
                  : "✅ Incluido en tu suscripción"
                }
              </div>
            ) : (
              <div className="mt-3 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                <AlertTriangle size={12} className="text-red-400" />
                <span className="text-xs text-red-400 font-medium ml-1.5">Sin acceso para emitir</span>
              </div>
            )}

            {error && (
              <p className="mt-3 text-xs text-red-400 bg-red-400/10 px-3 py-2 rounded-lg">{error}</p>
            )}

            <button onClick={emitir}
              disabled={submitting || (!empresa?.suscripcion_activa && (empresa?.balance_api ?? 0) === 0)}
              className="mt-4 w-full py-3 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold text-sm transition-colors flex items-center justify-center gap-2">
              {submitting
                ? <><Loader2 size={16} className="animate-spin" /> Emitiendo...</>
                : `Emitir retención · $${fmt(totalRetenido)}`
              }
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}