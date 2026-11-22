"use client";
import { useState, useEffect } from "react";
import { CircleUser, Trash2 } from "lucide-react";
import api from "@/lib/api";
import { auth } from "@/lib/firebase";
import { HealthData } from "@/components/Checklist";
import TabEmpresa from "@/components/configuracion/TabEmpresa";
import TabFirma   from "@/components/configuracion/TabFirma";
import TabCobrosEnLinea from "@/components/configuracion/TabCobrosEnLinea";
import EliminarCuenta from "@/components/cuenta/EliminarCuenta";
import { useAuthStore } from "@/store/auth.store";
import { usePermiso } from "@/hooks/usePermiso";

const caja = { background: "var(--kipu-surface)", border: "1px solid var(--kipu-border)" };

// Tu cuenta (arriba) y la zona de riesgo (abajo) son de la persona, no de la
// empresa: se ven siempre, sin permisos (Apple y Google exigen que cualquier
// usuario pueda eliminar su cuenta). Lo de la empresa pide el permiso "configuracion".
export default function ConfiguracionPage() {
  const puedeVer = usePermiso("configuracion");
  const email = auth.currentUser?.email ?? "";

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto space-y-6">
      <h1 className="text-xl font-bold" style={{ color: "var(--kipu-text)" }}>
        Configuración
      </h1>

      <div className="rounded-xl p-4 flex items-center gap-3" style={caja}>
        <CircleUser size={20} style={{ color: "var(--kipu-subtle)" }} />
        <div className="min-w-0">
          <p className="text-xs" style={{ color: "var(--kipu-subtle)" }}>Tu cuenta</p>
          <p className="text-sm font-medium truncate" style={{ color: "var(--kipu-text)" }}>{email}</p>
        </div>
      </div>

      {puedeVer ? (
        <ConfiguracionEmpresa />
      ) : (
        <p className="text-sm" style={{ color: "var(--kipu-muted)" }}>
          Los datos de la empresa, la firma electrónica y los cobros los configura el administrador.
        </p>
      )}

      <ZonaDeRiesgo />
    </div>
  );
}

// Separado del chequeo de permiso: los hooks se llaman siempre en el mismo orden
// aunque el permiso cambie con la página abierta (antes React lanzaba un error).
function ConfiguracionEmpresa() {

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

  // Scroll a cualquier sección por hash (#firma, #produccion, etc.)
  useEffect(() => {
    if (!loading && window.location.hash) {
      const id = window.location.hash.slice(1);
      setTimeout(() => {
        document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 100);
    }
  }, [loading]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div
          className="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin"
          style={{ borderColor: "var(--kipu-accent)", borderTopColor: "transparent" }}
        />
      </div>
    );
  }

  return (
    <>
      <TabEmpresa
        legal={config?.legal}
        health={health}
        onActualizar={cargar}
      />
      <div id="firma">
        <TabFirma
          firma={config?.firma}
          onActualizar={cargar}
        />
      </div>
      <div id="cobros">
        <TabCobrosEnLinea />
      </div>
    </>
  );
}

function ZonaDeRiesgo() {
  const [eliminando, setEliminando] = useState(false);

  return (
    <div
      id="zona-de-riesgo"
      className="rounded-xl p-4 space-y-3"
      style={{
        background: "var(--kipu-surface)",
        border: "1px solid color-mix(in srgb, var(--kipu-danger) 35%, transparent)",
      }}
    >
      <h2 className="text-sm font-semibold" style={{ color: "var(--kipu-danger)" }}>
        Zona de riesgo
      </h2>
      {eliminando ? (
        <EliminarCuenta onCancelar={() => setEliminando(false)} />
      ) : (
        <>
          <p className="text-sm" style={{ color: "var(--kipu-muted)" }}>
            Eliminar tu cuenta borra tu usuario y tus datos. Si eres el único usuario de una empresa,
            también se eliminan la empresa y sus comprobantes. Antes de confirmar te mostramos qué
            pasará con cada una.
          </p>
          <button
            type="button"
            onClick={() => setEliminando(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            style={{ border: "1px solid color-mix(in srgb, var(--kipu-danger) 40%, transparent)", color: "var(--kipu-danger)" }}
          >
            <Trash2 size={15} /> Eliminar mi cuenta
          </button>
        </>
      )}
    </div>
  );
}
