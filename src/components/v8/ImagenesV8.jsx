// Imágenes de la web v8: siempre nítidas y con el fondo compartido.
//  - FotoIntegradaV8: foto a sangre cuyos bordes se funden con el fondo de la sección (mask-image
//    con degradados suaves). Sin radio, sin borde, sin sombra. Acepta objetos recortados con
//    transparencia (fundido="ninguno") que se apoyan directo sobre el fondo.
//  - CapturaFlotanteV8: captura REAL del panel o de la app, plana y nítida, dentro del vidrio.
//    Úsala donde se explica una función en detalle (no la foto de un monitor).
// Las dos sirven srcset con los anchos reales del catálogo (fotosV8.js) y un `sizes` medido: el
// navegador elige la copia justa para la pantalla (1x, 2x, 3x). Nunca se aplica filtro, desenfoque
// ni transform que reescale el contenido.
import { fotoV8 } from './fotosV8'

const FUNDIDOS = { y: 'v8-funde-y', b: 'v8-funde-b', o: 'v8-funde-o', l: 'v8-funde-l', r: 'v8-funde-r' }

export function FotoIntegradaV8({ nombre, alt, fundido = 'y', sizes = '100vw', prioridad = false, alto, posicion, className = '', style, ...resto }) {
  const f = fotoV8(nombre)
  if (!f) return null
  const clases = ['v8-foto', FUNDIDOS[fundido] || (fundido === 'ninguno' ? 'is-objeto' : ''), alto ? 'is-cubre' : '', className].filter(Boolean).join(' ')
  return <img className={clases} src={f.src} srcSet={f.srcSet} sizes={sizes} width={f.width} height={f.height} alt={alt}
    loading={prioridad ? 'eager' : 'lazy'} fetchpriority={prioridad ? 'high' : undefined} decoding="async"
    style={{ ...(alto ? { height: alto } : null), ...(posicion ? { objectPosition: posicion } : null), ...style }} {...resto} />
}

// tipo: 'panel' (captura del panel web) o 'telefono' (captura de la app); si no se indica, se
// deduce del nombre (cap-movil-* = teléfono). `ancho` = ancho en CSS del marco (número en px o
// cualquier medida CSS); con número, `sizes` se calcula solo.
export function CapturaFlotanteV8({ nombre, alt, tipo, ancho, sizes, nota = false, prioridad = false, className = '', style }) {
  const f = fotoV8(nombre)
  if (!f) return null
  const t = tipo || (nombre.startsWith('cap-movil') ? 'telefono' : 'panel')
  const marco = t === 'telefono' ? 16 : 20 // relleno del marco a ambos lados
  const tope = f.width // nunca más ancho que la captura real (en px CSS a 1x)
  const anchoCss = typeof ancho === 'number' ? `${ancho}px` : ancho
  const medida = sizes || (typeof ancho === 'number' ? `${Math.max(ancho - marco, 1)}px` : t === 'telefono' ? '280px' : `(min-width: 1240px) ${Math.min(1160, tope)}px, calc(100vw - 56px)`)
  const etiqueta = nota === true ? (t === 'telefono' ? 'Captura real de la app · Datos de demostración' : 'Captura real del panel · Datos de demostración') : nota
  return <figure className={`v8-captura-figura ${className}`} style={{ width: anchoCss, maxWidth: `min(100%, ${tope + marco}px)`, ...style }}>
    <div className={`v8-captura is-${t}`}>
      <img src={f.src} srcSet={f.srcSet} sizes={medida} width={f.width} height={f.height} alt={alt}
        loading={prioridad ? 'eager' : 'lazy'} decoding="async" />
    </div>
    {etiqueta && <figcaption className="v8-nota-demo">{etiqueta}</figcaption>}
  </figure>
}
