// Escena de Áreas de la web v8 (T-148): el mapa de la operación que se arma con el scroll.
// A la izquierda, el paso (riel + texto); a la derecha, un organigrama con los datos de la
// demostración (Transporte Lago Sur, C.A.) y, debajo, la pantalla REAL del panel donde se hace
// ese paso. Cinco pasos:
//   0 · La empresa          → solo la raíz.                        Captura: Empresas (admin FOM).
//   1 · Sus áreas           → las cuatro áreas con su tipo y sus unidades. Captura: Vehículos.
//   2 · Sus unidades        → tres unidades pasan de Occidente al contrato: cambian los números
//                             (12 → 9, 0 → 3) y las dos áreas se resaltan, igual que en la captura
//                             «Agregar 3 unidades a…». Sin un cuadro por unidad (pedido de Marco).
//   3 · Un área a la vez    → solo Costa oriental queda encendida.  Captura: Centro de control.
//   4 · Quién ve qué        → la empresa entera para su supervisor; la Unidad 01, en el contrato,
//                             para su conductor.                    Captura: Usuarios.
// Movimiento (patrón de piezasEscenaV8): escena fija solo en escritorio ≥ 1024 px, donde el
// scroll elige el paso; los cambios son transiciones de CSS (solo transform y opacidad). Tableta y
// «reducir movimiento»: el paso se elige con el riel (sin transiciones con «reducir movimiento»).
// Teléfono: el organigrama ya armado (paso 2) y los pasos apilados, cada uno con su texto.
import { useRef, useState } from 'react'
import { CapturaFlotanteV8, IconoV8 } from '../../../components/v8'
import { inicioCentradoV8, usarEscenaV8 } from '../../../components/v8/piezasEscenaV8'

// Datos de la demostración, tal como salen en el panel (Vehículos: chips por área).
const AREAS = [
  { id: 'occ', nombre: 'Occidente', tipo: 'Ubicación', antes: 12, despues: 9 },
  { id: 'cos', nombre: 'Costa oriental', tipo: 'Ubicación', antes: 9, despues: 9 },
  { id: 'sur', nombre: 'Sur del lago', tipo: 'Ubicación', antes: 5, despues: 5 },
  { id: 'con', nombre: 'Contrato Petrolera del Lago', tipo: 'Contrato', antes: 0, despues: 3, conductor: true },
]

