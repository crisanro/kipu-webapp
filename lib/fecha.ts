export const hoyEC = () =>
  new Date().toLocaleDateString("en-CA", { timeZone: "America/Guayaquil" });

/** Primer día del mes en curso en Ecuador (AAAA-MM-01). */
export const inicioMesEC = () => `${hoyEC().slice(0, 8)}01`;