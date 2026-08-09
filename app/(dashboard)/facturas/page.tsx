"use client";
import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import api from "@/lib/api";
import {
  Search, Plus, FileText,
  Loader2, CheckCircle2, Clock, XCircle, AlertTriangle, RefreshCw
} from "lucide-react";
import { clsx } from "clsx";

interface Factura {
  id:                       string;
  clave_acceso:             string;
  numero_factura:           string;
  fecha_emision:            string;
  estado:                   string;
  cod_doc:                  string;
  razon_social_comprador:   string;
  identificacion_comprador: string;
  importe_total:            number;
  email_comprador:          string;
  resumen_impuestos?:       any[];
  impuestos_totales?:       any;
}

const ESTADO_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  AUTORIZADO: { label: "Autorizada",  color: "text-emerald-400 bg-emerald-400/10", icon: CheckCircle2 },
  RECIBIDA:   { label: "En proceso",  color: "text-indigo-400 bg-indigo-400/10",   icon: Clock },
  FIRMADO:    { label: "En cola",     color: "text-blue-400 bg-blue-400/10",        icon: Clock },
  DEVUELTA:   { label: "Devuelta",    color: "text-amber-400 bg-amber-400/10",      icon: AlertTriangle },
  RECHAZADO:  { label: "Rechazada",   color: "text-red-400 bg-red-400/10",          icon: XCircle },
  PENDIENTE:  { label: "Pendiente",   color: "text-gray-400 bg-gray-400/10",        icon: Clock },
};

const TIPO_COMPROBANTE: Record<string, { label: string; color: string }> = {
  "01": { label: "Factura",         color: "text-gray-400 bg-gray-400/10" },
  "04": { label: "Nota de Crédito", color: "text-purple-400 bg-purple-400/10" },
  "05": { label: "Nota de Débito",  color: "text-orange-400 bg-orange-400/10" },
  "07": { label: "Retención",       color: "text-yellow-400 bg-yellow-400/10" },
  "03": { label: "Liquidación",     color: "text-cyan-400 bg-cyan-400/10" },
};

const fmt = (n: any) => parseFloat(n ?? 0).toFixed(2);

