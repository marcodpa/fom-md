# Propuesta completa de Reportes para supervisores
Fecha: 5 de octubre de 2026. Estado: propuesta aprobada e implementada localmente en Reportes; sin publicación ni push de esta extensión.
Generación: image_gen integrada. Una imagen horizontal por pantalla, 1672 × 941.
Referencia visual: propuesta aprobada de Inspecciones, 01-resumen.png. Prompts exactos: prompts.json.

## Dirección y alcance
Modo Operate: consulta clara para un supervisor, hereda el panel FOM oscuro. Una sola entrada Reportes con Resumen, Operación, Mantenimiento, Seguridad, Costos, Unidades y Conductores. Tareas separadas con barra común de período/área y acciones de exportación. La aplicación local modifica únicamente la extensión Reportes y su soporte de cálculo/pruebas; conserva el mapa, mantenimiento, inspecciones y marketing.

## Imágenes
1. Resumen: 01-resumen.png
2. Operación: 02-operacion.png
3. Mantenimiento: 03-mantenimiento.png
4. Seguridad: 04-seguridad.png
5. Costos: 05-costos.png
6. Unidades: 06-unidades.png
7. Conductores: 07-conductores.png
8. Exportar y compartir: 08-exportar.png
9. Informe para imprimir: 09-informe.png
10. Sin unidades / recuperación: 10-sin-datos.png

## Fuentes
- src/panel/modulos/Reportes.jsx y reportes.css: siete vistas, 30/90/365 días, área, CSV de unidades, vista previa de informe y window.print.
- src/panel/modulos/reportes-datos.js y test/reportes.test.js: métricas derivadas, límites de fuentes, estados adicionales y CSV saneado.
- src/panel/datos/repoApi.js y repo.js: resumen, vehículos, personal, ODT, costos y eventos.
- Revisión inicial de /panel/reportes: datos parciales, costos no disponibles, fallo de eventos por limit mayor de 100 e índice/odómetros incompletos. La verificación de cierre muestra eventos disponibles; costos de operación permanece no disponible. No se sustituyen índices ni odómetros faltantes por cero.
Las imágenes utilizan Empresa de demostración y ejemplos ficticios para mostrar densidad. No reproducen nombres ni registros privados y no crean datos de prueba.

