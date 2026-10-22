// Plataforma de la web v8 (T-105), fiel a los tableros «Plataforma · escritorio»
// (Plataforma.dc.html) y «Plataforma · teléfono» (Plataforma-movil.dc.html) del lienzo «Web FOM nueva».
// Animación (nota azul del tablero, solo 2 momentos):
//   1) Hero: el titular entra escalonado y la foto pasa de 92 % a 100 % al bajar (base: HeroV8).
//   2) Escena fija «Un panel único»: la captura real del panel sube hasta su sitio y se queda
//      (solo escritorio ≥ 1024 px). La captura nunca se reescala: sube con traslación y opacidad.
// Todo lo demás: quieto o aparición suave. Teléfono: sin escena fija, mismas piezas apiladas.
//   3) (T-123) Escena fija «Mantenimiento» (escritorio ≥ 1024 px): al bajar avanza paso a paso
//      (Abierta → En revisión → Resuelta → Fotos e historial); la captura cambia con un giro 3D
//      (siempre con translateZ negativo: nunca más grande que su tamaño real) y los puntos que
//      señalan partes de la pantalla aparecen uno tras otro. Tableta y «reducir movimiento»: los
//      pasos se eligen con el riel. Teléfono: las capturas de la app enteras, una por paso.
import { useRef, useState } from 'react'
import { PAGES } from '../../content/pages'
import {
  SitioV8, NavLocalV8, HeroV8, SeccionV8, ContenedorV8, EncabezadoV8, FotoIntegradaV8, CapturaFlotanteV8,
  RasgosV8, EscenaV8, BloqueCifrasV8, ChipV8, TarjetaVidrioV8, PreguntasV8, BotonV8, EnlaceV8, IconoV8, useMomentoV8, rutaV8,
} from '../../components/v8'
import './plataforma-v8.css'

const P = PAGES.plataforma
const stat = titulo => P.sections.find(s => s.heading.startsWith(titulo)).stat
const cifra = s => ({ valor: s.value, etiqueta: s.label })

const LOCAL = [
  ['panel', 'Panel único'], ['web-app', 'Web y app'], ['mapa', 'Mapa'], ['mantenimiento', 'Mantenimiento'], ['datos', 'Datos'], ['roles', 'Roles'], ['seguridad', 'Seguridad'],
]

