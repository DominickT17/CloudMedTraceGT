# CloudMed Trace GT

Sistema web para la trazabilidad de medicamentos en el sistema de salud de Guatemala.

## Descripción

CloudMed Trace GT es una solución desarrollada por **CloudColor** que busca mejorar el seguimiento de medicamentos mediante el registro de medicamentos, lotes, establecimientos, movimientos y alertas.

El sistema permitirá conocer el recorrido de un lote desde su ingreso hasta su ubicación actual, facilitando la identificación de medicamentos vencidos, bloqueados o bajo alerta.

## Tecnologías

### Frontend
- ASP.NET Core Razor Pages
- HTML
- CSS
- Bootstrap
- JavaScript

### Backend
Python con Django 5.2 y Django REST Framework. Comunicación HTTP/REST/JSON desde JavaScript con `fetch()`.

### Base de datos
SQLite local con cinco modelos de dominio y migraciones Django. Contrato completo: [API_CONTRATOS.md](docs/API_CONTRATOS.md).

## Funcionalidades propuestas

- Dashboard general.
- Registro de medicamentos.
- Registro y consulta de lotes.
- Registro de establecimientos.
- Movimientos de medicamentos entre establecimientos.
- Historial de trazabilidad por lote.
- Alertas de medicamentos.
- Verificación del estado de un lote.
- Generación de código QR para consulta de trazabilidad.

## Empresa

**CloudColor**

## Producto

**CloudMed Trace GT**

### Trazabilidad inteligente de medicamentos para Guatemala

## Integrantes

- Dóminick Ricardo Cifuentes Tomás - 202408077
- Yeisson Alexander Poroj Toc - 202408068
- Josué Uriel García Citalán - 202408004
- Rodrigo Iván Hernández Martínez - 202508087
- Paulo Julian Lepe Calderon - 202308055

## Curso

Programación Web

Universidad Mesoamericana  
Facultad de Ingeniería  
Sede Quetzaltenango


## Desarrollo local

La base común se implementa en `feat/dominick-platform`, workspace
`CloudMedTraceGT_Workspaces/Dominick`. Esta sección recoge las decisiones actuales
(Razor Pages + Django REST Framework + SQLite) y sustituye las alternativas de
tecnología, ruta `src/` y nombre de rama propuestas en los documentos de planificación.
Las reglas implementadas y las decisiones que sustituyen las propuestas anteriores están en [API_CONTRATOS.md](docs/API_CONTRATOS.md).

### Requisitos y estructura

