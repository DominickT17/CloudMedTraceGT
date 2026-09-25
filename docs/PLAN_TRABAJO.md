# Plan de cierre — CloudMed Trace GT

## Completado en feat/dominick-platform

1. Auditoría del trabajo existente, contratos, modelos, servicios y pruebas.
2. Interfaces completas de Medicamentos, Establecimientos, Lotes y Movimientos.
3. Trazabilidad con ficha, saldos y timeline; navegación y manejo de errores.
4. Modal QR compartido y descarga PNG; verificación pública conservada.
5. Seed ampliado e idempotente; limpieza del escenario anterior sin borrar registros.
6. Regresión Django/JS, build, recorrido funcional, API apagada y base vacía aislada.
7. Documentación local/LAN y guion de exposición.

## Antes de exponer

- Confirmar fecha del sistema y consultar los estados del inventario.
- Configurar PublicBaseUrl con la IPv4 de la PC y regenerar el QR.
- Comprobar desde un teléfono físico en la misma Wi-Fi el puerto 5100 y la lectura con cámara.
- Ensayar el guion del README con un número de lote y registro sanitario nuevos.

El producto local está completado; los checks físicos de red/cámara dependen del lugar de exposición.
Publicar/integrar Git requiere otra instrucción. No se ejecutaron add, commit, push, merge ni rebase.
