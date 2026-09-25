# Espacios de trabajo — CloudMed Trace GT

Los worktrees se prepararon el 23 de septiembre de 2026 desde ca9d243.
Ese punto de partida es histórico; las ramas y su contenido han evolucionado.
El repositorio principal CloudMedTraceGT es el workspace de integración.
Los espacios de funcionalidades están fuera de él; comparten objetos y referencias Git,
pero cada uno tiene rama activa, archivos e índice propios. No son clones distribuidos.

## Asignación

| Integrante | Carnet | Rama | Ruta local exacta |
|---|---|---|---|
| Dóminick Ricardo Cifuentes Tomás | 202408077 | `feat/dominick-platform` | `C:\Users\domin\Documents\Programacion_Web\CloudMedTraceGT_Workspaces\Dominick` |
| Yeisson Alexander Poroj Toc | 202408068 | `feat/yeisson-trazabilidad` | `C:\Users\domin\Documents\Programacion_Web\CloudMedTraceGT_Workspaces\Yeisson` |
| Josué Uriel García Citalán | 202408004 | `feat/josue-medicamentos` | `C:\Users\domin\Documents\Programacion_Web\CloudMedTraceGT_Workspaces\Josue` |
| Rodrigo Iván Hernández Martínez | 202508087 | `feat/rodrigo-establecimientos` | `C:\Users\domin\Documents\Programacion_Web\CloudMedTraceGT_Workspaces\Rodrigo` |
| Paulo Julian Lepe Calderon | 202308055 | `feat/paulo-lotes` | `C:\Users\domin\Documents\Programacion_Web\CloudMedTraceGT_Workspaces\Paulo` |

## Responsabilidades actuales

Dóminick: plataforma, Dashboard, layout, CSS/JS común, Alertas, Verificación, QR, integración y demo.
Yeisson: Movimientos y Trazabilidad. Josué: Medicamentos.
Rodrigo: Establecimientos. Paulo: Lotes.

La estructura real es frontend/CloudMedTraceGT.Web/ y backend/core/.
La antigua ruta src/ y los nombres de ramas propuestos quedan sustituidos.
Ver [DIVISION_EQUIPO.md](DIVISION_EQUIPO.md) para propiedad de archivos y conflictos.

## Uso

- Abrir el workspace asignado y confirmar su rama antes de trabajar.
- No cambiar ramas dentro de los worktrees ni abrir la misma rama en otro.
- Las carpetas no determinan autoría; se usa la identidad Git real del autor.
- Coordinar archivos comunes con Dóminick y reglas de saldo/estado con Yeisson.
- No copiar cambios entre carpetas como mecanismo de integración.
- Publicar e integrar solo cuando se autorice. Esta fase no ejecuta add/commit/push/merge/rebase.
- SQLite y dependencias son locales a cada espacio y permanecen ignorados.

Verificación de solo lectura desde cualquier workspace:

```powershell
git worktree list
git branch --show-current
git status
```

Esta entrega verifica feat/dominick-platform en Dominick. No afirma que los demás
worktrees sigan en el commit inicial ni que no tengan avances o ramas remotas.

## Fase final

La implementación integral se realizó exclusivamente en Dominick, feat/dominick-platform,
preservando el trabajo sin commit previo. Los módulos faltantes se completaron aquí por solicitud
expresa, sin copiar carpetas de compañeros. No se modificaron ramas, identidades ni índices Git.
La base local conserva registros anteriores además del escenario ampliado y pruebas de exposición.
