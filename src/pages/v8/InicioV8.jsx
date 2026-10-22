// Inicio v8 (T-99, fase 1): la página de Inicio rediseñada «estilo Apple + vidrio», montada aparte
// en /nuevo para que Marco la apruebe sin tocar la actual. Galería blanca, fotos grandes con
// esquinas de 28 px, bandas #f5f5f7, vidrio translúcido en lo que flota y azul FOM en los botones.
// Textos: los de hoy (pages/v7/Inicio, HomeStories, Beneficios y src/content/pages.js).
// Animación: GSAP + ScrollTrigger, solo transform y opacidad; con «reducir movimiento» todo se ve
// quieto y completo (las animaciones viven dentro de gsap.matchMedia y se deshacen solas).
import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useGSAP } from '@gsap/react'
import { PAGES } from '../../content/pages'
import NavV8, { DEMO_V8 } from '../../components/v8/NavV8'
import { FormularioV8, PieV8 } from '../../components/v8/PieV8'
import { IconoV8, TelefonoV8, PantallaV8, Palabras } from '../../components/v8/MarcaV8'
import '../../components/v8/v8-base.css'
import './inicio-v8.css'

import fotoHero from '../../assets/marketing/home-v7/01.webp'
import fotoCarretera from '../../assets/marketing/v7/07-quienes-somos/03.webp'
import fotoOficina from '../../assets/marketing/v7/02-plataforma/01.webp'
import fotoMano from '../../assets/marketing/home-v7/02.webp'
import fotoGps from '../../assets/marketing/v7/02-plataforma/04.webp'
import fotoTelematica from '../../assets/marketing/v7/04-funciones/telematica.webp'
import fotoInspeccion from '../../assets/marketing/v7/08-que-ofrecemos/03.webp'
import fotoReportes from '../../assets/marketing/v7/04-funciones/05.webp'
import fotoAlertas from '../../assets/marketing/v7/04-funciones/06.webp'
import fotoEventos from '../../assets/marketing/v7/05-seguridad/01.webp'
import fotoConductor from '../../assets/marketing/v7/06-areas/01.webp'
import fotoMapa from '../../assets/marketing/home-v7/08.webp'
import fotoInstalacion from '../../assets/marketing/v7/11-contacto/05.webp'
import fotoChequeo from '../../assets/marketing/v7/09-beneficios/03.webp'
import fotoFalla from '../../assets/marketing/v7/04-funciones/03.webp'
import fotoTecnico from '../../assets/marketing/v7/04-funciones/04.webp'
import fotoHistorial from '../../assets/marketing/v7/09-beneficios/07.webp'
import fotoAerea from '../../assets/marketing/v7/06-areas/06.webp'
import fotoCamioneta from '../../assets/marketing/v7/09-beneficios/01.webp'
import fotoFurgoneta from '../../assets/marketing/v7/11-contacto/06.webp'
import capturaPanel from '../../assets/marketing/real/panel-resumen.webp'
import capturaInicio from '../../assets/marketing/real/app-inicio.webp'
import capturaPerfil from '../../assets/marketing/real/app-perfil.webp'
import capturaMantenimiento from '../../assets/marketing/real/app-mantenimiento.webp'

gsap.registerPlugin(ScrollTrigger, useGSAP)

const P = PAGES
const sec = (pagina, titulo) => P[pagina].sections.find(s => s.heading === titulo)
const bala = (seccion, etiqueta) => seccion.bullets.find(b => b.label === etiqueta)

const S_DUO = sec('plataforma', 'Panel en la oficina, app en la calle')
const S_MAPA = sec('plataforma', 'Mapa general en vivo')
const S_GPS = sec('funciones', 'Rastreo GPS en tiempo real')
const S_EVENTOS = sec('seguridad', 'Detección de eventos de conducción')
const S_PUNTAJE = sec('seguridad', 'Puntaje de manejo seguro')
const S_SOS = sec('seguridad', 'Botón SOS, emergencias y privacidad')
const S_AREAS = sec('areas', 'Agrupa la flota como opera tu empresa')
const S_GEOCERCAS = sec('areas', 'Geocercas y zonas con alertas de entrada y salida')
const S_ACCESO = sec('areas', 'Control de acceso por área')
const S_INSTALACION = sec('contacto', 'Instalación e implementación')
const S_PASOS = sec('contacto', 'Qué pasa después de solicitarla')

const LOCAL = [['plataforma', 'Plataforma'], ['funciones', 'Funciones'], ['seguridad', 'Seguridad'], ['mapa', 'Mapa y GPS'], ['mantenimiento', 'Mantenimiento'], ['areas', 'Áreas'], ['beneficios', 'Beneficios'], ['preguntas', 'Preguntas']]

