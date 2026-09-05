// app/(dashboard)/configuracion/page.tsx
"use client";
import { useState, useEffect } from "react";
import api from "@/lib/api";
import { Loader2 } from "lucide-react";
import { HealthData } from "@/components/Checklist";
import TabEmpresa from "@/components/configuracion/TabEmpresa";
import TabFirma   from "@/components/configuracion/TabFirma";
import { useAuthStore } from "@/store/auth.store";
import { usePermiso } from "@/hooks/usePermiso";
import SinAcceso from "@/components/SinAcceso";

export default function ConfiguracionPage() {
  const puedeVer = usePermiso("configuracion");
  if (!puedeVer) return <SinAcceso />;
  const [loading, setLoading] = useState(true);
  const [config,  setConfig]  = useState<any>(null);
  const [health,  setHealth]  = useState<HealthData | null>(null);

  const { empresa, updateEmpresa } = useAuthStore();

  const cargar = async () => {
    setLoading(true);
    try {
      const hoyIso = new Date().toLocaleDateString("en-CA", { timeZone: "America/Guayaquil" });
      const [resConfig, resDash] = await Promise.all([
        api.get("/api/v1/app/emisor/config"),
        api.get(`/api/v1/app/dashboard?fecha_inicio=${hoyIso}&fecha_fin=${hoyIso}`),
      ]);
      setConfig(resConfig.data.data);
      setHealth(resDash.data.data?.health ?? null);

      // Actualizar store con firma_ok real desde el backend
      const firma = resConfig.data.data?.firma;
      const firmaOk = firma?.configurada && firma?.estado !== "EXPIRADA";
      if (empresa) {
        updateEmpresa({ ...empresa, firma_ok: firmaOk });
      }
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