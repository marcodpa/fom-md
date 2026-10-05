---
name: FOM · Mantenimiento de supervisores
description: Contrato local de la extensión implementada sobre la consola existente.
colors:
  primary: "var(--e-primario-base)"
  primary-content: "var(--e-sobre-primario)"
  background: "var(--e-bg)"
  surface: "var(--e-sup)"
  surface-low: "var(--e-sup-baja)"
  border: "var(--e-borde)"
  text: "var(--e-texto)"
  text-secondary: "var(--e-texto-2)"
  information: "var(--e-info)"
  information-surface: "var(--e-info-sup)"
  success: "var(--e-exito)"
  warning: "var(--e-aviso)"
  danger: "var(--e-peligro)"
typography:
  headline:
    fontFamily: "var(--e-fuente)"
    fontSize: "36px"
    lineHeight: 1.25
    letterSpacing: "-0.8px"
  title:
    fontFamily: "var(--e-fuente)"
    fontSize: "20px"
  body:
    fontFamily: "var(--e-fuente)"
    fontSize: "14px"
rounded:
  surface: "12px"
  dialog: "14px"
  selection: "8px"
spacing:
  field: "18px"
  section: "24px"
  wide: "32px"
---

# Diseño implementado: Mantenimiento

## Overview

Registro de la extensión terminada el 2 de octubre de 2026. Su alcance es exclusivamente Mantenimiento dentro de la consola para supervisores. Hereda el mundo visual oscuro, la fuente, el logo y los componentes existentes del panel. Este documento complementa el sistema vigente; no reemplaza `DESIGN.md` ni `.impeccable/design.json` de la identidad preexistente.

**Regla de autoridad.** El código implementado determina comportamiento y valores. La propuesta aprobada en `output/propuesta-mantenimiento-supervisor-v1/DISENO.md` y sus imágenes 01–15 explica la intención; sus datos de demostración y detalles ilustrativos no constituyen contratos de producción.

La pantalla prioriza las órdenes que necesitan atención, indica el siguiente paso y reúne Órdenes, Próximos servicios y Planes. El centro de control y el mapa conservan su propia composición. Las fuentes de este registro son `src/panel/modulos/Mantenimiento.jsx`, `Planes.jsx`, `mantenimiento.css`, `src/panel/Consola.jsx`, `src/panel/comp/ui.jsx`, `src/styles/panel.css` y `src/styles/redesign.css`.

## Colors

Los valores del frontmatter son referencias vivas al panel. No se crea una paleta paralela dentro de Mantenimiento. `mantenimiento.css` solo introduce el alias de separador `--mnt-line: var(--e-borde)`.

La consola monta `.pnl.fom-dark`. La capa existente `redesign.css` proporciona fondo oscuro (`#0a0d12`), superficie (`#141a22`), superficie baja (`#0f141b`), texto (`#f3f5f8`), texto secundario (`#abb3bf`), separador (`#262e39`), información azul (`#3d9bf5`) y selección tonal (`#10202e`). Éxito, aviso y peligro conservan sus roles verde, ámbar y rojo del panel.

**Regla de herencia.** Resolver los tokens mediante la cascada del panel. `--e-primario-base` continúa definido por `panel.css` según el tema; no equivale necesariamente al `--e-primario` azul fijado por `.fom-dark`. Los botones generales heredan `--e-primario`; la navegación local, el foco y los botones de atención usan `--e-primario-base`, tal como está implementado.

El estado siempre aparece también como texto. Cancelar una orden emplea el peligro en su confirmación; seleccionar una unidad, un responsable o un filtro emplea información y superficie tonal. No deducir permisos de un color.

## Typography

El módulo usa `var(--e-fuente)`. La capa oscura existente define Spline Sans con Segoe UI, system-ui y sans-serif como respaldo. No añade una fuente de marca.

El título principal implementado es grande (36px; 28px hasta 700px), con interlínea 1.25 y ajuste de letras -0.8px. Los encabezados de tarjetas usan 20px; los títulos de órdenes, 17px y 15px en móvil. Los formularios y el cuerpo principal usan 14px; metadatos y ayuda, 11–13px. Contadores, costos y columnas numéricas usan cifras tabulares para facilitar comparación. Estos tamaños son ajustes locales de densidad; no amplían la escala global del panel.

## Layout

