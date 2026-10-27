import assert from 'node:assert/strict'
import test from 'node:test'
import { join } from 'node:path'
import { build } from 'vite'

// ============================================================
// Planillas por días de la semana (T-200, parte consola)
// ------------------------------------------------------------
// Formato de los días, lectura de `weekdays`, crear con días y cambiarlos,
// contra un servidor nuevo, uno viejo (sin el campo) y el modo demo.
// ============================================================

const raiz = new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/u, '$1')

function localStorageEnMemoria() {
  const datos = new Map()
  return {
    getItem: (k) => (datos.has(k) ? datos.get(k) : null),
    setItem: (k, v) => datos.set(k, String(v)),
    removeItem: (k) => datos.delete(k),
  }
}

async function cargar(entrada, api) {
  globalThis.localStorage = localStorageEnMemoria()
  const salida = await build({
    root: raiz,
    logLevel: 'error',
    define: { 'import.meta.env.VITE_FOM_API': JSON.stringify(api) },
    build: { write: false, lib: { entry: join(raiz, entrada), formats: ['es'], fileName: 'm' } },
  })
  const codigo = salida[0].output[0].code
  return import('data:text/javascript;base64,' + Buffer.from(codigo).toString('base64'))
}

const json = (cuerpo, status = 200) => new Response(JSON.stringify(cuerpo), { status })

/**
 * Servidor simulado. `nuevo`: guarda y devuelve `weekdays`. El viejo no trae el campo,
 * rechaza `weekdays` al crear (400) y no tiene la ruta PATCH …/weekdays (404).
 */
function servidor({ nuevo, lista }) {
  const llamadas = []
  const fetch = async (url, opts = {}) => {
    const metodo = opts.method || 'GET'
    const body = opts.body ? JSON.parse(opts.body) : null
    llamadas.push({ url, metodo, body })
    if (metodo === 'GET') return json({ items: lista })
    if (url.endsWith('/weekdays')) {
      if (!nuevo) return json({ message: 'Cannot PATCH /api/v1/console/inspection-templates/x/weekdays' }, 404)
      if (url.includes('/pla-vieja/')) return json({ message: 'An archived template cannot change its weekdays' }, 409)
      return json({ template: { id: 'pla-1', status: 'publicada', weekdays: body.weekdays }, items: [] })
    }
    if (metodo === 'POST') {
      if (!nuevo && body.weekdays) return json({ message: ['property weekdays should not exist'] }, 400)
      return json({ template: { id: 'pla-nueva', status: 'borrador', weekdays: body.weekdays ?? [] }, items: [] }, 201)
    }
    return json({ template: { id: 'x' }, items: [] })
  }
  return { fetch, llamadas }
}

const puntos = [{ nombre: 'Luces', critico: true }]

test('textoDias: «Lun, Mié, Vie» o «Todos los días»', async () => {
  const d = await cargar('src/panel/datos/diasPlanilla.js', '')
  assert.equal(d.textoDias([]), 'Todos los días')
  assert.equal(d.textoDias(undefined), 'Todos los días')
  assert.equal(d.textoDias(['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo']), 'Todos los días')
  assert.equal(d.textoDias(['viernes', 'lunes', 'miercoles']), 'Lun, Mié, Vie')
  assert.equal(d.textoDias(['sabado', 'domingo']), 'Sáb, Dom')
  assert.equal(d.textoDias(['martes']), 'Mar')
})

test('normalizarDias, alternarDia y diasParaEnviar', async () => {
  const d = await cargar('src/panel/datos/diasPlanilla.js', '')
  assert.deepEqual(d.normalizarDias(['viernes', 'lunes', 'viernes', 'otro', 3]), ['lunes', 'viernes'])
  assert.deepEqual(d.normalizarDias('lunes'), [])
  assert.deepEqual(d.alternarDia([], 'jueves'), ['jueves'])
  assert.deepEqual(d.alternarDia(['jueves'], 'lunes'), ['lunes', 'jueves'])
  assert.deepEqual(d.alternarDia(['lunes', 'jueves'], 'lunes'), ['jueves'])
  assert.deepEqual(d.diasParaEnviar(['viernes', 'lunes']), ['lunes', 'viernes'])
  assert.deepEqual(d.diasParaEnviar(d.DIAS_SEMANA.map((x) => x.valor)), [])
  assert.equal(d.DIAS_SEMANA.map((x) => x.letra).join(''), 'LMMJVSD')
})

