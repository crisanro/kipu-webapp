// app/(dashboard)/documentos/emitir/_components/DocOrigenSelector.tsx
"use client";
import { useState, useEffect, useRef } from "react";
import api from "@/lib/api";
import { Search, Loader2, FileText, X, ToggleLeft, ToggleRight, AlertTriangle } from "lucide-react";
import { clsx } from "clsx";

export interface DocOrigenKipu {
  id:             string;
  numero_doc:     string;
  tipo_doc:       string;
  cod_doc:        string;
  fecha_emision:  string;
  importe_total:  number;
  razon_social:   string;
  identificacion: string;
  estado_sri:     string;
}

export interface DocOrigenManual {
  numero:  string;
  fecha:   string;
  cod_doc: string;
  cliente: {
    tipo_id:        string;
    identificacion: string;
    razon_social:   string;
    email:          string;
  };
}

export type DocOrigen =
  | { tipo: "kipu";   data: DocOrigenKipu   }
  | { tipo: "manual"; data: DocOrigenManual }
  | null;

interface Props {
  tiposDoc:     string;           // "FAC" | "FAC,LIQ" | "LIQ" | "FAC,NDB"
  tabla:        "emitidos" | "recibidos";
  value:        DocOrigen;
  onChange:     (doc: DocOrigen) => void;
  label?:       string;
  colorAccent?: string;
  nota?:        string;           // ← mensaje informativo opcional
}

const fmt = (n: number) => parseFloat(String(n || 0)).toFixed(2);

// Helper para formatear automáticamente número de comprobante SRI (001-001-000000001)
const formatNumeroDoc = (val: string): string => {
  const solo = val.replace(/[^0-9]/g, "");
  if (solo.length <= 3) return solo;
  if (solo.length <= 6) return `${solo.slice(0, 3)}-${solo.slice(3)}`;
  return `${solo.slice(0, 3)}-${solo.slice(3, 6)}-${solo.slice(6, 15)}`;
};

// Helper para formatear fecha automáticamente a dd/mm/yyyy
const formatFechaDoc = (val: string): string => {
  const solo = val.replace(/[^0-9]/g, "");
  if (solo.length <= 2) return solo;
  if (solo.length <= 4) return `${solo.slice(0, 2)}/${solo.slice(2)}`;
  return `${solo.slice(0, 2)}/${solo.slice(2, 4)}/${solo.slice(4, 8)}`;
};

const TODOS_TIPOS_COD = [
  { value: "01", label: "Factura",               tipos: ["FAC"] },
  { value: "03", label: "Liquidación de compra", tipos: ["LIQ"] },
  { value: "05", label: "Nota de débito",        tipos: ["NDB"] },
];

const TIPOS_ID = [
  { value: "04", label: "RUC"       },
  { value: "05", label: "Cédula"    },
  { value: "06", label: "Pasaporte" },
  { value: "08", label: "Exterior"  },
];

const TIPO_DOC_LABEL: Record<string, string> = {
  FAC: "Factura",
  LIQ: "Liquidación",
  NCR: "Nota de crédito",
  NDB: "Nota de débito",
  RET: "Retención",
};

