// content/ayuda/articulos.ts — índice del Centro de Ayuda (/ayuda)
//
// Solo datos (sin componentes): lo usan la portada, el buscador (en el
// navegador) y las páginas de artículo. El texto de cada artículo está en
// content/ayuda/<slug>.mdx.
//
// Para agregar un artículo:
//   1. Crear content/ayuda/<slug>.mdx (sin título: la página lo pone con `titulo`).
//   2. Agregarlo aquí con el mismo slug.
// El slug es la URL (/ayuda/<slug>): en minúsculas, sin tildes, con guiones, y
// no se cambia una vez publicado (los enlaces y buscadores lo usan).
//
// Los artículos describen la app tal como es: botones y mensajes con su texto
// exacto (revisado contra el código). Si cambia una pantalla, cambiar el artículo.
//
// soloWeb: el artículo habla de planes, precios o pagos. No sale en la app de las
// tiendas (lib/plataforma.ts). Los demás artículos no deben enlazar a estos.

import { ES_APP_NATIVA } from "@/lib/plataforma";

export type CategoriaAyuda =
  | "primeros-pasos"
  | "firma-electronica"
  | "emision"
  | "notas-credito-debito"
  | "recibidos"
  | "declaracion-iva"
  | "cuenta-y-planes";

export interface Categoria {
  id:          CategoriaAyuda;
  nombre:      string;
  descripcion: string;
}

export const CATEGORIAS: Categoria[] = [
  { id: "primeros-pasos",       nombre: "Primeros pasos",            descripcion: "Configura tu empresa y emite tu primera factura." },
  { id: "firma-electronica",    nombre: "Firma electrónica",         descripcion: "Sube, renueva o reemplaza tu firma (.p12)." },
  { id: "emision",              nombre: "Emisión de comprobantes",   descripcion: "Facturas, liquidaciones y retenciones." },
  { id: "notas-credito-debito", nombre: "Notas de crédito y débito", descripcion: "Corrige, anula o modifica una factura ya emitida." },
  { id: "recibidos",            nombre: "Comprobantes recibidos",    descripcion: "Registra tus compras y gastos." },
  { id: "declaracion-iva",      nombre: "Declaración de IVA",        descripcion: "El formulario 104 y tus reportes." },
  { id: "cuenta-y-planes",      nombre: "Cuenta y planes",           descripcion: "Tu usuario, tu equipo y tu plan." },
];

export interface ArticuloAyuda {
  slug:      string;
  titulo:    string;            // también es el <title> de la página
  resumen:   string;            // una línea: se ve en listas y es la descripción para buscadores
  categoria: CategoriaAyuda;
  palabras:  string[];          // lo que la gente escribiría al buscarlo (sin repetir el título)
  soloWeb?:  boolean;           // habla de planes o pagos: no va en la app de las tiendas
}

