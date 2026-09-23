# Arquitectura propuesta — CloudMed Trace GT

**CloudColor · “Trazabilidad inteligente de medicamentos para Guatemala”**

Estado: propuesta para revisión, 23 de septiembre de 2026. Esta fase solo documenta; ninguna carpeta de producto, entidad, API o decisión de backend está implementada.

## 1. Inspección del repositorio

- Archivos existentes: `README.md` y `.gitignore`, leídos completos. No existen solución, proyectos, Razor Pages, dependencias, pruebas, base de datos ni documentación previa.
- El README ya define producto, empresa, equipo y frontend Razor Pages; deja backend y base de datos pendientes.
- `.gitignore` contiene exclusiones habituales de Visual Studio, compilación y herramientas; no demuestra que exista un proyecto .NET.
- Rama activa: `main`, sin cambios pendientes antes de esta documentación. HEAD: `eb44560` (`Cambio de ReadMe`), precedido por `e77e939` (`Initial commit`).
- Remoto `origin`: `https://github.com/DominickT17/CloudMedTraceGT.git`. La referencia local `origin/main` coincide con HEAD; `origin/HEAD` apunta a ella. No se hizo fetch: esto no verifica cambios recientes del servidor.
- No aparecen `develop` ni ramas de funcionalidades en las referencias locales. No se encontró `AGENTS.md` en el repositorio ni en los directorios ascendentes revisados.
- Se leyó la configuración Git local: seguimiento de `main` a `origin/main`, configuración estándar del checkout en Windows. No se modificó configuración, ramas ni historial.

## 2. Arquitectura simple con límite de servicios

Razor Pages renderiza HTML en el servidor. Cada página usa `.cshtml` para presentación y `.cshtml.cs` para recibir formularios y preparar datos. Ese C# de presentación no obliga a elegir C# para el backend de negocio. Referencia: [Razor Pages, Microsoft](https://learn.microsoft.com/en-us/aspnet/core/razor-pages/).

```text
Navegador: HTML + Bootstrap + CSS + JavaScript mínimo
    ↓ GET / formularios POST
Razor Pages / PageModel
    ↓ interfaces de servicios por módulo y DTO
Adaptador elegido
    ├─ servicios locales, si backend y web comparten proceso
    └─ cliente HTTP → API REST, si backend es separado
                           ↓
                 reglas de negocio → base relacional
```

