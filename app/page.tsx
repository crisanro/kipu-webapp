"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { Loader2 } from "lucide-react";
import { tomarVolver } from "@/lib/volver";
import { ES_APP_NATIVA } from "@/lib/plataforma";

export default function RootPage() {
  const router = useRouter();

  useEffect(() => {
    // App de las tiendas: Capacitor responde con esta página (index.html) a
    // cualquier dirección sin extensión (/ayuda/, /dashboard/…) al cargarla
    // entera: recarga, cambio de empresa, enlace externo. Se navega con Next a
    // la que se pidió; Next baja su contenido (.txt), que sí se sirve bien.
    const { pathname, search, hash } = window.location;
    if (ES_APP_NATIVA && pathname !== "/") {
      router.replace(pathname + search + hash);
      return;
    }

    const unsub = onAuthStateChanged(auth, (user) => {
      if (user) {
        router.replace(tomarVolver() ?? "/dashboard");
      } else {
        router.replace("/login");
      }
    });
    return () => unsub();
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--kipu-bg)" }}>
      <Loader2 size={24} className="animate-spin" style={{ color: "var(--kipu-accent)" }} />
    </div>
  );
}