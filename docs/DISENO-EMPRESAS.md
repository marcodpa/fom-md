---
name: FOM — Empresas
description: Extensión del directorio administrativo sobre el sistema existente de la consola.
colors:
  fondo-oscuro: "#0a0d12"
  superficie-oscura: "#141a22"
  superficie-alta-oscura: "#1d2530"
  superficie-baja-oscura: "#0f141b"
  texto-oscuro: "#f3f5f8"
  texto-secundario-oscuro: "#abb3bf"
  borde-oscuro: "#262e39"
  primario-actual: "#3d9bf5"
  sobre-primario-actual: "#08121c"
  seleccion-oscura: "#10202e"
  exito-oscuro: "#3dd68c"
  exito-superficie-oscura: "#13281d"
  peligro-oscuro: "#ff6369"
typography:
  titulo-seccion:
    fontFamily: "Spline Sans, Segoe UI, system-ui, sans-serif"
    fontSize: "20px"
    fontWeight: 600
    lineHeight: 1.4
  identidad:
    fontFamily: "Spline Sans, Segoe UI, system-ui, sans-serif"
    fontSize: "16px"
    fontWeight: 600
  ayuda:
    fontFamily: "Spline Sans, Segoe UI, system-ui, sans-serif"
    fontSize: "13px"
    lineHeight: 1.6
rounded:
  contenedor: "12px"
spacing:
  compacto: "12px"
  interior: "16px"
  interior-movil: "20px"
  separacion-paneles: "22px"
  interior-escritorio: "24px"
components:
  boton-primario:
    backgroundColor: "{colors.primario-actual}"
    textColor: "{colors.sobre-primario-actual}"
    rounded: "{rounded.contenedor}"
    padding: "10px 16px"
  campo:
    backgroundColor: "{colors.superficie-baja-oscura}"
    rounded: "{rounded.contenedor}"
  directorio:
    backgroundColor: "{colors.superficie-oscura}"
    rounded: "{rounded.contenedor}"
  fila-seleccionada:
    backgroundColor: "{colors.seleccion-oscura}"
  ficha:
    backgroundColor: "{colors.superficie-oscura}"
    rounded: "{rounded.contenedor}"
    padding: "24px"
---

# Diseño de Empresas — consola FOM

## Overview

La superficie funciona como un directorio operativo: consultar las empresas disponibles, localizar una empresa, leer su contexto y entrar a su panel. La acción principal de la ficha es **Entrar a empresa**. La cabecera ofrece **Nueva empresa** y el resumen conserva el contexto general mientras cambia el directorio.

Esta es una extensión aplicada directamente a `src/panel/modulos/AdminEmpresas.jsx` y `src/panel/modulos/empresas.css`, con la dirección registrada en `.impeccable/surfaces/empresas.md`. Hereda la navegación, los componentes compartidos y los tokens `--e-*` de `src/styles/panel.css`, con los overrides vigentes de `.fom-dark` en `src/styles/redesign.css`. El usuario fijó la paleta actual. El frontmatter describe los valores efectivos observados del panel oscuro; la implementación sigue usando esas variables heredadas.

`PRODUCT.md` y el sistema global corresponden al trabajo histórico de marketing. Sus composiciones, propuestas y gates no se atribuyen a Empresas. Este documento tiene alcance local: no sustituye `DESIGN.md` ni actualiza `.impeccable/design.json`.

**Validación de cierre recibida:** 72 pruebas aprobadas; build con salida 0; una ejecución del detector con salida 0, cero antipatterns y 17 advisories. La deriva histórica de rampas del marketing sigue fuera de alcance. El revisor independiente concluyó `ship` mediante el respaldo manual `degraded/finish-reviewer`, con fuente y nueve capturas válidas y sin pendientes materiales. No se realizaron compaprobado, diffs visuales formales ni seed gates para esta extensión.

El navegador comprobó búsqueda, resultados vacíos, limpiar filtros, combinación de filtros, selección, formulario vacío bloqueado por validación, cancelación, carga y cancelación de asociaciones, y entrada al contexto real de una empresa con navegación a `/panel`. El caso de servicio activo mostró dos resultados de cinco sin alterar el resumen general. Durante QA no hubo escrituras reales de empresas, servicios ni asociaciones. La aplicación es local; no se desplegó ni se hizo push.

La evidencia está en `.impeccable/review/empresas/`: `desktop.png`, `nueva-desktop.png`, `asociaciones-desktop.png`, `mobile.png`, `ficha-mobile.png`, `nueva-mobile.png`, `nueva-mobile-acciones.png`, `vacio-user.png` y `user-996.png`. Los viewports comprobados fueron 1672×941, 390×844 y 996×884. Las capturas se mantienen ignoradas por contener datos reales; este documento no reproduce contactos, identificadores ni otras referencias personales.

## Colors

El fondo, las superficies y los bordes oscuros conservan el carácter de la consola. La selección utiliza la superficie informativa; el estado de servicio se expresa con etiquetas de éxito o peligro y texto explícito.

