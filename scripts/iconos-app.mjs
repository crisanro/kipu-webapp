// scripts/iconos-app.mjs — íconos y pantalla de inicio de la app (Android e iOS)
//
// Uso: npm run iconos
//
// Todo sale del logo de app/icon.svg (el recibo). Si cambia el logo, se corre
// de nuevo y se hace commit de las imágenes. Genera:
//   Android (android/app/src/main/res):
//     · ícono de la app: capa del frente (recibo blanco) sobre fondo verde,
//       capa monocromática (íconos temáticos de Android 13+) y la versión
//       antigua para Android 7 (cuadrado redondeado y círculo)
//     · ic_stat_kipu: ícono de las notificaciones (una sola tinta, Android lo pinta)
//     · splash: pantalla de inicio verde con el recibo, vertical y horizontal
//   iOS (ios/App/App/Assets.xcassets, solo si ya existe `npx cap add ios`):
//     · AppIcon 1024×1024 (sin transparencia: Apple la rechaza) y Splash 2732×2732

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const RAIZ = fileURLToPath(new URL("..", import.meta.url));
const RES = join(RAIZ, "android/app/src/main/res");
const IOS = join(RAIZ, "ios/App/App/Assets.xcassets");

const VERDE  = "#059669";   // --kipu-accent
const OSCURO = "#065f46";   // sello del logo

// ── Piezas del logo (viewBox 0 0 48 62) ───────────────────────────────────────
const logo = readFileSync(join(RAIZ, "app/icon.svg"), "utf8");
const d = (patron) => {
  const m = logo.match(patron);
  if (!m) throw new Error(`No encontré ${patron} en app/icon.svg`);
  return m[1];
};
const RECIBO = d(/<path fill="#059669" d="([^"]+)"/);
const LINEAS = d(/<path fill="#54c3a1" d="([^"]+)"/);
const CHECK  = d(/<path fill="none"[^>]* d="([^"]+)"/);
const SELLO  = { cx: 37.8, cy: 51.8, r: 9.4 };

// Logo centrado en un lienzo de ancho×alto; `alto` = fracción del lado menor
const centrar = (ancho, alto, fraccion) => {
  const s = (Math.min(ancho, alto) * fraccion) / 62;
  return `translate(${(ancho - 48 * s) / 2} ${(alto - 62 * s) / 2}) scale(${s})`;
};

// A color: recibo blanco, líneas verdes, sello verde oscuro con check blanco
// (un aro verde lo separa del recibo)
const aColor = (ancho, alto, fraccion) => `
  <g transform="${centrar(ancho, alto, fraccion)}">
    <path fill="#fff" d="${RECIBO}"/>
    <path fill="${VERDE}" d="${LINEAS}"/>
    <circle cx="${SELLO.cx}" cy="${SELLO.cy}" r="${SELLO.r + 1}" fill="${VERDE}"/>
    <circle cx="${SELLO.cx}" cy="${SELLO.cy}" r="${SELLO.r}" fill="${OSCURO}"/>
    <path fill="none" stroke="#fff" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" d="${CHECK}"/>
  </g>`;

// Una sola tinta (blanco sobre transparente): líneas, aro y check son huecos
const unaTinta = (lado, fraccion) => `
  <defs><mask id="m" maskUnits="userSpaceOnUse" x="-20" y="-20" width="100" height="100">
    <path fill="#fff" d="${RECIBO}"/>
    <path fill="#000" d="${LINEAS}"/>
    <circle cx="${SELLO.cx}" cy="${SELLO.cy}" r="${SELLO.r + 1.8}" fill="#000"/>
    <circle cx="${SELLO.cx}" cy="${SELLO.cy}" r="${SELLO.r}" fill="#fff"/>
    <path fill="none" stroke="#000" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="${CHECK}"/>
  </mask></defs>
  <g transform="${centrar(lado, lado, fraccion)}">
    <rect x="-20" y="-20" width="100" height="100" fill="#fff" mask="url(#m)"/>
  </g>`;

const svg = (ancho, alto, cuerpo) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${ancho}" height="${alto}" viewBox="0 0 ${ancho} ${alto}">${cuerpo}</svg>`;

// Se dibuja grande y se reduce: los bordes quedan suaves también en 24 px
async function png(destino, ancho, alto, cuerpo, { opaco = false } = {}) {
  const escala = Math.max(1, Math.ceil(1024 / Math.max(ancho, alto)));
  let img = sharp(Buffer.from(svg(ancho * escala, alto * escala, cuerpo(ancho * escala, alto * escala))))
    .resize(ancho, alto);
  if (opaco) img = img.flatten({ background: VERDE });
  mkdirSync(dirname(destino), { recursive: true });
  await img.png({ compressionLevel: 9 }).toFile(destino);
}

