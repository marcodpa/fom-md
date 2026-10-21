// ============================================================
// MEDIR LA FLOTA DE ESTRÉS (T-80)
// ------------------------------------------------------------
// Cuánto tardan, en milisegundos, los cálculos de datos que hace el panel
// con una empresa grande (340 unidades, ~3.000 ODT, ~30.000 inspecciones),
// comparados con la demo normal (26 unidades). Solo modo demostración: no
// habla con ningún servidor.
//
//   npm run medir:estres            340 unidades
//   node scripts/medir-estres.mjs 1000   otra cantidad
//
// Se mide el cálculo, no la espera simulada de la semilla (120 ms): las
// funciones del repositorio calculan todo antes de devolver la promesa.
// Lo que ve el navegador (pintar 340 marcadores, listas largas) no está aquí:
// eso se mide en el navegador con `?estres=1`.
// ============================================================

import { join } from 'node:path'
import { performance } from 'node:perf_hooks'
import { build } from 'vite'

const raiz = new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/u, '$1')
const ruta = (r) => join(raiz, r).replace(/\\/g, '/')
const UNIDADES = process.argv[2] || '340'
const VECES = 7
const ENTRADA = 'virtual:medir-estres'

// --- Un solo paquete con todo lo que se mide --------------------------------
const MODULOS = [
  `export { repo } from '${ruta('src/panel/datos/repo.js')}'`,
  `export * as base from '${ruta('src/panel/datos/semilla.js')}'`,
  `export * as estres from '${ruta('src/panel/datos/semillaEstres.js')}'`,
  `export { masNuevasPrimero } from '${ruta('src/panel/datos/odtAsignadas.js')}'`,
  `export { estadoVisible } from '${ruta('src/panel/datos/historial-odt.js')}'`,
  `export { etiqueta } from '${ruta('src/panel/datos/catalogos.js')}'`,
  `export { mesDeLaPersona, diaDe, limitesDelMes, mesDe } from '${ruta('src/panel/comp/CalendarioInspecciones.jsx')}'`,
  `export * as reportes from '${ruta('src/panel/modulos/reportes-datos.js')}'`,
  `export { agruparAvisos } from '${ruta('src/panel/modulos/alertas-presentacion.js')}'`,
].join('\n')

async function compilar() {
  const salida = await build({
    root: raiz,
    logLevel: 'error',
    // Vacío a propósito: sin API, todo sale de la semilla (modo demo).
    define: { 'import.meta.env.VITE_FOM_API': JSON.stringify('') },
    plugins: [{
      name: 'entrada-medir',
      resolveId: (id) => (id.endsWith(ENTRADA) ? '\0' + ENTRADA : null),
      load: (id) => (id === '\0' + ENTRADA ? MODULOS : null),
    }],
    build: { write: false, minify: false, lib: { entry: ENTRADA, formats: ['es'], fileName: 'medir' } },
  })
  return salida[0].output.find((o) => o.type === 'chunk').code
}

function localStorageEnMemoria(inicial = {}) {
  const datos = new Map(Object.entries(inicial))
  return { getItem: (k) => (datos.has(k) ? datos.get(k) : null), setItem: (k, v) => datos.set(k, String(v)), removeItem: (k) => datos.delete(k) }
}

let cargas = 0
async function cargar(codigo, almacen) {
  globalThis.localStorage = localStorageEnMemoria(almacen)
  const t0 = performance.now()
  const m = await import('data:text/javascript;base64,' + Buffer.from(`${codigo}\n// carga ${++cargas}`).toString('base64'))
  return { m, cargaMs: performance.now() - t0 }
}

// --- Cronómetro -----------------------------------------------------------------
function medir(fn) {
  fn() // calentar
  const tiempos = []
  for (let i = 0; i < VECES; i++) {
    const t0 = performance.now()
    fn()
    tiempos.push(performance.now() - t0)
  }
  tiempos.sort((a, b) => a - b)
  return { mediana: tiempos[Math.floor(VECES / 2)], max: tiempos[VECES - 1] }
}

// Copia de `armarFilas` de InspeccionesPorPersona.jsx (no se exporta): una fila
// por persona con su mes calculado, del peor al mejor.
function armarFilas(m, datos, hoy) {
  const { mes, inspecciones, gente, asignaciones } = datos
  const momento = (i) => new Date(i.creadaEn || i.fecha || 0).getTime() || 0
  const conInspecciones = new Set(inspecciones.map((i) => i.conductorId).filter(Boolean))
  return gente
    .filter((p) => p.rol === 'conductor' || p.conduce || conInspecciones.has(p.userId ?? p.id))
    .map((p) => {
      const id = p.userId ?? p.id
      const suyas = inspecciones.filter((i) => (i.conductorId ? i.conductorId === id : i.conductorNombre === p.nombre))
      const asignacion = asignaciones.find((a) => a.id === id)
      const desde = m.diaDe(asignacion?.desde) || null
      const conUnidad = Boolean(p.unidad || asignacion)
      const calc = m.mesDeLaPersona({ mes, hoy, inspecciones: suyas, desde, conUnidad })
      const delMes = suyas.filter((i) => m.diaDe(i.fecha || i.creadaEn).startsWith(mes)).sort((a, b) => momento(b) - momento(a))
      return { id, nombre: p.nombre || '—', inspecciones: delMes, ...calc }
    })
    .sort((a, b) => (a.totales.pct ?? 101) - (b.totales.pct ?? 101) || b.totales.noHechas - a.totales.noHechas || a.nombre.localeCompare(b.nombre))
}

