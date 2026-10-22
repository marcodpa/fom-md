import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  DIAS_MANEJO, calificacionManejo, cifrasManejo, etiquetaManejo, eventosManejo, manejoDe, tonoManejo,
} from '../src/panel/datos/manejo.js'

// Forma que entrega repoApi.manejo (scoreDe): el servidor manda `rating` (política driving-v1).
const score = (o = {}) => ({ indice: 49, eventosPor100: 3.2, km: 412.6, dias: 7, frenadas: 4, aceleraciones: 2, excesos: 7, rating: 'red', ...o })

test('la pastilla dice el número y la palabra de la tabla del Resumen', () => {
  assert.equal(etiquetaManejo(score()), '49 · Atención')
  assert.equal(etiquetaManejo(score({ indice: 78, rating: 'yellow' })), '78 · Puede mejorar')
  assert.equal(etiquetaManejo(score({ indice: 92, rating: 'green' })), '92 · Seguro')
})

test('los tonos son los de Tag: verde, ambar, rojo y gris', () => {
  assert.equal(tonoManejo(score({ rating: 'green' })), 'verde')
  assert.equal(tonoManejo(score({ rating: 'yellow' })), 'ambar')
  assert.equal(tonoManejo(score({ rating: 'red' })), 'rojo')
  assert.equal(tonoManejo(score({ indice: null, rating: 'unavailable' })), 'gris')
})

test('manda la calificación del servidor, no el número', () => {
  // Un 80 que el servidor califica rojo se queda rojo.
  assert.equal(tonoManejo(score({ indice: 80, rating: 'red' })), 'rojo')
  assert.equal(etiquetaManejo(score({ indice: 80, rating: 'red' })), '80 · Atención')
})

test('sin calificación pero con índice: 85 o más verde, 70 a 84 ámbar, menos de 70 rojo', () => {
  assert.equal(calificacionManejo({ indice: 85 }), 'green')
  assert.equal(calificacionManejo({ indice: 84 }), 'yellow')
  assert.equal(calificacionManejo({ indice: 70 }), 'yellow')
  assert.equal(calificacionManejo({ indice: 69 }), 'red')
})

test('sin km, sin índice o sin dato: «Sin km» en gris', () => {
  for (const s of [null, undefined, score({ indice: null, rating: 'unavailable' }), score({ indice: 60, rating: 'unavailable' }), { indice: 140 }]) {
    assert.equal(etiquetaManejo(s), 'Sin km')
    assert.equal(tonoManejo(s), 'gris')
  }
})

test('las 6 cifras salen en el orden de la tabla y «—» cuando no hay dato', () => {
  assert.deepEqual(cifrasManejo(score()).map((c) => c.etiqueta), ['Score', 'Por 100 km', 'Frenadas', 'Aceleraciones', 'Excesos', 'Km'])
  const valores = cifrasManejo(score()).map((c) => c.valor)
  assert.equal(valores[0], '49')
  assert.equal(valores[5], '413')
  const sinKm = cifrasManejo(score({ indice: null, eventosPor100: null, km: 0, frenadas: 0, aceleraciones: 0, excesos: 0, rating: 'unavailable' }))
  assert.deepEqual(sinKm.map((c) => c.valor), ['—', '—', '0', '0', '0', '0'])
  assert.ok(cifrasManejo(null).every((c) => c.valor === '—'))
})

test('eventos del período y búsqueda en el ranking', () => {
  assert.equal(eventosManejo(score()), 13)
  assert.equal(eventosManejo(null), null)
  const ranking = [{ id: 'a', ...score() }, { id: 'b', ...score({ indice: 90, rating: 'green' }) }]
  assert.equal(manejoDe(ranking, 'b').indice, 90)
  assert.equal(manejoDe(ranking, 'z'), null)
  assert.equal(manejoDe(null, 'a'), null)
  assert.deepEqual(DIAS_MANEJO, [7, 30])
})
