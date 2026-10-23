// Escena de teléfonos de la web v8 (pedido de Marco, a partir del efecto de slush.app, con el
// estilo de FOM): una cinta azul FOM en 3D, como una ruta que cruza la escena, y dos o tres
// teléfonos de frente con capturas REALES de la app. Sin caja propia (T-134): todo va sobre el
// fondo de la página y la cinta se funde en él por los bordes.
// El movimiento lo hace useMomentoV8 (momentoTelefonosV8.js), atado al scroll:
//   escritorio ≥ 1024 px: la escena se queda fija; primero la pantalla de cada teléfono se
//   desplaza sola (como si alguien hiciera scroll en la app), luego los teléfonos se inclinan en
//   3D hacia lados opuestos y se separan, flotando; al final se suelta.
//   tableta y teléfono: sin escena fija; la pantalla se desplaza y se inclinan levemente al pasar.
//   «reducir movimiento»: todo quieto, de frente y con la captura de siempre.
//
// <EscenaTelefonosV8 telefonos={[{ nombre: 'cap-movil-mnt-reportar', alt: '…', pie: <>…</>, corto? }]} />
//   nombre = captura de la app (si tiene continuación en pantallasV8.js, la pantalla se desplaza).
//   pie    = texto bajo el teléfono (en el teléfono se usa `corto` si existe). nota = «Captura
//            real de la app · Datos de demostración» (o el texto que pases; false = sin nota).
import { useId } from 'react'
import { PantallaTelefonoV8 } from './ImagenesV8'
import './escena-telefonos-v8.css'

// ── La cinta: una ruta azul FOM en 3D (cara, canto, raya central y brillo) ────────────────────
// Se calcula una vez: una curva en S que entra ancha por abajo a la izquierda (cerca) y sale
// angosta arriba a la derecha (lejos), con su canto hacia abajo para que se lea el grosor.
const VB = { w: 1200, h: 720 }
const CURVA = [[-200, 700], [430, 900], [560, 70], [1420, 170]]
const punto = t => {
  const u = 1 - t
  const a = u * u * u, b = 3 * u * u * t, c = 3 * u * t * t, d = t * t * t
  return [0, 1].map(k => a * CURVA[0][k] + b * CURVA[1][k] + c * CURVA[2][k] + d * CURVA[3][k])
}
const tangente = t => {
  const u = 1 - t
  const [p0, p1, p2, p3] = CURVA
  return [0, 1].map(k => 3 * u * u * (p1[k] - p0[k]) + 6 * u * t * (p2[k] - p1[k]) + 3 * t * t * (p3[k] - p2[k]))
}
const r1 = n => Math.round(n * 10) / 10
const ruta = pts => `M${pts.map(([x, y]) => `${r1(x)} ${r1(y)}`).join('L')}`

function trazarCinta() {
  const N = 120
  const arriba = [], abajo = [], canto = [], centro = []
  for (let i = 0; i <= N; i++) {
    const t = i / N
    const [x, y] = punto(t)
    const [dx, dy] = tangente(t)
    const largo = Math.hypot(dx, dy) || 1
    const nx = -dy / largo, ny = dx / largo // normal hacia abajo de la marcha
    const media = 132 - 98 * Math.pow(t, 0.85) // ancho: cerca grande, lejos angosta
    const grosor = media * 0.36
    arriba.push([x - nx * media, y - ny * media])
    abajo.push([x + nx * media, y + ny * media])
    canto.push([x + nx * media, y + ny * media + grosor])
    centro.push({ x, y, nx, ny, media, largo })
  }
  // Raya discontinua del centro: trazos que se acortan y adelgazan con la distancia.
  const rayas = []
  let recorrido = 0, tramo = []
  for (let i = 1; i < centro.length; i++) {
    const p = centro[i], q = centro[i - 1]
    recorrido += Math.hypot(p.x - q.x, p.y - q.y)
    const paso = 34 + p.media * 0.5
    const encendida = Math.floor(recorrido / paso) % 2 === 0
    if (encendida) tramo.push(p)
    if ((!encendida || i === centro.length - 1) && tramo.length > 1) {
      const ida = tramo.map(c => [c.x - c.nx * c.media * 0.045, c.y - c.ny * c.media * 0.045])
      const vuelta = tramo.map(c => [c.x + c.nx * c.media * 0.045, c.y + c.ny * c.media * 0.045]).reverse()
      rayas.push(`${ruta([...ida, ...vuelta])}Z`)
    }
    if (!encendida) tramo = []
  }
  return {
    cara: `${ruta([...arriba, ...abajo.slice().reverse()])}Z`,
    canto: `${ruta([...abajo, ...canto.slice().reverse()])}Z`,
    borde: ruta(arriba),
    orilla: ruta(abajo),
    rayas: rayas.join(''),
  }
}
const CINTA = trazarCinta()