export const PASOS_AREAS = [
  {
    corto: 'Empresa', titulo: 'Todo empieza por tu empresa.',
    texto: 'Cada empresa es una cuenta con su flota, su gente y su logo. Puede ser contratista, que opera su flota; compañía, que supervisa a sus contratistas; o personal, una cuenta individual.',
    captura: {
      nombre: 'cap-areas-empresas', alt: 'Empresas en el panel FOM del administrador: directorio con contratistas, compañía y personal, y la ficha de una empresa con «Entrar a empresa». Datos de demostración.',
      puntos: [{ x: 0.585, y: 0.546, t: 'Tres tipos de empresa' }, { x: 0.834, y: 0.645, t: 'Entra a su panel', abajo: true }],
    },
  },
  {
    corto: 'Áreas', titulo: 'Divide la flota en áreas.',
    texto: 'En Vehículos, con «Nueva área»: le pones nombre y eliges el tipo, ubicación, sector o contrato. Cada área muestra cuántas unidades tiene.',
    captura: {
      nombre: 'cap-areas-vehiculos', alt: 'Vehículos en el panel FOM: botones «Nueva área» y «Agregar vehículos a un área», y las áreas Occidente 12, Costa oriental 9, Sur del lago 5 y Contrato Petrolera del Lago 0. Datos de demostración.',
      puntos: [{ x: 0.655, y: 0.25, t: 'Nueva área' }, { x: 0.41, y: 0.316, t: 'Pasa unidades de una vez' }, { x: 0.835, y: 0.74, t: 'Unidades por área' }],
    },
  },
  {
    corto: 'Unidades', titulo: 'Cada unidad, en su área.',
    texto: 'Con «Agregar vehículos a un área» pasas varias juntas; una sola, con «Cambiar» en su fila o desde su expediente. La unidad conserva su conductor.',
    captura: {
      nombre: 'cap-areas-asignar', alt: 'Agregar vehículos a un área en el panel FOM: Unidad 01, 02 y 03 de Occidente marcadas para el Contrato Petrolera del Lago. Datos de demostración.',
      puntos: [{ x: 0.74, y: 0.235, t: '¿A qué área?' }, { x: 0.735, y: 0.516, t: 'Su área de hoy' }, { x: 0.58, y: 0.915, t: 'Las tres de una vez' }],
    },
  },
  {
    corto: 'Un área', titulo: 'Mira un área a la vez.',
    texto: 'Vehículos, Centro de control y Reportes se filtran por área. Eliges Costa oriental y el mapa muestra solo sus 9 unidades.',
    captura: {
      nombre: 'cap-areas-mapa', alt: 'Centro de control del panel FOM filtrado por el área Costa oriental: 9 unidades entre Cabimas y Tía Juana. Datos de demostración.',
      puntos: [{ x: 0.425, y: 0.1575, t: 'Solo un área' }, { x: 0.52, y: 0.47, t: 'Sus unidades en el mapa' }],
    },
  },
  {
    corto: 'Roles', titulo: 'Cada quien entra a lo suyo.',
    texto: 'El rol decide qué ve cada persona, en el panel y en la app.',
    roles: [
      ['Supervisor de la empresa', 'Toda su flota, sus áreas y su gente.'],
      ['Conductor', 'Su unidad, su mapa, su mantenimiento y sus alertas.'],
      ['Compañía', 'Los usuarios y los reportes de sus contratistas.'],
      ['Administrador FOM', 'Todas las empresas, con su auditoría.'],
    ],
    captura: {
      nombre: 'cap-areas-usuarios', alt: 'Usuarios en el panel FOM: 23 cuentas de Transporte Lago Sur con su rol, conductor o supervisor, y «Nuevo usuario». Datos de demostración.',
      puntos: [{ x: 0.57, y: 0.639, t: 'Por rol' }, { x: 0.545, y: 0.81, t: 'Su rol', izq: true }, { x: 0.84, y: 0.145, t: 'Nuevo usuario con su rol', izq: true }],
    },
  },
]

// Puntos que señalan partes de una captura (decorativos: lo mismo dice el texto del paso).
function Puntos({ puntos }) {
  return <ul className="ar-puntos" aria-hidden="true">
    {puntos.map((p, i) => <li key={p.t} className={`ar-punto${p.izq ? ' is-izq' : ''}${p.abajo ? ' is-abajo' : ''}`} style={{ left: `${p.x * 100}%`, top: `${p.y * 100}%`, '--i': i }}>
      <i /><span>{p.t}</span>
    </li>)}
  </ul>
}

// El organigrama. `paso` decide lo que se ve (CSS: [data-paso]).
export function OrganigramaAreasV8({ paso, className = '' }) {
  return <div className={`ar-org ${className}`} data-paso={paso} role="img"
    aria-label="Organigrama de la demostración: Transporte Lago Sur, C.A., contratista, con cuatro áreas: Occidente, Costa oriental y Sur del lago, de tipo ubicación, y Contrato Petrolera del Lago, de tipo contrato. Tres unidades pasan de Occidente al contrato.">
    <div className="ar-raiz">
      <span className="ar-raiz-icono" aria-hidden="true"><IconoV8 nombre="truck" /></span>
      <span><b>Transporte Lago Sur, C.A.</b><small>Contratista · 26 unidades</small></span>
      <em className="ar-rol is-admin">Supervisor: ve toda la empresa</em>
    </div>
    <span className="ar-tronco" aria-hidden="true" />
    <span className="ar-bus" aria-hidden="true" />
    <ol className="ar-areas">
      {AREAS.map((a, i) => <li key={a.id} className={`ar-area is-${a.id}`} style={{ '--i': i }}>
        <span className="ar-rama" aria-hidden="true" />
        <span className="ar-area-cab">
          <b>{a.nombre}</b>
          <small>{a.tipo} · <span className="ar-cuenta is-antes">{a.antes}</span><span className="ar-cuenta is-despues">{a.despues}</span> unidades</small>
        </span>
        {a.conductor && <em className="ar-rol is-conductor">Carlos Méndez, conductor: su Unidad 01</em>}
      </li>)}
    </ol>
  </div>
}

