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
