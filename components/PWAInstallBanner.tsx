// components/PWAInstallBanner.tsx
"use client";

import { useState, useEffect } from "react";
import { Download, X } from "lucide-react";

export default function PWAInstallBanner() {
  const [prompt,  setPrompt]  = useState<any>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const handler = (e: any) => {
      e.preventDefault();
      setPrompt(e);
      // Solo mostrar si no fue descartado antes
      const descartado = localStorage.getItem("pwa-install-dismissed");
      if (!descartado) setVisible(true);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const instalar = async () => {
    if (!prompt) return;
    prompt.prompt();
    const result = await prompt.userChoice;
    if (result.outcome === "accepted") {
      setVisible(false);
    }
  };

  const descartar = () => {
    localStorage.setItem("pwa-install-dismissed", "1");
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:w-80 z-50">
      <div className="bg-gray-900 border border-indigo-500/30 rounded-xl p-4 shadow-xl shadow-black/50">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center shrink-0">
            <img src="/icons/icon-192.png" alt="Kipu" className="w-8 h-8 rounded-lg" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-white">Instalar Kipu</p>
            <p className="text-xs text-gray-400 mt-0.5">
              Accede más rápido y recibe notificaciones nativas.
            </p>
          </div>
          <button
            onClick={descartar}
            className="text-gray-500 hover:text-white transition-colors shrink-0"
          >
            <X size={16} />
          </button>
        </div>
        <div className="flex gap-2 mt-3">
          <button
            onClick={descartar}
            className="flex-1 py-2 rounded-lg border border-gray-700 text-gray-400 hover:text-white text-xs transition-colors"
          >
            Ahora no
          </button>
          <button
            onClick={instalar}
            className="flex-1 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium transition-colors flex items-center justify-center gap-1.5"
          >
            <Download size={13} />
            Instalar
          </button>
        </div>
      </div>
    </div>
  );
}