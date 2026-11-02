/** Tipos de IVA que acepta el backend: tarifas y los dos casos sin IVA que no son 0%. */
export const TIPOS_IVA = ["0", "5", "15", "NA", "EX"];

/** "15" → "15%", "NA" → "No objeto", "EX" → "Exento". */
export function etiquetaIva(tipo: string | number): string {
  const t = String(tipo).toUpperCase();
  if (t === "NA") return "No objeto";
  if (t === "EX") return "Exento";
  return `${t}%`;
}