// Lo que hace la pantalla de Mantenimiento con la lista (búsqueda, tipo, unidad, estado).
function filtrarOrdenes(m, odts, { q = '', tipo = '', unidad = '', grupo = '' } = {}) {
  const t = q.trim().toLowerCase()
  const sinEstado = m.masNuevasPrimero(odts.filter((o) => {
    if (tipo && o.tipo !== tipo) return false
    if (unidad && o.vehiculoId !== unidad) return false
    return [o.id, o.descripcion, o.vehiculoNombre, o.creadorNombre, m.etiqueta('tipo_falla', o.tipoFalla)].join(' ').toLowerCase().includes(t)
  }))
  const cuentas = {}
  for (const o of sinEstado) { const g = m.estadoVisible(o.estado).clave; cuentas[g] = (cuentas[g] || 0) + 1 }
  return grupo ? sinEstado.filter((o) => m.estadoVisible(o.estado).clave === grupo) : sinEstado
}

// Lo que reúne la pantalla de Reportes (cargarReporte) antes de calcular.
async function datosDeReporte(m) {
  const r = m.reportes
  const ahora = new Date()
  const t = ahora.getTime()
  const periodo = r.crearPeriodo({ tipo: 'mes' }, ahora)
  const cortes = r.cortesDelPeriodo(periodo, t)
  const [vehiculos, conductores, odts, eventos] = await Promise.all([
    m.repo.vehiculos.listar({}),
    m.repo.personal.listar({ soloConductores: true }),
    m.repo.odts.listar({}),
    m.repo.alertas.eventos({ dias: r.diasDesde(cortes[0], t) }),
  ])
  const lecturas = async (pedir) => new Map(await Promise.all(cortes.map(async (c) => [c, await pedir(c)])))
  const manejo = await lecturas((c) => m.repo.manejo.ranking({ dias: r.diasServidor(c, t) }))
  const costos = await lecturas((c) => m.repo.costos.resumen({ dias: r.diasDesde(c, t) }))
  const ventanas = (porCorte, restar) => ({ actual: r.enVentana(porCorte, periodo.desde, periodo.hasta, t, restar), anterior: r.enVentana(porCorte, periodo.anterior.desde, periodo.anterior.hasta, t, restar) })
  return { periodo, vehiculos, conductores, odts, eventos, manejo: ventanas(manejo, r.restarManejo), costos: ventanas(costos, r.restarCostos) }
}

