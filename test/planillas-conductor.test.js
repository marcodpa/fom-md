import assert from 'node:assert/strict'
import test from 'node:test'
import { join } from 'node:path'
import { build } from 'vite'

// ============================================================
// T-200 (conductor, web): varias planillas por día
//  · el mapeo de la respuesta de FOM a la lista de planillas de hoy
//    (servidor nuevo con estado por planilla y servidor viejo con una sola);
//  · la regla «la unidad sale cuando TODAS las de hoy están hechas»;
//  · el 409 por planilla, dicho en llano;
//  · la demostración: dos planillas hoy para la unidad del conductor.
// ============================================================

const raiz = new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/u, '$1')
const ruta = (r) => join(raiz, r).replace(/\\/g, '/')

function almacenEnMemoria() {
  const datos = new Map()
  return { getItem: (k) => (datos.has(k) ? datos.get(k) : null), setItem: (k, v) => datos.set(k, String(v)), removeItem: (k) => datos.delete(k) }
}

/** Un módulo del panel compilado con Vite (lee `import.meta.env`) y cargado en memoria. */
async function compilar(entrada, conApi) {
  const ENTRADA = `virtual:prueba-t200-conductor-${conApi ? 'api' : 'demo'}`
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
const reglas = async () => {
  codigoReglas ??= await compilar(`export * from '${ruta('src/panel/modulos/InspeccionConductorReglas.jsx')}'`, false)
  return cargar(codigoReglas)
}
let codigoDemo = null
const demo = async () => {
  codigoDemo ??= await compilar(`export { default as repo, inspeccionConductorSemilla } from '${ruta('src/panel/datos/repoSemilla.js')}'`, false)
  return cargar(codigoDemo)
}
let codigoApi = null
const conectado = async () => {
  codigoApi ??= await compilar(`export { inspeccionConductor, planillasDeRespuesta } from '${ruta('src/panel/datos/repoApi.js')}'`, true)
  return cargar(codigoApi)
}

const YO = { id: 'usr-002', nombre: 'Carlos Méndez', empresaId: 'transporte-lago-sur' }
const punto = (id, orden = 1, extra = {}) => ({ id, code: id, category: 'Seguridad', name: `Punto ${id}`, isCritical: false, helpText: null, displayOrder: orden, ...extra })

/** La respuesta del servidor nuevo (contrato §2.1): dos planillas, una ya llenada. */
const RESPUESTA_NUEVA = {
  date: '2026-10-27',
  weekday: 'martes',
  timezone: 'America/Caracas',
  items: [
    {
      id: 'tpl-turno', code: 'inicio-turno', version: 1, name: 'Inicio de turno', weekdays: ['martes'], dueToday: true, submittedToday: false,
      inspectionId: null, result: null, submittedAt: null, items: [punto('t1'), punto('t2', 2)],
    },
    {
      id: 'tpl-sabado', code: 'sabado', version: 1, name: 'Solo sábados', weekdays: ['sabado'], dueToday: false, submittedToday: false,
      inspectionId: null, result: null, submittedAt: null, items: [punto('s1')],
    },
    {
      id: 'tpl-diaria', code: 'diaria', version: 3, name: 'Inspección diaria', weekdays: [], dueToday: true, submittedToday: true,
      inspectionId: 'insp-9', result: 'aprobada_con_observaciones', submittedAt: '2026-10-27T11:02:13.120Z', items: [punto('d1'), punto('d2', 2, { isCritical: true })],
    },
    {
      id: 'tpl-vacia', code: 'vacia', version: 1, name: 'Sin puntos para este tipo', weekdays: [], dueToday: true, submittedToday: false,
      inspectionId: null, result: null, submittedAt: null, items: [],
    },
  ],
}

/** La del servidor viejo: sin `date` ni estado por planilla; manda todas las publicadas. */
const RESPUESTA_VIEJA = {
  items: [
    { id: 'tpl-a', name: 'Preoperacional', items: [punto('a1')] },
    { id: 'tpl-b', name: 'Otra publicada', items: [punto('b1')] },
  ],
}

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

// ---------------------------------------------------------------- mapeo

test('mapeo: servidor nuevo trae cada planilla con su estado y las de hoy primero', async () => {
  const { planillasDeRespuesta } = await conectado()
  const r = planillasDeRespuesta(RESPUESTA_NUEVA, 'camioneta')
  assert.equal(r.nuevo, true)
  assert.equal(r.fecha, '2026-10-27')
  // La que no tiene puntos para el tipo no se puede llenar: no sale. La que no toca hoy va al final.
  assert.deepEqual(r.planillas.map((p) => p.id), ['tpl-turno', 'tpl-diaria', 'tpl-sabado'])
  assert.deepEqual(r.planillas.map((p) => p.dueToday), [true, true, false])
  const [turno, diaria] = r.planillas
  assert.equal(turno.hecha, null)
  assert.equal(turno.plantilla.nombre, 'Inicio de turno')
  assert.equal(turno.plantilla.formatoId, 'tpl-turno')
  assert.deepEqual(diaria.hecha, { resultado: 'aprobada_con_observaciones', inspeccionId: 'insp-9', enviadaEn: '2026-10-27T11:02:13.120Z' })
  assert.equal(diaria.plantilla.categorias[0].items.length, 2)
})

test('mapeo: un resultado que no se conoce queda «pendiente» y dueToday ausente cuenta como que toca', async () => {
  const { planillasDeRespuesta } = await conectado()
  const r = planillasDeRespuesta({
    date: '2026-10-27',
    items: [{ id: 'x', name: 'X', submittedToday: true, inspectionId: 'i1', result: 'rara', items: [punto('x1')] }],
  })
  assert.equal(r.planillas[0].dueToday, true)
  assert.equal(r.planillas[0].hecha.resultado, 'pendiente')
})

test('mapeo: servidor viejo (sin fecha) es UNA planilla que toca hoy y sin estado de hecha', async () => {
  const { planillasDeRespuesta } = await conectado()
  const r = planillasDeRespuesta(RESPUESTA_VIEJA, 'camioneta')
  assert.equal(r.nuevo, false)
  assert.equal(r.fecha, null)
  assert.equal(r.planillas.length, 1)
  assert.equal(r.planillas[0].id, 'tpl-a')
  assert.equal(r.planillas[0].dueToday, true)
  assert.equal(r.planillas[0].hecha, null)
  assert.deepEqual(planillasDeRespuesta({ items: [] }).planillas, [])
  assert.deepEqual(planillasDeRespuesta(null).planillas, [])
})

// ---------------------------------------------------------------- regla «todas hechas»

test('regla: la unidad sale solo cuando TODAS las de hoy están hechas', async () => {
  const r = await reglas()
  const hecha = (resultado = 'aprobada') => ({ inspeccion: { resultado }, detalle: null })
  const pendiente = { id: 'a', dueToday: true, hecha: null }
  const lista = { id: 'b', dueToday: true, hecha: hecha() }

  assert.equal(r.todasHechas([]), false, 'sin planillas no hay nada que dar por hecho')
  assert.equal(r.todasHechas([lista]), true)
  assert.equal(r.todasHechas([lista, pendiente]), false)
  assert.deepEqual(r.cuentaPlanillas([lista, pendiente]), { hechas: 1, total: 2 })

  // La que no toca hoy ni cuenta; si ya está llena (otro día de la semana) sí figura.
  const noToca = { id: 'c', dueToday: false, hecha: null }
  assert.equal(r.todasHechas([lista, noToca]), true)
  assert.deepEqual(r.planillasVisibles([lista, noToca, { ...noToca, id: 'd', hecha: hecha() }]).map((p) => p.id), ['b', 'd'])

  assert.deepEqual(r.estadoDeUnidad([pendiente, lista]), { tono: 'primario', texto: 'En curso' })
  assert.deepEqual(r.estadoDeUnidad([pendiente], 3), { tono: 'primario', texto: 'En curso' })
  assert.deepEqual(r.estadoDeUnidad([pendiente]), { tono: 'aviso', texto: 'Pendiente' })
  assert.deepEqual(r.estadoDeUnidad([lista, { ...lista, id: 'e', hecha: hecha('aprobada_con_observaciones') }]), { tono: 'exito', texto: 'Lista para salir' })
  // Una bloqueada no deja salir, estén hechas o no las demás.
  assert.equal(r.hayBloqueada([pendiente, { ...lista, hecha: hecha('bloqueada') }]), true)
  assert.deepEqual(r.estadoDeUnidad([pendiente, { ...lista, hecha: hecha('bloqueada') }]), { tono: 'peligro', texto: 'Bloqueada' })
})

test('regla: quién la hizo, con el nombre si se sabe', async () => {
  const r = await reglas()
  assert.equal(r.textoDeQuien({ conductorId: 'usr-002', conductor: 'Carlos Méndez' }, YO, '08:30'), 'La hiciste a las 08:30.')
  assert.equal(r.textoDeQuien({ conductorId: 'usr-009', conductor: 'Ana Pérez' }, YO, '08:30'), 'La hizo Ana Pérez a las 08:30.')
  assert.equal(r.textoDeQuien({ conductor: null }, YO, '08:30'), 'Se hizo a las 08:30.')
  assert.equal(r.textoDeQuien({ conductor: 'Sin conductor' }, YO, null), 'Se hizo hoy.')
  assert.equal(r.textoDeQuien(null, YO, '08:30'), null)
})

// ---------------------------------------------------------------- conectado

test('conectado nuevo: pide ?scope=today, trae el detalle de la hecha y el estado de cada planilla', async () => {
  const original = globalThis.fetch
  try {
    const { inspeccionConductor: insp } = await conectado()
    const llamadas = servidor((url) => {
      if (url.includes('/inspection-templates')) return { cuerpo: RESPUESTA_NUEVA }
      if (url.endsWith('/mobile/inspections/insp-9')) {
        return { cuerpo: { inspection: { id: 'insp-9', result: 'aprobada_con_observaciones', kind: 'daily', inspectionDate: '2026-10-27', submittedAt: '2026-10-27T11:02:13.120Z', vehicleId: 'v1', vehicleCode: 'U-001', driverName: 'Ana Pérez', driverUserId: 'usr-009', templateName: 'Inspección diaria' }, findings: [] } }
      }
      return { estado: 404, cuerpo: { message: 'Cannot GET x' } }
    })
    const r = await insp.planillasDeHoy({ id: 'v1', tipo: 'camioneta', numero: 'U-001' }, { empresaId: YO.empresaId })
    assert.equal(llamadas[0].url, '/fom-api/api/v1/mobile/vehicles/v1/inspection-templates?scope=today')
    assert.equal(r.nuevo, true)
    assert.equal(r.motivo, null)
    assert.deepEqual(r.planillas.map((p) => [p.id, p.dueToday, Boolean(p.hecha)]), [['tpl-turno', true, false], ['tpl-diaria', true, true], ['tpl-sabado', false, false]])
    const hecha = r.planillas[1].hecha
    assert.equal(hecha.inspeccion.id, 'insp-9')
    assert.equal(hecha.inspeccion.conductor, 'Ana Pérez')
    assert.equal(hecha.detalle.id, 'insp-9')
    // Con una sola por hacer, la unidad todavía no sale.
    const { todasHechas, planillasVisibles } = await reglas()
    assert.equal(todasHechas(planillasVisibles(r.planillas)), false)
  } finally {
    globalThis.fetch = original
  }
})

test('conectado nuevo: si no se puede leer el detalle queda lo que dijo la lista (sin nombre)', async () => {
  const original = globalThis.fetch
  try {
    const { inspeccionConductor: insp } = await conectado()
    servidor((url) => (url.includes('/inspection-templates')
      ? { cuerpo: RESPUESTA_NUEVA }
      : { estado: 403, cuerpo: { message: 'Forbidden' } }))
    const r = await insp.planillasDeHoy({ id: 'v1', tipo: 'camioneta', numero: 'U-001', placa: 'Z69FC7W' }, { empresaId: YO.empresaId })
    const hecha = r.planillas.find((p) => p.id === 'tpl-diaria').hecha
    assert.equal(hecha.detalle, null)
    assert.equal(hecha.inspeccion.resultado, 'aprobada_con_observaciones')
    assert.equal(hecha.inspeccion.conductor, null)
    assert.equal(hecha.inspeccion.unidad, 'U-001')
    assert.equal(hecha.inspeccion.enviadaEn, '2026-10-27T11:02:13.120Z')
  } finally {
    globalThis.fetch = original
  }
})

test('conectado viejo: una planilla, hecha según la lista de la unidad (una por unidad y día)', async () => {
  const original = globalThis.fetch
  try {
    const { inspeccionConductor: insp } = await conectado()
    const hoy = new Date()
    const fecha = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${String(hoy.getDate()).padStart(2, '0')}`
    servidor((url) => {
      if (url.includes('/inspection-templates')) return { cuerpo: RESPUESTA_VIEJA }
      if (url.includes('/inspections?')) {
        return { cuerpo: { items: [{ id: 'i-1', result: 'aprobada', kind: 'daily', inspectionDate: fecha, submittedAt: hoy.toISOString(), vehicleId: 'v1', vehicleCode: 'U-001', driverName: 'Ana Pérez' }] } }
      }
      return { estado: 404, cuerpo: {} }
    })
    const r = await insp.planillasDeHoy({ id: 'v1', tipo: 'camioneta' }, { empresaId: YO.empresaId })
    assert.equal(r.nuevo, false)
    assert.equal(r.planillas.length, 1)
    assert.equal(r.planillas[0].hecha.inspeccion.id, 'i-1')

    // Sin poder leer la lista: se deja hacer y se avisa.
    servidor((url) => (url.includes('/inspection-templates') ? { cuerpo: RESPUESTA_VIEJA } : { estado: 403, cuerpo: { message: 'Forbidden' } }))
    const sin = await insp.planillasDeHoy({ id: 'v2', tipo: 'camioneta' }, { empresaId: YO.empresaId })
    assert.equal(sin.planillas[0].hecha, null)
    assert.match(sin.motivo, /Puedes hacerla igual/u)
  } finally {
    globalThis.fetch = original
  }
})

test('conectado: el 409 de FOM nuevo es POR PLANILLA y el del viejo sigue siendo el de la unidad', async () => {
  const original = globalThis.fetch
  try {
    const { inspeccionConductor: insp } = await conectado()
    const plantilla = { formatoId: 'tpl-turno', nombre: 'Inicio de turno', categorias: [{ nombre: 'Seguridad', items: [{ id: 't1', categoria: 'Seguridad', nombre: 'Punto', critico: false }] }] }
    const envio = { vehiculo: { id: 'v1' }, plantilla, respuestas: [{ itemId: 't1', estado: 'conforme' }], ubicacion: '' }

    servidor((url, metodo) => (metodo === 'POST'
      ? { estado: 409, cuerpo: { message: 'You already submitted today inspection for that template and vehicle' } }
      : { cuerpo: {} }))
    await assert.rejects(insp.enviar(envio, YO), (e) => e.yaHecha === true && e.porPlanilla === true && e.message === 'Esta planilla ya se llenó hoy.')

    servidor((url, metodo) => (metodo === 'POST'
      ? { estado: 409, cuerpo: { message: 'A daily inspection was already submitted today for this vehicle' } }
      : { cuerpo: {} }))
    await assert.rejects(insp.enviar(envio, YO), (e) => e.yaHecha === true && e.porPlanilla === false && e.message === 'La inspección de hoy de esta unidad ya está hecha.')
  } finally {
    globalThis.fetch = original
  }
})

// ---------------------------------------------------------------- demo

test('demo: la unidad del conductor trae 2 planillas hoy y la unidad sale al hacer las dos', async () => {
  const { inspeccionConductorSemilla: insp, repo } = await demo()
  const { todasHechas, planillasVisibles, estadoDeUnidad } = await reglas()
  const veh = await repo.vehiculos.obtener('veh-001')

  const antes = await insp.planillasDeHoy(veh, { empresaId: YO.empresaId })
  assert.equal(antes.planillas.length, 2)
  assert.ok(antes.planillas.every((p) => p.dueToday && !p.hecha))
  assert.deepEqual(antes.planillas.map((p) => p.plantilla.nombre), ['Inspección preoperacional', 'Inicio de turno'])
  // Cada planilla con sus propios puntos: lo respondido en una no se marca en la otra.
  const ids = antes.planillas.map((p) => p.plantilla.categorias.flatMap((c) => c.items).map((i) => i.id))
  assert.equal(ids[0].length, 14)
  assert.ok(ids[1].length > 0)
  assert.equal(ids[0].filter((id) => ids[1].includes(id)).length, 0)
  assert.equal(todasHechas(planillasVisibles(antes.planillas)), false)

  const conformes = (p) => p.plantilla.categorias.flatMap((c) => c.items).map((i) => ({ itemId: i.id, estado: 'conforme' }))
  const [primera, segunda] = antes.planillas

  // Se llena la segunda: esa queda hecha y la otra pendiente; la unidad aún no sale.
  const r2 = await insp.enviar({ vehiculo: veh, plantilla: segunda.plantilla, respuestas: conformes(segunda), ubicacion: '' }, YO)
  assert.equal(r2.resultado.estado, 'aprobada')
  const medio = await insp.planillasDeHoy(veh, { empresaId: YO.empresaId })
  assert.deepEqual(medio.planillas.map((p) => Boolean(p.hecha)), [false, true])
  assert.equal(medio.planillas[1].hecha.inspeccion.id, r2.detalle.id)
  assert.equal(todasHechas(planillasVisibles(medio.planillas)), false)
  assert.deepEqual(estadoDeUnidad(planillasVisibles(medio.planillas)), { tono: 'primario', texto: 'En curso' })

  // Esa misma no se puede llenar otra vez hoy: 409 por planilla.
  await assert.rejects(
    insp.enviar({ vehiculo: veh, plantilla: segunda.plantilla, respuestas: conformes(segunda), ubicacion: '' }, YO),
    (e) => e.yaHecha === true && e.porPlanilla === true && e.message === 'Esta planilla ya se llenó hoy.',
  )

  // Se llena la primera: ahora sí, todas hechas y «Lista para salir».
  await insp.enviar({ vehiculo: veh, plantilla: primera.plantilla, respuestas: conformes(primera), ubicacion: '' }, YO)
  const despues = await insp.planillasDeHoy(veh, { empresaId: YO.empresaId })
  assert.ok(despues.planillas.every((p) => p.hecha))
  assert.equal(todasHechas(planillasVisibles(despues.planillas)), true)
  assert.deepEqual(estadoDeUnidad(planillasVisibles(despues.planillas)), { tono: 'exito', texto: 'Lista para salir' })
})

test('demo: la planilla bloqueada deja a la unidad bloqueada aunque estén las dos hechas', async () => {
  const { inspeccionConductorSemilla: insp, repo } = await demo()
  const { estadoDeUnidad, planillasVisibles, todasHechas } = await reglas()
  const veh = await repo.vehiculos.obtener('veh-001')
  const { planillas } = await insp.planillasDeHoy(veh, { empresaId: YO.empresaId })
  for (const [n, p] of planillas.entries()) {
    const items = p.plantilla.categorias.flatMap((c) => c.items)
    const critico = items.find((i) => i.critico)
    const respuestas = items.map((i) => (n === 0 && i === critico ? { itemId: i.id, estado: 'falla', fotos: [{}] } : { itemId: i.id, estado: 'conforme' }))
    await insp.enviar({ vehiculo: veh, plantilla: p.plantilla, respuestas, ubicacion: '' }, YO)
  }
  const { planillas: hechas } = await insp.planillasDeHoy(veh, { empresaId: YO.empresaId })
  assert.equal(todasHechas(planillasVisibles(hechas)), true)
  assert.deepEqual(estadoDeUnidad(planillasVisibles(hechas)), { tono: 'peligro', texto: 'Bloqueada' })
})
