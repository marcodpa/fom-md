---
name: "FOM Perfil y Alertas / extensión Operate"
description: "Sistema observado en la implementación local; conserva los colores actuales de la consola."
colors:
  primary: "var(--e-primario)"
  on-primary: "var(--e-sobre-primario)"
  surface: "var(--e-sup)"
  surface-high: "var(--e-sup-alta)"
  surface-low: "var(--e-sup-baja)"
  border: "var(--e-borde)"
  border-strong: "var(--e-borde-fuerte)"
  text: "var(--e-texto)"
  text-secondary: "var(--e-texto-2)"
  text-tertiary: "var(--e-texto-3)"
  success: "var(--e-exito)"
  success-surface: "var(--e-exito-sup)"
  warning: "var(--e-aviso)"
  danger: "var(--e-peligro)"
typography:
  headline:
    fontFamily: "'Spline Sans', 'Segoe UI', system-ui, sans-serif"
    fontSize: "32px"
    fontWeight: 700
    lineHeight: 1.18
    letterSpacing: "-.8px"
  identity:
    fontSize: "24px"
  title:
    fontSize: "20px"
  notification-title:
    fontSize: "16px"
    lineHeight: 1.45
  body:
    fontSize: "14px"
  help:
    fontSize: "13px"
    lineHeight: 1.6
  metric:
    fontSize: "28px"
rounded:
  identity-and-inbox: "12px"
  inherited-card: "16px"
  button-and-input: "12px"
  inherited-chip: "10px"
spacing:
  section-gap: "18px"
  mobile-section-gap: "16px"
  personal-data-column-gap: "30px"
  form-gap: "20px"
components:
  identity:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    rounded: "{rounded.identity-and-inbox}"
    padding: "26px 30px"
  metrics:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    rounded: "{rounded.identity-and-inbox}"
    padding: "22px 32px"
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    rounded: "{rounded.button-and-input}"
    padding: "10px 16px"
  input:
    backgroundColor: "{colors.surface-low}"
    rounded: "{rounded.button-and-input}"
    height: "46px"
---

# Design System: Perfil y Alertas FOM

## Overview

**Creative North Star: "Calma con precisión"** — dirección heredada de la consola FOM, aplicada a datos propios y avisos operativos.

Extensión en modo Operate aprobada el 5 de octubre de 2026 e implementada localmente. Identidad horizontal, datos con divisores y documentos tabulados permiten consultar la cuenta; las alertas separan la bandeja de notificaciones de los eventos de manejo. La corrección explícita del usuario exige conservar los colores actuales de la web.

Este documento describe únicamente estas superficies. Los valores de color del frontmatter son referencias al tema vigente, cuya fuente está en `src/styles/panel.css` y `src/styles/redesign.css`; no constituyen otra paleta. No se modifica el `DESIGN.md` global ni `.impeccable/design.json`.

**Key Characteristics:**

- Datos reales del usuario autenticado y permisos existentes.
- Jerarquía mediante escala tipográfica, filas, tablas y divisores.
- Fuentes de notificaciones y eventos con estados independientes.
- Estados de espera, error, confirmación y vacío diferenciados.

Derivación: contrato `.impeccable/surfaces/perfil-alertas.md`, propuesta `output/propuesta-perfil-alertas-v1/DISENO.md` e imágenes 01–07; implementación en `MiPerfil.jsx`, `Alertas.jsx`, `perfil-alertas.css` y `alertas-presentacion.js`. Las imágenes orientan composición; el contrato y las capacidades reales de la API determinan contenido y acciones.

Validación comunicada por el coordinador: 72 pruebas aprobadas y build final aprobado. Navegador: edición, cancelar, Escape, foco, nombre requerido, guardar sin cambios, instrucciones de contraseña, filtros, vacío de filtro, notificaciones reales, eventos vacíos y móvil de 390px sin desbordamiento de página. Guardar sin cambios no produjo escrituras reales. No se insertaron datos ilustrativos ni se cambiaron permisos.

