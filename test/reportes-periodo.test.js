import test from 'node:test'
import assert from 'node:assert/strict'
import {
  alcanceAlCambiar, armarModelo, cifrasDe, comparar, cortesDelPeriodo, crearPeriodo, dineroVE, enVentana, fraseDe, nombrarPeriodo,
  numeroCorto, numeroVE, porScore, restarCostos, restarManejo, textoCmp,
} from '../src/panel/modulos/reportes-datos.js'

const ahora = new Date(2026, 9, 20, 9, 40)

test('formato es-VE: miles con punto y decimales con coma, también con cuatro cifras', () => {
  assert.equal(numeroVE(1234), '1.234')
  assert.equal(numeroVE(18430), '18.430')
  assert.equal(numeroVE(1946210), '1.946.210')
  assert.equal(numeroVE(1.24, 2), '1,24')
  assert.equal(numeroVE(-1234.5, 1), '-1.234,5')
  assert.equal(numeroVE(-0.001, 2), '0,00')
  assert.equal(numeroVE(null), '—')
  assert.equal(numeroCorto(8.03, 1), '8')
  assert.equal(numeroCorto(4.7, 1), '4,7')
  assert.equal(dineroVE(1245), '$1.245')
  assert.equal(dineroVE(0.0321, 3), '$0,032')
})

test('mes actual se compara con el mismo tramo del mes anterior, hasta la misma hora', () => {
  const p = crearPeriodo({ tipo: 'mes' }, ahora)
  assert.equal(+p.desde, +new Date(2026, 9, 1))
  assert.equal(+p.anterior.desde, +new Date(2026, 8, 1))
  assert.equal(+p.anterior.hasta, +new Date(2026, 8, 20, 9, 40))
  assert.equal(p.hasta - p.desde, p.anterior.hasta - p.anterior.desde)
  const n = nombrarPeriodo(p)
  assert.equal(n.largo, 'Octubre de 2026, del 1 al 20')
  assert.equal(n.anterior, '1–20 sep')
  assert.equal(n.comparaCon, 'el 1–20 sep, hasta la misma hora')
  assert.equal(n.queAnterior, 'del 1 al 20 de septiembre')
  assert.deepEqual([n.dias, n.diasAnterior], [20, 20])
  // El 31 de marzo no se compara con «1 al 31 de febrero».
  assert.equal(+crearPeriodo({}, new Date(2026, 2, 31, 10)).anterior.hasta, +new Date(2026, 2, 1))
})

test('personalizado por meses: nombre con meses y período anterior del mismo largo', () => {
  const p = crearPeriodo({ tipo: 'personalizado', desdeMes: '2026-09', hastaMes: '2026-07' }, ahora)
  assert.equal(p.meses, 3)
  assert.equal(p.recortado, false)
  assert.equal(+p.anterior.desde, +new Date(2026, 3, 1))
  assert.equal(+p.anterior.hasta, +new Date(2026, 6, 1))
  const n = nombrarPeriodo(p)
  assert.equal(n.largo, 'Julio – septiembre 2026')
  assert.equal(n.anterior, 'abril – junio 2026')
  assert.equal(n.comparaCon, 'abril – junio 2026')
  assert.deepEqual([n.dias, n.diasAnterior], [92, 91])
  assert.deepEqual(cortesDelPeriodo(p, +ahora), [+new Date(2026, 3, 1), +new Date(2026, 6, 1), +new Date(2026, 9, 1)])
})

