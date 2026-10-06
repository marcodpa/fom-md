---
name: "FOM Reportes / extensión Operate"
description: "Sistema observado en las siete vistas locales de Reportes; hereda la consola FOM."
colors:
  primary: "#3d9bf5"
  on-primary: "#08121c"
  background: "#0a0d12"
  surface: "#141a22"
  surface-high: "#1d2530"
  surface-low: "#0f141b"
  border: "#262e39"
  text: "#f3f5f8"
  text-secondary: "#abb3bf"
  warning: "#f5c242"
  warning-surface: "#2a2410"
  success: "#3dd68c"
  success-surface: "#13281d"
  danger: "#ff6369"
  distribution-active: "#087fce"
  distribution-stopped: "#496681"
  distribution-unknown: "#8a9cad"
  paper: "#fff"
  paper-text: "#162438"
  paper-secondary: "#415067"
  paper-border: "#ccd5df"
  paper-low: "#edf2f7"
  paper-accent: "#0874b8"
typography:
  headline:
    fontFamily: "'Spline Sans', 'Segoe UI', system-ui, sans-serif"
    fontSize: "32px"
    lineHeight: 1.25
    letterSpacing: "-.8px"
  title:
    fontFamily: "'Spline Sans', 'Segoe UI', system-ui, sans-serif"
    fontSize: "20px"
    lineHeight: 1.35
    letterSpacing: "-.3px"
  body:
    fontFamily: "'Spline Sans', 'Segoe UI', system-ui, sans-serif"
    fontSize: "14px"
    lineHeight: 1.6
  metric:
    fontSize: "clamp(20px,1.5vw,25px)"
    fontWeight: 700
    lineHeight: 1.25
  table:
    fontSize: "13px"
rounded:
  surface: "12px"
  notice: "8px"
  period: "7px"
  paper: "4px"
spacing:
  panel-gap: "18px"
  desktop-horizontal: "32px"
  mobile-horizontal: "16px"
components:
  panel:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    rounded: "{rounded.surface}"
    padding: "22px"
  period-selected:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    rounded: "{rounded.period}"
    padding: "10px 14px"
  notice:
    backgroundColor: "{colors.warning-surface}"
    textColor: "{colors.text}"
    rounded: "{rounded.notice}"
    padding: "13px 16px"
---

# Design System: Reportes FOM

## Overview

**Creative North Star: "Calma con precisión"** — compromiso heredado de la consola, aplicado a la consulta del supervisor.

Estado al 5 de octubre de 2026: implementación local de la propuesta aprobada de diez láminas. Reportes reúne Resumen, Operación, Mantenimiento, Seguridad, Costos, Unidades y Conductores en una entrada del panel. La navegación, las tablas y las métricas son componentes reales; las láminas generadas sirven como referencia de composición.

Este documento registra solamente la extensión Reportes. Fuentes: `src/panel/modulos/Reportes.jsx`, `reportes.css`, `reportes-datos.js`, `test/reportes.test.js`, `src/styles/panel.css`, `src/styles/redesign.css` y los contratos en `.impeccable/`. Conserva el sistema nativo. El `DESIGN.md` y `.impeccable/design.json` globales no se regeneraron: la frontera de esta extensión es local.

**Key Characteristics:**

- Superficies oscuras planas, azul para acciones y navegación, cifras tabulares.
- Resumen compacto y asimétrico; tablas con espacio suficiente para comparar registros.
- Fuentes disponibles, ausentes y parciales reconocibles por texto y estado.
- Informe claro con empresa, alcance, fecha y límites de información visibles.

## Colors

### Primary

Azul Operación marca pestañas activas, enlaces, foco y acciones principales. Las distribuciones tienen su propio azul de lectura; no sustituyen el acento de controles.

### Neutral

Lienzo Nocturno, Superficie Elevada y Superficie Alta separan página, panel y respuesta al puntero. Tinta Clara sirve al contenido principal y Acero Templado a las notas y etiquetas. Los bordes finos delimitan grupos sin sombras en los paneles.

Las unidades detenidas usan azul grisáceo y las unidades sin dato un gris más claro. El verde, ámbar y rojo se reservan para estados etiquetados. El papel imprimible tiene una paleta local clara; no modifica la paleta del panel.

