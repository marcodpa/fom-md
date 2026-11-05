import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { VIDRIOS, VIDRIO_POR_DEFECTO, VIDRIO_DEL_DISENO, vidrioEfectivo, atributoVidrio, crearPreferenciasVidrio, claveVidrio, DISENOS } from '../src/panel/apariencia-store.js'

// VIDRIO DE LAS TARJETAS (docs/FONDOS.md › Vidrio): Sólido, Suave, Medio, Intenso.
const css = readFileSync(new URL('../src/styles/apariencia-vidrio.css', import.meta.url), 'utf8')
const almacen = datos => ({ getItem: k => datos.get(k), setItem: (k, v) => datos.set(k, v) })

test('los cuatro pasos, en orden, y uno por diseño', () => {
  assert.deepEqual(VIDRIOS.map(v => [v.id, v.nombre]), [['solido', 'Sólido'], ['suave', 'Suave'], ['medio', 'Medio'], ['intenso', 'Intenso']])
  for (const d of DISENOS) assert.ok(VIDRIOS.some(v => v.id === VIDRIO_DEL_DISENO[d.id]), `paso de ${d.id}`)
})

test('por defecto, el vidrio de hoy: sin atributo y el paso del diseño (Azul sólido, Glass medio)', () => {
  assert.equal(VIDRIO_POR_DEFECTO, null)
  assert.equal(atributoVidrio(VIDRIO_POR_DEFECTO), undefined, 'sin elección, .pnl no lleva data-vidrio y el CSS es el de siempre')
  assert.equal(vidrioEfectivo('azul', null), 'solido')
  assert.equal(vidrioEfectivo('glass', null), 'medio')
  const store = crearPreferenciasVidrio(() => almacen(new Map()))
  assert.equal(store.leer('a'), null)
  assert.equal(store.leer(''), null)
  // «Medio» en Glass es exactamente el Glass de apariencia.css.
  assert.deepEqual(VIDRIOS.find(v => v.id === 'medio').alfa.glass, [0.88, 0.94, 0.78])
  assert.deepEqual(VIDRIOS.find(v => v.id === 'solido').alfa.azul, [1, 1, 1])
})

test('un valor inválido cae al valor por defecto', () => {
  const datos = new Map([[claveVidrio('b'), 'cristal'], [claveVidrio('c'), 'intenso']])
  const store = crearPreferenciasVidrio(() => almacen(datos))
  assert.equal(store.leer('b'), null)
  assert.equal(store.leer('c'), 'intenso')
  assert.equal(store.cambiar('c', '200%'), false)
  assert.equal(store.leer('c'), 'intenso')
  assert.equal(vidrioEfectivo('glass', 'cristal'), 'medio')
  assert.equal(atributoVidrio('cristal'), undefined)
  const roto = crearPreferenciasVidrio(() => ({ getItem: () => { throw new Error('bloqueado') } }))
  assert.equal(roto.leer('c'), null)
})

test('se guarda por cuenta, con su propia clave', () => {
  const datos = new Map()
  const store = crearPreferenciasVidrio(() => almacen(datos))
  assert.equal(store.cambiar('a', 'suave'), true)
  assert.equal(crearPreferenciasVidrio(() => almacen(datos)).leer('a'), 'suave')
  assert.equal(store.leer('b'), null)
  assert.deepEqual([...datos.keys()], ['fom.vidrio.v1:a'])
})

test('«reducir transparencia» fuerza Sólido', () => {
  for (const d of DISENOS) for (const v of [null, ...VIDRIOS.map(x => x.id)]) {
    assert.equal(vidrioEfectivo(d.id, v, true), 'solido')
    assert.equal(atributoVidrio(v, true), 'solido')
  }
  const bloque = css.match(/@media \(prefers-reduced-transparency: reduce\) \{([\s\S]*?)\n\}/u)?.[1] ?? ''
  assert.match(bloque, /--vidrio-alfa: 1;/u)
  assert.match(bloque, /--vidrio-alfa-alta: 1;/u)
  assert.match(bloque, /--vidrio-alfa-baja: 1;/u)
  assert.match(bloque, /--vidrio-blur: none;/u)
})

