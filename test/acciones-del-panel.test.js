import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { build } from 'vite'

// ============================================================
// Ningún botón puede llamar a algo que no existe
// ------------------------------------------------------------
// El panel llama al repositorio como `repo.coleccion.accion(...)`. En modo
// conectado ese repositorio se arma mezclando lo real con avisos, y una acción
// que se quede fuera de la mezcla no da error de compilación: queda como
// `undefined` y revienta al pulsar el botón con «no es una función».
//
// Ese mensaje no le dice nada a quien lo lee —ni si el problema es suyo, ni si
// es de permisos, ni si la función existe en algún lado—. Esta prueba carga el
// repositorio DE VERDAD, en modo conectado, y comprueba que cada acción que la
// interfaz invoca resuelve a una función. Lo que no tenga respaldo debe fallar
// con su motivo, que es muy distinto de no existir.
// ============================================================

const raiz = new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/u, '$1')

/** Todas las llamadas `repo.x.y(` que hace la interfaz del panel. */
function accionesInvocadas() {
  const encontradas = new Set()
  const recorrer = (dir) => {
    for (const entrada of readdirSync(dir, { withFileTypes: true })) {
      const ruta = join(dir, entrada.name)
      if (entrada.isDirectory()) recorrer(ruta)
      else if (/\.jsx?$/u.test(entrada.name)) {
        const fuente = readFileSync(ruta, 'utf8')
        for (const m of fuente.matchAll(/\brepo\.((?:[a-zA-Z]+\.)*[a-zA-Z]+)\(/gu)) {
          encontradas.add(m[1])
        }
      }
    }
  }
  recorrer(join(raiz, 'src/panel'))
  return [...encontradas].sort()
}

/**
 * El repositorio en modo CONECTADO. Se compila con Vite porque el módulo lee
 * `import.meta.env`, y se evalúa en memoria: sin esto la prueba comprobaría el
 * modo semilla, que es justo el que nunca falla.
 */
async function repositorioConectado() {
  const salida = await build({
    root: raiz,
    logLevel: 'error',
    define: { 'import.meta.env.VITE_FOM_API': JSON.stringify('/fom-api') },
    build: {
      write: false,
      lib: {
        entry: join(raiz, 'src/panel/datos/repo.js'),
        formats: ['es'],
        fileName: 'repo',
      },
    },
  })
  const codigo = salida[0].output[0].code
  const modulo = await import(
    'data:text/javascript;base64,' + Buffer.from(codigo).toString('base64')
  )
  return modulo.repo
}

test('toda acción que invoca el panel existe en el repositorio conectado', async () => {
  const repo = await repositorioConectado()
  const acciones = accionesInvocadas()
  assert.ok(acciones.length > 20, 'no se detectaron las llamadas del panel')

  const rotas = []
  for (const ruta of acciones) {
    let nodo = repo
    for (const parte of ruta.split('.')) {
      nodo = nodo?.[parte]
      if (nodo === undefined) break
    }
    if (typeof nodo !== 'function') {
      rotas.push(`${ruta} → ${nodo === undefined ? 'NO EXISTE' : typeof nodo}`)
    }
  }
  assert.deepEqual(rotas, [], `acciones sin respaldo:\n  ${rotas.join('\n  ')}`)
})

test('lo que no tiene servidor falla diciendo qué falta, no en genérico', async () => {
  const repo = await repositorioConectado()

  // Estas son las que hoy NO tienen superficie en el servidor. Cada una debe
  // rechazar con un motivo propio: si alguna empieza a funcionar, hay que
  // quitarla de aquí, y si otra deja de funcionar, hay que añadirla.
  const sinServidor = [
    ['alertas.marcarLeida', () => repo.alertas.marcarLeida('x')],
    ['alertas.marcarTodasLeidas', () => repo.alertas.marcarTodasLeidas()],
    ['documentos.actualizarVencimiento', () => repo.documentos.actualizarVencimiento('x', {})],
    ['admin.gps.registrar', () => repo.admin.gps.registrar({})],
    ['admin.pagos.registrar', () => repo.admin.pagos.registrar({})],
  ]

  for (const [nombre, llamar] of sinServidor) {
    await assert.rejects(
      llamar(),
      (error) => {
        assert.ok(
          error.message.length > 40,
          `${nombre} falla con un mensaje demasiado corto para explicar nada`,
        )
        assert.ok(
          !/int[eé]ntalo otra vez/iu.test(error.message),
          `${nombre} invita a repetir algo que no puede funcionar`,
        )
        return true
      },
      nombre,
    )
  }
})
