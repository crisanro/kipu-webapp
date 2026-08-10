// app/layout.tsx
import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const viewport: Viewport = {
  themeColor:        "#4f46e5",
  width:             "device-width",
  initialScale:      1,
  maximumScale:      1,
  userScalable:      false,
};

export const metadata: Metadata = {
  title:       "Kipu — Facturación Electrónica",
  description: "Facturación electrónica simple y rápida para Ecuador",
  manifest:    "/manifest.webmanifest",
  appleWebApp: {
    capable:        true,
    statusBarStyle: "black-translucent",
    title:          "Kipu",
  },
  icons: {
    icon:  [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/icons/apple-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body className={`${inter.className} bg-gray-950 text-gray-100 antialiased`}>
        {children}
      </body>
    </html>
  );
}