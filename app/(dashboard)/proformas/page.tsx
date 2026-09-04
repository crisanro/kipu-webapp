"use client";
import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import {
  ClipboardList, Plus, Loader2, Search,
  CheckCircle2, AlertTriangle, Clock,
} from "lucide-react";
import { clsx } from "clsx";

interface Proforma {
  id:            string;
  numero:        string;
  fecha_emision: string;
  fecha_validez: string | null;
  subtotal:      number;
  total_iva:     number;
  total:         number;
  estado:        "VIGENTE" | "FACTURADA";
  vencida:       boolean;
  notas:         string | null;
  cliente: {
    id:             string;
    razon_social:   string;
    identificacion: string;
  } | null;
}

const fmt = (n: number) => `$${n.toFixed(2)}`;

export default function ProformasPage() {
  const router = useRouter();
  const [proformas, setProformas] = useState<Proforma[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [query,     setQuery]     = useState("");

  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get("/api/v1/app/proformas");
      setProformas(res.data.data ?? []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  const filtradas = proformas.filter((p) => {
    if (!query) return true;
    const q = query.toLowerCase();
    return (
      p.numero?.toLowerCase().includes(q) ||
      p.cliente?.razon_social?.toLowerCase().includes(q) ||
      p.cliente?.identificacion?.includes(q)
    );
  });

  return (
    <div className="p-4 md:p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-white">Proformas</h1>
          <p className="text-sm text-gray-500">{proformas.length} registradas</p>
        </div>
        <button
          onClick={() => router.push("/proformas/nueva")}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium transition-colors"
        >
          <Plus size={15} />
          Nueva proforma
        </button>
      </div>

      {/* Buscador */}
      <div className="relative mb-4">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar por número o cliente..."
          className="w-full pl-9 pr-4 py-2.5 rounded-lg bg-gray-900 border border-gray-800 text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500 text-sm"
        />
      </div>

      {/* Lista */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={24} className="animate-spin text-indigo-400" />
        </div>
      ) : filtradas.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <ClipboardList size={40} className="text-gray-700 mb-3" />
          <p className="text-gray-500 text-sm">
            {query ? "No hay proformas que coincidan." : "Aún no tienes proformas registradas."}
          </p>
          {!query && (
            <button
              onClick={() => router.push("/proformas/nueva")}
              className="mt-4 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium transition-colors"
            >
              Crear primera proforma
            </button>
          )}
        </div>
      ) : (
        <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
          <div className="divide-y divide-gray-800">
            {filtradas.map((p) => {
              const vencida   = p.vencida && p.estado === "VIGENTE";
              const facturada = p.estado === "FACTURADA";
              return (
                <Link
                  key={p.id}
                  href={`/proformas/${p.id}`}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-gray-800/50 transition-colors"
                >
                  <div className={clsx(
                    "w-9 h-9 rounded-full flex items-center justify-center shrink-0",
                    facturada ? "bg-emerald-400/10" : vencida ? "bg-red-400/10" : "bg-indigo-400/10"
                  )}>
                    {facturada
                      ? <CheckCircle2 size={16} className="text-emerald-400" />
                      : vencida
                        ? <AlertTriangle size={16} className="text-red-400" />
                        : <Clock size={16} className="text-indigo-400" />
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-mono font-medium text-indigo-400">{p.numero}</p>
                    <p className="text-xs text-gray-500 truncate">
                      {p.cliente?.razon_social ?? "Sin cliente"}
                      {p.fecha_validez && (
                        <span className={clsx("ml-2", vencida ? "text-red-400" : "text-gray-600")}>
                          · vence {p.fecha_validez}
                        </span>
                      )}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-semibold text-white">{fmt(p.total)}</p>
                    <p className={clsx(
                      "text-xs",
                      facturada ? "text-emerald-400" : vencida ? "text-red-400" : "text-gray-500"
                    )}>
                      {facturada ? "Facturada" : vencida ? "Vencida" : "Vigente"}
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}