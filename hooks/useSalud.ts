// hooks/useSalud.ts
//
// Pasos del onboarding ("Configura tu cuenta") para mostrar la barra fuera del
// dashboard. Solo se pide mientras la empresa no está en producción.
import useSWR from "swr";
import api from "@/lib/api";
import { useAuthStore } from "@/store/auth.store";
import type { HealthData } from "@/components/Checklist";

const fetcher = ([url]: [string, number]) =>
  api.get(url).then((r) => (r.data.data ?? r.data)?.health as HealthData | undefined);

export function useSalud() {
  const empresa = useAuthStore((s) => s.empresa);
  const hoy     = new Date().toLocaleDateString("en-CA", { timeZone: "America/Guayaquil" });
  const activo  = !!empresa?.id && empresa.ambiente !== 2;

  const { data, mutate } = useSWR(
    activo ? [`/api/v1/app/dashboard?fecha_inicio=${hoy}&fecha_fin=${hoy}`, empresa!.id] : null,
    fetcher,
    { revalidateOnFocus: true, dedupingInterval: 2000 },
  );

  return { salud: data ?? null, refrescar: () => { void mutate(); } };
}
