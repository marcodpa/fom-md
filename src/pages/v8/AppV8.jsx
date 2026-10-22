// App del conductor de la web v8 (T-105), fiel a los tableros «App · escritorio» (App.dc.html) y
// «App · teléfono» (App-movil.dc.html) del lienzo «Web FOM nueva».
// Animación (nota azul del tablero, solo 2 momentos):
//   1) Hero: el titular entra escalonado y la foto entra suave desde la derecha.
//   2) Escena fija «Todo lo del día, en tres pantallas»: los tres teléfonos (Mi unidad,
//      Mantenimiento, Mi perfil) entran uno tras otro (solo escritorio ≥ 1024 px).
// Todo lo demás: quieto o aparición suave. Teléfono: las pantallas en carrusel con el dedo, sin
// animación.
import { useRef } from 'react'
import {
  SitioV8, NavLocalV8, SeccionV8, ContenedorV8, EncabezadoV8, FotoIntegradaV8, CapturaFlotanteV8, EscenaV8,
  TarjetaVidrioV8, CarruselV8, BotonV8, EnlaceV8, useMomentoV8, rutaV8,
} from '../../components/v8'
import './app-v8.css'

const LOCAL = [['pantallas', 'Pantallas'], ['inspeccion', 'Inspección'], ['mi-unidad', 'Mi unidad'], ['indice', 'Índice de manejo']]

// Las tres pantallas de la app actual (capturas reales, datos de demostración).
const PANTALLAS = [
  { nombre: 'cap-movil-cond-inicio', titulo: 'Mi unidad.', texto: 'Dónde está y qué te toca hoy.', corto: 'Qué te toca hoy.', ancho: 280,
    alt: 'Mi unidad en la app actual: unidad, estado de señal e índice de manejo. Datos de demostración.' },
  { nombre: 'cap-movil-cond-mantenimiento', titulo: 'Mantenimiento.', texto: 'Las órdenes asignadas a ti.', corto: 'Tus órdenes.', ancho: 300,
    alt: 'Mantenimiento de mi unidad en la app actual, con órdenes asignadas. Datos de demostración.' },
  { nombre: 'cap-movil-cond-perfil', titulo: 'Mi perfil.', texto: 'Tus datos, tu manejo y tus documentos.', corto: 'Tu manejo y tus documentos.', ancho: 280,
    alt: 'Mi perfil en la app actual, con el índice de manejo seguro. Datos de demostración.' },
]

const pie = (titulo, texto) => <><b className="v8-fuerte">{titulo}</b> {texto}</>

// Escala del puntaje (pages.js → seguridad) y los dos períodos que ofrece la app (7 y 30 días).
// El tablero del teléfono acorta las etiquetas.
const CIFRAS_INDICE = {
  escritorio: [{ valor: '0-100', etiqueta: 'escala del índice por conductor' }, { valor: '7 / 30 días', etiqueta: 'períodos para revisar tu manejo' }],
  movil: [{ valor: '0-100', etiqueta: 'escala del índice' }, { valor: '7 / 30', etiqueta: 'días para revisar tu manejo' }],
}

// Texto distinto en escritorio y en el teléfono (el tablero del teléfono lo acorta).
const Dos = ({ e, m }) => <><span className="v8-solo-escritorio">{e}</span><span className="v8-solo-movil">{m}</span></>

