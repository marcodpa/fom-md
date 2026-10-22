// ============================================================
// EVENTOS DE MANEJO EN EL MAPA — frenadas, aceleraciones y excesos (política driving-v1).
// ------------------------------------------------------------
// Funciones puras: pasan cada evento del servidor a la forma del panel, deciden cuáles
// se pintan, arman el GeoJSON de la capa de Mapbox y escriben los textos.
// Los eventos los detecta el servidor; aquí no se detecta nada.
//
// Excesos: el servidor los marca cuando salta la alerta de velocidad de la empresa, con
// el umbral que la empresa configuró (puede ser 80 o 100 km/h). Marco pidió ver en el
// mapa solo los de MÁS de 120 km/h, así que aquí se filtra otra vez con EXCESO_KMH.
// ============================================================
import * as f from './formato.js'

/** En el mapa, un exceso solo se muestra si la velocidad registrada pasa de esto. */
export const EXCESO_KMH = 120

/**
 * Los tres tipos que se muestran, en el orden de la leyenda. `glifo` es el mismo dibujo de la
 * tarjeta «Manejo» (trazos de 24×24); `color` lleva texto oscuro encima.
 */
export const TIPOS_EVENTO = [
  {
    clave: 'frenada', servidor: 'harsh_braking', nombre: 'Frenada brusca', plural: 'Frenadas bruscas',
    color: '#F5C242', orden: 2,
    glifo: ['M6 12a6 6 0 1 0 12 0a6 6 0 1 0-12 0', 'M4 5a10 10 0 0 0 0 14M20 5a10 10 0 0 1 0 14M12 8v5m0 3h.01'],
  },
  {
    clave: 'aceleracion', servidor: 'harsh_acceleration', nombre: 'Aceleración brusca', plural: 'Aceleraciones bruscas',
    color: '#B48CFF', orden: 1,
    glifo: ['M4 17 11 10l4 4 5-9M15 5h5v5M4 21h16'],
  },
  {
    clave: 'exceso', servidor: 'speeding', nombre: 'Exceso de velocidad', plural: `Excesos de más de ${EXCESO_KMH} km/h`,
    color: '#FF6369', orden: 3,
    glifo: ['M4 18a9 9 0 1 1 16 0M12 5v2M5 9l2 1M19 9l-2 1M12 14l4-5', 'M10 14a2 2 0 1 0 4 0a2 2 0 1 0-4 0'],
  },
]

export const CLAVES_EVENTO = TIPOS_EVENTO.map((t) => t.clave)
const POR_CLAVE = Object.fromEntries(TIPOS_EVENTO.map((t) => [t.clave, t]))
const POR_SERVIDOR = Object.fromEntries(TIPOS_EVENTO.map((t) => [t.servidor, t.clave]))

/** El tipo (nombre, color, glifo) de una clave; null si no es de los tres. */
export const tipoEvento = (clave) => POR_CLAVE[clave] ?? null

/** Días que acepta el servidor para `driving-events` (DrivingEventsQueryDto). */
export const DIAS_SERVIDOR = [7, 30, 90]
/** Tope de eventos por pedido que acepta el servidor. */
export const LIMITE_EVENTOS = 100

/**
 * El período del servidor que cubre el que se pidió: 28 días se piden como 30 y el resto
 * se recorta aquí con `eventosParaMapa`.
 */
export function diasServidor(dias) {
  const n = Number(dias)
  return DIAS_SERVIDOR.find((d) => d >= n) ?? DIAS_SERVIDOR.at(-1)
}

const numeroONulo = (n) => (n === null || n === undefined || n === '' ? null : (Number.isFinite(Number(n)) ? Number(n) : null))

/** Un evento de `GET …/driving-events` en la forma del panel. */
export function comoEventoManejo(e) {
  return {
    id: String(e?.id ?? ''),
    tipo: POR_SERVIDOR[e?.type] ?? null,
    hora: e?.occurredAt ?? null,
    vehiculoId: e?.vehicleId ?? null,
    unidad: e?.vehicleCode ?? null,
    lat: numeroONulo(e?.lat),
    lng: numeroONulo(e?.lng),
    antes: numeroONulo(e?.speedBeforeKph),
    despues: numeroONulo(e?.speedAfterKph),
  }
}

/** La velocidad que registró un exceso (el servidor la guarda en «antes»). */
export function velocidadExceso(e) {
  return e?.antes ?? e?.despues ?? null
}

const conPosicion = (e) => Number.isFinite(e?.lat) && Number.isFinite(e?.lng)
  && Math.abs(e.lat) <= 90 && Math.abs(e.lng) <= 180 && !(e.lat === 0 && e.lng === 0)

/** ¿Va en el mapa? De los tres tipos, con posición, y si es exceso, de más de EXCESO_KMH. */
export function vaEnMapa(e) {
  if (!e || !POR_CLAVE[e.tipo] || !conPosicion(e)) return false
  if (e.tipo !== 'exceso') return true
  const v = velocidadExceso(e)
  return v !== null && v > EXCESO_KMH
}

const msDe = (iso) => {
  const t = Date.parse(iso ?? '')
  return Number.isFinite(t) ? t : null
}

