# Pendientes

Actualizado al cierre del 2026-11-26. Lo de producción se prueba con el modo sandbox, no en local.

## Riesgos de infraestructura

- No correr Kipu en local hasta que el .env de desarrollo apunte a un bucket R2 de pruebas (hoy apunta a 'kipu'). Revisar dónde guarda R2 los documentos de sandbox. (La subida de firma ya no borra la anterior antes de tiempo: core 8a89af2.)
- Desplegado el 2026-11-26 sin ver el reinicio en core.kipu.ec/health: confirmar en el panel de despliegue que el backend corre `25f9c3d` (retenciones C y F) y que antes corrió `6cc8678` (suscripción + seguridad).

## Backlog de producto

- **ALTA PRIORIDAD.** Facturas del webhook de Stripe (kipu-core1 stripe_webhook.py, `_emitir_factura_kipu`): si emitir_documento_core falla, la factura del cliente no se reintenta. Debe ir a una cola con reintentos o, como mínimo, quedar marcada como pendiente y avisarme. (Las emisiones automáticas son solo FAC y NC: stripe_webhook FAC, devolucion_service NC, cobros_en_linea FAC; el bloqueo de LIQ/RET sin plan no las afecta.)
- **ALTA PRIORIDAD.** RET sobre documento externo no funciona (API y modo manual del panel): faltan total_sin_impuestos_sustento, importe_total_sustento e impuestos_doc_sustento en RetencionCreate y en DocOrigenSelector. Mientras tanto, el panel no ofrece "Externo" en Nueva RET y la documentación de /emitir/retencion lo marca como no disponible.
- API pública sin rutas para registrar ni listar compras recibidas: un integrador solo puede obtener doc_origen_recibido_id desde el panel. Evaluar POST/GET de recibidos en la API pública junto con la propuesta de RET sobre documento externo.
- Encabezado de las 5 páginas de emisión: mostrar el ambiente efectivo, con un badge de otro color en pruebas.
- Nueva RET: limpiar las ramas de "créditos" y "plan gratis" del recuadro del resumen; desde que la retención exige Kipu Pro o Al Día ya no se pueden ver (commit aparte).
- kipu-core1 dashboard_service.py: health.suscripcion_activa usa sub_estado in ("ACTIVO","TRIAL") sin fechas, distinto de suscripcion_vigente (igual en ~15 sitios más). El trabajo de suscripciones manuales corre cada hora, así que el desfase es de una hora como mucho: se dejó a propósito. Unificarlo si alguien empieza a leerlo para decidir algo.
- Formulario 103: calcular casilleros desde las RET emitidas (usar `casillero_103` del catálogo). Depende de las consultas al contador sobre el periodo del 103 y el casillero del 501.
- Cupo mensual de la API: se lee y luego se suma (acceso.py); varias emisiones a la vez justo en el límite pueden pasarlo por unos pocos comprobantes. Menor.

## Retenciones (fase 2 en producción desde 2026-11-26)

- Revisar en los logs del backend las líneas `[RET-VALIDAR]` (validador, modo log). Si solo salen casos reales: `VALIDAR_RETENCIONES_ESTRICTO=true` en el .env (responde 422) y quitar la protección temporal de la API que rechaza retenciones al exterior (integraciones.py `_rechazar_ret_exterior`), agregando a RetencionCreate los campos del pago al exterior (tipo_regi, pais_efec_pago, aplic_conv_dob_trib, pag_ext_suj_ret_nor_leg, pago_reg_fis).
- D (opcional): reporte en admin de `retencion_overrides` agrupado por código y %, contando empresas distintas (catálogo desactualizado).
- Probar en producción con sandbox: RET con 303 y "Usar otro porcentaje" (8%) con motivo → fila en `retencion_overrides` (origen PANEL, es_sandbox true); 310 eligiendo 0; 326 obliga a elegir el %.
- Generar el ATS de un mes con retenciones emitidas y validarlo en el DIMM del SRI (valores de IVA retenido en su campo, pagoExterior, tpIdProv 03 con tipoProv/denoProv). XSD y ejemplo oficiales en Downloads/ATS.

## Encender después de medir

- `VALIDAR_MONTOS_ESTRICTO`: buscar `[MONTOS] ⚠️` en los logs de producción; si no aparece ninguna (o son casos raros ya revisados), ponerlo en true.
- Clasificación de compras con IA (en main, todo apagado): fijar en requirements.txt las dependencias que trae anthropic (httpx2, httpcore2, jiter, opentelemetry-api, sniffio, truststore); staging con `CLASIFICACION_IA=true`, modo sombra y `CLASIFICACION_IA_EMISORES` = mi empresa; medir con docs/consultas/acierto_ia.sql; pasar a "aplicar" y agregar en /planes la línea "Tus compras clasificadas con IA". `CLASIFICACION_REGLAS` cuando la app nueva esté en las tiendas.

