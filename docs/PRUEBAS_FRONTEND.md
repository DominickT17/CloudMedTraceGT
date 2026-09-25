# Verificación final — CloudMed Trace GT

24 de septiembre de 2026 · workspace Dominick · feat/dominick-platform.
Se conservaron los cambios previos y las pruebas originales; no hubo integración Git.

## Automatizadas

- `python manage.py check`: sin incidencias.
- `python manage.py makemigrations --check`: sin cambios.
- `python manage.py test`: 57 aprobadas (53 anteriores conservadas, con expectativas del seed ampliado, más 4 nuevas).
- Nuevas pruebas: 10 medicamentos/7 establecimientos/12 lotes y cuatro estados, conversión del escenario anterior
  conservando IDs/saldos, rollback ante colisión y conservación de fechas/ediciones en ejecuciones posteriores.
- `node --test frontend/tests/api.test.cjs`: 9 aprobadas. Persiste las siete comprobaciones del helper anterior
  y agrega el uso del handler de verificación del mismo servidor.
- `dotnet build`: 0 errores, 0 advertencias. QRCoder 1.8.0 conservado.
- Sintaxis de todos los archivos JS propios comprobada con `node --check`.
- Seed ejecutado dos veces sobre SQLite local: comparación completa de las cinco entidades sin diferencias.

## Recorrido de navegador

| Caso | Resultado observado |
|---|---|
| Dashboard | Cuatro conteos reales, API conectada, últimos cinco movimientos |
| Medicamentos | Crear, editar, detalle y búsqueda; error entendible ante borrado protegido |
| Establecimientos | Crear, editar, detalle; tipos con nombres amigables |
| Lotes | Crear, buscar, detalle; rechazo de reducción bajo ingresos; edición válida guardada |
| Movimientos | Ingreso 5000, traslado 2000 y segundo traslado 1000 |
| Saldo insuficiente | Traslado de 6000 rechazado; conserva formulario; corregir a 2000 permite guardar |
| Otras validaciones | Bloqueado, vencido y origen=destino rechazados sin JSON crudo |
| Trazabilidad | Tres pasos cronológicos; saldos 3000/1000/1000, total 5000 |
| Alertas | Crear bloqueo, ver Bloqueado; desactivar, conservar alerta y volver a Seguro |
| Verificación | Cinco campos públicos; seguro, bloqueado e inexistente |
| QR | Modal desde Dashboard y detalle de Lotes; número, imagen, URL, Descargar QR y Cerrar |
| PNG | HTTP 200 image/png, firma PNG y lectura de imagen válidas; nombre QR_CMT-AMX-01.png |
| Contenido QR | Decodificado con lector independiente: http://localhost:5100/Verificar?lote=CMT-AMX-01 |
| API apagada | Las ocho pantallas muestran API no disponible; Guardar se rehabilita y conserva campos |
| Base vacía | Dashboard y catálogos con mensajes; Alertas y creación de Lotes sin referencias deshabilitadas |
| Eliminar/cancelar | Base descartable: Cancelar conserva el registro; confirmar lo elimina y muestra éxito |
| Navegación activa | Create/Edit/Details de Medicamentos, Establecimientos y Lotes conservan módulo activo |
| Navbar de subruta | Enlaces limpian mode/id para volver al listado, sin reabrir el detalle actual |
| Móvil | Ocho pantallas inspeccionadas a 320 px; sin desbordamiento global; tablas desplazan localmente |
| Escritorio | Tablas, Dashboard, Alertas y timeline inspeccionados a 1366 px |
| Consola | Sin excepciones JS en recorrido normal; HTTP fallidos de pruebas deliberadas son esperados |

Pulido: columnas de tabla con ancho mínimo legible, tarjetas pequeñas con títulos completos,
formularios apilados y modal desplazable, badges sin estiramiento vertical, botón de trazabilidad
sin partir su texto, guía móvil para desplazar tablas. Menú móvil abierto y enlace comprobado.
No quedan textos visibles de funcionalidades pendientes ni sufijos del escenario anterior.
Los atributos HTML `placeholder` son ayudas de entrada, no mensajes de implementación pendiente.

## Datos conservados y límites

La base final local tiene 12 medicamentos, 10 establecimientos, 14 lotes, 37 movimientos y 5 alertas
(3 activas). Incluye el seed, los registros anteriores y el recorrido de exposición EXPO-0924.
EXPO-0924 conserva su alerta INACTIVA y sus tres movimientos. Se preservaron los registros previos.
El medicamento anterior PF-DEMO-001 pasó a PF-ACA-001 y Laboratorio ficticio; conservó ID y lote.
Los homónimos de establecimientos se distinguen en selectores por municipio y referencia, sin fusionarlos.

Seed aislado: 10 medicamentos, 7 establecimientos, 12 lotes, 32 movimientos y 2 alertas activas.
Estados iniciales: 6 seguros, 2 próximos, 2 vencidos y 2 bloqueados. No restablece fechas ni cambios.
La prueba vacía usó una SQLite temporal; al terminar se restableció el servicio con la base habitual.
El lector QR de validación se instaló solo en una carpeta temporal, no en requirements del producto.

No se probó una cámara física ni conectividad Wi-Fi/firewall del teléfono. PublicBaseUrl conserva localhost por defecto;
README explica la configuración temporal LAN, y Verificar consulta Django desde Razor sin exponer 8000.
Los enlaces antiguos con números DEMO deben regenerarse tras la conversión del seed.
No hay autoactualización entre pestañas: usar Actualizar o Consultar. No se implementó --reset.
Sin git add, commit, push, merge, rebase, restore ni cambio de rama.


## Corrección de acceso LAN

- MapStaticAssets + WithStaticAssets generaban los nombres fingerprinted. En la instancia
  examinada devolvían 200 incluso con Host LAN: no se pudo reproducir el fallo original
  ni confirmar una discrepancia de manifiesto/cache/instancia.
- Se reemplazaron por UseStaticFiles y rutas físicas con ?v=. Once assets de las ocho
  páginas devuelven 200 con MIME correcto. No se modificaron Bootstrap ni su contenido.
- Se corrigió la URL de API loopback publicada al navegador mediante rutas /api/ de Razor.
  Nueve lecturas y quince escrituras inválidas (sin mutar registros) conservan JSON y códigos HTTP.
- localhost:5100, Dashboard y /Verificar funcionan. Menú móvil Bootstrap operativo;
  Dashboard y Verificar sin desbordamiento horizontal a 390 px, sin errores de consola.
- PNG descargado y decodificado: http://192.168.1.8:5100/Verificar?lote=CMT-AMX-01,
  configurado mediante variable de entorno PublicBaseUrl, sin modificar su valor por defecto.
- Build: cero errores/advertencias. JS: 9/9. git diff --check sin errores.
- La revisión automática rechazó iniciar Razor en 0.0.0.0 (blocked by policy).
  Se probó en loopback; acceso directo a 192.168.1.8:5100 y teléfono físico pendientes.
