// lib/reducirLogo.ts
// Reduce el logo de la empresa en el navegador, antes de subirlo: al backend
// solo llega un archivo de pocos KB (máx. 300 px por lado y 100 KB; el backend
// rechaza cualquier cosa más grande). La persona puede elegir una foto de varios MB.
//
//   - Gira bien las fotos del celular (orientación EXIF).
//   - Con transparencia → PNG (la conserva).
//   - Sin transparencia → WebP (o JPG si el navegador no hace WebP), bajando la
//     calidad hasta unos 60 KB.
//   - Si aun así no entra en 100 KB, se achica un poco más.

export const LOGO_LADO_MAX  = 300;          // px (igual que el backend)
export const LOGO_MAX_BYTES = 100 * 1024;   // el backend no acepta más
const LOGO_OBJETIVO_BYTES   = 60 * 1024;    // lo que se busca para las fotos

export interface LogoReducido {
  archivo: File;
  ancho:   number;
  alto:    number;
  bytes:   number;
  url:     string;   // vista previa (liberar con URL.revokeObjectURL)
}

export class LogoNoLegible extends Error {}

async function abrir(archivo: File): Promise<ImageBitmap | HTMLImageElement> {
  if (typeof createImageBitmap === "function") {
    try {
      return await createImageBitmap(archivo, { imageOrientation: "from-image" });
    } catch { /* algunos navegadores no aceptan la opción: probar con <img> */ }
  }
  const url = URL.createObjectURL(archivo);
  try {
    const img = new Image();
    img.decoding = "async";
    img.src = url;
    await img.decode();   // los navegadores actuales ya respetan la orientación EXIF en <img>
    return img;
  } catch {
    throw new LogoNoLegible("No pudimos abrir esa imagen. Prueba con una foto o un PNG/JPG.");
  } finally {
    URL.revokeObjectURL(url);
  }
}

function dibujar(img: ImageBitmap | HTMLImageElement, ancho: number, alto: number): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width  = ancho;
  canvas.height = alto;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new LogoNoLegible("Tu navegador no pudo procesar la imagen.");
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(img, 0, 0, ancho, alto);
  return canvas;
}

function tieneTransparencia(canvas: HTMLCanvasElement): boolean {
  const ctx = canvas.getContext("2d");
  if (!ctx) return false;
  const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
  for (let i = 3; i < data.length; i += 4) if (data[i] < 255) return true;
  return false;
}

function aBlob(canvas: HTMLCanvasElement, tipo: string, calidad?: number): Promise<Blob | null> {
  return new Promise((resolver) => canvas.toBlob(resolver, tipo, calidad));
}

/** La versión más liviana que entra en el límite, o null si no entra. */
async function codificar(canvas: HTMLCanvasElement, transparente: boolean): Promise<Blob | null> {
  const png = await aBlob(canvas, "image/png");
  if (transparente) return png && png.size <= LOGO_MAX_BYTES ? png : null;

  // Logos de colores planos: el PNG suele ser más nítido y más liviano
  if (png && png.size <= LOGO_OBJETIVO_BYTES) return png;

  // Fotos: WebP si el navegador lo hace (Safari viejo devuelve PNG), si no JPG
  const prueba = await aBlob(canvas, "image/webp", 0.9);
  const tipo   = prueba?.type === "image/webp" ? "image/webp" : "image/jpeg";
  let mejor: Blob | null = png && png.size <= LOGO_MAX_BYTES ? png : null;
  for (const calidad of [0.9, 0.82, 0.74, 0.66, 0.58]) {
    const blob = await aBlob(canvas, tipo, calidad);
    if (!blob) continue;
    if (blob.size <= LOGO_MAX_BYTES && (!mejor || blob.size < mejor.size)) mejor = blob;
    if (blob.size <= LOGO_OBJETIVO_BYTES) return blob;
  }
  return mejor;
}

const EXTENSION: Record<string, string> = { "image/png": "png", "image/webp": "webp", "image/jpeg": "jpg" };

export async function reducirLogo(original: File): Promise<LogoReducido> {
  const img = await abrir(original);
  const anchoOriginal = "naturalWidth" in img ? img.naturalWidth : img.width;
  const altoOriginal  = "naturalHeight" in img ? img.naturalHeight : img.height;
  if (!anchoOriginal || !altoOriginal) throw new LogoNoLegible("No pudimos abrir esa imagen. Prueba con una foto o un PNG/JPG.");

  // Solo se achica, nunca se agranda
  let escala = Math.min(1, LOGO_LADO_MAX / Math.max(anchoOriginal, altoOriginal));
  try {
    for (let intento = 0; intento < 6; intento++) {
      const ancho  = Math.max(1, Math.round(anchoOriginal * escala));
      const alto   = Math.max(1, Math.round(altoOriginal * escala));
      const canvas = dibujar(img, ancho, alto);
      const blob   = await codificar(canvas, tieneTransparencia(canvas));
      if (blob) {
        const archivo = new File([blob], `logo.${EXTENSION[blob.type] ?? "png"}`, { type: blob.type });
        return { archivo, ancho, alto, bytes: blob.size, url: URL.createObjectURL(blob) };
      }
      escala *= 0.8;
    }
  } finally {
    if ("close" in img) img.close();
  }
  throw new LogoNoLegible("No pudimos reducir esa imagen. Prueba con una más simple.");
}

/** "18 KB" */
export function pesoLegible(bytes: number): string {
  return bytes < 1024 ? `${bytes} B` : `${Math.round(bytes / 1024)} KB`;
}
