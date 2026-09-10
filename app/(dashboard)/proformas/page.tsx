"use client";
import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import { usePermiso } from "@/hooks/usePermiso";
import SinAcceso from "@/components/SinAcceso";
import { useAuthStore } from "@/store/auth.store";
import {
  ClipboardList, Plus, Search,
  CheckCircle2, AlertTriangle, Clock,
} from "lucide-react";

interface Proforma {
  id:              string;
  numero:          string;
  fecha_emision: string;
  fecha_validez: string | null;
  subtotal:      number;
  total_iva:      number;
  total:          number;
  estado:        "VIGENTE" | "FACTURADA";
  vencida:        boolean;
  notas:          string | null;
  cliente: {
    id:              string;
    razon_social:   string;
    identificacion: string;
  } | null;
}

const fmt = (n: number) => `$${n.toFixed(2)}`;

export default function ProformasPage() {
  const puedeVer = usePermiso("emitir");
  if (!puedeVer) return <SinAcceso />;

  const router = useRouter();
  const [proformas, setProformas] = useState<Proforma[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [query,     setQuery]     = useState("");

  const empresa  = useAuthStore((s) => s.empresa);
  const tieneSub = empresa?.suscripcion_activa ?? false;

  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get("/api/v1/app/proformas");
      setProformas(res.data.data ?? []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  const filtradas = proformas.filter((p) => {
    if (!query) return true;
    const q = query.toLowerCase();
    return (
      p.numero?.toLowerCase().includes(q) ||
      p.cliente?.razon_social?.toLowerCase().includes(q) ||
      p.cliente?.identificacion?.includes(q)
    );
  });

  return (
    <div className="p-4 md:p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold" style={{ color: "var(--kipu-text)" }}>Proformas</h1>
          <p className="text-sm" style={{ color: "var(--kipu-subtle)" }}>{proformas.length} registradas</p>
        </div>
        <button
          onClick={() => tieneSub && router.push("/proformas/nueva")}
          disabled={!tieneSub}
          title={!tieneSub ? "Requiere suscripción activa" : undefined}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          style={{
            background: tieneSub ? "var(--kipu-accent)" : "color-mix(in srgb, var(--kipu-text) 8%, transparent)",
            color: tieneSub ? "#FFFFFF" : "var(--kipu-subtle)",
            cursor: tieneSub ? "pointer" : "not-allowed",
          }}
          onMouseEnter={e => {
            if (tieneSub) e.currentTarget.style.background = "var(--kipu-accent-h)";
          }}
          onMouseLeave={e => {
            if (tieneSub) e.currentTarget.style.background = "var(--kipu-accent)";
          }}
        >
          <Plus size={15} />
          Nueva proforma
        </button>
      </div>

      {/* Banner de suscripción */}
      {!tieneSub && (
        <div
          className="flex items-center gap-3 rounded-xl px-4 py-3 mb-4"
          style={{
            background: "color-mix(in srgb, var(--kipu-warning) 10%, transparent)",
            border: "1px solid color-mix(in srgb, var(--kipu-warning) 20%, transparent)",
          }}
        >
          <AlertTriangle size={15} className="shrink-0" style={{ color: "var(--kipu-warning)" }} />
          <div className="flex-1">
            <p className="text-sm font-medium" style={{ color: "var(--kipu-warning)" }}>Suscripción requerida</p>
            <p className="text-xs" style={{ color: "color-mix(in srgb, var(--kipu-warning) 70%, transparent)" }}>
              Las proformas están disponibles con un plan activo.
            </p>
          </div>
          <Link
            href="/planes"
            className="text-xs underline underline-offset-2 shrink-0 transition-colors"
            style={{ color: "var(--kipu-warning)" }}
          >
            Ver planes
          </Link>
        </div>
      )}

      {/* Buscador */}
      <div className="relative mb-4">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--kipu-subtle)" }} />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar por número o cliente..."
          className="w-full pl-9 pr-4 py-2.5 rounded-lg text-sm transition-colors focus:outline-none"
          style={{
            background: "var(--kipu-surface)",
            border: "1px solid var(--kipu-border)",
            color: "var(--kipu-text)",
          }}
          onFocus={e => e.currentTarget.style.borderColor = "var(--kipu-accent)"}
          onBlur={e => e.currentTarget.style.borderColor = "var(--kipu-border)"}
        />
      </div>

      {/* Lista */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div
            className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin"
            style={{ borderColor: "var(--kipu-accent)", borderTopColor: "transparent" }}
          />
        </div>
      ) : filtradas.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <ClipboardList size={40} className="mb-3" style={{ color: "var(--kipu-subtle)" }} />
          <p className="text-sm" style={{ color: "var(--kipu-muted)" }}>
            {query ? "No hay proformas que coincidan." : "Aún no tienes proformas registradas."}
          </p>
          {!query && (
            tieneSub ? (
              <button
                onClick={() => router.push("/proformas/nueva")}
                className="mt-4 px-4 py-2 rounded-lg text-white text-sm font-medium transition-colors"
                style={{ background: "var(--kipu-accent)" }}
                onMouseEnter={e => e.currentTarget.style.background = "var(--kipu-accent-h)"}
                onMouseLeave={e => e.currentTarget.style.background = "var(--kipu-accent)"}
              >
                Crear primera proforma
              </button>
            ) : (
              <Link
                href="/planes"
                className="mt-4 px-4 py-2 rounded-lg text-white text-sm font-medium transition-colors"
                style={{ background: "var(--kipu-warning)" }}
              >
                Ver planes para crear proformas
              </Link>
            )
          )}
        </div>
      ) : (
        <div
          className="rounded-xl overflow-hidden"
          style={{
            background: "var(--kipu-surface)",
            border: "1px solid var(--kipu-border)",
          }}
        >
          <div>
            {filtradas.map((p, index) => {
              const vencida   = p.vencida && p.estado === "VIGENTE";
              const facturada = p.estado === "FACTURADA";
              return (
                <Link
                  key={p.id}
                  href={`/proformas/${p.id}`}
                  className="flex items-center gap-3 px-4 py-3 transition-colors"
                  style={{
                    borderTop: index > 0 ? "1px solid var(--kipu-border)" : "none",
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = "color-mix(in srgb, var(--kipu-text) 4%, transparent)"}
                  onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                >
                  <div
                    className="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
                    style={{
                      background: facturada
                        ? "color-mix(in srgb, var(--kipu-success) 10%, transparent)"
                        : vencida
                        ? "color-mix(in srgb, var(--kipu-danger) 10%, transparent)"
                        : "color-mix(in srgb, #818cf8 10%, transparent)",
                    }}
                  >
                    {facturada
                      ? <CheckCircle2 size={16} style={{ color: "var(--kipu-success)" }} />
                      : vencida
                        ? <AlertTriangle size={16} style={{ color: "var(--kipu-danger)" }} />
                        : <Clock size={16} style={{ color: "#818cf8" }} />
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-mono font-medium" style={{ color: "var(--kipu-accent)" }}>{p.numero}</p>
                    <p className="text-xs truncate" style={{ color: "var(--kipu-subtle)" }}>
                      {p.cliente?.razon_social ?? "Sin cliente"}
                      {p.fecha_validez && (
                        <span
                          className="ml-2"
                          style={{ color: vencida ? "var(--kipu-danger)" : "var(--kipu-subtle)" }}
                        >
                          · vence {p.fecha_validez}
                        </span>
                      )}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-semibold" style={{ color: "var(--kipu-text)" }}>{fmt(p.total)}</p>
                    <p
                      className="text-xs"
                      style={{
                        color: facturada
                          ? "var(--kipu-success)"
                          : vencida
                          ? "var(--kipu-danger)"
                          : "var(--kipu-subtle)",
                      }}
                    >
                      {facturada ? "Facturada" : vencida ? "Vencida" : "Vigente"}
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}