// Inicio de la web v8 (T-104), fiel a los tableros «Inicio · escritorio» (Main.dc.html) e
// «Inicio · teléfono» (Inicio-movil.dc.html) del lienzo «Web FOM nueva».
// Animación (nota azul del tablero, solo 2 momentos):
//   1) Hero: el titular entra escalonado y la foto pasa de 92 % a 100 % al bajar (base: HeroV8).
//   2) Escena fija «Panel en la oficina. App en la calle.»: el panel se aparta y entra el teléfono,
//      cuya pantalla se desplaza (solo escritorio ≥ 1024 px). Debajo, la escena de teléfonos
//      (EscenaTelefonosV8): la app (vista del conductor) en dos pantallas que se desplazan y se inclinan.
//   3) «Toda tu flota. Un solo mapa.» (T-141): laptop que se abre al bajar (EscenaLaptopV8) con el
//      Centro de control real y, ya abierta, la unidad seleccionada.
//   4) «Abre el panel.» (T-144): televisor que se enciende con la pantalla de carga de FOM y muestra
//      el Resumen y luego Alertas (EscenaTelevisorV8; se mueve solo). Va tras las cifras del mapa,
//      para que no queden dos escenas fijas seguidas, y no repite el Centro de control de la laptop.
// Todo lo demás: quieto o aparición suave. Teléfono: sin escenas fijas, mismas piezas apiladas.
import { useRef } from 'react'
import { PAGES } from '../../content/pages'
import {
  SitioV8, NavLocalV8, HeroV8, SeccionV8, ContenedorV8, EncabezadoV8, FotoIntegradaV8, CapturaFlotanteV8,
  RasgosV8, CarruselV8, TarjetaCarruselV8, EscenaV8, BloqueCifrasV8, ChipV8, PreguntasV8, CtaFinalV8,
  EnlaceV8, EscenaTelefonosV8, EscenaLaptopV8, useMomentoV8, rutaV8,
} from '../../components/v8'
import { EscenaTelevisorV8 } from '../../components/v8/escenasExtraV8'
import './inicio-v8.css'

const P = PAGES
const stat = (pagina, titulo) => P[pagina].sections.find(s => s.heading === titulo).stat
const cifra = s => ({ valor: s.value, etiqueta: s.label })

const LOCAL = [
  ['plataforma', 'Plataforma'], ['funciones', 'Funciones'], ['seguridad', 'Seguridad'], ['mapa', 'Mapa y GPS'],
  [rutaV8('beneficios'), 'Beneficios'], ['preguntas', 'Preguntas'],
]

const RASGOS = [
  { icono: 'monitor', titulo: 'Panel del supervisor', texto: 'Mapa en vivo, órdenes de trabajo, inspecciones, documentos, personal y reportes desde el navegador.' },
  { icono: 'phone', titulo: 'La app', texto: 'El conductor hace la inspección y reporta fallas con foto; el supervisor sigue la flota en el teléfono.' },
  { icono: 'database', titulo: 'Una sola base de datos', texto: 'Nadie pasa información de un lado a otro ni exporta archivos entre sistemas.' },
  { icono: 'cloud', titulo: 'Aguanta sin señal', texto: 'La app guarda lo que el conductor registra y lo sincroniza al volver la cobertura.' },
]

