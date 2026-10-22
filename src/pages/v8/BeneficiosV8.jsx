// Beneficios de la web v8 (T-108), fiel a los tableros «Beneficios · escritorio» (Beneficios.dc.html)
// y «Beneficios · teléfono» (Beneficios-movil.dc.html).
// Animación (nota azul del tablero, 2 momentos):
//   1) Hero: el titular entra escalonado y la foto pasa de 92 % a 100 % al bajar.
//   2) Recorrido fijo «Lo que cambia en el día a día»: la captura del panel cambia entre Vehículos,
//      Áreas, Alertas y Reportes mientras avanza la lista (solo escritorio ≥ 1024 px).
// Cifras quietas (sin contadores). Teléfono: sin escena fija; las pestañas cambian la captura.
import { useRef, useState } from 'react'
import { PAGES } from '../../content/pages'
import {
  SitioV8, SeccionV8, ContenedorV8, FotoIntegradaV8, CapturaFlotanteV8, TarjetaVidrioV8, ListaPasosV8,
  PestanasV8, BotonV8, EnlaceV8, useMomentoV8, rutaV8,
} from '../../components/v8'
import './beneficios-v8.css'

// Cifras reales de src/content/pages.js (mismo texto que el tablero; versión corta en el teléfono).
const todas = Object.values(PAGES).flatMap(p => p.sections || [])
const cifra = (valor, etiqueta) => todas.find(s => s.stat?.value === valor && (!etiqueta || s.stat.label.toLowerCase() === etiqueta)).stat
const CIFRAS = [
  { ...cifra('100% web'), corta: 'sin instalar programas' },
  { ...cifra('3 roles'), corta: 'empresa, flota personal y conductor' },
  { ...cifra('24/7', 'monitoreo continuo de la flota'), corta: 'monitoreo continuo' },
  { ...cifra('48 h'), corta: 'para agendar la demostración' },
].map(c => ({ ...c, label: c.label.charAt(0).toLowerCase() + c.label.slice(1) }))

// Recorrido: cada beneficio con su vista del panel tal como es hoy.
const BENEFICIOS = [
  { pestana: 'Vehículos', titulo: 'Visibilidad de la operación', texto: 'Ubicación, estado y responsable de cada unidad en una misma vista.', corto: 'Ubicación, estado y responsable de cada unidad.',
    captura: 'cap-panel-flota', alt: 'Vehículos actuales del panel FOM: unidades, estado, conductor y documentos. Datos de demostración.' },
  { pestana: 'Áreas', titulo: 'Organización por áreas', texto: 'Zona, sede o contrato: la parte de la flota que te corresponde.', corto: 'Zona, sede o contrato.',
    captura: 'cap-panel-mapa', alt: 'Centro de control actual del panel FOM con el filtro de áreas. Datos de demostración.' },
  { pestana: 'Alertas', titulo: 'Atención a las alertas', texto: 'Los avisos que requieren revisión, con el contexto del evento.', corto: 'Los avisos con su contexto.',
    captura: 'cap-panel-alertas', alt: 'Alertas actuales del panel FOM. Datos de demostración.' },
  { pestana: 'Reportes', titulo: 'Información para decidir', texto: 'Reportes e historial para planificar los siguientes pasos.', corto: 'Reportes e historial.',
    captura: 'cap-panel-reportes', alt: 'Reportes actuales del panel FOM. Datos de demostración.' },
]
const PESTANAS = BENEFICIOS.map(b => b.pestana)
const PASOS = BENEFICIOS.map(b => ({
  titulo: b.titulo,
  texto: <><span className="v8-solo-escritorio">{b.texto}</span><span className="v8-solo-movil">{b.corto}</span></>,
}))