## Por probar (producción, en sandbox)

- /al-dia en la web y en la app: recuadro "Te devolvemos el 100%. Sin preguntas.", pregunta "¿Y si me arrepiento?", contratar lleva a Stripe (cancelar antes de pagar). Pestaña "Más" → grupo "Legal" con los 3 enlaces.
- Panel de admin: "Activar por transferencia" y "Forzar" con una empresa de prueba; en Auditoría, las acciones nuevas con la IP real (no la del servidor).
- Configuración: "Describe tu negocio en una línea" y la actividad económica; detalle de una compra (activo fijo, "Están bien así"); una liquidación recibida no ofrece "Emitir retención".
- Lista del 2026-11-26 en el navegador: listas, copiar, facturar desde otra pantalla, estilos Tailwind en claro/oscuro, hover y focus.

## Cuentas, legal y configuración

- kipu.ec/terminos: confirmar que la sección 7 dice "sin preguntas" y, para Al Día, "Solo la primera vez". Si se republica con otra fecha, cambiar `DOCUMENTOS_REGISTRO["terminos"]` en kipu-core1 app/api/v1/public/registro.py.
- Portal de Stripe: que no permita pasar de Al Día a Pro. Si no lo permite, la app puede usar el portal para tarjeta y cancelación (hoy va por WhatsApp).
- Términos de Al Día (los que se leen antes de pagar, también en la app) nombran "Kipu Pro": si Apple lo objeta, versión 4 con "el sistema de facturación de Kipu".
- Abogado: términos generales, privacidad, tratamiento de datos y términos de Al Día v2/v3. Confirmar que Androga LLC es de Nuevo México y lo tributario de cobrar con la LLC y facturar con el RUC personal.
- `SMTP_DKIM_SELECTOR` en producción.
- Wappti: cuando la emisión de Kipu responda `"es_sandbox": true` (o `"estado": "SANDBOX"`), avisar "Tu empresa en Kipu está en pruebas: esta factura NO es válida ante el SRI".
- Opcional: pedir a los usuarios que ya existen que acepten los términos nuevos al entrar.

## App de las tiendas

- **Enlaces que abren la app en Android:** `public/.well-known/assetlinks.json` ya tiene las dos SHA-256 (firma de apps de Play `DD:72:…:35:C6` y subida `93:DD:…:78:0A`). Después del deploy, revisar en Play Console → Enlaces directos que app.kipu.ec salga verificado.
- **Firma de Android:** `android/key.properties` y `android/kipu-upload.jks` van en `android/` (no en `android/app/`), fuera de git. Huellas para la clave de API de Android (SHA-1: Play `7B:05:…:05:18`, subida `FB:A7:…:92:23`) y para Firebase → app Android (las dos SHA-256).
- iOS: compilar en la Mac (`npm run cap:ios`) y confirmar que el App ID com.androga.kipu tenga "Associated Domains" (applinks:app.kipu.ec). Probar en teléfono: autocompletado del login, onboarding con barra fija y un enlace de correo abriendo la app.
- Compilar con `npm run build:native` y probar en el teléfono contratar Kipu Al Día dentro de la app (Stripe en el navegador de la app y vuelta a /volver-a-la-app).
- Frontend mobile-first: coordinarlo con la otra sesión que trabaja en main.

## Consultas al contador

- ¿El 103 corresponde al periodoFiscal de la retención o al mes de emisión del comprobante de retención? (caso: compra a fin de mes, RET a inicio del mes siguiente)
- Pago a Meta/Google con tarjeta: ¿retiene el IVA el comprador (LIQ + RET 100%) o la emisora de la tarjeta?
- ¿En qué casillero del 103 va el 501 (pago al exterior)? Hoy está deducido, sin tabla oficial: 501A ↔ 421 por descripción idéntica, 501 ↔ 422/472.
- ATS: el XSD pide `denoProv` (la ficha técnica dice "denopr"); Kipu usa el del XSD. Confirmar con un ATS real en el DIMM.
- ATS, régimen fiscal preferente (tipoRegi 03): `denopagoRegFis` pide la denominación del régimen; Kipu no la guarda y pone el nombre del país. ¿Basta o hay que pedirla en la retención?
- Liquidaciones de compra recibidas: ya cuentan como venta en la 102 (casillero 501) y salen del ATS de compras (decisión del 2026-11-26). Confirmar el tratamiento de su retención de IVA en el 104 (hoy solo se avisa).
