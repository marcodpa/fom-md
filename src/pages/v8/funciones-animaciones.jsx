// Animaciones propias de Funciones v8 (T-117). Dos piezas que se dibujan EN COORDENADAS DE LA
// FOTO (viewBox = píxeles de la imagen), así escalan con ella y caen sobre lo que señalan en
// escritorio, tableta y teléfono (el teléfono usa el recorte <nombre>-movil y sus propios puntos):
//   1) RutaCostaV8: el recorrido por la carretera de `costa-ruta` (hero). Línea azul FOM que se va
//      dibujando sobre el carril, vehículo que avanza y «pings» de posición en tramos iguales
//      (cuadra con «Posición cada 10 segundos»). Igual que el hero GPS de la web actual (v7).
//   2) SenalesTelematicaV8: las señales que toma el equipo sobre la Hilux de `telematica`: puntos
//      que laten sobre la pieza real, líneas finas hacia la antena, paquetes que viajan por ellas y
//      ondas que salen de la antena hacia el panel. Etiquetas de vidrio escalonadas.
// Movimiento: solo transform, opacity y stroke-dashoffset. Sin movimiento («reducir movimiento»)
// el HTML ya queda en su estado final: recorrido completo, puntos y etiquetas visibles, quieto.
// animarRutaCostaV8 / animarSenalesV8 se llaman desde useMomentoV8 (que ya no corre con «reducir
// movimiento») y devuelven su limpieza.

// ── Utilidades ────────────────────────────────────────────────────────────
// Catmull-Rom por los puntos, como Béziers cúbicas: una línea suave que sigue la calle.
const suave = pts => pts.slice(1).reduce((d, p, i) => {
  const p0 = pts[Math.max(i - 1, 0)], p1 = pts[i], p3 = pts[Math.min(i + 2, pts.length - 1)]
  const c1 = [p1[0] + (p[0] - p0[0]) / 6, p1[1] + (p[1] - p0[1]) / 6]
  const c2 = [p[0] - (p3[0] - p1[0]) / 6, p[1] - (p3[1] - p1[1]) / 6]
  return `${d} C${c1.map(n => n.toFixed(1)).join(' ')} ${c2.map(n => n.toFixed(1)).join(' ')} ${p.join(' ')}`
}, `M${pts[0].join(' ')}`)

// n puntos a distancias iguales sobre la poligonal (0, 1/n, 2/n …): los pings de cada tramo.
function tramos(pts, n) {
  const largos = pts.slice(1).map((p, i) => Math.hypot(p[0] - pts[i][0], p[1] - pts[i][1]))
  const total = largos.reduce((a, b) => a + b, 0)
  return Array.from({ length: n }, (_, k) => {
    let falta = (total * k) / n
    for (let i = 0; i < largos.length; i++) {
      if (falta <= largos[i]) {
        const f = largos[i] ? falta / largos[i] : 0
        return [Math.round(pts[i][0] + (pts[i + 1][0] - pts[i][0]) * f), Math.round(pts[i][1] + (pts[i + 1][1] - pts[i][1]) * f)]
      }
      falta -= largos[i]
    }
    return pts[pts.length - 1]
  })
}

const visible = el => !!el && el.getClientRects().length > 0 // display: none → sin cajas

// ── 1 · Recorrido por la carretera de la costa ───────────────────────────
// Carril derecho (lado del mar) de la carretera, trazado sobre la foto 1920 × 792. El recorte del
// teléfono (750 × 937) es la misma toma: x_movil = (x − 642) · 1,1837 y y_movil = y · 1,1837.
const CARRIL = [
  [327, 73], [399, 107], [485, 156], [551, 193], [623, 228], [719, 268], [786, 292], [884, 317], [955, 330],
  [1039, 344], [1098, 353], [1200, 370], [1256, 382], [1328, 398], [1377, 413], [1427, 428], [1477, 445],
  [1536, 464], [1594, 483], [1694, 516], [1794, 546],
]
const CARRIL_MOVIL = [[40, 296], [91, 317], [170, 346], [286, 375], [370, 391], [470, 407], [540, 418], [615, 430], [684, 443]]