| Token de la consola | Uso observado |
| --- | --- |
| `--e-bg` | Fondo del armazón de la consola. |
| `--e-sup` | Resumen, directorio y ficha lateral. |
| `--e-sup-baja` | Símbolos, ficha inline y bloques de contexto de formularios. |
| `--e-sup-alta` | Hover de una fila. |
| `--e-borde` | Contornos y separadores de filas y grupos. |
| `--e-texto` / `--e-texto-2` | Identidad y valores / ayuda y metadatos. |
| `--e-info-sup` | Fondo de la fila seleccionada. |
| `--e-primario` | Acción principal, foco, caret y selección de controles. |
| `--e-exito` / `--e-exito-sup` | Confirmación de una acción exitosa. |
| `--e-peligro` | Borde de mensajes de error. |

**Regla de herencia.** Empresas utiliza los tokens de la consola; no añade una paleta literal independiente.

`src/styles/redesign.css` fija el primario y su texto en `.fom-dark` y `[data-tema] .pnl.fom-dark`; son los valores del frontmatter y del DOM final verificado. `panel.css` conserva una regla histórica con primario `var(--marca, #208aef)` y texto blanco que queda superada en esta superficie. Esa diferencia se registra sin corregirla ni convertirla en una nueva regla global.

## Typography

La fuente efectiva heredada es Spline Sans, con Segoe UI, system-ui y sans-serif como fallback de `.fom-dark`. Las filas priorizan el nombre de la empresa; debajo aparecen tipo, RIF y una referencia de contacto. Los nombres y valores largos pueden partirse para conservar la legibilidad.

La cabecera heredada usa un título de 32 px, peso 700 y altura de línea 1.18. La jerarquía local usa títulos de sección y nombre de la ficha de 20 px, encabezados internos de 16 px, leyendas de formulario de 17 px y metadatos y ayudas de 13 px. Los datos secundarios de flota y pies usan 12 px. Las cifras del resumen usan 26 px, peso 600 y números tabulares; pasan a 24 px hasta 600 px de ancho. Estos tamaños son observaciones de la superficie, no una nueva rampa normativa para todo FOM.

## Layout

El cuerpo tiene ancho máximo de 1800 px, centrado y con separación de 22 px entre bloques. El resumen forma una banda de cuatro indicadores con separadores: empresas operativas, servicio activo, suspendidas y deuda acumulada.

Desde 1201 px, el directorio ocupa el espacio flexible y la ficha lateral mide 350 px. La ficha permanece sticky a 20 px del borde superior. El directorio combina título y buscador, filtros por tipo y servicio, filas seleccionables y un pie que explica el alcance del resumen.

Hasta 1200 px, la ficha lateral se oculta y la ficha se abre dentro de la fila elegida explícitamente, con acción **Cerrar detalles**. En escritorio se muestra la selección guardada si continúa en los resultados; en su defecto se presenta la primera empresa. En pantallas estrechas la ficha inline requiere selección explícita, aunque la primera fila pueda tener el estilo de selección por ese fallback.

Hasta 600 px, el resumen pasa a dos columnas, el buscador ocupa una línea completa, el estado de servicio dispone de su propia línea y las filas reorganizan estado y flota debajo de la identidad. El símbolo baja de 44 a 36 px; los interiores principales pasan a 20 px. El formulario pasa de dos columnas a una y sus acciones pueden envolver a otra línea.

## Elevation & Depth

Los contenedores locales se distinguen mediante capas tonales y bordes finos, sin sombras nuevas propias de Empresas. La ficha inline utiliza una superficie más baja. Los modales heredan la profundidad y el comportamiento del componente compartido de la consola.

Las filas cambian de fondo con una transición de 160 ms ease. Con `prefers-reduced-motion: reduce` esa transición se desactiva. No hay fotografías ni movimiento decorativo en la superficie.

## Shapes

Resumen, directorio, ficha, símbolos y bloques de contexto tienen esquinas de 12 px y bordes de 1 px cuando corresponde. Filas y contactos usan separadores continuos. Botones, campos, chips, tags y modales conservan sus componentes compartidos.

Los elementos interactivos dentro de la raíz de Empresas muestran un foco de 2 px en el acento efectivo, separado 3 px del contorno. Los campos, etiquetas y acciones de los modales mantienen las reglas de sus componentes compartidos.

## Components

### Primitivas heredadas

Los botones tienen altura mínima de 44 px, padding de 10×16 px, radio de 12 px y texto de 14 px con altura de línea de 22 px. El primario utiliza el acento y su texto del frontmatter, sin sombra. El hover heredado aumenta el brillo; los botones deshabilitados omiten ese filtro. Campos y buscador usan superficie baja, radio de 12 px y altura de 46 px o mínima de 46 px, respectivamente según el control.

