import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { comoEventoManejo, crearCacheEventos, juntarEventos, mezclarEventos } from '../src/panel/datos/eventosManejo.js'
import { filtrarPorFecha, msHastaMedianoche, rangoDeFecha } from '../src/panel/datos/filtroFecha.js'

// ============================================================
// T-133: arreglos de la revisión del 23 oct 2026
//  · Manejo brusco: lo guardado va por sesión y empresa, lo vencido se borra,
//    «Actualizar» vence sin borrar; la flota se mezcla de a poco.
//  · Mantenimiento: «Hoy» cambia a la medianoche.
// ============================================================

const raiz = new URL('..', import.meta.url)
const leer = (ruta) => readFileSync(new URL(ruta, raiz), 'utf8')

/** Un servidor de eventos de mentira: cuenta los pedidos y responde con quién y cuándo. */
function servidorDeEventos() {
  const pedidos = []
  let falla = false
  return {
    pedidos,
    fallar: (v) => { falla = v },
    pedir: async ({ userId, dias }) => {
      pedidos.push(`${userId}:${dias}`)
      if (falla) throw new Error('sin red')
      return [{ id: `${userId}-${pedidos.length}` }]
    },
  }
}

test('manejo brusco: lo guardado es de la sesión y la empresa; al cambiar, se vacía', async () => {
  const s = servidorDeEventos()
  let dueno = 'ana@x|emp-1|'
  const cache = crearCacheEventos({ pedir: s.pedir, dueno: () => dueno })
  const a = await cache.pedir({ userId: 'u1', dias: 30 })
  assert.deepEqual(await cache.pedir({ userId: 'u1', dias: 30 }), a, 'la misma persona y empresa: lo guardado')
  assert.equal(s.pedidos.length, 1)
  // El admin FOM entra a otra empresa: no ve lo de la anterior.
  dueno = 'ana@x|emp-1|emp-2'
  const b = await cache.pedir({ userId: 'u1', dias: 30 })
  assert.notDeepEqual(b, a)
  assert.equal(s.pedidos.length, 2)
  assert.equal(cache.tamano, 1, 'lo de la otra empresa se borró')
  // Otra cuenta en el mismo navegador.
  dueno = 'luis@x|emp-1|'
  await cache.pedir({ userId: 'u1', dias: 30 })
  assert.equal(s.pedidos.length, 3)
})

test('manejo brusco: lo vencido se borra, un fallo no se guarda y «Actualizar» vence sin borrar', async () => {
  const s = servidorDeEventos()
  let reloj = 0
  const cache = crearCacheEventos({ pedir: s.pedir, vigenciaMs: 1000, ahora: () => reloj })
  await cache.pedir({ userId: 'u1', dias: 7 })
  await cache.pedir({ userId: 'u2', dias: 7 })
  reloj = 1500
  await cache.pedir({ userId: 'u3', dias: 7 })
  assert.equal(cache.tamano, 1, 'u1 y u2 vencieron y se borraron')
  // Un fallo no se guarda: el siguiente sale de verdad.
  s.fallar(true)
  await assert.rejects(cache.pedir({ userId: 'u4', dias: 7 }))
  s.fallar(false)
  await cache.pedir({ userId: 'u4', dias: 7 })
  assert.equal(s.pedidos.filter((p) => p.startsWith('u4')).length, 2)
  // «Actualizar»: lo guardado sigue ahí, pero el próximo pedido sale al servidor.
  const antes = s.pedidos.length
  cache.vencer()
  assert.equal(cache.tamano, 2)
  await cache.pedir({ userId: 'u3', dias: 7 })
  assert.equal(s.pedidos.length, antes + 1)
  await cache.pedir({ userId: 'u3', dias: 7 })
  assert.equal(s.pedidos.length, antes + 1, 'lo nuevo ya queda guardado')
})