const CAMPO = [
  { titulo: 'Cuidado de cada vehículo', texto: 'Inspecciones, hallazgos y órdenes de mantenimiento con seguimiento por unidad.', corto: 'Inspecciones, hallazgos y mantenimiento por unidad.' },
  { titulo: 'Comunicación desde el campo', texto: 'El conductor registra desde su teléfono y la oficina lo consulta en la plataforma.', corto: 'El conductor registra; la oficina consulta.' },
  { titulo: 'Trabajo conectado', texto: 'Información disponible en la oficina apenas se registra.' },
]

export default function BeneficiosV8() {
  const raiz = useRef(null)
  const [activo, setActivo] = useState(0)
  const recorrido = useRef(null) // ScrollTrigger del recorrido fijo (solo escritorio con movimiento)

  useMomentoV8(raiz, ({ q, ScrollTrigger, escritorio }) => {
    if (!escritorio) return
    // 2 · Recorrido fijo: la escena se queda y cada cuarto del tramo muestra un beneficio.
    //     La captura cambia con un fundido de opacidad (CSS); nada se reescala.
    const escena = q('.ben-recorrido')[0]
    if (!escena) return
    const tramos = BENEFICIOS.length
    const st = ScrollTrigger.create({
      trigger: escena, start: 'center center', end: `+=${tramos * 45}%`, pin: true,
      onUpdate: ({ progress }) => setActivo(Math.min(tramos - 1, Math.floor(progress * tramos))),
    })
    recorrido.current = st
    return () => { recorrido.current = null }
  })

  // Tocar una pestaña o un paso: con el recorrido fijo activo, se baja hasta su tramo (así el
  // desplazamiento y la vista no se contradicen); si no, solo cambia la captura.
  const elegir = i => {
    const st = recorrido.current
    if (st) {
      const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      window.scrollTo({ top: st.start + (st.end - st.start) * (i + 0.5) / BENEFICIOS.length, behavior: reduce ? 'auto' : 'smooth' })
    }
    setActivo(i)
  }

  return <SitioV8 raiz={raiz} titulo="Beneficios — FOM" descripcion="Más claridad para cada decisión de tu flota: FOM conecta el trabajo de campo con la oficina para el seguimiento diario de la operación.">
    {/* Hero: la camioneta FOM a la derecha, fundida; el texto a la izquierda. */}
    <section className="ben-hero" aria-labelledby="ben-titulo">
      <div className="ben-hero-foto" data-v8-crece="">
        <FotoIntegradaV8 prioridad nombre="camioneta-noche" fundido="l" sizes="(min-width: 900px) 66vw, 100vw" className="ben-hero-img"
          alt="Camioneta de la flota FOM en una carretera de montaña al anochecer." />
      </div>
      <ContenedorV8 className="ben-hero-texto">
        <div className="ben-hero-caja">
          <p className="v8-kick" data-v8-entra="">Beneficios</p>
          <h1 id="ben-titulo" className="v8-h1 ben-h1"><span className="v8-linea" data-v8-entra="">Más claridad para cada decisión de tu flota.</span></h1>
          <p className="v8-lead ben-hero-bajada" data-v8-entra="">
            <span className="v8-solo-escritorio">FOM conecta el trabajo de campo con la oficina para que la información sirva al seguimiento diario de la operación.</span>
            <span className="v8-solo-movil">El trabajo de campo y la oficina, conectados.</span>
          </p>
          <div className="ben-hero-accion" data-v8-entra=""><BotonV8 to={rutaV8('contacto')} tamano="lg">Solicitar demostración</BotonV8></div>
        </div>
      </ContenedorV8>
    </section>

    {/* Lo que cambia en el día a día: lista de beneficios y la captura real del panel. */}
    <SeccionV8 id="dia-a-dia" className="ben-dia" aria-labelledby="ben-dia-titulo">
      <ContenedorV8 className="ben-dia-cab">
        <h2 id="ben-dia-titulo" className="v8-h2" data-v8-aparece="">Lo que cambia en el día a día.</h2>
        <p className="v8-lead ben-dia-bajada v8-solo-escritorio" data-v8-aparece="">Cuatro beneficios, vistos en el panel tal como es hoy.</p>
      </ContenedorV8>
      <ContenedorV8 className="ben-recorrido">
        <ListaPasosV8 className="ben-pasos" pasos={PASOS} activo={activo} alCambiar={elegir} />
        <div className="ben-vista">
          <PestanasV8 className="ben-pestanas" etiqueta="Vistas del panel" opciones={PESTANAS} activa={activo} alCambiar={elegir} />
          <div className="ben-capturas">
            {BENEFICIOS.map((b, i) => <div key={b.captura} className={`ben-captura${i === activo ? ' is-activa' : ''}`} aria-hidden={i === activo ? undefined : 'true'}>
              <CapturaFlotanteV8 nombre={b.captura} alt={b.alt}
                sizes="(min-width: 1180px) 720px, (min-width: 900px) 62vw, calc(100vw - 56px)" />
            </div>)}
          </div>
          <p className="v8-nota-demo">Captura real del panel · Datos de demostración</p>
        </div>
      </ContenedorV8>
    </SeccionV8>

    {/* Cuidado y comunicación, desde el campo: el camión en la autopista y tres notas de vidrio. */}
    <SeccionV8 id="campo" className="ben-campo" aria-labelledby="ben-campo-titulo">
      <div className="ben-campo-escena">
        <FotoIntegradaV8 className="ben-campo-foto" nombre="camion-autopista" fundido="y" sizes="100vw"
          alt="Camión de la flota en la autopista de noche, con la ciudad iluminada al fondo." />
        <ContenedorV8 className="ben-campo-texto">
          <h2 id="ben-campo-titulo" className="v8-h2 ben-campo-titulo" data-v8-aparece="">Cuidado y comunicación, desde el campo.</h2>
          <ul className="ben-campo-notas v8-g3">
            {CAMPO.map(c => <li key={c.titulo} className={c.corto ? undefined : 'ben-solo-ancho'} data-v8-aparece="">
              <TarjetaVidrioV8 className="ben-nota">
                <h3 className="v8-h4">{c.titulo}</h3>
                <p className="v8-sm v8-t2">
                  <span className="v8-solo-escritorio">{c.texto}</span>
                  <span className="v8-solo-movil">{c.corto || c.texto}</span>
                </p>
              </TarjetaVidrioV8>
            </li>)}
          </ul>
        </ContenedorV8>
      </div>
    </SeccionV8>

    {/* Cifras quietas. */}
    <SeccionV8 banda className="ben-cifras-sec" aria-label="FOM en cifras">
      <ContenedorV8>
        <div className="v8-cifras ben-cifras">
          {CIFRAS.map(c => <p className="v8-cifra" key={c.value} data-v8-aparece="">
            <strong>{c.value}</strong>
            <span><span className="v8-solo-escritorio">{c.label}</span><span className="v8-solo-movil">{c.corta}</span></span>
          </p>)}
        </div>
        <div className="ben-cifras-accion v8-solo-movil"><BotonV8 to={rutaV8('contacto')} ancho>Solicitar demostración</BotonV8></div>
      </ContenedorV8>
    </SeccionV8>

    {/* Cierre (escritorio y tableta). */}
    <SeccionV8 className="ben-cierre" aria-labelledby="ben-cierre-titulo">
      <ContenedorV8 className="v8-centro">
        <h2 id="ben-cierre-titulo" className="v8-h2" data-v8-aparece="">Mira los beneficios con tu flota.</h2>
        <div className="v8-acciones" data-v8-aparece="">
          <BotonV8 to={rutaV8('contacto')} tamano="lg">Solicitar demostración</BotonV8>
          <EnlaceV8 to={rutaV8('preguntas')}>Preguntas frecuentes</EnlaceV8>
        </div>
      </ContenedorV8>
    </SeccionV8>
  </SitioV8>
}
