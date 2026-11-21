// app/layout.tsx
import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AppProviders } from "./providers";
import { URL_SITIO } from "@/lib/config";

const inter = Inter({ subsets: ["latin"] });

export const viewport: Viewport = {
  themeColor:    "#059669",
  width:         "device-width",
  initialScale:  1,
  maximumScale:  1,
  userScalable:  false,
};

export const metadata: Metadata = {
  // Base de los enlaces canónicos y de Open Graph (/aprende, /ayuda)
  metadataBase: new URL(URL_SITIO),
  title:       "Kipu — Aplicación de facturación y contabilidad",
  description: "Facturación electrónica simple y rápida para Ecuador",
  manifest:    "/manifest.webmanifest",
  appleWebApp: {
    capable:        true,
    statusBarStyle: "black-translucent",
    title:          "Kipu",
  },
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
    ],
    // iOS no acepta SVG como ícono de pantalla de inicio
    apple: [
      { url: "/icons/apple-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body className={`${inter.className} antialiased`}>
        <AppProviders>
          {children}
        </AppProviders>
      </body>
    </html>
  );
}