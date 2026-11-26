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

// ── Formatos para mostrar ─────────────────────────────────────────────────────
// Todos pasan por r2: con toFixed solo, 2.0549999… se mostraba 2.05 y el SRI
// recibía 2.06. Aceptan número o texto (el backend manda Decimal como texto).

const numero = (n: unknown): number => parseFloat(String(n ?? 0)) || 0;

/** 1234.5 → "1234.50" */
export const dosDecimales = (n: unknown): string => r2(numero(n)).toFixed(2);

/** 1234.5 → "$1234.50" */
export const dolares = (n: unknown): string => `$${dosDecimales(n)}`;

/** 1234.5 → "1.234,50" (reportes y declaraciones) */
export const montoEC = (n: unknown): string =>
  r2(numero(n)).toLocaleString("es-EC", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** 1234 → "1.234" (cantidades) */
export const numeroEC = (n: unknown): string => numero(n).toLocaleString("es-EC");

/** 1234.5 → "1.2k"; menos de mil con los decimales pedidos (gráficos y tarjetas) */
export const compactoK = (n: unknown, decimales = 2): string => {
  const v = numero(n);
  return v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v.toFixed(decimales);
};
