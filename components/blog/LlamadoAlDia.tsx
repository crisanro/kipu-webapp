"use client";

// Final de cada artículo del blog: invitación a Kipu Al Día.
//   - Sin sesión (casi todos los que llegan de Google): crear cuenta, o iniciar
//     sesión y llegar directo a /al-dia. Es la versión que va en el HTML, la que
//     leen los buscadores.
//   - Con sesión y sin Al Día: a /al-dia a contratarlo.
//   - Con Al Día: "esto ya lo hacemos por ti".
// El precio no se escribe aquí: lo da el backend en /al-dia (así no queda viejo).
// /blog solo existe en la web (lib/plataforma.ts), así que se puede nombrar Kipu Pro.

import { useSyncExternalStore } from "react";
import Link from "next/link";
import { CalendarCheck, CheckCircle2 } from "lucide-react";
import { useAuthStore } from "@/store/auth.store";
import { planDeSoporte } from "@/lib/soporte";
import { guardarVolver } from "@/lib/volver";

const BOTON = "inline-flex items-center justify-center px-5 py-2.5 rounded-xl text-sm font-semibold transition-all active:scale-[0.97]";

export default function LlamadoAlDia() {
  const uid     = useAuthStore((s) => s.uid);
  const empresa = useAuthStore((s) => s.empresa);
  const montado = useSyncExternalStore(() => () => {}, () => true, () => false);

  const conSesion = montado && !!uid;
  const tieneAlDia = conSesion && planDeSoporte(empresa) === "AL_DIA";

  return (
    <aside
      className="mt-12 rounded-2xl p-6 md:p-7 space-y-3"
      style={{
        background: "linear-gradient(135deg, color-mix(in srgb, var(--kipu-accent) 14%, var(--kipu-surface)), var(--kipu-surface))",
        border:     "1px solid color-mix(in srgb, var(--kipu-accent) 30%, transparent)",
      }}
    >
      <div className="flex items-center gap-2">
        <CalendarCheck size={18} style={{ color: "var(--kipu-accent)" }} />
        <span className="text-sm font-semibold" style={{ color: "var(--kipu-accent)" }}>Kipu Al Día</span>
      </div>

      {tieneAlDia ? (
        <>
          <p className="text-xl font-extrabold" style={{ color: "var(--kipu-text)" }}>Esto ya lo hacemos por ti.</p>
          <p className="text-sm" style={{ color: "var(--kipu-muted)" }}>
            Con Kipu Al Día, nuestro equipo presenta tus declaraciones a tiempo. Puedes ver cómo vas en tu panel.
          </p>
          <Link href="/al-dia" className={BOTON} style={{ border: "1px solid var(--kipu-border)", color: "var(--kipu-accent)" }}>
            <CheckCircle2 size={16} className="mr-2" /> Ver mi Kipu Al Día
          </Link>
        </>
      ) : (
        <>
          <p className="text-xl md:text-2xl font-extrabold leading-tight" style={{ color: "var(--kipu-text)" }}>
            Tú facturas. Nosotros declaramos.
          </p>
          <p className="text-sm max-w-xl" style={{ color: "var(--kipu-muted)" }}>
            Cada mes revisamos tus ventas y compras, te mandamos el resumen por WhatsApp y presentamos tus
            declaraciones de IVA y renta al SRI, a tiempo. Incluye todo Kipu Pro. Cancelas cuando quieras.
          </p>
          <div className="flex flex-wrap items-center gap-3 pt-1">
            {conSesion ? (
              <Link href="/al-dia" className={`${BOTON} text-white bg-[var(--kipu-accent)] hover:bg-[var(--kipu-accent-h)]`}>
                Quiero que declaren por mí
              </Link>
            ) : (
              <>
                <Link href="/register" className={`${BOTON} text-white bg-[var(--kipu-accent)] hover:bg-[var(--kipu-accent-h)]`}>
                  Crear mi cuenta gratis
                </Link>
                <Link href="/login" onClick={() => guardarVolver("/al-dia")}
                      className="text-sm font-medium underline underline-offset-2" style={{ color: "var(--kipu-accent)" }}>
                  Ya tengo cuenta
                </Link>
              </>
            )}
          </div>
          {/* Lo mismo que app/legal/kipu_al_dia_v1.md ("Para quién es") y al_dia_service.motivo_no_elegible */}
          <p className="text-xs" style={{ color: "var(--kipu-subtle)" }}>
            Para personas naturales no obligadas a llevar contabilidad, del régimen general o del RIMPE Emprendedor.
          </p>
        </>
      )}
    </aside>
  );
}
