"use client";

import { useState } from "react";
import { MessageCircle, X } from "lucide-react";
import { auth } from "@/lib/firebase";
import { enlaceWhatsApp, tieneSoporte } from "@/lib/soporte";
import type { Empresa } from "@/store/auth.store";

// Botón de WhatsApp de soporte: en escritorio abre un QR, en móvil WhatsApp
// directo. Solo para Pro y Al Día (lib/soporte.ts): con plan gratis no se
// muestra. Ya no va en el menú (ahí está "Ayuda"): se usa al final de los
// artículos del Centro de Ayuda.
export function SoporteWhatsApp({ empresa }: { empresa: Empresa | null | undefined }) {
  const [showQR, setShowQR] = useState(false);
  if (!tieneSoporte(empresa)) return null;

  const waUrl = enlaceWhatsApp(empresa, auth.currentUser?.email);
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(waUrl)}`;

  const hoverOn = (el: HTMLElement) => {
    el.style.color = "var(--kipu-success)";
    el.style.background = "color-mix(in srgb, var(--kipu-success) 10%, transparent)";
  };
  const hoverOff = (el: HTMLElement) => {
    el.style.color = "var(--kipu-muted)";
    el.style.background = "transparent";
  };

  return (
    <div className="relative">
      {/* Desktop: abre el QR */}
      <button
        onClick={() => setShowQR(!showQR)}
        className="hidden lg:flex p-2 rounded-lg transition-colors"
        style={{ color: "var(--kipu-muted)" }}
        onMouseEnter={(e) => hoverOn(e.currentTarget)}
        onMouseLeave={(e) => hoverOff(e.currentTarget)}
        title="Soporte WhatsApp"
        aria-label="Soporte WhatsApp"
      >
        <MessageCircle size={18} />
      </button>

      {/* Móvil: solo ícono, abre WhatsApp directo */}
      <a
        href={waUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="flex lg:hidden p-2 rounded-lg transition-colors"
        style={{ color: "var(--kipu-muted)" }}
        onMouseEnter={(e) => hoverOn(e.currentTarget)}
        onMouseLeave={(e) => hoverOff(e.currentTarget)}
        title="Soporte WhatsApp"
        aria-label="Soporte WhatsApp"
      >
        <MessageCircle size={18} />
      </a>

      {showQR && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setShowQR(false)} />
          <div
            className="absolute bottom-10 left-0 z-50 rounded-xl p-4 shadow-xl w-56"
            style={{
              background: "var(--kipu-surface)",
              border: "1px solid var(--kipu-border)",
            }}
          >
            <button
              onClick={() => setShowQR(false)}
              className="absolute top-2 right-2 transition-colors"
              style={{ color: "var(--kipu-muted)" }}
            >
              <X size={14} />
            </button>
            <p className="text-xs mb-3 text-center" style={{ color: "var(--kipu-muted)" }}>
              Escanea para chatear por WhatsApp
            </p>
            <img src={qrUrl} alt="QR Soporte WhatsApp" className="w-full rounded-lg" />
            <a
              href={waUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 flex items-center justify-center gap-2 w-full py-2 rounded-lg text-xs font-medium transition-colors"
              style={{ background: "var(--kipu-success)", color: "#ffffff" }}
            >
              <MessageCircle size={13} />
              Abrir WhatsApp
            </a>
          </div>
        </>
      )}
    </div>
  );
}