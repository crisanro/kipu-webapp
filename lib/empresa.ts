// lib/empresa.ts
//
// La empresa activa vive en el store (persistido): la barra lateral lee de ahí
// si hay firma ("Sin firma — no puedes emitir"). Después de un cambio que la
// afecta (subir o borrar la firma) hay que volver a leerla del servidor.
import api from "@/lib/api";
import { useAuthStore, type Empresa } from "@/store/auth.store";

/** Fila de /usuarios/empresas → empresa del store. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function aEmpresa(e: any): Empresa {
  return {
    id:                    e.id,
    ruc:                   e.ruc,
    razon_social:          e.razon_social,
    nombre_comercial:      e.nombre_comercial,
    ambiente:              e.ambiente,
    tipo_emisor:           e.tipo_emisor,
    rol:                   e.rol,
    permisos:              e.permisos ?? {},
    firma_ok:              e.firma_ok,
    suscripcion_activa:    e.suscripcion_activa,
    suscripcion:           e.suscripcion,
    balance_api:           e.balance_api,
    emision_gratis:        e.emision_gratis ?? false,
    obligado_contabilidad: e.obligado_contabilidad ?? null,
    periodo_iva:           e.periodo_iva ?? null,
  };
}

/** Vuelve a leer la empresa activa (sin cambiar de empresa). Nunca lanza. */
export async function refrescarEmpresaActual(): Promise<void> {
  const actual = useAuthStore.getState().empresa;
  if (!actual) return;
  try {
    const res  = await api.get("/api/v1/app/usuarios/empresas");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const fila = (res.data.data ?? []).find((e: any) => e.id === actual.id);
    if (fila) useAuthStore.getState().updateEmpresa(aEmpresa(fila));
  } catch {
    // Sin red: se queda lo que había; la próxima carga lo corrige
  }
}
