import assert from 'node:assert/strict'
import test from 'node:test'
import { join } from 'node:path'
import { readFileSync } from 'node:fs'
import { build } from 'vite'

// ============================================================
// T-167a: la inspección diaria del conductor desde la web, igual que la app
//  · las reglas de la pantalla (qué falta para enviar, fin de semana);
//  · la demostración: formato, envío, bloqueo, ODT, una por día y avisos;
//  · conectado: las MISMAS rutas de `/api/v1/mobile` que la app;
//  · la navegación: «Inspección» en la barra del teléfono y en el menú.
// ============================================================

const raiz = new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/u, '$1')
const ruta = (r) => join(raiz, r).replace(/\\/g, '/')
const leer = (r) => readFileSync(join(raiz, r), 'utf8')

function almacenEnMemoria() {
  const datos = new Map()
  return { getItem: (k) => (datos.has(k) ? datos.get(k) : null), setItem: (k, v) => datos.set(k, String(v)), removeItem: (k) => datos.delete(k) }
}

/** Un módulo del panel compilado con Vite (lee `import.meta.env`) y cargado en memoria. */
async function compilar(entrada, conApi) {
  const ENTRADA = `virtual:prueba-t167a-${conApi ? 'api' : 'demo'}`
  const salida = await build({
    root: raiz,
    logLevel: 'error',
    define: { 'import.meta.env.VITE_FOM_API': JSON.stringify(conApi ? '/fom-api' : '') },
    plugins: [{
      name: 'entrada-prueba',
      resolveId: (id) => (id.endsWith(ENTRADA) ? '\0' + ENTRADA : null),
      load: (id) => (id === '\0' + ENTRADA ? entrada : null),
    }],
    build: { write: false, minify: false, lib: { entry: ENTRADA, formats: ['es'], fileName: 'prueba' } },
  })
  return salida[0].output.find((o) => o.type === 'chunk').code
}

let cargas = 0
async function cargar(codigo) {
  globalThis.localStorage = almacenEnMemoria()
  globalThis.location = { search: '' }
  try {
    return await import('data:text/javascript;base64,' + Buffer.from(`${codigo}\n// carga ${++cargas}`).toString('base64'))
  } finally {
    delete globalThis.location
  }
}

let codigoReglas = null
async function reglas() {
  codigoReglas ??= await compilar(`export * from '${ruta('src/panel/modulos/InspeccionConductorReglas.jsx')}'`, false)
  return cargar(codigoReglas)
}
let codigoDemo = null
async function demo() {
  codigoDemo ??= await compilar(`export { default as repo, inspeccionConductorSemilla } from '${ruta('src/panel/datos/repoSemilla.js')}'`, false)
  return cargar(codigoDemo)
}
let codigoApi = null
async function conectado() {
  codigoApi ??= await compilar(`export { inspeccionConductor, cuerpoInspeccion } from '${ruta('src/panel/datos/repoApi.js')}'`, true)
  return cargar(codigoApi)
}

const YO = { id: 'usr-002', nombre: 'Carlos Méndez', empresaId: 'transporte-lago-sur' }
const PLANTILLA = {
  formatoId: 'tpl-1',
  nombre: 'Inspección preoperacional',
  categorias: [
    { nombre: 'Frenos', items: [{ id: 'a', categoria: 'Frenos', nombre: 'Pedal', critico: true }] },
    { nombre: 'Luces', items: [{ id: 'b', categoria: 'Luces', nombre: 'Direccionales', critico: false }, { id: 'c', categoria: 'Luces', nombre: 'Cruces', critico: false }] },
  ],
}

// ---------------------------------------------------------------- reglas

test('reglas: lo que falta para enviar, con los textos de la app', async () => {
  const r = await reglas()
  const items = r.itemsDe(PLANTILLA)
  assert.equal(items.length, 3)
  assert.equal(r.problemaParaEnviar(items, { a: { estado: 'conforme' } }), 'Responde todos los ítems antes de enviar (faltan 2).')
  const base = { b: { estado: 'conforme' }, c: { estado: 'conforme' } }
  assert.equal(r.problemaParaEnviar(items, { ...base, a: { estado: 'falla' } }), 'Adjunta una foto en las fallas críticas para generar la ODT.')
  assert.equal(r.problemaParaEnviar(items, { ...base, a: { estado: 'falla', fotos: [{}] } }), null)
  assert.equal(r.problemaParaEnviar(items, { a: { estado: 'conforme' }, b: { estado: 'falla' }, c: { estado: 'conforme' } }),
    'En cada falla, responde si quieres crear la ODT o solo registrarla.')
  assert.equal(r.problemaParaEnviar(items, { a: { estado: 'conforme' }, b: { estado: 'falla', crearOdt: false }, c: { estado: 'conforme' } }), null)
})