// Mantenimiento (T-123). Puntos: posición en fracciones de la captura (medida en el panel demo,
// scratchpad/t123/cajas.json); `izq` = la etiqueta va a la izquierda del punto.
const PASOS_MNT = [
  {
    estado: 'Abierta', tono: 'aviso', titulo: 'El conductor reporta la falla.',
    texto: 'Desde la app: qué le pasa a la unidad, el tipo de falla, la prioridad y las fotos. Llega al panel como orden abierta.',
    detalle: [
      ['phone', 'Conductor', 'Describe la falla, elige tipo y prioridad y adjunta fotos.'],
      ['monitor', 'Supervisor', 'La ve en la lista, lo más nuevo primero, con su tarjeta por tipo de falla.'],
      ['clipboard', 'Queda registrado', 'Unidad, quién reportó, fecha, ubicación y fotos.'],
    ],
    panel: {
      nombre: 'cap-mnt-lista', alt: 'Mantenimiento en el panel FOM: cifras por estado, filtros y la orden abierta «Falla: Frenos». Datos de demostración.',
      puntos: [{ x: 0.5, y: 0.468, t: 'Cuántas hay en cada paso', abajo: true }, { x: 0.236, y: 0.683, t: 'Filtros por estado y tipo', izq: true }, { x: 0.37, y: 0.83, t: 'Tarjeta con el tipo de falla' }],
    },
    fono: {
      nombre: 'cap-movil-mnt-reportar', alt: 'Reportar una falla en la app del conductor: descripción, tipo Frenos y prioridad Alta. Datos de demostración.',
      puntos: [{ x: 0.62, y: 0.459, t: 'Tipo de falla', izq: true }, { x: 0.27, y: 0.718, t: 'Prioridad', izq: true }],
    },
    movil: { nombre: 'cap-movil-mnt-reportar', alt: 'Reportar una falla en la app del conductor: descripción, tipo Frenos y prioridad Alta. Datos de demostración.' },
  },
  {
    estado: 'En revisión', tono: 'azul', titulo: 'El supervisor decide y asigna.',
    texto: 'Revisa el reporte, lo aprueba para el taller o lo resuelve sin taller, y elige quién hace el trabajo.',
    detalle: [
      ['monitor', 'Supervisor', 'Ve la unidad, el problema y el siguiente paso, a un toque.'],
      ['phone', 'Responsable', 'Recibe la orden en la app y toca «Iniciar trabajo»: el tiempo corre solo.'],
      ['clipboard', 'Queda registrado', 'Cada cambio de estado, con autor, hora y nota.'],
    ],
    panel: {
      nombre: 'cap-mnt-revision', alt: 'Detalle de una orden en revisión en el panel FOM: Unidad 01, Toyota Hilux, con el siguiente paso. Datos de demostración.',
      puntos: [{ x: 0.42, y: 0.207, t: 'Estado y tipo de orden' }, { x: 0.36, y: 0.46, t: 'Unidad y modelo' }, { x: 0.27, y: 0.68, t: 'Responsable' }, { x: 0.67, y: 0.348, t: 'Siguiente paso', izq: true }],
    },
    fono: {
      nombre: 'cap-movil-mnt-asignadas', alt: 'Órdenes asignadas en la app: Falla de frenos en revisión, prioridad Alta, con «Iniciar trabajo». Datos de demostración.',
      puntos: [{ x: 0.44, y: 0.466, t: 'Prioridad alta', izq: true }, { x: 0.14, y: 0.636, t: 'Tiempo trabajado', izq: true }, { x: 0.3, y: 0.71, t: 'Iniciar trabajo', izq: true }],
    },
    movil: { nombre: 'cap-movil-mnt-asignadas', alt: 'Órdenes asignadas en la app: Falla de frenos en revisión, prioridad Alta, con «Iniciar trabajo». Datos de demostración.' },
  },
  {
    estado: 'Resuelta', tono: 'ok', titulo: 'Se cierra con costo y tiempo.',
    texto: 'Al cerrar se anota qué se hizo y cuánto costó. FOM calcula cuánto tardó desde el reporte.',
    detalle: [
      ['monitor', 'Supervisor', 'Confirma la solución. Si la falla vuelve, reabre la orden.'],
      ['chart', 'Costos', 'El gasto suma al costo del mes y de cada unidad.'],
      ['clipboard', 'Queda registrado', 'Fecha de cierre, costo y tiempo hasta el cierre.'],
    ],
    panel: {
      nombre: 'cap-mnt-resuelta', alt: 'Orden resuelta en el panel FOM: resultado del trabajo, cierre, costo de 155 dólares y 15 días hasta el cierre. Datos de demostración.',
      puntos: [{ x: 0.455, y: 0.637, t: 'Qué se hizo' }, { x: 0.31, y: 0.745, t: 'Costo registrado', abajo: true }, { x: 0.53, y: 0.745, t: 'Cuánto tardó' }, { x: 0.775, y: 0.375, t: '¿Volvió? Se reabre', abajo: true }],
    },
    movil: { nombre: 'cap-movil-mnt-resuelta', alt: 'Orden resuelta en el teléfono: resultado, cierre, costo registrado y tiempo hasta el cierre. Datos de demostración.' },
  },
  {
    estado: 'Fotos e historial', corto: 'Historial', tono: 'neutro', titulo: 'Fotos e historial, siempre a mano.',
    texto: 'Las fotos del reporte y las del trabajo terminado, y cada paso de la orden: lo último, arriba.',
    detalle: [
      ['camera', 'Fotos', 'Cada foto lleva su título: se sabe por qué se tomó.'],
      ['monitor', 'Supervisor', 'Compara el antes y el después sin buscar en el chat.'],
      ['clipboard', 'Queda registrado', 'El historial de cada unidad, para decidir reparar o reemplazar.'],
    ],
    panel: {
      nombre: 'cap-mnt-fotos', alt: 'Detalle de la orden en el panel FOM: fotos del reporte, foto del trabajo terminado e historial. Datos de demostración.',
      puntos: [{ x: 0.275, y: 0.31, t: 'Fotos del reporte' }, { x: 0.185, y: 0.495, t: 'Fotos del trabajo terminado' }, { x: 0.235, y: 0.634, t: 'Historial: lo último arriba' }],
    },
    fono: {
      nombre: 'cap-movil-mnt-reportar-fotos', alt: 'Fotos de la falla en la app del conductor, cada una con su título. Datos de demostración.',
      puntos: [{ x: 0.5, y: 0.43, t: 'Fotos de la falla', izq: true }, { x: 0.1, y: 0.667, t: 'Cada foto con su título', izq: true }],
    },
    movil: { nombre: 'cap-movil-mnt-fotos', alt: 'Fotos del reporte, del trabajo terminado e historial de la orden en el teléfono. Datos de demostración.' },
  },
]

