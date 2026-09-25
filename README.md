# CloudMed Trace GT

**CloudMed Trace GT â€” Sistema de Trazabilidad de Medicamentos** Â· **CloudColor**
â€œTrazabilidad inteligente de medicamentos para Guatemalaâ€.

Prototipo acadÃ©mico de Universidad Mesoamericana, curso ProgramaciÃ³n Web.
Los medicamentos, fabricantes, registros y establecimientos del escenario son ficticios.
No es una certificaciÃ³n sanitaria ni una consulta oficial del MSPAS.

## Producto y arquitectura

ASP.NET Core Razor Pages (net9.0), HTML5, CSS3, Bootstrap local y JavaScript;
Python, Django 5.2, Django REST Framework y SQLite. QRCoder 1.8.0 genera PNG localmente.
No requiere npm para ejecutar el producto. Node solo se utiliza en pruebas del helper JS.

- Dashboard: conteos reales, Ãºltimos cinco movimientos y bÃºsqueda exacta.
- Medicamentos y Establecimientos: listar, buscar, crear, detalle, editar y eliminar con confirmaciÃ³n.
- Lotes: listado, bÃºsqueda, creaciÃ³n, detalle y ediciÃ³n validada; eliminaciÃ³n protegida; trazabilidad, verificaciÃ³n y QR.
- Movimientos: listado y detalle; ingresos y traslados parciales con validaciones de saldo y estado.
- Trazabilidad: ficha, saldos por ubicaciÃ³n, total e historial cronolÃ³gico.
- Alertas: crear, activar y desactivar; estado calculado por Django.
- VerificaciÃ³n pÃºblica: solo medicamento, presentaciÃ³n, lote, vencimiento y estado.

Los mÃ³dulos administrativos consumen la API REST desde el navegador. La verificaciÃ³n pÃºblica
consulta Django **desde el servidor Razor** mediante `/Verificar?handler=Datos&lote=...`.
AsÃ­ un telÃ©fono solo necesita alcanzar el puerto 5100. Reglas y saldos viven en Django.

## Instalar y ejecutar

Workspace obligatorio: `C:\Users\domin\Documents\Programacion_Web\CloudMedTraceGT_Workspaces\Dominick`.
Rama: `feat/dominick-platform`. No cambiar de rama para ejecutar.
Requisitos: Python 3.13 y SDK .NET 9. Entorno comprobado: Python 3.13.14 y SDK 9.0.318.

Primera terminal PowerShell:

```powershell
cd C:\Users\domin\Documents\Programacion_Web\CloudMedTraceGT_Workspaces\Dominick\backend
py -3.13 -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
python manage.py migrate
python manage.py seed_demo
python manage.py runserver 127.0.0.1:8000
```

Crear el entorno e instalar dependencias solo es necesario la primera vez.
Si PowerShell no permite activar el entorno, usa `.\.venv\Scripts\python.exe` en lugar de `python`.
La raÃ­z Django responde 404; la API estÃ¡ en `http://127.0.0.1:8000/api/`.

Segunda terminal PowerShell:

```powershell
cd C:\Users\domin\Documents\Programacion_Web\CloudMedTraceGT_Workspaces\Dominick\frontend\CloudMedTraceGT.Web
dotnet restore
dotnet run
```

Abrir http://localhost:5100. Detener ambos procesos con Ctrl+C antes de reiniciarlos.
Si Razor sirve vistas antiguas, detenerlo, ejecutar `dotnet build --no-incremental` y volver a iniciar.

## ConfiguraciÃ³n local

`frontend/CloudMedTraceGT.Web/appsettings.json` conserva:

```json
{
  "CloudMedApi": { "BaseUrl": "http://127.0.0.1:8000" },
  "PublicBaseUrl": "http://localhost:5100"
}
```

Conservar las demÃ¡s opciones del archivo. BaseUrl no lleva `/api/`.
El navegador usa /api/ en Razor tanto en localhost como por LAN. Razor consulta Django con CloudMedApi:BaseUrl; el puerto 8000 permanece interno.
Sin autenticaciÃ³n compleja; API y DEBUG son exclusivos del prototipo local.

## Inventario acadÃ©mico

`seed_demo` crea 10 medicamentos, 7 establecimientos y 12 lotes en una base vacÃ­a.
No borra ni reinicia registros existentes. Dos ejecuciones consecutivas no duplican datos.
Los conteos del Dashboard incluyen tambiÃ©n los registros anteriores y los creados manualmente.