test('personalizado con el mes en curso: el anterior se recorta a la misma duración y se dice', () => {
  const p = crearPeriodo({ tipo: 'personalizado', desdeMes: '2026-08', hastaMes: '2026-10' }, ahora)
  assert.equal(p.recortado, true)
  assert.equal(+p.hasta, +ahora)
  assert.equal(+p.anterior.desde, +new Date(2026, 4, 1))
  assert.equal(+p.anterior.hasta, +new Date(2026, 4, 1) + (ahora - new Date(2026, 7, 1)))
  const n = nombrarPeriodo(p)
  assert.equal(n.largo, 'Agosto – octubre 2026')
  assert.equal(n.anteriorFechas, '1 may – 20 jul 2026')
  assert.equal(n.comparaCon, 'el 1 may – 20 jul 2026: los mismos 81 días, porque octubre aún no termina')
  assert.equal(n.queAnterior, 'del 1 may al 20 jul 2026')
  assert.deepEqual([n.dias, n.diasAnterior], [81, 81])
  // Solo el mes en curso: igual que «Mes actual».
  const solo = crearPeriodo({ tipo: 'personalizado', desdeMes: '2026-10', hastaMes: '2026-10' }, ahora)
  assert.equal(+solo.anterior.hasta, +crearPeriodo({ tipo: 'mes' }, ahora).anterior.hasta)
})

test('la ventana sale de restar dos lecturas «desde»; si falta una no se inventa', () => {
  const t = +ahora
  const sep1 = +new Date(2026, 8, 1); const sep21 = +new Date(2026, 8, 21); const oct1 = +new Date(2026, 9, 1)
  const lecturas = new Map([
    [sep1, { total: 900, movimientos: 9, porCategoria: [{ categoria: 'repuestos', monto: 600 }, { categoria: 'peajes', monto: 300 }] }],
    [sep21, { total: 500, movimientos: 5, porCategoria: [{ categoria: 'repuestos', monto: 400 }, { categoria: 'peajes', monto: 100 }] }],
    [oct1, { total: 300, movimientos: 2, porCategoria: [{ categoria: 'repuestos', monto: 300 }] }],
  ])
  const anterior = enVentana(lecturas, sep1, sep21, t, restarCostos)
  assert.equal(anterior.total, 400); assert.equal(anterior.movimientos, 4)
  assert.deepEqual(anterior.porCategoria, [{ categoria: 'repuestos', monto: 200 }, { categoria: 'peajes', monto: 200 }])
  assert.equal(enVentana(lecturas, oct1, ahora, t, restarCostos).total, 300)
  lecturas.set(sep21, null)
  assert.equal(enVentana(lecturas, sep1, sep21, t, restarCostos), null)
})

test('manejo por ventana: resta km y eventos y no conserva un índice que no es de la ventana', () => {
  const a = [{ id: 'p1', nombre: 'Pedro', km: 1500, frenadas: 6, aceleraciones: 4, excesos: 5, indice: 90 }, { id: 'p2', nombre: 'Luis', km: 100, frenadas: 0, aceleraciones: 0, excesos: 0 }]
  const b = [{ id: 'p1', km: 500, frenadas: 2, aceleraciones: 1, excesos: 1 }, { id: 'p2', km: 100 }]
  const v = restarManejo(a, b)
  assert.equal(v.length, 1)
  assert.deepEqual({ km: v[0].km, eventos: v[0].eventos, por100: v[0].eventosPor100, indice: v[0].indice }, { km: 1000, eventos: 11, por100: 1.1, indice: null })
  assert.equal(restarManejo(a, null)[0].indice, 90)
  assert.equal(restarManejo(null, b), null)
})

