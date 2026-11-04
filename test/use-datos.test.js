import assert from 'node:assert/strict'
import test from 'node:test'
import { resolve } from 'node:path'
import { build } from 'vite'

// ============================================================
// P5: un refresco silencioso que falla NO borra la pantalla.
// Antes `useDatos` ponía estado='error' aunque ya hubiera datos buenos: el refresco de 15 s
// de la flota, o el que sigue a una edición, tumbaba la lista con un fallo pasajero.
//
// No hay navegador en las pruebas: se empaqueta el hook con el mismo React y se le da un
// despachador de hooks mínimo (estado, ref, callback y efectos) para ejecutarlo de verdad.
// ============================================================

async function cargarHook() {
  const entrada = resolve('use-datos-prueba.js')
  const hook = resolve('src/panel/useDatos.js').replaceAll('\\', '/')
  const salida = await build({
    root: resolve('.'),
    configFile: false,
    logLevel: 'silent',
    plugins: [{
      name: 'use-datos-prueba',
      // Antes que el resolutor de Vite, que si no se adelanta y empaqueta el repositorio real.
      enforce: 'pre',
      resolveId(id, importador) {
        if (id === entrada) return entrada
        if (id === 'repo-falso-prueba') return 'virtual-repo-falso'
        // El repositorio entero no hace falta: solo el aviso de «algo cambió».
        if (id === './datos/repo' && importador?.endsWith('useDatos.js')) return 'virtual-repo-falso'
      },
      load(id) {
        if (id === entrada) {
          return `import React from 'react'
            export { useDatos } from '${hook}'
            export { oyentes } from 'repo-falso-prueba'
            export const interno = React.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED.ReactCurrentDispatcher`
        }
        if (id === 'virtual-repo-falso') {
          return `export const oyentes = new Set()
            export const alCambiarDatos = (fn) => { oyentes.add(fn); return () => oyentes.delete(fn) }`
        }
      },
    }],
    define: { 'process.env.NODE_ENV': JSON.stringify('production') },
    build: { write: false, minify: false, lib: { entry: entrada, formats: ['es'] } },
  })
  const codigo = salida[0].output.find((x) => x.type === 'chunk').code
  return import('data:text/javascript;base64,' + Buffer.from(codigo).toString('base64'))
}

/** Ejecuta un hook fuera de React: guarda el estado entre «renders» y corre los efectos al final de cada uno. */
function montar(modulo, usar) {
  const { interno } = modulo
  const casillas = []
  let i = 0
  const cambiaron = (a, b) => !a || !b || a.length !== b.length || a.some((x, k) => !Object.is(x, b[k]))
  const despachador = {
    useState(inicial) {
      const k = i++
      if (!(k in casillas)) casillas[k] = { v: typeof inicial === 'function' ? inicial() : inicial }
      const c = casillas[k]
      return [c.v, (nuevo) => { c.v = typeof nuevo === 'function' ? nuevo(c.v) : nuevo }]
    },
    useRef(inicial) {
      const k = i++
      if (!(k in casillas)) casillas[k] = { current: inicial }
      return casillas[k]
    },
    useCallback(fn, deps) {
      const k = i++
      if (!casillas[k] || cambiaron(casillas[k].deps, deps)) casillas[k] = { fn, deps }
      return casillas[k].fn
    },
    useEffect(fn, deps) {
      const k = i++
      if (!casillas[k] || cambiaron(casillas[k].deps, deps)) {
        casillas[k]?.limpiar?.()
        casillas[k] = { deps, pendiente: fn }
      }
    },
  }
  const dibujar = () => {
    const previo = interno.current
    interno.current = despachador
    i = 0
    let salida
    try { salida = usar() } finally { interno.current = previo }
    for (const c of casillas) {
      if (c?.pendiente) { const fn = c.pendiente; c.pendiente = null; c.limpiar = fn() }
    }
    return salida
  }
  const desmontar = () => { for (const c of casillas) c?.limpiar?.() }
  return { dibujar, desmontar }
}

const esperar = () => new Promise((r) => setTimeout(r, 5))
const refrescar = async (modulo) => {
  for (const fn of [...modulo.oyentes]) fn()
  await esperar()
}

test('un refresco silencioso fallido conserva los datos y guarda el error aparte', async (t) => {
  const modulo = await cargarHook()
  let respuesta = () => Promise.resolve({ n: 1 })
  const m = montar(modulo, () => modulo.useDatos(() => respuesta(), []))
  t.after(m.desmontar)

  m.dibujar()
  await esperar()
  let h = m.dibujar()
  assert.equal(h.estado, 'ok')
  assert.deepEqual(h.datos, { n: 1 })
  assert.equal(h.errorRefresco, null)

  // El servidor se cae justo en el refresco: la pantalla sigue con lo último bueno.
  respuesta = () => Promise.reject(new Error('caído'))
  await refrescar(modulo)
  h = m.dibujar()
  assert.equal(h.estado, 'ok')
  assert.deepEqual(h.datos, { n: 1 })
  assert.equal(h.error, null)
  assert.equal(h.errorRefresco.message, 'caído')

  // Y cuando vuelve, el aviso desaparece y llegan los datos nuevos.
  respuesta = () => Promise.resolve({ n: 2 })
  await refrescar(modulo)
  h = m.dibujar()
  assert.equal(h.estado, 'ok')
  assert.deepEqual(h.datos, { n: 2 })
  assert.equal(h.errorRefresco, null)
})

test('la primera carga fallida sí es un error, también si llegó en silencio', async (t) => {
  const modulo = await cargarHook()
  const m = montar(modulo, () => modulo.useDatos(() => Promise.reject(new Error('sin servidor')), []))
  t.after(m.desmontar)
  m.dibujar()
  await esperar()
  let h = m.dibujar()
  assert.equal(h.estado, 'error')
  assert.equal(h.error.message, 'sin servidor')
  assert.equal(h.datos, null)

  // Un refresco silencioso sin datos buenos que mostrar tampoco se esconde.
  await refrescar(modulo)
  h = m.dibujar()
  assert.equal(h.estado, 'error')
})
