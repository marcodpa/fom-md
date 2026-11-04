import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  conSenalAlDia, haceCuanto, msSinReportar, ordenarSinSenal, SIN_SENAL_MS, textoUltimoReporte, transmitiendo,
} from '../src/panel/datos/sinSenal.js'
import { estadoUnidad } from '../src/panel/datos/estadoUnidad.js'
import { desde } from '../src/panel/datos/formato.js'
import { haceCuanto as haceCuantoGps } from '../src/panel/datos/gps.js'
import { haceCuanto as haceCuantoSos } from '../src/panel/modulos/SosConductorReglas.js'
import { vehicleMarkerSvg } from '../src/panel/comp/vehicleMarker.js'

// Fechas en hora local: los textos con fecha («desde el 12 sep») se leen en la hora del equipo.
const AHORA = new Date(2026, 9, 21, 12, 0).getTime() // 21 oct 2026, 12:00
const hace = (min) => new Date(AHORA - min * 60_000).toISOString()

test('«hace cuánto», el formato de la app: s, min, h, d', () => {
  assert.equal(haceCuanto(hace(40 / 60), AHORA), 'hace 40 s')
  assert.equal(haceCuanto(hace(12), AHORA), 'hace 12 min')
  assert.equal(haceCuanto(hace(59), AHORA), 'hace 59 min')
  assert.equal(haceCuanto(hace(3 * 60 + 15), AHORA), 'hace 3 h')
  assert.equal(haceCuanto(hace(23 * 60 + 59), AHORA), 'hace 23 h')
  assert.equal(haceCuanto(hace(2 * 1440 + 4 * 60), AHORA), 'hace 2 d')
  assert.equal(haceCuanto(hace(29 * 1440 + 23 * 60), AHORA), 'hace 29 d')
})

test('treinta días o más: la fecha, con el año solo si es otro', () => {
  assert.equal(haceCuanto(new Date(2026, 8, 12, 9, 0).toISOString(), AHORA), 'desde el 12 sep')
  assert.equal(haceCuanto(new Date(2025, 11, 3, 9, 0).toISOString(), AHORA), 'desde el 3 dic 2025')
})

test('sin ningún reporte: «Nunca reportó»; un reloj adelantado no da negativos', () => {
  assert.equal(haceCuanto(null, AHORA), 'Nunca reportó')
  assert.equal(haceCuanto('no es fecha', AHORA), 'Nunca reportó')
  assert.equal(haceCuanto(hace(-5), AHORA), 'hace 0 s')
  assert.equal(msSinReportar(undefined, AHORA), Infinity)
})

test('una sola función: formato, GPS y SOS dicen lo mismo', () => {
  const t = new Date(Date.now() - 12 * 60_000).toISOString()
  assert.equal(desde(t), 'hace 12 min')
  assert.equal(haceCuantoGps(t), 'hace 12 min')
  assert.equal(haceCuantoSos(t), 'hace 12 min')
  assert.equal(haceCuantoGps(hace(3 * 60), AHORA), haceCuanto(hace(3 * 60), AHORA))
  assert.equal(haceCuantoSos(hace(0.5), AHORA), 'hace 30 s')
  // `desde` sin fecha sigue diciendo «—»: se usa también para órdenes y avisos.
  assert.equal(desde(null), '—')
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
  const leida = conSenalAlDia({ id: 'u1', ultimoReporte: hace(3), posicionEn: hace(3) }, AHORA)
  assert.equal(leida.senal.clave, 'reportando')
  assert.equal(leida.conectado, true)
  assert.equal(leida.conexion, 'reportando')
  // Un minuto después sigue igual: el mismo objeto, para no rehacer nada en pantalla.
  assert.equal(conSenalAlDia(leida, AHORA + 60_000), leida)
  // Tres minutos después de esa lectura, sin pedir nada, ya está sin señal.
  const luego = conSenalAlDia(leida, AHORA + 3 * 60_000)
  assert.equal(luego.conectado, false)
  assert.equal(luego.conexion, 'sin_senal')
  assert.equal(estadoUnidad(luego, AHORA + 3 * 60_000).clave, 'sin_senal')
  // Y vuelve a reportar si llega un mensaje reciente.
  assert.equal(conSenalAlDia({ ...luego, ultimoReporte: hace(1), posicionEn: hace(1) }, AHORA).conexion, 'reportando')
  // Solo latidos: «conectado» por compatibilidad, pero la clave dice sin ubicación.
  const latidos = conSenalAlDia({ id: 'u2', ultimoReporte: hace(1), posicionEn: hace(120) }, AHORA)
  assert.equal(latidos.conectado, true)
  assert.equal(latidos.conexion, 'sin_ubicacion')
  assert.equal(conSenalAlDia(null, AHORA), null)
})

test('el cartel del mapa lleva el tiempo en una segunda línea chica, sin ensancharse', () => {
  const callada = vehicleMarkerSvg({ placa: 'AB538RM', ultimoReporte: hace(135), posicionEn: hace(135) }, false, AHORA)
  assert.ok(callada.includes('>Sin señal</text>'))
  assert.ok(callada.includes('font-size="9">hace 2 h</text>'))
  assert.ok(callada.includes('width="125"'))
  // Sin ubicación: ámbar (nunca verde), con la edad de la última posición.
  const latidos = vehicleMarkerSvg({ placa: 'AB538RM', ultimoReporte: hace(1), posicionEn: hace(26 * 60) }, false, AHORA)
  assert.ok(latidos.includes('>Sin ubicación</text>'))
  assert.ok(latidos.includes('font-size="9">última hace 1 d</text>'))
  assert.ok(latidos.includes('#ffbf43'))
  assert.ok(!latidos.includes('#35e888'))
  const nunca = vehicleMarkerSvg({ placa: 'AB538RM' }, false, AHORA)
  assert.ok(nunca.includes('>Nunca reportó</text>'))
  // Con señal, el cartel queda como siempre: dos líneas.
  const viva = vehicleMarkerSvg({ placa: 'AB538RM', ultimoReporte: hace(1), posicionEn: hace(1), velocidadKmh: 40 }, false, AHORA)
  assert.ok(viva.includes('>En marcha</text>'))
  assert.ok(!viva.includes('font-size="9"'))
  assert.ok(viva.includes('y="39"'))
})
