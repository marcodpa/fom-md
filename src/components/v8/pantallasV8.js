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
//  - fondo:  color de fondo de la pantalla (app: #0a0d13).
// Medidas tomadas con scratchpad/tels-ver (filas vacías entre bloques y coincidencia de píxeles).
export const ALTO_PANTALLA_V8 = 2532
export const ANCHO_PANTALLA_V8 = 1170

const APP = { cabeza: 220, pie: 2300, corte: 2300, junta: true, fondo: '#0a0d13' }

export const PANTALLAS_LARGAS_V8 = {
  // Pantallas de pestañas: debajo asoma la siguiente parte del día, separada por un fundido.
  // Capturas de la app real (T-153); `desde` = justo encima del primer bloque de la segunda.
  'cap-movil-cond-mantenimiento': { ...APP, sigue: 'cap-movil-sup-mantenimiento', desde: 775 },
  'cap-movil-mnt-asignadas': { ...APP, sigue: 'cap-movil-sup-mantenimiento', desde: 775 },
  'cap-movil-cond-perfil': { ...APP, sigue: 'cap-movil-sup-alertas', desde: 535 },
  'cap-movil-sup-resumen': { ...APP, sigue: 'cap-movil-sup-vehiculos', desde: 460 },
  // Continuación real: Mi unidad sigue con su telemetría (la misma hoja, 690 filas más abajo;
  // coincidencia exacta de píxeles entre la fila 2100 de la primera y la 1410 de la segunda).
  'cap-movil-cond-inicio': { ...APP, sigue: 'cap-movil-cond-inicio-telemetria', junta: false, corte: 2100, desde: 1410 },
  // T-181: con las órdenes con fotos reales de la app (T-169) vuelven las continuaciones reales.
  // Reportar una falla baja hasta la Evidencia con la foto del disco y su título (la misma
  // pantalla 522 filas más abajo: píxeles idénticos entre las filas 702 y 2232 de la primera y
  // 180 y 1710 de la segunda). Corte en el hueco entre la Descripción y «Evidencia», para que el
  // punto verde de la Evidencia salga de la captura con foto. Fijo abajo, el botón «Crear ODT»
  // (empieza justo en la fila 2346; a sus lados asoman los bordes de «Tomar foto» y «Galería»).
  'cap-movil-mnt-reportar': { ...APP, sigue: 'cap-movil-mnt-reportar-fotos', junta: false, pie: 2346, corte: 2190, desde: 1668 },
  // La orden resuelta del supervisor baja hasta La unidad, las fotos del reporte y del trabajo
  // terminado y el historial (2097 filas más abajo; coinciden desde la fila 312 de la segunda,
  // arriba difiere el brillo azul del fondo). Corte dentro de la tarjeta de La unidad, en el
  // relleno liso encima de «Unidad». Sin pestañas: nada fijo abajo.
  'cap-movil-mnt-resuelta': { ...APP, sigue: 'cap-movil-mnt-fotos', junta: false, pie: ALTO_PANTALLA_V8, corte: 2433, desde: 336 },
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
