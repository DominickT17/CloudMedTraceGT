# Contrato REST — CloudMed Trace GT

**CloudColor · Trazabilidad inteligente de medicamentos para Guatemala.**

Contrato implementado para el MVP local. Base: `http://127.0.0.1:8000/api/`.
Razor integra Dashboard, Medicamentos, Establecimientos, Lotes, Movimientos, Trazabilidad, Alertas y Verificación/QR.
No hay datos demo cargados automáticamente ni integración con MSPAS.

## 1. Convenciones

- Enviar JSON con `Content-Type: application/json` y `Accept: application/json`.
- Todas las rutas llevan barra final. IDs: enteros generados por el servidor.
- Las relaciones se envían como IDs; los campos descriptivos adicionales son de solo lectura.
- Fechas de calendario: `YYYY-MM-DD`. Fecha/hora automática: ISO 8601 con zona horaria.
  Django almacena instantes en UTC y usa `America/Guatemala` para el día actual y su representación.
- Listados: arrays JSON sin paginación en este MVP. Catálogos y lotes ordenados por ID;
  movimientos por `fecha_movimiento, id`; alertas por `fecha, id`.
- `POST` exige los campos indicados. `PUT` envía todos los campos obligatorios;
  `PATCH` solo los que cambian. Los campos read-only enviados se ignoran.
- La API local no requiere login, token ni cookies. CORS no es autenticación.
- Orígenes CORS: `http://localhost:5100` y `http://127.0.0.1:5100`.
  Métodos permitidos: GET, POST, PUT, PATCH, DELETE, HEAD y OPTIONS; sin credenciales.
- No reintentar automáticamente escrituras: no se ha implementado una clave de idempotencia.
  Tras una pérdida de conexión, consultar el historial antes de reenviar.

## 2. Rutas y métodos

| Recurso | Listar / crear | Consultar / reemplazar / modificar / eliminar |
|---|---|---|
| Medicamentos | GET, POST `/api/medicamentos/` | GET, PUT, PATCH, DELETE `/api/medicamentos/{id}/` |
| Establecimientos | GET, POST `/api/establecimientos/` | GET, PUT, PATCH, DELETE `/api/establecimientos/{id}/` |
| Lotes | GET, POST `/api/lotes/` | GET, PUT, PATCH, DELETE `/api/lotes/{id}/` |
| Movimientos | GET, POST `/api/movimientos/` | GET, PUT, PATCH, DELETE `/api/movimientos/{id}/` |
| Alertas | GET, POST `/api/alertas/` | GET, PUT, PATCH, DELETE `/api/alertas/{id}/` |

| Consulta adicional | Resultado |
|---|---|
| GET `/api/dashboard/` | Conteos y los cinco movimientos más recientes (sección 12) |
| GET `/api/status/` | Estado de comunicación, sin comprobar inventario |
| GET `/api/` | Índice de recursos del DefaultRouter |
| GET `/api/lotes/buscar/?numero=AMX-260923` | Un lote por número exacto; 400 sin número y 404 si no existe |
| GET `/api/trazabilidad/{numero_lote}/` | Lote, estado, saldos positivos e historial completo |
| GET `/api/verificar/{numero_lote}/` | Solo cinco campos públicos del lote |

Para los números usados en URL, aplicar `encodeURIComponent(numeroLote)`.
Los números con `/` también son admitidos por las consultas de trazabilidad y verificación.

Filtros opcionales sin paquetes adicionales:

- `/api/medicamentos/?buscar=amoxicilina`: nombre o principio activo.
- `/api/lotes/?buscar=AMX`: número de lote.
- `/api/establecimientos/?buscar=Quetzaltenango`: nombre, departamento o municipio.

El filtro busca texto contenido, no coincidencia exacta. Una búsqueda sin resultados
retorna `200 []`. SQLite no ofrece comparación Unicode completa: mayúsculas acentuadas
pueden necesitar la misma escritura. La búsqueda exacta de número distingue mayúsculas.

## 3. Medicamentos