const DESTACADOS = [
  { titulo: 'Rastreo GPS en tiempo real', texto: 'Posición cada 10 segundos con el vehículo en movimiento, con rumbo y velocidad.', foto: fotoGps, alt: 'Centro de control de FOM en una laptop, con las unidades en el mapa.', to: '/funciones' },
  { titulo: 'Telemática y diagnóstico', texto: 'Batería, motor, kilometraje y códigos de falla de cada unidad, registrados solos.', foto: fotoTelematica, alt: 'Camioneta FOM con el motor y el equipo de telemática a la vista.', to: '/funciones' },
  { titulo: 'Mantenimiento preventivo', texto: 'Avisos por kilómetro o por fecha y órdenes de trabajo con su historial.', telefono: capturaMantenimiento, alt: 'Pantalla real de mantenimiento en la app FOM, con avisos y órdenes de trabajo. Datos de demostración.', to: '/funciones' },
  { titulo: 'Inspección en campo', texto: 'El conductor revisa su unidad con el checklist de la app antes de salir.', foto: fotoInspeccion, alt: 'Conductor de FOM con la inspección de la unidad abierta en su teléfono.', to: '/app' },
  { titulo: 'Reportes y analítica', texto: 'Costo por kilómetro, uso y disponibilidad. Descarga en PDF o Excel.', foto: fotoReportes, alt: 'Reportes de FOM abiertos en una laptop en el patio de la flota.', to: '/funciones' },
  { titulo: 'Alertas operativas', texto: 'Exceso de velocidad, motor encendido detenido, desconexión del equipo y mantenimiento vencido.', foto: fotoAlertas, alt: 'Alertas de FOM en una laptop, con los avisos de la operación.', to: '/funciones' },
  { titulo: 'Eventos y SOS', texto: 'Las alertas del conductor llegan al panel del supervisor con la ubicación del vehículo.', foto: fotoEventos, alt: 'Pantalla de Eventos y SOS del panel FOM frente a la carretera.', to: '/seguridad' },
]

const PASOS_MANT = [
  { titulo: 'Inspección', texto: 'Revisión en campo antes de salir.', foto: fotoChequeo, alt: 'Conductor de FOM revisando la inspección de la unidad en su teléfono.' },
  { titulo: 'Reporte de falla', texto: 'El conductor registra el hallazgo desde la app.', foto: fotoFalla, alt: 'Mano con el teléfono junto a la rueda de un camión FOM, con la app abierta.' },
  { titulo: 'Mantenimiento', texto: 'La oficina consulta y da seguimiento al servicio.', foto: fotoTecnico, alt: 'Técnico de FOM revisando la rueda de un camión con el teléfono en la mano.' },
  { titulo: 'Historial y reportes', texto: 'La información queda disponible para consulta.', foto: fotoHistorial, alt: 'Reportes de FOM en un monitor de la oficina.' },
]

const BENEFICIOS = [
  ['Visibilidad de la operación', 'Consulta ubicación, estado y responsable de cada unidad desde una misma vista.', 'pin'],
  ['Cuidado de cada vehículo', 'Reúne inspecciones, hallazgos y órdenes de mantenimiento para dar seguimiento a lo que necesita cada unidad.', 'wrench'],
  ['Comunicación desde el campo', 'El conductor registra información desde su teléfono y la oficina la consulta en la plataforma.', 'phone'],
  ['Atención a las alertas', 'Encuentra los avisos que requieren revisión y consulta el contexto de los eventos.', 'bell'],
  ['Organización por áreas', 'Agrupa unidades por zona, sede o contrato para consultar la parte de la flota que te corresponde.', 'zone'],
  ['Información para decidir', 'Consulta reportes e historial para revisar la operación y planificar los siguientes pasos.', 'chart'],
]

const CIFRAS_BENEFICIOS = [P.plataforma.sections[0].stat, P.plataforma.sections[4].stat, P.plataforma.sections[5].stat, P.contacto.sections[0].stat]
const CIFRAS_MAPA = [S_GPS.stat, S_MAPA.stat, sec('plataforma', 'Captura y resguardo de datos').stat]
const CIFRAS_SEGURIDAD = [S_SOS.stat, S_EVENTOS.stat, S_PUNTAJE.stat]

const PREGUNTAS = [...P.plataforma.faqs, P.funciones.faqs[0], P.seguridad.faqs[2]]

// «< 5 seg» → ['< ', 5, ' seg']: solo la parte numérica cuenta al aparecer.
function partir(valor) {
  const m = /^(\D*?)(\d+(?:\.\d+)?)(.*)$/.exec(valor)
  return m ? [m[1], Number(m[2]), m[3]] : [valor, null, '']
}

function Cifra({ stat, oscuro = false }) {
  const [antes, numero, despues] = partir(stat.value)
  return <div className={`v8-stat${oscuro ? ' is-dark' : ''}`} data-v8-reveal>
    <strong>{antes}{numero === null ? null : <span className="v8-count" data-to={numero}>{numero.toLocaleString('es-VE')}</span>}{despues}</strong>
    <span>{stat.label}</span>
  </div>
}

function Encabezado({ kicker, lineas, texto, id, centro = false, children }) {
  return <header className={`v8-head${centro ? ' is-center' : ''}`}>
    {kicker && <p className="v8-kicker" data-v8-reveal>{kicker}</p>}
    <h2 id={id} className="v8-h2" data-v8-words><Palabras lineas={lineas} /></h2>
    {texto && <p className="v8-lead" data-v8-reveal>{texto}</p>}
    {children}
  </header>
}

