"use client";
// Agregar otra empresa a la cuenta. El formulario es el mismo del onboarding
// (components/auth/FormularioEmpresa.tsx), con su búsqueda en el SRI y el
// "recuperar con la firma". Límite: una empresa en pruebas a la vez.

import { useState } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import { useAuthStore } from "@/store/auth.store";
import { ArrowLeft, Building2, CheckCircle2 } from "lucide-react";
import { aEmpresa } from "@/lib/empresa";
import FormularioEmpresa from "@/components/auth/FormularioEmpresa";
import BotonIcono from "@/components/ui/BotonIcono";

export default function NuevaEmpresaPage() {
  const router = useRouter();
  const { addEmpresa, empresas } = useAuthStore();
  const [success, setSuccess] = useState(false);

  const tienePruebas = empresas.some(e => e.ambiente === 1);

  // La empresa tal como la dejó el backend (plan, permisos, saldo); con el id
  // (recuperada con la firma no lo trae) o, si no aparece, carga completa
  const creada = async (emisorId: number | null) => {
    const lista = await api.get("/api/v1/app/usuarios/empresas").catch(() => null);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const fila = emisorId != null ? lista?.data?.data?.find((e: any) => e.id === emisorId) : null;
    setSuccess(true);
    if (fila) {
      addEmpresa(aEmpresa(fila));
      setTimeout(() => router.replace("/dashboard"), 1500);
    } else {
      setTimeout(() => window.location.replace("/dashboard"), 1500);
    }
  };

  if (success) {
    return (
      <div className="flex h-full items-center justify-center p-6" role="status">
        <div className="text-center">
          <span className="mx-auto mb-4 flex size-16 items-center justify-center rounded-full bg-exito-suave">
            <CheckCircle2 size={32} className="text-exito" aria-hidden />
          </span>
          <h1 className="text-xl font-bold text-texto">¡Empresa creada!</h1>
          <p className="mt-1 text-sm text-tenue">Abriendo su panel…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-full max-w-md flex-col px-4 pt-4 md:pt-6">
      {/* Encabezado: en el celular el título ya está en la barra superior */}
      <header className="mb-6 flex items-center gap-3">
        <BotonIcono etiqueta="Volver" icono={<ArrowLeft size={18} />} onClick={() => router.back()}
                    className="hidden lg:inline-flex" />
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-acento-suave text-acento">
          <Building2 size={18} aria-hidden />
        </span>
        <div>
          <h1 className="hidden text-lg font-bold text-texto lg:block">Nueva empresa</h1>
          <p className="text-xs text-sutil">Se crea en modo pruebas</p>
        </div>
      </header>

      {tienePruebas ? (
        <div className="rounded-xl border border-alerta/20 bg-alerta-suave p-4" role="status">
          <p className="text-sm font-medium text-alerta-texto">Ya tienes una empresa en pruebas</p>
          <p className="mt-1 text-xs text-tenue">
            Para crear otra, primero pasa la que tienes a producción.
          </p>
        </div>
      ) : (
        <FormularioEmpresa onCreada={creada} pie={() => <div className="h-6 md:h-10" />} />
      )}
    </div>
  );
}