Campos obligatorios de escritura: `nombre` (200), `principio_activo` (200),
`presentacion` (150), `fabricante` (200), `registro_sanitario` (100).
Los números entre paréntesis son longitudes máximas. No se admiten textos vacíos
ni solo espacios. Se recortan espacios en extremos. `registro_sanitario` es único.
`id` es de solo lectura. Unicidad exacta, sensible a mayúsculas en SQLite.

POST `/api/medicamentos/`:

```json
{
  "nombre": "Amoxicilina",
  "principio_activo": "Amoxicilina",
  "presentacion": "500 mg",
  "fabricante": "Fabricante demo",
  "registro_sanitario": "DEMO-RS-001"
}
```

Respuesta `201`: el mismo objeto más `"id": 1` (el ID real puede variar).

## 4. Establecimientos

Campos obligatorios: `nombre` (200), `tipo`, `departamento` (100), `municipio` (100).
`id` es de solo lectura. Tipos: `HOSPITAL`, `CENTRO_SALUD`, `BODEGA`, `AREA_SALUD`,
`FARMACIA_INSTITUCIONAL`. No hay catálogo geográfico oficial integrado.

POST `/api/establecimientos/`:

```json
{
  "nombre": "Bodega Central",
  "tipo": "BODEGA",
  "departamento": "Quetzaltenango",
  "municipio": "Quetzaltenango"
}
```

Respuesta `201`: el mismo objeto más su `id`. Los nombres Bodega Central,
Área de Salud Quetzaltenango y Hospital Regional de Occidente son solo ejemplos
para demostración; no acreditan integración con establecimientos reales.

## 5. Lotes

Campos obligatorios: `medicamento` (ID existente), `numero_lote` (máximo 100, único global),
`fecha_fabricacion`, `fecha_vencimiento`, `cantidad_inicial` (entero > 0).
Vencimiento debe ser estrictamente posterior a fabricación, incluso en PATCH.
No se añade otra restricción de fecha de fabricación futura en esta fase.

POST `/api/lotes/`:

```json
{
  "medicamento": 1,
  "numero_lote": "AMX-260923",
  "fecha_fabricacion": "2026-08-01",
  "fecha_vencimiento": "2027-08-15",
  "cantidad_inicial": 5000
}
```

Respuesta `201` (estado ilustrativo; se recalcula usando el día de consulta):

```json
{
  "id": 1,
  "numero_lote": "AMX-260923",
  "medicamento": 1,
  "medicamento_nombre": "Amoxicilina",
  "fecha_fabricacion": "2026-08-01",
  "fecha_vencimiento": "2027-08-15",
  "cantidad_inicial": 5000,
  "estado": "SEGURO"
}
```

`id`, `medicamento_nombre` y `estado` son de solo lectura. No se almacena ubicación
ni estado. Crear un lote NO crea un ingreso: su saldo comienza en cero.
`cantidad_inicial` es un límite, no una entrada adicional. No puede reducirse
por debajo de los ingresos ya registrados.

### Estado único

1. Cualquier alerta activa (`BLOQUEO`, `RETIRO`, `SOSPECHA`) → `BLOQUEADO`.
2. Fecha de vencimiento anterior al día actual de Guatemala → `VENCIDO`.
3. De 0 a 90 días inclusive hasta vencimiento → `PROXIMO_A_VENCER`.
4. Más de 90 días → `SEGURO`.

En el propio día de vencimiento es `PROXIMO_A_VENCER`. La alerta tiene prioridad
sobre el vencimiento. Desactivar o eliminar la última alerta activa hace que el
estado vuelva a depender de las fechas. No existe `BAJO_ALERTA` en este contrato.
`SEGURO` solo describe los registros del prototipo: no es certificación sanitaria.

## 6. Movimientos y existencias

Obligatorios: `lote`, `destino` (IDs existentes), `cantidad` (entero > 0),
`tipo_movimiento` (`INGRESO` o `TRASLADO`). `origen` es nullable/opcional en INGRESO
pero obligatorio en TRASLADO. En un traslado debe ser distinto de destino.
`id`, `numero_lote`, `origen_nombre`, `destino_nombre`, `fecha_movimiento` son read-only.
La fecha la asigna el servidor al crear y no cambia con PUT/PATCH.

POST `/api/movimientos/`, ingreso inicial o parcial:

```json
{"lote": 1, "origen": null, "destino": 1, "cantidad": 5000, "tipo_movimiento": "INGRESO"}
```

Respuesta `201`:

```json
{
  "id": 1,
  "lote": 1,
  "numero_lote": "AMX-260923",
  "origen": null,
  "origen_nombre": null,
  "destino": 1,
  "destino_nombre": "Bodega Central",
  "cantidad": 5000,
  "fecha_movimiento": "2026-09-23T12:00:00-06:00",
  "tipo_movimiento": "INGRESO"
}
```

Se admiten varios ingresos parciales, cuya suma no puede superar `cantidad_inicial`.
Si se informa `origen` en INGRESO, solo indica procedencia: no resta existencias.
Para mover existencias ya registradas entre establecimientos, usar TRASLADO.
Se permite registrar ingresos de lotes bloqueados o vencidos para registrar su recepción;
no se permite trasladarlos. Un lote próximo a vencer sí admite traslados.

POST `/api/movimientos/`, traslado parcial:

```json
{"lote": 1, "origen": 1, "destino": 2, "cantidad": 2000, "tipo_movimiento": "TRASLADO"}
```

Respuesta `201` con la misma forma de movimiento anterior y los valores correspondientes.
Resultado: 3000 en Bodega Central y 2000 en el establecimiento destino.

**Saldo = ingresos y traslados recibidos − traslados enviados.**
`saldo_en_establecimiento(lote, establecimiento)` devuelve un entero, cero si no hay movimientos.
`saldos_positivos(lote)` devuelve únicamente establecimientos con cantidad > 0.
La suma de saldos equivale a la suma de ingresos, que puede ser menor que cantidad_inicial.

### Edición y borrado seguros

PUT/PATCH/DELETE de movimientos están habilitados por solicitud de esta fase.
Antes de aceptar una modificación se simula el historial completo en orden cronológico,
con la modificación aplicada. Se rechaza si en cualquier paso queda saldo negativo
o se supera el límite de ingresos. Cambiar de lote valida tanto el lote anterior como el nuevo.
Eliminar un ingreso utilizado por un traslado posterior responde 400 y conserva el registro.
Editar o eliminar un traslado usado por otro traslado también se rechaza.
Crear/editar un TRASLADO de un lote actualmente bloqueado o vencido responde 400.
Una alerta nueva no invalida movimientos que ya ocurrieron.

