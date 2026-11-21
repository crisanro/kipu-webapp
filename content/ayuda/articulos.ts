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
  { id: "notas-credito-debito", nombre: "Notas de crédito y débito", descripcion: "Corrige o modifica una factura ya emitida." },
  { id: "recibidos",            nombre: "Comprobantes recibidos",    descripcion: "Registra tus compras y gastos." },
  { id: "declaracion-iva",      nombre: "Declaración de IVA",        descripcion: "El formulario 104 y tus reportes." },
  { id: "cuenta-y-planes",      nombre: "Cuenta y planes",           descripcion: "Tu usuario, tu empresa y tu plan." },
];

export interface ArticuloAyuda {
  slug:      string;
  titulo:    string;            // también es el <title> de la página
  resumen:   string;            // una línea: se ve en listas y es la descripción para buscadores
  categoria: CategoriaAyuda;
  palabras:  string[];          // lo que la gente escribiría al buscarlo (sin repetir el título)
}

export const ARTICULOS: ArticuloAyuda[] = [
  {
    slug:      "como-empezar-a-facturar",
    titulo:    "Cómo empezar a facturar en Kipu",
    resumen:   "Los pasos para dejar tu empresa lista y emitir tu primera factura autorizada por el SRI.",
    categoria: "primeros-pasos",
    palabras:  ["empezar", "configurar", "primera factura", "producción", "pruebas", "sandbox", "establecimiento", "punto de emisión"],
  },
  {
    slug:      "como-subir-tu-firma-electronica",
    titulo:    "Cómo subir tu firma electrónica",
    resumen:   "Carga tu archivo .p12 para que Kipu firme tus comprobantes, y cómo reemplazarlo cuando vence.",
    categoria: "firma-electronica",
    palabras:  ["p12", "certificado", "token", "contraseña", "vencida", "renovar", "reemplazar", "caducada"],
  },
];

export const categoria = (id: CategoriaAyuda) => CATEGORIAS.find((c) => c.id === id)!;

export const articuloPorSlug = (slug: string) => ARTICULOS.find((a) => a.slug === slug);
