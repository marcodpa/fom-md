// Beneficios, from output/laminas-secciones-v7/09-beneficios. Slides 02, 05 and 07 (the panel on a
// big monitor) are joined in one pinned tour; 03 is a framed section with app tabs; 06 sits on the
// app background with its map in a frame.
// Texts come from the Beneficios branch of ReferenceMarketing (BENEFITS) and the manifest.
import { useState } from 'react'
import { V7Section, Plate, Features, DemoButton, V7Footer, V7Icon, StickyTour, DeviceTabs, Frame, AppBackdrop, TextCards, usePageTitle } from '../../components/v7/V7Kit'
import fleet from '../../assets/marketing/real/panel-flota.webp'
import inspection from '../../assets/marketing/real/app-inspeccion.webp'
import service from '../../assets/marketing/real/app-mantenimiento.webp'
import appHome from '../../assets/marketing/real/app-inicio.webp'
import alerts from '../../assets/marketing/real/panel-alertas.webp'
import reports from '../../assets/marketing/real/panel-reportes.webp'
import unit from '../../assets/marketing/v7/09-beneficios/06-unidad.webp'
import '../../styles/v7/beneficios.css'

// Icons drawn in the slides that the kit does not have (24 × 24 strokes).
const listIcon = <><path d="M8.5 3.5h11A1.5 1.5 0 0 1 21 5v14a1.5 1.5 0 0 1-1.5 1.5h-11M12 8h5.5M12 12h5.5M12 16h5.5" /><path d="M3.5 5h2M3.5 9.5h2M3.5 14h2M3.5 18.5h2" /></>
const bellRays = <><path d="M7 16.5V11a5 5 0 0 1 10 0v5.5l1.6 2H5.4Z" /><path d="M10.2 21.2h3.6M2.8 8.2l1.9.9M21.2 8.2l-1.9.9M2.5 13h2M21.5 13h-2" /></>
const waveIcon = <path d="M3.5 10v4M8 6.5v11M12 2.5v19M16 6.5v11M20.5 10v4" />
const gridIcon = <><rect x="3.5" y="3.5" width="7" height="7" rx="1.5" /><rect x="13.5" y="3.5" width="7" height="7" rx="1.5" /><rect x="3.5" y="13.5" width="7" height="7" rx="1.5" /><rect x="13.5" y="13.5" width="7" height="7" rx="1.5" /></>
const barsIcon = <path d="M4 20.5v-7M9.3 20.5V9M14.6 20.5V3.5M20 20.5V11" />

const BENEFITS = [
  { title: <>Visibilidad<br />de la operación</>, body: 'Consulta ubicación, estado y responsable de cada unidad desde una misma vista.', items: [['pin', 'Ubicación en tiempo real'], ['users', 'Estado y responsable'], [listIcon, 'Toda la flota en un solo lugar']] },
  { title: <>Cuidado de<br />cada vehículo</>, body: 'Reúne inspecciones, hallazgos y órdenes de mantenimiento para dar seguimiento a lo que necesita cada unidad.', items: [['wrench', 'Inspecciones en campo'], ['document', 'Hallazgos y mantenimientos'], ['clock', 'Seguimiento por unidad']] },
  { title: <>Comunicación<br />desde el campo</>, body: 'El conductor registra información desde su teléfono y la oficina la consulta en la plataforma.', items: [['phone', 'Registro desde el teléfono'], ['cloud', 'Información disponible en la oficina'], ['users', 'Trabajo conectado']] },
  { title: <>Atención a<br />las alertas</>, body: 'Encuentra los avisos que requieren revisión y consulta el contexto de los eventos.', items: [[bellRays, 'Alertas en tiempo real'], [waveIcon, 'Eventos de manejo'], ['shieldCheck', 'Reglas y notificaciones']] },
  { title: <>Organización<br />por áreas</>, body: 'Agrupa unidades por zona, sede o contrato para consultar la parte de la flota que te corresponde.', items: [['map', 'Zonas y sedes'], ['database', 'Contratos y agrupaciones'], [gridIcon, 'Vista de la flota por área']] },
  { title: <>Información<br />para decidir</>, body: 'Consulta reportes e historial para revisar la operación y planificar los siguientes pasos.', items: [[barsIcon, 'Reportes de operación'], ['clock', 'Historial de actividad'], ['document', 'Datos para la planificación']] },
]

// The three short facts of a benefit, kept verbatim, as small inline chips.
function Chips({ items, className = '' }) {
  return <ul className={`bn-chips ${className}`}>{items.map(([icon, label]) => <li key={label}><V7Icon name={icon} />{label}</li>)}</ul>
}

// Illustrative place labels over the aerial photo of slide 06 (the pins stay in the photo).
const PLACES = [['Zona norte', 318, 173, 145], ['Almacén', 150, 398, 121], ['Patio central', 471, 459, 150], ['Acceso principal', 664, 688, 188]]

const [visibility, care, field, alertsB, areas, decide] = BENEFITS
const tourStep = (b, tab, icon, kicker) => ({ tab, icon, kicker, title: b.title, body: b.body, children: <Chips items={b.items} /> })
const APP_TABS = [{ label: 'Inspección', icon: 'clipboard' }, { label: 'Mantenimiento', icon: 'wrench' }]

