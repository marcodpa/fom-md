// Funciones de la web v8 (T-106), fiel a los tableros «Funciones · escritorio» (Funciones.dc.html)
// y «Funciones · teléfono» (Funciones-movil.dc.html) del lienzo «Web FOM nueva».
// Animación (nota azul del tablero, solo 2 momentos):
//   1) Hero: el titular entra escalonado y la foto pasa de 92 % a 100 % al bajar (base: HeroV8).
//   1b) Hero (T-117): la foto aérea entera, con el recorrido por la carretera que se dibuja, el
//      vehículo que avanza y un ping de posición por tramo (funciones-animaciones.jsx).
//   1c) Telemática (T-117): señales que toma el equipo sobre la Hilux (puntos, líneas a la antena,
//      ondas hacia el panel y etiquetas escalonadas).
//   1d) Rastreo GPS (T-149, movido desde el Inicio): televisor que se enciende con la pantalla de
//      carga de FOM y muestra el Centro de control y la unidad seleccionada (EscenaTelevisorV8, se
//      mueve solo; fija en escritorio). Va al final de la sección GPS: la lista la separa del hero y
//      el encabezado de Telemática la separa de la camioneta; el recorrido fijo queda dos secciones
//      más abajo.
//   2) Recorrido fijo «Del aviso a la decisión»: la captura en vidrio cambia entre Mantenimiento,
//      Reportes y Alertas mientras el texto avanza (solo escritorio ≥ 1024 px).
// Todo lo demás: quieto o aparición suave. Teléfono: capturas apiladas, sin escena fija.
import { useCallback, useEffect, useRef, useState } from 'react'
import { PAGES } from '../../content/pages'
import {
  SitioV8, NavLocalV8, HeroV8, SeccionV8, ContenedorV8, EncabezadoV8, FotoIntegradaV8, CapturaFlotanteV8,
  TarjetaVidrioV8, EscenaV8, ListaPasosV8, PestanasV8, PreguntasV8, BotonV8, EnlaceV8, NotaVidrioV8, useMomentoV8, rutaV8,
} from '../../components/v8'
import { hayFotoV8 } from '../../components/v8/fotosV8'
import { EscenaTelevisorV8 } from '../../components/v8/escenasExtraV8'
import { RutaCostaV8, SenalesTelematicaV8, animarRutaCostaV8, animarSenalesV8 } from './funciones-animaciones'
import './funciones-v8.css'

const F = PAGES.funciones
const seccion = titulo => F.sections.find(s => s.heading.startsWith(titulo))

const LOCAL = [
  ['gps', 'GPS'], ['telematica', 'Telemática'], ['mantenimiento', 'Mantenimiento'], ['reportes', 'Reportes'], ['alertas', 'Alertas'],
]

const GPS = [
  ['Posición en vivo.', 'Ubicación, rumbo y velocidad de cada unidad.'],
  ['Historial de recorrido.', 'La ruta de cualquier día, con paradas y kilómetros.'],
  ['Estado de la unidad.', 'En movimiento, detenida con motor encendido o apagada.'],
  ['Vista de flota completa.', 'Filtros por conductor, placa o tipo de vehículo.'],
]
const GPS_MOVIL = [
  ['Posición en vivo', 'Cada 10 segundos, con rumbo y velocidad.'],
  ['Historial de recorrido', 'La ruta de cualquier día, con paradas.'],
  ['Estado de la unidad', 'En movimiento, detenida o apagada.'],
]

const TELEMATICA = [
  ['Voltaje de batería', 'Avisa ante cortes o caídas de voltaje.'],
  ['Datos del motor', 'Horas, revoluciones y temperatura.'],
  ['Kilometraje automático', 'El odómetro se actualiza solo.'],
  ['Códigos de falla', 'Apenas aparecen, antes de una parada mayor.'],
]
const TELEMATICA_MOVIL = [
  ['Voltaje de batería', 'Avisa ante cortes o caídas de voltaje.'],
  ['Datos del motor y códigos de falla', 'Horas, temperatura y fallas apenas aparecen.'],
]