test('reglas: cambiar de respuesta suelta la nota en Conforme y la foto fuera de la falla', async () => {
  const r = await reglas()
  const falla = { itemId: 'a', estado: 'falla', nota: 'gastada', fotos: [{}], crearOdt: true }
  assert.deepEqual(r.conEstado(falla, 'a', 'observacion'), { itemId: 'a', estado: 'observacion', nota: 'gastada', fotos: undefined, crearOdt: undefined })
  assert.equal(r.conEstado(falla, 'a', 'conforme').nota, undefined)
  assert.equal(r.textoFallas(r.contarFallas([
    { estado: 'falla', critico: true }, { estado: 'falla', critico: true }, { estado: 'observacion', critico: false }, { estado: 'conforme' },
  ])), '2 fallas críticas · 1 observación')
})

test('reglas: sábado y domingo se pregunta, y la respuesta vale solo ese día y para esa persona', async () => {
  const r = await reglas()
  assert.equal(r.diaDeFinDeSemana(new Date(2026, 9, 24)), 'sábado')
  assert.equal(r.diaDeFinDeSemana(new Date(2026, 9, 25)), 'domingo')
  assert.equal(r.diaDeFinDeSemana(new Date(2026, 9, 26)), null)
  const almacen = almacenEnMemoria()
  r.guardarFinDeSemana('usr-002', 'no_trabajo', '2026-10-24', almacen)
  assert.equal(r.leerFinDeSemana('usr-002', '2026-10-24', almacen), 'no_trabajo')
  assert.equal(r.leerFinDeSemana('usr-002', '2026-10-25', almacen), null, 'el domingo se vuelve a preguntar')
  assert.equal(r.leerFinDeSemana('usr-003', '2026-10-24', almacen), null, 'cada conductor responde lo suyo')
})

// ---------------------------------------------------------------- demo

test('demo: la unidad del conductor empieza pendiente y su formato trae 14 puntos, frenos primero', async () => {
  const { inspeccionConductorSemilla: insp, repo } = await demo()
  const veh = await repo.vehiculos.obtener('veh-001')
  const plantilla = await insp.plantilla(veh)
  assert.equal(plantilla.categorias.flatMap((c) => c.items).length, 14)
  assert.deepEqual(plantilla.categorias.slice(0, 2).map((c) => c.nombre), ['Frenos', 'Luces'])
  assert.ok(plantilla.formatoId)
  assert.deepEqual(await insp.diariaDeHoy('veh-001', { empresaId: YO.empresaId }), { estado: 'pendiente' })
})

test('demo: una falla crítica bloquea, genera su ODT, avisa al supervisor y no deja una segunda', async () => {
  const { inspeccionConductorSemilla: insp, repo } = await demo()
  const veh = await repo.vehiculos.obtener('veh-001')
  const plantilla = await insp.plantilla(veh)
  const items = plantilla.categorias.flatMap((c) => c.items)
  const critico = items.find((i) => i.critico)
  const leve = items.find((i) => !i.critico)
  const respuestas = items.map((i) => ({ itemId: i.id, estado: 'conforme' }))
  respuestas[items.indexOf(critico)] = { itemId: critico.id, estado: 'falla', nota: 'No frena', fotos: [{}] }
  respuestas[items.indexOf(leve)] = { itemId: leve.id, estado: 'observacion', nota: 'Raya' }
  const avisosAntes = (await repo.alertas.listar()).length

  const r = await insp.enviar({ vehiculo: veh, plantilla, respuestas, ubicacion: veh.ubicacionTexto }, YO)
  assert.equal(r.resultado.estado, 'bloqueada')
  assert.equal(r.resultado.fallasCriticas, 1)
  assert.equal(r.resultado.ordenesGeneradas.length, 1)
  assert.equal(r.detalle.conductorId, 'usr-002')
  assert.equal(r.detalle.respuestas.filter((x) => x.estado !== 'conforme').length, 2)
  assert.equal(r.fotos.enDemo, 1, 'la demo dice que la foto no se guarda')

  // El supervisor la ve en su lista, con sus cuentas, y la ODT en mantenimiento.
  const lista = await repo.inspecciones.listar({ fecha: r.detalle.fecha })
  const suya = lista.find((i) => i.id === r.detalle.id)
  assert.equal(suya.resultado, 'bloqueada')
  assert.equal(suya.fallasCriticas, 1)
  assert.equal(suya.observaciones, 1)
  assert.ok((await repo.odts.listar()).some((o) => o.id === r.resultado.ordenesGeneradas[0].id))
  const avisos = await repo.alertas.listar()
  assert.ok(avisos.some((n) => n.tipo === 'inspection_blocked'), 'avisa de la unidad bloqueada')
  assert.equal(avisos.length, avisosAntes + 2, 'la ODT y el bloqueo')

  // Ya está hecha: se ve con lo respondido y no se acepta otra hoy.
  const hoy = await insp.diariaDeHoy('veh-001', { empresaId: YO.empresaId })
  assert.equal(hoy.estado, 'hecha')
  assert.equal(hoy.detalle.id, r.detalle.id)
  await assert.rejects(insp.enviar({ vehiculo: veh, plantilla, respuestas, ubicacion: '' }, YO), (e) => e.yaHecha === true)

  await insp.pedirOtraUnidad('veh-001')
  assert.ok((await repo.alertas.listar()).some((n) => n.tipo === 'replacement_request'))
})

