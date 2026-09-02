// ============================================================
// FORMATO — mismas reglas que src/utils/date.ts y src/lib/* de la app,
// para que el panel web y la app muestren los datos idénticos.
// ============================================================

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']

// Evita el corrimiento de día en husos negativos (Venezuela es UTC-4):
// una fecha "2026-07-03" debe leerse como local, no como UTC.
function parseFecha(iso) {
  if (typeof iso === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(iso)) return new Date(`${iso}T00:00:00`)
  return new Date(iso)
}

/** "3 jul 2026" */
export function fecha(iso) {
  if (!iso) return '—'
  const d = parseFecha(iso)
  return `${d.getDate()} ${MESES[d.getMonth()]} ${d.getFullYear()}`
}

/** "3 jul" */
export function fechaCorta(iso) {
  if (!iso) return '—'
  const d = parseFecha(iso)
  return `${d.getDate()} ${MESES[d.getMonth()]}`
}

/** "8:30 a. m." */
export function hora(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  const h = d.getHours()
  const m = String(d.getMinutes()).padStart(2, '0')
  const sufijo = h < 12 ? 'a. m.' : 'p. m.'
  const h12 = h % 12 === 0 ? 12 : h % 12
  return `${h12}:${m} ${sufijo}`
}

/** "3 jul, 8:30 a. m." */
export function fechaHora(iso) {
  if (!iso) return '—'
  return `${fechaCorta(iso)}, ${hora(iso)}`
}

/** "55 min" · "1 h" · "1 h 5 min" */
export function duracion(min) {
  const m = Math.max(0, Math.round(min))
  if (m < 60) return `${m} min`
  const h = Math.floor(m / 60)
  const r = m % 60
  return r === 0 ? `${h} h` : `${h} h ${r} min`
}

/** Tiempo transcurrido en lenguaje natural: "hace 14 min", "hace 3 días". */
export function desde(iso) {
  if (!iso) return '—'
  const seg = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (seg < 60) return 'ahora'
  const min = Math.floor(seg / 60)
  if (min < 60) return `hace ${min} min`
  const h = Math.floor(min / 60)
  if (h < 24) return `hace ${h} h`
  const d = Math.floor(h / 24)
  if (d === 1) return 'ayer'
  if (d < 30) return `hace ${d} días`
  return fechaCorta(iso)
}

/** Separador de miles con punto, como en toda la app. */
export function numero(n) {
  if (n === null || n === undefined || Number.isNaN(n)) return '—'
  return Number(n).toLocaleString('es')
}

/** "48.230 km" */
export function km(n) {
  if (n === null || n === undefined) return '—'
  return `${numero(Math.round(n))} km`
}

/** "$1.284" — la app usa USD y redondea. */
export function moneda(n, simbolo = '$') {
  if (n === null || n === undefined) return '—'
  return `${simbolo}${numero(Math.round(n))}`
}

/** "82 km/h" */
export function velocidad(n) {
  return `${numero(Math.round(n ?? 0))} km/h`
}

/** Normaliza la placa como hace crearVehiculo: sin espacios y en mayúsculas. */
export function placa(v) {
  return String(v ?? '').trim().toUpperCase()
}

/** "+58 4141234567" */
export function telefono(discado, num) {
  if (!num) return '—'
  return `${discado ?? '+58'} ${String(num).trim()}`
}

/** "J-30123456-7" a partir de la letra y los dígitos. */
export function rif(letra, num) {
  const n = String(num ?? '').replace(/\D/g, '')
  if (n.length < 2) return `${letra ?? 'J'}-${n}`
  return `${letra ?? 'J'}-${n.slice(0, -1)}-${n.slice(-1)}`
}

/** Iniciales para el avatar: "Carlos Méndez" → "CM" */
export function iniciales(nombre) {
  const partes = String(nombre ?? '').trim().split(/\s+/).filter(Boolean)
  if (!partes.length) return '—'
  return (partes[0][0] + (partes[1]?.[0] ?? '')).toUpperCase()
}

/** Días que faltan, en texto: "vence en 3 días", "vencido hace 2 días". */
export function vencimiento(iso) {
  const dias = Math.floor((parseFecha(iso) - new Date()) / 86400000)
  if (dias < 0) return `vencido hace ${Math.abs(dias)} ${Math.abs(dias) === 1 ? 'día' : 'días'}`
  if (dias === 0) return 'vence hoy'
  if (dias === 1) return 'vence mañana'
  return `vence en ${dias} días`
}

// --- Semáforos de negocio (mismas fórmulas de companyService) --------------

/** Índice de manejo seguro 0-100: >=85 verde, >=70 amarillo, resto rojo. */
export function rangoIndice(indice) {
  if (indice >= 85) return 'verde'
  if (indice >= 70) return 'amarillo'
  return 'rojo'
}

/** Eventos por cada 100 km. */
export function eventosPor100(eventos, kms) {
  if (!kms) return 0
  return Math.round((eventos / (kms / 100)) * 100) / 100
}

/** Semáforo del score por 100 km: <1.5 verde, <3.5 amarillo, resto rojo. */
export function rangoScore(valor) {
  if (valor < 1.5) return 'verde'
  if (valor < 3.5) return 'amarillo'
  return 'rojo'
}

/** Traduce el semáforo a la clase de color de los tags del panel. */
export const CLASE_SEMAFORO = { verde: 'verde', amarillo: 'ambar', rojo: 'rojo' }

/** Hoy en formato AAAA-MM-DD (local, no UTC). */
export function hoyISO(d = new Date()) {
  const p = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}