// Recorrido «Del aviso a la decisión»: paso, pestaña y captura real del panel.
const PASOS = [
  { titulo: 'Mantenimiento preventivo', texto: 'Avisos por kilómetro o fecha, por ejemplo cada 5.000 km o 90 días, y órdenes de trabajo con su historial y costo.' },
  { titulo: 'Reportes y analítica', texto: 'Costo por kilómetro, uso y disponibilidad. PDF o Excel, con envío programado.' },
  { titulo: 'Alertas operativas', texto: 'Exceso de velocidad, motor encendido detenido, desconexión del equipo y mantenimiento vencido.' },
]
const PESTANAS = ['Mantenimiento', 'Reportes', 'Alertas']
const CAPTURAS = [
  { nombre: 'cap-panel-mantenimiento', alt: 'Mantenimiento actual del panel FOM: órdenes de trabajo y cómo avanza una ODT. Datos de demostración.' },
  { nombre: 'cap-panel-reportes', alt: 'Reportes actuales del panel FOM: reporte de vehículos con uso y disponibilidad. Datos de demostración.' },
  { nombre: 'cap-panel-alertas', alt: 'Alertas actuales del panel FOM con excesos de velocidad. Datos de demostración.' },
]
// En el teléfono: dos teléfonos apilados (Mantenimiento y Alertas); Reportes es la sección siguiente.
const MOVIL = [
  { id: 'funciones-movil-mantenimiento', titulo: 'Mantenimiento preventivo', texto: 'Avisos por kilómetro o fecha y órdenes de trabajo con historial y costo.', captura: { nombre: 'cap-movil-sup-mantenimiento', alt: 'Mantenimiento actual del panel en el teléfono del supervisor. Datos de demostración.' } },
  { id: 'funciones-movil-alertas', titulo: 'Alertas operativas', texto: 'Exceso de velocidad, ralentí, desconexión y mantenimiento vencido.', captura: { nombre: 'cap-movil-sup-alertas', alt: 'Alertas actuales en el teléfono del supervisor. Datos de demostración.' } },
]
const SALTOS_MOVIL = [['#funciones-movil-mantenimiento', 'Mantenimiento'], ['#reportes', 'Reportes'], ['#funciones-movil-alertas', 'Alertas']]

const REPORTES = seccion('Reportes').stat
// Costa con brillo natural (pedido de Marco): si existe `costa-ruta-plena` (misma toma, sin el
// grado a anochecer ni la orilla horneada) se sirve esa con un fundido corto en el borde; si no,
// la de siempre, cuya orilla ya viene fundida en transparencia. El recorrido usa los mismos píxeles.
const COSTA_PLENA = hayFotoV8('costa-ruta-plena')

