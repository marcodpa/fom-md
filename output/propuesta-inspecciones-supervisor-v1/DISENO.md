# Propuesta de Inspecciones para supervisores
Fecha: 2 de octubre de 2026. Estado: diseño visual para revisión; no implementado.
Generación: herramienta image_gen integrada. Prompts en prompts.json.
Referencia visual: propuesta aprobada de Mantenimiento, 01-inicio.png.

## Dirección
Modo Operate. Extensión de la consola FOM existente: fondo oscuro, superficies azul oscuro, azul primario, estados semánticos, jerarquía compacta, siguiente acción explícita.
Una entrada Inspecciones reúne Resumen, Historial, Agenda, Hallazgos y Plantillas. Programa de inspecciones pasa al interior, conservando una redirección de la ruta antigua cuando se implemente.
No tocar el mapa ni el mantenimiento ya implementado.

## Pantallas
1. Resumen de Inspecciones: 01-resumen.png
2. Historial de resultados: 02-historial.png
3. Resultado y checklist completo: 03-resultado.png
4. Agenda de inspecciones: 04-agenda.png
5. Programar: elegir unidad: 05-programar-unidad.png
6. Programar: plantilla, persona y fecha: 06-programar-detalles.png
7. Cancelar cita con motivo: 07-cancelar-cita.png
8. Hallazgos y seguimiento: 08-hallazgos.png
9. Confirmar seguimiento o resolución: 09-resolver-hallazgo.png
10. Plantillas de revisión: 10-plantillas.png
11. Crear plantilla y puntos críticos: 11-nueva-plantilla.png
12. Publicar o archivar con claridad: 12-publicar-plantilla.png

## Fuentes funcionales
- src/panel/modulos/Inspecciones.jsx: revisión diaria, pendientes, historial con búsqueda/fecha/resultado y detalle agrupado por categorías.
- src/panel/modulos/ProgramaInspecciones.jsx: citas, cancelación, hallazgos, plantillas, publicación y archivo.
- src/panel/datos/repoApi.js, programaInspecciones: contratos de las escrituras.
La propuesta usa ejemplos ficticios. No se copiaron datos personales de usuarios ni se hicieron escrituras de prueba.

## Contrato para implementación
- Inspecciones se realizan en la app. No agregar formulario de inspección ni edición del resultado en la web.
- Resultados exactos: aprobada, aprobada_con_observaciones, bloqueada. Etiquetas: Aprobada, Con observaciones, Bloqueada. Nunca inventar Rechazada.
- Checklist: respuestas reales, categoría, nombre, estado, criticidad y nota. Si faltan respuestas, mostrar ausencia, no completar con suposiciones.
- Métricas del día diferenciadas: revisadas cuenta unidades únicas; aprobadas/observaciones/bloqueadas del código actual cuentan inspecciones. No presentar estas últimas como conteos únicos de vehículos sin adaptar explícitamente la lógica.
- Atención: derivar únicamente de pendientes e inspecciones reales. Sin predicciones ni agregados de fallas ficticios.
- Programar: elección explícita de vehículo, plantilla PUBLICADA, responsable y fecha. Solo fecha; no hora ni recurrencia. Enviar vehicleId, templateId, assignedUserId, scheduledFor (YYYY-MM-DD).
- Personas y vehículos limitados a la empresa seleccionada y permisos existentes. No usar una lista global para supervisor.
- Cita: programada, completada, cancelada. Cancelar solo programada, con motivo y expectedStatus. Abrir inspección realizada si existe inspectionId.
- Hallazgo: pendiente, en_seguimiento, resuelto, descartado. Seguimiento solo desde pendiente; resolver/descartar solo abierto. Nota de mínimo 3 caracteres, estado esperado y clientActionId.
- Resolver hallazgo NO cambia el resultado original ni desbloquea automáticamente una unidad.
- La ODT vinculada se consulta por su identificador real. No inventar creación automática de órdenes desde un hallazgo.
- Plantilla: código normalizado, nombre, versión entera positiva, uno o más puntos con nombre y crítico. El constructor agrega y quita puntos, hasta el límite vigente 200.
- La vista previa de puntos usa solamente el borrador local; las listas de plantillas existentes solo traen itemCount y metadatos. No fabricar sus puntos.
- Crear guarda borrador. Publicar desde borrador; archivar desde estado no archivado, preservando expectedStatus. No añadir edición, duplicación ni restauración sin contrato.
- Confirmaciones de publicación/archivo son mejora de UI sobre llamadas existentes. No prometer efectos sobre citas históricas o notificaciones sin comprobar backend.
- Guardar: prevenir doble envío, conservar campos ante error, mostrar motivo real y recargar tras respuesta confirmada.
- Carga, errores recuperables, ausencia de respuestas, listas vacías y éxito tienen mensajes específicos.
- Accesibilidad: labels, foco visible, Escape, contención/restauración de foco en modales; estado expresado por texto e icono además del color.
- Móvil: navegación desplazable o adaptable, filas en bloques, contexto primero y formulario después; sin depender de hover.

## Límites de las imágenes
Textos pequeños, fechas, cifras, indicadores y algunos detalles pueden variar por la generación. Este contrato y los datos reales prevalecen.
El diseño no autoriza funciones nuevas ni transiciones nuevas.
Una fecha de programación no equivale a que la unidad deba salir a ruta; ausencia de inspección no significa bloqueo automático.
La referencia visual hereda la identidad aprobada, sin modificar los documentos globales de diseño ni el código de producción.

## Estado de implementación local, 2 de octubre de 2026

La cabecera conserva el estado histórico de la propuesta visual. Su implementación ya está realizada en el checkout local: cinco secciones dentro de Inspecciones, programación de dos pasos, resultado de solo lectura, citas, hallazgos y confirmaciones, constructor de borrador y publicación/archivo con los contratos existentes. La ruta antigua `/panel/inspecciones/programa` redirige a `/panel/inspecciones?vista=agenda`.

La descripción de la superficie implementada, los tokens heredados y los límites funcionales están en [docs/DISENO-INSPECCIONES.md](../../docs/DISENO-INSPECCIONES.md). No se modifican `DESIGN.md` ni `.impeccable/design.json` publicitarios, marketing, mapa o mantenimiento.

Verificación reportada por el agente principal: build correcto, 57 tests aprobados; escritorio de 1672 px y móvil de 390 px sin overflow horizontal; selección de unidad, formulario incompleto, preview de punto crítico, validación vacía y Escape/restauración de foco comprobados. La corrección de contraste de ayudas se aplicó localmente con `--e-texto-2` y quedó resuelta. El veredicto final del reviewer es disposición `ship`, con capturas de escritorio y móvil válidas. La aprobación visual no acredita escrituras de extremo a extremo.

No se hicieron escrituras reales a la API. La empresa disponible no tenía resultados, citas ni hallazgos para comprobar detalles y transiciones reales. La guarda existente rechaza los endpoints de inspecciones sin ruta admitida por empresa cuando el administrador gestiona otra empresa. El documento local registra también límites del adaptador y listados; no se considera comprobada la totalidad del historial ni los campos de conteos ausentes del adaptador.

Estado de entrega: implementado localmente, no publicado y sin push. Este registro no convierte los datos ficticios de las láminas en datos reales ni amplía el contrato.
