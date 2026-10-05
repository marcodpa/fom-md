# Inspecciones del panel FOM

Fecha: 2 de octubre de 2026. Estado: implementado localmente, sin publicación ni push. Revisión visual final: disposición `ship`.

## Overview

Extensión operativa del panel oscuro existente para consultar revisiones realizadas desde la app, programar citas, atender hallazgos y administrar plantillas. La propuesta aprobada está en `output/propuesta-inspecciones-supervisor-v1/DISENO.md`; sus doce imágenes orientan la composición, mientras el contrato y los datos reales gobiernan el comportamiento.

`PRODUCT.md` describe el sitio publicitario y excluye el panel de su rediseño. Las extensiones publicitarias de `DESIGN.md` también delimitan su alcance. Esta superficie hereda el sistema de `src/styles/panel.css`, `src/styles/redesign.css` y los componentes `pnl-*`. Este documento registra decisiones locales; no reemplaza `DESIGN.md` ni `.impeccable/design.json` y no extiende reglas al marketing, mapa o mantenimiento.

## Colors

La implementación usa variables heredadas, sin crear una paleta independiente. El esquema oscuro del panel declara `--e-bg: #0a0d12`, `--e-sup: #141a22`, `--e-sup-baja: #0f141b`, `--e-borde: #262e39`, `--e-texto: #f3f5f8` y `--e-texto-2: #abb3bf`. El primario del panel conserva la marca (`--e-primario: var(--marca, #208aef)`); navegación activa y foco local usan `--e-primario-base`, declarado como `#3d9bf5` en oscuro.

Estados usan los colores semánticos existentes de `Tag`, sin atribuir un resultado nuevo: Aprobada, Con observaciones y Bloqueada corresponden a `aprobada`, `aprobada_con_observaciones` y `bloqueada`. El rojo identifica criticidad o acciones pertinentes; el texto acompaña al color. Las ayudas de campos tienen la corrección local `.insp-root .pnl-campo-ayuda { color: var(--e-texto-2); }`.

## Typography

Se hereda `--e-fuente` del panel, basado en Spline Sans y sus alternativas existentes. La escala local es h1 de 32 px, h2 de 20 px y h3 de 16 px; cuerpo principal de 14 px con interlineado 1.6. Hay metadatos y ayudas de 11 a 13 px observados en código, por lo que no se afirma un mínimo global de 14 px. Los números del resumen usan cifras tabulares y tamaño de 28 px. A 600 px o menos el h1 pasa a 28 px.

## Layout

La raíz `.insp-root` ocupa el ancho disponible, con máximo de 1800 px, `min-width: 0` y padding de 28/32/48 px. Cabecera y navegación contextual preceden al contenido. Resumen combina lista de atención con guía lateral de 300 px; Agenda y Hallazgos combinan lista y contexto de 330 px. Las tablas conservan el scroll dentro de `pnl-tabla-wrap`.

A 1200 px se estrechan las columnas laterales y se oculta el nombre auxiliar del responsable en las tareas. A 900 px las composiciones principales y modales pasan a una columna; a 600 px la cabecera se apila, el resumen usa dos columnas, filas se envuelven, campos del constructor pasan a una columna y filtros se ajustan al ancho. Las cinco secciones tienen navegación desplazable. Los modales mantienen su orden de DOM; no se promete un orden móvil distinto al implementado.

## Elevation & Depth

La profundidad se apoya en superficies tonales y bordes del panel, con los componentes compartidos para tarjetas y modales. El módulo no añade fotografías, escenas publicitarias ni sombras de dispositivo. El contexto del diálogo usa `--e-sup-baja`; la selección de unidad y fila usa `--e-info-sup`.

## Shapes

Tarjetas, guía y contexto usan radios de 12 px. El modal recibe 14 px, las opciones de unidad 9 px y bloques de resumen de resultado y edición de puntos 8 px. Se conservan botones, campos, chips e iconos de la consola.

## Components

### Navegación y cinco secciones