export default function HistorialPage() {
  const [facturas,     setFacturas]     = useState<Factura[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [query,        setQuery]        = useState("");
  const [filtroEstado, setFiltroEstado] = useState("TODOS");

  const hoy = new Date().toISOString().split("T")[0];
  const [fechaInicio, setFechaInicio] = useState(hoy);
  const [fechaFin,    setFechaFin]    = useState(hoy);

  const diasRango = fechaInicio && fechaFin
    ? Math.ceil((new Date(fechaFin).getTime() - new Date(fechaInicio).getTime()) / (1000 * 60 * 60 * 24))
    : 0;

  const cargar = useCallback(async () => {
    if (diasRango > 45) return;
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (fechaInicio) params.append("fecha_inicio", fechaInicio);
      if (fechaFin)    params.append("fecha_fin", fechaFin);
      const res = await api.get(`/api/v1/app/invoices/history?${params.toString()}`);
      setFacturas(res.data.data ?? res.data ?? []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [fechaInicio, fechaFin, diasRango]);

  useEffect(() => { cargar(); }, [cargar]);

  const filtradas = facturas.filter((f) => {
    const matchEstado = filtroEstado === "TODOS" || f.estado === filtroEstado;
    const matchQuery  = !query ||
      f.razon_social_comprador?.toLowerCase().includes(query.toLowerCase()) ||
      f.identificacion_comprador?.includes(query) ||
      f.numero_factura?.includes(query);
    return matchEstado && matchQuery;
  });

  const autorizadas = filtradas.filter(f => f.estado === "AUTORIZADO");

  const resumen = autorizadas.reduce((acc: any, f: any) => {
    acc.total += parseFloat(String(f.importe_total ?? 0));
    const impuestos = Array.isArray(f.resumen_impuestos)
      ? f.resumen_impuestos
      : f.resumen_impuestos ? [f.resumen_impuestos] : [];
    for (const imp of impuestos) {
      const tarifa = String(imp.tarifa ?? "0");
      if (!acc.subtotales[tarifa]) acc.subtotales[tarifa] = { base: 0, iva: 0 };
      acc.subtotales[tarifa].base += parseFloat(String(imp.baseImponible ?? 0));
      acc.subtotales[tarifa].iva  += parseFloat(String(imp.valor ?? 0));
    }
    return acc;
  }, { total: 0, subtotales: {} as Record<string, { base: number; iva: number }> });

  return (
    <div className="p-4 md:p-6 space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Comprobantes Emitidos</h1>
          <p className="text-sm text-gray-500">{facturas.length} comprobantes encontrados</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={cargar}
            disabled={diasRango > 45}
            className="p-2 rounded-lg border border-gray-700 text-gray-400 hover:text-white hover:border-gray-600 transition-colors disabled:opacity-40"
          >
            <RefreshCw size={16} />
          </button>
          <Link
            href="/facturas/nueva"
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium transition-colors"
          >
            <Plus size={15} />
            Nueva
          </Link>
        </div>
      </div>

      {/* Filtros */}
      <div className="space-y-3">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar por cliente, RUC o número..."
              className="w-full pl-9 pr-4 py-2.5 rounded-lg bg-gray-900 border border-gray-800 text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500 text-sm"
            />
          </div>
          <div className="flex gap-2 items-center shrink-0">
            <input
              type="date"
              value={fechaInicio}
              onChange={(e) => setFechaInicio(e.target.value)}
              className="px-3 py-2 rounded-lg bg-gray-900 border border-gray-800 text-white text-sm focus:outline-none focus:border-indigo-500"
            />
            <span className="text-gray-600 text-xs">—</span>
            <input
              type="date"
              value={fechaFin}
              onChange={(e) => setFechaFin(e.target.value)}
              className="px-3 py-2 rounded-lg bg-gray-900 border border-gray-800 text-white text-sm focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>
        {diasRango > 45 && (
          <p className="text-xs text-amber-400 font-medium">El rango máximo es de 45 días.</p>
        )}
        <div className="flex gap-2 flex-wrap">
          {["TODOS", "AUTORIZADO", "RECIBIDA", "DEVUELTA", "RECHAZADO"].map((estado) => (
            <button
              key={estado}
              onClick={() => setFiltroEstado(estado)}
              className={clsx(
                "px-3 py-1.5 rounded-lg text-xs font-medium transition-colors",
                filtroEstado === estado
                  ? "bg-indigo-600 text-white"
                  : "bg-gray-900 border border-gray-800 text-gray-400 hover:text-white"
              )}
            >
              {estado === "TODOS" ? "Todos" : ESTADO_CONFIG[estado]?.label ?? estado}
            </button>
          ))}
        </div>
      </div>

      {/* Resumen */}
      {filtradas.length > 0 && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-3">
            <div>
              <p className="text-xs text-gray-500 mb-0.5">Total autorizado</p>
              <p className="text-lg font-bold text-white">${fmt(resumen.total)}</p>
            </div>
            {Object.entries(resumen.subtotales)
              .sort(([a], [b]) => parseInt(b) - parseInt(a))
              .map(([tarifa, vals]: [string, any]) => (
                <div key={tarifa}>
                  <p className="text-xs text-gray-500 mb-0.5">Subtotal {tarifa}%</p>
                  <p className="text-sm font-semibold text-gray-300">${fmt(vals.base)}</p>
                  {vals.iva > 0 && (
                    <p className="text-xs text-gray-600">IVA: ${fmt(vals.iva)}</p>
                  )}
                </div>
              ))}
          </div>
          <div className="flex gap-4 pt-3 border-t border-gray-800 text-xs">
            <span className="text-emerald-400 font-medium">{autorizadas.length} autorizadas</span>
            <span className="text-indigo-400">{filtradas.filter(f => ["RECIBIDA","FIRMADO"].includes(f.estado)).length} en proceso</span>
            <span className="text-red-400">{filtradas.filter(f => ["DEVUELTA","RECHAZADO"].includes(f.estado)).length} con error</span>
          </div>
        </div>
      )}

      {/* Lista */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={24} className="animate-spin text-indigo-400" />
        </div>
      ) : filtradas.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <FileText size={40} className="text-gray-700 mb-3" />
          <p className="text-gray-500 text-sm">
            {query || filtroEstado !== "TODOS"
              ? "No hay comprobantes que coincidan."
              : "Sin comprobantes en este rango de fechas."}
          </p>
          {!query && filtroEstado === "TODOS" && (
            <Link
              href="/facturas/nueva"
              className="mt-4 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium transition-colors"
            >
              Emitir primera factura
            </Link>
          )}
        </div>
      ) : (
        <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">

          {/* Vista Escritorio */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800 text-xs text-gray-500">
                  <th className="text-left px-4 py-3 font-medium">Número</th>
                  <th className="text-left px-4 py-3 font-medium">Tipo</th>
                  <th className="text-left px-4 py-3 font-medium">Cliente</th>
                  <th className="text-left px-4 py-3 font-medium">Fecha</th>
                  <th className="text-left px-4 py-3 font-medium">Estado</th>
                  <th className="text-right px-4 py-3 font-medium">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {filtradas.map((f) => {
                  const estado = ESTADO_CONFIG[f.estado] ?? ESTADO_CONFIG.PENDIENTE;
                  const tipo   = TIPO_COMPROBANTE[f.cod_doc] ?? TIPO_COMPROBANTE["01"];
                  const Icon   = estado.icon;
                  return (
                    <tr key={f.id} className="hover:bg-gray-800/50 transition-colors">
                      <td className="px-4 py-3">
                        <Link
                          href={`/facturas/${f.id}`}
                          className="font-mono text-xs text-indigo-400 hover:text-indigo-300 underline-offset-2 hover:underline"
                        >
                          {f.numero_factura ?? "—"}
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        <span className={clsx(
                          "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium",
                          tipo.color
                        )}>
                          {tipo.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-white font-medium truncate max-w-[160px]">
                          {f.razon_social_comprador}
                        </p>
                        <p className="text-xs text-gray-500">{f.identificacion_comprador}</p>
                      </td>
                      <td className="px-4 py-3 text-gray-400 text-xs">
                        {f.fecha_emision}
                      </td>
                      <td className="px-4 py-3">
                        <span className={clsx(
                          "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium",
                          estado.color
                        )}>
                          <Icon size={11} />
                          {estado.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-white">
                        ${fmt(f.importe_total)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Vista Móvil */}
          <div className="md:hidden divide-y divide-gray-800">
            {filtradas.map((f) => {
              const estado = ESTADO_CONFIG[f.estado] ?? ESTADO_CONFIG.PENDIENTE;
              const tipo   = TIPO_COMPROBANTE[f.cod_doc] ?? TIPO_COMPROBANTE["01"];
              const Icon   = estado.icon;
              return (
                <div key={f.id} className="px-4 py-3 space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <Link
                      href={`/facturas/${f.id}`}
                      className="font-mono text-xs text-indigo-400 hover:text-indigo-300"
                    >
                      {f.numero_factura ?? "—"}
                    </Link>
                    <div className="flex items-center gap-1.5">
                      {f.cod_doc !== "01" && (
                        <span className={clsx(
                          "px-1.5 py-0.5 rounded text-[10px] font-medium",
                          tipo.color
                        )}>
                          {tipo.label}
                        </span>
                      )}
                      <span className={clsx(
                        "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium",
                        estado.color
                      )}>
                        <Icon size={10} />
                        {estado.label}
                      </span>
                    </div>
                  </div>
                  <p className="text-sm font-medium text-white">{f.razon_social_comprador}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">{f.fecha_emision}</span>
                    <span className="text-sm font-bold text-white">${fmt(f.importe_total)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}