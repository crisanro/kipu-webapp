// app/(dashboard)/estructura/page.tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import api from "@/lib/api";
import { Building2, Loader2 } from "lucide-react";
import TabEstructura from "@/components/configuracion/TabEstructura";

export default function EstructuraPage() {
  const [estructura, setEstructura] = useState<any[]>([]);
  const [loading,    setLoading]    = useState(true);

  const cargar = useCallback(async () => {
    try {
      // Limpiar cache de sessionStorage para que se refresque
      sessionStorage.removeItem("kipu:estructura");
      const res = await api.get("/api/v1/app/estructura");
      const data = res.data.data ?? [];
      setEstructura(data);
      // Actualizar cache
      sessionStorage.setItem("kipu:estructura", JSON.stringify(data));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto space-y-5">

      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-indigo-600/20 flex items-center justify-center">
          <Building2 size={18} className="text-indigo-400" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-white">Estructura</h1>
          <p className="text-sm text-gray-500">
            Establecimientos y puntos de emisión
          </p>
        </div>
      </div>

      {/* Contenido */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={24} className="animate-spin text-indigo-400" />
        </div>
      ) : (
        <TabEstructura
          estructura={estructura}
          onActualizar={cargar}
        />
      )}

    </div>
  );
}