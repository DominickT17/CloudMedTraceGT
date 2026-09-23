# Flujo Git y GitHub — CloudMed Trace GT

**Propuesta para ejecución futura tras aprobar la planificación.** Ninguno de los comandos de escritura de este documento se ejecutó en esta fase. No se crearon ramas, commits, PR, merges ni pushes, ni se cambió configuración Git.

## Ramas

```text
main                             versiones estables demostrables
└── develop                      integración del equipo
    ├── feat/dominick-plataforma
    ├── feat/yeisson-trazabilidad
    ├── feat/josue-medicamentos
    ├── feat/rodrigo-establecimientos-alertas
    └── feat/paulo-lotes-verificacion
```

Flujo: **feature → pull request → develop → pruebas → pull request → main**.

No programar directamente en main ni develop. Los líderes integran PR y cada integrante trabaja en su rama principal. No crear ramas por botón, formulario o archivo. El árbol muestra el origen de las ramas, no carpetas físicas.

Como las ramas se reutilizarán, se propone **merge commit** en los PR hacia develop: evita perder la relación de historial al continuar una misma rama después de varias entregas. Mantener las ramas durante el hackatón. La promoción a main también se revisa por PR; no usar force-push.

## Preparación inicial: una vez por el integrador

Solo tras autorización y con árbol limpio. Si develop ya existe en el remoto, usarla en lugar de crear otra. Primero guardar cambios propios en su entrega correspondiente; no usar limpieza destructiva para cambiar de rama.

```powershell
git status
git remote -v
git fetch origin
git branch -a
git switch main
git pull --ff-only origin main
```

Si **no existe** develop:

```powershell
git switch -c develop
git push -u origin develop
```

Si **ya existe origin/develop** y no hay rama local:

```powershell
git switch --track origin/develop
```

Los líderes propondrán proteger main y develop en GitHub, exigir PR y al menos una aprobación ajena al autor. La disponibilidad y configuración se comprobarán después; no asumir protecciones activas ni cambiar ajustes ahora.

## Inicio de la rama personal

Ejemplo para Josué; cada integrante usa exactamente su rama de [DIVISION_EQUIPO.md](DIVISION_EQUIPO.md). Crear solo una vez y después usar `git switch nombre`.

```powershell
git switch develop
git pull --ff-only origin develop
git switch -c feat/josue-medicamentos
```

## Commits y publicación de una entrega

Hacer commits al completar un cambio coherente que pueda explicarse y verificarse: formulario terminado, regla corregida o documentación acordada. Evitar guardar todo el hackatón en un único commit, y evitar commits por cada línea.

Formato: `tipo(modulo): descripción breve`. Tipos: `feat`, `fix`, `docs`, `test`, `style`, `chore`. Ejemplos: `feat(lotes): registrar lote con ingreso inicial`, `fix(movimientos): impedir saldo negativo`, `docs(plan): acordar reglas de bloqueo`.

```powershell
git status
git diff
git add src/CloudMedTraceGT.Web/Pages/Medicamentos/Index.cshtml src/CloudMedTraceGT.Web/Pages/Medicamentos/Index.cshtml.cs
git diff --cached
git commit -m "feat(medicamentos): mostrar listado"
git push -u origin feat/josue-medicamentos
```

Las rutas del ejemplo solo existirán después de implementar. Agregar explícitamente los archivos de la entrega, incluidos servicios o pruebas que requiera; no usar `git add .` sin revisar. No versionar secretos, bases locales ni salidas de compilación.

## Pull Requests

En GitHub, seleccionar base `develop` y compare la rama personal. Abrir PR pequeño cuando una entrega sea revisable; usar borrador si depende de un contrato pendiente. No mezclar cambios ajenos ni rediseños globales.

Contenido mínimo:

- Qué problema resuelve y comportamiento resultante.
- Páginas/operaciones afectadas y dependencia de otro PR.
- Cómo se verificó: pasos, resultado, capturas si aporta evidencia visual.
- Cambios de contrato/esquema y limitaciones conocidas.

Pedir revisión a Dóminick o Yeisson. El autor corrige en la misma rama y hace nuevos commits; el PR se actualiza. Los líderes no integran si faltan dependencias, hay conflictos, falla la validación o existen reglas duplicadas de saldo/estado.

## Actualizar la rama y resolver conflictos

Antes de actualizar, guardar el trabajo propio y comprobar árbol limpio. Desde la rama personal:

```powershell
git fetch origin
git merge origin/develop
```

Si hay conflictos, ejecutar `git status`, leer ambas versiones y acordar con el dueño la combinación correcta. No aceptar todos los cambios de un lado sin revisión. Editar los archivos afectados, retirar marcadores y verificar compilación/comportamiento. Después:

```powershell
git add ruta/del/archivo-resuelto
git commit
git push
```

`ruta/del/archivo-resuelto` es un marcador que debe reemplazarse. Si se necesita cancelar **ese merge en curso**, usar `git merge --abort`; por eso se exige iniciar con árbol limpio. No resolver mediante `reset --hard`, eliminación de archivos ajenos o reescritura del remoto.

Después de integrar un PR, incorporar origin/develop a la misma rama antes de la siguiente entrega. No volver a crear la rama ni cambiar de estrategia de merge a mitad del hackatón.

## Orden de integración y versión estable

1. Plataforma Razor, contratos y persistencia inicial.
2. Medicamentos y establecimientos.
3. Lotes e ingreso transaccional.
4. Movimientos y trazabilidad.
5. Alertas y verificación.
6. Dashboard final y correcciones de interfaz.
7. QR solo si el MVP pasa.

Cada merge a develop exige validación pertinente; cuando exista el proyecto .NET, ejecutar `dotnet build` sobre la solución/proyecto acordado. Ejecutar también las pruebas del backend elegido y el recorrido afectado; no asumir que compilar Razor verifica una API separada.

Tras probar el guion completo en develop, un líder abre PR de `develop` a `main`, el otro revisa y confirma la demostración. Integrar únicamente esa versión validada. Si aparece un defecto, corregirlo en la rama de su dueño, pasar de nuevo por develop y repetir la verificación afectada antes de promover. No hacer cambios manuales diferentes en main.