/**
 * Los eventos que se pintan, del más nuevo al más viejo.
 * - `dias`: solo los de los últimos N días (el servidor pudo traer un período más largo).
 * - `desde` / `hasta` (ISO o ms): una ventana de tiempo, la del recorrido.
 * - `vehiculoId`: solo los de esa unidad.
 */
export function eventosParaMapa(lista, { dias = null, desde = null, hasta = null, vehiculoId = null, ahora = Date.now() } = {}) {
  const inicio = Math.max(
    dias ? ahora - Number(dias) * 86400000 : -Infinity,
    desde === null ? -Infinity : (typeof desde === 'number' ? desde : msDe(desde) ?? -Infinity),
  )
  const fin = hasta === null ? Infinity : (typeof hasta === 'number' ? hasta : msDe(hasta) ?? Infinity)
  return (Array.isArray(lista) ? lista : [])
    .filter((e) => vaEnMapa(e) && (!vehiculoId || e.vehiculoId === vehiculoId))
    .filter((e) => {
      const t = msDe(e.hora)
      return t !== null && t >= inicio && t <= fin
    })
    .sort((a, b) => msDe(b.hora) - msDe(a.hora) || String(b.id).localeCompare(String(a.id)))
}

/** Cuántos hay de cada tipo: { frenada, aceleracion, exceso }. */
export function contarPorTipo(lista) {
  const cuenta = Object.fromEntries(CLAVES_EVENTO.map((c) => [c, 0]))
  for (const e of lista ?? []) if (e?.tipo in cuenta) cuenta[e.tipo] += 1
  return cuenta
}

/** Solo los tipos encendidos en la leyenda. */
export function filtrarPorTipos(lista, tipos) {
  const activos = tipos instanceof Set ? tipos : new Set(tipos ?? [])
  return (lista ?? []).filter((e) => activos.has(e.tipo))
}

/** La colección GeoJSON de la capa de símbolos. `activo` (id) va más grande y encima. */
export function geojsonEventos(lista, activo = null) {
  return {
    type: 'FeatureCollection',
    features: (lista ?? []).filter(vaEnMapa).map((e) => ({
      type: 'Feature',
      properties: {
        id: e.id,
        tipo: e.tipo,
        activo: e.id === activo,
        orden: e.id === activo ? 10 : POR_CLAVE[e.tipo].orden,
      },
      geometry: { type: 'Point', coordinates: [e.lng, e.lat] },
    })),
  }
}

const kmh = (n) => f.numero(Math.round(n))

/** «85 → 30 km/h» en frenadas y aceleraciones; «134 km/h» en excesos; '' sin velocidades. */
export function velocidadesEvento(e) {
  if (e?.tipo === 'exceso') {
    const v = velocidadExceso(e)
    return v === null ? '' : `${kmh(v)} km/h`
  }
  if (e?.antes !== null && e?.antes !== undefined && e?.despues !== null && e?.despues !== undefined) return `${kmh(e.antes)} → ${kmh(e.despues)} km/h`
  const una = e?.antes ?? e?.despues
  return una === null || una === undefined ? '' : `${kmh(una)} km/h`
}

/** «Unidad 01»; si el código ya dice «Unidad», no se repite. */
export function unidadEvento(e) {
  const u = String(e?.unidad ?? '').trim()
  if (!u) return ''
  return /^unidad\b/iu.test(u) ? u : `Unidad ${u}`
}

/** Las partes del texto: nombre, velocidades, fecha y hora, unidad (las vacías no van). */
export function partesEvento(e) {
  return [
    tipoEvento(e?.tipo)?.nombre ?? 'Evento de manejo',
    velocidadesEvento(e),
    e?.hora ? f.fechaHora(e.hora) : '',
    unidadEvento(e),
  ].filter(Boolean)
}

/** «Frenada brusca · 85 → 30 km/h · 21 oct, 9:42 a. m. · Unidad 01». */
export function textoEvento(e) {
  return partesEvento(e).join(' · ')
}

/** «3 frenadas, 1 aceleración y 2 excesos»; «Sin eventos» si no hay ninguno. */
export function resumenEventos(cuenta) {
  const nombres = { frenada: ['frenada', 'frenadas'], aceleracion: ['aceleración', 'aceleraciones'], exceso: ['exceso', 'excesos'] }
  const partes = CLAVES_EVENTO.filter((c) => cuenta?.[c] > 0).map((c) => `${f.numero(cuenta[c])} ${nombres[c][cuenta[c] === 1 ? 0 : 1]}`)
  if (!partes.length) return 'Sin eventos'
  return partes.length === 1 ? partes[0] : `${partes.slice(0, -1).join(', ')} y ${partes.at(-1)}`
}

/** Excesos del período que no se pintan por ir a EXCESO_KMH o menos (o sin velocidad registrada). */
export function excesosBajoUmbral(lista, { dias = null, ahora = Date.now() } = {}) {
  const inicio = dias ? ahora - Number(dias) * 86400000 : -Infinity
  return (Array.isArray(lista) ? lista : []).filter((e) => e?.tipo === 'exceso' && !vaEnMapa(e)
    && (msDe(e.hora) ?? -Infinity) >= inicio).length
}
