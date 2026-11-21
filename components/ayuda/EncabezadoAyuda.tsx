"use client";

// Barra superior del Centro de Ayuda: el logo lleva a la portada de la ayuda;
// a la derecha, "Ir al panel" con sesión o "Iniciar sesión" sin ella.

import { useSyncExternalStore } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import { ArrowLeft, LogIn } from "lucide-react";
import { useAuthStore } from "@/store/auth.store";
import { ThemeToggle } from "@/components/dashboard/ThemeToggle";
import { guardarVolver } from "@/lib/volver";

export default function EncabezadoAyuda() {
  const { resolvedTheme } = useTheme();
  const uid = useAuthStore((s) => s.uid);
  const pathname = usePathname();   // tras iniciar sesión vuelve a este artículo
  // El tema y la sesión solo se conocen en el navegador
  const montado = useSyncExternalStore(() => () => {}, () => true, () => false);

  const boton = "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors";

  return (
    <header className="sticky top-0 z-20" style={{ background: "var(--kipu-surface)", borderBottom: "1px solid var(--kipu-border)" }}>
      <div className="max-w-3xl mx-auto px-4 h-14 flex items-center gap-3">
        <Link href="/ayuda" className="flex items-center gap-2" aria-label="Centro de Ayuda de Kipu">
          {montado ? (
            <Image
              src={resolvedTheme === "dark" ? "/images/logo-dark.svg" : "/images/logo.svg"}
              alt="Kipu"
              width={72}
              height={24}
              priority
            />
          ) : (
            <span className="w-[72px] h-[24px]" />
          )}
          <span className="text-sm font-medium" style={{ color: "var(--kipu-subtle)" }}>Ayuda</span>
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
