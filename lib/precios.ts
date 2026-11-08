/**
 * Cálculo de una línea de comprobante y modo "IVA incluido".
 *
 * Al backend siempre llega el precio SIN IVA (hasta 6 decimales) y el descuento
 * en dólares sin IVA; el modo "IVA incluido" solo cambia lo que la persona escribe.
 * Cuando escribe un precio con IVA se busca la base que, con el redondeo del SRI
 * (IVA por ítem a 2 decimales, ROUND_HALF_UP), da ese total. Si no existe una base
 * exacta (p. ej. 150.00 al 15 %: 149.99 o 150.01), se queda un centavo abajo para
 * no cobrar más de lo acordado.
 */
import { r2 } from "./dinero";

export interface LineaPrecio {
  cantidad:       number;
  precio:         number;          // sin IVA — lo que va al SRI
  descuento:      number;          // "$": dólares sin IVA · "%": porcentaje
  tipo_descuento: "$" | "%";
  tipo_iva:       string;
  precio_iva?:    number;          // modo IVA incluido: precio unitario con IVA que escribió la persona
  descuento_iva?: number;          // modo IVA incluido con descuento "$": dólares con IVA
}

// NA = no objeto de IVA, EX = exento: sin IVA como el 0%, pero se declaran aparte (431/531/532)
const TARIFAS: Record<string, number> = { "0": 0, "5": 5, "8": 8, "15": 15, "NA": 0, "EX": 0 };

export const tarifaPct = (tipoIva: string) => TARIFAS[tipoIva] ?? 15;

/** Precio unitario a 6 decimales (lo máximo que admite el SRI). */
export function r6(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Number(Number(n.toPrecision(12)).toFixed(6)) || 0;
}

const aCentavos = (n: number) => Math.round(r2(n) * 100);

/** IVA en centavos de una base en centavos — misma regla que el backend. */
const ivaCentavos   = (base: number, pct: number) => Math.floor((base * pct + 50) / 100);
const totalCentavos = (base: number, pct: number) => base + ivaCentavos(base, pct);

/** Mayor base sin IVA cuyo total con IVA no supera `total`. */
export function baseDesdeTotal(total: number, tipoIva: string): number {
  const pct      = tarifaPct(tipoIva);
  const objetivo = aCentavos(Math.max(0, total));
  let base = Math.floor((objetivo * 100) / (100 + pct));
  while (totalCentavos(base + 1, pct) <= objetivo) base++;
  while (base > 0 && totalCentavos(base, pct) > objetivo) base--;
  return base / 100;
}

/** Subtotal, descuento, base, IVA y total de la línea (lo mismo que calcula el backend). */
export function calcularLinea(item: LineaPrecio) {
  const subtotal = r2(item.cantidad * item.precio);
  let descuento: number;
  if (item.tipo_descuento === "%" && item.precio_iva !== undefined) {
    // IVA incluido: el % se aplica al precio con IVA y se busca la base que da ese total
    const base = baseDesdeTotal(totalEsperadoConIva(item) ?? 0, item.tipo_iva);
    descuento  = r2(Math.min(subtotal, Math.max(0, subtotal - base)));
  } else {
    descuento = r2(
      item.tipo_descuento === "%"
        ? subtotal * (Math.min(item.descuento, 100) / 100)
        : Math.min(item.descuento, subtotal)
    );
  }
  const base  = r2(subtotal - descuento);
  const iva   = r2(base * (tarifaPct(item.tipo_iva) / 100));
  const total = r2(base + iva);
  return { subtotal, descuento, base, iva, total };
}

/**
 * Modo IVA incluido: recalcula el precio y el descuento sin IVA a partir de lo
 * que escribió la persona (precio_iva, descuento_iva o porcentaje).
 */
export function aplicarIvaIncluido<T extends LineaPrecio>(item: T): T {
  const cantidad = item.cantidad > 0 ? item.cantidad : 0;
  const bruto    = r2(cantidad * (item.precio_iva ?? 0));      // con IVA, antes del descuento
  const precio   = cantidad > 0 ? r6(baseDesdeTotal(bruto, item.tipo_iva) / cantidad) : 0;
  if (item.tipo_descuento === "%") return { ...item, precio };

  const subtotal = r2(cantidad * precio);
  const desc     = Math.min(Math.max(0, item.descuento_iva ?? 0), bruto);
  const base     = baseDesdeTotal(bruto - desc, item.tipo_iva);
  return { ...item, precio, descuento: r2(Math.max(0, subtotal - base)) };
}

/** Total que la persona espera ver en modo IVA incluido (para avisar si el redondeo lo mueve). */
export function totalEsperadoConIva(item: LineaPrecio): number | null {
  if (item.precio_iva === undefined) return null;
  const bruto = r2(item.cantidad * item.precio_iva);
  return item.tipo_descuento === "%"
    ? r2(bruto * (1 - Math.min(item.descuento, 100) / 100))
    : r2(bruto - Math.min(Math.max(0, item.descuento_iva ?? 0), bruto));
}

/**
 * Pasa una línea al modo IVA incluido sin tocar el precio ni el descuento que ya
 * tiene (lo que se envía no cambia hasta que la persona edite la línea).
 */
export function conIvaIncluido<T extends LineaPrecio>(item: T): T {
  const c     = calcularLinea(item);
  const bruto = totalCentavos(aCentavos(c.subtotal), tarifaPct(item.tipo_iva)) / 100;
  return {
    ...item,
    precio_iva:    r2(bruto / (item.cantidad > 0 ? item.cantidad : 1)),
    descuento_iva: item.tipo_descuento === "$" ? r2(bruto - c.total) : undefined,
  };
}

/** Vuelve al modo sin IVA: el precio y el descuento ya están sin IVA. */
export function sinIvaIncluido<T extends LineaPrecio>(item: T): T {
  const resto = { ...item };
  delete resto.precio_iva;
  delete resto.descuento_iva;
  return resto;
}
