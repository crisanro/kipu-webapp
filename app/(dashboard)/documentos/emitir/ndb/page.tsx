// app/(dashboard)/documentos/emitir/ndb/page.tsx
"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { v4 as uuidv4 } from "uuid";
import api from "@/lib/api";
import { useAuthStore } from "@/store/auth.store";
import { CheckCircle2, AlertTriangle, Plus, Trash2 } from "lucide-react";
import PuntoEmision from "../components/PuntoEmision";
import CamposAdicionales, { CampoAdicional } from "../components/CamposAdicionales";
import ResumenTotales from "../components/ResumenTotales";
import DocOrigenSelector, { DocOrigen } from "../components/DocOrigenSelector";

const r2  = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;
const fmt = (n: number) => r2(n).toFixed(2);
const genId = () => Math.random().toString(36).slice(2);

interface Motivo {
  _id:   string;
  razon: string;
  valor: number;
}

interface Establecimiento {
  codigo:            string;
  nombre_comercial?: string;
  direccion:         string;
  puntos_emision:    { codigo: string; nombre?: string }[];
}

const RAZONES_SUGERIDAS = [
  "Interés por mora",
  "Gastos de cobranza",
  "Diferencia de precio",
  "Gastos administrativos",
  "Otros cargos",
];

export default function NuevaNdbPage() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const empresa      = useAuthStore((s) => s.empresa);

  // ── Idempotencia ────────────────────────────────────────────────────────────
  const idempotencyKey = useRef(uuidv4());

  // Doc origen
  const [docOrigen, setDocOrigen] = useState<DocOrigen>(null);

  // Motivos
  const [motivos, setMotivos] = useState<Motivo[]>([
    { _id: genId(), razon: "", valor: 0 }
  ]);

  // Campos adicionales
  const [camposAdicionales, setCamposAdicionales] = useState<CampoAdicional[]>([]);

  // Establecimiento
  const [establecimientos, setEstablecimientos] = useState<Establecimiento[]>([]);
  const [estabSelected,    setEstabSelected]    = useState("");
  const [ptoSelected,      setPtoSelected]      = useState("");
  const [puntos,           setPuntos]           = useState<{ codigo: string; nombre?: string }[]>([]);

  // UI
  const [submitting, setSubmitting] = useState(false);
  const [resultado,  setResultado]  = useState<any>(null);
  const [error,      setError]      = useState("");

  const totalNdb = r2(motivos.reduce((s, m) => s + (m.valor || 0), 0));

  const totales = {
    subtotal:    totalNdb,
    descuento:   0,
    iva:         0,
    subtotal_0:  totalNdb,
    subtotal_5:  0,
    subtotal_15: 0,
    iva_5:       0,
    iva_15:      0,
    propina:     0,
    total:       totalNdb,
  };

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

  // Pre-cargar desde ?doc_id=
  useEffect(() => {
    const docId = searchParams.get("doc_id");
    if (!docId) return;
    const cargar = async () => {
      try {
        const res  = await api.get(`/api/v1/app/documentos/${docId}`);
        const d    = res.data.data;
        const info = d.datos?.infoFactura || d.datos?.infoLiquidacionCompra || {};

        setDocOrigen({
          tipo: "kipu",
          data: {
            id:             d.id,
            numero_doc:     d.numero_doc,
            tipo_doc:       d.tipo_doc || "FAC",
            cod_doc:        d.cod_doc || "01",
            fecha_emision:  d.fecha_emision,
            importe_total:  d.importe_total,
            razon_social:   info.razonSocialComprador || info.razonSocialProveedor || "",
            identificacion: info.identificacionComprador || info.identificacionProveedor || "",
            estado_sri:     d.estado_sri,
          }
        });
      } catch (e) { console.error(e); }
    };
    cargar();
  }, [searchParams]);

  const handleEstabChange = (codigo: string, ptos: { codigo: string; nombre?: string }[]) => {
    setEstabSelected(codigo);
    setPuntos(ptos);
    setPtoSelected(ptos[0]?.codigo ?? "");
  };

  // Motivos handlers
  const addMotivo = () => setMotivos([...motivos, { _id: genId(), razon: "", valor: 0 }]);
  const removeMotivo = (id: string) => {
    if (motivos.length === 1) return;
    setMotivos(motivos.filter(m => m._id !== id));
  };
  const editMotivo = (id: string, field: "razon" | "valor", value: any) => {
    setMotivos(motivos.map(m => m._id === id ? { ...m, [field]: value } : m));
  };

  const reset = () => {
    idempotencyKey.current = uuidv4(); // Regenerar key al resetear
    setResultado(null);
    setDocOrigen(null);
    setMotivos([{ _id: genId(), razon: "", valor: 0 }]);
    setCamposAdicionales([]);
    setError("");
  };

  const emitir = async () => {
    setError("");
    if (!docOrigen)                     { setError("Selecciona el documento a modificar."); return; }
    if (!estabSelected || !ptoSelected) { setError("Configura el punto de emisión."); return; }
    if (motivos.some(m => !m.razon.trim())) { setError("Todos los motivos deben tener descripción."); return; }
    if (totalNdb <= 0)                  { setError("El valor total debe ser mayor a $0."); return; }

    const puedeEmitir = empresa?.suscripcion_activa || (empresa?.balance_api ?? 0) > 0;
    if (!puedeEmitir) { setError("Se requiere suscripción activa o créditos API."); return; }

    setSubmitting(true);
    try {
      const payload: any = {
        establecimiento:    estabSelected,
        punto_emision:      ptoSelected,
        motivos:            motivos.map(m => ({ razon: m.razon.toUpperCase(), valor: m.valor })),
        campos_adicionales: camposAdicionales.filter(c => c.nombre && c.valor),
      };

      if (docOrigen?.tipo === "kipu") {
        payload.doc_origen_id = docOrigen.data.id;
      } else if (docOrigen?.tipo === "manual") {
        payload.doc_origen_numero  = docOrigen.data.numero;
        payload.doc_origen_fecha   = docOrigen.data.fecha;
        payload.doc_origen_cod_doc = docOrigen.data.cod_doc;
        payload.cliente_origen     = docOrigen.data.cliente;
      }

      const res = await api.post(
        "/api/v1/app/documentos/emit/NDB",
        payload,
        {
          headers: {
            "X-Idempotency-Key": idempotencyKey.current,
          },
        }
      );
      setResultado(res.data);
    } catch (err: any) {
      // Regenerar key si ocurre un error para un nuevo intento
      idempotencyKey.current = uuidv4();

      const detail = err?.response?.data?.detail;
      setError(Array.isArray(detail)
        ? detail.map((e: any) => `${e.campo}: ${e.mensaje}`).join(" | ")
        : detail ?? "Error al emitir la nota de débito."
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (resultado) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-gray-950">
        <div className="w-full max-w-sm text-center">
          <div className="w-16 h-16 rounded-full bg-amber-500/20 flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 size={32} className="text-amber-400" />
          </div>
          <h2 className="text-xl font-bold text-white mb-1">Nota de débito emitida</h2>
          <p className="text-sm text-gray-500 mb-2">{resultado.claveAcceso}</p>
          <span className="inline-block px-3 py-1 rounded-full text-xs font-medium mb-6 bg-amber-500/20 text-amber-400">
            {resultado.estado}
          </span>
          <div className="flex gap-3">
            <button onClick={reset}
              className="flex-1 py-2.5 rounded-lg border border-gray-700 text-gray-400 hover:text-white text-sm transition-colors">
              Nueva NDB
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

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-bold text-white">
          Nueva Nota de Débito <span className="text-gray-500 text-base font-normal">NDB</span>
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

          {/* Selector Documento Origen */}
          <DocOrigenSelector
            tiposDoc="FAC"
            tabla="emitidos"
            value={docOrigen}
            onChange={setDocOrigen}
            label="Documento a modificar"
            colorAccent="amber"
          />

          {/* Motivos */}
          <div className="bg-gray-900 rounded-xl border border-gray-800 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-white">Motivos</h2>
              <button onClick={addMotivo}
                className="flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300 transition-colors">
                <Plus size={13} /> Agregar motivo
              </button>
            </div>

            {motivos.map((m, idx) => (
              <div key={m._id} className="p-3 bg-gray-950/60 border border-gray-800 rounded-xl space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500 w-4 text-center">#{idx + 1}</span>
                  <input
                    value={m.razon}
                    onChange={e => editMotivo(m._id, "razon", e.target.value)}
                    placeholder="Descripción del motivo (ej: Interés por mora)"
                    className="flex-1 px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:border-amber-500 text-sm"
                  />
                  <button onClick={() => removeMotivo(m._id)} disabled={motivos.length === 1}
                    className="p-2 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg disabled:opacity-20 transition-colors">
                    <Trash2 size={15} />
                  </button>
                </div>
                {/* Sugerencias rápidas */}
                {!m.razon && (
                  <div className="flex gap-1.5 flex-wrap pl-6">
                    {RAZONES_SUGERIDAS.map(r => (
                      <button key={r} onClick={() => editMotivo(m._id, "razon", r)}
                        className="text-[10px] px-2 py-1 rounded-full border border-gray-700 text-gray-500 hover:text-white hover:border-gray-500 transition-colors">
                        {r}
                      </button>
                    ))}
                  </div>
                )}
                <div className="flex items-center gap-2 pl-6">
                  <span className="text-gray-500 text-sm">$</span>
                  <input
                    type="number"
                    value={m.valor}
                    onChange={e => editMotivo(m._id, "valor", parseFloat(e.target.value) || 0)}
                    min={0} step={0.01} placeholder="0.00"
                    className="w-32 px-3 py-1.5 rounded-lg bg-gray-800 border border-gray-700 text-white focus:outline-none focus:border-amber-500 text-sm text-right"
                  />
                  <span className="text-xs text-gray-500">valor a cobrar</span>
                </div>
              </div>
            ))}

            {/* Total motivos */}
            {motivos.length > 1 && (
              <div className="flex justify-between text-sm pt-2 border-t border-gray-800 px-1">
                <span className="text-gray-400">Total NDB</span>
                <span className="text-white font-bold">${fmt(totalNdb)}</span>
              </div>
            )}
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
          <ResumenTotales
            totales={totales}
            submitting={submitting}
            error={error}
            suscripcionActiva={empresa?.suscripcion_activa ?? false}
            balanceApi={empresa?.balance_api ?? 0}
            onEmitir={emitir}
          />
        </div>
      </div>
    </div>
  );
}