El contenido ocupa todo el ancho disponible, con máximo de 1800px, mínimo de ancho cero y relleno lateral de 32px. La última regla del módulo fija el relleno superior en 20px. La acción de creación se alinea a la derecha del encabezado en escritorio. La navegación interna tiene separador inferior y subrayado activo.

La vista de atención combina la tarjeta principal y una guía lateral de 285px, que aumenta a 320px desde 1450px. Las cuatro métricas son una banda compacta: Por revisar, En proceso, Cerradas este mes y Costo acumulado. Sus cifras se calculan sobre todas las órdenes cargadas, independientemente de los filtros visibles; el costo acumula los cierres, no solo el mes.

Hasta 1100px, la atención pasa a una columna y la guía se oculta. Hasta 700px, el relleno lateral baja a 16px, la acción de creación vuelve al flujo, las métricas forman dos columnas y ocultan sus iconos, las búsquedas ocupan el ancho disponible y las filas admiten salto de línea. La navegación puede desplazarse horizontalmente y oculta sus iconos.

En escritorio, detalle y siguiente paso forman dos columnas; creación y formularios de planes muestran contexto o vista previa lateral. Hasta 700px se apilan. La vista previa de planes se coloca antes del formulario; el contexto adicional de creación se oculta. La confirmación de una transición conserva unidad y acción en una columna móvil. Las tablas se desplazan dentro de su contenedor y conservan un mínimo local de 700px: no deben ensanchar todo el documento.

## Elevation & Depth

Se conserva la profundidad tonal del panel oscuro: tarjetas planas, bordes discretos y contexto en superficie baja. `redesign.css` anula la sombra de tarjetas y mantiene la sombra flotante existente para superposiciones. Mantenimiento no incorpora sombras ornamentales ni una animación de entrada propia. El modal utiliza el fondo y la gestión de desplazamiento del componente compartido, con nivel local de superposición 1000.

## Shapes

Tarjetas y bloques de contexto usan esquinas suavizadas (12px); modal (14px); selección y filtros (8px); miniaturas (8px). Los campos y botones generales mantienen las esquinas del panel oscuro (12px), así como su altura mínima existente. Las filas de planes y servicios son continuas, separadas por bordes; no se convierten en tarjetas independientes. El progreso usa líneas cortas y las selecciones añaden contorno, fondo tonal y estado accesible.

## Components

### Navegación y filtros

`/panel/mantenimiento` abre Órdenes; `?vista=acciones` abre Próximos servicios y `?vista=planes` abre Planes. La ruta heredada `/panel/mantenimiento/planes` redirige a la vista integrada. `?orden=<id>` permite abrir inicialmente una orden vinculada.

La navegación usa botones con `aria-current="page"`. Los selectores de vista, etapa y tipo usan `aria-pressed`. Los filtros de etapa se muestran tanto en Prioridades como en Lista; cambiar la presentación conserva búsqueda, tipo y etapa, y permite restablecer Todas. Los contadores de filtros corresponden al conjunto cargado.

Las etapas agrupan visualmente los estados exactos: Abiertas (`abierta`), En revisión (`en_revision`, `aprobada`), En taller (`asignada`, `en_ejecucion`, `pausada`, `en_calidad`) y Finalizadas (`cerrada`, `cancelada`). Esta agrupación nunca sustituye el estado del servidor.

### Atención y detalle de orden

Las órdenes activas se ordenan por prioridad existente y luego antigüedad. La acción visible varía entre Revisar, Asignar, Revisar cierre y Ver orden. El detalle mantiene estado exacto, datos de unidad, responsable y eventos disponibles. El siguiente paso principal se presenta primero; Más acciones conserva los demás pasos permitidos por `PASOS_ODT`.

**Regla de confirmación contextual.** Elegir una transición abre su formulario con unidad, descripción y estado actual; la escritura ocurre al confirmar. Toda transición exige una nota de al menos tres caracteres. Asignar exige responsable; cerrar exige solución y admite costo USD opcional, finito y no negativo. Los errores del servidor conservan los datos para corregir y reintentar. El estado observado se envía por el contrato existente donde corresponde.

Inicio, pausa, reanudación y entrega solo se muestran al responsable identificado. El supervisor que no lo sea ve la explicación correspondiente. Cerrada permite reabrir a revisión; cancelada no tiene acciones. Las rutas de asignación, ejecución y cambio de estado siguen separadas en el repositorio existente.

### Crear orden

