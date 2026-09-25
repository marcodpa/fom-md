import test from 'node:test'
import assert from 'node:assert/strict'
import { screenProjection } from '../src/lib/screenProjection.js'

test('la captura coincide con las cuatro esquinas del monitor en perspectiva', () => {
  const target = [[758,150],[1588,185],[1608,705],[750,708]]
  const m = screenProjection(target)
  ;[[0,0],[1000,0],[1000,1000],[0,1000]].forEach(([x,y],i) => {
    const denominator = m[3]*x+m[7]*y+m[15]
    assert.ok(Math.abs((m[0]*x+m[4]*y+m[12])/denominator-target[i][0])<0.001)
    assert.ok(Math.abs((m[1]*x+m[5]*y+m[13])/denominator-target[i][1])<0.001)
  })
})
test('rechaza un dispositivo sin superficie', () => {
  assert.throws(()=>screenProjection([[0,0],[0,0],[0,0],[0,0]]),/Degenerate/)
})
