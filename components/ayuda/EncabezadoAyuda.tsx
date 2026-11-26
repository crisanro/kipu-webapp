"use client";

// Barra superior del Centro de Ayuda y de /blog: el logo lleva a la portada
// de la sección; a la derecha, "Ir al panel" con sesión o "Iniciar sesión" sin ella.

import { useSyncExternalStore } from "react";
import Link from "next/link";
import LogoKipu from "@/components/auth/LogoKipu";
import { usePathname } from "next/navigation";
import { ArrowLeft, LogIn } from "lucide-react";
import { useAuthStore } from "@/store/auth.store";
import { ThemeToggle } from "@/components/dashboard/ThemeToggle";
import { guardarVolver } from "@/lib/volver";

const SECCIONES = {
  ayuda:   { nombre: "Ayuda",   href: "/ayuda",   etiqueta: "Centro de Ayuda de Kipu" },
  blog:    { nombre: "Blog",    href: "/blog",    etiqueta: "Blog de Kipu" },
};

export default function EncabezadoAyuda({ seccion = "ayuda" }: { seccion?: keyof typeof SECCIONES }) {
  const s = SECCIONES[seccion];
  const uid = useAuthStore((s) => s.uid);
  const pathname = usePathname();   // tras iniciar sesión vuelve a este artículo
  // El tema y la sesión solo se conocen en el navegador
  const montado = useSyncExternalStore(() => () => {}, () => true, () => false);

  const boton = "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors";

  return (
    <header className="sticky top-0 z-20 bg-superficie border-b border-borde">
      <div className="max-w-3xl mx-auto px-4 h-14 flex items-center gap-3">
        <Link href={s.href} className="flex items-center gap-2" aria-label={s.etiqueta}>
          <LogoKipu className="h-5" />
          <span className="text-sm font-medium text-sutil">{s.nombre}</span>
        </Link>

        <div className="ml-auto flex items-center gap-1">
          <ThemeToggle compact />
          {montado && (uid ? (
            <Link href="/dashboard" className={boton} style={{ color: "var(--kipu-accent)" }}>
              <ArrowLeft size={15} /> Ir al panel
            </Link>
          ) : (
            <Link href="/login" onClick={() => guardarVolver(pathname)} className={boton} style={{ color: "var(--kipu-accent)" }}>
              <LogIn size={15} /> Iniciar sesión
            </Link>
          ))}
        </div>
      </div>
    </header>
  );
}
