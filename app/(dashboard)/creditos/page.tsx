// app/(dashboard)/creditos/page.tsx
"use client";

import { useState, useEffect } from "react";
import api from "@/lib/api";
import { useAuthStore } from "@/store/auth.store";
import { CreditCard, Loader2, RefreshCw } from "lucide-react";
import TabCreditos from "../../../components/configuracion/TabCreditos";

interface Plan {
  id: number; nombre: string; cantidad: number; precio: number; popular: boolean;
}

export default function CreditosPage() {
  const empresa = useAuthStore((s) => s.empresa);

  const [creditos,  setCreditos]  = useState<any>(null);
  const [planes,    setPlanes]    = useState<Plan[]>([]);
  const [ambiente,  setAmbiente]  = useState<number>(1);
  const [loading,   setLoading]   = useState(true);

  const cargar = async () => {
    setLoading(true);
    try {
      const [resConfig, resPlanes] = await Promise.all([
        api.get("/api/v1/app/emisor/config"),
        api.get("/api/v1/app/catalogo/planes"),
      ]);
      setCreditos(resConfig.data.data?.creditos ?? null);
      setAmbiente(resConfig.data.data?.legal?.ambiente ?? 1);
      setPlanes(resPlanes.data.data?.emision ?? []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { cargar(); }, []);

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-indigo-600/20 flex items-center justify-center">
            <CreditCard size={18} className="text-indigo-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Créditos</h1>
            <p className="text-sm text-gray-500">Recarga y gestiona tus créditos</p>
          </div>
        </div>
        <button
          onClick={cargar}
          disabled={loading}
          className="p-2 rounded-lg border border-gray-700 text-gray-400 hover:text-white transition-colors disabled:opacity-40"
        >
          {loading
            ? <Loader2 size={16} className="animate-spin" />
            : <RefreshCw size={16} />
          }
        </button>
      </div>

      {/* Contenido */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={24} className="animate-spin text-indigo-400" />
        </div>
      ) : (
        <TabCreditos
          creditos={creditos}
          planes={planes}
          ambiente={ambiente}
        />
      )}

    </div>
  );
}