El formulario tiene dos pasos: seleccionar explícitamente una unidad y describir la falla. No preselecciona el primer vehículo. Continuar requiere selección; volver permite revisarla. El segundo paso conserva tipo de falla, ubicación y descripción de al menos diez caracteres. Crear mantiene el payload del repositorio existente, bloquea su botón durante el envío y muestra éxito con referencia a la unidad después de responder. No añade prioridad editable ni adjuntos.

### Próximos servicios y planes

Los servicios conservan filtros `pending`, `in_progress`, `completed` y `dismissed`. Gestionar servicio muestra iniciar solo para pendiente y completar o descartar para acciones abiertas. Esos cambios requieren confirmación y nota. Abrir ODT usa directamente la operación existente y aparece únicamente en acciones abiertas sin vínculo; Ver orden vinculada abre su expediente. Completar una acción no cierra la ODT vinculada.

Crear plan conserva código normalizado y validado, servicio, descripción, estrategia `fixed`/`floating`/`combined`, intervalos por km/días y criticidad. Se exige al menos un intervalo positivo. La vista previa refleja los campos introducidos. Asignar unidad es individual y registra el último servicio y próximo vencimiento introducidos por el usuario; no promete odómetro en vivo ni cálculo automático.

Crear acción conserva unidad, tipo preventiva/predictiva, título, detalle, relevancia, vencimiento, costo y moneda USD/VES. La preventiva exige plan y ciclo entero desde uno; el título tiene mínimo de tres caracteres y se exige km o fecha de vencimiento. La vista previa resume lo introducido sin inventar datos. La validación completa y los permisos siguen siendo responsabilidad del contrato del servidor.

### Accesibilidad y estados de respuesta

El componente compartido de modal utiliza `role="dialog"`, `aria-modal`, nombre accesible, foco inicial, ciclo de Tab/Shift+Tab, Escape y restauración del foco cuando el elemento anterior sigue conectado. El ciclo recupera el foco dentro del diálogo si se pierde al sustituir contenido. La confirmación de orden mueve el foco al primer campo/acción disponible y Volver lo devuelve al bloque de siguiente paso.

Botones y summaries muestran contorno de foco de 2px con separación de 3px. Las filas de Lista se abren con Enter o espacio; los cierres usan botones explícitos. Los campos usan etiquetas envolventes; las búsquedas tienen nombre accesible; el progreso marca el paso actual. Las cargas usan skeleton con anuncio y `aria-busy`; los errores de carga permiten reintentar y muestran el motivo disponible. El éxito de creación usa `role="status"`. Esto registra la implementación, no certifica conformidad integral de accesibilidad.

Las reglas heredadas quedan bajo un disclosure de consulta fuera del bloque principal. No representan una nueva automatización de mantenimiento.

### Evidencia y límites de verificación

La entrega recibió revisión final con disposición de entregar el cambio local tras dos correcciones limitadas: mantener visible el filtro de etapa en Lista y recuperar el foco del modal al sustituir su contenido. El responsable de la integración informó compilación correcta y 57 pruebas aprobadas, junto con inspección autenticada de escritorio, móvil y modal mediante navegación de solo lectura. Este registro no sustituye los resultados técnicos de esa ejecución.

No se realizaron escrituras de producción ni despliegue en esta entrega. La inspección visual no verificó en vivo la persistencia de creación, asignación, cierre o acciones de planes; tampoco prueba todos los estados concurrentes, permisos o combinaciones de datos. Los contratos de repositorio se preservan, y los ejemplos de las imágenes aprobadas continúan siendo ilustrativos.

## Do's and Don'ts

- **Do** extender los tokens y componentes del panel para cualquier nueva vista de Mantenimiento.
- **Do** conservar identidad de unidad, estado exacto y consecuencia de la acción en sus confirmaciones.
- **Do** mantener los filtros accesibles al cambiar entre atención y lista.
- **Do** conservar los campos introducidos cuando falla una operación y mostrar el motivo disponible.
- **Don't** convertir las cuatro etapas visuales en nuevos estados API ni ampliar permisos por el aspecto de la pantalla.
- **Don't** copiar nombres, placas, costos, fotos o fechas ilustrativas de las propuestas a datos reales.
- **Don't** transformar este contrato local en un rediseño del mapa, la consola completa o la identidad de marketing.

No canonizado: la etiqueta superior de vista previa, la marca de selección con glifo y las reglas CSS repetidas son detalles que el código conserva; no se promueven a patrones globales ni se reparan en este pase documental. Se preserva la identidad incumbente y se limita el registro a la extensión autorizada.
