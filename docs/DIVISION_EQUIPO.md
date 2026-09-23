# División del equipo — CloudMed Trace GT

Cinco ramas de trabajo propuestas, una por integrante, reutilizadas durante el hackatón con PR pequeños. **Ninguna rama ha sido creada.** Todas las rutas de producto son futuras y relativas a la raíz del repositorio.

| Integrante | Carnet | Rol | Rama | Responsabilidad | Archivos/carpetas principales | Dependencias |
|---|---|---|---|---|---|---|
| Dóminick Ricardo Cifuentes Tomás | 202408077 | Líder técnico, arquitecto, integrador y revisor general | `feat/dominick-plataforma` | Base Razor, interfaz común, contratos, dashboard e integración final | `src/CloudMedTraceGT.Web/Pages/Shared/`, `Pages/Index.cshtml` y `.cshtml.cs`, `Program.cs`, `.csproj`, `appsettings.json`, `wwwroot/css/site.css`, contratos comunes de `Services/`, `docs/` | Dashboard espera consultas de catálogos, lotes y alertas; acuerda arquitectura con Yeisson |
| Yeisson Alexander Poroj Toc | 202408068 | Líder técnico, arquitecto, integrador y revisor general | `feat/yeisson-trazabilidad` | Persistencia, reglas de saldo/estado, movimientos, trazabilidad y pruebas críticas | `database/`, `tests/` de reglas, `Pages/Movimientos/`, `Pages/Trazabilidad/`, `Services/Movimientos/`, `Services/Trazabilidad/`; núcleo de backend elegido | Necesita catálogos y lotes; entrega estado/saldos a Paulo, Rodrigo y Dóminick |
| Josué Uriel García Citalán | 202408004 | Responsable de medicamentos y apoyo de QA | `feat/josue-medicamentos` | Registro, listado y detalle de medicamentos; datos ficticios de medicamentos y pruebas de formularios; ensayo de navegación y accesibilidad | `Pages/Medicamentos/`, `ViewModels/Medicamentos/`, `Services/Medicamentos/`, `wwwroot/css/modules/medicamentos.css` si necesario; pruebas de su módulo | Layout y contratos iniciales; solicita cambios de esquema a Yeisson; entrega catálogo a Paulo |
| Rodrigo Iván Hernández Martínez | 202508087 | Responsable de establecimientos y alertas | `feat/rodrigo-establecimientos-alertas` | Registro/listado/detalle de establecimientos; creación/listado de alertas y visualización de motivos | `Pages/Establecimientos/`, `Pages/Alertas/`, `ViewModels/Establecimientos/`, `ViewModels/Alertas/`, `Services/Establecimientos/`, `Services/Alertas/`; pruebas de sus módulos | Establecimientos puede empezar con base común; alertas espera lotes y reglas de estado de Yeisson |
| Paulo Julian Lepe Calderon | 202308055 | Responsable de lotes y verificación | `feat/paulo-lotes-verificacion` | Crear/listar/detallar lotes, búsqueda, verificación y QR opcional | `Pages/Lotes/`, `Pages/Verificacion/`, `ViewModels/Lotes/`, `ViewModels/Verificacion/`, `Services/Lotes/`, `Services/Verificacion/`; pruebas de sus módulos | Medicamentos y establecimientos; ingreso transaccional y estado coordinados con Yeisson; QR espera verificación |

Los prefijos `Pages/`, `Services/`, `ViewModels/` y `wwwroot/` de la tabla corresponden a `src/CloudMedTraceGT.Web/`. Los contratos globales los integra Dóminick; los adaptadores de cada módulo pertenecen a su dueño. No crear hojas CSS vacías por cumplir la tabla.

## Responsabilidad de backend sin fijar lenguaje

Cada dueño entrega su módulo vertical: página, validaciones de entrada, adaptador y operaciones de negocio correspondientes. Si se elige API, se asignará `backend/<modulo>/` según el framework antes de programar. Si se eligen servicios locales, se usarán `Application/<Modulo>/` e `Infrastructure/<Modulo>/` dentro del proyecto web. Estas alternativas son excluyentes.

Yeisson conserva la infraestructura de persistencia, esquema y operaciones transaccionales compartidas; no debe implementar por sí solo todos los CRUD. Paulo llama la operación atómica de crear lote e ingreso acordada con Yeisson. Rodrigo crea alertas a través del núcleo compartido que coordina bloqueos y movimientos. Josué compensa un módulo más pequeño con datos de demo, QA transversal y ensayo; no modifica páginas ajenas durante ese QA, reporta al dueño.

## Archivos compartidos y conflictos previsibles

| Riesgo | Dueño que integra | Regla preventiva |
|---|---|---|
| Navbar, layout, estilos globales y componentes de estado | Dóminick | Los demás solicitan cambios; usan Bootstrap y clases comunes |
| Program.cs, proyecto, paquetes y configuración | Dóminick | Un solo PR para agregar dependencias aprobadas; Yeisson revisa impacto técnico |
| Esquema, migraciones, semillas comunes y conexión | Yeisson | Una secuencia de cambios; dueños entregan necesidades y datos, sin migraciones simultáneas incompatibles |
| DTO, rutas REST y códigos de error | Dóminick con revisión de Yeisson | Acordar antes; cambiar contrato y consumidores coordinadamente |
| Creación de lote e ingreso | Paulo + Yeisson; Yeisson integra núcleo transaccional | Una única operación; no insertar dos ingresos desde módulos distintos |
| Estado de lote, alerta y autorización de transferencia | Yeisson | Una regla central; Rodrigo y Paulo consumen resultado |
| Búsqueda por número repetido | Paulo | Mostrar medicamento para desambiguar; todos navegan por LoteId |
| Documentación compartida | Dóminick | Los demás proponen cambios en PR; evitar reorganizaciones simultáneas |

## Revisión y equilibrio

Dóminick revisa integración, UI y contratos; Yeisson revisa integridad de datos, reglas y transacciones. Se revisan mutuamente sus PR. Los otros tres pueden revisar módulos ajenos y ejecutar pruebas, pero al menos un líder aprueba cada integración. Las horas reservadas para revisión cuentan como trabajo de los líderes: si se acumulan PR, Josué apoya validación y se aplaza QR.

Cada integrante mantiene su rama y evita modificar los archivos compartidos por iniciativa propia. Cambios transversales necesarios se coordinan con el dueño, no se resuelven copiando modelos ni creando servicios paralelos.