| Sección | Ruta | Contenido implementado |
| --- | --- | --- |
| Resumen | `/panel/inspecciones` | Unidades revisadas hoy, conteos de resultados, atención derivada de pendientes y resultados de hoy, últimos cinco resultados |
| Historial | `?vista=historial` | Fecha, todas las fechas, hoy, búsqueda de unidad/conductor y filtro de resultado |
| Agenda | `?vista=agenda` | Citas agrupadas por fecha, filtro, búsqueda, contexto y cancelación de programadas |
| Hallazgos | `?vista=hallazgos` | Filtros, búsqueda, puntos críticos primero, contexto y acciones permitidas por estado |
| Plantillas | `?vista=plantillas` | Metadatos, conteo de puntos, búsqueda, estados, crear borrador, publicar y archivar |

Una entrada Inspecciones en Flota reúne las cinco secciones. `/panel/inspecciones/programa` redirige con `replace` a `/panel/inspecciones?vista=agenda`. La navegación marca la sección mediante `aria-current`; una vista desconocida cae en Resumen. Los enlaces de resultado usan `/panel/inspecciones?vista=historial&inspeccion={id}` y solo abren un resultado presente en el listado autorizado. Si no está, se muestra una explicación.

Revisadas hoy cuenta unidades únicas frente al tamaño de flota cargada; Aprobadas, Con observaciones y Bloqueadas cuentan inspecciones. No representan cuatro conteos de vehículos únicos. La lista de atención no calcula predicciones ni considera automáticamente bloqueada a una unidad sin revisión.

### Resultado y checklist de solo lectura

El modal consulta `repo.inspecciones.obtener(id)` en modo conectado y agrupa las respuestas por categoría. Muestra nombre, estado, criticidad y nota, sin formulario para completar o modificar la inspección. Si faltan respuestas, informa la ausencia. El supervisor puede ir a Hallazgos; resolverlos no altera el resultado original ni desbloquea automáticamente la unidad.

En modo demostración existe una reconstrucción determinista previa del checklist desde la semilla. Esa representación no es evidencia de respuestas reales y no se utiliza cuando `CONECTADO` está activo. El adaptador conectado lee `findings` de la respuesta y también conserva `evidence`, pero esta interfaz no presenta un visor de evidencias.

### Programar en dos pasos

1. Unidad: búsqueda por alias o placa, selección explícita y contexto visible. Continuar permanece deshabilitado hasta que la unidad pertenece a la lista cargada. Una entrada desde pendientes puede preseleccionarla.
2. Detalles: plantilla publicada, responsable y fecha; el contexto resume las elecciones. Volver conserva los campos. No se solicita hora ni recurrencia.

Los campos locales `vehiculoId`, `plantillaId`, `asignadoA` y `fecha` se traducen a `vehicleId`, `templateId`, `assignedUserId` y `scheduledFor` con formato `YYYY-MM-DD`. Los responsables usan `userId` cuando está disponible y se filtran por estado activo (`active`/`activo`, o sin estado en la fuente). El formulario verifica pertenencia a las listas cargadas y muestra error si está incompleto.

### Citas, hallazgos y confirmaciones

Citas muestran `programada`, `completada` y `cancelada`. Cancelar se ofrece solamente para programadas, con motivo de al menos tres caracteres y `expectedStatus: 'programada'`. Un `inspectionId` real habilita el enlace al resultado.

Hallazgos muestran `pendiente`, `en_seguimiento`, `resuelto` y `descartado`. Desde pendiente se ofrece seguimiento; desde pendiente o en seguimiento, resolver o descartar. La confirmación conserva contexto, estado origen y destino, solicita nota de al menos tres caracteres y envía `expectedStatus`, `status`, `note` y `clientActionId`. El vínculo de ODT solo aparece si existe `workOrderId`; no crea órdenes.

### Borrador, publicación y archivo

Nueva plantilla pide código, nombre, versión entera positiva y puntos con nombre y criticidad. Puede agregar o quitar puntos, mantiene al menos uno y limita el constructor a 200. Nombre y cada punto requieren al menos dos caracteres. El adaptador normaliza el código, asigna códigos y orden de puntos, categoría General cuando falta y `vehicleTypes: []`.

La vista previa deriva exclusivamente del borrador local. Las plantillas guardadas muestran metadatos e `itemCount`; no se reconstruyen sus puntos. Crear guarda borrador. Publicar se ofrece desde borrador y archivar desde cualquier estado no archivado, con confirmación y `expectedStatus`. No se implementan edición, duplicación ni restauración. Los efectos sobre citas históricas o notificaciones no se afirman.

### Datos, empresa y permisos

