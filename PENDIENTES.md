# Pendientes

## Bloqueos de despliegue

- Fase 1 (retenciones): no desplegar hasta una emisión real en sandbox desde el navegador, juntos.

## Riesgos de infraestructura

- No correr Kipu en local hasta que el .env de desarrollo apunte a un bucket R2 de pruebas (hoy apunta a 'kipu'). Revisar la subida de firma (emisor.py:628: borra la carpeta antes de subir la nueva) y dónde guarda R2 los documentos de sandbox.

## Backlog de producto

- Encabezado de las 5 páginas de emisión: mostrar el ambiente efectivo, con un badge de otro color en pruebas.

## Consultas al contador

- ¿El 103 corresponde al periodoFiscal de la retención o al mes de emisión del comprobante de retención? (caso: compra a fin de mes, RET a inicio del mes siguiente)
- Pago a Meta/Google con tarjeta: ¿retiene el IVA el comprador (LIQ + RET 100%) o la emisora de la tarjeta?
