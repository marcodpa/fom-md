// Plataforma de la web v8 (T-105), fiel a los tableros «Plataforma · escritorio»
// (Plataforma.dc.html) y «Plataforma · teléfono» (Plataforma-movil.dc.html) del lienzo «Web FOM nueva».
// Animación (nota azul del tablero, solo 2 momentos):
//   1) Hero: el titular entra escalonado y la foto pasa de 92 % a 100 % al bajar (base: HeroV8).
//   2) Escena fija «Un panel único»: la captura real del panel sube hasta su sitio y se queda
//      (solo escritorio ≥ 1024 px). La captura nunca se reescala: sube con traslación y opacidad.
// Todo lo demás: quieto o aparición suave. Teléfono: sin escena fija, mismas piezas apiladas.
import { useRef } from 'react'
import { PAGES } from '../../content/pages'
import {
  SitioV8, NavLocalV8, HeroV8, SeccionV8, ContenedorV8, EncabezadoV8, FotoIntegradaV8, CapturaFlotanteV8,
  RasgosV8, EscenaV8, BloqueCifrasV8, ChipV8, TarjetaVidrioV8, PreguntasV8, BotonV8, EnlaceV8, useMomentoV8, rutaV8,
} from '../../components/v8'
import './plataforma-v8.css'

const P = PAGES.plataforma
const stat = titulo => P.sections.find(s => s.heading.startsWith(titulo)).stat
const cifra = s => ({ valor: s.value, etiqueta: s.label })

const LOCAL = [
  ['panel', 'Panel único'], ['web-app', 'Web y app'], ['mapa', 'Mapa'], ['datos', 'Datos'], ['roles', 'Roles'], ['seguridad', 'Seguridad'],
]

const RASGOS = [
  { icono: 'grid', titulo: 'Tablero central', texto: 'Resumen de unidades activas, inactivas y en ruta al abrir la plataforma.' },
  { icono: 'monitor', titulo: 'Acceso web', texto: 'Funciona en computadora, tableta o teléfono sin instalar programas.' },
  { icono: 'layers', titulo: 'Vista consistente', texto: 'La misma estructura y navegación para toda la flota, sin importar el tamaño.' },
  { icono: 'users', titulo: 'Multiusuario', texto: 'Varios operadores trabajan al mismo tiempo sobre los mismos datos.' },
]

const WEB_APP = [
  ['Panel del supervisor.', 'Mapa en vivo, órdenes de trabajo, inspecciones, documentos, personal y reportes.'],
  ['App del conductor.', 'Inspección antes de salir, reporte de falla con foto y botón de emergencia.'],
  ['Una sola base de datos.', 'Nadie exporta archivos entre sistemas.'],
  ['Aguanta sin señal.', 'La app sincroniza al volver la cobertura.'],
]

// `movil: false` = el tablero del teléfono no lo muestra.
const CHIPS_MAPA = [
  { titulo: 'Posiciones al instante', texto: 'Todas las unidades en un mismo mapa.' },
  { titulo: 'Identificación clara', texto: 'Placa o nombre de cada unidad.', movil: false },
  { titulo: 'Filtros rápidos', texto: 'Por grupo o estado de conexión.' },
  { titulo: 'Agrupación inteligente', texto: 'El mapa agrupa unidades cercanas.', movil: false },
]

const DATOS = [
  ['Recepción continua.', 'Los datos llegan en segundos.'],
  ['Tolerancia a cortes.', 'Sin señal, el equipo guarda y envía después.'],
  ['Sin infraestructura propia.', 'FOM administra el almacenamiento.'],
]

const ROLES = [
  { titulo: 'Supervisor de empresa', texto: 'Mapa en vivo, reportes, órdenes de trabajo y gestión de sus propios conductores.' },
  { titulo: 'Supervisor personal', texto: 'Su flota propia con mapa, alertas y documentos, sin el panel corporativo.' },
  { titulo: 'Conductor', texto: 'App con inspección diaria, órdenes de trabajo y jornada. No accede a la administración.' },
]