El módulo usa `repo` y los contratos existentes de `repoApi.js` y `api.js`. Los endpoints siguientes llevan prefijo `/api/v1/console`:

| Operación | Método y endpoint |
| --- | --- |
| Resultados / detalle | `GET /inspections`, `GET /inspections/{id}` |
| Plantillas / crear / estado | `GET /inspection-templates`, `POST /inspection-templates`, `PATCH /inspection-templates/{id}/status` |
| Citas / programar / cancelar | `GET /inspection-schedules`, `POST /inspection-schedules`, `POST /inspection-schedules/{id}/cancel` |
| Hallazgos / seguimiento | `GET /inspection-findings`, `POST /inspections/{inspectionId}/findings/{answerId}/follow-up` |

Vehículos y personas se cargan desde los repositorios de flota y directorio, sin una lista global añadida para el supervisor. La ruta es accesible al área operativa y al administrador FOM con contexto de empresa. La guarda de Consola no da acceso a Inspecciones a las áreas gerencial, conductor o personal. La UI mantiene las guardas existentes; la autorización de cada escritura corresponde al servidor. No incorpora una matriz nueva de permisos por botón.

Para el administrador que gestiona otra empresa, `rutaPorEnte.js` transforma las rutas admitidas de vehículos y directorio. Los endpoints de inspecciones, plantillas, citas y hallazgos aún no tienen transformación admitida: la guarda los rechaza localmente con estado 501. No se considera implementado soporte completo de inspecciones entre empresas, ni se hace fallback a datos globales.

### Carga, errores y accesibilidad

Se reutilizan `Cargando`, `ErrorCarga` con reintento, `Vacio`, `Campo`, `Chips`, `Tag` y `Modal`. Los formularios marcan ocupado durante la escritura, conservan sus valores si falla y presentan el mensaje disponible. Solo tras respuesta confirmada se cierra el diálogo, se recarga la lista correspondiente y se comunica éxito. Esto describe código, no una escritura real comprobada.

`Modal` compartido tiene nombre accesible, `aria-modal`, foco inicial, contención de Tab, Escape y restauración al disparador conectado. El paso de programación enfoca el primer control al cambiar. Selecciones usan `aria-pressed`; campos conservan labels o nombre accesible; foco local tiene contorno de 2 px y separación de 3 px.

## Do's and Don'ts

- **Do** heredar tokens y controles del panel y conservar el contrato de datos.
- **Do** distinguir inspecciones contadas de vehículos únicos, y ausencia de datos de estados negativos.
- **Do** conservar contexto, estados explícitos, errores recuperables y borradores ante error.
- **Don't** convertir las imágenes de propuesta en fuente de registros, respuestas o permisos.
- **Don't** completar respuestas conectadas con supuestos ni añadir transiciones sin contrato.
- **Don't** trasladar esta extensión al marketing, mapa o mantenimiento.

### Verificación y límites de evidencia

El agente principal reporta build correcto y 57 tests aprobados. Verificó escritorio a 1672 px y móvil a 390 px sin desbordamiento horizontal, selección de unidad, formulario incompleto, vista previa con punto crítico, validación vacía y Escape con restauración de foco. Son comprobaciones locales de la ejecución; esta tarea documental contrastó el código y las fuentes, sin repetirlas.

No se hicieron escrituras reales a la API. La empresa disponible no contenía resultados, citas ni hallazgos para comprobar sus detalles y transiciones con registros reales. La existencia de código y contratos no sustituye esa comprobación.

Límites actuales del adaptador: `repoApi.inspecciones.listar` consulta como máximo 100 resultados por defecto, con filtros de fecha y búsqueda aplicados localmente y sin paginación completa del historial. No mapea `fallasCriticas`, `observaciones` ni `tipoVehiculo`, aunque la UI los consulta mediante formateadores; no hay evidencia suficiente para afirmar que esos campos se mostrarán correctamente con resultados conectados. Citas y plantillas usan límites de listado de 200. Los conteos describen los registros cargados, no una garantía de totalidad de la base.

La revisión pidió únicamente mejorar contraste de ayudas, ya aplicado mediante el token secundario del panel y marcado como resuelto. El veredicto final del reviewer es disposición `ship`, con capturas de escritorio y móvil válidas. Esta aprobación visual no acredita escrituras de extremo a extremo ni elimina los límites descritos. La implementación permanece local, no publicada y sin push.
