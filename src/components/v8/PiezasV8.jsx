// Piezas reutilizables de la web v8 (las que se repiten en los tableros). Documentación con
// props y ejemplos en src/components/v8/LEEME.md.
import { Children, useEffect, useId, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { IconoV8 } from './MarcaV8'
import { FotoIntegradaV8 } from './ImagenesV8'
import { rutaV8, CORREO_FOM } from '../../pages/v8/rutasV8'

const esInterna = to => typeof to === 'string' && to.startsWith('/')

// Enlace que decide solo: ruta interna → <Link>, el resto (#ancla, mailto:, https:) → <a>.
export function EnlaceBaseV8({ to, children, ...resto }) {
  return esInterna(to) ? <Link to={to} {...resto}>{children}</Link> : <a href={to} {...resto}>{children}</a>
}

// Botón en píldora azul FOM (texto #08121C). tamano: 'sm' | 'md' | 'lg'. fantasma: vidrio claro.
export function BotonV8({ to, children, tamano = 'md', fantasma = false, ancho = false, className = '', type = 'button', ...resto }) {
  const clases = ['v8-pill', tamano !== 'md' && `is-${tamano}`, fantasma && 'is-fantasma', ancho && 'is-ancho', className].filter(Boolean).join(' ')
  if (to) return <EnlaceBaseV8 to={to} className={clases} {...resto}>{children}</EnlaceBaseV8>
  return <button type={type} className={clases} {...resto}>{children}</button>
}

// Enlace azul con flecha «›».
export function EnlaceV8({ to, children, className = '', ...resto }) {
  return <EnlaceBaseV8 to={to} className={`v8-enlace ${className}`} {...resto}>{children} <IconoV8 nombre="chevron" /></EnlaceBaseV8>
}

// Titular con líneas: en escritorio cada elemento del arreglo va en su renglón; en el teléfono
// corren seguidas. Acepta un texto simple.
export function Lineas({ texto }) {
  if (!Array.isArray(texto)) return texto
  return texto.map((l, i) => <span className="v8-linea" key={i}>{l}{i < texto.length - 1 ? ' ' : ''}</span>)
}

// Sección: 90 px arriba y abajo (64 en el teléfono). banda = fondo #0f141b que entra y sale con
// degradado largo (sin cortes). El contenido NO va en contenedor: usa <ContenedorV8> donde toque,
// así las fotos a sangre pueden ocupar todo el ancho.
export function SeccionV8({ as: Etiqueta = 'section', id, banda = false, className = '', style, children, ...resto }) {
  return <Etiqueta id={id} className={['v8-sec', banda && 'v8-banda', className].filter(Boolean).join(' ')} style={style} data-v8-3d="seccion" {...resto}>{children}</Etiqueta>
}

export function ContenedorV8({ as: Etiqueta = 'div', className = '', children, ...resto }) {
  return <Etiqueta className={`v8-c ${className}`} {...resto}>{children}</Etiqueta>
}

// Encabezado de sección: kicker azul, titular (h2) y bajada. centro = centrado.
export function EncabezadoV8({ kicker, titulo, bajada, centro = false, nivel = 2, id, anchoBajada, aparece = true, className = '', children }) {
  const H = `h${nivel}`
  const marca = aparece ? { 'data-v8-aparece': '' } : {}
  return <header className={`v8-encabezado${centro ? ' is-centro' : ''} ${className}`}>
    {kicker && <p className="v8-kick" {...marca}>{kicker}</p>}
    <H id={id} className={nivel === 1 ? 'v8-h1' : 'v8-h2'} {...marca}><Lineas texto={titulo} /></H>
    {bajada && <p className="v8-lead" style={anchoBajada ? { maxWidth: anchoBajada } : undefined} {...marca}>{bajada}</p>}
    {children}
  </header>
}

// Hero de página: kicker, titular h1 (líneas), bajada, acciones y una foto a sangre que crece de
// 92 % a 100 % al bajar, con nota de vidrio opcional encima. Para una composición distinta pasa
// `medio` (reemplaza a la foto).
export function HeroV8({ kicker, kickerTinta = false, titulo, bajada, bajadaAngosta = false, primaria, secundaria, foto, nota, medio, className = '' }) {
  return <section className={`v8-hero ${className}`} aria-labelledby="v8-titulo" data-v8-3d="hero">
    <div className="v8-c">
      {kicker && <p className={`v8-kick${kickerTinta ? ' is-tinta' : ''}`} data-v8-entra="">{kicker}</p>}
      <h1 id="v8-titulo" className="v8-h1">{(Array.isArray(titulo) ? titulo : [titulo]).map((l, i, t) => <span className="v8-linea" data-v8-entra="" key={i}>{l}{i < t.length - 1 ? ' ' : ''}</span>)}</h1>
      {bajada && <p className={`v8-lead${bajadaAngosta ? ' is-angosta' : ''}`} data-v8-entra="">{bajada}</p>}
      {(primaria || secundaria) && <div className="v8-acciones" data-v8-entra="">
        {primaria && <BotonV8 to={primaria.to} tamano="lg">{primaria.texto}</BotonV8>}
        {secundaria && <EnlaceV8 to={secundaria.to}>{secundaria.texto}</EnlaceV8>}
      </div>}
    </div>
    {medio || (foto && <div className="v8-hero-medio" data-v8-crece="">
      <FotoIntegradaV8 prioridad fundido="y" sizes="100vw" {...foto} />
      {nota && <NotaVidrioV8 {...nota} />}
    </div>)}
  </section>
}

// Nota de vidrio que flota sobre una foto: título, texto y botón opcional.
export function NotaVidrioV8({ titulo, texto, accion, className = '', style }) {
  return <div className={`v8-vidrio v8-nota-vidrio ${className}`} style={style}>
    <div><b>{titulo}</b>{texto && <span className="v8-xs">{texto}</span>}</div>
    {accion && <BotonV8 to={accion.to} tamano="sm">{accion.texto}</BotonV8>}
  </div>
}

// Tarjeta de vidrio oscuro. caja = relleno de 28 px (20 en el teléfono). radio: 'hoja' (28) o
// 'tarjeta' (24). Entra con giro 3D y se inclina con el ratón (data-v8-3d="tarjeta"; pasa
// data-v8-3d="" para apagarlo, p. ej. en un panel grande).
export function TarjetaVidrioV8({ as: Etiqueta = 'div', caja = true, radio = 'hoja', className = '', children, ...resto }) {
  return <Etiqueta className={['v8-vidrio', caja && 'is-caja', radio === 'tarjeta' && 'is-tarjeta', className].filter(Boolean).join(' ')} data-v8-3d="tarjeta" {...resto}>{children}</Etiqueta>
}

// Chip de vidrio con icono, título y texto corto (se usa sobre las fotos).
export function ChipV8({ icono, titulo, texto, className = '', ...resto }) {
  return <div className={`v8-vidrio v8-chip ${className}`} {...resto}>
    {icono && <IconoV8 nombre={icono} />}
    <div><b>{titulo}</b>{texto && <p>{texto}</p>}</div>
  </div>
}

// Rasgos: rejilla de icono + título + texto (4 columnas; 2 en tableta; lista en el teléfono).
export function RasgosV8({ items, columnas = 4, className = '' }) {
  return <ul className={`v8-rasgos ${className}`} style={{ '--v8-cols': columnas }}>
    {items.map(r => <li key={r.titulo} data-v8-aparece="">
      {r.icono && <IconoV8 nombre={r.icono} />}
      <h3 className="v8-h4">{r.titulo}</h3>
      <p className="v8-sm v8-t2">{r.texto}</p>
    </li>)}
  </ul>
}

// Cifras grandes (sin contadores): entran girando como una paleta (data-v8-3d="cifra").
// cifras: [{ valor, etiqueta }].
export function BloqueCifrasV8({ cifras, columnas = 4, centro = false, className = '' }) {
  return <div className={`v8-cifras${centro ? ' is-centro' : ''} ${className}`} style={{ '--v8-cols': columnas }}>
    {cifras.map(c => <p className="v8-cifra" key={c.etiqueta} data-v8-3d="cifra">
      <strong>{c.valor}</strong><span>{c.etiqueta}</span>
    </p>)}
  </div>
}

// Escena: foto a un lado, fundida, con el texto encima del otro lado (escritorio). En el teléfono
// la foto va arriba (alta, recortada) y el texto debajo, subiendo un poco sobre ella.
// lado: 'derecha' (foto a la derecha, texto a la izquierda) | 'izquierda'.
// marco="redondo" (T-118): para fotos de escena (personas, oficinas, objetos con fondo). La foto
// va completa con esquinas de 28 px en su propia columna, sin tocar el texto (dos columnas dentro
// del contenedor; en el teléfono, foto arriba y texto debajo). `proporcion` = aspect-ratio de la
// foto en escritorio (4 / 3 por defecto); en el teléfono usa su recorte vertical o `altoMovil`.
export function EscenaV8({ foto, lado = 'derecha', ancho = '72%', anchoTexto = 520, posicionMovil, altoMovil, marco = 'fundido', proporcion = '4 / 3', children, className = '' }) {
  if (marco === 'redondo') {
    return <div className={`v8-escena is-redonda is-${lado} v8-c ${className}`}
      style={{ '--v8-escena-texto': `${anchoTexto}px`, '--v8-escena-proporcion': proporcion, ...(posicionMovil ? { '--v8-escena-pos': posicionMovil } : null), ...(altoMovil ? { '--v8-escena-alto-movil': `${altoMovil}px` } : null) }}>
      <div className="v8-escena-caja">{children}</div>
      <FotoIntegradaV8 marco="redondo" sizes="(min-width: 1240px) 600px, (min-width: 900px) 50vw, calc(100vw - 40px)" {...foto} className={`v8-escena-foto ${foto.className || ''}`} />
    </div>
  }
  return <div className={`v8-escena is-${lado} ${className}`}
    style={{ '--v8-escena-ancho': ancho, '--v8-escena-texto': `${anchoTexto}px`, ...(posicionMovil ? { '--v8-escena-pos': posicionMovil } : null), ...(altoMovil ? { '--v8-escena-alto-movil': `${altoMovil}px` } : null) }}>
    <FotoIntegradaV8 fundido={lado === 'derecha' ? 'l' : 'r'} sizes={`(min-width: 900px) ${ancho.endsWith('%') ? `${parseFloat(ancho)}vw` : ancho}, 100vw`} {...foto} className={`v8-escena-foto ${foto.className || ''}`} />
    <div className="v8-escena-texto v8-c"><div className="v8-escena-caja">{children}</div></div>
  </div>
}

// Carrusel horizontal con el dedo / la rueda, con puntos en una píldora de vidrio. Cada hijo es
// una diapositiva. El desplazamiento es nativo (scroll-snap). Si sus diapositivas son tarjetas
// (TarjetaCarruselV8), useMomentoV8 lo sincroniza con el scroll en escritorio (T-122): la sección
// queda fija, el scroll vertical lo mueve de derecha a izquierda y cada tarjeta aparece al entrar.
export function CarruselV8({ etiqueta, children, className = '' }) {
  const pista = useRef(null)
  const items = Children.toArray(children)
  const [activa, setActiva] = useState(0)
  useEffect(() => {
    const el = pista.current
    if (!el) return
    let cuadro = 0
    const medir = () => {
      cuadro = 0
      const hijos = el.children
      if (hijos.length < 2) return
      const paso = hijos[1].offsetLeft - hijos[0].offsetLeft
      const max = el.scrollWidth - el.clientWidth
      setActiva(el.scrollLeft >= max - 4 ? hijos.length - 1 : Math.round(el.scrollLeft / paso))
    }
    const alMover = () => { if (!cuadro) cuadro = requestAnimationFrame(medir) }
    el.addEventListener('scroll', alMover, { passive: true })
    return () => { el.removeEventListener('scroll', alMover); cancelAnimationFrame(cuadro) }
  }, [])
  const ir = i => {
    const el = pista.current
    const hijo = el?.children[i]
    if (!hijo) return
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    el.scrollTo({ left: hijo.offsetLeft - el.children[0].offsetLeft, behavior: reduce ? 'auto' : 'smooth' })
  }
  return <div className={`v8-carrusel ${className}`}>
    <ul ref={pista} className="v8-carrusel-pista" tabIndex={0} role="region" aria-label={etiqueta}>
      {items.map((hijo, i) => <li key={i} aria-label={`${i + 1} de ${items.length}`}>{hijo}</li>)}
    </ul>
    <div className="v8-vidrio v8-puntos">
      {items.map((_, i) => <button type="button" key={i} aria-label={`Ir a la diapositiva ${i + 1}`} aria-current={i === activa ? 'true' : undefined} onClick={() => ir(i)} />)}
    </div>
    {/* Barra de avance del recorrido con el scroll (T-122): solo se ve en escritorio cuando
        useMomentoV8 pone el carrusel en data-v8-modo="recorrido"; ahí reemplaza a los puntos. */}
    <div className="v8-vidrio v8-carrusel-barra" aria-hidden="true"><span /></div>
  </div>
}

// Tarjeta del carrusel de funciones: título y texto arriba, foto o teléfono abajo.
// foto: props de FotoIntegradaV8; o pasa `medio` (p. ej. <CapturaFlotanteV8 ancho={220} />).
// La foto llena el pie de la tarjeta completa, sin fundido (marco="plano"): la tarjeta la recorta
// con su propio radio.
// medioMovil (T-118): pieza solo para el teléfono (p. ej. la captura plana de la app en lugar de la
// foto de un monitor, que a 390 px se corta).
export function TarjetaCarruselV8({ titulo, texto, foto, medio, medioMovil }) {
  return <article className="v8-vidrio v8-tarjeta-medio" data-v8-3d="tarjeta">
    <div className="v8-tarjeta-medio-texto"><h3 className="v8-h3">{titulo}</h3>{texto && <p>{texto}</p>}</div>
    <div className={`v8-tarjeta-medio-foto${medio ? ' is-telefono' : ''}${medioMovil ? ' is-sin-movil' : ''}`}>
      {medio || <FotoIntegradaV8 marco="plano" sizes="(max-width: 599px) 78vw, 400px" {...foto} />}
    </div>
    {medioMovil && <div className="v8-tarjeta-medio-foto is-telefono is-solo-movil">{medioMovil}</div>}
  </article>
}

// Lista de pasos numerados (01, 02…). activo = índice resaltado (los demás tenues); sin `activo`
// todos se ven igual. alCambiar(i) los vuelve botones. variante 'linea' = fila horizontal con la
// raya azul en el primero (Contacto: «Qué pasa después de solicitarla»).
export function ListaPasosV8({ pasos, activo, alCambiar, variante, numerar = true, className = '' }) {
  return <ol className={`v8-pasos${variante === 'linea' ? ' is-linea' : ''} ${className}`} style={variante === 'linea' ? { '--v8-cols': pasos.length } : undefined}>
    {pasos.map((p, i) => {
      const contenido = <>
        {numerar && variante !== 'linea' && <span className="v8-paso-n">{String(i + 1).padStart(2, '0')}</span>}
        <div>
          {variante === 'linea' ? <p className="v8-h4">{numerar ? `${i + 1}. ` : ''}{p.titulo}</p> : <h3 className="v8-h3">{p.titulo}</h3>}
          {p.texto && <p className={variante === 'linea' ? 'v8-sm v8-t2' : undefined}>{p.texto}</p>}
        </div>
      </>
      const tenue = activo !== undefined && activo !== i
      return <li key={p.titulo} className={tenue ? 'is-tenue' : undefined}>
        {alCambiar
          ? <button type="button" className="v8-paso" aria-pressed={activo === i} onClick={() => alCambiar(i)}>{contenido}</button>
          : <div className={variante === 'linea' ? undefined : 'v8-paso'}>{contenido}</div>}
      </li>
    })}
  </ol>
}

// Pestañas tipo chip (Mantenimiento · Reportes · Alertas). Controladas: activa + alCambiar.
export function PestanasV8({ opciones, activa, alCambiar, etiqueta, className = '' }) {
  return <div className={`v8-pestanas ${className}`} role="tablist" aria-label={etiqueta}>
    {opciones.map((o, i) => <button key={o} type="button" role="tab" className="v8-pestana" aria-selected={i === activa} onClick={() => alCambiar?.(i)}>{o}</button>)}
  </div>
}

// Preguntas en acordeón de vidrio. items: [{ q, a }] (mismo formato que src/content/pages.js).
// abierta = índice abierto al cargar (-1 = ninguna). Abre y cierra en 0,3 s.
export function PreguntasV8({ items, abierta = 0, className = '' }) {
  const [abiertas, setAbiertas] = useState(() => new Set(abierta >= 0 ? [abierta] : []))
  const base = useId()
  const alternar = i => setAbiertas(prev => { const s = new Set(prev); s.has(i) ? s.delete(i) : s.add(i); return s })
  return <div className={`v8-preguntas ${className}`}>
    {items.map((f, i) => {
      const abiertaI = abiertas.has(i)
      return <div className="v8-vidrio v8-pregunta" key={f.q}>
        <h3><button type="button" className="v8-pregunta-boton" aria-expanded={abiertaI} aria-controls={`${base}-${i}`} id={`${base}-b${i}`} onClick={() => alternar(i)}>
          <span>{f.q}</span><IconoV8 nombre="plus" />
        </button></h3>
        <div id={`${base}-${i}`} role="region" aria-labelledby={`${base}-b${i}`} className={`v8-pregunta-cuerpo${abiertaI ? ' is-abierta' : ''}`} inert={abiertaI ? undefined : ''}>
          <div><p>{f.a}</p></div>
        </div>
      </div>
    })}
  </div>
}

// Llamada final: «Hablemos de tu operación.» con la foto de la furgoneta a un lado. Desde T-118
// la furgoneta va completa con esquinas redondeadas (marco="redondo"); marco="fundido" vuelve a la
// foto fundida a sangre.
export function CtaFinalV8({
  titulo = 'Hablemos de tu operación.',
  texto = 'Cuéntanos cómo trabajas y coordinamos una demostración sin costo.',
  nota = '48 h: tiempo promedio para agendar la demostración.',
  foto = { nombre: 'furgoneta-fom', alt: 'Furgoneta FOM con el lema Operación segura, mayor disponibilidad.', posicion: undefined },
  lado = 'izquierda', ancho = '64%', marco = 'redondo',
}) {
  return <SeccionV8 className="v8-cta-final" style={marco === 'fundido' ? { paddingBottom: 0 } : undefined} aria-labelledby="v8-cta-titulo">
    <EscenaV8 foto={foto} lado={lado} ancho={ancho} anchoTexto={500} posicionMovil="80% 50%" altoMovil={380} marco={marco} proporcion="1 / 1">
      <h2 id="v8-cta-titulo" className="v8-h2" data-v8-aparece="">{titulo}</h2>
      <p className="v8-lead" style={{ marginTop: 16 }} data-v8-aparece="">{texto}</p>
      <div className="v8-cta-botones" data-v8-aparece="">
        <BotonV8 to={rutaV8('contacto')} tamano="lg">Solicitar demostración</BotonV8>
        <BotonV8 to={`mailto:${CORREO_FOM}`} tamano="lg" fantasma>{CORREO_FOM}</BotonV8>
      </div>
      {nota && <p className="v8-sm v8-t2" style={{ marginTop: 22 }}>{nota}</p>}
    </EscenaV8>
  </SeccionV8>
}