Los chips compartidos tienen radio de 10 px y altura mínima de 40 px; las etiquetas de estado conservan radio de 8 px, texto de 12 px y caso natural. Sus colores de selección son los heredados del armazón. Empresas no redefine la navegación.

### Resumen y datos disponibles

El resumen se calcula sobre todas las empresas devueltas al usuario autorizado, excluyendo la cuenta de respaldo. Los filtros no alteran sus cifras. Los chips de tipo cuentan sobre el conjunto completo disponible, incluida la cuenta de respaldo si forma parte de ese conjunto.

**Regla del dato ausente.** No se convierten métricas desconocidas en cero. La deuda acumulada solo se suma cuando hay empresas operativas y todas tienen una deuda finita; en otro caso muestra **Sin dato**. La fila usa **Flota sin dato** para una flota no numérica. La ficha usa **Sin dato**, **Sin registrar** o **No disponible** según el campo. La fuente API actual no proporciona usuarios, vehículos ni deuda en este listado; el rediseño no inventa dichas contabilizaciones.

### Directorio y filtros

La búsqueda es local y combina nombre, RIF, contacto, correo y teléfono sobre la lista autorizada. Se combina con tipo y estado de servicio. El filtro de servicio excluye la cuenta de respaldo. La selección usa un botón de fila con `aria-pressed` y nombre accesible explícito.

Sin resultados se explica cómo cambiar los criterios y se ofrece **Limpiar filtros**, que restablece búsqueda, tipo y servicio. Si el conjunto original está vacío, se indica que aún no existen empresas y se remite a **Nueva empresa**. Carga y errores del listado utilizan los componentes compartidos de carga y reintento.

### Ficha y administración

La ficha organiza identidad, estado, entrada al panel, cifras disponibles y contacto. **Entrar a empresa** llama a `entrarEmpresa` antes de navegar a `/panel`; durante la comprobación muestra **Comprobando acceso…**. Las acciones se bloquean mientras existe una operación pendiente o el listado no está listo.

Las empresas operativas conservan **Suspender servicio** o **Reactivar servicio**, con confirmación nativa previa. **Retirar de operación** aparece dentro de **Otras acciones** y comunica que suspende el servicio y conserva el historial. La cuenta de respaldo omite la administración operativa. Estas escrituras existentes fueron conservadas, pero no ejecutadas durante QA.

### Nueva empresa

El modal de 760 px agrupa **Datos de la empresa**, **Contacto** y, para una contratista, **Compañías asociadas**. Nombre es obligatorio mediante `required` y se verifica también tras eliminar espacios. Correo usa `type="email"`, teléfono usa `type="tel"` y los campos de contacto mantienen autocomplete. No se incorpora una validación nueva de formato del RIF o del teléfono.

Crear utiliza submit nativo. Durante la escritura se bloquean grupos y acciones, se comunica `aria-busy` y se muestra **Creando…**. Los errores se presentan con `role="alert"`. Cancelar restablece los campos; completar la creación recarga el listado y cierra el modal.

**Límite de integración previo:** el formulario entrega `predefinidas` al repositorio, pero `repoApi.empresas.crear` no transmite ese campo a la API. La posibilidad de seleccionar compañías durante la creación no certifica su persistencia en el backend real. La extensión conserva ese contrato; no resuelve este límite mediante el rediseño.

### Compañías asociadas

El modal de 620 px contextualiza la contratista y carga compañías desde `repo.admin.empresas.listar({tipo:'predefinida'})`. El selector presenta checkboxes nativos, carga, error con reintento y estado vacío. Guardar permanece deshabilitado hasta que la fuente esté lista y durante la escritura. Cancelar no realiza una escritura.

Se conserva la llamada `asignarPredefinidas(empresa.id, prede, actor)`. La API existente interpreta los argumentos como compañía y contratistas y añade relaciones mediante `colgarContratista`; no implementa aquí una sustitución o eliminación completa de asociaciones. La UI y el repositorio semilla usan la selección de compañías de una contratista. Esa diferencia de semántica es anterior y queda registrada como límite sin certificar persistencia, altas, bajas o reconciliación de asociaciones en el backend real.

## Do's and Don'ts

- **Do** conservar la paleta y los componentes compartidos del panel al extender Empresas.
- **Do** mantener el resumen independiente de los filtros locales y declarar el alcance de la cuenta de respaldo.
- **Do** usar datos del repositorio autorizado y expresar los valores ausentes de forma explícita.
- **Do** conservar búsqueda combinable, selección accesible, foco visible, validación nativa y estados de carga, error y escritura.
- **Do** verificar directorio, ficha y formularios en los tres tamaños observados cuando cambie su composición.
- **Don't** convertir datos desconocidos en métricas aparentes ni prometer que las asociaciones se persistieron sin evidencia de integración.
- **Don't** atribuir a Empresas los gates o las propuestas históricas de marketing.
- **Don't** promover la deriva global, los tamaños locales o los límites del backend a reglas nuevas de todo el producto.
- **Don't** publicar capturas con datos reales como parte de la documentación del diseño.
