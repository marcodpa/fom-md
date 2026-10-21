import assert from 'node:assert/strict'
import test from 'node:test'
import { join } from 'node:path'
import { build } from 'vite'

// ============================================================
// T-59 / T-64: Historial «Por persona» y su calendario
// ------------------------------------------------------------
// 1. La regla del mes (la misma que la app, T-60/T-75): de lunes a viernes
//    todos los días desde que tiene unidad; sábado y domingo solo si ese día
//    la hizo. Hoy no es «No hecha» mientras siga a tiempo, sin unidad
//    solo cuentan los días que la hizo, solo las diarias suman. Desde T-64
//    las programadas no llevan marca propia: no suman ni se cuentan aparte.
// 2. Conectado, el mes se lee por páginas de 200 hasta cruzar su primer día:
//    una lectura por mes, no una por día ni por persona.
// 3. En demostración la semilla trae el mes completo de cada conductor.
// ============================================================

const raiz = new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/u, '$1')

async function compilar(entrada, api) {
  const salida = await build({
    root: raiz,
    logLevel: 'error',
    define: { 'import.meta.env.VITE_FOM_API': JSON.stringify(api) },
    build: { write: false, lib: { entry: join(raiz, entrada), formats: ['es'], fileName: 'm' } },
  })
  const codigo = salida[0].output.find((o) => o.type === 'chunk').code
  return import('data:text/javascript;base64,' + Buffer.from(codigo).toString('base64'))
}

function localStorageEnMemoria() {
  const datos = new Map()
  return { getItem: (k) => (datos.has(k) ? datos.get(k) : null), setItem: (k, v) => datos.set(k, String(v)), removeItem: (k) => datos.delete(k) }
}

const insp = (id, fecha, resultado = 'aprobada', extra = {}) => ({ id, fecha, resultado, creadaEn: `${fecha}T07:00:00`, ...extra })

test('calendario: lunes a viernes desde la unidad, fin de semana solo si la hizo, hoy no es «No hecha», solo diarias', async () => {
  const { mesDeLaPersona, ESTADO_DIA, TEXTO_REGLA } = await compilar('src/panel/comp/CalendarioInspecciones.jsx', '')
  // Octubre 2026: el 1 es jueves, el 4 domingo. Hoy es martes 6.
  const { dias, totales } = mesDeLaPersona({
    mes: '2026-10', hoy: '2026-10-06', desde: '2026-10-02', conUnidad: true,
    inspecciones: [
      insp('a', '2026-10-02'),
      insp('b', '2026-10-03', 'aprobada_con_observaciones'), // sábado: la hizo, cuenta
      insp('c', '2026-10-04'), // domingo: la hizo, cuenta
      insp('d', '2026-10-05', 'aprobada'),
      insp('e', '2026-10-05', 'bloqueada'), // dos el mismo día: manda la peor
      insp('p', '2026-10-01', 'aprobada', { clase: 'scheduled' }), // kind=scheduled: no suma
      insp('q', '2026-10-06', 'aprobada', { clase: 'scheduled' }), // ni convierte hoy en «Hecha»
    ],
  })
  const de = (d) => dias.find((x) => x.fecha === `2026-10-${d}`)
  assert.equal(de('01').estado, 'libre', 'antes de tener unidad no cuenta')
  assert.equal(de('01').inspeccion, null, 'una programada no representa el día')
  assert.equal('programadas' in de('01'), false, 'el día ya no separa programadas')
  assert.equal(de('02').estado, 'hecha')
  assert.equal(de('03').estado, 'observaciones')
  assert.equal(de('04').estado, 'hecha')
  assert.equal(de('05').estado, 'bloqueada')
  assert.equal(de('05').inspeccion.id, 'e')
  assert.equal(de('06').estado, 'pendiente')
  assert.equal(de('07').estado, 'futuro')
  assert.equal(ESTADO_DIA.pendiente.texto, 'Hoy')
  assert.equal(ESTADO_DIA.libre.texto, 'No cuenta')
  assert.deepEqual(
    { debidos: totales.debidos, cumplidos: totales.cumplidos, pct: totales.pct, noHechas: totales.noHechas },
    { debidos: 4, cumplidos: 4, pct: 100, noHechas: 0 },
  )
  assert.equal('programadas' in totales, false, 'sin total de programadas')

  assert.equal(TEXTO_REGLA, 'De lunes a viernes cuentan todos los días desde que tiene la unidad. Sábado y domingo solo cuentan si ese día trabajó.')

  // Un día laborable sin la diaria sí es «No hecha» y baja el cumplimiento;
  // el fin de semana sin la diaria es «No cuenta» y no suma ni resta.
  const otro = mesDeLaPersona({ mes: '2026-10', hoy: '2026-10-06', conUnidad: true, inspecciones: [insp('a', '2026-10-01'), insp('b', '2026-10-02')] })
  assert.equal(otro.dias[2].estado, 'libre') // sábado 3 sin la diaria
  assert.equal(otro.dias[3].estado, 'libre') // domingo 4 sin la diaria
  assert.equal(otro.dias[2].cuenta, false)
  assert.equal(ESTADO_DIA[otro.dias[3].estado].texto, 'No cuenta')
  assert.equal(otro.dias[4].estado, 'no_hecha') // lunes 5
  assert.deepEqual(
    { debidos: otro.totales.debidos, cumplidos: otro.totales.cumplidos, noHechas: otro.totales.noHechas, pct: otro.totales.pct },
    { debidos: 3, cumplidos: 2, noHechas: 1, pct: 67 }, // jueves 1, viernes 2 y lunes 5; hoy (6) aún a tiempo
  )

  // Hoy sábado sin la diaria: no es «Hoy» pendiente ni «No hecha», no cuenta.
  const sabado = mesDeLaPersona({ mes: '2026-10', hoy: '2026-10-10', conUnidad: true, inspecciones: [] })
  assert.equal(sabado.dias[9].estado, 'libre')
  assert.equal(sabado.totales.debidos, 7) // 1, 2, 5, 6, 7, 8, 9
  assert.equal(sabado.totales.noHechas, 7)

  // Sin unidad: solo cuentan los días que la hizo.
  const sinUnidad = mesDeLaPersona({ mes: '2026-10', hoy: '2026-10-06', conUnidad: false, inspecciones: [insp('a', '2026-10-02')] })
  assert.equal(sinUnidad.totales.noHechas, 0)
  assert.equal(sinUnidad.totales.debidos, 1)
  const nada = mesDeLaPersona({ mes: '2026-10', hoy: '2026-10-06', conUnidad: false, inspecciones: [] })
  assert.equal(nada.totales.pct, null)
})