const FUNCIONES = [
  { titulo: 'Rastreo GPS en tiempo real', texto: 'Posición cada 10 segundos con el vehículo en movimiento.', foto: { nombre: 'operadora-mapa', alt: 'Supervisor de FOM frente al Centro de control actual. Datos de demostración.' }, capturaMovil: { nombre: 'cap-movil-sup-mapa', alt: 'Centro de control actual en la app del supervisor. Datos de demostración.' } },
  { titulo: 'Telemática y diagnóstico', texto: 'Batería, motor, kilometraje y códigos de falla de cada unidad.', foto: { nombre: 'telematica', alt: 'Camioneta FOM con el motor y el equipo de telemática a la vista.' } },
  { titulo: 'Mantenimiento preventivo', texto: 'Avisos por kilómetro o fecha y órdenes de trabajo con historial.', captura: { nombre: 'cap-movil-cond-mantenimiento', alt: 'Mantenimiento de la unidad en la app actual. Datos de demostración.' } },
  { titulo: 'Reportes y analítica', texto: 'Costo por kilómetro, uso y disponibilidad. En PDF o Excel.', foto: { nombre: 'oficina-reportes', alt: 'Monitor con los Reportes actuales del panel FOM. Datos de demostración.' }, capturaMovil: { nombre: 'cap-movil-sup-reportes', alt: 'Reportes actuales en la app del supervisor. Datos de demostración.' } },
  { titulo: 'Inspección en campo', texto: 'El conductor revisa su unidad con la app antes de salir.', foto: { nombre: 'tecnico-app-unidad', alt: 'Conductor de FOM con su unidad abierta en la app, junto al camión.', posicion: '40% 50%' } },
  { titulo: 'Alertas operativas', texto: 'Exceso de velocidad, motor encendido detenido y mantenimiento vencido.', captura: { nombre: 'cap-movil-sup-alertas', alt: 'Alertas actuales en la app del supervisor. Datos de demostración.' } },
]

const CHIPS_MAPA = [
  { icono: 'pin', titulo: 'Posición en vivo', texto: 'Cada 10 segundos, con rumbo y velocidad.' },
  { icono: 'route', titulo: 'Historial de recorrido', texto: 'La ruta de cualquier día, con paradas y kilómetros.' },
  { icono: 'gauge', titulo: 'Estado de la unidad', texto: 'En movimiento, detenida con motor encendido o apagada.' },
]

// Laptop del mapa (T-141): capturas reales del panel.
const LAPTOP_MAPA = [
  { nombre: 'cap-panel-mapa', alt: 'Centro de control actual del panel FOM: toda la flota en el mapa. Datos de demostración.' },
  { nombre: 'cap-panel-mapa-unidad', alt: 'Centro de control actual del panel FOM con una unidad seleccionada y su detalle. Datos de demostración.' },
]

// Televisor (T-144): el Resumen al encender y, al final, Alertas (el mapa ya lo muestra la laptop).
const TV_PANEL = [
  { nombre: 'cap-panel-resumen', alt: 'Resumen del panel FOM: 26 vehículos, 9 órdenes por resolver y 8 alertas nuevas. Datos de demostración.' },
  { nombre: 'cap-panel-alertas', alt: 'Alertas del panel FOM: excesos de velocidad sin leer. Datos de demostración.' },
]

const CIFRAS_SEGURIDAD = [stat('seguridad', 'Botón SOS, emergencias y privacidad'), stat('seguridad', 'Puntaje de manejo seguro')].map(cifra)
const CIFRAS_MAPA = [
  { valor: '10 s', etiqueta: stat('funciones', 'Rastreo GPS en tiempo real').label },
  cifra(stat('plataforma', 'Mapa general en vivo')),
  cifra(stat('plataforma', 'Captura y resguardo de datos')),
  cifra(stat('plataforma', 'Seguridad de datos y escalabilidad')),
]

// App en la calle: la falla que reporta el conductor y la orden ya resuelta (pantallas largas reales).
const TELEFONOS = [
  { nombre: 'cap-movil-mnt-reportar', alt: 'Reportar una falla en la app, vista del conductor: descripción, tipo Frenos, prioridad Alta y fotos de la falla. Datos de demostración.',
    pie: <><b className="v8-fuerte">Reporte de falla.</b> Con foto, desde la app.</>, corto: 'Reporte de falla con foto.' },
  { nombre: 'cap-movil-mnt-resuelta', alt: 'Orden resuelta en la app: resultado del trabajo, costo, tiempo hasta el cierre, fotos e historial. Datos de demostración.',
    pie: <><b className="v8-fuerte">Orden resuelta.</b> Con costo, fotos e historial.</>, corto: 'Orden resuelta, con su historial.' },
]

