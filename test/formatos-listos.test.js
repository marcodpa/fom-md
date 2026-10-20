import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { build } from 'vite'

// ============================================================
// Formatos listos: publicar el IOGP de Conducción sin duplicarlo
// ------------------------------------------------------------
// El formato se manda tal cual (códigos, ayuda con saltos de línea, tipos de
// vehículo) y después se publica. Si esa versión ya existe en la empresa no
// se crea otra: si está en borrador se publica y si ya está publicada se dice.
// Se prueba contra el servidor simulado y contra la semilla del modo demo.
// ============================================================

const raiz = new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/u, '$1')
const IOGP = JSON.parse(readFileSync(join(raiz, 'src/panel/datos/formatos/iogp-conduccion.json'), 'utf8'))

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

/** Servidor simulado: `lista` es lo que ya hay en la empresa. */
function servidor(lista, { conflictoAlCrear = false } = {}) {
  const llamadas = []
  const fetch = async (url, opts = {}) => {
    const metodo = opts.method || 'GET'
    const body = opts.body ? JSON.parse(opts.body) : null
    llamadas.push({ url, metodo, body })
    if (metodo === 'GET') return new Response(JSON.stringify({ items: lista }), { status: 200 })
    if (metodo === 'POST') {
      if (conflictoAlCrear) {
        lista.push({ id: 'pla-otro', code: IOGP.code, version: IOGP.version, status: 'borrador' })
        return new Response(JSON.stringify({ message: 'That template version or item already exists' }), { status: 409 })
      }
      return new Response(JSON.stringify({ template: { id: 'pla-nueva', status: 'borrador' }, items: [] }), { status: 201 })
    }
    return new Response(JSON.stringify({ template: { id: 'x', status: body.status }, items: [] }), { status: 200 })
  }
  return { fetch, llamadas }
}

test('el formato IOGP cabe en los límites del servidor', () => {
  assert.match(IOGP.code, /^[a-z0-9][a-z0-9._-]{0,49}$/u)
  assert.ok(IOGP.name.length >= 2 && IOGP.name.length <= 120)
  assert.ok(IOGP.description.length <= 500)
  assert.equal(IOGP.items.length, 8)
  assert.equal(new Set(IOGP.items.map((i) => i.code)).size, 8)
  assert.equal(new Set(IOGP.items.map((i) => i.displayOrder)).size, 8)
  for (const i of IOGP.items) {
    assert.match(i.code, /^[a-z0-9][a-z0-9._-]{0,49}$/u)
    assert.ok(i.name.length >= 2 && i.name.length <= 160, i.code)
    assert.ok(i.helpText.length <= 1000, i.code)
    assert.equal(i.isCritical, true)
    assert.deepEqual(i.vehicleTypes, [])
  }
})

test('conectado: crea con el JSON tal cual y luego lo publica', async () => {
  const { repo } = await cargar('src/panel/datos/repo.js', '/fom-api')
  const original = globalThis.fetch
  const s = servidor([])
  try {
    globalThis.fetch = s.fetch
    const r = await repo.programaInspecciones.publicarFormato(IOGP)
    assert.equal(r.resultado, 'creada')
    const post = s.llamadas.find((l) => l.metodo === 'POST')
    assert.ok(post.url.endsWith('/api/v1/console/inspection-templates'))
    assert.deepEqual(post.body, {
      code: IOGP.code, name: IOGP.name, version: IOGP.version, description: IOGP.description,
      items: IOGP.items.map(({ code, category, name, isCritical, helpText, vehicleTypes, displayOrder }) =>
        ({ code, category, name, isCritical, helpText, displayOrder, vehicleTypes })),
    })
    // Los saltos de línea de la hoja viajan intactos.
    assert.ok(post.body.items[0].helpText.includes('\n- el destino\n'))
    const patch = s.llamadas.find((l) => l.metodo === 'PATCH')
    assert.ok(patch.url.endsWith('/inspection-templates/pla-nueva/status'))
    assert.deepEqual(patch.body, { expectedStatus: 'borrador', status: 'publicada' })
  } finally { globalThis.fetch = original }
})

