// Contacto de la web v8 (T-109), fiel a los tableros «Contacto · escritorio» (Contacto.dc.html) y
// «Contacto · teléfono» (Contacto-movil.dc.html) del lienzo «Web FOM nueva».
// Animación (nota azul del tablero, 1 momento):
//   1) Hero: entrada del titular y de la tarjeta del formulario (data-v8-entra, lo hace la base).
// Resto quieto: ninguna otra marca data-v8-*.
// El formulario es el de hoy (FormularioContactoV8): arma el correo hacia contacto@fom.app y abre
// la aplicación de correo; no llama a ningún servidor.
import { useRef } from 'react'
import { PAGES } from '../../content/pages'
import {
  SitioV8, SeccionV8, ContenedorV8, FotoIntegradaV8, EscenaV8, ListaPasosV8, TarjetaVidrioV8, FormularioContactoV8,
  PreguntasV8, useMomentoV8, CORREO_FOM,
} from '../../components/v8'
import './contacto-v8.css'

const P = PAGES.contacto
const seccion = titulo => P.sections.find(s => s.heading === titulo)
const DEMO = seccion('Solicita tu demostración').stat
const CANALES = seccion('Canales de contacto').stat
const INSTALACION = seccion('Instalación e implementación').stat
const minuscula = s => s.charAt(0).toLowerCase() + s.slice(1)

const PASOS = [
  { titulo: 'Contacto', texto: 'Te escribimos en menos de 24 horas hábiles.' },
  { titulo: 'Demostración', texto: 'Sesión en vivo con tu equipo.' },
  { titulo: 'Propuesta', texto: 'Equipos, plan mensual y tiempos.' },
  { titulo: 'Instalación', texto: 'GPS colocados y cuentas activas.' },
  { titulo: 'Arranque', texto: 'Capacitación y soporte continuo.' },
]

const DEMOSTRACION = [
  ['Sin costo.', 'Gratuita y sin obligación de contratar.'],
  ['En vivo.', 'De 30 a 45 minutos, por videollamada o presencial en Caracas.'],
  ['A tu medida.', 'El ejemplo se ajusta a tu tipo de flota.'],
  ['Con tu equipo.', 'Operaciones y administración evalúan juntos.'],
]

