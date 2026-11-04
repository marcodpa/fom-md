import test from 'node:test'
import assert from 'node:assert/strict'
import { estadoUnidad } from '../src/panel/datos/estadoUnidad.js'
import { vehicleMarkerSvg, validPosition } from '../src/panel/comp/vehicleMarker.js'

test('GPS sin señal prevalece sobre la última velocidad y el encendido', () => {
  const ahora = Date.now()
  const hace = (min) => new Date(ahora - min * 60_000).toISOString()
  const alDia = { ultimoReporte: hace(1), posicionEn: hace(1) }
  assert.equal(estadoUnidad({ ultimoReporte: hace(10), posicionEn: hace(10), ignition: true, velocidadKmh: 54 }, ahora).clave, 'sin_senal')
  assert.equal(estadoUnidad({ ...alDia }, ahora).clave, 'parada')
  assert.equal(estadoUnidad({ ...alDia }, ahora).texto, 'Detenida')
  assert.equal(estadoUnidad({ ...alDia, velocidadKmh: 0 }, ahora).color, 'verde')
  assert.equal(estadoUnidad({ ...alDia, velocidadKmh: 54 }, ahora).clave, 'en_marcha')
  // Ni «Encendido» ni «Apagado» ni «Reportando»: el encendido es un detalle.
  assert.equal(estadoUnidad({ ...alDia, ignition: true }, ahora).texto, 'Detenida')
  assert.equal(estadoUnidad({ ...alDia, ignition: false }, ahora).texto, 'Detenida')
})

test('marcadores no ejecutan placas como HTML y no inventan rumbo', () => {
  const markup = vehicleMarkerSvg({ placa: '<script>x</script>', conectado: true })
  assert.ok(!markup.includes('<script>'))
  assert.ok(markup.includes('&lt;script&gt;'))
  assert.ok(!markup.includes('M26 4 L32 13'))
  const north = vehicleMarkerSvg({ placa: 'AB538RM', conectado: true, rumbo: 0 }, true)
  assert.ok(north.includes('M26 4 L32 13'))
  assert.ok(north.includes('rotate(0 26 40)'))
  assert.ok(north.includes('stroke="#168fff"'))
  assert.ok(vehicleMarkerSvg({ rumbo: -90 }).includes('rotate(270 26 40)'))
})

test('mapas aceptan coordenadas cero y rechazan coordenadas inválidas', () => {
  assert.equal(validPosition({ lat: 0, lng: 0 }), true)
  for (const v of [{ lat: null, lng: 0 }, { lat: NaN, lng: 0 }, { lat: 91, lng: 0 }, { lat: 0, lng: 181 }]) assert.equal(validPosition(v), false)
})
