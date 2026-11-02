/**
 * Redondeo de dinero a 2 decimales, igual que el backend (Decimal + ROUND_HALF_UP).
 *
 * Math.round(x * 100) falla con los decimales binarios: 13.70 × 0.15 da
 * 2.0549999… → 2.05 en pantalla, pero el SRI recibe 2.06. Aquí se quita ese
 * ruido (12 cifras significativas) antes de redondear, y los negativos se
 * redondean alejándose de cero, como ROUND_HALF_UP.
 */
export function r2(n: number): number {
  if (!Number.isFinite(n)) return 0;
  const limpio   = Number(n.toPrecision(12));
  const centavos = Math.round(Number(`${Math.abs(limpio).toFixed(10)}e2`));
  return (limpio < 0 ? -centavos : centavos) / 100 || 0;
}
