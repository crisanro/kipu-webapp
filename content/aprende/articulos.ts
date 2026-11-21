// content/aprende/articulos.ts — índice de /aprende (impuestos en Ecuador).
//
// Para agregar un artículo: crear content/aprende/<slug>.mdx y añadirlo aquí.
// El título y el resumen son lo que sale en Google: el título con la duda tal
// como la escribe la gente, el resumen (≈150 caracteres) con la respuesta corta.
// Los datos que cambian (tarifas, fechas) se importan de content/datos-tributarios.ts.

export interface ArticuloAprende {
  slug:        string;
  titulo:      string;
  resumen:     string;
  /** Fecha de la última revisión del contenido (AAAA-MM-DD): sitemap y datos para Google. */
  actualizado: string;
}

export const ARTICULOS_APRENDE: ArticuloAprende[] = [
  {
    slug:        "cuando-declarar-el-iva",
    titulo:      "¿Cuándo tengo que declarar el IVA? Fechas según tu RUC",
    resumen:     "La fecha límite para declarar el IVA en Ecuador depende del noveno dígito de tu RUC. Te explicamos si te toca mensual o semestral y qué día vence.",
    actualizado: "2026-11-21",
  },
];

export const articuloAprende = (slug: string) => ARTICULOS_APRENDE.find((a) => a.slug === slug);
