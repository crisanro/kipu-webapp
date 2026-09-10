"use client";

import { useState, useEffect, useCallback } from "react";
import api from "@/lib/api";
import { Building2 } from "lucide-react";
import TabEstructura from "@/components/configuracion/TabEstructura";
import { usePermiso } from "@/hooks/usePermiso";
import SinAcceso from "@/components/SinAcceso";

export default function EstructuraPage() {
  const puedeVer = usePermiso("configuracion");
  if (!puedeVer) return <SinAcceso />;
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
        <div
          className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
          style={{ background: "color-mix(in srgb, var(--kipu-accent) 20%, transparent)" }}
        >
          <Building2 size={18} style={{ color: "var(--kipu-accent)" }} />
        </div>
        <div>
          <h1 className="text-xl font-bold" style={{ color: "var(--kipu-text)" }}>Estructura</h1>
          <p className="text-sm" style={{ color: "var(--kipu-subtle)" }}>
            Establecimientos y puntos de emisión
          </p>
        </div>
      </div>

      {/* Contenido */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div
            className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin"
            style={{ borderColor: "var(--kipu-accent)", borderTopColor: "transparent" }}
          />
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