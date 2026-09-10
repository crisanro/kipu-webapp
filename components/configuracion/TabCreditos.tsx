"use client";

import { useState } from "react";
import { AlertTriangle } from "lucide-react";
import api from "@/lib/api";

interface Plan {
  id:       number;
  nombre:   string;
  cantidad: number;
  precio:   number;
  popular:  boolean;
}

interface Props {
  creditos: any;
  planes:   Plan[];
  ambiente: number;
}

const IVA = parseFloat(process.env.NEXT_PUBLIC_IVA_RATE ?? "0.15");

export default function TabCreditos({ creditos, planes, ambiente }: Props) {
  const [pagando, setPagando] = useState<number | null>(null);

  const iniciarPago = async (planId: number) => {
    setPagando(planId);
    try {
      const res = await api.post("/api/v1/app/planes/stripe/checkout", { plan_id: planId });
      window.location.href = res.data.checkout_url;
    } catch (err: any) {
      alert(err?.response?.data?.detail ?? "Error al iniciar el pago.");
    } finally {
      setPagando(null);
    }
  };

  return (
    <div className="space-y-4">

      {/* Balance */}
      <div
        className="rounded-xl p-5"
        style={{
          background: "var(--kipu-surface)",
          border: "1px solid var(--kipu-border)",
        }}
      >
        <h2 className="text-sm font-semibold mb-4" style={{ color: "var(--kipu-text)" }}>Balance actual</h2>
        <div className="flex gap-4">
          <div
            className="flex-1 rounded-lg p-4 text-center"
            style={{ background: "color-mix(in srgb, var(--kipu-text) 5%, transparent)" }}
          >
            <p className="text-3xl font-bold" style={{ color: "var(--kipu-text)" }}>{creditos?.balance_emision ?? 0}</p>
            <p className="text-xs mt-1" style={{ color: "var(--kipu-subtle)" }}>Créditos de emisión</p>
          </div>
          <div
            className="flex-1 rounded-lg p-4 text-center"
            style={{ background: "color-mix(in srgb, var(--kipu-text) 5%, transparent)" }}
          >
            <p className="text-3xl font-bold" style={{ color: "var(--kipu-text)" }}>{creditos?.balance_recepcion ?? 0}</p>
            <p className="text-xs mt-1" style={{ color: "var(--kipu-subtle)" }}>Créditos de recepción</p>
          </div>
        </div>
        <p className="text-xs mt-3 text-center" style={{ color: "var(--kipu-subtle)" }}>
          Los créditos no vencen — úsalos cuando quieras
        </p>
      </div>

      {/* Planes */}
      <div
        className="rounded-xl p-5"
        style={{
          background: "var(--kipu-surface)",
          border: "1px solid var(--kipu-border)",
        }}
      >
        <h2 className="text-sm font-semibold mb-4" style={{ color: "var(--kipu-text)" }}>Recargar créditos</h2>

        {/* Bloquear si está en ambiente de pruebas */}
        {ambiente !== 2 && (
          <div
            className="flex items-center gap-3 rounded-lg px-4 py-3 mb-4 text-xs"
            style={{
              background: "color-mix(in srgb, var(--kipu-warning) 10%, transparent)",
              border: "1px solid color-mix(in srgb, var(--kipu-warning) 20%, transparent)",
              color: "var(--kipu-warning)",
            }}
          >
            <AlertTriangle size={15} className="shrink-0" />
            <p>
              Solo puedes comprar créditos cuando estés en <strong>ambiente de producción</strong>.
            </p>
          </div>
        )}

        {planes.length === 0 ? (
          <p className="text-sm text-center py-4" style={{ color: "var(--kipu-subtle)" }}>No hay planes disponibles.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {planes.map((p) => {
              const sinIva  = p.precio / 100;
              const conIva  = sinIva * (1 + IVA);
              const porFact = sinIva / p.cantidad;

              return (
                <div
                  key={p.id}
                  className="relative rounded-xl p-4 transition-colors"
                  style={{
                    border: p.popular
                      ? "1px solid var(--kipu-accent)"
                      : "1px solid var(--kipu-border)",
                    background: p.popular
                      ? "color-mix(in srgb, var(--kipu-accent) 8%, transparent)"
                      : "color-mix(in srgb, var(--kipu-text) 3%, transparent)",
                  }}
                >
                  {p.popular && (
                    <span
                      className="absolute -top-2 left-4 text-white text-xs px-2 py-0.5 rounded-full font-medium"
                      style={{ background: "var(--kipu-accent)" }}
                    >
                      Popular
                    </span>
                  )}

                  <div className="flex items-center justify-between mb-1">
                    <span className="text-lg font-bold" style={{ color: "var(--kipu-text)" }}>{p.cantidad} créditos</span>
                    <div className="text-right">
                      <p className="text-sm font-bold" style={{ color: "var(--kipu-accent)" }}>${conIva.toFixed(2)}</p>
                      <p className="text-xs" style={{ color: "var(--kipu-subtle)" }}>IVA inc.</p>
                    </div>
                  </div>

                  <p className="text-xs" style={{ color: "var(--kipu-subtle)" }}>{p.nombre}</p>
                  <p className="text-xs mt-0.5" style={{ color: "var(--kipu-muted)" }}>
                    ${porFact.toFixed(3)} por factura + IVA
                  </p>

                  {/* Stripe */}
                  <button
                    type="button"
                    onClick={() => iniciarPago(p.id)}
                    disabled={pagando === p.id}
                    className="mt-3 w-full py-1.5 rounded-lg text-white text-xs font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                    style={{ background: "var(--kipu-accent)" }}
                    onMouseEnter={e => {
                      if (pagando !== p.id) e.currentTarget.style.background = "var(--kipu-accent-h)";
                    }}
                    onMouseLeave={e => {
                      if (pagando !== p.id) e.currentTarget.style.background = "var(--kipu-accent)";
                    }}
                  >
                    {pagando === p.id ? (
                      <div
                        className="w-3.5 h-3.5 border-2 border-t-transparent rounded-full animate-spin"
                        style={{ borderColor: "#FFFFFF", borderTopColor: "transparent" }}
                      />
                    ) : (
                      "💳 Pagar con tarjeta"
                    )}
                  </button>

                  {/* Transferencia */}
                  <button
                    type="button"
                    onClick={() =>
                      window.open(
                        `https://wa.me/${process.env.NEXT_PUBLIC_WHATSAPP_SOPORTE}?text=${encodeURIComponent(
                          `Hola, quiero comprar el plan ${p.nombre} de ${p.cantidad} créditos por $${conIva.toFixed(2)} (IVA inc.)`
                        )}`,
                        "_blank"
                      )
                    }
                    disabled={ambiente !== 2}
                    className="mt-2 w-full py-1.5 rounded-lg text-xs font-medium transition-colors disabled:opacity-50"
                    style={{
                      border: "1px solid var(--kipu-border)",
                      color: "var(--kipu-muted)",
                      background: "transparent",
                    }}
                    onMouseEnter={e => {
                      if (ambiente === 2) {
                        e.currentTarget.style.color = "var(--kipu-text)";
                        e.currentTarget.style.borderColor = "color-mix(in srgb, var(--kipu-text) 30%, transparent)";
                      }
                    }}
                    onMouseLeave={e => {
                      if (ambiente === 2) {
                        e.currentTarget.style.color = "var(--kipu-muted)";
                        e.currentTarget.style.borderColor = "var(--kipu-border)";
                      }
                    }}
                  >
                    📱 Pagar por transferencia
                  </button>
                </div>
              );
            })}
          </div>
        )}
        <p className="text-xs mt-4 text-center" style={{ color: "var(--kipu-subtle)" }}>
          Precios en USD · Los créditos se acreditan automáticamente tras el pago
        </p>
      </div>
    </div>
  );
}