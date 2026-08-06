import { useMemo, useState } from 'react'
import MapaLibre from './MapaLibre'
import MapaGoogle, { hayClaveMaps } from './MapaGoogle'

// ============================================================
// MAPA DE FLOTA
// Por defecto usa OpenStreetMap con Leaflet: mapa real de calles, gratis y
// sin clave. Si algún día se configura VITE_GOOGLE_MAPS_API_KEY, pasa a
// Google Maps (el mismo proveedor que react-native-maps usa en la app).
// El plano esquemático de más abajo queda solo como último recurso.
// ============================================================

// Encuadre geográfico de la zona de operación
const LNG_MIN = -71.85
const LNG_MAX = -70.95
const LAT_MIN = 9.85
const LAT_MAX = 10.8
const W = 1000
const H = 700

/** Convierte coordenadas reales a la cuadrícula del SVG. */
export function proyectar(lat, lng) {
  return {
    x: ((lng - LNG_MIN) / (LNG_MAX - LNG_MIN)) * W,
    y: ((LAT_MAX - lat) / (LAT_MAX - LAT_MIN)) * H,
  }
}

// Silueta del lago de Maracaibo: cuello estrecho al norte (el estrecho) y
// cuerpo ancho al sur.
const LAGO =
  'M295 26 C292 88, 301 132, 316 176 C250 250, 176 302, 151 402 C131 502, 156 620, 186 700 ' +
  'L722 700 C762 600, 802 520, 792 440 C777 350, 661 300, 561 250 C471 205, 396 190, 361 166 ' +
  'C373 110, 369 64, 363 26 Z'

const CIUDADES = [
  { n: 'Maracaibo', lat: 10.6545, lng: -71.6405, may: true },
  { n: 'Santa Rita', lat: 10.53, lng: -71.52 },
  { n: 'Cabimas', lat: 10.3907, lng: -71.4462, may: true },
  { n: 'Tía Juana', lat: 10.26, lng: -71.36 },
  { n: 'Ciudad Ojeda', lat: 10.2, lng: -71.31, may: true },
  { n: 'Lagunillas', lat: 10.135, lng: -71.26 },
  { n: 'Bachaquero', lat: 9.97, lng: -71.13, may: true },
  { n: 'Mene Grande', lat: 9.82, lng: -70.94 },
]

// Troncal que une la costa oriental (la Intercomunal) + puente sobre el estrecho
const VIAS = (() => {
  const p = (c) => proyectar(c.lat, c.lng)
  const costa = CIUDADES.slice(1)
    .map((c) => {
      const { x, y } = p(c)
      return `${x.toFixed(0)} ${y.toFixed(0)}`
    })
    .join(' L ')
  const mcbo = p(CIUDADES[0])
  const sr = p(CIUDADES[1])
  return {
    troncal: `M ${costa}`,
    puente: `M ${mcbo.x.toFixed(0)} ${mcbo.y.toFixed(0)} L ${sr.x.toFixed(0)} ${sr.y.toFixed(0)}`,
    oeste: `M ${mcbo.x.toFixed(0)} ${mcbo.y.toFixed(0)} L 120 210 L 90 380`,
  }
})()

function colorEstado(v) {
  if (v.estadoMarcha === 'en_marcha') return 'marcha'
  return 'parada'
}

/**
 * Elige el proveedor del mapa. Los módulos siempre importan este componente
 * y no se enteran de cuál está detrás.
 */
export default function Mapa(props) {
  if (hayClaveMaps) return <MapaGoogle {...props} />
  return <MapaLibre {...props} />
}

/** Plano esquemático de reserva, sin red. Se exporta por si hace falta. */
export { MapaEsquema }