const RUTAS = [
  { clase: 'is-escritorio', caja: [1920, 792], pts: CARRIL, pings: tramos(CARRIL, 7), duracion: 7 },
  { clase: 'is-movil', caja: [750, 937], pts: CARRIL_MOVIL, pings: tramos(CARRIL_MOVIL, 5), duracion: 5 },
].map(r => ({ ...r, d: suave(r.pts), fin: r.pts[r.pts.length - 1] }))

export function RutaCostaV8() {
  return RUTAS.map(r => <svg key={r.clase} className={`funciones-ruta ${r.clase}`} viewBox={`0 0 ${r.caja.join(' ')}`}
    preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">
    <path className="funciones-ruta-plan" d={r.d} />
    <path className="funciones-ruta-brillo" d={r.d} pathLength="1" />
    <path className="funciones-ruta-linea" d={r.d} pathLength="1" />
    {r.pings.map(([x, y]) => <g key={`${x}-${y}`} className="funciones-ruta-ping" transform={`translate(${x} ${y})`} data-x={x} data-y={y}>
      <circle className="is-onda" r="14" />
      <circle className="is-punto" r="6" />
    </g>)}
    <g className="funciones-ruta-vehiculo" transform={`translate(${r.fin.join(' ')})`}>
      <circle className="is-halo" r="22" />
      <circle className="is-cuerpo" r="9" />
    </g>
  </svg>)
}

function crearRuta(svg, gsap, duracion) {
  const linea = svg.querySelector('.funciones-ruta-linea')
  const brillo = svg.querySelector('.funciones-ruta-brillo')
  const vehiculo = svg.querySelector('.funciones-ruta-vehiculo')
  const pings = [...svg.querySelectorAll('.funciones-ruta-ping')]
  const largo = linea.getTotalLength()
  const final = vehiculo.getAttribute('transform')

  // Punto del trazo más cercano a cada ping → en qué momento pasa el vehículo por él.
  const muestras = Array.from({ length: 241 }, (_, i) => { const p = linea.getPointAtLength((largo * i) / 240); return [i / 240, p.x, p.y] })
  const momento = g => {
    const x = Number(g.dataset.x), y = Number(g.dataset.y)
    return muestras.reduce((m, s) => (Math.hypot(s[1] - x, s[2] - y) < Math.hypot(m[1] - x, m[2] - y) ? s : m))[0]
  }

  const p = { t: 0 }
  const pintar = () => {
    const off = (1 - p.t).toFixed(4)
    linea.style.strokeDashoffset = off
    brillo.style.strokeDashoffset = off
    const pt = linea.getPointAtLength(largo * p.t)
    vehiculo.setAttribute('transform', `translate(${pt.x.toFixed(1)} ${pt.y.toFixed(1)})`)
  }
  linea.style.strokeDasharray = '1 1'
  brillo.style.strokeDasharray = '1 1'

  // Un recorrido: dibuja la línea a velocidad constante, ping al pasar por cada tramo, pausa con
  // todo dibujado y se apaga suave antes de empezar otra vez (bucle).
  const tl = gsap.timeline({ paused: true, repeat: -1, repeatDelay: 0.5 })
  tl.fromTo(p, { t: 0 }, { t: 1, duration: duracion, ease: 'none', onUpdate: pintar }, 0)
  tl.fromTo([linea, brillo, vehiculo], { opacity: 0 }, { opacity: 1, duration: 0.4, ease: 'power1.out' }, 0)
  pings.forEach(g => {
    const en = momento(g) * duracion
    tl.fromTo(g.querySelector('.is-punto'), { opacity: 0, scale: 0.2, transformOrigin: '50% 50%' }, { opacity: 1, scale: 1, duration: 0.35, ease: 'back.out(2.2)' }, en)
    tl.fromTo(g.querySelector('.is-onda'), { opacity: 0.85, scale: 0.4, transformOrigin: '50% 50%' }, { opacity: 0, scale: 3, duration: 1.4, ease: 'power2.out' }, en)
  })
  const puntos = pings.map(g => g.querySelector('.is-punto'))
  tl.to([linea, brillo, ...puntos], { opacity: 0, duration: 0.8, ease: 'power1.inOut' }, duracion + 2.4)
  tl.to(vehiculo, { opacity: 0, duration: 0.5, ease: 'power1.in' }, duracion + 2.7)
  tl.progress(0)
  pintar()

  const limpiar = () => {
    tl.kill()
    for (const el of [linea, brillo]) { el.style.strokeDasharray = ''; el.style.strokeDashoffset = '' }
    vehiculo.setAttribute('transform', final)
  }
  return { svg, tl, limpiar }
}