const PLAN_PUNTOS = [{ x: 0.29, y: 0.8, t: 'Cada cuántos km', izq: true }, { x: 0.5, y: 0.8, t: 'O cada cuántos días' }, { x: 0.76, y: 0.47, t: 'Vista previa del servicio' }]
const PLAN_LISTA = [
  ['Por km o por fecha.', 'Por ejemplo, cada 5.000 km o cada 90 días.'],
  ['Órdenes preventivas solas.', 'Al cumplirse el plazo, la orden aparece en la misma lista.'],
  ['Cobertura por unidad.', 'Asignas qué unidades cubre cada plan.'],
]
const CIFRAS_MNT = [
  { valor: '3', etiqueta: 'Estados: abierta, en revisión y resuelta' },
  { valor: '5.000 km', etiqueta: 'Intervalo de servicio típico' },
  { valor: '90 días', etiqueta: 'O por fecha, lo que llegue primero' },
]

// Puntos que señalan partes de una captura (decorativos: lo mismo se dice en el texto del paso).
function PuntosMnt({ puntos }) {
  return <ul className="mnt-puntos" aria-hidden="true">
    {puntos.map((p, i) => <li key={p.t} className={`mnt-punto${p.izq ? ' is-izq' : ''}${p.abajo ? ' is-abajo' : ''}`} style={{ left: `${p.x * 100}%`, top: `${p.y * 100}%`, '--i': i }}>
      <i /><span>{p.t}</span>
    </li>)}
  </ul>
}

