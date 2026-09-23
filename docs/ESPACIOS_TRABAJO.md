# Espacios de trabajo — CloudMed Trace GT

Preparados el 23 de septiembre de 2026 mediante Git Worktree. No se implementó código de aplicación, Razor Pages, Django ni modelos.

## Integración y punto de partida

El repositorio principal `C:\Users\domin\Documents\Programacion_Web\CloudMedTraceGT` permanece en `develop`, con seguimiento de `origin/develop`. Antes de crear los espacios, el árbol de trabajo estaba limpio.

Las cinco ramas se crearon exactamente desde el HEAD de develop:

```text
ca9d243b520a914901a07cab3f5d87f2bdc2602f
docs: definir arquitectura y plan del hackaton
```

`CloudMedTraceGT` es el workspace de integración. `CloudMedTraceGT_Workspaces/*` contiene los espacios de funcionalidades, todos fuera del repositorio principal. Cada espacio tiene su propia rama activa, archivos de trabajo e índice; comparten el repositorio Git, sus objetos y referencias. Son espacios locales de este equipo, no clones distribuidos automáticamente a las computadoras de los integrantes.

## Asignación definitiva

| Integrante | Carnet | Rama | Ruta local exacta |
|---|---|---|---|
| Dóminick Ricardo Cifuentes Tomás | 202408077 | `feat/dominick-platform` | `C:\Users\domin\Documents\Programacion_Web\CloudMedTraceGT_Workspaces\Dominick` |
| Yeisson Alexander Poroj Toc | 202408068 | `feat/yeisson-trazabilidad` | `C:\Users\domin\Documents\Programacion_Web\CloudMedTraceGT_Workspaces\Yeisson` |
| Josué Uriel García Citalán | 202408004 | `feat/josue-medicamentos` | `C:\Users\domin\Documents\Programacion_Web\CloudMedTraceGT_Workspaces\Josue` |
| Rodrigo Iván Hernández Martínez | 202508087 | `feat/rodrigo-establecimientos` | `C:\Users\domin\Documents\Programacion_Web\CloudMedTraceGT_Workspaces\Rodrigo` |
| Paulo Julian Lepe Calderon | 202308055 | `feat/paulo-lotes` | `C:\Users\domin\Documents\Programacion_Web\CloudMedTraceGT_Workspaces\Paulo` |

Estos son los nombres definitivos indicados por el equipo. Sustituyen los nombres propuestos `feat/dominick-plataforma`, `feat/rodrigo-establecimientos-alertas` y `feat/paulo-lotes-verificacion` que aún aparecen en los documentos anteriores. Esos documentos se conservaron sin cambios; no deben usarse sus nombres anteriores para crear ramas adicionales. Las referencias al estado inicial en esos documentos son históricas.

## Responsabilidades, dependencias y archivos previstos

Las rutas siguientes son propuestas de la planificación, relativas a cada worktree; todavía no se han creado. `Pages/`, `Services/`, `ViewModels/` y `wwwroot/` se entienden dentro de `src/CloudMedTraceGT.Web/`. La estructura definitiva del backend depende de una decisión posterior; preparar estos espacios no elige ni implementa un framework.