test('cuerpoPlantilla: manda weekdays solo si hay días y no son todos', async () => {
  const { cuerpoPlantilla, argumentosDeFormato } = await cargar('src/panel/datos/repoApi.js', '/fom-api')
  assert.equal('weekdays' in cuerpoPlantilla({ codigo: 'a', nombre: 'Diaria', puntos }), false)
  assert.equal('weekdays' in cuerpoPlantilla({ codigo: 'a', nombre: 'Diaria', puntos, dias: [] }), false)
  assert.deepEqual(cuerpoPlantilla({ codigo: 'a', nombre: 'Diaria', puntos, dias: ['viernes', 'lunes'] }).weekdays, ['lunes', 'viernes'])
  // Un formato listo con días opcionales los lleva; sin ellos, nada cambia.
  const f = { code: 'x', name: 'Xx', version: 1, items: [{ code: 'p', category: 'c', name: 'Pp', displayOrder: 1 }] }
  assert.equal('weekdays' in cuerpoPlantilla(argumentosDeFormato(f)), false)
  assert.deepEqual(cuerpoPlantilla(argumentosDeFormato({ ...f, weekdays: ['sabado'] })).weekdays, ['sabado'])
})

test('plantillaDelServidor: lee weekdays con respaldo', async () => {
  const { plantillaDelServidor } = await cargar('src/panel/datos/repoApi.js', '/fom-api')
  const nueva = plantillaDelServidor({ id: 'a', code: 'c', version: 1, name: 'N', status: 'publicada', itemCount: 3, weekdays: ['viernes', 'lunes'] })
  assert.deepEqual(nueva.dias, ['lunes', 'viernes'])
  assert.equal(nueva.soportaDias, true)
  const todos = plantillaDelServidor({ id: 'a', status: 'borrador', weekdays: [] })
  assert.deepEqual(todos.dias, [])
  assert.equal(todos.soportaDias, true)
  const vieja = plantillaDelServidor({ id: 'a', status: 'borrador' })
  assert.deepEqual(vieja.dias, [])
  assert.equal(vieja.soportaDias, false)
})

test('servidor nuevo: lista con días, crea con días y los cambia', async () => {
  const { repo } = await cargar('src/panel/datos/repo.js', '/fom-api')
  const original = globalThis.fetch
  const s = servidor({ nuevo: true, lista: [{ id: 'pla-1', code: 'a', version: 1, name: 'A', status: 'publicada', weekdays: ['miercoles', 'lunes'] }] })
  try {
    globalThis.fetch = s.fetch
    const lista = await repo.programaInspecciones.plantillas({})
    assert.deepEqual(lista[0].dias, ['lunes', 'miercoles'])
    assert.equal(lista[0].soportaDias, true)

    await repo.programaInspecciones.crearPlantilla({ codigo: 'diaria', nombre: 'Diaria', puntos, dias: ['domingo', 'sabado'] })
    assert.deepEqual(s.llamadas.find((l) => l.metodo === 'POST').body.weekdays, ['sabado', 'domingo'])

    const r = await repo.programaInspecciones.cambiarDias(lista[0], ['viernes', 'lunes'])
    assert.deepEqual(r.dias, ['lunes', 'viernes'])
    const patch = s.llamadas.find((l) => l.metodo === 'PATCH')
    assert.ok(patch.url.endsWith('/api/v1/console/inspection-templates/pla-1/weekdays'))
    assert.deepEqual(patch.body, { weekdays: ['lunes', 'viernes'] })

    // Ninguno marcado = todos los días: se manda la lista vacía.
    await repo.programaInspecciones.cambiarDias(lista[0], [])
    assert.deepEqual(s.llamadas.filter((l) => l.metodo === 'PATCH').at(-1).body, { weekdays: [] })

    // Archivada (409): mensaje en llano.
    await assert.rejects(repo.programaInspecciones.cambiarDias({ id: 'pla-vieja', soportaDias: true }, ['lunes']), /archivada/u)
  } finally { globalThis.fetch = original }
})

