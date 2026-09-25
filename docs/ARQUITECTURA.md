# Arquitectura vigente — CloudMed Trace GT

CloudColor · “Trazabilidad inteligente de medicamentos para Guatemala”.

## Componentes

- frontend/CloudMedTraceGT.Web/: ASP.NET Core Razor Pages net9.0, Bootstrap local y JavaScript.
- backend/: Django 5.2, REST Framework, CORS y SQLite.
  Cinco modelos en core/models.py y reglas centrales en core/services.py.
- [API_CONTRATOS.md](API_CONTRATOS.md) es el contrato canónico.
  Se sustituyen las alternativas históricas de backend y ruta src/.

Dashboard consume un endpoint agregado; el buscador consulta el número exacto.
Alertas consulta lotes/alertas, escribe POST/PATCH y vuelve a leer los estados calculados.
api.js centraliza fetch, errores y timeout; site.js aporta formatos y badges.
CloudMedApiProxy reenvía las rutas conocidas /api/ a Django desde Razor; el navegador
usa el mismo origen también en LAN. CloudMedApi:BaseUrl queda en el servidor.
UseStaticFiles sirve wwwroot; asp-append-version agrega ?v= sin cambiar nombres físicos.
Los scripts insertan texto con textContent, sin HTML recibido de la API.

La vista /Verificar?lote=... llama un handler Razor de solo lectura que solicita
/api/verificar/{numero}/ mediante HttpClient y devuelve solo medicamento, presentación,
número, vencimiento y estado. Así el teléfono no debe conectarse a Django.
El layout público omite el menú administrativo. Esto no agrega control de acceso.

QRCoder 1.8.0 genera PNG local con PngByteQRCode, sin System.Drawing.
Se eligió esta dependencia .NET en lugar de un servicio remoto o un algoritmo QR propio.
PublicBaseUrl construye una URL absoluta HTTP(S), sin credenciales, query ni fragmento.
Configuración LAN en [README](../README.md).

## Invariantes existentes

- Número de lote único global; estados calculados, no almacenados.
- Cualquier alerta activa bloquea; luego se evalúa vencido, próximo (0–90 días) o seguro.
- Crear lote no genera ingreso; ingresos parciales limitados por cantidad inicial.
- Saldo = ingresos + traslados recibidos − traslados enviados.
- Traslado requiere saldo suficiente y lote no vencido/bloqueado.
- Ediciones y borrados preservan validez cronológica del historial.
- Relaciones protegidas, validación de modelos y transacciones SQLite IMMEDIATE.
- Dashboard y trazabilidad consultan instantáneas transaccionales cortas.

SQLite sirve al hackatón; no es una propuesta de alta concurrencia.
No se agregaron modelos, migraciones, login, roles, nube ni servicios externos.
La API sin autenticación y DEBUG son de desarrollo. CORS no sustituye autorización.

Dóminick: plataforma, Dashboard, Alertas, Verificación, QR y demo.
Yeisson: Movimientos/Trazabilidad; Josué: Medicamentos; Rodrigo: Establecimientos; Paulo: Lotes.
La fase final completa las cinco interfaces faltantes en esta rama por autorización expresa.
No modifica los otros worktrees ni integra su historial.

## Interfaces completas

`_Catalog.cshtml` y `catalogos.js` comparten listados, búsqueda local, formularios,
detalles y confirmación Bootstrap entre Medicamentos, Establecimientos, Lotes y Movimientos.
Las rutas /Modulo/Create, /Modulo/Edit/{id} y /Modulo/Details/{id} abren el mismo modal;
Movimientos ofrece creación y detalle. El menú permanece activo por prefijo.
No se recarga la aplicación al guardar. Las relaciones se cargan por API, sin IDs constantes.
Los errores se muestran como texto y conservan los campos. Django decide si una edición o borrado es válido.

`trazabilidad.js` muestra saldos positivos y el historial ordenado que devuelve Django.
`_QrModal.cshtml` y `qr.js` centralizan el QR para Dashboard, Lotes y Trazabilidad.
El handler Enlace usa la misma función C# que Qr, evitando divergencias entre URL visible y codificada.
Descargar PNG agrega Content-Disposition con nombre sanitizado; no depende de un servicio externo.
El handler Datos mantiene exclusivamente los cinco campos públicos.

Seed: 10 medicamentos, 7 establecimientos, 12 lotes, 32 movimientos y 2 alertas en una base nueva.
Conversión puntual de identificadores del escenario anterior, transaccional, preservando IDs y saldos.
No reset, cambios de esquema ni migraciones nuevas. Fechas relativas solo al crear; conserva ediciones.