test('la ficha de la unidad pide por la caché con dueño (sesión y empresa)', () => {
  const src = leer('src/panel/comp/ManejoBrusco.jsx')
  assert.match(src, /crearCacheEventos\(/u)
  assert.match(src, /empresaGestionActualId\(\)/u)
  // T-151: la vista del manejo brusco de toda la flota se quitó del Centro de control.
  assert.doesNotMatch(src, /useManejoFlota|BloqueManejoFlota/u)
  assert.doesNotMatch(leer('src/panel/modulos/CentroControl.jsx'), /manejoFlota|ManejoFlota/u)
})

const HORA = 3600000
const AHORA = new Date(2026, 9, 23, 12).getTime()
const ev = (id, hace, o = {}) => comoEventoManejo({
  id, type: 'harsh_braking', occurredAt: new Date(AHORA - hace).toISOString(), vehicleId: 'v1', lat: 10.4, lng: -71.4, speedBeforeKph: 80, speedAfterKph: 20, ...o,
})

test('cada evento trae su hora en ms (`t`), leída una vez', () => {
  const e = ev('e1', HORA)
  assert.equal(e.t, AHORA - HORA)
  assert.equal(comoEventoManejo({ id: 'x' }).t, null)
})

test('mezclar de a poco da lo mismo que juntar todo de una vez', () => {
  const a = [ev('a1', 1 * HORA), ev('a2', 5 * HORA)]
  const b = [ev('b1', 2 * HORA), ev('a1', 1 * HORA), ev('b2', 9 * HORA)]
  const c = [ev('c1', 0), ev('c2', 3 * HORA)]
  c.tope = true
  const deUnaVez = juntarEventos([a, b, c])
  let poco = mezclarEventos([], [a])
  poco = mezclarEventos(poco, [b])
  poco = mezclarEventos(poco, [c])
  assert.deepEqual(poco.map((e) => e.id), deUnaVez.map((e) => e.id))
  assert.equal(poco.tope, true)
  assert.equal(poco.completoDesde, deUnaVez.completoDesde)
  // Sin nada nuevo, la misma lista (el mapa no se repinta).
  assert.equal(mezclarEventos(poco, [[ev('a1', HORA)]]), poco)
  // Con la flota entera (340 conductores × 100) va rápido.
  const t0 = Date.now()
  let flota = []
  for (let k = 0; k < 34; k += 1) {
    const tanda = Array.from({ length: 10 }, (_, u) => Array.from({ length: 100 }, (_, i) => ev(`e${k}-${u}-${i}`, (i * 37 + u * 11 + k) * 60000)))
    flota = mezclarEventos(flota, tanda)
  }
  assert.equal(flota.length, 34000)
  assert.ok(Date.now() - t0 < 3000, 'mezclar 34.000 eventos en 34 vueltas tarda menos de 3 s')
  for (let i = 1; i < flota.length; i += 1) assert.ok(flota[i - 1].t >= flota[i].t, 'del más nuevo al más viejo')
})

test('mantenimiento: «Hoy» cambia a la medianoche (hora local)', () => {
  const tarde = new Date(2026, 9, 23, 23, 59, 30).getTime()
  assert.equal(msHastaMedianoche(tarde), 30000)
  assert.equal(msHastaMedianoche(new Date(2026, 9, 23, 0, 0, 0).getTime()), 24 * HORA)
  const odts = [{ id: 'del-23', creadaEn: new Date(2026, 9, 23, 22).toISOString() }]
  assert.deepEqual(filtrarPorFecha(odts, { atajo: 'hoy' }, { ahora: tarde }).map((o) => o.id), ['del-23'])
  // Pasada la medianoche, la misma orden ya no es de «Hoy».
  const despues = tarde + msHastaMedianoche(tarde) + 1000
  assert.deepEqual(filtrarPorFecha(odts, { atajo: 'hoy' }, { ahora: despues }), [])
  assert.equal(rangoDeFecha({ atajo: 'hoy' }, despues).desde, new Date(2026, 9, 24).getTime())
  // La pantalla vuelve a filtrar al cambiar el día: el día va en las dependencias del filtro.
  const src = leer('src/panel/modulos/Mantenimiento.jsx')
  assert.match(src, /filtrarPorFecha\(sinFecha, fecha\), \[sinFecha, fecha, hoy\]/u)
  assert.match(src, /msHastaMedianoche\(\)/u)
})
