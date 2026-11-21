"use client";

// Final de la portada y de cada artículo del Centro de Ayuda: qué hacer si la
// guía no resolvió la duda. Depende del plan de la empresa abierta
// (lib/soporte.ts):
//   - Pro / Al Día: WhatsApp con el mensaje ya escrito (RUC, empresa, plan, correo).
//   - Gratis, web: el soporte personalizado viene con Kipu Pro y Kipu Al Día
//     → enlace a planes. El número no se muestra.
//   - Gratis, app: nada. En la app no se ofrecen planes ni pagos (reglas de
//     las tiendas): solo el Centro de Ayuda.
//   - Sin sesión: iniciar sesión (y volver a este mismo artículo) para escribirnos.
//
// La sesión y la empresa están en el navegador: en el HTML estático el bloque
// no sale y aparece al cargar. No hay QR: el servicio externo que lo generaba
// recibía el enlace con el RUC y el correo. wa.me abre WhatsApp Web o la app de
// escritorio, y en el teléfono, WhatsApp.

import { useSyncExternalStore } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogIn, MessageCircle, Sparkles } from "lucide-react";
import { useAuthStore } from "@/store/auth.store";
import { ES_APP_NATIVA } from "@/lib/plataforma";
import { NOMBRE_PLAN, enlaceWhatsApp, planDeSoporte } from "@/lib/soporte";
import { guardarVolver } from "@/lib/volver";

export default function BloqueSoporte() {
  const pathname = usePathname();
  const uid      = useAuthStore((s) => s.uid);
  const email    = useAuthStore((s) => s.email);
  const empresa  = useAuthStore((s) => s.empresa);
  const montado  = useSyncExternalStore(() => () => {}, () => true, () => false);

  if (!montado) return null;

  const plan = planDeSoporte(empresa);

  // ── Sin sesión ────────────────────────────────────────────────
  if (!uid) {
    return (
      <Caja titulo="¿Necesitas más ayuda?">
        <p>
          {ES_APP_NATIVA
            ? "Inicia sesión para escribirnos por WhatsApp si tu plan incluye soporte."
            : "Si tienes Kipu Pro o Kipu Al Día, inicia sesión y escríbenos por WhatsApp desde aquí."}
        </p>
        <Link
          href="/login"
          onClick={() => guardarVolver(pathname)}
          className={BOTON}
          style={{ background: "var(--kipu-accent)", color: "#ffffff" }}
        >
          <LogIn size={16} /> Iniciar sesión
        </Link>
      </Caja>
    );
  }

  // ── Gratis ────────────────────────────────────────────────────
  if (plan === "GRATIS") {
    if (ES_APP_NATIVA) return null;
    return (
      <Caja titulo="¿Necesitas más ayuda?">
        <p>El soporte personalizado está incluido en Kipu Pro y Kipu Al Día.</p>
        <Link
          href="/planes"
          className={BOTON}
          style={{ border: "1px solid var(--kipu-border)", color: "var(--kipu-accent)" }}
        >
          <Sparkles size={16} /> Ver planes
        </Link>
      </Caja>
    );
  }

  // ── Pro / Al Día ──────────────────────────────────────────────
  return (
    <Caja titulo="¿Necesitas más ayuda? Escríbenos">
      <p>
        Te atiende el equipo de Kipu por WhatsApp. El soporte está incluido en tu plan{" "}
        <strong style={{ color: "var(--kipu-text)" }}>{NOMBRE_PLAN[plan]}</strong>
        {empresa?.razon_social && <> de {empresa.razon_social}</>}.
      </p>
      <a
        href={enlaceWhatsApp(empresa, email)}
        target="_blank"
        rel="noopener noreferrer"
        className={BOTON}
        style={{ background: "var(--kipu-success)", color: "#ffffff" }}
      >
        <MessageCircle size={16} /> Escribir por WhatsApp
      </a>
      <p className="text-xs" style={{ color: "var(--kipu-subtle)" }}>
        El mensaje ya lleva tu RUC y tu plan para atenderte más rápido.
      </p>
    </Caja>
  );
}

const BOTON =
  "inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-opacity hover:opacity-90";

function Caja({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <aside
      className="mt-10 rounded-xl p-5 space-y-3 text-sm"
      style={{ background: "var(--kipu-surface)", border: "1px solid var(--kipu-border)", color: "var(--kipu-muted)" }}
    >
      <h2 className="text-base font-bold" style={{ color: "var(--kipu-text)" }}>{titulo}</h2>
      {children}
    </aside>
  );
}