export default function ContactoV8() {
  const raiz = useRef(null)
  // Solo el momento 1 (entrada del hero), que la base hace sola con data-v8-entra.
  useMomentoV8(raiz)

  return <SitioV8 raiz={raiz} titulo="Contacto — FOM" descripcion="Solicita una demostración sin costo de FOM, conoce los equipos y coordina la instalación de tu flota.">
    <section className="contacto-hero" aria-labelledby="contacto-titulo">
      <FotoIntegradaV8 className="contacto-hero-foto" nombre="furgoneta-ruta" fundido="y" prioridad sizes="100vw"
        alt="Furgoneta FOM en la carretera al atardecer." />
      <div className="v8-c contacto-hero-c">
        <div className="contacto-hero-texto">
          <p className="v8-kick" data-v8-entra="">{P.eyebrow}</p>
          <h1 id="contacto-titulo" className="v8-h1 contacto-h1" data-v8-entra="">Empieza a controlar tu flota con FOM.</h1>
          <p className="v8-lead contacto-hero-bajada" data-v8-entra="">
            <span className="v8-solo-escritorio">Solicita una demostración sin costo, conoce los equipos y coordina la instalación. Te acompañamos hasta tener toda tu flota en línea.</span>
            <span className="v8-solo-movil">Demostración sin costo, equipos e instalación.</span>
          </p>
          <p className="v8-cifra contacto-hero-cifra" data-v8-entra=""><strong>{DEMO.value}</strong><span>{minuscula(DEMO.label)}</span></p>
        </div>
        <div className="contacto-hero-form" data-v8-entra="">
          <FormularioContactoV8 />
        </div>
      </div>
    </section>

    <SeccionV8 banda className="contacto-pasos" aria-labelledby="contacto-pasos-titulo">
      <ContenedorV8>
        <h2 id="contacto-pasos-titulo" className="v8-h2 contacto-pasos-titulo">Qué pasa después<span className="v8-solo-escritorio"> de solicitarla</span>.</h2>
        <ListaPasosV8 variante="linea" className="contacto-pasos-lista" pasos={PASOS} />
      </ContenedorV8>
    </SeccionV8>

    <SeccionV8 banda className="contacto-demo" aria-labelledby="contacto-demo-titulo">
      <ContenedorV8 className="v8-split">
        <FotoIntegradaV8 nombre="reunion" fundido="o" sizes="(min-width: 1240px) 480px, (min-width: 900px) 40vw, 100vw"
          alt="Sala de reuniones de FOM con vista al patio de la flota." />
        <div>
          <p className="v8-kick">La demostración</p>
          <h2 id="contacto-demo-titulo" className="v8-h2">En vivo, a tu medida y sin costo.</h2>
          <ul className="contacto-demo-lista v8-sm v8-t2">
            {DEMOSTRACION.map(([b, t]) => <li key={b}><b className="v8-fuerte">{b}</b> {t}</li>)}
          </ul>
        </div>
      </ContenedorV8>
    </SeccionV8>

    <SeccionV8 className="contacto-canales" aria-labelledby="contacto-canales-titulo">
      <ContenedorV8>
        <div className="contacto-canales-cab">
          <h2 id="contacto-canales-titulo" className="v8-h2">Escríbenos por donde prefieras.</h2>
          <p className="v8-cifra contacto-canales-cifra v8-solo-escritorio"><strong>{CANALES.value}</strong><span>{minuscula(CANALES.label)}</span></p>
        </div>
        <ul className="v8-g4 contacto-canales-lista">
          <li><TarjetaVidrioV8 className="contacto-canal"><h3 className="v8-h4">WhatsApp</h3><p className="v8-sm v8-t2">Atención comercial de lunes a viernes.</p></TarjetaVidrioV8></li>
          <li><TarjetaVidrioV8 className="contacto-canal"><h3 className="v8-h4">Correo</h3><p className="v8-sm v8-t2 v8-solo-escritorio">Cotizaciones formales y empresas.</p><p className="contacto-canal-correo"><a href={`mailto:${CORREO_FOM}`}>{CORREO_FOM}</a></p></TarjetaVidrioV8></li>
          <li><TarjetaVidrioV8 className="contacto-canal"><h3 className="v8-h4">Teléfono</h3><p className="v8-sm v8-t2">Clientes activos y visitas técnicas.</p></TarjetaVidrioV8></li>
          <li className="v8-solo-escritorio"><TarjetaVidrioV8 as="a" href="#solicitud-demo" className="contacto-canal is-enlace"><h3 className="v8-h4">Formulario web</h3><p className="v8-sm v8-t2">Deja tus datos y te contactamos.</p></TarjetaVidrioV8></li>
        </ul>
      </ContenedorV8>
    </SeccionV8>

    <SeccionV8 banda className="contacto-instalacion" aria-labelledby="contacto-instalacion-titulo">
      <EscenaV8 lado="derecha" ancho="60%" anchoTexto={480} posicionMovil="75% 50%" altoMovil={340}
        foto={{ nombre: 'instalacion-gps', alt: 'Técnico de FOM instalando el equipo GPS bajo el tablero de un camión.' }}>
        <p className="v8-kick v8-solo-escritorio">Instalación, soporte y cobertura</p>
        <h2 id="contacto-instalacion-titulo" className="v8-oculto">Instalación, soporte y cobertura</h2>
        <p className="v8-cifra contacto-instalacion-cifra"><strong>{INSTALACION.value}</strong><span>{minuscula(INSTALACION.label)}</span></p>
        <p className="v8-lead contacto-instalacion-texto v8-solo-escritorio">Soporte por WhatsApp, centro de ayuda y capacitación incluida.</p>
        <p className="v8-sm v8-t2 contacto-instalacion-cobertura"><b className="v8-fuerte">Cobertura nacional:</b> Caracas, Valencia, Maracaibo, Barquisimeto y Maracay.</p>
      </EscenaV8>
    </SeccionV8>

    <SeccionV8 className="contacto-faq" aria-labelledby="contacto-faq-titulo">
      <ContenedorV8>
        <h2 id="contacto-faq-titulo" className="v8-h2 v8-centro">Preguntas antes de empezar.</h2>
        <PreguntasV8 items={P.faqs} />
      </ContenedorV8>
    </SeccionV8>
  </SitioV8>
}