test('servidor viejo: sin días, crea sin weekdays y avisa en llano', async () => {
  const { repo } = await cargar('src/panel/datos/repo.js', '/fom-api')
  const original = globalThis.fetch
  const s = servidor({ nuevo: false, lista: [{ id: 'pla-1', code: 'a', version: 1, name: 'A', status: 'publicada' }] })
  try {
    globalThis.fetch = s.fetch
    const lista = await repo.programaInspecciones.plantillas({})
    assert.deepEqual(lista[0].dias, [])
    assert.equal(lista[0].soportaDias, false)

    // Crear sin días funciona como siempre y no manda el campo.
    await repo.programaInspecciones.crearPlantilla({ codigo: 'diaria', nombre: 'Diaria', puntos })
    assert.equal('weekdays' in s.llamadas.find((l) => l.metodo === 'POST').body, false)

    // Con días marcados, ya sabiendo que es el viejo, ni sale la petición.
    const antes = s.llamadas.length
    await assert.rejects(repo.programaInspecciones.crearPlantilla({ codigo: 'otra', nombre: 'Otra', puntos, dias: ['lunes'] }), /todavía no guarda los días/u)
    assert.equal(s.llamadas.length, antes)

    // Un formato listo con días se crea igual, sin los días.
    await repo.programaInspecciones.publicarFormato({ code: 'f', name: 'Ff', version: 1, weekdays: ['lunes'], items: [{ code: 'p', category: 'c', name: 'Pp', displayOrder: 1 }] })
    assert.equal('weekdays' in s.llamadas.filter((l) => l.metodo === 'POST').at(-1).body, false)

    // Cambiar días: 404 de la ruta → «Disponible cuando se actualice el servidor».
    await assert.rejects(repo.programaInspecciones.cambiarDias(lista[0], ['lunes']), /Disponible cuando se actualice el servidor/u)
  } finally { globalThis.fetch = original }
})

test('servidor viejo sin lista previa: el 400 de weekdays se entiende y se avisa', async () => {
  const { repo } = await cargar('src/panel/datos/repo.js', '/fom-api')
  const original = globalThis.fetch
  const s = servidor({ nuevo: false, lista: [] })
  try {
    globalThis.fetch = s.fetch
    await assert.rejects(repo.programaInspecciones.crearPlantilla({ codigo: 'diaria', nombre: 'Diaria', puntos, dias: ['lunes'] }), /todavía no guarda los días/u)
  } finally { globalThis.fetch = original }
})

test('demo: las plantillas tienen días y se pueden cambiar', async () => {
  const semilla = (await cargar('src/panel/datos/repoSemilla.js', '')).default
  const p = semilla.programaInspecciones
  await p.crearPlantilla({ codigo: 'inicio', nombre: 'Inicio de turno', puntos, dias: ['viernes', 'lunes'] })
  await p.crearPlantilla({ codigo: 'diaria', nombre: 'Diaria', puntos })
  const lista = await p.plantillas({})
  const inicio = lista.find((t) => t.codigo === 'inicio')
  const diaria = lista.find((t) => t.codigo === 'diaria')
  assert.deepEqual(inicio.dias, ['lunes', 'viernes'])
  assert.deepEqual(diaria.dias, [])
  assert.equal(inicio.soportaDias, true)

  await p.cambiarDias(diaria, ['domingo', 'sabado'])
  assert.deepEqual((await p.plantillas({})).find((t) => t.codigo === 'diaria').dias, ['sabado', 'domingo'])
  await p.cambiarDias(diaria, [])
  assert.deepEqual((await p.plantillas({})).find((t) => t.codigo === 'diaria').dias, [])

  // Publicada también puede; archivada no.
  await p.cambiarPlantilla(diaria, 'publicada')
  await p.cambiarDias({ ...diaria, estado: 'publicada' }, ['martes'])
  await p.cambiarPlantilla({ ...diaria, estado: 'publicada' }, 'archivada')
  await assert.rejects(p.cambiarDias(diaria, ['lunes']), /archivada/u)
})
