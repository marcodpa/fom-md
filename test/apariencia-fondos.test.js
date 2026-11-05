import test from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readFileSync, statSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { FONDOS, FONDO_POR_DEFECTO, fondoPorId, crearPreferenciasFondo, claveFondo } from '../src/panel/apariencia-store.js'

const css = readFileSync(new URL('../src/styles/apariencia-fondos.css', import.meta.url), 'utf8')

test('cada fondo del catálogo tiene id único, nombre, descripción y tono válido', () => {
  assert.ok(FONDOS.length >= 4 && FONDOS.length <= 6, 'entre 4 y 6 fondos')
  assert.equal(new Set(FONDOS.map(f => f.id)).size, FONDOS.length)
  for (const f of FONDOS) {
    assert.match(f.id, /^[a-z0-9-]+$/u, `id de ${f.nombre}`)
    assert.ok(f.nombre?.trim(), `nombre de ${f.id}`)
    assert.ok(f.descripcion?.trim(), `descripción de ${f.id}`)
    assert.ok(f.tono === null || f.tono === 'claro' || f.tono === 'oscuro', `tono de ${f.id}`)
  }
})

test('cada imagen del catálogo existe, es webp y es liviana; los fondos sin foto tienen su CSS', () => {
  for (const f of FONDOS.filter(x => x.tono)) {
    const archivos = [f.imagen, f.imagenMovil, f.miniatura].filter(Boolean)
    if (!archivos.length) {
      assert.ok(css.includes(`.pnl-fondo[data-fondo="${f.id}"]`), `degradado de ${f.id}`)
      continue
    }
    assert.equal(archivos.length, 3, `${f.id} trae escritorio, teléfono y miniatura`)
    for (const url of archivos) {
      const ruta = fileURLToPath(url)
      assert.ok(existsSync(ruta), `existe ${ruta}`)
      assert.match(ruta, /\.webp$/u)
      assert.ok(statSync(ruta).size < 80_000, `${ruta} pesa menos de 80 KB`)
    }
  }
})

test('«Sin fondo» es el valor por defecto, también para cuentas nuevas y datos raros', () => {
  assert.equal(FONDO_POR_DEFECTO, 'ninguno')
  assert.equal(FONDOS[0].id, 'ninguno')
  assert.equal(FONDOS[0].nombre, 'Sin fondo')
  assert.equal(FONDOS[0].tono, null)
  assert.equal(fondoPorId('inventado').id, 'ninguno')
  const datos = new Map([[claveFondo('b'), 'inventado']])
  const store = crearPreferenciasFondo(() => ({ getItem: k => datos.get(k), setItem: (k, v) => datos.set(k, v) }))
  assert.equal(store.leer(''), 'ninguno')
  assert.equal(store.leer('a'), 'ninguno')
  assert.equal(store.leer('b'), 'ninguno')
})

test('el fondo se guarda por cuenta y no toca la preferencia de diseño', () => {
  const datos = new Map()
  const storage = { getItem: k => datos.get(k), setItem: (k, v) => datos.set(k, v) }
  const store = crearPreferenciasFondo(() => storage)
  assert.equal(store.cambiar('a', 'blanco-carros'), true)
  assert.equal(store.cambiar('a', 'inventado'), false)
  assert.equal(crearPreferenciasFondo(() => storage).leer('a'), 'blanco-carros')
  assert.equal(store.leer('b'), 'ninguno')
  assert.deepEqual([...datos.keys()], [claveFondo('a')])
})

test('el Centro de control queda fuera del fondo', () => {
  assert.match(css, /\[data-fondo-tono\]:not\(\[data-screen="\/mapa"\]\)/u)
  assert.match(readFileSync(new URL('../src/panel/Consola.jsx', import.meta.url), 'utf8'), /!sobreMapa && <FondoPanel/u)
})

