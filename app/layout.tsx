// app/layout.tsx
import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AppProviders } from "./providers";

const inter = Inter({ subsets: ["latin"] });

export const viewport: Viewport = {
  themeColor:    "#059669",
  width:         "device-width",
  initialScale:  1,
  maximumScale:  1,
  userScalable:  false,
};

export const metadata: Metadata = {
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
    apple: [
      { url: "/icon.svg", type: "image/svg+xml" },
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