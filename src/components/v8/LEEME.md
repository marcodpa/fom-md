# Web v8 · base compartida (T-104)

Base de la web pública nueva (lienzo «Web FOM nueva», aprobado por Marco). Cada página se
programa en `src/pages/v8/<Pagina>V8.jsx` usando estas piezas. Inicio (`InicioV8.jsx`) es el
ejemplo completo: léelo antes de empezar.

```jsx
import { useRef } from 'react'
import { SitioV8, HeroV8, SeccionV8, ContenedorV8, EncabezadoV8, useMomentoV8, rutaV8 } from '../../components/v8'
import './plataforma-v8.css' // solo lo propio de tu página, con prefijo v8- o <pagina>-

export default function PlataformaV8() {
  const raiz = useRef(null)
  useMomentoV8(raiz, ({ q, gsap, escritorio }) => { /* momentos propios de la nota azul */ })
  return <SitioV8 raiz={raiz} titulo="Plataforma — FOM" descripcion="…">
    <HeroV8 … />
    …
  </SitioV8>
}
```

## Reglas que no se rompen

1. **Fondo continuo («seamless»).** Todo el sitio es un solo fondo noche `#0a0d12`. Las bandas
   (`<SeccionV8 banda>`, `#0f141b`) entran y salen con un degradado largo y suave, sin bordes ni
   líneas. No pongas fondos sólidos de otro tono, cajas ni rayas alrededor de una foto o sección.
   Si de verdad necesitas un corte seco, `className="is-seca"` (no debería hacer falta).
2. **Fotos con fondo compartido.** Las fotos van con `<FotoIntegradaV8>`: sus bordes se funden
   hacia el fondo con `mask-image` (degradados de varias paradas, sin escalones). Sin radio, sin
   borde, sin sombra cuando van a sangre. Los objetos recortados con transparencia (teléfono,
   laptop, GPS, Hilux) van con `fundido="ninguno"` y se apoyan directo sobre el fondo.
3. **Capturas nítidas.** Donde se explique una función en detalle, muestra la captura REAL plana
   (`<CapturaFlotanteV8>`), no la foto de un monitor. Nunca filtros, desenfoque ni `transform`
   que reescale una foto o captura por encima de 1. Nada de `scale` en capturas.
4. **Animación con medida.** Solo los momentos de la nota azul de tu tablero (ver
   `canvas.json` → `notes.g-<pagina>`). GSAP + ScrollTrigger, solo transform y opacidad. Escenas
   fijas (pin) solo en escritorio (`escritorio === true`). Con «reducir movimiento» todo visible y
   quieto: eso lo resuelve `useMomentoV8`; no animes fuera del hook.
5. **Teléfono impecable a 390 px**, sin desplazamiento lateral. Cortes: teléfono ≤ 599 px,
   composiciones apiladas < 900 px, escritorio ≥ 900 px (escenas fijas ≥ 1024 px).
6. **Textos reales** (los del tablero salen de `src/content/pages.js`; úsalo para preguntas y
   cifras). Capturas con «Datos de demostración». Sin emoji. Azul FOM `#3D9BF5` con texto
   `#08121C` encima (nunca blanco sobre azul).
7. **Enlaces entre páginas siempre con `rutaV8('clave')`**, nunca rutas escritas a mano.
8. No toques `App.jsx` ni `rutasV8.js`: tu página se registra sola al crear el archivo con el
   nombre de la tabla (`PlataformaV8.jsx`, `AppV8.jsx`, `FuncionesV8.jsx`, `SeguridadV8.jsx`,
   `AreasV8.jsx`, `QuienesSomosV8.jsx`, `QueOfrecemosV8.jsx`, `BeneficiosV8.jsx`,
   `PreguntasV8.jsx`, `ContactoV8.jsx`). Hasta entonces la ruta muestra «En construcción».
9. Si necesitas una pieza nueva que sirva a varias páginas, pídela al coordinador en vez de
   editar la base; mientras, hazla en tu página.

## Rutas

`src/pages/v8/rutasV8.js` es la tabla única. Hoy todo vive bajo `/nuevo` (`/nuevo`,
`/nuevo/plataforma`, `/nuevo/app`, `/nuevo/funciones`, `/nuevo/seguridad`, `/nuevo/areas`,
`/nuevo/quienes-somos`, `/nuevo/que-ofrecemos`, `/nuevo/beneficios`, `/nuevo/preguntas`,
`/nuevo/contacto`). Al aprobarse: `PUBLICADA = true` y retirar las rutas v7 de `App.jsx`.

- `rutaV8(clave, ancla?)` → ruta de la página (`rutaV8('contacto', 'solicitud-demo')`).
- `paginaV8(clave)` → `{ clave, nombre, archivo, nueva, real }`.
- `ENTRAR` (`/entrar`), `CORREO_FOM` (`contacto@fom.app`).