Solo se implementará una modalidad. No crear ambos backends ni una plataforma genérica de adaptadores. Las páginas no ejecutarán SQL ni decidirán saldos o bloqueos; llamarán servicios con contratos pequeños. Con API separada, Razor será su consumidor desde el servidor: no hace falta convertir el navegador en SPA. El cliente HTTP podrá usar `IHttpClientFactory`: [documentación de Microsoft](https://learn.microsoft.com/en-us/aspnet/core/fundamentals/http-requests/).

### Opciones de backend pendientes

| Opción | Cuándo elegirla | Costo a considerar |
|---|---|---|
| Servicios C# dentro de la aplicación Razor | El equipo domina C# y prioriza un solo proceso | Mantener reglas fuera de PageModels para permitir extracción posterior |
| API REST ASP.NET Core | El equipo desea separación y domina C# | Dos procesos y configuración de conexión |
| API REST Python/FastAPI u otra tecnología conocida | El equipo tiene más experiencia real con esa tecnología | DTO compartidos por contrato, dos entornos y pruebas de integración |

Elegir backend y base de datos antes del primer módulo persistente. Preferir el motor relacional que todo el equipo pueda ejecutar; SQLite es una candidata para una demo local y SQL Server si ya disponen de instalación común. No usar una base remota compartida sin acordar reinicios y datos de prueba. No se fijan versiones, ORM ni migraciones hasta revisar el entorno del equipo. No habrá microservicios, Kubernetes, blockchain ni colas.

## 3. Modelo conceptual y reglas propuestas

Se conservan **cinco entidades**. Los siguientes refinamientos son propuestas para aprobar antes de crear el esquema.

| Entidad | Campos y significado |
|---|---|
| MEDICAMENTO | MedicamentoId, Nombre, PrincipioActivo, Presentacion, Fabricante, RegistroSanitario |
| LOTE | LoteId, MedicamentoId, NumeroLote, FechaFabricacion, FechaVencimiento, CantidadInicial; Estado como resultado calculado; CodigoQR opcional, preferentemente URL derivada |
| ESTABLECIMIENTO | EstablecimientoId, Nombre, Tipo, Departamento, Municipio |
| MOVIMIENTO | MovimientoId, LoteId, OrigenId, DestinoId, Cantidad, FechaMovimiento, TipoMovimiento |
| ALERTA | AlertaId, LoteId, Tipo, Motivo, Fecha, Activa |

Relaciones: un medicamento tiene muchos lotes; un lote tiene muchos movimientos y alertas. Un establecimiento tiene muchos movimientos como origen y muchos como destino. Cada movimiento pertenece a un lote y a un destino; el origen solo puede faltar en un ingreso inicial. Cada alerta pertenece a un lote. Las referencias deben existir y no se eliminarán registros que tengan historial.

### Cantidades y ubicación: decisión central

**Propuesta: permitir transferencias parciales y calcular existencias desde movimientos**, sin añadir una entidad de inventario en el MVP. Un lote puede estar en varios establecimientos simultáneamente: la pantalla mostrará ubicación y saldo por establecimiento, no el destino del último movimiento como ubicación única.

- Al crear un lote se solicita establecimiento inicial y se registra un único movimiento `INGRESO`, con origen nulo, destino inicial y cantidad igual a CantidadInicial. Lote e ingreso se guardan en una transacción.
- Los demás movimientos son `TRANSFERENCIA`, con origen y destino diferentes y no nulos. No habrá consumos, dispensaciones, devoluciones ni ajustes en este MVP.
- Saldo de un lote en un establecimiento = suma de entradas menos suma de salidas. CantidadInicial es referencia del ingreso, no se suma por segunda vez. La suma de saldos conserva CantidadInicial.
- Cantidades enteras positivas en una unidad acordada por presentación; no mezclar cajas y tabletas para el mismo lote.
- Validar saldo suficiente y estado del lote dentro de la misma transacción que inserta la transferencia. Serializar operaciones concurrentes del mismo lote usando las capacidades del motor elegido; también coordinar la creación de bloqueos para impedir una transferencia que se salte un bloqueo concurrente.
- Historial solo de adición; sin editar o borrar movimientos. El servidor asigna fecha y desempata el orden con MovimientoId. No aceptar fechas retroactivas en la demo.
- Para simplificar la demostración se transferirá la cantidad completa. Si el equipo prefiere prohibir fraccionamientos, debe aprobar esa restricción y actualizar todos los documentos antes de implementar.

NumeroLote será único junto con MedicamentoId, no necesariamente global. Buscar por número puede devolver varios resultados con medicamento/fabricante; detalle, movimientos y verificación usarán LoteId inequívoco. Fechas de fabricación y vencimiento son fechas de calendario; los eventos usan instante UTC y se muestran en horario de Guatemala. Fabricación no puede ser futura ni posterior al vencimiento.

### Estado único y explicable

El backend calcula el estado; todas las páginas consumen el mismo resultado. Propuesta de prioridad visual:

1. `BLOQUEADO`: existe alerta activa de tipo `BLOQUEO`.
2. `VENCIDO`: FechaVencimiento es anterior al día actual de Guatemala.
3. `BAJO_ALERTA`: existe otra alerta activa.
4. `PROXIMO_A_VENCER`: faltan entre 0 y 30 días inclusive.
5. `SEGURO`: ninguno de los anteriores.

Mostrar también todos los motivos: un bloqueo no debe ocultar que el lote venció. Para el prototipo se considera utilizable hasta la fecha de vencimiento inclusive; el umbral y esta convención requieren aprobación. `SEGURO` significa sin incidencias registradas en el prototipo; no certifica autenticidad ni calidad sanitaria.

Propuesta conservadora: rechazar transferencias de lotes bloqueados, vencidos o bajo alerta; permitir próximos a vencer con aviso. Crear una alerta `BLOQUEO` cambia el estado efectivo de inmediato, sin editar un Estado duplicado. Resolver alertas puede aplazarse; si se implementa, se cambia Activa y se conserva el registro y motivo.

## 4. Contratos propuestos

Si se elige API, usar JSON y un prefijo `/api`. Si se eligen servicios locales, mantener operaciones equivalentes. Dóminick mantiene contratos; Yeisson revisa reglas y persistencia. DTO de entrada no permiten al cliente elegir Estado, FechaMovimiento o saldos.

| Operación | Ruta REST propuesta | Responsable funcional |
|---|---|---|
| Listar/crear medicamentos | GET/POST `/api/medicamentos` | Josué |
| Listar/crear establecimientos | GET/POST `/api/establecimientos` | Rodrigo |
| Buscar/crear lotes, consultar detalle | GET/POST `/api/lotes`, GET `/api/lotes/{id}` | Paulo |
| Registrar ingreso inicial | Interno a crear lote, nunca segundo POST desde la página | Paulo + Yeisson |
| Registrar/listar movimientos | POST/GET `/api/movimientos` | Yeisson |
| Consultar recorrido y saldos | GET `/api/lotes/{id}/trazabilidad` | Yeisson |
| Listar/crear alertas | GET/POST `/api/alertas` | Rodrigo |
| Verificar estado actual | GET `/api/lotes/{id}/verificacion` | Paulo |
| Consultar resumen | GET `/api/dashboard` | Dóminick |

Los contratos acordarán nombres JSON, identificadores, fechas ISO 8601, campos requeridos, listas y errores antes del trabajo paralelo. Respuestas sugeridas: 200 consulta, 201 creación, 400 validación, 404 inexistente, 409 duplicado o conflicto de saldo/estado. Un error tendrá código estable, mensaje comprensible y errores por campo. Un timeout al guardar requiere consultar el resultado antes de repetir; no configurar reintentos automáticos para escrituras. Evitar doble envío de formularios y acordar una clave de operación única para impedir transferencias duplicadas por reenvío.

Dashboard: conteo de medicamentos, lotes y establecimientos, alertas activas y lotes próximos a vencer; definir tarjetas sin confundir cantidad de lotes con cantidad de unidades. Verificación y trazabilidad se calculan con los mismos movimientos y estados, nunca con datos duplicados de cada pantalla.

## 5. Estructura futura, no creada en esta fase

```text
docs/                         planificación y contratos acordados
src/CloudMedTraceGT.Web/
  Pages/
    Index.cshtml[.cs]          Dashboard
    Medicamentos/             Index, Create, Details
    Lotes/                    Index, Create, Details
    Establecimientos/         Index, Create, Details
    Movimientos/              Index, Create
    Trazabilidad/             Index, Details
    Alertas/                  Index, Create
    Verificacion/             Index, Details
    Shared/                   _Layout y componentes visuales comunes
  Services/                   contratos y adaptadores por módulo
  ViewModels/                 modelos de presentación por módulo
  wwwroot/css/site.css        estilo común
  wwwroot/css/modules/        solo ajustes particulares necesarios
  wwwroot/js/                 interacción mínima por módulo
  Program.cs                  configuración central
  appsettings.json            valores no secretos
backend/                      SOLO si se elige API separada; estructura según lenguaje
database/                     esquema/migraciones y datos ficticios
tests/                        pruebas de reglas e integración según tecnología
```

`Index.cshtml[.cs]` indica el par `.cshtml` y `.cshtml.cs`. Si se eligen servicios locales, reglas y persistencia residirán en carpetas `Application/` y `Infrastructure/` del proyecto web; no se creará `backend/`. No generar proyectos vacíos por cada capa.

## 6. Interfaz y límites

Bootstrap más un CSS breve: azul para navegación y acciones, verde para estado seguro, blanco y gris claro para fondos. Estados con texto e icono además de color. Navbar: CloudMed Trace GT, Inicio, Medicamentos, Lotes, Establecimientos, Movimientos, Trazabilidad, Alertas; Verificación accesible desde detalle/búsqueda. Marca visible “CloudMed Trace GT” y “by CloudColor”.

Un layout compartido, formularios con etiquetas y validación, tablas adaptables, mensajes vacíos y de error. JavaScript solo cuando aporte interacción. No Blazor, React, Angular o Vue. Formularios protegidos contra falsificación de solicitudes; validación autoritativa en backend y consultas parametrizadas. No usar datos de pacientes ni secretos versionados.

El alcance es una demostración local con datos ficticios. La verificación consulta registros del sistema; no consulta registros oficiales ni valida medicamentos clínicamente. Autenticación productiva y exposición pública quedan fuera; si la evaluación exige usuarios, hay que revisar el alcance antes de implementar.

## 7. Decisiones para la revisión

Confirmar backend, motor de base de datos, entorno común, duración del hackatón, transferencias parciales, unidad de cantidades y reglas de estado. Dóminick y Yeisson documentarán las decisiones aprobadas antes de crear código. Ver [plan](PLAN_TRABAJO.md), [equipo](DIVISION_EQUIPO.md), [Git](GIT_WORKFLOW.md) y [MVP](MVP.md).
