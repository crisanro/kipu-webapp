# Pendientes

## Riesgos de infraestructura

- No correr Kipu en local hasta que el .env de desarrollo apunte a un bucket R2 de pruebas (hoy apunta a 'kipu'). Revisar la subida de firma (emisor.py:628: borra la carpeta antes de subir la nueva) y dónde guarda R2 los documentos de sandbox.

## Backlog de producto

- **ALTA PRIORIDAD.** Facturas del webhook de Stripe (kipu-core1 stripe_webhook.py:755): si emitir_documento_core falla, la factura del cliente no se reintenta. Debe ir a una cola con reintentos o, como mínimo, quedar marcada como pendiente y avisarme. (Las emisiones automáticas son solo FAC y NC: stripe_webhook FAC, devolucion_service NC, cobros_en_linea FAC; el bloqueo de LIQ/RET sin plan no las afecta.)
- Encabezado de las 5 páginas de emisión: mostrar el ambiente efectivo, con un badge de otro color en pruebas.
- Nueva RET: limpiar las ramas de "créditos" y "plan gratis" del recuadro del resumen; desde que la retención exige Kipu Pro o Al Día ya no se pueden ver (commit aparte).
- kipu-core1 dashboard_service.py:278: health.suscripcion_activa usa sub_estado in ("ACTIVO","TRIAL") sin fechas, distinto de suscripcion_vigente. Hoy no lo lee el front; unificarlo para que no se use por error.
- nueva-empresa/page.tsx:122 pone suscripcion_activa: true al crear la empresa hasta que se vuelve a leer. Debe tomar el valor real de la respuesta del backend.
- cargar() de Configuración hace updateEmpresa({...empresa, firma_ok}) con la empresa capturada antes del cambio; puede pisar en el store campos actualizados por otras tarjetas. Debe refrescar desde el backend o hacer un merge con el estado actual del store.
- Formulario 103: calcular casilleros desde las RET emitidas (usar `casillero_103` del catálogo). Depende de las consultas al contador sobre el periodo del 103 y el casillero del 501.

## Consultas al contador

- ¿El 103 corresponde al periodoFiscal de la retención o al mes de emisión del comprobante de retención? (caso: compra a fin de mes, RET a inicio del mes siguiente)
- Pago a Meta/Google con tarjeta: ¿retiene el IVA el comprador (LIQ + RET 100%) o la emisora de la tarjeta?
- ¿En qué casillero del 103 va el 501 (pago al exterior)? Hoy está deducido, sin tabla oficial: 501A ↔ 421 por descripción idéntica, 501 ↔ 422/472.