// Decisión de Marco (5 nov 2026): «el glass es para todo menos el fondo, y los fondos son
// únicamente el fondo». El diseño (Azul FOM / Glass gris) decide tarjetas, barras, botones,
// colores y logo; el fondo solo pinta la capa de atrás.
// La letra SUELTA (fuera de superficies) con fondo claro sí pasa a tinta: es lo único que
// el tono del fondo puede tocar, y dentro de cada superficie vuelven los tokens del diseño.
const LETRA = new Set(['--pa-suave', '--e-texto', '--e-texto-2', '--e-texto-3', '--e-primario', '--e-info', '--e-exito', '--e-aviso', '--e-peligro', '--app-texto', '--app-texto-2', '--app-texto-3', '--app-primario'])
const sinComentarios = css.replace(/\/\*[\s\S]*?\*\//gu, '')
const reglas = [...sinComentarios.matchAll(/([^{}]+)\{([^{}]*)\}/gu)].map(([, selector, cuerpo]) => ({ selector: selector.trim(), cuerpo }))

test('el fondo no cambia tokens de superficie, material ni piezas del diseño', () => {
  for (const { selector, cuerpo } of reglas) {
    const tokens = [...cuerpo.matchAll(/(--(?:e|app|apariencia)-[\w-]+)\s*:/gu)].map(m => m[1])
    for (const t of tokens) assert.ok(LETRA.has(t), `«${selector}» redefine ${t}: el fondo no toca superficies, bordes, sombras ni vidrio`)
    if (!selector.includes('data-fondo-tono')) continue
    // Lo único que pinta: «transparente» en .pnl y en las piezas que eran el color liso de la pantalla.
    assert.doesNotMatch(cuerpo.replace(/background: transparent;/gu, ''), /(?:^|[;\s])(?:background|background-color|color-scheme|accent-color|outline-color|backdrop-filter|-webkit-backdrop-filter|box-shadow|border(?:-color)?)\s*:/u, `«${selector}» cambia material`)
    // Una regla que solo cambia la letra (tokens de letra y `color`) puede nombrar una pieza:
    // pasa con el botón sutil y la tarjeta que el teléfono deja sin fondo en Vehículos.
    const soloLetra = [...cuerpo.matchAll(/([\w-]+)\s*:/gu)].every(([, p]) => LETRA.has(p) || p === 'color' || p === '--pa-suave')
    if (soloLetra) continue
    assert.doesNotMatch(selector, /\.(?:pnl-side|pnl-topbar|pnl-card|pnl-kpi|pnl-btn|pnl-modal|pnl-nav-item|pnl-tab|pnl-chip|pnl-mapa|mv-barra|mv-dock(?![\w-])|fom-logo)/u, `«${selector}» toca una pieza del diseño`)
    assert.doesNotMatch(selector, /data-diseno/u, `«${selector}» depende del diseño`)
  }
  assert.ok(!existsSync(fileURLToPath(new URL('../src/assets/fondos/fom-logo-tinta.svg', import.meta.url))), 'el logo no cambia con el fondo')
})

test('con fondo claro, la letra suelta de TODAS las pantallas pasa a tinta y las superficies vuelven al diseño', () => {
  const tinta = reglas.find(r => r.selector.endsWith('.pnl-main [data-fondo-letra]'))
  assert.ok(tinta, 'la tinta va en lo que letraSobreFondo.js marca como suelto, en cualquier pantalla')
  assert.match(tinta.selector, /\[data-fondo-tono="claro"\]:not\(\[data-screen="\/mapa"\]\)/u)
  assert.match(tinta.cuerpo, /--e-texto: #0f141b;/u)
  const copia = reglas.find(r => /\[data-fondo-tono="claro"\]:not\(\[data-screen="\/mapa"\]\)$/u.test(r.selector) && r.cuerpo.includes('--fondo-d-texto'))
  const vuelta = reglas.find(r => r.selector.endsWith('[data-fondo-letra] [data-fondo-sup]') && r.cuerpo.includes('var(--fondo-d-texto)'))
  assert.ok(copia && vuelta, 'se copian los tokens del diseño y se devuelven en las superficies')
  for (const [, t] of tinta.cuerpo.matchAll(/(--[\w-]+):/gu)) assert.ok(vuelta.cuerpo.includes(`${t}:`), `${t} vuelve al diseño en las superficies`)
  // El color, sin especificidad: el color propio de cada pieza manda.
  assert.ok(reglas.some(r => r.selector.startsWith(':where(') && r.selector.includes('[data-fondo-letra]') && /^\s*color: var\(--e-texto\);\s*$/u.test(r.cuerpo)))
  // Sin listas de clases ni velo: se mira lo que pinta.
  assert.doesNotMatch(css, /\[class\*=|\.pnl-cab-txt::before|\.rs-vivo::before|--fondo-velo/u)
})

// Contraste de la tinta (AA) sobre el blanco del fondo y sobre los carros grises desenfocados.
const lin = c => { const x = c / 255; return x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4 }
const lum = h => { const [r, g, b] = [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16)); return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b) }
test('la tinta pasa AA sobre blanco y sobre gris medio (#B4BAC2)', () => {
  const tinta = reglas.find(r => r.selector.endsWith('.pnl-main [data-fondo-letra]'))
  for (const [, t, h] of tinta.cuerpo.matchAll(/(--e-[\w-]+): (#[0-9a-f]{6});/gu)) {
    for (const fondo of ['#ffffff', '#b4bac2']) {
      const [a, b] = [lum(h), lum(fondo)].sort((m, n) => n - m)
      assert.ok((a + 0.05) / (b + 0.05) >= 4.5, `${t} ${h} sobre ${fondo}`)
    }
  }
})