export default function AppV8() {
  const raiz = useRef(null)

  useMomentoV8(raiz, ({ q, gsap, escritorio }) => {
    // 1 · Hero: la foto entra suave (el titular lo hace la base con data-v8-entra).
    const foto = q('.app-hero-foto')
    if (foto.length) gsap.from(foto, { opacity: 0, xPercent: escritorio ? 4 : 0, y: escritorio ? 0 : 20, duration: 1.2, ease: 'power2.out', delay: 0.15, clearProps: 'transform,opacity' })

    if (!escritorio) return
    // 2 · Escena fija: los tres teléfonos entran uno tras otro. Solo traslación y opacidad.
    const escena = q('.app-pantallas-escena')[0]
    if (!escena) return
    const barras = 96 // navegación global (44) + local (52)
    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: escena, pin: true, scrub: 0.6, end: '+=110%', invalidateOnRefresh: true,
        start: () => {
          const libre = window.innerHeight - barras
          const alto = escena.offsetHeight
          return alto < libre ? `top ${barras + (libre - alto) / 2}px` : 'bottom bottom'
        },
      },
    })
    q('.app-pantalla').forEach((tel, i) => {
      tl.fromTo(tel, { yPercent: 28, opacity: 0 }, { yPercent: 0, opacity: 1, ease: 'none', duration: 1 }, i * 0.75)
    })
  })

  return <SitioV8 raiz={raiz} titulo="App del conductor — FOM" descripcion="Consulta el estado del vehículo, realiza la inspección y revisa tu perfil desde la app que acompaña al conductor.">
    <section className="v8-hero app-hero" aria-labelledby="v8-titulo">
      <div className="app-hero-escena">
        <FotoIntegradaV8 className="app-hero-foto" nombre="mano-app-perfil" fundido="l" prioridad sizes="(min-width: 900px) 62vw, 100vw" posicion="28% 50%"
          alt="Mano sosteniendo un teléfono con el perfil actual de la app FOM frente a la flota. Datos de demostración." />
        <div className="v8-c app-hero-texto">
          <div className="app-hero-caja">
            <p className="v8-kick" data-v8-entra="">App del conductor</p>
            <h1 id="v8-titulo" className="v8-h1 app-hero-titulo"><span data-v8-entra="" className="app-hero-linea">Tu unidad y tu jornada, en tu teléfono.</span></h1>
            <p className="v8-lead app-hero-lead" data-v8-entra="">
              <Dos e="Consulta el estado del vehículo, realiza la inspección y revisa tu perfil desde la app que acompaña al conductor."
                m="Estado del vehículo, inspección y tu perfil, en la app que acompaña al conductor." />
            </p>
            <div className="v8-acciones is-izquierda" data-v8-entra="">
              <BotonV8 to={rutaV8('contacto')} tamano="lg">Solicitar demostración</BotonV8>
              <EnlaceV8 to="#pantallas" className="app-solo-escritorio">Ver las pantallas</EnlaceV8>
            </div>
          </div>
        </div>
      </div>
    </section>

    <NavLocalV8 titulo="App del conductor" enlaces={LOCAL} />

    <SeccionV8 id="pantallas" className="app-pantallas" aria-labelledby="app-pantallas-titulo">
      <div className="v8-glow app-pantallas-glow" aria-hidden="true" />
      <ContenedorV8>
        <EncabezadoV8 centro id="app-pantallas-titulo" titulo={['Todo lo del día,', 'en tres pantallas.']} anchoBajada={640}
          bajada={<Dos e="Mi unidad, mantenimiento y mi perfil. Las mismas que ve el conductor hoy." m="Desliza para verlas." />} />
      </ContenedorV8>
      <div className="app-pantallas-escena">
        <ContenedorV8 className="app-pantallas-fila">
          {PANTALLAS.map(p => <CapturaFlotanteV8 key={p.nombre} className="app-pantalla" nombre={p.nombre} alt={p.alt} ancho={p.ancho}
            nota={pie(p.titulo, p.texto)} />)}
        </ContenedorV8>
      </div>
      <CarruselV8 className="app-pantallas-carrusel" etiqueta="Pantallas de la app del conductor, desliza para ver más">
        {PANTALLAS.map(p => <CapturaFlotanteV8 key={p.nombre} className="app-pantalla-movil" nombre={p.nombre} alt={p.alt} ancho={250}
          nota={pie(p.titulo, p.corto)} />)}
      </CarruselV8>
      <p className="v8-nota-demo">Capturas reales de la app · Datos de demostración</p>
    </SeccionV8>

    <SeccionV8 id="inspeccion" banda aria-labelledby="app-inspeccion-titulo">
      <EscenaV8 lado="derecha" marco="redondo" anchoTexto={470} posicionMovil="75% 50%"
        foto={{ nombre: 'tecnico-app-unidad', alt: 'Técnico de FOM con Mi unidad abierta en el teléfono junto al camión. Datos de demostración.' }}>
        <p className="v8-kick" data-v8-aparece="">Inspección</p>
        <h2 id="app-inspeccion-titulo" className="v8-h2" data-v8-aparece="">Una inspección que queda registrada.</h2>
        <p className="v8-lead app-mt-lead" data-v8-aparece="">
          <Dos e="Revisa los puntos de la unidad y registra su condición desde el teléfono. La oficina da seguimiento a los hallazgos."
            m="Revisa la unidad desde el teléfono; la oficina da seguimiento a los hallazgos." />
        </p>
        <ul className="app-lista v8-sm v8-t2 app-solo-escritorio">
          <li data-v8-aparece=""><b className="v8-fuerte">Lista de revisión por vehículo.</b></li>
          <li data-v8-aparece=""><b className="v8-fuerte">Registro de observaciones y fallas,</b> con foto.</li>
        </ul>
      </EscenaV8>
    </SeccionV8>

    <SeccionV8 id="mi-unidad" aria-labelledby="app-unidad-titulo">
      <ContenedorV8 className="v8-split is-inverso app-unidad">
        <div className="app-unidad-medio">
          <FotoIntegradaV8 className="app-unidad-foto" nombre="camion-lateral-fom" marco="redondo" sizes="(min-width: 1240px) 640px, 56vw"
            alt="Camión blanco de FOM estacionado en el patio, con el lema de la marca." />
          <CapturaFlotanteV8 className="app-unidad-telefono" nombre="cap-movil-cond-mapa" ancho={210}
            alt="Mi mapa en la app actual, con la unidad asignada. Datos de demostración." />
        </div>
        <div className="app-unidad-texto">
          <p className="v8-kick" data-v8-aparece="">Mi unidad</p>
          <h2 id="app-unidad-titulo" className="v8-h2" data-v8-aparece="">El estado de tu unidad, a mano.</h2>
          <p className="v8-lead app-mt-lead" data-v8-aparece="">
            <Dos e="Desde Inicio, el conductor consulta la información de su vehículo y encuentra accesos a inspecciones, mantenimiento y alertas."
              m="Información en tiempo real y accesos rápidos a las tareas. Aguanta sin señal." />
          </p>
          <ul className="app-lista v8-sm v8-t2 app-solo-escritorio">
            <li data-v8-aparece=""><b className="v8-fuerte">Información en tiempo real.</b></li>
            <li data-v8-aparece=""><b className="v8-fuerte">Accesos rápidos a las tareas.</b></li>
            <li data-v8-aparece=""><b className="v8-fuerte">Aguanta sin señal:</b> guarda lo registrado y lo sincroniza al volver la cobertura.</li>
          </ul>
        </div>
      </ContenedorV8>
    </SeccionV8>

    <SeccionV8 id="indice" banda aria-labelledby="app-indice-titulo">
      <ContenedorV8 className="v8-split app-indice">
        <div>
          <p className="v8-kick" data-v8-aparece="">Índice de manejo</p>
          <h2 id="app-indice-titulo" className="v8-h2" data-v8-aparece="">Conoce tu índice de manejo.</h2>
          <p className="v8-lead app-mt-lead" data-v8-aparece="">
            <Dos e="Tus datos, documentos y el índice de conducción. Sus indicadores ayudan a entender qué aspectos del manejo requieren atención."
              m="Tus indicadores te dicen qué aspectos del manejo requieren atención." />
          </p>
          {Object.entries(CIFRAS_INDICE).map(([medida, cifras]) => <div key={medida} className={`v8-cifras app-indice-cifras app-solo-${medida}`} style={{ '--v8-cols': 2 }}>
            {cifras.map(c => <p className="v8-cifra" key={c.etiqueta} data-v8-aparece=""><strong>{c.valor}</strong><span>{c.etiqueta}</span></p>)}
          </div>)}
        </div>
        <div className="app-indice-medio">
          <FotoIntegradaV8 className="app-indice-foto" nombre="camioneta-ciudad" marco="redondo" sizes="(min-width: 1240px) 640px, 56vw"
            alt="Camioneta de la flota circulando por una avenida con montañas al fondo." />
          <TarjetaVidrioV8 className="app-indice-caja" data-v8-aparece="">
            <h3 className="v8-h4">Frenadas, aceleraciones y excesos</h3>
            <p className="v8-sm v8-t2">Los eventos de manejo se cuentan por cada 100 km recorridos.</p>
          </TarjetaVidrioV8>
          <CapturaFlotanteV8 className="app-indice-telefono" nombre="cap-movil-cond-perfil" ancho={240}
            alt="Mi perfil en la app actual con el índice de manejo seguro. Datos de demostración." />
        </div>
      </ContenedorV8>
    </SeccionV8>

    <SeccionV8 className="app-cta v8-centro" aria-labelledby="app-cta-titulo">
      <ContenedorV8>
        <h2 id="app-cta-titulo" className="v8-h2" data-v8-aparece="">La oficina y el conductor, conectados.</h2>
        <p className="v8-lead app-cta-texto v8-solo-escritorio" data-v8-aparece="">Conoce el panel web y la app con una demostración de FOM.</p>
        <div className="v8-acciones" data-v8-aparece="">
          <BotonV8 to={rutaV8('contacto')} tamano="lg" className="app-cta-boton">Solicitar demostración</BotonV8>
          <EnlaceV8 to={rutaV8('plataforma')} className="app-solo-escritorio">Ver el panel web</EnlaceV8>
        </div>
      </ContenedorV8>
    </SeccionV8>
  </SitioV8>
}
