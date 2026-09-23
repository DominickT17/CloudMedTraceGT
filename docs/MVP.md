# MVP — CloudMed Trace GT

> Actualización: para la API y las reglas implementadas, consultar [API_CONTRATOS.md](API_CONTRATOS.md). Este documento conserva la propuesta histórica; prevalecen las decisiones vigentes del contrato.

**CloudMed Trace GT — Sistema de Trazabilidad de Medicamentos**, desarrollado por **CloudColor**. Frase: “Trazabilidad inteligente de medicamentos para Guatemala”.

Objetivo: demostrar qué medicamento y lote se mueve, cuánto hay, dónde está, de dónde proviene, su recorrido y sus incidencias. El lote es la unidad de trazabilidad. Es un prototipo universitario local con datos ficticios; “SEGURO” expresa ausencia de incidencias registradas, no una certificación sanitaria.

## OBLIGATORIO

| Módulo | Alcance mínimo y aceptación |
|---|---|
| Dashboard | Tarjetas con datos reales de medicamentos, lotes, establecimientos, alertas activas y próximos a vencer; enlaces a módulos |
| Medicamentos | Registrar, listar y consultar nombre, principio activo, presentación, fabricante y registro sanitario |
| Establecimientos | Registrar, listar y consultar nombre, tipo, departamento y municipio |
| Lotes | Registrar con medicamento, número, fechas, cantidad y establecimiento inicial; crear ingreso junto al lote; listar y consultar detalle |
| Movimientos | Registrar transferencias entre establecimientos, mostrar cantidad y fecha; impedir saldo insuficiente, cantidades inválidas y lotes restringidos |
| Trazabilidad | Buscar número de lote, desambiguar con medicamento, mostrar origen, movimientos ordenados y saldos actuales por establecimiento |
| Alertas | Listar y crear alerta con motivo; una alerta activa BLOQUEO cambia el estado de todas las consultas y prohíbe transferencias |
| Verificación | Consultar por LoteId y mostrar medicamento, número, vencimiento, estado, motivos y ubicaciones actuales; funcionar sin QR |

También obligatorio: persistencia tras reiniciar, diseño común Razor/Bootstrap, estados SEGURO/PROXIMO_A_VENCER/VENCIDO/BLOQUEADO/BAJO_ALERTA calculados una sola vez, validación en backend, ingreso único, conservación de cantidades y errores visibles. No basta maquillar el color de un lote bloqueado.

La propuesta permite transferencias parciales mediante saldos derivados de movimientos; requiere aprobación previa. No representa “ubicación actual” con el último destino si queda inventario en otros establecimientos. Reglas y decisiones abiertas: [ARQUITECTURA.md](ARQUITECTURA.md).

## IMPORTANTE

- Filtros sencillos por medicamento/estado y búsqueda clara.
- Formularios accesibles, mensajes vacíos, navegación móvil y uso mediante teclado.
- Datos ficticios consistentes y preparación repetible de la demo en una base aislada.
- Pruebas de límites de vencimiento, cantidades, concurrencia y reenvío de movimientos.
- Documentar arranque, configuración y pasos de ensayo al implementar.
- Si se permite editar catálogos, limitarlo a datos descriptivos sin romper historial; no incluir borrado de registros referenciados.

La presentación visual se ajusta al tiempo, pero la integridad de saldos y bloqueos debe validarse aunque se reduzca la automatización de pruebas.

## SI HAY TIEMPO

- QR que contenga un enlace a la verificación del LoteId. Nunca codificar un estado fijo: debe mostrar el estado actualizado al consultar.
- Lectura con la cámara del teléfono usando su lector habitual; no construir un escáner propio. Para demo con teléfono, preparar conectividad a la aplicación: localhost del PC no es localhost del teléfono.
- Resolver/desactivar una alerta conservando su registro y recalculando estado.
- Gráfica pequeña, exportación simple o mejoras de filtros, después del recorrido obligatorio.

## NO IMPLEMENTAR DURANTE EL HACKATÓN

Microservicios, Kubernetes, blockchain, IA predictiva, integraciones oficiales, inventario nacional real, firma/certificación sanitaria, contabilidad, compras, facturación, pacientes, recetas, dispensación, conversión entre unidades, devoluciones/ajustes complejos, notificaciones externas, aplicación móvil nativa, autenticación y permisos empresariales o despliegue productivo público. Tampoco Blazor ni SPA con React/Angular/Vue.

## Guion de demostración y aceptación

Preparación: datos ficticios; crear Bodega Central, Área de Salud Quetzaltenango y Hospital Regional de Occidente si aún no existen. Confirmar fecha del equipo para que el vencimiento del ejemplo no invalide la demo. Los datos fijos siguientes corresponden a la demostración planteada en septiembre de 2026.

1. Abrir CloudMed Trace GT, observar marca “by CloudColor” y Dashboard.
2. Registrar Amoxicilina 500 mg con los demás campos ficticios claramente identificados.
3. Crear lote AMX-260923, fabricación 01/08/2026, vencimiento 15/08/2027, cantidad inicial 100 unidades y Bodega Central como destino del ingreso. Ver estado SEGURO.
4. Transferir 100 unidades de Bodega Central a Área de Salud Quetzaltenango.
5. Transferir 100 unidades del Área de Salud a Hospital Regional de Occidente.
6. Buscar AMX-260923; mostrar ingreso, ambas transferencias y fechas. Saldos: 0 en Bodega, 0 en Área y 100 en Hospital; cantidad total 100.
7. Crear alerta activa de tipo BLOQUEO con motivo ficticio de demostración.
8. Volver al detalle, trazabilidad y verificación: estado BLOQUEADO con motivo; Dashboard refleja la alerta.
9. Intentar transferir desde Hospital: backend rechaza, no aparece un nuevo movimiento y los saldos siguen iguales.
10. Reiniciar la aplicación y comprobar que lote, historial y alerta permanecen.
11. Si hay QR, escanearlo y verificar que muestra BLOQUEADO en la misma consulta vigente.

Prueba adicional antes de la exposición, con otro lote: ingresar 100 y transferir 40; deben mostrarse 60 en origen y 40 en destino. Buscar un número inexistente debe mostrar “no encontrado”; una falla de servicio debe mostrar error, nunca SEGURO por defecto.

El MVP está terminado cuando los ocho módulos cubren este flujo con persistencia y reglas coherentes, los líderes lo han revisado y el equipo puede repetirlo sin editar directamente la base de datos. QR no condiciona la aceptación.