export default function DocOrigenSelector({
  tiposDoc,
  tabla,
  value,
  onChange,
  label       = "Documento origen",
  colorAccent = "indigo",
  nota,
}: Props) {
  const [modo,     setModo]     = useState<"kipu" | "manual">("kipu");
  const [query,    setQuery]    = useState("");
  const [results,  setResults]  = useState<DocOrigenKipu[]>([]);
  const [loading,  setLoading]  = useState(false);
  const [showDrop, setShowDrop] = useState(false);
  const dropRef = useRef<HTMLDivElement>(null);

  // Tipos permitidos como array
  const tiposPermitidos = tiposDoc.split(",").map(t => t.trim().toUpperCase());

  // Tipos de cod para el formulario manual — filtrados según tiposDoc
  const tiposCodFiltrados = TODOS_TIPOS_COD.filter(t =>
    t.tipos.some(tipo => tiposPermitidos.includes(tipo))
  );

  // cod_doc inicial para el formulario manual
  const codDocInicial = tiposCodFiltrados[0]?.value ?? "01";

  const [manual, setManual] = useState<DocOrigenManual>({
    numero:  "",
    fecha:   "",
    cod_doc: codDocInicial,
    cliente: { tipo_id: "05", identificacion: "", razon_social: "", email: "" },
  });

  const accent = colorAccent === "amber" ? {
    border: "border-amber-500", bg: "bg-amber-500/10",
    text: "text-amber-400",     icon: "text-amber-400",
  } : colorAccent === "blue" ? {
    border: "border-blue-500",  bg: "bg-blue-500/10",
    text: "text-blue-400",      icon: "text-blue-400",
  } : {
    border: "border-indigo-500", bg: "bg-indigo-500/10",
    text: "text-indigo-400",     icon: "text-indigo-400",
  };

  // Cerrar dropdown al hacer clic fuera
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropRef.current && !dropRef.current.contains(e.target as Node)) {
        setShowDrop(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Buscar documentos — filtrar por tiposDoc en el cliente
  useEffect(() => {
    if (modo !== "kipu" || !query || query.length < 3) { setResults([]); return; }
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const tipoParam = tiposPermitidos.length > 0
          ? `&tipo_doc=${tiposPermitidos.join(",")}`
          : "";

        const endpoint = tabla === "emitidos"
          ? `/api/v1/app/documentos?estado_sri=AUTORIZADO${tipoParam}&q=${encodeURIComponent(query)}&limit=8`
          : `/api/v1/app/recibidos?q=${encodeURIComponent(query)}&limit=8`;

        const res  = await api.get(endpoint);
        const rows = res.data.data ?? [];

        const filtrados = rows.filter((d: any) => {
          if (tabla === "recibidos") return true;
          return tiposPermitidos.includes(d.tipo_doc?.toUpperCase());
        });

        setResults(filtrados.map((d: any) => ({
          id:             d.id,
          numero_doc:     d.numero_doc,
          tipo_doc:       d.tipo_doc    || "FAC",
          cod_doc:        d.cod_doc     || "01",
          fecha_emision:  d.fecha_emision,
          importe_total:  d.importe_total,
          razon_social:   d.razon_social || d.razon_social_proveedor || "",
          identificacion: d.identificacion || d.ruc_proveedor || "",
          estado_sri:     d.estado_sri || "",
        })));
        setShowDrop(true);
      } catch { setResults([]); }
      finally { setLoading(false); }
    }, 350);
    return () => clearTimeout(t);
  }, [query, modo, tabla, tiposDoc]);

  const seleccionar = (doc: DocOrigenKipu) => {
    onChange({ tipo: "kipu", data: doc });
    setQuery("");
    setShowDrop(false);
  };

  const limpiar = () => {
    onChange(null);
    setQuery("");
    setResults([]);
    setManual({
      numero: "", fecha: "", cod_doc: codDocInicial,
      cliente: { tipo_id: "05", identificacion: "", razon_social: "", email: "" },
    });
  };

  const confirmarManual = () => {
    if (!manual.numero.trim() || !manual.fecha.trim()) return;
    if (!manual.cliente.identificacion.trim() || !manual.cliente.razon_social.trim()) return;
    onChange({ tipo: "manual", data: manual });
  };

  return (
    <div className="bg-gray-900 rounded-xl border border-gray-800 p-4 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText size={15} className={accent.icon} />
          <h2 className="text-sm font-semibold text-white">{label}</h2>
          {/* Badge tipos permitidos */}
          <div className="flex gap-1">
            {tiposPermitidos.map(t => (
              <span key={t}
                className="text-[10px] px-1.5 py-0.5 rounded font-bold bg-gray-800 text-gray-400">
                {t}
              </span>
            ))}
          </div>
        </div>
        {/* Toggle Kipu / Manual */}
        {!value && (
          <div className="flex items-center gap-2">
            <span className={clsx("text-xs", modo === "kipu" ? "text-white" : "text-gray-500")}>
              En Kipu
            </span>
            <button
              onClick={() => { setModo(modo === "kipu" ? "manual" : "kipu"); limpiar(); }}
              className="text-gray-400 hover:text-white transition-colors"
            >
              {modo === "kipu"
                ? <ToggleLeft  size={22} className="text-gray-500" />
                : <ToggleRight size={22} className={accent.text} />
              }
            </button>
            <span className={clsx("text-xs", modo === "manual" ? "text-white" : "text-gray-500")}>
              Externo
            </span>
          </div>
        )}
      </div>

      {/* Nota informativa */}
      {nota && !value && (
        <div className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2">
          <AlertTriangle size={12} className="text-amber-400 shrink-0" />
          <p className="text-xs text-amber-300">{nota}</p>
        </div>
      )}

      {/* Doc seleccionado */}
      {value && (
        <div className={clsx(
          "flex items-start gap-3 rounded-lg px-3 py-2.5 border",
          accent.bg, accent.border + "/30"
        )}>
          <div className="flex-1 min-w-0">
            {value.tipo === "kipu" ? (
              <>
                <div className="flex items-center gap-2">
                  <span className="text-xs px-1.5 py-0.5 rounded bg-gray-700 text-gray-300 font-bold">
                    {value.data.tipo_doc}
                  </span>
                  <p className="text-sm text-white font-medium font-mono">{value.data.numero_doc}</p>
                </div>
                <p className="text-xs text-gray-400 mt-0.5">{value.data.razon_social}</p>
                <p className="text-xs text-gray-500">
                  {value.data.fecha_emision} · ${fmt(value.data.importe_total)}
                </p>
              </>
            ) : (
              <>
                <div className="flex items-center gap-2">
                  <span className="text-xs px-1.5 py-0.5 rounded bg-gray-700 text-gray-300 font-bold">
                    {value.data.cod_doc === "01" ? "FAC" :
                     value.data.cod_doc === "03" ? "LIQ" :
                     value.data.cod_doc === "05" ? "NDB" : value.data.cod_doc}
                  </span>
                  <p className="text-sm text-white font-medium font-mono">{value.data.numero}</p>
                </div>
                <p className="text-xs text-gray-400 mt-0.5">
                  {value.data.cliente.razon_social} · {value.data.cliente.identificacion}
                </p>
                <p className="text-xs text-gray-500">{value.data.fecha} · Externo</p>
              </>
            )}
          </div>
          <button onClick={limpiar}
            className="text-gray-500 hover:text-white p-1 transition-colors shrink-0">
            <X size={15} />
          </button>
        </div>
      )}

      {/* Modo Kipu — buscador */}
      {!value && modo === "kipu" && (
        <div className="relative" ref={dropRef}>
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            onFocus={() => results.length > 0 && setShowDrop(true)}
            placeholder={`Buscar ${tiposPermitidos.map(t => TIPO_DOC_LABEL[t] ?? t).join(" / ")}...`}
            className="w-full pl-9 pr-4 py-2.5 rounded-lg bg-gray-800 border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 text-sm"
          />
          {loading && (
            <Loader2 size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 animate-spin" />
          )}
          {showDrop && results.length > 0 && (
            <div className="absolute z-10 w-full mt-1 bg-gray-800 border border-gray-700 rounded-lg shadow-xl overflow-hidden max-h-60 overflow-y-auto">
              {results.map(d => (
                <button key={d.id} onClick={() => seleccionar(d)}
                  className="w-full flex items-center justify-between gap-3 px-4 py-3 hover:bg-gray-700 text-left border-b border-gray-700/50 last:border-0">
                  <div className="min-w-0 flex items-start gap-2">
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-700 text-gray-400 font-bold shrink-0 mt-0.5">
                      {d.tipo_doc}
                    </span>
                    <div>
                      <p className="text-sm text-white font-mono">{d.numero_doc}</p>
                      <p className="text-xs text-gray-500 truncate">{d.razon_social}</p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className={clsx("text-sm font-bold", accent.text)}>${fmt(d.importe_total)}</p>
                    <p className="text-xs text-gray-500">{d.fecha_emision}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
          {query.length >= 3 && !loading && results.length === 0 && (
            <p className="text-xs text-gray-500 mt-2">
              No encontrado en Kipu.{" "}
              <button onClick={() => setModo("manual")} className={clsx("underline", accent.text)}>
                Ingresar manualmente
              </button>
            </p>
          )}
        </div>
      )}

      {/* Modo Manual */}
      {!value && modo === "manual" && (
        <div className="space-y-2">
          <div className="grid grid-cols-2 gap-2">
            {/* Tipo documento */}
            <div className="space-y-1">
              <label className="text-[10px] uppercase font-semibold tracking-wider text-gray-500">Tipo doc</label>
              {tiposCodFiltrados.length === 1 ? (
                <div className="px-2.5 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white text-sm">
                  {tiposCodFiltrados[0].label}
                </div>
              ) : (
                <select
                  value={manual.cod_doc}
                  onChange={e => setManual({ ...manual, cod_doc: e.target.value })}
                  className="w-full px-2.5 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white focus:outline-none focus:border-indigo-500 text-sm"
                >
                  {tiposCodFiltrados.map(t => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              )}
            </div>
            {/* Número */}
            <div className="space-y-1">
              <label className="text-[10px] uppercase font-semibold tracking-wider text-gray-500">Número</label>
              <input
                value={manual.numero}
                onChange={e => setManual({ ...manual, numero: formatNumeroDoc(e.target.value) })}
                placeholder="001-001-000000001"
                maxLength={17}
                className="w-full px-2.5 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 text-sm font-mono"
              />
            </div>
          </div>

          {/* Fecha */}
          <div className="space-y-1">
            <label className="text-[10px] uppercase font-semibold tracking-wider text-gray-500">
              Fecha emisión (dd/mm/yyyy)
            </label>
            <input
              type="text"
              inputMode="numeric"
              value={manual.fecha}
              onChange={e => setManual({ ...manual, fecha: formatFechaDoc(e.target.value) })}
              placeholder="21/08/2026"
              maxLength={10}
              className="w-full px-2.5 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 text-sm font-mono"
            />
          </div>

          {/* Cliente / Proveedor */}
          <div className="pt-1 border-t border-gray-800">
            <p className="text-[10px] uppercase font-semibold tracking-wider text-gray-500 mb-2">
              Datos del {tabla === "recibidos" ? "proveedor" : "cliente"}
            </p>
            <div className="grid grid-cols-2 gap-2">
              <select
                value={manual.cliente.tipo_id}
                onChange={e => setManual({ ...manual, cliente: { ...manual.cliente, tipo_id: e.target.value } })}
                className="px-2 py-1.5 rounded-lg bg-gray-800 border border-gray-700 text-white text-xs focus:outline-none focus:border-indigo-500"
              >
                {TIPOS_ID.map(t => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
              <input
                value={manual.cliente.identificacion}
                onChange={e => setManual({ ...manual, cliente: { ...manual.cliente, identificacion: e.target.value } })}
                placeholder="RUC / Cédula"
                className="px-2 py-1.5 rounded-lg bg-gray-800 border border-gray-700 text-white placeholder-gray-500 text-xs focus:outline-none focus:border-indigo-500"
              />
            </div>
            <input
              value={manual.cliente.razon_social}
              onChange={e => setManual({ ...manual, cliente: { ...manual.cliente, razon_social: e.target.value } })}
              placeholder="Razón social / Nombre *"
              className="w-full mt-2 px-2.5 py-1.5 rounded-lg bg-gray-800 border border-gray-700 text-white placeholder-gray-500 text-xs focus:outline-none focus:border-indigo-500"
            />
            <input
              value={manual.cliente.email}
              onChange={e => setManual({ ...manual, cliente: { ...manual.cliente, email: e.target.value } })}
              placeholder="Email (opcional)"
              className="w-full mt-2 px-2.5 py-1.5 rounded-lg bg-gray-800 border border-gray-700 text-white placeholder-gray-500 text-xs focus:outline-none focus:border-indigo-500"
            />
          </div>

          <button
            onClick={confirmarManual}
            disabled={!manual.numero || !manual.fecha || !manual.cliente.identificacion || !manual.cliente.razon_social}
            className={clsx(
              "w-full py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed",
              colorAccent === "amber"
                ? "bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 border border-amber-500/20"
                : colorAccent === "blue"
                ? "bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/20"
                : "bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/20"
            )}
          >
            Usar este documento
          </button>
        </div>
      )}
    </div>
  );
}