// content/datos-tributarios.ts
//
// Datos tributarios de Ecuador que cambian con una ley o una resolución del SRI.
// Los artículos de /aprende los leen de aquí (import en el .mdx) para que el texto
// sea atemporal: cuando algo cambie, se corrige aquí y no artículo por artículo.
//
// Cada dato dice desde cuándo rige. Al cambiar uno, actualizar REVISADO y el
// campo `actualizado` de los artículos que lo usan (content/aprende/articulos.ts).
// Deben coincidir con lo que usa el backend (kipu-core1: declaraciones/periodos.py).

/** Última vez que se revisaron todos los datos de este archivo. */
export const REVISADO = "noviembre de 2026";

export const IVA = {
  /** Tarifa general, en %. */
  tarifaGeneral: 15,
  vigenteDesde:  "1 de abril de 2024",
  /** Otras tarifas para ciertos bienes y servicios, en %. */
  otrasTarifas:  [0, 5],
  formulario:    "104",
} as const;

/**
 * Día del mes en que vence la declaración según el 9.º dígito del RUC (o de la
 * cédula). Si cae en fin de semana o feriado, pasa al siguiente día hábil.
 */
export const VENCIMIENTOS: [digito: string, dia: number][] = [
  ["1", 10], ["2", 12], ["3", 14], ["4", 16], ["5", 18],
  ["6", 20], ["7", 22], ["8", 24], ["9", 26], ["0", 28],
];
// (Es una lista y no un objeto para que el orden sea 1…9, 0: un objeto con
// claves numéricas las ordena y pone el 0 primero.)
const VENCIMIENTO_POR_DIGITO: Record<string, number> = Object.fromEntries(VENCIMIENTOS);

/** IVA semestral: qué meses cubre cada semestre y en qué mes se declara. */
export const SEMESTRES = [
  { nombre: "Primer semestre",  meses: "enero a junio",     seDeclaraEn: "julio" },
  { nombre: "Segundo semestre", meses: "julio a diciembre", seDeclaraEn: "enero del año siguiente" },
] as const;

/** Día de vencimiento para un RUC (9.º dígito). */
export function diaVencimiento(ruc: string): number | null {
  return VENCIMIENTO_POR_DIGITO[ruc.trim()[8] ?? ""] ?? null;
}
