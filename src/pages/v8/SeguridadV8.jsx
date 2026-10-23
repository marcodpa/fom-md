// Seguridad de la web v8 (T-106), fiel a los tableros «Seguridad · escritorio» (Seguridad.dc.html)
// y «Seguridad · teléfono» (Seguridad-movil.dc.html) del lienzo «Web FOM nueva».
// Animación (nota azul del tablero, solo 2 momentos):
//   1) Hero: entrada del titular y la foto (escalonada, al cargar).
//   1b) (T-144) «El aviso llega» en Eventos: el exceso de velocidad marcado en el panel viaja al
//      teléfono del supervisor (EscenaAlertaV8, escena fija solo ≥ 1024 px; se mueve sola).
//   2) Escena fija SOS: sobre la foto aparece el aviso «SOS · Respuesta guiada» (solo escritorio
//      ≥ 1024 px).
// Todo lo demás: quieto o aparición suave. Teléfono: sin escena fija.
import { useRef } from 'react'
import { PAGES } from '../../content/pages'
import {
  SitioV8, NavLocalV8, SeccionV8, ContenedorV8, EncabezadoV8, FotoIntegradaV8,
  TarjetaVidrioV8, EscenaV8, PreguntasV8, BotonV8, EnlaceV8, useMomentoV8, rutaV8,
} from '../../components/v8'
import { EscenaAlertaV8 } from '../../components/v8/escenasExtraV8'
import './seguridad-v8.css'

const S = PAGES.seguridad
const stat = titulo => S.sections.find(s => s.heading.startsWith(titulo)).stat

const LOCAL = [['eventos', 'Eventos'], ['video', 'Video'], ['coaching', 'Coaching'], ['puntaje', 'Puntaje'], ['sos', 'SOS']]

const EVENTOS = [
  ['Frenada brusca', 'Desaceleración sobre el umbral.'],
  ['Aceleración fuerte', 'Arranques agresivos.'],
  ['Exceso de velocidad', 'Comparado con el límite de la vía.'],
  ['Curvas cerradas', 'Giros con exceso de fuerza lateral.'],
  ['Umbrales ajustables', 'Por tipo de vehículo.'],
]
const EVENTOS_MOVIL = [
  ['Frenada brusca y aceleración fuerte', 'Con hora, ubicación y severidad.'],
  ['Exceso de velocidad', 'Comparado con el límite de la vía.'],
]

const VIDEO = [
  ['Clips por evento.', '10 segundos antes y después.'],
  ['Doble lente.', 'Hacia la vía y hacia la cabina.'],
  ['Respaldo de reclamos.', 'Evidencia objetiva ante terceros.'],
]

const PRIVACIDAD = [
  ['Video bajo demanda', 'La cabina solo se graba por evento o SOS.', 'Solo por evento o SOS.'],
  ['Acceso controlado', 'Solo personal autorizado ve los clips, y cada consulta queda registrada.', 'Cada consulta queda registrada.'],
  ['Reglas transparentes', 'El conductor sabe de antemano qué se registra.'],
]

const EVENTO = stat('Detección de eventos')
const PUNTAJE = stat('Puntaje de manejo')
const SOS = stat('Botón SOS')

// Cifra quieta con etiqueta distinta en escritorio y teléfono (el tablero móvil la acorta).
function Cifra({ valor, etiqueta, corta, className = '', ...resto }) {
  return <p className={`v8-cifra ${className}`} data-v8-aparece="" {...resto}>
    <strong>{valor}</strong>
    <span>{corta ? <><span className="seguridad-cifra-larga">{etiqueta}</span><span className="seguridad-cifra-corta">{corta}</span></> : etiqueta}</span>
  </p>
}

function AvisoSos({ className = '' }) {
  return <div className={`v8-vidrio seguridad-sos-aviso ${className}`}>
    <span className="seguridad-sos-sello" aria-hidden="true">SOS</span>
    <div><b>Respuesta guiada</b><p>El supervisor recibe el protocolo y coordina apoyo.</p></div>
  </div>
}

