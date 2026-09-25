// App del conductor, from output/laminas-secciones-v7/03-app. Text comes from the manifest
// and the AppPage/APP_ROWS content of ReferenceMarketing. On desktop one phone travels
// between the phones of sections 01-04 while scrolling (see AppTraveller below).
import { useRef } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useGSAP } from '@gsap/react'
import { screenProjection } from '../../lib/screenProjection'
import { V7Section, Plate, V7Icon, DemoButton, V7Footer, Frame, AppBackdrop, TextCards, usePageTitle, plate, PLATE_W, PLATE_H } from '../../components/v7/V7Kit'
import masks from '../../../scripts/v7-plates/03-app.json'
import appHome from '../../assets/marketing/real/app-inicio.webp'
import appCheck from '../../assets/marketing/real/app-inspeccion.webp'
import appProfile from '../../assets/marketing/real/app-perfil.webp'
import map from '../../assets/marketing/real/panel-mapa.webp'
import '../../styles/v7/app.css'

gsap.registerPlugin(ScrollTrigger, useGSAP)

const INSPECTION = ['Lista de revisión por vehículo.', 'Registro de observaciones y fallas.', 'Historial disponible para la operación.']
const HOME = ['Información en tiempo real.', 'Accesos rápidos a las tareas.', 'Alertas en la jornada.']
const PROFILE = ['Indicadores de tu manejo.', 'Documentos siempre a la mano.', 'Tu información en un solo lugar.']
// Bar chart drawn as boxes, as in the slides (the kit's `chart` is a line version).
const BARS = <><rect x="3.5" y="13" width="4" height="7.5" rx="1" /><rect x="10" y="8.5" width="4" height="12" rx="1" /><rect x="16.5" y="3.5" width="4" height="17" rx="1" /></>
const PILLARS = [['truck', 'Vehículos'], ['user', 'Personas'], ['settings', 'Operación'], [BARS, 'En movimiento']]
// Profile cards: the titles are the section names of the Perfil screen itself.
const PROFILE_CARDS = [['Índice de manejo seguro', BARS], ['Mis documentos', 'document'], ['Mi información', 'user']].map(([title, icon], i) => ({ title, icon, text: PROFILE[i] }))

// Screens measured on each slide (tl, tr, br, bl); `clip` keeps hands, heads and phones in front.
const SCREENS = {
  hero: [{ phone: true, body: true, src: appHome, corners: [[867, 108], [1192, 131], [1129, 880], [785, 846]] }],
  inspection: [
    { phone: true, body: true, src: appCheck, corners: [[717, 76], [1050, 75], [1047, 864], [703, 872]] },
    { phone: true, src: appCheck, corners: [[1518, 503], [1577, 510], [1526, 685], [1438, 675]], clip: [[1483, 490], [1600, 490], [1600, 583], [1543, 587], [1528, 585], [1517, 588], [1507, 602], [1493, 620], [1482, 640], [1474, 657], [1472, 687], [1420, 687], [1420, 490]] },
  ],
  home: [{ phone: true, body: true, src: appHome, corners: [[712, 57], [1047, 63], [1030, 822], [689, 826]] }],
  profile: [
    { phone: true, body: true, src: appProfile, alt: 'Captura original del perfil en la app del conductor FOM con el índice de manejo seguro. Datos de demostración.', corners: [[672, 68], [1013, 72], [1000, 862], [646, 871]] },
    { phone: true, src: appProfile, alt: '', corners: [[1188, 387], [1307, 375], [1368, 631], [1249, 643]], clip: [[1150, 350], [1400, 350], [1400, 532], [1343, 550], [1300, 577], [1260, 603], [1227, 650], [1150, 650]] },
  ],
  footer: [
    { src: map, corners: [[838, 87], [1399, 63], [1390, 497], [822, 464]], clip: [[800, 40], [1440, 40], [1440, 160], [1383, 160], [1375, 200], [1365, 300], [1358, 360], [1330, 380], [1300, 410], [1278, 450], [1262, 490], [1255, 530], [960, 530], [960, 500], [950, 445], [910, 400], [860, 370], [820, 345], [800, 335]] },
    { phone: true, src: appHome, corners: [[1387, 175], [1565, 175], [1535, 595], [1342, 580]] },
  ],
}

