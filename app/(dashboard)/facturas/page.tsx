// app/(dashboard)/facturas/page.tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import api from "@/lib/api";
import {
  Search, Plus, FileText, Download, Eye,
  Loader2, CheckCircle2, Clock, XCircle, AlertTriangle, RefreshCw
} from "lucide-react";
import { clsx } from "clsx";

interface Factura {
  id:                      string;
  clave_acceso:            string;
  numero_factura:          string;
  fecha_emision:           string;
  estado:                  string;
  razon_social_comprador:  string;
  identificacion_comprador: string;
  importe_total:           number;
  email_comprador:         string;
}

const ESTADO_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  AUTORIZADO: { label: "Autorizada",  color: "text-emerald-400 bg-emerald-400/10", icon: CheckCircle2 },
  RECIBIDA:   { label: "En proceso",  color: "text-indigo-400 bg-indigo-400/10",   icon: Clock },
  FIRMADO:    { label: "En cola",     color: "text-blue-400 bg-blue-400/10",        icon: Clock },
  DEVUELTA:   { label: "Devuelta",    color: "text-amber-400 bg-amber-400/10",      icon: AlertTriangle },
  RECHAZADO:  { label: "Rechazada",  color: "text-red-400 bg-red-400/10",          icon: XCircle },
  PENDIENTE:  { label: "Pendiente",  color: "text-gray-400 bg-gray-400/10",        icon: Clock },
};

const fmt = (n: number) => n?.toFixed(2) ?? "0.00";

export default function HistorialPage() {
  const [facturas,  setFacturas]  = useState<Factura[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [query,     setQuery]     = useState("");
  const [filtroEstado, setFiltroEstado] = useState("TODOS");

  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get("/api/v1/app/invoices/history");
      setFacturas(res.data.data ?? res.data ?? []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  // Filtro local
  const filtradas = facturas.filter((f) => {
    const matchEstado = filtroEstado === "TODOS" || f.estado === filtroEstado;
    const matchQuery  = !query ||
      f.razon_social_comprador?.toLowerCase().includes(query.toLowerCase()) ||
      f.identificacion_comprador?.includes(query) ||
      f.numero_factura?.includes(query);
    return matchEstado && matchQuery;
  });

  const total = filtradas.reduce((acc, f) => acc + (f.importe_total ?? 0), 0);

  return (
    <div className="p-4 md:p-6">

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-white">Historial de Facturas</h1>
          <p className="text-sm text-gray-500">{facturas.length} comprobantes emitidos</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={cargar}
            className="p-2 rounded-lg border border-gray-700 text-gray-400 hover:text-white hover:border-gray-600 transition-colors"
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
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por cliente, RUC o número..."
            className="w-full pl-9 pr-4 py-2.5 rounded-lg bg-gray-900 border border-gray-800 text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500 text-sm"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {["TODOS", "AUTORIZADO", "RECIBIDA", "DEVUELTA", "RECHAZADO"].map((estado) => (
            <button
              key={estado}
              onClick={() => setFiltroEstado(estado)}
              className={clsx(
                "px-3 py-2 rounded-lg text-xs font-medium transition-colors",
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

      {/* Stats rápidas */}
      {filtradas.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          {[
            { label: "Total facturado", value: `$${fmt(total)}`, color: "text-white" },
            { label: "Autorizadas", value: filtradas.filter(f => f.estado === "AUTORIZADO").length, color: "text-emerald-400" },
            { label: "En proceso", value: filtradas.filter(f => ["RECIBIDA", "FIRMADO"].includes(f.estado)).length, color: "text-indigo-400" },
            { label: "Con error", value: filtradas.filter(f => ["DEVUELTA", "RECHAZADO"].includes(f.estado)).length, color: "text-red-400" },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-gray-900 border border-gray-800 rounded-lg px-4 py-3">
              <p className="text-xs text-gray-500 mb-0.5">{label}</p>
              <p className={clsx("text-lg font-bold", color)}>{value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Tabla */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={24} className="animate-spin text-indigo-400" />
        </div>
      ) : filtradas.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <FileText size={40} className="text-gray-700 mb-3" />
          <p className="text-gray-500 text-sm">
            {query || filtroEstado !== "TODOS"
              ? "No hay facturas que coincidan con el filtro."
              : "Aún no tienes facturas emitidas."}
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
          {/* Desktop table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800 text-xs text-gray-500">
                  <th className="text-left px-4 py-3 font-medium">Número</th>
                  <th className="text-left px-4 py-3 font-medium">Cliente</th>
                  <th className="text-left px-4 py-3 font-medium">Fecha</th>
                  <th className="text-left px-4 py-3 font-medium">Estado</th>
                  <th className="text-right px-4 py-3 font-medium">Total</th>
                  <th className="text-center px-4 py-3 font-medium">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {filtradas.map((f) => {
                  const estado = ESTADO_CONFIG[f.estado] ?? ESTADO_CONFIG.PENDIENTE;
                  const Icon   = estado.icon;
                  return (
                    <tr key={f.id} className="hover:bg-gray-800/50 transition-colors">
                      <td className="px-4 py-3">
                        <span className="font-mono text-xs text-gray-300">
                          {f.numero_factura ?? "—"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-white font-medium truncate max-w-[180px]">
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
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-2">
                          {f.estado === "AUTORIZADO" && (
                            <>
                              <a
                                href={`${process.env.NEXT_PUBLIC_API_URL}/api/v1/public/pdf/${f.clave_acceso}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-1.5 rounded text-gray-500 hover:text-white hover:bg-gray-700 transition-colors"
                                title="Ver PDF"
                              >
                                <Eye size={14} />
                              </a>
                              <a
                                href={`${process.env.NEXT_PUBLIC_API_URL}/api/v1/public/xml/${f.clave_acceso}`}
                                download
                                className="p-1.5 rounded text-gray-500 hover:text-white hover:bg-gray-700 transition-colors"
                                title="Descargar XML"
                              >
                                <Download size={14} />
                              </a>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden divide-y divide-gray-800">
            {filtradas.map((f) => {
              const estado = ESTADO_CONFIG[f.estado] ?? ESTADO_CONFIG.PENDIENTE;
              const Icon   = estado.icon;
              return (
                <div key={f.id} className="px-4 py-3 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs text-gray-400">{f.numero_factura}</span>
                    <span className={clsx(
                      "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium",
                      estado.color
                    )}>
                      <Icon size={10} />
                      {estado.label}
                    </span>
                  </div>
                  <p className="text-sm font-medium text-white">{f.razon_social_comprador}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">{f.fecha_emision}</span>
                    <span className="text-sm font-bold text-white">${fmt(f.importe_total)}</span>
                  </div>
                  {f.estado === "AUTORIZADO" && (
                    <div className="flex gap-3 pt-1">
                      <a
                        href={`${process.env.NEXT_PUBLIC_API_URL}/api/v1/public/pdf/${f.clave_acceso}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300"
                      >
                        <Eye size={12} /> Ver PDF
                      </a>
                      <a
                        href={`${process.env.NEXT_PUBLIC_API_URL}/api/v1/public/xml/${f.clave_acceso}`}
                        download
                        className="flex items-center gap-1 text-xs text-gray-400 hover:text-white"
                      >
                        <Download size={12} /> XML
                      </a>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}