const TODOS: ArticuloAyuda[] = [
  // ── Primeros pasos ──────────────────────────────────────────────
  {
    slug:      "como-empezar-a-facturar",
    titulo:    "Cómo empezar a facturar en Kipu",
    resumen:   "Los pasos para dejar tu empresa lista y emitir tu primera factura autorizada por el SRI.",
    categoria: "primeros-pasos",
    palabras:  ["empezar", "configurar", "primera factura", "checklist", "pasos", "establecimiento", "punto de emisión"],
  },
  {
    slug:      "como-pasar-a-produccion",
    titulo:    "Cómo pasar de pruebas a producción",
    resumen:   "Qué necesitas para activar producción, qué cambia después y para qué sirve el modo sandbox.",
    categoria: "primeros-pasos",
    palabras:  ["producción", "pruebas", "sandbox", "activar", "validez tributaria", "ambiente", "secuencial"],
  },
  {
    slug:      "como-agregar-o-cambiar-de-empresa",
    titulo:    "Cómo agregar otra empresa o cambiar de empresa",
    resumen:   "Maneja varios RUC desde la misma cuenta: crea una empresa nueva y cambia entre ellas.",
    categoria: "primeros-pasos",
    palabras:  ["varias empresas", "otro ruc", "nueva empresa", "cambiar", "selector", "predeterminada"],
  },

  // ── Firma electrónica ───────────────────────────────────────────
  {
    slug:      "como-subir-tu-firma-electronica",
    titulo:    "Cómo subir tu firma electrónica",
    resumen:   "Carga tu archivo .p12, qué hacer si no se sube y cómo reemplazarlo cuando vence.",
    categoria: "firma-electronica",
    palabras:  ["p12", "certificado", "token", "contraseña", "vencida", "renovar", "reemplazar", "caducada", "ruc no coincide", "inválido"],
  },

  // ── Emisión ─────────────────────────────────────────────────────
  {
    slug:      "como-emitir-una-factura",
    titulo:    "Cómo emitir una factura",
    resumen:   "Cliente, productos, forma de pago y cobro: la factura paso a paso, y qué pasa después.",
    categoria: "emision",
    palabras:  ["facturar", "nueva factura", "consumidor final", "iva incluido", "descuento", "forma de pago", "propina", "cobrada", "pendiente"],
  },
  {
    slug:      "estados-de-un-comprobante",
    titulo:    "Qué significa el estado de mi comprobante",
    resumen:   "Autorizado, en proceso, devuelto, rechazado, en revisión: qué quiere decir cada uno y qué hacer.",
    categoria: "emision",
    palabras:  ["autorizado", "devuelto", "rechazado", "en proceso", "en cola", "en revisión", "error de firma", "no autorizado", "sri", "reintentar"],
  },
  {
    slug:      "como-descargar-o-compartir-una-factura",
    titulo:    "Cómo descargar o enviar una factura a tu cliente",
    resumen:   "Descarga el PDF o el XML, compártela por WhatsApp y entiende cuándo le llega el correo al cliente.",
    categoria: "emision",
    palabras:  ["pdf", "xml", "ride", "enviar", "reenviar", "correo", "email", "whatsapp", "compartir", "imprimir", "térmica"],
  },
  {
    slug:      "clientes-y-productos",
    titulo:    "Cómo guardar tus clientes y productos",
    resumen:   "Guarda clientes y productos para no escribirlos en cada factura, y busca nombres por cédula o RUC.",
    categoria: "emision",
    palabras:  ["clientes", "personas", "productos", "catálogo", "código", "stock", "inventario", "buscar cédula", "código de barras"],
  },
  {
    slug:      "liquidacion-de-compra-y-retencion",
    titulo:    "Liquidación de compra y retención: cuándo y cómo",
    resumen:   "Cuándo emitir una liquidación de compra, cómo hacer una retención y desde qué documento.",
    categoria: "emision",
    palabras:  ["liquidación", "liq", "proveedor sin ruc", "retención", "ret", "retener", "renta", "agente de retención"],
  },

  // ── Notas de crédito y débito ───────────────────────────────────
  {
    slug:      "como-hacer-una-nota-de-credito",
    titulo:    "Cómo hacer una nota de crédito",
    resumen:   "Para devoluciones, descuentos o para dejar sin efecto una factura: total o parcial.",
    categoria: "notas-credito-debito",
    palabras:  ["nota de crédito", "ncr", "devolución", "descuento", "corregir factura", "rebaja", "anulación"],
  },
  {
    slug:      "como-anular-una-factura",
    titulo:    "Cómo anular una factura",
    resumen:   "El plazo para anular, los pasos en el SRI y en Kipu, y qué hacer si ya se pasó la fecha.",
    categoria: "notas-credito-debito",
    palabras:  ["anular", "anulación", "cancelar factura", "factura mal hecha", "error", "sri en línea", "plazo"],
  },
  {
    slug:      "como-hacer-una-nota-de-debito",
    titulo:    "Cómo hacer una nota de débito",
    resumen:   "Para cobrar un valor extra sobre una factura ya emitida, como intereses por mora.",
    categoria: "notas-credito-debito",
    palabras:  ["nota de débito", "ndb", "interés", "mora", "cargo adicional", "cobranza"],
  },

  // ── Recibidos ───────────────────────────────────────────────────
  {
    slug:      "como-registrar-tus-compras",
    titulo:    "Cómo registrar tus compras y gastos",
    resumen:   "Sube el XML de las facturas que te hacen o registra las de papel, y márcalas para tu declaración.",
    categoria: "recibidos",
    palabras:  ["compras", "gastos", "recibidos", "xml", "factura física", "proveedor", "deducible", "crédito tributario", "nota de venta"],
  },

  // ── Declaración de IVA ──────────────────────────────────────────
  {
    slug:      "como-usar-el-reporte-de-iva",
    titulo:    "Cómo usar el reporte de IVA para declarar",
    resumen:   "Kipu arma tu formulario 104 con tus ventas y compras. Así lo revisas y lo pasas al SRI.",
    categoria: "declaracion-iva",
    palabras:  ["104", "formulario", "declaración", "iva", "casilleros", "reportes", "declarado", "sri en línea", "saldo a favor"],
  },

  // ── Cuenta y planes ─────────────────────────────────────────────
  {
    slug:      "planes-de-kipu",
    titulo:    "Planes de Kipu: qué incluye cada uno",
    resumen:   "Gratis, Kipu Pro y Kipu Al Día: qué trae cada plan, cómo contratarlo y cómo cancelarlo.",
    categoria: "cuenta-y-planes",
    palabras:  ["planes", "precio", "pro", "gratis", "suscripción", "pagar", "cancelar", "créditos", "renovar"],
    soloWeb:   true,
  },
  {
    slug:      "como-contratar-kipu-al-dia",
    titulo:    "Cómo contratar Kipu Al Día",
    resumen:   "Quién puede contratarlo, los pasos, cómo guardar tu clave del SRI y cómo cancelar.",
    categoria: "cuenta-y-planes",
    palabras:  ["al día", "declaren por mí", "contador", "clave del sri", "contratar", "cancelar"],
  },
  {
    slug:      "uso-justo",
    titulo:    "Qué es el uso justo del plan gratis",
    resumen:   "Cuántos comprobantes puedes emitir gratis al mes y al día, y cómo pedir que te lo amplíen.",
    categoria: "cuenta-y-planes",
    palabras:  ["límite", "gratis", "cuántas facturas", "ampliación", "nivel", "muy rápido", "por minuto"],
  },
  {
    slug:      "como-invitar-usuarios",
    titulo:    "Cómo dar acceso a tu contador o a tu equipo",
    resumen:   "Invita a otras personas a tu empresa y elige qué puede hacer cada una.",
    categoria: "cuenta-y-planes",
    palabras:  ["usuarios", "invitar", "contador", "permisos", "roles", "equipo", "administrador", "quitar acceso"],
    soloWeb:   true,
  },
  {
    slug:      "como-eliminar-tu-cuenta",
    titulo:    "Cómo eliminar tu cuenta",
    resumen:   "Qué se borra, qué pasa con tus empresas y cómo descargar tus comprobantes antes.",
    categoria: "cuenta-y-planes",
    palabras:  ["eliminar", "borrar cuenta", "darme de baja", "cerrar cuenta", "datos", "privacidad"],
  },
];

/** Los artículos de esta plataforma (en la app, sin los que hablan de planes). */
export const ARTICULOS: ArticuloAyuda[] = ES_APP_NATIVA ? TODOS.filter((a) => !a.soloWeb) : TODOS;

export const categoria = (id: CategoriaAyuda) => CATEGORIAS.find((c) => c.id === id)!;

export const articuloPorSlug = (slug: string) => ARTICULOS.find((a) => a.slug === slug);