// La frase se enciende palabra por palabra al bajar y ocupa sola la pantalla (estilo Apple).
const FRASE = [
  'FOM reúne el trabajo de la oficina y del equipo en campo en una sola plataforma para flotas.',
  'Seguimiento, cuidado del vehículo y comunicación forman parte de una misma operación.',
]
const palabras = texto => texto.split(' ').map((p, i, todas) => <span key={i} className="inicio-palabra">{p}{i < todas.length - 1 ? ' ' : ''}</span>)

export default function InicioV8() {
  const raiz = useRef(null)

  useMomentoV8(raiz, ({ q, gsap, escritorio }) => {
    // 0 · La frase: queda sola en pantalla y cada palabra pasa de tenue a encendida con el scroll.
    //     En escritorio se queda fija mientras se enciende; en el teléfono se enciende al pasar.
    const frase = q('.inicio-frase-escena')[0]
    if (frase) {
      gsap.fromTo(q('.inicio-palabra'), { opacity: 0.12 }, {
        opacity: 1, ease: 'none', stagger: 0.1,
        scrollTrigger: escritorio
          ? { trigger: frase, start: 'center center', end: '+=120%', pin: true, scrub: 0.5 }
          : { trigger: frase, start: 'top 80%', end: 'bottom 45%', scrub: 0.5 },
      })
    }
    if (!escritorio) return
    // 2 · Escena fija: el panel (la foto de la oficina) se aparta a la derecha y entra el teléfono.
    //     Solo traslación y opacidad: la foto nunca se reescala.
    const escena = q('.inicio-duo-escena')[0]
    if (!escena) return
    const tl = gsap.timeline({ scrollTrigger: { trigger: escena, start: 'center center', end: '+=110%', pin: true, scrub: 0.6 } })
    tl.fromTo(q('.inicio-duo-foto'), { xPercent: -3 }, { xPercent: 5, ease: 'none' }, 0)
      .fromTo(q('.inicio-duo-telefono'), { yPercent: 45, opacity: 0 }, { yPercent: 0, opacity: 1, ease: 'none' }, 0.15)
      .fromTo(q('.inicio-duo-pie span:first-child'), { opacity: 1 }, { opacity: 0.45, ease: 'none' }, 0.4)
      .fromTo(q('.inicio-duo-pie span:last-child'), { opacity: 0.45 }, { opacity: 1, ease: 'none' }, 0.4)
    // Ya en su sitio, la pantalla del teléfono se desplaza sola (pantalla larga real de la app).
    const rollo = q('.inicio-duo-telefono .v8-pantalla-rollo')[0]
    if (rollo) {
      tl.fromTo(rollo, { yPercent: 0 }, { yPercent: -(parseFloat(rollo.dataset.v8Recorrido) || 0), ease: 'none', duration: 0.5 }, 0.62)
        .fromTo(q('.inicio-duo-telefono .v8-pantalla-funde'), { opacity: 0 }, { opacity: 1, ease: 'none', duration: 0.05 }, 0.62)
    }
  })

  return <SitioV8 raiz={raiz} titulo="FOM — Tu flota conectada. Tu operación, bajo control." descripcion="FOM reúne el trabajo de la oficina y del equipo en campo en una sola plataforma para flotas: panel web y una app para el conductor y el supervisor.">
    <HeroV8 className="inicio-hero"
      kicker="Flotas que mantienen el mundo en movimiento" kickerTinta
      titulo={['Tu flota conectada.', 'Tu operación, bajo control.']}
      bajada="La oficina y la carretera, en una misma plataforma."
      primaria={{ to: rutaV8('contacto'), texto: 'Solicitar demostración' }}
      secundaria={{ to: rutaV8('plataforma'), texto: 'Ver cómo funciona' }}
      foto={{ nombre: 'hero-monitor-carretera', movilNombre: 'inicio-hero-movil-v', alt: 'Monitor con el Resumen actual del panel FOM frente a la autopista al atardecer. Datos de demostración.', posicion: '70% 50%' }}
      nota={{ titulo: 'Panel web y app', texto: 'Sobre los mismos datos · Datos de demostración', accion: { to: rutaV8('plataforma'), texto: 'Conocer la plataforma' } }}
    />

    <NavLocalV8 titulo="Inicio" enlaces={LOCAL} />

    <SeccionV8 className="inicio-frase" aria-label="Qué es FOM" data-v8-3d="">
      <ContenedorV8 className="inicio-frase-escena">
        <p className="v8-frase inicio-frase-texto">{palabras(FRASE[0])} <span className="v8-t2">{palabras(FRASE[1])}</span></p>
      </ContenedorV8>
    </SeccionV8>

    <SeccionV8 id="plataforma" className="inicio-duo" aria-labelledby="inicio-duo-titulo">
      <ContenedorV8>
        <EncabezadoV8 centro id="inicio-duo-titulo" kicker="Plataforma web y app" titulo={['Panel en la oficina.', 'App en la calle.']}
          bajada={<><span className="v8-solo-escritorio">El supervisor trabaja desde la computadora con el panel completo y el conductor lleva la app en el teléfono. </span>Lo que hace uno lo ve el otro.</>}
          anchoBajada={700} />
      </ContenedorV8>
      <ContenedorV8 className="inicio-duo-escena">
        <FotoIntegradaV8 className="inicio-duo-foto" nombre="oficina-monitor-resumen" marco="redondo" sizes="(min-width: 1240px) 1136px, calc(100vw - 40px)"
          alt="Oficina de FOM con el Resumen actual del panel en el monitor. Datos de demostración." />
        <CapturaFlotanteV8 className="inicio-duo-telefono" nombre="cap-movil-sup-resumen" ancho={230}
          alt="Resumen actual en el teléfono del supervisor. Datos de demostración." />
        <p className="inicio-duo-pie v8-sm v8-t2">
          <span><b className="v8-fuerte">En la oficina.</b> Panel web del supervisor.</span>
          <span><b className="v8-fuerte">En el teléfono.</b> App del supervisor y del conductor.</span>
        </p>
      </ContenedorV8>
      <ContenedorV8 className="inicio-telefonos">
        <EscenaTelefonosV8 telefonos={TELEFONOS} etiqueta="La app: reporte de falla y orden resuelta" />
      </ContenedorV8>
      <ContenedorV8><RasgosV8 className="inicio-rasgos" items={RASGOS} /></ContenedorV8>
      {/* Enlace a la sección Inspecciones de Plataforma. */}
      <ContenedorV8>
        <p className="inicio-inspeccion v8-sm v8-t2" data-v8-aparece="">
          <b className="v8-fuerte">Inspección diaria desde la app:</b> el supervisor ve quién falta y lo que falla se vuelve orden de trabajo.{' '}
          <EnlaceV8 to={rutaV8('plataforma', 'inspecciones')}>Ver cómo funciona</EnlaceV8>
        </p>
      </ContenedorV8>
    </SeccionV8>

    <SeccionV8 id="funciones" banda aria-labelledby="inicio-funciones-titulo">
      <ContenedorV8 className="inicio-funciones-cab">
        <h2 id="inicio-funciones-titulo" className="v8-h2" data-v8-aparece="">Conoce las funciones.</h2>
        <EnlaceV8 to={rutaV8('funciones')}>Ver todas las funciones</EnlaceV8>
      </ContenedorV8>
      <CarruselV8 className="inicio-carrusel" etiqueta="Funciones de FOM, desliza para ver más">
        {FUNCIONES.map(f => <TarjetaCarruselV8 key={f.titulo} titulo={f.titulo} texto={f.texto}
          foto={f.foto && { ...f.foto, alto: undefined }}
          medio={f.captura && <CapturaFlotanteV8 nombre={f.captura.nombre} alt={f.captura.alt} ancho={220} className="inicio-carrusel-telefono" />}
          medioMovil={f.capturaMovil && <CapturaFlotanteV8 nombre={f.capturaMovil.nombre} alt={f.capturaMovil.alt} ancho={220} className="inicio-carrusel-telefono" />} />)}
      </CarruselV8>
    </SeccionV8>

    <SeccionV8 id="seguridad" aria-labelledby="inicio-seguridad-titulo">
      <EscenaV8 lado="derecha" marco="redondo" anchoTexto={520} posicionMovil="72% 50%"
        foto={{ nombre: 'conductor-sos', alt: 'Conductor de FOM revisando su teléfono junto al camión al atardecer.' }}>
        <p className="v8-kick" data-v8-aparece="">Seguridad del conductor</p>
        <h2 id="inicio-seguridad-titulo" className="v8-h2" data-v8-aparece="">Conducir mejor empieza por entender cada viaje.</h2>
        <p className="v8-lead" style={{ marginTop: 20 }} data-v8-aparece="">Un índice claro para acompañar al conductor y un botón SOS que avisa al supervisor con la ubicación del vehículo.</p>
        <BloqueCifrasV8 className="inicio-cifras-seguridad" columnas={2} cifras={CIFRAS_SEGURIDAD} />
        <p style={{ marginTop: 32 }}><EnlaceV8 to={rutaV8('seguridad')}>Conocer las herramientas de seguridad</EnlaceV8></p>
      </EscenaV8>
    </SeccionV8>

    <SeccionV8 id="mapa" aria-labelledby="inicio-mapa-titulo">
      <ContenedorV8>
        <EncabezadoV8 centro id="inicio-mapa-titulo" kicker="Mapa y GPS" titulo={['Toda tu flota.', 'Un solo mapa.']}
          bajada={<span className="v8-solo-escritorio">La ubicación de todas las unidades sobre una vista única y actualizada, con su identificación y estado.</span>} anchoBajada={680} />
      </ContenedorV8>
      <ContenedorV8 className="inicio-mapa-escena">
        <EscenaLaptopV8 etiqueta="Laptop con el Centro de control del panel FOM" pantallas={LAPTOP_MAPA} />
        <div className="inicio-mapa-chips">
          {CHIPS_MAPA.map(c => <ChipV8 key={c.titulo} {...c} />)}
        </div>
      </ContenedorV8>
      <ContenedorV8><BloqueCifrasV8 className="inicio-cifras-mapa" cifras={CIFRAS_MAPA} /></ContenedorV8>
    </SeccionV8>

    <SeccionV8 id="panel" className="inicio-tv" aria-labelledby="inicio-tv-titulo">
      <ContenedorV8>
        <EncabezadoV8 centro id="inicio-tv-titulo" kicker="Panel web" titulo={['Abre el panel.', 'Ahí está tu flota.']} anchoBajada={640}
          bajada="Al entrar, FOM te muestra el Resumen: la flota, las órdenes por resolver y las alertas nuevas." />
        <EscenaTelevisorV8 pantallas={TV_PANEL} etiqueta="Televisor que se enciende con la pantalla de carga de FOM y muestra el Resumen y las Alertas del panel" />
      </ContenedorV8>
    </SeccionV8>

    <SeccionV8 id="preguntas" banda aria-labelledby="inicio-faq-titulo">
      <ContenedorV8>
        <h2 id="inicio-faq-titulo" className="v8-h2 v8-centro" data-v8-aparece="">Preguntas frecuentes.</h2>
        <PreguntasV8 items={P.plataforma.faqs} />
        <p className="v8-centro inicio-faq-mas"><EnlaceV8 to={rutaV8('preguntas')}>Ver todas las preguntas</EnlaceV8></p>
      </ContenedorV8>
    </SeccionV8>

    <CtaFinalV8 />
  </SitioV8>
}