function MapaEsquema({
  vehiculos = [],
  seleccionado = null,
  alSeleccionar,
  recorrido = null,
  alto = 'clamp(320px, 52vh, 560px)',
  etiquetas = true,
}) {
  const [sobre, setSobre] = useState(null)

  const pines = useMemo(
    () =>
      vehiculos
        .filter((v) => v.lat != null && v.lng != null)
        .map((v) => ({ ...v, ...proyectar(v.lat, v.lng) })),
    [vehiculos]
  )

  const trazo = useMemo(() => {
    if (!recorrido?.length) return null
    return recorrido
      .map((p, i) => {
        const { x, y } = proyectar(p.lat, p.lng)
        return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`
      })
      .join(' ')
  }, [recorrido])

  const enMarcha = pines.filter((v) => v.estadoMarcha === 'en_marcha').length
  const activo = sobre ?? seleccionado

  return (
    <div className="pnl-mapa" style={{ height: alto }}>
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid slice" role="img"
        aria-label={`Mapa de la flota: ${pines.length} unidades, ${enMarcha} en marcha`}>
        <defs>
          <linearGradient id="pnl-agua" x1="0" y1="0" x2="0.6" y2="1">
            <stop offset="0" stopColor="#1b3f77" />
            <stop offset="1" stopColor="#12294d" />
          </linearGradient>
          <filter id="pnl-brillo" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="9" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Cuadrícula de fondo */}
        <g className="pnl-mapa-rejilla">
          {Array.from({ length: 21 }).map((_, i) => (
            <line key={`v${i}`} x1={i * 50} y1="0" x2={i * 50} y2={H} />
          ))}
          {Array.from({ length: 15 }).map((_, i) => (
            <line key={`h${i}`} x1="0" y1={i * 50} x2={W} y2={i * 50} />
          ))}
        </g>

        {/* Lago */}
        <path className="pnl-mapa-lago-glow" d={LAGO} filter="url(#pnl-brillo)" />
        <path className="pnl-mapa-lago" d={LAGO} />
        <path className="pnl-mapa-orilla" d={LAGO} />

        {/* Vías */}
        <path className="pnl-mapa-via principal" d={VIAS.troncal} />
        <path className="pnl-mapa-via puente" d={VIAS.puente} />
        <path className="pnl-mapa-via" d={VIAS.oeste} />

        {/* Recorrido del vehículo seleccionado */}
        {trazo && <path className="pnl-mapa-ruta" d={trazo} />}

        {/* Ciudades */}
        {etiquetas &&
          CIUDADES.map((c) => {
            const { x, y } = proyectar(c.lat, c.lng)
            return (
              <g key={c.n} className={`pnl-mapa-ciudad${c.may ? ' mayor' : ''}`}>
                <circle cx={x} cy={y} r={c.may ? 3.4 : 2.2} />
                <text x={x + 9} y={y + 4}>{c.n}</text>
              </g>
            )
          })}

        {/* Unidades */}
        {pines.map((v) => {
          const sel = seleccionado === v.id
          return (
            <g
              key={v.id}
              className={`pnl-pin ${colorEstado(v)}${sel ? ' sel' : ''}`}
              transform={`translate(${v.x} ${v.y})`}
              onClick={() => alSeleccionar?.(sel ? null : v.id)}
              onMouseEnter={() => setSobre(v.id)}
              onMouseLeave={() => setSobre(null)}
              role="button"
              tabIndex={0}
              aria-label={`${v.alias}, ${v.placa}, ${v.estadoMarcha === 'en_marcha' ? 'en marcha' : 'detenida'}`}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  alSeleccionar?.(sel ? null : v.id)
                }
              }}
            >
              <circle className="pnl-pin-halo" r="16" />
              <circle className="pnl-pin-dot" r="5.5" />
              {(sel || sobre === v.id) && (
                <g className="pnl-pin-tag" transform="translate(12 -10)">
                  <rect x="0" y="-13" rx="6" width={Math.max(78, v.alias.length * 8.4)} height="24" />
                  <text x="9" y="3">{v.alias}</text>
                </g>
              )}
            </g>
          )
        })}
      </svg>

      <div className="pnl-mapa-leyenda">
        <span className="pnl-mapa-vivo">
          <i />
          En vivo
        </span>
        <span>{pines.length} unidades</span>
        <span className="sep">·</span>
        <span>{enMarcha} en marcha</span>
        <span className="sep">·</span>
        <span title="Configura VITE_GOOGLE_MAPS_API_KEY para ver el mapa real">plano esquemático</span>
      </div>

      {activo && (
        <MapaDetalle
          vehiculo={pines.find((v) => v.id === activo)}
          alCerrar={() => alSeleccionar?.(null)}
          fijado={seleccionado === activo}
        />
      )}
    </div>
  )
}

function MapaDetalle({ vehiculo: v, alCerrar, fijado }) {
  if (!v) return null
  return (
    <div className="pnl-mapa-detalle">
      <div className="pnl-mapa-detalle-top">
        <span className={`pnl-tag ${v.estadoMarcha === 'en_marcha' ? 'verde' : 'gris'}`}>
          {v.estadoMarcha === 'en_marcha' ? 'En marcha' : 'Detenida'}
        </span>
        {fijado && (
          <button type="button" onClick={alCerrar} aria-label="Cerrar detalle del vehículo">
            ✕
          </button>
        )}
      </div>
      <b>{v.alias}</b>
      <span>
        {v.marca} {v.modelo} · {v.placa}
      </span>
      <div className="pnl-mapa-detalle-pie">
        <span>{v.conductorNombre ?? 'Sin conductor'}</span>
        {v.estadoMarcha === 'en_marcha' && <em>{v.velocidadKmh} km/h</em>}
      </div>
    </div>
  )
}