## Contrato conservado en la implementación
- Mantener el alcance de la empresa autorizada; área filtra unidades, ODT y conductores vinculados, sin abrir permisos.
- Períodos exactos: últimos30,90,365días. Cambiar el texto Este mes por Últimos30días: no es mes calendario. Sin intervalo personalizado, tendencias históricas ni comparativas sin contrato.
- Estado de marcha, odómetro y asignación de conductor son información actual. No presentar odómetro acumulado como distancia recorrida del período. La imagen02 ya fue corregida para mostrar índices actuales, no rendimiento del período.
- En marcha, detenida y sin dato se distinguen. Detenida no significa falla ni requiere semántica de peligro: implementación debe usar neutral para parada; la imagen02 ya usa neutral; mantener esta semántica en todas las vistas.
- Índice promedio solo si existen valores válidos para todas las unidades del alcance. Si faltan, Sin dato completo. No inventar puntuación.
- Identificación = unidades con conductorPrincipalId / unidades del alcance. No confirma identificación GPS ni conductor real de cada viaje. La imagen04 fue corregida para decir unidades con conductor asignado.
- ODT: filtrar por vehículo autorizado y creadaEn dentro del período. Mostrar estados disponibles, total y tipos de falla derivados; no presentar abiertos/revisión/cerrados como totalidad si existen otros estados. Costo registrado corresponde a ODT cerradas del conjunto, no costo total de operación.
- Tiempo promedio de resolución procede del resumen cuando disponible; no afirmar que comparte filtro de área o período sin respaldo.
- Eventos por 100 km requiere kilómetros y eventos válidos del mismo período. La vista implementada muestra la métrica como no disponible y distingue el conteo de eventos consultados. No usa odómetro acumulado para calcular una tasa ni deduce cero de error de fuente.
- Costos propios no disponibles en servidor actualmente. Mostrar No disponible y causa, nunca $0 por fallback. Distinguir esta fuente del costo registrado al cerrar ODT. La implementación incluye presentación de categoría, total, movimientos y costo por km cuando responde la fuente; el denominador de esa tasa requiere validación de la fuente. No rellenar gráfico con datos supuestos.
- Fuente costos actual es toda empresa, no área. Hacer el alcance visible.
- Vehículos/conductores se presentan en tablas con acciones a expedientes reales existentes. Búsqueda de unidad/persona y filtro local de estado están implementados sobre registros cargados; no añaden endpoints ni garantizan totalidad/paginación.
- CSV contiene unidades, placa, área, estado, odómetro, índice, documentos y conductor. No exporta todos los módulos. Implementa UTF-8 con BOM, separador punto y coma, escape de celdas y saneamiento de prefijos de fórmula no numéricos. Ausencias van vacías, nunca cero supuesto.
- Compartir reporte es reorganización de las dos acciones actuales. No enviar correo, links públicos, XLSX ni automatizaciones.
- Informe imprimible implementa vista previa con tres columnas y tabla de unidades, CSS A4 horizontal y diálogo del navegador mediante window.print. Conserva avisos de fuentes faltantes, empresa y fecha reales; no es generador PDF backend ni certificado.
- Resumen de disponibilidad deriva de faltantes: datos disponibles se conservan aunque otra fuente falle. Mostrar causa recuperable y reintento sin borrar contexto.
- Vacío de área no es error global. Cambiar a toda empresa conserva período. Si fuente vehículos falla, mostrar error y reintentar; no tratarlo como flota vacía.
- Exportar deshabilitado sin unidades/carga/error de fuente correspondiente. No perder filtros ni mostrar éxito antes de iniciar descarga.
- Accesibilidad: texto además de color; nombres accesibles, navegación teclado, foco visible, Escape/restauración en modal, contraste ayudas. Móvil tabs desplazables, filtros apilados y tablas con desplazamiento interno.
- Sin funciones de cobro, pagos, predicción, clasificación de personas ni creación de registros desde Reportes.

## Límites y evidencia de implementación
Imágenes raster generadas: detalles de texto, iconos y redondeo pueden variar; este contrato y los datos reales prevalecen. Los porcentajes se redondean por categoría y pueden sumar 99 o 101; el total conserva todos los estados. Nombres ficticios no ingresan al código como datos reales. Las imágenes no son evidencia funcional ni forman la interfaz publicada.

La implementación local y sus reglas observadas se documentan en docs/DISENO-REPORTES.md. El coordinador verificó las siete vistas, búsquedas, filtro de estado, área/períodos de 30/90 días, modal con Escape/foco y móvil de 390px sin desbordamiento de página. Inicio de CSV observado, sin archivo guardado verificado: el evento de descarga agotó su espera. Vista previa y CSS de impresión revisados; no se ejecutaron impresión del sistema ni guardado PDF. Vacíos de área y errores comprobados solo mediante fuente/tests. npm test: 69 pruebas aprobadas en el repositorio concurrente; npm run build aprobado.

Capturas de cierre: .impeccable/review/reportes/{resumen-desktop,resumen-completo,mantenimiento-desktop,exportar-desktop,informe-desktop,resumen-mobile,exportar-mobile}.png. Revisor fresco reportes_finish_reviewer: densidad de resumen, composición de informe y texto técnico corregidos; los tres hallazgos Resolved, disposición ship para ese alcance. Revisión mediante rol de respaldo del harness, sin nueva prueba de navegador. Detector asesor ejecutado una vez: observaciones globales de fuente/radio/rampas de marketing sin bloqueo y sin especificación formal de comparación por píxel.

Extensión aplicada localmente, sin publicación ni push en este turno. Costos de operación requiere una fuente de servidor disponible; la interfaz muestra su ausencia sin inventar $0. El fallo previo observado al salir del mapa (removeChild durante limpieza MapLibre) permanece fuera de esta extensión. El sistema del panel y el mundo visual de marketing se conservaron.

