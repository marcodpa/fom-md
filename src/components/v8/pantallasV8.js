// Pantallas «largas» de la app para los teléfonos de la web v8: dos capturas reales encadenadas
// para que la pantalla se desplace sola con el scroll, como si alguien hiciera scroll en la app.
// Todas las capturas de la app miden 1170 × 2532 (390 × 844 a 3x); las medidas van en filas de
// esa copia. Al cargar (y con «reducir movimiento») se ve la captura de siempre, igual que antes.
//
//  - sigue:  captura que continúa debajo.
//  - cabeza: filas de arriba que quedan fijas (barra superior de la app o de la hoja).
//  - pie:    desde qué fila queda fija la barra de pestañas (sin pestañas: 2532).
//  - corte:  hasta qué fila se ve la primera captura.
//  - desde:  desde qué fila sigue la segunda.
//  - junta:  true = son pantallas distintas: se separan con un fundido al fondo de la app (sin
//            junta, la segunda es la continuación exacta de la primera: medida con las capturas).
//  - fondo:  color de fondo de la pantalla (app: #0a0d13; hojas de mantenimiento: #131b26).
// Medidas tomadas con scratchpad/tels-ver (filas vacías entre bloques y coincidencia de píxeles).
export const ALTO_PANTALLA_V8 = 2532
export const ANCHO_PANTALLA_V8 = 1170

const APP = { cabeza: 220, pie: 2300, corte: 2300, junta: true, fondo: '#0a0d13' }
const HOJA = { cabeza: 348, pie: ALTO_PANTALLA_V8, junta: false, fondo: '#131b26' }

export const PANTALLAS_LARGAS_V8 = {
  // Continuaciones reales (la misma pantalla, más abajo).
  'cap-movil-mnt-reportar': { ...HOJA, sigue: 'cap-movil-mnt-reportar-fotos', corte: 2130, desde: 360 },
  'cap-movil-mnt-resuelta': { ...HOJA, sigue: 'cap-movil-mnt-fotos', corte: 1767, desde: 360 },
  // Pantallas de pestañas: debajo asoma la siguiente parte del día, separada por un fundido.
  'cap-movil-cond-inicio': { ...APP, sigue: 'cap-movil-cond-mapa', desde: 450 },
  'cap-movil-cond-mantenimiento': { ...APP, sigue: 'cap-movil-sup-mantenimiento', desde: 1000 },
  'cap-movil-mnt-asignadas': { ...APP, sigue: 'cap-movil-sup-mantenimiento', desde: 1000 },
  'cap-movil-cond-perfil': { ...APP, sigue: 'cap-movil-sup-alertas', desde: 1150 },
  'cap-movil-sup-resumen': { ...APP, sigue: 'cap-movil-sup-vehiculos', desde: 1020 },
}

// Filas del fundido entre dos pantallas distintas.
export const JUNTA_V8 = 90

// Datos de la pantalla larga de `nombre` (o null si esa captura no tiene continuación).
// total = filas del rollo; recorrido = cuánto sube el rollo, en % de su propio alto.
export function pantallaLargaV8(nombre) {
  const p = PANTALLAS_LARGAS_V8[nombre]
  if (!p) return null
  const junta = p.junta ? JUNTA_V8 : 0
  const total = p.corte + junta + (ALTO_PANTALLA_V8 - p.desde)
  return { ...p, junta, total, recorrido: ((total - ALTO_PANTALLA_V8) / total) * 100 }
}
