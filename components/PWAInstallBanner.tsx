"use client";

import { useState, useEffect } from "react";
import { Download, X, Share } from "lucide-react";

// Detectar si es iOS
const isIOS = () =>
  typeof window !== "undefined" &&
  /iphone|ipad|ipod/i.test(navigator.userAgent) &&
  !(window as any).MSStream;

// Detectar si ya está instalada como PWA
const isInStandaloneMode = () =>
  typeof window !== "undefined" &&
  "standalone" in window.navigator &&
  (window.navigator as any).standalone;

export default function PWAInstallBanner() {
  const [prompt,     setPrompt]     = useState<any>(null);
  const [showIOS,    setShowIOS]    = useState(false);
  const [visible,    setVisible]    = useState(false);

  useEffect(() => {
    // Ya instalada — no mostrar nada
    if (isInStandaloneMode()) return;

    const descartado = localStorage.getItem("pwa-install-dismissed");
    if (descartado) return;

    // Android — esperar el evento
    const handler = (e: any) => {
      e.preventDefault();
      setPrompt(e);
      setVisible(true);
    };
    window.addEventListener("beforeinstallprompt", handler);

    // iOS — mostrar instrucciones manuales
    if (isIOS()) {
      setShowIOS(true);
      setVisible(true);
    }

    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const instalar = async () => {
    if (!prompt) return;
    prompt.prompt();
    const result = await prompt.userChoice;
    if (result.outcome === "accepted") setVisible(false);
  };

  const descartar = () => {
    localStorage.setItem("pwa-install-dismissed", "1");
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:w-80 z-50">
      <div
        className="rounded-xl p-4 shadow-xl"
        style={{
          background: "var(--kipu-surface)",
          border: "1px solid color-mix(in srgb, var(--kipu-accent) 30%, transparent)",
          boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.5)",
        }}
      >
        <div className="flex items-start gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: "var(--kipu-accent)" }}
          >
            <img src="/icons/icon-192.png" alt="Kipu" className="w-8 h-8 rounded-lg" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold" style={{ color: "var(--kipu-text)" }}>Instalar Kipu</p>
            {showIOS ? (
              <p className="text-xs mt-0.5" style={{ color: "var(--kipu-subtle)" }}>
                Toca <Share size={11} className="inline mx-0.5" /> y luego{" "}
                <strong style={{ color: "var(--kipu-text)" }}>"Añadir a pantalla de inicio"</strong>
              </p>
            ) : (
              <p className="text-xs mt-0.5" style={{ color: "var(--kipu-subtle)" }}>
                Accede más rápido y recibe notificaciones nativas.
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={descartar}
            className="transition-colors shrink-0"
            style={{ color: "var(--kipu-subtle)" }}
            onMouseEnter={e => e.currentTarget.style.color = "var(--kipu-text)"}
            onMouseLeave={e => e.currentTarget.style.color = "var(--kipu-subtle)"}
          >
            <X size={16} />
          </button>
        </div>

        {/* Solo Android muestra botón de instalar */}
        {!showIOS && (
          <div className="flex gap-2 mt-3">
            <button
              type="button"
              onClick={descartar}
              className="flex-1 py-2 rounded-lg text-xs transition-colors"
              style={{
                border: "1px solid var(--kipu-border)",
                color: "var(--kipu-muted)",
              }}
              onMouseEnter={e => e.currentTarget.style.color = "var(--kipu-text)"}
              onMouseLeave={e => e.currentTarget.style.color = "var(--kipu-muted)"}
            >
              Ahora no
            </button>
            <button
              type="button"
              onClick={instalar}
              className="flex-1 py-2 rounded-lg text-white text-xs font-medium transition-colors flex items-center justify-center gap-1.5"
              style={{ background: "var(--kipu-accent)" }}
              onMouseEnter={e => e.currentTarget.style.background = "var(--kipu-accent-h)"}
              onMouseLeave={e => e.currentTarget.style.background = "var(--kipu-accent)"}
            >
              <Download size={13} />
              Instalar
            </button>
          </div>
        )}

        {/* iOS — solo mostrar el ícono de share */}
        {showIOS && (
          <div
            className="mt-3 flex items-center gap-2 rounded-lg px-3 py-2 text-xs"
            style={{
              background: "color-mix(in srgb, var(--kipu-text) 5%, transparent)",
              color: "var(--kipu-subtle)",
            }}
          >
            <Share size={14} className="shrink-0" style={{ color: "var(--kipu-accent)" }} />
            <p>
              Compartir → Añadir a pantalla de inicio
            </p>
          </div>
        )}
      </div>
    </div>
  );
}