Revisión visual independiente completada mediante procedimiento alternativo de comparación manual, sin gates formales propios. La única corrección final limita las acciones masivas y las métricas Sin leer/Avisos de hoy a Notificaciones, y coloca el resumen de severidad real antes del detalle en Eventos, omitiéndolo si no hay registros. La captura eventos-desktop fue reemplazada y el build final quedó aprobado. Disposición final: ship de la implementación local.

Límites de esa evidencia: la cuenta actual tiene documentos vacíos y cero eventos. La tabla con registros de documentos, su modal, el resumen de severidad con registros y la tabla de eventos poblada no se verificaron visualmente en navegador. Leer y descartar avisos reales no se ejecutaron. No hay despliegue ni push.

## Colors

La paleta mantiene los neutros oscuros y el acento actual de la consola. La hoja local no incorpora colores hexadecimales nuevos.

### Primary

El acento existente identifica acciones principales, foco, avatar sin fotografía y avisos sin leer. El texto sobre ese acento usa el token de contraste heredado.

### Neutral

La superficie principal contiene identidad, métricas y bandeja; la superficie alta distingue cabeceras de grupos y tablas; la baja pertenece a campos y controles heredados. Borde, borde fuerte y los tres niveles de texto mantienen separación y jerarquía sin sustituir los valores del tema.

Los colores de éxito, aviso y peligro conservan sus significados del panel. El estado se comunica también con texto e iconos. Los chips y etiquetas reutilizan sus variantes existentes.

**The Palette Continuity Rule.** Toda superficie nueva debe resolver fondo, borde y texto desde los tokens actuales. No trasladar los matices de las imágenes generadas a una paleta nueva.

## Typography

Spline Sans y su pila de respaldo se heredan del panel. La cabecera usa el rol headline; identidad y títulos de sección reducen la escala progresivamente. Las etiquetas personales y ayudas son pequeñas y atenuadas; los valores personales se muestran a 15px con interlineado 1.45. Los títulos de aviso tienen interlineado amplio para permitir varias líneas.

Las métricas usan cifras tabulares. En móvil, la identidad baja a 20px, las métricas a 24px y el título de aviso a 15px. Nombres, correos, direcciones y mensajes largos pueden partirse para no ensanchar la página.

## Layout

El cuerpo forma una cuadrícula de secciones, con ancho máximo de 1800px. La identidad alinea avatar, nombre, rol, correo, empresa cuando exista y nota sobre la foto. Debajo, datos personales y acceso a cuenta comparten columnas en proporción 1.7:1; los datos usan una lista de definiciones en dos columnas, no seis tarjetas independientes. Documentos ocupa la anchura disponible.

Notificaciones abre con una banda de dos métricas, Sin leer y Avisos de hoy, seguida de pestañas y filtros. Las acciones masivas y esas métricas aparecen únicamente en Notificaciones. La bandeja agrupa filas en Hoy y Anteriores; cada fila ordena estado, icono, contenido, fecha y acciones. Eventos presenta sus filtros y, cuando hay registros filtrados, el resumen de severidad antes del detalle.

Los puntos de adaptación observados son 1250px, 950px y 600px. Primero las acciones bajan dentro de la fila; después datos y acceso pasan a una columna; finalmente identidad, formulario y filas se reorganizan para móvil. Pestañas y tablas desplazan dentro de su contenedor. Las tablas conservan anchos mínimos de 760px para documentos y 880px para eventos, sin exigir desplazamiento de la página.

## Elevation & Depth

Las superficies locales usan capas tonales y bordes; no añaden sombras. Los modales heredan fondo, profundidad y estructura del componente accesible del panel. No se crea una apariencia independiente para las ventanas.

## Shapes

Identidad, métricas, bandeja, error y confirmación usan esquinas suaves de 12px. Las tarjetas genéricas conservan el radio heredado de 16px; botones y campos usan 12px y chips 10px. El avatar es circular; los pequeños indicadores circulares de lectura acompañan el estado accesible.

## Components

### Perfil y datos propios

La identidad pertenece siempre a la sesión autenticada. La empresa solo aparece cuando la fuente la proporciona. Los datos personales usan `dl`, `dt` y `dd`, distinguiendo «Sin registrar» de «No disponible en la web». Los documentos declarados en el perfil se identifican como tales y no se presentan como documentos registrados.

