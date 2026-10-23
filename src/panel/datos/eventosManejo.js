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
 * tarjeta «Manejo» (trazos de 24×24); `color` lleva texto oscuro encima. `corto`: el de las pastillas.
 */
export const TIPOS_EVENTO = [
  {
    clave: 'frenada', servidor: 'harsh_braking', nombre: 'Frenada brusca', plural: 'Frenadas bruscas', corto: 'Frenadas',
    color: '#F5C242', orden: 2,
    glifo: ['M6 12a6 6 0 1 0 12 0a6 6 0 1 0-12 0', 'M4 5a10 10 0 0 0 0 14M20 5a10 10 0 0 1 0 14M12 8v5m0 3h.01'],
  },
  {
    clave: 'aceleracion', servidor: 'harsh_acceleration', nombre: 'Aceleración brusca', plural: 'Aceleraciones bruscas', corto: 'Aceleraciones',
    color: '#B48CFF', orden: 1,
    glifo: ['M4 17 11 10l4 4 5-9M15 5h5v5M4 21h16'],
  },
  {
    clave: 'exceso', servidor: 'speeding', nombre: 'Exceso de velocidad', plural: `Excesos de más de ${EXCESO_KMH} km/h`, corto: `Excesos +${EXCESO_KMH}`,
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
  const filas = []
  for (const e of Array.isArray(lista) ? lista : []) {
    if (!vaEnMapa(e) || (vehiculoId && e.vehiculoId !== vehiculoId)) continue
    const t = msDe(e.hora)
    if (t !== null && t >= inicio && t <= fin) filas.push({ t, e })
  }
  return ordenarPorHora(filas)
}

/**
 * Del más nuevo al más viejo (a igual hora, por id). `filas`: [{ t (ms), e }]. La hora se lee una
 * vez por evento y no en cada comparación: con la flota entera son decenas de miles.
 */
function ordenarPorHora(filas) {
  return filas
    .sort((a, b) => b.t - a.t || String(b.e?.id).localeCompare(String(a.e?.id)))
    .map((x) => x.e)
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

/**
 * La colección GeoJSON de la capa de símbolos. `activo` (id) va más grande, encima y nunca
 * dentro de un grupo. Con `metros` > 0 los que caen casi en el mismo punto van juntos en un
 * círculo (`tipo: 'grupo'`, `cantidad` y los `ids` separados por «|»); ver `agruparCercanos`.
 */
export function geojsonEventos(lista, activo = null, { metros = 0 } = {}) {
  return {
    type: 'FeatureCollection',
    features: agruparCercanos(lista, metros, activo).map((g) => {
      const e = g.eventos[0]
      const grupo = g.eventos.length > 1
      return {
        type: 'Feature',
        properties: grupo
          ? { id: g.id, tipo: 'grupo', cantidad: g.eventos.length, ids: g.eventos.map((x) => x.id).join('|'), activo: false, orden: 5 }
          : { id: e.id, tipo: e.tipo, cantidad: 1, ids: e.id, activo: e.id === activo, orden: e.id === activo ? 10 : POR_CLAVE[e.tipo].orden },
        geometry: { type: 'Point', coordinates: [g.lng, g.lat] },
      }
    }),
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

// ============================================================
// MANEJO BRUSCO EN LA FICHA DE LA UNIDAD (Centro de control) Y EN LA PESTAÑA CONDUCCIÓN
// ------------------------------------------------------------
// Todo lo de aquí es puro y sin React: la app (fom-driver-juan) puede copiar estas funciones
// tal cual para que las dos muestren lo mismo con los mismos textos.
//
// Cómo se filtra (pedido de Marco, 21 oct 2026):
// - El período se aplica a CADA TIPO por separado: «Últimos 5» son las 5 frenadas, las 5
//   aceleraciones y los 5 excesos más nuevos; «Hoy» y «7 días», los de ese tramo.
// - Cada tipo se enciende y se apaga solo, con su conteo «5 de 23».
// - De cada tipo se ven 5 y «Ver 5 más» suma otros 5: nunca se pintan 100 de golpe.
// - «Ocultar» no muestra ninguno.
// Cambio del 23 oct (Marco: «no salen todas las aceleraciones de cada carro»):
// - Con UNA unidad elegida, «Hoy» y «7 días» pintan TODOS los suyos del período; solo
//   «Últimos 5» va de 5 en 5. Se piden 30 días para «Últimos 5» y 7 para «Hoy» y «7 días»
//   (el servidor corta en 100 por conductor: 7 días cubren más de la semana).
// - Sin unidad elegida (vista general de la flota): de CADA unidad los 5 más nuevos de cada
//   tipo (`filtrarEventosFlota`).
// ============================================================

/** Cuántos se ven de cada tipo al empezar y cuántos suma «Ver más». */
export const PASO_EVENTOS = 5
/** Días que se piden al servidor para todas las pastillas. */
export const DIAS_PEDIDO = 30

/** Las pastillas de período. El Centro de control no lleva «30 días»; Conducción no lleva «Ocultar». */
export const PERIODOS_EVENTO = [
  { v: 'ultimos', t: `Últimos ${PASO_EVENTOS}` },
  { v: 'hoy', t: 'Hoy' },
  { v: '7', t: '7 días' },
  { v: '30', t: '30 días' },
  { v: 'oculto', t: 'Ocultar' },
]
export const PERIODOS_MAPA = PERIODOS_EVENTO.filter((p) => p.v !== '30')
export const PERIODOS_LISTA = PERIODOS_EVENTO.filter((p) => p.v !== 'oculto')

/** Medianoche (hora local) del día de `ahora`. */
const inicioDelDia = (ahora) => {
  const d = new Date(ahora)
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

/** Desde cuándo cuenta un período (ms). «Últimos 5» y «Ocultar»: todo lo pedido (30 días). */
export function inicioPeriodo(periodo, ahora = Date.now()) {
  if (periodo === 'hoy') return inicioDelDia(ahora)
  if (periodo === '7' || periodo === '30') return ahora - Number(periodo) * 86400000
  return ahora - DIAS_PEDIDO * 86400000
}

/**
 * Días que se piden al servidor para un período. El servidor da como mucho 100 por conductor:
 * para «Hoy» y «7 días» se piden 7 días, así un conductor con muchos eventos no se queda con
 * los 100 más nuevos de 30 días (que pueden no llegar ni a cubrir la semana).
 */
export function diasDelPeriodo(periodo) {
  return periodo === 'hoy' || periodo === '7' ? 7 : DIAS_PEDIDO
}

/**
 * Junta los eventos de varios conductores (una unidad con dos conductores, o la flota entera)
 * sin repetidos, del más nuevo al más viejo. Si a alguno el servidor le cortó en 100: `tope` y
 * `completoDesde` (ms), desde cuándo llegó todo de todos; antes de eso puede faltar algo.
 */
export function juntarEventos(listas) {
  const porId = new Map()
  const sinId = []
  let tope = false
  let completoDesde = -Infinity
  for (const l of Array.isArray(listas) ? listas : []) {
    if (!Array.isArray(l)) continue
    for (const e of l) {
      if (!e) continue
      if (!e.id) sinId.push(e)
      else if (!porId.has(e.id)) porId.set(e.id, e)
    }
    if (l.tope && l.length) {
      tope = true
      let viejo = Infinity
      for (const e of l) viejo = Math.min(viejo, msDe(e?.hora) ?? Infinity)
      completoDesde = Math.max(completoDesde, viejo)
    }
  }
  const salida = ultimosEventos([...porId.values(), ...sinId], Infinity)
  if (tope) {
    salida.tope = true
    salida.completoDesde = completoDesde
  }
  return salida
}

/** Los N más nuevos (la lista puede venir en cualquier orden). */
export function ultimosEventos(lista, n = PASO_EVENTOS) {
  return ordenarPorHora((Array.isArray(lista) ? lista : []).map((e) => ({ t: msDe(e?.hora) ?? -Infinity, e })))
    .slice(0, Math.max(0, n))
}

/** Los del día de hoy (hora local). */
export function eventosDeHoy(lista, ahora = Date.now()) {
  const inicio = inicioDelDia(ahora)
  const fin = inicio + 86400000
  return (Array.isArray(lista) ? lista : []).filter((e) => {
    const t = msDe(e?.hora)
    return t !== null && t >= inicio && t < fin
  })
}

/** Lo que se ve de cada tipo al empezar: { frenada: 5, aceleracion: 5, exceso: 5 }. */
export const mostrarInicial = () => Object.fromEntries(CLAVES_EVENTO.map((c) => [c, PASO_EVENTOS]))

/** «Ver 5 más» de un tipo. */
export function verMas(mostrar, tipo) {
  const actual = mostrar?.[tipo] ?? PASO_EVENTOS
  return { ...mostrarInicial(), ...mostrar, [tipo]: actual + PASO_EVENTOS }
}

/**
 * Lo que muestran la lista y el mapa. `lista`: los eventos ya pasados por `eventosParaMapa`.
 * - `periodo`: 'ultimos' | 'hoy' | '7' | '30' | 'oculto'.
 * - `tipos`: los tipos encendidos (Set o arreglo); sin dar, los tres.
 * - `mostrar`: cuántos se ven de cada tipo (de `mostrarInicial` / `verMas`).
 * Devuelve:
 * - `visibles`: lo que se pinta, del más nuevo al más viejo (vacío con «Ocultar»).
 * - `porTipo`: { frenada: { total, eventos, quedan, encendido }, … } — `total` es del período
 *   aunque el tipo esté apagado, para el «5 de 23» de su pastilla.
 * - `total`: cuántos hay en el período, de los tres tipos.
 */
export function filtrarEventosManejo(lista, { periodo = 'ultimos', tipos = null, mostrar = null, todoElPeriodo = false, ahora = Date.now() } = {}) {
  const activos = tipos ? (tipos instanceof Set ? tipos : new Set(tipos)) : new Set(CLAVES_EVENTO)
  const delPeriodo = eventosDelPeriodo(ultimosEventos(lista, Infinity), periodo, ahora)
  const porTipo = {}
  for (const clave of CLAVES_EVENTO) {
    const deTipo = delPeriodo.filter((e) => e.tipo === clave)
    const encendido = periodo !== 'oculto' && activos.has(clave)
    // `todoElPeriodo` (una unidad en el mapa): con «Hoy» o «7 días» se ven todos los del período;
    // solo «Últimos 5» va de 5 en 5.
    const tope = todoElPeriodo && periodo !== 'ultimos' ? Infinity : mostrar?.[clave] ?? PASO_EVENTOS
    const eventos = encendido ? deTipo.slice(0, tope) : []
    porTipo[clave] = { total: deTipo.length, eventos, quedan: encendido ? deTipo.length - eventos.length : 0, encendido }
  }
  const visibles = ultimosEventos(CLAVES_EVENTO.flatMap((c) => porTipo[c].eventos), Infinity)
  return { visibles, porTipo, total: delPeriodo.length }
}

/** Los de un período, de una lista ya ordenada del más nuevo al más viejo. */
function eventosDelPeriodo(todos, periodo, ahora) {
  if (periodo === 'hoy') return eventosDeHoy(todos, ahora)
  const inicio = inicioPeriodo(periodo, ahora)
  return todos.filter((e) => (msDe(e.hora) ?? -Infinity) >= inicio)
}

/**
 * La vista general del Centro de control (todas las unidades, ninguna elegida): de CADA unidad,
 * los `mostrar[tipo]` (5) más nuevos de cada tipo del período. Así una unidad con muchos eventos
 * no tapa a las demás y el mapa no carga miles de golpe (340 unidades × 3 tipos × 5 como mucho).
 * Devuelve lo mismo que `filtrarEventosManejo`; en `porTipo`, `eventos` son los que van al mapa
 * (de todas las unidades) y `total` los del período; `unidades`: cuántas tienen alguno.
 * Recorre la lista una sola vez: sirve con decenas de miles de eventos.
 */
export function filtrarEventosFlota(lista, { periodo = 'ultimos', tipos = null, mostrar = null, ahora = Date.now() } = {}) {
  const activos = tipos ? (tipos instanceof Set ? tipos : new Set(tipos)) : new Set(CLAVES_EVENTO)
  const delPeriodo = eventosDelPeriodo(ultimosEventos(lista, Infinity), periodo, ahora)
  const porTipo = Object.fromEntries(CLAVES_EVENTO.map((c) => [c, { total: 0, eventos: [], quedan: 0, encendido: periodo !== 'oculto' && activos.has(c) }]))
  const vistos = new Map()
  const unidades = new Set()
  const visibles = []
  for (const e of delPeriodo) {
    const g = porTipo[e.tipo]
    if (!g) continue
    g.total += 1
    unidades.add(e.vehiculoId ?? '')
    if (!g.encendido) continue
    const llave = `${e.vehiculoId ?? ''}|${e.tipo}`
    const n = vistos.get(llave) ?? 0
    if (n >= (mostrar?.[e.tipo] ?? PASO_EVENTOS)) continue
    vistos.set(llave, n + 1)
    g.eventos.push(e)
    visibles.push(e)
  }
  return { visibles, porTipo, total: delPeriodo.length, unidades: unidades.size }
}

/** «5 de 23»; «23» si se ven todos o el tipo está apagado. */
export function conteoTipo({ total = 0, eventos = [], encendido = true } = {}) {
  if (!encendido || eventos.length >= total) return f.numero(total)
  return `${f.numero(eventos.length)} de ${f.numero(total)}`
}

/**
 * ¿Pudo quedar fuera algo del período? Solo si el servidor cortó en 100 (`lista.tope`) y lo
 * más viejo que llegó es más nuevo que el comienzo del período.
 */
export function periodoIncompleto(lista, periodo, ahora = Date.now()) {
  if (!lista?.tope || !lista.length) return false
  // De varios conductores (`juntarEventos`): desde cuándo llegó todo de todos.
  let masViejo = Number.isFinite(lista.completoDesde) ? lista.completoDesde : Infinity
  if (!Number.isFinite(lista.completoDesde)) for (const e of lista) masViejo = Math.min(masViejo, msDe(e.hora) ?? Infinity)
  return masViejo > inicioPeriodo(periodo, ahora)
}

/** El período más corto de `periodos` en el que aparece el evento `id` (con todos los tipos). */
export function periodoQueMuestra(lista, id, { ahora = Date.now(), periodos = ['ultimos', 'hoy', '7', '30'] } = {}) {
  return periodos.find((p) => filtrarEventosManejo(lista, { periodo: p, ahora }).visibles.some((e) => e.id === id)) ?? null
}

/**
 * Cómo dejar los filtros para que se vea el evento `id` (el de un enlace): el período más corto
 * de `periodos` que lo incluye, su tipo encendido y «Ver más» hasta llegar a él. null si no está.
 */
export function eleccionParaEvento(lista, id, { periodos = ['ultimos', 'hoy', '7'], tipos = CLAVES_EVENTO, ahora = Date.now() } = {}) {
  const e = (Array.isArray(lista) ? lista : []).find((x) => x.id === id)
  if (!e) return null
  const candidatos = periodos.filter((p) => p !== 'oculto')
  const delTipo = (p) => filtrarEventosManejo(lista, { periodo: p, ahora, mostrar: { [e.tipo]: Infinity } }).porTipo[e.tipo].eventos
  // Primero el período más corto que lo muestre sin «Ver más»; si no, el más largo que lo tenga.
  const periodo = candidatos.find((p) => delTipo(p).slice(0, PASO_EVENTOS).some((x) => x.id === id))
    ?? [...candidatos].reverse().find((p) => delTipo(p).some((x) => x.id === id))
  if (!periodo) return null
  const posicion = delTipo(periodo).findIndex((x) => x.id === id)
  const mostrar = { ...mostrarInicial(), [e.tipo]: Math.max(PASO_EVENTOS, Math.ceil((posicion + 1) / PASO_EVENTOS) * PASO_EVENTOS) }
  const encendidos = [...new Set([...(tipos ?? []), e.tipo])]
  return { periodo, tipos: CLAVES_EVENTO.filter((c) => encendidos.includes(c)), mostrar }
}

/**
 * Lo que se recuerda durante la sesión (período y tipos encendidos), revisado: si lo guardado
 * no vale, «Últimos 5» con los tres tipos.
 */
export function eleccionValida(guardada, periodos = PERIODOS_MAPA) {
  const valores = periodos.map((p) => p.v)
  const periodo = valores.includes(guardada?.periodo) ? guardada.periodo : valores[0]
  const tipos = Array.isArray(guardada?.tipos) ? CLAVES_EVENTO.filter((c) => guardada.tipos.includes(c)) : [...CLAVES_EVENTO]
  return { periodo, tipos }
}

/**
 * Al cambiar de unidad se suelta todo: ningún evento elegido (globo cerrado) y «Ver más» vuelve
 * a 5. El período y los tipos se quedan (se recuerdan en la sesión).
 */
export function alCambiarUnidad(estado, vehiculoId) {
  if (estado && estado.vehiculoId === (vehiculoId ?? null)) return estado
  return { vehiculoId: vehiculoId ?? null, activo: null, mostrar: mostrarInicial() }
}

// ------------------------------------------------------------
// GRUPOS: eventos casi en el mismo punto van en un círculo con su número.
// ------------------------------------------------------------

/** Radio, en píxeles de pantalla, dentro del cual dos íconos se enciman. */
export const RADIO_GRUPO_PX = 26

/** Metros que mide un píxel a ese zoom y latitud (teselas de 512 px, como Mapbox GL). */
export function metrosPorPixel(zoom, lat = 0) {
  return (40075016.686 * Math.cos((Number(lat) * Math.PI) / 180)) / (512 * 2 ** Number(zoom))
}

/** Distancia en metros entre dos puntos { lat, lng } (haversine). */
export function distanciaMetros(a, b) {
  const r = Math.PI / 180
  const dLat = (b.lat - a.lat) * r
  const dLng = (b.lng - a.lng) * r
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(dLng / 2) ** 2
  return 2 * 6371008.8 * Math.asin(Math.min(1, Math.sqrt(h)))
}

/**
 * Junta los eventos que caen a `metros` o menos del primero de un grupo (el primero manda: su
 * punto es el del círculo). Se respeta el orden de llegada (de `eventosParaMapa`: el más nuevo
 * primero). Devuelve [{ id, lat, lng, eventos }]; un grupo de uno es un evento suelto (id = el
 * del evento).
 * `metros` 0: ninguno se junta. `suelto`: id que nunca se agrupa (el elegido, con su globo).
 */
export function agruparCercanos(lista, metros = 0, suelto = null) {
  const eventos = (Array.isArray(lista) ? lista : []).filter(vaEnMapa)
  const grupos = []
  const buscar = metros > 0 ? buscadorDeGrupos(eventos, metros, grupos, suelto) : null
  for (const e of eventos) {
    const g = buscar && e.id !== suelto ? buscar(e) : null
    if (g) g.eventos.push(e)
    else {
      grupos.push({ id: e.id, lat: e.lat, lng: e.lng, eventos: [e] })
      buscar?.anotar(grupos.length - 1)
    }
  }
  return grupos.map((g) => (g.eventos.length > 1 ? { ...g, id: `grupo:${g.eventos.map((e) => e.id).join('|')}` } : g))
}

/** Un grado de latitud mide ~111,2 km; con 110 km la celda queda un poco más grande, nunca menos. */
const METROS_GRADO = 110000

/**
 * El primer grupo (en orden de creación) cuyo punto está a `metros` o menos del evento. Con la
 * flota entera hay miles de eventos y comparar cada uno con todos los grupos colgaba el mapa al
 * acercar: se reparten en una rejilla de celdas de al menos `metros` de lado y solo se mira la
 * celda del evento y sus 8 vecinas. El resultado es el mismo que recorrerlos todos.
 * Con radios enormes (mapa muy alejado) o cerca de los polos se recorren todos: ahí hay pocos grupos.
 */
function buscadorDeGrupos(eventos, metros, grupos, suelto) {
  let cosMin = 1
  for (const e of eventos) cosMin = Math.min(cosMin, Math.cos((e.lat * Math.PI) / 180))
  const vale = (x, e) => x.id !== suelto && distanciaMetros(x, e) <= metros
  if (metros > 50000 || cosMin < 0.05) {
    const todos = (e) => grupos.find((x) => vale(x, e)) ?? null
    todos.anotar = () => {}
    return todos
  }
  const alto = metros / METROS_GRADO
  const ancho = metros / (METROS_GRADO * cosMin)
  const celdas = new Map()
  const celda = (p) => [Math.floor(p.lat / alto), Math.floor(p.lng / ancho)]
  const buscar = (e) => {
    const [f, c] = celda(e)
    let mejor = -1
    for (let df = -1; df <= 1; df += 1) {
      for (let dc = -1; dc <= 1; dc += 1) {
        for (const i of celdas.get(`${f + df}:${c + dc}`) ?? []) {
          if ((mejor === -1 || i < mejor) && vale(grupos[i], e)) mejor = i
        }
      }
    }
    return mejor === -1 ? null : grupos[mejor]
  }
  buscar.anotar = (i) => {
    const [f, c] = celda(grupos[i])
    const llave = `${f}:${c}`
    if (!celdas.has(llave)) celdas.set(llave, [])
    celdas.get(llave).push(i)
  }
  return buscar
}

/** «3 eventos en este punto». */
export function tituloGrupo(n) {
  return `${f.numero(n)} ${n === 1 ? 'evento' : 'eventos'} en este punto`
}

// ------------------------------------------------------------
// ENLACES AL MAPA — cada evento listado lleva al Centro de control con su unidad elegida.
// ------------------------------------------------------------

/** Tipo de evento de manejo que corresponde a la clave de una alerta (o null). */
export function tipoDeAlerta(clave) {
  return { exceso_velocidad: 'exceso', velocidad: 'exceso', frenada_brusca: 'frenada', aceleracion_brusca: 'aceleracion' }[clave] ?? null
}

/**
 * `/panel/mapa?unidad=…&evento=…`. `conductorId`: de quién pedir los eventos (si no, el
 * conductor asignado hoy). `hora` y `tipo`: para las alertas, que no traen el id del evento de
 * manejo; el mapa busca el más cercano en el tiempo. Sin unidad, el mapa sin nada elegido.
 */
export function enlaceEventoEnMapa({ vehiculoId, eventoId, conductorId, hora, tipo } = {}) {
  if (!vehiculoId) return '/panel/mapa'
  const p = new URLSearchParams({ unidad: vehiculoId })
  if (eventoId) p.set('evento', eventoId)
  if (conductorId) p.set('conductor', conductorId)
  if (hora) p.set('hora', hora)
  if (tipo && POR_CLAVE[tipo]) p.set('tipo', tipo)
  return `/panel/mapa?${p}`
}

/** Lo que pide el enlace (URLSearchParams); null si no trae unidad. */
export function leerEnlaceEvento(parametros) {
  const unidad = parametros?.get?.('unidad')
  if (!unidad) return null
  const tipo = parametros.get('tipo')
  return {
    unidad,
    evento: parametros.get('evento') || null,
    conductor: parametros.get('conductor') || null,
    hora: parametros.get('hora') || null,
    tipo: POR_CLAVE[tipo] ? tipo : null,
  }
}

/** Margen para casar una alerta con un evento de manejo por la hora. */
export const MARGEN_ENLACE_MS = 10 * 60000

/**
 * El evento que pide el enlace: el del id exacto; si no, el más cercano a la hora (± 10 min) y
 * del mismo tipo si se dio. null si no hay ninguno.
 */
export function eventoDelEnlace(lista, pedido) {
  const todos = Array.isArray(lista) ? lista : []
  if (!pedido) return null
  if (pedido.evento) {
    const exacto = todos.find((e) => e.id === pedido.evento)
    if (exacto) return exacto
  }
  const t = msDe(pedido.hora)
  if (t === null) return null
  let mejor = null
  let distancia = Infinity
  for (const e of todos) {
    if (pedido.tipo && e.tipo !== pedido.tipo) continue
    const d = Math.abs((msDe(e.hora) ?? Infinity) - t)
    if (d <= MARGEN_ENLACE_MS && d < distancia) {
      mejor = e
      distancia = d
    }
  }
  return mejor
}