test('demo: sin fallas sale aprobada y una falla leve sin ODT no genera orden', async () => {
  const { inspeccionConductorSemilla: insp, repo } = await demo()
  const veh = await repo.vehiculos.obtener('veh-001')
  const plantilla = await insp.plantilla(veh)
  const items = plantilla.categorias.flatMap((c) => c.items)
  const r = await insp.enviar({ vehiculo: veh, plantilla, respuestas: items.map((i) => ({ itemId: i.id, estado: 'conforme' })), ubicacion: '' }, YO)
  assert.equal(r.resultado.estado, 'aprobada')
  assert.equal(r.resultado.ordenesGeneradas.length, 0)

  const otra = await demo()
  const veh2 = await otra.repo.vehiculos.obtener('veh-001')
  const leve = items.find((i) => !i.critico)
  const r2 = await otra.inspeccionConductorSemilla.enviar({
    vehiculo: veh2,
    plantilla,
    respuestas: items.map((i) => (i === leve ? { itemId: i.id, estado: 'falla', crearOdt: false } : { itemId: i.id, estado: 'conforme' })),
    ubicacion: '',
  }, YO)
  assert.equal(r2.resultado.estado, 'aprobada_con_observaciones')
  assert.equal(r2.resultado.ordenesGeneradas.length, 0)
})

// ---------------------------------------------------------------- conectado

function servidor(respuestas) {
  const llamadas = []
  globalThis.fetch = async (url, opts = {}) => {
    const metodo = opts.method || 'GET'
    llamadas.push({ url, metodo, cuerpo: opts.body ? JSON.parse(opts.body) : null })
    const r = respuestas(url, metodo)
    return new Response(JSON.stringify(r.cuerpo ?? {}), { status: r.estado ?? 200 })
  }
  return llamadas
}