export default function FuncionesV8() {
  const raiz = useRef(null)
  const recorrido = useRef(null) // ScrollTrigger del recorrido fijo (solo escritorio con movimiento)
  const [paso, setPaso] = useState(0)

  useMomentoV8(raiz, ({ q, gsap, ScrollTrigger, escritorio }) => {
    // 1b y 1c · Recorrido de la costa y señales de telemática (escritorio y teléfono).
    const limpiezas = [animarRutaCostaV8({ q, gsap, ScrollTrigger }), animarSenalesV8({ q, gsap, ScrollTrigger })]
    const limpiar = () => limpiezas.forEach(f => f?.())
    if (!escritorio) return limpiar
    // 2 · Recorrido fijo: la escena queda fija y el avance del scroll elige el paso (01 → 02 → 03);
    //     la captura cambia con un fundido de opacidad (CSS). Nada se reescala.
    const escena = q('.funciones-aviso-escena')[0]
    if (!escena) return limpiar
    const st = ScrollTrigger.create({
      trigger: escena, start: 'center center', end: '+=160%', pin: true, anticipatePin: 1,
      onUpdate: self => setPaso(Math.min(2, Math.floor(self.progress * 3))),
    })
    recorrido.current = st
    return () => { limpiar(); recorrido.current = null; setPaso(0) }
  })

  // Con la escena fija, elegir un paso (pestaña, paso o barra local) lleva el scroll a su tramo.
  const irAPaso = useCallback(i => {
    const st = recorrido.current
    if (!st) { setPaso(i); return }
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    window.scrollTo({ top: st.start + ((i + 0.5) / 3) * (st.end - st.start), behavior: reduce ? 'auto' : 'smooth' })
  }, [])

  // La barra local lleva a «Mantenimiento» y «Alertas»: con la escena fija, al tramo de cada paso;
  // sin ella, marca el paso y deja que el ancla haga su salto normal.
  useEffect(() => {
    const alPulsar = e => {
      const a = e.target.closest?.('a[href="#mantenimiento"], a[href="#alertas"]')
      if (!a) return
      const i = a.getAttribute('href') === '#alertas' ? 2 : 0
      if (!recorrido.current) { setPaso(i); return }
      e.preventDefault()
      irAPaso(i)
    }
    document.addEventListener('click', alPulsar)
    return () => document.removeEventListener('click', alPulsar)
  }, [irAPaso])

  return <SitioV8 raiz={raiz} titulo="Funciones — FOM" descripcion={F.subtitle}>
    <HeroV8
      className="funciones-hero"
      kicker={F.eyebrow}
      titulo={['Control diario de tu flota,', 'sin puntos ciegos.']}
      bajada={<>
        <span className="v8-solo-escritorio">Rastreo GPS en vivo, telemática, mantenimiento preventivo, reportes y alertas. El supervisor los trabaja desde el panel web y el conductor aporta desde la app.</span>
        <span className="v8-solo-movil">GPS en vivo, telemática, mantenimiento, reportes y alertas.</span>
      </>}
      bajadaAngosta
      primaria={{ to: rutaV8('contacto'), texto: 'Solicitar demostración' }}
      medio={<div className="v8-hero-medio funciones-hero-medio" data-v8-crece="">
        {/* La foto entera (sin recorte ni máscara encima): su orilla ya viene fundida en transparencia. */}
        <FotoIntegradaV8 prioridad sizes="100vw" nombre="costa-ruta" {...(COSTA_PLENA ? { marco: 'plano', className: 'funciones-costa-plena' } : { fundido: 'ninguno' })}
          alt="Vista aérea de una carretera junto al mar; una línea azul marca el recorrido de un vehículo con su posición cada 10 segundos." />
        <RutaCostaV8 />
        <NotaVidrioV8 titulo="Posición cada 10 segundos" texto="con el vehículo en movimiento" />
      </div>}
    />

    <NavLocalV8 titulo="Funciones" enlaces={LOCAL} />

    <SeccionV8 id="gps" className="funciones-gps" aria-labelledby="funciones-gps-titulo">
      <ContenedorV8 className="funciones-gps-rejilla">
        <header className="funciones-gps-cab">
          <p className="v8-kick" data-v8-aparece="">{seccion('Rastreo GPS').heading}</p>
          <h2 id="funciones-gps-titulo" className="v8-h2" data-v8-aparece="">Sigue la operación tal como ocurre.</h2>
          <p className="v8-lead v8-solo-escritorio" data-v8-aparece="">Posición, velocidad y encendido llegan al panel para decidir sin llamar al conductor.</p>
        </header>
        <FotoIntegradaV8 className="funciones-gps-foto" nombre="operadora-mapa" fundido="o" sizes="(min-width: 900px) 60vw, 100vw"
          alt="Operadora de FOM frente al Centro de control actual. Datos de demostración." />
        <ul className="funciones-gps-lista v8-sm v8-t2">
          {GPS.map(([b, t]) => <li key={b} data-v8-aparece=""><b className="v8-fuerte">{b}</b> {t}</li>)}
        </ul>
        <ul className="funciones-gps-lista-movil">
          {GPS_MOVIL.map(([b, t]) => <li key={b}><h3 className="v8-h4">{b}</h3><p className="v8-sm v8-t2">{t}</p></li>)}
        </ul>
      </ContenedorV8>
      {/* Televisor que se enciende (modo por defecto: Centro de control y unidad seleccionada). */}
      <ContenedorV8 className="funciones-gps-tv">
        <EscenaTelevisorV8 etiqueta="Televisor que se enciende con la pantalla de carga de FOM y muestra el Centro de control y una unidad seleccionada" />
      </ContenedorV8>
    </SeccionV8>

    <SeccionV8 id="telematica" banda className="funciones-telematica" aria-labelledby="funciones-telematica-titulo">
      <ContenedorV8>
        <EncabezadoV8 centro className="funciones-telematica-cab" id="funciones-telematica-titulo" kicker="Telemática y diagnóstico"
          titulo={<>
            <span className="v8-solo-escritorio"><span className="v8-linea">Cómo se usa cada unidad,</span><span className="v8-linea">no solo dónde está.</span></span>
            <span className="v8-solo-movil">Cómo se usa cada unidad.</span>
          </>} />
      </ContenedorV8>
      <div className="funciones-tele-medio">
        {/* T-139 (Marco): foto a sangre, a todo el ancho, sin radio ni marco; la versión -plena
            (sin alfa horneado) y solo un fundido arriba y abajo con el fondo de la sección. */}
        <FotoIntegradaV8 className="funciones-telematica-foto" nombre="telematica" marco="plano" sizes="100vw"
          alt="Camioneta FOM con el motor a la vista y las señales que toma el equipo: ubicación GPS, kilómetros, voltaje de batería, RPM y temperatura, frenada brusca y combustible." />
        <SenalesTelematicaV8 />
      </div>
      <p className="v8-nota-demo funciones-tele-nota">Valores de ejemplo · Datos de demostración</p>
      <ContenedorV8 className="funciones-telematica-cajas is-escritorio">
        {TELEMATICA.map(([t, x]) => <TarjetaVidrioV8 key={t} radio="tarjeta" data-v8-aparece="">
          <h3 className="v8-h4">{t}</h3><p className="v8-sm v8-t2">{x}</p>
        </TarjetaVidrioV8>)}
      </ContenedorV8>
      <ContenedorV8 className="funciones-telematica-cajas is-movil">
        {TELEMATICA_MOVIL.map(([t, x]) => <TarjetaVidrioV8 key={t} radio="tarjeta">
          <h3 className="v8-h4">{t}</h3><p className="v8-sm v8-t2">{x}</p>
        </TarjetaVidrioV8>)}
      </ContenedorV8>
    </SeccionV8>

    <SeccionV8 id="mantenimiento" className="funciones-aviso" aria-labelledby="funciones-aviso-titulo">
      <ContenedorV8>
        <EncabezadoV8 centro className="funciones-aviso-cab" id="funciones-aviso-titulo" titulo="Del aviso a la decisión."
          bajada={<span className="v8-solo-escritorio">Tres herramientas del panel, tal como se ven hoy.</span>} anchoBajada={640} />
      </ContenedorV8>

      {/* Escritorio y tableta: pasos + captura real en vidrio. */}
      <ContenedorV8 className="funciones-aviso-escena">
        <span id="alertas" className="funciones-ancla" aria-hidden="true" />
        <ListaPasosV8 className="funciones-aviso-pasos" pasos={PASOS} activo={paso} alCambiar={irAPaso} />
        <div className="funciones-aviso-captura">
          <PestanasV8 className="funciones-aviso-pestanas" opciones={PESTANAS} activa={paso} alCambiar={irAPaso} etiqueta="Herramientas del panel" />
          <div className="funciones-aviso-pila">
            {CAPTURAS.map((c, i) => <div key={c.nombre} className={`funciones-aviso-cap${i === paso ? ' is-activa' : ''}`} aria-hidden={i === paso ? undefined : 'true'}>
              <CapturaFlotanteV8 nombre={c.nombre} alt={c.alt} sizes="(min-width: 1240px) 720px, (min-width: 900px) 60vw, calc(100vw - 64px)" />
            </div>)}
          </div>
          <p className="v8-nota-demo">Captura real del panel · Datos de demostración</p>
        </div>
      </ContenedorV8>

      {/* Teléfono: capturas apiladas, sin escena fija. */}
      <div className="funciones-aviso-movil">
        <nav className="funciones-saltos" aria-label="Ir a cada herramienta">
          {SALTOS_MOVIL.map(([href, nombre]) => <a key={href} className="v8-pestana" href={href}>{nombre}</a>)}
        </nav>
        {MOVIL.map(m => <div key={m.id} id={m.id} className="funciones-movil-item">
          <CapturaFlotanteV8 nombre={m.captura.nombre} alt={m.captura.alt} ancho={240} />
          <ContenedorV8><h3 className="v8-h4">{m.titulo}</h3><p className="v8-sm v8-t2">{m.texto}</p></ContenedorV8>
        </div>)}
        <p className="v8-nota-demo">Capturas reales · Datos de demostración</p>
      </div>

      {/* Enlace a la sección Inspecciones de Plataforma. */}
      <ContenedorV8>
        <p className="funciones-inspeccion v8-sm v8-t2" data-v8-aparece="">
          <b className="v8-fuerte">Inspección diaria con la hoja de tu empresa</b> <span className="funciones-nuevo">nuevo</span>{' '}
          El conductor la llena en la app, el supervisor ve quién falta y lo que falla se vuelve orden de trabajo.{' '}
          <EnlaceV8 to={rutaV8('plataforma', 'inspecciones')}>Ver cómo funciona</EnlaceV8>
        </p>
      </ContenedorV8>
    </SeccionV8>

    <SeccionV8 id="reportes" banda className="funciones-reportes" aria-labelledby="funciones-reportes-titulo">
      {/* Teléfono: la captura REAL de Reportes, entera, y el texto debajo (la foto del monitor
          recortada cortaba «Reportes» y quedaba bajo el rótulo). En escritorio, la escena de siempre. */}
      <div className="funciones-reportes-movil">
        <CapturaFlotanteV8 nombre="cap-movil-sup-reportes" alt="Reportes actuales en el teléfono del supervisor: vehículos, usuarios, costos y estadístico. Datos de demostración." ancho={240} />
      </div>
      <EscenaV8 lado="izquierda" ancho="62%" anchoTexto={460} posicionMovil="70% 50%" altoMovil={360}
        foto={{ nombre: 'oficina-reportes', alt: 'Monitor con los Reportes actuales del panel FOM en la oficina. Datos de demostración.' }}>
        <p className="v8-kick" data-v8-aparece="">Reportes</p>
        <h2 id="funciones-reportes-titulo" className="v8-h2" data-v8-aparece="">Se leen en minutos.</h2>
        <p className="v8-lead funciones-reportes-lead v8-solo-escritorio" data-v8-aparece="">Cada indicador se filtra por vehículo, conductor o rango de fechas, y se comparte con la gerencia.</p>
        <p className="v8-cifra funciones-reportes-cifra" data-v8-aparece=""><strong>{REPORTES.value}</strong><span>formatos de exportación</span></p>
      </EscenaV8>
    </SeccionV8>

    <SeccionV8 id="preguntas" className="funciones-preguntas" aria-labelledby="funciones-faq-titulo">
      <ContenedorV8>
        <h2 id="funciones-faq-titulo" className="v8-h2 v8-centro" data-v8-aparece="">Preguntas sobre las funciones.</h2>
        <PreguntasV8 items={F.faqs} />
        <div className="funciones-boton-movil v8-solo-movil"><BotonV8 to={rutaV8('contacto')} ancho>Solicitar demostración</BotonV8></div>
      </ContenedorV8>
    </SeccionV8>

    <SeccionV8 className="funciones-cierre v8-solo-escritorio" aria-labelledby="funciones-cierre-titulo">
      <ContenedorV8 className="v8-centro">
        <h2 id="funciones-cierre-titulo" className="v8-h2" data-v8-aparece="">Del primer recorrido al próximo mantenimiento.</h2>
        <div className="v8-acciones" data-v8-aparece="">
          <BotonV8 to={rutaV8('contacto')} tamano="lg">Solicitar demostración</BotonV8>
          <EnlaceV8 to={rutaV8('seguridad')}>Ver seguridad</EnlaceV8>
        </div>
      </ContenedorV8>
    </SeccionV8>
  </SitioV8>
}
