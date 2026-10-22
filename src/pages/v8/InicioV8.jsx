// Inicio de la web v8 (T-104), fiel a los tableros «Inicio · escritorio» (Main.dc.html) e
// «Inicio · teléfono» (Inicio-movil.dc.html) del lienzo «Web FOM nueva».
// Animación (nota azul del tablero, solo 2 momentos):
//   1) Hero: el titular entra escalonado y la foto pasa de 92 % a 100 % al bajar (base: HeroV8).
//   2) Escena fija «Panel en la oficina. App en la calle.»: el panel se aparta y entra el teléfono
//      (solo escritorio ≥ 1024 px).
// Todo lo demás: quieto o aparición suave. Teléfono: sin escenas fijas, mismas piezas apiladas.
import { useRef } from 'react'
import { PAGES } from '../../content/pages'
import {
  SitioV8, NavLocalV8, HeroV8, SeccionV8, ContenedorV8, EncabezadoV8, FotoIntegradaV8, CapturaFlotanteV8,
  RasgosV8, CarruselV8, TarjetaCarruselV8, EscenaV8, BloqueCifrasV8, ChipV8, PreguntasV8, CtaFinalV8,
  EnlaceV8, useMomentoV8, rutaV8,
} from '../../components/v8'
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
  { icono: 'phone', titulo: 'App del conductor', texto: 'Inspección antes de salir, reporte de falla con foto y botón de emergencia, en el teléfono.' },
  { icono: 'database', titulo: 'Una sola base de datos', texto: 'Nadie pasa información de un lado a otro ni exporta archivos entre sistemas.' },
  { icono: 'cloud', titulo: 'Aguanta sin señal', texto: 'La app guarda lo que el conductor registra y lo sincroniza al volver la cobertura.' },
]

const FUNCIONES = [
  { titulo: 'Rastreo GPS en tiempo real', texto: 'Posición cada 10 segundos con el vehículo en movimiento.', foto: { nombre: 'operadora-mapa', alt: 'Operadora de FOM frente al Centro de control actual. Datos de demostración.' } },
  { titulo: 'Telemática y diagnóstico', texto: 'Batería, motor, kilometraje y códigos de falla de cada unidad.', foto: { nombre: 'telematica', alt: 'Camioneta FOM con el motor y el equipo de telemática a la vista.' } },
  { titulo: 'Mantenimiento preventivo', texto: 'Avisos por kilómetro o fecha y órdenes de trabajo con historial.', captura: { nombre: 'cap-movil-cond-mantenimiento', alt: 'Mantenimiento de la unidad en la app actual. Datos de demostración.' } },
  { titulo: 'Reportes y analítica', texto: 'Costo por kilómetro, uso y disponibilidad. En PDF o Excel.', foto: { nombre: 'oficina-reportes', alt: 'Monitor con los Reportes actuales del panel FOM. Datos de demostración.' } },
  { titulo: 'Inspección en campo', texto: 'El conductor revisa su unidad con la app antes de salir.', foto: { nombre: 'tecnico-app-unidad', alt: 'Conductor de FOM con su unidad abierta en la app, junto al camión.', posicion: '40% 50%' } },
  { titulo: 'Alertas operativas', texto: 'Exceso de velocidad, motor encendido detenido y mantenimiento vencido.', captura: { nombre: 'cap-movil-sup-alertas', alt: 'Alertas actuales en la app del supervisor. Datos de demostración.' } },
]

const CHIPS_MAPA = [
  { icono: 'pin', titulo: 'Posición en vivo', texto: 'Cada 10 segundos, con rumbo y velocidad.' },
  { icono: 'route', titulo: 'Historial de recorrido', texto: 'La ruta de cualquier día, con paradas y kilómetros.' },
  { icono: 'gauge', titulo: 'Estado de la unidad', texto: 'En movimiento, detenida con motor encendido o apagada.' },
]

const CIFRAS_SEGURIDAD = [stat('seguridad', 'Botón SOS, emergencias y privacidad'), stat('seguridad', 'Puntaje de manejo seguro')].map(cifra)
const CIFRAS_MAPA = [
  { valor: '10 s', etiqueta: stat('funciones', 'Rastreo GPS en tiempo real').label },
  cifra(stat('plataforma', 'Mapa general en vivo')),
  cifra(stat('plataforma', 'Captura y resguardo de datos')),
  cifra(stat('plataforma', 'Seguridad de datos y escalabilidad')),
]