// Los id del SVG llevan el de la escena: puede haber más de una cinta en la misma página.
function CintaV8() {
  const id = `v8-cinta${useId().replace(/[^a-zA-Z0-9]/g, '')}`
  return <div className="v8-tels-cinta" aria-hidden="true">
    <svg viewBox={`0 0 ${VB.w} ${VB.h}`} preserveAspectRatio="xMidYMid slice" focusable="false">
      <defs>
        <linearGradient id={`${id}-cara`} gradientUnits="userSpaceOnUse" x1="0" y1="720" x2="1200" y2="120">
          <stop offset="0" stopColor="#5aabf7" />
          <stop offset=".38" stopColor="#3d9bf5" />
          <stop offset=".72" stopColor="#1f63a8" />
          <stop offset="1" stopColor="#123a66" />
        </linearGradient>
        <linearGradient id={`${id}-canto`} gradientUnits="userSpaceOnUse" x1="0" y1="720" x2="1200" y2="120">
          <stop offset="0" stopColor="#1b4f86" />
          <stop offset=".6" stopColor="#123a66" />
          <stop offset="1" stopColor="#0b2442" />
        </linearGradient>
        {/* Luz que cruza la cara a lo largo: da volumen de cinta curva. */}
        <linearGradient id={`${id}-luz`} gradientUnits="userSpaceOnUse" x1="300" y1="200" x2="700" y2="760">
          <stop offset="0" stopColor="#fff" stopOpacity=".34" />
          <stop offset=".45" stopColor="#fff" stopOpacity="0" />
          <stop offset="1" stopColor="#04101f" stopOpacity=".38" />
        </linearGradient>
        <filter id={`${id}-halo`} x="-20%" y="-30%" width="140%" height="160%"><feGaussianBlur stdDeviation="34" /></filter>
        <filter id={`${id}-suave`} x="-5%" y="-5%" width="110%" height="110%"><feGaussianBlur stdDeviation="2.2" /></filter>
        {/* Textura fina, como asfalto: ruido muy tenue recortado a la cara. */}
        <filter id={`${id}-grano`} x="0" y="0" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="2" seed="7" result="ruido" />
          <feColorMatrix in="ruido" type="matrix" values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 .22 0" result="puntos" />
          <feComposite in="puntos" in2="SourceGraphic" operator="in" />
        </filter>
      </defs>
      <path d={CINTA.cara} fill="#3d9bf5" opacity=".42" filter={`url(#${id}-halo)`} />
      <path d={CINTA.canto} fill={`url(#${id}-canto)`} />
      <path d={CINTA.cara} fill={`url(#${id}-cara)`} />
      <path d={CINTA.cara} fill={`url(#${id}-luz)`} />
      <path d={CINTA.cara} fill="#000" filter={`url(#${id}-grano)`} />
      <path d={CINTA.rayas} fill="#eaf4ff" opacity=".62" />
      <path d={CINTA.orilla} fill="none" stroke="#0b2442" strokeOpacity=".55" strokeWidth="2" />
      <path d={CINTA.borde} fill="none" stroke="#b9dcff" strokeOpacity=".75" strokeWidth="3" filter={`url(#${id}-suave)`} />
    </svg>
  </div>
}

// La captura entra a 2x en el ancho del teléfono (290 px en escritorio, ~150 en el teléfono).
const SIZES = '(max-width: 599px) 150px, 272px'

export default function EscenaTelefonosV8({ telefonos, nota = true, etiqueta, className = '' }) {
  const texto = nota === true ? 'Capturas reales de la app · Datos de demostración' : nota
  const conPie = telefonos.some(t => t.pie)
  return <figure className={`v8-tels is-${telefonos.length} ${className}`} data-v8-tels="" aria-label={etiqueta}>
    <div className="v8-tels-tarjeta">
      <CintaV8 />
      <div className="v8-tels-fila">
        {telefonos.map(t => <div key={t.nombre} className="v8-tels-col">
          <div className="v8-tels-tel">
            <div className="v8-tels-marco">
              <PantallaTelefonoV8 nombre={t.nombre} alt={t.alt} sizes={SIZES} />
            </div>
          </div>
        </div>)}
      </div>
    </div>
    {conPie && <ul className="v8-tels-pies v8-sm v8-t2">
      {telefonos.map(t => <li key={t.nombre}>
        {t.corto ? <><span className="v8-tels-largo">{t.pie}</span><span className="v8-tels-corto">{t.corto}</span></> : t.pie}
      </li>)}
    </ul>}
    {texto && <figcaption className="v8-nota-demo">{texto}</figcaption>}
  </figure>
}
