// Qué ofrecemos de la web v8 (T-108), fiel a los tableros «Qué ofrecemos · escritorio»
// (Que-ofrecemos.dc.html) y «Qué ofrecemos · teléfono» (Que-ofrecemos-movil.dc.html).
// Animación (nota azul del tablero, 1 momento):
//   1) Hero: el titular entra escalonado y la foto pasa de 92 % a 100 % al bajar.
// Todo lo demás: aparición suave al entrar (opacidad + 24 px). Teléfono: mismas piezas apiladas.
import { useRef } from 'react'
import { PAGES } from '../../content/pages'
import {
  SitioV8, SeccionV8, ContenedorV8, EncabezadoV8, FotoIntegradaV8, CapturaFlotanteV8, TarjetaVidrioV8, EscenaLaptopV8,
  BotonV8, EnlaceV8, EnlaceBaseV8, useMomentoV8, rutaV8,
} from '../../components/v8'
import './que-ofrecemos-v8.css'

// Cifra de instalación (src/content/pages.js · Contacto · «Instalación e implementación»).
const INSTALACION = PAGES.contacto.sections.find(s => s.heading === 'Instalación e implementación').stat
const etiquetaInstalacion = INSTALACION.label.charAt(0).toLowerCase() + INSTALACION.label.slice(1)

// Bajo el hero (T-139, Marco: las frases de antes decían poco). Hechos de src/content/pages.js:
// GPS cada 10 s con la unidad en movimiento (ubicación, rumbo y velocidad), inspección y reporte de
// falla con foto desde la app, servicio por kilometraje o fecha con aviso y orden de trabajo.
const PUNTOS_HERO = [
  ['GPS cada 10 segundos', 'Ubicación, rumbo y velocidad en marcha.'],
  ['Inspección diaria con foto', 'Desde la app, antes de salir.'],
  ['Mantenimiento por km o fecha', 'Con aviso y orden de trabajo.'],
]

const OFERTA = [
  {
    kicker: 'Ubicación y recorridos', titulo: 'Plataforma web', clave: 'plataforma', enlace: 'Plataforma web',
    texto: 'Dónde están las unidades y sus trayectos, en tiempo real, con el detalle de cada una.',
    textoMovil: 'Las unidades y sus trayectos en tiempo real.',
    foto: { nombre: 'patio-monitor-mapa', alt: 'Monitor con el Centro de control actual frente al patio. Datos de demostración.', posicion: '62% 50%' },
  },
  {
    kicker: 'Inspecciones y mantenimiento', titulo: 'App', clave: 'app', enlace: 'App',
    texto: 'El conductor revisa la unidad; el supervisor consulta los hallazgos y da seguimiento al servicio, desde la oficina o el teléfono.',
    textoMovil: 'El conductor revisa; el supervisor da seguimiento.',
    foto: { nombre: 'tecnico-app-unidad', alt: 'Técnico de FOM con Mi unidad abierta en el teléfono. Datos de demostración.', posicion: '72% 50%', className: 'qo-tarjeta-foto' },
  },
  {
    kicker: 'Alertas, seguridad y reportes', titulo: 'Seguridad', clave: 'seguridad', enlace: 'Seguridad',
    texto: 'Notificaciones, eventos de manejo y tu operación al día.',
    textoMovil: 'Notificaciones y eventos de manejo.',
    foto: { nombre: 'conductor-sos', alt: 'Conductor de FOM revisando su teléfono junto al camión.', posicion: '70% 50%' },
  },
]

const PASOS_INSTALACION = [
  { titulo: 'Por lotes.', texto: 'Entre 8 y 12 equipos por día, sin parar la flota.' },
  { titulo: 'Personal propio.', texto: 'Técnicos de FOM hacen el montaje y la prueba.' },
  { titulo: 'Verificación en sitio.', texto: 'Señal y posición confirmadas.' },
  { titulo: 'Puesta en marcha.', texto: 'Usuarios, grupos y accesos listos.' },
]

const MAS = [['plataforma', 'Plataforma web'], ['app', 'App'], ['funciones', 'Funciones'], ['seguridad', 'Seguridad'], ['areas', 'Áreas']]

