// lib/catalogos/retenciones.ts
//
// Catálogo de retenciones del backend (GET /api/v1/app/catalogos/retenciones),
// versionado por vigencia: se pide con la fecha del documento sustento.
import api from "@/lib/api";

export interface CodigoRenta {
  codigo:                       string;
  descripcion:                  string;
  residencia:                   "residente" | "no_residente";
  porcentajes:                  number[];
  porcentaje_sugerido:          number | null;
  porcentaje_sugerido_paraiso?: number | null;   // solo no residentes (régimen 02/03)
  porcentaje_texto:             string;
  nota:                         string | null;
  ofrecer_en_ui:                boolean;
  casillero_103:                string | null;
  revision_manual:              boolean;
  motivos_revision:             string[];
}

export interface CodigoImpuesto {
  codigo:         string;
  descripcion:    string;
  porcentaje:     number;
  vigencia_desde: string | null;
  vigencia_hasta: string | null;
  nota:           string | null;
}

export interface CodigoSustento {
  codigo:            string;
  descripcion:       string;
  tipos_comprobante: string[];
  vigencia_desde:    string | null;
  vigencia_hasta:    string | null;
}

export interface ParaisoFiscal {
  codigo:         string;   // Tabla 17 (ATS: paisEfecPagoParFis)
  nombre:         string;
  pais_ligado:    string;
  codigo_pais:    string;   // Tabla 16 (XML: paisEfecPago)
  vigencia_desde: string | null;
  vigencia_hasta: string | null;
}

export interface CatalogoRetenciones {
  version: string;   // se guardará en cada retención (Fase B)
  fecha:   string;
  renta: {
    vigencia_desde: string;
    vigencia_hasta: string | null;
    codigos:        CodigoRenta[];
  };
  iva:                     CodigoImpuesto[];
  isd:                     CodigoImpuesto[];
  sustento:                CodigoSustento[];
  paises:                  { codigo: string; nombre: string }[];
  paraisos_fiscales:       ParaisoFiscal[];
  regimen_fiscal_exterior: { codigo: string; descripcion: string }[];
}

// Códigos de renta que van primero en el selector ("Más usados"), en este
// orden. Si el catálogo de la fecha no trae alguno, se omite.
export const MAS_USADOS_RESIDENTES    = ["303", "304", "307", "309", "310", "312", "320", "343", "3440", "332"];
export const MAS_USADOS_NO_RESIDENTES = ["501", "501A", "509"];

// "2026-11-13", "2026-11-13T10:00:00" o "13/11/2026" → "2026-11-13".
// Sin fecha (o con un formato desconocido), la de hoy.
export function fechaCatalogo(fecha?: string | null): string {
  const t = (fecha ?? "").trim();
  const iso = /^(\d{4}-\d{2}-\d{2})/.exec(t);
  if (iso) return iso[1];
  const dmy = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(t);
  if (dmy) return `${dmy[3]}-${dmy[2]}-${dmy[1]}`;
  const hoy = new Date();
  return `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, "0")}-${String(hoy.getDate()).padStart(2, "0")}`;
}

// Caché en memoria por fecha (dura lo que la pestaña). Un error no se guarda:
// el siguiente pedido vuelve a intentar.
const cache = new Map<string, Promise<CatalogoRetenciones>>();

export function obtenerCatalogoRetenciones(fecha: string): Promise<CatalogoRetenciones> {
  let pedido = cache.get(fecha);
  if (!pedido) {
    pedido = api
      .get("/api/v1/app/catalogos/retenciones", { params: { fecha } })
      .then(res => res.data.data as CatalogoRetenciones);
    pedido.catch(() => cache.delete(fecha));
    cache.set(fecha, pedido);
  }
  return pedido;
}
