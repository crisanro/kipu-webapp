// app/(dashboard)/api-keys/page.tsx
"use client";
import TabApiKeys from "@/components/configuracion/TabApiKeys";
import { usePermiso } from "@/hooks/usePermiso";
import SinAcceso from "@/components/SinAcceso";

export default function ApiKeysPage() {
  const puedeVer = usePermiso("api_keys");
  if (!puedeVer) return <SinAcceso />;
  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto space-y-6">
      <h1 className="text-xl font-bold text-white">API Keys</h1>
      <TabApiKeys />
    </div>
  );
}