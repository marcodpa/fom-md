import { test } from 'node:test'
import assert from 'node:assert/strict'
import { analizar, detectarParadas, distanciaM, puntoEnRuta, ultimosMinutos } from '../src/panel/datos/recorrido.js'

// Un punto cada minuto a partir de las 08:00; ~111 m por cada 0,001° de latitud.
const T0 = Date.parse('2026-10-02T08:00:00Z')
const pt = (min, lat, lng = -71.4) => ({ lat, lng, hora: new Date(T0 + min * 60000).toISOString(), velocidadKmh: 0 })

/** Rueda 10 minutos, se estaciona 12, rueda otros 10. */
function jornada() {
  const puntos = []
  for (let m = 0; m <= 10; m++) puntos.push(pt(m, 10.0 + m * 0.002)) // ~222 m por minuto
  for (let m = 11; m <= 22; m++) puntos.push(pt(m, 10.02 + (m % 2) * 0.0001)) // deriva de ~11 m
  for (let m = 23; m <= 33; m++) puntos.push(pt(m, 10.02 + (m - 22) * 0.002))
  return puntos
}

test('distancia: 0,001° de latitud son unos 111 m', () => {
  const d = distanciaM({ lat: 10, lng: -71 }, { lat: 10.001, lng: -71 })
  assert.ok(d > 109 && d < 113, String(d))
})

test('una parada de 12 min con deriva de GPS se detecta como una sola', () => {
  const { paradas } = detectarParadas(jornada())
  assert.equal(paradas.length, 1)
  assert.ok(paradas[0].minutos >= 11 && paradas[0].minutos <= 12, String(paradas[0].minutos))
})

test('menos de 5 minutos en el mismo sitio no es una parada', () => {
  const puntos = []
  for (let m = 0; m <= 6; m++) puntos.push(pt(m, 10 + m * 0.002))
  for (let m = 7; m <= 10; m++) puntos.push(pt(m, 10.012)) // 3 min quieto
  for (let m = 11; m <= 16; m++) puntos.push(pt(m, 10.012 + (m - 10) * 0.002))
  assert.equal(detectarParadas(puntos).paradas.length, 0)
})

test('exactamente 5 minutos sí cuenta', () => {
  const puntos = [pt(0, 10), pt(1, 10), pt(2, 10), pt(3, 10), pt(4, 10), pt(5, 10)]
  assert.equal(detectarParadas(puntos).paradas.length, 1)
})

test('la jornada se parte en dos viajes con su inicio y su fin', () => {
  const { viajes, paradas } = analizar(jornada())
  assert.equal(viajes.length, 2)
  assert.equal(viajes[0].inicio.hora, new Date(T0).toISOString())
  // El primer viaje termina donde empieza la parada.
  assert.equal(viajes[0].fin.hora, paradas[0].desde)
  assert.equal(viajes[1].inicio.hora, paradas[0].hasta)
  assert.equal(viajes[0].fin.enCurso, false)
  // El segundo llega hasta el último punto: sigue en camino.
  assert.equal(viajes[1].fin.enCurso, true)
  assert.ok(viajes[0].distanciaM > 1500)
})

test('sin paradas, todo es un único viaje', () => {
  const puntos = []
  for (let m = 0; m <= 15; m++) puntos.push(pt(m, 10 + m * 0.002))
  const { viajes, paradas } = analizar(puntos)
  assert.equal(paradas.length, 0)
  assert.equal(viajes.length, 1)
})

test('una unidad que nunca se mueve no inventa viajes', () => {
  const puntos = []
  for (let m = 0; m <= 30; m++) puntos.push(pt(m, 10 + (m % 2) * 0.0001))
  const { viajes, paradas } = analizar(puntos)
  assert.equal(viajes.length, 0)
  assert.equal(paradas.length, 1)
})

test('últimos 5 minutos: cuenta hacia atrás desde el último punto, no desde el reloj', () => {
  const cola = ultimosMinutos(jornada(), 5)
  assert.equal(cola.at(-1).hora, new Date(T0 + 33 * 60000).toISOString())
  assert.equal(cola[0].hora, new Date(T0 + 28 * 60000).toISOString())
})

test('últimos 5 minutos: sin puntos no hay cola; con un solo punto reciente se completa con el anterior', () => {
  assert.deepEqual(ultimosMinutos([], 5), [])
  const cola = ultimosMinutos([pt(0, 10), pt(30, 10.05)], 5)
  assert.equal(cola.length, 2)
})

test('el punto más cercano de la ruta da la hora de ese tramo', () => {
  const p = puntoEnRuta(jornada(), { lat: 10.0041, lng: -71.4 })
  assert.equal(p.indice, 2)
  assert.equal(p.hora, new Date(T0 + 2 * 60000).toISOString())
})

test('los puntos se ordenan aunque lleguen del más nuevo al más viejo', () => {
  const al_reves = jornada().reverse()
  assert.equal(analizar(al_reves).viajes.length, 2)
})