// Travelling phone: the anchors are the phones of sections 01–04, in order. Each anchor
// names the section's plate and the screen corners measured on its slide.
const STOPS = [
  { plate: '.ap-01 > .v7-plate', id: '03-app/01', corners: SCREENS.hero[0].corners, shot: 0, fingers: true },
  { plate: '.ap-02 > .v7-plate', id: '03-app/02', corners: SCREENS.inspection[0].corners, shot: 1 },
  { plate: '.ap-03 .v7-frame > .v7-plate', id: '03-app/03', corners: SCREENS.home[0].corners, shot: 0, fingers: true },
  { plate: '.ap-04 > .v7-plate', id: '03-app/04', corners: SCREENS.profile[0].corners, shot: 2 },
]
// The photo phones were erased from the plates (poly masks); the fingers that held them are
// the plate's protected `keep` polygons, repeated above the docked phone.
const fingerClip = poly => `polygon(${poly.map(([x, y]) => `${(x / PLATE_W * 100).toFixed(3)}% ${(y / PLATE_H * 100).toFixed(3)}%`).join(',')})`
const SHOTS = [appHome, appCheck, appProfile]
const offsetIn = (el, root) => { let x = 0, y = 0; for (let n = el; n && n !== root; n = n.offsetParent) { x += n.offsetLeft; y += n.offsetTop } return [x, y] }
const smooth = t => t * t * (3 - 2 * t)
const centre = corners => corners.reduce(([x, y], c) => [x + c[0] / 4, y + c[1] / 4], [0, 0])

/**
 * One phone in <main> coordinates. Between two anchors its eight corner numbers are
 * interpolated (screenProjection keeps the perspective), it lifts, grows a little and
 * swings towards the photo side, and its capture cross-fades to the next one. When
 * docked it sits in the empty hand of the photo (the photo phone was erased from the plate).
 */
function AppTraveller() {
  const phone = useRef(null)
  const hands = useRef([])
  useGSAP(() => {
    const mm = gsap.matchMedia()
    mm.add('(min-width: 761px) and (prefers-reduced-motion: no-preference)', () => {
      const el = phone.current, root = el?.parentElement
      if (!root) return
      const imgs = [...el.querySelectorAll('img')]
      let anchors = [], spans = []
      // A flight starts when the next section's top enters the viewport and ends when
      // that section is centred in it.
      const measure = () => {
        anchors = STOPS.map(stop => {
          const plateEl = root.querySelector(stop.plate)
          if (!plateEl) return { ready: false, shot: stop.shot, section: null, corners: stop.corners }
          const [x, y] = offsetIn(plateEl, root)
          const k = plateEl.offsetWidth / PLATE_W
          const hand = hands.current[STOPS.indexOf(stop)]
          if (hand) Object.assign(hand.style, { left: `${x}px`, top: `${y}px`, width: `${plateEl.offsetWidth}px`, height: `${plateEl.offsetHeight}px` })
          return { ready: k > 0.05, shot: stop.shot, section: plateEl.closest('.v7-section'), corners: stop.corners.map(([cx, cy]) => [x + cx * k, y + cy * k]) }
        })
        const top = root.getBoundingClientRect().top + scrollY
        let last = -Infinity
        if (!anchors.every(a => a.ready)) { spans = []; return }
        spans = anchors.slice(1).map(({ section: s }) => {
          const end = top + s.offsetTop + s.offsetHeight / 2 - innerHeight / 2
          const start = Math.min(Math.max(top + s.offsetTop - innerHeight, last), end - 200)
          last = end
          return [start, end]
        })
      }
      const position = y => {
        for (let i = 0; i < spans.length; i++) {
          const [a, b] = spans[i]
          if (y < a) return i
          if (y <= b) return i + (y - a) / (b - a)
        }
        return spans.length
      }
      const state = { u: 0 }
      const render = () => {
        if (!anchors.every(a => a.ready)) return
        const u = Math.min(Math.max(state.u, 0), anchors.length - 1)
        const i = Math.min(Math.floor(u), anchors.length - 2), t = smooth(u - i)
        const from = anchors[i], to = anchors[i + 1]
        const flight = Math.sin(Math.PI * t)
        const w = to.corners[1][0] - to.corners[0][0]
        const [fx, fy] = centre(from.corners), [tx, ty] = centre(to.corners)
        const cx = fx + (tx - fx) * t, cy = fy + (ty - fy) * t
        const scale = 1 + 0.07 * flight, dx = 0.6 * w * flight, dy = -0.06 * w * flight
        const corners = from.corners.map((c, n) => {
          const x = c[0] + (to.corners[n][0] - c[0]) * t, y = c[1] + (to.corners[n][1] - c[1]) * t
          return [cx + (x - cx) * scale + dx, cy + (y - cy) * scale + dy]
        })
        // Fingers lie over the phone only while it is (nearly) docked at their stop.
        hands.current.forEach((hand, j) => { if (hand) hand.style.opacity = Math.max(0, 1 - Math.abs(state.u - j) * 6).toFixed(3) })
        try { el.style.transform = `matrix3d(${screenProjection(corners).join(',')})` } catch { return }
        const fade = Math.min(Math.max((t - 0.44) / 0.12, 0), 1)
        // The outgoing capture stays opaque underneath while the next one fades in on top.
        imgs.forEach((img, n) => {
          img.style.zIndex = n === to.shot ? 2 : n === from.shot ? 1 : 0
          img.style.opacity = n === to.shot ? (n === from.shot ? 1 : fade) : n === from.shot ? 1 : 0
        })
      }
      const follow = gsap.quickTo(state, 'u', { duration: 0.6, ease: 'power3.out', onUpdate: render })
      measure()
      state.u = position(scrollY)
      render()
      root.classList.add('ap-travel')
      const trigger = ScrollTrigger.create({
        trigger: root, start: 0, end: 'max',
        onUpdate: () => follow(position(scrollY)),
        onRefresh: () => { measure(); state.u = position(scrollY); follow(state.u); render() },
      })
      // Photos and fonts change section heights after the first layout.
      const resize = new ResizeObserver(() => ScrollTrigger.refresh())
      resize.observe(root)
      return () => { resize.disconnect(); trigger.kill(); root.classList.remove('ap-travel') }
    })
    return () => mm.revert()
  }, { scope: phone })
  return <>
    <div className="ap-traveller" ref={phone} aria-hidden="true">
      <span className="ap-traveller-body" />
      <span className="ap-traveller-screen">{SHOTS.map(src => <img key={src} src={src} alt="" width="390" height="844" decoding="async" />)}</span>
    </div>
    {STOPS.map((stop, i) => stop.fingers && <div key={stop.id} className="ap-hand" ref={node => { hands.current[i] = node }} aria-hidden="true">
      {masks[stop.id].keep.map((poly, n) => <img key={n} src={plate(stop.id)} alt="" decoding="async" style={{ clipPath: fingerClip(poly) }} />)}
    </div>)}
  </>
}