// Escena completa (escritorio y tableta).
export default function EscenaAreasV8() {
  const raiz = useRef(null)
  const [paso, setPaso] = useState(0)
  const fijo = useRef(null)
  const n = PASOS_AREAS.length

  usarEscenaV8(raiz, ({ el, ScrollTrigger, escritorio }) => {
    // Los puntos salen cuando la escena entra a la vista (todas las medidas).
    ScrollTrigger.create({ trigger: el, start: 'top 72%', once: true, onEnter: () => el.classList.add('is-visto') })
    if (!escritorio || getComputedStyle(el).display === 'none') return
    const st = ScrollTrigger.create({
      trigger: el, pin: true, anticipatePin: 1, invalidateOnRefresh: true,
      start: inicioCentradoV8(el), end: `+=${n * 62}%`,
      onUpdate: self => {
        setPaso(Math.min(n - 1, Math.floor(self.progress * n)))
        el.style.setProperty('--ar-avance', self.progress.toFixed(4))
      },
    })
    el.setAttribute('data-ar-modo', 'recorrido')
    fijo.current = st
    return () => { fijo.current = null; el.removeAttribute('data-ar-modo'); el.style.removeProperty('--ar-avance') }
  })

  // El riel: con escena fija, lleva el scroll al tramo del paso; sin ella, cambia el paso.
  const irA = i => {
    const st = fijo.current
    if (!st) { setPaso(i); return }
    window.scrollTo({ top: st.start + (st.end - st.start) * ((i + 0.5) / n), behavior: 'smooth' })
  }

  return <div ref={raiz} className="ar-escena" data-areas-escena="" style={{ '--ar-paso': paso }}>
    <div className="ar-texto">
      <div className="ar-riel" role="group" aria-label="Pasos para ordenar la flota por áreas">
        <span className="ar-riel-barra" aria-hidden="true"><i /></span>
        {PASOS_AREAS.map((p, i) => <button key={p.corto} type="button" className="ar-riel-boton" aria-pressed={paso === i} onClick={() => irA(i)}>
          <b>{i + 1}</b><span>{p.corto}</span>
        </button>)}
      </div>
      <div className="ar-pasos">
        {PASOS_AREAS.map((p, i) => <article key={p.corto} className={`ar-paso${paso === i ? ' is-activo' : ''}`} aria-hidden={paso !== i}>
          <h3 className="v8-h3">{p.titulo}</h3>
          <p className="v8-t2 ar-paso-texto">{p.texto}</p>
          {p.roles && <dl className="ar-roles">{p.roles.map(([r, q]) => <div key={r}><dt>{r}</dt><dd>{q}</dd></div>)}</dl>}
        </article>)}
      </div>
    </div>
    <div className="ar-escenario">
      <OrganigramaAreasV8 paso={paso} />
      <div className="ar-capturas">
        {PASOS_AREAS.map((p, i) => <div key={p.captura.nombre} className={`ar-cuadro${paso === i ? ' is-activo' : paso > i ? ' is-pasado' : ''}`} aria-hidden={paso !== i}>
          <CapturaFlotanteV8 nombre={p.captura.nombre} alt={p.captura.alt} ancho="100%" sizes="(min-width: 1240px) 660px, (min-width: 1024px) 52vw, 90vw" />
          <Puntos puntos={p.captura.puntos} />
        </div>)}
      </div>
      <p className="v8-nota-demo ar-nota">Capturas reales del panel · Datos de demostración</p>
    </div>
  </div>
}