El índice de manejo se muestra únicamente para quien conduce, cuando exista el dato. Conserva umbrales de 80 y 60 y textos previos; su ausencia remite a la app. No se asigna una puntuación inventada a supervisores.

### Edición y modales

La edición conserva `guardarMiPerfil`, la verificación de identidad y los límites por rol. Se editan nombre, cédula, teléfono, dirección y nacimiento; el correo queda de solo lectura. Nombre es obligatorio. Teléfono mantiene input tel y ayuda para el código de país, sin prometer validación externa.

Guardar espera la respuesta, bloquea controles y anuncia confirmación; si falla, conserva el borrador y muestra el error. Cancelar no aplica cambios y no cierra durante guardado. El modal compartido aporta Escape, contención del foco y retorno al control de apertura.

La ventana del documento muestra número, vencimiento y estado disponible, diferenciando fecha faltante de vigencia. Foto, licencia, archivos y corrección de vencimiento siguen en la app. La ventana de seguridad explica los pasos para cambiar contraseña en la app; no simula una operación web.

### Bandeja de notificaciones

Lectura admite tanto `leida` booleana como `leidaEn` de la API. Hoy compara la fecha local, no el texto UTC; cada grupo ordena primero los avisos más recientes. Fechas ausentes o inválidas pasan a Anteriores. La agrupación no modifica la lista original.

Todas conserva tipos desconocidos con icono genérico. Sin leer, ODT nuevas y Reglas cumplidas filtran el mismo listado del que derivan los conteos. El vacío de un filtro se distingue de la bandeja sin registros; cero sin leer significa bandeja al día. Antes de tener datos las métricas muestran un guion, no un cero supuesto.

Leer, leer todas, descartar y descartar leídos esperan el servidor y recargan la bandeja; mientras hay una acción pendiente las mutaciones se bloquean. Errores usan `role="alert"`, confirmaciones `role="status"` y la bandeja `aria-busy`. La lectura se comunica como texto cuando la fila corresponde. Ver mantenimiento abre la ruta existente, sin prometer selección directa de una ODT.

### Eventos de manejo y fuentes

Eventos consulta los últimos 28 días, separado de notificaciones. Los filtros conservan los tipos existentes; Condición de telemetría solo se ofrece si aparece. Todos conserva también tipos desconocidos. La tabla muestra únicamente datos recibidos y distingue los faltantes. Solo exceso de velocidad agrega km/h; no se infieren unidades para otros valores. Los conteos de severidad derivan de los eventos filtrados, sin convertirse en puntuaciones. El resumen aparece antes del detalle y se omite cuando el filtro no contiene registros.

Los vínculos existentes abren la unidad y Eventos y SOS. Leer o descartar no resuelve un evento, una avería ni una orden. Cada fuente tiene carga, error y reintento independientes; `useDatos` conserva la lista anterior cuando un refresco falla. Un error no equivale a cero registros ni a buena conducción.

### Controles y accesibilidad

Botones heredan variantes y estados; filtros tienen altura mínima de 42px y las acciones de fila 40px. El foco local usa contorno del acento de 2px con separación de 3px. Campos, vínculos y botones mantienen foco visible. Se respeta reducción de movimiento anulando transiciones y animaciones en estas superficies y ventanas.

## Do's and Don'ts

### Do:

- **Do** conservar los colores actuales mediante tokens del panel y verificar que la hoja local no introduzca hexadecimales.
- **Do** mantener identidad, permisos y separación entre datos propios, avisos y eventos.
- **Do** distinguir respuesta vacía, dato ausente, error y datos previos conservados.
- **Do** verificar móvil, teclado y estados de API con evidencia proporcional al cambio.

### Don't:

- **Don't** copiar personas, cifras o registros de las imágenes ilustrativas a producción.
- **Don't** inventar edición de foto, licencia, contraseña, sesiones, 2FA o preferencias web.
- **Don't** interpretar lectura o descarte como resolución operativa.
- **Don't** declarar verificados en navegador los estados con registros o las mutaciones que no se ejecutaron.
- **Don't** reparar el sistema global como efecto secundario de esta extensión. El detector ejecutado una vez solo informó advisories de rampas históricas del `DESIGN.md` de marketing; esa deriva queda registrada y conservada.