| Integrante | Responsabilidad | Dependencias | Archivos/carpetas que principalmente editará |
|---|---|---|---|
| Dóminick | Estructura frontend ASP.NET Core Razor Pages, layout, navbar, estilos generales, identidad CloudMed Trace GT / CloudColor, dashboard, contratos de comunicación, integración general y revisión de PR | Acuerdo técnico con Yeisson; consultas reales de catálogos, lotes y alertas para dashboard | `Pages/Shared/`, `Pages/Index.cshtml`, `Pages/Index.cshtml.cs`, `wwwroot/css/site.css`, contratos comunes de `Services/`, `Program.cs`, proyecto `.csproj`, configuración no secreta y documentación coordinada |
| Yeisson | Persistencia central, movimientos, saldos, reglas de estado, trazabilidad, integración con lotes, apoyo técnico de backend y revisión de PR | Contratos de Dóminick; medicamentos, establecimientos y lotes; coordinación de ingreso inicial con Paulo y de alertas con Rodrigo | `database/`, pruebas de reglas en `tests/`, `Pages/Movimientos/`, `Pages/Trazabilidad/`, `Services/Movimientos/`, `Services/Trazabilidad/` y núcleo de persistencia/negocio del backend elegido |
| Josué | Medicamentos: listado, creación, detalle, validaciones y pruebas básicas; edición solo si entra en el MVP | Layout y contratos; persistencia central de Yeisson. Su catálogo alimenta lotes | `Pages/Medicamentos/`, `ViewModels/Medicamentos/`, `Services/Medicamentos/`, pruebas del módulo y CSS particular únicamente si hace falta |
| Rodrigo | Establecimientos: listado, creación, detalle, departamento, municipio y tipo; posteriormente apoyo a Alertas | Layout, contratos y persistencia; Alertas espera lotes y reglas centrales de estado | `Pages/Establecimientos/`, `ViewModels/Establecimientos/`, `Services/Establecimientos/`, pruebas del módulo; posteriormente `Pages/Alertas/`, `ViewModels/Alertas/` y `Services/Alertas/` |
| Paulo | Lotes: creación, listado, detalle, vencimiento, cantidades y verificación pública; QR solo si alcanza el tiempo | Medicamentos y establecimientos; operación de ingreso y reglas de estado/saldo de Yeisson; contratos de Dóminick | `Pages/Lotes/`, `Pages/Verificacion/`, `ViewModels/Lotes/`, `ViewModels/Verificacion/`, `Services/Lotes/`, `Services/Verificacion/` y pruebas de los módulos |

La verificación pública se refiere a la experiencia de consulta prevista; no se realizó publicación ni despliegue. Dóminick y Yeisson conservan arquitectura, integración y revisión general. Cambios a layout, contratos y configuración común se coordinan con Dóminick; cambios a esquema, persistencia, saldos y estados se coordinan con Yeisson.

## Uso de los espacios

- Abrir la carpeta asignada en el editor y trabajar allí; el repositorio principal permanece en develop.
- No cambiar las ramas dentro de los worktrees ni intentar abrir la misma rama en otro worktree.
- Las carpetas no asignan identidad de autor. No se modificaron `user.name`, `user.email` ni configuración global. La autoría de futuros commits depende de la identidad Git real de quien los haga.
- Las ramas creadas son locales y no tienen upstream configurado. No se ejecutaron pushes ni se publicaron ramas remotas.
- No se hicieron commits ni merges. El historial y el HEAD de develop permanecen en el commit de partida.
- Este documento se creó únicamente en el workspace principal, sin commit. Por eso no aparece en los otros cinco worktrees; cada uno contiene la documentación ya versionada en el commit inicial.
- No copiar manualmente cambios entre carpetas como mecanismo de integración. Los futuros PR e integraciones se realizarán cuando se autoricen, conforme al flujo del equipo y con los nombres definitivos de este documento.

## Verificación

Desde el repositorio principal:

```powershell
git worktree list
git branch
git status
```

Para revisar cada espacio sin cambiar su rama:

```powershell
git -C "C:\Users\domin\Documents\Programacion_Web\CloudMedTraceGT_Workspaces\Dominick" branch --show-current
git -C "C:\Users\domin\Documents\Programacion_Web\CloudMedTraceGT_Workspaces\Yeisson" branch --show-current
git -C "C:\Users\domin\Documents\Programacion_Web\CloudMedTraceGT_Workspaces\Josue" branch --show-current
git -C "C:\Users\domin\Documents\Programacion_Web\CloudMedTraceGT_Workspaces\Rodrigo" branch --show-current
git -C "C:\Users\domin\Documents\Programacion_Web\CloudMedTraceGT_Workspaces\Paulo" branch --show-current
```

Resultado de referencia: seis worktrees, cada uno en su rama asignada, todos en `ca9d243`. Los cinco espacios de funcionalidades quedan limpios. El único archivo nuevo pendiente del workspace principal es `docs/ESPACIOS_TRABAJO.md`.
