# FOM: relevo para implementar las páginas restantes

Última actualización: 25 de septiembre de 2026 (tarde). Lee este documento antes de modificar la web.

## Estado real y objetivo

Repositorio: https://github.com/marcodpa/fom-md · Rama de trabajo: `codex/rediseno-v6-fiel`.

**Las once páginas están implementadas** y pendientes de la revisión final del usuario (no registrar aprobación que no haya dado). Inicio (`HomeV7`) no cambió. Las otras diez viven en `src/pages/v7/<Página>.jsx` + `src/styles/v7/<página>.css`, sobre el kit común `src/components/v7/V7Kit.jsx` + `src/styles/v7-kit.css`.

Cómo se hicieron: primero cada sección se reprodujo fiel a su lámina v7 (foto limpia extraída de la propia lámina, capturas originales proyectadas en cada pantalla, texto HTML real). Después el usuario dijo que parecía «una diapositiva de PowerPoint» y pidió, y aprobó en Plataforma, una **segunda pasada web**: fundidos entre secciones y aparición al hacer scroll; dispositivos fijos mientras cambian de captura (`StickyTour`); pantallas con pestañas (`DeviceTabs`); menos fotos; tarjetas y párrafos en lugar de viñetas; secciones con el fondo de la app (el globo de `/entrar`); y en App del conductor un solo teléfono que viaja entre las fotos al hacer scroll (GSAP). Por eso varias láminas ya no se corresponden una a una con una sección: el plan indica en `note` qué se unió o cambió.

Método, herramientas y reglas: [output/V7-METODO.md](output/V7-METODO.md). Estado por sección: [output/PLAN-IMPLEMENTACION-V7.md](output/PLAN-IMPLEMENTACION-V7.md). Evidencia (lámina arriba, web abajo; móvil; capturas de scroll en vivo): `output/evidencia-v7/<página>/`.

Pendiente: revisión del usuario página por página; la animación histórica «dashboard que se convierte en móvil» sigue sin hacerse (no es la del teléfono viajero de /app).

## Texto que el usuario puede dar a otra IA

> Lee CONTINUAR-REDISENO.md y output/PLAN-IMPLEMENTACION-V7.md de esta rama. Implementa las 79 secciones pendientes de las otras diez páginas siguiendo las imágenes seleccionadas de output/laminas-secciones-v7/manifest.json. Inicio ya está implementado: consérvalo. Mira cada imagen antes de programar; reproduce su composición completa, sin mezclar con la maquetación vieja. Usa el contenido actual, las capturas reales y controles HTML funcionales. No inventes pantallas, datos ni promesas. Comprueba cada ruta en escritorio y móvil, documenta el progreso y sube el resultado a esta rama al terminar. No despliegues al servidor sin que te lo pida.

## Abrir el proyecto en otra computadora

Si ya existe una copia, revisar `git status` y conservar cualquier cambio local antes de actualizar. No hacer reset forzado ni borrar trabajo.

```sh
git fetch origin
git switch codex/rediseno-v6-fiel
git pull --ff-only origin codex/rediseno-v6-fiel
npm ci
npm run dev -- --host 127.0.0.1 --port 5174
```

Si todavía no existe una copia:

```sh
git clone --branch codex/rediseno-v6-fiel https://github.com/marcodpa/fom-md.git
cd fom-md
npm ci
npm run dev -- --host 127.0.0.1 --port 5174
```

Web: http://127.0.0.1:5174/ (en el escritorio de Claude también arranca con la configuración `fom-web` de `.claude/launch.json`) · Galería: http://127.0.0.1:5174/output/laminas-secciones-v7/index.html

El servidor debe quedar ejecutándose. Los secretos y archivos `.env` no están versionados; no publicarlos. Para la maquetación pública se usan capturas locales. Si se necesita backend autenticado, consultar la configuración existente sin inventar credenciales.

## Qué referencia manda

1. Las instrucciones actuales del usuario.
2. **Las imágenes seleccionadas en `output/laminas-secciones-v7/manifest.json`**, campo `file`, y la galería `index.html`. Son la referencia visual para cada sección.
3. `content`, `guide`, `refs` y `prompt` del mismo manifiesto explican contenido, composición y fuentes de cada lámina.
4. El contenido actual de `src/content/pages.js` y `src/pages/ReferenceMarketing.jsx` es la fuente factual. Si una imagen inventó, deformó o acortó texto, conservar el contenido real en HTML.
5. `DESIGN.md`, `.impeccable/design.json` y `HomeV7.jsx` explican la implementación y los tokens; no sustituyen la inspección visual de las imágenes.

No elegir automáticamente `01.png`, `02.png`, etc.: **15 selecciones usan archivos `-v2.png`**. El campo `file` ya señala la versión correcta. `revisions.json` conserva la procedencia. Las carpetas v3/v6 y `comparacion-v6` son historia, no el objetivo actual. Las rutas absolutas Windows dentro de `refs`/`source` son procedencia: resolver los segmentos `src/...` y `output/...` desde la nueva raíz. Los archivos de `.codex/generated_images` no son dependencias; las copias necesarias están en Git.

