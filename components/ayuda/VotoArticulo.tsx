"use client";

// "¿Te sirvió este artículo? Sí / No" al final de cada artículo de la ayuda.
// Anónimo y sin sesión: POST /api/v1/public/ayuda/voto (el backend guarda solo
// el artículo y el voto, y cuenta uno por artículo e IP al día). Este navegador
// recuerda que ya votó para no volver a preguntar.

import { useState, useSyncExternalStore } from "react";
import { ThumbsDown, ThumbsUp } from "lucide-react";
import api from "@/lib/api";

type Voto = "si" | "no";

const clave = (slug: string) => `kipu-ayuda-voto:${slug}`;

function leer(slug: string): Voto | null {
  try {
    const v = localStorage.getItem(clave(slug));
    return v === "si" || v === "no" ? v : null;
  } catch {
    return null;
  }
}

// Otra pestaña que vota el mismo artículo también actualiza esta
const suscribir = (aviso: () => void) => {
  window.addEventListener("storage", aviso);
  return () => window.removeEventListener("storage", aviso);
};

export default function VotoArticulo({ slug }: { slug: string }) {
  const guardado = useSyncExternalStore(suscribir, () => leer(slug), () => null);
  const montado  = useSyncExternalStore(() => () => {}, () => true, () => false);
  const [recien, setRecien] = useState<Voto | null>(null);
  const voto = recien ?? guardado;

  const votar = (v: Voto) => {
    setRecien(v);
    // Si falla (sin conexión, límite), no se le dice nada: no es su problema
    api.post("/api/v1/public/ayuda/voto", { articulo: slug, util: v === "si" })
      .then(() => { try { localStorage.setItem(clave(slug), v); } catch {} })
      .catch(() => {});
  };

  if (!montado) return <div className="mt-10 h-[60px]" />;

  const boton = "inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors hover:bg-[color-mix(in_srgb,var(--kipu-text)_5%,transparent)]";

  return (
    <div
      className="mt-10 rounded-xl px-5 py-4 flex flex-wrap items-center gap-3 text-sm border border-borde text-tenue"
      aria-live="polite"
    >
      {voto === null ? (
        <>
          <p className="font-semibold mr-auto text-texto">¿Te sirvió este artículo?</p>
          <button type="button" onClick={() => votar("si")} className={boton}
                  style={{ border: "1px solid var(--kipu-border)", color: "var(--kipu-text)" }}>
            <ThumbsUp size={15} /> Sí
          </button>
          <button type="button" onClick={() => votar("no")} className={boton}
                  style={{ border: "1px solid var(--kipu-border)", color: "var(--kipu-text)" }}>
            <ThumbsDown size={15} /> No
          </button>
        </>
      ) : voto === "si" ? (
        <p>¡Gracias! Nos alegra que te haya servido.</p>
      ) : (
        <p>Gracias por contarnos. Usaremos tu respuesta para mejorar este artículo.</p>
      )}
    </div>
  );
}