## Fotos y capturas (`src/assets/marketing/v8/`)

Cada imagen tiene un **nombre estable** y varias copias `<nombre>-<ancho>x<alto>.avif|webp`
(con canal alfa: las fotos del paquete T-102 traen la orilla fundida en transparencia).
`fotosV8.js` las encuentra solas y `FotoIntegradaV8` / `CapturaFlotanteV8` arman un `<picture>`:
AVIF primero, WebP de respaldo, `srcset` con los anchos reales. Si existe `<nombre>-movil`
(recorte vertical o cuadrado), se sirve sola en el teléfono (≤ 599 px) con `<source media>`;
`movil={false}` en `FotoIntegradaV8` la desactiva. Para **cambiar una foto sin tocar código**:
cambia su ruta en `src/assets/marketing/v8/fuentes.txt` (o usa el comando de una sola foto) y
corre desde la raíz del repo:

```
python src/assets/marketing/v8/preparar_fotos.py --lista src/assets/marketing/v8/fuentes.txt
python src/assets/marketing/v8/preparar_fotos.py camion-noche comparativa/web-v8-fotos/maestros/camion-noche.webp foto
```

Las fuentes son los maestros de `comparativa/web-v8-fotos/maestros/` y las capturas 3x de
`capturas-panel/3x/` (ver su INDICE.md). Si el paquete trae las copias listas en `web/`, el script
las copia sin recomprimir; si no, codifica AVIF + WebP con alfa. Anchos: fotos 640/1280/1920
(+2880 en portadas), `-movil` 750/1170, panel 1280/1920/2880, app 750/1170. Nunca se agranda.

Nombres listos (los de todos los tableros):

- Fotos con la pantalla actual integrada: `hero-monitor-carretera`, `oficina-monitor-resumen`,
  `patio-monitor-mapa`, `operadora-mapa`, `oficina-reportes`, `laptop-vehiculos`,
  `mano-app-perfil`, `tecnico-app-unidad`.
- Escenas: `telematica`, `conductor-sos`, `furgoneta-fom`, `camion-marca`, `fila-flota`,
  `autopista-atardecer`, `reunion`, `camioneta-noche`, `camion-lateral-fom`, `carretera-curvas`,
  `costa-ruta`, `instalacion-gps`, `camion-autopista`, `aerea-terminal`, `supervisor-fila`,
  `aerea-taller`, `camioneta-ciudad`, `camion-noche`, `furgoneta-ruta`, `servidores`,
  `camara-tablero`, `equipo-roles`, `cabina-carretera`.
- Capturas del panel: `cap-panel-resumen`, `cap-panel-mapa`, `cap-panel-alertas`,
  `cap-panel-mantenimiento`, `cap-panel-reportes`, `cap-panel-flota`, `cap-panel-inspecciones`,
  `cap-panel-documentos`, `cap-panel-personal`.
- Capturas de la app: `cap-movil-cond-inicio`, `cap-movil-cond-mantenimiento`,
  `cap-movil-cond-mapa`, `cap-movil-cond-perfil`, `cap-movil-sup-resumen`,
  `cap-movil-sup-alertas`, `cap-movil-sup-mantenimiento`, `cap-movil-sup-mapa`.
- Nuevas del paquete T-102 (aún sin uso): fotos `taller-mantenimiento`, `conductor-cabina`,
  `puente-lago-maracaibo`, `carretera-zulia`; capturas `cap-panel-mapa-unidad`,
  `cap-panel-conductor`, `cap-panel-inventario-gps`, `cap-movil-sup-mapa-unidad`,
  `cap-movil-sup-inspecciones`, `cap-movil-sup-reportes`, `cap-movil-sup-vehiculos`,
  `cap-movil-sup-conductor`.

En los tableros (`*.dc.html`) las fotos aparecen como `/_blob/<hash>`; el nombre de cada hash
está en
`C:\Users\home\AppData\Local\Temp\claude\C--Users-home-Downloads-fom\940a35f0-e617-4c23-a5b1-dc5f12930682\scratchpad\t99\blobs.txt` (mismo nombre sin `.jpg`, y `cap-*` para las capturas).

## Piezas (todas se importan desde `src/components/v8`)

### Armazón
- **`SitioV8`** `{ titulo, descripcion?, raiz?, children }` — fondo noche + resplandor azul,
  `NavV8`, `<main id="contenido">` y `PieV8`. Carga Inter (respaldo Spline Sans). Pasa
  `raiz={raiz}` (un `useRef`) para `useMomentoV8`.
