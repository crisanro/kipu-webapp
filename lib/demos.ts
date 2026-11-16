// lib/demos.ts
// Datos de EJEMPLO para quien no tiene Plan Pro y todavía no tiene datos propios
// (empresas en pruebas o que emiten con créditos): ven cómo funciona antes de
// pagar. Solo se muestran; no se guardan en ningún lado.
import { hoyEC } from "./fecha";

/** Fecha (YYYY-MM-DD) a `dias` de hoy, para que el ejemplo se vea al día. */
function dia(dias: number): string {
  const d = new Date(`${hoyEC()}T12:00:00`);
  d.setDate(d.getDate() + dias);
  return d.toISOString().slice(0, 10);
}

const ANDRADE = { id: "ejemplo-c1", razon_social: "COMERCIAL ANDRADE S.A.",    identificacion: "0990000001001" };
const LOPEZ   = { id: "ejemplo-c2", razon_social: "MARÍA FERNANDA LÓPEZ",      identificacion: "1700000002" };
const EXITO   = { id: "ejemplo-c3", razon_social: "FERRETERÍA EL ÉXITO",       identificacion: "1790000003001" };
const PACIFICO = { razon_social: "DISTRIBUIDORA DEL PACÍFICO", identificacion: "0990000004001" };

export function demoProformas() {
  return [
    { id: "ejemplo-p3", numero: "PRO-000003", fecha_emision: dia(-2), fecha_validez: dia(13),
      subtotal: 400, total_iva: 60, total: 460, estado: "VIGENTE" as const, vencida: false,
      notas: null, cliente: ANDRADE },
    { id: "ejemplo-p2", numero: "PRO-000002", fecha_emision: dia(-9), fecha_validez: dia(6),
      subtotal: 100, total_iva: 15, total: 115, estado: "FACTURADA" as const, vencida: false,
      notas: null, cliente: LOPEZ },
    { id: "ejemplo-p1", numero: "PRO-000001", fecha_emision: dia(-20), fecha_validez: dia(-3),
      subtotal: 75, total_iva: 11.25, total: 86.25, estado: "VIGENTE" as const, vencida: true,
      notas: null, cliente: EXITO },
  ];
}

export function demoCuentas() {
  const base = (c: { id: string; razon_social: string; identificacion: string }) => ({
    cliente_id: c.id, razon_social: c.razon_social, identificacion: c.identificacion, notas: null,
  });
  return [
    { id: "ejemplo-k1", tipo: "COBRAR" as const, concepto: "Venta a crédito — factura 001-001-000000124",
      monto_total: 460, monto_pagado: 200, saldo_pendiente: 260, fecha_emision: dia(-10),
      fecha_vencimiento: dia(15), estado: "PARCIAL" as const, ...base(ANDRADE) },
    { id: "ejemplo-k2", tipo: "COBRAR" as const, concepto: "Mantenimiento del mes pasado",
      monto_total: 115, monto_pagado: 0, saldo_pendiente: 115, fecha_emision: dia(-35),
      fecha_vencimiento: dia(-5), estado: "PENDIENTE" as const, ...base(LOPEZ) },
    { id: "ejemplo-k3", tipo: "PAGAR" as const, concepto: "Compra de mercadería a 30 días",
      monto_total: 320, monto_pagado: 0, saldo_pendiente: 320, fecha_emision: dia(-4),
      fecha_vencimiento: dia(26), estado: "PENDIENTE" as const,
      ...base({ id: "ejemplo-c4", ...PACIFICO }) },
    { id: "ejemplo-k4", tipo: "COBRAR" as const, concepto: "Anticipo de instalación",
      monto_total: 250, monto_pagado: 250, saldo_pendiente: 0, fecha_emision: dia(-15),
      fecha_vencimiento: null, estado: "PAGADO" as const, ...base(EXITO) },
  ];
}

/** Totales de las cuentas de ejemplo, como los calcula el backend. */
export function resumenCuentas(cuentas: { tipo: string; estado: string; saldo_pendiente: number }[]) {
  const suma = (tipo: string) => cuentas
    .filter((c) => c.tipo === tipo && c.estado !== "ANULADO")
    .reduce((s, c) => s + c.saldo_pendiente, 0);
  const por_cobrar = suma("COBRAR"), por_pagar = suma("PAGAR");
  return { por_cobrar, por_pagar, balance: por_cobrar - por_pagar };
}

export function demoRecibidos() {
  return [
    { id: "ejemplo-r1", razon_social_proveedor: PACIFICO.razon_social, tipo_doc: "FAC",
      numero_doc: "001-002-000004512", fecha_emision: dia(-4), subtotal_base: 278.26,
      valor_iva_total: 41.74, importe_total: 320, deducible_renta: true, credito_tributario_iva: true,
      estado_pago: "PENDIENTE", notas: "Mercadería para la venta", fuente: "XML" },
    { id: "ejemplo-r2", razon_social_proveedor: "SERVICIOS ELÉCTRICOS DEL SUR", tipo_doc: "FAC",
      numero_doc: "001-010-000873120", fecha_emision: dia(-8), subtotal_base: 41.74,
      valor_iva_total: 6.26, importe_total: 48, deducible_renta: true, credito_tributario_iva: true,
      estado_pago: "PAGADO", notas: null, fuente: "XML" },
    { id: "ejemplo-r3", razon_social_proveedor: "PAPELERÍA LA ESTRELLA", tipo_doc: "FAC",
      numero_doc: "002-001-000000391", fecha_emision: dia(-12), subtotal_base: 20,
      valor_iva_total: 3, importe_total: 23, deducible_renta: false, credito_tributario_iva: true,
      estado_pago: "PAGADO", notas: "Útiles de oficina", fuente: "FISICO" },
  ];
}

export function resumenRecibidos(docs: ReturnType<typeof demoRecibidos>) {
  const r2 = (n: number) => Math.round(n * 100) / 100;
  return {
    total_documentos:       docs.length,
    importe_total:          r2(docs.reduce((s, d) => s + d.importe_total, 0)),
    total_deducible:        r2(docs.filter((d) => d.deducible_renta).reduce((s, d) => s + d.subtotal_base, 0)),
    iva_credito_tributario: r2(docs.filter((d) => d.credito_tributario_iva).reduce((s, d) => s + d.valor_iva_total, 0)),
  };
}
