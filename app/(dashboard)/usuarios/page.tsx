// app/(dashboard)/usuarios/page.tsx
"use client";

import { useAuthStore } from "@/store/auth.store";
import { UserCog, Loader2 } from "lucide-react";
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
        <Loader2 size={24} className="animate-spin text-indigo-400" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto space-y-5">

      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-indigo-600/20 flex items-center justify-center">
          <UserCog size={18} className="text-indigo-400" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-white">Usuarios</h1>
          <p className="text-sm text-gray-500">
            Gestiona quién tiene acceso a {empresa.nombre_comercial || empresa.razon_social}
          </p>
        </div>
      </div>

      {/* Contenido */}
      <TabUsuarios empresaId={empresa.id} />

    </div>
  );
}