// components/configuracion/TabCreditos.tsx
"use client";

import { useState } from "react";
import { clsx } from "clsx";
import { Loader2, AlertTriangle } from "lucide-react";
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
      const res = await api.post("/api/v1/app/creditos/stripe/checkout", { plan_id: planId });
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
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
        <h2 className="text-sm font-semibold text-white mb-4">Balance actual</h2>
        <div className="flex gap-4">
          <div className="flex-1 bg-gray-800 rounded-lg p-4 text-center">
            <p className="text-3xl font-bold text-white">{creditos?.balance_emision ?? 0}</p>
            <p className="text-xs text-gray-500 mt-1">Créditos de emisión</p>
          </div>
          <div className="flex-1 bg-gray-800 rounded-lg p-4 text-center">
            <p className="text-3xl font-bold text-white">{creditos?.balance_recepcion ?? 0}</p>
            <p className="text-xs text-gray-500 mt-1">Créditos de recepción</p>
          </div>
        </div>
        <p className="text-xs text-gray-600 mt-3 text-center">
          Los créditos no vencen — úsalos cuando quieras
        </p>
      </div>

      {/* Planes */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
        <h2 className="text-sm font-semibold text-white mb-4">Recargar créditos</h2>

        {/* Bloquear si está en ambiente de pruebas */}
        {ambiente !== 2 && (
          <div className="flex items-center gap-3 bg-amber-500/10 border border-amber-500/20 rounded-lg px-4 py-3 mb-4">
            <AlertTriangle size={15} className="text-amber-400 shrink-0" />
            <p className="text-xs text-amber-300">
              Solo puedes comprar créditos cuando estés en <strong>ambiente de producción</strong>.
            </p>
          </div>
        )}

        {planes.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-4">No hay planes disponibles.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {planes.map((p) => {
              const sinIva  = p.precio / 100;
              const conIva  = sinIva * (1 + IVA);
              const porFact = sinIva / p.cantidad;

              return (
                <div
                  key={p.id}
                  className={clsx(
                    "relative border rounded-xl p-4 transition-colors",
                    p.popular
                      ? "border-indigo-500 bg-indigo-500/10"
                      : "border-gray-700 bg-gray-800"
                  )}
                >
                  {p.popular && (
                    <span className="absolute -top-2 left-4 bg-indigo-600 text-white text-xs px-2 py-0.5 rounded-full font-medium">
                      Popular
                    </span>
                  )}

                  <div className="flex items-center justify-between mb-1">
                    <span className="text-lg font-bold text-white">{p.cantidad} créditos</span>
                    <div className="text-right">
                      <p className="text-sm font-bold text-indigo-400">${conIva.toFixed(2)}</p>
                      <p className="text-xs text-gray-500">IVA inc.</p>
                    </div>
                  </div>

                  <p className="text-xs text-gray-500">{p.nombre}</p>
                  <p className="text-xs text-gray-600 mt-0.5">
                    ${porFact.toFixed(3)} por factura + IVA
                  </p>

                  {/* Stripe */}
                  <button
                    onClick={() => iniciarPago(p.id)}
                    disabled={pagando === p.id }//|| ambiente !== 2}
                    className="mt-3 w-full py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-medium transition-colors flex items-center justify-center gap-2"
                  >
                    {pagando === p.id
                      ? <Loader2 size={12} className="animate-spin" />
                      : "💳 Pagar con tarjeta"
                    }
                  </button>

                  {/* Transferencia */}
                  <button
                    onClick={() =>
                      window.open(
                        `https://wa.me/${process.env.NEXT_PUBLIC_WHATSAPP_SOPORTE}?text=${encodeURIComponent(
                          `Hola, quiero comprar el plan ${p.nombre} de ${p.cantidad} créditos por $${conIva.toFixed(2)} (IVA inc.)`
                        )}`,
                        "_blank"
                      )
                    }
                    disabled={ambiente !== 2}
                    className="mt-2 w-full py-1.5 rounded-lg border border-gray-600 text-gray-400 hover:text-white disabled:opacity-50 text-xs font-medium transition-colors"
                  >
                    📱 Pagar por transferencia
                  </button>
                </div>
              );
            })}
          </div>
        )}
        <p className="text-xs text-gray-600 mt-4 text-center">
          Precios en USD · Los créditos se acreditan automáticamente tras el pago
        </p>
      </div>
    </div>
  );
}