test('conectado: no duplica; publica el borrador o avisa que ya está publicada', async () => {
  const { repo } = await cargar('src/panel/datos/repo.js', '/fom-api')
  const original = globalThis.fetch
  try {
    let s = servidor([{ id: 'pla-b', code: IOGP.code, version: 1, status: 'borrador' }])
    globalThis.fetch = s.fetch
    assert.equal((await repo.programaInspecciones.publicarFormato(IOGP)).resultado, 'borrador_publicada')
    assert.equal(s.llamadas.filter((l) => l.metodo === 'POST').length, 0)
    assert.ok(s.llamadas.some((l) => l.metodo === 'PATCH' && l.url.includes('/pla-b/status')))

    s = servidor([{ id: 'pla-p', code: IOGP.code, version: 1, status: 'publicada' }])
    globalThis.fetch = s.fetch
    assert.equal((await repo.programaInspecciones.publicarFormato(IOGP)).resultado, 'ya_publicada')
    assert.deepEqual(s.llamadas.map((l) => l.metodo), ['GET'])

    // Otra versión del mismo código no cuenta como la misma.
    s = servidor([{ id: 'pla-v2', code: IOGP.code, version: 2, status: 'publicada' }])
    globalThis.fetch = s.fetch
    assert.equal((await repo.programaInspecciones.publicarFormato(IOGP)).resultado, 'creada')

    // Si alguien la creó a la vez (409), se publica la que ya existe.
    s = servidor([], { conflictoAlCrear: true })
    globalThis.fetch = s.fetch
    assert.equal((await repo.programaInspecciones.publicarFormato(IOGP)).resultado, 'borrador_publicada')
    assert.ok(s.llamadas.some((l) => l.metodo === 'PATCH' && l.url.includes('/pla-otro/status')))
  } finally { globalThis.fetch = original }
})

test('conectado: crearPlantilla sin extras se comporta como antes', async () => {
  const { repo } = await cargar('src/panel/datos/repo.js', '/fom-api')
  const original = globalThis.fetch
  const s = servidor([])
  try {
    globalThis.fetch = s.fetch
    await repo.programaInspecciones.crearPlantilla({ codigo: 'Diaria Básica', nombre: ' Diaria ', version: '1', puntos: [{ nombre: 'Luces ', critico: true }, { nombre: 'Gato' }] })
    assert.deepEqual(s.llamadas[0].body, {
      code: 'diaria-basica', name: 'Diaria', version: 1,
      items: [
        { code: 'punto-1', category: 'General', name: 'Luces', isCritical: true, displayOrder: 1, vehicleTypes: [] },
        { code: 'punto-2', category: 'General', name: 'Gato', isCritical: false, displayOrder: 2, vehicleTypes: [] },
      ],
    })
  } finally { globalThis.fetch = original }
})

test('demo: la semilla publica el formato una sola vez', async () => {
  const semilla = (await cargar('src/panel/datos/repoSemilla.js', '')).default
  const p = semilla.programaInspecciones
  assert.equal((await p.publicarFormato(IOGP)).resultado, 'creada')
  let lista = await p.plantillas({})
  assert.equal(lista.length, 1)
  assert.equal(lista[0].estado, 'publicada')
  assert.equal(lista[0].puntos, 8)
  assert.equal((await p.publicarFormato(IOGP)).resultado, 'ya_publicada')
  assert.equal((await p.plantillas({})).length, 1)

  // Archivada no se republica; un borrador hecho a mano con ese código y versión sí.
  await p.cambiarPlantilla(lista[0], 'archivada')
  assert.equal((await p.publicarFormato(IOGP)).resultado, 'archivada')
  const v2 = { ...IOGP, version: 2 }
  const { id } = await p.crearPlantilla({ codigo: v2.code, nombre: v2.name, version: 2, puntos: [{ nombre: 'Punto' }] })
  assert.equal((await p.publicarFormato(v2)).resultado, 'borrador_publicada')
  lista = await p.plantillas({ estado: 'publicada' })
  assert.deepEqual(lista.map((t) => t.id), [id])
  await assert.rejects(p.crearPlantilla({ codigo: v2.code, nombre: v2.name, version: 2, puntos: [{ nombre: 'Punto' }] }), /Ya existe/u)
})
