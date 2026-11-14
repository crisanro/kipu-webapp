"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2, UserPlus } from "lucide-react";
import api from "@/lib/api";
import { caja, campo, detalle, fecha } from "../_comun";

interface Contador {
  id: string; nombre: string; identificacion: string; telefono: string | null; email: string;
  activo: boolean; clientes: number; alta_at: string; baja_at: string | null;
}

const VACIO = { email: "", nombre: "", identificacion: "", telefono: "" };

export default function ContadoresPage() {
  const router = useRouter();
  const [lista,    setLista]    = useState<Contador[] | null>(null);
  const [form,     setForm]     = useState(VACIO);
  const [enviando, setEnviando] = useState(false);
  const [error,    setError]    = useState("");
  const [aviso,    setAviso]    = useState("");

  const recargar = useCallback(async () => {
    try {
      const r = await api.get("/api/v1/admin/al-dia/contadores");
      setLista(r.data.data);
    } catch (err: unknown) {
      setError(detalle(err, "No pudimos cargar los contadores."));
    }
  }, []);

  useEffect(() => {
    let vivo = true;
    api.get("/api/v1/admin/al-dia/contadores")
      .then(r => { if (vivo) setLista(r.data.data); })
      .catch((err: unknown) => {
        if (!vivo) return;
        if ((err as { response?: { status?: number } })?.response?.status === 403) router.replace("/equipo");
        else setError(detalle(err, "No pudimos cargar los contadores."));
      });
    return () => { vivo = false; };
  }, [router]);

  const alta = async () => {
    setEnviando(true);
    setError("");
    setAviso("");
    try {
      await api.post("/api/v1/admin/al-dia/contadores", { ...form, telefono: form.telefono || null });
      setAviso(`${form.nombre.toUpperCase()} ya es parte del equipo. Asígnale clientes desde cada cliente.`);
      setForm(VACIO);
      await recargar();
    } catch (err: unknown) {
      setError(detalle(err, "No se pudo dar de alta."));
    } finally {
      setEnviando(false);
    }
  };

  const baja = async (c: Contador) => {
    if (!confirm(`¿Dar de baja a ${c.nombre}? Sus ${c.clientes} clientes quedarán sin contador y deberás reasignarlos. Su historial se conserva.`)) return;
    setError("");
    try {
      const r = await api.post(`/api/v1/admin/al-dia/contadores/${c.id}/desactivar`);
      setAviso(`${c.nombre} dado de baja. ${r.data.clientes_sin_asignar} clientes quedaron sin contador.`);
      await recargar();
    } catch (err: unknown) {
      setError(detalle(err, "No se pudo dar de baja."));
    }
  };

  const completo = form.email.includes("@") && form.nombre.trim().length >= 3 && /^\d{10}(\d{3})?$/.test(form.identificacion);

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-4">
      <Link href="/equipo" className="inline-flex items-center gap-1 text-sm" style={{ color: "var(--kipu-muted)" }}>
        <ArrowLeft size={14} /> Clientes
      </Link>
      <h1 className="text-xl font-bold" style={{ color: "var(--kipu-text)" }}>Contadores de Kipu Al Día</h1>

      {/* Alta */}
      <div className="rounded-xl p-5 space-y-3" style={caja}>
        <p className="font-semibold text-sm flex items-center gap-2" style={{ color: "var(--kipu-text)" }}>
          <UserPlus size={16} style={{ color: "var(--kipu-accent)" }} /> Agregar contador
        </p>
        <p className="text-xs" style={{ color: "var(--kipu-subtle)" }}>
          Primero debe crear su cuenta en Kipu con su correo. Para entrar al panel, invítalo también a la empresa de Kipu.
        </p>
        <div className="grid sm:grid-cols-2 gap-2">
          <input value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} type="email"
                 placeholder="Correo de su cuenta de Kipu" className="px-3 py-2 rounded-lg text-sm" style={campo} />
          <input value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })}
                 placeholder="Nombres y apellidos" className="px-3 py-2 rounded-lg text-sm" style={campo} />
          <input value={form.identificacion} onChange={e => setForm({ ...form, identificacion: e.target.value.replace(/\D/g, "") })}
                 inputMode="numeric" maxLength={13} placeholder="Cédula" className="px-3 py-2 rounded-lg text-sm" style={campo} />
          <input value={form.telefono} onChange={e => setForm({ ...form, telefono: e.target.value })} type="tel"
                 inputMode="tel" maxLength={20} placeholder="Teléfono (opcional)" className="px-3 py-2 rounded-lg text-sm" style={campo} />
        </div>
        <button type="button" onClick={alta} disabled={!completo || enviando}
                className="px-4 py-2 rounded-lg text-white text-sm font-semibold disabled:opacity-50" style={{ background: "var(--kipu-accent)" }}>
          {enviando ? "Guardando..." : "Agregar al equipo"}
        </button>
        {error && <p className="text-sm" style={{ color: "var(--kipu-danger)" }}>{error}</p>}
        {aviso && <p className="text-sm" style={{ color: "var(--kipu-success)" }}>{aviso}</p>}
      </div>

      {/* Lista */}
      <div className="rounded-xl overflow-hidden" style={caja}>
        {!lista ? (
          <div className="flex justify-center py-8"><Loader2 size={18} className="animate-spin" style={{ color: "var(--kipu-subtle)" }} /></div>
        ) : lista.length === 0 ? (
          <p className="p-5 text-sm" style={{ color: "var(--kipu-muted)" }}>Todavía no hay contadores.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs" style={{ color: "var(--kipu-subtle)" }}>
                <th className="px-4 py-2">Contador</th><th className="px-4 py-2">Cédula</th>
                <th className="px-4 py-2">Clientes</th><th className="px-4 py-2">Desde / hasta</th><th />
              </tr>
            </thead>
            <tbody>
              {lista.map(c => (
                <tr key={c.id} style={{ borderTop: "1px solid var(--kipu-border)", opacity: c.activo ? 1 : 0.55 }}>
                  <td className="px-4 py-2.5">
                    <p style={{ color: "var(--kipu-text)" }}>{c.nombre}</p>
                    <p className="text-xs" style={{ color: "var(--kipu-subtle)" }}>{c.email}{c.telefono && ` · ${c.telefono}`}</p>
                  </td>
                  <td className="px-4 py-2.5" style={{ color: "var(--kipu-muted)" }}>{c.identificacion}</td>
                  <td className="px-4 py-2.5" style={{ color: "var(--kipu-muted)" }}>{c.clientes}</td>
                  <td className="px-4 py-2.5 text-xs" style={{ color: "var(--kipu-muted)" }}>
                    {fecha(c.alta_at)} → {c.baja_at ? fecha(c.baja_at) : "activo"}
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    {c.activo && (
                      <button type="button" onClick={() => baja(c)} className="text-xs underline" style={{ color: "var(--kipu-danger)" }}>
                        Dar de baja
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <p className="text-xs" style={{ color: "var(--kipu-subtle)" }}>
        Para reactivar a alguien dado de baja, vuelve a agregarlo con el mismo correo.
      </p>
    </div>
  );
}