- **`NavV8`** — barra global de vidrio, 44 px (48 en el teléfono): Inicio · Plataforma ·
  Información · Contacto, Iniciar sesión, Solicitar demostración; desplegables al pasar o enfocar;
  menú de pantalla completa en el teléfono. Ya va dentro de `SitioV8`. `GRUPOS_V8` = sus grupos.
- **`PieV8`** — pie de 4 columnas (2 en el teléfono). Ya va dentro de `SitioV8`.
- **`NavLocalV8`** (ya NO se muestra: Marco pidió una sola barra flotante; se deja para no romper páginas) `{ titulo, enlaces: [[id | ruta, nombre]] }` — barra local de 52 px bajo la
  global (solo ≥ 900 px). Marca la sección visible. Define `enlaces` FUERA del componente.
  `<NavLocalV8 titulo="Funciones" enlaces={LOCAL} />` con `const LOCAL = [['gps','GPS'], …]`.

### Marca e iconos
- **`LogoV8`** — logo FOM original en vector (flechas `#349BFA`, letras `#f7f8fa`).
- **`IconoV8`** `{ nombre }` — trazo 1,5, 24 × 24, decorativo. Nombres en `ICONOS_V8`: pin,
  phone, monitor, database, cloud, wrench, clipboard, bell, chart, shield, layers, users, gauge,
  sos, clock, route, zone, mail, arrow, chevron, plus, minus, grid, lock, truck, camera, chat,
  login.

### Texto y acciones
- **`BotonV8`** `{ to?, tamano: 'sm'|'md'|'lg', fantasma?, ancho?, type? }` — píldora azul FOM.
  Con `to` es enlace (interno, `mailto:` o `#ancla`); sin `to`, `<button>`.
- **`EnlaceV8`** `{ to }` — enlace azul con «›». **`EnlaceBaseV8`** decide `<Link>` o `<a>`.
- **`Lineas`** `{ texto: string | string[] }` — un renglón por elemento en escritorio; seguidas
  en el teléfono (como los `<br>` del tablero de escritorio).
- Clases de texto: `v8-h1`, `v8-h2`, `v8-h3`, `v8-h4`, `v8-lead`, `v8-kick` (`is-tinta` = blanco),
  `v8-frase` (48/28), `v8-t2`, `v8-t3`, `v8-sm`, `v8-xs`, `v8-fuerte` (el `<b>` blanco de las
  listas), `v8-centro`, `v8-mx`, `v8-solo-escritorio`, `v8-solo-movil`, `v8-nota-demo`.
- Rejillas: `v8-g2`…`v8-g5`, `v8-split` (5/7; `is-inverso` 7/5), `v8-acciones`.

### Secciones
- **`SeccionV8`** `{ id?, banda?, as?, className?, style? }` — 90 px (64 en el teléfono).
  `banda` = `#0f141b` con entrada/salida en degradado. No trae contenedor.
- **`ContenedorV8`** — ancho 1180 + márgenes 22 (20 en el teléfono).
- **`EncabezadoV8`** `{ kicker?, titulo, bajada?, centro?, nivel?, id?, anchoBajada? }` — kicker
  azul, h2 por líneas y bajada; aparece suave al entrar.
- **`HeroV8`** `{ kicker, kickerTinta?, titulo, bajada?, bajadaAngosta?, primaria?: {to, texto},
  secundaria?: {to, texto}, foto?: props de FotoIntegradaV8, nota?: {titulo, texto, accion?},
  medio? }` — hero centrado con foto a sangre fundida. Hace solo el momento 1 de todas las notas
  azules: titular escalonado y foto de 92 % a 100 % al bajar. `medio` reemplaza la foto (p. ej.
  hero con formulario de Contacto: arma tu propia composición y marca el texto con
  `data-v8-entra`).
- **`EscenaV8`** `{ foto, lado: 'derecha'|'izquierda', ancho='72%', anchoTexto=520,
  posicionMovil?, altoMovil?, children }` — foto a un lado fundida (f-l / f-r) y el texto encima
  del otro; en el teléfono, foto alta arriba y texto debajo. (Inicio: Seguridad; Funciones:
  Reportes; Plataforma: servidores; Contacto: instalación.)
- **`CtaFinalV8`** `{ titulo?, texto?, nota?, foto?, lado?, ancho? }` — «Hablemos de tu
  operación.» con la furgoneta, Solicitar demostración y contacto@fom.app.

### Vidrio
- **`TarjetaVidrioV8`** `{ as?, caja=true, radio: 'hoja'|'tarjeta' }` — vidrio oscuro (`.glass
  .box` del tablero). Clase suelta: `v8-vidrio` (+ `is-caja`).
- **`ChipV8`** `{ icono?, titulo, texto? }` — chip de vidrio sobre las fotos.
- **`NotaVidrioV8`** `{ titulo, texto?, accion? }` — la cápsula «Panel web y app del conductor».

