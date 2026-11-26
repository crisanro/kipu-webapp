// lib/cuenta.ts

/**
 * sessionStorage: después de eliminar la cuenta (components/cuenta/EliminarCuenta.tsx)
 * el login lo avisa. Valor: la fecha en que se borra, o "" si ya se borró.
 */
export const CUENTA_ELIMINADA = "kipu-cuenta-eliminada";

/**
 * sessionStorage: la empresa elegida en esta pestaña. Al recargar, providers.tsx
 * abre esa (lib/empresa.ts abrirEmpresa la deja escrita). Aquí y no en providers
 * para que lib/api.ts la use sin importarlo (este archivo no importa nada).
 */
export const SESSION_EMPRESA_KEY = "kipu-empresa-sesion";
