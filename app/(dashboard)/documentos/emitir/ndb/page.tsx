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
      <div
        className="min-h-screen flex items-center justify-center p-6"
        style={{ background: "var(--kipu-bg)" }}
      >
        <div className="w-full max-w-sm text-center">
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
            style={{
              background: "color-mix(in srgb, var(--kipu-warning) 20%, transparent)",
            }}
          >
            <CheckCircle2 size={32} style={{ color: "var(--kipu-warning)" }} />
          </div>
          <h2 className="text-xl font-bold mb-1" style={{ color: "var(--kipu-text)" }}>
            Nota de débito emitida
          </h2>
          <p className="text-sm mb-2" style={{ color: "var(--kipu-subtle)" }}>{resultado.claveAcceso}</p>
          <span
            className="inline-block px-3 py-1 rounded-full text-xs font-medium mb-6"
            style={{
              background: "color-mix(in srgb, var(--kipu-warning) 20%, transparent)",
              color: "var(--kipu-warning)",
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
              Nueva NDB
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

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-bold" style={{ color: "var(--kipu-text)" }}>
          Nueva Nota de Débito{" "}
          <span className="text-base font-normal" style={{ color: "var(--kipu-subtle)" }}>
            NDB
          </span>
        </h1>
        <p className="text-sm" style={{ color: "var(--kipu-subtle)" }}>
          {empresa?.razon_social} · {empresa?.ambiente === 2 ? "Producción" : "Pruebas"}
        </p>
      </div>

      {empresa && !empresa.suscripcion_activa && empresa.balance_api === 0 && (
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
            <a href="/planes" className="underline">Ver opciones</a>
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">

          <div className="lg:hidden">
            <PuntoEmision
              establecimientos={establecimientos}
              estabSelected={estabSelected}
              ptoSelected={ptoSelected}
              puntos={puntos}
              onEstabChange={handleEstabChange}
              onPtoChange={setPtoSelected}
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
          <div
            className="rounded-xl p-4 space-y-3"
            style={{
              background: "var(--kipu-surface)",
              border: "1px solid var(--kipu-border)",
            }}
          >
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold" style={{ color: "var(--kipu-text)" }}>
                Motivos
              </h2>
              <button
                type="button"
                onClick={addMotivo}
                className="flex items-center gap-1 text-xs transition-colors"
                style={{ color: "var(--kipu-accent)" }}
                onMouseEnter={e => e.currentTarget.style.color = "var(--kipu-accent-h)"}
                onMouseLeave={e => e.currentTarget.style.color = "var(--kipu-accent)"}
              >
                <Plus size={13} /> Agregar motivo
              </button>
            </div>

            {motivos.map((m, idx) => (
              <div
                key={m._id}
                className="p-3 rounded-xl space-y-2"
                style={{
                  background: "color-mix(in srgb, var(--kipu-surface) 60%, transparent)",
                  border: "1px solid var(--kipu-border)",
                }}
              >
                <div className="flex items-center gap-2">
                  <span className="text-xs w-4 text-center" style={{ color: "var(--kipu-subtle)" }}>
                    #{idx + 1}
                  </span>
                  <input
                    value={m.razon}
                    onChange={e => editMotivo(m._id, "razon", e.target.value)}
                    placeholder="Descripción del motivo (ej: Interés por mora)"
                    className="flex-1 px-3 py-2 rounded-lg text-sm transition-colors focus:outline-none"
                    style={{
                      background: "var(--kipu-surface)",
                      border: "1px solid var(--kipu-border)",
                      color: "var(--kipu-text)",
                    }}
                    onFocus={e => e.currentTarget.style.borderColor = "var(--kipu-warning)"}
                    onBlur={e => e.currentTarget.style.borderColor = "var(--kipu-border)"}
                  />
                  <button
                    type="button"
                    onClick={() => removeMotivo(m._id)}
                    disabled={motivos.length === 1}
                    className="p-2 rounded-lg transition-colors shrink-0 disabled:opacity-20"
                    style={{ color: "var(--kipu-subtle)" }}
                    onMouseEnter={e => {
                      if (motivos.length > 1) {
                        e.currentTarget.style.color = "var(--kipu-danger)";
                        e.currentTarget.style.background = "color-mix(in srgb, var(--kipu-danger) 10%, transparent)";
                      }
                    }}
                    onMouseLeave={e => {
                      if (motivos.length > 1) {
                        e.currentTarget.style.color = "var(--kipu-subtle)";
                        e.currentTarget.style.background = "transparent";
                      }
                    }}
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
                {/* Sugerencias rápidas */}
                {!m.razon && (
                  <div className="flex gap-1.5 flex-wrap pl-6">
                    {RAZONES_SUGERIDAS.map(r => (
                      <button
                        key={r}
                        type="button"
                        onClick={() => editMotivo(m._id, "razon", r)}
                        className="text-[10px] px-2 py-1 rounded-full border transition-colors"
                        style={{
                          borderColor: "var(--kipu-border)",
                          color: "var(--kipu-subtle)",
                        }}
                        onMouseEnter={e => {
                          e.currentTarget.style.color = "var(--kipu-text)";
                          e.currentTarget.style.borderColor = "color-mix(in srgb, var(--kipu-text) 30%, transparent)";
                        }}
                        onMouseLeave={e => {
                          e.currentTarget.style.color = "var(--kipu-subtle)";
                          e.currentTarget.style.borderColor = "var(--kipu-border)";
                        }}
                      >
                        {r}
                      </button>
                    ))}
                  </div>
                )}
                <div className="flex items-center gap-2 pl-6">
                  <span className="text-sm" style={{ color: "var(--kipu-subtle)" }}>$</span>
                  <input
                    type="number"
                    value={m.valor}
                    onChange={e => editMotivo(m._id, "valor", parseFloat(e.target.value) || 0)}
                    min={0}
                    step={0.01}
                    placeholder="0.00"
                    className="w-32 px-3 py-1.5 rounded-lg text-sm text-right transition-colors focus:outline-none"
                    style={{
                      background: "var(--kipu-surface)",
                      border: "1px solid var(--kipu-border)",
                      color: "var(--kipu-text)",
                    }}
                    onFocus={e => e.currentTarget.style.borderColor = "var(--kipu-warning)"}
                    onBlur={e => e.currentTarget.style.borderColor = "var(--kipu-border)"}
                  />
                  <span className="text-xs" style={{ color: "var(--kipu-subtle)" }}>
                    valor a cobrar
                  </span>
                </div>
              </div>
            ))}

            {/* Total motivos */}
            {motivos.length > 1 && (
              <div
                className="flex justify-between text-sm pt-2 px-1"
                style={{ borderTop: "1px solid var(--kipu-border)" }}
              >
                <span style={{ color: "var(--kipu-muted)" }}>Total NDB</span>
                <span className="font-bold" style={{ color: "var(--kipu-text)" }}>
                  ${fmt(totalNdb)}
                </span>
              </div>
            )}
          </div>

          <CamposAdicionales campos={camposAdicionales} onChange={setCamposAdicionales} />
        </div>

        {/* Panel lateral */}
        <div className="space-y-4">
          <div className="hidden lg:block">
            <PuntoEmision
              establecimientos={establecimientos}
              estabSelected={estabSelected}
              ptoSelected={ptoSelected}
              puntos={puntos}
              onEstabChange={handleEstabChange}
              onPtoChange={setPtoSelected}
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