// Imágenes de la web v8: siempre nítidas y con el fondo compartido.
//  - FotoIntegradaV8: foto a sangre cuyos bordes se funden con el fondo de la sección (las fotos
//    del paquete ya traen la orilla en transparencia y además mask-image con degradados suaves).
//    Sin radio, sin borde, sin sombra. Acepta objetos recortados con transparencia
//    (fundido="ninguno") que se apoyan directo sobre el fondo.
//  - CapturaFlotanteV8: captura REAL del panel o de la app, plana y nítida, dentro del vidrio.
//    Úsala donde se explica una función en detalle (no la foto de un monitor).
// Las dos sirven <picture> con AVIF primero y WebP de respaldo, srcset con los anchos reales del
// catálogo (fotosV8.js) y un `sizes` medido: el navegador elige la copia justa para la pantalla
// (1x, 2x, 3x) y nunca pide una mayor que la foto real. Si la foto tiene recorte de teléfono
// (<nombre>-movil), se sirve con <source media> en pantallas ≤ 599 px. Nunca se aplica filtro,
// desenfoque ni transform que reescale el contenido.
// <picture> va con display: contents: el <img> sigue siendo la caja que maquetan las páginas
// (className, alto, object-position y data-* van al <img>).
import { fotoV8, MEDIA_MOVIL_V8 } from './fotosV8'

const FUNDIDOS = { y: 'v8-funde-y', b: 'v8-funde-b', o: 'v8-funde-o', l: 'v8-funde-l', r: 'v8-funde-r' }
const PICTURE = { display: 'contents' }
// Con <picture> en display: contents, cada <source> sería una celda vacía de la rejilla o del
// flex del padre: se ocultan (no cambia la elección de la imagen).
const SOURCE = { display: 'none' }

// Fuentes de <picture>: teléfono (AVIF, WebP) y luego escritorio (AVIF). El WebP de escritorio
// va en el propio <img>.
function Fuentes({ f, sizes, movil }) {
  const m = movil ? f.movil : null
  return <>
    {m?.avif && <source media={MEDIA_MOVIL_V8} type="image/avif" srcSet={m.avif} sizes={sizes} width={m.width} height={m.height} style={SOURCE} />}
    {m && <source media={MEDIA_MOVIL_V8} type="image/webp" srcSet={m.srcSet} sizes={sizes} width={m.width} height={m.height} style={SOURCE} />}
    {f.avif && <source type="image/avif" srcSet={f.avif} sizes={sizes} style={SOURCE} />}
  </>
}

// movil={false}: usa la foto de escritorio también en el teléfono (cuando la composición del
// teléfono necesita el encuadre horizontal).
export function FotoIntegradaV8({ nombre, alt, fundido = 'y', sizes = '100vw', prioridad = false, movil = true, alto, posicion, className = '', style, ...resto }) {
  const f = fotoV8(nombre)
  if (!f) return null
  const clases = ['v8-foto', FUNDIDOS[fundido] || (fundido === 'ninguno' ? 'is-objeto' : ''), alto ? 'is-cubre' : '', className].filter(Boolean).join(' ')
  return <picture style={PICTURE}>
    <Fuentes f={f} sizes={sizes} movil={movil} />
    <img className={clases} src={f.src} srcSet={f.srcSet} sizes={sizes} width={f.width} height={f.height} alt={alt}
      loading={prioridad ? 'eager' : 'lazy'} fetchpriority={prioridad ? 'high' : undefined} decoding={prioridad ? 'sync' : 'async'}
      style={{ ...(alto ? { height: alto } : null), ...(posicion ? { objectPosition: posicion } : null), ...style }} {...resto} />
  </picture>
}

// Las capturas del paquete están a 3x (panel 1280 × 800 px CSS en 3840 × 2400; app 390 × 844 en
// 1170 × 2532). El marco nunca pasa del ancho que aún se ve a 2x: copia mayor / 2.
const DENSIDAD_MINIMA = 2

// tipo: 'panel' (captura del panel web) o 'telefono' (captura de la app); si no se indica, se
// deduce del nombre (cap-movil-* = teléfono). `ancho` = ancho en CSS del marco (número en px o
// cualquier medida CSS); con número, `sizes` se calcula solo.
export function CapturaFlotanteV8({ nombre, alt, tipo, ancho, sizes, nota = false, prioridad = false, className = '', style }) {
  const f = fotoV8(nombre)
  if (!f) return null
  const t = tipo || (nombre.startsWith('cap-movil') ? 'telefono' : 'panel')
  const marco = t === 'telefono' ? 16 : 20 // relleno del marco a ambos lados
  const tope = Math.round(f.width / DENSIDAD_MINIMA) // nunca más ancha de lo que se ve nítido
  const anchoCss = typeof ancho === 'number' ? `${ancho}px` : ancho
  const medida = sizes || (typeof ancho === 'number' ? `${Math.max(ancho - marco, 1)}px` : t === 'telefono' ? '280px' : `(min-width: 1240px) ${Math.min(1160, tope)}px, calc(100vw - 56px)`)
  const etiqueta = nota === true ? (t === 'telefono' ? 'Captura real de la app · Datos de demostración' : 'Captura real del panel · Datos de demostración') : nota
  return <figure className={`v8-captura-figura ${className}`} style={{ width: anchoCss, maxWidth: `min(100%, ${tope + marco}px)`, ...style }}>
    <div className={`v8-captura is-${t}`}>
      <picture style={PICTURE}>
        <Fuentes f={f} sizes={medida} movil={false} />
        <img src={f.src} srcSet={f.srcSet} sizes={medida} width={f.width} height={f.height} alt={alt}
          loading={prioridad ? 'eager' : 'lazy'} fetchpriority={prioridad ? 'high' : undefined} decoding="async" />
      </picture>
    </div>
    {etiqueta && <figcaption className="v8-nota-demo">{etiqueta}</figcaption>}
  </figure>
}
