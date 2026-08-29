// app/(dashboard)/configuracion/page.tsx
"use client";
import { useState, useEffect } from "react";
import api from "@/lib/api";
import { Loader2 } from "lucide-react";
import { HealthData } from "@/components/Checklist";
import TabEmpresa from "@/components/configuracion/TabEmpresa";
import TabFirma   from "@/components/configuracion/TabFirma";

export default function ConfiguracionPage() {
  const [loading, setLoading] = useState(true);
  const [config,  setConfig]  = useState<any>(null);
  const [health,  setHealth]  = useState<HealthData | null>(null);

  const cargar = async () => {
    setLoading(true);
    try {
      const hoyIso = new Date().toISOString().split("T")[0];
      const [resConfig, resDash] = await Promise.all([
        api.get("/api/v1/app/emisor/config"),
        api.get(`/api/v1/app/dashboard?fecha_inicio=${hoyIso}&fecha_fin=${hoyIso}`),
      ]);
      setConfig(resConfig.data.data);
      setHealth(resDash.data.data?.health ?? null);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { cargar(); }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 size={24} className="animate-spin text-indigo-400" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto space-y-6">
      <h1 className="text-xl font-bold text-white">Configuración</h1>
      <TabEmpresa
        legal={config?.legal}
        health={health}
        onActualizar={cargar}
      />
      <TabFirma
        firma={config?.firma}
        onActualizar={cargar}
      />
    </div>
  );
}