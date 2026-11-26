"use client";
import { BookOpen, ExternalLink } from "lucide-react";
import TabApiKeys from "@/components/configuracion/TabApiKeys";
import UsoApi from "@/components/configuracion/UsoApi";
import { usePermiso } from "@/hooks/usePermiso";
import SinAcceso from "@/components/SinAcceso";

// Documentación pública de la API, servida en app.kipu.ec/dev (next.config.ts)
const DOCS_URL = "/dev";

export default function ApiKeysPage() {
  const puedeVer = usePermiso("api_keys");
  if (!puedeVer) return <SinAcceso />;
  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold text-texto">
          API Keys
        </h1>
        <a
          href={DOCS_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors hover:opacity-90 text-acento border border-acento/35 bg-acento/6"
        >
          <BookOpen size={15} />
          Ver documentación
          <ExternalLink size={13} className="opacity-70" />
        </a>
      </div>
      <UsoApi />
      <TabApiKeys />
    </div>
  );
}