export default function InicioV8() {
  const raiz = useRef(null)

  useMomentoV8(raiz, ({ q, gsap, escritorio }) => {
    if (!escritorio) return
    // 2 · Escena fija: el panel (la foto de la oficina) se aparta a la derecha y entra el teléfono.
    //     Solo traslación y opacidad: la foto nunca se reescala.
    const escena = q('.inicio-duo-escena')[0]
    if (!escena) return
    const tl = gsap.timeline({ scrollTrigger: { trigger: escena, start: 'center center', end: '+=90%', pin: true, scrub: 0.6 } })
    tl.fromTo(q('.inicio-duo-foto'), { xPercent: -3 }, { xPercent: 5, ease: 'none' }, 0)
      .fromTo(q('.inicio-duo-telefono'), { yPercent: 45, opacity: 0 }, { yPercent: 0, opacity: 1, ease: 'none' }, 0.15)
      .fromTo(q('.inicio-duo-pie span:first-child'), { opacity: 1 }, { opacity: 0.45, ease: 'none' }, 0.4)
      .fromTo(q('.inicio-duo-pie span:last-child'), { opacity: 0.45 }, { opacity: 1, ease: 'none' }, 0.4)
  })

  return <SitioV8 raiz={raiz} titulo="FOM — Tu flota conectada. Tu operación, bajo control." descripcion="FOM reúne el trabajo de la oficina y del equipo en campo en una sola plataforma para flotas: panel web para el supervisor y app para el conductor.">
    <HeroV8
      kicker="Flotas que mantienen el mundo en movimiento" kickerTinta
      titulo={['Tu flota conectada.', 'Tu operación, bajo control.']}
      bajada="La oficina y la carretera, en una misma plataforma."
      primaria={{ to: rutaV8('contacto'), texto: 'Solicitar demostración' }}
      secundaria={{ to: rutaV8('plataforma'), texto: 'Ver cómo funciona' }}
      foto={{ nombre: 'hero-monitor-carretera', alt: 'Monitor con el Resumen actual del panel FOM frente a la autopista al atardecer. Datos de demostración.', posicion: '70% 50%' }}
      nota={{ titulo: 'Panel web y app del conductor', texto: 'Sobre los mismos datos · Datos de demostración', accion: { to: rutaV8('plataforma'), texto: 'Conocer la plataforma' } }}
    />

    <NavLocalV8 titulo="Inicio" enlaces={LOCAL} />

    <SeccionV8 className="inicio-frase" aria-label="Qué es FOM">
      <ContenedorV8>
        <p className="v8-frase" data-v8-aparece="">FOM reúne el trabajo de la oficina y del equipo en campo en una sola plataforma para flotas. <span className="v8-t2">Seguimiento, cuidado del vehículo y comunicación forman parte de una misma operación.</span></p>
      </ContenedorV8>
    </SeccionV8>

    <SeccionV8 id="plataforma" className="inicio-duo" aria-labelledby="inicio-duo-titulo">
      <ContenedorV8>
        <EncabezadoV8 centro id="inicio-duo-titulo" kicker="Plataforma web y app" titulo={['Panel en la oficina.', 'App en la calle.']}
          bajada={<><span className="v8-solo-escritorio">El supervisor trabaja desde la computadora con el panel completo y el conductor lleva la app en el teléfono. </span>Lo que hace uno lo ve el otro.</>}
          anchoBajada={700} />
      </ContenedorV8>
      <div className="inicio-duo-escena">
        <FotoIntegradaV8 className="inicio-duo-foto" nombre="oficina-monitor-resumen" fundido="o" sizes="100vw"
          alt="Oficina de FOM con el Resumen actual del panel en el monitor. Datos de demostración." />
        <CapturaFlotanteV8 className="inicio-duo-telefono" nombre="cap-movil-sup-resumen" ancho={230}
          alt="Resumen actual en el teléfono del supervisor. Datos de demostración." />
        <p className="inicio-duo-pie v8-sm v8-t2">
          <span><b className="v8-fuerte">En la oficina.</b> Panel web del supervisor.</span>
          <span><b className="v8-fuerte">En la carretera.</b> App del conductor.</span>
        </p>
      </div>
      <ContenedorV8><RasgosV8 className="inicio-rasgos" items={RASGOS} /></ContenedorV8>
    </SeccionV8>

    <SeccionV8 id="funciones" banda aria-labelledby="inicio-funciones-titulo">
      <ContenedorV8 className="inicio-funciones-cab">
        <h2 id="inicio-funciones-titulo" className="v8-h2" data-v8-aparece="">Conoce las funciones.</h2>
        <EnlaceV8 to={rutaV8('funciones')}>Ver todas las funciones</EnlaceV8>
      </ContenedorV8>
      <CarruselV8 className="inicio-carrusel" etiqueta="Funciones de FOM, desliza para ver más">
        {FUNCIONES.map(f => <TarjetaCarruselV8 key={f.titulo} titulo={f.titulo} texto={f.texto}
          foto={f.foto && { ...f.foto, alto: undefined }}
          medio={f.captura && <CapturaFlotanteV8 nombre={f.captura.nombre} alt={f.captura.alt} ancho={220} className="inicio-carrusel-telefono" />} />)}
      </CarruselV8>
    </SeccionV8>

    <SeccionV8 id="seguridad" aria-labelledby="inicio-seguridad-titulo">
      <EscenaV8 lado="derecha" ancho="72%" anchoTexto={520} posicionMovil="72% 50%"
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
      <div className="inicio-mapa-escena">
        <FotoIntegradaV8 className="inicio-mapa-foto" nombre="patio-monitor-mapa" fundido="y" sizes="100vw" posicion="62% 50%"
          alt="Monitor con el Centro de control actual frente al patio de la flota al anochecer. Datos de demostración." />
        <ContenedorV8 className="inicio-mapa-chips">
          {CHIPS_MAPA.map(c => <ChipV8 key={c.titulo} {...c} />)}
        </ContenedorV8>
      </div>
      <ContenedorV8><BloqueCifrasV8 className="inicio-cifras-mapa" cifras={CIFRAS_MAPA} /></ContenedorV8>
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
