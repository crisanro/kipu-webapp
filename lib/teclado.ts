/**
 * Teclado del celular según lo que se escribe.
 *
 * `inputMode` solo cambia el teclado que se muestra; no cambia lo que acepta el
 * campo. Donde el dato lleva guiones o barras (número de documento, período),
 * se escriben solo los dígitos y el formato se pone solo, así basta el teclado
 * numérico.
 */

/** Cédula (05) y RUC (04) son solo números; pasaporte y exterior pueden llevar letras. */
export function tecladoIdentificacion(tipo: string | undefined): "numeric" | "text" {
  return tipo === "04" || tipo === "05" ? "numeric" : "text";
}

/** "001001000000123" → "001-001-000000123" (establecimiento-punto-secuencial). */
export function formatoNumeroDoc(valor: string): string {
  const solo = valor.replace(/[^0-9]/g, "");
  if (solo.length <= 3) return solo;
  if (solo.length <= 6) return `${solo.slice(0, 3)}-${solo.slice(3)}`;
  return `${solo.slice(0, 3)}-${solo.slice(3, 6)}-${solo.slice(6, 15)}`;
}

/** "032026" → "03/2026" (período fiscal MM/AAAA). */
export function formatoPeriodo(valor: string): string {
  const solo = valor.replace(/[^0-9]/g, "").slice(0, 6);
  return solo.length <= 2 ? solo : `${solo.slice(0, 2)}/${solo.slice(2)}`;
}