const DENSIDADES = { mdpi: 1, hdpi: 1.5, xhdpi: 2, xxhdpi: 3, xxxhdpi: 4 };

// ── Android ───────────────────────────────────────────────────────────────────
async function android() {
  for (const [dpi, f] of Object.entries(DENSIDADES)) {
    const mip = join(RES, `mipmap-${dpi}`);
    const capa = Math.round(108 * f);   // capas del ícono adaptable: 108 dp
    const viejo = Math.round(48 * f);   // ícono antiguo (Android 7): 48 dp
    const push = Math.round(24 * f);    // ícono de notificación: 24 dp

    // Frente: el logo ocupa ~la mitad; el círculo seguro es de 66 dp
    await png(join(mip, "ic_launcher_foreground.png"), capa, capa, (w, h) => aColor(w, h, 0.5));
    await png(join(mip, "ic_launcher_monochrome.png"), capa, capa, (w) => unaTinta(w, 0.5));
    await png(join(mip, "ic_launcher.png"), viejo, viejo, (w, h) =>
      `<rect x="${w * 0.04}" y="${h * 0.04}" width="${w * 0.92}" height="${h * 0.92}" rx="${w * 0.2}" fill="${VERDE}"/>${aColor(w, h, 0.62)}`);
    await png(join(mip, "ic_launcher_round.png"), viejo, viejo, (w, h) =>
      `<circle cx="${w / 2}" cy="${h / 2}" r="${w * 0.46}" fill="${VERDE}"/>${aColor(w, h, 0.58)}`);

    await png(join(RES, `drawable-${dpi}`, "ic_stat_kipu.png"), push, push, (w) => unaTinta(w, 0.84));
  }

  // Pantalla de inicio: mismos tamaños que trae la plantilla de Capacitor
  const splash = [
    ["drawable", 480, 320],
    ["drawable-port-mdpi", 320, 480], ["drawable-port-hdpi", 480, 800], ["drawable-port-xhdpi", 720, 1280],
    ["drawable-port-xxhdpi", 960, 1600], ["drawable-port-xxxhdpi", 1280, 1920],
    ["drawable-land-mdpi", 480, 320], ["drawable-land-hdpi", 800, 480], ["drawable-land-xhdpi", 1280, 720],
    ["drawable-land-xxhdpi", 1600, 960], ["drawable-land-xxxhdpi", 1920, 1280],
  ];
  for (const [carpeta, ancho, alto] of splash) {
    await png(join(RES, carpeta, "splash.png"), ancho, alto,
      (w, h) => `<rect width="${w}" height="${h}" fill="${VERDE}"/>${aColor(w, h, 0.3)}`, { opaco: true });
  }
  console.log("✔ Android: ícono, ic_stat_kipu y splash");
}

// ── iOS ───────────────────────────────────────────────────────────────────────
async function ios() {
  if (!existsSync(IOS)) {
    console.log("· iOS: no hay ios/ todavía. En la Mac: npx cap add ios y luego npm run iconos");
    return;
  }
  await png(join(IOS, "AppIcon.appiconset/AppIcon-512@2x.png"), 1024, 1024,
    (w, h) => `<rect width="${w}" height="${h}" fill="${VERDE}"/>${aColor(w, h, 0.62)}`, { opaco: true });
  // iOS recorta la imagen para llenar la pantalla: el logo, chico y al centro
  for (const nombre of ["splash-2732x2732.png", "splash-2732x2732-1.png", "splash-2732x2732-2.png"]) {
    await png(join(IOS, "Splash.imageset", nombre), 2732, 2732,
      (w, h) => `<rect width="${w}" height="${h}" fill="${VERDE}"/>${aColor(w, h, 0.18)}`, { opaco: true });
  }
  console.log("✔ iOS: AppIcon y Splash");
}

await android();
await ios();

// Fondo del ícono adaptable (la plantilla de Capacitor lo trae blanco)
const fondo = join(RES, "values/ic_launcher_background.xml");
if (existsSync(fondo) && !readFileSync(fondo, "utf8").includes(VERDE)) {
  writeFileSync(fondo, readFileSync(fondo, "utf8").replace(/#[0-9A-Fa-f]{6}/, VERDE));
  console.log("✔ Android: fondo del ícono en verde");
}
