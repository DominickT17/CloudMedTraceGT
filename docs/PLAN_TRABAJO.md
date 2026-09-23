# Plan de trabajo — CloudMed Trace GT

Propuesta pendiente de revisión. La única entrega actual son los cinco documentos de `docs/`. No hay tareas de implementación ejecutadas.

## Etapas y dependencias

No se conoce la duración del hackatón. Los porcentajes distribuyen el tiempo disponible; no son horas prometidas. Reservar el último 20 % para integración, errores y ensayo.

| Etapa | Tiempo | Trabajo | Dependencia y salida verificable |
|---|---:|---|---|
| 0. Acuerdo | 10 % | Revisar alcance, backend, BD, unidad, movimientos parciales, estados y responsables | Cinco documentos aprobados y decisiones registradas |
| 1. Base común | 15 % | Dóminick: proyecto Razor, layout, navegación y contratos. Yeisson: persistencia, esquema y reglas centrales | Aplicación inicia en los cinco equipos; contrato mínimo y datos ficticios definidos |
| 2. Catálogos y lotes | 20 % | Josué: medicamentos. Rodrigo: establecimientos. Paulo: lotes. Líderes: soporte, revisión y movimiento transaccional | Crear medicamento y establecimiento, luego lote + ingreso atómico persistente |
| 3. Flujo principal | 20 % | Yeisson: transferencias y trazabilidad. Rodrigo: alertas. Paulo: verificación. Dóminick: dashboard real | Dos transferencias visibles, cantidades correctas, bloqueo consistente |
| 4. Integración completa | 15 % | Conectar todos los módulos, estados vacíos/errores, pruebas de reglas y resolución de conflictos | Recorrido de demostración completo desde una base limpia |
| 5. Estabilización | 20 % | Congelar funcionalidades, corregir defectos, revisar móvil y ensayar presentación | Repetir demo sin intervención manual en BD; versión candidata para main |

QR solo si las etapas obligatorias ya pasan y no consume la reserva final. Si falta tiempo, recortar extras de [MVP](MVP.md); no sacrificar persistencia, saldo correcto o bloqueo para decorar.

## Lo primero que debe funcionar

1. Aprobar las decisiones abiertas de [arquitectura](ARQUITECTURA.md).
2. Acordar rutas, DTO, errores, estados y quién edita cada archivo compartido.
3. Crear base común una vez que se autorice implementar. Integrarla antes de que cada integrante empiece su módulo.
4. Completar la primera operación vertical: medicamento + establecimiento + lote + ingreso, guardados y recuperados tras reiniciar.
5. Registrar una transferencia válida y rechazar una imposible antes de añadir la segunda transferencia y el timeline.
6. Añadir alerta de bloqueo, consumir estado central desde todas las páginas y completar dashboard/verificación.

## Trabajo paralelo permitido

- Después de la base común: catálogos de medicamentos y establecimientos son independientes. Paulo puede preparar páginas de lotes usando contratos y datos ficticios mientras llegan ambos catálogos; las escrituras reales esperan sus claves.
- Yeisson desarrolla el servicio de movimientos y las pruebas de saldo mientras Dóminick mantiene layout, contratos y componentes de estado.
- Rodrigo desarrolla alertas después de integrar establecimientos; usa LoteId y el evaluador central de Yeisson.
- Paulo desarrolla verificación después de lotes; consume trazabilidad y estado compartidos, no crea otro cálculo.
- Dóminick completa dashboard al disponer de consultas reales. Los datos ficticios temporales deben retirarse de los adaptadores activos antes de la demo.
- Cada integrante realiza validación de su módulo y una revisión cruzada; los líderes mantienen la revisión final. Paralelizar personas no significa editar juntos configuración, esquema o CSS global.

## Integración recomendada

Base/contratos → medicamentos y establecimientos → lotes e ingreso inicial → movimientos y trazabilidad → alertas y verificación → dashboard final y QA → QR opcional.

Los líderes deben integrar entregas pequeñas a `develop` durante el desarrollo; no esperar cinco módulos completos al final. Un contrato que cambia se comunica antes de integrarlo y se actualiza junto con todos sus consumidores afectados.

## Criterio de terminado de cada módulo

- Arranca desde `develop` actualizado y usa layout/contratos comunes.
- Resuelve caso correcto, datos inválidos, registros inexistentes y listas vacías.
- Guarda/consulta datos persistentes donde corresponde; no simula éxito ante fallo del servicio.
- Incluye evidencia reproducible en su PR y no toca carpetas ajenas sin coordinación.
- Pasa revisión de Dóminick o Yeisson; el autor no aprueba su propio PR.

## Validación y ensayo final

Yeisson verifica reglas de saldo, ingreso único, transacciones y concurrencia. Dóminick coordina compilación, navegación, presentación y contrato completo. Cada dueño valida sus formularios.

Casos mínimos: cantidades cero/negativas/excesivas; origen igual a destino; lote inexistente; duplicado medicamento+número; rechazo de transferencia bloqueada/vencida/bajo alerta; umbral de 30 días; creación atómica lote-ingreso; envío duplicado; dos transferencias simultáneas que compiten por saldo. Comprobar una transferencia parcial: ambos establecimientos conservan el saldo correspondiente y el total no cambia.

Ensayar el guion de [MVP](MVP.md) con datos ficticios reiniciables en entorno de demo, sin borrar una base compartida. Reiniciar la aplicación para verificar persistencia. Mostrar fallos de API de forma clara, sin convertirlos en “lote seguro”. Probar navegación móvil, teclado y estados con texto. QR, si existe, debe abrir la misma verificación actualizada tras el bloqueo.

## Coordinación

Al iniciar y cerrar cada bloque de trabajo, cada integrante comunica qué terminó, qué contrato necesita y qué lo bloquea. Los líderes mantienen una lista corta de pendientes y asignan un único dueño por conflicto. Al llegar a estabilización solo entran correcciones necesarias para la demo.
