import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  conSenalAlDia, msSinReportar, ordenarSinSenal, SIN_SENAL_MS, textoSinSenal, textoUltimoReporte, tiempoSinSenal, transmitiendo,
} from '../src/panel/datos/sinSenal.js'
import { estadoUnidad } from '../src/panel/datos/estadoUnidad.js'
import { vehicleMarkerSvg } from '../src/panel/comp/vehicleMarker.js'

// Fechas en hora local: los textos con fecha («desde el 12 sep») se leen en la hora del equipo.
const AHORA = new Date(2026, 9, 21, 12, 0).getTime() // 21 oct 2026, 12:00
const hace = (min) => new Date(AHORA - min * 60_000).toISOString()

test('menos de una hora: solo minutos', () => {
  assert.equal(tiempoSinSenal(hace(12), AHORA), 'hace 12 min')
  assert.equal(tiempoSinSenal(hace(59), AHORA), 'hace 59 min')
  assert.equal(tiempoSinSenal(hace(0.5), AHORA), 'hace menos de 1 min')
})

test('menos de un día: horas y minutos', () => {
  assert.equal(tiempoSinSenal(hace(2 * 60 + 15), AHORA), 'hace 2 h 15 min')
  assert.equal(tiempoSinSenal(hace(60), AHORA), 'hace 1 h')
  assert.equal(tiempoSinSenal(hace(23 * 60 + 59), AHORA), 'hace 23 h 59 min')
})

test('un día o más: días y horas', () => {
  assert.equal(tiempoSinSenal(hace(3 * 1440 + 4 * 60 + 30), AHORA), 'hace 3 d 4 h')
  assert.equal(tiempoSinSenal(hace(1440), AHORA), 'hace 1 d')
  assert.equal(tiempoSinSenal(hace(29 * 1440 + 23 * 60), AHORA), 'hace 29 d 23 h')
})

test('treinta días o más: la fecha, con el año solo si es otro', () => {
  assert.equal(tiempoSinSenal(new Date(2026, 8, 12, 9, 0).toISOString(), AHORA), 'desde el 12 sep')
  assert.equal(tiempoSinSenal(new Date(2025, 11, 3, 9, 0).toISOString(), AHORA), 'desde el 3 dic 2025')
})

test('sin ningún reporte: «nunca reportó»; un reloj adelantado no da negativos', () => {
  assert.equal(tiempoSinSenal(null, AHORA), 'nunca reportó')
  assert.equal(tiempoSinSenal('no es fecha', AHORA), 'nunca reportó')
  assert.equal(tiempoSinSenal(hace(-5), AHORA), 'hace menos de 1 min')
  assert.equal(msSinReportar(undefined, AHORA), Infinity)
})

test('la pastilla completa', () => {
  assert.equal(textoSinSenal(hace(135), AHORA), 'Sin señal · hace 2 h 15 min')
  assert.equal(textoSinSenal(null, AHORA), 'Sin señal · nunca reportó')
})

test('la línea chica de la ficha', () => {
  assert.equal(textoUltimoReporte(new Date(2026, 9, 21, 9, 42).toISOString()), 'Último reporte: 21 oct, 9:42 a. m.')
  assert.equal(textoUltimoReporte(new Date(2026, 9, 21, 21, 5).toISOString()), 'Último reporte: 21 oct, 9:05 p. m.')
  assert.equal(textoUltimoReporte(null), null)
})

test('ordenar: las sin señal de más tiempo primero, sin mover a las demás', () => {
  const lista = [
    { id: 'a', ok: true, ultimoReporte: hace(1) },
    { id: 'b', ok: false, ultimoReporte: hace(30) },
    { id: 'c', ok: true, ultimoReporte: hace(2) },
    { id: 'd', ok: false, ultimoReporte: null },
    { id: 'e', ok: false, ultimoReporte: hace(600) },
  ]
  const r = ordenarSinSenal(lista, (v) => !v.ok, AHORA)
  assert.deepEqual(r.map((v) => v.id), ['a', 'd', 'c', 'e', 'b'])
  // La lista original no se toca.
  assert.deepEqual(lista.map((v) => v.id), ['a', 'b', 'c', 'd', 'e'])
})

test('la regla de la app: con señal solo si reportó hace menos de 5 min', () => {
  assert.equal(SIN_SENAL_MS, 5 * 60_000)
  assert.equal(transmitiendo(hace(4.9), AHORA), true)
  assert.equal(transmitiendo(hace(5), AHORA), false)
  assert.equal(transmitiendo(null, AHORA), false)
  // Un reloj adelantado cuenta como recién reportado, igual que en la app.
  assert.equal(transmitiendo(hace(-2), AHORA), true)
})

test('la señal se recalcula con el reloj, sin esperar al servidor', () => {
  const leida = { id: 'u1', conectado: true, conexion: 'reportando', ultimoReporte: hace(3) }
  // A los 3 min sigue igual: el mismo objeto, para no rehacer nada en pantalla.
  assert.equal(conSenalAlDia(leida, AHORA), leida)
  // Seis minutos después de esa lectura, sin pedir nada, ya está sin señal.
  const luego = conSenalAlDia(leida, AHORA + 3 * 60_000)
  assert.equal(luego.conectado, false)
  assert.equal(luego.conexion, 'sin_senal')
  assert.equal(estadoUnidad(luego).clave, 'sin_senal')
  // Y vuelve a «reportando» si el reporte es reciente.
  assert.equal(conSenalAlDia({ ...luego, ultimoReporte: hace(1) }, AHORA).conexion, 'reportando')
  // La demostración no trae la señal (sin `conectado`): se deja como está.
  const demo = { id: 'd1', ultimoReporte: hace(200) }
  assert.equal(conSenalAlDia(demo, AHORA), demo)
  assert.equal(conSenalAlDia(null, AHORA), null)
})

test('el cartel del mapa lleva el tiempo en una segunda línea chica, sin ensancharse', () => {
  const callada = vehicleMarkerSvg({ placa: 'AB538RM', conectado: false, ultimoReporte: hace(135) }, false, AHORA)
  assert.ok(callada.includes('>Sin señal</text>'))
  assert.ok(callada.includes('font-size="9">hace 2 h 15 min</text>'))
  assert.ok(callada.includes('width="125"'))
  const nunca = vehicleMarkerSvg({ placa: 'AB538RM', conectado: false }, false, AHORA)
  assert.ok(nunca.includes('>nunca reportó</text>'))
  // Con señal, el cartel queda como siempre: dos líneas.
  const viva = vehicleMarkerSvg({ placa: 'AB538RM', conectado: true, velocidadKmh: 40 }, false, AHORA)
  assert.ok(!viva.includes('font-size="9"'))
  assert.ok(viva.includes('y="39"'))
})