| Medicamento | PresentaciÃ³n | Registro ficticio |
|---|---|---|
| Amoxicilina | 500 mg cÃ¡psulas | CMT-ACA-001 |
| Paracetamol | 500 mg tabletas | CMT-ACA-002 |
| Ibuprofeno | 400 mg tabletas | CMT-ACA-003 |
| Azitromicina | 500 mg tabletas | CMT-ACA-004 |
| Omeprazol | 20 mg cÃ¡psulas | CMT-ACA-005 |
| LosartÃ¡n | 50 mg tabletas | CMT-ACA-006 |
| Metformina | 850 mg tabletas | CMT-ACA-007 |
| Loratadina | 10 mg tabletas | CMT-ACA-008 |
| Diclofenaco | 50 mg tabletas | CMT-ACA-009 |
| Cefalexina | 500 mg cÃ¡psulas | CMT-ACA-010 |

Fabricante: Laboratorios CloudColor (ficticio). No son registros oficiales.
Establecimientos: Bodega Central, Ãrea de Salud Quetzaltenango, Hospital Regional de Occidente,
Centro de Salud Zona 3, Centro de Salud La Esperanza, Hospital de TotonicapÃ¡n y Bodega Regional Occidente.
Los nombres homÃ³nimos preexistentes se conservan; los selectores los distinguen por referencia.

| Lote | Cantidad | Estado al crearlo | Vencimiento relativo |
|---|---:|---|---:|
| CMT-AMX-01 | 5000 | SEGURO | +365 dÃ­as |
| CMT-PAR-01 | 5000 | PROXIMO_A_VENCER | +30 dÃ­as |
| CMT-IBU-01 | 5000 | BLOQUEADO | +365 dÃ­as |
| CMT-AZI-01 | 500 | SEGURO | +240 dÃ­as |
| CMT-OME-01 | 1000 | SEGURO | +300 dÃ­as |
| CMT-LOS-01 | 2500 | PROXIMO_A_VENCER | +45 dÃ­as |
| CMT-MET-01 | 10000 | SEGURO | +450 dÃ­as |
| CMT-LOR-01 | 1000 | SEGURO | +200 dÃ­as |
| CMT-DIC-01 | 500 | VENCIDO | âˆ’15 dÃ­as |
| CMT-CEF-01 | 2500 | BLOQUEADO | +270 dÃ­as |
| CMT-AMX-02 | 10000 | SEGURO | +540 dÃ­as |
| CMT-PAR-02 | 1000 | VENCIDO | âˆ’30 dÃ­as |

FabricaciÃ³n: 180 dÃ­as antes de crear. En lotes anteriores se conservan sus fechas y modificaciones.
Los estados evolucionan con la fecha del sistema; volver a ejecutar el seed no rejuvenece lotes.
Hay 32 movimientos y 2 alertas activas en una base nueva. Los lotes no vencidos tienen ingreso completo,
traslado del 40% y segundo traslado del 20%; saldos finales 60% / 20% / 20%.
Los vencidos solo tienen ingreso. Las alertas se crean despuÃ©s de los traslados vÃ¡lidos.

Compatibilidad: el comando limpia los nombres exactos del antiguo escenario `(demo CloudColor)`
y cambia sus tres nÃºmeros DEMO a CMT-AMX-01, CMT-PAR-01 y CMT-IBU-01, conservando IDs y relaciones.
Por ello, los enlaces/QR guardados con los nÃºmeros antiguos deben regenerarse.
No fusiona registros homÃ³nimos. Una colisiÃ³n de identificadores durante esa conversiÃ³n cancela toda la operaciÃ³n.
No existe `--reset`: no hay propiedad persistente suficiente para distinguir con seguridad datos del seed y del usuario.

## Flujo de exposiciÃ³n