test('conectado: usa las rutas de la app y manda el mismo cuerpo', async () => {
  const original = globalThis.fetch
  try {
    const { inspeccionConductor: insp, cuerpoInspeccion } = await conectado()
    const llamadas = servidor((url, metodo) => {
      if (url.endsWith('/inspection-templates')) {
        return { cuerpo: { items: [{ id: 'tpl-1', name: 'Preoperacional', items: [
          { id: 'b', category: 'Luces', name: 'Direccionales', isCritical: false, helpText: null, displayOrder: 2 },
          { id: 'a', category: 'Frenos', name: 'Pedal', isCritical: true, helpText: 'Sin ruido', displayOrder: 1 },
        ] }] } }
      }
      if (url.includes('/vehicles/v1/inspections') && metodo === 'POST') return { cuerpo: { inspectionId: 'i-1', result: 'bloqueada', workOrderIds: ['w-1'] } }
      if (url.includes('/work-orders/w-1')) return { cuerpo: { workOrder: { id: 'w-1', status: 'abierta', description: 'Pedal' } } }
      if (url.includes('/notices')) return { cuerpo: { ok: true } }
      if (url.includes('/inspections?')) return { estado: 403, cuerpo: { message: 'Forbidden' } }
      return { estado: 404, cuerpo: { message: 'Cannot GET x' } }
    })
    const vehiculo = { id: 'v1', tipo: 'camioneta', numero: 'U-001', placa: 'Z69FC7W' }
    const plantilla = await insp.plantilla(vehiculo)
    assert.equal(llamadas[0].url, '/fom-api/api/v1/mobile/vehicles/v1/inspection-templates')
    assert.deepEqual(plantilla.categorias.map((c) => c.nombre), ['Frenos', 'Luces'])
    assert.equal(plantilla.categorias[0].items[0].ayuda, 'Sin ruido')

    // Al conductor FOM puede no dejarle leer la lista: se deja hacerla y se avisa.
    const antes = await insp.diariaDeHoy('v1', { empresaId: YO.empresaId })
    assert.equal(antes.estado, 'sin_comprobar')
    assert.match(llamadas.at(-1).url, /^\/fom-api\/api\/v1\/mobile\/inspections\?vehicleId=v1&limit=20&offset=0$/u)

    const respuestas = [
      { itemId: 'a', estado: 'falla', nota: ' No frena ', fotos: [] },
      { itemId: 'b', estado: 'falla', crearOdt: true },
    ]
    const r = await insp.enviar({ vehiculo, plantilla, respuestas, ubicacion: 'Vía a La Concepción' }, YO)
    const envio = llamadas.find((l) => l.metodo === 'POST' && l.url.endsWith('/vehicles/v1/inspections'))
    assert.equal(envio.url, '/fom-api/api/v1/mobile/vehicles/v1/inspections')
    assert.deepEqual(envio.cuerpo, cuerpoInspeccion({ plantilla, respuestas, ubicacion: 'Vía a La Concepción' }))
    assert.deepEqual(envio.cuerpo, {
      templateId: 'tpl-1',
      location: 'Vía a La Concepción',
      answers: [
        { templateItemId: 'a', itemState: 'falla', note: 'No frena', requestedWorkOrder: true },
        { templateItemId: 'b', itemState: 'falla', requestedWorkOrder: true },
      ],
    })
    const aviso = llamadas.find((l) => l.url.endsWith('/api/v1/mobile/notices'))
    assert.equal(aviso.cuerpo.kind, 'inspection_blocked')
    assert.equal(aviso.cuerpo.inspectionId, 'i-1')
    assert.equal(r.resultado.estado, 'bloqueada')
    assert.deepEqual(r.resultado.ordenesGeneradas, [{ id: 'w-1', estado: 'abierta', descripcion: 'Pedal' }])

    // Lo enviado desde este navegador cuenta aunque FOM no deje leer la lista.
    const despues = await insp.diariaDeHoy('v1', { empresaId: YO.empresaId })
    assert.equal(despues.estado, 'hecha')
    assert.equal(despues.detalle.id, 'i-1')
    assert.equal(despues.inspeccion.unidad, 'U-001')

    await insp.pedirOtraUnidad('v1')
    assert.equal(llamadas.at(-1).cuerpo.kind, 'replacement_request')
  } finally {
    globalThis.fetch = original
  }
})

test('conectado: si FOM dice que ya está hecha (409) pasa a «ya hecha» y lo recuerda', async () => {
  const original = globalThis.fetch
  try {
    const { inspeccionConductor: insp } = await conectado()
    servidor((url, metodo) => (metodo === 'POST'
      ? { estado: 409, cuerpo: { message: 'A daily inspection was already submitted today for this vehicle' } }
      : { cuerpo: { items: [] } }))
    await assert.rejects(
      insp.enviar({ vehiculo: { id: 'v1' }, plantilla: PLANTILLA, respuestas: [{ itemId: 'a', estado: 'conforme' }], ubicacion: '' }, YO),
      (e) => e.yaHecha === true && e.message === 'La inspección de hoy de esta unidad ya está hecha.',
    )
    const d = await insp.diariaDeHoy('v1', { empresaId: YO.empresaId })
    assert.equal(d.estado, 'hecha')
    assert.equal(d.inspeccion, null)
  } finally {
    globalThis.fetch = original
  }
})

// ---------------------------------------------------------------- navegación

test('navegación: «Inspección» en la barra del conductor y «Inspección del día» en su menú', () => {
  const nav = leer('src/panel/comp/movil-navegacion.jsx')
  const conductor = nav.slice(nav.indexOf('  conductor: ['), nav.indexOf(']', nav.indexOf('  conductor: [')))
  assert.match(conductor, /a: '\/panel', icono: 'inicio', texto: 'Mi unidad'/u)
  assert.match(conductor, /a: '\/panel\/inspeccion', icono: 'inspeccion', texto: 'Inspección'/u)
  assert.match(conductor, /a: '\/panel\/mantenimiento'/u)
  assert.doesNotMatch(conductor, /\/panel\/mapa/u, 'el mapa sale de la barra: Mi unidad ya es el mapa')

  const consola = leer('src/panel/Consola.jsx')
  assert.match(consola, /\{ a: '\/panel\/inspeccion', icono: 'inspeccion', texto: 'Inspección del día' \}/u)
  assert.match(consola, /conductor: \['', 'inspeccion', 'mapa', 'alertas', 'mantenimiento'\]/u)
  assert.match(consola, /<Route path="inspeccion" element=\{area === 'conductor' \? <InspeccionConductor \/>/u)
  // El mapa sigue en su menú (y en «Accesos» de Mi perfil en el teléfono).
  assert.match(consola, /\{ a: '\/panel\/mapa', icono: 'mapa', texto: 'Mapa' \}/u)
})