export default function Beneficios() {
  usePageTitle('Beneficios')
  const [appView, setAppView] = useState(0)
  return <main id="contenido" className="v7-page v7-beneficios">
    <V7Section className="bn-01" plateId="09-beneficios/01" priority labelledBy="bn-title">
      <div className="v7-copy">
        <p className="bn-kicker">Beneficios</p>
        <h1 id="bn-title">Más claridad para<br />cada decisión de<br />tu flota.</h1>
        <p>FOM conecta el trabajo de campo con la oficina para que la información sirva al seguimiento diario de la operación.</p>
        <DemoButton />
      </div>
      <p className="bn-statement" aria-hidden="true">Flotas<br />que mantienen<br />el mundo<br />en movimiento</p>
    </V7Section>

    <StickyTour sticky={false} id="bn-tour" className="bn-tour" label="Beneficios en el panel web" plateId="09-beneficios/07"
      screen={{ corners: [[605, 121], [1604, 80], [1601, 774], [585, 745]] }} srcs={[fleet, alerts, reports]}
      steps={[
        tourStep(visibility, 'Visibilidad de la operación', 'pin', 'Beneficio · Vehículos'),
        tourStep(alertsB, 'Atención a las alertas', bellRays, 'Beneficio · Alertas'),
        tourStep(decide, 'Información para decidir', barsIcon, 'Beneficio · Reportes'),
      ]} />

    <V7Section className="bn-03 is-framed" demo labelledBy="bn-03-title">
      <div className="v7-copy">
        <p className="v7-kicker">Beneficio · App del conductor</p>
        <h2 id="bn-03-title">{care.title}</h2>
        <p>{care.body}</p>
        <Chips items={care.items} />
        <DeviceTabs className="bn-app-tabs" label="Pantallas de la app del conductor" tabs={APP_TABS} active={appView} onChange={setAppView} />
      </div>
      <Frame plateId="09-beneficios/03" x="-118%" ratio="4 / 5" active={appView}
        screens={[
          { phone: true, src: [inspection, service], corners: [[1041, 400], [1184, 409], [1122, 727], [952, 715]], clip: [[1030, 380], [1200, 380], [1200, 520], [1162, 538], [1135, 580], [1118, 613], [1107, 640], [1093, 660], [1077, 680], [1068, 705], [1062, 740], [930, 740], [930, 380]] },
          { phone: true, src: [inspection, service], corners: [[1278, 58], [1602, 42], [1573, 856], [1238, 852]] },
        ]} />
    </V7Section>

    <V7Section className="bn-04" plateId="09-beneficios/04" demo labelledBy="bn-04-title"
      screens={[{ phone: true, src: appHome, corners: [[758, 282], [955, 292], [912, 785], [690, 772]], clip: [[700, 260], [1000, 260], [1000, 515], [950, 522], [934, 550], [907, 575], [881, 586], [862, 598], [856, 615], [862, 630], [880, 642], [895, 660], [892, 690], [897, 740], [900, 800], [660, 800]] }]}>
      <div className="v7-copy">
        <h2 id="bn-04-title">{field.title}</h2>
        <p>{field.body}</p>
        <Features boxed={false} items={field.items} />
      </div>
    </V7Section>

    <V7Section className="bn-06 is-plain" demo labelledBy="bn-06-title">
      <AppBackdrop side="right" />
      <div className="bn-mapframe">
        <div className="bn-mapinner">
          <Plate id="09-beneficios/06" />
          <div className="bn-map" aria-hidden="true">
            {PLACES.map(([label, x, y, w]) => <span key={label} className="bn-place" style={{ '--x': x, '--y': y, '--w': w }}>{label}</span>)}
            <div className="bn-unit">
              <img src={unit} alt="" width="284" height="200" loading="lazy" decoding="async" />
              <div>
                <strong>FOM-024</strong>
                <span className="bn-unit-state">En marcha</span>
                <p><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 22s7-7.1 7-12.5a7 7 0 1 0-14 0C5 14.9 12 22 12 22Z" /><circle cx="12" cy="9.5" r="2.5" /></svg><span><small>Última ubicación</small>Zona norte<br />Hoy, 08:42</span></p>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="v7-copy">
        <p className="v7-kicker">Beneficio · Áreas</p>
        <h2 id="bn-06-title">{areas.title}</h2>
        <p>{areas.body}</p>
        <TextCards columns={1} items={areas.items.map(([icon, title]) => ({ icon, title }))} />
      </div>
    </V7Section>

    <V7Section className="bn-08" plateId="09-beneficios/08" labelledBy="bn-08-title">
      <div className="v7-copy">
        <p className="bn-kicker">Beneficios</p>
        <h2 id="bn-08-title">Encuentra las<br />herramientas para<br />tu operación.</h2>
        <p>Conoce el panel web y la app con una demostración de FOM.</p>
        <DemoButton />
      </div>
      <p className="bn-statement" aria-hidden="true">La oficina<br />y la carretera,<br />conectadas.</p>
    </V7Section>

    <V7Footer plateId="09-beneficios/09" className="bn-09" taglineBreak={false} statement={<>Flotas que mantienen<br />el mundo en movimiento</>} />
  </main>
}
