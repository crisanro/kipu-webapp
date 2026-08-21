import { CodeBlock } from "../_components/CodeBlock";
import { AlertBox } from "../_components/EndpointBadge";

// ── Payloads ──────────────────────────────────────────────────────────────────

const FAC_PAYLOAD = `{
  "tipo": "FAC",
  "ruc_emisor": "1234567890001",
  "numero": "001-001-000000001",
  "fecha_emision": "2024-01-15",
  "ambiente": "produccion",            // "pruebas" | "produccion"
  "cliente": {
    "identificacion": "0987654321",
    "tipo_identificacion": "05",        // 04=RUC 05=Cédula 06=Pasaporte
    "razon_social": "Juan Pérez",
    "direccion": "Av. Amazonas 123",
    "email": "juan@ejemplo.com",
    "telefono": "0991234567"
  },
  "items": [
    {
      "codigo_principal": "SVC001",
      "descripcion": "Servicio de consultoría técnica",
      "cantidad": 2,
      "precio_unitario": 150.00,
      "descuento": 0,
      "iva": 15                         // 0 | 5 | 15
    }
  ],
  "forma_pago": [
    {
      "medio": "01",                    // 01=Efectivo 16=Transferencia 19=Tarjeta
      "total": 345.00,
      "plazo": 0,
      "unidad_tiempo": "dias"
    }
  ],
  "info_adicional": {                   // opcional — aparece en el RIDE
    "Contrato": "CONT-2024-001",
    "Observación": "Pago contra entrega"
  }
}`;

const LIQ_PAYLOAD = `{
  "tipo": "LIQ",
  "ruc_emisor": "1234567890001",
  "numero": "001-001-000000001",
  "fecha_emision": "2024-01-15",
  "proveedor": {
    "identificacion": "0987654321001",
    "tipo_identificacion": "04",        // proveedor siempre RUC o cédula
    "razon_social": "Proveedor XYZ S.A.",
    "direccion": "Guayaquil",
    "email": "prov@xyz.com"
  },
  "items": [
    {
      "descripcion": "Servicio de limpieza",
      "cantidad": 1,
      "precio_unitario": 200.00,
      "iva": 15
    }
  ]
}`;

const NCR_PAYLOAD = `{
  "tipo": "NCR",
  "ruc_emisor": "1234567890001",
  "numero": "001-001-000000001",
  "fecha_emision": "2024-01-20",
  "comprobante_modificado": {
    "tipo": "FAC",
    "numero": "001-001-000000001",
    "fecha_emision": "2024-01-15",
    "numero_autorizacion": "2401201234567890001123456789"
  },
  "motivo": "Devolución parcial del bien",
  "cliente": {
    "identificacion": "0987654321",
    "tipo_identificacion": "05",
    "razon_social": "Juan Pérez",
    "email": "juan@ejemplo.com"
  },
  "items": [
    {
      "descripcion": "Devolución — Servicio consultoría",
      "cantidad": 1,
      "precio_unitario": 150.00,
      "iva": 15
    }
  ]
}`;

const NDB_PAYLOAD = `{
  "tipo": "NDB",
  "ruc_emisor": "1234567890001",
  "numero": "001-001-000000002",
  "fecha_emision": "2024-01-22",
  "comprobante_modificado": {
    "tipo": "FAC",
    "numero": "001-001-000000001",
    "fecha_emision": "2024-01-15",
    "numero_autorizacion": "2401201234567890001123456789"
  },
  "motivo": "Ajuste por diferencia de precio acordado",
  "cliente": {
    "identificacion": "0987654321",
    "tipo_identificacion": "05",
    "razon_social": "Juan Pérez",
    "email": "juan@ejemplo.com"
  },
  "items": [
    {
      "descripcion": "Diferencia de precio — Servicio",
      "cantidad": 1,
      "precio_unitario": 50.00,
      "iva": 15
    }
  ]
}`;

