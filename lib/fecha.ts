export const hoyEC = () =>
  new Date().toLocaleDateString("en-CA", { timeZone: "America/Guayaquil" });

/** Primer día del mes en curso en Ecuador (AAAA-MM-01). */
export const inicioMesEC = () => `${hoyEC().slice(0, 8)}01`;

/** Nombres de los meses en minúscula; MESES[0] es enero. */
export const MESES: readonly string[] = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio",
  "agosto", "septiembre", "octubre", "noviembre", "diciembre"];