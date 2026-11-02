// Validación de cédula, RUC y otras identificaciones del SRI. Se usa en el
// selector de clientes y otra vez al emitir: sin esto se podía emitir a un
// cliente nuevo con identificación inválida (el SRI lo rechaza y se pierde el secuencial).

export function validarIdentificacion(
  tipo: string,
  valor: string
): { ok: boolean; error: string } {
  // Pasaporte e identificación del exterior pueden ser solo letras
  if (tipo === "06" || tipo === "08") {
    if (valor.trim().length < 2) return { ok: false, error: "Ingresa la identificación." };
    return { ok: true, error: "" };
  }

  const v = valor.replace(/\D/g, "");

  if (!v) return { ok: false, error: "" };

  if (tipo === "05") {
    if (v.length !== 10) return { ok: false, error: "La cédula debe tener 10 dígitos." };
    const prov = parseInt(v.substring(0, 2));
    if ((prov < 1 || prov > 24) && prov !== 30)
      return { ok: false, error: "Provincia inválida (primeros 2 dígitos)." };
    if (parseInt(v[2]) >= 6)
      return { ok: false, error: "Tercer dígito de cédula inválido." };
    const digitos = v.split("").map(Number);
    const verificador = digitos[9];
    let suma = 0;
    for (let i = 0; i < 9; i++) {
      let prod = digitos[i] * (i % 2 === 0 ? 2 : 1);
      if (prod > 9) prod -= 9;
      suma += prod;
    }
    const calc = suma % 10 === 0 ? 0 : 10 - (suma % 10);
    if (calc !== verificador) return { ok: false, error: "Número de cédula inválido." };
    return { ok: true, error: "" };
  }

  if (tipo === "04") {
    if (v.length !== 13) return { ok: false, error: "El RUC debe tener 13 dígitos." };
    if (!v.endsWith("001")) return { ok: false, error: "El RUC debe terminar en 001." };
    const prov = parseInt(v.substring(0, 2));
    if ((prov < 1 || prov > 24) && prov !== 30)
      return { ok: false, error: "Provincia inválida (primeros 2 dígitos)." };
    const tercero = parseInt(v[2]);
    if (tercero >= 0 && tercero <= 5) {
      const digitos = v.substring(0, 10).split("").map(Number);
      const verificador = digitos[9];
      let suma = 0;
      for (let i = 0; i < 9; i++) {
        let prod = digitos[i] * (i % 2 === 0 ? 2 : 1);
        if (prod > 9) prod -= 9;
        suma += prod;
      }
      const calc = suma % 10 === 0 ? 0 : 10 - (suma % 10);
      if (calc !== verificador) return { ok: false, error: "RUC de persona natural inválido." };
    } else if (tercero === 6 || tercero === 9) {
      // Jurídico — no se valida dígito verificador
    } else {
      return { ok: false, error: "Tercer dígito de RUC inválido." };
    }
    return { ok: true, error: "" };
  }

  return { ok: true, error: "" };
}

/** Mensaje de error si la identificación no sirve para emitir, o null si está bien. */
export function errorIdentificacion(tipo: string, valor: string): string | null {
  const { ok, error } = validarIdentificacion(tipo, valor ?? "");
  if (ok) return null;
  return error || "Ingresa la identificación.";
}