### Imágenes
- **`FotoIntegradaV8`** `{ nombre, alt, fundido: 'y'|'b'|'o'|'l'|'r'|'ninguno', sizes='100vw',
  prioridad?, alto?, posicion?, className?, style? }` — `<img>` con srcset real, `width/height`
  reservados, carga diferida (salvo `prioridad`). `alto` = recorte con `object-fit: cover`.
  Pon `sizes` medido cuando la foto no ocupa todo el ancho (`'(min-width: 900px) 60vw, 100vw'`).
  `alt=""` si es decorativa.
- **`CapturaFlotanteV8`** `{ nombre, alt, tipo?: 'panel'|'telefono', ancho?, sizes?, nota?,
  prioridad? }` — captura real plana en marco de vidrio (panel) o de teléfono. `ancho` en px
  (número) calcula `sizes` solo. `nota` = `true` pone «Captura real del panel · Datos de
  demostración» (o el texto que pases). Nunca más ancha que la captura real.
- **`fotoV8(nombre)`** → `{ src, srcSet, width, height }` para casos especiales.

### Listas y datos
- **`RasgosV8`** `{ items: [{icono?, titulo, texto}], columnas=4 }` — icono + título + texto.
- **`BloqueCifrasV8`** `{ cifras: [{valor, etiqueta}], columnas=4, centro? }` — cifras grandes y
  QUIETAS (sin contadores). Para `pages.js`: `{ valor: s.stat.value, etiqueta: s.stat.label }`.
- **`ListaPasosV8`** `{ pasos: [{titulo, texto}], activo?, alCambiar?, variante?: 'linea',
  numerar=true }` — pasos 01, 02… con los no activos tenues (recorridos fijos de Funciones y
  Beneficios: maneja `activo` desde tu momento de scroll). `variante="linea"` = fila «1. Contacto
  · 2. Demostración…» con raya azul en el primero.
- **`PestanasV8`** `{ opciones: string[], activa, alCambiar, etiqueta }` — chips de pestaña.
- **`CarruselV8`** `{ etiqueta, children }` — carrusel horizontal nativo (dedo, rueda, teclado)
  con puntos en píldora de vidrio. **`TarjetaCarruselV8`** `{ titulo, texto, foto? | medio? }`
  = tarjeta 400 × 560 de las funciones (300 × 440 en el teléfono).
- **`PreguntasV8`** `{ items: [{q, a}], abierta=0 }` — acordeón de vidrio, abre/cierra en 0,3 s.
  Usa `PAGES.<pagina>.faqs`.
- **`FormularioContactoV8`** `{ titulo?, id='solicitud-demo' }` — el formulario de hoy: arma el
  correo hacia contacto@fom.app y abre la aplicación de correo. No llama a ningún servidor.

### Movimiento
- **`useMomentoV8(raiz, momentos?)`** — GSAP + ScrollTrigger dentro de `gsap.matchMedia`;
  limpieza automática al desmontar; con «reducir movimiento» no corre nada. Hace solo:
  `data-v8-entra` (entrada escalonada del hero), `data-v8-crece` (foto del hero 92 % → 100 %) y
  `data-v8-aparece` (opacidad + 24 px al entrar, una vez). `EncabezadoV8`, `RasgosV8`,
  `BloqueCifrasV8` y `CtaFinalV8` ya marcan `data-v8-aparece`. Tus momentos:

```js
useMomentoV8(raiz, ({ q, gsap, escritorio }) => {
  if (!escritorio) return            // en el teléfono no hay escenas fijas
  const tl = gsap.timeline({ scrollTrigger: { trigger: q('.mi-escena')[0], start: 'center center', end: '+=90%', pin: true, scrub: 0.6 } })
  tl.fromTo(q('.mi-captura'), { yPercent: 12, opacity: 0 }, { yPercent: 0, opacity: 1, ease: 'none' })
})
```
  Solo `x/y/xPercent/yPercent/opacity` (y `scale` ≤ 1 en fotos, nunca en capturas); `ease:
  'none'` con scrub.

## Verificar tu página

```
npm test
npx vite build --mode demo --outDir <scratchpad>/build --emptyOutDir
npx vite --mode demo --port <tu puerto>      # solo modo demo; apágalo por PID
```
Capturas escritorio 1440 y teléfono 390 (también con «reducir movimiento») en
`comparativa/web-v8-codigo/`. Guion de ejemplo (Playwright + Edge):
`C:\Users\home\AppData\Local\Temp\claude\C--Users-home-Downloads-fom\940a35f0-e617-4c23-a5b1-dc5f12930682\scratchpad\t104\shots.py`
(`python shots.py <carpeta> http://localhost:<puerto>/nuevo/<pagina> [escritorio|telefono]`).