export function animarRutaCostaV8({ q, gsap, ScrollTrigger }) {
  const medio = q('.funciones-hero-medio')[0]
  if (!medio) return undefined
  const rutas = RUTAS.map(r => { const svg = q(`.funciones-ruta.${r.clase}`)[0]; return svg && crearRuta(svg, gsap, r.duracion) }).filter(Boolean)
  // Solo corre la ruta visible (escritorio o teléfono) y solo con el hero en pantalla.
  let st = null
  const sincronizar = () => { if (st) rutas.forEach(r => (st.isActive && visible(r.svg) ? r.tl.play() : r.tl.pause())) }
  st = ScrollTrigger.create({ trigger: medio, start: 'top 90%', end: 'bottom 5%', onToggle: sincronizar, onRefresh: sincronizar })
  sincronizar()
  return () => { st.kill(); rutas.forEach(r => r.limpiar()) }
}

// ── 2 · Señales de telemática sobre la Hilux ─────────────────────────────
// p = la pieza en la foto, e = dónde va la etiqueta (lado: hacia dónde crece), sin etiqueta en el
// teléfono cuando no hay sitio libre (no tapa la camioneta).
const SENALES = [
  {
    clase: 'is-escritorio', caja: [1672, 941], antena: [1244, 146], punta: [1276, 98],
    puntos: [
      { id: 'gps', p: [1252, 136], e: [1196, 74], lado: 'izq', texto: 'Ubicación GPS' },
      { id: 'km', p: [1268, 272], e: [1340, 214], lado: 'der', texto: 'Kilómetros' },
      { id: 'encendido', p: [1143, 430], e: [1262, 520], lado: 'der', texto: 'Encendido' },
      { id: 'velocidad', p: [985, 425], e: [870, 322], lado: 'izq', texto: 'Velocidad' },
      { id: 'freno', p: [1150, 655], e: [1010, 808], lado: 'izq', texto: 'Frenada brusca' },
      { id: 'aceleracion', p: [1440, 600], e: [1395, 766], lado: 'der', texto: 'Aceleración brusca' },
    ],
  },
  {
    clase: 'is-movil', caja: [750, 937], antena: [580, 145], punta: [609, 100],
    puntos: [
      { id: 'gps', p: [588, 134], e: [530, 66], lado: 'izq', texto: 'Ubicación GPS' },
      { id: 'km', p: [600, 268] },
      { id: 'encendido', p: [485, 420] },
      { id: 'velocidad', p: [370, 455], e: [268, 246], lado: 'izq', texto: 'Velocidad' },
      { id: 'freno', p: [478, 660], e: [420, 892], lado: 'izq', texto: 'Frenada brusca' },
    ],
  },
]
// Arco de onda de radio r sobre la punta de la antena (de −55° a 55° desde la vertical).
const arco = ([x, y], r) => {
  const a = (55 * Math.PI) / 180, dx = (r * Math.sin(a)).toFixed(1), dy = (r * Math.cos(a)).toFixed(1)
  return `M${(x - dx).toFixed(1)} ${(y - dy).toFixed(1)} A${r} ${r} 0 0 1 ${(x + Number(dx)).toFixed(1)} ${(y - dy).toFixed(1)}`
}
const pct = ([x, y], [w, h]) => ({ left: `${((x / w) * 100).toFixed(3)}%`, top: `${((y / h) * 100).toFixed(3)}%` })

export function SenalesTelematicaV8() {
  return SENALES.map(s => <div key={s.clase} className={`funciones-senales ${s.clase}`} aria-hidden="true">
    <svg viewBox={`0 0 ${s.caja.join(' ')}`} preserveAspectRatio="xMidYMid slice" focusable="false">
      {s.puntos.filter(t => t.id !== 'gps').map(t => <g key={t.id} className="funciones-senal-via">
        <path className="is-linea" d={`M${t.p.join(' ')} L${s.antena.join(' ')}`} pathLength="1" />
        <path className="is-paquete" d={`M${t.p.join(' ')} L${s.antena.join(' ')}`} pathLength="1" />
      </g>)}
      {s.puntos.filter(t => t.e).map(t => <path key={t.id} className="funciones-senal-guia" d={`M${t.p.join(' ')} L${t.e.join(' ')}`} pathLength="1" />)}
      {[34, 60, 86].map(r => <path key={r} className="funciones-senal-onda" d={arco(s.punta, r)} />)}
      {s.puntos.map(t => <g key={t.id} className="funciones-senal-punto" transform={`translate(${t.p.join(' ')})`}>
        <circle className="is-halo" r="20" />
        <circle className="is-nucleo" r="7" />
      </g>)}
    </svg>
    {s.puntos.filter(t => t.e).map(t => <span key={t.id} className={`v8-vidrio funciones-senal-etiqueta is-${t.lado}`} style={pct(t.e, s.caja)}>
      <i />{t.texto}
    </span>)}
  </div>)
}