const RET_PAYLOAD = `{
  "tipo": "RET",
  "ruc_emisor": "1234567890001",
  "numero": "001-001-000000001",
  "fecha_emision": "2024-01-16",
  "periodo_fiscal": "01/2024",
  "proveedor": {
    "identificacion": "0987654321",
    "tipo_identificacion": "05",
    "razon_social": "Juan Pérez",
    "email": "juan@ejemplo.com"
  },
  "impuestos": [
    {
      "codigo": "1",                    // 1=Renta 2=IVA
      "codigo_retencion": "303",        // código tabla SRI
      "base_imponible": 300.00,
      "porcentaje_retener": 10,
      "valor_retenido": 30.00,
      // referenciar la factura retenida:
      "comprobante_sustento": {
        "tipo": "FAC",
        "numero": "001-001-000000001",
        "fecha_emision": "2024-01-15",
        "numero_autorizacion": "2401201234567890001123456789"
      }
    }
  ]
}`;

const RESPONSE_EXAMPLE = `// HTTP 201 Created
{
  "id": "cmp_01hx7...",
  "tipo": "FAC",
  "numero": "001-001-000000001",
  "clave_acceso": "1501202401234567890011234567890112345678",
  "numero_autorizacion": "2401201234567890001123456789",
  "fecha_autorizacion": "2024-01-15T14:32:10-05:00",
  "ambiente": "produccion",
  "estado": "AUTORIZADO",
  "xml_url": "https://r2.kipufacturacion.com/xml/cmp_01hx7....xml",
  "pdf_url": "https://r2.kipufacturacion.com/pdf/cmp_01hx7....pdf",
  "totales": {
    "subtotal_iva_15": 300.00,
    "subtotal_iva_0": 0,
    "iva_15": 45.00,
    "total": 345.00
  }
}`;

// ── Tipos ──────────────────────────────────────────────────────────────────────

const TIPOS = [
  { id: "FAC", name: "Factura", anchor: "fac" },
  { id: "LIQ", name: "Liquidación de compra", anchor: "liq" },
  { id: "NCR", name: "Nota de crédito", anchor: "ncr" },
  { id: "NDB", name: "Nota de débito", anchor: "ndb" },
  { id: "RET", name: "Comprobante de retención", anchor: "ret" },
];

// ── Component ─────────────────────────────────────────────────────────────────

function DocSection({
  id,
  tipo,
  name,
  desc,
  code,
  notes,
}: {
  id: string;
  tipo: string;
  name: string;
  desc: string;
  code: string;
  notes?: string[];
}) {
  return (
    <section id={id} className="mb-16 scroll-mt-20">
      <div className="flex items-center gap-3 mb-3">
        <span className="font-mono text-xs bg-indigo-600/20 border border-indigo-500/30 text-indigo-300 px-2.5 py-1 rounded">
          {tipo}
        </span>
        <h2 className="text-lg font-semibold text-white">{name}</h2>
      </div>
      <p className="text-slate-400 text-sm mb-4">{desc}</p>
      {notes && (
        <ul className="space-y-1.5 mb-4">
          {notes.map((n) => (
            <li key={n} className="flex gap-2 text-xs text-slate-500">
              <span className="text-indigo-500 shrink-0 mt-0.5">·</span>
              {n}
            </li>
          ))}
        </ul>
      )}
      <CodeBlock code={code} lang={tipo} filename={`emit_${tipo.toLowerCase()}.json`} />
    </section>
  );
}

