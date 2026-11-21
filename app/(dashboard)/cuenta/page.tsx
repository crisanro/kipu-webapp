"use client";

// Mi cuenta: la de la persona (no la de la empresa). Sin permisos: cualquier
// usuario debe poder eliminar su cuenta (lo exigen Apple y Google).

import { useState } from "react";
import { CircleUser, Trash2 } from "lucide-react";
import { auth } from "@/lib/firebase";
import EliminarCuenta from "@/components/cuenta/EliminarCuenta";

const caja = { background: "var(--kipu-surface)", border: "1px solid var(--kipu-border)" };

export default function CuentaPage() {
  const [eliminando, setEliminando] = useState(false);
  const email = auth.currentUser?.email ?? "";

  return (
    <div className="p-4 md:p-6 max-w-xl mx-auto space-y-5">
      <div>
        <h1 className="text-xl font-bold" style={{ color: "var(--kipu-text)" }}>Mi cuenta</h1>
        <p className="text-sm" style={{ color: "var(--kipu-subtle)" }}>Tu usuario para entrar a Kipu</p>
      </div>

      <div className="rounded-xl p-4 flex items-center gap-3" style={caja}>
        <CircleUser size={20} style={{ color: "var(--kipu-subtle)" }} />
        <div className="min-w-0">
          <p className="text-xs" style={{ color: "var(--kipu-subtle)" }}>Correo</p>
          <p className="text-sm font-medium truncate" style={{ color: "var(--kipu-text)" }}>{email}</p>
        </div>
      </div>

      <div className="rounded-xl p-4 space-y-3" style={caja}>
        <h2 className="flex items-center gap-2 text-sm font-semibold" style={{ color: "var(--kipu-danger)" }}>
          <Trash2 size={15} /> Eliminar mi cuenta
        </h2>
        {eliminando ? (
          <EliminarCuenta onCancelar={() => setEliminando(false)} />
        ) : (
          <>
            <p className="text-sm" style={{ color: "var(--kipu-muted)" }}>
              Borra tu usuario y tus datos. Si eres el único usuario de una empresa, también se
              eliminan la empresa y sus comprobantes. Antes de confirmar te mostramos qué pasará con cada una.
            </p>
            <button
              type="button"
              onClick={() => setEliminando(true)}
              className="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              style={{ border: "1px solid color-mix(in srgb, var(--kipu-danger) 40%, transparent)", color: "var(--kipu-danger)" }}
            >
              Quiero eliminar mi cuenta
            </button>
          </>
        )}
      </div>
    </div>
  );
}
