import assert from 'node:assert/strict'
import test from 'node:test'
import { join } from 'node:path'
import { build } from 'vite'

// ============================================================
// Alertas en modo demostración
// ------------------------------------------------------------
// «Descartar» y «Descartar leídos» reventaban en modo demo con «no es una
// función»: la semilla no tenía esas dos acciones. Esta prueba arma el
// repositorio SIN API (lo que ve `vite --mode demo`) y las ejecuta de verdad.
// ============================================================

const raiz = new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/u, '$1')

/** localStorage mínimo en memoria: la semilla guarda ahí los cambios. */
function localStorageEnMemoria() {
  const datos = new Map()
  return {
    getItem: (k) => (datos.has(k) ? datos.get(k) : null),
    setItem: (k, v) => datos.set(k, String(v)),
    removeItem: (k) => datos.delete(k),
  }
}

async function repositorioDemo() {
  globalThis.localStorage = localStorageEnMemoria()
  const salida = await build({
    root: raiz,
    logLevel: 'error',
    // Vacío a propósito: así `HAY_API` es false aunque `.env` traiga la URL.
    define: { 'import.meta.env.VITE_FOM_API': JSON.stringify('') },
    build: {
      write: false,
      lib: { entry: join(raiz, 'src/panel/datos/repo.js'), formats: ['es'], fileName: 'repo' },
    },
  })
  const codigo = salida[0].output[0].code
  const modulo = await import('data:text/javascript;base64,' + Buffer.from(codigo).toString('base64'))
  return modulo.repo
}

test('modo demo: descartar y descartar leídos sacan los avisos de la bandeja', async () => {
  const repo = await repositorioDemo()
  assert.equal(typeof repo.alertas.descartar, 'function')
  assert.equal(typeof repo.alertas.descartarLeidos, 'function')

  const inicio = await repo.alertas.listar({})
  assert.ok(inicio.length >= 2, 'la semilla trae al menos dos avisos')

  // Descartar uno: misma respuesta que repoApi (true) y deja de aparecer.
  const [primero] = inicio
  assert.equal(await repo.alertas.descartar(primero.id), true)
  const tras = await repo.alertas.listar({})
  assert.equal(tras.length, inicio.length - 1)
  assert.ok(!tras.some((n) => n.id === primero.id))

  // Descartar leídos: devuelve { descartados } y solo quedan los sin leer.
  await repo.alertas.marcarLeida(tras[0].id)
  const leidas = (await repo.alertas.listar({})).filter((n) => n.leida).length
  assert.deepEqual(await repo.alertas.descartarLeidos(), { descartados: leidas })
  const final = await repo.alertas.listar({})
  assert.ok(final.every((n) => !n.leida))
  assert.ok(!final.some((n) => n.id === tras[0].id))
})
