import { test } from 'node:test'
import assert from 'node:assert/strict'
import { kmPorDia, kmRecorridos, resumenKm } from '../src/panel/datos/odometro.js'

const T0 = Date.parse('2026-10-02T08:00:00Z')
const pt = (min, lat, vel = 40, lng = -71.4) => ({ lat, lng, hora: new Date(T0 + min * 60000).toISOString(), velocidadKmh: vel })

test('una línea recta de ~1 km suma ~1 km', () => {
  const p = []
  for (let m = 0; m <= 10; m++) p.push(pt(m, 10 + m * 0.0009)) // ~100 m por minuto
  const km = kmRecorridos(p)
  assert.ok(km > 0.95 && km < 1.05, `km=${km}`)
})

test('un GPS parado que baila no suma kilómetros', () => {
  const p = []
  for (let m = 0; m <= 20; m++) p.push(pt(m, 10 + (m % 2) * 0.0003, 0)) // ~33 m de ida y vuelta
  assert.ok(kmRecorridos(p) < 0.05)
})

test('un salto lejano del GPS no se cuenta como recorrido', () => {
  const p = [pt(0, 10, 0), pt(1, 10, 0), pt(2, 10.05, 0), pt(3, 10, 0), pt(4, 10, 0)]
  assert.ok(kmRecorridos(p) < 0.05)
})

test('km por día separa los días y resumen separa hoy', () => {
  const dia2 = (min, lat) => ({ ...pt(min, lat), hora: new Date(T0 + 86400000 + min * 60000).toISOString() })
  const p = [pt(0, 10), pt(5, 10.005), pt(10, 10.01), dia2(0, 10.01), dia2(5, 10.015)]
  const d = kmPorDia(p)
  assert.equal(d.length, 2)
  const r = resumenKm({ lectura: 52300, puntos: p, hoy: '2026-10-02' })
  assert.equal(r.lectura, 52300)
  assert.ok(r.hoyKm > 1 && r.recorridoKm > r.hoyKm)
})

test('sin lectura ni puntos todo queda en cero y la lectura en null', () => {
  const r = resumenKm({ puntos: [], hoy: '2026-10-02' })
  assert.equal(r.lectura, null)
  assert.equal(r.recorridoKm, 0)
})