// 1.000 → «1.000» (punto de miles, como en el resto del sitio).
const miles = n => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, '.')

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
  const [paso, setPaso] = useState(0)
  const recorridoMnt = useRef(null) // ScrollTrigger de la escena fija de Mantenimiento (solo escritorio)

  // El riel: con escena fija, lleva el scroll al tramo del paso; sin ella, cambia el paso.
  const irAPaso = i => {
    const st = recorridoMnt.current
    if (!st) { setPaso(i); return }
    window.scrollTo({ top: st.start + (st.end - st.start) * ((i + 0.5) / PASOS_MNT.length), behavior: 'smooth' })
  }

  useMomentoV8(raiz, ({ q, gsap, ScrollTrigger, escritorio }) => {
    // 3 · Mantenimiento: los puntos salen cuando la escena (y el plan) entran a la vista; las
    //     cifras cuentan desde 0 hasta su valor (todas las medidas).
    q('.mnt-escena, .mnt-plan-medio').forEach(el => ScrollTrigger.create({
      trigger: el, start: 'top 72%', once: true, onEnter: () => el.classList.add('is-visto'),
    }))
    q('.mnt-cifras strong').forEach(el => {
      // El valor real se guarda la primera vez: si el momento vuelve a correr (modo estricto o al
      // cruzar un corte de medidas), no se cuenta hasta el «0» que quedó escrito.
      if (!el.dataset.mntValor) el.dataset.mntValor = el.textContent
      const m = el.dataset.mntValor.match(/^([\d.]+)(.*)$/)
      if (!m) return
      const meta = Number(m[1].replace(/\./g, '')), resto = m[2]
      const cuenta = { n: 0 }
      ScrollTrigger.create({
        trigger: el, start: 'top 90%', once: true,
        onEnter: () => {
          el.textContent = `0${resto}`
          gsap.fromTo(cuenta, { n: 0 }, { n: meta, duration: 1.8, ease: 'power2.out', delay: 0.15, onUpdate: () => { el.textContent = `${miles(cuenta.n)}${resto}` } })
        },
      })
    })

    if (!escritorio) return

    // 2 · Escena fija «Un panel único»: la captura queda fija bajo las barras y sube hasta su
    //     sitio mientras se desplaza. Solo traslación y opacidad (las capturas no se reescalan).
    const escena = q('.plat-panel-escena')[0]
    const barras = 96 // navegación global (44) + local (52)
    if (escena) gsap.timeline({
      scrollTrigger: {
        trigger: escena, pin: true, scrub: 0.6, end: '+=75%', invalidateOnRefresh: true,
        // Centrada en el espacio libre bajo las barras; si no cabe, se fija por su borde inferior.
        start: () => {
          const libre = window.innerHeight - barras
          const alto = escena.offsetHeight
          return alto < libre ? `top ${barras + (libre - alto) / 2}px` : 'bottom bottom'
        },
      },
    }).fromTo(q('.plat-panel-captura'), { yPercent: 16, opacity: 0.35 }, { yPercent: 0, opacity: 1, ease: 'none' })

    // 3b · Escena fija de Mantenimiento: el scroll elige el paso; el cambio de captura (giro 3D) y
    //      los puntos son transiciones de CSS. La barra del riel avanza con el scroll.
    const escenaMnt = q('.mnt-escena')[0]
    if (escenaMnt && getComputedStyle(escenaMnt).display !== 'none') {
      const n = PASOS_MNT.length
      const st = ScrollTrigger.create({
        trigger: escenaMnt, pin: true, end: `+=${n * 70}%`, invalidateOnRefresh: true, anticipatePin: 1,
        start: () => {
          const libre = window.innerHeight - 60
          const alto = escenaMnt.offsetHeight
          return alto < libre ? `top ${60 + (libre - alto) / 2}px` : 'top 60px'
        },
        onUpdate: self => {
          setPaso(Math.min(n - 1, Math.floor(self.progress * n)))
          escenaMnt.style.setProperty('--mnt-avance', self.progress.toFixed(4))
        },
      })
      escenaMnt.setAttribute('data-mnt-modo', 'recorrido')
      recorridoMnt.current = st
    }

    return () => {
      recorridoMnt.current = null
      q('.mnt-cifras strong').forEach(el => { if (el.dataset.mntValor) el.textContent = el.dataset.mntValor })
      if (escenaMnt) { escenaMnt.removeAttribute('data-mnt-modo'); escenaMnt.style.removeProperty('--mnt-avance') }
    }
  })

  return <SitioV8 raiz={raiz} titulo="Plataforma — FOM" descripcion={P.subtitle}>
    <HeroV8 className="plat-hero"
      kicker={P.eyebrow}
      titulo={['Toda tu flota', 'en un solo panel.']}
      bajada={<><span className="v8-solo-escritorio">{P.subtitle}</span><span className="v8-solo-movil">Un panel web para la computadora y una app para el conductor, sobre los mismos datos.</span></>}
      bajadaAngosta
      primaria={{ to: rutaV8('contacto'), texto: 'Solicitar demostración' }}
      secundaria={{ to: '#panel', texto: 'Ver el panel' }}
      foto={{ nombre: 'oficina-monitor-resumen', movilNombre: 'plataforma-hero-movil-v', alt: 'Oficina de FOM con el Resumen actual del panel en el monitor. Datos de demostración.', posicion: '62% 50%' }}
    />

    <NavLocalV8 titulo="Plataforma" enlaces={LOCAL} />

    <SeccionV8 id="panel" className="plat-panel" aria-labelledby="plat-panel-titulo">
      <ContenedorV8>
        <EncabezadoV8 centro id="plat-panel-titulo" titulo={['Un panel único', 'para toda la flota.']}
          bajada={<><span className="v8-solo-escritorio">El supervisor ve el estado general de la flota apenas inicia sesión. Sin módulos sueltos ni ventanas separadas.</span><span className="v8-solo-movil">El estado general de la flota apenas inicias sesión.</span></>} />
      </ContenedorV8>
      <div className="plat-panel-escena">
        <ContenedorV8 className="plat-panel-marco">
          <CapturaFlotanteV8 className="plat-panel-captura plat-solo-escritorio" nombre="cap-panel-resumen" nota
            alt="Resumen actual del panel FOM: flota, vehículos en tiempo real y vehículo seleccionado. Datos de demostración." />
          <CapturaFlotanteV8 className="plat-panel-telefono plat-solo-movil" nombre="cap-movil-sup-resumen" ancho={280} nota
            alt="Resumen actual en la app del supervisor: flota y vehículos en tiempo real. Datos de demostración." />
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
          <FotoIntegradaV8 className="plat-webapp-foto" nombre="operadora-mapa" marco="redondo" sizes="(min-width: 1240px) 640px, 56vw"
            alt="Supervisor de FOM frente al Centro de control actual. Datos de demostración." />
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
      <ContenedorV8 className="plat-mapa-escena">
        <FotoIntegradaV8 className="plat-mapa-foto" nombre="patio-monitor-mapa" marco="redondo" sizes="(min-width: 1240px) 1136px, calc(100vw - 40px)" posicion="62% 50%"
          alt="Monitor con el Centro de control actual frente al patio de la flota. Datos de demostración." />
        <CapturaFlotanteV8 className="plat-mapa-telefono plat-solo-movil" nombre="cap-movil-sup-mapa" ancho={280}
          alt="Centro de control actual en la app del supervisor: toda la flota en el mapa. Datos de demostración." />
        <div className="plat-mapa-chips">
          {CHIPS_MAPA.map(c => <ChipV8 key={c.titulo} titulo={c.titulo} texto={c.texto} className={c.movil === false ? 'plat-sin-movil' : undefined} data-v8-aparece="" />)}
        </div>
      </ContenedorV8>
      <ContenedorV8><BloqueCifrasV8 className="plat-cifra-mapa" centro columnas={1} cifras={[cifra(stat('Mapa general'))]} /></ContenedorV8>
    </SeccionV8>

    {/* T-123 · Mantenimiento: de la falla reportada a la unidad lista para volver. */}
    <SeccionV8 id="mantenimiento" className="mnt plat-banda-escritorio" aria-labelledby="mnt-titulo">
      <ContenedorV8>
        <EncabezadoV8 centro id="mnt-titulo" kicker="Mantenimiento" titulo={['De la falla reportada', 'a la unidad lista para volver.']}
          bajada={<><span className="v8-solo-escritorio">Órdenes de trabajo en tres pasos, con fotos, costo y tiempo. El conductor reporta desde la app y el supervisor lo sigue en el panel.</span><span className="v8-solo-movil">Órdenes de trabajo en tres pasos, con fotos, costo y tiempo.</span></>} />
      </ContenedorV8>

      {/* Escritorio y tableta: riel de pasos + escenario con la captura que cambia y sus puntos. */}
      <ContenedorV8 className="mnt-marco plat-solo-escritorio">
        <div className="mnt-escena" style={{ '--mnt-paso': paso }}>
          <div className="mnt-texto">
            <div className="mnt-riel" role="group" aria-label="Pasos de una orden de trabajo">
              <span className="mnt-riel-barra" aria-hidden="true"><i /></span>
              {PASOS_MNT.map((p, i) => <button key={p.estado} type="button" className={`mnt-riel-boton is-${p.tono}`} aria-pressed={paso === i} onClick={() => irAPaso(i)}>
                <b>{i + 1}</b><span>{p.corto || p.estado}</span>
              </button>)}
            </div>
            <div className="mnt-pasos">
              {PASOS_MNT.map((p, i) => <article key={p.estado} className={`mnt-paso${paso === i ? ' is-activo' : ''}`} aria-hidden={paso !== i}>
                <p className={`mnt-estado is-${p.tono}`}><i aria-hidden="true" />{i + 1} · {p.estado}</p>
                <h3 className="v8-h3">{p.titulo}</h3>
                <p className="v8-t2 mnt-paso-texto">{p.texto}</p>
                <dl className="mnt-detalle">
                  {p.detalle.map(([icono, quien, que]) => <div key={quien}><dt><IconoV8 nombre={icono} />{quien}</dt><dd>{que}</dd></div>)}
                </dl>
              </article>)}
            </div>
          </div>
          <div className="mnt-escenario">
            {PASOS_MNT.map((p, i) => <div key={p.panel.nombre} className={`mnt-cuadro${paso === i ? ' is-activo' : paso > i ? ' is-pasado' : ''}`} aria-hidden={paso !== i}>
              <CapturaFlotanteV8 nombre={p.panel.nombre} alt={p.panel.alt} ancho="100%" sizes="(min-width: 1240px) 700px, (min-width: 1024px) 56vw, 90vw" />
              <PuntosMnt puntos={p.panel.puntos} />
            </div>)}
            <div className="mnt-fonos">
              {PASOS_MNT.map((p, i) => p.fono && <div key={p.fono.nombre} className={`mnt-fono${paso === i ? ' is-activo' : paso > i ? ' is-pasado' : ''}`} aria-hidden={paso !== i}>
                <CapturaFlotanteV8 nombre={p.fono.nombre} alt={p.fono.alt} ancho="100%" sizes="210px" />
                <PuntosMnt puntos={p.fono.puntos} />
              </div>)}
            </div>
          </div>
        </div>
        <p className="v8-nota-demo mnt-nota">Capturas reales del panel y de la app · Datos de demostración</p>
      </ContenedorV8>

      {/* Teléfono: cada paso con la captura de la app entera; aparecen una por una. */}
      <ContenedorV8 as="ol" className="mnt-movil plat-solo-movil">
        {PASOS_MNT.map((p, i) => <li key={p.estado} className="mnt-movil-paso">
          <p className={`mnt-estado is-${p.tono}`} data-v8-aparece=""><i aria-hidden="true" />{i + 1} · {p.estado}</p>
          <h3 className="v8-h3" data-v8-aparece="">{p.titulo}</h3>
          <p className="v8-t2 mnt-paso-texto" data-v8-aparece="">{p.texto}</p>
          <dl className="mnt-detalle" data-v8-aparece="">
            {p.detalle.map(([icono, quien, que]) => <div key={quien}><dt><IconoV8 nombre={icono} />{quien}</dt><dd>{que}</dd></div>)}
          </dl>
          <CapturaFlotanteV8 className="mnt-movil-captura" nombre={p.movil.nombre} alt={p.movil.alt} ancho={260} />
        </li>)}
      </ContenedorV8>

      {/* Planes preventivos */}
      <ContenedorV8 className="v8-split mnt-plan">
        <div className="mnt-plan-texto">
          <p className="v8-kick" data-v8-aparece="">Planes preventivos</p>
          <h3 className="v8-h2" data-v8-aparece="">El servicio, antes de la falla.</h3>
          <p className="v8-lead plat-mt-lead" data-v8-aparece="">Define cada cuántos km o días se atiende cada servicio y asigna las unidades. FOM avisa antes de que se cumpla el plazo.</p>
          <ul className="plat-lista is-corta v8-sm v8-t2">
            {PLAN_LISTA.map(([b, t]) => <li key={b} data-v8-aparece=""><b className="v8-fuerte">{b}</b> {t}</li>)}
          </ul>
        </div>
        <div className="mnt-plan-medio">
          <div className="mnt-cuadro is-activo plat-solo-escritorio">
            <CapturaFlotanteV8 nombre="cap-mnt-plan" ancho="100%" sizes="(min-width: 1240px) 660px, (min-width: 900px) 56vw, 90vw"
              alt="Nuevo plan de mantenimiento en el panel FOM: cambio de aceite y filtro cada 5000 km o cada 90 días, con vista previa. Datos de demostración." />
            <PuntosMnt puntos={PLAN_PUNTOS} />
          </div>
          <CapturaFlotanteV8 className="plat-solo-movil mnt-movil-captura" nombre="cap-movil-mnt-plan" ancho={260}
            alt="Nuevo plan de mantenimiento en el teléfono: estrategia por km, cada 5000 km o cada 90 días. Datos de demostración." />
        </div>
      </ContenedorV8>
      <ContenedorV8><BloqueCifrasV8 className="mnt-cifras" columnas={3} centro cifras={CIFRAS_MNT} /></ContenedorV8>
    </SeccionV8>

    <SeccionV8 id="datos" className="plat-datos plat-banda-movil" aria-labelledby="plat-datos-titulo">
      <EscenaV8 lado="izquierda" marco="redondo" anchoTexto={500} posicionMovil="30% 50%"
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
      {/* T-118: las tres personas completas (esquinas redondeadas) junto a las tres tarjetas. */}
      <ContenedorV8 className="plat-roles-cuerpo">
        <FotoIntegradaV8 className="plat-roles-foto" nombre="equipo-roles" marco="redondo" sizes="(min-width: 1240px) 440px, (min-width: 900px) 38vw, calc(100vw - 40px)"
          alt="Equipo de operaciones de FOM revisando la flota en una laptop." />
        <div className="plat-roles-cajas">
          {ROLES.map(r => <TarjetaVidrioV8 key={r.titulo} data-v8-aparece="">
            <h3 className="v8-h4">{r.titulo}</h3><p className="v8-sm v8-t2">{r.texto}</p>
          </TarjetaVidrioV8>)}
        </div>
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
