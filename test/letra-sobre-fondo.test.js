import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { leerColor, pinta, oscurecer, letraClara, luminancia, marcarLetra, limpiarLetra } from '../src/panel/letraSobreFondo.js'

// La letra suelta sobre un fondo claro pasa a tinta en TODAS las pantallas (docs/FONDOS.md):
// se decide por lo que de verdad pinta el navegador, no por una lista de clases.

test('lee los colores calculados del navegador', () => {
  assert.deepEqual(leerColor('rgb(20, 26, 34)'), [20, 26, 34, 1])
  assert.deepEqual(leerColor('rgba(39, 42, 48, 0.74)'), [39, 42, 48, 0.74])
  assert.deepEqual(leerColor('rgba(0, 0, 0, 0)'), [0, 0, 0, 0])
  assert.deepEqual(leerColor('transparent'), [0, 0, 0, 0])
  assert.deepEqual(leerColor('color(srgb 1 0.5 0 / 0.5)'), [255, 127.5, 0, 0.5])
  assert.equal(leerColor(''), null)
})

test('pinta: fondo con opacidad suficiente o una imagen/degradado', () => {
  assert.equal(pinta({ backgroundColor: 'rgba(0, 0, 0, 0)', backgroundImage: 'none' }), false)
  assert.equal(pinta({ backgroundColor: 'rgba(32, 35, 41, 0.1)', backgroundImage: 'none' }), false, 'un hover tenue no es superficie')
  assert.equal(pinta({ backgroundColor: 'rgba(39, 42, 48, 0.74)', backgroundImage: 'none' }), true, 'Glass Intenso sí')
  assert.equal(pinta({ backgroundColor: 'rgba(0, 0, 0, 0)', backgroundImage: 'linear-gradient(red, blue)' }), true)
})

test('un color fijo claro se oscurece en su mismo tono hasta AA sobre el fondo claro', () => {
  for (const c of [[255, 138, 142], [255, 200, 90], [232, 235, 240], [61, 155, 245]]) {
    assert.equal(letraClara(`rgb(${c.join(', ')})`), true)
    const o = leerColor(oscurecer(c))
    // AA contra el punto más oscuro del fondo claro (L 0,45) y contra blanco.
    for (const L of [0.45, 1]) assert.ok((L + 0.05) / (luminancia(o) + 0.05) >= 4.5, `${c} → ${o} sobre L ${L}`)
    // Mismo tono: las proporciones entre canales se mantienen.
    const k = o[0] / c[0] || o[2] / c[2]
    for (let i = 0; i < 3; i++) assert.ok(Math.abs(o[i] - c[i] * k) <= 1.5, `${c} conserva su tono`)
  }
  assert.equal(letraClara('rgb(15, 20, 27)'), false, 'la tinta no se toca')
})

// Un DOM mínimo: lo justo que usa marcarLetra.
function nodo(tag, { texto = '', fondo = 'rgba(0, 0, 0, 0)', color = 'rgb(243, 245, 248)', hijos = [] } = {}) {
  const attrs = new Map()
  const props = new Map()
  const el = {
    tagName: tag.toUpperCase(), fondo, color, parentElement: null,
    childNodes: [...(texto ? [{ nodeType: 3, nodeValue: texto }] : []), ...hijos],
    hijos,
    getAttribute: k => (attrs.has(k) ? attrs.get(k) : null),
    hasAttribute: k => attrs.has(k),
    setAttribute: (k, v) => attrs.set(k, String(v)),
    removeAttribute: k => attrs.delete(k),
    style: { setProperty: (k, v) => props.set(k, v), removeProperty: k => props.delete(k), get: k => props.get(k) },
    closest: () => null,
    todos() { return hijos.flatMap(h => [h, ...h.todos()]) },
    querySelectorAll(sel) {
      const todos = this.todos()
      return sel === '*' ? todos : todos.filter(n => n.hasAttribute('data-fondo-letra') || n.hasAttribute('data-fondo-sup'))
    },
  }
  for (const h of hijos) h.parentElement = el
  return el
}
const estilo = el => ({ backgroundColor: el.fondo, backgroundImage: 'none', color: el.hasAttribute('data-fondo-letra') && el.color.startsWith('var') ? 'rgb(15, 20, 27)' : el.color })

test('marca la letra suelta y deja la de las superficies, en cualquier pantalla', () => {
  const titulo = nodo('h1', { texto: 'Usuarios generales', color: 'var(--e-texto)' })
  const error = nodo('b', { texto: 'No pudimos cargar esto', color: 'var(--e-texto)' })
  const reintentar = nodo('button', { texto: 'Reintentar', fondo: 'rgb(29, 37, 48)' })
  const vacio = nodo('div', { hijos: [error, reintentar] })
  const enTarjeta = nodo('span', { texto: 'Empresas', color: 'var(--e-texto-2)' })
  const tarjeta = nodo('section', { fondo: 'rgba(39, 42, 48, 0.74)', hijos: [nodo('div', { hijos: [enTarjeta] })] })
  const rojoFijo = nodo('h3', { texto: 'No pueden salir', color: 'rgb(255, 138, 142)' })
  const main = nodo('main', { hijos: [nodo('header', { hijos: [titulo] }), vacio, tarjeta, rojoFijo] })

  assert.equal(marcarLetra(main, estilo), 3)
  assert.equal(titulo.getAttribute('data-fondo-letra'), 'suelta')
  assert.equal(error.getAttribute('data-fondo-letra'), 'suelta')
  assert.equal(enTarjeta.getAttribute('data-fondo-letra'), null, 'la letra de la tarjeta sigue con el diseño')
  assert.equal(reintentar.hasAttribute('data-fondo-sup'), true, 'el botón es superficie')
  assert.equal(reintentar.getAttribute('data-fondo-letra'), null)
  assert.equal(tarjeta.hasAttribute('data-fondo-sup'), true)
  // El rojo fijo del diseño: mismo tono, oscurecido.
  assert.equal(rojoFijo.getAttribute('data-fondo-letra'), 'tinta')
  assert.match(rojoFijo.style.get('--fondo-tinta-propia'), /^rgb\(\d+, \d+, \d+\)$/u)

  // Si la tarjeta deja de pintar (el teléfono la vuelve contenedor), su letra pasa a suelta.
  tarjeta.fondo = 'rgba(0, 0, 0, 0)'
  marcarLetra(main, estilo)
  assert.equal(enTarjeta.getAttribute('data-fondo-letra'), 'suelta')
  assert.equal(tarjeta.hasAttribute('data-fondo-sup'), false)

  limpiarLetra(main)
  assert.equal(main.querySelectorAll('[data-fondo-letra]').length, 0)
})

test('solo con fondo claro y fuera del Centro de control', () => {
  const panel = readFileSync(new URL('../src/panel/comp/FondoPanel.jsx', import.meta.url), 'utf8')
  assert.match(panel, /if \(f\.tono !== 'claro'\) return undefined\s*return vigilarLetra\(/u)
  const css = readFileSync(new URL('../src/styles/apariencia-fondos.css', import.meta.url), 'utf8')
  assert.match(css, /\[data-fondo-tono="claro"\]:not\(\[data-screen="\/mapa"\]\) \.pnl-main \[data-fondo-letra\] \{/u)
  assert.match(css, /\[data-fondo-letra\] \[data-fondo-sup\] \{/u)
})
