// Áreas de la web v8 (T-107), fiel a los tableros «Áreas · escritorio» (Areas.dc.html) y
// «Áreas · teléfono» (Areas-movil.dc.html) del lienzo «Web FOM nueva».
// Animación (nota azul del tablero, solo 2 momentos):
//   1) Hero: el titular entra escalonado y la foto aérea pasa de 92 % a 100 % al bajar (HeroV8).
//   2) Escena fija de geocercas: la foto aérea se acerca (de 88 % a 100 %, nunca por encima) y
//      aparecen las etiquetas de entrada, salida y horario (solo escritorio ≥ 1024 px).
// Todo lo demás: aparición suave. Teléfono: sin escena fija, piezas apiladas como su tablero.
import { useRef } from 'react'
import { PAGES } from '../../content/pages'
import {
  SitioV8, NavLocalV8, HeroV8, SeccionV8, ContenedorV8, EncabezadoV8, FotoIntegradaV8, CapturaFlotanteV8,
  RasgosV8, TarjetaVidrioV8, PreguntasV8, BotonV8, IconoV8, useMomentoV8, rutaV8,
} from '../../components/v8'
import './areas-v8.css'

const P = PAGES.areas

const LOCAL = [['grupos', 'Grupos'], ['geocercas', 'Geocercas'], ['multisitio', 'Multi-sitio'], ['acceso', 'Acceso']]

// Agrupa la flota. Escritorio: lista con el título en negrita; teléfono: las tres primeras, más cortas.
const GRUPOS = [
  { titulo: 'Por zona geográfica', texto: 'Cabimas, Ciudad Ojeda, Lagunillas y Bachaquero en grupos independientes.', movil: 'Cabimas, Ciudad Ojeda, Lagunillas y Bachaquero.' },
  { titulo: 'Por empresa o sede', texto: 'Según la razón social o el patio de resguardo.', movil: 'Según la razón social o el patio.' },
  { titulo: 'Por contrato', texto: 'Las unidades de un contrato, para reportar por cliente.', movil: 'Para reportar por cliente.' },
  { titulo: 'Etiquetas múltiples', texto: 'Una unidad en una zona y un contrato a la vez.' },
]

// Flechas de entrada y salida del tablero (no están en ICONOS_V8): mismo trazo 1,5.
const ICONO_ENTRADA = <svg className="v8-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 12h12m-4-4 4 4-4 4M20 4v16" /></svg>
const ICONO_SALIDA = <svg className="v8-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20 12H8m4-4-4 4 4 4M4 4v16" /></svg>

const ETIQUETAS = [
  { clase: 'is-entrada', icono: ICONO_ENTRADA, titulo: 'Alerta de entrada', texto: 'Una gandola llega al muelle asignado.' },
  { clase: 'is-salida', icono: ICONO_SALIDA, titulo: 'Alerta de salida', texto: <><span className="v8-solo-escritorio">Una unidad sale</span><span className="v8-solo-movil">Sale</span> de la zona fuera de horario.</> },
  { clase: 'is-horario', icono: <IconoV8 nombre="clock" />, titulo: 'Zonas por horario', texto: 'Entradas de 6:00 a. m. a 6:00 p. m.' },
]

const MULTISITIO = [
  { titulo: 'Vista consolidada', texto: 'Todas las sedes en un solo mapa.' },
  { titulo: 'Filtro por sitio', texto: 'Un municipio, un patio o un contrato.' },
  { titulo: 'Estado por zona', texto: 'Cuántas unidades hay en cada geocerca.' },
  { titulo: 'Conteo por grupo', texto: 'La distribución de la flota de un vistazo.' },
]

const ACCESO = [
  { titulo: 'Permisos por grupo', texto: 'Solo los grupos asignados.' },
  { titulo: 'Roles por sede', texto: 'Coordinadores, jefes de patio y supervisores.' },
  { titulo: 'Alertas dirigidas', texto: 'Solo las de sus zonas.', soloEscritorio: true },
  { titulo: 'Registro de accesos', texto: 'Quién consultó qué y cuándo.' },
]

