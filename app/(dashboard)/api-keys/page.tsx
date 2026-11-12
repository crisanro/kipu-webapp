"use client";
import { BookOpen, ExternalLink } from "lucide-react";
import TabApiKeys from "@/components/configuracion/TabApiKeys";
import UsoApi from "@/components/configuracion/UsoApi";
import { usePermiso } from "@/hooks/usePermiso";
import SinAcceso from "@/components/SinAcceso";

// Documentación pública de la API (la misma a la que redirige /dev)
const DOCS_URL = "https://core.kipu.ec/api-docs";

export default function ApiKeysPage() {
  const puedeVer = usePermiso("api_keys");
  if (!puedeVer) return <SinAcceso />;
  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold" style={{ color: "var(--kipu-text)" }}>
          API Keys
        </h1>
        <a
          href={DOCS_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors hover:opacity-90"
          style={{
            color: "var(--kipu-accent)",
            border: "1px solid color-mix(in srgb, var(--kipu-accent) 35%, transparent)",
            background: "color-mix(in srgb, var(--kipu-accent) 6%, transparent)",
          }}
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