test('comparación con el período anterior: sentido, tono y texto como en la app', () => {
  assert.deepEqual(comparar(18430, 17060), { direccion: 'sube', flecha: '▲', texto: '8,0 % más', tono: 'neutro', pct: (18430 - 17060) / 17060 * 100 })
  assert.equal(textoCmp(comparar(1083, 1000)), '▲ 8,3 % más')
  assert.equal(comparar(1124, 1000).texto, '12 % más') // entero desde el 10 %
  assert.equal(comparar(1099.6, 1000).texto, '10 % más') // 9,96 se ve como 10: ya va entero
  assert.equal(comparar(970, 1000).texto, '3,0 % menos')
  assert.equal(textoCmp(comparar(100000, 100004)), 'sin cambio') // menos de 0,05 %
  const ev = comparar(1.24, 1.42, { mejor: 'baja', modo: 'abs', decimales: 2 })
  assert.equal(ev.texto, '0,18 menos'); assert.equal(ev.tono, 'bien'); assert.equal(ev.flecha, '▼')
  assert.equal(comparar(5, 4, { mejor: 'baja', modo: 'abs' }).tono, 'mal')
  assert.equal(comparar(85, 81, { modo: 'puntos', mejor: 'sube' }).texto, '4 puntos más')
  assert.equal(comparar(10, 10).texto, 'sin cambio')
  assert.equal(textoCmp(comparar(10, 10)), 'sin cambio')
  assert.equal(comparar(3, 0).texto, '3 más')
  assert.equal(comparar(null, 4), null)
  assert.equal(comparar(4, undefined), null)
})

