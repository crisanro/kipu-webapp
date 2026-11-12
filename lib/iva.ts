/** Tipos de IVA que acepta el backend: tarifas y los dos casos sin IVA que no son 0%. */
export const TIPOS_IVA = ["0", "5", "15", "NA", "EX"];

/**
 * Opciones del menú de IVA. "No objeto" y "Exento" ya no se ofrecen; el backend
 * los sigue aceptando (API y productos antiguos), así que solo se muestran si el
 * ítem o producto ya los tiene.
 */
export function opcionesIva(actual?: string): { valor: string; etiqueta: string }[] {
  const base = [
    { valor: "15", etiqueta: "15%" },
    { valor: "0",  etiqueta: "0%" },
    { valor: "5",  etiqueta: "5%" },
  ];
  const t = String(actual ?? "").toUpperCase();
  if (t === "NA") base.push({ valor: "NA", etiqueta: "No objeto" });
  if (t === "EX") base.push({ valor: "EX", etiqueta: "Exento" });
  return base;
}

/** "15" → "15%", "NA" → "No objeto", "EX" → "Exento". */
export function etiquetaIva(tipo: string | number): string {
  const t = String(tipo).toUpperCase();
  if (t === "NA") return "No objeto";
  if (t === "EX") return "Exento";
  return `${t}%`;
}