export default function QueOfrecemosV8() {
  const raiz = useRef(null)
  useMomentoV8(raiz) // solo el momento 1 (hero) y las apariciones suaves de la base

  return <SitioV8 raiz={raiz} titulo="Qué ofrecemos — FOM" descripcion="Una plataforma para seguir, cuidar y entender tu flota: panel web, app para conductor y supervisor, alertas, reportes e instalación de los equipos GPS.">
    {/* Hero: la laptop con Vehículos a la izquierda, fundida; el texto a la derecha. */}
    <section className="qo-hero" aria-labelledby="qo-titulo">
      <div className="qo-hero-foto" data-v8-crece="">
        <FotoIntegradaV8 prioridad nombre="laptop-vehiculos" movilNombre="que-ofrecemos-hero-movil-v" fundido="ninguno" sizes="(max-width: 599px) 100vw, 60vw" className="qo-hero-img"
          alt="Laptop con la lista actual de Vehículos del panel FOM. Datos de demostración." />
      </div>
      <ContenedorV8 className="qo-hero-texto">
        <div className="qo-hero-caja">
          <p className="v8-kick" data-v8-entra="">Qué ofrecemos</p>
          <h1 id="qo-titulo" className="v8-h1 qo-h1">
            <span className="v8-linea" data-v8-entra="">Una plataforma para seguir, cuidar y entender tu flota.</span>
          </h1>
          <p className="v8-lead qo-hero-bajada" data-v8-entra="">
            <span className="v8-solo-escritorio">Herramientas conectadas para el trabajo diario, desde el panel de control hasta la app del conductor y del supervisor.</span>
            <span className="v8-solo-movil">Del panel de control a la app.</span>
          </p>
          <div className="qo-hero-accion" data-v8-entra=""><BotonV8 to={rutaV8('contacto')} tamano="lg">Solicitar demostración</BotonV8></div>
          <ul className="qo-hero-puntos v8-sm v8-t2" data-v8-entra="">
            {PUNTOS_HERO.map(([titulo, apoyo]) => <li key={titulo}><b className="v8-fuerte">{titulo}</b><span className="v8-xs">{apoyo}</span></li>)}
          </ul>
        </div>
      </ContenedorV8>
    </section>

    {/* Las tres áreas de la oferta. */}
    <SeccionV8 id="oferta" banda aria-labelledby="qo-oferta-titulo">
      <ContenedorV8>
        <h2 id="qo-oferta-titulo" className="v8-h2 qo-oferta-titulo" data-v8-aparece="">Qué ofrecemos.</h2>
        <ul className="qo-oferta v8-g3">
          {OFERTA.map(o => <li key={o.clave} data-v8-aparece="">
            <TarjetaVidrioV8 as="article" caja={false} className="qo-tarjeta">
              <FotoIntegradaV8 className="qo-tarjeta-foto" marco="plano" alto={280} sizes="(min-width: 1180px) 380px, (min-width: 1024px) 31vw, 46vw" {...o.foto} />
              <div className="qo-tarjeta-texto">
                <p className="v8-kick qo-tarjeta-kick">{o.kicker}</p>
                <h3 className="v8-h3">{o.titulo}</h3>
                <p className="v8-t2 qo-tarjeta-bajada">
                  <span className="v8-solo-escritorio">{o.texto}</span>
                  <span className="v8-solo-movil">{o.textoMovil}</span>
                </p>
                <p className="qo-tarjeta-enlace"><EnlaceV8 to={rutaV8(o.clave)}>{o.enlace}</EnlaceV8></p>
              </div>
            </TarjetaVidrioV8>
          </li>)}
        </ul>
      </ContenedorV8>
    </SeccionV8>

    {/* Inspecciones y mantenimiento: texto a la izquierda; el camión FOM completo (esquinas
        redondeadas, T-118) a la derecha con el teléfono encima. */}
    <SeccionV8 id="inspecciones" aria-labelledby="qo-insp-titulo">
      <ContenedorV8 className="qo-insp">
        <div className="qo-insp-caja">
          <p className="v8-kick" data-v8-aparece="">Inspecciones y mantenimiento</p>
          <h2 id="qo-insp-titulo" className="v8-h2" data-v8-aparece="">Menos imprevistos, más tiempo en movimiento.</h2>
          <p className="v8-lead qo-mt20 v8-solo-escritorio" data-v8-aparece="">La revisión diaria, los hallazgos y las órdenes de trabajo, en un mismo seguimiento.</p>
          <p className="qo-mt24 v8-solo-escritorio"><EnlaceV8 to={rutaV8('app')}>La app</EnlaceV8></p>
        </div>
        <div className="qo-insp-medio">
          <FotoIntegradaV8 className="qo-insp-foto" nombre="camion-marca" marco="redondo" sizes="(min-width: 1240px) 620px, 52vw"
            alt="Cabina de un camión blanco con el logo FOM en el patio de noche." />
          <CapturaFlotanteV8 className="qo-insp-telefono" nombre="cap-movil-cond-mantenimiento" ancho={220}
            alt="Mantenimiento en la app, vista del conductor: las órdenes de su unidad con su estado y el botón Reportar una falla. Datos de demostración." />
        </div>
      </ContenedorV8>
    </SeccionV8>

    {/* Alertas, seguridad y reportes (T-141): laptop que se abre al bajar con Reportes y, ya
        abierta, Alertas (capturas reales del panel). */}
    <SeccionV8 id="alertas" banda className="qo-alertas" aria-labelledby="qo-alertas-titulo">
      <ContenedorV8 className="v8-centro qo-alertas-cab">
        <p className="v8-kick" data-v8-aparece="">Alertas, seguridad y reportes</p>
        <h2 id="qo-alertas-titulo" className="v8-h2" data-v8-aparece="">Prioriza lo que requiere atención.</h2>
        <p className="v8-lead qo-mt20" data-v8-aparece="">Los avisos y los datos de la flota ayudan a entender cada recorrido.</p>
        <p className="qo-mt24"><EnlaceV8 to={rutaV8('seguridad')}>Seguridad</EnlaceV8></p>
      </ContenedorV8>
      <ContenedorV8 className="qo-alertas-escena">
        <EscenaLaptopV8 etiqueta="Laptop con los Reportes y las Alertas del panel FOM" pantallas={[
          { nombre: 'cap-panel-reportes', alt: 'Reportes actuales del panel FOM: reporte de vehículos, ODT por estado y unidades ahora. Datos de demostración.' },
          { nombre: 'cap-panel-alertas', alt: 'Alertas actuales del panel FOM con excesos de velocidad. Datos de demostración.' },
        ]} />
      </ContenedorV8>
    </SeccionV8>

    {/* Instalación de los equipos GPS. */}
    <SeccionV8 id="instalacion" className="qo-gps" aria-labelledby="qo-gps-titulo">
      <ContenedorV8 className="qo-gps-escena">
        <FotoIntegradaV8 className="qo-gps-foto" nombre="instalacion-gps" marco="redondo" sizes="(min-width: 1240px) 560px, (min-width: 900px) 46vw, calc(100vw - 40px)"
          alt="Técnico de FOM instalando el equipo GPS bajo el tablero de un camión." />
        <div className="qo-gps-caja">
          <p id="qo-gps-titulo" className="v8-kick" data-v8-aparece="">Instalación de los equipos GPS</p>
          <p className="qo-gps-cifra" data-v8-aparece=""><strong>{INSTALACION.value}</strong><span>{etiquetaInstalacion}</span></p>
          <ul className="qo-gps-lista v8-sm v8-t2 v8-solo-escritorio" data-v8-aparece="">
            {PASOS_INSTALACION.map(p => <li key={p.titulo}><b className="v8-fuerte">{p.titulo}</b> {p.texto}</li>)}
          </ul>
          <ul className="qo-gps-lista v8-sm v8-t2 v8-solo-movil">
            <li><b className="v8-fuerte">Por lotes.</b> 8 a 12 equipos por día.</li>
            <li><b className="v8-fuerte">Personal propio</b> de FOM.</li>
          </ul>
        </div>
      </ContenedorV8>
    </SeccionV8>

    {/* Cierre: enlaces a las páginas del producto, lema y demostración. */}
    <SeccionV8 className="qo-cierre" aria-labelledby="qo-cierre-titulo">
      <ContenedorV8 className="v8-centro">
        <nav className="qo-mas" aria-label="Páginas del producto">
          {MAS.map(([clave, nombre]) => <EnlaceBaseV8 key={clave} to={rutaV8(clave)} className="v8-enlace">{nombre}</EnlaceBaseV8>)}
        </nav>
        <h2 id="qo-cierre-titulo" className="qo-lema" data-v8-aparece="">
          <span className="v8-linea">Flotas que mantienen</span>{' '}
          <span className="v8-linea">el mundo en movimiento.</span>
        </h2>
        <div className="qo-cierre-accion" data-v8-aparece=""><BotonV8 to={rutaV8('contacto')} tamano="lg">Solicitar demostración</BotonV8></div>
      </ContenedorV8>
    </SeccionV8>
  </SitioV8>
}
