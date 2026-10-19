import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { build } from 'vite'

// ============================================================
// T-26: tres arreglos pequeños del panel
// ------------------------------------------------------------
// 1. Transferencias ya no culpa a una publicación pendiente ante un 403.
// 2. La lista de inspecciones no inventa ceros: el servidor no manda conteos.
// 3. Un GPS que nunca reportó se puede instalar desde la web.
// ============================================================

const raiz = new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/u, '$1')

/** El repositorio en modo CONECTADO, compilado con Vite como en acciones-del-panel. */
async function repositorioConectado() {
  const salida = await build({
    root: raiz,
    logLevel: 'error',
    define: { 'import.meta.env.VITE_FOM_API': JSON.stringify('/fom-api') },
    build: {
      write: false,
      lib: { entry: join(raiz, 'src/panel/datos/repo.js'), formats: ['es'], fileName: 'repo' },
    },
  })
  const codigo = salida[0].output[0].code
  const modulo = await import('data:text/javascript;base64,' + Buffer.from(codigo).toString('base64'))
  return modulo.repo
}

test('transferencias: el 403 se explica sin hablar de una publicación pendiente', () => {
  const fuente = readFileSync(join(raiz, 'src/panel/modulos/Transferencias.jsx'), 'utf8')
  assert.doesNotMatch(fuente, /lo publique|falta que Juan|no se ha publicado/u)
  assert.match(fuente, /negó el permiso para esta operación/u)
})

test('inspecciones: sin conteos del servidor quedan en null, nunca en 0', async () => {
  const repo = await repositorioConectado()
  const original = globalThis.fetch
  try {
    globalThis.fetch = async (url) => {
      assert.ok(String(url).includes('/api/v1/console/inspections'))
      return new Response(JSON.stringify({
        items: [{
          id: 'insp-1', result: 'bloqueada', inspectionDate: '2026-10-16', vehicleId: 'v1',
          vehicleCode: 'VM-01', vehiclePlate: 'AB123CD', driverName: 'Ana', templateName: 'Diaria', kind: 'daily',
        }],
      }), { status: 200 })
    }
    const [i] = await repo.inspecciones.listar({})
    assert.equal(i.resultado, 'bloqueada')
    assert.equal(i.fallasCriticas, null)
    assert.equal(i.observaciones, null)
    assert.equal(i.tipoVehiculo, null)
  } finally { globalThis.fetch = original }
})

test('gps: la instalación se manda aunque el equipo nunca haya reportado', async () => {
  const repo = await repositorioConectado()
  const original = globalThis.fetch
  const llamadas = []
  try {
    globalThis.fetch = async (url, opts) => {
      llamadas.push({ url: String(url), metodo: opts?.method, body: opts?.body ? JSON.parse(opts.body) : null })
      return new Response(JSON.stringify({ installation: { id: 'inst-1' } }), { status: 200 })
    }
    assert.equal(await repo.admin.gps.asociar('equipo-nuevo', 'v1'), true)
    assert.equal(llamadas.length, 1)
    assert.ok(llamadas[0].url.endsWith('/api/v1/console/gps-devices/equipo-nuevo/installation'))
    assert.equal(llamadas[0].metodo, 'POST')
    assert.equal(llamadas[0].body.vehicleId, 'v1')
  } finally { globalThis.fetch = original }

  // La pantalla ya no esconde el selector tras «verificado» y avisa de comprobar la señal.
  const fuente = readFileSync(join(raiz, 'src/panel/modulos/AdminGps.jsx'), 'utf8')
  assert.doesNotMatch(fuente, /activo && g\.verificado && !instalado/u)
  assert.match(fuente, /Este equipo aún no ha reportado; tras instalarlo comprueba que empiece a enviar señal\./u)
})