El mapa exhaustivo y verificable de las 90 secciones está en `output/PLAN-IMPLEMENTACION-V7.md` y `output/plan-implementacion-v7.json` (estado inicial, ruta, imagen seleccionada y capturas). Actualizar el estado al avanzar; no marcar terminado por generar una imagen.

## Contrato visual y errores que no se deben repetir

- Una lámina horizontal representa **una sección**, no toda una página. Mantener el orden, la composición, las proporciones y la posición de fotos, tarjetas, títulos y dispositivos.
- El usuario rechazó mezclar la estructura antigua con unas pocas fotos nuevas. No reutilizar el antiguo patrón de filas iguales para todas las secciones ni limitar el rediseño al hero.
- Fondo azul marino oscuro, acento azul FOM, texto claro, tipografía Spline Sans y fotografías integradas a la composición. La referencia manda sobre preferencias genéricas de una skill.
- Personas solo donde aparecen en la propuesta. Nada de añadir retratos a todas las secciones. Fotografía creíble: óptica natural, imperfecciones discretas y grano fino, sin degradar legibilidad.
- Vehículos en carreteras/patios; nunca flotando en agua. No aplicar el fondo de ondas azul antiguo a todo el sitio: el usuario detuvo esa dirección.
- Cada pantalla física de móvil, tableta o monitor debe mostrar **una captura original** adecuada de FOM. No dejar la interfaz inventada por el generador.
- El índice de conducción que se quería enseñar es el del **perfil/tab de persona**, con tarjeta amarilla/verde/roja según la captura real. Usar `app-perfil.webp`; no sustituirlo por otro indicador.
- Todo texto web, tarjeta, botón, navegación, acordeón y formulario debe existir como HTML/React. No colocar la lámina completa como única imagen de la página ni duplicar texto rasterizado y HTML.
- Mantener navegación visible, foto de footer ocupando el fondo previsto y fotos distintas cuando la propuesta lo indica. No inventar porcentajes, clientes, premios, precios, garantías, teléfonos ni datos de contacto.

## Mapa del código

| Archivo | Uso |
| --- | --- |
| `src/App.jsx` | `/` carga `HomeV7`; las otras diez rutas públicas cargan `ReferenceMarketing`. Gestiona el header y el wrapper `home-v7-shell` solo para Inicio. |
| `src/pages/HomeV7.jsx` | Ejemplo implementado: `Picture`, `Section`, iconos, features, preguntas, footer y once secciones. Los helpers son locales, no están exportados. |
| `src/styles/home-v7.css` | Composición v7 de Inicio, responsive y aislamiento de estilos. No extender reglas de Inicio indiscriminadamente a todas las rutas. |
| `src/pages/ReferenceMarketing.jsx` | Implementación anterior y parte del contenido de las páginas restantes. Inspeccionar cada rama por slug. |
| `src/content/pages.js` | `PAGES`, información de plataforma, funciones, seguridad, áreas, contacto y FAQs. |
| `src/components/marketing/MarketingChrome.jsx` | Marca y header compartido. |
| `src/components/marketing/MarketingSections.jsx` | `ContactForm` existente y otros componentes. El formulario prepara un correo, no envía desde backend. |
| `src/content/v6-photography.js` | Mapeo histórico de arte; no confundir con el objetivo v7. |
| `src/lib/screenProjection.js` | Proyección de captura rectangular en cuatro esquinas de una pantalla física. |
| `test/screen-projection.test.js` | Verifica esquinas y rechazo de superficies degeneradas. |
| `src/assets/marketing/real/` | Capturas originales PNG y WebP de la app/panel. |
| `src/assets/marketing/home-v7/` | Once fotografías sin texto web, originales PNG y WebP optimizados. Son de Inicio; no son fondos ya preparados para las otras páginas. |
| `output/home-v7-assets.json` | Prompts y procedencia de las fotografías de Inicio. |

Se puede extraer un componente reutilizable para pantallas/fotografías y crear componentes de página v7 con CSS acotado. Esta es una sugerencia de arquitectura, no permiso para uniformar las composiciones. Revisar `MarketingHeader`/footer existentes antes de introducir duplicados.

## Pantallas originales y preparación de fondos

En `src/assets/marketing/real/` están: `panel-resumen`, `panel-mapa`, `panel-flota`, `panel-alertas`, `panel-reportes`, `panel-seguridad`, `app-inicio`, `app-inspeccion`, `app-mantenimiento` y `app-perfil` (PNG/WebP). El campo `refs` de cada sección indica cuáles corresponden. Conservar la leyenda «Datos de demostración»; no presentar esas cifras como resultados comerciales.

Proceso que se usó en Inicio:

1. Mirar la lámina y extraer su composición: capas, zonas de texto, foto, tarjetas y dispositivo.
2. Obtener una fotografía limpia que conserve encuadre y geometría, quitando textos, navegación, tarjetas y controles web. Conservar manos/marcos/monitor físicos. Si se usa IA para editar, pasar la imagen de referencia y preservar la composición; registrar prompt y procedencia. No generar un concepto distinto.
3. Superponer la captura original dentro del bisel. `screenProjection(corners)` recibe cuatro puntos: superior izquierda, superior derecha, inferior derecha, inferior izquierda. La implementación de Inicio mide en una foto 1672×941, usa un plano CSS 1000×1000 y escala con `ResizeObserver`. Si el fondo tiene otra resolución, adaptar la base; no copiar coordenadas entre dispositivos.
4. Añadir texto y controles HTML encima, en posiciones fieles. Optimizar la foto a WebP y conservar el original. Cargar el hero con prioridad; fotos posteriores de forma diferida.
5. En móvil reordenar para que el texto sea legible y el dispositivo reconocible. No reducir toda la sección de escritorio hasta volverla ilegible.

La sección 03 de Inicio usa un clip SVG específico para que la mujer tape correctamente parte de la pantalla. No generalizar ese clip. Un intento `03-foreground.png` fue descartado porque el generador movió a la persona; `output/home-v7-foreground.json` es registro histórico, no un recurso pendiente de recuperar.

## Navegación y alcance que se conserva

Plataforma agrupa Plataforma web, App, Funciones, Seguridad y Áreas. Información agrupa Quiénes somos, Qué ofrecemos, Beneficios y Preguntas frecuentes. Contacto va separado. Preguntas tiene su ruta propia `/preguntas-frecuentes`, no un enlace que solo vuelva a Inicio.

No modificar `/entrar`, `/cambiar-clave-inicial`, `/panel/*`, autenticación, permisos o backend como parte de este rediseño publicitario. El usuario había pedido conservar el inicio de sesión. El proyecto móvil `control-flotas-main` tiene instrucciones propias; no hace falta editarlo para usar las capturas.

Existe una petición histórica de animar un dashboard que se convierte en móvil al hacer scroll. **HomeV7 no implementa esa transformación.** No declararla terminada ni introducirla a costa de la fidelidad de las láminas; registrarla como seguimiento separado si el usuario la retoma.

## Método de ejecución y validación

Trabajar por página: inspeccionar todas sus láminas, registrar correspondencia con el contenido actual, implementar cada sección y verificarla antes de marcar esa página completa. Empezar por Plataforma, luego App, Funciones, Seguridad, Áreas, Quiénes somos, Qué ofrecemos, Beneficios, Preguntas y Contacto.

Comparar capturas de **todas las secciones**, no solo el hero, con las referencias al mismo ancho. Verificar escritorio (incluyendo 1672×941 para comparación) y móvil (por ejemplo 390×844): títulos sin cortes, contraste, fotos cargadas, pantallas bien alineadas, tarjetas completas, footer y ausencia de desbordamiento horizontal. La altura puede crecer con textos largos o acordeones abiertos: no recortarlos para forzar el formato.

Probar rutas directas/recarga, enlaces del header y footer, menú móvil, anclas bajo el header, FAQs con teclado y validación del formulario. No enviar correos reales para probar. Los estilos globales antiguos de `.marketing-v2 summary>span` giraban todos los textos 45° al abrir preguntas: Inicio ya tiene override; aislar también las nuevas páginas.

```sh
npm test
npm run build
git diff --check
```

Base verificada en `e3b7c17`: compilación correcta y 14 pruebas aprobadas. La revisión visual de Inicio fue parcial por secciones; no equivale a aprobación de todo el sitio. El comparador de hero registró 87%, no fidelidad perfecta.

Las capturas fullpage `.impeccable/review/desktop.jpg` y `mobile.jpg` tienen bandas duplicadas por el capturador. No son referencia de diseño ni evidencia fiable de duplicación DOM. Usar capturas de viewport, esperar que carguen las fotos y registrar archivo/ruta/ancho. Hay ejemplos `desktop-viewport.jpg`, `faq-desktop.jpg` y `faq-mobile.jpg`. El estado automático `.impeccable/build/state.json` quedó en fase `sections`; no usarlo como prueba de que las demás páginas estén completas.

Skills útiles, si están disponibles: `impeccable` (solicitada por el usuario), `image-to-code`, `redesign-existing-projects`, `imagegen-frontend-web` para dirección por sección y `imagegen` para edición de fondos. Leer sus instrucciones reales al usarlas. No depender de instalaciones en `C:/Users/home/.codex`; la otra computadora puede no tenerlas. No inventar nombres de las «cuatro skills de fotos» que el usuario mencionó históricamente: no consta una lista verificada en este relevo.

## Guardado y entrega

Actualizar el plan por sección con implementación, assets y evidencia, y anotar pendientes con precisión. Conservar toda la información del producto. Subir código, fotografías necesarias, procedencia y documentación, excluyendo `.env`, credenciales, `node_modules` y `dist`. No hacer force push ni borrar cambios ajenos.

El usuario pidió conservar todo en el repositorio para continuar desde casa. Mantener la rama `codex/rediseno-v6-fiel`, comprobar que el commit local existe en origin y entregar hash. Push al repositorio **no es despliegue**: no publicar cambios en el servidor automáticamente.