// --- Las mediciones -------------------------------------------------------------
async function medirTodo(m) {
  const { repo } = m
  const hoy = m.diaDe(new Date().toISOString())
  const mes = m.mesDe()
  const { desde, hasta } = m.limitesDelMes(mes)
  const filas = []
  // Las funciones del repositorio: se mide hasta que devuelven la promesa (el cálculo).
  const r = (nombre, fn, cuantos) => filas.push({ nombre, ...medir(() => { fn() }), cuantos })

  const vehiculos = await repo.vehiculos.listar({})
  const odts = await repo.odts.listar({})
  const inspMes = await repo.inspecciones.listar({ desde, hasta })
  const inspTodas = await repo.inspecciones.listar({})
  const gente = await repo.personal.listar({})
  const asignaciones = await repo.conductores()
  const avisos = await repo.alertas.listar({})
  const eventos = await repo.alertas.eventos({ dias: 28 })
  const documentos = await repo.documentos.listar({})
  const enMarcha = vehiculos.find((v) => v.estadoMarcha === 'en_marcha') ?? vehiculos[0]

  r('Flota: listar unidades (cada 15 s en el mapa)', () => repo.vehiculos.listar({}), `${vehiculos.length} unidades`)
  r('Resumen del panel (resumen)', () => repo.resumen(), `${vehiculos.length} unidades`)
  r('ODT: listar todas', () => repo.odts.listar({}), `${odts.length} ODT`)
  r('Mantenimiento: filtrar y ordenar (sin búsqueda)', () => filtrarOrdenes(m, odts), `${odts.length} ODT`)
  r('Mantenimiento: buscar «frenos» en «Abierta»', () => filtrarOrdenes(m, odts, { q: 'frenos', grupo: 'abierta' }), `${odts.length} ODT`)
  r('ODT: más nuevas primero (masNuevasPrimero)', () => m.masNuevasPrimero(odts), `${odts.length} ODT`)
  r('Inspecciones: listar el mes', () => repo.inspecciones.listar({ desde, hasta }), `${inspMes.length} del mes`)
  r('Inspecciones: listar todas', () => repo.inspecciones.listar({}), `${inspTodas.length} en total`)
  r('Inspecciones: pendientes de hoy', () => repo.inspecciones.pendientesHoy(), `${vehiculos.length} unidades`)
  r('Personal: listar', () => repo.personal.listar({}), `${gente.length} personas`)
  r('Por persona: calendario del mes de todos', () => armarFilas(m, { mes, inspecciones: inspMes, gente, asignaciones }, hoy), `${gente.filter((p) => p.conduce).length} conductores`)
  const id = enMarcha.conductorPrincipalId
  r('Por persona: calendario de una persona', () => m.mesDeLaPersona({ mes, hoy, inspecciones: inspMes.filter((i) => i.conductorId === id), conUnidad: true }), '1 conductor')
  r('Documentos: listar', () => repo.documentos.listar({}), `${documentos.length} documentos`)
  r('Alertas: listar avisos', () => repo.alertas.listar({}), `${avisos.length} avisos`)
  r('Alertas: agrupar Hoy / Anteriores', () => m.agruparAvisos(avisos), `${avisos.length} avisos`)
  r('Alertas: eventos de manejo (28 días)', () => repo.alertas.eventos({ dias: 28 }), `${eventos.length} eventos`)
  r('Recorrido de 24 h de una unidad', () => repo.recorridoDetallado(enMarcha.id, { horas: 24 }), '1 unidad')

  const d = await datosDeReporte(m)
  r('Reportes: armar el informe de Vehículos (mes)', () => m.reportes.armarModelo(d, d.periodo, { tipo: 'empresa' }, 'vehiculos'), `${d.odts.length} ODT, ${d.eventos.length} eventos`)
  r('Reportes: armar el informe de Usuarios (mes)', () => m.reportes.armarModelo(d, d.periodo, { tipo: 'empresa' }, 'usuarios'), `${d.conductores.length} conductores`)
  r('Reportes: calcularReporte (30 días)', () => m.reportes.calcularReporte(d, 30), `${d.odts.length} ODT`)
  return { filas, cuentas: { vehiculos: vehiculos.length, conductores: gente.filter((p) => p.conduce).length, odts: odts.length, inspecciones: inspTodas.length, documentos: documentos.length, eventos: eventos.length, avisos: avisos.length } }
}

// --- Tabla ----------------------------------------------------------------------------
const ms = (x) => (x < 10 ? x.toFixed(2) : x.toFixed(1))
function tabla(normal, estres) {
  const cab = ['Qué se mide', 'Demo normal', 'Estrés (mediana)', 'Estrés (peor)', 'Datos en estrés']
  const filas = estres.filas.map((f, i) => [f.nombre, `${ms(normal.filas[i].mediana)} ms`, `${ms(f.mediana)} ms`, `${ms(f.max)} ms`, f.cuantos])
  const anchos = cab.map((c, i) => Math.max(c.length, ...filas.map((f) => String(f[i]).length)))
  const linea = (f) => f.map((c, i) => (i === 0 || i === 4 ? String(c).padEnd(anchos[i]) : String(c).padStart(anchos[i]))).join(' | ')
  console.log(linea(cab))
  console.log(anchos.map((a) => '-'.repeat(a)).join('-|-'))
  filas.forEach((f) => console.log(linea(f)))
}

const codigo = await compilar()
const normal = await cargar(codigo, {})
const conEstres = await cargar(codigo, { 'fom.demo.estres': UNIDADES })
const generar = medir(() => conEstres.m.estres.crearSemillaEstres(conEstres.m.base, { vehiculos: conEstres.m.estres.unidadesDe(UNIDADES) }))

const rNormal = await medirTodo(normal.m)
const rEstres = await medirTodo(conEstres.m)

const c = rEstres.cuentas
console.log(`\nFlota de estrés: ${c.vehiculos} unidades, ${c.conductores} conductores, ${c.odts} ODT, ${c.inspecciones} inspecciones, ${c.documentos} documentos, ${c.avisos} avisos, ${c.eventos} eventos (28 días).`)
console.log(`Generar la flota al abrir el panel: ${ms(generar.mediana)} ms (peor ${ms(generar.max)} ms). Cargar el módulo con la flota: ${ms(conEstres.cargaMs)} ms; demo normal: ${ms(normal.cargaMs)} ms.`)
console.log(`Cada cifra es la mediana de ${VECES} vueltas, tras una de calentamiento.\n`)
tabla(rNormal, rEstres)
console.log('')
// Las respuestas de la semilla esperan 120 ms simulados: no hace falta esperarlas.
process.exit(0)
