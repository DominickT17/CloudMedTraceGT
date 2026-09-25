# División definitiva del equipo — CloudMed Trace GT

Alertas, Verificación y QR pertenecen a Dóminick.

| Integrante | Carnet | Rama | Responsabilidad |
|---|---|---|---|
| Dóminick Ricardo Cifuentes Tomás | 202408077 | feat/dominick-platform | Plataforma, Dashboard, layout, CSS/JS común, Alertas, Verificación, QR, integración, demo y revisión final |
| Yeisson Alexander Poroj Toc | 202408068 | feat/yeisson-trazabilidad | Movimientos y Trazabilidad; revisión de reglas y saldos |
| Josué Uriel García Citalán | 202408004 | feat/josue-medicamentos | Medicamentos |
| Rodrigo Iván Hernández Martínez | 202508087 | feat/rodrigo-establecimientos | Establecimientos |
| Paulo Julian Lepe Calderon | 202308055 | feat/paulo-lotes | Lotes |

## Propiedad de archivos

Dentro de frontend/CloudMedTraceGT.Web/:

- Dóminick: Pages/Index.cshtml*, Pages/Shared/, Pages/Alertas/, Pages/Verificar/,
  wwwroot/js/{api,site,dashboard,alertas,verificar}.js, wwwroot/css/site.css,
  Program.cs, proyecto, configuración y documentación común.
- Josué: Pages/Medicamentos/ y archivos exclusivos de su módulo.
- Rodrigo: Pages/Establecimientos/ y archivos exclusivos de su módulo.
- Paulo: Pages/Lotes/ y archivos exclusivos de su módulo.
- Yeisson: Pages/Movimientos/, Pages/Trazabilidad/ y archivos exclusivos de sus módulos.

Los endpoints ya existen en backend/core/. No crear modelos/APIs paralelas.
Cambios de contratos, esquema y reglas se coordinan entre Dóminick y Yeisson.
Dashboard backend y seed común se incluyen en la entrega de Dóminick.

## Evitar conflictos

- Layout, configuración, .csproj y CSS/JS compartidos los integra Dóminick.
- La autorización de fase final permite a Dóminick completar las interfaces faltantes en su workspace.
  La asignación original sirve para coordinación; no bloquea esta finalización. Conservar rutas/campos REST.
- No crear migraciones simultáneas incompatibles; esta fase no cambia modelos ni migraciones.
- Crear lote no genera ingreso: Paulo y Yeisson coordinan el ingreso separado para no duplicarlo.
- Número de lote único global. Yeisson debe consumir /Trazabilidad?lote=NUMERO.
- No versionar SQLite, .venv, bin, obj ni IP LAN personal.
- Revisar diferencias; evitar reformateos masivos y sobrescribir cambios comunes con versiones antiguas.
- Integraciones Git únicamente con autorización.

Los nombres antiguos de ramas y la asignación de Alertas a Rodrigo o QR a Paulo quedan sustituidos.

## Finalización integral

Se completaron Medicamentos, Establecimientos, Lotes, Movimientos y Trazabilidad en
feat/dominick-platform. Esta entrega no atribuye esos cambios a los compañeros ni verifica sus ramas.
Los archivos compartidos nuevos son _Catalog.cshtml, _QrModal.cshtml, catalogos.js y qr.js;
Trazabilidad tiene su propio trazabilidad.js. Comparar diferencias antes de una futura integración.