Todas las escrituras REST se validan y guardan dentro de transacciones SQLite `IMMEDIATE`.
Así dos escritores no pueden validar simultáneamente el mismo saldo. Si se agota la
espera de 10 segundos por un bloqueo, se devuelve 409. No se usa `select_for_update()`
porque SQLite no implementa ese bloqueo. La trazabilidad se consulta en una transacción
para devolver una instantánea coherente. Son transacciones cortas para una demo local;
no es una solución de alta concurrencia. Referencia: [transacciones SQLite en Django](https://docs.djangoproject.com/en/5.2/ref/databases/#transactions-behavior).

Las escrituras ordinarias `Model.save()` también validan y usan transacción.
No usar SQL manual, `QuerySet.update/delete`, `bulk_create` o `bulk_update` para
operaciones de negocio: omiten validaciones de modelos. En Admin se deshabilita
el borrado masivo de movimientos para no saltar sus comprobaciones.

## 7. Alertas

Obligatorios: `lote` (ID existente), `tipo` (`BLOQUEO`, `RETIRO`, `SOSPECHA`),
`motivo` (máximo 1000, no vacío). `activa` es booleano y por defecto `true`.
`id`, `numero_lote` y `fecha` son de solo lectura. La fecha es automática e inmutable por API.

POST `/api/alertas/`:

```json
{"lote": 1, "tipo": "SOSPECHA", "motivo": "Ejemplo ficticio para demostración", "activa": true}
```

Respuesta `201`: los campos enviados más `id`, `numero_lote` y `fecha`.
Para resolver sin eliminar: PATCH `/api/alertas/{id}/` con `{"activa": false}`.
DELETE también está disponible; una eliminación válida responde 204.

## 8. Trazabilidad y verificación

GET `/api/trazabilidad/AMX-260923/`:

```json
{
  "lote": {
    "id": 1, "numero_lote": "AMX-260923", "medicamento": 1,
    "medicamento_nombre": "Amoxicilina", "fecha_fabricacion": "2026-08-01",
    "fecha_vencimiento": "2027-08-15", "cantidad_inicial": 5000, "estado": "SEGURO"
  },
  "estado": "SEGURO",
  "saldos": [
    {"establecimiento_id": 1, "establecimiento": "Bodega Central", "cantidad": 3000},
    {"establecimiento_id": 2, "establecimiento": "Hospital Regional de Occidente", "cantidad": 2000}
  ],
  "movimientos": [
    {"id": 1, "lote": 1, "numero_lote": "AMX-260923", "origen": null, "origen_nombre": null,
     "destino": 1, "destino_nombre": "Bodega Central", "cantidad": 5000,
     "fecha_movimiento": "2026-09-23T12:00:00-06:00", "tipo_movimiento": "INGRESO"},
    {"id": 2, "lote": 1, "numero_lote": "AMX-260923", "origen": 1, "origen_nombre": "Bodega Central",
     "destino": 2, "destino_nombre": "Hospital Regional de Occidente", "cantidad": 2000,
     "fecha_movimiento": "2026-09-23T12:05:00-06:00", "tipo_movimiento": "TRASLADO"}
  ]
}
```

No existe tabla de trazabilidad: la respuesta se deriva de los movimientos.
Se desempatan fechas iguales por ID ascendente. Sin movimientos, ambos arrays están vacíos.

GET `/api/verificar/AMX-260923/`:

```json
{
  "medicamento": "Amoxicilina",
  "presentacion": "500 mg",
  "numero_lote": "AMX-260923",
  "fecha_vencimiento": "2027-08-15",
  "estado": "SEGURO"
}
```

No expone IDs, saldos, movimientos, fabricantes ni motivos internos. Django no genera QR; Razor lo genera con la URL pública.
Ambas consultas devuelven 404 si el lote no existe. Los estados de estos ejemplos
son ilustrativos y dependen de la fecha actual y de las alertas activas.

GET `/api/status/` conserva exactamente:

```json
{"sistema": "CloudMed Trace GT", "empresa": "CloudColor", "estado": "API funcionando"}
```

## 9. Errores y códigos

| Código | Uso |
|---|---|
| 200 | Consulta o actualización válida |
| 201 | Recurso creado; se devuelve el objeto con ID |
| 204 | Eliminación válida, sin cuerpo |
| 400 | Campos inválidos, duplicados, saldo insuficiente, lote restringido o borrado protegido |
| 404 | Recurso o número de lote inexistente |
| 405 | Método no permitido en una ruta de solo lectura |
| 409 | SQLite ocupado; consultar antes de reintentar |

Los errores de campos son objetos con listas de mensajes:

```json
{"cantidad": ["La suma de ingresos supera la cantidad inicial del lote."]}
```

Los errores generales usan `detail`:

```json
{"detail": "No se encontró un lote con ese número."}
```

Mensajes exactos de validadores estándar pueden variar; decidir por código HTTP y nombre
de campo, no comparar textos. Las relaciones usan `PROTECT`: no se elimina un medicamento
con lotes, un lote con movimientos/alertas ni un establecimiento referenciado por movimientos.
El rechazo no guarda cambios parciales. El frontend debe mostrar errores y conservar el formulario.

## 10. Admin, migraciones y comprobaciones

Los cinco modelos están registrados en `http://127.0.0.1:8000/admin/`.
Se habilitaron únicamente los componentes incorporados de Django necesarios para Admin:
usuarios, permisos, sesiones, mensajes, plantillas y estáticos. La API permanece sin autenticación.
No se creó un superusuario local ni se añadió un sistema de login al producto.
Para usar Admin, el responsable puede ejecutar `python manage.py createsuperuser`.

Desde `backend/`, con el entorno activado:

```powershell
python manage.py migrate
python manage.py check
python manage.py makemigrations --check
python manage.py test
```

Desde la raíz también se pueden descubrir explícitamente las pruebas con
`backend/.venv/Scripts/python.exe backend/manage.py test core`.
Sin la etiqueta `core`, ejecutar el test runner desde `backend/`.

Migración de dominio: `core/migrations/0001_initial.py`, versionable.
Las migraciones incorporadas de Django crean las tablas del administrador.
SQLite, `.venv` y cachés siguen ignorados. Los tests usan una base de pruebas aislada
que se destruye al terminar. Opcionalmente, `python manage.py seed_demo` carga datos ficticios
en la base local, de forma aditiva e idempotente; ver README.

## 11. Decisiones vigentes frente a la planificación histórica

Esta fase autorizada sustituye las propuestas incompatibles anteriores:

- Número de lote único global, no compuesto con medicamento.
- Umbral de 90 días, cuatro estados; no `BAJO_ALERTA`.
- Nombre del movimiento: `TRASLADO`, no `TRANSFERENCIA`.
- Ingresos separados, parciales y limitados por cantidad_inicial; no ingreso automático al crear lote.
- CRUD de movimientos permitido, condicionado a mantener válido todo el historial.
- Django REST Framework + SQLite dentro de `backend/core`; sin servicios de negocio en Razor.

Se conserva el rechazo de traslados bloqueados o vencidos y la protección de referencias.
No se implementa inventario duplicado ni despliegue público. Dashboard, Alertas, Verificación y QR
son responsabilidad de Dóminick. La fase final completa los CRUD visuales faltantes sin cambiar contratos REST.

## 12. Dashboard

GET `/api/dashboard/` (solo lectura):

```json
{
  "medicamentos": 0,
  "lotes_activos": 0,
  "alertas_activas": 0,
  "movimientos": 0,
  "ultimos_movimientos": []
}
```

Ejemplo de base vacía. En una base con movimientos, el array contiene hasta cinco objetos
con exactamente los campos del serializer de movimientos de la sección 6.
Se ordena por fecha_movimiento descendente y después ID descendente.
El frontend muestra nombres, no IDs; origen null se presenta como “Ingreso inicial”.
Los conteos incluyen toda la base, no solo los datos demo.
Lotes activos = SEGURO o PROXIMO_A_VENCER: vencimiento >= día local de Guatemala
sin ninguna alerta activa. No cuenta VENCIDO/BLOQUEADO ni duplica lotes por alertas.
Cuenta alertas activas, no lotes bloqueados. Con base vacía todos los conteos son 0 y el array es [].
Las consultas se realizan dentro de una transacción para obtener una instantánea coherente.
POST responde 405. Los endpoints existentes permanecen sin cambios.

## 13. Consumidores Razor y QR

- Todos los módulos administrativos usan api.js sobre /api/ del mismo origen; timeout de 8 s. Razor reenvía las rutas conocidas a CloudMedApi:BaseUrl, sin publicar loopback al navegador.
- `/Verificar?lote=NUMERO` es la página pública.
- `GET /Verificar?handler=Datos&lote=NUMERO` consulta el endpoint público Django desde
  Razor (6 s) y proyecta sus cinco campos: 200, 400 sin número válido, 404 inexistente,
  503 si Django no está disponible. Respuestas sin caché.
- `GET /Verificar?handler=Qr&lote=NUMERO` devuelve image/png local con QRCoder.
  Codifica solamente `{PublicBaseUrl}/Verificar?lote=NUMERO_CODIFICADO`.
  Este handler valida formato/longitud, no existencia; la interfaz muestra QR solo tras
  consultar correctamente el lote. No es una firma ni prueba de autenticidad.
- PublicBaseUrl permite una dirección LAN sin cambiar endpoints ni exponer Django al teléfono.
  Configuración y límites de red en README.
- `/Trazabilidad?lote=NUMERO` muestra ficha, saldos e historial cronológico.
- `GET /Verificar?handler=Enlace&lote=NUMERO` devuelve `{ "url": "...", "local": true }`; comparte PublicBaseUrl con Qr.
- `GET /Verificar?handler=Qr&lote=NUMERO&descargar=true` descarga PNG con nombre `QR_NUMERO.png` sanitizado.
- El modal QR se reutiliza desde Dashboard, Lotes y Trazabilidad. Datos/Enlace/Qr no se cachean.
