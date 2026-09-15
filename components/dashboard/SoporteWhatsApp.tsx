"use client";

import { useState } from "react";
import { MessageCircle, X } from "lucide-react";

const WHATSAPP_NUMBER = "593960585581";

export function SoporteWhatsApp({ empresa }: { empresa: any }) {
  const [showQR, setShowQR] = useState(false);
  const mensaje = encodeURIComponent(
    `Hola, necesito soporte con Kipu.\nMi correo es: ${empresa?.email ?? ""}\nMi RUC es: ${empresa?.ruc ?? ""}`
  );
  const waUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${mensaje}`;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(waUrl)}`;

  return (
    <div className="relative">
      <button
        onClick={() => setShowQR(!showQR)}
        className="hidden lg:flex p-2 rounded-lg transition-colors"
        style={{ color: "var(--kipu-muted)" }}
        onMouseEnter={(e) => {
          e.currentTarget.style.color = "var(--kipu-success)";
          e.currentTarget.style.background = "color-mix(in srgb, var(--kipu-success) 10%, transparent)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.color = "var(--kipu-muted)";
          e.currentTarget.style.background = "transparent";
        }}
        title="Soporte WhatsApp"
      >
        <MessageCircle size={18} />
      </button>

      <a
        href={waUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="flex lg:hidden items-center gap-2 w-full px-3 py-2 rounded-lg text-sm transition-colors"
        style={{ color: "var(--kipu-muted)" }}
      >
        <MessageCircle size={16} />
        Soporte WhatsApp
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