test('conectado: el mes se lee por páginas de 200 hasta cruzar su primer día', async () => {
  const { repo } = await compilar('src/panel/datos/repo.js', '/fom-api')
  const original = globalThis.fetch
  const pedidos = []
  // 450 inspecciones, una cada 2 horas hacia atrás desde el 20 de octubre: unas 37 días.
  const todas = Array.from({ length: 450 }, (_, n) => {
    const d = new Date(2026, 9, 20, 12 - n * 2)
    const fecha = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    return { id: `i${n}`, result: 'aprobada', inspectionDate: fecha, vehicleId: 'v1', driverUserId: 'u1', driverName: 'Ana', kind: 'daily' }
  })
  try {
    globalThis.fetch = async (url) => {
      const u = new URL(String(url), 'http://x')
      assert.ok(u.pathname.endsWith('/api/v1/console/inspections'))
      pedidos.push(u.searchParams.get('offset'))
      const desde = Number(u.searchParams.get('offset'))
      const limite = Number(u.searchParams.get('limit'))
      return new Response(JSON.stringify({ items: todas.slice(desde, desde + limite), page: { total: todas.length, limit: limite, offset: desde } }), { status: 200 })
    }
    const lista = await repo.inspecciones.listar({ desde: '2026-10-01', hasta: '2026-10-31' })
    assert.ok(pedidos.length <= 3, `pidió ${pedidos.length} páginas`)
    assert.deepEqual(pedidos.slice(0, 2), ['0', '200'])
    assert.ok(lista.length > 0)
    assert.ok(lista.every((i) => i.fecha >= '2026-10-01' && i.fecha <= '2026-10-31'))
    assert.equal(lista[0].conductorId, 'u1')
    assert.equal(lista.incompleta, undefined)
  } finally { globalThis.fetch = original }
})

test('demo: cada conductor con unidad trae inspecciones repartidas en el mes', async () => {
  globalThis.localStorage = localStorageEnMemoria()
  const { repo } = await compilar('src/panel/datos/repo.js', '')
  const hoy = new Date()
  const hace = new Date(hoy); hace.setDate(hoy.getDate() - 40)
  const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  const lista = await repo.inspecciones.listar({ desde: iso(hace), hasta: iso(hoy) })
  const dias = new Set(lista.filter((i) => i.conductorId === 'usr-002').map((i) => i.fecha))
  assert.ok(dias.size >= 18, `usr-002 tiene ${dias.size} días con inspección en 40 días`)
  assert.ok(lista.some((i) => i.clase === 'scheduled'), 'hay alguna programada en la semilla')
  assert.ok(lista.every((i) => i.fecha >= iso(hace)))
})
