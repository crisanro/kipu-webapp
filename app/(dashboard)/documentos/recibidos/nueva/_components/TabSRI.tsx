// app/(dashboard)/documentos/recibidos/nueva/_components/TabSRI.tsx
"use client";
import { useRef, useState, useCallback } from "react";
import { Upload, Loader2, Check, X, AlertTriangle, FileText } from "lucide-react";
import { clsx } from "clsx";
import api from "@/lib/api";

interface FilaSRI {
  ruc_emisor:          string;
  razon_social:        string;
  tipo_comprobante:    string;
  serie:               string;
  clave_acceso:        string;
  fecha_autorizacion:  string;
  fecha_emision:       string;
  identificacion:      string;
  valor_sin_impuestos: number;
  iva:                 number;
  importe_total:       number;
  seleccionada:        boolean;
  estado:              "pendiente" | "importando" | "ok" | "error" | "duplicado";
  mensaje:             string;
}

interface Props {
  empresa:  any;
  onDone:   () => void;
}

function parsearFecha(fecha: string): string {
  // "01/07/2026" → "2026-07-01"
  const [d, m, y] = fecha.trim().split("/");
  if (y) return `${y}-${m.padStart(2,"0")}-${d.padStart(2,"0")}`;
  return fecha;
}

function esRUC(identificacion: string): boolean {
  const id = identificacion.trim();
  return id.length === 13 && id.endsWith("001");
}

function parsearTXT(contenido: string, rucEmpresa: string): FilaSRI[] {
  const lineas = contenido.split("\n").filter(l => l.trim());
  if (lineas.length < 2) return [];

  // Primera línea son headers — ignorar
  const filas: FilaSRI[] = [];

  for (let i = 1; i < lineas.length; i++) {
    const cols = lineas[i].split("\t");
    if (cols.length < 11) continue;

    const identificacion = cols[7]?.trim() ?? "";

    // Solo RUC — ignorar cédulas
    if (!esRUC(identificacion)) continue;

    // Solo los que corresponden a esta empresa
    if (identificacion !== rucEmpresa) continue;

    filas.push({
      ruc_emisor:          cols[0]?.trim() ?? "",
      razon_social:        cols[1]?.trim() ?? "",
      tipo_comprobante:    cols[2]?.trim() ?? "",
      serie:               cols[3]?.trim() ?? "",
      clave_acceso:        cols[4]?.trim() ?? "",
      fecha_autorizacion: parsearFechaHora(cols[5]?.trim() ?? ""),
      fecha_emision:       parsearFecha(cols[6]?.trim() ?? ""),
      identificacion,
      valor_sin_impuestos: parseFloat(cols[8]?.trim() ?? "0") || 0,
      iva:                 parseFloat(cols[9]?.trim() ?? "0") || 0,
      importe_total:       parseFloat(cols[10]?.trim() ?? "0") || 0,
      seleccionada:        true,
      estado:              "pendiente",
      mensaje:             "",
    });
  }

  return filas;
}

// Agregar esta función junto a parsearFecha
function parsearFechaHora(fecha: string): string {
  // "06/07/2026 21:26:32" → "2026-07-06T21:26:32"
  if (!fecha) return "";
  const [fechaParte, horaParte] = fecha.trim().split(" ");
  if (!fechaParte) return "";
  const [d, m, y] = fechaParte.split("/");
  if (!y) return fecha;
  return horaParte
    ? `${y}-${m.padStart(2,"0")}-${d.padStart(2,"0")}T${horaParte}`
    : `${y}-${m.padStart(2,"0")}-${d.padStart(2,"0")}`;
}

