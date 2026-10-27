// ============================================================
// AVISOS DE «GPS SIN SEÑAL» — a la campana del supervisor y del administrador
// ------------------------------------------------------------
// Cuando una unidad pasa a Sin señal (un equipo sin corriente: más de 5 min sin
// reportar) llega UN aviso: «GPS sin señal: U-001 Z69FC7W dejó de reportar a las
// 14:32». Un aviso por unidad y por corte: mientras siga callada no se repite;
// si vuelve y se corta de nuevo, su último reporte es otro y sale un aviso nuevo.
//
// La base todavía no genera este aviso, así que se arma aquí con lo que la pantalla
// ve de la flota y se guarda en este navegador. Solo se avisan los cortes de las
// últimas 24 h: una unidad callada desde hace semanas no llena la campana.
// ============================================================

const CLAVE = 'fom.avisos.gps-sin-senal'
const VENTANA_MS = 24 * 60 * 60_000
const MAXIMO = 100
export const PREFIJO_AVISO_GPS = 'gps-sin-senal:'

let avisos = null // [{ id, vehiculoId, empresaId, titulo, creadaEn, leida, descartada }]
const oyentes = new Set()
let empresaActual = () => null

/** El repositorio dice de qué empresa es lo que se ve (para no mezclar avisos de empresas). */
export function fijarEmpresaDeAvisos(fn) {
  empresaActual = fn
}

function cargar() {
  if (avisos) return avisos
  try {
    avisos = JSON.parse(globalThis.localStorage?.getItem(CLAVE) ?? '[]')
    if (!Array.isArray(avisos)) avisos = []
  } catch {
    avisos = []
  }
  return avisos
}

function guardar() {
  try {
    globalThis.localStorage?.setItem(CLAVE, JSON.stringify(avisos))
  } catch {
    /* almacenamiento lleno o bloqueado: los avisos viven solo en memoria */
  }
  // Aparte y sin bloquear: esto se llama mientras una pantalla pinta la flota.
  Promise.resolve().then(() => oyentes.forEach((fn) => fn()))
}

/** Suscribirse a los avisos nuevos o leídos. Devuelve la baja. */
export function alCambiarAvisosGps(fn) {
  oyentes.add(fn)
  return () => oyentes.delete(fn)
}

/** Olvida todo (para las pruebas). */
export function olvidarAvisosGps() {
  avisos = []
  oyentes.clear()
}

const dos = (n) => String(n).padStart(2, '0')

/** «14:32», la hora local del último reporte. */
const horaDe = (t) => `${dos(new Date(t).getHours())}:${dos(new Date(t).getMinutes())}`

export const esAvisoGps = (id) => String(id ?? '').startsWith(PREFIJO_AVISO_GPS)

/**
 * Anota el corte de una unidad si es nuevo. `corteEn`: cuándo se dio por callada (su último
 * reporte + 5 min). Devuelve `true` si creó el aviso.
 */
export function registrarCorte(v, corteEn, ahora = Date.now()) {
  const ultimo = Date.parse(v?.ultimoReporte)
  if (!v?.id || !Number.isFinite(ultimo) || !Number.isFinite(corteEn)) return false
  if (ahora - corteEn > VENTANA_MS) return false
  const id = `${PREFIJO_AVISO_GPS}${v.id}:${v.ultimoReporte}`
  const lista = cargar()
  if (lista.some((a) => a.id === id)) return false
  const nombre = [v.alias || v.numero, v.placa].filter((x) => x && x !== '—').join(' ')
  lista.unshift({
    id,
    vehiculoId: v.id,
    empresaId: empresaActual() ?? null,
    titulo: `GPS sin señal: ${nombre} dejó de reportar a las ${horaDe(ultimo)}`,
    creadaEn: new Date(corteEn).toISOString(),
    leida: false,
    descartada: false,
  })
  if (lista.length > MAXIMO) lista.length = MAXIMO
  guardar()
  return true
}

/** Los avisos de la empresa que se está viendo, con la forma de una notificación (lo más nuevo primero). */
export function avisosSinSenal() {
  const empresa = empresaActual() ?? null
  return cargar()
    .filter((a) => !a.descartada && (a.empresaId ?? null) === empresa)
    .map((a) => ({
      id: a.id, tipo: 'gps_sin_senal', titulo: a.titulo, detalle: null, odtId: null,
      vehiculoId: a.vehiculoId, leida: a.leida, leidaEn: a.leida ? a.creadaEn : null, creadaEn: a.creadaEn,
    }))
    .sort((a, b) => Date.parse(b.creadaEn) - Date.parse(a.creadaEn))
}

function cambiar(filtro, parche) {
  let hubo = false
  for (const a of cargar()) {
    if (filtro(a) && Object.entries(parche).some(([k, val]) => a[k] !== val)) {
      Object.assign(a, parche)
      hubo = true
    }
  }
  if (hubo) guardar()
}

export const marcarAvisoGpsLeido = (id) => cambiar((a) => a.id === id, { leida: true })
export const descartarAvisoGps = (id) => cambiar((a) => a.id === id, { descartada: true })
export const marcarAvisosGpsLeidos = () => cambiar(() => true, { leida: true })
export const descartarAvisosGpsLeidos = () => cambiar((a) => a.leida, { descartada: true })