const SEGURIDAD = [
  { titulo: 'Cifrado', texto: 'Los datos viajan y se guardan cifrados.' },
  { titulo: 'Respaldos', movil: 'Respaldos periódicos', texto: 'Copias regulares del historial.' },
  { titulo: 'Alta disponibilidad', texto: 'Operativa de forma constante.', soloEscritorio: true },
  { titulo: 'Escala sin migrar', texto: 'De 10 a cientos de unidades.' },
  { titulo: 'Rendimiento estable', texto: 'Igual con flotas pequeñas o grandes.', soloEscritorio: true },
]

export default function PlataformaV8() {
  const raiz = useRef(null)

  useMomentoV8(raiz, ({ q, gsap, escritorio }) => {
    if (!escritorio) return
    // 2 · Escena fija «Un panel único»: la captura queda fija bajo las barras y sube hasta su
    //     sitio mientras se desplaza. Solo traslación y opacidad (las capturas no se reescalan).
    const escena = q('.plat-panel-escena')[0]
    if (!escena) return
    const barras = 96 // navegación global (44) + local (52)
    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: escena, pin: true, scrub: 0.6, end: '+=75%', invalidateOnRefresh: true,
        // Centrada en el espacio libre bajo las barras; si no cabe, se fija por su borde inferior.
        start: () => {
          const libre = window.innerHeight - barras
          const alto = escena.offsetHeight
          return alto < libre ? `top ${barras + (libre - alto) / 2}px` : 'bottom bottom'
        },
      },
    })
    tl.fromTo(q('.plat-panel-captura'), { yPercent: 16, opacity: 0.35 }, { yPercent: 0, opacity: 1, ease: 'none' })
  })

  return <SitioV8 raiz={raiz} titulo="Plataforma — FOM" descripcion={P.subtitle}>
    <HeroV8 className="plat-hero"
      kicker={P.eyebrow}
      titulo={['Toda tu flota', 'en un solo panel.']}
      bajada={<><span className="v8-solo-escritorio">{P.subtitle}</span><span className="v8-solo-movil">Un panel web para la computadora y una app para el conductor, sobre los mismos datos.</span></>}
      bajadaAngosta
      primaria={{ to: rutaV8('contacto'), texto: 'Solicitar demostración' }}
      secundaria={{ to: '#panel', texto: 'Ver el panel' }}
      foto={{ nombre: 'oficina-monitor-resumen', alt: 'Oficina de FOM con el Resumen actual del panel en el monitor. Datos de demostración.', posicion: '62% 50%' }}
    />

    <NavLocalV8 titulo="Plataforma" enlaces={LOCAL} />

    <SeccionV8 id="panel" className="plat-panel" aria-labelledby="plat-panel-titulo">
      <ContenedorV8>
        <EncabezadoV8 centro id="plat-panel-titulo" titulo={['Un panel único', 'para toda la flota.']}
          bajada={<><span className="v8-solo-escritorio">El supervisor ve el estado general de la flota apenas inicia sesión. Sin módulos sueltos ni ventanas separadas.</span><span className="v8-solo-movil">El estado general de la flota apenas inicias sesión.</span></>} />
      </ContenedorV8>
      <div className="plat-panel-escena">
        <ContenedorV8 className="plat-panel-marco">
          <CapturaFlotanteV8 className="plat-panel-captura" nombre="cap-panel-resumen" nota
            alt="Resumen actual del panel FOM: flota, vehículos en tiempo real y vehículo seleccionado. Datos de demostración." />
        </ContenedorV8>
      </div>
      <ContenedorV8>
        <RasgosV8 className="plat-rasgos" items={RASGOS} />
      </ContenedorV8>
    </SeccionV8>

    <SeccionV8 id="web-app" banda aria-labelledby="plat-webapp-titulo">
      <ContenedorV8 className="v8-split plat-webapp">
        <div>
          <p className="v8-kick" data-v8-aparece="">Web y app</p>
          <h2 id="plat-webapp-titulo" className="v8-h2" data-v8-aparece="">Panel en la oficina, app en la calle.</h2>
          <p className="v8-lead plat-mt-lead" data-v8-aparece="">
            <span className="v8-solo-escritorio">La inspección que firma el conductor aparece en el panel, y la orden de trabajo que abre el supervisor le llega al conductor.</span>
            <span className="v8-solo-movil">La inspección del conductor aparece en el panel y la orden de trabajo le llega al conductor.</span>
          </p>
          <ul className="plat-lista v8-sm v8-t2 plat-solo-escritorio">
            {WEB_APP.map(([b, t]) => <li key={b} data-v8-aparece=""><b className="v8-fuerte">{b}</b> {t}</li>)}
          </ul>
        </div>
        <div className="plat-webapp-medio">
          <FotoIntegradaV8 className="plat-webapp-foto" nombre="operadora-mapa" fundido="o" sizes="(min-width: 900px) 58vw, 100vw"
            alt="Operadora de FOM frente al Centro de control actual. Datos de demostración." />
          <CapturaFlotanteV8 className="plat-webapp-telefono" nombre="cap-movil-sup-mapa" ancho={200}
            alt="Centro de control actual en el teléfono. Datos de demostración." />
        </div>
      </ContenedorV8>
    </SeccionV8>

    <SeccionV8 id="mapa" aria-labelledby="plat-mapa-titulo">
      <ContenedorV8>
        <EncabezadoV8 centro id="plat-mapa-titulo" kicker="Mapa general en vivo"
          titulo={<><span className="v8-solo-escritorio">La foto completa de la flota, en tiempo real.</span><span className="v8-solo-movil">La foto completa de la flota.</span></>} />
      </ContenedorV8>
      <div className="plat-mapa-escena">
        <FotoIntegradaV8 className="plat-mapa-foto" nombre="patio-monitor-mapa" fundido="y" sizes="100vw" posicion="62% 50%"
          alt="Monitor con el Centro de control actual frente al patio de la flota. Datos de demostración." />
        <ContenedorV8 className="plat-mapa-chips">
          {CHIPS_MAPA.map(c => <ChipV8 key={c.titulo} titulo={c.titulo} texto={c.texto} className={c.movil === false ? 'plat-sin-movil' : undefined} data-v8-aparece="" />)}
        </ContenedorV8>
      </div>
      <ContenedorV8><BloqueCifrasV8 className="plat-cifra-mapa" centro columnas={1} cifras={[cifra(stat('Mapa general'))]} /></ContenedorV8>
    </SeccionV8>

    <SeccionV8 id="datos" className="plat-datos plat-banda-movil" aria-labelledby="plat-datos-titulo">
      <EscenaV8 lado="izquierda" ancho="60%" anchoTexto={500} posicionMovil="30% 50%" altoMovil={360}
        foto={{ nombre: 'servidores', alt: 'Pasillo de servidores con luces azules.' }}>
        <p className="v8-kick" data-v8-aparece="">Captura y resguardo de datos</p>
        <h2 id="plat-datos-titulo" className="v8-h2" data-v8-aparece="">Tu historial, sin administrar servidores.</h2>
        <p className="v8-lead plat-mt-lead v8-solo-escritorio" data-v8-aparece="">Los equipos GPS reportan por red celular y cada dato se conserva para consultarlo después.</p>
        <BloqueCifrasV8 className="plat-cifra-datos" columnas={1} cifras={[cifra(stat('Captura y resguardo'))]} />
        <ul className="plat-lista is-corta v8-sm v8-t2 plat-solo-escritorio">
          {DATOS.map(([b, t]) => <li key={b} data-v8-aparece=""><b className="v8-fuerte">{b}</b> {t}</li>)}
        </ul>
      </EscenaV8>
    </SeccionV8>

    <SeccionV8 id="roles" className="plat-roles plat-banda-escritorio" aria-labelledby="plat-roles-titulo">
      <ContenedorV8>
        <EncabezadoV8 centro className="plat-roles-cab" id="plat-roles-titulo" kicker="Roles y permisos" titulo="Cada persona entra a lo que le corresponde." />
      </ContenedorV8>
      <FotoIntegradaV8 className="plat-roles-foto" nombre="equipo-roles" fundido="y" sizes="100vw" posicion="35% 50%"
        alt="Equipo de operaciones de FOM revisando la flota en una laptop." />
      <ContenedorV8 className="v8-g3 plat-roles-cajas">
        {ROLES.map(r => <TarjetaVidrioV8 key={r.titulo} data-v8-aparece="">
          <h3 className="v8-h4">{r.titulo}</h3><p className="v8-sm v8-t2">{r.texto}</p>
        </TarjetaVidrioV8>)}
      </ContenedorV8>
      <ContenedorV8 as="p" className="v8-centro v8-sm v8-t2 plat-roles-nota v8-solo-escritorio">Jerarquía de mando: cada quien gestiona solo a los de rango menor. Todo queda en auditoría.</ContenedorV8>
    </SeccionV8>

    <SeccionV8 id="seguridad" className="plat-seguridad plat-banda-movil" aria-labelledby="plat-seguridad-titulo">
      <ContenedorV8>
        <div className="plat-seguridad-cab">
          <h2 id="plat-seguridad-titulo" className="v8-h2" data-v8-aparece="">Seguridad de datos y escalabilidad.</h2>
          <BloqueCifrasV8 className="plat-cifra-seguridad" columnas={1} cifras={[cifra(stat('Seguridad de datos'))]} />
        </div>
        <ul className="v8-g5 plat-seguridad-cajas plat-solo-escritorio">
          {SEGURIDAD.map(s => <TarjetaVidrioV8 as="li" key={s.titulo} data-v8-aparece="">
            <h3 className="v8-h4">{s.titulo}</h3><p className="v8-sm v8-t2">{s.texto}</p>
          </TarjetaVidrioV8>)}
        </ul>
        <ul className="plat-lista v8-sm v8-t2 plat-solo-movil">
          {SEGURIDAD.filter(s => !s.soloEscritorio).map(s => <li key={s.titulo}><b className="v8-fuerte">{s.movil || s.titulo}.</b> {s.texto}</li>)}
        </ul>
      </ContenedorV8>
    </SeccionV8>

    <SeccionV8 id="preguntas" className="plat-preguntas plat-banda-escritorio" aria-labelledby="plat-faq-titulo">
      <ContenedorV8>
        <h2 id="plat-faq-titulo" className="v8-h2 v8-centro" data-v8-aparece="">Preguntas sobre la plataforma.</h2>
        <PreguntasV8 items={P.faqs} />
        <div className="plat-faq-boton v8-solo-movil"><BotonV8 to={rutaV8('contacto')} ancho>Solicitar demostración</BotonV8></div>
      </ContenedorV8>
    </SeccionV8>

    <SeccionV8 className="plat-cta v8-centro" aria-labelledby="plat-cta-titulo">
      <ContenedorV8>
        <h2 id="plat-cta-titulo" className="v8-h2" data-v8-aparece="">Mírala con tu propia flota.</h2>
        <p className="v8-lead plat-cta-texto" data-v8-aparece="">Una demostración en vivo, sin costo y a la medida de tu operación.</p>
        <div className="v8-acciones" data-v8-aparece="">
          <BotonV8 to={rutaV8('contacto')} tamano="lg">Solicitar demostración</BotonV8>
          <EnlaceV8 to={rutaV8('app')}>Conocer la app del conductor</EnlaceV8>
        </div>
      </ContenedorV8>
    </SeccionV8>
  </SitioV8>
}
