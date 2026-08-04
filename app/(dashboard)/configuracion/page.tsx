// app/(dashboard)/configuracion/page.tsx
"use client";

import { useState, useEffect } from "react";
import api from "@/lib/api";
import { useAuthStore } from "@/store/auth.store";
import { Settings, Shield, Store, Zap, Users, Loader2, Key } from "lucide-react";
import { clsx } from "clsx";
import { HealthData } from "@/components/Checklist";
import TabEmpresa    from "@/components/configuracion/TabEmpresa";
import TabFirma      from "@/components/configuracion/TabFirma";
import TabEstructura from "@/components/configuracion/TabEstructura";
import TabCreditos   from "@/components/configuracion/TabCreditos";
import TabUsuarios   from "@/components/configuracion/TabUsuarios";
import TabApiKeys from "@/components/configuracion/TabApiKeys";


interface Plan {
  id: number; nombre: string; cantidad: number; precio: number; popular: boolean;
}

const TABS = [
  { key: "empresa",    label: "Empresa",    icon: Settings },
  { key: "firma",      label: "Firma",      icon: Shield },
  { key: "estructura", label: "Estructura", icon: Store },
  { key: "apikeys", label: "API Keys", icon: Key },
  { key: "creditos",   label: "Créditos",   icon: Zap },
  { key: "usuarios",   label: "Usuarios",   icon: Users },
];

export default function ConfiguracionPage() {
  const empresa = useAuthStore((s) => s.empresa);
  const [tab,        setTab]        = useState("empresa");
  const [loading,    setLoading]    = useState(true);
  const [config,     setConfig]     = useState<any>(null);
  const [planes,     setPlanes]     = useState<Plan[]>([]);
  const [health,     setHealth]     = useState<HealthData | null>(null);
  const [estructura, setEstructura] = useState<any[]>([]);

  const cargar = async () => {
    setLoading(true);
    try {
      const hoyIso = new Date().toISOString().split("T")[0];
      const [resConfig, resPlanes, resEstructura, resDash] = await Promise.all([
        api.get("/api/v1/app/emisor/config"),
        api.get("/api/v1/app/catalogo/planes"),
        api.get("/api/v1/app/estructura"),
        api.get(`/api/v1/app/dashboard?fecha_inicio=${hoyIso}&fecha_fin=${hoyIso}`),
      ]);
      setConfig(resConfig.data.data);
      setPlanes(resPlanes.data.data?.emision ?? []);
      setEstructura(resEstructura.data.data ?? []);
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
    <div className="p-4 md:p-6 max-w-3xl mx-auto">
      <h1 className="text-xl font-bold text-white mb-6">Configuración</h1>

      <div className="flex gap-1 bg-gray-900 border border-gray-800 rounded-xl p-1 mb-6">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={clsx(
              "flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium transition-colors",
              tab === key ? "bg-indigo-600 text-white" : "text-gray-500 hover:text-white"
            )}
          >
            <Icon size={13} />
            <span className="hidden sm:inline">{label}</span>
          </button>
        ))}
      </div>

      {tab === "empresa"    && <TabEmpresa legal={config?.legal} health={health} onActualizar={cargar} />}
      {tab === "firma"      && <TabFirma firma={config?.firma} onActualizar={cargar} />}
      {tab === "estructura" && <TabEstructura estructura={estructura} onActualizar={async () => { const r = await api.get("/api/v1/app/estructura"); setEstructura(r.data.data ?? []); }} />}
      {tab === "apikeys" && <TabApiKeys />}
      {tab === "creditos" && (
        <TabCreditos
          creditos={config?.creditos}
          planes={planes}
          ambiente={config?.legal?.ambiente ?? 1}
        />
      )}
      {tab === "usuarios"   && empresa && <TabUsuarios empresaId={empresa.id} />}
    </div>
  );
}