**The Estado explícito Rule.** Una unidad detenida se muestra neutral; una ausencia se escribe «Sin dato» o «No disponible», junto al color correspondiente. No se transforma una ausencia de fuente en una cifra de cero.

## Typography

La familia observada es Spline Sans, heredada de la consola. El frontmatter registra la escala base y la alternativa de fuente declarada; la alternativa de sistema es una contingencia de carga, no una nueva dirección para títulos.

En escritorio compacto el título de panel de Resumen baja a (18px). En móvil el título de página usa (28px) y el título de panel (18px). Los encabezados de tabla y las notas usan (12px); las celdas (13px). El cuerpo conserva interlineado (1.6). La vista previa usa títulos de columna (15px), cuerpo (12px / 1.5) y tabla (12px); al imprimir la tabla pasa a (10px).

**The Cifra estable Rule.** Las métricas usan números tabulares y mantienen etiqueta, valor y contexto próximos. No se introducen títulos decorativos para aumentar la jerarquía.

## Layout

El contenido tiene ancho máximo de (1800px), margen automático y padding base de (28px 32px 48px). La cabecera agrupa título y acciones; siguen siete pestañas, período/área, contexto de consulta y contenido. Resumen utiliza cuatro métricas y una matriz de dos columnas con proporción (1.6:1). Los ajustes finales de escritorio por encima de (1280px) compactan cabecera, filtros, banda, leyendas y disponibilidad; las tarjetas del Resumen usan padding de (16px 18px).

La rejilla se vuelve una columna hasta (1050px). Hasta (600px) se apilan acciones y filtros, el padding exterior queda en (20px 16px 36px), y las tablas conservan desplazamiento horizontal dentro de su contenedor. Las pestañas también se desplazan internamente. La vista móvil verificada por el coordinador tiene ancho de (390px) sin desbordamiento de página.

El informe tiene ancho máximo de (1240px), padding de (26px 32px), metadatos y tres columnas de operación, mantenimiento y seguridad, seguidas por la tabla de unidades. Hasta (700px) sus columnas se apilan y la tabla conserva ancho interno mínimo de (650px). El CSS de impresión restaura tres columnas, elimina ese mínimo y configura A4 horizontal con margen de (14mm).

**The Alcance visible Rule.** Empresa, área y período acompañan la consulta y el informe. Las excepciones de alcance de una fuente se muestran junto a su métrica.

## Elevation & Depth

Los paneles y bandas separan contenido por tono, borde de (1px) y espacio. No tienen sombra. El modal hereda la superficie flotante del panel y la capa de fondo; su apertura en Reportes no tiene animación. La preferencia de movimiento reducido elimina transiciones y animaciones dentro de Reportes y exportación.

## Shapes

Paneles, banda, filtros y opciones de exportación comparten esquinas suaves de superficie. Los avisos y barras apiladas usan el radio de aviso; los botones de período usan su radio específico. Las divisiones internas son finas y rectas. El papel tiene un radio pequeño de pantalla que desaparece al imprimir.

## Components

### Navegación, filtros y tablas

La pestaña activa lleva subrayado azul de (2px), peso (600) y `aria-current`. Los períodos usan `aria-pressed`; 30, 90 y 365 días son ventanas móviles, no meses calendario. Cambiar área o período actualiza la consulta y cierra la vista previa. Los botones, enlaces y campos tienen foco visible de (2px), separado (4px). Las tablas usan encabezado tonal, filas separadas y respuesta al puntero.

Unidades permite búsqueda por unidad o placa y filtro de estado; Conductores permite búsqueda por persona o unidad. Son filtros locales sobre los registros cargados, con conteo y estado sin coincidencias. Los expedientes enlazan con las rutas existentes de vehículos y personal.

### Métricas y disponibilidad

Estado, odómetro, índice y conductor asignado describen la vista actual. ODT se filtra por vehículo del alcance y fecha de creación dentro de la ventana, incluyendo todos los estados reales, también canceladas y estados adicionales. Las distribuciones conservan total y leyenda de texto; los porcentajes se redondean por categoría y pueden sumar 99 o 101.

El índice promedio exige valores válidos entre 0 y 100 para todas las unidades. El total de odómetros exige valores válidos para todas; tampoco representa distancia recorrida del período. La asignación cuenta unidades con conductor principal y no acredita quién condujo un viaje.