function Foto({ src, alt, className = '', eager = false, sizes }) {
  return <img className={className} src={src} alt={alt} width="1672" height="941" loading={eager ? 'eager' : 'lazy'} fetchpriority={eager ? 'high' : undefined} decoding="async" sizes={sizes} />
}

const DEMO = <small className="v8-demo-note">Capturas reales · Datos de demostración</small>

export default function InicioV8() {
  const raiz = useRef(null)
  const pista = useRef(null)
  const visor = useRef(null)
  const carrusel = useRef(null) // ScrollTrigger del carrusel fijado (solo escritorio con movimiento)
  const [diapositiva, setDiapositiva] = useState(0)
  const [local, setLocal] = useState(null)

  useEffect(() => {
    document.title = 'Tu flota conectada — FOM'
    // Inter (sustituto de SF Pro que pide la guía de estilo) solo para esta versión.
    if (!document.getElementById('v8-inter')) {
      const link = document.createElement('link')
      link.id = 'v8-inter'
      link.rel = 'stylesheet'
      link.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap'
      document.head.appendChild(link)
    }
  }, [])

  // Carrusel sin fijar (teléfono o «reducir movimiento»): la diapositiva activa sale del
  // desplazamiento horizontal del visor.
  useEffect(() => {
    const el = visor.current
    if (!el) return
    let cuadro = 0
    const medir = () => {
      cuadro = 0
      const tarjetas = el.querySelectorAll('.v8-hl-card')
      if (!tarjetas.length || carrusel.current) return
      const paso = tarjetas[1] ? tarjetas[1].offsetLeft - tarjetas[0].offsetLeft : 1
      const max = el.scrollWidth - el.clientWidth
      setDiapositiva(el.scrollLeft >= max - 4 ? tarjetas.length - 1 : Math.round(el.scrollLeft / paso))
    }
    const alDesplazar = () => { if (!cuadro) cuadro = requestAnimationFrame(medir) }
    el.addEventListener('scroll', alDesplazar, { passive: true })
    return () => { el.removeEventListener('scroll', alDesplazar); cancelAnimationFrame(cuadro) }
  }, [])

  const irA = i => {
    const n = DESTACADOS.length
    const i2 = Math.max(0, Math.min(n - 1, i))
    const st = carrusel.current
    if (st) {
      window.scrollTo({ top: st.start + (st.end - st.start) * (i2 / (n - 1)), behavior: 'smooth' })
      return
    }
    const el = visor.current
    const tarjeta = el?.querySelectorAll('.v8-hl-card')[i2]
    if (tarjeta) el.scrollTo({ left: tarjeta.offsetLeft - el.querySelector('.v8-hl-card').offsetLeft, behavior: 'smooth' })
  }

  useGSAP(() => {
    const q = gsap.utils.selector(raiz)

    // Navegación local: marca la sección visible (también sin animación).
    LOCAL.forEach(([id]) => {
      const el = document.getElementById(id)
      if (el) ScrollTrigger.create({ trigger: el, start: 'top 45%', end: 'bottom 45%', onToggle: self => { if (self.isActive) setLocal(id) } })
    })
    ScrollTrigger.create({ trigger: q('.v8-hero')[0], start: 'top top', end: 'bottom 45%', onToggle: self => { if (self.isActive) setLocal(null) } })

    const mm = gsap.matchMedia()
    mm.add({ movimiento: '(prefers-reduced-motion: no-preference)', escritorio: '(min-width: 1024px)' }, ctx => {
      const { movimiento, escritorio } = ctx.conditions
      if (!movimiento) return
      raiz.current.classList.add('v8-motion')

      // 1 · Hero: entrada escalonada y foto que crece al bajar.
      const hero = gsap.timeline({ defaults: { ease: 'power3.out' } })
      hero.from(q('.v8-hero .v8-kicker'), { y: 16, opacity: 0, duration: 0.7 })
        .from(q('.v8-hero h1 .v8-wi'), { yPercent: 110, duration: 1, stagger: 0.06 }, '-=0.45')
        .from(q('.v8-hero-sub, .v8-hero .v8-ctas'), { y: 20, opacity: 0, duration: 0.8, stagger: 0.1 }, '-=0.6')
        .from(q('.v8-hero-media'), { y: 70, opacity: 0, duration: 1.2 }, '-=0.7')
        .from(q('.v8-callout'), { y: 24, opacity: 0, duration: 0.8 }, '-=0.5')
      gsap.fromTo(q('.v8-hero-frame'), { scale: 0.9 }, { scale: 1, ease: 'none', scrollTrigger: { trigger: q('.v8-hero-media')[0], start: 'top bottom', end: 'top 12%', scrub: true } })
      gsap.fromTo(q('.v8-hero-frame img'), { yPercent: 0, scale: 1.08 }, { yPercent: 6, scale: 1.08, ease: 'none', scrollTrigger: { trigger: q('.v8-hero-media')[0], start: 'top top', end: 'bottom top', scrub: true } })

      // 2 · Titulares por palabra y bloques que suben al entrar.
      q('[data-v8-words]').forEach(h => {
        gsap.from(h.querySelectorAll('.v8-wi'), { yPercent: 110, duration: 0.9, ease: 'power3.out', stagger: 0.05, scrollTrigger: { trigger: h, start: 'top 85%', once: true } })
      })
      gsap.set(q('[data-v8-reveal]'), { opacity: 0, y: 36 })
      ScrollTrigger.batch(q('[data-v8-reveal]'), {
        start: 'top 88%', once: true,
        onEnter: lote => gsap.to(lote, { y: 0, opacity: 1, duration: 0.9, ease: 'power3.out', stagger: 0.08, overwrite: true }),
      })

      // 3 · Frase que se ilumina palabra por palabra con el scroll.
      gsap.fromTo(q('.v8-statement .v8-sw'), { opacity: 0.16 }, { opacity: 1, ease: 'none', stagger: 0.1, scrollTrigger: { trigger: q('.v8-statement-text')[0], start: 'top 80%', end: 'bottom 40%', scrub: true } })
      gsap.fromTo(q('.v8-wide img'), { yPercent: -10, scale: 1.12 }, { yPercent: 10, scale: 1.12, ease: 'none', scrollTrigger: { trigger: q('.v8-wide')[0], start: 'top bottom', end: 'bottom top', scrub: true } })

      // 4 · Contadores.
      q('.v8-count').forEach(el => {
        const fin = Number(el.dataset.to)
        const obj = { v: 0 }
        gsap.to(obj, { v: fin, duration: 1.6, ease: 'power2.out', scrollTrigger: { trigger: el, start: 'top 90%', once: true }, onUpdate: () => { el.textContent = Math.round(obj.v).toLocaleString('es-VE') } })
        el.textContent = '0'
      })

      // 5 · Parallax suave en fotos de tarjeta.
      q('[data-v8-parallax]').forEach(img => {
        gsap.fromTo(img, { yPercent: -6, scale: 1.12 }, { yPercent: 6, scale: 1.12, ease: 'none', scrollTrigger: { trigger: img.parentElement, start: 'top bottom', end: 'bottom top', scrub: true } })
      })

      // 6 · Seguridad: el teléfono sube más rápido que la foto.
      gsap.fromTo(q('.v8-night-phone'), { yPercent: 18 }, { yPercent: -8, ease: 'none', scrollTrigger: { trigger: q('.v8-night-media')[0], start: 'top bottom', end: 'bottom top', scrub: true } })
      gsap.from(q('.v8-sos-chip'), { x: -30, opacity: 0, duration: 0.9, ease: 'power3.out', scrollTrigger: { trigger: q('.v8-night-media')[0], start: 'top 60%', once: true } })

      // 7 · Mantenimiento: el paso activo sigue a la foto que está en el centro.
      q('.v8-steps-media figure').forEach((fig, i) => {
        ScrollTrigger.create({ trigger: fig, start: 'top 55%', end: 'bottom 55%', toggleClass: { targets: q('.v8-steps-list li')[i], className: 'is-active' } })
      })

      // 8 · Áreas y beneficios: vidrio que entra escalonado.
      gsap.from(q('.v8-areas-chip'), { y: 30, opacity: 0, duration: 0.8, ease: 'power3.out', stagger: 0.12, scrollTrigger: { trigger: q('.v8-areas-media')[0], start: 'top 65%', once: true } })
      gsap.fromTo(q('.v8-benefits-bg img'), { scale: 1.18 }, { scale: 1, ease: 'none', scrollTrigger: { trigger: q('.v8-benefits-stage')[0], start: 'top bottom', end: 'bottom top', scrub: true } })
      gsap.from(q('.v8-glass-card'), { y: 50, opacity: 0, duration: 0.9, ease: 'power3.out', stagger: 0.08, scrollTrigger: { trigger: q('.v8-benefits-grid')[0], start: 'top 80%', once: true } })

      if (escritorio) {
        // Plataforma: escena fijada, el panel se aparta y entra el teléfono.
        const duo = gsap.timeline({ scrollTrigger: { trigger: q('.v8-duo-stage')[0], start: 'center center', end: '+=110%', pin: true, scrub: 0.6, refreshPriority: 1 } })
        duo.fromTo(q('.v8-duo-screen'), { xPercent: 9, scale: 1.04 }, { xPercent: -4, scale: 0.94, ease: 'none' }, 0)
          .fromTo(q('.v8-duo-phone'), { yPercent: 70, opacity: 0 }, { yPercent: 0, opacity: 1, ease: 'none' }, 0.1)
          .fromTo(q('.v8-duo-cap-a'), { opacity: 1 }, { opacity: 0.35, ease: 'none' }, 0.35)
          .fromTo(q('.v8-duo-cap-b'), { opacity: 0.35 }, { opacity: 1, ease: 'none' }, 0.35)

        // Funciones destacadas: el carrusel avanza en horizontal con el scroll.
        const viewport = visor.current
        const track = pista.current
        gsap.set(viewport, { overflow: 'visible' })
        const distancia = () => {
          const cs = getComputedStyle(viewport)
          return Math.max(0, track.scrollWidth + parseFloat(cs.paddingLeft) + parseFloat(cs.paddingRight) - viewport.clientWidth)
        }
        const tween = gsap.to(track, {
          x: () => -distancia(), ease: 'none',
          scrollTrigger: {
            trigger: q('.v8-highlights')[0], start: 'top top', end: () => '+=' + distancia(), pin: true, scrub: 0.5, invalidateOnRefresh: true, refreshPriority: 1,
            onUpdate: self => setDiapositiva(Math.round(self.progress * (DESTACADOS.length - 1))),
          },
        })
        carrusel.current = tween.scrollTrigger

        // Mapa: la foto se abre de tarjeta a pantalla completa.
        const mapa = gsap.timeline({ scrollTrigger: { trigger: q('.v8-map-stage')[0], start: 'top top', end: '+=100%', pin: true, scrub: 0.6, refreshPriority: 1 } })
        mapa.fromTo(q('.v8-map-frame'), { scale: 0.64 }, { scale: 1, ease: 'none' }, 0)
          .fromTo(q('.v8-map-chip'), { y: 40, opacity: 0 }, { y: 0, opacity: 1, stagger: 0.08, ease: 'none' }, 0.55)

        return () => { carrusel.current = null; raiz.current?.classList.remove('v8-motion') }
      }
      gsap.from(q('.v8-duo-phone'), { yPercent: 30, opacity: 0, duration: 1, ease: 'power3.out', scrollTrigger: { trigger: q('.v8-duo-stage')[0], start: 'top 70%', once: true } })
      gsap.from(q('.v8-map-chip'), { y: 24, opacity: 0, duration: 0.8, stagger: 0.1, ease: 'power3.out', scrollTrigger: { trigger: q('.v8-map-frame')[0], start: 'top 70%', once: true } })
      return () => { raiz.current?.classList.remove('v8-motion') }
    })
    // La letra Inter llega después del primer pintado y cambia alturas: recalcular los tramos
    // cuando cargue y cada vez que la página cambie de alto (con espera, para no encadenar).
    let espera = 0
    let alto = 0
    const recalcular = () => { clearTimeout(espera); espera = setTimeout(() => ScrollTrigger.refresh(), 150) }
    document.fonts?.ready.then(recalcular)
    window.addEventListener('load', recalcular)
    const observador = new ResizeObserver(([e]) => {
      const nuevo = Math.round(e.contentRect.height)
      if (Math.abs(nuevo - alto) > 2) { alto = nuevo; recalcular() }
    })
    observador.observe(q('.v8-page')[0])
    return () => { clearTimeout(espera); observador.disconnect(); window.removeEventListener('load', recalcular) }
  }, { scope: raiz })

  return <div className="v8-site" ref={raiz}>
    <NavV8 />
    <main id="contenido" className="v8-page">

      {/* Hero */}
      <section className="v8-hero" aria-labelledby="v8-title">
        <div className="v8-hero-copy">
          <p className="v8-kicker">Flotas que mantienen el mundo en movimiento</p>
          <h1 id="v8-title" className="v8-display"><Palabras lineas={['Tu flota conectada.', 'Tu operación, bajo control.']} /></h1>
          <p className="v8-hero-sub">La oficina y la carretera, en una misma plataforma.</p>
          <div className="v8-ctas">
            <Link className="v8-pill v8-pill-lg" to={DEMO_V8}>Solicitar demostración</Link>
            <a className="v8-link" href="#plataforma">Ver cómo funciona <IconoV8 nombre="chevron" /></a>
          </div>
        </div>
        <figure className="v8-hero-media">
          <div className="v8-hero-frame">
            <Foto src={fotoHero} eager alt="Panel FOM con el resumen de la flota en un monitor, frente a la carretera al atardecer. Datos de demostración." />
          </div>
          <div className="v8-callout v8-glass">
            <div><strong>Panel web y app del conductor</strong><span>Sobre los mismos datos · Datos de demostración</span></div>
            <Link className="v8-pill v8-pill-sm" to="/plataforma">Conocer la plataforma</Link>
          </div>
        </figure>
      </section>

      {/* Navegación local */}
      <nav className="v8-local" aria-label="Secciones de Inicio">
        <div className="v8-local-inner">
          <a className="v8-local-title" href="#contenido">Inicio</a>
          <ul>{LOCAL.map(([id, nombre]) => <li key={id}><a href={`#${id}`} className={local === id ? 'is-active' : undefined} aria-current={local === id ? 'location' : undefined}>{nombre}</a></li>)}</ul>
          <Link className="v8-pill v8-pill-sm" to={DEMO_V8}>Solicitar demostración</Link>
        </div>
      </nav>

      {/* Frase */}
      <section className="v8-statement" aria-label="Qué es FOM">
        <p className="v8-statement-text">
          {'FOM reúne el trabajo de la oficina y del equipo en campo en una sola plataforma para flotas. Seguimiento, cuidado del vehículo y comunicación forman parte de una misma operación.'.split(' ').map((p, i) => <span className="v8-sw" key={i}>{p} </span>)}
        </p>
        <figure className="v8-wide">
          <Foto src={fotoCarretera} alt="Camión FOM en la autopista visto desde arriba." />
        </figure>
      </section>

      {/* Plataforma web + app */}
      <section id="plataforma" className="v8-section v8-duo" aria-labelledby="v8-duo-title">
        <Encabezado id="v8-duo-title" kicker="Plataforma web y app" lineas={['Panel en la oficina.', 'App en la calle.']} texto={S_DUO.body} centro />
        <div className="v8-duo-stage">
          <div className="v8-duo-scene">
            <PantallaV8 className="v8-duo-screen" src={capturaPanel} alt="Resumen real del panel FOM: flota, mapa, órdenes y alertas. Datos de demostración." />
            <TelefonoV8 className="v8-duo-phone" src={capturaInicio} alt="Inicio real de la app FOM del conductor, con el estado de su unidad. Datos de demostración." />
          </div>
          <div className="v8-duo-caps">
            <p className="v8-duo-cap-a"><IconoV8 nombre="monitor" /><span><b>En la oficina.</b> Panel web del supervisor.</span></p>
            <p className="v8-duo-cap-b"><IconoV8 nombre="phone" /><span><b>En la carretera.</b> App del conductor.</span></p>
          </div>
        </div>
        <ul className="v8-facts">
          {[['monitor', 'Panel del supervisor'], ['phone', 'App del conductor'], ['database', 'Una sola base de datos'], ['cloud', 'Aguanta sin señal']].map(([icono, etiqueta]) => <li key={etiqueta} data-v8-reveal>
            <IconoV8 nombre={icono} /><h3>{etiqueta}</h3><p>{bala(S_DUO, etiqueta).text}</p>
          </li>)}
        </ul>
        <div className="v8-pair">
          <figure className="v8-card-photo" data-v8-reveal>
            <div className="v8-crop"><Foto src={fotoOficina} alt="Supervisor de FOM frente al panel web en la oficina." /></div>
            <figcaption><b>Todo ese control.</b> La vista completa de tu flota desde la computadora.</figcaption>
          </figure>
          <figure className="v8-card-photo" data-v8-reveal>
            <div className="v8-crop"><Foto src={fotoMano} alt="Mano sosteniendo un teléfono con la app FOM abierta." /></div>
            <figcaption><b>Ahora en tu mano.</b> La unidad que acompaña a tu conductor.</figcaption>
          </figure>
        </div>
        {DEMO}
      </section>

      {/* Funciones destacadas */}
      <section id="funciones" className="v8-band v8-highlights" aria-labelledby="v8-hl-title">
        <div className="v8-hl-head">
          <h2 id="v8-hl-title" className="v8-h2" data-v8-words><Palabras lineas={['Conoce las funciones.']} /></h2>
          <Link className="v8-link" to="/funciones">Ver todas las funciones <IconoV8 nombre="chevron" /></Link>
        </div>
        <div className="v8-hl-viewport" ref={visor} tabIndex={0} aria-label="Funciones destacadas, desliza para ver más" role="region">
          <ul className="v8-hl-track" ref={pista}>
            {DESTACADOS.map(d => <li key={d.titulo} className={`v8-hl-card${d.telefono ? ' has-phone' : ''}`}>
              <div className="v8-hl-copy">
                <h3>{d.titulo}</h3>
                <p>{d.texto}</p>
                <Link className="v8-link" to={d.to} aria-label={`Más sobre ${d.titulo}`}>Más información <IconoV8 nombre="chevron" /></Link>
              </div>
              <div className="v8-hl-media">
                {d.telefono ? <TelefonoV8 src={d.telefono} alt={d.alt} /> : <Foto src={d.foto} alt={d.alt} />}
              </div>
            </li>)}
          </ul>
        </div>
        <div className="v8-hl-controls v8-glass-soft">
          <button type="button" aria-label="Función anterior" onClick={() => irA(diapositiva - 1)} disabled={diapositiva === 0}><IconoV8 nombre="chevron" className="is-back" /></button>
          <div className="v8-dots">{DESTACADOS.map((d, i) => <button type="button" key={d.titulo} className={i === diapositiva ? 'is-on' : undefined} aria-label={`Ir a ${d.titulo}`} aria-current={i === diapositiva ? 'true' : undefined} onClick={() => irA(i)} />)}</div>
          <button type="button" aria-label="Función siguiente" onClick={() => irA(diapositiva + 1)} disabled={diapositiva === DESTACADOS.length - 1}><IconoV8 nombre="chevron" /></button>
        </div>
      </section>

      {/* Seguridad y SOS */}
      <section id="seguridad" className="v8-night" aria-labelledby="v8-night-title">
        <div className="v8-night-grid">
          <div className="v8-night-copy">
            <p className="v8-kicker" data-v8-reveal>Seguridad del conductor</p>
            <h2 id="v8-night-title" className="v8-h2" data-v8-words><Palabras lineas={['Conducir mejor empieza', 'por entender cada viaje.']} /></h2>
            <p className="v8-lead" data-v8-reveal>Un índice claro para acompañar al conductor y atender lo que necesita mejorar. Y un botón SOS que avisa al supervisor con la ubicación del vehículo.</p>
            <ul className="v8-night-list" data-v8-reveal>
              {['Frenada brusca', 'Aceleración fuerte', 'Exceso de velocidad'].map(e => <li key={e}><IconoV8 nombre="gauge" /><span><b>{e}.</b> {bala(S_EVENTOS, e).text}</span></li>)}
              <li><IconoV8 nombre="sos" /><span><b>Botón SOS.</b> {bala(S_SOS, 'Botón SOS').text}</span></li>
            </ul>
            <div className="v8-stats v8-stats-3">{CIFRAS_SEGURIDAD.map(s => <Cifra key={s.label} stat={s} oscuro />)}</div>
            <Link className="v8-link v8-link-light" to="/seguridad">Conocer las herramientas de seguridad <IconoV8 nombre="chevron" /></Link>
          </div>
          <div className="v8-night-media">
            <div className="v8-crop v8-night-photo"><Foto src={fotoConductor} alt="Supervisor de FOM frente a la fila de camiones en el patio, de noche." /></div>
            <TelefonoV8 className="v8-night-phone" src={capturaPerfil} alt="Perfil real de la app FOM con el índice de manejo seguro 76 de 100 y los eventos por cada 100 km. Datos de demostración." />
            <div className="v8-sos-chip v8-glass-dark">
              <span className="v8-sos-dot" aria-hidden="true">SOS</span>
              <div><strong>Respuesta guiada</strong><span>{bala(S_SOS, 'Respuesta guiada').text}</span></div>
            </div>
          </div>
        </div>
        <small className="v8-demo-note is-dark">Capturas reales · Datos de demostración</small>
      </section>

      {/* Mapa y GPS */}
      <section id="mapa" className="v8-section v8-map" aria-labelledby="v8-map-title">
        <Encabezado id="v8-map-title" kicker="Mapa y GPS" lineas={['Toda tu flota.', 'Un solo mapa.']} texto={S_MAPA.body} centro />
        <div className="v8-map-stage">
          <div className="v8-map-frame">
            <Foto src={fotoMapa} alt="Monitor con el mapa en vivo de FOM frente al patio de la flota al anochecer. Datos de demostración." />
            <ul className="v8-map-chips">
              {['Posición en vivo', 'Historial de recorrido', 'Estado de la unidad'].map((b, i) => <li key={b} className="v8-map-chip v8-glass">
                <IconoV8 nombre={['pin', 'route', 'gauge'][i]} /><div><strong>{b}</strong><span>{bala(S_GPS, b).text}</span></div>
              </li>)}
            </ul>
          </div>
        </div>
        <div className="v8-stats v8-stats-3 v8-map-stats">{CIFRAS_MAPA.map(s => <Cifra key={s.label} stat={s} />)}</div>
        <article className="v8-install" data-v8-reveal>
          <div className="v8-install-copy">
            <p className="v8-kicker">Instalación de los equipos GPS</p>
            <h3>{S_INSTALACION.stat.value}</h3>
            <p className="v8-install-label">{S_INSTALACION.stat.label}.</p>
            <ul>{S_INSTALACION.bullets.map(b => <li key={b.label}><b>{b.label}.</b> {b.text}</li>)}</ul>
          </div>
          <div className="v8-crop v8-install-photo"><Foto src={fotoInstalacion} alt="Técnico de FOM instalando el equipo GPS bajo el tablero de un camión." /></div>
        </article>
      </section>

      {/* Mantenimiento, inspecciones y reportes */}
      <section id="mantenimiento" className="v8-band v8-steps" aria-labelledby="v8-steps-title">
        <Encabezado id="v8-steps-title" kicker="Mantenimiento, inspecciones y reportes" lineas={['Del primer chequeo', 'al próximo servicio.']} texto="Un recorrido conectado: revisar, reportar y dar seguimiento." />
        <div className="v8-steps-grid">
          <ol className="v8-steps-list">
            {PASOS_MANT.map((p, i) => <li key={p.titulo}><span className="v8-step-n">0{i + 1}</span><div><h3>{p.titulo}</h3><p>{p.texto}</p></div></li>)}
          </ol>
          <div className="v8-steps-media">
            {PASOS_MANT.map((p, i) => <figure key={p.titulo} className="v8-card-photo">
              <div className="v8-crop"><Foto src={p.foto} alt={p.alt} /></div>
              <figcaption><span className="v8-step-n">0{i + 1}</span> <b>{p.titulo}.</b> {p.texto}</figcaption>
            </figure>)}
          </div>
        </div>
        <div className="v8-steps-links" data-v8-reveal>
          <Link className="v8-link" to="/funciones">Mantenimiento preventivo <IconoV8 nombre="chevron" /></Link>
          <Link className="v8-link" to="/app">Inspecciones desde la app <IconoV8 nombre="chevron" /></Link>
          <Link className="v8-link" to="/funciones">Reportes de la operación <IconoV8 nombre="chevron" /></Link>
        </div>
      </section>

      {/* Áreas */}
      <section id="areas" className="v8-section v8-areas" aria-labelledby="v8-areas-title">
        <div className="v8-areas-grid">
          <div className="v8-areas-copy">
            <Encabezado id="v8-areas-title" kicker="Áreas y flota" lineas={['Un mismo control.', 'Cada zona de tu flota.']} texto={P.areas.subtitle} />
            <ul className="v8-areas-list" data-v8-reveal>
              {[['zone', S_GEOCERCAS.heading, 'Alerta de entrada'], ['users', S_ACCESO.heading, 'Permisos por grupo'], ['layers', 'Etiquetas múltiples', 'Etiquetas múltiples']].map(([icono, titulo, b]) => {
                const fuente = [S_GEOCERCAS, S_ACCESO, S_AREAS].find(s => s.bullets.some(x => x.label === b))
                return <li key={titulo}><IconoV8 nombre={icono} /><div><h3>{titulo}</h3><p>{bala(fuente, b).text}</p></div></li>
              })}
            </ul>
            <Link className="v8-link" to="/areas">Organizar la flota por áreas <IconoV8 nombre="chevron" /></Link>
          </div>
          <div className="v8-areas-media">
            <div className="v8-crop"><Foto src={fotoAerea} alt="Vista aérea de un parque industrial con galpones y patios de flota." /></div>
            <ul>
              {['Por zona geográfica', 'Por empresa o sede', 'Por contrato'].map((b, i) => <li key={b} className="v8-areas-chip v8-glass" style={{ '--i': i }}>
                <IconoV8 nombre={['pin', 'database', 'clipboard'][i]} /><span>{b}</span>
              </li>)}
            </ul>
          </div>
        </div>
      </section>

      {/* Beneficios */}
      <section id="beneficios" className="v8-section v8-benefits" aria-labelledby="v8-benefits-title">
        <div className="v8-benefits-stage">
          <div className="v8-benefits-bg"><Foto src={fotoCamioneta} alt="" /></div>
          <div className="v8-benefits-inner">
            <header className="v8-head is-light">
              <p className="v8-kicker" data-v8-reveal>Beneficios</p>
              <h2 id="v8-benefits-title" className="v8-h2" data-v8-words><Palabras lineas={['Más claridad para cada', 'decisión de tu flota.']} /></h2>
            </header>
            <ul className="v8-benefits-grid">
              {BENEFICIOS.map(([titulo, texto, icono]) => <li key={titulo} className="v8-glass-card">
                <IconoV8 nombre={icono} /><h3>{titulo}</h3><p>{texto}</p>
              </li>)}
            </ul>
          </div>
        </div>
        <div className="v8-stats v8-stats-4">{CIFRAS_BENEFICIOS.map(s => <Cifra key={s.label} stat={s} />)}</div>
        <p className="v8-center-link" data-v8-reveal><Link className="v8-link" to="/beneficios">Ver todos los beneficios <IconoV8 nombre="chevron" /></Link></p>
      </section>

      {/* Preguntas frecuentes */}
      <section id="preguntas" className="v8-band v8-faq" aria-labelledby="v8-faq-title">
        <Encabezado id="v8-faq-title" lineas={['Preguntas frecuentes.']} texto="Resuelve tus dudas principales." centro />
        <div className="v8-faq-list" data-v8-reveal>
          {PREGUNTAS.map((f, i) => <details key={f.q} open={i === 0}>
            <summary><span className="v8-q">{f.q}</span><IconoV8 nombre="plus" /></summary>
            <p>{f.a}</p>
          </details>)}
        </div>
        <p className="v8-center-link"><Link className="v8-link" to="/preguntas-frecuentes">Ver todas las preguntas <IconoV8 nombre="chevron" /></Link></p>
      </section>

      {/* Contacto */}
      <section id="contacto" className="v8-section v8-contact" aria-labelledby="v8-contact-title">
        <Encabezado id="v8-contact-title" kicker="Contacto y demostración" lineas={['Hablemos de tu operación.']} texto="Cuéntanos cómo trabajas y coordinamos una demostración." centro />
        <div className="v8-contact-grid">
          <div className="v8-contact-media" data-v8-reveal>
            <div className="v8-crop"><Foto src={fotoFurgoneta} alt="Furgoneta FOM con el lema «Operación segura, mayor disponibilidad»." /></div>
            <div className="v8-contact-badge v8-glass">
              <strong>{P.contacto.sections[0].stat.value}</strong>
              <span>{P.contacto.sections[0].stat.label}</span>
            </div>
          </div>
          <div className="v8-contact-card" data-v8-reveal><FormularioV8 /></div>
        </div>
        <ol className="v8-process" data-v8-reveal>
          {S_PASOS.bullets.map(b => <li key={b.label}><b>{b.label}</b><span>{b.text}</span></li>)}
        </ol>
      </section>
    </main>
    <PieV8 />
  </div>
}
