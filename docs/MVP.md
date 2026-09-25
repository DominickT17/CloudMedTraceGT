# MVP final — CloudMed Trace GT

Prototipo académico CloudColor. “SEGURO” describe registros del sistema, no certifica calidad sanitaria.

| Módulo | Entrega |
|---|---|
| Dashboard | Conteos reales, últimos cinco movimientos, buscador y conexión |
| Medicamentos | Listar, buscar, crear, detalle, editar, eliminar con confirmación |
| Establecimientos | Mismo flujo; tipos amigables y relaciones protegidas |
| Lotes | CRUD validado, búsqueda, cuatro estados, enlaces y QR |
| Movimientos | Listar, detalle, ingreso y traslado parcial; errores de saldo/estado |
| Trazabilidad | Ficha, saldos por ubicación, total y timeline cronológica |
| Alertas | Listar, crear, activar/desactivar y consultar estado actualizado |
| Verificación | Cinco campos públicos mediante handler Razor; apta para LAN |
| QR | Modal, URL visible, PNG descargable con QRCoder 1.8.0 |
| Datos | Seed idempotente con 10 medicamentos, 7 establecimientos y 12 lotes |

Lotes activos = SEGURO o PROXIMO_A_VENCER; próximo = 0–90 días inclusive.
Cualquier alerta activa bloquea. Crear un lote no registra un ingreso.
No se trasladan vencidos/bloqueados; ningún movimiento puede generar saldo negativo.
Sin actualización entre pestañas: volver a consultar o pulsar Actualizar.

Aceptación: recorrer el guion del [README](../README.md), incluidas ubicaciones parciales,
alerta, QR, recuperación de API apagada y estados vacíos. Evidencia en PRUEBAS_FRONTEND.md.
Fuera de alcance: login complejo, nube, Docker, Redis/Celery, GraphQL, blockchain e IA.
No hay despliegue ni publicación Git. Cámara de teléfono y Wi-Fi real: verificación presencial pendiente.