El costo registrado en ODT suma solamente órdenes cerradas con costo válido y muestra cuántas tienen registro. Un cero explícito es válido; si ninguna tiene costo, queda ausente. La fuente de costos de operación mantiene alcance de toda la empresa y período: no se filtra por área. Cuando falla, conserva «No disponible» y su motivo, sin fabricar $0. Eventos por 100 km sigue no disponible por falta de distancia validada del mismo período. El promedio de resolución proviene del resumen general y lo declara.

Las consultas parciales conservan las fuentes que respondieron y permiten reintentar. Un área sin unidades ofrece toda la empresa conservando período. Un fallo de vehículos muestra recuperación de fuente; no se interpreta como vacío. Las acciones de exportación quedan deshabilitadas mientras falta una lista válida con unidades.

### Exportar e informe

El modal ofrece CSV de unidades e informe para imprimir. Hereda Escape y gestión de foco del modal existente. CSV incluye unidad, placa, área, estado, odómetro acumulado, índice, documentos y conductor; preserva vacíos, BOM UTF-8, punto y coma y escape de comillas/saltos de línea. Sanea prefijos de fórmulas en celdas no numéricas. El mensaje anuncia «Descarga CSV iniciada», no una descarga completada.

El informe usa `window.print()` y CSS del navegador. Contiene información parcial y sus motivos, tres columnas y tabla. No agrega PDF de servidor, correo, enlaces públicos, XLSX ni automatizaciones. La sesión de administrador mantiene el alcance autorizado de empresa a través del repositorio existente; no cambia permisos.

### Evidencia de cierre y límites

Verificación aportada por el coordinador: siete pestañas, búsqueda de unidad y persona, filtro de estado, área, períodos de 30/90 días, Escape y foco del modal, y móvil de 390px. Inicio de CSV observado; el evento de descarga agotó su espera y no se verificó archivo guardado. Vista previa y fuente CSS de impresión verificadas; no se ejecutó impresión del sistema ni guardado PDF. Los vacíos de área y fallos se revisaron en fuente/tests, sin acreditar esos estados mediante captura de navegador. `npm test`: 69 pruebas aprobadas en el repositorio concurrente; `npm run build`: aprobado.

Capturas locales conservadas en `.impeccable/review/reportes/`: `resumen-desktop.png`, `resumen-completo.png`, `mantenimiento-desktop.png`, `exportar-desktop.png`, `informe-desktop.png`, `resumen-mobile.png`, `exportar-mobile.png`. Este pase documental comprobó los archivos y examinó Resumen e Informe directamente. Las diez composiciones de comparación permanecen en `output/propuesta-reportes-supervisor-v1/`.

El revisor fresco `reportes_finish_reviewer` señaló densidad del resumen, distribución del informe y texto técnico. El coordinador informa los tres como **Resolved**, con disposición **ship** limitada a esos cambios. El revisor utilizó el rol de respaldo del harness, no una nueva revisión de navegador. El detector se ejecutó una vez como asesor: observaciones globales de fuentes, radios y rampas de marketing sin bloqueo. No existe una especificación formal de comparación visual por píxel.

## Do's and Don'ts

- **Do** mantener la consola heredada, los componentes reales y la composición aprobada con texto accesible.
- **Do** conservar contexto, avisos de fuente y recuperación junto al resultado que explican.
- **Do** dejar desplazamiento de tablas y pestañas dentro del contenedor en móvil.
- **Don't** introducir registros ilustrativos de las imágenes en el repositorio de datos.
- **Don't** representar odómetros como distancia del período ni datos ausentes como cero.
- **Don't** presentar una descarga iniciada o una vista previa como archivo guardado o PDF generado.

Deriva preexistente no canonizada ni reparada: el documento global histórico prescribe Space Grotesk/Plus Jakarta Sans y radios de tarjeta de 18px, mientras la consola implementada usa Spline Sans y esta extensión paneles de 12px. Sus reglas históricas de eyebrows y fuentes de sistema no se adoptan como norma de Reportes. La documentación global, el marketing y MapLibre quedan fuera de la frontera; costos de operación sigue pendiente de la fuente de servidor.
