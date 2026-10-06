# Propuesta de mantenimiento para supervisores
Fecha: 2 de octubre de 2026. Estado: propuesta aprobada e implementada en la web local; pendiente de despliegue público.
Responsable de esta entrega: Codex, por solicitud del usuario. Herramienta: image_gen integrada.
Galería: index.html. Imágenes: 01-inicio.png a 15-accion-confirmar.png. Prompts: prompts.json.

## Dirección
Modo Operate. Mantener FOM oscuro y azul; sustituir el tablero dominado por columnas vacías por atención priorizada y un siguiente paso explícito. Integrar Órdenes, Próximos servicios y Planes dentro de Mantenimiento. No modificar el centro de control ni el mapa avanzado por Claude.

## Fuentes de función
- src/panel/modulos/Mantenimiento.jsx: listado/tablero, creación, detalle, transiciones, asignación y ejecución.
- src/panel/modulos/Planes.jsx: planes, cobertura de una unidad, acciones, enlace a ODT preventiva y actualización de acción.
- src/panel/datos/catalogos.js: nombres de estados y prioridades.
La captura adjunta muestra la densidad y columnas vacías que motivan el rediseño.
No se validó aquí el backend público ni se hicieron operaciones reales.

## Secuencia de revisión
1. Inicio: prioridad de atención, resumen pequeño, cierres recientes.
2. Listado: filtros legibles y acceso al detalle.
3–4. Crear orden: elegir explícitamente unidad y describir la falla.
5. Revisar: ficha de orden, progreso y nota obligatoria antes de confirmar.
6. Asignar: miembros activos permitidos por el servidor, resumen y nota.
7. Taller: seguimiento de ejecución; no mostrar acciones del responsable a otro supervisor.
8. Cierre: solución obligatoria, costo USD opcional, nota y confirmación.
9. Cambio de estado: cancelación como ejemplo; reutilizar la misma estructura para revisión, aprobación y reapertura con el texto y destino reales.
10. Próximos servicios: acciones pendientes/en curso/completadas/descartadas.
11–12. Planes: listado y creación.
13. Asignar un plan a una unidad: kilometraje del último servicio y próximo vencimiento introducidos por el usuario.
14–15. Acción: creación y confirmación; la orden vinculada se gestiona por separado.

## Contrato conservado en la implementación local
- Preservar cada estado exacto y las transiciones PASOS_ODT. El resumen agrupa visualmente, no cambia el contrato.
- En revisión se puede aprobar; Aprobada permite asignar. Cerrada puede reabrirse a En revisión. Cancelada no admite cambios.
- Eventos inicio/pausa/reanudación/entrega SOLO si soyResponsable; el supervisor que no lo sea no obtiene esos botones.
- Toda transición necesita nota de al menos 3 caracteres. Cierre exige notaSolucion y costo opcional finito no negativo.
- Crear orden conserva los campos actuales, descripción de mínimo 10 caracteres, tipo de falla y ubicación. No añadir prioridad editable ni adjuntos sin contrato.
- Plan conserva código, servicio, descripción, estrategia fixed/floating/combined, cadaKm/cadaDias y criticidad. Requerir al menos un intervalo; normalizar y validar código existente.
- Cobertura es individual; no inventar alta masiva, odómetro en vivo o fechas calculadas.
- Crear acción conserva unidad, plan y ciclo requeridos para preventiva, tipo preventiva/predictiva, título, detalle, relevancia, km/fecha, costo y USD/VES.
- Iniciar acción solo pendiente; completar/descartar según acciones actuales. Abrir ODT solo cuando no esté ya vinculada; ocultar o deshabilitar y explicar cuando contrato no lo permita.
- Estado vacío: título orientado a la tarea y CTA existente, sin tablas/columnas grandes vacías. Carga: skeleton preservando estructura. Error: mensaje junto al campo/acción, conservar datos y permitir reintento. Éxito: confirmar resultado con placa y estado actualizado, no limpiar datos hasta respuesta.
- Al guardar bloquear duplicados y validar estados concurrentes; si el servidor rechaza, mostrar motivo real. Todos los datos de supervisor deben quedar limitados a su empresa.
- Mantener controles accesibles, foco visible, labels, navegación por teclado y modal con Escape/restauración de foco. Vista estrecha: navegación colapsada, ficha primero, acción después; formularios en una columna.
- La función Reglas del módulo actual es heredada y solo de consulta. No prometer automatismos desde ella; Planes.jsx dice que fue reemplazada por planes/acciones. Conservar acceso informativo según contrato vigente, fuera del bloque principal.

## Límites de las imágenes generadas
Todos los nombres, placas, costos y fechas son de demostración. No copiarlos a producción.
Los pequeños contadores de caracteres, números de folio, fechas, fotos de vehículos y textos de fondo son material ilustrativo, no especificación API.
No añadir folios cortos, historial general completo ni filtros de servidor nuevos sin verificar el modelo; usar identificador y eventos existentes. Prioridad solo lectura si viene del servidor.
Los iconos, colores secundarios y algunos detalles de fondo tienen variaciones de generación. Implementar un único sistema de componentes y tokens, conservando el logo real FOM. El cuerpo activo de cada pantalla gobierna su propuesta, no las pantallas atenuadas detrás de los modales.
No representar todos los vehículos como camionetas: en producción usar imagen disponible y referencia por tipo, correctamente identificada.
La flecha de avance es visual. No habilita drag-and-drop ni transiciones automáticas.

