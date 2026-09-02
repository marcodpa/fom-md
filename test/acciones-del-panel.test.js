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

test('lo que no tiene servidor avisa sin salir a la red', async () => {
  const repo = await repositorioConectado()

  // Estas NO tienen superficie en el servidor. Cada una debe rechazar con su
  // motivo propio y, sobre todo, SIN intentar la petición: si saliera a la
  // red, el usuario vería un fallo de conexión en vez de la explicación, que
  // es un diagnóstico falso.
  //
  // Si alguna empieza a existir, hay que sacarla de aquí; si otra deja de
  // existir, hay que meterla. Esa es la parte útil de la lista.
  const sinServidor = [
    ['documentos.subir', () => repo.documentos.subir('d', {})],
    ['admin.gps.verificar', () => repo.admin.gps.verificar('g')],
    ['admin.gps.probarPanico', () => repo.admin.gps.probarPanico('g')],
    ['admin.usuarios.eliminarDefinitivo', () => repo.admin.usuarios.eliminarDefinitivo('u')],
    ['admin.usuarios.mover', () => repo.admin.usuarios.mover('u', 'e')],
    ['admin.pagos.registrar', () => repo.admin.pagos.registrar({})],
    ['costos.registrar', () => repo.costos.registrar({})],
  ]

  const original = globalThis.fetch
  try {
    for (const [nombre, llamar] of sinServidor) {
      let saliUALaRed = false
      globalThis.fetch = async () => {
        saliUALaRed = true
        throw new Error('no debería haberse llamado')
      }
      await assert.rejects(llamar(), (error) => {
        assert.equal(
          saliUALaRed,
          false,
          `${nombre} salió a la red en vez de explicar que no existe`,
        )
        assert.ok(
          error.message.length > 40,
          `${nombre} falla con un mensaje demasiado corto para explicar nada`,
        )
        assert.ok(
          !/int[eé]ntalo otra vez/iu.test(error.message),
          `${nombre} invita a repetir algo que no puede funcionar`,
        )
        return true
      }, nombre)
    }
  } finally {
    globalThis.fetch = original
  }
})

test('lo que sí tiene servidor sale a la red, no se queda en un aviso', async () => {
  const repo = await repositorioConectado()

  // La otra mitad de la anterior, y la que de verdad se rompió: una acción
  // real que quede envuelta en un aviso pasa desapercibida, porque el panel
  // sigue “funcionando” — solo que sin hacer nada.
  const conServidor = [
    ['vehiculos.crear', () => repo.vehiculos.crear({ alias: 'a', placa: 'b' })],
    ['vehiculos.asignarConductor', () => repo.vehiculos.asignarConductor('v', 'u')],
    ['odts.crear', () => repo.odts.crear({ vehiculoId: 'v', descripcion: 'una falla descrita' })],
    ['odts.mover', () => repo.odts.mover('o', { estadoEsperado: 'abierta', estado: 'cerrada', nota: 'x' })],
    ['admin.usuarios.cambiar', () => repo.admin.usuarios.cambiar('u', { rol: 'supervisor' })],
    ['admin.empresas.crear', () => repo.admin.empresas.crear({ nombre: 'n', tipo: 'estandar' })],
    ['alertas.marcarLeida', () => repo.alertas.marcarLeida('n')],
    ['alertas.marcarTodasLeidas', () => repo.alertas.marcarTodasLeidas()],
    ['documentos.actualizarVencimiento', () => repo.documentos.actualizarVencimiento('d', '2028-01-31')],
    ['reglas.crear', () => repo.reglas.crear({ tipo: 'velocidad', umbralKmh: 90 })],
    ['admin.gps.registrar', () => repo.admin.gps.registrar({ imei: '860000000000001', modelo: 'GT06N' })],
    ['admin.gps.asociar', () => repo.admin.gps.asociar('g', 'v')],
  ]

  const original = globalThis.fetch
  try {
    for (const [nombre, llamar] of conServidor) {
      let salio = false
      globalThis.fetch = async () => {
        salio = true
        throw new Error('corte deliberado')
      }
      await llamar().catch(() => {})
      assert.ok(salio, `${nombre} no llegó a llamar al servidor`)
    }
  } finally {
    globalThis.fetch = original
  }
})