export default function EmisionPage() {
  return (
    <div className="max-w-4xl mx-auto px-6 py-20">
      {/* Header */}
      <div className="mb-12">
        <p className="text-xs text-indigo-400 font-mono mb-3">EMISIÓN</p>
        <h1 className="text-3xl font-bold text-white mb-4">
          Emitir comprobantes electrónicos
        </h1>
        <p className="text-slate-400 leading-relaxed max-w-2xl">
          Un solo endpoint{" "}
          <code className="font-mono text-indigo-400 text-sm">POST /emit</code>{" "}
          maneja todos los tipos de comprobante. El campo{" "}
          <code className="font-mono text-indigo-400 text-sm">tipo</code>{" "}
          determina el flujo — Kipu firma con XAdES-BES y envía al SRI en tiempo
          real.
        </p>
      </div>

      {/* Tipos nav */}
      <nav className="flex flex-wrap gap-2 mb-12">
        {TIPOS.map((t) => (
          <a
            key={t.anchor}
            href={`#${t.anchor}`}
            className="text-xs border border-white/[0.08] hover:border-indigo-500/40 hover:text-indigo-300 text-slate-400 px-3 py-1.5 rounded-lg transition-colors font-mono"
          >
            {t.id} · {t.name}
          </a>
        ))}
      </nav>

      <AlertBox type="info">
        El endpoint base para todos los tipos es{" "}
        <code className="font-mono text-xs">
          POST /api/v1/public/emit
        </code>
        . Recuerda incluir siempre{" "}
        <code className="font-mono text-xs">X-Idempotency-Key</code> en
        peticiones de emisión.
      </AlertBox>

      {/* FAC */}
      <DocSection
        id="fac"
        tipo="FAC"
        name="Factura"
        desc="Comprobante de venta de bienes o servicios a personas naturales o jurídicas. Es el tipo más común."
        code={FAC_PAYLOAD}
        notes={[
          'tipo_identificacion: 04=RUC, 05=Cédula, 06=Pasaporte, 07=Consumidor final (identificacion="9999999999999")',
          "iva puede ser 0, 5 o 15 según el tarifa vigente del SRI.",
          "Se pueden incluir múltiples formas de pago que sumen el total.",
        ]}
      />

      {/* LIQ */}
      <DocSection
        id="liq"
        tipo="LIQ"
        name="Liquidación de compra"
        desc="Emitida por el comprador cuando el proveedor es persona natural sin obligación tributaria (p.ej. agricultores, artesanos)."
        code={LIQ_PAYLOAD}
        notes={[
          "El emisor actúa como agente de retención automáticamente.",
          "El campo proveedor reemplaza al campo cliente.",
        ]}
      />

      {/* NCR */}
      <DocSection
        id="ncr"
        tipo="NCR"
        name="Nota de crédito"
        desc="Anula parcial o totalmente una factura ya autorizada. Reduce el valor tributario del comprobante original."
        code={NCR_PAYLOAD}
        notes={[
          "Debes referenciar el numero_autorizacion de la factura original.",
          "Los items reflejan el valor a descontar, no el total de la factura.",
          "Si el valor es igual al total de la factura original, es una anulación total.",
        ]}
      />

      {/* NDB */}
      <DocSection
        id="ndb"
        tipo="NDB"
        name="Nota de débito"
        desc="Incrementa el valor de una factura ya emitida por conceptos como intereses de mora, diferencias de precio o gastos adicionales."
        code={NDB_PAYLOAD}
      />

      {/* RET */}
      <DocSection
        id="ret"
        tipo="RET"
        name="Comprobante de retención"
        desc="Documenta las retenciones de IR e IVA aplicadas al proveedor. El agente de retención lo emite al momento del pago."
        code={RET_PAYLOAD}
        notes={[
          "codigo 1=Impuesto a la Renta, 2=IVA.",
          "codigo_retencion: usa los códigos vigentes de la tabla del SRI (303, 310, 341, etc.).",
          "Si retienes IR e IVA de la misma factura, incluye dos objetos en el array impuestos.",
        ]}
      />

      {/* Respuesta */}
      <section className="mb-8">
        <h2 className="text-lg font-semibold text-white mb-2">
          Estructura de la respuesta
        </h2>
        <p className="text-slate-500 text-sm mb-4">
          Una emisión exitosa devuelve{" "}
          <strong className="text-slate-300">HTTP 201</strong> con el comprobante
          autorizado. Si el SRI devuelve errores de validación, recibirás HTTP 422
          con el detalle.
        </p>
        <CodeBlock code={RESPONSE_EXAMPLE} lang="JSON" filename="response.json" />
      </section>
    </div>
  );
}