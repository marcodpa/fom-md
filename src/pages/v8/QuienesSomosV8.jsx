// Quiénes somos de la web v8 (T-107), fiel a los tableros «Quiénes somos · escritorio»
// (Quienes-somos.dc.html) y «Quiénes somos · teléfono» (Quienes-somos-movil.dc.html).
// Animación (nota azul del tablero, 1 momento): entrada del titular del hero. Página tranquila:
// sin escenas fijas y sin crecimiento de la foto del hero; el resto, quieto o con aparición suave.
// T-145 (Marco): la foto del atardecer es el hero, a pantalla completa y con el texto encima (como
// Seguridad), sin capa oscura: el texto va sobre los cerros oscuros de la izquierda con una sombra
// de texto suave, y la foto se funde con el fondo solo por abajo.
import { useRef } from 'react'
import {
  SitioV8, SeccionV8, ContenedorV8, EncabezadoV8, FotoIntegradaV8, TarjetaVidrioV8,
  BotonV8, EnlaceV8, useMomentoV8, rutaV8,
} from '../../components/v8'
import './quienes-somos-v8.css'

const PRINCIPIOS = [
  { titulo: 'Conectar', texto: 'Vehículos, conductores y responsables en un mismo flujo.',
    foto: { nombre: 'carretera-curvas', alt: 'Carretera de montaña con curvas al atardecer.' } },
  { titulo: 'Entender', texto: 'Ubicación, historial y estado claros para cada rol.',
    foto: { nombre: 'cap-panel-mapa', alt: 'Centro de control actual del panel FOM con las unidades en el mapa. Datos de demostración.' } },
  { titulo: 'Actuar', texto: <>Alertas e inspecciones <span className="v8-solo-escritorio">que permiten </span><span className="v8-solo-movil">para </span>atender lo importante.</>,
    foto: { nombre: 'tecnico-app-unidad', alt: 'Técnico de FOM con la app abierta junto al camión.', posicion: '70% 50%' } },
]

export default function QuienesSomosV8() {
  const raiz = useRef(null)
  useMomentoV8(raiz)

  return <SitioV8 raiz={raiz} titulo="Quiénes somos — FOM" descripcion="FOM es una plataforma para conectar a las personas, los vehículos y la información de una operación en movimiento.">
    <section className="qs-hero" aria-labelledby="qs-titulo">
      <div className="qs-hero-foto" data-v8-entra="">
        {/* marco="plano": la versión -plena (sin bordes transparentes); el fundido de abajo lo
            pone la hoja de la página. En el teléfono, su recorte vertical -plena-movil. */}
        <FotoIntegradaV8 prioridad marco="plano" sizes="100vw" nombre="autopista-atardecer" className="qs-hero-img"
          alt="Camión de la flota en la autopista al atardecer, entre montañas." />
      </div>
      <ContenedorV8 className="qs-hero-texto">
        <div className="qs-hero-caja">
          <p className="v8-kick" data-v8-entra="">Quiénes somos</p>
          <h1 id="qs-titulo" className="v8-h1">
            <span className="v8-linea" data-v8-entra="">Una forma más clara de </span>
            <span className="v8-linea" data-v8-entra="">cuidar y coordinar tu flota.</span>
          </h1>
          <p className="v8-lead" data-v8-entra="">
            <span className="v8-solo-escritorio">FOM es una plataforma para conectar a las personas, los vehículos y la información de una operación en movimiento.</span>
            <span className="v8-solo-movil">Conectamos a las personas, los vehículos y la información de una operación en movimiento.</span>
          </p>
        </div>
      </ContenedorV8>
    </section>

    <SeccionV8 className="qs-forma" aria-labelledby="qs-forma-titulo">
      <ContenedorV8 className="qs-forma-rejilla">
        <EncabezadoV8 kicker="Nuestra forma de trabajar" id="qs-forma-titulo" titulo="La oficina y la carretera, conectadas." />
        <div className="qs-forma-texto v8-lead" data-v8-aparece="">
          <p className="v8-solo-escritorio">Una flota genera decisiones a cada momento: dónde está una unidad, qué necesita para salir y qué ocurrió en el camino.</p>
          <p className="v8-solo-escritorio qs-forma-tinta">FOM reúne esas respuestas en el panel web y en la app, para el supervisor y el conductor.</p>
          <p className="v8-solo-escritorio">El objetivo es que cada persona encuentre la información que necesita para actuar: supervisores desde la consola y conductores desde su teléfono.</p>
          <p className="v8-solo-movil">Una flota genera decisiones a cada momento. FOM reúne esas respuestas en el panel web y en la app, para el supervisor y el conductor.</p>
        </div>
      </ContenedorV8>
    </SeccionV8>

    <ContenedorV8 className="qs-fila">
      <FotoIntegradaV8 className="qs-fila-foto" nombre="supervisor-fila" marco="redondo" sizes="(min-width: 1240px) 1136px, calc(100vw - 40px)"
        alt="Supervisor de FOM frente a la fila de camiones de la flota de noche." />
    </ContenedorV8>

    <SeccionV8 banda className="qs-principios" aria-labelledby="qs-principios-titulo">
      <ContenedorV8>
        <EncabezadoV8 centro id="qs-principios-titulo" titulo="De cada dato a una acción concreta." className="qs-principios-cab"
          bajada={<span className="v8-solo-escritorio">Recorridos, alertas, inspecciones y mantenimiento comparten una misma vista de la operación.</span>} />
        <ul className="qs-principios-lista">
          {PRINCIPIOS.map(p => <TarjetaVidrioV8 as="li" key={p.titulo} caja={false} className="qs-principio" data-v8-aparece="">
            <FotoIntegradaV8 className="qs-principio-foto" marco="plano" alto={260} sizes="(min-width: 1180px) 380px, (min-width: 900px) 32vw, 100vw" {...p.foto} />
            <div className="qs-principio-texto">
              <h3 className="v8-h3">{p.titulo}</h3>
              <p className="v8-t2">{p.texto}</p>
            </div>
          </TarjetaVidrioV8>)}
        </ul>
      </ContenedorV8>
    </SeccionV8>

    <SeccionV8 className="qs-cierre" aria-labelledby="qs-cierre-titulo">
      <ContenedorV8 className="v8-centro">
        <h2 id="qs-cierre-titulo" className="qs-cierre-frase" data-v8-aparece="">
          <span className="v8-linea">Flotas que mantienen</span> <span className="v8-linea">el mundo en movimiento.</span>
        </h2>
        <div className="v8-acciones" data-v8-aparece="">
          <BotonV8 to={rutaV8('contacto')} tamano="lg" className="qs-cierre-boton">Solicitar demostración</BotonV8>
          <span className="v8-solo-escritorio"><EnlaceV8 to={rutaV8('preguntas')}>Resuelve tus dudas</EnlaceV8></span>
        </div>
      </ContenedorV8>
    </SeccionV8>
  </SitioV8>
}