export default function TabSRI({ empresa, onDone }: Props) {
  const fileRef            = useRef<HTMLInputElement>(null);
  const [dragging,         setDragging]         = useState(false);
  const [filas,            setFilas]            = useState<FilaSRI[]>([]);
  const [importando,       setImportando]       = useState(false);
  const [error,            setError]            = useState("");
  const [resumen,          setResumen]          = useState<{ ok: number; error: number; duplicado: number } | null>(null);

  const procesarArchivo = useCallback((file: File) => {
    setError("");
    setFilas([]);
    setResumen(null);

    if (!file.name.toLowerCase().endsWith(".txt")) {
      setError("Solo se aceptan archivos .txt del portal del SRI.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const contenido = e.target?.result as string;
      const resultado = parsearTXT(contenido, empresa?.ruc ?? "");

      if (resultado.length === 0) {
        setError("No se encontraron comprobantes con RUC válido para tu empresa. Verifica que el archivo corresponda a tu RUC.");
        return;
      }

      setFilas(resultado);
    };
    reader.readAsText(file, "latin-1");
  }, [empresa]);

  const toggleFila = (idx: number) => {
    setFilas(prev => prev.map((f, i) =>
      i === idx ? { ...f, seleccionada: !f.seleccionada } : f
    ));
  };

  const toggleTodas = () => {
    const todasSeleccionadas = filas.every(f => f.seleccionada);
    setFilas(prev => prev.map(f => ({ ...f, seleccionada: !todasSeleccionadas })));
  };

  const importar = async () => {
    const seleccionadas = filas.filter(f => f.seleccionada && f.estado === "pendiente");
    if (seleccionadas.length === 0) return;

    setImportando(true);
    let ok = 0, errores = 0, duplicados = 0;

    for (const fila of seleccionadas) {
      // Marcar como importando
      setFilas(prev => prev.map(f =>
        f.clave_acceso === fila.clave_acceso ? { ...f, estado: "importando" } : f
      ));

      try {
        // Construir impuestos_detalle
        const impuestos = [];
        if (fila.valor_sin_impuestos > 0 && fila.iva > 0) {
          const tarifa = Math.round((fila.iva / fila.valor_sin_impuestos) * 100);
          impuestos.push({
            codigoPorcentaje: String(tarifa),
            tarifa:           String(tarifa),
            baseImponible:    fila.valor_sin_impuestos,
            valor:            fila.iva,
            aplicaCredito:    tarifa > 0,
          });
        }
        if (fila.valor_sin_impuestos > 0 && fila.iva === 0) {
          impuestos.push({
            codigoPorcentaje: "0",
            tarifa:           "0",
            baseImponible:    fila.valor_sin_impuestos,
            valor:            0,
            aplicaCredito:    false,
          });
        }

        await api.post("/api/v1/app/recibidos", {
          ruc_proveedor:          fila.ruc_emisor,
          razon_social_proveedor: fila.razon_social,
          tipo_doc:               "FAC",
          cod_doc:                "01",
          clave_acceso:           fila.clave_acceso,
          numero_doc:             fila.serie,
          fecha_emision:          fila.fecha_emision,
          fecha_autorizacion:     fila.fecha_autorizacion,
          importe_total:          fila.importe_total,
          impuestos_detalle:      impuestos,
          deducible_renta:        true,
          credito_tributario_iva: fila.iva > 0,
          datos:                  { fuente: "SRI_TXT", serie: fila.serie },
          fuente:                 "XML",
        });

        ok++;
        setFilas(prev => prev.map(f =>
          f.clave_acceso === fila.clave_acceso
            ? { ...f, estado: "ok", mensaje: "Importado" }
            : f
        ));
      } catch (err: any) {
        const detail = err?.response?.data?.detail ?? "";
        if (err?.response?.status === 409 || detail.toLowerCase().includes("ya fue registrado")) {
          duplicados++;
          setFilas(prev => prev.map(f =>
            f.clave_acceso === fila.clave_acceso
              ? { ...f, estado: "duplicado", mensaje: "Ya registrado" }
              : f
          ));
        } else {
          errores++;
          setFilas(prev => prev.map(f =>
            f.clave_acceso === fila.clave_acceso
              ? { ...f, estado: "error", mensaje: detail || "Error al importar" }
              : f
          ));
        }
      }
    }

    setImportando(false);
    setResumen({ ok, error: errores, duplicado: duplicados });
  };

  const seleccionadas = filas.filter(f => f.seleccionada && f.estado === "pendiente").length;
  const totalImporte  = filas
    .filter(f => f.seleccionada && f.estado === "pendiente")
    .reduce((s, f) => s + f.importe_total, 0);

  // ── Drop zone ────────────────────────────────────────────────────────────
  if (filas.length === 0) {
    return (
      <div className="space-y-4">
        <div
          onDragOver={e => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={e => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files?.[0]; if (f) procesarArchivo(f); }}
          onClick={() => fileRef.current?.click()}
          className={clsx(
            "border-2 border-dashed rounded-xl p-12 flex flex-col items-center justify-center gap-4 cursor-pointer transition-colors",
            dragging
              ? "border-indigo-500 bg-indigo-500/10"
              : "border-gray-700 hover:border-indigo-500/50 hover:bg-indigo-500/5"
          )}
        >
          <div className="w-14 h-14 rounded-xl bg-indigo-600/20 flex items-center justify-center">
            <Upload size={24} className="text-indigo-400" />
          </div>
          <div className="text-center">
            <p className="text-white font-medium">Arrastra el archivo del SRI aquí</p>
            <p className="text-sm text-gray-500 mt-1">o haz clic para seleccionar</p>
            <p className="text-xs text-gray-600 mt-2">Archivo .txt descargado desde el portal del SRI</p>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept=".txt"
            onChange={e => { const f = e.target.files?.[0]; if (f) procesarArchivo(f); }}
            className="hidden"
          />
        </div>

        {error && (
          <div className="flex items-start gap-2 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2.5">
            <AlertTriangle size={14} className="text-red-400 shrink-0 mt-0.5" />
            <p className="text-sm text-red-400">{error}</p>
          </div>
        )}

        {/* Instrucciones */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 space-y-2">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">¿Cómo obtener el archivo?</p>
          <ol className="text-xs text-gray-500 space-y-1 list-decimal list-inside">
            <li>Ingresa al portal del SRI en línea</li>
            <li>Ve a <span className="text-gray-300">Servicios en línea → Comprobantes electrónicos</span></li>
            <li>Selecciona <span className="text-gray-300">Documentos recibidos</span></li>
            <li>Filtra por fecha y descarga el archivo .txt</li>
            <li>Súbelo aquí — Kipu importa todo automáticamente</li>
          </ol>
        </div>
      </div>
    );
  }

  // ── Preview tabla ─────────────────────────────────────────────────────────
  return (
    <div className="space-y-4">

      {/* Header resumen */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-white">
            {filas.length} comprobante{filas.length !== 1 ? "s" : ""} encontrado{filas.length !== 1 ? "s" : ""}
          </p>
          <p className="text-xs text-gray-500">Solo facturas con tu RUC como receptor</p>
        </div>
        <button
          onClick={() => { setFilas([]); setResumen(null); }}
          className="text-xs text-gray-500 hover:text-white transition-colors"
        >
          Cambiar archivo
        </button>
      </div>

      {/* Resumen post-importación */}
      {resumen && (
        <div className="flex gap-3">
          {resumen.ok > 0 && (
            <div className="flex-1 bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-3 py-2 text-center">
              <p className="text-lg font-bold text-emerald-400">{resumen.ok}</p>
              <p className="text-xs text-emerald-400">Importados</p>
            </div>
          )}
          {resumen.duplicado > 0 && (
            <div className="flex-1 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2 text-center">
              <p className="text-lg font-bold text-amber-400">{resumen.duplicado}</p>
              <p className="text-xs text-amber-400">Ya existían</p>
            </div>
          )}
          {resumen.error > 0 && (
            <div className="flex-1 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2 text-center">
              <p className="text-lg font-bold text-red-400">{resumen.error}</p>
              <p className="text-xs text-red-400">Con error</p>
            </div>
          )}
        </div>
      )}

      {/* Tabla */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        {/* Header tabla */}
        <div className="flex items-center gap-3 px-4 py-2.5 border-b border-gray-800 bg-gray-800/50">
          <button onClick={toggleTodas} className="shrink-0">
            <div className={clsx(
              "w-4 h-4 rounded border transition-colors flex items-center justify-center",
              filas.every(f => f.seleccionada)
                ? "bg-indigo-600 border-indigo-600"
                : "border-gray-600"
            )}>
              {filas.every(f => f.seleccionada) && <Check size={10} className="text-white" />}
            </div>
          </button>
          <span className="text-xs text-gray-500 font-medium flex-1">Proveedor</span>
          <span className="text-xs text-gray-500 font-medium text-right w-24">Total</span>
          <span className="w-16" />
        </div>

        {/* Filas */}
        <div className="divide-y divide-gray-800 max-h-80 overflow-y-auto">
          {filas.map((fila, idx) => (
            <div key={fila.clave_acceso} className="flex items-center gap-3 px-4 py-3">
              {/* Checkbox */}
              <button
                onClick={() => fila.estado === "pendiente" && toggleFila(idx)}
                disabled={fila.estado !== "pendiente"}
                className="shrink-0"
              >
                <div className={clsx(
                  "w-4 h-4 rounded border transition-colors flex items-center justify-center",
                  fila.estado === "ok"         ? "bg-emerald-600 border-emerald-600" :
                  fila.estado === "error"      ? "bg-red-600 border-red-600" :
                  fila.estado === "duplicado"  ? "bg-amber-600 border-amber-600" :
                  fila.estado === "importando" ? "border-indigo-400" :
                  fila.seleccionada            ? "bg-indigo-600 border-indigo-600" : "border-gray-600"
                )}>
                  {fila.estado === "ok"        && <Check size={10} className="text-white" />}
                  {fila.estado === "error"     && <X size={10} className="text-white" />}
                  {fila.estado === "duplicado" && <span className="text-white text-[8px] font-bold">!</span>}
                  {fila.estado === "importando" && <Loader2 size={8} className="text-indigo-400 animate-spin" />}
                  {fila.estado === "pendiente" && fila.seleccionada && <Check size={10} className="text-white" />}
                </div>
              </button>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="text-sm text-white truncate">{fila.razon_social}</p>
                <p className="text-xs text-gray-500">{fila.serie} · {fila.fecha_emision}</p>
                {fila.mensaje && (
                  <p className={clsx("text-xs mt-0.5", 
                    fila.estado === "ok"        ? "text-emerald-400" :
                    fila.estado === "duplicado" ? "text-amber-400" : "text-red-400"
                  )}>
                    {fila.mensaje}
                  </p>
                )}
              </div>

              {/* Total */}
              <div className="text-right w-24 shrink-0">
                <p className="text-sm font-semibold text-white">${fila.importe_total.toFixed(2)}</p>
                {fila.iva > 0 && (
                  <p className="text-xs text-gray-500">IVA ${fila.iva.toFixed(2)}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Footer — importar */}
      {!resumen && (
        <div className="flex items-center justify-between gap-3">
          <div className="text-xs text-gray-500">
            {seleccionadas} seleccionada{seleccionadas !== 1 ? "s" : ""}
            {seleccionadas > 0 && (
              <span className="text-white ml-1">· ${totalImporte.toFixed(2)}</span>
            )}
          </div>
          <button
            onClick={importar}
            disabled={seleccionadas === 0 || importando}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium transition-colors"
          >
            {importando
              ? <><Loader2 size={14} className="animate-spin" /> Importando...</>
              : <><FileText size={14} /> Importar {seleccionadas > 0 ? seleccionadas : ""}</>
            }
          </button>
        </div>
      )}

      {resumen && resumen.ok > 0 && (
        <button
          onClick={onDone}
          className="w-full py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium transition-colors"
        >
          Ver historial
        </button>
      )}
    </div>
  );
}