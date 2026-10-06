# Consulta de mantenimiento — 6 oct 2026

Mantenimiento tiene una pestaña **Todas las órdenes**, accesible también desde `/panel/mantenimiento?vista=todas`. Consulta las órdenes de la empresa actual, incluidas cerradas y canceladas. Se puede buscar por descripción, unidad, creador o identificador y filtrar por vehículo, estado y tipo. «Limpiar filtros» recupera la lista completa.

El repositorio consulta las páginas del servidor hasta completar el listado. Antes solo se consultaban las primeras 100 órdenes. Una página repetida produce un error visible en vez de dejar un listado incompleto sin aviso.

El historial agrupa los pasos por fecha y separa hora, acción, autor, responsable y notas. Los cambios de estado y los eventos de ejecución que corresponden a la misma operación se presentan juntos; los registros originales del servidor permanecen intactos. Se conservan notas diferentes, ciclos de reapertura y operaciones de distintas personas o momentos. Un autor o una fecha ausentes se indican sin inventarlos.

También se corrigió la traducción de `resolutionNote` a `notaSolucion`, que hacía aparecer una orden cerrada sin explicación aunque el servidor tuviera la solución registrada.

Validación: 84 pruebas aprobadas y compilación de producción aprobada. En la API real, la empresa FOM OPERATIONS devolvió 6 órdenes; el filtro Cancelada mostró 2 y «Limpiar filtros» volvió a 6. Se comprobó el historial de «moton averiado» en escritorio y móvil, sin modificar órdenes. Las capturas reales se mantienen locales en `.impeccable/review/historial/`.
