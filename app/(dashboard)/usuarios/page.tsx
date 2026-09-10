"use client";

import { useAuthStore } from "@/store/auth.store";
import { UserCog } from "lucide-react";
import TabUsuarios from "@/components/configuracion/TabUsuarios";
import { usePermiso } from "@/hooks/usePermiso";
import SinAcceso from "@/components/SinAcceso";

export default function UsuariosPage() {
  const puedeVer = usePermiso("usuarios");
  if (!puedeVer) return <SinAcceso />;
  const empresa = useAuthStore((s) => s.empresa);

  if (!empresa) {
    return (
      <div className="flex items-center justify-center py-20">
        <div
          className="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin"
          style={{ borderColor: "var(--kipu-accent)", borderTopColor: "transparent" }}
        />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto space-y-5">

      {/* Header */}
      <div className="flex items-center gap-3">
        <div
          className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
          style={{ background: "color-mix(in srgb, var(--kipu-accent) 20%, transparent)" }}
        >
          <UserCog size={18} style={{ color: "var(--kipu-accent)" }} />
        </div>
        <div>
          <h1 className="text-xl font-bold" style={{ color: "var(--kipu-text)" }}>Usuarios</h1>
          <p className="text-sm" style={{ color: "var(--kipu-subtle)" }}>
            Gestiona quién tiene acceso a {empresa.nombre_comercial || empresa.razon_social}
          </p>
        </div>
      </div>

      {/* Contenido */}
      <TabUsuarios empresaId={empresa.id} />

    </div>
  );
}