test('el CSS usa los mismos topes que el catálogo', () => {
  for (const v of VIDRIOS.filter(x => x.id !== 'solido')) {
    for (const d of DISENOS) {
      const [sup, alta, baja] = v.alfa[d.id].map(n => String(n).replace(/^0/u, ''))
      const regla = `.pnl.fom-dark[data-diseno="${d.id}"][data-vidrio="${v.id}"] { --vidrio-alfa: ${sup}; --vidrio-alfa-alta: ${alta}; --vidrio-alfa-baja: ${baja}; }`
      assert.ok(css.includes(regla), `falta o no coincide: ${regla}`)
    }
  }
  assert.match(css, /\[data-vidrio="solido"\] \{\s*--vidrio-alfa: 1;\s*--vidrio-alfa-alta: 1;\s*--vidrio-alfa-baja: 1;\s*--vidrio-blur: none;/u)
})

// Contraste WCAG con blanco puro detrás (el peor caso: Blanco con carros, Perla).
const lin = c => { const x = c / 255; return x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4 }
const lum = ([r, g, b]) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b)
const hex = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16))
const sobreBlanco = (rgb, a) => rgb.map(c => c * a + 255 * (1 - a))
const contraste = (x, y) => { const [a, b] = [lum(x), lum(y)].sort((m, n) => n - m); return (a + 0.05) / (b + 0.05) }
// Superficies y letra de cada diseño (redesign.css y apariencia.css).
const DISENO = {
  azul: { sup: [[20, 26, 34], [29, 37, 48], [15, 20, 27]], letra: ['#f3f5f8', '#abb3bf', '#8c97a7'] },
  glass: { sup: [[39, 42, 48], [53, 56, 63], [32, 35, 41]], letra: ['#f3f5f8', '#edf0f5', '#e2e6ec'] },
}

test('con cualquier vidrio, la letra del diseño pasa AA aun con blanco puro detrás', () => {
  for (const v of VIDRIOS) for (const d of DISENOS) {
    const { sup, letra } = DISENO[d.id]
    v.alfa[d.id].forEach((a, i) => {
      assert.ok(a > 0 && a <= 1, `${v.id}/${d.id}: alfa entre 0 y 1`)
      const fondo = sobreBlanco(sup[i], a)
      for (const l of letra) {
        const c = contraste(hex(l), fondo)
        assert.ok(c >= 4.5, `${d.id} · ${v.id} · superficie ${i}: ${l} queda en ${c.toFixed(2)}:1`)
      }
    })
  }
})

test('el vidrio no cambia colores: solo la opacidad de las superficies del diseño', () => {
  const sinComentarios = css.replace(/\/\*[\s\S]*?\*\//gu, '')
  const tokens = new Set([...sinComentarios.matchAll(/(--(?:e|app)-[\w-]+)\s*:/gu)].map(m => m[1]))
  assert.deepEqual([...tokens].sort(), ['--app-sombra-tarjeta', '--app-sup', '--app-sup-alta', '--app-sup-baja', '--e-sup', '--e-sup-alta', '--e-sup-baja'])
  assert.match(css, /\[data-diseno="azul"\]\[data-vidrio\] \{\s*--vidrio-rgb-sup: 20 26 34;\s*--vidrio-rgb-alta: 29 37 48;\s*--vidrio-rgb-baja: 15 20 27;/u)
  assert.match(css, /\[data-diseno="glass"\]\[data-vidrio\] \{\s*--vidrio-rgb-sup: 39 42 48;\s*--vidrio-rgb-alta: 53 56 63;\s*--vidrio-rgb-baja: 32 35 41;/u)
  assert.match(readFileSync(new URL('../src/panel/Consola.jsx', import.meta.url), 'utf8'), /data-vidrio=\{vidrioAtributo\}/u)
})