export function animarSenalesV8({ q, gsap, ScrollTrigger }) {
  const medio = q('.funciones-tele-medio')[0]
  if (!medio) return undefined
  const capas = q('.funciones-senales')
  const todo = sel => capas.flatMap(c => [...c.querySelectorAll(sel)])
  const puntos = todo('.funciones-senal-punto .is-nucleo')
  const halos = todo('.funciones-senal-punto .is-halo')
  const lineas = [...todo('.funciones-senal-via .is-linea'), ...todo('.funciones-senal-guia')]
  const paquetes = todo('.funciones-senal-via .is-paquete')
  const ondas = capas.map(c => [...c.querySelectorAll('.funciones-senal-onda')])
  const etiquetas = todo('.funciones-senal-etiqueta')

  // Entrada (una vez): los puntos aparecen sobre cada pieza, las líneas se tienden hacia la
  // antena y las etiquetas llegan escalonadas.
  gsap.set(lineas, { strokeDasharray: '1 1', strokeDashoffset: 1 })
  gsap.set(puntos, { opacity: 0, scale: 0.2, transformOrigin: '50% 50%' })
  gsap.set(etiquetas, { opacity: 0, y: 10 })
  gsap.set([...halos, ...paquetes, ...ondas.flat()], { opacity: 0 })
  const entra = gsap.timeline({ paused: true })
  entra.to(puntos, { opacity: 1, scale: 1, duration: 0.45, ease: 'back.out(2.2)', stagger: 0.09 }, 0)
  entra.to(lineas, { strokeDashoffset: 0, duration: 0.9, ease: 'power2.inOut', stagger: 0.07 }, 0.25)
  entra.to(etiquetas, { opacity: 1, y: 0, duration: 0.6, ease: 'power2.out', stagger: 0.14 }, 0.6)

  // Bucle (solo con la foto en pantalla): los puntos laten, los paquetes viajan de cada pieza a la
  // antena y las ondas salen de la antena hacia arriba (rumbo al panel).
  const bucle = gsap.timeline({ paused: true })
  bucle.fromTo(halos, { opacity: 0.7, scale: 0.4, transformOrigin: '50% 50%' }, { opacity: 0, scale: 1.6, duration: 1.8, ease: 'power2.out', stagger: { each: 0.3, repeat: -1 } }, 0)
  bucle.fromTo(paquetes, { opacity: 1, strokeDasharray: '0.1 1.2', strokeDashoffset: 0.1 }, { strokeDashoffset: -1, duration: 1.6, ease: 'power1.in', stagger: { each: 0.35, repeat: -1, repeatDelay: 0.6 } }, 0)
  ondas.forEach(o => {
    const capa = o[0]?.closest('svg')
    const s = SENALES.find(x => capa?.parentElement.classList.contains(x.clase))
    if (!s) return
    bucle.fromTo(o, { opacity: 0.9, scale: 0.55, svgOrigin: s.punta.join(' ') }, { opacity: 0, scale: 1.15, duration: 1.8, ease: 'power1.out', stagger: { each: 0.6, repeat: -1 } }, 0.2)
  })

  let empezo = false
  const st = ScrollTrigger.create({
    trigger: medio, start: 'top 75%', end: 'bottom 10%',
    onToggle: self => {
      if (self.isActive && !empezo) { empezo = true; entra.play(); bucle.play(0.01) }
      else if (empezo) self.isActive ? bucle.resume() : bucle.pause()
    },
  })
  if (st.isActive && !empezo) { empezo = true; entra.play(); bucle.play(0.01) }
  return () => { st.kill(); entra.kill(); bucle.kill() }
}