export default function SeguridadV8() {
  const raiz = useRef(null)

  useMomentoV8(raiz, ({ q, gsap, escritorio }) => {
    if (!escritorio) return
    // 2 · Escena fija SOS: la foto queda fija un tramo y sobre ella aparece el aviso «SOS ·
    //     Respuesta guiada». Solo traslación y opacidad del aviso; la foto no se mueve.
    const escena = q('.seguridad-sos-escena')[0]
    if (!escena) return
    gsap.timeline({ scrollTrigger: { trigger: escena, start: 'center center', end: '+=70%', pin: true, scrub: 0.6, anticipatePin: 1 } })
      .fromTo(q('.seguridad-sos-escena .seguridad-sos-aviso'), { y: 36, opacity: 0 }, { y: 0, opacity: 1, ease: 'none', duration: 0.6 })
      .to({}, { duration: 0.4 })
  })

  return <SitioV8 raiz={raiz} titulo="Seguridad — FOM" descripcion={S.subtitle}>
    <section className="seguridad-hero" aria-labelledby="seguridad-titulo">
      <div className="seguridad-hero-foto" data-v8-entra="">
        <FotoIntegradaV8 prioridad fundido="y" sizes="100vw" nombre="cabina-carretera"
          alt="Vista desde la cabina de una unidad en una carretera de montaña." />
      </div>
      <ContenedorV8 className="seguridad-hero-texto">
        <div className="seguridad-hero-caja">
          <p className="v8-kick" data-v8-entra="">{S.eyebrow}</p>
          <h1 id="seguridad-titulo" className="v8-h1">
            <span className="v8-linea" data-v8-entra="">Conductores protegidos, </span>
            <span className="v8-linea" data-v8-entra="">vehículos cuidados.</span>
          </h1>
          <p className="v8-lead" data-v8-entra="">
            <span className="v8-solo-escritorio">FOM detecta eventos de riesgo al volante, apoya el coaching del conductor y responde a emergencias sin exponer la privacidad de tu equipo.</span>
            <span className="v8-solo-movil">Eventos de riesgo, coaching y emergencias, cuidando la privacidad del equipo.</span>
          </p>
          <div className="v8-acciones is-izquierda" data-v8-entra="">
            <BotonV8 to={rutaV8('contacto')} tamano="lg">Solicitar demostración</BotonV8>
          </div>
        </div>
      </ContenedorV8>
    </section>

    <NavLocalV8 titulo="Seguridad" enlaces={LOCAL} />

    <SeccionV8 id="eventos" className="seguridad-eventos" aria-labelledby="seguridad-eventos-titulo">
      <ContenedorV8>
        <EncabezadoV8 centro className="seguridad-eventos-cab" id="seguridad-eventos-titulo"
          kicker={<><span className="v8-solo-escritorio">Detección de eventos de conducción</span><span className="v8-solo-movil">Detección de eventos</span></>}
          titulo={<>
            <span className="v8-solo-escritorio"><span className="v8-linea">Cada maniobra de riesgo,</span><span className="v8-linea">registrada con hora y lugar.</span></span>
            <span className="v8-solo-movil">Cada maniobra de riesgo, registrada.</span>
          </>}
          bajada={<span className="v8-solo-escritorio">Con el acelerómetro y la velocidad del vehículo. Así actúas sobre los patrones, no solo sobre incidentes aislados.</span>}
          anchoBajada={700} />
      </ContenedorV8>

      {/* T-144 · El aviso llega (EscenaAlertaV8, se mueve sola): el mismo exceso de velocidad en
          Alertas del panel y en la app del supervisor (antes eran dos capturas quietas). */}
      <ContenedorV8 className="seguridad-eventos-captura">
        <EscenaAlertaV8 etiqueta="Un exceso de velocidad aparece en Alertas del panel y llega a la app del supervisor" />
      </ContenedorV8>

      <ContenedorV8 className="seguridad-eventos-cajas is-escritorio">
        {EVENTOS.map(([t, x]) => <TarjetaVidrioV8 key={t} radio="tarjeta" data-v8-aparece="">
          <h3 className="v8-h4">{t}</h3><p className="v8-sm v8-t2">{x}</p>
        </TarjetaVidrioV8>)}
      </ContenedorV8>
      <ContenedorV8 className="seguridad-eventos-cajas is-movil">
        {EVENTOS_MOVIL.map(([t, x]) => <TarjetaVidrioV8 key={t} radio="tarjeta">
          <h3 className="v8-h4">{t}</h3><p className="v8-sm v8-t2">{x}</p>
        </TarjetaVidrioV8>)}
      </ContenedorV8>

      <ContenedorV8 className="seguridad-eventos-cifra">
        <Cifra valor={EVENTO.value} etiqueta={EVENTO.label} corta="entre el evento y la alerta al supervisor" />
      </ContenedorV8>
    </SeccionV8>

    <SeccionV8 id="video" banda className="seguridad-video" aria-labelledby="seguridad-video-titulo">
      <EscenaV8 lado="izquierda" marco="redondo" anchoTexto={480} posicionMovil="40% 50%"
        foto={{ nombre: 'camara-tablero', alt: 'Cámara a bordo en el parabrisas con un camión en la carretera.' }}>
        <p className="v8-kick" data-v8-aparece=""><span className="v8-solo-escritorio">Seguridad basada en video</span><span className="v8-solo-movil">Video</span></p>
        <h2 id="seguridad-video-titulo" className="v8-h2" data-v8-aparece=""><span className="v8-solo-escritorio">Un hecho verificable, no una discusión.</span><span className="v8-solo-movil">Un hecho verificable.</span></h2>
        <p className="v8-lead seguridad-video-lead" data-v8-aparece="">
          <span className="v8-solo-escritorio">El clip queda asociado al evento: el supervisor ve qué pasó en la vía.</span>
          <span className="v8-solo-movil">Clips de 10 segundos antes y después de cada evento.</span>
        </p>
        <ul className="seguridad-lista v8-sm v8-t2">
          {VIDEO.map(([b, t]) => <li key={b} data-v8-aparece=""><b className="v8-fuerte">{b}</b> {t}</li>)}
        </ul>
      </EscenaV8>
    </SeccionV8>

    <SeccionV8 id="coaching" className="seguridad-puntaje" aria-labelledby="seguridad-puntaje-titulo">
      <ContenedorV8 className="seguridad-puntaje-rejilla">
        <FotoIntegradaV8 className="seguridad-puntaje-foto" nombre="mano-app-perfil" marco="redondo" sizes="(min-width: 1240px) 640px, (min-width: 900px) 56vw, calc(100vw - 40px)"
          alt="Mano con el teléfono mostrando el índice de manejo seguro en la app actual. Datos de demostración." />
        <div className="seguridad-puntaje-texto">
          <p className="v8-kick" data-v8-aparece="">Puntaje y coaching</p>
          <h2 id="seguridad-puntaje-titulo" className="v8-h2" data-v8-aparece=""><span className="v8-solo-escritorio">Una cifra simple para conversar con el equipo.</span><span className="v8-solo-movil">Una cifra simple para conversar.</span></h2>
          <p className="v8-lead seguridad-puntaje-lead" data-v8-aparece="">El puntaje pondera frecuencia y severidad de los eventos según los kilómetros recorridos. El objetivo es corregir hábitos, no castigar.</p>
          <div id="puntaje" className="seguridad-cifras">
            <Cifra valor={PUNTAJE.value} etiqueta={PUNTAJE.label} corta="índice por conductor" />
            <Cifra valor="Semanal" etiqueta="resumen de eventos para cada conductor" corta="resumen de eventos" />
          </div>
          <ul className="seguridad-lista seguridad-puntaje-lista v8-sm v8-t2">
            <li data-v8-aparece=""><b className="v8-fuerte">Aviso en cabina,</b> en el momento de la maniobra.</li>
            <li data-v8-aparece=""><b className="v8-fuerte">Ranking del equipo</b> y metas por conductor.</li>
          </ul>
        </div>
      </ContenedorV8>
    </SeccionV8>

    <SeccionV8 id="sos" className="seguridad-sos" aria-labelledby="seguridad-sos-titulo">
      <EscenaV8 className="seguridad-sos-escena" lado="derecha" marco="redondo" anchoTexto={460} posicionMovil="72% 50%"
        foto={{ nombre: 'conductor-sos', alt: 'Conductor de FOM revisando su teléfono junto al camión al atardecer.' }}>
        <AvisoSos />
        <p className="v8-kick seguridad-sos-kick" data-v8-aparece="">Botón SOS</p>
        <h2 id="seguridad-sos-titulo" className="v8-h2" data-v8-aparece="">Ayuda con un toque.</h2>
        <p className="v8-lead seguridad-sos-lead" data-v8-aparece="">Ante robo, accidente o un problema de salud, la alerta llega de inmediato al panel con la ubicación del vehículo.</p>
        <Cifra className="seguridad-sos-cifra" valor={SOS.value} etiqueta={SOS.label} corta="del SOS a la alerta al supervisor" />
        <ul className="seguridad-lista seguridad-sos-lista-movil v8-sm v8-t2">
          {PRIVACIDAD.filter(p => p[2]).map(([t, , corto]) => <li key={t}><b className="v8-fuerte">{t}.</b> {corto}</li>)}
        </ul>
      </EscenaV8>
      <ContenedorV8 className="seguridad-privacidad">
        {PRIVACIDAD.map(([t, x]) => <div key={t} data-v8-aparece=""><h3 className="v8-h4">{t}</h3><p className="v8-sm v8-t2">{x}</p></div>)}
      </ContenedorV8>
    </SeccionV8>

    <SeccionV8 id="preguntas" className="seguridad-preguntas" aria-labelledby="seguridad-faq-titulo">
      <ContenedorV8>
        <h2 id="seguridad-faq-titulo" className="v8-h2 v8-centro" data-v8-aparece="">Preguntas sobre seguridad.</h2>
        <PreguntasV8 items={S.faqs} />
        <div className="seguridad-boton-movil v8-solo-movil"><BotonV8 to={rutaV8('contacto')} ancho>Solicitar demostración</BotonV8></div>
      </ContenedorV8>
    </SeccionV8>

    <SeccionV8 className="seguridad-cierre v8-solo-escritorio" aria-labelledby="seguridad-cierre-titulo">
      <ContenedorV8 className="v8-centro">
        <h2 id="seguridad-cierre-titulo" className="v8-h2" data-v8-aparece="">Una flota más segura empieza hoy.</h2>
        <div className="v8-acciones" data-v8-aparece="">
          <BotonV8 to={rutaV8('contacto')} tamano="lg">Solicitar demostración</BotonV8>
          <EnlaceV8 to={rutaV8('areas')}>Ver áreas</EnlaceV8>
        </div>
      </ContenedorV8>
    </SeccionV8>
  </SitioV8>
}