Entorno verificado: SDK .NET **9.0.318** (`net9.0`), Python **3.13.14** y Git **2.49.0.windows.1**.
Django 5.2 admite Python 3.13: [compatibilidad oficial](https://docs.djangoproject.com/en/5.2/faq/install/).
Las dependencias Python reproducibles están en `backend/requirements.txt`.

```text
frontend/CloudMedTraceGT.Web/
  Pages/                     Dashboard, layout y seis módulos placeholder
  wwwroot/css/site.css       Estilos comunes sobre Bootstrap
  wwwroot/js/site.js         Consulta del estado mediante fetch
  wwwroot/lib/bootstrap/     Bootstrap local, sin CDN
  Properties/launchSettings.json
  appsettings.json           CloudMedApi:BaseUrl
backend/
  manage.py
  requirements.txt
  cloudmed_api/              Configuración, rutas y WSGI
  core/                     Modelos, servicios, serializers, API, admin, tests y migraciones
  .venv/                    Entorno local ignorado
  db.sqlite3                Archivo local ignorado, si se genera
```

### Backend (primera terminal, PowerShell)

Desde la raíz del workspace:

```powershell
cd backend
py -3.13 -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
python manage.py check
python manage.py migrate
python manage.py runserver 127.0.0.1:8000
```

Crear el entorno e instalar dependencias solo es necesario en la preparación inicial.
Si PowerShell impide activar el entorno, usa `.\.venv\Scripts\python.exe` en lugar
de `python` para cada comando; no necesitas cambiar la política de ejecución.
En el equipo comprobado, `python` fuera del entorno apunta al alias de Microsoft
Store; `py -3.13` selecciona el intérprete instalado.

Backend: **http://127.0.0.1:8000**.
Endpoint de estado: **http://127.0.0.1:8000/api/status/**.
API REST: **http://127.0.0.1:8000/api/**. Admin estándar: **http://127.0.0.1:8000/admin/**.
La raíz `/` devuelve 404 intencionalmente. No se ha creado un superusuario; si se necesita usar Admin, ejecutar `python manage.py createsuperuser`. La API no exige autenticación.

```json
{
  "sistema": "CloudMed Trace GT",
  "empresa": "CloudColor",
  "estado": "API funcionando"
}
```

Ejecutar `migrate` aplica `core/0001_initial` y las migraciones estándar requeridas por Django Admin.
Los modelos son Medicamento, Establecimiento, Lote, Movimiento y Alerta. El estado y los saldos
se calculan, sin tabla adicional de inventario. Usuarios y sesiones son dependencias del
administrador incorporado; no se añade autenticación a la API. Las bases locales se ignoran
conforme a `docs/GIT_WORKFLOW.md`; no existe una base demo versionada ni carga automática de datos.

### Frontend (segunda terminal)

Desde la raíz del workspace:

```powershell
cd frontend/CloudMedTraceGT.Web
dotnet build
dotnet run
```

Frontend: **http://localhost:5100** (perfil HTTP de desarrollo).
El dashboard lee `CloudMedApi:BaseUrl` de `appsettings.json` y publica únicamente
la URL del endpoint para `wwwroot/js/site.js`. No colocar secretos en esta opción.
Bootstrap se sirve localmente. El proyecto no necesita npm ni un framework JavaScript.

### Comunicación y CORS

Solo se permiten estos orígenes exactos en `backend/cloudmed_api/settings.py`:

- `http://localhost:5100`
- `http://127.0.0.1:5100`

CORS se aplica a `/api/`, permite GET/POST/PUT/PATCH/DELETE/HEAD/OPTIONS y no admite credenciales ni orígenes
comodín. Configuración basada en la [documentación de django-cors-headers](https://pypi.org/project/django-cors-headers/).
Si cambias los puertos, actualiza `launchSettings.json`, `CloudMedApi:BaseUrl`
y los orígenes CORS según corresponda. Esta configuración es solo para desarrollo
local: Django tiene DEBUG activado y una clave pública de desarrollo.

### Verificación manual

1. Inicia ambos servicios y abre el frontend: debe mostrar **API conectada**,
   **CloudMed Trace GT** y **CloudColor**.
2. Recorre los seis enlaces del menú: todos muestran **Módulo en desarrollo**.
3. Detén Django con Ctrl+C y recarga el frontend: debe mostrar **API no disponible**
   sin impedir usar el dashboard. El tiempo máximo de espera de la consulta es 5 segundos.
4. Inicia Django nuevamente y recarga para recuperar el estado conectado.
5. Comprueba el JSON con `Invoke-RestMethod http://127.0.0.1:8000/api/status/`.

Las tarjetas y la tabla contienen ejemplos temporales claramente identificados.
El campo y botón de búsqueda siguen deshabilitados; las interfaces de los módulos permanecen
como placeholders. La API ya ofrece CRUD, búsqueda, trazabilidad y verificación de lotes;
los compañeros implementarán sus interfaces consumiendo [el contrato REST](docs/API_CONTRATOS.md).
No se implementa QR.

### Pruebas del dominio

Desde `backend/`, con el entorno activado:

```powershell
python manage.py check
python manage.py makemigrations --check
python manage.py test
```

Los tests crean datos ficticios en una base aislada; no llenan la base local. Cubren contrato,
validaciones, estados, saldos parciales, correcciones del historial, CORS, Admin y concurrencia.
Para verificar Razor, ejecutar `dotnet build` desde `frontend/CloudMedTraceGT.Web`.