export default function AppConductor() {
  usePageTitle('App del conductor')
  return <main id="contenido" className="v7-page v7-app">
    <V7Section className="ap-01" plateId="03-app/01" priority demo labelledBy="ap-title" screens={SCREENS.hero}>
      <div className="v7-copy">
        <p className="v7-kicker">App del conductor</p>
        <h1 id="ap-title">Tu unidad y<br />tu jornada, en<br />tu teléfono.</h1>
        <p>Consulta el estado del vehículo, realiza la inspección y revisa tu perfil desde la app que acompaña al conductor.</p>
        <DemoButton />
        <ul className="ap-pillars">{PILLARS.map(([icon, text]) => <li key={text}><span className="v7-icon"><V7Icon name={icon} /></span>{text}</li>)}</ul>
      </div>
    </V7Section>

    <V7Section className="ap-02" plateId="03-app/02" demo labelledBy="ap-02-title" screens={SCREENS.inspection}>
      <div className="v7-copy">
        <p className="v7-kicker">Inspección</p>
        <h2 id="ap-02-title">Una inspección<br />que queda<br />registrada.</h2>
        <p>Revisa los puntos de la unidad y registra su condición desde el teléfono. La información permite dar seguimiento a los hallazgos desde la oficina.</p>
        <p className="ap-note">{INSPECTION.join(' ')}</p>
      </div>
    </V7Section>

    <V7Section className="ap-03 is-framed" labelledBy="ap-03-title">
      <div className="v7-copy">
        <p className="v7-kicker">Inicio</p>
        <h2 id="ap-03-title">El estado de<br />tu unidad, a mano.</h2>
        <p>Desde Inicio, el conductor consulta la información de su vehículo y encuentra accesos a inspecciones, mantenimiento y alertas.</p>
        <p className="ap-note">{HOME.join(' ')}</p>
      </div>
      <Frame plateId="03-app/03" x="-65%" ratio="4 / 5" screens={SCREENS.home} />
      <small className="v7-demo">Datos de demostración</small>
    </V7Section>

    <V7Section className="ap-04" plateId="03-app/04" demo labelledBy="ap-04-title" screens={SCREENS.profile}>
      <div className="v7-copy">
        <p className="v7-kicker">Perfil</p>
        <h2 id="ap-04-title">Conoce tu índice<br />de manejo.</h2>
        <p>Consulta tus datos, documentos y el índice de conducción. Sus indicadores ayudan a entender qué aspectos del manejo requieren atención.</p>
        <TextCards columns={1} className="ap-04-cards" items={PROFILE_CARDS} />
      </div>
    </V7Section>

    <V7Section className="ap-05 is-plain" labelledBy="ap-05-title">
      <AppBackdrop side="right" />
      <div className="v7-copy">
        <p className="v7-kicker">Panel web y app</p>
        <h2 id="ap-05-title">La oficina y el conductor, conectados.</h2>
        <p>Conoce el panel web y la app con una demostración de FOM.</p>
        <DemoButton />
      </div>
    </V7Section>

    <V7Footer plateId="03-app/06" className="ap-06" taglineBreak={false} statement={<>Flotas que mantienen<br />el mundo en movimiento</>}>
      <Plate id="03-app/06" screens={SCREENS.footer} className="ap-footer-screens" />
      <small className="v7-demo">Datos de demostración</small>
    </V7Footer>

    <AppTraveller />
  </main>
}