1. Abrir Inicio y revisar los cuatro conteos, API conectada y Ãºltimos movimientos.
2. Mostrar Medicamentos y Establecimientos. Crear un medicamento ficticio con registro Ãºnico.
3. Crear un lote con nÃºmero nuevo, cantidad 5000 y vencimiento futuro de mÃ¡s de 90 dÃ­as.
4. En Movimientos registrar INGRESO de 5000 a Bodega Central.
5. Registrar TRASLADO de 2000 desde esa Bodega a Ãrea de Salud Quetzaltenango.
6. Registrar TRASLADO de 1000 desde esa Ãrea al Hospital Regional de Occidente.
7. Consultar Trazabilidad: tres ubicaciones con 3000, 1000 y 1000 unidades e historial de tres pasos.
8. En Alertas crear BLOQUEO con motivo ficticio. Consultar de nuevo el lote: BLOQUEADO.
9. Abrir VerificaciÃ³n pÃºblica y generar QR desde Inicio, detalle de Lotes o Trazabilidad.
10. Escanear el QR desde telÃ©fono tras configurar LAN. Desactivar la alerta y volver a consultar:
    se recalcula el estado por fecha si no queda otra alerta activa.

No hay actualizaciÃ³n automÃ¡tica entre pestaÃ±as: usar Actualizar o Consultar.
Errores de validaciÃ³n conservan formularios; API apagada muestra un mensaje y permite reintentar.
No reenviar una escritura tras un fallo de red sin consultar antes si se guardÃ³.

## QR y descarga PNG

â€œGenerar QRâ€ abre un modal con nÃºmero, imagen, URL, Descargar QR y Cerrar.
La descarga devuelve `image/png` y un nombre como `QR_CMT-AMX-01.png`.
El contenido es Ãºnicamente `{PublicBaseUrl}/Verificar?lote=NUMERO_CODIFICADO`.
Con la configuraciÃ³n local: `http://localhost:5100/Verificar?lote=CMT-AMX-01`.
El QR no almacena datos del medicamento, no firma el lote y no certifica autenticidad sanitaria.

## TelÃ©fono en LAN

1. Ejecutar `ipconfig` y obtener la IPv4 del adaptador Wi-Fi de la PC.
2. Detener Razor si estÃ¡ activo. En la terminal del frontend configurar temporalmente:

```powershell
$env:PublicBaseUrl = 'http://IP_PC:5100'
dotnet run --no-launch-profile --urls "http://0.0.0.0:5100" --environment Development
```

3. Sustituir IP_PC por la IPv4 real; no guardarla en Git. PC y telÃ©fono deben compartir Wi-Fi.
4. Django sigue escuchando en 127.0.0.1:8000; no cambiar CloudMedApi:BaseUrl.
5. Abrir el panel en localhost:5100 desde la PC. Volver a generar el QR y escanearlo.
6. El telÃ©fono abrirÃ¡ `http://IP_PC:5100/Verificar?lote=...`; solo necesita acceso a 5100.
7. Si no abre, comprobar primero esa URL en el telÃ©fono y revisar aislamiento Wi-Fi/firewall
   de la red privada. Esta entrega no modifica el firewall ni expone servicios a Internet.
8. Al terminar, detener Razor y ejecutar `Remove-Item Env:PublicBaseUrl`.

La cÃ¡mara de un telÃ©fono fÃ­sico y la conectividad de tu Wi-Fi requieren comprobaciÃ³n presencial.

## ValidaciÃ³n

Desde backend con entorno activado:

```powershell
python manage.py check
python manage.py makemigrations --check
python manage.py test
```

Desde frontend/CloudMedTraceGT.Web: `dotnet build`.
Desde la raÃ­z: `node --test frontend/tests/api.test.cjs`.
Resultado de esta fase: 57 tests Django y 9 JS aprobados; build sin errores ni advertencias.
Ver [PRUEBAS_FRONTEND.md](docs/PRUEBAS_FRONTEND.md) para evidencia y lÃ­mites.

## Integrantes

| Integrante | Carnet |
|---|---|
| DÃ³minick Ricardo Cifuentes TomÃ¡s | 202408077 |
| Yeisson Alexander Poroj Toc | 202408068 |
| JosuÃ© Uriel GarcÃ­a CitalÃ¡n | 202408004 |
| Rodrigo IvÃ¡n HernÃ¡ndez MartÃ­nez | 202508087 |
| Paulo Julian Lepe Calderon | 202308055 |

Universidad Mesoamericana Â· ProgramaciÃ³n Web Â· CloudColor.
La fase final completa las interfaces faltantes en el workspace de DÃ³minick, sin integrar otras ramas.
[Arquitectura](docs/ARQUITECTURA.md) Â· [Contrato REST](docs/API_CONTRATOS.md) Â·
[MVP](docs/MVP.md) Â· [Equipo](docs/DIVISION_EQUIPO.md) Â· [Espacios](docs/ESPACIOS_TRABAJO.md).
