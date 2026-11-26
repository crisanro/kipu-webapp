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

/**
 * Tipo de IVA de un ítem copiado del XML del SRI (<detalle><impuestos><impuesto>).
 * "No objeto" y "Exento" llevan tarifa 0: solo se distinguen por codigoPorcentaje
 * (6 y 7). Antes se miraba la tarifa y quedaban como 0%.
 * codigoPorcentaje: 0 → 0%, 5 → 5%, 6 → no objeto, 7 → exento; 2, 3, 4, 8, 10
 * (12, 14, 15 %, diferenciado, 13 %) → 15, la tarifa general de hoy.
 */
export function tipoIvaDesdeXml(impuestos: unknown): string {
  const lista = (Array.isArray(impuestos) ? impuestos : [impuestos])
    .filter(Boolean) as { codigo?: unknown; codigoPorcentaje?: unknown; tarifa?: unknown }[];
  if (lista.length === 0) return "15";
  // El IVA es el impuesto con código 2 (el ICE es 3, el IRBPNR 5)
  const iva = lista.find(i => String(i.codigo ?? "2") === "2");
  if (!iva) return "0";
  const cp = String(iva.codigoPorcentaje ?? "").trim();
  if (cp === "6") return "NA";
  if (cp === "7") return "EX";
  if (cp === "0") return "0";
  if (cp === "5") return "5";
  if (cp) return "15";
  const tarifa = parseFloat(String(iva.tarifa ?? "15"));
  return tarifa === 0 ? "0" : tarifa === 5 ? "5" : "15";
}
