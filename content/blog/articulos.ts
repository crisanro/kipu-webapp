// content/blog/articulos.ts — índice del blog (/blog).
//
// Qué va en el blog: las preguntas que se hacen los clientes de Kipu, con sus
// palabras ("¿tengo que declarar si no vendí nada?"). No va lo técnico: ATS,
// casilleros, resoluciones, porcentajes de retención. Tampoco noticias: cuando
// el SRI cambia algo, se actualiza el artículo que corresponde.
//
// Cómo se escribe:
//   - Arriba, la respuesta corta. Después, párrafos cortos. Tuteo.
//   - Sin cifras que cambian escritas a mano: se importan de content/datos-tributarios.ts.
//   - Enlazar a los otros artículos del blog cuando ayude (/blog/<slug>).
//   - La invitación a Kipu Al Día la pone la página al final; no repetirla en el texto.
//   - Revisado por un contador antes de publicar.
//
// Para agregar uno: crear content/blog/<slug>.mdx y añadirlo aquí. El título y
// el resumen (≈150 caracteres) son lo que sale en Google.

export interface ArticuloBlog {
  slug:        string;
  titulo:      string;
  resumen:     string;
  /** Fecha de la última revisión del contenido (AAAA-MM-DD): sitemap y datos para Google. */
  actualizado: string;
}

export const ARTICULOS_BLOG: ArticuloBlog[] = [
  {
    slug:        "cuando-declarar-el-iva",
    titulo:      "¿Cuándo tengo que declarar el IVA? Fechas según tu RUC",
    resumen:     "Tu fecha límite depende del noveno dígito de tu RUC. Mira qué día te toca y si declaras cada mes o cada seis meses.",
    actualizado: "2026-11-21",
  },
  {
    slug:        "declarar-si-no-vendi-nada",
    titulo:      "¿Tengo que declarar si no vendí nada?",
    resumen:     "Sí: aunque no hayas vendido nada, la declaración se presenta igual. Te explicamos por qué y qué pasa si no lo haces.",
    actualizado: "2026-11-21",
  },
  {
    slug:        "que-pasa-si-me-atraso-con-el-sri",
    titulo:      "¿Qué pasa si me atraso con el SRI?",
    resumen:     "Pagas multa y, si debías impuesto, intereses; y cada mes es más. Qué hacer para ponerte al día lo antes posible.",
    actualizado: "2026-11-21",
  },
  {
    slug:        "acabo-de-sacar-mi-ruc",
    titulo:      "Acabo de sacar mi RUC: ¿y ahora qué tengo que hacer?",
    resumen:     "Las cinco cosas que tienes que hacer desde el primer mes con tu RUC para no tener problemas con el SRI.",
    actualizado: "2026-11-21",
  },
  {
    slug:        "gastos-para-pagar-menos-impuestos",
    titulo:      "¿Qué gastos me sirven para pagar menos impuestos?",
    resumen:     "Los gastos de tu negocio y los de tu familia pueden bajar lo que pagas. La regla de oro: pedir siempre factura a tu nombre.",
    actualizado: "2026-11-21",
  },
  {
    slug:        "como-saber-si-estoy-al-dia-con-el-sri",
    titulo:      "¿Cómo sé si estoy al día con el SRI?",
    resumen:     "Cómo revisar si tienes declaraciones o deudas pendientes, por qué importa y qué hacer si algo te falta.",
    actualizado: "2026-11-21",
  },
  {
    slug:        "necesito-un-contador",
    titulo:      "¿Necesito un contador o puedo declarar yo mismo?",
    resumen:     "Depende de si estás obligado a llevar contabilidad. Cuándo puedes hacerlo tú, cuándo no, y qué te conviene.",
    actualizado: "2026-11-21",
  },
];

export const articuloBlog = (slug: string) => ARTICULOS_BLOG.find((a) => a.slug === slug);
