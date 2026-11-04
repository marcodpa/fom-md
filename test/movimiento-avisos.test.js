import test from 'node:test'
import assert from 'node:assert/strict'
import { DETENIDA_MS, marchaPorPosicion, olvidarMovimiento } from '../src/panel/datos/movimiento.js'
import {
  avisosSinSenal, descartarAvisoGps, marcarAvisoGpsLeido, olvidarAvisosGps, registrarCorte,
} from '../src/panel/datos/avisosSinSenal.js'
import { anotarCortes, conSenalAlDia, SIN_SENAL_MS } from '../src/panel/datos/sinSenal.js'
import { estadoUnidad } from '../src/panel/datos/estadoUnidad.js'

const MIN = 60_000
const T0 = Date.UTC(2026, 9, 27, 15, 0, 0)
const u = (extra = {}) => ({ id: 'u1', alias: 'U-001', placa: 'Z69FC7W', conectado: true, lat: 10.64, lng: -71.61, ...extra })

test('detenida: reporta pero su posición no cambia hace 3 minutos o más', () => {
  olvidarMovimiento()
  assert.equal(marchaPorPosicion(u(), T0), null) // primera lectura: todavía no se sabe
  assert.equal(marchaPorPosicion(u(), T0 + 2 * MIN), null)
  assert.equal(marchaPorPosicion(u({ lat: 10.640004 }), T0 + 2.5 * MIN), null) // ruido del GPS parado (~0,4 m)
  assert.equal(marchaPorPosicion(u(), T0 + DETENIDA_MS), 'parada')
})

test('en marcha: la posición cambia; sigue en marcha hasta 3 minutos después del último cambio', () => {
  olvidarMovimiento()
  marchaPorPosicion(u(), T0)
  assert.equal(marchaPorPosicion(u({ lat: 10.645 }), T0 + MIN), 'en_marcha')
  assert.equal(marchaPorPosicion(u({ lat: 10.645 }), T0 + 3 * MIN), 'en_marcha')
  assert.equal(marchaPorPosicion(u({ lat: 10.645 }), T0 + 4 * MIN), 'parada')
})

test('la velocidad y lo que dice el servidor mandan cuando están', () => {
  olvidarMovimiento()
  assert.equal(marchaPorPosicion(u({ velocidadKmh: 42 }), T0), 'en_marcha')
  olvidarMovimiento()
  assert.equal(marchaPorPosicion(u({ id: 'u2', estadoMarcha: 'parada' }), T0), 'parada')
  assert.equal(marchaPorPosicion(u({ id: 'u3', estadoMarcha: 'en_marcha' }), T0 + 10 * MIN), 'en_marcha')
})

test('conSenalAlDia guarda la señal de la regla única; sin reporte, Sin señal', () => {
  olvidarAvisosGps()
  const ultimo = (min) => new Date(T0 + min * MIN).toISOString()
  const leida = u({ ultimoReporte: ultimo(0), posicionEn: ultimo(0), estadoMarcha: null })
  const quieta = conSenalAlDia(leida, T0 + MIN)
  assert.equal(quieta.senal.clave, 'reportando')
  assert.equal(estadoUnidad(quieta, T0 + MIN).clave, 'parada')
  assert.equal(estadoUnidad(quieta, T0 + MIN).texto, 'Detenida')
  // Sin reportar 5 minutos o más: Sin señal (equipo sin corriente).
  const callada = conSenalAlDia(leida, T0 + SIN_SENAL_MS)
  assert.equal(callada.senal.clave, 'sin_senal')
  assert.equal(callada.conectado, false)
  assert.equal(estadoUnidad(callada, T0 + SIN_SENAL_MS).clave, 'sin_senal')
  // Pintar no anota avisos: eso va en un efecto (anotarCortes), no en conSenalAlDia.
  assert.equal(avisosSinSenal().length, 0)
  anotarCortes([callada, leida], T0 + SIN_SENAL_MS)
  assert.equal(avisosSinSenal().length, 1)
  // Una que solo manda latidos (sin ubicación) no es un corte: no avisa.
  olvidarAvisosGps()
  anotarCortes([u({ ultimoReporte: ultimo(0), posicionEn: ultimo(-120) })], T0 + MIN)
  assert.equal(avisosSinSenal().length, 0)
})

test('GPS sin señal: un aviso por unidad y por corte, lo más nuevo primero', () => {
  olvidarAvisosGps()
  const ultimo1 = new Date(T0).toISOString()
  const ahora = T0 + 6 * MIN
  assert.equal(registrarCorte(u({ ultimoReporte: ultimo1 }), T0 + SIN_SENAL_MS, ahora), true)
  const hora = `${String(new Date(T0).getHours()).padStart(2, '0')}:${String(new Date(T0).getMinutes()).padStart(2, '0')}`
  const [a] = avisosSinSenal()
  assert.equal(a.titulo, `GPS sin señal: U-001 Z69FC7W dejó de reportar a las ${hora}`)
  assert.equal(a.tipo, 'gps_sin_senal')
  assert.equal(a.leida, false)
  // Mientras siga callada no se repite.
  assert.equal(registrarCorte(u({ ultimoReporte: ultimo1 }), T0 + SIN_SENAL_MS, ahora + 30 * MIN), false)
  assert.equal(avisosSinSenal().length, 1)
  // Vuelve y se corta otra vez (otro último reporte): aviso nuevo, y el más nuevo va primero.
  const ultimo2 = new Date(T0 + 60 * MIN).toISOString()
  assert.equal(registrarCorte(u({ ultimoReporte: ultimo2 }), T0 + 60 * MIN + SIN_SENAL_MS, T0 + 70 * MIN), true)
  const lista = avisosSinSenal()
  assert.equal(lista.length, 2)
  assert.ok(lista[0].creadaEn > lista[1].creadaEn)
  // Otra unidad: su propio aviso. Leer y descartar.
  assert.equal(registrarCorte(u({ id: 'u9', ultimoReporte: ultimo2 }), T0 + 60 * MIN + SIN_SENAL_MS, T0 + 70 * MIN), true)
  marcarAvisoGpsLeido(lista[0].id)
  assert.equal(avisosSinSenal().find((n) => n.id === lista[0].id).leida, true)
  descartarAvisoGps(lista[0].id)
  assert.equal(avisosSinSenal().length, 2)
})

test('GPS sin señal: no avisa de cortes de hace más de un día ni de unidades que nunca reportaron', () => {
  olvidarAvisosGps()
  const viejo = new Date(T0 - 3 * 24 * 60 * MIN).toISOString()
  assert.equal(registrarCorte(u({ ultimoReporte: viejo }), T0 - 3 * 24 * 60 * MIN + SIN_SENAL_MS, T0), false)
  assert.equal(registrarCorte(u({ ultimoReporte: null }), NaN, T0), false)
  assert.equal(avisosSinSenal().length, 0)
})