// Preguntas: escritorio = las cuatro de pages.js; teléfono = las dos del tablero, más cortas.
const PREGUNTAS_MOVIL = [
  { q: '¿Una unidad en zona y contrato a la vez?', a: 'Sí, con etiquetas múltiples y sin duplicar registros.' },
  { q: '¿Las alertas llegan en tiempo real?', a: P.faqs[2].a },
]

export default function AreasV8() {
  const raiz = useRef(null)

  useMomentoV8(raiz, ({ q, gsap, escritorio }) => {
    if (!escritorio) return
    // 2 · Escena fija de geocercas: la foto se acerca hasta su tamaño (nunca más de 1) y las tres
    //     etiquetas aparecen una tras otra. Solo transform y opacidad.
    const escena = q('.areas-geo-escena')[0]
    if (!escena) return
    const tl = gsap.timeline({ scrollTrigger: { trigger: escena, start: 'center 55%', end: '+=110%', pin: true, scrub: 0.6 } })
    tl.fromTo(q('.areas-geo-foto'), { scale: 0.88, transformOrigin: '50% 50%' }, { scale: 1, ease: 'none', duration: 1 }, 0)
    q('.areas-geo-etiqueta').forEach((el, i) => {
      tl.fromTo(el, { opacity: 0, y: 24 }, { opacity: 1, y: 0, ease: 'none', duration: 0.3 }, 0.35 + i * 0.25)
    })
  })

  return <SitioV8 raiz={raiz} titulo="Áreas y flota — FOM" descripcion={P.subtitle}>
    <HeroV8
      kicker={P.eyebrow}
      titulo={['Organiza tu flota por', 'zona, sede o contrato.']}
      bajada={<>
        <span className="v8-solo-escritorio">Agrupa vehículos, define geocercas con alertas de entrada y salida, y controla el acceso por área. Todo se configura desde el panel web.</span>
        <span className="v8-solo-movil">Grupos, geocercas y acceso por área, desde el panel web.</span>
      </>}
      bajadaAngosta
      primaria={{ to: rutaV8('contacto'), texto: 'Solicitar demostración' }}
      foto={{ nombre: 'aerea-terminal', alt: 'Vista aérea nocturna de una terminal de carga con camiones y patios iluminados.' }}
      className="areas-hero"
    />

    <NavLocalV8 titulo="Áreas" enlaces={LOCAL} />

    <SeccionV8 id="grupos" className="areas-grupos" aria-labelledby="areas-grupos-titulo">
      <ContenedorV8 className="v8-split areas-grupos-split">
        <div>
          <EncabezadoV8 kicker="Agrupa la flota" id="areas-grupos-titulo" titulo="Como opera tu empresa."
            bajada={<span className="v8-solo-escritorio">Cada responsable ve solo lo que le corresponde. Una flota de 80 a 150 unidades se ordena en minutos.</span>}
            className="areas-grupos-cab" />
          <div className="v8-solo-escritorio"><ul className="areas-grupos-lista v8-sm v8-t2">
            {GRUPOS.map(g => <li key={g.titulo} data-v8-aparece=""><b className="v8-fuerte">{g.titulo}.</b> {g.texto}</li>)}
          </ul></div>
        </div>
        <FotoIntegradaV8 className="areas-grupos-foto" nombre="fila-flota" fundido="o" sizes="(min-width: 900px) 58vw, 100vw" posicion="40% 50%"
          alt="Supervisor de FOM con una tableta junto a la fila de camiones de la flota de noche." />
        <div className="v8-solo-movil"><ul className="areas-grupos-movil">
          {GRUPOS.filter(g => g.movil).map(g => <li key={g.titulo}><h3 className="v8-h4">{g.titulo}</h3><p className="v8-sm v8-t2">{g.movil}</p></li>)}
        </ul></div>
      </ContenedorV8>
    </SeccionV8>

    <SeccionV8 id="geocercas" banda className="areas-geo" aria-labelledby="areas-geo-titulo">
      <ContenedorV8>
        <EncabezadoV8 centro kicker="Geocercas" id="areas-geo-titulo" titulo="Sabe cuándo entra y cuándo sale."
          bajada={<span className="v8-solo-escritorio">Dibuja zonas sobre patios, muelles, pozos y rutas de la Costa Oriental. Cada zona avisa sola, con hora y grupo.</span>}
          className="areas-geo-cab" />
      </ContenedorV8>
      <div className="areas-geo-escena">
        <FotoIntegradaV8 className="areas-geo-foto" nombre="aerea-taller" fundido="o" sizes="(min-width: 900px) 90vw, 100vw"
          alt="Vista aérea de un taller y patio de flota con camiones estacionados." />
        <div className="areas-geo-etiquetas">
          {ETIQUETAS.map(e => <div key={e.titulo} className={`v8-vidrio v8-chip areas-geo-etiqueta ${e.clase}`}>
            {e.icono}
            <div><b>{e.titulo}</b><p>{e.texto}</p></div>
          </div>)}
        </div>
      </div>
    </SeccionV8>

    <SeccionV8 id="multisitio" className="areas-multi" aria-labelledby="areas-multi-titulo">
      <ContenedorV8>
        <EncabezadoV8 centro kicker={<><span className="v8-solo-escritorio">Operación multi-sitio</span><span className="v8-solo-movil">Multi-sitio</span></>}
          id="areas-multi-titulo" titulo="Todos los sitios en un solo tablero."
          bajada={<span className="v8-solo-escritorio">El coordinador ve el conjunto; cada jefe de patio ve lo suyo.</span>}
          anchoBajada={700} className="areas-multi-cab" />
        <div className="areas-multi-captura v8-solo-escritorio">
          <CapturaFlotanteV8 nombre="cap-panel-mapa" nota
            alt="Centro de control actual del panel FOM con las unidades sobre el mapa del Zulia. Datos de demostración." />
        </div>
        <div className="areas-multi-telefono v8-solo-movil">
          <CapturaFlotanteV8 nombre="cap-movil-sup-mapa" ancho={240} nota="Captura real · Datos de demostración"
            alt="Centro de control actual en el teléfono, con las unidades en el mapa. Datos de demostración." />
        </div>
        <div className="v8-solo-escritorio"><RasgosV8 className="areas-multi-rasgos" items={MULTISITIO} /></div>
      </ContenedorV8>
    </SeccionV8>

    <SeccionV8 id="acceso" banda className="areas-acceso" aria-labelledby="areas-acceso-titulo">
      <ContenedorV8>
        <EncabezadoV8 kicker={<><span className="v8-solo-escritorio">Control de acceso por área</span><span className="v8-solo-movil">Control de acceso</span></>}
          id="areas-acceso-titulo" titulo="Cada quien ve sus unidades."
          bajada={<span className="v8-solo-escritorio">El jefe de patio de Ciudad Ojeda ve sus unidades; el coordinador general ve todo.</span>}
          className="areas-acceso-cab" />
        <ul className="v8-g4 areas-acceso-cajas">
          {ACCESO.map(a => <TarjetaVidrioV8 as="li" key={a.titulo} className={a.soloEscritorio ? 'v8-solo-escritorio' : undefined} data-v8-aparece="">
            <h3 className="v8-h4">{a.titulo}</h3>
            <p className="v8-sm v8-t2">{a.texto}</p>
          </TarjetaVidrioV8>)}
        </ul>
      </ContenedorV8>
    </SeccionV8>

    <SeccionV8 className="areas-preguntas" aria-labelledby="areas-faq-titulo">
      <ContenedorV8>
        <h2 id="areas-faq-titulo" className="v8-h2 v8-centro" data-v8-aparece="">Preguntas sobre áreas.</h2>
        <div className="v8-solo-escritorio"><PreguntasV8 items={P.faqs} /></div>
        <div className="v8-solo-movil"><PreguntasV8 items={PREGUNTAS_MOVIL} /></div>
      </ContenedorV8>
    </SeccionV8>

    <SeccionV8 className="areas-cierre" aria-labelledby="areas-cierre-titulo">
      <ContenedorV8 className="v8-centro">
        <h2 id="areas-cierre-titulo" className="v8-h2" data-v8-aparece="">Ordena tu flota como trabajas.</h2>
        <div className="v8-acciones" data-v8-aparece=""><BotonV8 to={rutaV8('contacto')} tamano="lg" className="areas-cierre-boton">Solicitar demostración</BotonV8></div>
      </ContenedorV8>
    </SeccionV8>
  </SitioV8>
}