test('modelo: ODT y eventos por ventana, vista actual sin comparar y frase con el período anterior', () => {
  const p = crearPeriodo({}, ahora)
  const d = {
    vehiculos: [
      { id: 'v1', alias: 'Unidad 01', areaId: 'a1', estadoMarcha: 'en_marcha', indiceSeguro: 90, conductorPrincipalId: 'p1', docsVencidos: 0, docsPorVencer: 0 },
      { id: 'v2', alias: 'Unidad 02', areaId: 'a2', estadoMarcha: null, indiceSeguro: 60, conductorPrincipalId: null, docsVencidos: 1, docsPorVencer: 0 },
    ],
    conductores: [{ id: 'p1', nombre: 'Pedro', unidad: 'v1', licenciaEstado: 'vigente' }],
    odts: [
      { id: 'o1', vehiculoId: 'v2', estado: 'abierta', creadaEn: new Date(2026, 9, 5).toISOString() },
      { id: 'o2', vehiculoId: 'v2', estado: 'en_ejecucion', creadaEn: new Date(2026, 9, 6).toISOString() },
      { id: 'o3', vehiculoId: 'v1', estado: 'cerrada', costo: 120, creadaEn: new Date(2026, 9, 2).toISOString(), resueltaEn: new Date(2026, 9, 3).toISOString() },
      { id: 'o4', vehiculoId: 'v1', estado: 'cancelada', creadaEn: new Date(2026, 8, 10).toISOString() },
      { id: 'o5', vehiculoId: 'v1', estado: 'abierta', creadaEn: new Date(2026, 8, 25).toISOString() },
    ],
    eventos: [{ vehiculoId: 'v1', clave: 'exceso_velocidad', nombre: 'Exceso', creadaEn: new Date(2026, 9, 4).toISOString() }],
    manejo: { actual: [{ id: 'p1', nombre: 'Pedro', km: 1086, eventos: 12, eventosPor100: 1.1 }], anterior: [{ id: 'p1', nombre: 'Pedro', km: 1000, eventos: 14, eventosPor100: 1.4 }] },
    costos: { actual: null, anterior: null },
  }
  const m = armarModelo(d, p, { tipo: 'empresa' }, 'vehiculos')
  assert.equal(m.act.odts.length, 3)
  assert.deepEqual([m.act.abiertas, m.act.revision, m.act.resueltas, m.act.sinResolver], [1, 1, 1, 2])
  assert.equal(m.ant.odts.length, 1) // la del 25 sep queda fuera del 1–20 sep
  assert.equal(m.act.costoResueltas, 120); assert.equal(m.act.resolucionHoras, 24)
  assert.equal(m.vista.indice, 75); assert.equal(m.vista.sinDato, 1); assert.equal(m.vista.identificacion, 50)
  assert.equal(m.filasU[0].v.id, 'v2') // primero la que pide atención
  assert.deepEqual(m.filasU[0].motivos, ['Índice bajo', 'Papeles vencidos', 'Sin conductor', 'ODT sin resolver'])
  const [km, indice, ev100, odt] = cifrasDe('vehiculos', m)
  assert.equal(km.valor, '1.086'); assert.equal(km.cmp.texto, '8,6 % más')
  assert.equal(indice.ahora, true); assert.equal(indice.cmp, null)
  assert.equal(ev100.valor, '1,10'); assert.equal(ev100.cmp.tono, 'bien')
  assert.equal(odt.cmp.texto, '2 más'); assert.equal(odt.cmp.tono, 'mal')
  const frase = fraseDe('vehiculos', m, nombrarPeriodo(p))
  assert.equal(frase.texto, 'Las 2 unidades recorrieron 1.086 km, un 8,6 % más que del 1 al 20 de septiembre.')
  assert.equal(frase.aviso, '2 ODT siguen sin resolver, 2 de ellas en la Unidad 02.')
  // Un área: solo sus unidades y su gente; el gasto de empresa no se divide entre km de un área.
  const area = armarModelo(d, p, { tipo: 'area', areaId: 'a1' }, 'vehiculos')
  assert.deepEqual(area.alcance.unidades.map(v => v.id), ['v1'])
  assert.equal(area.act.km, 1086)
  assert.equal(area.act.costoPorKm, null)
  // La más antigua sin resolver mira todas las abiertas, también las de antes del período (o5, 25 sep).
  assert.deepEqual(m.pendientes.map(o => o.id), ['o5', 'o1', 'o2'])
  // Las cuatro cifras de cada pestaña, en el orden de la app.
  const etiquetas = f => cifrasDe(f, m).map(c => c.etiqueta)
  assert.deepEqual(etiquetas('vehiculos'), ['Km recorridos', 'Índice seguro prom.', 'Eventos por 100 km', 'ODT del período'])
  assert.deepEqual(etiquetas('usuarios'), ['Km con conductor', 'Índice seguro prom.', 'Eventos por 100 km', 'Documentos al día'])
  assert.deepEqual(etiquetas('costos'), ['Gasto del período', 'Gastos registrados', 'Costo por km', 'Costo en ODT resueltas'])
  assert.deepEqual(etiquetas('estadistico'), ['Eventos de alerta', 'Eventos por 100 km', 'Unidades con km', 'Identificación de conductores'])
  assert.equal(km.nota, 'suma de los conductores identificados')
  const [, , conKm] = cifrasDe('estadistico', m)
  assert.equal(conKm.valor, '—'); assert.ok(conKm.nota)
  assert.deepEqual(cifrasDe('usuarios', m).filter(c => c.ahora).map(c => c.clave), ['indice', 'papeles'])
})

test('alcance: «Los que yo elija» no pasa de unidades a personas', () => {
  const elegidos = { tipo: 'elegidos', vehiculos: ['v1'] }
  assert.deepEqual(alcanceAlCambiar(elegidos, 'vehiculos', 'usuarios'), { tipo: 'empresa' })
  assert.deepEqual(alcanceAlCambiar({ tipo: 'elegidos', personas: ['p1'] }, 'usuarios', 'estadistico'), { tipo: 'empresa' })
  assert.equal(alcanceAlCambiar(elegidos, 'vehiculos', 'estadistico'), elegidos)
  const area = { tipo: 'area', areaId: 'a1' }
  assert.equal(alcanceAlCambiar(area, 'vehiculos', 'usuarios'), area)
})

test('score por conductor: primero el más alto y sin km al final, igual en pantalla y PDF', () => {
  const filas = [{ id: 'a', eventosPor100: 1.1, km: 10 }, { id: 'b', eventosPor100: null, km: 0 }, { id: 'c', eventosPor100: 3.2, km: 5 }]
  assert.deepEqual([...filas].sort(porScore).map(x => x.id), ['c', 'a', 'b'])
})
